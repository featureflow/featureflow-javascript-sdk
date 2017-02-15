// @flow

type CallbackType<T> = (...any)=>T

type KeyValueNested = {
  [key:string]: KeyValueNested | mixed
}

type KeyValueFlat = {
  [key:string]: mixed
}

type RestClientType = {
  getControls: (context: KeyValueNested, callback: CallbackType<*>)=>void
}

type ConfigType = {
  controlsUrl? : string,
  baseUrl? : string
}