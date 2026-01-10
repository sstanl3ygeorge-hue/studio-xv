# Studio XV Reminder & Newsletter System

Complete implementation of automated session reminders, balance-due notifications, and newsletter infrastructure.

---

## 📋 Overview

This system implements three key features:

1. **Session Reminders**: Automated 24-hour and 2-hour reminders via SendGrid
2. **Balance-Due Reminders**: Payment reminders for unpaid session balances
3. **Newsletter System**: Clean opt-in/opt-out infrastructure for marketing emails

**Storage:** Azure Table Storage (for booking state and newsletter subscribers)
**Payments:** Stripe (source of truth for all payment data)
**Emails:** SendGrid (all customer-facing emails)

---

## 🗄️ Azure Table Storage Setup

### 1. Create Storage Account

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **Storage Account** (or use existing)
3. Recommended settings:
   - Performance: **Standard**
   - Replication: **LRS** (Locally-redundant storage)
   - Access tier: **Hot**
4. After creation, go to **Access keys** and copy:
   - Storage account name
   - Key (key1 or key2)

### 2. Create Tables

In Azure Portal > Storage Account > Storage Browser > Tables:

1. Create table: **bookings**
2. Create table: **newslettersubscribers**

**Or use Azure CLI:**
```bash
az storage table create --name bookings --account-name YOUR_STORAGE_ACCOUNT
az storage table create --name newslettersubscribers --account-name YOUR_STORAGE_ACCOUNT
```

---

## 🔧 Environment Variables

Add these to your Netlify environment variables:

### Required (Already Set)
- `FROM_EMAIL=bookings@studioxv.co.uk`
- `SENDGRID_API_KEY=[your_key]`
- `MICROSOFT_CLIENT_ID=[your_id]`
- `MICROSOFT_TENANT_ID=[your_id]`
- `MICROSOFT_CLIENT_SECRET=[your_secret]`
- `MICROSOFT_USER_EMAIL=bookings@studioxv.co.uk`
- `STRIPE_SECRET_KEY=[your_key]`
- `STRIPE_WEBHOOK_SECRET=[your_secret]`
- `URL=https://www.studioxv.co.uk`

### New (Need to Add)
- `AZURE_STORAGE_ACCOUNT=[your_storage_account_name]`
- `AZURE_STORAGE_KEY=[your_storage_account_key]`
- `NEWSLETTER_ADMIN_KEY=[generate_random_secret]`
- `SENDGRID_UNSUBSCRIBE_GROUP_ID=[optional_sendgrid_group_id]`

**Generate newsletter admin key:**
```bash
# In PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## 📦 Installation

```bash
# Install Azure Table Storage SDK
npm install @azure/data-tables
```

---

## 🚀 Deployed Functions

### Session Reminder System

**Function:** `send-session-reminders`
- **Schedule:** Every 15 minutes (`*/15 * * * *`)
- **Purpose:** Send 24h, 2h, and balance-due reminders
- **Email Provider:** SendGrid (customers only)

**How It Works:**
1. Queries FaunaDB for bookings needing reminders
2. Checks if reminder windows are met (23.75-24.25h, 1.75-2.25h)
3. Sends appropriate reminder via SendGrid
4. Marks reminder as sent to prevent duplicates
5. Idempotent - safe to run repeatedly

**Reminder Windows:**
- **24h reminder**: 23h 45m to 24h 15m before session
- **2h reminder**: 1h 45m to 2h 15m before session
- **Balance reminder**: Same as 24h (if balance > 0)

### Newsletter Functions

**1. Subscribe:** `/.netlify/functions/newsletter-subscribe`
```bash
POST /.netlify/functions/newsletter-subscribe
Content-Type: application/json

{
  "email": "customer@example.com",
  "name": "Customer Name",
  "source": "website"
}
```

**2. Unsubscribe:** `/.netlify/functions/newsletter-unsubscribe`
```bash
GET /unsubscribe?email=customer@example.com
# OR
POST /.netlify/functions/newsletter-unsubscribe
Content-Type: application/json

{
  "email": "customer@example.com"
}
```

**3. Send Newsletter:** `/.netlify/functions/send-newsletter`
```bash
POST /.netlify/functions/send-newsletter
Authorization: Bearer YOUR_NEWSLETTER_ADMIN_KEY
Content-Type: application/json

{
  "subject": "Studio XV Update - January 2026",
  "html": "<html>...</html>",
  "text": "Plain text version...",
  "previewText": "Optional preview text"
}
```

---

## 📧 Email Templates

All email templates are in [config/email-templates.js](config/email-templates.js):

- `reminder24h` - 24-hour session reminder
- `reminder2h` - 2-hour session reminder
- `balanceReminder` - Payment reminder with balance due
- `bookingConfirmation` - Existing booking confirmation

### Template Variables:

**Session Reminders:**
```javascript
{
  customerName: "John Doe",
  service: "Recording",
  sessionDate: "Friday, 10 January 2026",
  sessionTime: "14:00",
  hours: 4,
  balanceDue: 150
}
```

**Balance Reminder:**
```javascript
{
  customerName: "John Doe",
  service: "Recording",
  sessionDate: "Friday, 10 January 2026",
  sessionTime: "14:00",
  hours: 4,
  balanceDue: 150,
  paymentLink: "https://..." // Optional
}
```

---

## 📊 Azure Table Storage Schema

### Bookings Table

**Partition Key:** `booking`  
**Row Key:** Stripe session ID (`cs_test_...`)

```javascript
{
  partitionKey: "booking",
  rowKey: "cs_test_abc123...",
  stripeSessionId: "cs_test_abc123...",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  service: "Recording",
  packageName: "Standard Recording",
  hours: 4,
  total: 300,
  deposit: 150,
  balanceDue: 150,
  sessionDate: "10/01/2026",
  sessionTime: "14:00",
  sessionDateTime: "2026-01-10T14:00:00.000Z",
  addons: "Mixing, Mastering",
  paymentLink: "",
  
  // Reminder tracking
  reminder24hSent: false,
  reminder24hSentAt: "",
  reminder2hSent: false,
  reminder2hSentAt: "",
  balanceReminderSent: false,
  balanceReminderSentAt: "",
  
  createdAt: "2026-01-08T10:30:00.000Z"
}
```

### Newsletter Subscribers Table

**Partition Key:** `subscriber`  
**Row Key:** Email (sanitized for Azure Table Storage keys)

```javascript
{
  partitionKey: "subscriber",
  rowKey: "customer_example_com", // Email sanitized
  email: "customer@example.com",
  name: "Customer Name",
  source: "website",
  isSubscribed: true,
  subscribedAt: "2026-01-09T12:00:00.000Z",
  unsubscribedAt: "",
  resubscribedAt: ""
}
```

**Note:** Azure Table Storage automatically indexes on `partitionKey` and `rowKey`. No additional indexes needed.

---

## 🔄 Workflow

### Booking Flow (with Reminders)

1. **Customer Books Session**
   - Fills booking form with date/time
   - Completes Stripe checkout
   
2. **Stripe Webhook (`stripe-webhook.js`)**
   - Creates booking record in Azure Table Storage
   - Sends confirmation email (SendGrid)
   - Creates calendar event (Microsoft Graph)
   - Sends admin notification (Microsoft Graph)

3. **Scheduled Reminders (`send-session-reminders.js`)**
   - Runs every 15 minutes
   - Checks bookings needing reminders
   - Sends 24h reminder (if applicable)
   - Sends 2h reminder (if applicable)
   - Sends balance reminder (if balance > 0)
   - Marks reminders as sent

### Newsletter Flow

1. **Customer Subscribes**
   - Form submission → `newsletter-subscribe` function
   - Saved to Azure Table Storage
   - Receives welcome email

2. **Admin Sends Newsletter**
   - Prepares content (HTML + plain text)
   - POSTs to `send-newsletter` with admin key
   - System sends to all active subscribers
   - Automatic unsubscribe links added

3. **Customer Unsubscribes**
   - Clicks unsubscribe link
   - `newsletter-unsubscribe` marks as unsubscribed
   - No longer receives newsletters

---

## 🧪 Testing

### Test Reminder System Manually

```bash
# Trigger reminder check
curl -X POST https://www.studioxv.co.uk/.netlify/functions/send-session-reminders
```

### Test Newsletter Subscribe

```bash
curl -X POST https://www.studioxv.co.uk/.netlify/functions/newsletter-subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

### Test Newsletter Send

```bash
curl -X POST https://www.studioxv.co.uk/.netlify/functions/send-newsletter \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_NEWSLETTER_ADMIN_KEY" \
  -d '{
    "subject": "Test Newsletter",
    "html": "<h1>Test</h1><p>This is a test</p>",
    "text": "Test\n\nThis is a test"
  }'
```

---

## 🔒 Security

### Authentication
- Newsletter sending requires `NEWSLETTER_ADMIN_KEY` in Authorization header
- All customer emails sent via authenticated SendGrid sender
- Azure Storage access requires `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_KEY`

### Data Privacy
- Email addresses stored securely in Azure Table Storage
- Unsubscribe honored immediately
- No customer emails shared with third parties
- GDPR-compliant unsubscribe mechanism

---

## 📈 Monitoring

### Netlify Function Logs
- View logs: https://app.netlify.com/projects/tranquil-gingersnap-1d6974/logs/functions
- Check scheduled function runs
- Monitor reminder delivery rates

### SendGrid Dashboard
- Track email open rates
- Monitor bounce rates
- View unsubscribe rates

### Azure Portal
- View booking records in Table Storage
- Check subscriber counts
- Verify reminder status updates

---

## 🐛 Troubleshooting

### Reminders Not Sending

1. Check Azure Table Storage connection:
   - Verify `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_KEY` are set
   - Check tables exist: `bookings` and `newslettersubscribers`
   - Verify credentials in Azure Portal > Access keys

2. Check booking records:
   - Verify `sessionDateTime` is ISO format
   - Check `reminder24hSent` flags
   - Ensure timezone is UTC in database

3. Check function logs:
   - Look for errors in Netlify logs
   - Verify scheduled function is running every 15 minutes

### Newsletter Issues

1. Welcome email not sending:
   - Check SendGrid API key
   - Verify `FROM_EMAIL` is authenticated sender
   - Check function logs for errors

2. Unsubscribe not working:
   - Verify Azure Table Storage connection
   - Check email format (stored as lowercase)
   - View subscriber record in Azure Portal

---

## 📝 Next Steps

1. **Test End-to-End Flow:**
   - Create test booking with session date/time
   - Wait for 24h reminder window (or manually trigger)
   - Verify emails received

2. **Set Up Newsletter:**
   - Add newsletter signup form to website
   - Create first newsletter campaign
   - Monitor subscriber growth

3. **Monitor & Optimize:**
   - Track reminder delivery rates
   - Monitor booking conversion
   - Adjust reminder timing if needed

---

## 📞 Support

For issues or questions:
- Check Netlify function logs first
- Review Azure Table Storage for data issues
- Contact support: bookings@studioxv.co.uk

---

**Built with:** Azure Table Storage, SendGrid, Netlify Functions, Microsoft Graph  
**Timezone:** All session times in Europe/London (UTC/BST)  
**Storage:** Azure handles state, Stripe is source of truth for payments
