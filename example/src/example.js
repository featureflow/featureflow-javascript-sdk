/**
 * Featureflow Example
 * 
 * This example demonstrates:
 * 1. CommonJS import pattern
 * 2. ES Module import pattern (commented, uncomment to use)
 * 3. Basic feature flag evaluation
 */

// ============================================
// OPTION 1: Using CommonJS (for bundlers that support CommonJS syntax)
// ============================================
const Featureflow = require('../../dist/index.js');

// ============================================
// OPTION 2: Using ES Modules (uncomment to use)
// ============================================
// import Featureflow from '../../dist/index.esm.js';
// import { init, initPromise, events } from '../../dist/index.esm.js';

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
  defaultFeatures: {
    'example-feature': 'off', // Default value if connection fails
    'new-ui': 'on'
  }
});

// Initialize user editor (if DOM is available)
let userEditor = null;
if (typeof document !== 'undefined' && document.getElementById('user-editor')) {
  try {
    userEditor = ace.edit("user-editor");
    userEditor.setTheme("ace/theme/github");
    userEditor.getSession().setMode("ace/mode/json");
    userEditor.setHighlightActiveLine(true);
    userEditor.setShowPrintMargin(false);
    userEditor.getSession().setTabSize(2);
    userEditor.$blockScrolling = Number.POSITIVE_INFINITY;
    userEditor.setValue(JSON.stringify(user, null, 2));
    
    // Set up update user button
    const updateBtn = document.getElementById('update-user-btn');
    const resetBtn = document.getElementById('reset-user-btn');
    const errorsEl = document.getElementById('editor-errors');
    
    if (updateBtn) {
      updateBtn.addEventListener('click', () => {
        try {
          const editorValue = userEditor.getValue();
          const newUser = JSON.parse(editorValue);
          
          // Validate user object
          if (!newUser.id || typeof newUser.id !== 'string') {
            throw new Error('User must have an "id" property of type string');
          }
          
          // Update user
          featureflow.updateUser(newUser, () => {
            console.log('✅ User updated successfully');
            console.log('New user:', newUser);
            
            // Hide errors
            if (errorsEl) {
              errorsEl.classList.remove('show');
              errorsEl.textContent = '';
            }
            
            // Re-run examples
            console.log('\n=== After User Update ===');
            const featureValue = featureflow.evaluate('example-feature').value();
            console.log('example-feature value after update:', featureValue);
          });
        } catch (err) {
          console.error('❌ Error updating user:', err);
          if (errorsEl) {
            errorsEl.classList.add('show');
            errorsEl.textContent = `Error: ${err.message}`;
          }
        }
      });
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        userEditor.setValue(JSON.stringify(user, null, 2));
        if (errorsEl) {
          errorsEl.classList.remove('show');
          errorsEl.textContent = '';
        }
      });
    }
    
    // Validate JSON on change
    userEditor.on('change', () => {
      try {
        const value = userEditor.getValue();
        JSON.parse(value);
        if (errorsEl) {
          errorsEl.classList.remove('show');
          errorsEl.textContent = '';
        }
      } catch (err) {
        if (errorsEl) {
          errorsEl.classList.add('show');
          errorsEl.textContent = `Invalid JSON: ${err.message}`;
        }
      }
    });
  } catch (err) {
    console.warn('Could not initialize editor:', err);
  }
}

// ============================================
// Example 1: Simple feature evaluation
// ============================================
console.log('=== Example 1: Basic Evaluation ===');

// Get the value of a feature
const featureValue = featureflow.evaluate('example-feature').value();
console.log('Feature value:', featureValue);

// Check if feature is ON
if (featureflow.evaluate('example-feature').isOn()) {
  console.log('Feature is ON - showing new feature');
} else {
  console.log('Feature is OFF - showing old feature');
}

// Check if feature is OFF
if (featureflow.evaluate('example-feature').isOff()) {
  console.log('Feature is OFF');
}

// Check for specific variant value
if (featureflow.evaluate('example-feature').is('on')) {
  console.log('Feature variant is "on"');
}

if (featureflow.evaluate('example-feature').is('red')) {
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
for (const featureKey of Object.keys(allFeatures)) {
  const value = allFeatures[featureKey];
  console.log(`Feature "${featureKey}": ${value}`);
}

// ============================================
// Example 4: Event listeners
// ============================================
console.log('\n=== Example 4: Event Listeners ===');

// Listen for when features are loaded
featureflow.on(Featureflow.events.INIT, (features) => {
  console.log('✅ Features initialized:', features);
  
  // Now it's safe to evaluate features
  const exampleFeature = featureflow.evaluate('example-feature').value();
  console.log('Example feature value:', exampleFeature);
});

// Listen for errors
featureflow.on(Featureflow.events.ERROR, (error) => {
  console.error('❌ Featureflow error:', error);
});

// Note: INIT event is fired both on initial load and when user is updated

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
  const exampleFeature = featureflow.evaluate('example-feature').value();
  console.log('Example feature value after user update:', exampleFeature);
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
    'example-feature': 'off'
  }
})
  .then((featureflowInstance) => {
    console.log('✅ Featureflow initialized via promise');
    
    // Now evaluate features
    const feature = featureflowInstance.evaluate('example-feature');
    console.log('Example feature value:', feature.value());
  })
  .catch((error) => {
    console.error('❌ Failed to initialize Featureflow:', error);
  });

