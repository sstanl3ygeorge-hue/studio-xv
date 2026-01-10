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
          .details { background: #fff; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-size: 14px; font-weight: 400; color: #6b7280; }
          .value { font-size: 15px; font-weight: 600; color: #111827; text-align: right; }
          .highlight { background: #fff5e6; padding: 18px; border-left: 4px solid #f97316; margin: 20px 0; line-height: 1.7; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          @media only screen and (max-width: 480px) {
            .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; }
            .value { text-align: left; }
          }
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
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #111827;">Booking Details</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 400; color: #6b7280;">Service</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; font-weight: 600; color: #111827; text-align: right;">${data.service}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 400; color: #6b7280;">Package</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; font-weight: 600; color: #111827; text-align: right;">${data.packageName}</td>
              </tr>
              ${data.durationHours ? `<tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 400; color: #6b7280;">Duration</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; font-weight: 600; color: #111827; text-align: right;">${data.durationHours} ${data.durationHours === 1 ? 'hour' : 'hours'}</td>
              </tr>` : ''}
              ${data.sessionDateFormatted ? `<tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 400; color: #6b7280;">Date</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; font-weight: 600; color: #111827; text-align: right;">${data.sessionDateFormatted}</td>
              </tr>` : ''}
              ${data.sessionTimeFormatted ? `<tr>
                <td style="padding: 12px 0; ${data.sessionTimeFormatted ? 'border-bottom: none;' : 'border-bottom: 1px solid #f3f4f6;'} font-size: 14px; font-weight: 400; color: #6b7280;">Time</td>
                <td style="padding: 12px 0; ${data.sessionTimeFormatted ? 'border-bottom: none;' : 'border-bottom: 1px solid #f3f4f6;'} font-size: 15px; font-weight: 600; color: #111827; text-align: right;">${data.sessionTimeFormatted}</td>
              </tr>` : ''}
            </table>
          </div>

          <div class="details">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #111827;">Payment Summary</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 400; color: #6b7280;">Total Cost</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; font-weight: 600; color: #111827; text-align: right;">£${data.total}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; ${!isFullPayment ? 'border-bottom: 1px solid #f3f4f6;' : 'border-bottom: none;'} font-size: 14px; font-weight: 400; color: #6b7280;">${paymentLabel}</td>
                <td style="padding: 12px 0; ${!isFullPayment ? 'border-bottom: 1px solid #f3f4f6;' : 'border-bottom: none;'} font-size: 15px; font-weight: 600; color: #10b981; text-align: right;">£${data.deposit}</td>
              </tr>
              ${!isFullPayment ? `<tr>
                <td style="padding: 12px 0; border-bottom: none; font-size: 14px; font-weight: 400; color: #6b7280;">${balanceLabel}</td>
                <td style="padding: 12px 0; border-bottom: none; font-size: 15px; font-weight: 600; color: #f97316; text-align: right;">£${data.balanceDue}</td>
              </tr>` : ''}
            </table>
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
    subject: `⏰ Session Tomorrow – ${data.service} at Studio XV`,
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
          .details { background: #fff; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
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
          <h2 style="margin-bottom: 0.5rem;">Session Reminder</h2>
          <p style="margin-top: 0.5rem; margin-bottom: 1.5rem;">Hi ${data.customerName || 'there'},</p>
          <p>This is a reminder that your session is scheduled for tomorrow.</p>
          
          <div class="details">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #111827;">Booking Details</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 400; color: #6b7280;">Service</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; font-weight: 600; color: #111827; text-align: right;">${data.service}</td>
              </tr>
              ${data.packageName ? `<tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 400; color: #6b7280;">Package</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; font-weight: 600; color: #111827; text-align: right;">${data.packageName}</td>
              </tr>` : ''}
              ${data.sessionDate ? `<tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 400; color: #6b7280;">Date</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; font-weight: 600; color: #111827; text-align: right;">${data.sessionDate}</td>
              </tr>` : ''}
              ${data.sessionTime ? `<tr>
                <td style="padding: 12px 0; border-bottom: none; font-size: 14px; font-weight: 400; color: #6b7280;">Time</td>
                <td style="padding: 12px 0; border-bottom: none; font-size: 15px; font-weight: 600; color: #111827; text-align: right;">${data.sessionTime}</td>
              </tr>` : ''}
            </table>
          </div>

          <div class="highlight">
            <strong>Tomorrow Checklist:</strong><br><br>
            • Arrive 10 minutes early<br>
            • Bring session files or reference tracks${data.balanceDue > 0 ? '<br>• Balance payment ready' : ''}
          </div>

          ${data.balanceDue > 0 ? `<p style="margin-top: 20px;">Remaining balance of <strong>£${data.balanceDue}</strong> is due at the start of your session.</p>` : ''}

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
      ⏰ Session Tomorrow – ${data.service} at Studio XV

      Hi ${data.customerName || 'there'},

      This is a reminder that your session is scheduled for tomorrow.

      BOOKING DETAILS:
      Service: ${data.service}
      ${data.packageName ? `Package: ${data.packageName}` : ''}
      ${data.sessionDate ? `Date: ${data.sessionDate}` : ''}
      ${data.sessionTime ? `Time: ${data.sessionTime}` : ''}

      TOMORROW CHECKLIST:
      • Arrive 10 minutes early
      • Bring session files or reference tracks
      ${data.balanceDue > 0 ? '• Balance payment ready' : ''}

      ${data.balanceDue > 0 ? `Remaining balance of £${data.balanceDue} is due at the start of your session.\n` : ''}
      Questions or need to reschedule? Just reply to this email.

      — Studio XV
      ${STUDIO_INFO.email} · ${STUDIO_INFO.phone}
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
    subject: `Payment Reminder – £${(data.balanceDue || 0).toFixed(2)} Balance Due for Your Session`,
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
          .details { background: #fff; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="studio">STUDIO</div>
          <h1>XV</h1>
        </div>
        
        <div class="content">
          <h2 style="margin-bottom: 0.5rem;">Payment Reminder</h2>
          <p style="margin-top: 0.5rem; margin-bottom: 1.5rem;">Hi ${data.customerName || 'there'},</p>
          <p>This is a reminder that a remaining balance is due for your upcoming session.</p>
          
          <div class="details">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #111827;">Payment Summary</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 400; color: #6b7280;">Total Cost</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; font-weight: 600; color: #111827; text-align: right;">£${data.total || ((data.balanceDue || 0) + (data.deposit || 0)).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 400; color: #6b7280;">Deposit Paid</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; font-weight: 600; color: #10b981; text-align: right;">£${data.deposit || 0}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: none; font-size: 14px; font-weight: 400; color: #6b7280;">Remaining Balance</td>
                <td style="padding: 12px 0; border-bottom: none; font-size: 15px; font-weight: 600; color: #f97316; text-align: right;">£${(data.balanceDue || 0).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <p>The remaining balance is due at the start of your session. A secure payment link is included below.</p>

          ${data.paymentLink ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.paymentLink}" style="display: inline-block; background: #f97316; color: #fff !important; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Pay Remaining Balance</a>
          </div>
          ` : ''}

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
      Payment Reminder – £${(data.balanceDue || 0).toFixed(2)} Balance Due for Your Session

      Hi ${data.customerName || 'there'},

      This is a reminder that a remaining balance is due for your upcoming session.

      PAYMENT SUMMARY:
      Total Cost: £${data.total || ((data.balanceDue || 0) + (data.deposit || 0)).toFixed(2)}
      Deposit Paid: £${data.deposit || 0}
      Remaining Balance: £${(data.balanceDue || 0).toFixed(2)}

      The remaining balance is due at the start of your session. A secure payment link is included below.

      ${data.paymentLink ? `Pay online: ${data.paymentLink}\n` : ''}
      Questions or need to reschedule? Just reply to this email.

      — Studio XV
      ${STUDIO_INFO.email} · ${STUDIO_INFO.phone}
    `
  }),

  // ADMIN NOTIFICATION (internal use only)
  adminNotification: (data) => {
    const isFullPayment = data.emailType === 'full_payment' || data.balanceDue === 0 || parseFloat(data.balanceDue) === 0;
    const isSessionService = data.sessionDateFormatted && data.sessionTimeFormatted;
    
    // Dynamic subject line
    const subject = isFullPayment && !isSessionService
      ? `New Order — ${data.service} (Paid in Full) | £${data.deposit}`
      : `New Booking — ${data.service} | £${data.deposit} deposit${isSessionService ? ` | ${data.sessionDateFormatted}` : ''}`;
    
    // Dynamic next actions
    let nextActions = '';
    if (isFullPayment && !isSessionService) {
      nextActions = `NEXT ACTIONS:
• Coordinate delivery with customer
• No payment required (paid in full)`;
    } else if (!isFullPayment) {
      nextActions = `NEXT ACTIONS:
• Confirm session date and time with customer
• Collect balance of £${data.balanceDue} at session start`;
    } else {
      nextActions = `NEXT ACTIONS:
• Session confirmed
• No payment required (paid in full)`;
    }

    return {
      subject,
      text: `NEW BOOKING RECEIVED

BOOKING DETAILS:
Customer: ${data.customerName}
Email: ${data.customerEmail}
Service: ${data.service}
Package: ${data.packageName}
${data.durationHours ? `Duration: ${data.durationHours} ${data.durationHours === 1 ? 'hour' : 'hours'}` : ''}
${data.addons ? `Add-ons: ${data.addons}` : ''}
${isSessionService ? `Session: ${data.sessionDateFormatted} at ${data.sessionTimeFormatted}` : 'Session date: TO BE CONFIRMED'}

PAYMENT SUMMARY:
Total Cost: £${data.total}
Paid Today: £${data.deposit}
Balance Due: £${data.balanceDue}

${nextActions}

---
Stripe Session ID: ${data.stripeSessionId || 'N/A'}
${data.calendarStatus ? `Calendar: ${data.calendarStatus}` : ''}
`
    };
  },

  // ENQUIRY AUTO-REPLY (customer confirmation)
  enquiryAutoReply: (data) => {
    // Generate smart booking link based on service
    const serviceParam = {
      'Recording / Studio Session': 'recording',
      'Mixing or Mastering': 'mixing',
      'Beats / Production': 'production'
    }[data.service] || '';
    
    const bookingLink = serviceParam 
      ? `https://studioxv.co.uk/#booking?service=${serviceParam}`
      : 'https://studioxv.co.uk/#booking';

    return {
      subject: `Thanks for your enquiry — ${data.service}`,
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
          <h2 style="margin-bottom: 0.5rem;">Enquiry Received</h2>
          <p style="margin-top: 0.5rem; margin-bottom: 1.5rem;">Hi ${data.customerName || 'there'},</p>
          <p>Thanks for getting in touch about <strong>${data.service}</strong>.</p>
          
          <p>We've received your enquiry and will get back to you within 24 hours with more information about your project.</p>

          <div class="highlight">
            <strong>What happens next:</strong><br><br>
            • We'll review your project details<br>
            • We'll reach out with recommendations and pricing<br>
            • You can ask any questions before booking
          </div>

          <p style="margin-top: 20px;">If you'd like to book directly, you can do so at any time:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${bookingLink}" style="display: inline-block; background: #f97316; color: #fff !important; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Book Now</a>
          </div>

          <p style="margin-top: 30px; margin-bottom: 0.5rem;">Questions? Just reply to this email.</p>
          
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
      Thanks for your enquiry — ${data.service}

      Hi ${data.customerName || 'there'},

      Thanks for getting in touch about ${data.service}.

      We've received your enquiry and will get back to you within 24 hours with more information about your project.

      WHAT HAPPENS NEXT:
      • We'll review your project details
      • We'll reach out with recommendations and pricing
      • You can ask any questions before booking

      If you'd like to book directly, you can do so at any time:
      ${bookingLink}

      Questions? Just reply to this email.

      — Studio XV
      ${STUDIO_INFO.email} · ${STUDIO_INFO.phone}
    `
    };
  }
};

module.exports = { EMAIL_TEMPLATES, STUDIO_INFO };
