// @flow

type NodeCallbackType<T=*, RET=any> = (error: any, ...rest: Array<T>)=>RET
type EventCallbackType<T=*, RET=any> = (...rest: Array<T>)=>RET

type ConfigValuesType<T=string|number> = {
  [key:string]: T | T[]
}

type FeaturesType = {
  [key: string]: string
}

type ContextType = {
  key: string,
  values?: ConfigValuesType<*>
}

type ContextTypeParam = {
  key?: string,
  values?: ConfigValuesType<*>
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
  updateContext: (context: ContextTypeParam) => ContextType,
  getFeatures: () => FeaturesType,
  getContext: () => ContextType,
  evaluate: (key: string) => any,
  on: (event: string, callback: EventCallbackType<*>)=>any,
  off: (event: string, callback: EventCallbackType<*>)=>any
}