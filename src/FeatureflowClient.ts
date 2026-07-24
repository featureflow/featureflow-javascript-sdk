import RestClient from './RestClient';
import EventsSummary from './EventsSummary';
import createEvaluate from './Evaluate';
import Events from './Events';
import { test } from './Conditions';
import mittFactory from 'mitt';
import type { Emitter } from 'mitt';
import Cookies from 'js-cookie';

// Handle both ESM and CommonJS exports for mitt
// mitt exports a function as default, but webpack might wrap it differently
const mitt = (typeof mittFactory === 'function' 
  ? mittFactory 
  : ((mittFactory as any).default || mittFactory)) as <T extends Record<string, unknown> = Record<string, unknown>>() => Emitter<T>;
import type {
  Config,
  ConfigInternal,
  FeatureflowUser,
  Features,
  EvaluatedFeatures,
  Evaluate,
  EventCallback,
  Feature,
  Rule,
  Condition,
  Conditions,
  GoalDetails,
  IFeatureflowClient
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
  disableEvents: false,
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

export default class FeatureflowClient implements IFeatureflowClient {
  apiKey: string;
  features: { [key: string]: Feature };
  evaluatedFeatures: EvaluatedFeatures;
  config: ConfigInternal;
  user: FeatureflowUser;
  emitter: Emitter<Record<string, unknown>>;
  private callbackMap: Map<EventCallback, (event: unknown) => void>;
  on: (event: string, callback: EventCallback, bindContext?: unknown) => void;
  off: (event: string, callback?: EventCallback) => void;
  receivedInitialResponse: boolean;
  restClient: RestClient;
  eventsClient: EventsSummary;
  initialised: boolean;
  currentContext: {
    attributes: {
      [key: string]: string|number|Date|string[]|number[]|Date[];
    };
  };

  constructor(apiKey: string, user?: FeatureflowUser, config: Config = {}) {
    this.initialised = false;
    this.receivedInitialResponse = false;
    this.evaluatedFeatures = {};
    this.features = {};
    this.emitter = mitt<Record<string, unknown>>();
    this.callbackMap = new Map();
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

    // Evaluate-event summarisation + goal queue. DOM-free module; the transport (XHR/beacon)
    // is injected from RestClient. Offline or disableEvents locally disables it for good —
    // server config can never re-enable a local disable.
    this.eventsClient = new EventsSummary(
      {
        send: (events, onResponse) => this.restClient.postEvents(events, onResponse),
        sendBeacon: (events) => this.restClient.postEventsBeacon(events)
      },
      { disabled: this.config.offline || this.config.disableEvents }
    );

    // Browser sessions die abruptly: flush pending events via sendBeacon when the page is
    // hidden or unloading.
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.eventsClient.flush(true);
        }
      });
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('pagehide', () => this.eventsClient.flush(true));
    }

    // Note: Initialization is now handled by the init() function, not the constructor
    // This allows init() to await the initialization Promise before returning

    //Bind event emitter with bindContext support
    this.on = (event: string, callback: EventCallback, bindContext?: unknown) => {
      const wrappedCallback: (event: unknown) => void = bindContext 
        ? ((event: unknown) => callback.apply(bindContext, [event]))
        : ((event: unknown) => callback(event));
      
      // Store mapping for removal
      this.callbackMap.set(callback, wrappedCallback);
      this.emitter.on(event, wrappedCallback);
    };
    this.off = (event: string, callback?: EventCallback) => {
      if (callback) {
        const wrappedCallback = this.callbackMap.get(callback);
        if (wrappedCallback) {
          this.emitter.off(event, wrappedCallback);
          this.callbackMap.delete(callback);
        }
      } else {
        // Remove all handlers for the event if no callback specified
        this.emitter.all.delete(event);
      }
    };
  }

  async initialise(user: FeatureflowUser = getDefaultUser()): Promise<Features> {
    //3. Load initial data
    return this.updateUserWithCache(user, false);
  }

  async updateUser(user: FeatureflowUser = getDefaultUser()): Promise<Features> {
    return this.updateUserWithCache(user, false);
  }

  async updateUserWithCache(user: FeatureflowUser, initOnCache = false): Promise<Features> {
    // Flush pending event summaries before switching user — each summary row carries the
    // user it was recorded for.
    this.eventsClient.flush();
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
      if(initOnCache) {
          return Promise.resolve(this.features);
      }
    }

    // Put this in timeout so we can listen to all events before it is returned
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        if (this.config.offline) {
          setTimeout(() => {
            // Convert defaultFeatures to Features format
            this.features = {};
            for (const key in this.config.defaultFeatures) {
              const value = this.config.defaultFeatures[key];
              if (typeof value === 'string') {
                this.features[key] = value;
              } else if (value && typeof value === 'object' && 'rules' in value) {
                this.features[key] = value as Feature;
              }
            }
            saveFeatures(this.apiKey, userId, this.features);
            this.receivedInitialResponse = true;
            this.initialised = true;
            this.emitter.emit(Events.INIT, this.features);
            this.emitter.emit(Events.LOADED, this.features);
            resolve(this.features);
          });
        } else {
          try {
            const features = await this.restClient.getFeatures(this.user, []);
            this.receivedInitialResponse = true;
            this.initialised = true;
            this.features = features || {};
            saveFeatures(this.apiKey, userId, this.features);
            this.emitter.emit(Events.INIT, features);
            this.emitter.emit(Events.LOADED, features);
            resolve(features);
          } catch (error) {
            this.receivedInitialResponse = true;
            this.initialised = true;
            this.emitter.emit(Events.ERROR, error);
            reject(error);
          }
        }
      }, 0);
    });
  }

  getFeatures(): EvaluatedFeatures {
    if (this.config.offline) {
      // Convert defaultFeatures to Features format if needed
      const features: { [key: string]: Feature } = {};
      for (const key in this.config.defaultFeatures) {
        const value = this.config.defaultFeatures[key];
        if (typeof value === 'string') {
          features[key] = value;
        } else if (value && typeof value === 'object' && 'rules' in value) {
          features[key] = value as Feature;
        }
      }
      return this.evalAll(features);
    }
    return this.evalAll(this.features);
  }

  getUser(): FeatureflowUser {
    return this.user;
  }

  evaluate(key: string): Evaluate {
    if (this.config.offline) {
      const defaultFeature = this.config.defaultFeatures[key];
      // Handle both string and Feature object types
      if (typeof defaultFeature === 'string') {
        return createEvaluate(defaultFeature);
      }
      // If it's a Feature object, evaluate it
      if (defaultFeature && typeof defaultFeature === 'object' && 'rules' in defaultFeature) {
        const matched = this.evalRules(defaultFeature);
        return createEvaluate(matched?.variant || 'off', matched?.value);
      }
      return createEvaluate('off');
    }

    const feature = this.features[key];
    if (typeof feature === 'undefined') return createEvaluate('off'); //we dont know this feature
    const matched = this.evalRules(feature);
    const resolvedVariant = matched?.variant || 'off';

    const evaluate = createEvaluate(resolvedVariant, matched?.value);
    // Every evaluation is recorded; the events client summarises into per (featureKey,
    // variant) impression counts, so exact counts cost less than the old uniqueEvals dedupe.
    this.evaluatedFeatures[key] = evaluate.value();
    this.eventsClient.recordEvaluate(key, evaluate.value(), this.user);

    return evaluate;
  }

  evalAll(features: { [key: string]: Feature }): EvaluatedFeatures {
    // Bulk evaluation does not record evaluate events — only evaluate(key) counts as an
    // impression (matches the node SDK's evaluateAll behaviour).
    const evaluated: EvaluatedFeatures = {};
    for (const k of Object.keys(features)) {
      const variant = this.evalRules(features[k])?.variant;
      evaluated[k] = variant || 'off';
    }
    return evaluated;
  }

  /** Returns the matched rule's variant key and JSON config value (embedded directly in the /evaluate response). */
  evalRules(feature: Feature): { variant: string; value?: unknown } | undefined {
    if (typeof feature === 'string') return { variant: feature }; //we may have simple string default features
    if (!feature || !feature.rules || !Array.isArray(feature.rules)) return undefined;
    for (const rule of feature.rules) {
      if (this.ruleMatches(rule)) {
        return { variant: rule.variant, value: rule.value };
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
      //if there is a date-based condition we smartly pass it back and eval here instead of in the server, 
      //they are non-sensitive and when evaluated here, provide greater performance due to caching benefits

      const values = this.currentContext.attributes[condition.target];
      if (!values) {
        continue;
      }
      const valuesArray = Array.isArray(values) ? values : [values];
      let pass = false;
      for (let i = 0; i < valuesArray.length; i++) {
        const value = valuesArray[i];
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

  track(goalKey: string, details?: GoalDetails): void {
    this.eventsClient.recordGoal(goalKey, this.user, details);
  }

  /** @deprecated Use track(goalKey) instead. */
  goal(goalKey: string): void {
    this.track(goalKey);
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

