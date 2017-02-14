/**
 * Created by oliver on 23/11/16.
 */

var RestClient = require('./RestClient');
var EventEmitter = require('./EventEmitter');
var FeatureflowContext = require('./FeatureflowContext');

var context;
var environment;
var restClient;
var controlsUrl;
var baseUrl;
var eventEmitter;
var ready = 'ready';
var contextUpdated = 'update:context';
var controlsUpdated = 'update:controls';


var featureflow = {
    controls: {},
    env: {},
    context: {},
    on: on,
    removeListener: removeListener,
    updateContext: updateContext,
    evaluate: evaluate
};

function evaluate(key, failoverValue){
    return (featureflow.controls && featureflow.controls.hasOwnProperty(key) && featureflow.controls[key] !== null)?featureflow.controls[key]:failoverValue;
};

function on(event, handler) {
    eventEmitter.on(event, handler);
}
function removeListener(eventName, listener) {
    eventEmitter.removeListener(eventName, listener)
}

function updateContext(contextVals){
    context = FeatureflowContext(contextVals);
    restClient.getControls(context.getContext(), function(response){
        localStorage.setItem(environment + ":" + context.getContext().key, JSON.stringify(response));
        featureflow.controls = response;
        eventEmitter.emit(contextUpdated, context.getContext());
        eventEmitter.emit(controlsUpdated, response);
    });
}
function init(appKey){
    var contextVals = {
        key: "anonymous"
    };
    init(appKey, contextVals, {})
}
function init(appKey, contextVals){
    init(appKey, contextVals, {})
}

function init(appKey, contextVals, config){
    config = config || {};
    appKey = appKey;
    featureflow.controls = {};
    eventEmitter = EventEmitter();
    controlsUrl = config.controlsUrl || 'https://controls.featureflow.io';
    baseUrl = config.baseUrl|| 'https://app.featureflow.io';
    restClient = RestClient(baseUrl, appKey);

    //1. Set the context
    context = FeatureflowContext(contextVals);

    //2. Load evaluated controls from featureflow
    restClient.getControls(context.getContext(), function(response){
        localStorage.setItem(environment + ":" + context.getContext().key, JSON.stringify(response));
        featureflow.controls = response;
        eventEmitter.emit(ready);
    });

    //3. Set up SSE if required

    //4. Send an event

    return featureflow;
}





module.exports = {
    init: init
};

if(typeof VERSION !== 'undefined') {
    module.exports.version = VERSION;
}