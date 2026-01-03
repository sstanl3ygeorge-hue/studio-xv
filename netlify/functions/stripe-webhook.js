const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const { EMAIL_TEMPLATES, STUDIO_INFO } = require('../../config/email-templates');

const resend = new Resend(process.env.RESEND_API_KEY);

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
        const emailData = {
          customerName: session.customer_details?.name || '',
          service: session.metadata.service,
          packageName: session.metadata.packageName,
          hours: session.metadata.hours || null,
          addons: session.metadata.addons ? JSON.parse(session.metadata.addons) : [],
          total: parseFloat(session.metadata.total),
          deposit: parseFloat(session.metadata.deposit)
        };

        const template = EMAIL_TEMPLATES.bookingConfirmation(emailData);

        await resend.emails.send({
          from: `${STUDIO_INFO.name} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
          to: customerEmail,
          subject: template.subject,
          html: template.html,
          text: template.text
        });

        console.log(`Booking confirmation email sent to ${customerEmail}`);

      } else if (session.metadata?.items) {
        // COURSE PURCHASE CONFIRMATION EMAIL
        const items = JSON.parse(session.metadata.items);
        const courseName = items.length === 1 ? items[0] : `${items.length} Courses`;

        const emailData = {
          customerName: session.customer_details?.name || '',
          courseName: courseName,
          courseUrl: `${process.env.URL}/course-access.html?session_id=${session.id}`
        };

        const template = EMAIL_TEMPLATES.courseConfirmation(emailData);

        await resend.emails.send({
          from: `${STUDIO_INFO.name} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
          to: customerEmail,
          subject: template.subject,
          html: template.html,
          text: template.text
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
