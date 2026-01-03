const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { PRICING, calculatePrice } = require("../../config/pricing");

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { items, promoCode, membershipTier, customerEmail } = JSON.parse(event.body);

    // Validate items
    if (!items || items.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No items provided' })
      };
    }

    // Calculate pricing
    const pricing = calculatePrice(items, promoCode, membershipTier || 'basic');

    // Build line items for Stripe
    const lineItems = pricing.items.map(item => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.name,
          description: 'Studio XV Course'
        },
        unit_amount: Math.round(item.price * 100) // Convert to pence
      },
      quantity: 1
    }));

    // Add discount as a separate line item if applicable
    if (pricing.bundleDiscountAmount > 0 || pricing.promoDiscount > 0) {
      const totalDiscount = pricing.bundleDiscountAmount + pricing.promoDiscount;
      
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `Discount${promoCode ? ` (${promoCode})` : ''}`,
            description: pricing.bundleDiscount > 0 
              ? `Bundle discount (${Math.round(pricing.bundleDiscount * 100)}% off)`
              : promoCode 
                ? PRICING.promoCodes[promoCode]?.description 
                : 'Discount applied'
          },
          unit_amount: -Math.round(totalDiscount * 100) // Negative amount for discount
        },
        quantity: 1
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.URL}/confirmation.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/learn-courses.html`,
      customer_email: customerEmail || undefined,
      metadata: {
        items: JSON.stringify(items),
        promoCode: promoCode || '',
        membershipTier: membershipTier || 'basic',
        subtotal: pricing.subtotal,
        discount: pricing.bundleDiscountAmount + pricing.promoDiscount,
        total: pricing.total
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        url: session.url,
        pricing: pricing
      })
    };

  } catch (error) {
    console.error('Course checkout error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
