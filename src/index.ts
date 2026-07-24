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
export function init(apiKey: string): Promise<FeatureflowClient>;
export function init(apiKey: string, config: Config): Promise<FeatureflowClient>;
export function init(apiKey: string, user: FeatureflowUser, config?: Config): Promise<FeatureflowClient>;
export async function init(apiKey: string, userOrConfig?: FeatureflowUser | Config, config?: Config): Promise<FeatureflowClient> {
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
  
  const client = new FeatureflowClient(apiKey, user, finalConfig);
  
  // Wait for initialization if not delayed
  if (!finalConfig.delayInit) {
    await client.initialise(user);
  }
  
  return client;
}

export const events = Events;

const Featureflow = {
  init,
  events
};

export default Featureflow;

export { FeatureflowClient };
// Note: FeatureflowClient class is exported above and can be used as both value and type
export type { 
  FeatureflowUser,
  Config, 
  EvaluatedFeatures, 
  Evaluate,
  Features,
  Feature,
  UserAttributes,
  GoalDetails
} from './types';

