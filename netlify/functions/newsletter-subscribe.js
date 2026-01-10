// Newsletter subscription endpoint
// NOTE: Newsletter functionality not yet implemented - Azure Table Storage integration pending
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

  try {
    const { email, name, source = 'website' } = JSON.parse(event.body);

    // Validate email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Valid email is required' })
      };
    }

    // TODO: Implement Azure Table Storage for newsletter subscribers
    console.log('Newsletter subscription request received:', { email, name, source });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Newsletter subscription feature coming soon!',
        status: 'pending'
      })
    });

    // Send welcome email
    try {
      const welcomeEmail = {
        to: email,
        from: {
          email: process.env.FROM_EMAIL,
          name: STUDIO_INFO.name
        },
        subject: 'Welcome to Studio XV Newsletter',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #000; color: #fff; padding: 30px 20px; text-align: center; }
              .header h1 { margin: 0; font-size: 32px; letter-spacing: 0.3em; }
              .content { padding: 30px 20px; background: #f9f9f9; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
              .unsubscribe { color: #999; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div style="font-size: 12px; letter-spacing: 0.3em; opacity: 0.8; margin-bottom: 10px;">STUDIO</div>
              <h1>XV</h1>
            </div>
            
            <div class="content">
              <h2>Welcome to Studio XV! 🎵</h2>
              <p>Hi${name ? ` ${name}` : ''},</p>
              <p>Thank you for subscribing to the Studio XV newsletter!</p>
              
              <p>You'll receive:</p>
              <ul>
                <li>Production tips and tricks</li>
                <li>Studio updates and new services</li>
                <li>Exclusive offers and promotions</li>
                <li>Behind-the-scenes content</li>
              </ul>

              <p>We respect your inbox and only send valuable content.</p>
              
              <p style="margin-top: 30px;">Welcome to the Studio XV family!</p>
              <p><strong>— Studio XV Team</strong></p>
            </div>

            <div class="footer">
              <p><strong>${STUDIO_INFO.name}</strong></p>
              <p>${STUDIO_INFO.email}</p>
              <div class="unsubscribe">
                <p>Don't want to receive these emails? <a href="${process.env.URL}/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Welcome to Studio XV!

          Hi${name ? ` ${name}` : ''},

          Thank you for subscribing to the Studio XV newsletter!

          You'll receive:
          • Production tips and tricks
          • Studio updates and new services
          • Exclusive offers and promotions
          • Behind-the-scenes content

          We respect your inbox and only send valuable content.

          Welcome to the Studio XV family!

          — Studio XV Team
          ${STUDIO_INFO.email}

          Don't want to receive these emails? Unsubscribe: ${process.env.URL}/unsubscribe?email=${encodeURIComponent(email)}
        `,
        // Add unsubscribe group for SendGrid Marketing compliance
        asm: {
          groupId: parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID || '0')
        },
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
          subscriptionTracking: { enable: false } // Using custom unsubscribe
        }
      };

      await sgMail.send(welcomeEmail);
      console.log(`✅ Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError.message);
      // Don't fail the subscription if email fails
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: result.status === 'resubscribed' 
          ? 'You have been resubscribed to our newsletter!' 
          : 'Thank you for subscribing!',
        status: result.status
      })
    };

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to subscribe',
        message: error.message
      })
    };
  }
};
