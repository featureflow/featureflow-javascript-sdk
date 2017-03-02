// @flow

type NodeCallbackType<T=*, RET=any> = (error: any, ...rest: Array<T>)=>RET
type EventCallbackType<T=*, RET=any> = (...rest: Array<T>)=>RET

type KeyValueFlat = {
  [key:string]: mixed
}

type ControlsType = {
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
  defaultValues: ControlsType
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
  getControls: () => ControlsType,
  getContext: () => ContextType,
  evaluate: (key: string) => any,
  on: (event: string, callback: EventCallbackType<*>)=>any,
  off: (event: string, callback: EventCallbackType<*>)=>any
}