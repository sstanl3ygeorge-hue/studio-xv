// Get booking confirmation data
// Fetches Stripe session and returns normalized booking data
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { buildBookingData } = require('./utils/email-helpers');

exports.handler = async (event) => {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get session_id from query string
    const sessionId = event.queryStringParameters?.session_id;

    if (!sessionId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Missing required parameter: session_id' 
        })
      };
    }

    console.log(`Fetching booking data for session: ${sessionId}`);

    // Fetch Stripe Checkout Session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Ensure this is a booking (not other purchase types)
    if (!session.metadata?.service) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Not a booking session' 
        })
      };
    }

    // � Extract payment info from Stripe (same logic as webhook)
    const paidNow = session.amount_total ? session.amount_total / 100 : 0;
    const discountAmount = session.total_details?.amount_discount 
      ? session.total_details.amount_discount / 100 
      : 0;

    // ✅ SINGLE SOURCE OF TRUTH: buildBookingData() calculates everything
    const bookingData = buildBookingData(session, paidNow, discountAmount);

    // Detect service type from Stripe metadata
    const paymentType = session.metadata?.paymentType || 'deposit';
    const isSessionService = paymentType === 'deposit';

    console.log(`✅ Booking data retrieved for ${bookingData.customerName} (${paymentType})`);

    // 🎯 SERVICE-AWARE API RESPONSE
    // Return normalized values from bookingData (never recalculate)
    const response = {
      success: true,
      booking: {
        // Customer
        customerName: bookingData.customerName,
        customerEmail: bookingData.customerEmail,
        
        // Service details
        service: bookingData.service,
        pricingMode: bookingData.pricingMode,
        packageName: bookingData.packageName,
        durationLabel: bookingData.durationLabel, // Smart display: "Half Day" | "3 hours"
        
        // Duration fields (service-aware)
        durationHours: bookingData.pricingMode === 'package' ? null : bookingData.durationHours,
        hours: bookingData.pricingMode === 'hours' ? bookingData.hours : null, // Backward compat
        
        // Date/time (only for session services)
        sessionDate: isSessionService ? bookingData.sessionDate : null,
        sessionTime: isSessionService ? bookingData.sessionTime : null,
        sessionDateFormatted: isSessionService ? bookingData.sessionDateFormatted : null,
        sessionTimeFormatted: isSessionService ? bookingData.sessionTimeFormatted : null,
        
        // Monetary fields (always numeric, never NaN)
        total: bookingData.totalSessionPrice || 0,
        deposit: bookingData.depositPaid || 0,
        amountPaid: bookingData.amountPaid || 0,
        balanceDue: bookingData.balanceDue || 0,
        discount: bookingData.discountAmount || 0,
        
        // Display helpers (smart formatting for customer-facing messages)
        depositDisplayText: bookingData.depositDisplayText, // "Deposit covered by promo code" | "£50.00"
        amountPaidDisplay: bookingData.amountPaidDisplay,   // "£100 (£50 card + £50 promo)"
        
        // Payment metadata
        paymentType: paymentType,
        paymentStatus: bookingData.paymentStatus,
        
        // Reference
        reference: bookingData.bookingId
      }
    };

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('❌ Error fetching booking:', error.message);
    
    // Handle Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Booking not found' 
        })
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to fetch booking data',
        details: error.message 
      })
    };
  }
};
