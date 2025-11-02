/**
 * Simple Featureflow Example
 * 
 * This example demonstrates:
 * 1. CommonJS import pattern
 * 2. ES Module import pattern (commented, uncomment to use)
 * 3. Basic feature flag evaluation
 */

// ============================================
// OPTION 1: Using CommonJS (Node.js, Webpack, etc.)
// ============================================
const Featureflow = require('../../dist/index.js');

// ============================================
// OPTION 2: Using ES Modules (uncomment to use)
// ============================================
// import Featureflow from '../../dist/index.esm.js';
// import { init, events, FeatureflowClient } from '../../dist/index.esm.js';

// ============================================
// OPTION 3: Using TypeScript (same as ES modules, with type support)
// ============================================
// import Featureflow, { init, events, FeatureflowClient } from 'featureflow-client';
// import type { User, UserParam, Config, ConfigParam } from 'featureflow-client';

// Your Featureflow API key
const FF_KEY = 'YOUR_FEATUREFLOW_API_KEY_HERE';

// Define a user (optional)
const user = {
  id: 'user123',
  attributes: {
    tier: 'gold',
    country: 'australia',
    email: 'user@example.com'
  }
};

// Initialize Featureflow
const featureflow = Featureflow.init(FF_KEY, user, {
  streaming: false, // Set to true for real-time updates
  defaultFeatures: {
    'my-feature': 'off', // Default value if connection fails
    'new-ui': 'on'
  }
});

// ============================================
// Example 1: Simple feature evaluation
// ============================================
console.log('=== Example 1: Basic Evaluation ===');

// Get the value of a feature
const featureValue = featureflow.evaluate('my-feature').value();
console.log('Feature value:', featureValue);

// Check if feature is ON
if (featureflow.evaluate('my-feature').isOn()) {
  console.log('Feature is ON - showing new feature');
} else {
  console.log('Feature is OFF - showing old feature');
}

// Check if feature is OFF
if (featureflow.evaluate('my-feature').isOff()) {
  console.log('Feature is OFF');
}

// Check for specific variant value
if (featureflow.evaluate('my-feature').is('on')) {
  console.log('Feature variant is "on"');
}

if (featureflow.evaluate('my-feature').is('red')) {
  console.log('Feature variant is "red"');
}

// ============================================
// Example 2: Using in conditional logic
// ============================================
console.log('\n=== Example 2: Conditional Logic ===');

const showNewUI = featureflow.evaluate('new-ui').isOn();

if (showNewUI) {
  console.log('✅ Rendering new UI');
  // Render new UI components here
} else {
  console.log('📦 Rendering old UI');
  // Render old UI components here
}

// ============================================
// Example 3: Getting all features
// ============================================
console.log('\n=== Example 3: All Features ===');

const allFeatures = featureflow.getFeatures();
console.log('All evaluated features:', allFeatures);

// Iterate through all features
Object.keys(allFeatures).forEach((featureKey) => {
  const value = allFeatures[featureKey];
  console.log(`Feature "${featureKey}": ${value}`);
});

// ============================================
// Example 4: Event listeners
// ============================================
console.log('\n=== Example 4: Event Listeners ===');

// Listen for when features are loaded
featureflow.on(Featureflow.events.INIT, (features) => {
  console.log('✅ Features initialized:', features);
  
  // Now it's safe to evaluate features
  const myFeature = featureflow.evaluate('my-feature').value();
  console.log('My feature value:', myFeature);
});

// Listen for errors
featureflow.on(Featureflow.events.ERROR, (error) => {
  console.error('❌ Featureflow error:', error);
});

// Listen for live updates (when streaming is enabled)
featureflow.on(Featureflow.events.UPDATED_FEATURE, (features) => {
  console.log('🔄 Features updated:', features);
});

// ============================================
// Example 5: Updating user context
// ============================================
console.log('\n=== Example 5: Updating User ===');

// Update user context (will re-evaluate all features)
const newUser = {
  id: 'user123',
  attributes: {
    tier: 'premium', // Changed from 'gold' to 'premium'
    country: 'australia',
    email: 'user@example.com'
  }
};

featureflow.updateUser(newUser, () => {
  console.log('User updated, features re-evaluated');
  
  // Features may have different values now
  const myFeature = featureflow.evaluate('my-feature').value();
  console.log('Feature value after user update:', myFeature);
});

// ============================================
// Example 6: Sending goals (for experiments)
// ============================================
console.log('\n=== Example 6: Sending Goals ===');

// Send a goal event (used for A/B testing experiments)
featureflow.goal('user-signup-complete');

// ============================================
// Example 7: Using Promise-based initialization
// ============================================
console.log('\n=== Example 7: Promise-based Init ===');

// Using initPromise (if you prefer promises)
const { initPromise } = require('../../dist/index.js');

initPromise(FF_KEY, user, {
  defaultFeatures: {
    'my-feature': 'off'
  }
})
  .then((featureflowInstance) => {
    console.log('✅ Featureflow initialized via promise');
    
    // Now evaluate features
    const feature = featureflowInstance.evaluate('my-feature');
    console.log('Feature value:', feature.value());
  })
  .catch((error) => {
    console.error('❌ Failed to initialize Featureflow:', error);
  });

