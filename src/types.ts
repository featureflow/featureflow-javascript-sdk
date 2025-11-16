export type EventCallback<T = any> = (...rest: T[]) => any;

export type UserAttributes = {
  [key: string]: string | number | (string | number)[];
};

export type Rule = {
  audience?: Audience;
  variant: string;
};

export type Condition = {
  target: string;
  operator: string;
  values: (string | number)[];
};

export type Conditions = Condition[];

export type Audience = {
  conditions: Conditions;
};


export type Feature = {
  rules: Rule[];
} | string;

export type Features = {
  [key: string]: Feature;
};

export type EvaluatedFeatures = {
  [key: string]: string;
};

export type FeatureflowUser = {
  id: string;
  attributes?: UserAttributes;
};

export type Config = {
  baseUrl?: string;
  eventsUrl?: string;
  defaultFeatures?: { [key: string]: string };
  useCookies?: boolean;
  initOnCache?: boolean;
  offline?: boolean;
  delayInit?: boolean;
  uniqueEvals?: boolean;
};

export type ConfigInternal = {
  baseUrl: string;
  eventsUrl: string;
  defaultFeatures: { [key: string]: string };
  useCookies: boolean;
  offline: boolean;
  delayInit: boolean;
  uniqueEvals: boolean;
};

export interface Evaluate {
  is(value: string): boolean;
  isOn(): boolean;
  isOff(): boolean;
  value(): string;
}

export type EvalResult = {
  variant: string;
  rules: Rule;
  requiresEval: boolean;
};

/**
 * Public API interface for FeatureflowClient
 * This defines the public methods available on a Featureflow client instance
 */
export interface FeatureflowClient {
  /**
   * Initialize the client with a user. Returns a Promise that resolves when initialization is complete.
   */
  initialise(user?: FeatureflowUser): Promise<Features>;
  
  /**
   * Update the user context and re-evaluate all features. Returns a Promise that resolves when update is complete.
   */
  updateUser(user: FeatureflowUser): Promise<Features>;
  
  /**
   * Get all evaluated features as a map of feature keys to variant values.
   */
  getFeatures(): EvaluatedFeatures;
  
  /**
   * Get the current user context.
   */
  getUser(): FeatureflowUser;
  
  /**
   * Evaluate a feature by key. Returns an Evaluate object with helper methods.
   */
  evaluate(key: string): Evaluate;
  
  /**
   * Send a goal event for A/B testing experiments.
   */
  goal(goalKey: string): void;
  
  /**
   * Subscribe to an event. Supports optional bindContext for binding 'this' in the callback.
   */
  on(event: string, callback: EventCallback, bindContext?: unknown): void;
  
  /**
   * Unsubscribe from an event. If no callback is provided, removes all listeners for the event.
   */
  off(event: string, callback?: EventCallback): void;
  
  /**
   * Check if the client has received an initial response from the server.
   */
  hasReceivedInitialResponse(): boolean;
  
  /**
   * Check if the client has been initialized.
   */
  isInitialised(): boolean;
  
  /**
   * Get the anonymous user ID.
   */
  getAnonymousId(): string;
  
  /**
   * Reset and generate a new anonymous user ID.
   */
  resetAnonymousId(): string;
}

/**
 * @deprecated Use FeatureflowClient instead. This type is kept for backwards compatibility.
 */
export type FeatureflowInstance = FeatureflowClient;

export type RequestConfig = {
  method: string;
  body?: any; // Can be string, object, array, etc.
};

