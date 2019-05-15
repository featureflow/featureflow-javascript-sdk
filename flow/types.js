// @flow

type NodeCallbackType<T=*, RET=any> = (error: any, ...rest: Array<T>)=>RET
type EventCallbackType<T=*, RET=any> = (...rest: Array<T>)=>RET

type UserAttributesType<T=string|number> = {
  [key:string]: T | T[]
}

type FeaturesType = {
  rules: RulesType
}
type EvaluatedFeaturesType = {
  [key: string]: string
}

type UserType = {
  id: string,
  attributes?: UserAttributesType<*>
}

type UserTypeParam = {
  id?: string,
  attributes?: UserAttributesType<*>
}

type ConfigType = {
  rtmUrl : string,
  baseUrl : string,
  eventsUrl: string,
  streaming: boolean,
  defaultFeatures: FeaturesType,
  useCookies: boolean,
  offline: boolean
}

type ConfigTypeParam = {
  rtmUrl?: string,
  baseUrl?: string,
  eventsUrl?: string,
  streaming?: boolean,
  defaultFeatures?: FeaturesType,
  useCookies?: boolean
}

interface EvaluateInterface {
  is: (value: string) => boolean;
  isOn: () => boolean;
  isOff: () => boolean;
  value: () => string;
}

type EvalResultType = {
  variant : string,
  rules : RulesType,
  requiresEval: boolean
}

type RulesType = {
  audience?: AudienceType,
  variant: string
}

type AudienceType = {
  conditions: ConditionsType
}

type ConditionsType = {
  target: string,
  operator: string,
  values: any
}

type FeatureflowInstance = {
  updateUser: (user: UserTypeParam) => UserType,
  getFeatures: () => FeaturesType,
  getUser: () => UserType,
  evaluate: (key: string) => any,
  on: (event: string, callback: EventCallbackType<*>)=>any,
  off: (event: string, callback: EventCallbackType<*>)=>any
}