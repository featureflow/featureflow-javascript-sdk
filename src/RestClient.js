// @flow
import packageJSON from '../package.json';
import * as base64 from 'base64-js';

export default class RestClient {
    baseUrl: string
    eventsUrl: string;
    apiKey: string;
    timer: any;
    queues: any;

    constructor(apiKey: string, config: ConfigType) {
        this.apiKey = apiKey;
        this.baseUrl = config.baseUrl;
        this.eventsUrl = config.eventsUrl;
        this.queues = {
            events: []
        };
    }

    getFeatures(user: any, keys: string[] = [], callback: NodeCallbackType<FeaturesType>): void {
        let query = (keys.length > 0) ? `?keys=${keys.join(',')}` : '';
        this.request(
            `${this.baseUrl}/api/js/v1/evaluate/${this.apiKey}/user/${encodeURI(this.base64URLEncode(user))}${query}`,
            {method: 'GET'},
            callback
        );
    }

    postGoalEvent(user: UserType, goalKey: string, evaluatedFeaturesMap: EvaluatedFeaturesType): void {
        this.flushable();
        this.queues.events.push({
            type: 'goal',
            goalKey,
            impressions: 1,
            evaluatedFeatures: evaluatedFeaturesMap,
            timestamp: new Date(),
            user
        })}
    postEvaluateEvent (user: UserType, featureKey: string, variant: string): void {
        this.flushable();
        this.queues.events.push({
            type: 'evaluate',
            featureKey,
            evaluatedVariant: variant,
            impressions: 1,
            user,
            timestamp: new Date()
        })
    }

    flush() {
        let queue = [];
        if (this.queues.events.length > 0) {
            queue.push(...this.queues.events);
            this.queues.events = [];
            this.request(`${this.eventsUrl}/api/js/v1/event/${this.apiKey}`,
                {
                    method: 'POST',
                    body: queue
                }
            );
        }
        this.timer = null;
    };

// eslint-disable-next-line no-unused-vars
    flushable() {
        if (!this.timer) {
            this.timer = setTimeout(this.flush.bind(this), 2000);
        }
    };



    request(endpoint: string, config: RequestConfig, callback: NodeCallbackType<FeaturesType> = () => {
    }): XMLHttpRequest {
        let request = new XMLHttpRequest();
        request.addEventListener('load', function () {
            if (request.status === 200 && request.getResponseHeader('Content-Type') === "application/json;charset=UTF-8") {
                callback(null, JSON.parse(request.responseText));
            } else {
                callback(request.statusText || 'non 200 response status code');
            }
        });
        request.addEventListener('error', function () {
            callback('error connecting with server');
        });
        request.open(config.method, endpoint);
        request.setRequestHeader('X-Featureflow-Client', `JavascriptClient/${packageJSON.version}`);
        if (config.body) {
            request.setRequestHeader('Content-Type', 'application/json');
            request.send(JSON.stringify(config.body));
        } else {
            request.send();
        }
        return request;
    }


    base64URLEncode(user: UserType): string {
        const escaped = unescape(encodeURIComponent(JSON.stringify(user)));
        return base64.fromByteArray(this.stringToBytes(escaped));
    }

    stringToBytes(s) {
        const b = [];
        for (let i = 0; i < s.length; i++) {
            b.push(s.charCodeAt(i));
        }
        return b;
    }
};