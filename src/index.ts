import FeatureflowClient from './FeatureflowClient';
import Events from './Events';
import { UserParam, ConfigParam } from './types';

export function init(apiKey: string, user: UserParam = {}, config: ConfigParam = {}): FeatureflowClient {
  return new FeatureflowClient(apiKey, user, config);
}

export function initPromise(apiKey: string, user: UserParam = {}, config: ConfigParam = {}): Promise<FeatureflowClient> {
  return new Promise(function (resolve, reject) {
    const client = new FeatureflowClient(apiKey, user, config, function (err: any, data: any) {
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
  User, 
  UserParam, 
  Config, 
  ConfigParam, 
  EvaluatedFeatures, 
  EvaluateInterface,
  Features,
  Feature,
  UserAttributes
} from './types';

