// Handle free enquiry form submissions
// Sends notification to studio admin email only

const { sendGraphEmail } = require('./utils/email-helpers');

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
    const { name, email, project, budget } = JSON.parse(event.body);

    // Validate required fields
    if (!name || !email || !project) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    console.log(`📧 Processing enquiry from ${name} (${email})`);

    // Send admin notification
    const adminEmailBody = `NEW ENQUIRY RECEIVED

CONTACT DETAILS:
Name: ${name}
Email: ${email}

PROJECT DESCRIPTION:
${project}

BUDGET:
${budget}

---
Reply directly to this email to respond to ${name}.`;

    await sendGraphEmail({
      to: process.env.MICROSOFT_USER_EMAIL,
      subject: `New Enquiry — ${name}`,
      body: adminEmailBody,
      isHtml: false
    });

    console.log(`✅ Enquiry notification sent to ${process.env.MICROSOFT_USER_EMAIL}`);

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
