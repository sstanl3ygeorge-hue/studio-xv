// PRICING CONFIGURATION
// Update prices here - they'll automatically apply across the entire site

const PRICING = {
  // Individual Course Prices
  courses: {
    'finishing-tracks': { price: 35, name: 'Finishing Tracks Without Overthinking' },
    'mixing-fundamentals': { price: 35, name: 'Mixing Fundamentals' },
    'mastering-essentials': { price: 35, name: 'Mastering Essentials' },
    'compression-basics': { price: 35, name: 'Compression Basics' },
    'eq-fundamentals': { price: 35, name: 'EQ Fundamentals' },
    'reverb-depth': { price: 35, name: 'Reverb & Depth' },
    'delay-echo': { price: 35, name: 'Delay & Echo' },
    'stereo-width': { price: 35, name: 'Stereo Width' },
    'vocal-mixing': { price: 35, name: 'Vocal Mixing' },
    'drum-processing': { price: 35, name: 'Drum Processing' },
    'bass-management': { price: 35, name: 'Bass Management' },
    'automation-movement': { price: 35, name: 'Automation & Movement' },
    'parallel-processing': { price: 35, name: 'Parallel Processing' },
    'distortion-saturation': { price: 35, name: 'Distortion & Saturation' },
    'dynamic-control': { price: 35, name: 'Dynamic Control' },
    'frequency-balance': { price: 35, name: 'Frequency Balance' },
    'loudness-standards': { price: 35, name: 'Loudness Standards' },
    'reference-mixing': { price: 35, name: 'Reference Mixing' },
    'mix-bus-processing': { price: 35, name: 'Mix Bus Processing' },
    'creative-clarity': { price: 35, name: 'Creative Clarity' },
    'effects-chains': { price: 35, name: 'Effects Chains' },
    'spatial-design': { price: 35, name: 'Spatial Design' },
    'energy-dynamics': { price: 35, name: 'Energy & Dynamics' },
    'transition-techniques': { price: 35, name: 'Transition Techniques' },
    'layering-textures': { price: 35, name: 'Layering & Textures' },
    'genre-specifics': { price: 35, name: 'Genre-Specific Techniques' },
    'troubleshooting-fixes': { price: 35, name: 'Troubleshooting & Quick Fixes' },
    'export-delivery': { price: 35, name: 'Export & Delivery' },
    'deessing': { price: 35, name: 'De-essing' },
    'monitoring-setup': { price: 35, name: 'Monitoring & Room Setup' }
  },

  // Ebook Prices
  ebooks: {
    'finishing-tracks-ebook': { price: 18, name: 'Finishing Tracks Without Overthinking — Ebook' },
    'mixing-checklist': { price: 12, name: 'Mixing Checklist' },
    'mastering-guide': { price: 15, name: 'Mastering Guide' }
  },

  // Bundle Discounts (automatically applied)
  bundleDiscounts: {
    2: 0.10,  // 10% off when buying 2 items
    3: 0.20,  // 20% off when buying 3 items
    5: 0.30,  // 30% off when buying 5 items
    10: 0.40  // 40% off when buying 10 items
  },

  // Pre-configured Bundles
  bundles: {
    'finishing-framework': {
      name: 'The Finishing Framework Bundle',
      items: ['finishing-tracks', 'mixing-fundamentals', 'mastering-essentials'],
      originalPrice: 105,
      discountedPrice: 79,
      savings: 26
    },
    'mixing-mastery': {
      name: 'Mixing Mastery Bundle',
      items: ['compression-basics', 'eq-fundamentals', 'reverb-depth', 'delay-echo', 'vocal-mixing'],
      originalPrice: 175,
      discountedPrice: 129,
      savings: 46
    },
    'complete-academy': {
      name: 'Complete Academy',
      items: 'all-courses', // Special flag for all courses
      originalPrice: 1050,
      discountedPrice: 499,
      savings: 551
    }
  },

  // Promo Codes
  promoCodes: {
    'LAUNCH50': { type: 'percentage', value: 50, description: '50% off launch special' },
    'WELCOME20': { type: 'percentage', value: 20, description: '20% off for new customers' },
    'SAVE10': { type: 'fixed', value: 10, description: '£10 off your order' },
    'FREESHIP': { type: 'percentage', value: 10, description: '10% off' }
  },

  // Membership Tier Discounts
  membershipTiers: {
    'basic': { discount: 0, name: 'Basic' },
    'pro': { discount: 0.15, name: 'Pro Member (15% off all courses)' },
    'premium': { discount: 0.25, name: 'Premium Member (25% off all courses)' }
  }
};

// Helper function to calculate final price
function calculatePrice(items, promoCode = null, membershipTier = 'basic') {
  let subtotal = 0;
  const itemsList = [];

  // Calculate subtotal
  items.forEach(itemId => {
    const course = PRICING.courses[itemId] || PRICING.ebooks[itemId];
    if (course) {
      subtotal += course.price;
      itemsList.push({ id: itemId, ...course });
    }
  });

  // Apply bundle discount based on quantity
  let bundleDiscount = 0;
  const quantity = items.length;
  const discountKeys = Object.keys(PRICING.bundleDiscounts).map(Number).sort((a, b) => b - a);
  
  for (const qty of discountKeys) {
    if (quantity >= qty) {
      bundleDiscount = PRICING.bundleDiscounts[qty];
      break;
    }
  }

  // Apply membership discount
  const membershipDiscount = PRICING.membershipTiers[membershipTier]?.discount || 0;

  // Calculate discount (use highest discount)
  const discount = Math.max(bundleDiscount, membershipDiscount);
  const discountAmount = subtotal * discount;
  let total = subtotal - discountAmount;

  // Apply promo code
  let promoDiscount = 0;
  if (promoCode && PRICING.promoCodes[promoCode]) {
    const promo = PRICING.promoCodes[promoCode];
    if (promo.type === 'percentage') {
      promoDiscount = total * (promo.value / 100);
    } else if (promo.type === 'fixed') {
      promoDiscount = promo.value;
    }
    total -= promoDiscount;
  }

  // Ensure total doesn't go below 0
  total = Math.max(0, total);

  return {
    items: itemsList,
    subtotal,
    bundleDiscount: discount,
    bundleDiscountAmount: discountAmount,
    membershipDiscount,
    promoCode: promoCode,
    promoDiscount,
    total: Math.round(total * 100) / 100 // Round to 2 decimal places
  };
}

// Export for use in Node.js (Netlify Functions) and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRICING, calculatePrice };
}
