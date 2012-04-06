var ContextifyContext = require('bindings')('contextify').ContextifyContext;

module.exports = function Contextify (sandbox) {
    if (typeof sandbox != 'object') {
        sandbox = {};
    }
    var ctx = new ContextifyContext(sandbox);

    sandbox.run = function () {
        return ctx.run.apply(ctx, arguments);
    };

    sandbox.getGlobal = function () {
        return ctx.getGlobal();
    }

    sandbox.dispose = function () {
        sandbox.run = function () {
            throw new Error("Called run() after dispose().");
        };
        sandbox.getGlobal = function () {
            throw new Error("Called getGlobal() after dispose().");
        };
        sandbox.dispose = function () {
            throw new Error("Called dispose() after dispose().");
        };
        ctx = null;
    }
    return sandbox;
}


// minimal WeakMap shim
var WeakMap = typeof WeakMap !== 'undefined' ? WeakMap : function WeakMap(){
    var keys = [], values = [];
    return {
        set: function(key, val){
            keys.push(key);
            values.push(val);
            return val;
        },
        get: function(key){
            var index = keys.indexOf(key);
            if (~index) return values[index];
        },
        has: function(key){
            return !!~keys.indexOf(key);
        },
        delete: function(key){
            var index = keys.indexOf(key);
            if (~index) {
                keys.splice(index, 1);
                values.splice(index, 1);
                return true;
            }
            return false;
        }
    };
};



// allow for proper garbage collection
var contexts = new WeakMap;



var globalContext = function(){
    // use Function constructor to ensure real global
    var context = createContext(Function('return this')());
    globalContext = function(){ return context };
    return context;
};


function createContext(sandbox){
    if (sandbox == null) {
        sandbox = {};
    } else if (Object(sandbox) !== sandbox) {
        throw new TypeError('Sandbox must be an object');
    }
    var ctx = new ContextifyContext(sandbox);
    var context = ctx.getGlobal();
    contexts.set(context, ctx);
    return context;
}
module.exports.createContext = createContext;


function runInContext(code, context){
    if (Object(context) === context && contexts.has(context)) {
        return contexts.get(context).run(code);
    } else {
        throw new TypeError('Not a context');
    }
}
module.exports.runInContext = runInContext;


module.exports.runInThisContext = function runInThisContext(code){
    return runInContext(code, globalContext());
};


module.exports.runInNewContext = function runInNewContext(code){
    var context = createContext({});
    var result = runInContext(code, context);
    dispose(context);
    return result;
};


module.exports.dispose = function dispose(context){
    // dispose won't prevent property changes from propagating but will prevent code execution
    contexts.delete(context);
};
