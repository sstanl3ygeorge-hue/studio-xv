const { Resend } = require('resend');
const { EMAIL_TEMPLATES, STUDIO_INFO } = require('../../config/email-templates');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { type, to, data } = JSON.parse(event.body);

    // Validate required fields
    if (!type || !to) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: type, to' })
      };
    }

    // Get email template
    const template = EMAIL_TEMPLATES[type];
    if (!template) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Invalid email type: ${type}` })
      };
    }

    // Generate email content
    const emailContent = template(data || {});

    // Send email via Resend
    const result = await resend.emails.send({
      from: `${STUDIO_INFO.name} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        messageId: result.id 
      })
    };

  } catch (error) {
    console.error('Email sending error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Failed to send email'
      })
    };
  }
};
