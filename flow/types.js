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
  delayInit: boolean
  uniqueEvals: boolean //we will only count unique evaluation impressions
}

type ConfigTypeParam = {
  rtmUrl?: string,
  baseUrl?: string,
  eventsUrl?: string,
  streaming?: boolean,
  defaultFeatures?: FeaturesType,
  useCookies?: boolean,
  initOnCache?: boolean //whether to return init promise early on cache load (alpha)
  delayInit?: boolean //whether to delay intialisation until requested later (for example for SSR apps)
  uniqueEvals?: boolean //we will only count unique evaluation impressions
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