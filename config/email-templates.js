// EMAIL TEMPLATES FOR STUDIO XV
// All email content in one place for easy editing

const STUDIO_INFO = {
  name: 'Studio XV',
  email: 'bookings@studioxv.co.uk',
  phone: '+44 74 1831 5041',
  address: 'London, UK', // Update with your actual address
  website: 'https://studioxv.co.uk'
};

// Helper function to generate ICS download link
const generateICSLink = (data) => {
  if (!data.sessionDateTimeISO) return '';
  
  const baseURL = process.env.URL || 'https://www.studioxv.co.uk';
  const startISO = data.sessionDateTimeISO;
  const duration = data.durationHours || data.hours || 2;
  const endISO = new Date(new Date(startISO).getTime() + duration * 60 * 60 * 1000).toISOString();
  const title = encodeURIComponent(`Studio XV – ${data.service}`);
  const desc = encodeURIComponent(`${data.service} session (${duration} hours). Reply to this email to reschedule.`);
  const location = encodeURIComponent('Studio XV, London');
  
  return `${baseURL}/.netlify/functions/download-ics?title=${title}&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}&desc=${desc}&location=${location}`;
};

const EMAIL_TEMPLATES = {
  // BOOKING CONFIRMATION (supports both deposit and full payment)
  bookingConfirmation: (data) => {
    // Determine if this is a full payment or deposit booking
    const isFullPayment = data.emailType === 'full_payment' || data.balanceDue === 0;
    
    // Customize subject, heading, and intro based on payment type
    const subject = isFullPayment
      ? `✓ Payment Complete – ${data.service} at Studio XV`
      : `✓ Booking Confirmed – ${data.service} at Studio XV`;
    
    const heading = isFullPayment ? 'Payment Complete' : 'Booking Confirmed';
    
    const intro = isFullPayment
      ? `Your payment has been received. Your ${data.service.toLowerCase()} service is confirmed and ready to go.`
      : 'Your deposit has been received and your session is confirmed.';
    
    // Payment label customization
    const paymentLabel = isFullPayment ? 'Amount Paid' : 'Deposit Paid';
    const balanceLabel = isFullPayment ? 'Balance Due' : 'Remaining Balance';
    
    // Build next steps section based on payment type
    let nextStepsHtml = '<div class="highlight"><strong>What Happens Next:</strong><br><br>';
    if (isFullPayment) {
      if (data.sessionDateFormatted) {
        nextStepsHtml += `<strong>Session Details:</strong><br>`;
        nextStepsHtml += `Your session is scheduled for ${data.sessionDateFormatted} at ${data.sessionTimeFormatted}.<br><br>`;
        nextStepsHtml += `<strong>What to Bring:</strong><br>`;
        nextStepsHtml += `Session files, reference tracks, and any notes about your project.`;
      } else {
        nextStepsHtml += `<strong>Next Step:</strong><br>`;
        nextStepsHtml += `We'll contact you within 24 hours to coordinate delivery and finalize details for your ${data.service.toLowerCase()} service.`;
      }
    } else {
      nextStepsHtml += `<strong>1. Scheduling</strong><br>`;
      nextStepsHtml += `We'll contact you within 24 hours to confirm your session date and time.<br><br>`;
      nextStepsHtml += `<strong>2. Balance Payment</strong><br>`;
      nextStepsHtml += `The remaining balance of <strong>£${data.balanceDue}</strong> is due at the start of your session.<br><br>`;
      nextStepsHtml += `<strong>3. What to Bring</strong><br>`;
      nextStepsHtml += `Session files, reference tracks, and any notes about your project.`;
    }
    nextStepsHtml += '</div>';
    
    // Build next steps for plain text version
    let nextStepsText = 'WHAT HAPPENS NEXT:\n\n';
    if (isFullPayment) {
      if (data.sessionDateFormatted) {
        nextStepsText += `Session Details:\n`;
        nextStepsText += `Your session is scheduled for ${data.sessionDateFormatted} at ${data.sessionTimeFormatted}.\n\n`;
        nextStepsText += `What to Bring:\n`;
        nextStepsText += `Session files, reference tracks, and any notes about your project.`;
      } else {
        nextStepsText += `Next Step:\n`;
        nextStepsText += `We'll contact you within 24 hours to coordinate delivery and finalize details for your ${data.service.toLowerCase()} service.`;
      }
    } else {
      nextStepsText += `1. Scheduling\n`;
      nextStepsText += `We'll contact you within 24 hours to confirm your session date and time.\n\n`;
      nextStepsText += `2. Balance Payment\n`;
      nextStepsText += `The remaining balance of £${data.balanceDue} is due at the start of your session.\n\n`;
      nextStepsText += `3. What to Bring\n`;
      nextStepsText += `Session files, reference tracks, and any notes about your project.`;
    }
    
    return {
      subject,
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
          .highlight { background: #fff5e6; padding: 18px; border-left: 4px solid #f97316; margin: 20px 0; line-height: 1.7; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="studio">STUDIO</div>
          <h1>XV</h1>
        </div>
        
        <div class="content">
          <h2 style="margin-bottom: 0.5rem;">${heading}</h2>
          <p style="margin-top: 0.5rem; margin-bottom: 1.5rem;">Hi ${data.customerName || 'there'},</p>
          <p>${intro}</p>
          
          <div class="details">
            <h3 style="margin-top: 0;">Booking Details</h3>
            <div class="detail-row">
              <span class="label">Service</span>
              <span class="value">${data.service}</span>
            </div>
            <div class="detail-row">
              <span class="label">Package</span>
              <span class="value">${data.packageName}</span>
            </div>
            ${data.durationHours ? `<div class="detail-row"><span class="label">Duration</span><span class="value">${data.durationHours} ${data.durationHours === 1 ? 'hour' : 'hours'}</span></div>` : ''}
            ${data.sessionDateFormatted ? `<div class="detail-row"><span class="label">Date</span><span class="value">${data.sessionDateFormatted}</span></div>` : ''}
            ${data.sessionTimeFormatted ? `<div class="detail-row"><span class="label">Time</span><span class="value">${data.sessionTimeFormatted}</span></div>` : ''}
          </div>

          <div class="details">
            <h3 style="margin-top: 0;">Payment Summary</h3>
            <div class="detail-row">
              <span class="label">Total Cost</span>
              <span class="value">£${data.total}</span>
            </div>
            <div class="detail-row">
              <span class="label">${paymentLabel}</span>
              <span class="value" style="color: #10b981;">£${data.deposit}</span>
            </div>
            ${!isFullPayment ? `<div class="detail-row"><span class="label">${balanceLabel}</span><span class="value" style="color: #f97316; font-weight: bold;">£${data.balanceDue}</span></div>` : ''}
          </div>

          ${nextStepsHtml}

          <p style="margin-top: 30px; margin-bottom: 0.5rem;">Questions or need to reschedule? Just reply to this email.</p>
          
          <p style="margin-top: 2rem; margin-bottom: 0;"><strong>— Studio XV</strong></p>
        </div>

        <div class="footer">
          <p><strong>${STUDIO_INFO.name}</strong></p>
          <p>${STUDIO_INFO.email} · ${STUDIO_INFO.phone}</p>
        </div>
      </body>
      </html>
    `,
      text: `
      ${subject}

      Hi ${data.customerName || 'there'},

      ${intro}

      BOOKING DETAILS:
      Service: ${data.service}
      Package: ${data.packageName}
      ${data.durationHours ? `Duration: ${data.durationHours} ${data.durationHours === 1 ? 'hour' : 'hours'}` : ''}
      ${data.sessionDateFormatted ? `Date: ${data.sessionDateFormatted}` : ''}
      ${data.sessionTimeFormatted ? `Time: ${data.sessionTimeFormatted}` : ''}

      PAYMENT SUMMARY:
      Total Cost: £${data.total}
      ${paymentLabel}: £${data.deposit}
      ${!isFullPayment ? `${balanceLabel}: £${data.balanceDue}` : ''}

      ${nextStepsText}

      Questions or need to reschedule? Just reply to this email.

      — Studio XV
      ${STUDIO_INFO.email} · ${STUDIO_INFO.phone}
    `
    };
  },

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
          <h2>Welcome to ${data.courseName}</h2>
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
  // NOTE: This template uses different field names (date, time, balance) 
  // and is not compatible with the current reminder system.
  // Use reminder24h instead for automated reminders.
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
          <h2>Session Tomorrow</h2>
          <p>Hi ${data.customerName},</p>
          <p>Just a friendly reminder that your ${data.service} session is scheduled for tomorrow at <strong>${data.time}</strong>.</p>
          
          <div class="highlight">
            <strong>Session Details:</strong><br>
            When: ${data.date} at ${data.time}<br>
            Duration: ${data.durationLabel || 'Duration to be confirmed'}<br>
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
      Duration: ${data.durationLabel || 'Duration to be confirmed'}
      Remaining Balance: £${data.balance}

      Don't forget to bring your files and references!

      See you tomorrow!
      — Studio XV Team
    `
  }),

  // 24-HOUR SESSION REMINDER
  reminder24h: (data) => ({
    subject: `Tomorrow: ${data.service} Session at ${data.sessionTime}`,
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
          .highlight { background: #fff5e6; padding: 15px; border-left: 4px solid #f97316; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="studio">STUDIO</div>
          <h1>XV</h1>
        </div>
        
        <div class="content">
          <h2>Your Session is Tomorrow! 🎵</h2>
          <p>Hi ${data.customerName},</p>
          <p>Just a friendly reminder that your ${data.service} session is scheduled for <strong>tomorrow at ${data.sessionTime}</strong>.</p>
          
          <div class="details">
            <h3 style="margin-top: 0;">Session Details</h3>
            <p><strong>Date:</strong> ${data.sessionDate}</p>
            <p><strong>Time:</strong> ${data.sessionTime}</p>
            <p><strong>Duration:</strong> ${data.durationLabel || 'Duration to be confirmed'}</p>
            <p><strong>Service:</strong> ${data.service}</p>
          </div>

          ${data.balanceDue > 0 ? `
          <div class="highlight">
            <strong>💰 Payment Due:</strong><br>
            Remaining balance of <strong>£${data.balanceDue}</strong> is due at the session.
          </div>
          ` : ''}

          <h3>Please Bring:</h3>
          <ul>
            <li>All session files and projects</li>
            <li>Reference tracks (if applicable)</li>
            <li>Any specific notes or ideas</li>
            ${data.balanceDue > 0 ? '<li>Payment for remaining balance (£' + data.balanceDue + ')</li>' : ''}
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${generateICSLink(data)}" class="button" style="display: inline-block; background: #f97316; color: #fff !important; padding: 12px 30px; text-decoration: none; border-radius: 6px;">📅 Add to Calendar</a>
          </div>

          <p style="margin-top: 30px;">Looking forward to creating with you tomorrow!</p>
          <p><strong>— Studio XV Team</strong></p>
        </div>

        <div class="footer">
          <p><strong>${STUDIO_INFO.name}</strong></p>
          <p>${STUDIO_INFO.email} · ${STUDIO_INFO.phone}</p>
          <p>Need to reschedule? Just reply to this email.</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Your Session is Tomorrow!

      Hi ${data.customerName},

      Just a reminder that your ${data.service} session is tomorrow at ${data.sessionTime}.

      SESSION DETAILS:
      Date: ${data.sessionDate}
      Time: ${data.sessionTime}
      Duration: ${data.durationLabel || 'Duration to be confirmed'}
      Service: ${data.service}
      ${data.balanceDue > 0 ? `\nREMAINING BALANCE: £${data.balanceDue} (due at session)` : ''}

      PLEASE BRING:
      • All session files and projects
      • Reference tracks (if applicable)
      • Any specific notes or ideas
      ${data.balanceDue > 0 ? '• Payment for remaining balance (£' + data.balanceDue + ')' : ''}

      Looking forward to creating with you tomorrow!

      — Studio XV Team
      ${STUDIO_INFO.email} · ${STUDIO_INFO.phone}
      Need to reschedule? Just reply to this email.
    `
  }),

  // 2-HOUR SESSION REMINDER
  reminder2h: (data) => ({
    subject: `Starting Soon: ${data.service} Session in 2 Hours`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; letter-spacing: 0.3em; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .highlight { background: #fff5e6; padding: 20px; border-left: 4px solid #f97316; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="letter-spacing: 0.3em;">STUDIO XV</h1>
        </div>
        
        <div class="content">
          <h2>Your Session Starts Soon! ⏰</h2>
          <p>Hi ${data.customerName},</p>
          <p>Your ${data.service} session starts in approximately <strong>2 hours</strong>.</p>
          
          <div class="highlight">
            <p style="margin: 0; font-size: 18px;"><strong>📍 Starting at ${data.sessionTime}</strong></p>
          </div>

          <p>Make sure you have everything ready:</p>
          <ul>
            <li>✅ Session files</li>
            <li>✅ Reference tracks</li>
            ${data.balanceDue > 0 ? '<li>✅ Payment (£' + data.balanceDue + ' balance due)</li>' : ''}
          </ul>

          <p>See you soon!</p>
          <p><strong>— Studio XV Team</strong></p>
        </div>

        <div class="footer">
          <p>${STUDIO_INFO.email} · ${STUDIO_INFO.phone}</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Your Session Starts Soon!

      Hi ${data.customerName},

      Your ${data.service} session starts in approximately 2 hours.

      Starting at: ${data.sessionTime}

      Make sure you have:
      ✅ Session files
      ✅ Reference tracks
      ${data.balanceDue > 0 ? '✅ Payment (£' + data.balanceDue + ' balance due)' : ''}

      See you soon!

      — Studio XV Team
      ${STUDIO_INFO.email} · ${STUDIO_INFO.phone}
    `
  }),

  // BALANCE DUE REMINDER
  balanceReminder: (data) => ({
    subject: `Payment Reminder: £${(data.balanceDue || 0).toFixed(2)} Due for Tomorrow's Session`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; letter-spacing: 0.3em; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .payment-box { background: #fff; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #f97316; }
          .amount { font-size: 36px; color: #f97316; font-weight: bold; margin: 10px 0; }
          .button { display: inline-block; background: #f97316; color: #fff !important; padding: 15px 40px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 12px; letter-spacing: 0.3em; opacity: 0.8; margin-bottom: 10px;">STUDIO</div>
          <h1>XV</h1>
        </div>
        
        <div class="content">
          <h2>Balance Due for Your Session</h2>
          <p>Hi ${data.customerName},</p>
          <p>Your ${data.service} session is scheduled for <strong>tomorrow at ${data.sessionTime}</strong>.</p>
          <p>The remaining balance for your session is:</p>
          
          <div class="payment-box">
            <p style="margin: 0; color: #666;">Amount Due</p>
            <div class="amount">£${(data.balanceDue || 0).toFixed(2)}</div>
            <p style="margin: 0; color: #666; font-size: 14px;">Due on session day</p>
          </div>

          ${data.paymentLink ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.paymentLink}" class="button">Pay Balance Online</a>
          </div>
          <p style="text-align: center; color: #666; font-size: 14px;">Please complete payment before your session</p>
          ` : `
          <p style="text-align: center; margin: 20px 0; color: #e63946;"><strong>Payment link unavailable.</strong> Please contact us to complete payment.</p>
          `}

          <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Session Details:</strong></p>
            <p style="margin: 5px 0;">📅 ${data.sessionDate} at ${data.sessionTime}</p>
            <p style="margin: 5px 0;">⏱️ ${data.durationLabel || 'Duration to be confirmed'}</p>
            <p style="margin: 5px 0;">🎵 ${data.service}</p>
          </div>

          <p>If you have any questions or need to arrange an alternative payment method, just reply to this email.</p>
          
          <p style="margin-top: 30px;">Looking forward to your session tomorrow!</p>
          <p><strong>— Studio XV Team</strong></p>
        </div>

        <div class="footer">
          <p><strong>${STUDIO_INFO.name}</strong></p>
          <p>${STUDIO_INFO.email} · ${STUDIO_INFO.phone}</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Balance Due for Your Session

      Hi ${data.customerName},

      Your ${data.service} session is scheduled for tomorrow at ${data.sessionTime}.

      AMOUNT DUE: £${(data.balanceDue || 0).toFixed(2)}

      SESSION DETAILS:
      📅 ${data.sessionDate} at ${data.sessionTime}
      ⏱️ ${data.durationLabel || 'Duration to be confirmed'}
      🎵 ${data.service}

      ${data.paymentLink ? `Pay online: ${data.paymentLink}\n\nPlease complete payment before your session.` : 'Payment link unavailable. Please contact us to complete payment.'}

      If you have any questions, just reply to this email.

      Looking forward to your session tomorrow!

      — Studio XV Team
      ${STUDIO_INFO.email} · ${STUDIO_INFO.phone}
    `
  })
};

module.exports = { EMAIL_TEMPLATES, STUDIO_INFO };
