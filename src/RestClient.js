// @flow
import packageJSON from '../package.json';
type RequestConfig = {
  method: 'GET' | 'POST',
  body: ?any
}
function request(endpoint: string, config: ConfigType, callback: NodeCallbackType<FeaturesType> = ()=>{}): XMLHttpRequest {
    let request = new XMLHttpRequest();
    request.addEventListener('load', function() {
      if (request.status === 200 && request.getResponseHeader('Content-type') === "application/json;charset=UTF-8") {
        callback(null, JSON.parse(request.responseText));
      } else {
        callback(request.statusText);
      }
    });
    request.addEventListener('error', function() {
      callback(request.statusText);
    });
    request.open(config.method, endpoint);
    request.setRequestHeader('X-Featureflow-Client', `javascript-${packageJSON.version}`);
    if (config.body){
      request.setRequestHeader('ContentType', 'application/json');
      request.send(JSON.stringify(config.body));
    }
    else{
      request.send();
    }
    return request;
}



function base64URLEncode(context: ContextType): string {
  return btoa(JSON.stringify(context));
}

export default {
  getFeatures: (baseUrl: string, apiKey: string, context: any, keys: string[] = [], callback: NodeCallbackType<FeaturesType>): void => {
    let query = ( keys.length > 0 ) ? `?keys=${ keys.join(',') }` : '';
    request(
      `${baseUrl}/api/js/v1/evaluate/${ apiKey }/context/${ encodeURI(base64URLEncode(context)) }${ query }`,
      { method: 'GET' },
      callback
    );
  },
  postGoalEvent: (baseUrl: string, apiKey:string, contextKey: string, goalKey: string, evaluatedFeaturesMap: FeaturesType, callback: NodeCallbackType<FeaturesType>): void => {
    request(`${baseUrl}/api/js/v1/event/${ apiKey }`,
      {
        method: 'POST',
        body: {
          type: 'goal',
          data: [{
            contextKey,
            goalKey,
            hits: 1,
            evaluated: evaluatedFeaturesMap
          }]
        }
      },
      callback
    );
  },
  postEvaluateEvent: (baseUrl: string, apiKey:string, contextKey: string, featureKey: string, variant: string, callback: NodeCallbackType<FeaturesType>): void => {
    request(`${baseUrl}/api/js/v1/event/${ apiKey }`,
      {
        method: 'POST',
        body: {
          type: 'evaluate',
          data: [{
            contextKey,
            featureKey,
            variant,
            hits: 1,
          }]
        }
      },
      callback
    );
  }
};