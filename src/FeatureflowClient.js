// @flow
import RestClient from './RestClient';
import Evaluate from './Evaluate';

import Events from './Events';

import Emitter from 'tiny-emitter';

const DEFAULT_CONTEXT_VALUES: ContextType = {
  key: 'anonymous'
};

const DEFAULT_BASE_URL = 'https://app.featureflow.io';
const DEFAULT_RTM_URL = 'https://rtm.featureflow.io';

const DEFAULT_CONFIG: ConfigType = {
  baseUrl: DEFAULT_BASE_URL,
  rtmUrl: DEFAULT_RTM_URL,
  streaming: true,
  defaultFeatures: {}
};

const INIT_MODULE_ERROR = new Error('init() has not been called with a valid apiKey');

function loadFeatures(apiKey: string, contextKey: string){
  try{
    return JSON.parse(localStorage.getItem(`ff:${contextKey}:${apiKey}`) || '{}');
  }
  catch(err){
    return {};
  }
}

function saveFeatures(apiKey: string, contextKey: string, features: FeaturesType){
  return localStorage.setItem(`ff:${contextKey}:${apiKey}`, JSON.stringify(features));
}

export default class FeatureflowClient{
  apiKey: string;
  features: FeaturesType;
  config: ConfigType;
  context: ContextType;

  constructor(apiKey: string, context: ContextTypeParam = {}, config: ConfigTypeParam = {}){
    this.emitter = new Emitter();
    this.apiKey = apiKey;

    //1. They must have an api key
    if (!this.apiKey){
      throw INIT_MODULE_ERROR;
    }

    //2. Extend the default configuration
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };

    //3. Load initial data
    this.updateContext(context);

    //4. Set up realtime streaming
    if (this.config.streaming){
      let es = new window.EventSource(`${this.config.rtmUrl}/api/js/v1/stream/${this.apiKey}`);
      es.onmessage = (e) => {
        let keys = [];
        try{
          keys = JSON.parse(e.data);
        }
        catch(err){
          //Ah well, we tried...
        }

        RestClient.getFeatures(this.config.baseUrl, this.apiKey, this.context, keys, (error, features)=>{
          if (!error){
            this.features = {
              ...this.features,
              ...features
            };
            saveFeatures(this.apiKey, this.context.key, this.features);
            this.emitter.emit(Events.UPDATED_FEATURE, features);
          }
          else{
            this.emitter.emit(Events.ERROR, error);
          }
        })
      };
    }

    //Bind event emitter
    this.on = this.emitter.on.bind(this.emitter);
    this.off = this.emitter.off.bind(this.emitter);
  }

  updateContext(context: ContextTypeParam = {}): ContextType{
    this.context = {
      key: context.key || DEFAULT_CONTEXT_VALUES.key,
      values: context.values
    };

    this.features = loadFeatures(this.apiKey, this.context.key);

    RestClient.getFeatures(this.config.baseUrl, this.apiKey, this.context, [], (error, features)=>{
      if (!error){
        this.features = features || {};
        saveFeatures(this.apiKey, this.context.key, this.features);
        this.emitter.emit(Events.LOADED, features);
      }
      else{
        this.emitter.emit(Events.ERROR, error);
      }
    });
    return this.context;
  }
  getFeatures(): FeaturesType{
    return this.features;
  }
  getContext(): ContextType{
    return this.context;
  }
  evaluate(key: string) : Evaluate {
    return new Evaluate(this.features[key] || this.config.defaultFeatures[key] || 'off');
  }

  goal(goal:string): void {
    return RestClient.postGoalEvent(this.config.baseUrl, this.apiKey, goal, this.getFeatures(),(error, response)=>{
      //noop
    })
  }
}
