const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createCalendarEvent } = require('./utils/create-calendar-event');
const { sendGraphEmail } = require('./utils/send-graph-email');
const { saveBookingToAzure, markBalancePaid } = require('./utils/azure-table');
const { buildBookingData, buildEmailData, validateEmailData } = require('./utils/email-helpers');
const sgMail = require('@sendgrid/mail');
const { STUDIO_INFO } = require('../../config/email-templates');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
    };
  }

  // Handle the event
  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;

      // Get customer email
      const customerEmail = session.customer_details?.email || session.customer_email;
      
      console.log('=== WEBHOOK DEBUG ===');
      console.log('Customer email extracted:', customerEmail);
      console.log('Session ID:', session.id);
      console.log('Customer details:', JSON.stringify(session.customer_details, null, 2));
      
      if (!customerEmail) {
        console.error('❌ No customer email found in session');
        return {
          statusCode: 200,
          body: JSON.stringify({ received: true, warning: 'No email to send' })
        };
      }

      // Check if this is a balance payment (has bookingId metadata)
      if (session.metadata?.balancePayment === 'true' && session.metadata?.bookingId) {
        console.log('💰 Balance payment received for booking:', session.metadata.bookingId);
        
        // Update booking with balance payment info (non-blocking)
        try {
          await markBalancePaid(session.metadata.bookingId, session.payment_intent, 'stripe');
          console.log('✅ Balance payment tracked successfully');
        } catch (balanceError) {
          console.error('❌ Failed to track balance payment (non-blocking):', balanceError.message);
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({ received: true, type: 'balance_payment' })
        };
      }

      // Check if this is a booking (has metadata.service) or course purchase
      if (session.metadata?.service) {
        // BOOKING CONFIRMATION - Use Stripe as single source of truth
        console.log(`Processing booking for session: ${session.id}`);
        
        // � CRITICAL: Correct Stripe money logic (handles promos/discounts)
        // Stripe Checkout Session is the source of truth
        const paidNow = session.amount_total ? session.amount_total / 100 : 0;
        const discountAmount = session.total_details?.amount_discount 
          ? session.total_details.amount_discount / 100 
          : 0;
        // Reconstruct original total by adding discount back to what was paid
        const originalTotal = paidNow + discountAmount;
        // Balance due: remaining amount after payment (discount reduces total owed)
        const balanceDue = Math.max(0, originalTotal - paidNow);
        
        console.log(`💰 Stripe Money Breakdown:`);
        console.log(`  - Paid now: £${paidNow.toFixed(2)}`);
        console.log(`  - Discount applied: £${discountAmount.toFixed(2)}`);
        console.log(`  - Original total: £${originalTotal.toFixed(2)}`);
        console.log(`  - Balance due: £${balanceDue.toFixed(2)}`);
        
        // Build normalized booking snapshot from Stripe session
        let bookingData;
        try {
          bookingData = buildBookingData(session, paidNow, discountAmount);
          console.log('\ud83d\udce6 BookingSnapshot:', JSON.stringify({
            bookingId: bookingData.bookingId,
            customerName: bookingData.customerName,
            service: bookingData.service,
            paidNow: bookingData.depositPaid,
            discountAmount: bookingData.discountAmount,
            totalSessionPrice: bookingData.totalSessionPrice,
            balanceDue: bookingData.balanceDue,
            sessionDateISO: bookingData.sessionDate,
            sessionTime: bookingData.sessionTime
          }, null, 2));
        } catch (error) {
          console.error('❌ Failed to build booking snapshot:', error.message);
          console.error('Session metadata:', JSON.stringify(session.metadata, null, 2));
          // Don't block webhook - return success but log failure
          return {
            statusCode: 200,
            body: JSON.stringify({ 
              received: true, 
              warning: 'Booking snapshot creation failed',
              error: error.message 
            })
          };
        }

        // 🎯 Determine if this is a session service (requires date/time/calendar)
        const paymentType = session.metadata?.paymentType || 'deposit';
        const isSessionService = paymentType === 'deposit';
        
        console.log(`📋 Service type: ${isSessionService ? 'Session-based' : 'Non-session'}`);

        // Generate Stripe Payment Link for remaining balance (ONLY for session services with balance)
        let paymentLink = null;
        if (isSessionService && bookingData.balanceDue > 0) {
          try {
            console.log(`💳 Creating Stripe Payment Link for balance: £${bookingData.balanceDue}`);
            
            const paymentLinkObj = await stripe.paymentLinks.create({
              line_items: [
                {
                  price_data: {
                    currency: 'gbp',
                    product_data: {
                      name: `Studio XV – Remaining Balance`,
                      description: `${bookingData.service} session for ${bookingData.customerName}`
                    },
                    unit_amount: Math.round(bookingData.balanceDue * 100) // Convert to pence
                  },
                  quantity: 1
                }
              ],
              payment_method_types: ['card'],
              after_completion: {
                type: 'hosted_confirmation',
                hosted_confirmation: {
                  custom_message: 'Thank you! Your balance payment has been received. We look forward to seeing you at your session.'
                }
              },
              allow_promotion_codes: false,
              billing_address_collection: 'auto',
              metadata: {
                bookingId: session.id,
                customerName: bookingData.customerName,
                customerEmail: bookingData.customerEmail,
                service: bookingData.service,
                balancePayment: 'true'
              }
            });

            paymentLink = paymentLinkObj.url;
            console.log(`✅ Payment Link created: ${paymentLink}`);
          } catch (paymentLinkError) {
            console.error('❌ Failed to create Stripe Payment Link (non-blocking):', paymentLinkError.message);
            // Payment Link generation failed - log error and continue
            // Booking confirmation will still be sent, admin will be notified
          }
        } else {
          console.log('ℹ️ No payment link needed - balance fully paid');
        }

        // Save booking to Azure Table Storage for reminder tracking (non-blocking)
        try {
          await saveBookingToAzure({
            stripeSessionId: bookingData.bookingId,
            bookingId: bookingData.bookingId,
            customerName: bookingData.customerName,
            customerEmail: bookingData.customerEmail,
            service: bookingData.service,
            packageName: bookingData.packageName,
            hours: bookingData.hours,
            total: bookingData.totalSessionPrice,
            deposit: bookingData.depositPaid,
            balanceDue: bookingData.balanceDue,
            sessionDate: bookingData.sessionDate,
            sessionTime: bookingData.sessionTime,
            sessionDateTime: bookingData.sessionDateTime,
            addons: bookingData.addons,
            paymentLink
          });
          console.log(`✅ Booking saved to Azure with rowKey: ${bookingData.bookingId}`);
        } catch (azureError) {
          console.error('❌ Failed to save booking to Azure (non-blocking):', azureError.message);
          // Continue anyway - don't block webhook or emails
        }

        // Create Outlook calendar event (ONLY for session services)
        if (isSessionService) {
          try {
            await createCalendarEvent({
              customerName: bookingData.customerName,
              customerEmail: bookingData.customerEmail,
              service: bookingData.service,
              sessionDate: bookingData.sessionDate,
              sessionTime: bookingData.sessionTime,
              hours: bookingData.durationHours,
              durationLabel: bookingData.durationLabel,
              total: bookingData.totalSessionPrice,
              deposit: bookingData.depositPaid
            });
            console.log(`✅ Calendar event created for ${bookingData.customerName}`);
          } catch (calendarError) {
            console.error('❌ Failed to create calendar event (non-blocking):', calendarError.message);
            // Continue anyway - don't block emails or webhook
          }
        } else {
          console.log('ℹ️ No calendar event needed - non-session service');
        }

        // Send customer confirmation email via SendGrid (ALWAYS)
        try {
          // Validate FROM_EMAIL environment variable
          if (!process.env.FROM_EMAIL) {
            throw new Error('FROM_EMAIL environment variable is not set');
          }

          console.log(`📧 Sending customer email via SendGrid to: ${bookingData.customerEmail}`);
          
          // Build booking object for email helper (add paymentLink)
          const bookingForEmail = {
            ...bookingData,
            paymentLink
          };

          // Build and validate email data
          const emailData = buildEmailData(bookingForEmail);
          validateEmailData(emailData);
          
          // 📧 Choose email content based on emailType
          const isFullPayment = bookingData.emailType === 'full_payment';
          const emailSubject = isFullPayment
            ? `Payment Complete: ${emailData.service} at Studio XV`
            : `Booking Confirmed: ${emailData.service} Session at Studio XV`;
          
          const emailHeading = isFullPayment
            ? 'Payment Complete!'
            : 'Your Session is Confirmed';
          
          const emailIntro = isFullPayment
            ? `Thank you for booking with Studio XV. Your payment has been received and your ${emailData.service.toLowerCase()} service is confirmed.`
            : 'Thank you for booking with Studio XV. Your deposit has been received and your session is confirmed.';
          
          // Build next steps section based on payment type
          let nextStepsHtml = '';
          if (isFullPayment) {
            nextStepsHtml = '<div class="highlight"><strong>Next Steps:</strong><br>';
            if (emailData.sessionDateFormatted) {
              nextStepsHtml += `• Your session is scheduled for ${emailData.sessionDateFormatted} at ${emailData.sessionTimeFormatted}<br>`;
              nextStepsHtml += '• Please bring any files or references you would like to work with<br>';
            } else {
              nextStepsHtml += '• We will contact you within 24 hours to coordinate your service<br>';
            }
            nextStepsHtml += '• All details are included above for your reference</div>';
          } else {
            nextStepsHtml = `<div class="highlight"><strong>Next Steps:</strong><br>`;
            nextStepsHtml += '• We will contact you within 24 hours to schedule your session<br>';
            nextStepsHtml += `• The remaining balance of £${emailData.balanceDue} is due on the session day<br>`;
            nextStepsHtml += '• Please bring any files or references you would like to work with</div>';
          }
          
          const customerEmailHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 32px; letter-spacing: 0.3em; }
    .header .studio { font-size: 12px; letter-spacing: 0.3em; opacity: 0.8; margin-bottom: 10px; }
    .content { padding: 30px 20px; background: #f9f9f9; }
    .details { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: #666; }
    .value { color: #000; }
    .highlight { background: #fff5e6; padding: 15px; border-left: 4px solid #f97316; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="studio">STUDIO</div>
    <h1>XV</h1>
  </div>
  
  <div class="content">
    <h2>${emailHeading}</h2>
    <p>Hi ${emailData.customerName},</p>
    <p>${emailIntro}</p>
    
    <div class="details">
      <h3 style="margin-top: 0;">Session Details</h3>
      <div class="detail-row">
        <span class="label">Service:</span>
        <span class="value">${emailData.service}</span>
      </div>
      <div class="detail-row">
        <span class="label">Package:</span>
        <span class="value">${emailData.packageName}</span>
      </div>
      ${emailData.durationHours ? `<div class="detail-row"><span class="label">Duration:</span><span class="value">${emailData.durationHours} ${emailData.durationHours === 1 ? 'hour' : 'hours'}</span></div>` : ''}
      ${emailData.sessionDateFormatted ? `<div class="detail-row"><span class="label">Date:</span><span class="value">${emailData.sessionDateFormatted}</span></div>` : ''}
      ${emailData.sessionTimeFormatted ? `<div class="detail-row"><span class="label">Time:</span><span class="value">${emailData.sessionTimeFormatted}</span></div>` : ''}
    </div>

    <div class="details">
      <h3 style="margin-top: 0;">Payment Summary</h3>
      <div class="detail-row">
        <span class="label">Total Session Cost:</span>
        <span class="value">£${emailData.total}</span>
      </div>
      <div class="detail-row">
        <span class="label">Deposit Paid:</span>
        <span class="value" style="color: #10b981;">£${emailData.deposit}</span>
      </div>
      <div class="detail-row">
        <span class="label">Balance Due:</span>
        <span class="value" style="color: #f97316; font-weight: bold;">£${emailData.balanceDue}</span>
      </div>
    </div>

    ${nextStepsHtml}

    <p style="margin-top: 30px;">If you have any questions or need to reschedule, just reply to this email.</p>
    
    <p>Looking forward to creating something great together!</p>
    <p><strong>— Studio XV Team</strong></p>
  </div>

  <div class="footer">
    <p><strong>Studio XV</strong></p>
    <p>bookings@studioxv.co.uk · +44 74 1831 5041</p>
  </div>
</body>
</html>`;

          const sendGridMsg = {
            to: emailData.customerEmail,
            from: {
              email: process.env.FROM_EMAIL,
              name: STUDIO_INFO.name
            },
            subject: emailSubject,
            html: customerEmailHtml
          };

          await sgMail.send(sendGridMsg);
          console.log(`✅ Customer confirmation email sent via SendGrid to ${emailData.customerEmail}`);
        } catch (emailError) {
          console.error(`❌ SendGrid FAILED to send customer email to ${customerEmail}:`, emailError.message);
          if (emailError.response) {
            console.error('SendGrid error details:', emailError.response.body);
          }
          console.error('Full error:', emailError);
        }

        // Send admin notification email (ALWAYS)
        try {
          console.log(`🔄 Attempting to send admin email to: ${process.env.MICROSOFT_USER_EMAIL}`);
          
          const adminEmailBody = `NEW BOOKING RECEIVED

Customer: ${bookingData.customerName}
Email: ${bookingData.customerEmail}
Service: ${bookingData.service}
Package: ${bookingData.packageName}
${bookingData.durationHours ? `Duration: ${bookingData.durationHours} hour(s)` : ''}
${bookingData.addons ? `Add-ons: ${bookingData.addons}` : ''}
${bookingData.sessionDateFormatted && bookingData.sessionTimeFormatted ? `Session: ${bookingData.sessionDateFormatted} at ${bookingData.sessionTimeFormatted}` : 'Session date: TO BE CONFIRMED'}

PAYMENT:
Total: £${bookingData.totalSessionPrice}
Deposit Paid: £${bookingData.depositPaid}
Balance Due: £${bookingData.balanceDue}

Stripe Session ID: ${session.id}

Calendar event creation ${typeof calendarError !== 'undefined' ? 'FAILED' : 'succeeded'}.`;

          await sendGraphEmail({
            to: process.env.MICROSOFT_USER_EMAIL,
            subject: `[New Booking] ${bookingData.service} - ${bookingData.customerName}`,
            body: adminEmailBody,
            isHtml: false
          });
          console.log(`✅ Admin notification SUCCESSFULLY sent to ${process.env.MICROSOFT_USER_EMAIL}`);
        } catch (adminEmailError) {
          console.error(`❌ FAILED to send admin email:`, adminEmailError.message);
          console.error('Full error:', adminEmailError);
          console.error('Error stack:', adminEmailError.stack);
        }

      } else if (session.metadata?.items) {
        // COURSE PURCHASE CONFIRMATION EMAIL
        const items = JSON.parse(session.metadata.items);
        const courseName = items.length === 1 ? items[0] : `${items.length} Courses`;

        await fetch(`${process.env.URL}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'courseConfirmation',
            to: customerEmail,
            data: {
              customerName: session.customer_details?.name || '',
              courseName: courseName,
              courseUrl: `${process.env.URL}/course-access.html?session_id=${session.id}`
            }
          })
        });

        console.log(`Course confirmation email sent to ${customerEmail}`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Webhook handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
