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

export type User = {
  id: string;
  attributes?: UserAttributes;
};

export type UserParam = {
  id?: string;
  attributes?: UserAttributes;
};

export type Config = {
  baseUrl: string;
  eventsUrl: string;
  defaultFeatures: { [key: string]: string };
  useCookies: boolean;
  offline: boolean;
  delayInit: boolean;
  uniqueEvals: boolean;
};

export type ConfigParam = {
  baseUrl?: string;
  eventsUrl?: string;
  defaultFeatures?: { [key: string]: string };
  useCookies?: boolean;
  initOnCache?: boolean;
  delayInit?: boolean;
  uniqueEvals?: boolean;
  offline?: boolean;
};

export interface EvaluateInterface {
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
  updateUser: (user: UserParam) => User;
  getFeatures: () => EvaluatedFeatures;
  getUser: () => User;
  evaluate: (key: string) => EvaluateInterface;
  on: (event: string, callback: EventCallback) => any;
  off: (event: string, callback: EventCallback) => any;
};

export type RequestConfig = {
  method: string;
  body?: any; // Can be string, object, array, etc.
};

