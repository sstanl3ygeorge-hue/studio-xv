const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sessionId = event.queryStringParameters.session_id;

    if (!sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Session ID is required' })
      };
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Return the metadata (booking details)
    return {
      statusCode: 200,
      body: JSON.stringify({
        metadata: session.metadata,
        payment_status: session.payment_status,
        amount_total: session.amount_total
      })
    };

  } catch (error) {
    console.error('Error retrieving session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
