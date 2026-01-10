// Email data helpers for Studio XV booking system
// Single source of truth for email data normalization and validation

// 📦 PACKAGE_CONFIG - Service-agnostic package definitions
// Packages can be reused across any service (Recording, Mixing, Mastering, etc.)
const PACKAGE_CONFIG = {
  'half-day': {
    name: 'Half Day Session',
    durationHours: 4,
    price: 160
  },
  'full-day': {
    name: 'Full Day Session',
    durationHours: 8,
    price: 300
  },
  'single': {
    name: 'Single Track',
    durationHours: 1,
    price: 50
  },
  'ep': {
    name: 'EP (4-6 tracks)',
    durationHours: 3,
    price: 180
  },
  'album': {
    name: 'Album (10+ tracks)',
    durationHours: 8,
    price: 400
  }
};

/**
 * Build normalized booking snapshot from Stripe session
 * 
 * 🔒 SINGLE SOURCE OF TRUTH for ALL booking data
 * This function creates a BookingSnapshot object that MUST be used by:
 * - Email templates
 * - Confirmation pages
 * - Reminder functions
 * - Admin notifications
 * - Calendar events
 * 
 * ⚠️ NO component should calculate prices, hours, or dates independently
 * 
 * BookingSnapshot Structure:
 * {
 *   bookingId: string,
 *   customerName: string,
 *   customerEmail: string,
 *   
 *   service: string,              // e.g. "Recording", "Mixing"
 *   pricingMode: string,          // "package" | "hourly"
 *   packageName: string,          // Display name (e.g. "Half Day Session")
 *   packageId: string,            // ID from PACKAGE_CONFIG
 *   durationHours: number,        // SINGLE SOURCE OF TRUTH for duration
 *   hours: number | null,         // Only for hourly bookings (backward compat)
 *   
 *   sessionDate: string,          // Original format
 *   sessionTime: string,
 *   sessionDateFormatted: string,
 *   sessionTimeFormatted: string,
 *   sessionDateTime: string,      // ISO format
 *   
 *   totalSessionPrice: number,    // Total cost (from Stripe)
 *   depositPaid: number,          // Amount paid upfront (from Stripe)
 *   discountAmount: number,       // Discount applied (from Stripe)
 *   balanceDue: number,           // Remaining amount (calculated)
 *   paymentStatus: string,        // "paid" | "partial" | "unpaid"
 *   
 *   stripeSessionId: string,      // Stripe Checkout Session ID
 *   stripePaymentIntentId: string,// Stripe PaymentIntent ID
 *   stripePaymentLink: string     // Balance payment link (if balance > 0)
 * }
 * 
 * @param {Object} session - Stripe Checkout Session object
 * @param {Number} actualPaidAmount - ACTUAL amount paid from PaymentIntent (Stripe authority)
 * @param {Number} discountAmount - Discount/promo code amount from Stripe
 * @param {Object} bookingRecord - Optional existing booking record
 * @returns {Object} Normalized BookingSnapshot
 */
function buildBookingSnapshot(session, actualPaidAmount = null, discountAmount = 0, bookingRecord = {}) {
  console.log('🔍 Building BookingSnapshot from session:', session.id);
  
  // SAFETY GUARDS - Log warnings for missing data but don't throw (except critical fields)
  const requiredFields = ['totalSessionPrice', 'sessionDate', 'sessionTime'];
  const missingFields = requiredFields.filter(field => !session.metadata?.[field]);
  
  if (missingFields.length > 0) {
    console.warn(`⚠️ Missing metadata fields: ${missingFields.join(', ')}`);
    console.warn('Snapshot may have incomplete data');
  }
  
  // CUSTOMER NAME - Prioritize metadata (from form) over Stripe customer_details
  const customerName = session.metadata?.customerName || 
                       session.customer_details?.name || 
                       session.customer_name || 
                       'there';
  
  // CUSTOMER EMAIL - Prioritize metadata (from form) over Stripe customer_details
  const customerEmail = session.metadata?.customerEmail ||
                        session.customer_details?.email || 
                        session.customer_email || 
                        '';
  
  // 📋 SERVICE & BOOKING TYPE (GLOBAL LOGIC - applies to ALL services)
  const service = session.metadata?.service || 'Studio Session';
  
  // 🎯 BOOKING TYPE DETECTION (service-agnostic)
  // Determine based on booking data, NOT service name
  const packageId = session.metadata?.package || session.metadata?.packageId || '';
  const metadataPackageName = session.metadata?.packageName || '';
  const metadataHours = session.metadata?.hours ? parseInt(session.metadata.hours) : null;
  
  let pricingMode;
  let packageName = '';
  let durationHours;
  let hours = null; // Only populated for hourly bookings
  
  // Rule: If packageId OR packageName exists → package booking
  if (packageId || metadataPackageName) {
    pricingMode = 'package';
    
    // Get package config if available
    const packageConfig = PACKAGE_CONFIG[packageId];
    
    if (packageConfig) {
      packageName = packageConfig.name;
      durationHours = packageConfig.durationHours;
    } else {
      // Fallback to metadata packageName
      packageName = metadataPackageName || `${service} Package`;
      durationHours = null; // Will log warning below
    }
    
    // ⚠️ CONFLICT DETECTION: Package booking should NOT have hours
    if (metadataHours) {
      console.warn(`⚠️ Booking type is 'package' but hours field exists (${metadataHours}). Ignoring hours.`);
    }
    
  } else {
    // Hourly booking
    pricingMode = 'hourly';
    hours = metadataHours || 2; // Default to 2 hours if missing
    durationHours = hours;
    packageName = `${hours} Hour ${service} Session`;
    
    // ⚠️ CONFLICT DETECTION: Hourly booking should NOT have package fields
    if (packageId || metadataPackageName) {
      console.warn(`⚠️ Booking type is 'hourly' but package fields exist. Ignoring package.`);
    }
  }
  
  // 🛡️ VALIDATION: durationHours must be set
  if (!durationHours) {
    console.warn(`⚠️ durationHours is missing for ${pricingMode} booking. This will cause display issues.`);
    durationHours = 0; // Prevent NaN, will display "Duration to be confirmed"
  }
  
  console.log(`📊 Pricing mode: ${pricingMode}, Duration: ${durationHours}h, Package: ${packageId || 'N/A'}`);
  
  // 💰 MONEY - STRIPE IS SINGLE SOURCE OF TRUTH
  // ✅ CANONICAL FORMULA:
  // - amountPaidStripe = amount paid via card (Stripe amount_total / 100)
  // - amountPaidPromo = promo/discount value from Stripe
  // - totalPaid = amountPaidStripe + amountPaidPromo
  // - totalSessionPrice = full price from metadata or reconstructed
  // - balanceDue = Math.max(totalSessionPrice - totalPaid, 0)
  
  const amountPaidStripe = actualPaidAmount !== null ? Number(actualPaidAmount) : 0;
  const amountPaidPromo = Number(discountAmount) || 0;
  const totalPaid = amountPaidStripe + amountPaidPromo; // ✅ Total paid (card + promo)
  
  // Use metadata totalSessionPrice if available, otherwise reconstruct from paid + discount
  const metadataTotal = parseFloat(session.metadata?.totalSessionPrice);
  const totalSessionPrice = !isNaN(metadataTotal) && metadataTotal > 0
    ? metadataTotal
    : totalPaid; // If no metadata total, totalPaid IS the total
  
  // ✅ BALANCE CALCULATION (after ALL payments)
  const balanceDue = Math.max(0, totalSessionPrice - totalPaid);
  
  // 🛡️ SAFETY: Validate no NaN/undefined/null in money fields
  if (isNaN(totalSessionPrice) || isNaN(totalPaid) || isNaN(balanceDue) || 
      isNaN(amountPaidStripe) || isNaN(amountPaidPromo)) {
    console.error('❌ CRITICAL: Invalid money values detected:', { 
      totalSessionPrice, 
      totalPaid, 
      amountPaidStripe,
      amountPaidPromo,
      balanceDue,
      metadata: session.metadata 
    });
    throw new Error('Invalid money values - cannot create booking snapshot');
  }
  
  // SESSION DATE/TIME - Parse with fallbacks
  const sessionDate = session.metadata?.sessionDate || ''; // DD/MM/YYYY
  const sessionTime = session.metadata?.sessionTime || ''; // HH:MM
  
  let sessionDateTime = null;
  let sessionDateFormatted = sessionDate || '—';
  let sessionTimeFormatted = sessionTime || '—';
  
  if (sessionDate && sessionTime) {
    try {
      // Handle both ISO (YYYY-MM-DD) and DD/MM/YYYY formats
      let year, month, day;
      if (sessionDate.includes('-')) {
        // ISO format: YYYY-MM-DD
        [year, month, day] = sessionDate.split('-');
      } else {
        // DD/MM/YYYY format
        [day, month, year] = sessionDate.split('/');
      }
      const dateTimeString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${sessionTime}:00`;
      sessionDateTime = new Date(dateTimeString).toISOString();
      
      // Format for display (e.g. "Monday, 12 January 2026")
      const dateObj = new Date(dateTimeString);
      sessionDateFormatted = dateObj.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Europe/London'
      });
      
      sessionTimeFormatted = sessionTime;
    } catch (error) {
      console.error('⚠️ Failed to parse session datetime:', error.message);
      // Keep fallback values set above
    }
  }
  
  // ADDONS
  let addons = [];
  if (session.metadata?.addons) {
    try {
      addons = JSON.parse(session.metadata.addons);
    } catch (error) {
      console.warn('⚠️ Failed to parse addons:', error.message);
      addons = [];
    }
  }
  
  // 🏷️ DURATION LABEL (smart display logic)
  // Rule: If package → show package name, else → show hours
  let durationLabel;
  if (packageName && pricingMode === 'package') {
    durationLabel = packageName;
  } else if (durationHours) {
    durationLabel = durationHours === 1 ? '1 hour' : `${durationHours} hours`;
  } else {
    durationLabel = 'Duration to be confirmed';
  }
  
  // 💳 PAYMENT STATUS
  const paymentStatus = balanceDue <= 0 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'unpaid');
  
  // 💬 DISPLAY TEXT HELPERS (smart formatting for customer-facing messages)
  // Deposit display logic:
  // - If 100% promo: "Paid via promo code (£X)"
  // - If partial promo: "£X (£Y card + £Z promo)"
  // - If standard payment: "£X"
  // - If no payment: "£0.00 (No deposit required)"
  let depositDisplayText;
  if (amountPaidPromo > 0 && amountPaidStripe === 0) {
    // 100% promo code payment
    depositDisplayText = `Paid via promo code (£${amountPaidPromo.toFixed(2)})`;
  } else if (amountPaidPromo > 0 && amountPaidStripe > 0) {
    // Partial promo + card
    depositDisplayText = `£${totalPaid.toFixed(2)} (£${amountPaidStripe.toFixed(2)} card + £${amountPaidPromo.toFixed(2)} promo)`;
  } else if (totalPaid > 0) {
    // Standard card payment
    depositDisplayText = `£${totalPaid.toFixed(2)}`;
  } else {
    // No payment
    depositDisplayText = '£0.00 (No deposit required)';
  }
  
  // Amount paid display: Same as depositDisplayText for consistency
  const amountPaidDisplay = depositDisplayText;
    // 📧 EMAIL TYPE - Determines which email template/messaging to use
  // Logic: "full_payment" when payment is complete OR balanceDue is 0
  //        "deposit_paid" only when deposit payment AND balance remains
  const paymentType = session.metadata?.paymentType || 'deposit';
  const emailType = (paymentType === 'full' || balanceDue <= 0) ? 'full_payment' : 'deposit_paid';
    // �🔑 BOOKING ID (Stripe session ID)
  const bookingId = session.id;
  
  // 🎯 Build final BookingSnapshot (SINGLE SOURCE OF TRUTH)
  const snapshot = {
    // Identifiers
    bookingId,
    
    // Customer
    customerName,
    customerEmail,
    
    // Booking details (GLOBAL - service-agnostic)
    service,
    pricingMode,              // "hourly" | "package"
    packageId,                // Only for package bookings
    packageName,              // Display name (or null for hourly)
    durationHours,            // SINGLE SOURCE OF TRUTH for duration (number)
    durationLabel,            // 🆕 Smart display string: "Half Day Session" | "3 hours"
    hours,                    // Only populated for hourly bookings (backward compat)
    
    // Session date/time (multiple formats for different use cases)
    sessionDateISO: sessionDateTime,        // 🆕 For calendar events
    sessionDateDisplay: sessionDateFormatted, // 🆕 For human-readable display
    sessionTimeDisplay: sessionTimeFormatted, // 🆕 For human-readable display
    sessionDate,              // Original format (DD/MM/YYYY or YYYY-MM-DD) - backward compat
    sessionTime,              // Original format (HH:MM) - backward compat
    sessionDateFormatted,     // Backward compat
    sessionTimeFormatted,     // Backward compat
    sessionDateTime,          // ISO format or null - backward compat
    sessionDateTimeISO: sessionDateTime, // Backward compat
    
    // 💰 Nested pricing object (clean separation of concerns)
    pricing: {
      basePrice: parseFloat(totalSessionPrice.toFixed(2)),         // Original total before any payments
      discountApplied: parseFloat(amountPaidPromo.toFixed(2)),     // Promo/discount amount
      stripePaid: parseFloat(amountPaidStripe.toFixed(2)),         // Amount paid via card
      amountPaid: parseFloat(totalPaid.toFixed(2)),                // Total paid (card + promo)
      depositPaid: parseFloat(totalPaid.toFixed(2)),               // Deposit amount (same as totalPaid)
      totalSessionPrice: parseFloat(totalSessionPrice.toFixed(2)), // Final total
      balanceDue: parseFloat(balanceDue.toFixed(2))                // Remaining amount owed
    },
    
    // 💳 Nested payment object (Stripe references and status)
    payment: {
      paymentMethod: 'stripe',                              // Always Stripe (no cash)
      promoCode: session.metadata?.promoCode || null,       // Promo code if used
      paymentLink: bookingRecord.paymentLink || null,       // Balance payment link
      paymentStatus,                                        // "paid" | "partially_paid" | "unpaid"
      stripeSessionId: bookingId,                           // Stripe Checkout Session ID
      stripePaymentIntentId: session.payment_intent || null // Stripe PaymentIntent ID
    },
    
    // 💬 Display text helpers (smart formatting for customer-facing messages)
    depositDisplayText,  // "Paid via promo code (£50)" | "£50.00 (£25 card + £25 promo)" | "£50.00"
    amountPaidDisplay,   // Same as depositDisplayText
    
    // � Email type (determines template/messaging)
    emailType,           // "full_payment" | "deposit_paid"
    
    // �🔙 Backward compatibility (flat fields for existing code)
    totalSessionPrice: parseFloat(totalSessionPrice.toFixed(2)),
    amountPaidStripe: parseFloat(amountPaidStripe.toFixed(2)),   // NEW: Card payment
    amountPaidPromo: parseFloat(amountPaidPromo.toFixed(2)),     // NEW: Promo discount
    totalPaid: parseFloat(totalPaid.toFixed(2)),                 // NEW: Total paid (card + promo)
    depositPaid: parseFloat(totalPaid.toFixed(2)),               // DEPRECATED: Use totalPaid
    discountAmount: parseFloat(amountPaidPromo.toFixed(2)),      // DEPRECATED: Use amountPaidPromo
    amountPaid: parseFloat(totalPaid.toFixed(2)),                // DEPRECATED: Use totalPaid
    balanceDue: parseFloat(balanceDue.toFixed(2)),
    paymentStatus,
    stripeSessionId: bookingId,
    stripePaymentIntentId: session.payment_intent || null,
    paymentLink: bookingRecord.paymentLink || null,
    reference: bookingId,
    
    // Additional
    addons: Array.isArray(addons) ? addons.map(a => a.name || a).join(', ') : ''
  };
  
  // 📊 COMPREHENSIVE LOGGING (as requested)
  console.log('📊 BookingSnapshot:', JSON.stringify({
    bookingId: snapshot.bookingId,
    customer: snapshot.customerName,
    service: snapshot.service,
    pricingMode: snapshot.pricingMode,
    durationLabel: snapshot.durationLabel,
    sessionDate: snapshot.sessionDateDisplay,
    sessionTime: snapshot.sessionTimeDisplay,
    money: {
      totalSessionPrice: snapshot.totalSessionPrice,
      amountPaidStripe: snapshot.amountPaidStripe,
      amountPaidPromo: snapshot.amountPaidPromo,
      totalPaid: snapshot.totalPaid,
      balanceDue: snapshot.balanceDue
    },
    payment: {
      paymentStatus: snapshot.paymentStatus,
      paymentMethod: snapshot.paymentMethod,
      promoCode: snapshot.promoCode,
      emailType: snapshot.emailType
    },
    display: {
      depositDisplayText: snapshot.depositDisplayText,
      amountPaidDisplay: snapshot.amountPaidDisplay
    }
  }, null, 2));
  
  return snapshot;
}

// Alias for backward compatibility
const buildBookingData = buildBookingSnapshot;

/**
 * Build normalized email data from booking object
 * Performs all calculations and formatting in one place
 * @param {Object} booking - Raw booking data from Stripe or Azure
 * @returns {Object} Normalized email-safe data object
 */
function buildEmailData(booking) {
  console.log('📧 Building email data from BookingSnapshot');
  
  // Extract and normalize basic booking fields
  const customerName = booking.customerName || booking.customer_details?.name || 'there';
  const customerEmail = booking.customerEmail || booking.customer_details?.email || '';
  const service = booking.service || '';
  const pricingMode = booking.pricingMode || 'hourly';
  
  // 🏷️ USE DURATION LABEL (smart display logic already calculated)
  const durationLabel = booking.durationLabel || 'Duration to be confirmed';
  const durationHours = booking.durationHours || booking.hours || 0;
  
  if (durationHours === 0) {
    console.warn('⚠️ durationHours is 0 or missing in buildEmailData');
  }
  
  // Generate packageName with intelligent fallbacks
  let packageName = booking.packageName;
  if (!packageName) {
    if (pricingMode === 'hourly' && durationHours) {
      packageName = `${durationHours} Hour ${service} Session`;
    } else if (service) {
      packageName = `${service} Session`;
    } else {
      packageName = 'Standard Studio Session';
    }
  }
  
  // hours field only for backward compatibility in templates
  const hours = booking.hours || durationHours;
  
  // Parse session date/time
  const sessionDate = booking.sessionDate || '';
  const sessionTime = booking.sessionTime || '';
  const sessionDateTime = booking.sessionDateTime || '';
  
  // Use formatted date/time if available (from buildBookingData), otherwise use raw
  const sessionDateFormatted = booking.sessionDateFormatted || sessionDate;
  const sessionTimeFormatted = booking.sessionTimeFormatted || sessionTime;
  
  // 💰 PAYMENT DETAILS - ONLY use new field names (totalSessionPrice, depositPaid, balanceDue)
  // These come from buildBookingSnapshot which gets them from Stripe PaymentIntent
  const total = parseFloat(booking.totalSessionPrice) || 0;
  const deposit = parseFloat(booking.depositPaid) || 0;
  const discount = parseFloat(booking.discountAmount) || 0;
  const balanceDue = parseFloat(booking.balanceDue) || 0;
  
  // 🛡️ STRICT VALIDATION - throw if required payment fields are missing or invalid
  if (isNaN(total) || isNaN(deposit) || isNaN(balanceDue)) {
    throw new Error(`Missing or invalid payment fields in booking data: total=${total}, deposit=${deposit}, balance=${balanceDue}`);
  }
  
  // Determine payment status
  const paymentStatus = balanceDue <= 0 ? 'Paid in Full' : 'Deposit Paid';
  
  // Generate reference (from Stripe session ID or Azure row key)
  const reference = booking.stripeSessionId || booking.rowKey || 'N/A';
  
  // Parse addons
  let addons = [];
  if (typeof booking.addons === 'string' && booking.addons) {
    addons = booking.addons.split(', ').filter(Boolean);
  } else if (Array.isArray(booking.addons)) {
    addons = booking.addons;
  }
  
  // Payment link (optional)
  const paymentLink = booking.paymentLink || null;
  
  // Session datetime ISO (for calendar links)
  const sessionDateTimeISO = booking.sessionDateTime || '';
  
  // ✅ Deposit display text (smart handling for promo-covered deposits)
  const depositDisplayText = booking.depositDisplayText || `£${deposit.toFixed(2)}`;
  const amountPaidDisplay = booking.amountPaidDisplay || depositDisplayText; // Use same as deposit if no specific display
  
  const emailData = {
    // Customer info
    customerName,
    customerEmail,
    
    // Booking details (GLOBAL)
    service,
    pricingMode,
    packageName,
    durationLabel,            // 🆕 Smart display string
    durationHours,            // SINGLE SOURCE OF TRUTH
    hours,                    // Backward compatibility
    sessionDate,
    sessionTime,
    sessionDateFormatted,
    sessionTimeFormatted,
    sessionDateTime,
    sessionDateTimeISO,
    
    // Payment info (from Stripe PaymentIntent - never NaN)
    total,
    deposit,
    discount,
    balanceDue,
    paymentStatus,
    depositDisplayText,      // ✅ Smart display: "Paid via promo code" | "£50.00"
    amountPaidDisplay,       // ✅ "£100 (£50 card + £50 promo)" | "£100 (promo code)" | "£100"
    
    // Additional info
    reference,
    addons,
    paymentLink
  };
  
  // 📊 LOG EMAIL DATA (as requested)
  console.log('📊 Email Data:', JSON.stringify({
    to: customerEmail,
    customer: customerName,
    service,
    durationLabel,
    pricing: { total, deposit, discount, balanceDue },
    paymentStatus
  }, null, 2));
  
  return emailData;
}

/**
 * Validate email data before sending
 * Logs warnings for missing optional fields but only throws for critical failures
 * @param {Object} data - Email data object from buildEmailData()
 * @returns {boolean} True if valid
 */
function validateEmailData(data) {
  // Critical fields - must exist
  const critical = ['customerEmail'];
  const missingCritical = critical.filter(field => !data[field]);
  
  if (missingCritical.length > 0) {
    throw new Error(`Missing critical email fields: ${missingCritical.join(', ')}`);
  }
  
  // Validate email format
  if (data.customerEmail && !data.customerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    throw new Error(`Invalid customer email format: ${data.customerEmail}`);
  }
  
  // Optional but recommended fields - log warnings only
  const recommended = ['service', 'packageName'];
  const missingRecommended = recommended.filter(field => !data[field]);
  
  if (missingRecommended.length > 0) {
    console.warn(`⚠️ Missing recommended email fields: ${missingRecommended.join(', ')}`);
  }
  
  // Validate numeric fields exist and are safe
  if (typeof data.total !== 'number' || isNaN(data.total)) {
    console.warn('⚠️ Invalid total amount:', data.total);
  }
  
  if (typeof data.deposit !== 'number' || isNaN(data.deposit)) {
    console.warn('⚠️ Invalid deposit amount:', data.deposit);
  }
  
  if (isNaN(data.balanceDue)) {
    console.warn('⚠️ Balance due is NaN');
  }
  
  return true;
}

module.exports = {
  buildBookingSnapshot,
  buildBookingData, // Alias for backward compatibility
  buildEmailData,
  validateEmailData
};
