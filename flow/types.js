// @flow

type NodeCallbackType<T=*, RET=any> = (error: any, ...rest: Array<T>)=>RET
type EventCallbackType<T=*, RET=any> = (...rest: Array<T>)=>RET

type UserAttributesType<T=string|number> = {
  [key:string]: T | T[]
}

type FeaturesType = {
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
  streaming: boolean,
  defaultFeatures: FeaturesType,
  useCookies: boolean
}

type ConfigTypeParam = {
  rtmUrl?: string,
  baseUrl?: string,
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


type FeatureflowInstance = {
  updateUser: (user: UserTypeParam) => UserType,
  getFeatures: () => FeaturesType,
  getUser: () => UserType,
  evaluate: (key: string) => any,
  on: (event: string, callback: EventCallbackType<*>)=>any,
  off: (event: string, callback: EventCallbackType<*>)=>any
}