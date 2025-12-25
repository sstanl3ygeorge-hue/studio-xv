const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { depositAmount, serviceName, breakdown } = JSON.parse(event.body);

  try {
    // Build line items from breakdown
    const lineItems = breakdown?.length
      ? breakdown.map(item => ({
          price_data: {
            currency: "gbp",
            product_data: { name: item.name },
            unit_amount: Math.round(item.amount * 100)
          },
          quantity: 1
        }))
      : [];

    // Add deposit line (what user actually pays today)
    lineItems.push({
      price_data: {
        currency: "gbp",
        product_data: { name: `Deposit (50%) – ${serviceName}` },
        unit_amount: Math.round(depositAmount * 100)
      },
      quantity: 1
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: "https://studioxv.co.uk/success",
      cancel_url: "https://studioxv.co.uk/booking",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: err.message,
    };
  }
};
