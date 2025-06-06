// @flow
import RestClient from './RestClient';
import Evaluate from './Evaluate';

import Events from './Events';
import {test} from './Conditions';


import Emitter from 'tiny-emitter';
import Cookies from 'js-cookie';

const DEFAULT_BASE_URL = 'https://app.featureflow.io';
const DEFAULT_EVENTS_URL = 'https://events.featureflow.io';
const DEFAULT_RTM_URL = 'https://rtm.featureflow.io';

const DEFAULT_CONFIG: ConfigType = {
    baseUrl: DEFAULT_BASE_URL,
    eventsUrl: DEFAULT_EVENTS_URL,
    rtmUrl: DEFAULT_RTM_URL,
    streaming: false,
    defaultFeatures: {},
    useCookies: true,
    offline: false,
    delayInit: false,
    uniqueEvals: true
};

const KEY_PREFIX = "ff:v1311";

const INIT_MODULE_ERROR = new Error('init() has not been called with a valid apiKey');

function loadFeatures(apiKey: string, userId: string): FeaturesType {
    if (typeof window == "undefined") {
        return {};
    }
    try {
        return JSON.parse(localStorage.getItem(`${KEY_PREFIX}:${userId}:${apiKey}`) || '{}');
    } catch (err) {
        return {};
    }
}

function hasCachedFeatures(apiKey: string, userId: string): boolean {
    if (typeof window == "undefined") {
        return false;
    }
    try {
        return localStorage.getItem(`${KEY_PREFIX}:${userId}:${apiKey}`) !== null;
    } catch (err) {
        return false;
    }
}

function saveFeatures(apiKey: string, userId: string, features: FeaturesType): void {
    if (typeof window == "undefined") {
        return {};
    }
    return localStorage.setItem(`${KEY_PREFIX}:${userId}:${apiKey}`, JSON.stringify(features));
}

export default class FeatureflowClient {
    apiKey: string;
    features: FeaturesType;
    evaluatedFeatures: EvaluatedFeaturesType;
    config: ConfigType;
    user: UserType;
    emitter: Emitter;
    on: (string)=>any;
    off: (string)=>any;
    receivedInitialResponse: boolean;
    restClient: RestClient;

    constructor(apiKey: string, user: UserTypeParam = {}, config?: ConfigTypeParam = {}, callback: NodeCallbackType<*> = () => {
    }) {
        this.initialised = false;
        this.receivedInitialResponse = false;
        this.evaluatedFeatures = {};
        this.emitter = new Emitter();
        this.apiKey = apiKey;

        //1. They must have an api key
        if (!this.apiKey) {
            throw INIT_MODULE_ERROR;
        }

        //2. Extend the default configuration
        this.config = {
            ...DEFAULT_CONFIG,
            ...config
        };
        //Create the rest client
        this.restClient = new RestClient(apiKey, this.config);

        if(!config.delayInit){
            this.initialise(callback);
        }

        //Bind event emitter
        this.on = this.emitter.on.bind(this.emitter);
        this.off = this.emitter.off.bind(this.emitter);


    }

    initialise(callback: NodeCallbackType<*> = () => {}){
        //3. Load initial data
        this.updateUserWithCache(this.user, false, callback);

        //4. Set up realtime streaming
        if (!this.config.offline && this.config.streaming && typeof window !== "undefined") {
            const pendingKeys = new Set();
            let debounceTimeout = null;

            const es = new window.EventSource(`${this.config.rtmUrl}/api/js/v1/stream/${this.apiKey}`);
            es.onmessage = (e) => {
                let keys = [];
                try {
                    keys = JSON.parse(e.data);
                } catch (err) {
                }

                // Add new keys to pending set
                for (const key of keys) {
                    pendingKeys.add(key);
                }

                // Clear existing timeout if any
                if (debounceTimeout) {
                    clearTimeout(debounceTimeout);
                }

                // Set new timeout
                debounceTimeout = setTimeout(() => {
                    const keysToFetch = Array.from(pendingKeys);
                    pendingKeys.clear();
                    
                    this.restClient.getFeatures(this.user, keysToFetch, (error, features) => {
                        if (!error) {
                            this.features = {
                                ...this.features,
                                ...features
                            };
                            saveFeatures(this.apiKey, this.user.id, this.features);
                            this.evaluatedFeatures = {}
                            this.emitter.emit(Events.UPDATED_FEATURE, features);
                            callback(undefined, features);
                        } else {
                            this.emitter.emit(Events.ERROR, error);
                            callback(error);
                        }
                    });
                }, 5000); // 5 second debounce
            };
        }
    }

    updateUser(user: UserTypeParam = {}, callback: NodeCallbackType<*> = () => {
    }): void {
        return this.updateUserWithCache(user, false, callback);
    };

    updateUserWithCache(user: UserTypeParam = {}, initOnCache: boolean, callback: NodeCallbackType<*> = () => {
    }): void {
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
        let now = new Date();
        let hourOfDay = now.getHours();
        let hArray = new Array(1);
        hArray[0] = hourOfDay;
        //this is local, just the date details, we don't pass this to featureflow
        //why? if we keep changing the user context with the current date we would void the CDN cache
        //its a lot more effective to almost resolve the rules and eval the date here

        this.currentContext = {
            attributes: {
                "featureflow.date": [].concat(now),
                "featureflow.hourofday": hArray
            }
        };

        this.features = loadFeatures(this.apiKey, this.user.id);
        if (hasCachedFeatures(this.apiKey, this.user.id)) {
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
                    saveFeatures(this.apiKey, this.user.id, this.features);
                    this.receivedInitialResponse = true;
                    this.initialised = true;
                    this.emitter.emit(Events.INIT, this.features);
                    this.emitter.emit(Events.LOADED, this.features);
                    callback(undefined, this.features);
                    return this.user;
                });
            } else {
                this.restClient.getFeatures(this.user, [], (error, features) => {
                    this.receivedInitialResponse = true;
                    this.initialised = true;
                    if (!error) {
                        this.features = features || {};
                        saveFeatures(this.apiKey, this.user.id, this.features);
                        this.emitter.emit(Events.INIT, features);
                        this.emitter.emit(Events.LOADED, features);
                        callback(undefined, features);
                    } else {
                        this.emitter.emit(Events.ERROR, error);
                        callback(error);
                    }
                    return this.user;
                });
            }
        }, 0);
    }

    getFeatures(): EvaluatedFeaturesType {
        if (this.config.offline) {
            return this.evalAll(this.config.defaultFeatures);
        }
        return this.evalAll(this.features);
    }


    getUser(): UserType {
        return this.user;
    }


    evaluate(key: string): Evaluate {
        if (this.config.offline) {
            const evaluate = new Evaluate(this.config.defaultFeatures[key] || 'off');
            return evaluate
        }

        let evaluatedFeature = this.features[key];
        if (typeof evaluatedFeature === 'undefined') return new Evaluate('off'); //we dont know this feature
        const variant = this.evalRules(evaluatedFeature);

        const evaluate = new Evaluate(variant);
        if(!this.config.uniqueEvals || (this.config.uniqueEvals && !this.evaluatedFeatures[key])){
            this.evaluatedFeatures[key] = evaluate;
            this.restClient.postEvaluateEvent(this.user, key, evaluate.value());
        }

        return evaluate;
    }

    evalAll(features) {
        let evaluated = {};
        for (let k in features) {
            if (features.hasOwnProperty(k)) {
                evaluated[k] = this.evalRules(features[k]);
                if(this.config.uniqueEvals && !this.evaluatedFeatures[k]){
                    this.evaluatedFeatures[k] = evaluated[k];
                    this.restClient.postEvaluateEvent(this.user, k, evaluated[k]);
                }
            }
        }
        return evaluated;
    }

    evalRules(evaluatedFeature) {
        if (typeof evaluatedFeature === 'string') return evaluatedFeature; //we may have old cache
        for (let ruleKey in evaluatedFeature.rules) {
            let rule = evaluatedFeature.rules[ruleKey];
            if (this.ruleMatches(rule)) {
                return rule.variant;
            }
        }
    }


    ruleMatches(rule) {
        if (!rule.audience) {
            return true;
        }
        for (let cKey in rule.audience.conditions) {
            let condition = rule.audience.conditions[cKey];
            let pass = false;
            //here we only are checking date or hour of day

            let values = this.currentContext.attributes[condition.target];
            for (let vKey in values) {
                let value = values[vKey];
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

    goal(goal: string): void {
        if (this.config.offline) return;
        return this.restClient.postGoalEvent(this.user, goal, this.getFeatures(), () => {
        });
    }

    getAnonymousId(): string {
        return typeof window !== "undefined" && localStorage.getItem(`ff-anonymous-id`) || this.resetAnonymousId();
    }

    resetAnonymousId(): string {
        let anonymousId = 'anonymous:' + Math.random().toString(36).substring(2);
        if (typeof window == "undefined") {
            return anonymousId;
        }
        localStorage.setItem(`ff-anonymous-id`, anonymousId);

        if (this.config.useCookies) {
            //Set the anonymous key cookie for potential future usage with Server SDK
            Cookies.set('ff-anonymous-id', anonymousId);
        }
        return anonymousId;
    }

    hasReceivedInitialResponse(): boolean {
        return this.receivedInitialResponse;
    }

    initialised(): boolean {
        return this.initialised;
    }


}
