// @flow
import FeatureflowClient from './FeatureflowClient';
import Events from './Events';

export function init(apiKey: string, user: UserTypeParam = {}, config: ConfigTypeParam = {}) {
  return new FeatureflowClient(apiKey, user, config);
}

export const events = Events;

export default {
  init,
  events
}

if(window.VERSION !== undefined) {
  module.exports.version = window.VERSION;
}