# Dynamic Course Pricing System

## Overview

Your site now has a dynamic pricing system that calculates prices automatically. No more hardcoded Stripe payment links!

## How It Works

### 1. **Pricing Configuration** (`config/pricing.js`)
All prices are stored in ONE file. Update here and changes apply everywhere:

```javascript
courses: {
  'finishing-tracks': { price: 35, name: 'Finishing Tracks Without Overthinking' },
  // ... all other courses
}
```

### 2. **Automatic Calculations**
The system automatically calculates:
- ✅ Bundle discounts (buy 3 = 20% off)
- ✅ Promo codes (LAUNCH50 = 50% off)
- ✅ Membership discounts (Pro = 15% off)
- ✅ Final total

### 3. **Stripe Integration**
Creates checkout sessions on-demand via Netlify Function (`netlify/functions/course-checkout.js`)

---

## How to Use

### Single Course Purchase

```html
<button onclick="window.courseCheckout.checkoutSingleCourse('finishing-tracks')">
  Buy Course
</button>
```

### Bundle Purchase

```html
<button onclick="window.courseCheckout.checkoutBundle('finishing-framework')">
  Buy Bundle
</button>
```

### With Promo Code

Users can enter promo codes in the UI. The system validates and applies them automatically.

**Available promo codes** (defined in `config/pricing.js`):
- `LAUNCH50` - 50% off
- `WELCOME20` - 20% off  
- `SAVE10` - £10 off
- `FREESHIP` - 10% off

---

## Updating Prices

### Change Individual Course Price

Edit `config/pricing.js`:

```javascript
'finishing-tracks': { price: 45, name: '...' }, // Changed from 35 to 45
```

That's it! Price updates everywhere automatically.

### Change Bundle Discount

```javascript
bundleDiscounts: {
  3: 0.25,  // Changed from 0.20 to 0.25 (25% off for 3 courses)
}
```

### Add New Promo Code

```javascript
promoCodes: {
  'SUMMER50': { type: 'percentage', value: 50, description: 'Summer sale!' },
}
```

### Add New Course

```javascript
courses: {
  'new-course-slug': { price: 35, name: 'New Course Name' },
}
```

---

## Testing Payments

### 1. Get Stripe Test Keys
- Go to stripe.com → Developers → API keys
- Toggle to "Test mode"
- Copy your keys

### 2. Set Environment Variables

Create `.env` file (or add to Netlify):
```
STRIPE_SECRET_KEY=sk_test_your_key_here
URL=http://localhost:8888
```

### 3. Test with Test Cards

- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

### 4. Run Local Server

```bash
netlify dev
```

---

## Updating Other Course Pages

To add dynamic pricing to other course pages:

### 1. Add Scripts (in `<head>`)

```html
<script src="config/pricing.js"></script>
<script src="js/course-checkout.js"></script>
```

### 2. Update Pricing Section

Replace static Stripe link:
```html
<!-- OLD -->
<a href="https://buy.stripe.com/test_...">Buy Course</a>

<!-- NEW -->
<button onclick="window.courseCheckout.checkoutSingleCourse('course-slug-here')">
  Buy Course
</button>
```

### 3. Add Promo Code Input (Optional)

See `course-finishing-tracks-info.html` for full example with promo code input.

---

## Bundle Pricing

Pre-configured bundles in `config/pricing.js`:

### Finishing Framework Bundle
- 3 courses: Finishing Tracks, Mixing Fundamentals, Mastering Essentials
- Price: £79 (save £26)

```html
<button onclick="window.courseCheckout.checkoutBundle('finishing-framework')">
  Buy Bundle
</button>
```

### Mixing Mastery Bundle  
- 5 courses
- Price: £129 (save £46)

### Complete Academy
- All 30 courses
- Price: £499 (save £551)

---

## Membership Tiers

Set customer membership level:

```javascript
window.courseCheckout.cart.membershipTier = 'pro'; // 15% off
window.courseCheckout.cart.membershipTier = 'premium'; // 25% off
```

Membership discounts apply automatically at checkout.

---

## Cart System (For Multi-Course Selection)

### Add to Cart

```html
<button onclick="window.courseCheckout.addToCart('finishing-tracks')">
  Add to Cart
</button>
```

### View Cart & Checkout

```javascript
// Get current cart
const cart = window.courseCheckout.cart;

// Calculate current pricing
const pricing = window.courseCheckout.updateCartDisplay();

// Proceed to checkout
window.courseCheckout.checkoutCart();
```

---

## Success Flow

1. User clicks "Buy Course"
2. System calculates final price (with any discounts)
3. Creates Stripe Checkout session via Netlify Function
4. Redirects to Stripe's secure payment page
5. After payment → redirects to `confirmation.html`

---

## Going Live

### 1. Get Live Stripe Keys
- Toggle Stripe dashboard to "Live mode"
- Get live API keys (start with `sk_live_...`)

### 2. Update Netlify Environment
- Site settings → Environment variables
- Change `STRIPE_SECRET_KEY` to live key
- Change `URL` to your live domain

### 3. Deploy
```bash
netlify deploy --prod
```

That's it! No payment links to update, everything works automatically.

---

## Benefits of This System

✅ **Single source of truth** - All prices in one file  
✅ **Automatic discounts** - Bundle/promo/membership calculated  
✅ **Easy updates** - Change price once, updates everywhere  
✅ **No manual Stripe links** - Generated on-demand  
✅ **Flexible** - Add new pricing logic anytime  
✅ **Scalable** - Works for 1 course or 1000 courses  

---

## Need Help?

The system is now active on:
- `course-finishing-tracks-info.html` (example with promo codes)

To add to other courses, follow the "Updating Other Course Pages" section above.

All pricing logic is in `config/pricing.js` - that's your control center!
