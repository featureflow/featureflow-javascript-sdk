/**
 * Created by oliver on 23/11/16.
 */


function getJSON(endpoint, callback) {
    var request = new XMLHttpRequest();
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

function RestClient(baseUrl, appKey){
    var restClient = {};

    restClient.getControls = function(context, callback){
        var contextData= encodeURI(base64URLEncode(context));
        var url = baseUrl + '/api/sdk/js/v1/evaluate/' + appKey + "/context/" + contextData;
        getJSON(url, callback);
    };

    function base64URLEncode(context) {
        return btoa(JSON.stringify(context));//.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
    }

    return restClient;
}

module.exports = RestClient;