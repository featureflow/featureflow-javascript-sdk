// @flow
import RestClient from './RestClient';
import Emitter from 'tiny-emitter';

const DEFAULT_CONTEXT_VALUES: ContextType = {
  key: 'anonymous'
};

const DEFAULT_BASE_URL = 'https://app.featureflow.io';
const DEFAULT_RTM_URL = 'https://rtm.featureflow.io';

const DEFAULT_CONFIG: ConfigType = {
  baseUrl: DEFAULT_BASE_URL,
  rtmUrl: DEFAULT_RTM_URL,
  streaming: false
};

const INIT_MODULE_ERROR = new Error('init() has not been called with a valid apiKey');

export const events = {
  LOADED: 'LOADED',
  ERROR: 'ERROR',
  UPDATED_CONTROL: 'UPDATED_CONTROL'
};

export function init(apiKey: string, _context: ContextTypeParam = {}, _config: ConfigTypeParam = {}): FeatureflowInstance {
  let controls: ControlsType = {};
  let config: ConfigType;
  let context: ContextType;
  let emitter = new Emitter();

  //1. They must have an api key
  if (!apiKey){
    throw INIT_MODULE_ERROR;
  }

  //2. Extend the default configuration
  config = {
    ...DEFAULT_CONFIG,
    ..._config
  };

  //3. Load initial data
  updateContext(_context);

  //4. Set up realtime streaming
  if (config.streaming){
    let es = new window.EventSource(`${config.rtmUrl}/api/js/v1/stream/${apiKey}`);
    es.onmessage = (e) => {
      let keys = [];
      try{
        keys = JSON.parse(e.data);
      }
      catch(err){
        //Ah well, we tried...
      }

      RestClient.getControls(config.baseUrl, apiKey, context, keys, (error, _controls)=>{
        controls = {
          ...controls,
          ..._controls
        };
        emitter.emit(events.UPDATED_CONTROL, _controls);
      })
    };
  }

  function updateContext(_context: ContextTypeParam): ContextType{
    context = {
      ...DEFAULT_CONTEXT_VALUES,
      ..._context
    };

    try{
      controls = JSON.parse(localStorage.getItem(`ff:${context.key}:${apiKey}`) || '{}');
    }
    catch(err){
      controls = {};
    }

    RestClient.getControls(config.baseUrl, apiKey, context, [], (error, _controls)=>{
      if (!error){
        controls = _controls || {};
        localStorage.setItem(`ff:${context.key}:${apiKey}`, JSON.stringify(controls));
        emitter.emit(events.LOADED, _controls);
      }
      else{
        emitter.emit(events.ERROR, error);
      }
    })
    return context;
  }

  function evaluate(key: string, failOverValue: string): string{
    return controls[key] || failOverValue;
  }

  function getControls(): ControlsType{
    return controls;
  }

  function getContext(): ContextType{
    return context;
  }

  return {
    updateContext,
    getControls,
    getContext,
    evaluate,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter)
  }
}

export default {
  init,
  events
}

if(window.VERSION !== undefined) {
  module.exports.version = window.VERSION;
}