// Scheduled function to send booking reminder emails
// Runs every 15 minutes via Netlify scheduled functions
// Phase 7: Sends 24h and balance reminders only (2h reminders disabled)

const sgMail = require('@sendgrid/mail');
const { getBookingsNeedingReminders, markReminderSent } = require('./utils/azure-table');
const { EMAIL_TEMPLATES, STUDIO_INFO } = require('../../config/email-templates');
const { buildEmailData, validateEmailData } = require('./utils/email-helpers');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async (event, context) => {
  console.log('🔔 Running booking reminder check...');

  try {
    // Verify required environment variables
    if (!process.env.FROM_EMAIL) {
      throw new Error('FROM_EMAIL environment variable is required');
    }
    
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }

    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
    }

    // Get bookings from Azure Table Storage that need reminders
    const bookings = await getBookingsNeedingReminders();
    console.log(`📊 Found ${bookings.length} booking(s) needing reminders`);

    if (bookings.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'No reminders needed at this time',
          timestamp: new Date().toISOString()
        })
      };
    }

    const results = {
      sent: [],
      failed: []
    };

    // Process each booking
    for (const booking of bookings) {
      try {
        // Skip if no session date/time
        if (!booking.sessionDateTime) {
          console.log(`⚠️ Skipping booking ${booking.rowKey} - no session date/time`);
          continue;
        }

        // Calculate session date/time for display (Europe/London timezone)
        const sessionDateTime = new Date(booking.sessionDateTime);
        const sessionDate = sessionDateTime.toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'Europe/London'
        });
        const sessionTime = sessionDateTime.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/London'
        });

        // Add formatted dates to booking object for email data builder
        booking.sessionDate = sessionDate;
        booking.sessionTime = sessionTime;

        // Build normalized email data
        const emailData = buildEmailData(booking);
        
        // Validate before sending
        validateEmailData(emailData);

        // Send 24-hour reminder
        if (booking._needs24h) {
          try {
            const template = EMAIL_TEMPLATES.reminder24h(emailData);
            
            await sgMail.send({
              to: booking.customerEmail,
              from: {
                email: process.env.FROM_EMAIL,
                name: STUDIO_INFO.name
              },
              subject: template.subject,
              text: template.text,
              html: template.html
            });

            // Mark as sent in Azure Table Storage
            await markReminderSent(booking.rowKey, '24h');
            
            results.sent.push({
              bookingId: booking.rowKey,
              type: '24h',
              customer: booking.customerEmail,
              sessionDate: sessionDate
            });
            
            console.log(`✅ 24h reminder sent to ${booking.customerEmail} for booking ${booking.rowKey}`);
          } catch (emailError) {
            console.error(`❌ Failed to send 24h reminder for ${booking.rowKey}:`, emailError.message);
            results.failed.push({
              bookingId: booking.rowKey,
              type: '24h',
              customer: booking.customerEmail,
              error: emailError.message
            });
          }
        }

        // Send start payment reminder (at session start, if balance unpaid)
        if (booking._needsStartPayment) {
          try {
            const template = EMAIL_TEMPLATES.balanceReminder(emailData);
            
            await sgMail.send({
              to: booking.customerEmail,
              from: {
                email: process.env.FROM_EMAIL,
                name: STUDIO_INFO.name
              },
              subject: template.subject,
              text: template.text,
              html: template.html
            });

            // Mark as sent in Azure Table Storage
            await markReminderSent(booking.rowKey, 'startPayment');
            
            results.sent.push({
              bookingId: booking.rowKey,
              type: 'startPayment',
              customer: booking.customerEmail,
              amount: booking.balanceDue
            });
            
            console.log(`✅ Start payment reminder sent to ${booking.customerEmail} for booking ${booking.rowKey} (£${booking.balanceDue})`);
          } catch (emailError) {
            console.error(`❌ Failed to send start payment reminder for ${booking.rowKey}:`, emailError.message);
            results.failed.push({
              bookingId: booking.rowKey,
              type: 'startPayment',
              customer: booking.customerEmail,
              error: emailError.message
            });
          }
        }

        // Send post-session payment reminder (24h after session, if balance unpaid)
        if (booking._needsPostSessionPayment) {
          try {
            const template = EMAIL_TEMPLATES.balanceReminder(emailData);
            
            await sgMail.send({
              to: booking.customerEmail,
              from: {
                email: process.env.FROM_EMAIL,
                name: STUDIO_INFO.name
              },
              subject: template.subject,
              text: template.text,
              html: template.html
            });

            // Mark as sent in Azure Table Storage
            await markReminderSent(booking.rowKey, 'postSessionPayment');
            
            results.sent.push({
              bookingId: booking.rowKey,
              type: 'postSessionPayment',
              customer: booking.customerEmail,
              amount: booking.balanceDue
            });
            
            console.log(`✅ Post-session payment reminder sent to ${booking.customerEmail} for booking ${booking.rowKey} (£${booking.balanceDue})`);
          } catch (emailError) {
            console.error(`❌ Failed to send post-session payment reminder for ${booking.rowKey}:`, emailError.message);
            results.failed.push({
              bookingId: booking.rowKey,
              type: 'postSessionPayment',
              customer: booking.customerEmail,
              error: emailError.message
            });
          }
        }

        // Small delay to respect SendGrid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Error processing booking ${booking.rowKey}:`, error.message);
        results.failed.push({
          bookingId: booking.rowKey,
          error: error.message
        });
        // Continue processing other bookings
      }
    }

    console.log(`✅ Reminder check complete - Sent: ${results.sent.length}, Failed: ${results.failed.length}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Reminder check complete',
        timestamp: new Date().toISOString(),
        sent: results.sent.length,
        failed: results.failed.length,
        details: {
          sent: results.sent,
          failed: results.failed
        }
      })
    };

  } catch (error) {
    console.error('❌ Fatal error in reminder scheduler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process reminders',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
