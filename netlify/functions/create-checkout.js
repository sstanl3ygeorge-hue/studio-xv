const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { depositAmount, serviceName } = JSON.parse(event.body);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Studio XV Deposit – ${serviceName}`,
            },
            unit_amount: depositAmount * 100,
          },
          quantity: 1,
        },
      ],
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
