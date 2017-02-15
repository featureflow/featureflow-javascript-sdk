// @flow
import RestClient from './RestClient';
import EventEmitter  from './EventEmitter';
import FeatureflowContext from './FeatureflowContext';

let context: any;
let restClient: RestClientType;
let eventEmitter;
let environment: string;
let controlsUrl: string;
let baseUrl: string;
const EVENT_READY = 'ready';
const EVENT_UPDATED_CONTEXT = 'update:context';
const EVENT_UPDATED_CONTROLS = 'update:controls';

const DEFAULT_CONTEXT_VALUES: KeyValueNested = {
  key: 'anonymous'
}


let featureflow = {
  controls: {},
  env: {},
  context: {},
  on: on,
  removeListener: removeListener,
  updateContext: updateContext,
  evaluate: evaluate
};

function evaluate(key: string, failoverValue: string){
  return (featureflow.controls && featureflow.controls.hasOwnProperty(key) && featureflow.controls[key] !== null)
    ? featureflow.controls[key]
    : failoverValue;
};

function on(event: string, handler: CallbackType<*>) {
  eventEmitter.on(event, handler);
}
function removeListener(eventName: string, listener: any) {
  eventEmitter.removeListener(eventName, listener)
}

function updateContext(contextVals: KeyValueNested){
  context = FeatureflowContext(contextVals);
  restClient.getControls(context.getContext(), function(response){
    localStorage.setItem(environment + ":" + context.getContext().key, JSON.stringify(response));
    featureflow.controls = response;
    eventEmitter.emit(EVENT_UPDATED_CONTEXT, context.getContext());
    eventEmitter.emit(EVENT_UPDATED_CONTROLS, response);
  });
}

export function init(apiKey: string, contextVals: KeyValueNested = {...DEFAULT_CONTEXT_VALUES}, config: ConfigType = {}){
  featureflow.controls = {};
  eventEmitter = EventEmitter();
  controlsUrl = config.controlsUrl || 'https://controls.featureflow.io';
  baseUrl = config.baseUrl|| 'https://app.featureflow.io';
  restClient = RestClient(baseUrl, apiKey);

  //1. Set the context
  context = FeatureflowContext(contextVals);

  //2. Load evaluated controls from featureflow
  restClient.getControls(context.getContext(), function(response){
    localStorage.setItem(environment + ":" + context.getContext().key, JSON.stringify(response));
    featureflow.controls = response;
    eventEmitter.emit(EVENT_READY);
  });

  // //3. Set up SSE if required
  // let es = new window.EventSource(baseUrl + '/api/js/v1/stream/' + apiKey);
  // //.add("Accept", "text/event-stream")
  // es.addEventListener('message', function (e) {
  //   console.log(e.data);
  //   //alert('got event: ' + e);
  //   //reevaluate control
  //   eventEmitter.emit(EVENT_UPDATED_CONTEXT);
  // }, false);
  //4. Send an event

  return featureflow;
}

export default {
  init
}

if(window.VERSION !== undefined) {
  module.exports.version = window.VERSION;
}