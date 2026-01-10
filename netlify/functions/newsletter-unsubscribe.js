// Newsletter unsubscribe endpoint
// NOTE: Newsletter functionality not yet implemented - Azure Table Storage integration pending

exports.handler = async (event) => {
  // Handle both GET and POST
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    let email;

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      email = body.email;
    } else {
      // GET request - email in query string
      email = event.queryStringParameters?.email;
    }

    // Validate email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Valid email is required' })
      };
    }

    // TODO: Implement Azure Table Storage for newsletter unsubscribe
    console.log('Newsletter unsubscribe request received:', { email });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Newsletter unsubscribe feature coming soon!',
        status: 'pending'
      })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: result.status === 'not_found' 
          ? 'Email not found in our mailing list' 
          : 'You have been unsubscribed successfully',
        status: result.status
      })
    };

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to unsubscribe',
        message: error.message
      })
    };
  }
};
