# Email Setup Guide - Resend.com

## What's Been Set Up

✅ **Email Templates** - Professional HTML emails for:
- Booking confirmation (after deposit paid)
- Course purchase confirmation
- Session reminder (day before)
- Balance payment reminder

✅ **Netlify Functions** - Automated email sending:
- `send-email.js` - Manual email sending
- `stripe-webhook.js` - Automatic emails after payment

---

## Setup Steps

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up (free tier: 3,000 emails/month)
3. Verify your email address

### 2. Get API Key

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it "Studio XV Production"
4. Copy the key (starts with `re_...`)

### 3. Verify Your Domain (Important!)

**Without this, emails will come from `onboarding@resend.dev`**

1. In Resend, go to **Domains**
2. Click **Add Domain**
3. Enter your domain: `studioxv.co.uk`
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (usually 5-15 minutes)

Common DNS records you'll add:
```
Type: TXT
Name: resend._domainkey
Value: [provided by Resend]

Type: MX
Name: @
Value: feedback-smtp.resend.com
Priority: 10
```

### 4. Add Environment Variables

#### For Local Testing (`.env` file):
```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=hello@studioxv.co.uk
```

#### For Production (Netlify Dashboard):
1. Go to Site settings → Environment variables
2. Add these variables:
   - `RESEND_API_KEY` = your Resend API key
   - `RESEND_FROM_EMAIL` = `hello@studioxv.co.uk` (or your preferred email)

### 5. Set Up Stripe Webhook

**This makes emails send automatically after payment**

#### For Production:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click **Add endpoint**
3. Endpoint URL: `https://studioxv.co.uk/.netlify/functions/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed`
5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add to Netlify environment variables:
   - `STRIPE_WEBHOOK_SECRET` = your webhook secret

#### For Local Testing:
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook
```

---

## How It Works

### Automatic Emails (via Webhook)

When a payment succeeds:
1. Stripe sends webhook to your site
2. `stripe-webhook.js` receives it
3. Function sends appropriate email:
   - **Bookings** → Booking confirmation email
   - **Courses** → Course access email

### Manual Emails (via API)

You can also send emails manually:

```javascript
// Send session reminder
fetch('/.netlify/functions/send-email', {
  method: 'POST',
  body: JSON.stringify({
    type: 'sessionReminder',
    to: 'customer@example.com',
    data: {
      customerName: 'John',
      service: 'Mixing',
      date: 'Monday, Jan 15',
      time: '2:00 PM',
      hours: 3,
      balance: 50
    }
  })
});

// Send balance reminder
fetch('/.netlify/functions/send-email', {
  method: 'POST',
  body: JSON.stringify({
    type: 'balanceReminder',
    to: 'customer@example.com',
    data: {
      customerName: 'John',
      balance: 50,
      paymentLink: 'https://buy.stripe.com/...'
    }
  })
});
```

---

## Email Templates

All email content is in: `config/email-templates.js`

### Customize Your Emails

Edit this file to change:
- Email design and colors
- Your studio contact info
- Email copy and messaging

```javascript
// Update studio info
const STUDIO_INFO = {
  name: 'Studio XV',
  email: 'hello@studioxv.co.uk',
  phone: '+44 (0) 20 1234 5678', // ← Update this
  address: 'London, UK',          // ← Update this
  website: 'https://studioxv.co.uk'
};
```

---

## Testing

### Test Email Sending Locally

1. Start dev server: `netlify dev`
2. Make a test booking payment
3. Check Netlify function logs for email status

### Test Email Template

You can preview emails by temporarily adding HTML to a test page:

```html
<!-- Save as test-email.html -->
<body>
  <!-- Paste email HTML from template here -->
</body>
```

---

## Email Types

### 1. Booking Confirmation
**Sent:** Automatically after deposit payment  
**Includes:**
- Session details
- Payment summary (deposit paid, balance due)
- Next steps
- What to prepare

### 2. Course Confirmation
**Sent:** Automatically after course purchase  
**Includes:**
- Course access link
- What's included
- Welcome message

### 3. Session Reminder
**Sent:** Manually (you trigger it)  
**Best time:** Day before session  
**Includes:**
- Session time and date
- Balance reminder
- What to bring

### 4. Balance Reminder
**Sent:** Manually after session  
**Includes:**
- Amount due
- Payment link
- When files will be sent

---

## Sending Manual Emails

Create a simple admin interface or use this script:

```javascript
// send-reminder.js - Run with Node.js
const fetch = require('node-fetch');

async function sendSessionReminder() {
  const response = await fetch('https://studioxv.co.uk/.netlify/functions/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'sessionReminder',
      to: 'customer@example.com',
      data: {
        customerName: 'John Smith',
        service: 'Mixing',
        date: 'Monday, January 15, 2026',
        time: '2:00 PM',
        hours: 3,
        balance: 75
      }
    })
  });
  
  const result = await response.json();
  console.log('Email sent:', result);
}

sendSessionReminder();
```

---

## Troubleshooting

### Emails Not Sending

1. **Check API key**: Make sure `RESEND_API_KEY` is set correctly
2. **Check logs**: Look at Netlify function logs for errors
3. **Check domain**: Verify your domain is verified in Resend
4. **Check webhook**: Ensure webhook secret is correct

### Emails Going to Spam

1. **Verify domain**: Must use verified domain, not `onboarding@resend.dev`
2. **Add SPF/DKIM**: Resend provides these, add to your DNS
3. **Add DMARC**: Optional but recommended

### Webhook Not Firing

1. **Check endpoint URL**: Should be `https://yourdomain/.netlify/functions/stripe-webhook`
2. **Check webhook secret**: Must match in Stripe and environment variables
3. **Test webhook**: Use Stripe CLI to test locally

---

## Cost

**Resend Free Tier:**
- 3,000 emails/month
- 100 emails/day
- Free forever

**If you exceed:**
- Pay-as-you-go: $1 per 1,000 emails
- Very affordable for studio business

---

## Next Steps

1. ✅ Create Resend account
2. ✅ Get API key
3. ✅ Verify your domain
4. ✅ Add environment variables to `.env` and Netlify
5. ✅ Set up Stripe webhook
6. ✅ Test a booking to receive confirmation email
7. ✅ Customize email templates with your branding

---

## Questions?

All email logic is in:
- `netlify/functions/send-email.js` - Manual sending
- `netlify/functions/stripe-webhook.js` - Automatic sending
- `config/email-templates.js` - Email content and design

Edit these files to customize behavior!
