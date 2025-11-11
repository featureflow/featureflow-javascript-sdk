import FeatureflowClient from './FeatureflowClient';
import Events from './Events';
import type { FeatureflowUser, Config, Features } from './types';

function generateAnonymousId(): string {
  return `anonymous:${Math.random().toString(36).substring(2)}`;
}

function getDefaultUser(): FeatureflowUser {
  return { id: generateAnonymousId() };
}

// Function overloads for init
export function init(apiKey: string): FeatureflowClient;
export function init(apiKey: string, config: Config): FeatureflowClient;
export function init(apiKey: string, user: FeatureflowUser, config?: Config): FeatureflowClient;
export function init(apiKey: string, userOrConfig?: FeatureflowUser | Config, config?: Config): FeatureflowClient {
  // If second param is Config (has no 'id' property), treat it as config
  if (userOrConfig && !('id' in userOrConfig)) {
    return new FeatureflowClient(apiKey, undefined, userOrConfig as Config);
  }
  
  const user = userOrConfig || getDefaultUser();
  const finalConfig = config || {};
  return new FeatureflowClient(apiKey, user as FeatureflowUser, finalConfig);
}

// Function overloads for initPromise
export function initPromise(apiKey: string): Promise<FeatureflowClient>;
export function initPromise(apiKey: string, config: Config): Promise<FeatureflowClient>;
export function initPromise(apiKey: string, user: FeatureflowUser, config?: Config): Promise<FeatureflowClient>;
export function initPromise(apiKey: string, userOrConfig?: FeatureflowUser | Config, config?: Config): Promise<FeatureflowClient> {
  return new Promise((resolve, reject) => {
    // If second param is Config (has no 'id' property), treat it as config
    let user: FeatureflowUser;
    let finalConfig: Config;
    
    if (userOrConfig && !('id' in userOrConfig)) {
      user = getDefaultUser();
      finalConfig = userOrConfig as Config;
    } else {
      user = (userOrConfig as FeatureflowUser) || getDefaultUser();
      finalConfig = config || {};
    }
    
    const client = new FeatureflowClient(apiKey, user, finalConfig, (err: unknown, data: Features) => {
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
  Evaluate,
  Features,
  Feature,
  UserAttributes
} from './types';

