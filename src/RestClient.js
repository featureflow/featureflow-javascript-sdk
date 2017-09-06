// @flow
import packageJSON from '../package.json';

type RequestConfig = {
    method: 'GET' | 'POST',
    body?: any
}

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
    }
    else {
        request.send();
    }
    return request;
}


function base64URLEncode(user: UserType): string {
    return btoa(JSON.stringify(user));
}

export default {
    getFeatures: (baseUrl: string, apiKey: string, user: any, keys: string[] = [], callback: NodeCallbackType<FeaturesType>): void => {
        let query = ( keys.length > 0 ) ? `?keys=${ keys.join(',') }` : '';
        request(
            `${baseUrl}/api/js/v1/evaluate/${ apiKey }/user/${ encodeURI(base64URLEncode(user)) }${ query }`,
            {method: 'GET'},
            callback
        );
    },
    postGoalEvent: (baseUrl: string, apiKey: string, user: UserType, goalKey: string, evaluatedFeaturesMap: FeaturesType, callback: NodeCallbackType<FeaturesType>): void => {
        request(`${baseUrl}/api/js/v1/event/${ apiKey }`,
            {
                method: 'POST',
                body: [{
                    type: 'goal',
                    goalKey,
                    impressions: 1,
                    evaluatedFeatures: evaluatedFeaturesMap,
                    timestamp: new Date(),
                    user
                }]
            },
            callback
        );
    },
    postEvaluateEvent: (baseUrl: string, apiKey: string, user: UserType, featureKey: string, variant: string, callback: NodeCallbackType<FeaturesType>): void => {
        request(`${baseUrl}/api/js/v1/event/${ apiKey }`,
            {
                method: 'POST',
                body: [{
                    type: 'evaluate',
                    featureKey,
                    evaluatedVariant: variant,
                    impressions: 1,
                    user,
                    timestamp: new Date()
                }]
            },
            callback
        );
    }
};