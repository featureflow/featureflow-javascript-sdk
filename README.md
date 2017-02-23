# featureflow-client

[![][npm-img]][npm-url]

[![][dependency-img]][dependency-url]

> Featureflow Javascript Client SDK

## JS Bin Demo

http://jsbin.com/mulocir/1/edit?js,output

> Alternatively clone this repository and run `$ npm install` and `$ npm run example`

## Change Log

Please see [CHANGELOG](https://github.com/featureflow/featureflow-javascript-sdk/blob/master/CHANGELOG.md).

## Installation

Using NPM
```bash
$ npm install --save featureflow-client
```

Using bower
```bash
$ bower install featureflow-client
```

## Usage

### Adding Featureflow

##### Webpack
If you are using `webpack`, you can require the code using
```js
var Featureflow = require('featureflow-client');
```
or using es6 syntax
```js
import Featureflow from 'featureflow-client';
```

##### Bower
Include the following script in HTML file. This will expose the global variable `Featureflow`
```html
<script crossorigin="anonymous" src="bower_components/featureflow-client/dist/featureflow.min.js"></script>
```
Note: It is recommended to use build tools to manage your bower dependencies.
Please see the [bower website](https://bower.io/#use-packages) for more details.

##### CDN
Include the following script in HTML file. This will expose the global variable `Featureflow`
```html
<script crossorigin="anonymous" src="https://controls.featureflow.io/featureflow.js"></script>
```


### Quick start

Get your environment's Featureflow Javascript API key and initialise a new Featureflow client

```js
var FF_JS_API_KEY = '<Your javascript api key goes here>';
//...
var featureflow = Featureflow.init(FF_JS_API_KEY);
```

This will load the value of each feature for the current environment specified by the api key. These values can be toggled on and off at `https://<your-org-key>.featureflow.io` 

**Note: You are responsible for passing the featureflow client instance around your application**

In your code, you can test the value of your feature where the value of `my-feature-key` is `on`

```js
  var KEY_DEFAULT = 'off';
  
  if(featureflow.evaluate('my-feature-key', KEY_DEFAULT) === 'off'){
  	console.warn('This should not be run!');
  }
  
  if(featureflow.evaluate('my-feature-key', KEY_DEFAULT) === 'on'){
  	alert('The feature is enabled, I should be seen!');
  }
```

Further more documentation can be found [here](http://docs.featureflow.io/docs)

### API and Configuration
#### Globals
####`Featureflow.init(apiKey, [context], [config])`
Returns a `featureflow` instance, see below

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `apiKey*` | `string` | **`Required`** | The Featureflow Javascript API key for the environment or project you are targeting |
| `context` | `context` |  | See the `context` object below |
| `config` | `config` |  | See the `config` object below |
| **`return`** | `featureflow` |  | See Featureflow Instance below |

####Featureflow Instance
These properties are available on the return of `Featureflow.init(...)`
####`featureflow.evaluate(featureKey, failoverValue)`
Evaluates 

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `featureKey*`  | `string` | **`Required`** | The feature key you are targeting |
| `failoverValue*`  | `string` | **`Required`**  | The value to return if the feature is not available <br/>*(e.g. either the feature doesn't exist, or there is no cached local version and no internet connection)* |
| **`return`** | `string` | | The evaluated value for the given context |

####`featureflow.updateContext(context)`
Updates and returns the current `context` of the instance and reevaluates all feature controls using the new `context`. 

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `context` | `context` | ... | See the `context` object below |
| **`return`**  | `context` |  | The updated `context` object |

Fires a `Featureflow.events.LOADED` event when the controls have been evaluated.


####`featureflow.getControls()`
Returns the current evaluated `controls` as flat key-value map

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| **`return`**  | `object` |  | The current `controls` object |

####`featureflow.getContext()`
Returns the current `context`

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| **`return`**  | `context` |  | The current `context`  |


####`featureflow.on(event, callback, [bindContext])`
Listen to events when the `featureflow` instance is updated

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `event*`  | `string` | **`Required`** | The name of the event to subscribe to. See `Events` section below for available events. |
| `callback*`  | `function` | **`Required`** | The function to call when the event is emitted.  |
| `bindContext`  | `any` | `undefined` | The context to bind the event callback to.  |


####`featureflow.off(event, [callback])`
Listen to events when the `featureflow` instance is updated

| Params | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `event*`  | `string` | **`Required`** | The name of the event to unsubscribe from. |
| `callback`  | `function` | **`Required`** | The callback used when binding the object  |

#### Object Types
####`context`
| Property | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `key` | `string` | `"anonymous"` | Uniquely identifies the current user. Also used to calculate split variants |
| `values` | `object` | `undefined` | Flat key value object containing extra meta about the current user. Used to serve different features for specifically targeted attributes.

####`config`
| Property | Type | Default | Description |
|---------------|----------|--------------|----------------------------------------------------------------|
| `streaming` | `boolean` | `false` | Set to `true` when calling `Featureflow.init(..., config)` to listen for realtime updates |

#### Events
#### `Featureflow.events.LOADED`
Fired when controls have been evaluated and loaded. 
Triggered by both `Featureflow.init(...)` and `featureflow.updateContext`.

Callback is fired with one parameter with the value of all evaluated `controls`.

#### `Featureflow.events.UPDATED_CONTROL`
Only available when streaming is enabled.
Fired when a feature has been changed. 

Callback is fired with one parameter with the value of only the updated `controls` returned by the stream. In the majority of cases, this object will only contain one property.

#### `Featureflow.events.ERROR`
Fired when an error has occurred evaluating the feature controls for the given context.

Callback is fired with one parameter with the error message.


## Roadmap
- [x] Write documentation
- [x] Release to npm
- [x] Release to bower
- [ ] Automate release to bower on `npm prepublish`
- [ ] Automate release script to cdn on `npm prepublish`

## License

Apache-2.0

[npm-url]: https://nodei.co/npm/featureflow-client
[npm-img]: https://nodei.co/npm/featureflow-client.png

[dependency-url]: https://www.featureflow.io
[dependency-img]: https://www.featureflow.io/wp-content/uploads/2016/12/featureflow-web.png