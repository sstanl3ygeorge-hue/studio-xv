const sgMail = require('@sendgrid/mail');
const { EMAIL_TEMPLATES, STUDIO_INFO } = require('../../config/email-templates');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { type, to, data } = JSON.parse(event.body);

    // Validate required fields
    if (!type || !to) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: type, to' }),
      };
    }

    // Get email template
    const template = EMAIL_TEMPLATES[type];
    if (!template) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Invalid email type: ${type}` }),
      };
    }

    // Generate email content
    const emailContent = template(data || {});

    const msg = {
      to,
      from: {
        email: process.env.FROM_EMAIL || 'bookings@studioxv.co.uk',
        name: STUDIO_INFO.name,
      },
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    };

    await sgMail.send(msg);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
      }),
    };
  } catch (error) {
    console.error('SendGrid email error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send email',
        details: error.message,
      }),
    };
  }
};
