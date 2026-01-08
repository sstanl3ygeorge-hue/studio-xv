const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
    };
  }

  // Handle the event
  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;

      // Get customer email
      const customerEmail = session.customer_details?.email || session.customer_email;
      
      if (!customerEmail) {
        console.error('No customer email found in session');
        return {
          statusCode: 200,
          body: JSON.stringify({ received: true, warning: 'No email to send' })
        };
      }

      // Check if this is a booking (has metadata.service) or course purchase
      if (session.metadata?.service) {
        // BOOKING CONFIRMATION EMAIL
        await fetch(`${process.env.URL}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'bookingConfirmation',
            to: customerEmail,
            data: {
              customerName: session.customer_details?.name || '',
              service: session.metadata.service,
              packageName: session.metadata.packageName,
              hours: session.metadata.hours || null,
              addons: session.metadata.addons ? JSON.parse(session.metadata.addons) : [],
              total: parseFloat(session.metadata.total),
              deposit: parseFloat(session.metadata.deposit)
            }
          })
        });

        console.log(`Booking confirmation email sent to ${customerEmail}`);

      } else if (session.metadata?.items) {
        // COURSE PURCHASE CONFIRMATION EMAIL
        const items = JSON.parse(session.metadata.items);
        const courseName = items.length === 1 ? items[0] : `${items.length} Courses`;

        await fetch(`${process.env.URL}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'courseConfirmation',
            to: customerEmail,
            data: {
              customerName: session.customer_details?.name || '',
              courseName: courseName,
              courseUrl: `${process.env.URL}/course-access.html?session_id=${session.id}`
            }
          })
        });

        console.log(`Course confirmation email sent to ${customerEmail}`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Webhook handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
