// @flow
function EventEmitter(){
    let eventEmitter = {};
    let _listeners = {};

    eventEmitter.initEventEmitter = function () : void {
        this._listeners = {};
    };

    eventEmitter.initEventEmitterType = function (type: string) {
        if (!type) {
            return;
        }
        this._listeners[type] = [];
    };

    eventEmitter.hasEventListener = function (type: string) {
        if (!this.listener) {
            return false;
        }

        if (type && !this.listener[type]) {
            return false;
        }

        return true;
    };

    eventEmitter.addListener = function (type: string, fn: ()=>any) {
        if (!this._listeners) {
            this.initEventEmitter();
        }
        if (!this._listeners[type]) {
            this.initEventEmitterType(type);
        }
        this._listeners[type].push(fn);

        this.emit('newListener', type, fn);
    };

    eventEmitter.on = eventEmitter.addListener;

    eventEmitter.one = function (type: string, fn: ()=>any) {
        fn._oneTimeListener = true;
        this.addListener(type, fn);
    };

    eventEmitter.removeListener = function (type: string, fn: ()=>any) {
        if (!this._listeners) {
            return;
        }
        if (!this._listeners[type]) {
            return;
        }
        if (isNaN(this._listeners[type].length)) {
            return;
        }

        if (!type) {
            this.initEventEmitter();
            this.emit('removeListener', type, fn);
            return;
        }
        if (!fn) {
            this.initEventEmitterType(type);
            this.emit('removeListener', type, fn);
            return;
        }

        var self = this;
        for (var i = 0; i < this._listeners[type].length; i++) {
            (function (listener, index) {
                if (listener === fn) {
                    self._listeners[type].splice(index, 1);
                }
            })(this._listeners[type][i], i);
        }
        this.emit('removeListener', type, fn);
    };

    eventEmitter.emit = function (type: string) {
        if (!this._listeners) {
            return;
        }
        if (!this._listeners[type]) {
            return;
        }
        if (isNaN(this._listeners[type].length)) {
            return;
        }

        var self = this,
            args = [].slice.call(arguments, 1);

        for (var i = 0; i < this._listeners[type].length; i++) {
            (function (listener) {
                listener.apply(self, args);
                if (listener._oneTimeListener) {
                    self.removeListener(type, listener);
                }
            })(this._listeners[type][i]);
        }
    };

    eventEmitter.listeners = function (type: string) {
        if (!type) {
            return undefined;
        }
        return this._listeners[type];
    };

// jquery style alias
    eventEmitter.trigger = eventEmitter.emit;
    eventEmitter.off = eventEmitter.removeListener;
    

    return eventEmitter;
}

export default EventEmitter;
