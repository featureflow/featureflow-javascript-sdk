import FeatureflowClient from './FeatureflowClient';
import Events from './Events';
import type { FeatureflowUser, Config, Features } from './types';

export function init(apiKey: string, user: FeatureflowUser = { id: `anonymous:${Math.random().toString(36).substring(2)}` }, config: Config = {}): FeatureflowClient {
  return new FeatureflowClient(apiKey, user, config);
}

export function initPromise(apiKey: string, user: FeatureflowUser = { id: `anonymous:${Math.random().toString(36).substring(2)}` }, config: Config = {}): Promise<FeatureflowClient> {
  return new Promise((resolve, reject) => {
    const client = new FeatureflowClient(apiKey, user, config, (err: unknown, data: Features) => {
      if (err && err !== null) {
        reject(err);
      } else {
        resolve(client);
      }
    });
  });
}

export const events = Events;

const Featureflow = {
  init,
  events
};

export default Featureflow;

export { FeatureflowClient };
export type { 
  FeatureflowUser,
  Config, 
  EvaluatedFeatures, 
  EvaluateInterface,
  Features,
  Feature,
  UserAttributes
} from './types';

