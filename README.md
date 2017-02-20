# featureflow-client

[![][npm-img]][npm-url]

[![][dependency-img]][dependency-url]

> Featureflow Javascript Client SDK

## JS Bin Demo

http://jsbin.com/mulocir/1/edit?js,output

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

### Adding The Featureflow


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

Get your environment's Featureflow Javascript API key and initialise the Featureflow client

```js
var FF_JS_API_KEY = '<Your javascript api key goes here>';
//...
var featureflow = Featureflow.init(FF_JS_API_KEY);
```

This will load the value of each feature for the current environment specified by the api key. These values can be toggled on and off at `https://<your-org-key>.featureflow.io` 

In your code, this is how you test the value of your feature where the value of `my-feature-key` is `on`

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

## License

Apache-2.0

[npm-url]: https://nodei.co/npm/featureflow-client
[npm-img]: https://nodei.co/npm/featureflow-client.png

[dependency-url]: https://www.featureflow.io
[dependency-img]: https://www.featureflow.io/wp-content/uploads/2016/12/featureflow-web.png