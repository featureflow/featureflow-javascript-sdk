// @flow
import RestClient from './RestClient';
import Evaluate from './Evaluate';

import Events from './Events';

import Emitter from 'tiny-emitter';
import Cookies from 'js-cookie';

const DEFAULT_BASE_URL = 'https://app.featureflow.io';
const DEFAULT_RTM_URL = 'https://rtm.featureflow.io';

const DEFAULT_CONFIG: ConfigType = {
  baseUrl: DEFAULT_BASE_URL,
  rtmUrl: DEFAULT_RTM_URL,
  streaming: true,
  defaultFeatures: {},
  useCookies: true
};

const INIT_MODULE_ERROR = new Error('init() has not been called with a valid apiKey');

function loadFeatures(apiKey: string, contextKey: string): FeaturesType{
  try{
    return JSON.parse(localStorage.getItem(`ff:${contextKey}:${apiKey}`) || '{}');
  }
  catch(err){
    return {};
  }
}

function saveFeatures(apiKey: string, contextKey: string, features: FeaturesType): void{
  return localStorage.setItem(`ff:${contextKey}:${apiKey}`, JSON.stringify(features));
}

export default class FeatureflowClient{
  apiKey: string;
  features: FeaturesType;
  config: ConfigType;
  context: ContextType;

  constructor(apiKey: string, context: ContextTypeParam = {}, config: ConfigTypeParam = {}, callback: NodeCallbackType = ()=>{}){
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
            callback(undefined, features);
          }
          else{
            this.emitter.emit(Events.ERROR, error);
            callback(error);
          }
        })
      };
    }

    //Bind event emitter
    this.on = this.emitter.on.bind(this.emitter);
    this.off = this.emitter.off.bind(this.emitter);
  }

  updateContext(context: ContextTypeParam = {}, callback: NodeCallbackType = ()=>{}): void{
    this.context = {
      key: context.key || this.getAnonymousKey(),
      values: context.values
    };

    this.features = loadFeatures(this.apiKey, this.context.key);

    RestClient.getFeatures(this.config.baseUrl, this.apiKey, this.context, [], (error, features)=>{
      if (!error){
        this.features = features || {};
        saveFeatures(this.apiKey, this.context.key, this.features);
        this.emitter.emit(Events.LOADED, features);
        callback(undefined, features);
      }
      else{
        this.emitter.emit(Events.ERROR, error);
        callback(error);
      }
      return this.context;
    });
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
    return RestClient.postGoalEvent(this.config.baseUrl, this.apiKey, this.context.key, goal, this.getFeatures(),()=>{});
  }

  getAnonymousKey(): string{
    return localStorage.getItem(`ff-anonymous-key`) || this.resetAnonymousKey();
  }

  resetAnonymousKey(): string{
    let anonymousKey = 'anonymous:'+Math.random().toString(36).substring(10);
    localStorage.setItem(`ff-anonymous-key`, anonymousKey);

    if (this.config.useCookies){
      //Set the anonymous key cookie for potential future usage with Server SDK
      Cookies.set('ff-anonymous-key', anonymousKey);
    }
    return anonymousKey;
  }
}
