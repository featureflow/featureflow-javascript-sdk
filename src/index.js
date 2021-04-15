// @flow
import FeatureflowClient from './FeatureflowClient';
import Events from './Events';

export function init(apiKey: string, user: UserTypeParam = {}, config: ConfigTypeParam = {}) {
  return new FeatureflowClient(apiKey, user, config);
}

export function initPromise(apiKey: string, user: UserTypeParam = {}, config: ConfigTypeParam = {}): Promise {
  return new Promise(function(resolve, reject) {
    let client = new FeatureflowClient(apiKey, user, config, function(err, data) {
      if (err && err !== null) {
        reject(err);
      }
      else {
        resolve(client);
      }
    });
  });
}

export const events = Events;

export default {
  init,
  initPromise,
  events
}

if(window.VERSION !== undefined) {
  module.exports.version = window.VERSION;
}