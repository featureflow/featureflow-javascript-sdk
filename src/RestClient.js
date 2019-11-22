// @flow
import packageJSON from '../package.json';

type
RequestConfig = {
    method: 'GET' | 'POST',
    body? : any
}
let eventsUrl = 'https://events.featureflow.io';
let baseUrl = 'https://app.featureflow.io';
let apiKey = '';

let timer;
const queues = {
    events: []
};

const flush = () => {
    let queue = [];
    if (queues.events.length > 0) {
        queue.push(...queues.events);
        queues.events = [];
        request(`${this.eventsUrl}/api/js/v1/event/${this.apiKey}`,
            {
                method: 'POST',
                body: queue
            }
        );
    }
    timer = null;
};

// eslint-disable-next-line no-unused-vars
const flushable = () => {
    if (!timer) {
        timer = setTimeout(flush, 4000);
    }
};



function request(endpoint: string, config: RequestConfig, callback: NodeCallbackType<FeaturesType> = () => {
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


function base64URLEncode(user: UserType): string {
    return btoa(JSON.stringify(user));
}

export default {
    setBaseUrl: (baseUrl: string): void => {
        this.baseUrl = baseUrl;
    },
    setEventsUrl: (eventsUrl: string): void => {
        this.eventsUrl = eventsUrl;
    },
    setApiKey: (apiKey: string): void => {
        this.apiKey = apiKey;
    },
    getFeatures: (baseUrl: string, apiKey: string, user: any, keys: string[] = [], callback: NodeCallbackType<FeaturesType>): void => {
        let query = (keys.length > 0) ? `?keys=${keys.join(',')}` : '';
        request(
            `${baseUrl}/api/js/v1/evaluate/${apiKey}/user/${encodeURI(base64URLEncode(user))}${query}`,
            {method: 'GET'},
            callback
        );
    },
    postGoalEvent: (user: UserType, goalKey: string, evaluatedFeaturesMap: EvaluatedFeaturesType): void => flushable(
        queues.events.push({
            type: 'goal',
            goalKey,
            impressions: 1,
            evaluatedFeatures: evaluatedFeaturesMap,
            timestamp: new Date(),
            user
        })),
    postEvaluateEvent: (user: UserType, featureKey: string, variant: string): void => flushable(
        queues.events.push({
            type: 'evaluate',
            featureKey,
            evaluatedVariant: variant,
            impressions: 1,
            user,
            timestamp: new Date()
        }))
};