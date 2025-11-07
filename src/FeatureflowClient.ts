import RestClient from './RestClient';
import Evaluate from './Evaluate';
import Events from './Events';
import { test } from './Conditions';
import Emitter from 'tiny-emitter';
import Cookies from 'js-cookie';
import type { TinyEmitter } from 'tiny-emitter';
import {
  type Config,
  type ConfigInternal,
  type FeatureflowUser,
  Features,
  type EvaluatedFeatures,
  type NodeCallback,
  type EventCallback,
  type Feature,
  type Rule,
  Condition,
  Conditions
} from './types';

const DEFAULT_BASE_URL = 'https://app.featureflow.io';
const DEFAULT_EVENTS_URL = 'https://events.featureflow.io';

const DEFAULT_CONFIG: ConfigInternal = {
  baseUrl: DEFAULT_BASE_URL,
  eventsUrl: DEFAULT_EVENTS_URL,
  defaultFeatures: {},
  useCookies: true,
  offline: false,
  delayInit: false,
  uniqueEvals: true
};

const KEY_PREFIX = "ff:v1311";

const INIT_MODULE_ERROR = new Error('init() has not been called with a valid apiKey');

function generateAnonymousId(): string {
  return `anonymous:${Math.random().toString(36).substring(2)}`;
}

function getDefaultUser(): FeatureflowUser {
  return { id: generateAnonymousId() };
}

function loadFeatures(apiKey: string, userId: string): { [key: string]: any } {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    return JSON.parse(localStorage.getItem(`${KEY_PREFIX}:${userId}:${apiKey}`) || '{}');
  } catch (err) {
    return {};
  }
}

function hasCachedFeatures(apiKey: string, userId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return localStorage.getItem(`${KEY_PREFIX}:${userId}:${apiKey}`) !== null;
  } catch (err) {
    return false;
  }
}

function saveFeatures(apiKey: string, userId: string, features: { [key: string]: any }): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(`${KEY_PREFIX}:${userId}:${apiKey}`, JSON.stringify(features));
}

export default class FeatureflowClient {
  apiKey: string;
  features: { [key: string]: Feature };
  evaluatedFeatures: EvaluatedFeatures;
  config: ConfigInternal;
  user: FeatureflowUser;
  emitter: TinyEmitter;
  on: (event: string, callback: EventCallback, bindContext?: unknown) => void;
  off: (event: string, callback?: EventCallback) => void;
  receivedInitialResponse: boolean;
  restClient: RestClient;
  initialised: boolean;
  currentContext: {
    attributes: {
      [key: string]: any[];
    };
  };

  constructor(apiKey: string, user: FeatureflowUser = getDefaultUser(), config: Config = {}, callback: NodeCallback = () => {
  }) {
    this.initialised = false;
    this.receivedInitialResponse = false;
    this.evaluatedFeatures = {};
    this.features = {};
    this.emitter = new (Emitter as any)();
    this.apiKey = apiKey;
    this.user = { id: '', attributes: {} };
    this.currentContext = { attributes: {} };

    //1. They must have an api key
    if (!this.apiKey) {
      throw INIT_MODULE_ERROR;
    }

    //2. Extend the default configuration
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    } as ConfigInternal;
    //Create the rest client
    this.restClient = new RestClient(apiKey, this.config);

    // Store user parameter for initialization
    const initialUser = user;

    if (!config.delayInit) {
      this.initialise(initialUser, callback);
    }

    //Bind event emitter
    this.on = this.emitter.on.bind(this.emitter);
    this.off = this.emitter.off.bind(this.emitter);
  }

  initialise(user: FeatureflowUser = getDefaultUser(), callback: NodeCallback = () => {}): void {
    //3. Load initial data
    this.updateUserWithCache(user, false, callback);
  }

  updateUser(user: FeatureflowUser = getDefaultUser(), callback: NodeCallback = () => {
  }): FeatureflowUser {
    return this.updateUserWithCache(user, false, callback);
  }

  updateUserWithCache(user: FeatureflowUser, initOnCache = false, callback: NodeCallback = () => {
  }): FeatureflowUser {
    //these could be event or session attributes ie not persisted directly to user but added to a separate attributes map
    const featureflowAttributes = {};
    const attributes = {
      ...user.attributes,
      ...featureflowAttributes
    };
    this.user = {
      id: user.id || this.getAnonymousId(),
      attributes: attributes
    };
    const now = new Date();
    const hourOfDay = now.getHours();
    const hArray = [hourOfDay];
    
    //set the current data and hour of day, they are evaluated locally to improve the CDN Cache performance 
    this.currentContext = {
      attributes: {
        "featureflow.date": [now],
        "featureflow.hourofday": hArray
      }
    };

    const userId = this.user.id;
    this.features = loadFeatures(this.apiKey, userId);
    if (hasCachedFeatures(this.apiKey, userId)) {
      this.emitter.emit(Events.LOADED_FROM_CACHE, this.features);
      /*if(initOnCache) {
          callback(undefined, this.features);
      }*/
    }

    // Put this in timeout so we can listen to all events before it is returned
    setTimeout(() => {
      if (this.config.offline) {
        setTimeout(() => {
          this.features = this.config.defaultFeatures;
          saveFeatures(this.apiKey, userId, this.features);
          this.receivedInitialResponse = true;
          this.initialised = true;
          this.emitter.emit(Events.INIT, this.features);
          this.emitter.emit(Events.LOADED, this.features);
          callback(undefined, this.features);
        });
      } else {
        this.restClient.getFeatures(this.user, [], (error, features) => {
          this.receivedInitialResponse = true;
          this.initialised = true;
          if (!error) {
            this.features = features || {};
            saveFeatures(this.apiKey, userId, this.features);
            this.emitter.emit(Events.INIT, features);
            this.emitter.emit(Events.LOADED, features);
            callback(undefined, features);
          } else {
            this.emitter.emit(Events.ERROR, error);
            callback(error);
          }
        });
      }
    }, 0);

    return this.user;
  }

  getFeatures(): EvaluatedFeatures {
    if (this.config.offline) {
      return this.evalAll(this.config.defaultFeatures);
    }
    return this.evalAll(this.features);
  }

  getUser(): FeatureflowUser {
    return this.user;
  }

  evaluate(key: string): Evaluate {
    if (this.config.offline) {
      const evaluate = new Evaluate(this.config.defaultFeatures[key] || 'off');
      return evaluate;
    }

    const feature = this.features[key];
    if (typeof feature === 'undefined') return new Evaluate('off'); //we dont know this feature
    const variant = this.evalRules(feature);

    const evaluate = new Evaluate(variant || 'off');
    if (!this.config.uniqueEvals || (this.config.uniqueEvals && !this.evaluatedFeatures[key])) {
      this.evaluatedFeatures[key] = evaluate.value();
      this.restClient.postEvaluateEvent(this.user, key, evaluate.value());
    }

    return evaluate;
  }

  evalAll(features: { [key: string]: Feature }): EvaluatedFeatures {
    const evaluated: EvaluatedFeatures = {};
    for (const k of Object.keys(features)) {
      const variant = this.evalRules(features[k]);
      evaluated[k] = variant || 'off';
      if (this.config.uniqueEvals && !this.evaluatedFeatures[k]) {
        this.evaluatedFeatures[k] = variant || 'off';
        this.restClient.postEvaluateEvent(this.user, k, variant || 'off');
      }
    }
    return evaluated;
  }

  evalRules(feature: Feature): string | undefined {
    if (typeof feature === 'string') return feature; //we may have old cache
    if (!feature || !feature.rules || !Array.isArray(feature.rules)) return undefined;
    for (const rule of feature.rules) {
      if (this.ruleMatches(rule)) {
        return rule.variant;
      }
    }
    return undefined;
  }

  ruleMatches(rule: Rule): boolean {
    if (!rule.audience) {
      return true;
    }
    if (!rule.audience.conditions) {
      return true;
    }
    for (const condition of rule.audience.conditions) {
      let pass = false;
      //if there is a date-based condition we smartly pass it back and eval here instead of in the server, 
      //they are non-sensitive and when evaluated here, provide greater performance due to caching benefits

      const values = this.currentContext.attributes[condition.target];
      if (!values) {
        continue;
      }
      for (const vKey in values) {
        const value = values[vKey];
        if (test(condition.operator, value, condition.values)) {
          pass = true;
          break;
        }
      }
      if (!pass) {
        return false;
      }
    }
    return true;
  }

  goal(goalKey: string): void {
    if (this.config.offline) return;
    this.restClient.postGoalEvent(this.user, goalKey, this.getFeatures());
  }

  getAnonymousId(): string {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ff-anonymous-id");
      if (stored) {
        return stored;
      }
    }
    return this.resetAnonymousId();
  }

  resetAnonymousId(): string {
    const anonymousId = `anonymous:${Math.random().toString(36).substring(2)}`;
    if (typeof window === "undefined") {
      return anonymousId;
    }
    localStorage.setItem("ff-anonymous-id", anonymousId);

    if (this.config.useCookies) {
      //Set the anonymous key cookie for potential future usage with Server SDK
      Cookies.set('ff-anonymous-id', anonymousId);
    }
    return anonymousId;
  }

  hasReceivedInitialResponse(): boolean {
    return this.receivedInitialResponse;
  }

  isInitialised(): boolean {
    return this.initialised;
  }
}

