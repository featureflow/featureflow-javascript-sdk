// @flow
function getJSON(endpoint: string, callback: CallbackType<*>): XMLHttpRequest {
    let request = new XMLHttpRequest();
    request.addEventListener('load', function() {
        if (request.status === 200 && request.getResponseHeader('Content-type') === "application/json;charset=UTF-8") {
            callback(JSON.parse(request.responseText));
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

function RestClient(baseUrl:string, apiKey: string): RestClientType{
    function base64URLEncode(context) {
        return btoa(JSON.stringify(context));//.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
    }

    return {
      getControls: (context: any, callback: CallbackType<KeyValueFlat>): void => {
        let contextData= encodeURI(base64URLEncode(context));
        let url = baseUrl + '/api/js/v1/evaluate/' + apiKey + "/context/" + contextData;
        getJSON(url, callback);
      }
    };
}

export default RestClient;