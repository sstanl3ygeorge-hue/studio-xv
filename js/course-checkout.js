// COURSE CHECKOUT HANDLER
// Dynamic pricing and Stripe checkout for courses and ebooks

// Load pricing configuration
let PRICING, calculatePrice;

// Check if running in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  const pricingModule = require('../config/pricing');
  PRICING = pricingModule.PRICING;
  calculatePrice = pricingModule.calculatePrice;
} else {
  // Browser environment - load from global scope
  // Make sure pricing.js is loaded before this script
  if (typeof window.PRICING !== 'undefined') {
    PRICING = window.PRICING;
    calculatePrice = window.calculatePrice;
  }
}

// Shopping cart state
let cart = {
  items: [],
  promoCode: null,
  membershipTier: 'basic'
};

// Add item to cart
function addToCart(courseId) {
  if (!cart.items.includes(courseId)) {
    cart.items.push(courseId);
    updateCartDisplay();
    return true;
  }
  return false;
}

// Remove item from cart
function removeFromCart(courseId) {
  cart.items = cart.items.filter(id => id !== courseId);
  updateCartDisplay();
}

// Apply promo code
function applyPromoCode(code) {
  const upperCode = code.toUpperCase();
  if (PRICING.promoCodes[upperCode]) {
    cart.promoCode = upperCode;
    updateCartDisplay();
    return { success: true, message: PRICING.promoCodes[upperCode].description };
  }
  return { success: false, message: 'Invalid promo code' };
}

// Update cart display
function updateCartDisplay() {
  const pricing = calculatePrice(cart.items, cart.promoCode, cart.membershipTier);
  
  // Dispatch custom event for UI updates
  const event = new CustomEvent('cartUpdated', { 
    detail: { cart, pricing } 
  });
  window.dispatchEvent(event);
  
  return pricing;
}

// Proceed to checkout (single course)
async function checkoutSingleCourse(courseId, customerEmail = null) {
  try {
    const response = await fetch('/.netlify/functions/course-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [courseId],
        promoCode: cart.promoCode,
        membershipTier: cart.membershipTier,
        customerEmail: customerEmail
      })
    });

    const data = await response.json();

    if (response.ok && data.url) {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Checkout failed');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Sorry, there was an error processing your checkout. Please try again.');
  }
}

// Proceed to checkout (multiple courses from cart)
async function checkoutCart(customerEmail = null) {
  if (cart.items.length === 0) {
    alert('Your cart is empty');
    return;
  }

  try {
    const response = await fetch('/.netlify/functions/course-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: cart.items,
        promoCode: cart.promoCode,
        membershipTier: cart.membershipTier,
        customerEmail: customerEmail
      })
    });

    const data = await response.json();

    if (response.ok && data.url) {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Checkout failed');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Sorry, there was an error processing your checkout. Please try again.');
  }
}

// Get price for a single course
function getCoursePrice(courseId) {
  return PRICING.courses[courseId] || PRICING.ebooks[courseId];
}

// Get bundle price
function getBundlePrice(bundleId) {
  return PRICING.bundles[bundleId];
}

// Checkout pre-configured bundle
async function checkoutBundle(bundleId, customerEmail = null) {
  const bundle = PRICING.bundles[bundleId];
  
  if (!bundle) {
    alert('Bundle not found');
    return;
  }

  const items = bundle.items === 'all-courses' 
    ? Object.keys(PRICING.courses)
    : bundle.items;

  try {
    const response = await fetch('/.netlify/functions/course-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: items,
        promoCode: null, // Bundles already have discount
        membershipTier: cart.membershipTier,
        customerEmail: customerEmail
      })
    });

    const data = await response.json();

    if (response.ok && data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Checkout failed');
    }
  } catch (error) {
    console.error('Bundle checkout error:', error);
    alert('Sorry, there was an error processing your checkout. Please try again.');
  }
}

// Export for use in HTML
if (typeof window !== 'undefined') {
  window.courseCheckout = {
    addToCart,
    removeFromCart,
    applyPromoCode,
    updateCartDisplay,
    checkoutSingleCourse,
    checkoutCart,
    checkoutBundle,
    getCoursePrice,
    getBundlePrice,
    cart
  };
}
