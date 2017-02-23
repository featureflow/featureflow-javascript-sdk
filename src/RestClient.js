// @flow
function getJSON(endpoint: string, callback: NodeCallbackType<ControlsType>): XMLHttpRequest {
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
    request.open('GET', endpoint);
    request.send();
    return request;
}


function base64URLEncode(context: ContextType): string {
  return btoa(JSON.stringify(context));
}

export default {
  getControls: (baseUrl: string, apiKey: string, context: any, keys: string[] = [], callback: NodeCallbackType<ControlsType>): void => {
    let query = ( keys.length > 0 ) ? `?keys=${ keys.join(',') }` : '';
    getJSON(
      `${baseUrl}/api/js/v1/evaluate/${ apiKey }/context/${ encodeURI(base64URLEncode(context)) }${ query }`,
      callback
    );
  }
};