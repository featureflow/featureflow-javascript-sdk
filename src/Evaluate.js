// @flow

export default class Evaluate{
  storedValue: string;
  constructor(value: string){
    this.storedValue = value.toLowerCase();
  }

  value() : string{
    return this.storedValue;
  }

  is(value: string) : boolean {
    return  value.toLowerCase() === this.value().toLowerCase();
  }

  isOn() : boolean{
    return this.is('on');
  }

  isOff() : boolean{
    return this.is('off');
  }
}