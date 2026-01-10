// Handle free enquiry form submissions
// Sends notification to enquiries@studioxv.co.uk
// Sends auto-reply to customer

const sgMail = require('@sendgrid/mail');
const { EMAIL_TEMPLATES, STUDIO_INFO } = require('../../config/email-templates');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const ENQUIRY_EMAIL = 'enquiries@studioxv.co.uk';

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { name, email, service, project, budget } = JSON.parse(event.body);

    // Validate required fields
    if (!name || !email || !service || !project) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    console.log(`📧 Processing enquiry from ${name} (${email}) - Service: ${service}`);

    // Map service codes to display names
    const serviceNames = {
      'recording': 'Recording / Studio Session',
      'mixing': 'Mixing or Mastering',
      'beats': 'Beats / Production',
      'unsure': 'Not sure yet'
    };
    const serviceName = serviceNames[service] || service;

    // Send admin notification to enquiries@studioxv.co.uk
    const adminEmailBody = `NEW ENQUIRY RECEIVED

CONTACT DETAILS:
Name: ${name}
Email: ${email}

ENQUIRY TYPE:
${serviceName}

PROJECT DESCRIPTION:
${project}

BUDGET:
${budget}

---
Reply directly to this email to respond to ${name}.`;

    await sgMail.send({
      to: ENQUIRY_EMAIL,
      from: {
        email: ENQUIRY_EMAIL,
        name: STUDIO_INFO.name
      },
      replyTo: email,
      subject: `New Enquiry – ${serviceName}`,
      text: adminEmailBody
    });

    console.log(`✅ Admin notification sent to ${ENQUIRY_EMAIL}`);

    // Send auto-reply to customer
    try {
      const autoReplyData = {
        customerName: name,
        service: serviceName
      };
      
      const autoReply = EMAIL_TEMPLATES.enquiryAutoReply(autoReplyData);
      
      await sgMail.send({
        to: email,
        from: {
          email: ENQUIRY_EMAIL,
          name: STUDIO_INFO.name
        },
        subject: autoReply.subject,
        html: autoReply.html,
        text: autoReply.text
      });
      
      console.log(`✅ Auto-reply sent to ${email}`);
    } catch (autoReplyError) {
      console.error('❌ Failed to send auto-reply (non-blocking):', autoReplyError.message);
      // Don't block the main flow if auto-reply fails
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true,
        message: 'Enquiry received. We\'ll be in touch within 24 hours.'
      })
    };

  } catch (error) {
    console.error('❌ Enquiry submission error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to process enquiry',
        details: error.message
      })
    };
  }
};
