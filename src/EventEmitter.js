/**
 * Created by oliver on 23/11/16.
 * EventEmitter inspired by nodejs EventEmitter
 */

function EventEmitter(){
    var eventEmitter = {};
    var _listeners = {};

    eventEmitter.initEventEmitter = function () {
        this._listeners = {};
    };

    eventEmitter.initEventEmitterType = function (type) {
        if (!type) {
            return;
        }
        this._listeners[type] = [];
    };

    eventEmitter.hasEventListener = function (type, fn) {
        if (!this.listener) {
            return false;
        }

        if (type && !this.listener[type]) {
            return false;
        }

        return true;
    };

    eventEmitter.addListener = function (type, fn) {
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

    eventEmitter.one = function (type, fn) {
        fn._oneTimeListener = true;
        this.addListener(type, fn);
    };

    eventEmitter.removeListener = function (type, fn) {
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

    eventEmitter.emit = function (type) {
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

    eventEmitter.listeners = function (type) {
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

module.exports = EventEmitter;
