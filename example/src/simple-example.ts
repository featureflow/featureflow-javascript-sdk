/**
 * Simple Featureflow Example - TypeScript Version
 * 
 * This example demonstrates TypeScript usage with full type support
 */

// ============================================
// TypeScript/ES Module Import
// ============================================
import Featureflow, { init, events, FeatureflowClient } from '../../dist/index.esm.js';
import type { UserParam, ConfigParam, EvaluatedFeatures } from '../../dist/index.d.ts';

// Wait for DOM to be ready
function ready(fn: () => void) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

// Your Featureflow API key
const FF_KEY: string = 'sdk-js-env-5f5a4c466e61460fa14e685cbb4abe40';

// Define a user
const user: UserParam = {
  id: 'user123',
  attributes: {
    tier: 'gold',
    country: 'australia',
    email: 'user@example.com'
  }
};

// Configuration
const config: ConfigParam = {
  defaultFeatures: {
    'example-feature': 'off',
    'new-ui': 'on'
  }
};

// Wait for DOM to be ready
ready(() => {
  // Initialize Featureflow
  const featureflow: FeatureflowClient = init(FF_KEY, user, config);
  
  // Display results in the DOM
  function updateExample1() {
    const example1El = document.getElementById('example1');
    if (!example1El) return;
    
    const featureValue: string = featureflow.evaluate('example-feature').value();
    const isOn: boolean = featureflow.evaluate('example-feature').isOn();
    const isOff: boolean = featureflow.evaluate('example-feature').isOff();
    const isOnVariant: boolean = featureflow.evaluate('example-feature').is('on');
    
    example1El.innerHTML = `
      <p><strong>Feature 'example-feature':</strong></p>
      <p>Value: <span class="feature-value ${isOn ? '' : 'off'}">${featureValue}</span></p>
      <p>isOn(): ${isOn}</p>
      <p>isOff(): ${isOff}</p>
      <p>is('on'): ${isOnVariant}</p>
    `;
    
    console.log('=== Example 1: Basic Evaluation ===');
    console.log('Feature value:', featureValue);
    console.log('Is ON:', isOn);
    console.log('Is OFF:', isOff);
  }

  function updateExample2() {
    const example2El = document.getElementById('example2');
    if (!example2El) return;
    
    const showNewUI: boolean = featureflow.evaluate('new-ui').isOn();
    
    example2El.innerHTML = `
      <p><strong>Feature 'new-ui':</strong></p>
      <p>Status: <span class="feature-value ${showNewUI ? '' : 'off'}">${showNewUI ? 'ON' : 'OFF'}</span></p>
      <p>${showNewUI ? '✅ Rendering new UI' : '📦 Rendering old UI'}</p>
    `;
    
    console.log('=== Example 2: Conditional Logic ===');
    console.log('Show new UI:', showNewUI);
  }

      function updateExample3() {
        const example3El = document.getElementById('example3');
        if (!example3El) return;

        const allFeatures = featureflow.getFeatures();

        let html = '<p><strong>All Evaluated Features:</strong></p>';
        if (Object.keys(allFeatures).length === 0) {
          html += '<p>No features loaded yet...</p>';
        } else {
          for (const featureKey of Object.keys(allFeatures)) {
            const value: string = allFeatures[featureKey];
            html += `<p>Feature <code>${featureKey}</code>: <span class="feature-value ${value === 'on' ? '' : 'off'}">${value}</span></p>`;
          }
        }
        example3El.innerHTML = html;

        console.log('=== Example 3: All Features ===');
        console.log('All evaluated features:', allFeatures);
      }

      function updateUserDisplay() {
        const userDisplayEl = document.getElementById('user-display');
        if (!userDisplayEl) return;

        const currentUser = featureflow.getUser();
        const attributes = currentUser.attributes || {};

        let html = '<p><strong>Current User Context:</strong></p>';
        html += `<p><strong>User ID:</strong> <code>${currentUser.id}</code></p>`;
        html += '<p><strong>Attributes:</strong></p>';
        
        if (Object.keys(attributes).length === 0) {
          html += '<p class="no-attributes">No attributes set</p>';
        } else {
          html += '<ul class="attributes-list">';
          for (const key of Object.keys(attributes)) {
            const value = attributes[key];
            const valueStr = Array.isArray(value) ? value.join(', ') : String(value);
            html += `<li><code>${key}</code>: <span class="attribute-value">${valueStr}</span></li>`;
          }
          html += '</ul>';
        }

        userDisplayEl.innerHTML = html;

        console.log('=== Current User ===');
        console.log('User:', currentUser);
      }

  function addEventLog(message: string) {
    const eventsList = document.getElementById('events-list');
    if (!eventsList) return;
    
    const li = document.createElement('li');
    li.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    eventsList.appendChild(li);
    
    // Keep only last 20 events
    while (eventsList.children.length > 20 && eventsList.firstChild) {
      eventsList.removeChild(eventsList.firstChild);
    }
  }

  // Event listeners
      featureflow.on(events.INIT, (features: EvaluatedFeatures) => {
        addEventLog('✅ Features initialized');
        console.log('✅ Features initialized:', features);

        updateExample1();
        updateExample2();
        updateExample3();
        updateUserDisplay();

        const exampleFeature: string = featureflow.evaluate('example-feature').value();
        console.log('Example feature value:', exampleFeature);
      });

      featureflow.on(events.LOADED_FROM_CACHE, (features: EvaluatedFeatures) => {
        addEventLog('📦 Features loaded from cache');
        console.log('📦 Features loaded from cache:', features);

        updateExample1();
        updateExample2();
        updateExample3();
        updateUserDisplay();
      });

  featureflow.on(events.ERROR, (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addEventLog(`❌ Featureflow error: ${errorMessage}`);
    console.error('❌ Featureflow error:', error);
  });

      featureflow.on(events.UPDATED_FEATURE, (features: EvaluatedFeatures) => {
        addEventLog('🔄 Features updated');
        console.log('🔄 Features updated:', features);

        updateExample1();
        updateExample2();
        updateExample3();
        updateUserDisplay();
      });

  // Example: Update user after 5 seconds
  setTimeout(() => {
    const newUser: UserParam = {
      id: 'user123',
      attributes: {
        tier: 'premium',
        country: 'australia',
        email: 'user@example.com'
      }
    };

        addEventLog('🔄 Updating user context...');
        featureflow.updateUser(newUser, () => {
          addEventLog('✅ User updated');
          console.log('User updated');

          updateExample1();
          updateExample2();
          updateExample3();
          updateUserDisplay();

          const exampleFeature: string = featureflow.evaluate('example-feature').value();
          console.log('Example feature value after user update:', exampleFeature);
        });
  }, 5000);
});

