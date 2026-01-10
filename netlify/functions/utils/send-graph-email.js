/**
 * Send email using Microsoft Graph API
 */

const { getGraphToken } = require('./graph-auth');

async function sendGraphEmail({ to, subject, body, isHtml = false }) {
  console.log(`📧 Attempting to send email via Graph...`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content type: ${isHtml ? 'HTML' : 'Text'}`);
  console.log(`MICROSOFT_USER_EMAIL: ${process.env.MICROSOFT_USER_EMAIL}`);

  const accessToken = await getGraphToken();
  const userEmail = process.env.MICROSOFT_USER_EMAIL;

  if (!userEmail) {
    throw new Error('MICROSOFT_USER_EMAIL environment variable is not set');
  }

  const emailPayload = {
    message: {
      subject: subject,
      body: {
        contentType: isHtml ? 'HTML' : 'Text',
        content: body
      },
      toRecipients: [
        {
          emailAddress: {
            address: to
          }
        }
      ]
    },
    saveToSentItems: true
  };

  console.log(`Sending via: https://graph.microsoft.com/v1.0/users/${userEmail}/sendMail`);

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userEmail}/sendMail`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    }
  );

  console.log(`Graph sendMail response status: ${response.status}`);

  // sendMail returns 202 Accepted with empty body on success
  if (response.status === 202) {
    console.log('✅ Email sent successfully via Graph');
    return true;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Graph sendMail failed (${response.status}):`, errorText);
    throw new Error(`Failed to send email (${response.status}): ${errorText}`);
  }

  return true;
}

module.exports = { sendGraphEmail };
