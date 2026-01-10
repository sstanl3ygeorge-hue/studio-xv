/**
 * Microsoft Graph Authentication
 * Gets OAuth token using client credentials flow
 */

async function getGraphToken() {
  console.log('🔐 Attempting Microsoft Graph authentication...');
  console.log('Tenant ID present:', !!process.env.MICROSOFT_TENANT_ID);
  console.log('Client ID present:', !!process.env.MICROSOFT_CLIENT_ID);
  console.log('Client Secret present:', !!process.env.MICROSOFT_CLIENT_SECRET);
  
  if (!process.env.MICROSOFT_TENANT_ID || !process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    throw new Error('Missing required Microsoft Graph environment variables');
  }

  const tokenUrl = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
  console.log('Token URL:', tokenUrl);

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  console.log('Token response status:', tokenResponse.status);

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('❌ Failed to get Graph token:', error);
    throw new Error(`Failed to get Graph token (${tokenResponse.status}): ${error}`);
  }

  const tokenData = await tokenResponse.json();
  console.log('✅ Graph token acquired successfully');
  return tokenData.access_token;
}

module.exports = { getGraphToken };
