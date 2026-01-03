// STRIPE CONFIGURATION
// Store your Stripe publishable key here

const STRIPE_CONFIG = {
  // Test Mode Publishable Key
  publishableKey: 'pk_test_51SNePzH3pMeZHTyIOdyJGLL3VfRrnUozUEjmcfKXLM1NNuQ3P5w2WAinZFippva2ECXJzrguhXXB6BA4pzqfhYtI00zZOCm9uW',
  
  // For production, replace with live key:
  // publishableKey: 'pk_live_YOUR_LIVE_KEY_HERE',
};

// Export for browser use
if (typeof window !== 'undefined') {
  window.STRIPE_CONFIG = STRIPE_CONFIG;
}
