const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { service, packageName, hours, addons, total, deposit } = JSON.parse(event.body);

    // Build line items for Stripe
    const lineItems = [];

    // Main service/package as deposit line item
    lineItems.push({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: `${service} – ${packageName}${hours ? ` (${hours}hrs)` : ''}`,
          description: `50% deposit for Studio XV session`
        },
        unit_amount: Math.round(deposit * 100), // Convert to pence
      },
      quantity: 1,
    });

    // Add each add-on as separate line item
    if (addons && addons.length > 0) {
      addons.forEach(addon => {
        // Only add if it has a numeric price (skip percentage add-ons like Rush)
        if (typeof addon.price === 'number') {
          lineItems.push({
            price_data: {
              currency: 'gbp',
              product_data: {
                name: addon.label
              },
              unit_amount: Math.round(addon.price * 100), // Convert to pence
            },
            quantity: 1,
          });
        }
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.URL}/deposit.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/#booking`,
      metadata: {
        service,
        packageName,
        hours: hours || '',
        total,
        deposit,
        addons: JSON.stringify(addons)
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
