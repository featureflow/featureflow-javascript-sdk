export type EventCallback<T = any> = (...rest: T[]) => any;

export type UserAttributes = {
  [key: string]: string | number | (string | number)[];
};

export type Rule = {
  audience?: Audience;
  variant: string;
  /** The variant's JSON config payload, embedded directly in the /evaluate response. */
  value?: unknown;
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
  /**
   * Disable analytics event sending (evaluate summaries and goals) while still fetching
   * features. Permanent for the client's lifetime — server config can never re-enable it.
   */
  disableEvents?: boolean;
  /**
   * @deprecated Evaluate events are now summarised client-side into per (featureKey,
   * variant) impression counts, which gives exact counts at less cost than deduping.
   * The option is accepted but has no effect.
   */
  uniqueEvals?: boolean;
};

export type ConfigInternal = {
  baseUrl: string;
  eventsUrl: string;
  defaultFeatures: { [key: string]: string };
  useCookies: boolean;
  offline: boolean;
  delayInit: boolean;
  disableEvents: boolean;
  /** @deprecated See Config.uniqueEvals. */
  uniqueEvals: boolean;
};

/**
 * Details for a goal (track) event: a number is the metric value; an object's optional
 * `value` is the metric value and its remaining fields are sent as custom data —
 * congruent with the OpenFeature tracking API.
 */
export type GoalDetails = number | { value?: number; [key: string]: unknown };

export interface Evaluate {
  is(value: string): boolean;
  isOn(): boolean;
  isOff(): boolean;
  value(): string;
  /** The evaluated variant's JSON config payload, or undefined if it has none. */
  jsonValue<T = unknown>(): T | undefined;
}

export type EvalResult = {
  variant: string;
  rules: Rule;
  requiresEval: boolean;
};

/**
 * Internal interface for FeatureflowClient contract enforcement
 * This ensures the class implements all required public methods.
 * Users should use the FeatureflowClient class type directly, not this interface.
 * @internal
 */
export interface IFeatureflowClient {
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
   * Track a goal event for the current user. `details` is a number (the metric value) or
   * an object `{ value?, ...custom }` — congruent with the OpenFeature tracking API.
   */
  track(goalKey: string, details?: GoalDetails): void;

  /**
   * Send a goal event for A/B testing experiments.
   * @deprecated Use track(goalKey) instead.
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
 * @deprecated Use FeatureflowClient class type instead. This type is kept for backwards compatibility.
 */
export type FeatureflowInstance = IFeatureflowClient;

export type RequestConfig = {
  method: string;
  body?: any; // Can be string, object, array, etc.
};

