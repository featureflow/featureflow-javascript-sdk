// @flow

type NodeCallbackType<T=*, RET=any> = (error: any, ...rest: Array<T>)=>RET
type EventCallbackType<T=*, RET=any> = (...rest: Array<T>)=>RET

type KeyValueFlat = {
  [key:string]: mixed
}

type FeaturesType = {
  [key: string]: string
}

type ContextType = {
  key: string,
  values?: KeyValueFlat
}

type ContextTypeParam = {
  key?: string,
  values?: KeyValueFlat
}

type ConfigType = {
  rtmUrl : string,
  baseUrl : string,
  streaming: boolean,
  defaultFeatures: FeaturesType
}

type ConfigTypeParam = {
  rtmUrl?: string,
  baseUrl?: string,
  streaming?: boolean
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