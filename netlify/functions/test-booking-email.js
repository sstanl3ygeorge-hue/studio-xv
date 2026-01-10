// DEV-ONLY: Test booking confirmation emails
// Safe test trigger for EMAIL_TEMPLATES.bookingConfirmation
// NO Stripe, NO real customers, NO production impact

const sgMail = require('@sendgrid/mail');
const { EMAIL_TEMPLATES, STUDIO_INFO } = require('../../config/email-templates');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// 🛡️ SAFETY: Emails ONLY sent to this address (never to real customers)
const TEST_RECIPIENT = process.env.MICROSOFT_USER_EMAIL || 'bookings@studioxv.co.uk';

// Mock booking data for testing
const MOCK_BOOKINGS = {
  // Deposit booking (session-based)
  deposit: {
    customerName: 'Test Customer',
    customerEmail: 'test@example.com', // Not used (hardcoded recipient)
    service: 'Recording',
    packageName: 'Half Day Session',
    durationHours: 4,
    sessionDateFormatted: 'Monday, 20 January 2026',
    sessionTimeFormatted: '14:00',
    total: '160.00',
    deposit: '80.00',
    balanceDue: '80.00',
    emailType: 'deposit' // Triggers deposit variant
  },

  // Paid-in-full booking (Production/Beats)
  fullPayment: {
    customerName: 'Test Customer',
    customerEmail: 'test@example.com', // Not used (hardcoded recipient)
    service: 'Production',
    packageName: 'Exclusive Beat',
    durationHours: null, // Production services may not have duration
    sessionDateFormatted: null, // No session date for production
    sessionTimeFormatted: null,
    total: '250.00',
    deposit: '250.00',
    balanceDue: '0.00',
    emailType: 'full_payment' // Triggers paid-in-full variant
  }
};

// Mock reminder data for testing
const MOCK_REMINDERS = {
  // 24-hour reminder (session with balance due)
  reminder24h: {
    customerName: 'Test Customer',
    service: 'Recording',
    packageName: 'Half Day Session',
    sessionDate: 'Monday, 20 January 2026',
    sessionTime: '14:00',
    durationLabel: '4 hours',
    balanceDue: 80.00
  },

  // Balance reminder (payment reminder)
  balanceReminder: {
    customerName: 'Test Customer',
    service: 'Mixing',
    sessionDate: 'Tuesday, 21 January 2026',
    sessionTime: '10:00',
    durationLabel: '2 hours',
    total: '120.00',
    deposit: '60.00',
    balanceDue: 60.00,
    paymentLink: 'https://studioxv.co.uk/test-payment-link'
  }
};

exports.handler = async (event) => {
  // Only allow GET (safest HTTP method for testing)
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed. Use GET.' })
    };
  }

  try {
    // 🛡️ SAFETY CHECK: Prevent accidental production use
    const isDevelopment = process.env.CONTEXT === 'dev' || 
                          process.env.CONTEXT === 'deploy-preview' ||
                          process.env.URL?.includes('localhost') ||
                          process.env.URL?.includes('netlify.app');

    if (!isDevelopment && process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Test email function called in production environment - blocked');
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Test function disabled in production',
          hint: 'Only available in dev/preview environments'
        })
      };
    }

    // Get variant from query string (default: deposit)
    const variant = event.queryStringParameters?.variant || 'deposit';
    const type = event.queryStringParameters?.type;

    // Determine if this is a reminder test or booking confirmation test
    const isReminderTest = type === 'reminder24h' || type === 'balanceReminder';

    if (isReminderTest) {
      // Test reminder emails
      if (!['reminder24h', 'balanceReminder'].includes(type)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Invalid reminder type',
            allowed: ['reminder24h', 'balanceReminder']
          })
        };
      }

      console.log(`🧪 Testing reminder email type: ${type}`);
      console.log(`📧 Sending test reminder to: ${TEST_RECIPIENT}`);

      // Get mock reminder data
      const mockData = MOCK_REMINDERS[type];

      // Generate email using centralized template
      const emailContent = EMAIL_TEMPLATES[type](mockData);

      // 🛡️ SAFETY: Prepend [TEST REMINDER] to subject line
      const testSubject = `[TEST REMINDER] ${emailContent.subject}`;

      // Send test email
      const msg = {
        to: TEST_RECIPIENT, // 🛡️ HARDCODED - never from request
        from: {
          email: process.env.FROM_EMAIL || 'bookings@studioxv.co.uk',
          name: STUDIO_INFO.name
        },
        subject: testSubject,
        html: emailContent.html,
        text: emailContent.text
      };

      await sgMail.send(msg);

      console.log(`✅ Test reminder sent successfully to ${TEST_RECIPIENT}`);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Test reminder sent',
          type: type,
          recipient: TEST_RECIPIENT,
          subject: testSubject,
          note: 'This is a test reminder with mock data. No real reminder was triggered.'
        })
      };

    } else {
      // Test booking confirmation emails (existing logic)
      if (!['deposit', 'fullPayment'].includes(variant)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Invalid variant',
            allowed: ['deposit', 'fullPayment']
          })
        };
      }

      console.log(`🧪 Testing booking email variant: ${variant}`);
      console.log(`📧 Sending test email to: ${TEST_RECIPIENT}`);

      // Get mock data for requested variant
      const mockData = MOCK_BOOKINGS[variant];

      // Generate email using centralized template
      const emailContent = EMAIL_TEMPLATES.bookingConfirmation(mockData);

      // 🛡️ SAFETY: Prepend [TEST] to subject line
      const testSubject = `[TEST] ${emailContent.subject}`;

      // Send test email
      const msg = {
        to: TEST_RECIPIENT, // 🛡️ HARDCODED - never from request
        from: {
          email: process.env.FROM_EMAIL || 'bookings@studioxv.co.uk',
          name: STUDIO_INFO.name
        },
        subject: testSubject,
        html: emailContent.html,
        text: emailContent.text
      };

      await sgMail.send(msg);

      console.log(`✅ Test email sent successfully to ${TEST_RECIPIENT}`);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Test email sent',
          variant: variant,
          recipient: TEST_RECIPIENT,
          subject: testSubject,
          note: 'This is a test email with mock data. No real booking was created.'
        })
      };
    }

  } catch (error) {
    console.error('❌ Test email failed:', error.message);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to send test email',
        details: error.message
      })
    };
  }
};
