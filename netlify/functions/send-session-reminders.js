// Scheduled function to send session reminders
// Runs every 15 minutes via Netlify scheduled functions

const sgMail = require('@sendgrid/mail');
const { getBookingsNeedingReminders, markReminderSent } = require('./utils/azure-table');
const { EMAIL_TEMPLATES, STUDIO_INFO } = require('../../config/email-templates');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async (event, context) => {
  console.log('🔔 Running session reminder check...');

  try {
    // Verify required environment variables
    if (!process.env.FROM_EMAIL) {
      throw new Error('FROM_EMAIL environment variable is required');
    }
    
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }

    // Get bookings from Azure Table Storage that need reminders
    const bookings = await getBookingsNeedingReminders();
    console.log(`Found ${bookings.length} booking(s) needing reminders`);

    if (bookings.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No reminders needed at this time' })
      };
    }

    const results = {
      sent: [],
      failed: [],
      skipped: []
    };

    // Process each booking
    for (const booking of bookings) {
      try {
        // Calculate session date/time for display
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

        // Prepare email data
        const emailData = {
          customerName: booking.customerName,
          service: booking.service,
          sessionDate: sessionDate,
          sessionTime: sessionTime,
          hours: booking.hours || 2,
          balanceDue: booking.balanceDue || 0,
          paymentLink: booking.paymentLink || null
        };

        // Send 24-hour reminder
        if (booking._needs24h) {
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

          await markReminderSent(booking.rowKey, '24h');
          
          results.sent.push({
            bookingId: booking.rowKey,
            type: '24h',
            customer: booking.customerEmail
          });
          
          console.log(`✅ 24h reminder sent to ${booking.customerEmail} for booking ${booking.rowKey}`);
        }

        // Send 2-hour reminder
        if (booking._needs2h) {
          const template = EMAIL_TEMPLATES.reminder2h(emailData);
          
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

          await markReminderSent(booking.rowKey, '2h');
          
          results.sent.push({
            bookingId: booking.rowKey,
            type: '2h',
            customer: booking.customerEmail
          });
          
          console.log(`✅ 2h reminder sent to ${booking.customerEmail} for booking ${booking.rowKey}`);
        }

        // Send balance reminder (only if balance > 0 and not already sent)
        if (booking._needsBalance && booking.balanceDue > 0) {
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

          await markReminderSent(booking.rowKey, 'balance');
          
          results.sent.push({
            bookingId: booking.rowKey,
            type: 'balance',
            customer: booking.customerEmail
          });
          
          console.log(`✅ Balance reminder sent to ${booking.customerEmail} for booking ${booking.rowKey}`);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Failed to send reminder for booking ${booking.rowKey}:`, error.message);
        results.failed.push({
          bookingId: booking.rowKey,
          error: error.message
        });
      }
    }

    console.log(`✅ Reminder check complete:`, results);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Reminder check complete',
        sent: results.sent.length,
        failed: results.failed.length,
        results: results
      })
    };

  } catch (error) {
    console.error('❌ Error in reminder scheduler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process reminders',
        message: error.message
      })
    };
  }
};
