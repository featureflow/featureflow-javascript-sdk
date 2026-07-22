# featureflow-javascript-sdk

[![npm package][npm-img]][npm-url]

[![Featureflow][dependency-img]][dependency-url]

> Featureflow JavaScript/TypeScript Client SDK for Browser Environments

This 2.x.x Client is for modern browser environments, for legacy support, please use [1.3.18](https://www.npmjs.com/package/featureflow-client/v/1.3.18)

**Note:** This SDK is designed for JavaScript in browser environments. For server-side JavaScript/Node.js applications, please use the [featureflow-node-sdk](https://github.com/featureflow/featureflow-node-sdk).

Get your Featureflow account at [featureflow.io](http://www.featureflow.io)

## Get Started

The easiest way to get started is to follow the [Featureflow quick start guides](http://docs.featureflow.io/docs)


## Examples

To see featureflow running in action, you can run the example in this repo:

1. Clone this repository
2. Update example/src/index.js ```const FF_KEY = 'your-javascript-environment-sdk-key';```
3. Run `$ npm install` and `$ npm run example`


or See the example at [Codepen](https://codepen.io/featureflow/pen/BboreK).

## Change Log

Please see [CHANGELOG](https://github.com/featureflow/featureflow-javascript-sdk/blob/main/CHANGELOG.md).

## Installation

Using NPM

```bash
npm install --save featureflow-client
```

## Usage

### Adding Featureflow

The SDK supports multiple integration patterns:

#### Using CommonJS (for bundlers that support CommonJS syntax)

```js
const Featureflow = require('featureflow-client');
```

#### Using ES2015 modules (modern JavaScript environments and most bundlers)

```js
import Featureflow from 'featureflow-client';
```

#### Using TypeScript (same as ES modules, with type support)

```ts
import { init, events } from 'featureflow-client';
import type { FeatureflowClient, FeatureflowUser, Config, EvaluatedFeatures } from 'featureflow-client';
```

##### Webpack

If you are using `webpack`, you can require the code using

```js
var Featureflow = require('featureflow-client');
```

or using es6 syntax

```js
import Featureflow from 'featureflow-client';
```

##### CDN

Include the following script in HTML file. This will expose the global variable `Featureflow`

```html
<script crossorigin="anonymous" src="https://cdn.featureflow.io/featureflow.js"></script>
```
### Quick start

Get your environment's Featureflow Javascript API key and initialise a new Featureflow client

```js
// Using init() - Promise-based initialization
var FF_JS_API_KEY = '<Your javascript api key goes here>';
const featureflow = await Featureflow.init(FF_JS_API_KEY);
```

**TypeScript users** can import the type for better autocomplete and type safety:

```ts
import { init, type FeatureflowClient } from 'featureflow-client';

const featureflow: FeatureflowClient = await init(FF_JS_API_KEY);
```

This will load the value of each feature for the current environment specified by the api key. These values can be toggled on and off at `https://<your-org-key>.featureflow.io`

### Note

You are responsible for passing the featureflow client instance around your application

In your code, you can test the value of your feature where the value of `my-feature-key` is equal to `'on'`

```js
if (featureflow.evaluate('my-feature-key').is('on')){
  // this feature code will be run because 'my-feature-key' is set to 'on'
}
```

Because the default variants for any feature are `'on'` and `'off'`, we have provided two helper methods `.isOn()` and `.isOff()`

```js

if(featureflow.evaluate('my-feature-key').isOn()){
  // this feature code will be run because 'my-feature-key' is set to 'on'
}

if(featureflow.evaluate('my-feature-key').isOff()){
  // this feature code won't be run because 'my-feature-key' is not set to 'off'
}
```

You can include user context information when you initialise featureflow, these attributes can be used in feature targeting rules:

```js
// User with id (required) and attributes (optional)
var user = {
  id: 'user123',
  attributes: {
    tier: 'gold',
    country: 'australia',
    roles: ['role1', 'role3']
  }
};
const featureflow = await Featureflow.init(FF_KEY, user);

// Or without user - anonymous user will be auto-generated
const featureflow = await Featureflow.init(FF_KEY);
```

**TypeScript example:**

```ts
import { init, type FeatureflowClient, type FeatureflowUser } from 'featureflow-client';

const user: FeatureflowUser = {
  id: 'user123',
  attributes: {
    tier: 'gold',
    country: 'australia',
    roles: ['role1', 'role3']
  }
};

const featureflow: FeatureflowClient = await init(FF_KEY, user);
```

Additional configuration can be set during init also. You can set offline mode for test environments or local development and provide a default set of feature values, for example:

```js
const featureflow = await Featureflow.init(FF_KEY, user, {
    offline: true,
    defaultFeatures: {
      'feature-1': 'on',
      'feature-2': 'red',
      'test': 'off'
    },
});
```

Further documentation can be found in the [Featureflow documentation](http://docs.featureflow.io/docs)

#### Anonymous User and Featureflow Server SDKs

In some instances you will want to split test a feature with anonymous users that spans both client and server code.
The `featureflow` client generates a unique anonymous key for the user which can be shared with your server requests.
There are a couple of ways you can do this.

##### 1. Access the cookie `ff-anonymous-id`

Anytime the anonymous user is updated the `featureflow` client will set the `ff-anonymous-id` cookie.
If request server is on the same \[sub\]domain and it doesn't have a user id you should use this cookie.

##### 2. Pass the value into the request yourself

If you cannot use cookies (e.g. api on a separate \[sub\]domain), you can pass the anonymous id directly into the request.

Here are some examples of how you can do this:

1. Using HTTP Header: `headers["X-Featureflow-Anonymous-Id"] = featureflow.getAnonymousId()`
2. Adding a query param: `'?ff-anonymousid='+featureflow.getAnonymousId()`

### API and Configuration

#### Globals

#### `Featureflow.init(apiKey, [user], [config])`

Returns a `Promise<featureflow>` instance that resolves when initialization is complete.

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `apiKey*` | `string` | **`Required`** | The Featureflow Javascript API key for the environment or project you are targeting |
| `user` | `FeatureflowUser` | Auto-generated anonymous user | See the `user` object below. If not provided, an anonymous user will be automatically generated |
| `config` | `Config` | `{}` | See the `config` object below |
| **`return`** | `Promise<featureflow>` |  | Promise that resolves with a Featureflow Instance (see below) |

**Example:**
```ts
import { init, type FeatureflowClient, type FeatureflowUser, type Config } from 'featureflow-client';

// Using async/await with TypeScript typing
const featureflow: FeatureflowClient = await init(FF_KEY, user, config);

// Or using .then()
Featureflow.init(FF_KEY, user, config).then((featureflow: FeatureflowClient) => {
  // use featureflow with full type safety
});
```

#### Featureflow Instance

These properties are available on the return of `Featureflow.init(...)`

#### `featureflow.evaluate(featureKey)`

Returns an object that can be used to help evaluate feature values in an expressive way.

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `featureKey*`  | `string` | **`Required`** | The feature key you are targeting |
| **`return`** | `Evaluate` |  | An Evaluate object with helper methods (`.is()`, `.isOn()`, `.isOff()`, `.value()`) |

**TypeScript example:**
```ts
import type { Evaluate } from 'featureflow-client';

const evaluation: Evaluate = featureflow.evaluate('my-feature');
const value: string = evaluation.value(); // 'on' | 'off' | variant string
const isOn: boolean = evaluation.isOn();
const isOff: boolean = evaluation.isOff();
const matches: boolean = evaluation.is('red');
```

##### `featureflow.evaluate(featureKey).is(value)`

Evaluates the value of a feature for the given user.

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `featureKey*`  | `string` | **`Required`** | The feature key you are targeting |
| `value*`  | `string` | **`Required`** | The value you are testing against |
| **`return`** | `boolean` | | `true` if the feature's value is equal to the `value` provided, otherwise `false`  |

##### `featureflow.evaluate(featureKey).isOn()`

Evaluates the value of a feature for the given user is equal to `'on'`.

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `featureKey*`  | `string` | **`Required`** | The feature key you are targeting |
| **`return`** | `boolean` | | `true` if the feature's value is equal to `'on'` provided, otherwise `false`  |

##### `featureflow.evaluate(featureKey).isOff()`

Evaluates the value of a feature for the given user is equal to `'off'`.

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `featureKey*`  | `string` | **`Required`** | The feature key you are targeting |
| **`return`** | `boolean` | | `true` if the feature's value is equal to `'off'` provided, otherwise `false`  |

##### `featureflow.evaluate(featureKey).value()`

Returns the value of a feature for the given user.

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `featureKey*`  | `string` | **`Required`** | The feature key you are targeting |
| **`return`** | `string` | | The value of the feature, or the default feature value from `config.defaultFeatures[featureKey]` if present, or `'off'`  |

#### `featureflow.goal(goalKey)`

Sends a goal event, along with the current evaluated features to **featureflow.io**. Use with experiments in the admin console.

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `goalKey*` | `string` |  | The key of the goal you want to target. |

#### `featureflow.updateUser(user)`

Updates the current `user` of the instance and reevaluates all feature features using the new `user`. Returns a Promise that resolves when the update is complete.

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `user` | `FeatureflowUser` | ... | See the `user` object below. The `id` property is required |
| **`return`** | `Promise<Features>` |  | Promise that resolves with the updated features |

Fires a `Featureflow.events.LOADED` event when the features have been evaluated.

**Example:**
```js
// JavaScript
await featureflow.updateUser(newUser);
```

```ts
// TypeScript
import type { FeatureflowUser, Features } from 'featureflow-client';

const newUser: FeatureflowUser = {
  id: 'user456',
  attributes: { tier: 'premium' }
};

const features: Features = await featureflow.updateUser(newUser);
```

#### `featureflow.getFeatures()`

Returns the current evaluated `features` as flat key-value map

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| **`return`**  | `EvaluatedFeatures` |  | The current `features` object (map of feature keys to variant values) |

**Example:**
```ts
import type { EvaluatedFeatures } from 'featureflow-client';

const features: EvaluatedFeatures = featureflow.getFeatures();
// features = { 'feature-1': 'on', 'feature-2': 'off', ... }
```

#### `featureflow.getUser()`

Returns the current `user`

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| **`return`**  | `FeatureflowUser` |  | The current `user`  |

**Example:**
```ts
import type { FeatureflowUser } from 'featureflow-client';

const user: FeatureflowUser = featureflow.getUser();
console.log(user.id); // 'user123'
console.log(user.attributes?.tier); // 'gold'
```

#### `featureflow.on(event, callback, [bindContext])`

Listen to events when the `featureflow` instance is updated

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `event*`  | `string` | **`Required`** | The name of the event to subscribe to. See `Events` section below for available events. |
| `callback*`  | `EventCallback` | **`Required`** | The function to call when the event is emitted.  |
| `bindContext`  | `unknown` | `undefined` | The context to bind the event callback to (useful for binding `this` in class methods).  |

**TypeScript example:**
```ts
import { events, type EvaluatedFeatures } from 'featureflow-client';

featureflow.on(events.INIT, (features: EvaluatedFeatures) => {
  console.log('Features initialized:', features);
});

// With bindContext for class methods
class MyComponent {
  handleInit(features: EvaluatedFeatures) {
    console.log('Features:', features);
  }
}

const component = new MyComponent();
featureflow.on(events.INIT, component.handleInit, component);
```

#### `featureflow.off(event, [callback])`

Unsubscribe from events when the `featureflow` instance is updated

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `event*`  | `string` | **`Required`** | The name of the event to unsubscribe from. |
| `callback`  | `EventCallback` | `undefined` | The callback to remove. If not provided, removes all listeners for the event.  |

**TypeScript example:**
```ts
import { events, type EvaluatedFeatures } from 'featureflow-client';

const handler = (features: EvaluatedFeatures) => {
  console.log('Features:', features);
};

featureflow.on(events.INIT, handler);
// Later...
featureflow.off(events.INIT, handler);

// Or remove all listeners for an event
featureflow.off(events.INIT);
```

#### `featureflow.getAnonymousId()`

Returns the anonymous user id assigned for the user in localStorage.

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| **`return`**  | `string` |  | The string of the anonymous user id in localStorage. |

#### `featureflow.hasReceivedInitialResponse()`

Returns true if an initial response has been returned from the server, regardless of the status code.

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| **`return`**  | `boolean` | false | `true` if the initial request to featureflow has completed  |

#### `featureflow.resetAnonymousId()`

Resets the anonymous user id for the user stored in localStorage. This will not re-evaluate the features, you must still call `updateUser()` to evaluate the latest features variants.

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| **`return`**  | `string` |  | The string of the **new** anonymous user id. |

#### Object Types

#### `user` (FeatureflowUser)

| Property | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `id` | `string` | **`Required`** | Uniquely identifies the current user. Also used to calculate split variants. If not provided when calling `init()`, a random string prefixed with `'anonymous:'` will be automatically generated. This will set a cookie that can be used to link the anonymous user with your server's Featureflow SDK. |
| `attributes` | `object` | `undefined` | Flat key-value object containing extra meta about the current user. Used to serve different features for specifically targeted attributes. Values can be strings, numbers, or arrays of strings/numbers. |

#### `config` (Config)

All properties are optional. If not provided, sensible defaults will be used.

| Property | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `baseUrl` | `string` | `'https://app.featureflow.io'` | The base URL for the Featureflow API |
| `eventsUrl` | `string` | `'https://events.featureflow.io'` | The URL for sending events |
| `useCookies` | `boolean` | `true` | Set to `false` if you do not want to use cookies (you will have to pass the result of `featureflow.getAnonymousId()` to any future requests if you wish for the server to match the client anonymous key)  |
| `defaultFeatures` | `object` | `{}` | A flat key-value object representing the default variants a feature should be set to if there is an interrupted connection and no cached value. *e.g. if you set `config.defaultFeatures` to `{'my-feature': 'on'}`, `featureflow.evaluate('my-feature').isOn()` will return `true` when there is an interrupted connection to Featureflow and no locally cached feature features.* |
| `offline` | `boolean` | `false` | Set to `true` to run in offline mode, this is for testing purposes. Featureflow will not attempt any calls and will use the defaultFeatures values only  |
| `delayInit` | `boolean` | `false` | Set to `true` to delay initialization. You must call `featureflow.initialise()` manually |
| `uniqueEvals` | `boolean` | `true` | Set to `false` to allow duplicate evaluation events to be sent |

#### Events

#### `Featureflow.events.LOADED_FROM_CACHE`

Fired when features have been loaded from localstorage.
Triggered by both `Featureflow.init(...)` and `featureflow.updateUser`.

Callback is fired with one parameter with the value of all evaluated `features`.

#### `Featureflow.events.INIT`

Fired when features have been evaluated and loaded.
Triggered by both `Featureflow.init(...)` and `featureflow.updateUser`.

Callback is fired with one parameter with the value of all evaluated `features`.

#### `Featureflow.events.ERROR`

Fired when an error has occurred evaluating the feature features for the given user.

Callback is fired with one parameter with the error message.

## License

Apache-2.0

[npm-url]: https://nodei.co/npm/featureflow-client
[npm-img]: https://nodei.co/npm/featureflow-client.png

[dependency-url]: https://www.featureflow.io
[dependency-img]: https://www.featureflow.io/wp-content/uploads/2016/12/featureflow-web.png
