export type NodeCallback<T = any> = (error: any, ...rest: T[]) => any;
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

export type FeatureflowInstance = {
  updateUser: (user: FeatureflowUser) => FeatureflowUser;
  getFeatures: () => EvaluatedFeatures;
  getUser: () => FeatureflowUser;
  evaluate: (key: string) => Evaluate;
  on: (event: string, callback: EventCallback) => any;
  off: (event: string, callback: EventCallback) => any;
};

export type RequestConfig = {
  method: string;
  body?: any; // Can be string, object, array, etc.
};

