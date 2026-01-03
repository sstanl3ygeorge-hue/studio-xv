// STRIPE CONFIGURATION
// Store your Stripe publishable key here

const STRIPE_CONFIG = {
  // Live Mode Publishable Key (PRODUCTION)
  publishableKey: 'pk_live_51SNePzH3pMeZHTyIDPeymWwO6dBB11WjOrHBj69RKatibD0WaBIIZ4Om4UaAIO7M0lCEZ5KFMlomCDTTic6EZm4r00WllUHGNk',
  
  // For testing, use test key:
  // publishableKey: 'pk_test_51SNePzH3pMeZHTyIOdyJGLL3VfRrnUozUEjmcfKXLM1NNuQ3P5w2WAinZFippva2ECXJzrguhXXB6BA4pzqfhYtI00zZOCm9uW',
};

// Export for browser use
if (typeof window !== 'undefined') {
  window.STRIPE_CONFIG = STRIPE_CONFIG;
}
