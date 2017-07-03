// @flow
import FeatureflowClient from './FeatureflowClient';
import Events from './Events';

export function init(apiKey: string, context: ContextTypeParam = {}, config: ConfigTypeParam = {}) {
  return new FeatureflowClient(apiKey, context, config);
}

export const events = Events;

export default {
  init,
  events
}

if(window.VERSION !== undefined) {
  module.exports.version = window.VERSION;
}