exports.handler = async (event, context) => {
  // IMPORTANT for Netlify memory control
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Lazy-load Stripe INSIDE handler
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  // 🎯 SERVICE RULES - Define session vs non-session services
  const SESSION_SERVICES = ['Recording', 'Mixing', 'Mastering', 'Lessons'];
  
  try {
    if (!event.body || event.body.length > 10_000) {
      throw new Error('Invalid or oversized payload');
    }

    const {
      service,
      packageName,
      hours,
      addons = [],
      total,
      deposit,
      sessionDate = '',
      sessionTime = '',
      customerName = '',
      customerEmail = ''
    } = JSON.parse(event.body);

    // 🛡️ VALIDATION - Service-aware
    if (!service || !packageName || !total) {
      throw new Error('Missing required checkout fields: service, packageName, total');
    }
    
    // Determine service type
    const isSessionService = SESSION_SERVICES.includes(service);
    
    // Session services require deposit, non-session services use full payment
    if (isSessionService && !deposit) {
      throw new Error('Session services require a deposit');
    }
    
    // Determine payment amount and type
    const paymentAmount = isSessionService ? deposit : total;
    const paymentType = isSessionService ? 'deposit' : 'full';
    
    console.log(`💳 Creating checkout: ${service} | ${paymentType} | £${paymentAmount}`);

    const lineItems = [
      {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `${service} – ${packageName}${hours ? ` (${hours}hrs)` : ''}`,
            description: isSessionService 
              ? 'Deposit for Studio XV session' 
              : 'Full payment for Studio XV service'
          },
          unit_amount: Math.round(paymentAmount * 100),
        },
        quantity: 1,
      }
    ];

    // Add-ons (guarded)
    addons.slice(0, 5).forEach(addon => {
      if (typeof addon.price === 'number') {
        lineItems.push({
          price_data: {
            currency: 'gbp',
            product_data: { name: addon.label },
            unit_amount: Math.round(addon.price * 100),
          },
          quantity: 1,
        });
      }
    });

    // 📦 METADATA - Always include core fields, session fields only for session services
    const metadata = {
      service,
      packageName,
      totalSessionPrice: String(total),
      paymentType,
      customerName: customerName || '',
      customerEmail: customerEmail || ''
    };
    
    // Add session-specific fields only for session services
    if (isSessionService) {
      metadata.hours = String(hours || '');
      metadata.deposit = String(deposit);
      metadata.sessionDate = sessionDate || '';
      metadata.sessionTime = sessionTime || '';
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      allow_promotion_codes: true,
      success_url: `${process.env.URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/#booking`,
      metadata
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };

  } catch (error) {
    console.error('Checkout error:', error.message);

    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    };
  }
};
