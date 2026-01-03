// EMAIL TEMPLATES FOR STUDIO XV
// All email content in one place for easy editing

const STUDIO_INFO = {
  name: 'Studio XV',
  email: 'bookings@studioxv.co.uk',
  phone: '+44 (0) 20 1234 5678', // Update with your actual phone
  address: 'London, UK', // Update with your actual address
  website: 'https://studioxv.co.uk'
};

const EMAIL_TEMPLATES = {
  // BOOKING CONFIRMATION (after deposit paid)
  bookingConfirmation: (data) => ({
    subject: `Booking Confirmed: ${data.service} Session at Studio XV`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; letter-spacing: 0.3em; }
          .header .studio { font-size: 12px; letter-spacing: 0.3em; opacity: 0.8; margin-bottom: 10px; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .details { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #666; }
          .value { color: #000; }
          .highlight { background: #fff5e6; padding: 15px; border-left: 4px solid #f97316; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #f97316; color: #fff !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="studio">STUDIO</div>
          <h1>XV</h1>
        </div>
        
        <div class="content">
          <h2>Your Session is Confirmed! 🎵</h2>
          <p>Hi ${data.customerName || 'there'},</p>
          <p>Thank you for booking with Studio XV. Your deposit has been received and your session is confirmed.</p>
          
          <div class="details">
            <h3 style="margin-top: 0;">Session Details</h3>
            <div class="detail-row">
              <span class="label">Service:</span>
              <span class="value">${data.service}</span>
            </div>
            <div class="detail-row">
              <span class="label">Package:</span>
              <span class="value">${data.packageName}</span>
            </div>
            ${data.hours ? `
            <div class="detail-row">
              <span class="label">Duration:</span>
              <span class="value">${data.hours} hours</span>
            </div>
            ` : ''}
            ${data.addons && data.addons.length > 0 ? `
            <div class="detail-row">
              <span class="label">Add-ons:</span>
              <span class="value">${data.addons.map(a => a.label).join(', ')}</span>
            </div>
            ` : ''}
          </div>

          <div class="details">
            <h3 style="margin-top: 0;">Payment Summary</h3>
            <div class="detail-row">
              <span class="label">Total Session Cost:</span>
              <span class="value">£${data.total}</span>
            </div>
            <div class="detail-row">
              <span class="label">Deposit Paid:</span>
              <span class="value" style="color: #10b981;">£${data.deposit}</span>
            </div>
            <div class="detail-row">
              <span class="label">Balance Due:</span>
              <span class="value" style="color: #f97316; font-weight: bold;">£${data.total - data.deposit}</span>
            </div>
          </div>

          <div class="highlight">
            <strong>Next Steps:</strong><br>
            • We'll contact you within 24 hours to schedule your session<br>
            • The remaining balance of £${data.total - data.deposit} is due on the session day<br>
            • Please bring any files or references you'd like to work with
          </div>

          <h3>What to Prepare:</h3>
          <ul>
            <li>Session files (stems, tracks, or project files)</li>
            <li>Reference tracks that inspire your sound</li>
            <li>Any specific notes or goals for the session</li>
          </ul>

          <p style="margin-top: 30px;">If you have any questions or need to reschedule, just reply to this email.</p>
          
          <p>Looking forward to creating something great together!</p>
          <p><strong>— Studio XV Team</strong></p>
        </div>

        <div class="footer">
          <p><strong>${STUDIO_INFO.name}</strong></p>
          <p>${STUDIO_INFO.email} · ${STUDIO_INFO.phone}</p>
          <p>${STUDIO_INFO.address}</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Booking Confirmed: ${data.service} Session at Studio XV

      Hi ${data.customerName || 'there'},

      Thank you for booking with Studio XV. Your deposit has been received and your session is confirmed.

      SESSION DETAILS:
      Service: ${data.service}
      Package: ${data.packageName}
      ${data.hours ? `Duration: ${data.hours} hours` : ''}

      PAYMENT SUMMARY:
      Total Session Cost: £${data.total}
      Deposit Paid: £${data.deposit}
      Balance Due: £${data.total - data.deposit}

      NEXT STEPS:
      • We'll contact you within 24 hours to schedule your session
      • The remaining balance of £${data.total - data.deposit} is due on the session day
      • Please bring any files or references you'd like to work with

      If you have any questions, just reply to this email.

      Looking forward to creating something great together!

      — Studio XV Team
      ${STUDIO_INFO.email} · ${STUDIO_INFO.phone}
    `
  }),

  // COURSE PURCHASE CONFIRMATION
  courseConfirmation: (data) => ({
    subject: `Access Your Course: ${data.courseName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; letter-spacing: 0.3em; }
          .header .studio { font-size: 12px; letter-spacing: 0.3em; opacity: 0.8; margin-bottom: 10px; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #f97316; color: #fff !important; padding: 15px 40px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="studio">STUDIO</div>
          <h1>XV</h1>
        </div>
        
        <div class="content">
          <h2>Welcome to ${data.courseName}! 🎓</h2>
          <p>Hi ${data.customerName || 'there'},</p>
          <p>Your payment has been processed and you now have full access to your course.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.courseUrl}" class="button">Access Your Course</a>
          </div>

          <h3>What's Included:</h3>
          <ul>
            <li>Full course video content</li>
            <li>Lifetime access - watch anytime</li>
            <li>Course materials and resources</li>
          </ul>

          <p style="margin-top: 30px;">We hope you enjoy the course! If you have any questions, feel free to reach out.</p>
          
          <p><strong>— Studio XV Team</strong></p>
        </div>

        <div class="footer">
          <p><strong>${STUDIO_INFO.name}</strong></p>
          <p>${STUDIO_INFO.email}</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to ${data.courseName}!

      Hi ${data.customerName || 'there'},

      Your payment has been processed and you now have full access to your course.

      Access your course here: ${data.courseUrl}

      What's Included:
      • Full course video content
      • Lifetime access - watch anytime
      • Course materials and resources

      We hope you enjoy the course!

      — Studio XV Team
      ${STUDIO_INFO.email}
    `
  }),

  // SESSION REMINDER (day before)
  sessionReminder: (data) => ({
    subject: `Reminder: Your Studio Session Tomorrow at ${data.time}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .highlight { background: #fff5e6; padding: 15px; border-left: 4px solid #f97316; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; letter-spacing: 0.3em;">STUDIO XV</h1>
        </div>
        
        <div class="content">
          <h2>Session Tomorrow! ⏰</h2>
          <p>Hi ${data.customerName},</p>
          <p>Just a friendly reminder that your ${data.service} session is scheduled for tomorrow at <strong>${data.time}</strong>.</p>
          
          <div class="highlight">
            <strong>Session Details:</strong><br>
            When: ${data.date} at ${data.time}<br>
            Duration: ${data.hours} hours<br>
            Remaining Balance: £${data.balance}
          </div>

          <h3>Don't Forget:</h3>
          <ul>
            <li>Bring your session files</li>
            <li>Reference tracks (if any)</li>
            <li>The remaining balance of £${data.balance} is due at the session</li>
          </ul>

          <p>See you tomorrow!</p>
          <p><strong>— Studio XV Team</strong></p>
        </div>
      </body>
      </html>
    `,
    text: `
      Session Tomorrow!

      Hi ${data.customerName},

      Just a reminder that your ${data.service} session is tomorrow at ${data.time}.

      Session Details:
      When: ${data.date} at ${data.time}
      Duration: ${data.hours} hours
      Remaining Balance: £${data.balance}

      Don't forget to bring your files and references!

      See you tomorrow!
      — Studio XV Team
    `
  }),

  // PAYMENT REMINDER (balance due)
  balanceReminder: (data) => ({
    subject: `Balance Due: £${data.balance} for Your Studio Session`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; background: #f97316; color: #fff !important; padding: 15px 40px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="content">
          <h2>Balance Due for Your Session</h2>
          <p>Hi ${data.customerName},</p>
          <p>Thank you for your recent session at Studio XV! The remaining balance of <strong>£${data.balance}</strong> is now due.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.paymentLink}" class="button">Pay Balance (£${data.balance})</a>
          </div>

          <p>Once payment is received, we'll send you your final files.</p>
          <p>If you have any questions, just reply to this email.</p>
          
          <p><strong>— Studio XV Team</strong></p>
        </div>
      </body>
      </html>
    `,
    text: `
      Balance Due for Your Session

      Hi ${data.customerName},

      Thank you for your recent session! The remaining balance of £${data.balance} is now due.

      Pay online here: ${data.paymentLink}

      Once payment is received, we'll send you your final files.

      — Studio XV Team
    `
  })
};

module.exports = { EMAIL_TEMPLATES, STUDIO_INFO };
