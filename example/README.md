# Featureflow Example Applications

This directory contains example applications demonstrating how to use the Featureflow SDK.

## Running Examples

### JavaScript Example

Run the JavaScript example:

```bash
npm run example
```

This will start a webpack dev server at `http://localhost:8182` with the JavaScript example (`example/src/example.js`).

The JavaScript example demonstrates:

- CommonJS and ES Module import patterns
- Feature flag evaluation
- Event handling
- User context updates
- Promise-based initialization (`initPromise`)

### TypeScript Example

Run the TypeScript example:

```bash
npm run example:ts
```

This will:

1. Compile the TypeScript file (`example/src/example.ts`) to JavaScript
2. Bundle it with webpack
3. Serve it in the browser at `http://localhost:8182`

The TypeScript example demonstrates:

- TypeScript imports with full type support
- Feature flag evaluation
- Event handling
- User context updates
- DOM manipulation

## Example Files

- **`src/example.js`** - JavaScript example with console output
- **`src/example.ts`** - TypeScript example with DOM manipulation
- **`src/example.html`** - HTML template for both examples

## Import Methods Shown

### CommonJS (Node.js)

```javascript
const Featureflow = require('featureflow-client');
```

### ES Modules (Modern JavaScript/Bundlers)

```javascript
import Featureflow from 'featureflow-client';
```

### TypeScript (with type support)

```typescript
import { init, initPromise, events } from 'featureflow-client';
import type { FeatureflowClient, FeatureflowUser, Config, EvaluatedFeatures } from 'featureflow-client';
```

## Feature Evaluation Examples

All examples demonstrate:

```javascript
// Get feature value
const value = featureflow.evaluate('my-feature').value();

// Check if feature is ON
if (featureflow.evaluate('my-feature').isOn()) {
  // Feature is on
}

// Check if feature is OFF
if (featureflow.evaluate('my-feature').isOff()) {
  // Feature is off
}

// Check for specific variant
if (featureflow.evaluate('my-feature').is('red')) {
  // Feature variant is 'red'
}
```

## Build Configuration

The examples use webpack with:

- **ts-loader** - For TypeScript compilation
- **babel-loader** - For JavaScript transpilation
- **webpack-dev-server** - For development server

TypeScript files are compiled using the project's `tsconfig.json` configuration.

