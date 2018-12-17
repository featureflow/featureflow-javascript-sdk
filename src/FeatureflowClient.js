// @flow
import RestClient from './RestClient';
import Evaluate from './Evaluate';

import Events from './Events';

import Emitter from 'tiny-emitter';
import Cookies from 'js-cookie';

const DEFAULT_BASE_URL = 'https://app.featureflow.io';
const DEFAULT_EVENTS_URL = 'https://events.featureflow.io';
const DEFAULT_RTM_URL = 'https://rtm.featureflow.io';

const DEFAULT_CONFIG: ConfigType = {
  baseUrl: DEFAULT_BASE_URL,
  eventsUrl: DEFAULT_EVENTS_URL,
  rtmUrl: DEFAULT_RTM_URL,
  streaming: true,
  defaultFeatures: {},
  useCookies: true,
  offline: false
};

const INIT_MODULE_ERROR = new Error('init() has not been called with a valid apiKey');

function loadFeatures(apiKey: string, userId: string): FeaturesType{
  try{
    return JSON.parse(localStorage.getItem(`ff:${userId}:${apiKey}`) || '{}');
  }
  catch(err){
    return {};
  }
}

function saveFeatures(apiKey: string, userId: string, features: FeaturesType): void{
  return localStorage.setItem(`ff:${userId}:${apiKey}`, JSON.stringify(features));
}

export default class FeatureflowClient{
  apiKey: string;
  features: FeaturesType;
  config: ConfigType;
  user: UserType;
  emitter: Emitter;
  on: (string)=>any;
  off: (string)=>any;
  receivedInitialResponse: boolean;

  constructor(apiKey: string, user: UserTypeParam = {}, config: ConfigTypeParam = {}, callback: NodeCallbackType<*> = ()=>{}){

    //if we are offline then just return the default

    this.receivedInitialResponse = false;
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
    this.updateUser(user);

    //4. Set up realtime streaming
    if (!this.config.offline && this.config.streaming){
      let es = new window.EventSource(`${this.config.rtmUrl}/api/js/v1/stream/${this.apiKey}`);
      es.onmessage = (e) => {
        let keys = [];
        try{
          keys = JSON.parse(e.data);
        }
        catch(err){}

        RestClient.getFeatures(this.config.baseUrl, this.apiKey, this.user, keys, (error, features)=>{
          if (!error){
            this.features = {
              ...this.features,
              ...features
            };
            saveFeatures(this.apiKey, this.user.id, this.features);
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

  updateUser(user: UserTypeParam = {}, callback: NodeCallbackType<*> = ()=>{}): void{
    //these could be event or session attributes ie not persisted directly to user but added to a separate attributes map
    const featureflowAttributes = {
    };
    const attributes = {
        ...user.attributes,
        ...featureflowAttributes
    };
    this.user = {
      id: user.id || this.getAnonymousId(),
      attributes: attributes
    };

    this.features = loadFeatures(this.apiKey, this.user.id);
    // Put this in timeout so we can listen to all events before it is returned
    setTimeout(()=>{
      this.emitter.emit(Events.LOADED_FROM_CACHE, this.features);

        if(this.config.offline) {
            setTimeout(()=> {
                this.features = this.config.defaultFeatures;
                saveFeatures(this.apiKey, this.user.id, this.features);
                this.emitter.emit(Events.INIT, this.features);
                this.emitter.emit(Events.LOADED, this.features);
                callback(undefined, this.features);
                return this.user;
            });
        }else{
            RestClient.getFeatures(this.config.baseUrl, this.apiKey, this.user, [], (error, features)=>{
                this.receivedInitialResponse = true;
                if (!error){
                    this.features = features || {};
                    saveFeatures(this.apiKey, this.user.id, this.features);
                    this.emitter.emit(Events.INIT, features);
                    this.emitter.emit(Events.LOADED, features);
                    callback(undefined, features);
                }
                else{
                    this.emitter.emit(Events.ERROR, error);
                    callback(error);
                }
                return this.user;
            });
        }
    },0);
  }
  getFeatures(): FeaturesType{
    if(this.config.offline){
        return this.config.defaultFeatures;
    }
    return this.features;
  }
  getUser(): UserType{
    return this.user;
  }
  evaluate(key: string) : Evaluate {
    if(this.config.offline){
      const evaluate = new Evaluate(this.config.defaultFeatures[key] || 'off');
      return evaluate
    }
    const evaluate = new Evaluate(this.features[key] || this.config.defaultFeatures[key] || 'off');
    RestClient.postEvaluateEvent(this.config.eventsUrl, this.apiKey, this.user, key, evaluate.value(), ()=>{});
    return evaluate;
  }

  goal(goal:string): void {
    if(this.config.offline) return;
    return RestClient.postGoalEvent(this.config.eventsUrl, this.apiKey, this.user, goal, this.getFeatures(),()=>{});
  }

  getAnonymousId(): string{
    return localStorage.getItem(`ff-anonymous-id`) || this.resetAnonymousId();
  }

  resetAnonymousId(): string{
    let anonymousId = 'anonymous:'+Math.random().toString(36).substring(2);
    localStorage.setItem(`ff-anonymous-id`, anonymousId);

    if (this.config.useCookies){
      //Set the anonymous key cookie for potential future usage with Server SDK
      Cookies.set('ff-anonymous-id', anonymousId);
    }
    return anonymousId;
  }
  hasReceivedInitialResponse(): boolean{
    return this.receivedInitialResponse;
  }
}
