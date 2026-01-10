// Send newsletter to all active subscribers
// NOTE: Newsletter functionality not yet implemented - Azure Table Storage integration pending
// This should be run manually or on a scheduled basis
// Usage: POST to /.netlify/functions/send-newsletter with newsletter content

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

  // Simple authentication - require secret key
  const authHeader = event.headers.authorization;
  const expectedAuth = `Bearer ${process.env.NEWSLETTER_ADMIN_KEY}`;
  
  if (!authHeader || authHeader !== expectedAuth) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const { subject, html, text, previewText } = JSON.parse(event.body);

    // Validate required fields
    if (!subject || !html || !text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['subject', 'html', 'text']
        })
      };
    }

    // TODO: Implement Azure Table Storage for subscriber management
    console.log('Newsletter send request received:', { subject });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Newsletter feature coming soon!',
        sent: 0
      })
    });
    
    if (subscribers.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'No active subscribers',
          sent: 0
        })
      };
    }

    console.log(`📧 Sending newsletter to ${subscribers.length} subscriber(s)`);

    const results = {
      sent: [],
      failed: []
    };

    // Send to each subscriber individually (for personalization)
    for (const subscriber of subscribers) {
      try {
        // Add unsubscribe link to content
        const unsubscribeUrl = `${process.env.URL}/unsubscribe?email=${encodeURIComponent(subscriber.email)}`;
        
        const emailHtml = html.replace(
          '</body>',
          `
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>You're receiving this because you subscribed to Studio XV newsletter.</p>
              <p><a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a></p>
            </div>
          </body>
          `
        );

        const emailText = text + `\n\n---\nYou're receiving this because you subscribed to Studio XV newsletter.\nUnsubscribe: ${unsubscribeUrl}`;

        await sgMail.send({
          to: subscriber.email,
          from: {
            email: process.env.FROM_EMAIL,
            name: STUDIO_INFO.name
          },
          subject: subscriber.name ? subject.replace('{name}', subscriber.name) : subject,
          text: emailText,
          html: emailHtml,
          // SendGrid Marketing compliance
          asm: {
            groupId: parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID || '0')
          },
          trackingSettings: {
            clickTracking: { enable: true },
            openTracking: { enable: true },
            subscriptionTracking: { enable: false }
          },
          ...(previewText && {
            customArgs: {
              previewText
            }
          })
        });

        results.sent.push(subscriber.email);
        console.log(`✅ Newsletter sent to ${subscriber.email}`);

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Failed to send to ${subscriber.email}:`, error.message);
        results.failed.push({
          email: subscriber.email,
          error: error.message
        });
      }
    }

    console.log(`✅ Newsletter campaign complete: ${results.sent.length} sent, ${results.failed.length} failed`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Newsletter sent',
        sent: results.sent.length,
        failed: results.failed.length,
        total: subscribers.length,
        results
      })
    };

  } catch (error) {
    console.error('Newsletter send error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send newsletter',
        message: error.message
      })
    };
  }
};
