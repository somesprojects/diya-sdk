!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.d1=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],3:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiJdfQ==
},{"./support/isBuffer":2,"_process":1,"inherits":4}],4:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],5:[function(require,module,exports){
/**
 * Utility functions
 */

var util = {};

util.isObject = function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

util.isNumber = function isNumber(arg) {
  return typeof arg === 'number';
}

util.isUndefined = function isUndefined(arg) {
  return arg === void 0;
}

util.isFunction = function isFunction(arg){
  return typeof arg === 'function';
}


/**
 * EventEmitter class
 */

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

EventEmitter.init = function() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!util.isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error' && !this._events.error) {
    er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      throw Error('Uncaught, unspecified "error" event.');
    }
    return false;
  }

  handler = this._events[type];

  if (util.isUndefined(handler))
    return false;

  if (util.isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (util.isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              util.isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (util.isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (util.isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!util.isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;

      if (util.isFunction(console.error)) {
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
      }
      if (util.isFunction(console.trace))
        console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (util.isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (util.isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (util.isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (Array.isArray(listeners)) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (util.isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (util.isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

},{}],6:[function(require,module,exports){
(function (process){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object" && typeof module === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else if (typeof window !== "undefined" || typeof self !== "undefined") {
        // Prefer window over self for add-on scripts. Use self for
        // non-windowed contexts.
        var global = typeof window !== "undefined" ? window : self;

        // Get the `window` object, save the previous Q global
        // and initialize Q as a global.
        var previousQ = global.Q;
        global.Q = definition();

        // Add a noConflict function so Q can be removed from the
        // global namespace.
        global.Q.noConflict = function () {
            global.Q = previousQ;
            return this;
        };

    } else {
        throw new Error("This environment was not anticipated by Q. Please file a bug.");
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;
    // queue for late tasks, used by unhandled rejection tracking
    var laterQueue = [];

    function flush() {
        /* jshint loopfunc: true */
        var task, domain;

        while (head.next) {
            head = head.next;
            task = head.task;
            head.task = void 0;
            domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }
            runSingle(task, domain);

        }
        while (laterQueue.length) {
            task = laterQueue.pop();
            runSingle(task);
        }
        flushing = false;
    }
    // runs a single function in the async queue
    function runSingle(task, domain) {
        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function () {
                    throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process === "object" &&
        process.toString() === "[object process]" && process.nextTick) {
        // Ensure Q is in a real Node environment, with a `process.nextTick`.
        // To see through fake Node environments:
        // * Mocha test runner - exposes a `process` global without a `nextTick`
        // * Browserify - exposes a `process.nexTick` function that uses
        //   `setTimeout`. In this case `setImmediate` is preferred because
        //    it is faster. Browserify's `process.toString()` yields
        //   "[object Object]", while in a real Node environment
        //   `process.nextTick()` yields "[object process]".
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }
    // runs a task after all other tasks have been run
    // this is useful for unhandled rejection tracking that needs to happen
    // after all `then`d tasks have been run.
    nextTick.runAfter = function (task) {
        laterQueue.push(task);
        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };
    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

// enable long stacks if Q_DEBUG is set
if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
}

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            Q.nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            Q.nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            Q.nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become settled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be settled
 */
Q.race = race;
function race(answerPs) {
    return promise(function (resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function (answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    Q.nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
};

/**
 * Works almost like "finally", but not called for rejections.
 * Original resolution value is passed through callback unaffected.
 * Callback may return a promise that will be awaited for.
 * @param {Function} callback
 * @returns {Q.Promise}
 * @example
 * doSomething()
 *   .then(...)
 *   .tap(console.log)
 *   .then(...);
 */
Promise.prototype.tap = function (callback) {
    callback = Q(callback);

    return this.then(function (value) {
        return callback.fcall(value).thenResolve(value);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return object instanceof Promise;
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var reportedUnhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }
    if (typeof process === "object" && typeof process.emit === "function") {
        Q.nextTick.runAfter(function () {
            if (array_indexOf(unhandledRejections, promise) !== -1) {
                process.emit("unhandledRejection", reason, promise);
                reportedUnhandledRejections.push(promise);
            }
        });
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        if (typeof process === "object" && typeof process.emit === "function") {
            Q.nextTick.runAfter(function () {
                var atReport = array_indexOf(reportedUnhandledRejections, promise);
                if (atReport !== -1) {
                    process.emit("rejectionHandled", unhandledReasons[at], promise);
                    reportedUnhandledRejections.splice(atReport, 1);
                }
            });
        }
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    Q.nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var pendingCount = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++pendingCount;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--pendingCount === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (pendingCount === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Returns the first resolved promise of an array. Prior rejected promises are
 * ignored.  Rejects only if all promises are rejected.
 * @param {Array*} an array containing values or promises for values
 * @returns a promise fulfilled with the value of the first resolved promise,
 * or a rejected promise if all promises are rejected.
 */
Q.any = any;

function any(promises) {
    if (promises.length === 0) {
        return Q.resolve();
    }

    var deferred = Q.defer();
    var pendingCount = 0;
    array_reduce(promises, function (prev, current, index) {
        var promise = promises[index];

        pendingCount++;

        when(promise, onFulfilled, onRejected, onProgress);
        function onFulfilled(result) {
            deferred.resolve(result);
        }
        function onRejected() {
            pendingCount--;
            if (pendingCount === 0) {
                deferred.reject(new Error(
                    "Can't get fulfillment value from any promise, all " +
                    "promises were rejected."
                ));
            }
        }
        function onProgress(progress) {
            deferred.notify({
                index: index,
                value: progress
            });
        }
    }, undefined);

    return deferred.promise;
}

Promise.prototype.any = function () {
    return any(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        Q.nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            Q.nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            Q.nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

Q.noConflict = function() {
    throw new Error("Q.noConflict only works when Q is used as a global");
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

}).call(this,require('_process'))
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9xL3EuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdmltOnRzPTQ6c3RzPTQ6c3c9NDpcbi8qIVxuICpcbiAqIENvcHlyaWdodCAyMDA5LTIwMTIgS3JpcyBLb3dhbCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIE1JVFxuICogbGljZW5zZSBmb3VuZCBhdCBodHRwOi8vZ2l0aHViLmNvbS9rcmlza293YWwvcS9yYXcvbWFzdGVyL0xJQ0VOU0VcbiAqXG4gKiBXaXRoIHBhcnRzIGJ5IFR5bGVyIENsb3NlXG4gKiBDb3B5cmlnaHQgMjAwNy0yMDA5IFR5bGVyIENsb3NlIHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgTUlUIFggbGljZW5zZSBmb3VuZFxuICogYXQgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5odG1sXG4gKiBGb3JrZWQgYXQgcmVmX3NlbmQuanMgdmVyc2lvbjogMjAwOS0wNS0xMVxuICpcbiAqIFdpdGggcGFydHMgYnkgTWFyayBNaWxsZXJcbiAqIENvcHlyaWdodCAoQykgMjAxMSBHb29nbGUgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluaXRpb24pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8vIFRoaXMgZmlsZSB3aWxsIGZ1bmN0aW9uIHByb3Blcmx5IGFzIGEgPHNjcmlwdD4gdGFnLCBvciBhIG1vZHVsZVxuICAgIC8vIHVzaW5nIENvbW1vbkpTIGFuZCBOb2RlSlMgb3IgUmVxdWlyZUpTIG1vZHVsZSBmb3JtYXRzLiAgSW5cbiAgICAvLyBDb21tb24vTm9kZS9SZXF1aXJlSlMsIHRoZSBtb2R1bGUgZXhwb3J0cyB0aGUgUSBBUEkgYW5kIHdoZW5cbiAgICAvLyBleGVjdXRlZCBhcyBhIHNpbXBsZSA8c2NyaXB0PiwgaXQgY3JlYXRlcyBhIFEgZ2xvYmFsIGluc3RlYWQuXG5cbiAgICAvLyBNb250YWdlIFJlcXVpcmVcbiAgICBpZiAodHlwZW9mIGJvb3RzdHJhcCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGJvb3RzdHJhcChcInByb21pc2VcIiwgZGVmaW5pdGlvbik7XG5cbiAgICAvLyBDb21tb25KU1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGRlZmluaXRpb24oKTtcblxuICAgIC8vIFJlcXVpcmVKU1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKGRlZmluaXRpb24pO1xuXG4gICAgLy8gU0VTIChTZWN1cmUgRWNtYVNjcmlwdClcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZXMgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgaWYgKCFzZXMub2soKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VzLm1ha2VRID0gZGVmaW5pdGlvbjtcbiAgICAgICAgfVxuXG4gICAgLy8gPHNjcmlwdD5cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgfHwgdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gUHJlZmVyIHdpbmRvdyBvdmVyIHNlbGYgZm9yIGFkZC1vbiBzY3JpcHRzLiBVc2Ugc2VsZiBmb3JcbiAgICAgICAgLy8gbm9uLXdpbmRvd2VkIGNvbnRleHRzLlxuICAgICAgICB2YXIgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHNlbGY7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBgd2luZG93YCBvYmplY3QsIHNhdmUgdGhlIHByZXZpb3VzIFEgZ2xvYmFsXG4gICAgICAgIC8vIGFuZCBpbml0aWFsaXplIFEgYXMgYSBnbG9iYWwuXG4gICAgICAgIHZhciBwcmV2aW91c1EgPSBnbG9iYWwuUTtcbiAgICAgICAgZ2xvYmFsLlEgPSBkZWZpbml0aW9uKCk7XG5cbiAgICAgICAgLy8gQWRkIGEgbm9Db25mbGljdCBmdW5jdGlvbiBzbyBRIGNhbiBiZSByZW1vdmVkIGZyb20gdGhlXG4gICAgICAgIC8vIGdsb2JhbCBuYW1lc3BhY2UuXG4gICAgICAgIGdsb2JhbC5RLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBnbG9iYWwuUSA9IHByZXZpb3VzUTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBlbnZpcm9ubWVudCB3YXMgbm90IGFudGljaXBhdGVkIGJ5IFEuIFBsZWFzZSBmaWxlIGEgYnVnLlwiKTtcbiAgICB9XG5cbn0pKGZ1bmN0aW9uICgpIHtcblwidXNlIHN0cmljdFwiO1xuXG52YXIgaGFzU3RhY2tzID0gZmFsc2U7XG50cnkge1xuICAgIHRocm93IG5ldyBFcnJvcigpO1xufSBjYXRjaCAoZSkge1xuICAgIGhhc1N0YWNrcyA9ICEhZS5zdGFjaztcbn1cblxuLy8gQWxsIGNvZGUgYWZ0ZXIgdGhpcyBwb2ludCB3aWxsIGJlIGZpbHRlcmVkIGZyb20gc3RhY2sgdHJhY2VzIHJlcG9ydGVkXG4vLyBieSBRLlxudmFyIHFTdGFydGluZ0xpbmUgPSBjYXB0dXJlTGluZSgpO1xudmFyIHFGaWxlTmFtZTtcblxuLy8gc2hpbXNcblxuLy8gdXNlZCBmb3IgZmFsbGJhY2sgaW4gXCJhbGxSZXNvbHZlZFwiXG52YXIgbm9vcCA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vLyBVc2UgdGhlIGZhc3Rlc3QgcG9zc2libGUgbWVhbnMgdG8gZXhlY3V0ZSBhIHRhc2sgaW4gYSBmdXR1cmUgdHVyblxuLy8gb2YgdGhlIGV2ZW50IGxvb3AuXG52YXIgbmV4dFRpY2sgPShmdW5jdGlvbiAoKSB7XG4gICAgLy8gbGlua2VkIGxpc3Qgb2YgdGFza3MgKHNpbmdsZSwgd2l0aCBoZWFkIG5vZGUpXG4gICAgdmFyIGhlYWQgPSB7dGFzazogdm9pZCAwLCBuZXh0OiBudWxsfTtcbiAgICB2YXIgdGFpbCA9IGhlYWQ7XG4gICAgdmFyIGZsdXNoaW5nID0gZmFsc2U7XG4gICAgdmFyIHJlcXVlc3RUaWNrID0gdm9pZCAwO1xuICAgIHZhciBpc05vZGVKUyA9IGZhbHNlO1xuICAgIC8vIHF1ZXVlIGZvciBsYXRlIHRhc2tzLCB1c2VkIGJ5IHVuaGFuZGxlZCByZWplY3Rpb24gdHJhY2tpbmdcbiAgICB2YXIgbGF0ZXJRdWV1ZSA9IFtdO1xuXG4gICAgZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgICAgIC8qIGpzaGludCBsb29wZnVuYzogdHJ1ZSAqL1xuICAgICAgICB2YXIgdGFzaywgZG9tYWluO1xuXG4gICAgICAgIHdoaWxlIChoZWFkLm5leHQpIHtcbiAgICAgICAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XG4gICAgICAgICAgICB0YXNrID0gaGVhZC50YXNrO1xuICAgICAgICAgICAgaGVhZC50YXNrID0gdm9pZCAwO1xuICAgICAgICAgICAgZG9tYWluID0gaGVhZC5kb21haW47XG5cbiAgICAgICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgICAgICBoZWFkLmRvbWFpbiA9IHZvaWQgMDtcbiAgICAgICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJ1blNpbmdsZSh0YXNrLCBkb21haW4pO1xuXG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKGxhdGVyUXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICB0YXNrID0gbGF0ZXJRdWV1ZS5wb3AoKTtcbiAgICAgICAgICAgIHJ1blNpbmdsZSh0YXNrKTtcbiAgICAgICAgfVxuICAgICAgICBmbHVzaGluZyA9IGZhbHNlO1xuICAgIH1cbiAgICAvLyBydW5zIGEgc2luZ2xlIGZ1bmN0aW9uIGluIHRoZSBhc3luYyBxdWV1ZVxuICAgIGZ1bmN0aW9uIHJ1blNpbmdsZSh0YXNrLCBkb21haW4pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRhc2soKTtcblxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSlMpIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBub2RlLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBjb25zaWRlcmVkIGZhdGFsIGVycm9ycy5cbiAgICAgICAgICAgICAgICAvLyBSZS10aHJvdyB0aGVtIHN5bmNocm9ub3VzbHkgdG8gaW50ZXJydXB0IGZsdXNoaW5nIVxuXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNvbnRpbnVhdGlvbiBpZiB0aGUgdW5jYXVnaHQgZXhjZXB0aW9uIGlzIHN1cHByZXNzZWRcbiAgICAgICAgICAgICAgICAvLyBsaXN0ZW5pbmcgXCJ1bmNhdWdodEV4Y2VwdGlvblwiIGV2ZW50cyAoYXMgZG9tYWlucyBkb2VzKS5cbiAgICAgICAgICAgICAgICAvLyBDb250aW51ZSBpbiBuZXh0IGV2ZW50IHRvIGF2b2lkIHRpY2sgcmVjdXJzaW9uLlxuICAgICAgICAgICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XG4gICAgICAgICAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEluIGJyb3dzZXJzLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBub3QgZmF0YWwuXG4gICAgICAgICAgICAgICAgLy8gUmUtdGhyb3cgdGhlbSBhc3luY2hyb25vdXNseSB0byBhdm9pZCBzbG93LWRvd25zLlxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5leHRUaWNrID0gZnVuY3Rpb24gKHRhc2spIHtcbiAgICAgICAgdGFpbCA9IHRhaWwubmV4dCA9IHtcbiAgICAgICAgICAgIHRhc2s6IHRhc2ssXG4gICAgICAgICAgICBkb21haW46IGlzTm9kZUpTICYmIHByb2Nlc3MuZG9tYWluLFxuICAgICAgICAgICAgbmV4dDogbnVsbFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghZmx1c2hpbmcpIHtcbiAgICAgICAgICAgIGZsdXNoaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmXG4gICAgICAgIHByb2Nlc3MudG9TdHJpbmcoKSA9PT0gXCJbb2JqZWN0IHByb2Nlc3NdXCIgJiYgcHJvY2Vzcy5uZXh0VGljaykge1xuICAgICAgICAvLyBFbnN1cmUgUSBpcyBpbiBhIHJlYWwgTm9kZSBlbnZpcm9ubWVudCwgd2l0aCBhIGBwcm9jZXNzLm5leHRUaWNrYC5cbiAgICAgICAgLy8gVG8gc2VlIHRocm91Z2ggZmFrZSBOb2RlIGVudmlyb25tZW50czpcbiAgICAgICAgLy8gKiBNb2NoYSB0ZXN0IHJ1bm5lciAtIGV4cG9zZXMgYSBgcHJvY2Vzc2AgZ2xvYmFsIHdpdGhvdXQgYSBgbmV4dFRpY2tgXG4gICAgICAgIC8vICogQnJvd3NlcmlmeSAtIGV4cG9zZXMgYSBgcHJvY2Vzcy5uZXhUaWNrYCBmdW5jdGlvbiB0aGF0IHVzZXNcbiAgICAgICAgLy8gICBgc2V0VGltZW91dGAuIEluIHRoaXMgY2FzZSBgc2V0SW1tZWRpYXRlYCBpcyBwcmVmZXJyZWQgYmVjYXVzZVxuICAgICAgICAvLyAgICBpdCBpcyBmYXN0ZXIuIEJyb3dzZXJpZnkncyBgcHJvY2Vzcy50b1N0cmluZygpYCB5aWVsZHNcbiAgICAgICAgLy8gICBcIltvYmplY3QgT2JqZWN0XVwiLCB3aGlsZSBpbiBhIHJlYWwgTm9kZSBlbnZpcm9ubWVudFxuICAgICAgICAvLyAgIGBwcm9jZXNzLm5leHRUaWNrKClgIHlpZWxkcyBcIltvYmplY3QgcHJvY2Vzc11cIi5cbiAgICAgICAgaXNOb2RlSlMgPSB0cnVlO1xuXG4gICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gICAgICAgIH07XG5cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAvLyBJbiBJRTEwLCBOb2RlLmpzIDAuOSssIG9yIGh0dHBzOi8vZ2l0aHViLmNvbS9Ob2JsZUpTL3NldEltbWVkaWF0ZVxuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgcmVxdWVzdFRpY2sgPSBzZXRJbW1lZGlhdGUuYmluZCh3aW5kb3csIGZsdXNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShmbHVzaCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBtb2Rlcm4gYnJvd3NlcnNcbiAgICAgICAgLy8gaHR0cDovL3d3dy5ub25ibG9ja2luZy5pby8yMDExLzA2L3dpbmRvd25leHR0aWNrLmh0bWxcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgLy8gQXQgbGVhc3QgU2FmYXJpIFZlcnNpb24gNi4wLjUgKDg1MzYuMzAuMSkgaW50ZXJtaXR0ZW50bHkgY2Fubm90IGNyZWF0ZVxuICAgICAgICAvLyB3b3JraW5nIG1lc3NhZ2UgcG9ydHMgdGhlIGZpcnN0IHRpbWUgYSBwYWdlIGxvYWRzLlxuICAgICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrID0gcmVxdWVzdFBvcnRUaWNrO1xuICAgICAgICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgICAgICAgICAgIGZsdXNoKCk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciByZXF1ZXN0UG9ydFRpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBPcGVyYSByZXF1aXJlcyB1cyB0byBwcm92aWRlIGEgbWVzc2FnZSBwYXlsb2FkLCByZWdhcmRsZXNzIG9mXG4gICAgICAgICAgICAvLyB3aGV0aGVyIHdlIHVzZSBpdC5cbiAgICAgICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XG4gICAgICAgICAgICByZXF1ZXN0UG9ydFRpY2soKTtcbiAgICAgICAgfTtcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG9sZCBicm93c2Vyc1xuICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvLyBydW5zIGEgdGFzayBhZnRlciBhbGwgb3RoZXIgdGFza3MgaGF2ZSBiZWVuIHJ1blxuICAgIC8vIHRoaXMgaXMgdXNlZnVsIGZvciB1bmhhbmRsZWQgcmVqZWN0aW9uIHRyYWNraW5nIHRoYXQgbmVlZHMgdG8gaGFwcGVuXG4gICAgLy8gYWZ0ZXIgYWxsIGB0aGVuYGQgdGFza3MgaGF2ZSBiZWVuIHJ1bi5cbiAgICBuZXh0VGljay5ydW5BZnRlciA9IGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgIGxhdGVyUXVldWUucHVzaCh0YXNrKTtcbiAgICAgICAgaWYgKCFmbHVzaGluZykge1xuICAgICAgICAgICAgZmx1c2hpbmcgPSB0cnVlO1xuICAgICAgICAgICAgcmVxdWVzdFRpY2soKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIG5leHRUaWNrO1xufSkoKTtcblxuLy8gQXR0ZW1wdCB0byBtYWtlIGdlbmVyaWNzIHNhZmUgaW4gdGhlIGZhY2Ugb2YgZG93bnN0cmVhbVxuLy8gbW9kaWZpY2F0aW9ucy5cbi8vIFRoZXJlIGlzIG5vIHNpdHVhdGlvbiB3aGVyZSB0aGlzIGlzIG5lY2Vzc2FyeS5cbi8vIElmIHlvdSBuZWVkIGEgc2VjdXJpdHkgZ3VhcmFudGVlLCB0aGVzZSBwcmltb3JkaWFscyBuZWVkIHRvIGJlXG4vLyBkZWVwbHkgZnJvemVuIGFueXdheSwgYW5kIGlmIHlvdSBkb27igJl0IG5lZWQgYSBzZWN1cml0eSBndWFyYW50ZWUsXG4vLyB0aGlzIGlzIGp1c3QgcGxhaW4gcGFyYW5vaWQuXG4vLyBIb3dldmVyLCB0aGlzICoqbWlnaHQqKiBoYXZlIHRoZSBuaWNlIHNpZGUtZWZmZWN0IG9mIHJlZHVjaW5nIHRoZSBzaXplIG9mXG4vLyB0aGUgbWluaWZpZWQgY29kZSBieSByZWR1Y2luZyB4LmNhbGwoKSB0byBtZXJlbHkgeCgpXG4vLyBTZWUgTWFyayBNaWxsZXLigJlzIGV4cGxhbmF0aW9uIG9mIHdoYXQgdGhpcyBkb2VzLlxuLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9Y29udmVudGlvbnM6c2FmZV9tZXRhX3Byb2dyYW1taW5nXG52YXIgY2FsbCA9IEZ1bmN0aW9uLmNhbGw7XG5mdW5jdGlvbiB1bmN1cnJ5VGhpcyhmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGNhbGwuYXBwbHkoZiwgYXJndW1lbnRzKTtcbiAgICB9O1xufVxuLy8gVGhpcyBpcyBlcXVpdmFsZW50LCBidXQgc2xvd2VyOlxuLy8gdW5jdXJyeVRoaXMgPSBGdW5jdGlvbl9iaW5kLmJpbmQoRnVuY3Rpb25fYmluZC5jYWxsKTtcbi8vIGh0dHA6Ly9qc3BlcmYuY29tL3VuY3Vycnl0aGlzXG5cbnZhciBhcnJheV9zbGljZSA9IHVuY3VycnlUaGlzKEFycmF5LnByb3RvdHlwZS5zbGljZSk7XG5cbnZhciBhcnJheV9yZWR1Y2UgPSB1bmN1cnJ5VGhpcyhcbiAgICBBcnJheS5wcm90b3R5cGUucmVkdWNlIHx8IGZ1bmN0aW9uIChjYWxsYmFjaywgYmFzaXMpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gMCxcbiAgICAgICAgICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoO1xuICAgICAgICAvLyBjb25jZXJuaW5nIHRoZSBpbml0aWFsIHZhbHVlLCBpZiBvbmUgaXMgbm90IHByb3ZpZGVkXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAvLyBzZWVrIHRvIHRoZSBmaXJzdCB2YWx1ZSBpbiB0aGUgYXJyYXksIGFjY291bnRpbmdcbiAgICAgICAgICAgIC8vIGZvciB0aGUgcG9zc2liaWxpdHkgdGhhdCBpcyBpcyBhIHNwYXJzZSBhcnJheVxuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCBpbiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2lzID0gdGhpc1tpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgrK2luZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSB3aGlsZSAoMSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmVkdWNlXG4gICAgICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgLy8gYWNjb3VudCBmb3IgdGhlIHBvc3NpYmlsaXR5IHRoYXQgdGhlIGFycmF5IGlzIHNwYXJzZVxuICAgICAgICAgICAgaWYgKGluZGV4IGluIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBiYXNpcyA9IGNhbGxiYWNrKGJhc2lzLCB0aGlzW2luZGV4XSwgaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBiYXNpcztcbiAgICB9XG4pO1xuXG52YXIgYXJyYXlfaW5kZXhPZiA9IHVuY3VycnlUaGlzKFxuICAgIEFycmF5LnByb3RvdHlwZS5pbmRleE9mIHx8IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBub3QgYSB2ZXJ5IGdvb2Qgc2hpbSwgYnV0IGdvb2QgZW5vdWdoIGZvciBvdXIgb25lIHVzZSBvZiBpdFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzW2ldID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG4pO1xuXG52YXIgYXJyYXlfbWFwID0gdW5jdXJyeVRoaXMoXG4gICAgQXJyYXkucHJvdG90eXBlLm1hcCB8fCBmdW5jdGlvbiAoY2FsbGJhY2ssIHRoaXNwKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGNvbGxlY3QgPSBbXTtcbiAgICAgICAgYXJyYXlfcmVkdWNlKHNlbGYsIGZ1bmN0aW9uICh1bmRlZmluZWQsIHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgY29sbGVjdC5wdXNoKGNhbGxiYWNrLmNhbGwodGhpc3AsIHZhbHVlLCBpbmRleCwgc2VsZikpO1xuICAgICAgICB9LCB2b2lkIDApO1xuICAgICAgICByZXR1cm4gY29sbGVjdDtcbiAgICB9XG4pO1xuXG52YXIgb2JqZWN0X2NyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKHByb3RvdHlwZSkge1xuICAgIGZ1bmN0aW9uIFR5cGUoKSB7IH1cbiAgICBUeXBlLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICByZXR1cm4gbmV3IFR5cGUoKTtcbn07XG5cbnZhciBvYmplY3RfaGFzT3duUHJvcGVydHkgPSB1bmN1cnJ5VGhpcyhPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KTtcblxudmFyIG9iamVjdF9rZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgICAgICBpZiAob2JqZWN0X2hhc093blByb3BlcnR5KG9iamVjdCwga2V5KSkge1xuICAgICAgICAgICAga2V5cy5wdXNoKGtleSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGtleXM7XG59O1xuXG52YXIgb2JqZWN0X3RvU3RyaW5nID0gdW5jdXJyeVRoaXMoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyk7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID09PSBPYmplY3QodmFsdWUpO1xufVxuXG4vLyBnZW5lcmF0b3IgcmVsYXRlZCBzaGltc1xuXG4vLyBGSVhNRTogUmVtb3ZlIHRoaXMgZnVuY3Rpb24gb25jZSBFUzYgZ2VuZXJhdG9ycyBhcmUgaW4gU3BpZGVyTW9ua2V5LlxuZnVuY3Rpb24gaXNTdG9wSXRlcmF0aW9uKGV4Y2VwdGlvbikge1xuICAgIHJldHVybiAoXG4gICAgICAgIG9iamVjdF90b1N0cmluZyhleGNlcHRpb24pID09PSBcIltvYmplY3QgU3RvcEl0ZXJhdGlvbl1cIiB8fFxuICAgICAgICBleGNlcHRpb24gaW5zdGFuY2VvZiBRUmV0dXJuVmFsdWVcbiAgICApO1xufVxuXG4vLyBGSVhNRTogUmVtb3ZlIHRoaXMgaGVscGVyIGFuZCBRLnJldHVybiBvbmNlIEVTNiBnZW5lcmF0b3JzIGFyZSBpblxuLy8gU3BpZGVyTW9ua2V5LlxudmFyIFFSZXR1cm5WYWx1ZTtcbmlmICh0eXBlb2YgUmV0dXJuVmFsdWUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBRUmV0dXJuVmFsdWUgPSBSZXR1cm5WYWx1ZTtcbn0gZWxzZSB7XG4gICAgUVJldHVyblZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB9O1xufVxuXG4vLyBsb25nIHN0YWNrIHRyYWNlc1xuXG52YXIgU1RBQ0tfSlVNUF9TRVBBUkFUT1IgPSBcIkZyb20gcHJldmlvdXMgZXZlbnQ6XCI7XG5cbmZ1bmN0aW9uIG1ha2VTdGFja1RyYWNlTG9uZyhlcnJvciwgcHJvbWlzZSkge1xuICAgIC8vIElmIHBvc3NpYmxlLCB0cmFuc2Zvcm0gdGhlIGVycm9yIHN0YWNrIHRyYWNlIGJ5IHJlbW92aW5nIE5vZGUgYW5kIFFcbiAgICAvLyBjcnVmdCwgdGhlbiBjb25jYXRlbmF0aW5nIHdpdGggdGhlIHN0YWNrIHRyYWNlIG9mIGBwcm9taXNlYC4gU2VlICM1Ny5cbiAgICBpZiAoaGFzU3RhY2tzICYmXG4gICAgICAgIHByb21pc2Uuc3RhY2sgJiZcbiAgICAgICAgdHlwZW9mIGVycm9yID09PSBcIm9iamVjdFwiICYmXG4gICAgICAgIGVycm9yICE9PSBudWxsICYmXG4gICAgICAgIGVycm9yLnN0YWNrICYmXG4gICAgICAgIGVycm9yLnN0YWNrLmluZGV4T2YoU1RBQ0tfSlVNUF9TRVBBUkFUT1IpID09PSAtMVxuICAgICkge1xuICAgICAgICB2YXIgc3RhY2tzID0gW107XG4gICAgICAgIGZvciAodmFyIHAgPSBwcm9taXNlOyAhIXA7IHAgPSBwLnNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKHAuc3RhY2spIHtcbiAgICAgICAgICAgICAgICBzdGFja3MudW5zaGlmdChwLnN0YWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdGFja3MudW5zaGlmdChlcnJvci5zdGFjayk7XG5cbiAgICAgICAgdmFyIGNvbmNhdGVkU3RhY2tzID0gc3RhY2tzLmpvaW4oXCJcXG5cIiArIFNUQUNLX0pVTVBfU0VQQVJBVE9SICsgXCJcXG5cIik7XG4gICAgICAgIGVycm9yLnN0YWNrID0gZmlsdGVyU3RhY2tTdHJpbmcoY29uY2F0ZWRTdGFja3MpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZmlsdGVyU3RhY2tTdHJpbmcoc3RhY2tTdHJpbmcpIHtcbiAgICB2YXIgbGluZXMgPSBzdGFja1N0cmluZy5zcGxpdChcIlxcblwiKTtcbiAgICB2YXIgZGVzaXJlZExpbmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgbGluZSA9IGxpbmVzW2ldO1xuXG4gICAgICAgIGlmICghaXNJbnRlcm5hbEZyYW1lKGxpbmUpICYmICFpc05vZGVGcmFtZShsaW5lKSAmJiBsaW5lKSB7XG4gICAgICAgICAgICBkZXNpcmVkTGluZXMucHVzaChsaW5lKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVzaXJlZExpbmVzLmpvaW4oXCJcXG5cIik7XG59XG5cbmZ1bmN0aW9uIGlzTm9kZUZyYW1lKHN0YWNrTGluZSkge1xuICAgIHJldHVybiBzdGFja0xpbmUuaW5kZXhPZihcIihtb2R1bGUuanM6XCIpICE9PSAtMSB8fFxuICAgICAgICAgICBzdGFja0xpbmUuaW5kZXhPZihcIihub2RlLmpzOlwiKSAhPT0gLTE7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihzdGFja0xpbmUpIHtcbiAgICAvLyBOYW1lZCBmdW5jdGlvbnM6IFwiYXQgZnVuY3Rpb25OYW1lIChmaWxlbmFtZTpsaW5lTnVtYmVyOmNvbHVtbk51bWJlcilcIlxuICAgIC8vIEluIElFMTAgZnVuY3Rpb24gbmFtZSBjYW4gaGF2ZSBzcGFjZXMgKFwiQW5vbnltb3VzIGZ1bmN0aW9uXCIpIE9fb1xuICAgIHZhciBhdHRlbXB0MSA9IC9hdCAuKyBcXCgoLispOihcXGQrKTooPzpcXGQrKVxcKSQvLmV4ZWMoc3RhY2tMaW5lKTtcbiAgICBpZiAoYXR0ZW1wdDEpIHtcbiAgICAgICAgcmV0dXJuIFthdHRlbXB0MVsxXSwgTnVtYmVyKGF0dGVtcHQxWzJdKV07XG4gICAgfVxuXG4gICAgLy8gQW5vbnltb3VzIGZ1bmN0aW9uczogXCJhdCBmaWxlbmFtZTpsaW5lTnVtYmVyOmNvbHVtbk51bWJlclwiXG4gICAgdmFyIGF0dGVtcHQyID0gL2F0IChbXiBdKyk6KFxcZCspOig/OlxcZCspJC8uZXhlYyhzdGFja0xpbmUpO1xuICAgIGlmIChhdHRlbXB0Mikge1xuICAgICAgICByZXR1cm4gW2F0dGVtcHQyWzFdLCBOdW1iZXIoYXR0ZW1wdDJbMl0pXTtcbiAgICB9XG5cbiAgICAvLyBGaXJlZm94IHN0eWxlOiBcImZ1bmN0aW9uQGZpbGVuYW1lOmxpbmVOdW1iZXIgb3IgQGZpbGVuYW1lOmxpbmVOdW1iZXJcIlxuICAgIHZhciBhdHRlbXB0MyA9IC8uKkAoLispOihcXGQrKSQvLmV4ZWMoc3RhY2tMaW5lKTtcbiAgICBpZiAoYXR0ZW1wdDMpIHtcbiAgICAgICAgcmV0dXJuIFthdHRlbXB0M1sxXSwgTnVtYmVyKGF0dGVtcHQzWzJdKV07XG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc0ludGVybmFsRnJhbWUoc3RhY2tMaW5lKSB7XG4gICAgdmFyIGZpbGVOYW1lQW5kTGluZU51bWJlciA9IGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihzdGFja0xpbmUpO1xuXG4gICAgaWYgKCFmaWxlTmFtZUFuZExpbmVOdW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBmaWxlTmFtZSA9IGZpbGVOYW1lQW5kTGluZU51bWJlclswXTtcbiAgICB2YXIgbGluZU51bWJlciA9IGZpbGVOYW1lQW5kTGluZU51bWJlclsxXTtcblxuICAgIHJldHVybiBmaWxlTmFtZSA9PT0gcUZpbGVOYW1lICYmXG4gICAgICAgIGxpbmVOdW1iZXIgPj0gcVN0YXJ0aW5nTGluZSAmJlxuICAgICAgICBsaW5lTnVtYmVyIDw9IHFFbmRpbmdMaW5lO1xufVxuXG4vLyBkaXNjb3ZlciBvd24gZmlsZSBuYW1lIGFuZCBsaW5lIG51bWJlciByYW5nZSBmb3IgZmlsdGVyaW5nIHN0YWNrXG4vLyB0cmFjZXNcbmZ1bmN0aW9uIGNhcHR1cmVMaW5lKCkge1xuICAgIGlmICghaGFzU3RhY2tzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHZhciBsaW5lcyA9IGUuc3RhY2suc3BsaXQoXCJcXG5cIik7XG4gICAgICAgIHZhciBmaXJzdExpbmUgPSBsaW5lc1swXS5pbmRleE9mKFwiQFwiKSA+IDAgPyBsaW5lc1sxXSA6IGxpbmVzWzJdO1xuICAgICAgICB2YXIgZmlsZU5hbWVBbmRMaW5lTnVtYmVyID0gZ2V0RmlsZU5hbWVBbmRMaW5lTnVtYmVyKGZpcnN0TGluZSk7XG4gICAgICAgIGlmICghZmlsZU5hbWVBbmRMaW5lTnVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBxRmlsZU5hbWUgPSBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMF07XG4gICAgICAgIHJldHVybiBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMV07XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkZXByZWNhdGUoY2FsbGJhY2ssIG5hbWUsIGFsdGVybmF0aXZlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAgICAgICB0eXBlb2YgY29uc29sZS53YXJuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihuYW1lICsgXCIgaXMgZGVwcmVjYXRlZCwgdXNlIFwiICsgYWx0ZXJuYXRpdmUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgIFwiIGluc3RlYWQuXCIsIG5ldyBFcnJvcihcIlwiKS5zdGFjayk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KGNhbGxiYWNrLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG5cbi8vIGVuZCBvZiBzaGltc1xuLy8gYmVnaW5uaW5nIG9mIHJlYWwgd29ya1xuXG4vKipcbiAqIENvbnN0cnVjdHMgYSBwcm9taXNlIGZvciBhbiBpbW1lZGlhdGUgcmVmZXJlbmNlLCBwYXNzZXMgcHJvbWlzZXMgdGhyb3VnaCwgb3JcbiAqIGNvZXJjZXMgcHJvbWlzZXMgZnJvbSBkaWZmZXJlbnQgc3lzdGVtcy5cbiAqIEBwYXJhbSB2YWx1ZSBpbW1lZGlhdGUgcmVmZXJlbmNlIG9yIHByb21pc2VcbiAqL1xuZnVuY3Rpb24gUSh2YWx1ZSkge1xuICAgIC8vIElmIHRoZSBvYmplY3QgaXMgYWxyZWFkeSBhIFByb21pc2UsIHJldHVybiBpdCBkaXJlY3RseS4gIFRoaXMgZW5hYmxlc1xuICAgIC8vIHRoZSByZXNvbHZlIGZ1bmN0aW9uIHRvIGJvdGggYmUgdXNlZCB0byBjcmVhdGVkIHJlZmVyZW5jZXMgZnJvbSBvYmplY3RzLFxuICAgIC8vIGJ1dCB0byB0b2xlcmFibHkgY29lcmNlIG5vbi1wcm9taXNlcyB0byBwcm9taXNlcy5cbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBhc3NpbWlsYXRlIHRoZW5hYmxlc1xuICAgIGlmIChpc1Byb21pc2VBbGlrZSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIGNvZXJjZSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZ1bGZpbGwodmFsdWUpO1xuICAgIH1cbn1cblEucmVzb2x2ZSA9IFE7XG5cbi8qKlxuICogUGVyZm9ybXMgYSB0YXNrIGluIGEgZnV0dXJlIHR1cm4gb2YgdGhlIGV2ZW50IGxvb3AuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0YXNrXG4gKi9cblEubmV4dFRpY2sgPSBuZXh0VGljaztcblxuLyoqXG4gKiBDb250cm9scyB3aGV0aGVyIG9yIG5vdCBsb25nIHN0YWNrIHRyYWNlcyB3aWxsIGJlIG9uXG4gKi9cblEubG9uZ1N0YWNrU3VwcG9ydCA9IGZhbHNlO1xuXG4vLyBlbmFibGUgbG9uZyBzdGFja3MgaWYgUV9ERUJVRyBpcyBzZXRcbmlmICh0eXBlb2YgcHJvY2VzcyA9PT0gXCJvYmplY3RcIiAmJiBwcm9jZXNzICYmIHByb2Nlc3MuZW52ICYmIHByb2Nlc3MuZW52LlFfREVCVUcpIHtcbiAgICBRLmxvbmdTdGFja1N1cHBvcnQgPSB0cnVlO1xufVxuXG4vKipcbiAqIENvbnN0cnVjdHMgYSB7cHJvbWlzZSwgcmVzb2x2ZSwgcmVqZWN0fSBvYmplY3QuXG4gKlxuICogYHJlc29sdmVgIGlzIGEgY2FsbGJhY2sgdG8gaW52b2tlIHdpdGggYSBtb3JlIHJlc29sdmVkIHZhbHVlIGZvciB0aGVcbiAqIHByb21pc2UuIFRvIGZ1bGZpbGwgdGhlIHByb21pc2UsIGludm9rZSBgcmVzb2x2ZWAgd2l0aCBhbnkgdmFsdWUgdGhhdCBpc1xuICogbm90IGEgdGhlbmFibGUuIFRvIHJlamVjdCB0aGUgcHJvbWlzZSwgaW52b2tlIGByZXNvbHZlYCB3aXRoIGEgcmVqZWN0ZWRcbiAqIHRoZW5hYmxlLCBvciBpbnZva2UgYHJlamVjdGAgd2l0aCB0aGUgcmVhc29uIGRpcmVjdGx5LiBUbyByZXNvbHZlIHRoZVxuICogcHJvbWlzZSB0byBhbm90aGVyIHRoZW5hYmxlLCB0aHVzIHB1dHRpbmcgaXQgaW4gdGhlIHNhbWUgc3RhdGUsIGludm9rZVxuICogYHJlc29sdmVgIHdpdGggdGhhdCBvdGhlciB0aGVuYWJsZS5cbiAqL1xuUS5kZWZlciA9IGRlZmVyO1xuZnVuY3Rpb24gZGVmZXIoKSB7XG4gICAgLy8gaWYgXCJtZXNzYWdlc1wiIGlzIGFuIFwiQXJyYXlcIiwgdGhhdCBpbmRpY2F0ZXMgdGhhdCB0aGUgcHJvbWlzZSBoYXMgbm90IHlldFxuICAgIC8vIGJlZW4gcmVzb2x2ZWQuICBJZiBpdCBpcyBcInVuZGVmaW5lZFwiLCBpdCBoYXMgYmVlbiByZXNvbHZlZC4gIEVhY2hcbiAgICAvLyBlbGVtZW50IG9mIHRoZSBtZXNzYWdlcyBhcnJheSBpcyBpdHNlbGYgYW4gYXJyYXkgb2YgY29tcGxldGUgYXJndW1lbnRzIHRvXG4gICAgLy8gZm9yd2FyZCB0byB0aGUgcmVzb2x2ZWQgcHJvbWlzZS4gIFdlIGNvZXJjZSB0aGUgcmVzb2x1dGlvbiB2YWx1ZSB0byBhXG4gICAgLy8gcHJvbWlzZSB1c2luZyB0aGUgYHJlc29sdmVgIGZ1bmN0aW9uIGJlY2F1c2UgaXQgaGFuZGxlcyBib3RoIGZ1bGx5XG4gICAgLy8gbm9uLXRoZW5hYmxlIHZhbHVlcyBhbmQgb3RoZXIgdGhlbmFibGVzIGdyYWNlZnVsbHkuXG4gICAgdmFyIG1lc3NhZ2VzID0gW10sIHByb2dyZXNzTGlzdGVuZXJzID0gW10sIHJlc29sdmVkUHJvbWlzZTtcblxuICAgIHZhciBkZWZlcnJlZCA9IG9iamVjdF9jcmVhdGUoZGVmZXIucHJvdG90eXBlKTtcbiAgICB2YXIgcHJvbWlzZSA9IG9iamVjdF9jcmVhdGUoUHJvbWlzZS5wcm90b3R5cGUpO1xuXG4gICAgcHJvbWlzZS5wcm9taXNlRGlzcGF0Y2ggPSBmdW5jdGlvbiAocmVzb2x2ZSwgb3AsIG9wZXJhbmRzKSB7XG4gICAgICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBtZXNzYWdlcy5wdXNoKGFyZ3MpO1xuICAgICAgICAgICAgaWYgKG9wID09PSBcIndoZW5cIiAmJiBvcGVyYW5kc1sxXSkgeyAvLyBwcm9ncmVzcyBvcGVyYW5kXG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3NMaXN0ZW5lcnMucHVzaChvcGVyYW5kc1sxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBRLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlZFByb21pc2UucHJvbWlzZURpc3BhdGNoLmFwcGx5KHJlc29sdmVkUHJvbWlzZSwgYXJncyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBYWFggZGVwcmVjYXRlZFxuICAgIHByb21pc2UudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbmVhcmVyVmFsdWUgPSBuZWFyZXIocmVzb2x2ZWRQcm9taXNlKTtcbiAgICAgICAgaWYgKGlzUHJvbWlzZShuZWFyZXJWYWx1ZSkpIHtcbiAgICAgICAgICAgIHJlc29sdmVkUHJvbWlzZSA9IG5lYXJlclZhbHVlOyAvLyBzaG9ydGVuIGNoYWluXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5lYXJlclZhbHVlO1xuICAgIH07XG5cbiAgICBwcm9taXNlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghcmVzb2x2ZWRQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdGF0ZTogXCJwZW5kaW5nXCIgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzb2x2ZWRQcm9taXNlLmluc3BlY3QoKTtcbiAgICB9O1xuXG4gICAgaWYgKFEubG9uZ1N0YWNrU3VwcG9ydCAmJiBoYXNTdGFja3MpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBOT1RFOiBkb24ndCB0cnkgdG8gdXNlIGBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZWAgb3IgdHJhbnNmZXIgdGhlXG4gICAgICAgICAgICAvLyBhY2Nlc3NvciBhcm91bmQ7IHRoYXQgY2F1c2VzIG1lbW9yeSBsZWFrcyBhcyBwZXIgR0gtMTExLiBKdXN0XG4gICAgICAgICAgICAvLyByZWlmeSB0aGUgc3RhY2sgdHJhY2UgYXMgYSBzdHJpbmcgQVNBUC5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBBdCB0aGUgc2FtZSB0aW1lLCBjdXQgb2ZmIHRoZSBmaXJzdCBsaW5lOyBpdCdzIGFsd2F5cyBqdXN0XG4gICAgICAgICAgICAvLyBcIltvYmplY3QgUHJvbWlzZV1cXG5cIiwgYXMgcGVyIHRoZSBgdG9TdHJpbmdgLlxuICAgICAgICAgICAgcHJvbWlzZS5zdGFjayA9IGUuc3RhY2suc3Vic3RyaW5nKGUuc3RhY2suaW5kZXhPZihcIlxcblwiKSArIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTk9URTogd2UgZG8gdGhlIGNoZWNrcyBmb3IgYHJlc29sdmVkUHJvbWlzZWAgaW4gZWFjaCBtZXRob2QsIGluc3RlYWQgb2ZcbiAgICAvLyBjb25zb2xpZGF0aW5nIHRoZW0gaW50byBgYmVjb21lYCwgc2luY2Ugb3RoZXJ3aXNlIHdlJ2QgY3JlYXRlIG5ld1xuICAgIC8vIHByb21pc2VzIHdpdGggdGhlIGxpbmVzIGBiZWNvbWUod2hhdGV2ZXIodmFsdWUpKWAuIFNlZSBlLmcuIEdILTI1Mi5cblxuICAgIGZ1bmN0aW9uIGJlY29tZShuZXdQcm9taXNlKSB7XG4gICAgICAgIHJlc29sdmVkUHJvbWlzZSA9IG5ld1Byb21pc2U7XG4gICAgICAgIHByb21pc2Uuc291cmNlID0gbmV3UHJvbWlzZTtcblxuICAgICAgICBhcnJheV9yZWR1Y2UobWVzc2FnZXMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG5ld1Byb21pc2UucHJvbWlzZURpc3BhdGNoLmFwcGx5KG5ld1Byb21pc2UsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIHZvaWQgMCk7XG5cbiAgICAgICAgbWVzc2FnZXMgPSB2b2lkIDA7XG4gICAgICAgIHByb2dyZXNzTGlzdGVuZXJzID0gdm9pZCAwO1xuICAgIH1cblxuICAgIGRlZmVycmVkLnByb21pc2UgPSBwcm9taXNlO1xuICAgIGRlZmVycmVkLnJlc29sdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgYmVjb21lKFEodmFsdWUpKTtcbiAgICB9O1xuXG4gICAgZGVmZXJyZWQuZnVsZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAocmVzb2x2ZWRQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBiZWNvbWUoZnVsZmlsbCh2YWx1ZSkpO1xuICAgIH07XG4gICAgZGVmZXJyZWQucmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICBpZiAocmVzb2x2ZWRQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBiZWNvbWUocmVqZWN0KHJlYXNvbikpO1xuICAgIH07XG4gICAgZGVmZXJyZWQubm90aWZ5ID0gZnVuY3Rpb24gKHByb2dyZXNzKSB7XG4gICAgICAgIGlmIChyZXNvbHZlZFByb21pc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGFycmF5X3JlZHVjZShwcm9ncmVzc0xpc3RlbmVycywgZnVuY3Rpb24gKHVuZGVmaW5lZCwgcHJvZ3Jlc3NMaXN0ZW5lcikge1xuICAgICAgICAgICAgUS5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3NMaXN0ZW5lcihwcm9ncmVzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgdm9pZCAwKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBOb2RlLXN0eWxlIGNhbGxiYWNrIHRoYXQgd2lsbCByZXNvbHZlIG9yIHJlamVjdCB0aGUgZGVmZXJyZWRcbiAqIHByb21pc2UuXG4gKiBAcmV0dXJucyBhIG5vZGViYWNrXG4gKi9cbmRlZmVyLnByb3RvdHlwZS5tYWtlTm9kZVJlc29sdmVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24gKGVycm9yLCB2YWx1ZSkge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIHNlbGYucmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgc2VsZi5yZXNvbHZlKGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5yZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG4vKipcbiAqIEBwYXJhbSByZXNvbHZlciB7RnVuY3Rpb259IGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIG5vdGhpbmcgYW5kIGFjY2VwdHNcbiAqIHRoZSByZXNvbHZlLCByZWplY3QsIGFuZCBub3RpZnkgZnVuY3Rpb25zIGZvciBhIGRlZmVycmVkLlxuICogQHJldHVybnMgYSBwcm9taXNlIHRoYXQgbWF5IGJlIHJlc29sdmVkIHdpdGggdGhlIGdpdmVuIHJlc29sdmUgYW5kIHJlamVjdFxuICogZnVuY3Rpb25zLCBvciByZWplY3RlZCBieSBhIHRocm93biBleGNlcHRpb24gaW4gcmVzb2x2ZXJcbiAqL1xuUS5Qcm9taXNlID0gcHJvbWlzZTsgLy8gRVM2XG5RLnByb21pc2UgPSBwcm9taXNlO1xuZnVuY3Rpb24gcHJvbWlzZShyZXNvbHZlcikge1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZXIgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicmVzb2x2ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB0cnkge1xuICAgICAgICByZXNvbHZlcihkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QsIGRlZmVycmVkLm5vdGlmeSk7XG4gICAgfSBjYXRjaCAocmVhc29uKSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChyZWFzb24pO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbn1cblxucHJvbWlzZS5yYWNlID0gcmFjZTsgLy8gRVM2XG5wcm9taXNlLmFsbCA9IGFsbDsgLy8gRVM2XG5wcm9taXNlLnJlamVjdCA9IHJlamVjdDsgLy8gRVM2XG5wcm9taXNlLnJlc29sdmUgPSBROyAvLyBFUzZcblxuLy8gWFhYIGV4cGVyaW1lbnRhbC4gIFRoaXMgbWV0aG9kIGlzIGEgd2F5IHRvIGRlbm90ZSB0aGF0IGEgbG9jYWwgdmFsdWUgaXNcbi8vIHNlcmlhbGl6YWJsZSBhbmQgc2hvdWxkIGJlIGltbWVkaWF0ZWx5IGRpc3BhdGNoZWQgdG8gYSByZW1vdGUgdXBvbiByZXF1ZXN0LFxuLy8gaW5zdGVhZCBvZiBwYXNzaW5nIGEgcmVmZXJlbmNlLlxuUS5wYXNzQnlDb3B5ID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIC8vZnJlZXplKG9iamVjdCk7XG4gICAgLy9wYXNzQnlDb3BpZXMuc2V0KG9iamVjdCwgdHJ1ZSk7XG4gICAgcmV0dXJuIG9iamVjdDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnBhc3NCeUNvcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy9mcmVlemUob2JqZWN0KTtcbiAgICAvL3Bhc3NCeUNvcGllcy5zZXQob2JqZWN0LCB0cnVlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogSWYgdHdvIHByb21pc2VzIGV2ZW50dWFsbHkgZnVsZmlsbCB0byB0aGUgc2FtZSB2YWx1ZSwgcHJvbWlzZXMgdGhhdCB2YWx1ZSxcbiAqIGJ1dCBvdGhlcndpc2UgcmVqZWN0cy5cbiAqIEBwYXJhbSB4IHtBbnkqfVxuICogQHBhcmFtIHkge0FueSp9XG4gKiBAcmV0dXJucyB7QW55Kn0gYSBwcm9taXNlIGZvciB4IGFuZCB5IGlmIHRoZXkgYXJlIHRoZSBzYW1lLCBidXQgYSByZWplY3Rpb25cbiAqIG90aGVyd2lzZS5cbiAqXG4gKi9cblEuam9pbiA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgcmV0dXJuIFEoeCkuam9pbih5KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmpvaW4gPSBmdW5jdGlvbiAodGhhdCkge1xuICAgIHJldHVybiBRKFt0aGlzLCB0aGF0XSkuc3ByZWFkKGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIGlmICh4ID09PSB5KSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBcIj09PVwiIHNob3VsZCBiZSBPYmplY3QuaXMgb3IgZXF1aXZcbiAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3Qgam9pbjogbm90IHRoZSBzYW1lOiBcIiArIHggKyBcIiBcIiArIHkpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgZmlyc3Qgb2YgYW4gYXJyYXkgb2YgcHJvbWlzZXMgdG8gYmVjb21lIHNldHRsZWQuXG4gKiBAcGFyYW0gYW5zd2VycyB7QXJyYXlbQW55Kl19IHByb21pc2VzIHRvIHJhY2VcbiAqIEByZXR1cm5zIHtBbnkqfSB0aGUgZmlyc3QgcHJvbWlzZSB0byBiZSBzZXR0bGVkXG4gKi9cblEucmFjZSA9IHJhY2U7XG5mdW5jdGlvbiByYWNlKGFuc3dlclBzKSB7XG4gICAgcmV0dXJuIHByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAvLyBTd2l0Y2ggdG8gdGhpcyBvbmNlIHdlIGNhbiBhc3N1bWUgYXQgbGVhc3QgRVM1XG4gICAgICAgIC8vIGFuc3dlclBzLmZvckVhY2goZnVuY3Rpb24gKGFuc3dlclApIHtcbiAgICAgICAgLy8gICAgIFEoYW5zd2VyUCkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgLy8gVXNlIHRoaXMgaW4gdGhlIG1lYW50aW1lXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhbnN3ZXJQcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgUShhbnN3ZXJQc1tpXSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblByb21pc2UucHJvdG90eXBlLnJhY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbihRLnJhY2UpO1xufTtcblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgUHJvbWlzZSB3aXRoIGEgcHJvbWlzZSBkZXNjcmlwdG9yIG9iamVjdCBhbmQgb3B0aW9uYWwgZmFsbGJhY2tcbiAqIGZ1bmN0aW9uLiAgVGhlIGRlc2NyaXB0b3IgY29udGFpbnMgbWV0aG9kcyBsaWtlIHdoZW4ocmVqZWN0ZWQpLCBnZXQobmFtZSksXG4gKiBzZXQobmFtZSwgdmFsdWUpLCBwb3N0KG5hbWUsIGFyZ3MpLCBhbmQgZGVsZXRlKG5hbWUpLCB3aGljaCBhbGxcbiAqIHJldHVybiBlaXRoZXIgYSB2YWx1ZSwgYSBwcm9taXNlIGZvciBhIHZhbHVlLCBvciBhIHJlamVjdGlvbi4gIFRoZSBmYWxsYmFja1xuICogYWNjZXB0cyB0aGUgb3BlcmF0aW9uIG5hbWUsIGEgcmVzb2x2ZXIsIGFuZCBhbnkgZnVydGhlciBhcmd1bWVudHMgdGhhdCB3b3VsZFxuICogaGF2ZSBiZWVuIGZvcndhcmRlZCB0byB0aGUgYXBwcm9wcmlhdGUgbWV0aG9kIGFib3ZlIGhhZCBhIG1ldGhvZCBiZWVuXG4gKiBwcm92aWRlZCB3aXRoIHRoZSBwcm9wZXIgbmFtZS4gIFRoZSBBUEkgbWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCB0aGUgbmF0dXJlXG4gKiBvZiB0aGUgcmV0dXJuZWQgb2JqZWN0LCBhcGFydCBmcm9tIHRoYXQgaXQgaXMgdXNhYmxlIHdoZXJlZXZlciBwcm9taXNlcyBhcmVcbiAqIGJvdWdodCBhbmQgc29sZC5cbiAqL1xuUS5tYWtlUHJvbWlzZSA9IFByb21pc2U7XG5mdW5jdGlvbiBQcm9taXNlKGRlc2NyaXB0b3IsIGZhbGxiYWNrLCBpbnNwZWN0KSB7XG4gICAgaWYgKGZhbGxiYWNrID09PSB2b2lkIDApIHtcbiAgICAgICAgZmFsbGJhY2sgPSBmdW5jdGlvbiAob3ApIHtcbiAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKFxuICAgICAgICAgICAgICAgIFwiUHJvbWlzZSBkb2VzIG5vdCBzdXBwb3J0IG9wZXJhdGlvbjogXCIgKyBvcFxuICAgICAgICAgICAgKSk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGlmIChpbnNwZWN0ID09PSB2b2lkIDApIHtcbiAgICAgICAgaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7c3RhdGU6IFwidW5rbm93blwifTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZSA9IG9iamVjdF9jcmVhdGUoUHJvbWlzZS5wcm90b3R5cGUpO1xuXG4gICAgcHJvbWlzZS5wcm9taXNlRGlzcGF0Y2ggPSBmdW5jdGlvbiAocmVzb2x2ZSwgb3AsIGFyZ3MpIHtcbiAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChkZXNjcmlwdG9yW29wXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGRlc2NyaXB0b3Jbb3BdLmFwcGx5KHByb21pc2UsIGFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxsYmFjay5jYWxsKHByb21pc2UsIG9wLCBhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZWplY3QoZXhjZXB0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzb2x2ZSkge1xuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHByb21pc2UuaW5zcGVjdCA9IGluc3BlY3Q7XG5cbiAgICAvLyBYWFggZGVwcmVjYXRlZCBgdmFsdWVPZmAgYW5kIGBleGNlcHRpb25gIHN1cHBvcnRcbiAgICBpZiAoaW5zcGVjdCkge1xuICAgICAgICB2YXIgaW5zcGVjdGVkID0gaW5zcGVjdCgpO1xuICAgICAgICBpZiAoaW5zcGVjdGVkLnN0YXRlID09PSBcInJlamVjdGVkXCIpIHtcbiAgICAgICAgICAgIHByb21pc2UuZXhjZXB0aW9uID0gaW5zcGVjdGVkLnJlYXNvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb21pc2UudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBpbnNwZWN0ZWQgPSBpbnNwZWN0KCk7XG4gICAgICAgICAgICBpZiAoaW5zcGVjdGVkLnN0YXRlID09PSBcInBlbmRpbmdcIiB8fFxuICAgICAgICAgICAgICAgIGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaW5zcGVjdGVkLnZhbHVlO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gXCJbb2JqZWN0IFByb21pc2VdXCI7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gKGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzZWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB2YXIgZG9uZSA9IGZhbHNlOyAgIC8vIGVuc3VyZSB0aGUgdW50cnVzdGVkIHByb21pc2UgbWFrZXMgYXQgbW9zdCBhXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGUgY2FsbCB0byBvbmUgb2YgdGhlIGNhbGxiYWNrc1xuXG4gICAgZnVuY3Rpb24gX2Z1bGZpbGxlZCh2YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBmdWxmaWxsZWQgPT09IFwiZnVuY3Rpb25cIiA/IGZ1bGZpbGxlZCh2YWx1ZSkgOiB2YWx1ZTtcbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KGV4Y2VwdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfcmVqZWN0ZWQoZXhjZXB0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcmVqZWN0ZWQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgbWFrZVN0YWNrVHJhY2VMb25nKGV4Y2VwdGlvbiwgc2VsZik7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZWplY3RlZChleGNlcHRpb24pO1xuICAgICAgICAgICAgfSBjYXRjaCAobmV3RXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXdFeGNlcHRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfcHJvZ3Jlc3NlZCh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIHByb2dyZXNzZWQgPT09IFwiZnVuY3Rpb25cIiA/IHByb2dyZXNzZWQodmFsdWUpIDogdmFsdWU7XG4gICAgfVxuXG4gICAgUS5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYucHJvbWlzZURpc3BhdGNoKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkb25lID0gdHJ1ZTtcblxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShfZnVsZmlsbGVkKHZhbHVlKSk7XG4gICAgICAgIH0sIFwid2hlblwiLCBbZnVuY3Rpb24gKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkb25lID0gdHJ1ZTtcblxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShfcmVqZWN0ZWQoZXhjZXB0aW9uKSk7XG4gICAgICAgIH1dKTtcbiAgICB9KTtcblxuICAgIC8vIFByb2dyZXNzIHByb3BhZ2F0b3IgbmVlZCB0byBiZSBhdHRhY2hlZCBpbiB0aGUgY3VycmVudCB0aWNrLlxuICAgIHNlbGYucHJvbWlzZURpc3BhdGNoKHZvaWQgMCwgXCJ3aGVuXCIsIFt2b2lkIDAsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgbmV3VmFsdWU7XG4gICAgICAgIHZhciB0aHJldyA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbmV3VmFsdWUgPSBfcHJvZ3Jlc3NlZCh2YWx1ZSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRocmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChRLm9uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBRLm9uZXJyb3IoZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRocmV3KSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5ub3RpZnkobmV3VmFsdWUpO1xuICAgICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG5RLnRhcCA9IGZ1bmN0aW9uIChwcm9taXNlLCBjYWxsYmFjaykge1xuICAgIHJldHVybiBRKHByb21pc2UpLnRhcChjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIFdvcmtzIGFsbW9zdCBsaWtlIFwiZmluYWxseVwiLCBidXQgbm90IGNhbGxlZCBmb3IgcmVqZWN0aW9ucy5cbiAqIE9yaWdpbmFsIHJlc29sdXRpb24gdmFsdWUgaXMgcGFzc2VkIHRocm91Z2ggY2FsbGJhY2sgdW5hZmZlY3RlZC5cbiAqIENhbGxiYWNrIG1heSByZXR1cm4gYSBwcm9taXNlIHRoYXQgd2lsbCBiZSBhd2FpdGVkIGZvci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcmV0dXJucyB7US5Qcm9taXNlfVxuICogQGV4YW1wbGVcbiAqIGRvU29tZXRoaW5nKClcbiAqICAgLnRoZW4oLi4uKVxuICogICAudGFwKGNvbnNvbGUubG9nKVxuICogICAudGhlbiguLi4pO1xuICovXG5Qcm9taXNlLnByb3RvdHlwZS50YXAgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IFEoY2FsbGJhY2spO1xuXG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmZjYWxsKHZhbHVlKS50aGVuUmVzb2x2ZSh2YWx1ZSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBvYnNlcnZlciBvbiBhIHByb21pc2UuXG4gKlxuICogR3VhcmFudGVlczpcbiAqXG4gKiAxLiB0aGF0IGZ1bGZpbGxlZCBhbmQgcmVqZWN0ZWQgd2lsbCBiZSBjYWxsZWQgb25seSBvbmNlLlxuICogMi4gdGhhdCBlaXRoZXIgdGhlIGZ1bGZpbGxlZCBjYWxsYmFjayBvciB0aGUgcmVqZWN0ZWQgY2FsbGJhY2sgd2lsbCBiZVxuICogICAgY2FsbGVkLCBidXQgbm90IGJvdGguXG4gKiAzLiB0aGF0IGZ1bGZpbGxlZCBhbmQgcmVqZWN0ZWQgd2lsbCBub3QgYmUgY2FsbGVkIGluIHRoaXMgdHVybi5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgICAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgdG8gb2JzZXJ2ZVxuICogQHBhcmFtIGZ1bGZpbGxlZCAgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIGZ1bGZpbGxlZCB2YWx1ZVxuICogQHBhcmFtIHJlamVjdGVkICAgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlamVjdGlvbiBleGNlcHRpb25cbiAqIEBwYXJhbSBwcm9ncmVzc2VkIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBhbnkgcHJvZ3Jlc3Mgbm90aWZpY2F0aW9uc1xuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlIGZyb20gdGhlIGludm9rZWQgY2FsbGJhY2tcbiAqL1xuUS53aGVuID0gd2hlbjtcbmZ1bmN0aW9uIHdoZW4odmFsdWUsIGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzZWQpIHtcbiAgICByZXR1cm4gUSh2YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzc2VkKTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUudGhlblJlc29sdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHZhbHVlOyB9KTtcbn07XG5cblEudGhlblJlc29sdmUgPSBmdW5jdGlvbiAocHJvbWlzZSwgdmFsdWUpIHtcbiAgICByZXR1cm4gUShwcm9taXNlKS50aGVuUmVzb2x2ZSh2YWx1ZSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuUmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKCkgeyB0aHJvdyByZWFzb247IH0pO1xufTtcblxuUS50aGVuUmVqZWN0ID0gZnVuY3Rpb24gKHByb21pc2UsIHJlYXNvbikge1xuICAgIHJldHVybiBRKHByb21pc2UpLnRoZW5SZWplY3QocmVhc29uKTtcbn07XG5cbi8qKlxuICogSWYgYW4gb2JqZWN0IGlzIG5vdCBhIHByb21pc2UsIGl0IGlzIGFzIFwibmVhclwiIGFzIHBvc3NpYmxlLlxuICogSWYgYSBwcm9taXNlIGlzIHJlamVjdGVkLCBpdCBpcyBhcyBcIm5lYXJcIiBhcyBwb3NzaWJsZSB0b28uXG4gKiBJZiBpdOKAmXMgYSBmdWxmaWxsZWQgcHJvbWlzZSwgdGhlIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5lYXJlci5cbiAqIElmIGl04oCZcyBhIGRlZmVycmVkIHByb21pc2UgYW5kIHRoZSBkZWZlcnJlZCBoYXMgYmVlbiByZXNvbHZlZCwgdGhlXG4gKiByZXNvbHV0aW9uIGlzIFwibmVhcmVyXCIuXG4gKiBAcGFyYW0gb2JqZWN0XG4gKiBAcmV0dXJucyBtb3N0IHJlc29sdmVkIChuZWFyZXN0KSBmb3JtIG9mIHRoZSBvYmplY3RcbiAqL1xuXG4vLyBYWFggc2hvdWxkIHdlIHJlLWRvIHRoaXM/XG5RLm5lYXJlciA9IG5lYXJlcjtcbmZ1bmN0aW9uIG5lYXJlcih2YWx1ZSkge1xuICAgIGlmIChpc1Byb21pc2UodmFsdWUpKSB7XG4gICAgICAgIHZhciBpbnNwZWN0ZWQgPSB2YWx1ZS5pbnNwZWN0KCk7XG4gICAgICAgIGlmIChpbnNwZWN0ZWQuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnNwZWN0ZWQudmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHByb21pc2UuXG4gKiBPdGhlcndpc2UgaXQgaXMgYSBmdWxmaWxsZWQgdmFsdWUuXG4gKi9cblEuaXNQcm9taXNlID0gaXNQcm9taXNlO1xuZnVuY3Rpb24gaXNQcm9taXNlKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3QgaW5zdGFuY2VvZiBQcm9taXNlO1xufVxuXG5RLmlzUHJvbWlzZUFsaWtlID0gaXNQcm9taXNlQWxpa2U7XG5mdW5jdGlvbiBpc1Byb21pc2VBbGlrZShvYmplY3QpIHtcbiAgICByZXR1cm4gaXNPYmplY3Qob2JqZWN0KSAmJiB0eXBlb2Ygb2JqZWN0LnRoZW4gPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSBwZW5kaW5nIHByb21pc2UsIG1lYW5pbmcgbm90XG4gKiBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG4gKi9cblEuaXNQZW5kaW5nID0gaXNQZW5kaW5nO1xuZnVuY3Rpb24gaXNQZW5kaW5nKG9iamVjdCkge1xuICAgIHJldHVybiBpc1Byb21pc2Uob2JqZWN0KSAmJiBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcInBlbmRpbmdcIjtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuaXNQZW5kaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJwZW5kaW5nXCI7XG59O1xuXG4vKipcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHZhbHVlIG9yIGZ1bGZpbGxlZFxuICogcHJvbWlzZS5cbiAqL1xuUS5pc0Z1bGZpbGxlZCA9IGlzRnVsZmlsbGVkO1xuZnVuY3Rpb24gaXNGdWxmaWxsZWQob2JqZWN0KSB7XG4gICAgcmV0dXJuICFpc1Byb21pc2Uob2JqZWN0KSB8fCBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5pc0Z1bGZpbGxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5pbnNwZWN0KCkuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCI7XG59O1xuXG4vKipcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHJlamVjdGVkIHByb21pc2UuXG4gKi9cblEuaXNSZWplY3RlZCA9IGlzUmVqZWN0ZWQ7XG5mdW5jdGlvbiBpc1JlamVjdGVkKG9iamVjdCkge1xuICAgIHJldHVybiBpc1Byb21pc2Uob2JqZWN0KSAmJiBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcInJlamVjdGVkXCI7XG59XG5cblByb21pc2UucHJvdG90eXBlLmlzUmVqZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5zcGVjdCgpLnN0YXRlID09PSBcInJlamVjdGVkXCI7XG59O1xuXG4vLy8vIEJFR0lOIFVOSEFORExFRCBSRUpFQ1RJT04gVFJBQ0tJTkdcblxuLy8gVGhpcyBwcm9taXNlIGxpYnJhcnkgY29uc3VtZXMgZXhjZXB0aW9ucyB0aHJvd24gaW4gaGFuZGxlcnMgc28gdGhleSBjYW4gYmVcbi8vIGhhbmRsZWQgYnkgYSBzdWJzZXF1ZW50IHByb21pc2UuICBUaGUgZXhjZXB0aW9ucyBnZXQgYWRkZWQgdG8gdGhpcyBhcnJheSB3aGVuXG4vLyB0aGV5IGFyZSBjcmVhdGVkLCBhbmQgcmVtb3ZlZCB3aGVuIHRoZXkgYXJlIGhhbmRsZWQuICBOb3RlIHRoYXQgaW4gRVM2IG9yXG4vLyBzaGltbWVkIGVudmlyb25tZW50cywgdGhpcyB3b3VsZCBuYXR1cmFsbHkgYmUgYSBgU2V0YC5cbnZhciB1bmhhbmRsZWRSZWFzb25zID0gW107XG52YXIgdW5oYW5kbGVkUmVqZWN0aW9ucyA9IFtdO1xudmFyIHJlcG9ydGVkVW5oYW5kbGVkUmVqZWN0aW9ucyA9IFtdO1xudmFyIHRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucyA9IHRydWU7XG5cbmZ1bmN0aW9uIHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucygpIHtcbiAgICB1bmhhbmRsZWRSZWFzb25zLmxlbmd0aCA9IDA7XG4gICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5sZW5ndGggPSAwO1xuXG4gICAgaWYgKCF0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMpIHtcbiAgICAgICAgdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zID0gdHJ1ZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRyYWNrUmVqZWN0aW9uKHByb21pc2UsIHJlYXNvbikge1xuICAgIGlmICghdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBwcm9jZXNzLmVtaXQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBRLm5leHRUaWNrLnJ1bkFmdGVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChhcnJheV9pbmRleE9mKHVuaGFuZGxlZFJlamVjdGlvbnMsIHByb21pc2UpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHByb2Nlc3MuZW1pdChcInVuaGFuZGxlZFJlamVjdGlvblwiLCByZWFzb24sIHByb21pc2UpO1xuICAgICAgICAgICAgICAgIHJlcG9ydGVkVW5oYW5kbGVkUmVqZWN0aW9ucy5wdXNoKHByb21pc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB1bmhhbmRsZWRSZWplY3Rpb25zLnB1c2gocHJvbWlzZSk7XG4gICAgaWYgKHJlYXNvbiAmJiB0eXBlb2YgcmVhc29uLnN0YWNrICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHVuaGFuZGxlZFJlYXNvbnMucHVzaChyZWFzb24uc3RhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHVuaGFuZGxlZFJlYXNvbnMucHVzaChcIihubyBzdGFjaykgXCIgKyByZWFzb24pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdW50cmFja1JlamVjdGlvbihwcm9taXNlKSB7XG4gICAgaWYgKCF0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBhdCA9IGFycmF5X2luZGV4T2YodW5oYW5kbGVkUmVqZWN0aW9ucywgcHJvbWlzZSk7XG4gICAgaWYgKGF0ICE9PSAtMSkge1xuICAgICAgICBpZiAodHlwZW9mIHByb2Nlc3MgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHByb2Nlc3MuZW1pdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBRLm5leHRUaWNrLnJ1bkFmdGVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXRSZXBvcnQgPSBhcnJheV9pbmRleE9mKHJlcG9ydGVkVW5oYW5kbGVkUmVqZWN0aW9ucywgcHJvbWlzZSk7XG4gICAgICAgICAgICAgICAgaWYgKGF0UmVwb3J0ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmVtaXQoXCJyZWplY3Rpb25IYW5kbGVkXCIsIHVuaGFuZGxlZFJlYXNvbnNbYXRdLCBwcm9taXNlKTtcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0ZWRVbmhhbmRsZWRSZWplY3Rpb25zLnNwbGljZShhdFJlcG9ydCwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5zcGxpY2UoYXQsIDEpO1xuICAgICAgICB1bmhhbmRsZWRSZWFzb25zLnNwbGljZShhdCwgMSk7XG4gICAgfVxufVxuXG5RLnJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucyA9IHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucztcblxuUS5nZXRVbmhhbmRsZWRSZWFzb25zID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIE1ha2UgYSBjb3B5IHNvIHRoYXQgY29uc3VtZXJzIGNhbid0IGludGVyZmVyZSB3aXRoIG91ciBpbnRlcm5hbCBzdGF0ZS5cbiAgICByZXR1cm4gdW5oYW5kbGVkUmVhc29ucy5zbGljZSgpO1xufTtcblxuUS5zdG9wVW5oYW5kbGVkUmVqZWN0aW9uVHJhY2tpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmVzZXRVbmhhbmRsZWRSZWplY3Rpb25zKCk7XG4gICAgdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zID0gZmFsc2U7XG59O1xuXG5yZXNldFVuaGFuZGxlZFJlamVjdGlvbnMoKTtcblxuLy8vLyBFTkQgVU5IQU5ETEVEIFJFSkVDVElPTiBUUkFDS0lOR1xuXG4vKipcbiAqIENvbnN0cnVjdHMgYSByZWplY3RlZCBwcm9taXNlLlxuICogQHBhcmFtIHJlYXNvbiB2YWx1ZSBkZXNjcmliaW5nIHRoZSBmYWlsdXJlXG4gKi9cblEucmVqZWN0ID0gcmVqZWN0O1xuZnVuY3Rpb24gcmVqZWN0KHJlYXNvbikge1xuICAgIHZhciByZWplY3Rpb24gPSBQcm9taXNlKHtcbiAgICAgICAgXCJ3aGVuXCI6IGZ1bmN0aW9uIChyZWplY3RlZCkge1xuICAgICAgICAgICAgLy8gbm90ZSB0aGF0IHRoZSBlcnJvciBoYXMgYmVlbiBoYW5kbGVkXG4gICAgICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICB1bnRyYWNrUmVqZWN0aW9uKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQocmVhc29uKSA6IHRoaXM7XG4gICAgICAgIH1cbiAgICB9LCBmdW5jdGlvbiBmYWxsYmFjaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSwgZnVuY3Rpb24gaW5zcGVjdCgpIHtcbiAgICAgICAgcmV0dXJuIHsgc3RhdGU6IFwicmVqZWN0ZWRcIiwgcmVhc29uOiByZWFzb24gfTtcbiAgICB9KTtcblxuICAgIC8vIE5vdGUgdGhhdCB0aGUgcmVhc29uIGhhcyBub3QgYmVlbiBoYW5kbGVkLlxuICAgIHRyYWNrUmVqZWN0aW9uKHJlamVjdGlvbiwgcmVhc29uKTtcblxuICAgIHJldHVybiByZWplY3Rpb247XG59XG5cbi8qKlxuICogQ29uc3RydWN0cyBhIGZ1bGZpbGxlZCBwcm9taXNlIGZvciBhbiBpbW1lZGlhdGUgcmVmZXJlbmNlLlxuICogQHBhcmFtIHZhbHVlIGltbWVkaWF0ZSByZWZlcmVuY2VcbiAqL1xuUS5mdWxmaWxsID0gZnVsZmlsbDtcbmZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHtcbiAgICByZXR1cm4gUHJvbWlzZSh7XG4gICAgICAgIFwid2hlblwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0XCI6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVbbmFtZV07XG4gICAgICAgIH0sXG4gICAgICAgIFwic2V0XCI6IGZ1bmN0aW9uIChuYW1lLCByaHMpIHtcbiAgICAgICAgICAgIHZhbHVlW25hbWVdID0gcmhzO1xuICAgICAgICB9LFxuICAgICAgICBcImRlbGV0ZVwiOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgZGVsZXRlIHZhbHVlW25hbWVdO1xuICAgICAgICB9LFxuICAgICAgICBcInBvc3RcIjogZnVuY3Rpb24gKG5hbWUsIGFyZ3MpIHtcbiAgICAgICAgICAgIC8vIE1hcmsgTWlsbGVyIHByb3Bvc2VzIHRoYXQgcG9zdCB3aXRoIG5vIG5hbWUgc2hvdWxkIGFwcGx5IGFcbiAgICAgICAgICAgIC8vIHByb21pc2VkIGZ1bmN0aW9uLlxuICAgICAgICAgICAgaWYgKG5hbWUgPT09IG51bGwgfHwgbmFtZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmFwcGx5KHZvaWQgMCwgYXJncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZVtuYW1lXS5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiYXBwbHlcIjogZnVuY3Rpb24gKHRoaXNwLCBhcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUuYXBwbHkodGhpc3AsIGFyZ3MpO1xuICAgICAgICB9LFxuICAgICAgICBcImtleXNcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG9iamVjdF9rZXlzKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sIHZvaWQgMCwgZnVuY3Rpb24gaW5zcGVjdCgpIHtcbiAgICAgICAgcmV0dXJuIHsgc3RhdGU6IFwiZnVsZmlsbGVkXCIsIHZhbHVlOiB2YWx1ZSB9O1xuICAgIH0pO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIHRoZW5hYmxlcyB0byBRIHByb21pc2VzLlxuICogQHBhcmFtIHByb21pc2UgdGhlbmFibGUgcHJvbWlzZVxuICogQHJldHVybnMgYSBRIHByb21pc2VcbiAqL1xuZnVuY3Rpb24gY29lcmNlKHByb21pc2UpIHtcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGRlZmVycmVkLnJlc29sdmUsIGRlZmVycmVkLnJlamVjdCwgZGVmZXJyZWQubm90aWZ5KTtcbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXhjZXB0aW9uKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufVxuXG4vKipcbiAqIEFubm90YXRlcyBhbiBvYmplY3Qgc3VjaCB0aGF0IGl0IHdpbGwgbmV2ZXIgYmVcbiAqIHRyYW5zZmVycmVkIGF3YXkgZnJvbSB0aGlzIHByb2Nlc3Mgb3ZlciBhbnkgcHJvbWlzZVxuICogY29tbXVuaWNhdGlvbiBjaGFubmVsLlxuICogQHBhcmFtIG9iamVjdFxuICogQHJldHVybnMgcHJvbWlzZSBhIHdyYXBwaW5nIG9mIHRoYXQgb2JqZWN0IHRoYXRcbiAqIGFkZGl0aW9uYWxseSByZXNwb25kcyB0byB0aGUgXCJpc0RlZlwiIG1lc3NhZ2VcbiAqIHdpdGhvdXQgYSByZWplY3Rpb24uXG4gKi9cblEubWFzdGVyID0gbWFzdGVyO1xuZnVuY3Rpb24gbWFzdGVyKG9iamVjdCkge1xuICAgIHJldHVybiBQcm9taXNlKHtcbiAgICAgICAgXCJpc0RlZlwiOiBmdW5jdGlvbiAoKSB7fVxuICAgIH0sIGZ1bmN0aW9uIGZhbGxiYWNrKG9wLCBhcmdzKSB7XG4gICAgICAgIHJldHVybiBkaXNwYXRjaChvYmplY3QsIG9wLCBhcmdzKTtcbiAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBRKG9iamVjdCkuaW5zcGVjdCgpO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIFNwcmVhZHMgdGhlIHZhbHVlcyBvZiBhIHByb21pc2VkIGFycmF5IG9mIGFyZ3VtZW50cyBpbnRvIHRoZVxuICogZnVsZmlsbG1lbnQgY2FsbGJhY2suXG4gKiBAcGFyYW0gZnVsZmlsbGVkIGNhbGxiYWNrIHRoYXQgcmVjZWl2ZXMgdmFyaWFkaWMgYXJndW1lbnRzIGZyb20gdGhlXG4gKiBwcm9taXNlZCBhcnJheVxuICogQHBhcmFtIHJlamVjdGVkIGNhbGxiYWNrIHRoYXQgcmVjZWl2ZXMgdGhlIGV4Y2VwdGlvbiBpZiB0aGUgcHJvbWlzZVxuICogaXMgcmVqZWN0ZWQuXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWUgb3IgdGhyb3duIGV4Y2VwdGlvbiBvZlxuICogZWl0aGVyIGNhbGxiYWNrLlxuICovXG5RLnNwcmVhZCA9IHNwcmVhZDtcbmZ1bmN0aW9uIHNwcmVhZCh2YWx1ZSwgZnVsZmlsbGVkLCByZWplY3RlZCkge1xuICAgIHJldHVybiBRKHZhbHVlKS5zcHJlYWQoZnVsZmlsbGVkLCByZWplY3RlZCk7XG59XG5cblByb21pc2UucHJvdG90eXBlLnNwcmVhZCA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkKSB7XG4gICAgcmV0dXJuIHRoaXMuYWxsKCkudGhlbihmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIGZ1bGZpbGxlZC5hcHBseSh2b2lkIDAsIGFycmF5KTtcbiAgICB9LCByZWplY3RlZCk7XG59O1xuXG4vKipcbiAqIFRoZSBhc3luYyBmdW5jdGlvbiBpcyBhIGRlY29yYXRvciBmb3IgZ2VuZXJhdG9yIGZ1bmN0aW9ucywgdHVybmluZ1xuICogdGhlbSBpbnRvIGFzeW5jaHJvbm91cyBnZW5lcmF0b3JzLiAgQWx0aG91Z2ggZ2VuZXJhdG9ycyBhcmUgb25seSBwYXJ0XG4gKiBvZiB0aGUgbmV3ZXN0IEVDTUFTY3JpcHQgNiBkcmFmdHMsIHRoaXMgY29kZSBkb2VzIG5vdCBjYXVzZSBzeW50YXhcbiAqIGVycm9ycyBpbiBvbGRlciBlbmdpbmVzLiAgVGhpcyBjb2RlIHNob3VsZCBjb250aW51ZSB0byB3b3JrIGFuZCB3aWxsXG4gKiBpbiBmYWN0IGltcHJvdmUgb3ZlciB0aW1lIGFzIHRoZSBsYW5ndWFnZSBpbXByb3Zlcy5cbiAqXG4gKiBFUzYgZ2VuZXJhdG9ycyBhcmUgY3VycmVudGx5IHBhcnQgb2YgVjggdmVyc2lvbiAzLjE5IHdpdGggdGhlXG4gKiAtLWhhcm1vbnktZ2VuZXJhdG9ycyBydW50aW1lIGZsYWcgZW5hYmxlZC4gIFNwaWRlck1vbmtleSBoYXMgaGFkIHRoZW1cbiAqIGZvciBsb25nZXIsIGJ1dCB1bmRlciBhbiBvbGRlciBQeXRob24taW5zcGlyZWQgZm9ybS4gIFRoaXMgZnVuY3Rpb25cbiAqIHdvcmtzIG9uIGJvdGgga2luZHMgb2YgZ2VuZXJhdG9ycy5cbiAqXG4gKiBEZWNvcmF0ZXMgYSBnZW5lcmF0b3IgZnVuY3Rpb24gc3VjaCB0aGF0OlxuICogIC0gaXQgbWF5IHlpZWxkIHByb21pc2VzXG4gKiAgLSBleGVjdXRpb24gd2lsbCBjb250aW51ZSB3aGVuIHRoYXQgcHJvbWlzZSBpcyBmdWxmaWxsZWRcbiAqICAtIHRoZSB2YWx1ZSBvZiB0aGUgeWllbGQgZXhwcmVzc2lvbiB3aWxsIGJlIHRoZSBmdWxmaWxsZWQgdmFsdWVcbiAqICAtIGl0IHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlICh3aGVuIHRoZSBnZW5lcmF0b3JcbiAqICAgIHN0b3BzIGl0ZXJhdGluZylcbiAqICAtIHRoZSBkZWNvcmF0ZWQgZnVuY3Rpb24gcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcbiAqICAgIG9mIHRoZSBnZW5lcmF0b3Igb3IgdGhlIGZpcnN0IHJlamVjdGVkIHByb21pc2UgYW1vbmcgdGhvc2VcbiAqICAgIHlpZWxkZWQuXG4gKiAgLSBpZiBhbiBlcnJvciBpcyB0aHJvd24gaW4gdGhlIGdlbmVyYXRvciwgaXQgcHJvcGFnYXRlcyB0aHJvdWdoXG4gKiAgICBldmVyeSBmb2xsb3dpbmcgeWllbGQgdW50aWwgaXQgaXMgY2F1Z2h0LCBvciB1bnRpbCBpdCBlc2NhcGVzXG4gKiAgICB0aGUgZ2VuZXJhdG9yIGZ1bmN0aW9uIGFsdG9nZXRoZXIsIGFuZCBpcyB0cmFuc2xhdGVkIGludG8gYVxuICogICAgcmVqZWN0aW9uIGZvciB0aGUgcHJvbWlzZSByZXR1cm5lZCBieSB0aGUgZGVjb3JhdGVkIGdlbmVyYXRvci5cbiAqL1xuUS5hc3luYyA9IGFzeW5jO1xuZnVuY3Rpb24gYXN5bmMobWFrZUdlbmVyYXRvcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIHdoZW4gdmVyYiBpcyBcInNlbmRcIiwgYXJnIGlzIGEgdmFsdWVcbiAgICAgICAgLy8gd2hlbiB2ZXJiIGlzIFwidGhyb3dcIiwgYXJnIGlzIGFuIGV4Y2VwdGlvblxuICAgICAgICBmdW5jdGlvbiBjb250aW51ZXIodmVyYiwgYXJnKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0O1xuXG4gICAgICAgICAgICAvLyBVbnRpbCBWOCAzLjE5IC8gQ2hyb21pdW0gMjkgaXMgcmVsZWFzZWQsIFNwaWRlck1vbmtleSBpcyB0aGUgb25seVxuICAgICAgICAgICAgLy8gZW5naW5lIHRoYXQgaGFzIGEgZGVwbG95ZWQgYmFzZSBvZiBicm93c2VycyB0aGF0IHN1cHBvcnQgZ2VuZXJhdG9ycy5cbiAgICAgICAgICAgIC8vIEhvd2V2ZXIsIFNNJ3MgZ2VuZXJhdG9ycyB1c2UgdGhlIFB5dGhvbi1pbnNwaXJlZCBzZW1hbnRpY3Mgb2ZcbiAgICAgICAgICAgIC8vIG91dGRhdGVkIEVTNiBkcmFmdHMuICBXZSB3b3VsZCBsaWtlIHRvIHN1cHBvcnQgRVM2LCBidXQgd2UnZCBhbHNvXG4gICAgICAgICAgICAvLyBsaWtlIHRvIG1ha2UgaXQgcG9zc2libGUgdG8gdXNlIGdlbmVyYXRvcnMgaW4gZGVwbG95ZWQgYnJvd3NlcnMsIHNvXG4gICAgICAgICAgICAvLyB3ZSBhbHNvIHN1cHBvcnQgUHl0aG9uLXN0eWxlIGdlbmVyYXRvcnMuICBBdCBzb21lIHBvaW50IHdlIGNhbiByZW1vdmVcbiAgICAgICAgICAgIC8vIHRoaXMgYmxvY2suXG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgU3RvcEl0ZXJhdGlvbiA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIC8vIEVTNiBHZW5lcmF0b3JzXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZ2VuZXJhdG9yW3ZlcmJdKGFyZyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBRKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdoZW4ocmVzdWx0LnZhbHVlLCBjYWxsYmFjaywgZXJyYmFjayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTcGlkZXJNb25rZXkgR2VuZXJhdG9yc1xuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBSZW1vdmUgdGhpcyBjYXNlIHdoZW4gU00gZG9lcyBFUzYgZ2VuZXJhdG9ycy5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBnZW5lcmF0b3JbdmVyYl0oYXJnKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzU3RvcEl0ZXJhdGlvbihleGNlcHRpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUShleGNlcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChleGNlcHRpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB3aGVuKHJlc3VsdCwgY2FsbGJhY2ssIGVycmJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBnZW5lcmF0b3IgPSBtYWtlR2VuZXJhdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGNvbnRpbnVlci5iaW5kKGNvbnRpbnVlciwgXCJuZXh0XCIpO1xuICAgICAgICB2YXIgZXJyYmFjayA9IGNvbnRpbnVlci5iaW5kKGNvbnRpbnVlciwgXCJ0aHJvd1wiKTtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBUaGUgc3Bhd24gZnVuY3Rpb24gaXMgYSBzbWFsbCB3cmFwcGVyIGFyb3VuZCBhc3luYyB0aGF0IGltbWVkaWF0ZWx5XG4gKiBjYWxscyB0aGUgZ2VuZXJhdG9yIGFuZCBhbHNvIGVuZHMgdGhlIHByb21pc2UgY2hhaW4sIHNvIHRoYXQgYW55XG4gKiB1bmhhbmRsZWQgZXJyb3JzIGFyZSB0aHJvd24gaW5zdGVhZCBvZiBmb3J3YXJkZWQgdG8gdGhlIGVycm9yXG4gKiBoYW5kbGVyLiBUaGlzIGlzIHVzZWZ1bCBiZWNhdXNlIGl0J3MgZXh0cmVtZWx5IGNvbW1vbiB0byBydW5cbiAqIGdlbmVyYXRvcnMgYXQgdGhlIHRvcC1sZXZlbCB0byB3b3JrIHdpdGggbGlicmFyaWVzLlxuICovXG5RLnNwYXduID0gc3Bhd247XG5mdW5jdGlvbiBzcGF3bihtYWtlR2VuZXJhdG9yKSB7XG4gICAgUS5kb25lKFEuYXN5bmMobWFrZUdlbmVyYXRvcikoKSk7XG59XG5cbi8vIEZJWE1FOiBSZW1vdmUgdGhpcyBpbnRlcmZhY2Ugb25jZSBFUzYgZ2VuZXJhdG9ycyBhcmUgaW4gU3BpZGVyTW9ua2V5LlxuLyoqXG4gKiBUaHJvd3MgYSBSZXR1cm5WYWx1ZSBleGNlcHRpb24gdG8gc3RvcCBhbiBhc3luY2hyb25vdXMgZ2VuZXJhdG9yLlxuICpcbiAqIFRoaXMgaW50ZXJmYWNlIGlzIGEgc3RvcC1nYXAgbWVhc3VyZSB0byBzdXBwb3J0IGdlbmVyYXRvciByZXR1cm5cbiAqIHZhbHVlcyBpbiBvbGRlciBGaXJlZm94L1NwaWRlck1vbmtleS4gIEluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBFUzZcbiAqIGdlbmVyYXRvcnMgbGlrZSBDaHJvbWl1bSAyOSwganVzdCB1c2UgXCJyZXR1cm5cIiBpbiB5b3VyIGdlbmVyYXRvclxuICogZnVuY3Rpb25zLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSB0aGUgcmV0dXJuIHZhbHVlIGZvciB0aGUgc3Vycm91bmRpbmcgZ2VuZXJhdG9yXG4gKiBAdGhyb3dzIFJldHVyblZhbHVlIGV4Y2VwdGlvbiB3aXRoIHRoZSB2YWx1ZS5cbiAqIEBleGFtcGxlXG4gKiAvLyBFUzYgc3R5bGVcbiAqIFEuYXN5bmMoZnVuY3Rpb24qICgpIHtcbiAqICAgICAgdmFyIGZvbyA9IHlpZWxkIGdldEZvb1Byb21pc2UoKTtcbiAqICAgICAgdmFyIGJhciA9IHlpZWxkIGdldEJhclByb21pc2UoKTtcbiAqICAgICAgcmV0dXJuIGZvbyArIGJhcjtcbiAqIH0pXG4gKiAvLyBPbGRlciBTcGlkZXJNb25rZXkgc3R5bGVcbiAqIFEuYXN5bmMoZnVuY3Rpb24gKCkge1xuICogICAgICB2YXIgZm9vID0geWllbGQgZ2V0Rm9vUHJvbWlzZSgpO1xuICogICAgICB2YXIgYmFyID0geWllbGQgZ2V0QmFyUHJvbWlzZSgpO1xuICogICAgICBRLnJldHVybihmb28gKyBiYXIpO1xuICogfSlcbiAqL1xuUVtcInJldHVyblwiXSA9IF9yZXR1cm47XG5mdW5jdGlvbiBfcmV0dXJuKHZhbHVlKSB7XG4gICAgdGhyb3cgbmV3IFFSZXR1cm5WYWx1ZSh2YWx1ZSk7XG59XG5cbi8qKlxuICogVGhlIHByb21pc2VkIGZ1bmN0aW9uIGRlY29yYXRvciBlbnN1cmVzIHRoYXQgYW55IHByb21pc2UgYXJndW1lbnRzXG4gKiBhcmUgc2V0dGxlZCBhbmQgcGFzc2VkIGFzIHZhbHVlcyAoYHRoaXNgIGlzIGFsc28gc2V0dGxlZCBhbmQgcGFzc2VkXG4gKiBhcyBhIHZhbHVlKS4gIEl0IHdpbGwgYWxzbyBlbnN1cmUgdGhhdCB0aGUgcmVzdWx0IG9mIGEgZnVuY3Rpb24gaXNcbiAqIGFsd2F5cyBhIHByb21pc2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIHZhciBhZGQgPSBRLnByb21pc2VkKGZ1bmN0aW9uIChhLCBiKSB7XG4gKiAgICAgcmV0dXJuIGEgKyBiO1xuICogfSk7XG4gKiBhZGQoUShhKSwgUShCKSk7XG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGRlY29yYXRlXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb259IGEgZnVuY3Rpb24gdGhhdCBoYXMgYmVlbiBkZWNvcmF0ZWQuXG4gKi9cblEucHJvbWlzZWQgPSBwcm9taXNlZDtcbmZ1bmN0aW9uIHByb21pc2VkKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNwcmVhZChbdGhpcywgYWxsKGFyZ3VtZW50cyldLCBmdW5jdGlvbiAoc2VsZiwgYXJncykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICB9O1xufVxuXG4vKipcbiAqIHNlbmRzIGEgbWVzc2FnZSB0byBhIHZhbHVlIGluIGEgZnV0dXJlIHR1cm5cbiAqIEBwYXJhbSBvYmplY3QqIHRoZSByZWNpcGllbnRcbiAqIEBwYXJhbSBvcCB0aGUgbmFtZSBvZiB0aGUgbWVzc2FnZSBvcGVyYXRpb24sIGUuZy4sIFwid2hlblwiLFxuICogQHBhcmFtIGFyZ3MgZnVydGhlciBhcmd1bWVudHMgdG8gYmUgZm9yd2FyZGVkIHRvIHRoZSBvcGVyYXRpb25cbiAqIEByZXR1cm5zIHJlc3VsdCB7UHJvbWlzZX0gYSBwcm9taXNlIGZvciB0aGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb25cbiAqL1xuUS5kaXNwYXRjaCA9IGRpc3BhdGNoO1xuZnVuY3Rpb24gZGlzcGF0Y2gob2JqZWN0LCBvcCwgYXJncykge1xuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2gob3AsIGFyZ3MpO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5kaXNwYXRjaCA9IGZ1bmN0aW9uIChvcCwgYXJncykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLnByb21pc2VEaXNwYXRjaChkZWZlcnJlZC5yZXNvbHZlLCBvcCwgYXJncyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgcHJvcGVydHkgdG8gZ2V0XG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSBwcm9wZXJ0eSB2YWx1ZVxuICovXG5RLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSkge1xuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJnZXRcIiwgW2tleV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwiZ2V0XCIsIFtrZXldKTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBpbiBhIGZ1dHVyZSB0dXJuLlxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIG9iamVjdCBvYmplY3RcbiAqIEBwYXJhbSBuYW1lICAgICAgbmFtZSBvZiBwcm9wZXJ0eSB0byBzZXRcbiAqIEBwYXJhbSB2YWx1ZSAgICAgbmV3IHZhbHVlIG9mIHByb3BlcnR5XG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcbiAqL1xuUS5zZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcInNldFwiLCBba2V5LCB2YWx1ZV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcInNldFwiLCBba2V5LCB2YWx1ZV0pO1xufTtcblxuLyoqXG4gKiBEZWxldGVzIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgcHJvcGVydHkgdG8gZGVsZXRlXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcbiAqL1xuUS5kZWwgPSAvLyBYWFggbGVnYWN5XG5RW1wiZGVsZXRlXCJdID0gZnVuY3Rpb24gKG9iamVjdCwga2V5KSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImRlbGV0ZVwiLCBba2V5XSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5kZWwgPSAvLyBYWFggbGVnYWN5XG5Qcm9taXNlLnByb3RvdHlwZVtcImRlbGV0ZVwiXSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImRlbGV0ZVwiLCBba2V5XSk7XG59O1xuXG4vKipcbiAqIEludm9rZXMgYSBtZXRob2QgaW4gYSBmdXR1cmUgdHVybi5cbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgbWV0aG9kIHRvIGludm9rZVxuICogQHBhcmFtIHZhbHVlICAgICBhIHZhbHVlIHRvIHBvc3QsIHR5cGljYWxseSBhbiBhcnJheSBvZlxuICogICAgICAgICAgICAgICAgICBpbnZvY2F0aW9uIGFyZ3VtZW50cyBmb3IgcHJvbWlzZXMgdGhhdFxuICogICAgICAgICAgICAgICAgICBhcmUgdWx0aW1hdGVseSBiYWNrZWQgd2l0aCBgcmVzb2x2ZWAgdmFsdWVzLFxuICogICAgICAgICAgICAgICAgICBhcyBvcHBvc2VkIHRvIHRob3NlIGJhY2tlZCB3aXRoIFVSTHNcbiAqICAgICAgICAgICAgICAgICAgd2hlcmVpbiB0aGUgcG9zdGVkIHZhbHVlIGNhbiBiZSBhbnlcbiAqICAgICAgICAgICAgICAgICAgSlNPTiBzZXJpYWxpemFibGUgb2JqZWN0LlxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXG4gKi9cbi8vIGJvdW5kIGxvY2FsbHkgYmVjYXVzZSBpdCBpcyB1c2VkIGJ5IG90aGVyIG1ldGhvZHNcblEubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcblEucG9zdCA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUsIGFyZ3MpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJnc10pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcblByb21pc2UucHJvdG90eXBlLnBvc3QgPSBmdW5jdGlvbiAobmFtZSwgYXJncykge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJnc10pO1xufTtcblxuLyoqXG4gKiBJbnZva2VzIGEgbWV0aG9kIGluIGEgZnV0dXJlIHR1cm4uXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIG1ldGhvZCB0byBpbnZva2VcbiAqIEBwYXJhbSAuLi5hcmdzICAgYXJyYXkgb2YgaW52b2NhdGlvbiBhcmd1bWVudHNcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZVxuICovXG5RLnNlbmQgPSAvLyBYWFggTWFyayBNaWxsZXIncyBwcm9wb3NlZCBwYXJsYW5jZVxuUS5tY2FsbCA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXG5RLmludm9rZSA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUgLyouLi5hcmdzKi8pIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAyKV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuc2VuZCA9IC8vIFhYWCBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIHBhcmxhbmNlXG5Qcm9taXNlLnByb3RvdHlwZS5tY2FsbCA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXG5Qcm9taXNlLnByb3RvdHlwZS5pbnZva2UgPSBmdW5jdGlvbiAobmFtZSAvKi4uLmFyZ3MqLykge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKV0pO1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIHRoZSBwcm9taXNlZCBmdW5jdGlvbiBpbiBhIGZ1dHVyZSB0dXJuLlxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBmdW5jdGlvblxuICogQHBhcmFtIGFyZ3MgICAgICBhcnJheSBvZiBhcHBsaWNhdGlvbiBhcmd1bWVudHNcbiAqL1xuUS5mYXBwbHkgPSBmdW5jdGlvbiAob2JqZWN0LCBhcmdzKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFyZ3NdKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmZhcHBseSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcmdzXSk7XG59O1xuXG4vKipcbiAqIENhbGxzIHRoZSBwcm9taXNlZCBmdW5jdGlvbiBpbiBhIGZ1dHVyZSB0dXJuLlxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBmdW5jdGlvblxuICogQHBhcmFtIC4uLmFyZ3MgICBhcnJheSBvZiBhcHBsaWNhdGlvbiBhcmd1bWVudHNcbiAqL1xuUVtcInRyeVwiXSA9XG5RLmZjYWxsID0gZnVuY3Rpb24gKG9iamVjdCAvKiAuLi5hcmdzKi8pIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwiYXBwbHlcIiwgW3ZvaWQgMCwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZmNhbGwgPSBmdW5jdGlvbiAoLyouLi5hcmdzKi8pIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFycmF5X3NsaWNlKGFyZ3VtZW50cyldKTtcbn07XG5cbi8qKlxuICogQmluZHMgdGhlIHByb21pc2VkIGZ1bmN0aW9uLCB0cmFuc2Zvcm1pbmcgcmV0dXJuIHZhbHVlcyBpbnRvIGEgZnVsZmlsbGVkXG4gKiBwcm9taXNlIGFuZCB0aHJvd24gZXJyb3JzIGludG8gYSByZWplY3RlZCBvbmUuXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IGZ1bmN0aW9uXG4gKiBAcGFyYW0gLi4uYXJncyAgIGFycmF5IG9mIGFwcGxpY2F0aW9uIGFyZ3VtZW50c1xuICovXG5RLmZiaW5kID0gZnVuY3Rpb24gKG9iamVjdCAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBwcm9taXNlID0gUShvYmplY3QpO1xuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gZmJvdW5kKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS5kaXNwYXRjaChcImFwcGx5XCIsIFtcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKVxuICAgICAgICBdKTtcbiAgICB9O1xufTtcblByb21pc2UucHJvdG90eXBlLmZiaW5kID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gZmJvdW5kKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS5kaXNwYXRjaChcImFwcGx5XCIsIFtcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKVxuICAgICAgICBdKTtcbiAgICB9O1xufTtcblxuLyoqXG4gKiBSZXF1ZXN0cyB0aGUgbmFtZXMgb2YgdGhlIG93bmVkIHByb3BlcnRpZXMgb2YgYSBwcm9taXNlZFxuICogb2JqZWN0IGluIGEgZnV0dXJlIHR1cm4uXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUga2V5cyBvZiB0aGUgZXZlbnR1YWxseSBzZXR0bGVkIG9iamVjdFxuICovXG5RLmtleXMgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImtleXNcIiwgW10pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImtleXNcIiwgW10pO1xufTtcblxuLyoqXG4gKiBUdXJucyBhbiBhcnJheSBvZiBwcm9taXNlcyBpbnRvIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkuICBJZiBhbnkgb2ZcbiAqIHRoZSBwcm9taXNlcyBnZXRzIHJlamVjdGVkLCB0aGUgd2hvbGUgYXJyYXkgaXMgcmVqZWN0ZWQgaW1tZWRpYXRlbHkuXG4gKiBAcGFyYW0ge0FycmF5Kn0gYW4gYXJyYXkgKG9yIHByb21pc2UgZm9yIGFuIGFycmF5KSBvZiB2YWx1ZXMgKG9yXG4gKiBwcm9taXNlcyBmb3IgdmFsdWVzKVxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciBhbiBhcnJheSBvZiB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXNcbiAqL1xuLy8gQnkgTWFyayBNaWxsZXJcbi8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPXN0cmF3bWFuOmNvbmN1cnJlbmN5JnJldj0xMzA4Nzc2NTIxI2FsbGZ1bGZpbGxlZFxuUS5hbGwgPSBhbGw7XG5mdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcbiAgICByZXR1cm4gd2hlbihwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgICAgIHZhciBwZW5kaW5nQ291bnQgPSAwO1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgICAgICBhcnJheV9yZWR1Y2UocHJvbWlzZXMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIHByb21pc2UsIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgc25hcHNob3Q7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgaXNQcm9taXNlKHByb21pc2UpICYmXG4gICAgICAgICAgICAgICAgKHNuYXBzaG90ID0gcHJvbWlzZS5pbnNwZWN0KCkpLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBwcm9taXNlc1tpbmRleF0gPSBzbmFwc2hvdC52YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgKytwZW5kaW5nQ291bnQ7XG4gICAgICAgICAgICAgICAgd2hlbihcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlc1tpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgtLXBlbmRpbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocHJvbWlzZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChwcm9ncmVzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQubm90aWZ5KHsgaW5kZXg6IGluZGV4LCB2YWx1ZTogcHJvZ3Jlc3MgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB2b2lkIDApO1xuICAgICAgICBpZiAocGVuZGluZ0NvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHByb21pc2VzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9KTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuYWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGZpcnN0IHJlc29sdmVkIHByb21pc2Ugb2YgYW4gYXJyYXkuIFByaW9yIHJlamVjdGVkIHByb21pc2VzIGFyZVxuICogaWdub3JlZC4gIFJlamVjdHMgb25seSBpZiBhbGwgcHJvbWlzZXMgYXJlIHJlamVjdGVkLlxuICogQHBhcmFtIHtBcnJheSp9IGFuIGFycmF5IGNvbnRhaW5pbmcgdmFsdWVzIG9yIHByb21pc2VzIGZvciB2YWx1ZXNcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmdWxmaWxsZWQgd2l0aCB0aGUgdmFsdWUgb2YgdGhlIGZpcnN0IHJlc29sdmVkIHByb21pc2UsXG4gKiBvciBhIHJlamVjdGVkIHByb21pc2UgaWYgYWxsIHByb21pc2VzIGFyZSByZWplY3RlZC5cbiAqL1xuUS5hbnkgPSBhbnk7XG5cbmZ1bmN0aW9uIGFueShwcm9taXNlcykge1xuICAgIGlmIChwcm9taXNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIFEucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcbiAgICB2YXIgcGVuZGluZ0NvdW50ID0gMDtcbiAgICBhcnJheV9yZWR1Y2UocHJvbWlzZXMsIGZ1bmN0aW9uIChwcmV2LCBjdXJyZW50LCBpbmRleCkge1xuICAgICAgICB2YXIgcHJvbWlzZSA9IHByb21pc2VzW2luZGV4XTtcblxuICAgICAgICBwZW5kaW5nQ291bnQrKztcblxuICAgICAgICB3aGVuKHByb21pc2UsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCBvblByb2dyZXNzKTtcbiAgICAgICAgZnVuY3Rpb24gb25GdWxmaWxsZWQocmVzdWx0KSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gb25SZWplY3RlZCgpIHtcbiAgICAgICAgICAgIHBlbmRpbmdDb3VudC0tO1xuICAgICAgICAgICAgaWYgKHBlbmRpbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgIFwiQ2FuJ3QgZ2V0IGZ1bGZpbGxtZW50IHZhbHVlIGZyb20gYW55IHByb21pc2UsIGFsbCBcIiArXG4gICAgICAgICAgICAgICAgICAgIFwicHJvbWlzZXMgd2VyZSByZWplY3RlZC5cIlxuICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIG9uUHJvZ3Jlc3MocHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLm5vdGlmeSh7XG4gICAgICAgICAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBwcm9ncmVzc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LCB1bmRlZmluZWQpO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59XG5cblByb21pc2UucHJvdG90eXBlLmFueSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gYW55KHRoaXMpO1xufTtcblxuLyoqXG4gKiBXYWl0cyBmb3IgYWxsIHByb21pc2VzIHRvIGJlIHNldHRsZWQsIGVpdGhlciBmdWxmaWxsZWQgb3JcbiAqIHJlamVjdGVkLiAgVGhpcyBpcyBkaXN0aW5jdCBmcm9tIGBhbGxgIHNpbmNlIHRoYXQgd291bGQgc3RvcFxuICogd2FpdGluZyBhdCB0aGUgZmlyc3QgcmVqZWN0aW9uLiAgVGhlIHByb21pc2UgcmV0dXJuZWQgYnlcbiAqIGBhbGxSZXNvbHZlZGAgd2lsbCBuZXZlciBiZSByZWplY3RlZC5cbiAqIEBwYXJhbSBwcm9taXNlcyBhIHByb21pc2UgZm9yIGFuIGFycmF5IChvciBhbiBhcnJheSkgb2YgcHJvbWlzZXNcbiAqIChvciB2YWx1ZXMpXG4gKiBAcmV0dXJuIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkgb2YgcHJvbWlzZXNcbiAqL1xuUS5hbGxSZXNvbHZlZCA9IGRlcHJlY2F0ZShhbGxSZXNvbHZlZCwgXCJhbGxSZXNvbHZlZFwiLCBcImFsbFNldHRsZWRcIik7XG5mdW5jdGlvbiBhbGxSZXNvbHZlZChwcm9taXNlcykge1xuICAgIHJldHVybiB3aGVuKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICAgICAgcHJvbWlzZXMgPSBhcnJheV9tYXAocHJvbWlzZXMsIFEpO1xuICAgICAgICByZXR1cm4gd2hlbihhbGwoYXJyYXlfbWFwKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuIHdoZW4ocHJvbWlzZSwgbm9vcCwgbm9vcCk7XG4gICAgICAgIH0pKSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb21pc2VzO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuYWxsUmVzb2x2ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGFsbFJlc29sdmVkKHRoaXMpO1xufTtcblxuLyoqXG4gKiBAc2VlIFByb21pc2UjYWxsU2V0dGxlZFxuICovXG5RLmFsbFNldHRsZWQgPSBhbGxTZXR0bGVkO1xuZnVuY3Rpb24gYWxsU2V0dGxlZChwcm9taXNlcykge1xuICAgIHJldHVybiBRKHByb21pc2VzKS5hbGxTZXR0bGVkKCk7XG59XG5cbi8qKlxuICogVHVybnMgYW4gYXJyYXkgb2YgcHJvbWlzZXMgaW50byBhIHByb21pc2UgZm9yIGFuIGFycmF5IG9mIHRoZWlyIHN0YXRlcyAoYXNcbiAqIHJldHVybmVkIGJ5IGBpbnNwZWN0YCkgd2hlbiB0aGV5IGhhdmUgYWxsIHNldHRsZWQuXG4gKiBAcGFyYW0ge0FycmF5W0FueSpdfSB2YWx1ZXMgYW4gYXJyYXkgKG9yIHByb21pc2UgZm9yIGFuIGFycmF5KSBvZiB2YWx1ZXMgKG9yXG4gKiBwcm9taXNlcyBmb3IgdmFsdWVzKVxuICogQHJldHVybnMge0FycmF5W1N0YXRlXX0gYW4gYXJyYXkgb2Ygc3RhdGVzIGZvciB0aGUgcmVzcGVjdGl2ZSB2YWx1ZXMuXG4gKi9cblByb21pc2UucHJvdG90eXBlLmFsbFNldHRsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICAgICAgcmV0dXJuIGFsbChhcnJheV9tYXAocHJvbWlzZXMsIGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgICAgICAgICBwcm9taXNlID0gUShwcm9taXNlKTtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlZ2FyZGxlc3MoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2UuaW5zcGVjdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbihyZWdhcmRsZXNzLCByZWdhcmRsZXNzKTtcbiAgICAgICAgfSkpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDYXB0dXJlcyB0aGUgZmFpbHVyZSBvZiBhIHByb21pc2UsIGdpdmluZyBhbiBvcG9ydHVuaXR5IHRvIHJlY292ZXJcbiAqIHdpdGggYSBjYWxsYmFjay4gIElmIHRoZSBnaXZlbiBwcm9taXNlIGlzIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkXG4gKiBwcm9taXNlIGlzIGZ1bGZpbGxlZC5cbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZSBmb3Igc29tZXRoaW5nXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayB0byBmdWxmaWxsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlmIHRoZVxuICogZ2l2ZW4gcHJvbWlzZSBpcyByZWplY3RlZFxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBjYWxsYmFja1xuICovXG5RLmZhaWwgPSAvLyBYWFggbGVnYWN5XG5RW1wiY2F0Y2hcIl0gPSBmdW5jdGlvbiAob2JqZWN0LCByZWplY3RlZCkge1xuICAgIHJldHVybiBRKG9iamVjdCkudGhlbih2b2lkIDAsIHJlamVjdGVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmZhaWwgPSAvLyBYWFggbGVnYWN5XG5Qcm9taXNlLnByb3RvdHlwZVtcImNhdGNoXCJdID0gZnVuY3Rpb24gKHJlamVjdGVkKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbih2b2lkIDAsIHJlamVjdGVkKTtcbn07XG5cbi8qKlxuICogQXR0YWNoZXMgYSBsaXN0ZW5lciB0aGF0IGNhbiByZXNwb25kIHRvIHByb2dyZXNzIG5vdGlmaWNhdGlvbnMgZnJvbSBhXG4gKiBwcm9taXNlJ3Mgb3JpZ2luYXRpbmcgZGVmZXJyZWQuIFRoaXMgbGlzdGVuZXIgcmVjZWl2ZXMgdGhlIGV4YWN0IGFyZ3VtZW50c1xuICogcGFzc2VkIHRvIGBgZGVmZXJyZWQubm90aWZ5YGAuXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2UgZm9yIHNvbWV0aGluZ1xuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgdG8gcmVjZWl2ZSBhbnkgcHJvZ3Jlc3Mgbm90aWZpY2F0aW9uc1xuICogQHJldHVybnMgdGhlIGdpdmVuIHByb21pc2UsIHVuY2hhbmdlZFxuICovXG5RLnByb2dyZXNzID0gcHJvZ3Jlc3M7XG5mdW5jdGlvbiBwcm9ncmVzcyhvYmplY3QsIHByb2dyZXNzZWQpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLnRoZW4odm9pZCAwLCB2b2lkIDAsIHByb2dyZXNzZWQpO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5wcm9ncmVzcyA9IGZ1bmN0aW9uIChwcm9ncmVzc2VkKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbih2b2lkIDAsIHZvaWQgMCwgcHJvZ3Jlc3NlZCk7XG59O1xuXG4vKipcbiAqIFByb3ZpZGVzIGFuIG9wcG9ydHVuaXR5IHRvIG9ic2VydmUgdGhlIHNldHRsaW5nIG9mIGEgcHJvbWlzZSxcbiAqIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciB0aGUgcHJvbWlzZSBpcyBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuICBGb3J3YXJkc1xuICogdGhlIHJlc29sdXRpb24gdG8gdGhlIHJldHVybmVkIHByb21pc2Ugd2hlbiB0aGUgY2FsbGJhY2sgaXMgZG9uZS5cbiAqIFRoZSBjYWxsYmFjayBjYW4gcmV0dXJuIGEgcHJvbWlzZSB0byBkZWZlciBjb21wbGV0aW9uLlxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayB0byBvYnNlcnZlIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlblxuICogcHJvbWlzZSwgdGFrZXMgbm8gYXJndW1lbnRzLlxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gcHJvbWlzZSB3aGVuXG4gKiBgYGZpbmBgIGlzIGRvbmUuXG4gKi9cblEuZmluID0gLy8gWFhYIGxlZ2FjeVxuUVtcImZpbmFsbHlcIl0gPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgIHJldHVybiBRKG9iamVjdClbXCJmaW5hbGx5XCJdKGNhbGxiYWNrKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmZpbiA9IC8vIFhYWCBsZWdhY3lcblByb21pc2UucHJvdG90eXBlW1wiZmluYWxseVwiXSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gUShjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmZjYWxsKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gVE9ETyBhdHRlbXB0IHRvIHJlY3ljbGUgdGhlIHJlamVjdGlvbiB3aXRoIFwidGhpc1wiLlxuICAgICAgICByZXR1cm4gY2FsbGJhY2suZmNhbGwoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRocm93IHJlYXNvbjtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFRlcm1pbmF0ZXMgYSBjaGFpbiBvZiBwcm9taXNlcywgZm9yY2luZyByZWplY3Rpb25zIHRvIGJlXG4gKiB0aHJvd24gYXMgZXhjZXB0aW9ucy5cbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZSBhdCB0aGUgZW5kIG9mIGEgY2hhaW4gb2YgcHJvbWlzZXNcbiAqIEByZXR1cm5zIG5vdGhpbmdcbiAqL1xuUS5kb25lID0gZnVuY3Rpb24gKG9iamVjdCwgZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRvbmUoZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykge1xuICAgIHZhciBvblVuaGFuZGxlZEVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIC8vIGZvcndhcmQgdG8gYSBmdXR1cmUgdHVybiBzbyB0aGF0IGBgd2hlbmBgXG4gICAgICAgIC8vIGRvZXMgbm90IGNhdGNoIGl0IGFuZCB0dXJuIGl0IGludG8gYSByZWplY3Rpb24uXG4gICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbWFrZVN0YWNrVHJhY2VMb25nKGVycm9yLCBwcm9taXNlKTtcbiAgICAgICAgICAgIGlmIChRLm9uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBRLm9uZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIEF2b2lkIHVubmVjZXNzYXJ5IGBuZXh0VGlja2BpbmcgdmlhIGFuIHVubmVjZXNzYXJ5IGB3aGVuYC5cbiAgICB2YXIgcHJvbWlzZSA9IGZ1bGZpbGxlZCB8fCByZWplY3RlZCB8fCBwcm9ncmVzcyA/XG4gICAgICAgIHRoaXMudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykgOlxuICAgICAgICB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmIHByb2Nlc3MgJiYgcHJvY2Vzcy5kb21haW4pIHtcbiAgICAgICAgb25VbmhhbmRsZWRFcnJvciA9IHByb2Nlc3MuZG9tYWluLmJpbmQob25VbmhhbmRsZWRFcnJvcik7XG4gICAgfVxuXG4gICAgcHJvbWlzZS50aGVuKHZvaWQgMCwgb25VbmhhbmRsZWRFcnJvcik7XG59O1xuXG4vKipcbiAqIENhdXNlcyBhIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQgaWYgaXQgZG9lcyBub3QgZ2V0IGZ1bGZpbGxlZCBiZWZvcmVcbiAqIHNvbWUgbWlsbGlzZWNvbmRzIHRpbWUgb3V0LlxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlXG4gKiBAcGFyYW0ge051bWJlcn0gbWlsbGlzZWNvbmRzIHRpbWVvdXRcbiAqIEBwYXJhbSB7QW55Kn0gY3VzdG9tIGVycm9yIG1lc3NhZ2Ugb3IgRXJyb3Igb2JqZWN0IChvcHRpb25hbClcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2UgaWYgaXQgaXNcbiAqIGZ1bGZpbGxlZCBiZWZvcmUgdGhlIHRpbWVvdXQsIG90aGVyd2lzZSByZWplY3RlZC5cbiAqL1xuUS50aW1lb3V0ID0gZnVuY3Rpb24gKG9iamVjdCwgbXMsIGVycm9yKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS50aW1lb3V0KG1zLCBlcnJvcik7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aW1lb3V0ID0gZnVuY3Rpb24gKG1zLCBlcnJvcikge1xuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgdmFyIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIWVycm9yIHx8IFwic3RyaW5nXCIgPT09IHR5cGVvZiBlcnJvcikge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoZXJyb3IgfHwgXCJUaW1lZCBvdXQgYWZ0ZXIgXCIgKyBtcyArIFwiIG1zXCIpO1xuICAgICAgICAgICAgZXJyb3IuY29kZSA9IFwiRVRJTUVET1VUXCI7XG4gICAgICAgIH1cbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcbiAgICB9LCBtcyk7XG5cbiAgICB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHZhbHVlKTtcbiAgICB9LCBmdW5jdGlvbiAoZXhjZXB0aW9uKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXhjZXB0aW9uKTtcbiAgICB9LCBkZWZlcnJlZC5ub3RpZnkpO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgZ2l2ZW4gdmFsdWUgKG9yIHByb21pc2VkIHZhbHVlKSwgc29tZVxuICogbWlsbGlzZWNvbmRzIGFmdGVyIGl0IHJlc29sdmVkLiBQYXNzZXMgcmVqZWN0aW9ucyBpbW1lZGlhdGVseS5cbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZVxuICogQHBhcmFtIHtOdW1iZXJ9IG1pbGxpc2Vjb25kc1xuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gcHJvbWlzZSBhZnRlciBtaWxsaXNlY29uZHNcbiAqIHRpbWUgaGFzIGVsYXBzZWQgc2luY2UgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2UuXG4gKiBJZiB0aGUgZ2l2ZW4gcHJvbWlzZSByZWplY3RzLCB0aGF0IGlzIHBhc3NlZCBpbW1lZGlhdGVseS5cbiAqL1xuUS5kZWxheSA9IGZ1bmN0aW9uIChvYmplY3QsIHRpbWVvdXQpIHtcbiAgICBpZiAodGltZW91dCA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHRpbWVvdXQgPSBvYmplY3Q7XG4gICAgICAgIG9iamVjdCA9IHZvaWQgMDtcbiAgICB9XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kZWxheSh0aW1lb3V0KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24gKHRpbWVvdXQpIHtcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUodmFsdWUpO1xuICAgICAgICB9LCB0aW1lb3V0KTtcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFBhc3NlcyBhIGNvbnRpbnVhdGlvbiB0byBhIE5vZGUgZnVuY3Rpb24sIHdoaWNoIGlzIGNhbGxlZCB3aXRoIHRoZSBnaXZlblxuICogYXJndW1lbnRzIHByb3ZpZGVkIGFzIGFuIGFycmF5LCBhbmQgcmV0dXJucyBhIHByb21pc2UuXG4gKlxuICogICAgICBRLm5mYXBwbHkoRlMucmVhZEZpbGUsIFtfX2ZpbGVuYW1lXSlcbiAqICAgICAgLnRoZW4oZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAqICAgICAgfSlcbiAqXG4gKi9cblEubmZhcHBseSA9IGZ1bmN0aW9uIChjYWxsYmFjaywgYXJncykge1xuICAgIHJldHVybiBRKGNhbGxiYWNrKS5uZmFwcGx5KGFyZ3MpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubmZhcHBseSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmdzKTtcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgdGhpcy5mYXBwbHkobm9kZUFyZ3MpLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbn07XG5cbi8qKlxuICogUGFzc2VzIGEgY29udGludWF0aW9uIHRvIGEgTm9kZSBmdW5jdGlvbiwgd2hpY2ggaXMgY2FsbGVkIHdpdGggdGhlIGdpdmVuXG4gKiBhcmd1bWVudHMgcHJvdmlkZWQgaW5kaXZpZHVhbGx5LCBhbmQgcmV0dXJucyBhIHByb21pc2UuXG4gKiBAZXhhbXBsZVxuICogUS5uZmNhbGwoRlMucmVhZEZpbGUsIF9fZmlsZW5hbWUpXG4gKiAudGhlbihmdW5jdGlvbiAoY29udGVudCkge1xuICogfSlcbiAqXG4gKi9cblEubmZjYWxsID0gZnVuY3Rpb24gKGNhbGxiYWNrIC8qLi4uYXJncyovKSB7XG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBRKGNhbGxiYWNrKS5uZmFwcGx5KGFyZ3MpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubmZjYWxsID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcbiAgICB0aGlzLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufTtcblxuLyoqXG4gKiBXcmFwcyBhIE5vZGVKUyBjb250aW51YXRpb24gcGFzc2luZyBmdW5jdGlvbiBhbmQgcmV0dXJucyBhbiBlcXVpdmFsZW50XG4gKiB2ZXJzaW9uIHRoYXQgcmV0dXJucyBhIHByb21pc2UuXG4gKiBAZXhhbXBsZVxuICogUS5uZmJpbmQoRlMucmVhZEZpbGUsIF9fZmlsZW5hbWUpKFwidXRmLThcIilcbiAqIC50aGVuKGNvbnNvbGUubG9nKVxuICogLmRvbmUoKVxuICovXG5RLm5mYmluZCA9XG5RLmRlbm9kZWlmeSA9IGZ1bmN0aW9uIChjYWxsYmFjayAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBiYXNlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGVBcmdzID0gYmFzZUFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpO1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgICAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgICAgIFEoY2FsbGJhY2spLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubmZiaW5kID1cblByb21pc2UucHJvdG90eXBlLmRlbm9kZWlmeSA9IGZ1bmN0aW9uICgvKi4uLmFyZ3MqLykge1xuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcbiAgICBhcmdzLnVuc2hpZnQodGhpcyk7XG4gICAgcmV0dXJuIFEuZGVub2RlaWZ5LmFwcGx5KHZvaWQgMCwgYXJncyk7XG59O1xuXG5RLm5iaW5kID0gZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzcCAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBiYXNlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGVBcmdzID0gYmFzZUFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpO1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgICAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgICAgIGZ1bmN0aW9uIGJvdW5kKCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KHRoaXNwLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgICAgIFEoYm91bmQpLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubmJpbmQgPSBmdW5jdGlvbiAoLyp0aGlzcCwgLi4uYXJncyovKSB7XG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDApO1xuICAgIGFyZ3MudW5zaGlmdCh0aGlzKTtcbiAgICByZXR1cm4gUS5uYmluZC5hcHBseSh2b2lkIDAsIGFyZ3MpO1xufTtcblxuLyoqXG4gKiBDYWxscyBhIG1ldGhvZCBvZiBhIE5vZGUtc3R5bGUgb2JqZWN0IHRoYXQgYWNjZXB0cyBhIE5vZGUtc3R5bGVcbiAqIGNhbGxiYWNrIHdpdGggYSBnaXZlbiBhcnJheSBvZiBhcmd1bWVudHMsIHBsdXMgYSBwcm92aWRlZCBjYWxsYmFjay5cbiAqIEBwYXJhbSBvYmplY3QgYW4gb2JqZWN0IHRoYXQgaGFzIHRoZSBuYW1lZCBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIG1ldGhvZCBvZiBvYmplY3RcbiAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZDsgdGhlIGNhbGxiYWNrXG4gKiB3aWxsIGJlIHByb3ZpZGVkIGJ5IFEgYW5kIGFwcGVuZGVkIHRvIHRoZXNlIGFyZ3VtZW50cy5cbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHZhbHVlIG9yIGVycm9yXG4gKi9cblEubm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXG5RLm5wb3N0ID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSwgYXJncykge1xuICAgIHJldHVybiBRKG9iamVjdCkubnBvc3QobmFtZSwgYXJncyk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5ubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcblByb21pc2UucHJvdG90eXBlLm5wb3N0ID0gZnVuY3Rpb24gKG5hbWUsIGFyZ3MpIHtcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmdzIHx8IFtdKTtcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcbiAgICB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgbm9kZUFyZ3NdKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG4vKipcbiAqIENhbGxzIGEgbWV0aG9kIG9mIGEgTm9kZS1zdHlsZSBvYmplY3QgdGhhdCBhY2NlcHRzIGEgTm9kZS1zdHlsZVxuICogY2FsbGJhY2ssIGZvcndhcmRpbmcgdGhlIGdpdmVuIHZhcmlhZGljIGFyZ3VtZW50cywgcGx1cyBhIHByb3ZpZGVkXG4gKiBjYWxsYmFjayBhcmd1bWVudC5cbiAqIEBwYXJhbSBvYmplY3QgYW4gb2JqZWN0IHRoYXQgaGFzIHRoZSBuYW1lZCBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIG1ldGhvZCBvZiBvYmplY3RcbiAqIEBwYXJhbSAuLi5hcmdzIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBtZXRob2Q7IHRoZSBjYWxsYmFjayB3aWxsXG4gKiBiZSBwcm92aWRlZCBieSBRIGFuZCBhcHBlbmRlZCB0byB0aGVzZSBhcmd1bWVudHMuXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSB2YWx1ZSBvciBlcnJvclxuICovXG5RLm5zZW5kID0gLy8gWFhYIEJhc2VkIG9uIE1hcmsgTWlsbGVyJ3MgcHJvcG9zZWQgXCJzZW5kXCJcblEubm1jYWxsID0gLy8gWFhYIEJhc2VkIG9uIFwiUmVkc2FuZHJvJ3NcIiBwcm9wb3NhbFxuUS5uaW52b2tlID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgbm9kZUFyZ3NdKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5uc2VuZCA9IC8vIFhYWCBCYXNlZCBvbiBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIFwic2VuZFwiXG5Qcm9taXNlLnByb3RvdHlwZS5ubWNhbGwgPSAvLyBYWFggQmFzZWQgb24gXCJSZWRzYW5kcm8nc1wiIHByb3Bvc2FsXG5Qcm9taXNlLnByb3RvdHlwZS5uaW52b2tlID0gZnVuY3Rpb24gKG5hbWUgLyouLi5hcmdzKi8pIHtcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xuICAgIHRoaXMuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBub2RlQXJnc10pLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbn07XG5cbi8qKlxuICogSWYgYSBmdW5jdGlvbiB3b3VsZCBsaWtlIHRvIHN1cHBvcnQgYm90aCBOb2RlIGNvbnRpbnVhdGlvbi1wYXNzaW5nLXN0eWxlIGFuZFxuICogcHJvbWlzZS1yZXR1cm5pbmctc3R5bGUsIGl0IGNhbiBlbmQgaXRzIGludGVybmFsIHByb21pc2UgY2hhaW4gd2l0aFxuICogYG5vZGVpZnkobm9kZWJhY2spYCwgZm9yd2FyZGluZyB0aGUgb3B0aW9uYWwgbm9kZWJhY2sgYXJndW1lbnQuICBJZiB0aGUgdXNlclxuICogZWxlY3RzIHRvIHVzZSBhIG5vZGViYWNrLCB0aGUgcmVzdWx0IHdpbGwgYmUgc2VudCB0aGVyZS4gIElmIHRoZXkgZG8gbm90XG4gKiBwYXNzIGEgbm9kZWJhY2ssIHRoZXkgd2lsbCByZWNlaXZlIHRoZSByZXN1bHQgcHJvbWlzZS5cbiAqIEBwYXJhbSBvYmplY3QgYSByZXN1bHQgKG9yIGEgcHJvbWlzZSBmb3IgYSByZXN1bHQpXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBub2RlYmFjayBhIE5vZGUuanMtc3R5bGUgY2FsbGJhY2tcbiAqIEByZXR1cm5zIGVpdGhlciB0aGUgcHJvbWlzZSBvciBub3RoaW5nXG4gKi9cblEubm9kZWlmeSA9IG5vZGVpZnk7XG5mdW5jdGlvbiBub2RlaWZ5KG9iamVjdCwgbm9kZWJhY2spIHtcbiAgICByZXR1cm4gUShvYmplY3QpLm5vZGVpZnkobm9kZWJhY2spO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5ub2RlaWZ5ID0gZnVuY3Rpb24gKG5vZGViYWNrKSB7XG4gICAgaWYgKG5vZGViYWNrKSB7XG4gICAgICAgIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG5vZGViYWNrKG51bGwsIHZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG5vZGViYWNrKGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59O1xuXG5RLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJRLm5vQ29uZmxpY3Qgb25seSB3b3JrcyB3aGVuIFEgaXMgdXNlZCBhcyBhIGdsb2JhbFwiKTtcbn07XG5cbi8vIEFsbCBjb2RlIGJlZm9yZSB0aGlzIHBvaW50IHdpbGwgYmUgZmlsdGVyZWQgZnJvbSBzdGFjayB0cmFjZXMuXG52YXIgcUVuZGluZ0xpbmUgPSBjYXB0dXJlTGluZSgpO1xuXG5yZXR1cm4gUTtcblxufSk7XG4iXX0=
},{"_process":1}],7:[function(require,module,exports){
var Q = require('q');
var EventEmitter = require('node-event-emitter');
var inherits = require('inherits');

//////////////////////////////////////////////////////////////
/////////////////// Logging utility methods //////////////////
//////////////////////////////////////////////////////////////

var DEBUG = false;
var Logger = {
	log: function(message){
		if(DEBUG) console.log(message);
	},

	error: function(message){
		if(DEBUG) console.error(message);
	}
}

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////


function DiyaNode(){
	EventEmitter.call(this);

	this._status = 'closed';
	this._addr = null;
	this._socket = null;
	this._nextId = 0;
	this._connectionDeferred = null;
	this._disconnectionDeferred = null;
	this._pendingMessages = [];
	this._peers = [];
	this._reconnectTimeout = 1000;
	this._connectTimeout = 5000;
}
inherits(DiyaNode, EventEmitter);

////////////////////////////////////////////////////
////////////////// Public API //////////////////////
////////////////////////////////////////////////////

DiyaNode.prototype.connect = function(addr, WSocket){
	var that = this;

	if(this._addr === addr){
		if(this._status === 'opened')
			return Q();
		else if(this._connectionDeferred && !this._connectionDeferred.promise.isFulfilled())
			return this._connectionDeferred.promise;
	}

	return this.close().then(function(){

		Logger.log('d1: connect');

		that._addr = addr;

		that._connectionDeferred = Q.defer();

		if(!WSocket) WSocket = window.WebSocket;
		that._WSocket = WSocket;

		that._socket = new WSocket(that._addr);

		that._socketOpenCallback = that._onopen.bind(that);
		that._socketCloseCallback = that._onclose.bind(that);
		that._socketMessageCallback = that._onmessage.bind(that);

		that._socket.addEventListener('open', that._socketOpenCallback);
		that._socket.addEventListener('close',that._socketCloseCallback);
		that._socket.addEventListener('message', that._socketMessageCallback);


		that._socket.addEventListener('error', function(err){
			Logger.error("[WS] error : "+err);
		});

		setTimeout(function(){
			if(that._status !== 'opened'){
				Logger.log('d1: timed out while connecting');
				that._socket.close();
			}
		}, that._connectTimeout);

		return that._connectionDeferred.promise;
	});
};

DiyaNode.prototype.close = function(){

	this._stopPingResponse();

	if(this._disconnectionDeferred) return this._disconnectionDeferred.promise;

	else if(this._socket && this._status === 'opened'){
		this._disconnectionDeferred = new Q.defer();
		this._socket.close();
		return this._disconnectionDeferred.promise;
	}

	else if(this._status === 'closed'){
		return Q();
	}

	else{
		return Q();
	}
};

DiyaNode.prototype.isConnected = function(){
	return (this._socket && this._socket.readyState == this._WSocket.OPEN && this._status === 'opened');
};

DiyaNode.prototype.request = function(params, callback, timeout){
	var that = this;

	if(!params.service) {
		Logger.error('No service defined for request !');
		return ;
	}

	var message = this._createMessage(params, "Request");
	this._appendMessage(message, callback);

	if(!isNaN(timeout) && timeout > 0){
		setTimeout(function(){
			var handler = that._removeMessage(message.id);
			if(handler) that._notifyListener(handler, 'Timeout exceeded ('+timeout+'ms) !');
		}, timeout);
	}

	if(!this._send(message)){
		this._removeMessage(message.id);
		Logger.error('Cannot send request !');
		return false;
	}

	return true;
};

DiyaNode.prototype.subscribe = function(params, callback){
	if(!params.service){
		Logger.error('No service defined for subscription !');
		return ;
	}

	var message = this._createMessage(params, "Subscription");
	this._appendMessage(message, callback);

	if(!this._send(message)){
		this._removeMessage(message.id);
		Logger.error('Cannot send subscription !');
		return -1;
	}

	return message.id;
};

DiyaNode.prototype.unsubscribe = function(subId){
	if(this._pendingMessages[subId] && this._pendingMessages[subId].type === "Subscription"){
		var subscription = this._removeMessage(subId);

		var message = this._createMessage({
			target: subscription.target,
			data: {
				subId: subId
			}
		}, "Unsubscribe");

		if(!this._send(message)){
			Logger.error('Cannot send unsubscribe !');
			return false;
		}

		return true;
	}
};

DiyaNode.prototype.peers = function(){
	return this._peers;
}

///////////////////////////////////////////////////////////
//////////////////// Internal methods /////////////////////
///////////////////////////////////////////////////////////

DiyaNode.prototype._appendMessage = function(message, callback){
	this._pendingMessages[message.id] = {
		callback: callback,
		type: message.type,
		target: message.target
	};
};

DiyaNode.prototype._removeMessage = function(messageId){
	var handler = this._pendingMessages[messageId];
	if(handler){
		delete this._pendingMessages[messageId];
		return handler;
	}else{
		return null;
	}
};

DiyaNode.prototype._clearMessages = function(err, data){
	for(var messageId in this._pendingMessages){
		var handler = this._removeMessage(messageId);
		this._notifyListener(handler, err, data);
	}
};

DiyaNode.prototype._clearPeers = function(){
	while(this._peers.length) this.emit('peer-disconnected', this._peers.pop());
}

DiyaNode.prototype._getMessageHandler = function(messageId){
	var handler = this._pendingMessages[messageId];
	return handler ? handler : null;
};

DiyaNode.prototype._notifyListener = function(handler, error, data){
	if(handler && typeof handler.callback === 'function') {
		error = error ? error : null;
		data = data ? data : null;
		handler.callback(error, data);
	}
};

DiyaNode.prototype._send = function(message){
	try{
		var data = JSON.stringify(message);
	}catch(err){
		Logger.error('Cannot serialize message');
		return false;
	}

	try{
		this._socket.send(data);
	}catch(err){
		Logger.error('Cannot send message');
		Logger.error(err);
		return false;
	}

	return true;
};

DiyaNode.prototype._setupPingResponse = function(){
	var that = this;

	this._pingTimeout = 15000;
	this._lastPing = new Date().getTime();

	function checkPing(){
		var curTime = new Date().getTime();
		if(curTime - that._lastPing > that._pingTimeout){
			that._forceClose();
			Logger.log("d1: connection timed out !");
		}else{
			Logger.log("d1: last ping ok");
			that._pingSetTimeoutId = setTimeout(checkPing, Math.round(that._pingTimeout / 2.1));
		}
	}

	checkPing();
};

DiyaNode.prototype._stopPingResponse = function(){
	clearTimeout(this._pingSetTimeoutId);
};

DiyaNode.prototype._forceClose = function(){
	this._socket.close();
	this._onclose();
}

///////////////////////////////////////////////////////////////
/////////////////// Socket event handlers /////////////////////
///////////////////////////////////////////////////////////////


DiyaNode.prototype._onopen = function(){
	this._setupPingResponse();
};


DiyaNode.prototype._onmessage = function(evt){
	try{
		var message = JSON.parse(evt.data);
	}catch(err){
		Logger.error("[WS] cannot parse message, dropping...");
		return ;
	}

	if(isNaN(message.id)) {
		this._handleInternalMessage(message);
	}else{
		var handler = this._getMessageHandler(message.id);
		if(handler){
			switch(handler.type){
				case "Request":
					this._handleRequest(handler, message);
					break;
				case "Subscription":
					this._handleSubscription(handler, message);
					break;
			}
		}
	}
};

DiyaNode.prototype._onclose = function(){
	var that = this;

	if(this._socket && (typeof this._socket.removeEventListener === 'function')){
		this._socket.removeEventListener('open', this._socketOpenCallback);
		this._socket.removeEventListener('close', this._socketCloseCallback);
		this._socket.removeEventListener('message', this._socketMessageCallback);
	}else if(this._socket && (typeof this._socket.removeAllListeners === 'function')){
		this._socket.removeAllListeners();
	}

	Logger.log("d1: on close");

	this._stopPingResponse();

	this._clearMessages('PeerDisconnected');
	this._clearPeers();
	this._status = 'closed';

	if(this._connectionDeferred){
		Logger.log('d1: connection failed');
		this._connectionDeferred.reject("d1: connection failed");
		this._connectionDeferred = null;
	}

	//if close was requested, resolve promise
	if(this._disconnectionDeferred){
		Logger.log('d1: disconnection done');
		this._disconnectionDeferred.resolve();
		this._disconnectionDeferred = null;
	}
	//Otherwise, try to reconnect
	else{
		Logger.log('d1: connection lost, try reconnecting');
		setTimeout(function(){
			that.connect(that._addr, that._WSocket).catch(function(err){
				
			});
		}, that._reconnectTimeout);
	}

	this.emit('close', this._addr);
};

/////////////////////////////////////////////////////////////
/////////////// Protocol event handlers /////////////////////
/////////////////////////////////////////////////////////////

DiyaNode.prototype._handleInternalMessage = function(message){
	switch(message.type){
		case "PeerConnected":
			this._handlePeerConnected(message);
			break;
		case "PeerDisconnected":
			this._handlePeerDisconnected(message);
			break;
		case "Handshake":
			this._handleHandshake(message);
			break;
		case "Ping":
			this._handlePing(message);
			break;
	}
};

DiyaNode.prototype._handlePing = function(message){
	message.type = "Pong";

	this._lastPing = new Date().getTime();

	this._send(message);
};

DiyaNode.prototype._handleHandshake = function(message){
	if(message.peers === undefined){
		Logger.error("Missing argumnents for Handshake message, dropping...");
		return ;
	}

	for(var i=0;i<message.peers.length; i++){
		this._peers.push(message.peers[i]);
		this.emit('peer-connected', message.peers[i]);
	}

	if(this._connectionDeferred && !this._connectionDeferred.promise.isFulfilled()){
		this._connectionDeferred.resolve();
		this.emit('open', this._addr);
		this._status = 'opened';
		this._connectionDeferred = null;
	}
};

DiyaNode.prototype._handlePeerConnected = function(message){
	if(message.peerId === undefined){
		Logger.error("Missing arguments for PeerConnected message, dropping...");
		return ;
	}

	//Add peer to the list of reachable peers
	this._peers.push(message.peerId);

	this.emit('peer-connected', message.peerId);
};

DiyaNode.prototype._handlePeerDisconnected = function(message){
	if(message.peerId === undefined){
		Logger.error("Missing arguments for PeerDisconnected Message, dropping...");
		return ;
	}

	//Go through all pending messages and notify the ones that are targeted
	//at the disconnected peer that it disconnected and therefore the command
	//cannot be fulfilled
	for(var messageId in this._pendingMessages){
		var handler = this._getMessageHandler(messageId);
		if(handler && handler.target === message.peerId) {
			this._removeMessage(messageId);
			this._notifyListener(handler, 'PeerDisconnected', null);
		}
	}

	//Remove peer from list of reachable peers
	for(var i=this._peers.length - 1; i >= 0; i--){
		if(this._peers[i] === message.peerId){
			this._peers.splice(i, 1);
			break;
		}
	}

	this.emit('peer-disconnected', message.peerId);
};

DiyaNode.prototype._handleRequest = function(handler, message){
	this._removeMessage(message.id);
	this._notifyListener(handler, message.error, message.data);
};

DiyaNode.prototype._handleSubscription = function(handler, message){
	//remove subscription if it was closed from node
	if(message.result === "closed") {
		this._removeMessage(message.id);
		message.error = 'SubscriptionClosed';
	}
	this._notifyListener(handler, message.error, message.data ? message.data : null);
};

///////////////////////////////////////////////////////////////
////////////////////// Utility methods ////////////////////////
///////////////////////////////////////////////////////////////

DiyaNode.prototype._createMessage = function(params, type){
	if(!params || !type || (type !== "Request" && type !== "Subscription" && type !== "Unsubscribe")){
		return null;
	}

	return {
		type: type,
		id: this._generateId(),
		service: params.service,
		target: params.target,
		token: params.token,
		func: params.func,
		obj: params.obj,
		data: params.data
	}
};

DiyaNode.prototype._generateId = function(){
	var id = this._nextId;
	this._nextId++;
	return id;
};



module.exports = DiyaNode;

},{"inherits":4,"node-event-emitter":5,"q":6}],8:[function(require,module,exports){
var Q = require('q');
var EventEmitter = require('node-event-emitter');
var inherits = require('inherits');

var DiyaNode = require('./DiyaNode');

var connection = new DiyaNode();
var connectionEvents = new EventEmitter();
var token = null;

function d1(selector){
	return new DiyaSelector(selector);
}


d1.DiyaNode = DiyaNode;
d1.DiyaSelector = DiyaSelector;

d1.connect = function(addr, WSocket){
	return connection.connect(addr, WSocket);
};

d1.disconnect = function(){
	token = null;
	return connection.close();
};

d1.currentServer = function(){
	return connection._addr;
}

d1.on = function(event, callback){
	connection.on(event, callback);
	return d1;
};

d1.deauthenticate = function(){
	token = null;
};

function DiyaSelector(selector){
	EventEmitter.call(this);

	this._selector = selector;
	this._listenerCount = 0;
	this._listenCallback = null;
	this._callbackAttached = false;
}
inherits(DiyaSelector, EventEmitter);


function match(selector, str){
	if(!selector) return false;
	else if(selector.constructor.name === 'String'){
		return matchString(selector, str);
	}else if(selector.constructor.name === 'RegExp'){
		return matchRegExp(selector, str);
	}else if(Array.isArray(selector)){
		return matchArray(selector, str);
	}
	return false;
}

function matchString(selector, str){
	return selector === str;
}

function matchRegExp(selector, str){
	return str.match(selector);
}

function matchArray(selector, str){
	for(var i=0;i<selector.length; i++){
		if(selector[i] === str) return true;
	}
	return false;
}


DiyaSelector.prototype._select = function(selectorFunction){
	var that = this;

	if(!connection) return [];
	return connection.peers().filter(function(peerId){
		return match(that._selector, peerId);
	});
};

DiyaSelector.prototype._addConnectionListener = function(){
	if(this._listenerCount === 0){
		this._attachListenCallback();
	}
	this._listenerCount++;
};

DiyaSelector.prototype._removeConnectionListener = function(){
	if(this._listenerCount === 0) return ;
	this._listenerCount--;
	if(this._listenerCount === 0){
		this._detachListenCallback();
	}
};

DiyaSelector.prototype._attachListenCallback = function(){

	this._connectedCallback = this._handlePeerConnected.bind(this);
	this._disconnectedCallback = this._handlePeerDisconnected.bind(this);

	connection.on('peer-connected', this._connectedCallback);
	connection.on('peer-disconnected', this._disconnectedCallback);

	if(connection.isConnected()){
		var peers = connection.peers();
		for(var i=0;i<peers.length; i++){
			this._handlePeerConnected(peers[i]);
		}
	}
};

DiyaSelector.prototype._detachListenCallback = function(){
	connection.removeListener('peer-connected', this._connectedCallback);
	connection.removeListener('peer-disconnected', this._disconnectedCallback);
};

DiyaSelector.prototype._handlePeerConnected = function(peerId){
	if(match(this._selector, peerId)) {
		this.emit('peer-connected', peerId);
	}
};

DiyaSelector.prototype._handlePeerDisconnected = function(peerId){
	if(match(this._selector, peerId)) {
		this.emit('peer-disconnected', peerId);
	}
}

//////////////////////////////////////////////////////////
////////////////////// Public API ////////////////////////
//////////////////////////////////////////////////////////


DiyaSelector.prototype.listen = function(){
	this._addConnectionListener();
	return this;
};

DiyaSelector.prototype.each = function(cb){
	var peers = this._select();
	for(var i=0; i<peers.length; i++) cb.bind(this)(peers[i]);
	return this;
};

DiyaSelector.prototype.request = function(params, callback, timeout){
	if(!connection) return this;

	return this.each(function(peerId){
		params.target = peerId;
		params.token = token;
		connection.request(params, function(err, data){
			if(typeof callback === 'function') callback(peerId, err, data);
		}, timeout);
	});
};

DiyaSelector.prototype.subscribe = function(params, callback, options){

	function doSubscribe(peerId){
		params.target = peerId;
		params.token = token;
		var subId = connection.subscribe(params, function(err, data){
			callback(peerId, err, data);
		});
		if(options && Array.isArray(options.subIds))
			options.subIds[peerId] = subId;
	}

	//send subscription to all selected peer
	this.each(doSubscribe);
	if(options && options.auto){
		this._addConnectionListener();
		this.on('peer-connected', doSubscribe);
	}
	return this;
};

DiyaSelector.prototype.unsubscribe = function(subIds){
	this.each(function(peerId){
		var subId = subIds[peerId];
		if(subId) connection.unsubscribe(subId);
	});
	this._removeConnectionListener();
	return this;
};

DiyaSelector.prototype.auth = function(user, password, callback, timeout){
	if(typeof callback === 'function')
		callback = callback.bind(this);

	return this.request({
		service: 'auth',
		func: 'Authenticate',
		data: {
			user: user,
			password: password
		}
	}, function(peerId, err, data){

		if(err === 'ServiceNotFound'){
			if(typeof callback === 'function') callback(peerId, true);
			return ;
		}

		if(!err && data && data.authenticated && data.token){
			token = data.token;
			if(typeof callback === 'function') callback(peerId, true);
		}else {
			if(typeof callback === 'function') callback(peerId, false);
		}

	}, timeout);
};

module.exports = d1;

},{"./DiyaNode":7,"inherits":4,"node-event-emitter":5,"q":6}],9:[function(require,module,exports){
var d1 = require('./DiyaSelector.js');

require('./services/timer/timer.js');
require('./services/rtc/rtc.js');
require('./services/update/update.js');
require('./services/explorer/explorer.js');
require('./services/pico/pico.js');
require('./services/viewer_explorer/viewer_explorer.js');
require('./services/ieq/ieq.js');
require('./services/networkId/NetworkId.js');
require('./services/maps/maps.js');

module.exports = d1;

},{"./DiyaSelector.js":8,"./services/explorer/explorer.js":10,"./services/ieq/ieq.js":11,"./services/maps/maps.js":12,"./services/networkId/NetworkId.js":14,"./services/pico/pico.js":15,"./services/rtc/rtc.js":16,"./services/timer/timer.js":17,"./services/update/update.js":18,"./services/viewer_explorer/viewer_explorer.js":19}],10:[function(require,module,exports){
/* maya-client
 *
 * Copyright (c) 2014, Partnering Robotics, All rights reserved.
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; version
 *  3.0 of the License. This library is distributed in the hope
 * that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
 * PURPOSE. See the GNU Lesser General Public License for more details.
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library.
 */
DiyaSelector = require('../../DiyaSelector').DiyaSelector;

function explorer(node){
	var that = this;
	this.node = node;
	return this;
}

DiyaSelector.prototype.listFiles = function(file, callback){	//add a path in data to list files in THIS path
	this.request({
		service: 'explorer',
		func: 'ListFiles',
		 data: {elt: file}
	}, function(peerId, err, data){
     		
			if(data){
				callback(peerId, null, data);
			}
			else if(err){
				callback(peerId, err, null);
			}
		});
		return this;
};

DiyaSelector.prototype.openFile = function(file, type, callback){
		this.request({
			service: 'explorer',
			func: 'OpenFile',
			data:{
				file: file,
				type: type
			}
		}, function(peerId, err, data){
			callback(peerId, null, data);
		});

		return this;
};



var exp = {
		explorer: explorer
}

module.exports = exp;

},{"../../DiyaSelector":8}],11:[function(require,module,exports){
/* maya-client
 * Copyright (c) 2014, Partnering Robotics, All rights reserved.
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; version
 *	3.0 of the License. This library is distributed in the hope
 * that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
 * PURPOSE. See the GNU Lesser General Public License for more details.
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library.
 */

/**
   Todo :
   check err for each data
   improve API : getData(sensorName, dataConfig)
   return adapted vector for display with D3 to reduce code in IHM ?
   updateData(sensorName, dataConfig)
   set and get for the different dataConfig params

*/

DiyaSelector = require('../../DiyaSelector').DiyaSelector;
var util = require('util');


var Message = require('../message');

/**
 *	callback : function called after model updated
 * */
function IEQ(selector){
	var that = this;
	this.selector = selector;
	this.dataModel={};


	/*** structure of data config ***
		 criteria :
		   time: all 3 time criteria should not be defined at the same time. (range would be given up)
		     beg: {[null],time} (null means most recent) // stored a UTC in ms (num)
		     end: {[null], time} (null means most oldest) // stored as UTC in ms (num)
		     range: {[null], time} (range of time(positive) ) // in s (num)
		   robot: {ArrayOf ID or ["all"]}
		   place: {ArrayOf ID or ["all"]}
		 operator: {[last], max, moy, sd} -( maybe moy should be default
		 ...

		 sensors : {[null] or ArrayOf SensorName}

		 sampling: {[null] or int}
	*/
	this.dataConfig = {
		criteria: {
			time: {
				beg: null,
				end: null,
				range: null // in s
			},
			robot: null,
			place: null
		},
		operator: 'last',
		sensors: null,
		sampling: null //sampling
	};

	return this;
};
/**
 * Get dataModel :
 * {
 *	"senseurXX": {
 *			data:[FLOAT, ...],
 *			time:[FLOAT, ...],
 *			robot:[FLOAT, ...],
 *			place:[FLOAT, ...],
 *			qualityIndex:[FLOAT, ...],
 *			range: [FLOAT, FLOAT],
 *			unit: string,
 *		label: string
 *		},
 *	 ... ("senseursYY")
 * }
 */
IEQ.prototype.getDataModel = function(){
	return this.dataModel;
};
IEQ.prototype.getDataRange = function(){
	return this.dataModel.range;
};

/**
 * @param {Object} dataConfig config for data request
 * if dataConfig is define : set and return this
 *	 @return {IEQ} this
 * else
 *	 @return {Object} current dataConfig
 */
IEQ.prototype.DataConfig = function(newDataConfig){
	if(newDataConfig) {
		this.dataConfig=newDataConfig;
		return this;
	}
	else
		return this.dataConfig;
};
/**
 * TO BE IMPLEMENTED : operator management in DN-IEQ
 * @param  {String}	 newOperator : {[last], max, moy, sd}
 * @return {IEQ} this - chainable
 * Set operator criteria.
 * Depends on newOperator
 *	@param {String} newOperator
 *	@return this
 * Get operator criteria.
 *	@return {String} operator
 */
IEQ.prototype.DataOperator = function(newOperator){
	if(newOperator) {
		this.dataConfig.operator = newOperator;
		return this;
	}
	else
		return this.dataConfig.operator;
};
/**
 * Depends on numSamples
 * @param {int} number of samples in dataModel
 * if defined : set number of samples
 *	@return {IEQ} this
 * else
 *	@return {int} number of samples
 **/
IEQ.prototype.DataSampling = function(numSamples){
	if(numSamples) {
		this.dataConfig.sampling = numSamples;
		return this;
	}
	else
		return this.dataConfig.sampling;
};
/**
 * Set or get data time criteria beg and end.
 * If param defined
 *	@param {Date} newTimeBeg // may be null
 *	@param {Date} newTimeEnd // may be null
 *	@return {IEQ} this
 * If no param defined:
 *	@return {Object} Time object: fields beg and end.
 */
IEQ.prototype.DataTime = function(newTimeBeg,newTimeEnd, newRange){
	if(newTimeBeg || newTimeEnd || newRange) {
		this.dataConfig.criteria.time.beg = newTimeBeg.getTime();
		this.dataConfig.criteria.time.end = newTimeEnd.getTime();
		this.dataConfig.criteria.time.range = newRange;
		return this;
	}
	else
		return {
			beg: new Date(this.dataConfig.criteria.time.beg),
			end: new Date(this.dataConfig.criteria.time.end),
			range: new Date(this.dataConfig.criteria.time.range)
		};
};
/**
 * Depends on robotIds
 * Set robot criteria.
 *	@param {Array[Int]} robotIds list of robot Ids
 * Get robot criteria.
 *	@return {Array[Int]} list of robot Ids
 */
IEQ.prototype.DataRobotIds = function(robotIds){
	if(robotIds) {
		this.dataConfig.criteria.robot = robotIds;
		return this;
	}
	else
		return this.dataConfig.criteria.robot;
};
/**
 * Depends on placeIds
 * Set place criteria.
 *	@param {Array[Int]} placeIds list of place Ids
 * Get place criteria.
 *	@return {Array[Int]} list of place Ids
 */
IEQ.prototype.DataPlaceIds = function(placeIds){
	if(placeIds) {
		this.dataConfig.criteria.placeId = placeIds;
		return this;
	}
	else
		return this.dataConfig.criteria.place;
};
/**
 * Get data by sensor name.
 *	@param {Array[String]} sensorName list of sensors
 */
IEQ.prototype.getDataByName = function(sensorNames){
	var data=[];
	for(var n in sensorNames) {
		data.push(this.dataModel[sensorNames[n]]);
	}
	return data;
};
/**
 * Update data given dataConfig.
 * @param {func} callback : called after update
 * TODO USE PROMISE
 */
IEQ.prototype.updateData = function(callback, dataConfig){
	var that=this;
	if(dataConfig)
		this.DataConfig(dataConfig);
	// console.log("Request: "+JSON.stringify(dataConfig));
	this.selector.request({
		service: "ieq",
		func: "DataRequest",
		data: {
			type:"splReq",
			dataConfig: that.dataConfig
		}
	}, function(dnId, err, data){
		if(err) {
			console.log("Recv err: "+err);
			return;
		}
		
		if(data.header.error) {
			// TODO : check/use err status and adapt behavior accordingly
			console.log("UpdateData:\n"+JSON.stringify(data.header.dataConfig));
			console.log("Data request failed ("+data.header.error.st+"): "+data.header.error.msg);
			return;
		}
		//console.log(JSON.stringify(that.dataModel));
		that._getDataModelFromRecv(data);

		// console.log(that.getDataModel());

		callback = callback.bind(that); // bind callback with IEQ
		callback(that.getDataModel()); // callback func
	});
	/** TODO USE PROMISE ? */
};

IEQ.prototype._isDataModelWithNaN = function() {
	var dataModelNaN=false;
	var sensorNan;
	for(var n in this.dataModel) {
		sensorNan = this.dataModel[n].data.reduce(function(nanPres,d) {
			return nanPres && isNaN(d);
		},false);
		dataModelNaN = dataModelNaN && sensorNan;
		console.log(n+" with nan : "+sensorNan+" ("+dataModelNaN+") / "+this.dataModel[n].data.length);
	}
};

IEQ.prototype.getConfinementLevel = function(){
	return this.confinement;
};

IEQ.prototype.getAirQualityLevel = function(){
	return this.airQuality;
};

IEQ.prototype.getEnvQualityLevel = function(){
	return this.envQuality;
};

/**
 * Update internal model with received data
 * @param  {Object} data data received from DiyaNode by websocket
 * @return {[type]}		[description]
 */
IEQ.prototype._getDataModelFromRecv = function(data){
	var dataModel=null;
	/*\
	  |*|
	  |*|  utilitaires de manipulations de chaînes base 64 / binaires / UTF-8
	  |*|
	  |*|  https://developer.mozilla.org/fr/docs/Décoder_encoder_en_base64
	  |*|
	  \*/
	/** Decoder un tableau d'octets depuis une chaîne en base64 */
	var b64ToUint6 = function(nChr) {
		return nChr > 64 && nChr < 91 ?
			nChr - 65
			: nChr > 96 && nChr < 123 ?
			nChr - 71
			: nChr > 47 && nChr < 58 ?
			nChr + 4
			: nChr === 43 ?
			62
			: nChr === 47 ?
			63
			:	0;
	};
	/**
	 * Decode base64 string to UInt8Array
	 * @param  {String} sBase64		base64 coded string
	 * @param  {int} nBlocksSize size of blocks of bytes to be read. Output byteArray length will be a multiple of this value.
	 * @return {Uint8Array}				tab of decoded bytes
	 */
	var base64DecToArr = function(sBase64, nBlocksSize) {
		var
		sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""), nInLen = sB64Enc.length,
		nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize : nInLen * 3 + 1 >> 2,
		buffer = new ArrayBuffer(nOutLen), taBytes = new Uint8Array(buffer);

		for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
			nMod4 = nInIdx & 3; /* n mod 4 */
			nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
			if (nMod4 === 3 || nInLen - nInIdx === 1) {
				for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
					taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
				}
				nUint24 = 0;
			}
		}
		// console.log("u8int : "+JSON.stringify(taBytes));
		return buffer;
	};

	var arrayFromBuffer = function(data) {
		/* decode data to Float32Array*/
		var buf = base64DecToArr(data.vals, data.byteCoding);
		var fArray=null;
		if(data.byteCoding===4)
			fArray = new Float32Array(buf);
		else if (data.byteCoding===8)
			fArray = new Float64Array(buf);

		if(data.size != fArray.length) console.log("Mismatch of size "+data.size+" vs "+fArray.length);
		var tab = new Array(data.size);
		/* update nb of samples stored */
		for(var i in fArray) {
			tab[parseInt(i)]=fArray[i]; /* keep first val - name of column */
		}
		return tab;
	};

	if(data && data.header) {
		for (var n in data) {
			if(n != "header" && n != "err") {

				if(data[n].err && data[n].err.st>0) {
					console.log(n+" was in error: "+data[n].err.msg);
					continue;
				}
				
				if(!dataModel)
					dataModel={};

				// console.log(n);
				if(!dataModel[n]) {
					dataModel[n]={};
					dataModel[n].data={};
				}
				/* update data range */
				dataModel[n].range=data[n].range;
				/* update data range */
				dataModel[n].timeRange=data[n].timeRange;
				/* update data label */
				dataModel[n].label=data[n].label;
				/* update data unit */
				dataModel[n].unit=data[n].unit;
				/* update data indexRange */
				dataModel[n].qualityConfig={
					/* confortRange: data[n].confortRange, */
					indexRange: data[n].indexRange
				};
				//					console.log("data : "+JSON.stringify(data[n]));
				if(data[n].data.vals.length > 0)
					dataModel[n].data = arrayFromBuffer(data[n].data);
				else {
					if(data[n].data.size != 0) console.log("Size mismatch received data (no data versus size="+data[n].data.size+")");
					dataModel[n].data = [];
				}
				if(data[n].time.vals.length > 0)
					dataModel[n].time = arrayFromBuffer(data[n].time);
				else {
					if(data[n].time.size != 0) console.log("Size mismatch received data (no data versus size="+data[n].time.size+")");
					dataModel[n].time = [];
				}
				if(data[n].index.vals.length > 0)
					dataModel[n].qualityIndex = arrayFromBuffer(data[n].index);
				else {
					if(data[n].index.size != 0) console.log("Size mismatch received data (no data versus size="+data[n].index.size+")");
					dataModel[n].qualityIndex = [];
				}
				if(data[n].robotId.vals.length > 0)
					dataModel[n].robotId = arrayFromBuffer(data[n].robotId);
				else {
					if(data[n].robotId.size != 0) console.log("Size mismatch received data (no data versus size="+data[n].robotId.size+")");
					dataModel[n].robotId = [];
				}
				if(data[n].placeId.vals.length > 0)
					dataModel[n].placeId = arrayFromBuffer(data[n].placeId);
				else {
					if(data[n].placeId.size != 0) console.log("Size mismatch received data (no data versus size="+data[n].placeId.size+")");
					dataModel[n].placeId = [];
				}
				// dataModel[n].data = Array.from(fArray);
				//console.log('mydata '+JSON.stringify(dataModel[n].data));
			}
		}
	}
	else {
		console.log("No Data to read or header is missing !");
	}
	this.dataModel=dataModel;
	return dataModel;
};

/** create IEQ service **/
DiyaSelector.prototype.IEQ = function(){
	var ieq = new IEQ(this);
	return ieq;
};

},{"../../DiyaSelector":8,"../message":13,"util":3}],12:[function(require,module,exports){
EventEmitter = require('node-event-emitter');

/**
 * Constructor
 *
 * @param map {String} map's name
 */
function Maps(selector, map) {


	this._map = map; // map name
	this._selector = selector; // d1()
	this._subIds = {}; // list of subscription Id (for unsubscription purpose) e.g {peerId0: subId0, ...}

	// list of registered place by Diya
	this._diyas = {};

	// get a list of Diya from selector and sort it
	var listDiya = [];//, enterDiya = null, exitDiya = [];
	this._selector.each(function(peerId) { listDiya.push(peerId); });
	listDiya.sort();

	this.listDiya = listDiya;
}
inherits(Maps, EventEmitter);

////////////////////∕∕∕∕∕∕/////////////////////////////////////////////∕∕∕∕∕∕///
//// Static functions /////////////////////////////////////////////////∕∕∕∕∕∕///
////////////////////∕∕∕∕∕∕/////////////////////////////////////////////∕∕∕∕∕∕///

/**
 * static function, get current place from diyanode
 *
 * @param selector {RegExp/String/Array<String>} selector of DiyaNode (also robot)
 * @param map {String} map's name
 * @param func {function()} callback function with return peerId, error and data ({ mapId, label, neuronId,  x, y})
 */
DiyaSelector.prototype.getCurrentPlace = function( map, func) {
	this.request({
		service: 'maps',
		func: 'GetCurrentPlace',
		obj: [ map ],
	}, function(peerId, err, data) {
		func(peerId, err, data);
	});
}

////////////////////∕∕∕∕∕∕/////////////////////////////////////////////∕∕∕∕∕∕///
//// Internal functions ///////////////////////////////////////////////∕∕∕∕∕∕///
////////////////////∕∕∕∕∕∕/////////////////////////////////////////////∕∕∕∕∕∕///

/**
 * round float to six decimals to compare, as the number in js is encoded in
 * IEEE 754 standard ~ around 16 decimal digits precision, we limit to 6 for
 * easier comparision and error due to arithmetic operation
 */
Maps.prototype._round = function (val) {
	// rouding to six decimals
	return Math.round(parseFloat(val) * 1000000) / 1000000;
};

/**
 * check equal with rounding
 */
Maps.prototype._isFloatEqual = function (val1, val2) {
	// rouding to two decimals
	return this._round(val1) === this._round(val2);
};

/**
 * check if map is modified by compare with internal list
 */
Maps.prototype.mapIsModified = function(peerId, map_info) {
	// double check
	map_info.scale = Array.isArray(map_info.scale) ? map_info.scale[0] : map_info.scale

	// ugly code but quick compare to loop
	return !(this._isFloatEqual(this._diyas[peerId].path.scale, map_info.scale) &&
				this._isFloatEqual(this._diyas[peerId].path.rotate, map_info.rotate) &&
				this._isFloatEqual(this._diyas[peerId].path.translate[0], map_info.translate[0]) &&
				this._isFloatEqual(this._diyas[peerId].path.translate[1], map_info.translate[1]) &&
				this._isFloatEqual(this._diyas[peerId].path.ratio, map_info.ratio));
}

/**
 * check if place is modified by compare with internal list
 */
Maps.prototype.placeIsModified = function(peerId, place_info) {
	// ugly code but quick compare to loop
	return !(this._isFloatEqual(this._diyas[peerId].places[place_info.id].x, place_info.x) &&
				this._isFloatEqual(this._diyas[peerId].places[place_info.id].y, place_info.y));
}

// /**
//  * add a Diya when selector changed and had new Diya
//  *
//  * @param peerId {String} peerId of DiyaNode (also robot)
//  * @param color {d3_rgb} d3 color
//  */
// Maps.prototype.addPeer = function(peerId) {
// 	this._diyas[peerId] = {
// 		mapId: null,
// 		path: null, // {translate: [], scale: null, rotate: null},
// 		places: {},
// 		mapIsModified: false,
// 	};
// }

/**
 * remove a Diya when there is a problem in listen map (subscription)
 *
 * @param peerId {String} peerId of DiyaNode (also robot)
 */
Maps.prototype.removePeer = function(peerId) {
	if (this._diyas[peerId]) {
		// remove
		delete this._diyas[peerId];
		this.emit("peer-unsubscribed", peerId);
	}

	// neccessary? if diyanode reconnect?
	if (this._subIds[peerId] !== null && !isNaN(this._subIds[peerId])) {
		// existed subscription ??
		// unsubscribe
		d1(peerId).unsubscribe(this._subIds)
		delete this._subIds[peerId];
	}
}

/**
 * connect to service map
 */
Maps.prototype.connect = function() {
	var that = this;

	// options for subscription
	var options = {
		auto: true, // auto resubscribe?
		subIds: [] // in fact, it is a list, but the code in DiyaSelector check for array
	};

	// subscribe for map service
	this._selector.subscribe({
		service: 'maps',
		func: 'ListenMap',
		obj: [ this._map ]
	}, function(peerId, err, data) {
		if (err || data.error) {
			console.log("Maps: Peer [", peerId, "]: fail to get info from map '" + that._map + "', error:", err || data.error, "!"); // mostly PeerDisconnected

			// remove that peer
			that.removePeer(peerId);//...
			return;
		}

		if (data == null) return ;

		if (!Array.isArray(data.places)) { // winner, this isn't 1st message
			data.places = [];
		}

		// data.place is current place
		if (data.place !== undefined) {
			data.places.push(data.place); // may be null ...
		}

		var map_info = null, places_info = [];

		if (data.id) { // first message from DiyaNode
			// data : {id, name, places, rotate, scale, tx, ty, ratio}
			if (that._diyas[peerId] == null) {
				that._diyas[peerId] = {
					mapId: data.id,
					path: {
						translate: [data.tx, data.ty],
						scale: data.scale,
						rotate: data.rotate,
						ratio: data.ratio
					},
					places: {}
				};
			} else {
				that._diyas[peerId].mapId = data.id;

				if (that._diyas[peerId].path == null) {
					that._diyas[peerId].path = {};
				}
				that._diyas[peerId].path.translate = [data.tx, data.ty];
				that._diyas[peerId].path.scale = data.scale;
				that._diyas[peerId].path.rotate = data.rotate;
				that._diyas[peerId].path.ratio = data.ratio;

				if (that._diyas[peerId].places == null) {
					that._diyas[peerId].places = {};
				}
			}

			map_info = {
				id: data.id,
				name: data.name,
				rotate: data.rotate,
				scale: data.scale,
				translate: [data.tx, data.ty],
				ratio: data.ratio
			}
		}

		// save data values
		data.places.map(function(place) {
			if (place) { // null if currentplace isn't init in DiyaNode
				// place { mapId, label, neuronId,  x, y}

				// neuronId (also place 's Id)
				var id = place.neuronId;

				// Update internal list
				// convert from Diya parameter (0..1 km) to diya-map (0..100000)
				place = {
					id: id,
					label: place.label,
					x: place.x,
					y: place.y,
					t: 360 * place.t
				};

				if (that._diyas[peerId].places[id] == null) { // nonexistent place
					// if is null or undefined
					that._diyas[peerId].places[id] = place; // save it
				}

				places_info.push(Object.create(place));// create a copy to send to user

				// save base place (first known place, also first element of places array)
				// useless at the moment
				// if (!that._diyas[peerId].basePlace) that._diyas[peerId].basePlace = place;
			} else { // current place is null
				places_info.push(null);
			}
		});

		if (places_info.length === 0) places_info = null;

		that.emit("peer-subscribed",peerId, map_info, places_info);
	}, options);

	for (var peerId in options.subIds) {
		if (this._subIds[peerId] !== null && !isNaN(this._subIds[peerId])) {
			// existed subscription ??
			d1(peerId).unsubscribe(this._subIds)
			delete this._subIds[peerId];
			console.log("Maps: bug: existed subscription ??")
		} else {
			// save subId for later unsubscription
			this._subIds[peerId] = options.subIds[peerId];
		}
	}

	return this;
}

/**
 * disconnect from service map, free everything so it is safe to garbage collecte this service
 */
Maps.prototype.disconnect = function() {
	var that = this;
	this._selector.unsubscribe(this._subIds);
	this._diyas = {};// delete ?
	this._selector.each(function(peerId) {
		that.emit("peer-unsubscribed", peerId);
	});
	this.removeAllListeners();
}

/**
 * save map
 *
 * @param peerId {String} peerId of DiyaNode (also robot)
 * @param map_info {Object} ({rotate, scale, translate})
 * @param cb {Function} callback with error as argument
 */
Maps.prototype.saveMap = function (peerId, map_info, cb) {
	var _map_info = Object.create(map_info); // create a duplicate of map_info
	var that = this;
	// save map's info
	_map_info.scale = Array.isArray(_map_info.scale) ? _map_info.scale[0] : _map_info.scale

	if (this.mapIsModified(peerId, _map_info)) {
		d1(peerId).request({
			service: 'maps',
			func: 'UpdateMap',
			obj: [ this._map ],
			data: {
				scale: _map_info.scale,
				tx: _map_info.translate[0],
				ty: _map_info.translate[1],
				rotate: _map_info.rotate,
				ratio: _map_info.ratio
			}
		}, function(peerId, err, data) {
			if (err != null) {
				that._diyas[peerId].path.scale = _map_info.scale;
				that._diyas[peerId].path.rotate = _map_info.rotate;
				that._diyas[peerId].path.translate[0] = _map_info.translate[0];
				that._diyas[peerId].path.translate[1] = _map_info.translate[1];
			}
			if (cb) cb(err);
		});
	} else {
		if (cb) cb(new Error("No change to map '" + this._map + "'!"));
	}
}

/**
 * update every places
 *
 * @param peerId {String} peerId of DiyaNode (also robot)
 * @param place_info {Object} ({ id, x, y})
 * @param cb {Function} callback with error as argument
 */
Maps.prototype.savePlace = function (peerId, place_info, cb) {
	// save map's info
	var that = this;
	var error = "";

	var _place_info = Object.create(place_info);

	// save place
	if (this.placeIsModified(peerId, _place_info)) {
		d1(peerId).request({
			service: 'maps',
			func: 'UpdatePlace',
			data: {
				mapId: this._diyas[peerId].mapId,
				neuronId: _place_info.id,
				x: _place_info.x,
				y: _place_info.y
			}
		}, function(peerId, err, data) {
			if (err != null) {
				that._diyas[peerId].places[_place_info.id].x = _place_info.x;
				that._diyas[peerId].places[_place_info.id].y = _place_info.y;
			}
			if (cb) cb(err);
		});
	} else {
		if (cb) cb(new Error("No change to place n°" + _place_info.id + "!"));
	}
}

/**
 * delete every saved places of Diya (choosen in selector)
 *
 * @param peerId {String} peerId of DiyaNode (also robot)
 * @param cb {Function} callback with error as argument
 */
Maps.prototype.clearPlaces = function(peerId, cb) {
	var that = this;

	d1(peerId).request({
		service: 'maps',
		func: 'ClearMap',
		obj: [ this._map ]
	}, function(peerId, err, data) {
		if (err != null) {
			// delete from internal list
			that._diyas[peerId].places = {};
		}
		if (cb) cb(err);
	});
}

// export it as module of DiyaSelector
DiyaSelector.prototype.maps = function(map) {
	var maps = new Maps(this, map);

	return maps;
}

},{"node-event-emitter":5}],13:[function(require,module,exports){
/* maya-client
 *
 * Copyright (c) 2014, Partnering Robotics, All rights reserved.
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; version
 *  3.0 of the License This library is distributed in the hope
 * that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
 * PURPOSE. See the GNU Lesser General Public License for more details.
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library.
 */



function Message(service, func, obj, permanent){

	this.service = service;
	this.func = func;
	this.obj = obj;
	
	this.permanent = permanent; //If this flag is on, the command will stay on the callback list listening for events
}

Message.buildSignature = function(msg){
	return msg.service+'.'+msg.func+'.'+msg.obj;
}


Message.prototype.signature = function(){
	return this.service+'.'+this.func+'.'+this.obj;
}

Message.prototype.exec = function(data){
	return {
		service: this.service,
		func: this.func,
		obj: this.obj,
		data: data
	}
}

module.exports = Message;

},{}],14:[function(require,module,exports){
var DiyaSelector = require('../../DiyaSelector').DiyaSelector;



DiyaSelector.prototype.ip = function(iface, callback){
	return this.request({
		service: 'networkId',
		func: 'GetLocalIP',
		data: {
			iface: iface
		}
	}, function(peerId, err, data){
		callback(peerId, (!err && data && data.address) ? data.address : null);
	});
};

},{"../../DiyaSelector":8}],15:[function(require,module,exports){
/* maya-client
 *
 * Copyright (c) 2014, Partnering Robotics, All rights reserved.
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; version
 *  3.0 of the License. This library is distributed in the hope
 * that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
 * PURPOSE. See the GNU Lesser General Public License for more details.
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library.
 */

DiaSelector = require('../../DiyaSelector').DiyaSelector;

function pico(node){
	var that = this;
	this.node = node;
	return this;
}

//

DiyaSelector.prototype.power = function(){

	this.request({
		service: 'pico',
		func: 'Power'
	}, function(peerId, err, data){
		/*if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);*/

	});
}

DiyaSelector.prototype.zoom = function(callback){

	this.request({
		service: 'pico',
		func: 'Zoom'
	}, function(data){
		/*if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);*/

	});
}


DiyaSelector.prototype.back = function(callback){

	this.request({
		service: 'pico',
		func: 'Back'
	}, function(data){
		/*if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
		*/
	});
}


DiyaSelector.prototype.up = function(callback){

	this.request({
		service: 'pico',
		func: 'Up'
	}, function(data){
	/*	if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
	*/
	});
}


DiyaSelector.prototype.left = function(callback){

	this.request({
		service: 'pico',
		func: 'Left'
	}, function(data){
	/*	if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
	*/
	});
}


DiyaSelector.prototype.ok = function(callback){

	this.request({
		service: 'pico',
		func: 'Ok'
	}, function(data){
	/*	if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
		*/
	});
}


DiyaSelector.prototype.right = function(callback){

	this.request({
		service: 'pico',
		func: 'Right'
	}, function(data){
	/*	if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
		*/
	});
}


DiyaSelector.prototype.down = function(callback){

	this.request({
		service: 'pico',
		func: 'Down'
	}, function(data){
	/*	if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
		*/
	});
}

DiyaSelector.prototype.prev = function(callback){

	this.request({
		service: 'pico',
		func: 'Prev'
	}, function(data){
	/*	if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
		*/
	});
}

DiyaSelector.prototype.play = function(callback){

	this.request({
		service: 'pico',
		func: 'Play'
	}, function(data){
	/*	if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
		*/
	});
}
DiyaSelector.prototype.next = function(callback){

	this.request({
		service: 'pico',
		func: 'Next'
	}, function(data){
/*		if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
	*/
	});
}

DiyaSelector.prototype.lumiDown = function(callback){

	this.request({
		service: 'pico',
		func: 'LumiDown'
	}, function(data){
/*		if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
	*/
	});
}

DiyaSelector.prototype.lumiUp = function(callback){

	this.request({
		service: 'pico',
		func: 'LumiUp'
	}, function(data){
	/*	if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
		*/
	});
}

DiyaSelector.prototype.volumeDown = function(callback){

	this.request({
		service: 'pico',
		func: 'VolumeDown'
	}, function(data){
		/*if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
	*/
	});
}


DiyaSelector.prototype.mute = function(callback){

	this.request({
		service: 'pico',
		func: 'Mute'
	}, function(data){
	/*	if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
		*/
	});
}

DiyaSelector.prototype.volumeUp = function(callback){

	this.request({
		service: 'pico',
		func: 'VolumeUp'
	}, function(data){
	/*	if(data.pico)
			callback(null,data.pico);
		if(data.error)
			callback(data.error,null);
		*/
	});
}

DiyaSelector.prototype.display = function(callback){

	this.request({
		service: 'pico',
		func: 'Display',
		// data: req
	}, function(data){

	});
}



var exp = {
		pico: pico
}

module.exports = exp;

},{"../../DiyaSelector":8}],16:[function(require,module,exports){
DiyaSelector = require('../../DiyaSelector').DiyaSelector;
EventEmitter = require('node-event-emitter');
inherits = require('inherits');


if(typeof window !== 'undefined'){
	var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
	var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
	var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
}


function Channel(dnId, name, open_cb){
	EventEmitter.call(this);
	this.name = name;
	this.dnId = dnId;

	this.frequency = 20;

	this.channel = undefined;
	this.onopen = open_cb;
	this.closed = false;
}
inherits(Channel, EventEmitter);

Channel.prototype.setChannel = function(datachannel){
	var that = this;
	this.channel = datachannel;
	this._negociate();

};

Channel.prototype.close = function(){
	this.closed = true;
};

Channel.prototype.write = function(index, value){
	if(index < 0 || index > this.size || isNaN(value)) return false;
	this._buffer[index] = value;
	this._requestSend();
	return true;
};

Channel.prototype.writeAll = function(values){
	if(!Array.isArray(values) || values.length !== this.size)
        return false;

    for (var i = 0; i<values.length; i++){
        if(isNaN(values[i])) return false;
        this._buffer[i] = values[i];
    }
    this._requestSend();
};

Channel.prototype._requestSend = function(){
	var that = this;

	var elapsedTime = new Date().getTime() - this._lastSendTimestamp;
	var period = 1000 / this.frequency;
	if(elapsedTime >= period){
		doSend();
	}else if(!this._sendRequested){
		this._sendRequested = true;
		setTimeout(doSend, period - elapsedTime);
	}

	function doSend(){
		that._sendRequested = false;
		that._lastSendTimestamp = new Date().getTime();
		var ret = that._send(that._buffer);
		//If autosend is set, automatically send buffer at the given frequency
		if(ret && that.autosend) that._requestSend();
	}
};

Channel.prototype._send = function(msg){
	if(this.closed) return false;
	else if(this.channel.readyState === 'open'){
		try{
			this.channel.send(msg);
		}catch(e){
			console.log('[rtc.channel.write] exception occured while sending data');
		}
		return true;
	}
	else{
		console.log('[rtc.channel.write] warning : webrtc datachannel state = '+this.channel.readyState);
		return false;
	}
};

Channel.prototype._negociate = function(){
	var that = this;

	this.channel.onmessage = function(message){
		var view = new DataView(message.data);

		var typeChar = String.fromCharCode(view.getUint8(0));
		if(typeChar === 'O'){
			//Input
			that.type = 'input'; //Promethe Output = Client Input
		}else if(typeChar === 'I'){
			//Output
			that.type = 'output'; //Promethe Input = Client Output
		}else{
			//Error
		}

		var size = view.getInt32(1,true);
		if(size != undefined){
			that.size = size;
			that._buffer = new Float32Array(size);
		}else{
			//error
		}

		that.channel.onmessage = that._onMessage.bind(that);

		that.channel.onclose = that._onClose.bind(that);

		if(typeof that.onopen === 'function') that.onopen(that.dnId, that);

		console.log('channel '+that.name+' negociated !')
	}
};

Channel.prototype._onMessage = function(message){
	var valArray = new Float32Array(message.data);
	this.emit('value', valArray);
};

Channel.prototype._onClose = function(){
	console.log('channel '+this.name+' closed !');
	this.emit('close');
};


//////////////////////////////////////////////////////////////////
///////////////////// RTC Peer implementation ////////////////////
//////////////////////////////////////////////////////////////////


function Peer(dnId, rtc, id, channels){
	this.dn = d1(dnId);
	this.dnId = dnId;
	this.id = id;
	this.channels = channels;
	this.rtc = rtc;
	this.peer = null;

	this.connected = false;
	this.closed = false;

	this._connect();
}

Peer.prototype._connect = function(){
	var that = this;

	this.subIds = [];

	this.dn.subscribe({
		service: 'rtc',
		func: 'Connect',
		obj: this.channels,
		data: {
			promID: this.id
		}
	},
	function(diya, err, data){
		if(data) that._handleNegociationMessage(data);
	}, this.subIds);

	setTimeout(function(){
		if(!that.connected && !that.closed){
			that._reconnect();
		}
	}, 10000);
};

Peer.prototype._reconnect = function(){
	this.close();

	this.peer = null;
	this.connected = false;
	this.closed = false;

	this._connect();
};


Peer.prototype._handleNegociationMessage = function(msg){
	if(msg.eventType === 'RemoteOffer'){
		this._createPeer(msg);
	}else if(msg.eventType === 'RemoteICECandidate'){
		this._addRemoteICECandidate(msg);
	}
};

var servers = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};

Peer.prototype._createPeer = function(data){
	var that = this;

	var peer = new RTCPeerConnection(servers,  {mandatory: [{DtlsSrtpKeyAgreement: true}, {EnableDtlsSrtp: true}]});
	this.peer = peer;

	peer.setRemoteDescription(new RTCSessionDescription({sdp: data.sdp, type: data.type}));

	peer.createAnswer(function(session_description){
		peer.setLocalDescription(session_description);

		that.dn.request({
			service: 'rtc',
			func: 'Answer',
			data: {
				promID: data.promID,
				peerId: data.peerId,
				sdp: session_description.sdp,
				type: session_description.type
			}
		});
	},
	function(err){
		console.log("RTC: cannot create answer :");
		console.log(err);
	},
	{'mandatory': { 'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true}});

	peer.oniceconnectionstatechange = function(){
		console.log('RTC: state change('+that.id+':'+that.dnId+') : '+peer.iceConnectionState);
		if(peer.iceConnectionState === 'connected'){
			that.connected = true;
			that.dn.unsubscribe(that.subIds);
		}
		else if(peer.iceConnectionState === 'disconnected'){
			if(!that.closed) that._reconnect();
		}
	};

	peer.onicecandidate = function(evt){
		that.dn.request({
			service: 'rtc',
			func: 'ICECandidate',
			data: {
				peerId: data.peerId,
				promID: that.id,
				candidate: evt.candidate
			}
		});
	};

	peer.ondatachannel = function(evt){
		that.connected = true;
		that.rtc._onDataChannel(that.dnId, evt.channel);
	};
};


Peer.prototype._addRemoteICECandidate = function(data){
	var that = this;
	try{
		var candidate = new RTCIceCandidate(data.candidate);
		this.peer.addIceCandidate(candidate, function(){
			console.log("RTC: candidate added("+that.id+":"+that.dnId+") : "+that.peer.iceConnectionState);
		},function(err){
			console.error("RTC: cannot add RemoteICECandidate :");
			console.error(err);
		});
	}catch(err){
		console.error("RTC: cannot add RemoteICECandidate : ");
		console.error(err);
	}
};

Peer.prototype.close = function(){
	this.dn.unsubscribe(this.subIds);
	if(this.peer){
		try{
			this.peer.close();
		}catch(e){}
		this.connected = false;
		this.closed = true;
	}
};


//////////////////////////////////////////////////////////////////////////////
/////////////////////////// RTC service implementation ///////////////////////
//////////////////////////////////////////////////////////////////////////////



function RTC(selector){
	var that = this;
	this.selector = selector;

	this.requestedChannels = [];
}


RTC.prototype.disconnect = function(){
	var that = this;

	this.selector.each(function(dnId){
		for(var promID in that[dnId].peers){
			that._closePeer(dnId, promID);
		}
	});

	this.selector.unsubscribe(this.subIds);
	return this;
};

RTC.prototype.use = function(name_regex, onopen_callback){
	this.requestedChannels.push({regex: name_regex, cb: onopen_callback});
	return this;
};

RTC.prototype.connect = function(){
	var that = this;

	this.subIds = [];

	this.selector.subscribe({
		service: 'rtc',
		func: 'ListenPeers'
	}, function(dnId, err, data){

		if(!that[dnId]) that._createDiyaNode(dnId);

		if(err === 'SubscriptionClosed' || err === 'PeerDisconnected'){
			that._closeDiyaNode(dnId);
			return ;
		}

		if(data && data.eventType && data.promID !== undefined){

			if(data.eventType === 'PeerConnected'){
				if(!that[dnId].peers[data.promID]){
					var channels = that._matchChannels(dnId, data.channels);
					if(channels.length > 0){
						that[dnId].peers[data.promID] = new Peer(dnId, that, data.promID, channels);
					}
				}
			}
			else if(data.eventType === 'PeerClosed'){
				if(that[dnId].peers[data.promID]){
					that._closePeer(dnId, data.promID);
					if(typeof that.onclose === 'function') that.onclose(dnId);
				}
			}

		}

	}, {subIds: this.subIds, auto: true});

	return this;
};

RTC.prototype._createDiyaNode = function(dnId){
	var that = this;

	this[dnId] = {
		dnId: dnId,
		usedChannels: [],
		requestedChannels: [],
		peers: []
	}

	this.requestedChannels.forEach(function(c){that[dnId].requestedChannels.push(c)});
};

RTC.prototype._closeDiyaNode = function(dnId){
	for(var promID in this[dnId].peers){
		this._closePeer(dnId, promID);
	}

	delete this[dnId];
};

RTC.prototype._closePeer = function(dnId, promID){
	if(this[dnId].peers[promID]){
		var p = this[dnId].peers[promID];
		p.close();

		for(var i=0;i<p.channels.length; i++){
			delete this[dnId].usedChannels[p.channels[i]];
		}

		delete this[dnId].peers[promID];
	}
};

RTC.prototype._matchChannels = function(dnId, receivedChannels){
	var that = this;

	var channels = [];

	for(var i = 0; i < receivedChannels.length; i++){
		var name = receivedChannels[i];

		for(var j = 0; j < that[dnId].requestedChannels.length; j++){
			var req = that[dnId].requestedChannels[j];

			if(name && name.match(req.regex) && !that[dnId].usedChannels[name]){
				that[dnId].usedChannels[name] = new Channel(dnId, name, req.cb);
				channels.push(name);
			}
		}
	}

	return  channels;
};


RTC.prototype._onDataChannel = function(dnId, datachannel){
	var channel = this[dnId].usedChannels[datachannel.label];

	if(!channel){
		console.log("Channel "+datachannel.label+" unmatched, closing !");
		datachannel.close();
		return ;
	}
	console.log("Channel "+datachannel.label+" created !");

	channel.setChannel(datachannel);
};



DiyaSelector.prototype.rtc = function(domNode, selectedNodes){
	var rtc = new RTC(this);

	if(domNode){
		createNeuronsFromDOM(domNode, selectedNodes, rtc);
	}

	return rtc;
};

///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

function createNeuronsFromDOM(domNode, selectedNodes, rtc){
	if(!domNode || !domNode.querySelectorAll) return ;


	//Retrieve all tags which name starts with "neuron-"
	var neuronNodeList = domNode.querySelectorAll('*');
	var neuronNodes = [];
	for(var i=0;i<neuronNodeList.length; i++){
		if(isNeuronTag(neuronNodeList[i])){
			neuronNodes.push(neuronNodeList[i]);
			if(Array.isArray(selectedNodes)) selectedNodes.push(neuronNodeList[i]);
		}
	}

	//for each tag that has a name attribute, create a neuron associated with it
	neuronNodes.forEach(function(neuronNode){

		var channel = getChannel(neuronNode.attributes["name"].value);

		rtc.use(channel, function(dnId, neuron){
			neuronNode.setNeuron(dnId, neuron);
		});

	});

}


function isNeuronTag(node){
	return node.tagName.startsWith("NEURON-") &&
		node.attributes["name"] &&
		(typeof node.setNeuron === 'function');
}

function getChannel(name){
	return name.replace(/\s+/, "");
}

},{"../../DiyaSelector":8,"inherits":4,"node-event-emitter":5}],17:[function(require,module,exports){
DiyaSelector = require('../../DiyaSelector').DiyaSelector;

DiyaSelector.prototype.time = function(loop, callback){
	if(loop){
		this.subscribe({
			service: 'timer',
			func: 'SubscribeTimer',
		}, callback, {auto: true});
	}else{
		this.request({
			service: 'timer',
			func: 'GetTime',
		}, callback);
	}
	return this;
};

},{"../../DiyaSelector":8}],18:[function(require,module,exports){
/* maya-client
 *
 * Copyright (c) 2014, Partnering Robotics, All rights reserved.
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; version
 *  3.0 of the License. This library is distributed in the hope
 * that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
 * PURPOSE. See the GNU Lesser General Public License for more details.
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library.
 */

var util = require('util');

 
DiyaSelector = require('../../DiyaSelector').DiyaSelector;
var Message = require('../message');

DiyaSelector.prototype.statusUpdate = function(SubID,callback){
	
	
	this.subscribe({
			service: 'update',
			func: 'SubscribeUpdateStatus'
		}, 
		function(peerId, error, res){
			callback(peerId,error,res);
			console.log(res.lockStatus);
		},{auto:true, subIds:SubID});

};

DiyaSelector.prototype.listPackages = function(callback){

	this.request({
		service: 'update',
		func: 'ListPackages'
	}, function(peerId, error, data){
		if(data.packages) 
			callback(null,data.packages); 
		if(error)
			callback(error,null);
		
	}); 
};
	
DiyaSelector.prototype.upgradeAll = function(callback){

	this.request({
		service: 'update',
		func: 'UpgradeAll'
	}, function(peerId, error, data){
		if(data)
			if(data.packages) 
				callback(null,data.packages); 
		if(error)
			callback(error,null);
	}); 
};

DiyaSelector.prototype.updateAll = function(callback){

	this.request({
		service: 'update',
		func: 'UpdateAll'
	}, function(peerId, error, data){
		if(data)
			if(data.packages) 
				callback(null,data); 
		if(error)
			callback(error,null);
	}); 
};
	
DiyaSelector.prototype.installPackage = function(pkg, callback){
		
	if ((pkg === 'Undefined') || (typeof pkg !== 'string') || (pkg.length < 2)){
		callback('undefinedPackage',null);
	}
	else {
	
		var INVALID_PARAMETERS_REGEX = /^-|[^\s]\s+[^\s]|-$/;
		var testNamePkg= INVALID_PARAMETERS_REGEX.test(pkg);
		if (testNamePkg)
			callback("InvalidParameters",null);
		else{
				
			this.request({
				service: 'update',
				func: 'InstallPackage',
				data:{
					package: pkg,
				}
			}, function(peerId, error, data){
				if(data)
					if(data.packages) 
						callback(null,data.packages); 
				if(error)
					callback(error,null);
		
			});
		}
	}
	
};

DiyaSelector.prototype.removePackage = function(pkg, callback){
		
	if ((pkg === 'Undefined') || (typeof pkg !== 'string') || (pkg.length < 2)){
		callback('undefinedPackage',null);
	}
	else {
	
		var INVALID_PARAMETERS_REGEX = /^[+ -]|[^\s]\s+[^\s]|[+ -]$/;
		var testNamePkg= INVALID_PARAMETERS_REGEX.test(pkg);
		if (testNamePkg)
			callback("InvalidParameters",null);
		else{
				
			this.request({
				service: 'update',
				func: 'RemovePackage',
				data:{
					package: pkg,
				}
			}, function(peerId, error, data){
				if (data)
					if(data.packages) 
						callback(null,data.packages); 
				if(error)
					callback(error,null);	
				
			});
		}
	}
	
};
		

},{"../../DiyaSelector":8,"../message":13,"util":3}],19:[function(require,module,exports){
/* maya-client
 *
 * Copyright (c) 2014, Partnering Robotics, All rights reserved.
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; version
 *  3.0 of the License. This library is distributed in the hope
 * that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
 * PURPOSE. See the GNU Lesser General Public License for more details.
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library.
 */
DiyaSelector = require('../../DiyaSelector').DiyaSelector;

function explorer(node){
	var that = this;
	this.node = node;
	return this;
}


DiyaSelector.prototype.listenViewers = function(callback){
		this.subscribe({
			service: 'explorer',
			func: 'ListenViewers',
			// data: { file: file}

		}, function(peerId, err, data){
			callback(peerId, null, data);
		});

		return this;
};

},{"../../DiyaSelector":8}]},{},[9])(9)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9sZWlscmVuZy93b3Jrc3BhY2UvZGl5YS1zZGsvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9ob21lL2xlaWxyZW5nL3dvcmtzcGFjZS9kaXlhLXNkay9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi9ob21lL2xlaWxyZW5nL3dvcmtzcGFjZS9kaXlhLXNkay9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwiL2hvbWUvbGVpbHJlbmcvd29ya3NwYWNlL2RpeWEtc2RrL25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiL2hvbWUvbGVpbHJlbmcvd29ya3NwYWNlL2RpeWEtc2RrL25vZGVfbW9kdWxlcy9ub2RlLWV2ZW50LWVtaXR0ZXIvaW5kZXguanMiLCIvaG9tZS9sZWlscmVuZy93b3Jrc3BhY2UvZGl5YS1zZGsvbm9kZV9tb2R1bGVzL3EvcS5qcyIsIi9ob21lL2xlaWxyZW5nL3dvcmtzcGFjZS9kaXlhLXNkay9zcmMvRGl5YU5vZGUuanMiLCIvaG9tZS9sZWlscmVuZy93b3Jrc3BhY2UvZGl5YS1zZGsvc3JjL0RpeWFTZWxlY3Rvci5qcyIsIi9ob21lL2xlaWxyZW5nL3dvcmtzcGFjZS9kaXlhLXNkay9zcmMvZGl5YS1zZGsuanMiLCIvaG9tZS9sZWlscmVuZy93b3Jrc3BhY2UvZGl5YS1zZGsvc3JjL3NlcnZpY2VzL2V4cGxvcmVyL2V4cGxvcmVyLmpzIiwiL2hvbWUvbGVpbHJlbmcvd29ya3NwYWNlL2RpeWEtc2RrL3NyYy9zZXJ2aWNlcy9pZXEvaWVxLmpzIiwiL2hvbWUvbGVpbHJlbmcvd29ya3NwYWNlL2RpeWEtc2RrL3NyYy9zZXJ2aWNlcy9tYXBzL21hcHMuanMiLCIvaG9tZS9sZWlscmVuZy93b3Jrc3BhY2UvZGl5YS1zZGsvc3JjL3NlcnZpY2VzL21lc3NhZ2UuanMiLCIvaG9tZS9sZWlscmVuZy93b3Jrc3BhY2UvZGl5YS1zZGsvc3JjL3NlcnZpY2VzL25ldHdvcmtJZC9OZXR3b3JrSWQuanMiLCIvaG9tZS9sZWlscmVuZy93b3Jrc3BhY2UvZGl5YS1zZGsvc3JjL3NlcnZpY2VzL3BpY28vcGljby5qcyIsIi9ob21lL2xlaWxyZW5nL3dvcmtzcGFjZS9kaXlhLXNkay9zcmMvc2VydmljZXMvcnRjL3J0Yy5qcyIsIi9ob21lL2xlaWxyZW5nL3dvcmtzcGFjZS9kaXlhLXNkay9zcmMvc2VydmljZXMvdGltZXIvdGltZXIuanMiLCIvaG9tZS9sZWlscmVuZy93b3Jrc3BhY2UvZGl5YS1zZGsvc3JjL3NlcnZpY2VzL3VwZGF0ZS91cGRhdGUuanMiLCIvaG9tZS9sZWlscmVuZy93b3Jrc3BhY2UvZGl5YS1zZGsvc3JjL3NlcnZpY2VzL3ZpZXdlcl9leHBsb3Jlci92aWV3ZXJfZXhwbG9yZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2tCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuZ0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeWFXWjVMMjV2WkdWZmJXOWtkV3hsY3k5MWRHbHNMM1YwYVd3dWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklqdEJRVUZCTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRWlMQ0ptYVd4bElqb2laMlZ1WlhKaGRHVmtMbXB6SWl3aWMyOTFjbU5sVW05dmRDSTZJaUlzSW5OdmRYSmpaWE5EYjI1MFpXNTBJanBiSWk4dklFTnZjSGx5YVdkb2RDQktiM2xsYm5Rc0lFbHVZeTRnWVc1a0lHOTBhR1Z5SUU1dlpHVWdZMjl1ZEhKcFluVjBiM0p6TGx4dUx5OWNiaTh2SUZCbGNtMXBjM05wYjI0Z2FYTWdhR1Z5WldKNUlHZHlZVzUwWldRc0lHWnlaV1VnYjJZZ1kyaGhjbWRsTENCMGJ5QmhibmtnY0dWeWMyOXVJRzlpZEdGcGJtbHVaeUJoWEc0dkx5QmpiM0I1SUc5bUlIUm9hWE1nYzI5bWRIZGhjbVVnWVc1a0lHRnpjMjlqYVdGMFpXUWdaRzlqZFcxbGJuUmhkR2x2YmlCbWFXeGxjeUFvZEdobFhHNHZMeUJjSWxOdlpuUjNZWEpsWENJcExDQjBieUJrWldGc0lHbHVJSFJvWlNCVGIyWjBkMkZ5WlNCM2FYUm9iM1YwSUhKbGMzUnlhV04wYVc5dUxDQnBibU5zZFdScGJtZGNiaTh2SUhkcGRHaHZkWFFnYkdsdGFYUmhkR2x2YmlCMGFHVWdjbWxuYUhSeklIUnZJSFZ6WlN3Z1kyOXdlU3dnYlc5a2FXWjVMQ0J0WlhKblpTd2djSFZpYkdsemFDeGNiaTh2SUdScGMzUnlhV0oxZEdVc0lITjFZbXhwWTJWdWMyVXNJR0Z1WkM5dmNpQnpaV3hzSUdOdmNHbGxjeUJ2WmlCMGFHVWdVMjltZEhkaGNtVXNJR0Z1WkNCMGJ5QndaWEp0YVhSY2JpOHZJSEJsY25OdmJuTWdkRzhnZDJodmJTQjBhR1VnVTI5bWRIZGhjbVVnYVhNZ1puVnlibWx6YUdWa0lIUnZJR1J2SUhOdkxDQnpkV0pxWldOMElIUnZJSFJvWlZ4dUx5OGdabTlzYkc5M2FXNW5JR052Ym1ScGRHbHZibk02WEc0dkwxeHVMeThnVkdobElHRmliM1psSUdOdmNIbHlhV2RvZENCdWIzUnBZMlVnWVc1a0lIUm9hWE1nY0dWeWJXbHpjMmx2YmlCdWIzUnBZMlVnYzJoaGJHd2dZbVVnYVc1amJIVmtaV1JjYmk4dklHbHVJR0ZzYkNCamIzQnBaWE1nYjNJZ2MzVmljM1JoYm5ScFlXd2djRzl5ZEdsdmJuTWdiMllnZEdobElGTnZablIzWVhKbExseHVMeTljYmk4dklGUklSU0JUVDBaVVYwRlNSU0JKVXlCUVVrOVdTVVJGUkNCY0lrRlRJRWxUWENJc0lGZEpWRWhQVlZRZ1YwRlNVa0ZPVkZrZ1QwWWdRVTVaSUV0SlRrUXNJRVZZVUZKRlUxTmNiaTh2SUU5U0lFbE5VRXhKUlVRc0lFbE9RMHhWUkVsT1J5QkNWVlFnVGs5VUlFeEpUVWxVUlVRZ1ZFOGdWRWhGSUZkQlVsSkJUbFJKUlZNZ1QwWmNiaTh2SUUxRlVrTklRVTVVUVVKSlRFbFVXU3dnUmtsVVRrVlRVeUJHVDFJZ1FTQlFRVkpVU1VOVlRFRlNJRkJWVWxCUFUwVWdRVTVFSUU1UFRrbE9SbEpKVGtkRlRVVk9WQzRnU1U1Y2JpOHZJRTVQSUVWV1JVNVVJRk5JUVV4TUlGUklSU0JCVlZSSVQxSlRJRTlTSUVOUFVGbFNTVWRJVkNCSVQweEVSVkpUSUVKRklFeEpRVUpNUlNCR1QxSWdRVTVaSUVOTVFVbE5MRnh1THk4Z1JFRk5RVWRGVXlCUFVpQlBWRWhGVWlCTVNVRkNTVXhKVkZrc0lGZElSVlJJUlZJZ1NVNGdRVTRnUVVOVVNVOU9JRTlHSUVOUFRsUlNRVU5VTENCVVQxSlVJRTlTWEc0dkx5QlBWRWhGVWxkSlUwVXNJRUZTU1ZOSlRrY2dSbEpQVFN3Z1QxVlVJRTlHSUU5U0lFbE9JRU5QVGs1RlExUkpUMDRnVjBsVVNDQlVTRVVnVTA5R1ZGZEJVa1VnVDFJZ1ZFaEZYRzR2THlCVlUwVWdUMUlnVDFSSVJWSWdSRVZCVEVsT1IxTWdTVTRnVkVoRklGTlBSbFJYUVZKRkxseHVYRzUyWVhJZ1ptOXliV0YwVW1WblJYaHdJRDBnTHlWYmMyUnFKVjB2Wnp0Y2JtVjRjRzl5ZEhNdVptOXliV0YwSUQwZ1puVnVZM1JwYjI0b1ppa2dlMXh1SUNCcFppQW9JV2x6VTNSeWFXNW5LR1lwS1NCN1hHNGdJQ0FnZG1GeUlHOWlhbVZqZEhNZ1BTQmJYVHRjYmlBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR0Z5WjNWdFpXNTBjeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ2IySnFaV04wY3k1d2RYTm9LR2x1YzNCbFkzUW9ZWEpuZFcxbGJuUnpXMmxkS1NrN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnZZbXBsWTNSekxtcHZhVzRvSnlBbktUdGNiaUFnZlZ4dVhHNGdJSFpoY2lCcElEMGdNVHRjYmlBZ2RtRnlJR0Z5WjNNZ1BTQmhjbWQxYldWdWRITTdYRzRnSUhaaGNpQnNaVzRnUFNCaGNtZHpMbXhsYm1kMGFEdGNiaUFnZG1GeUlITjBjaUE5SUZOMGNtbHVaeWhtS1M1eVpYQnNZV05sS0dadmNtMWhkRkpsWjBWNGNDd2dablZ1WTNScGIyNG9lQ2tnZTF4dUlDQWdJR2xtSUNoNElEMDlQU0FuSlNVbktTQnlaWFIxY200Z0p5VW5PMXh1SUNBZ0lHbG1JQ2hwSUQ0OUlHeGxiaWtnY21WMGRYSnVJSGc3WEc0Z0lDQWdjM2RwZEdOb0lDaDRLU0I3WEc0Z0lDQWdJQ0JqWVhObElDY2xjeWM2SUhKbGRIVnliaUJUZEhKcGJtY29ZWEpuYzF0cEt5dGRLVHRjYmlBZ0lDQWdJR05oYzJVZ0p5VmtKem9nY21WMGRYSnVJRTUxYldKbGNpaGhjbWR6VzJrcksxMHBPMXh1SUNBZ0lDQWdZMkZ6WlNBbkpXb25PbHh1SUNBZ0lDQWdJQ0IwY25rZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQktVMDlPTG5OMGNtbHVaMmxtZVNoaGNtZHpXMmtySzEwcE8xeHVJQ0FnSUNBZ0lDQjlJR05oZEdOb0lDaGZLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUNkYlEybHlZM1ZzWVhKZEp6dGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdaR1ZtWVhWc2REcGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIZzdYRzRnSUNBZ2ZWeHVJQ0I5S1R0Y2JpQWdabTl5SUNoMllYSWdlQ0E5SUdGeVozTmJhVjA3SUdrZ1BDQnNaVzQ3SUhnZ1BTQmhjbWR6V3lzcmFWMHBJSHRjYmlBZ0lDQnBaaUFvYVhOT2RXeHNLSGdwSUh4OElDRnBjMDlpYW1WamRDaDRLU2tnZTF4dUlDQWdJQ0FnYzNSeUlDczlJQ2NnSnlBcklIZzdYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUhOMGNpQXJQU0FuSUNjZ0t5QnBibk53WldOMEtIZ3BPMXh1SUNBZ0lIMWNiaUFnZlZ4dUlDQnlaWFIxY200Z2MzUnlPMXh1ZlR0Y2JseHVYRzR2THlCTllYSnJJSFJvWVhRZ1lTQnRaWFJvYjJRZ2MyaHZkV3hrSUc1dmRDQmlaU0IxYzJWa0xseHVMeThnVW1WMGRYSnVjeUJoSUcxdlpHbG1hV1ZrSUdaMWJtTjBhVzl1SUhkb2FXTm9JSGRoY201eklHOXVZMlVnWW5rZ1pHVm1ZWFZzZEM1Y2JpOHZJRWxtSUMwdGJtOHRaR1Z3Y21WallYUnBiMjRnYVhNZ2MyVjBMQ0IwYUdWdUlHbDBJR2x6SUdFZ2JtOHRiM0F1WEc1bGVIQnZjblJ6TG1SbGNISmxZMkYwWlNBOUlHWjFibU4wYVc5dUtHWnVMQ0J0YzJjcElIdGNiaUFnTHk4Z1FXeHNiM2NnWm05eUlHUmxjSEpsWTJGMGFXNW5JSFJvYVc1bmN5QnBiaUIwYUdVZ2NISnZZMlZ6Y3lCdlppQnpkR0Z5ZEdsdVp5QjFjQzVjYmlBZ2FXWWdLR2x6Vlc1a1pXWnBibVZrS0dkc2IySmhiQzV3Y205alpYTnpLU2tnZTF4dUlDQWdJSEpsZEhWeWJpQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQmxlSEJ2Y25SekxtUmxjSEpsWTJGMFpTaG1iaXdnYlhObktTNWhjSEJzZVNoMGFHbHpMQ0JoY21kMWJXVnVkSE1wTzF4dUlDQWdJSDA3WEc0Z0lIMWNibHh1SUNCcFppQW9jSEp2WTJWemN5NXViMFJsY0hKbFkyRjBhVzl1SUQwOVBTQjBjblZsS1NCN1hHNGdJQ0FnY21WMGRYSnVJR1p1TzF4dUlDQjlYRzVjYmlBZ2RtRnlJSGRoY201bFpDQTlJR1poYkhObE8xeHVJQ0JtZFc1amRHbHZiaUJrWlhCeVpXTmhkR1ZrS0NrZ2UxeHVJQ0FnSUdsbUlDZ2hkMkZ5Ym1Wa0tTQjdYRzRnSUNBZ0lDQnBaaUFvY0hKdlkyVnpjeTUwYUhKdmQwUmxjSEpsWTJGMGFXOXVLU0I3WEc0Z0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWh0YzJjcE8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHdjbTlqWlhOekxuUnlZV05sUkdWd2NtVmpZWFJwYjI0cElIdGNiaUFnSUNBZ0lDQWdZMjl1YzI5c1pTNTBjbUZqWlNodGMyY3BPMXh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdZMjl1YzI5c1pTNWxjbkp2Y2lodGMyY3BPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdkMkZ5Ym1Wa0lEMGdkSEoxWlR0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlHWnVMbUZ3Y0d4NUtIUm9hWE1zSUdGeVozVnRaVzUwY3lrN1hHNGdJSDFjYmx4dUlDQnlaWFIxY200Z1pHVndjbVZqWVhSbFpEdGNibjA3WEc1Y2JseHVkbUZ5SUdSbFluVm5jeUE5SUh0OU8xeHVkbUZ5SUdSbFluVm5SVzUyYVhKdmJqdGNibVY0Y0c5eWRITXVaR1ZpZFdkc2IyY2dQU0JtZFc1amRHbHZiaWh6WlhRcElIdGNiaUFnYVdZZ0tHbHpWVzVrWldacGJtVmtLR1JsWW5WblJXNTJhWEp2YmlrcFhHNGdJQ0FnWkdWaWRXZEZiblpwY205dUlEMGdjSEp2WTJWemN5NWxibll1VGs5RVJWOUVSVUpWUnlCOGZDQW5KenRjYmlBZ2MyVjBJRDBnYzJWMExuUnZWWEJ3WlhKRFlYTmxLQ2s3WEc0Z0lHbG1JQ2doWkdWaWRXZHpXM05sZEYwcElIdGNiaUFnSUNCcFppQW9ibVYzSUZKbFowVjRjQ2duWEZ4Y1hHSW5JQ3NnYzJWMElDc2dKMXhjWEZ4aUp5d2dKMmtuS1M1MFpYTjBLR1JsWW5WblJXNTJhWEp2YmlrcElIdGNiaUFnSUNBZ0lIWmhjaUJ3YVdRZ1BTQndjbTlqWlhOekxuQnBaRHRjYmlBZ0lDQWdJR1JsWW5WbmMxdHpaWFJkSUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCdGMyY2dQU0JsZUhCdmNuUnpMbVp2Y20xaGRDNWhjSEJzZVNobGVIQnZjblJ6TENCaGNtZDFiV1Z1ZEhNcE8xeHVJQ0FnSUNBZ0lDQmpiMjV6YjJ4bExtVnljbTl5S0NjbGN5QWxaRG9nSlhNbkxDQnpaWFFzSUhCcFpDd2diWE5uS1R0Y2JpQWdJQ0FnSUgwN1hHNGdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJR1JsWW5WbmMxdHpaWFJkSUQwZ1puVnVZM1JwYjI0b0tTQjdmVHRjYmlBZ0lDQjlYRzRnSUgxY2JpQWdjbVYwZFhKdUlHUmxZblZuYzF0elpYUmRPMXh1ZlR0Y2JseHVYRzR2S2lwY2JpQXFJRVZqYUc5eklIUm9aU0IyWVd4MVpTQnZaaUJoSUhaaGJIVmxMaUJVY25seklIUnZJSEJ5YVc1MElIUm9aU0IyWVd4MVpTQnZkWFJjYmlBcUlHbHVJSFJvWlNCaVpYTjBJSGRoZVNCd2IzTnphV0pzWlNCbmFYWmxiaUIwYUdVZ1pHbG1abVZ5Wlc1MElIUjVjR1Z6TGx4dUlDcGNiaUFxSUVCd1lYSmhiU0I3VDJKcVpXTjBmU0J2WW1vZ1ZHaGxJRzlpYW1WamRDQjBieUJ3Y21sdWRDQnZkWFF1WEc0Z0tpQkFjR0Z5WVcwZ2UwOWlhbVZqZEgwZ2IzQjBjeUJQY0hScGIyNWhiQ0J2Y0hScGIyNXpJRzlpYW1WamRDQjBhR0YwSUdGc2RHVnljeUIwYUdVZ2IzVjBjSFYwTGx4dUlDb3ZYRzR2S2lCc1pXZGhZM2s2SUc5aWFpd2djMmh2ZDBocFpHUmxiaXdnWkdWd2RHZ3NJR052Ykc5eWN5b3ZYRzVtZFc1amRHbHZiaUJwYm5Od1pXTjBLRzlpYWl3Z2IzQjBjeWtnZTF4dUlDQXZMeUJrWldaaGRXeDBJRzl3ZEdsdmJuTmNiaUFnZG1GeUlHTjBlQ0E5SUh0Y2JpQWdJQ0J6WldWdU9pQmJYU3hjYmlBZ0lDQnpkSGxzYVhwbE9pQnpkSGxzYVhwbFRtOURiMnh2Y2x4dUlDQjlPMXh1SUNBdkx5QnNaV2RoWTNrdUxpNWNiaUFnYVdZZ0tHRnlaM1Z0Wlc1MGN5NXNaVzVuZEdnZ1BqMGdNeWtnWTNSNExtUmxjSFJvSUQwZ1lYSm5kVzFsYm5Seld6SmRPMXh1SUNCcFppQW9ZWEpuZFcxbGJuUnpMbXhsYm1kMGFDQStQU0EwS1NCamRIZ3VZMjlzYjNKeklEMGdZWEpuZFcxbGJuUnpXek5kTzF4dUlDQnBaaUFvYVhOQ2IyOXNaV0Z1S0c5d2RITXBLU0I3WEc0Z0lDQWdMeThnYkdWbllXTjVMaTR1WEc0Z0lDQWdZM1I0TG5Ob2IzZElhV1JrWlc0Z1BTQnZjSFJ6TzF4dUlDQjlJR1ZzYzJVZ2FXWWdLRzl3ZEhNcElIdGNiaUFnSUNBdkx5Qm5iM1FnWVc0Z1hDSnZjSFJwYjI1elhDSWdiMkpxWldOMFhHNGdJQ0FnWlhod2IzSjBjeTVmWlhoMFpXNWtLR04wZUN3Z2IzQjBjeWs3WEc0Z0lIMWNiaUFnTHk4Z2MyVjBJR1JsWm1GMWJIUWdiM0IwYVc5dWMxeHVJQ0JwWmlBb2FYTlZibVJsWm1sdVpXUW9ZM1I0TG5Ob2IzZElhV1JrWlc0cEtTQmpkSGd1YzJodmQwaHBaR1JsYmlBOUlHWmhiSE5sTzF4dUlDQnBaaUFvYVhOVmJtUmxabWx1WldRb1kzUjRMbVJsY0hSb0tTa2dZM1I0TG1SbGNIUm9JRDBnTWp0Y2JpQWdhV1lnS0dselZXNWtaV1pwYm1Wa0tHTjBlQzVqYjJ4dmNuTXBLU0JqZEhndVkyOXNiM0p6SUQwZ1ptRnNjMlU3WEc0Z0lHbG1JQ2hwYzFWdVpHVm1hVzVsWkNoamRIZ3VZM1Z6ZEc5dFNXNXpjR1ZqZENrcElHTjBlQzVqZFhOMGIyMUpibk53WldOMElEMGdkSEoxWlR0Y2JpQWdhV1lnS0dOMGVDNWpiMnh2Y25NcElHTjBlQzV6ZEhsc2FYcGxJRDBnYzNSNWJHbDZaVmRwZEdoRGIyeHZjanRjYmlBZ2NtVjBkWEp1SUdadmNtMWhkRlpoYkhWbEtHTjBlQ3dnYjJKcUxDQmpkSGd1WkdWd2RHZ3BPMXh1ZlZ4dVpYaHdiM0owY3k1cGJuTndaV04wSUQwZ2FXNXpjR1ZqZER0Y2JseHVYRzR2THlCb2RIUndPaTh2Wlc0dWQybHJhWEJsWkdsaExtOXlaeTkzYVd0cEwwRk9VMGxmWlhOallYQmxYMk52WkdValozSmhjR2hwWTNOY2JtbHVjM0JsWTNRdVkyOXNiM0p6SUQwZ2UxeHVJQ0FuWW05c1pDY2dPaUJiTVN3Z01qSmRMRnh1SUNBbmFYUmhiR2xqSnlBNklGc3pMQ0F5TTEwc1hHNGdJQ2QxYm1SbGNteHBibVVuSURvZ1d6UXNJREkwWFN4Y2JpQWdKMmx1ZG1WeWMyVW5JRG9nV3pjc0lESTNYU3hjYmlBZ0ozZG9hWFJsSnlBNklGc3pOeXdnTXpsZExGeHVJQ0FuWjNKbGVTY2dPaUJiT1RBc0lETTVYU3hjYmlBZ0oySnNZV05ySnlBNklGc3pNQ3dnTXpsZExGeHVJQ0FuWW14MVpTY2dPaUJiTXpRc0lETTVYU3hjYmlBZ0oyTjVZVzRuSURvZ1d6TTJMQ0F6T1Ywc1hHNGdJQ2RuY21WbGJpY2dPaUJiTXpJc0lETTVYU3hjYmlBZ0oyMWhaMlZ1ZEdFbklEb2dXek0xTENBek9WMHNYRzRnSUNkeVpXUW5JRG9nV3pNeExDQXpPVjBzWEc0Z0lDZDVaV3hzYjNjbklEb2dXek16TENBek9WMWNibjA3WEc1Y2JpOHZJRVJ2YmlkMElIVnpaU0FuWW14MVpTY2dibTkwSUhacGMybGliR1VnYjI0Z1kyMWtMbVY0WlZ4dWFXNXpjR1ZqZEM1emRIbHNaWE1nUFNCN1hHNGdJQ2R6Y0dWamFXRnNKem9nSjJONVlXNG5MRnh1SUNBbmJuVnRZbVZ5SnpvZ0ozbGxiR3h2ZHljc1hHNGdJQ2RpYjI5c1pXRnVKem9nSjNsbGJHeHZkeWNzWEc0Z0lDZDFibVJsWm1sdVpXUW5PaUFuWjNKbGVTY3NYRzRnSUNkdWRXeHNKem9nSjJKdmJHUW5MRnh1SUNBbmMzUnlhVzVuSnpvZ0oyZHlaV1Z1Snl4Y2JpQWdKMlJoZEdVbk9pQW5iV0ZuWlc1MFlTY3NYRzRnSUM4dklGd2libUZ0WlZ3aU9pQnBiblJsYm5ScGIyNWhiR3g1SUc1dmRDQnpkSGxzYVc1blhHNGdJQ2R5WldkbGVIQW5PaUFuY21Wa0oxeHVmVHRjYmx4dVhHNW1kVzVqZEdsdmJpQnpkSGxzYVhwbFYybDBhRU52Ykc5eUtITjBjaXdnYzNSNWJHVlVlWEJsS1NCN1hHNGdJSFpoY2lCemRIbHNaU0E5SUdsdWMzQmxZM1F1YzNSNWJHVnpXM04wZVd4bFZIbHdaVjA3WEc1Y2JpQWdhV1lnS0hOMGVXeGxLU0I3WEc0Z0lDQWdjbVYwZFhKdUlDZGNYSFV3TURGaVd5Y2dLeUJwYm5Od1pXTjBMbU52Ykc5eWMxdHpkSGxzWlYxYk1GMGdLeUFuYlNjZ0t5QnpkSElnSzF4dUlDQWdJQ0FnSUNBZ0lDQW5YRngxTURBeFlsc25JQ3NnYVc1emNHVmpkQzVqYjJ4dmNuTmJjM1I1YkdWZFd6RmRJQ3NnSjIwbk8xeHVJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lISmxkSFZ5YmlCemRISTdYRzRnSUgxY2JuMWNibHh1WEc1bWRXNWpkR2x2YmlCemRIbHNhWHBsVG05RGIyeHZjaWh6ZEhJc0lITjBlV3hsVkhsd1pTa2dlMXh1SUNCeVpYUjFjbTRnYzNSeU8xeHVmVnh1WEc1Y2JtWjFibU4wYVc5dUlHRnljbUY1Vkc5SVlYTm9LR0Z5Y21GNUtTQjdYRzRnSUhaaGNpQm9ZWE5vSUQwZ2UzMDdYRzVjYmlBZ1lYSnlZWGt1Wm05eVJXRmphQ2htZFc1amRHbHZiaWgyWVd3c0lHbGtlQ2tnZTF4dUlDQWdJR2hoYzJoYmRtRnNYU0E5SUhSeWRXVTdYRzRnSUgwcE8xeHVYRzRnSUhKbGRIVnliaUJvWVhOb08xeHVmVnh1WEc1Y2JtWjFibU4wYVc5dUlHWnZjbTFoZEZaaGJIVmxLR04wZUN3Z2RtRnNkV1VzSUhKbFkzVnljMlZVYVcxbGN5a2dlMXh1SUNBdkx5QlFjbTkyYVdSbElHRWdhRzl2YXlCbWIzSWdkWE5sY2kxemNHVmphV1pwWldRZ2FXNXpjR1ZqZENCbWRXNWpkR2x2Ym5NdVhHNGdJQzh2SUVOb1pXTnJJSFJvWVhRZ2RtRnNkV1VnYVhNZ1lXNGdiMkpxWldOMElIZHBkR2dnWVc0Z2FXNXpjR1ZqZENCbWRXNWpkR2x2YmlCdmJpQnBkRnh1SUNCcFppQW9ZM1I0TG1OMWMzUnZiVWx1YzNCbFkzUWdKaVpjYmlBZ0lDQWdJSFpoYkhWbElDWW1YRzRnSUNBZ0lDQnBjMFoxYm1OMGFXOXVLSFpoYkhWbExtbHVjM0JsWTNRcElDWW1YRzRnSUNBZ0lDQXZMeUJHYVd4MFpYSWdiM1YwSUhSb1pTQjFkR2xzSUcxdlpIVnNaU3dnYVhRbmN5QnBibk53WldOMElHWjFibU4wYVc5dUlHbHpJSE53WldOcFlXeGNiaUFnSUNBZ0lIWmhiSFZsTG1sdWMzQmxZM1FnSVQwOUlHVjRjRzl5ZEhNdWFXNXpjR1ZqZENBbUpseHVJQ0FnSUNBZ0x5OGdRV3h6YnlCbWFXeDBaWElnYjNWMElHRnVlU0J3Y205MGIzUjVjR1VnYjJKcVpXTjBjeUIxYzJsdVp5QjBhR1VnWTJseVkzVnNZWElnWTJobFkyc3VYRzRnSUNBZ0lDQWhLSFpoYkhWbExtTnZibk4wY25WamRHOXlJQ1ltSUhaaGJIVmxMbU52Ym5OMGNuVmpkRzl5TG5CeWIzUnZkSGx3WlNBOVBUMGdkbUZzZFdVcEtTQjdYRzRnSUNBZ2RtRnlJSEpsZENBOUlIWmhiSFZsTG1sdWMzQmxZM1FvY21WamRYSnpaVlJwYldWekxDQmpkSGdwTzF4dUlDQWdJR2xtSUNnaGFYTlRkSEpwYm1jb2NtVjBLU2tnZTF4dUlDQWdJQ0FnY21WMElEMGdabTl5YldGMFZtRnNkV1VvWTNSNExDQnlaWFFzSUhKbFkzVnljMlZVYVcxbGN5azdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJ5WlhRN1hHNGdJSDFjYmx4dUlDQXZMeUJRY21sdGFYUnBkbVVnZEhsd1pYTWdZMkZ1Ym05MElHaGhkbVVnY0hKdmNHVnlkR2xsYzF4dUlDQjJZWElnY0hKcGJXbDBhWFpsSUQwZ1ptOXliV0YwVUhKcGJXbDBhWFpsS0dOMGVDd2dkbUZzZFdVcE8xeHVJQ0JwWmlBb2NISnBiV2wwYVhabEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUhCeWFXMXBkR2wyWlR0Y2JpQWdmVnh1WEc0Z0lDOHZJRXh2YjJzZ2RYQWdkR2hsSUd0bGVYTWdiMllnZEdobElHOWlhbVZqZEM1Y2JpQWdkbUZ5SUd0bGVYTWdQU0JQWW1wbFkzUXVhMlY1Y3loMllXeDFaU2s3WEc0Z0lIWmhjaUIyYVhOcFlteGxTMlY1Y3lBOUlHRnljbUY1Vkc5SVlYTm9LR3RsZVhNcE8xeHVYRzRnSUdsbUlDaGpkSGd1YzJodmQwaHBaR1JsYmlrZ2UxeHVJQ0FnSUd0bGVYTWdQU0JQWW1wbFkzUXVaMlYwVDNkdVVISnZjR1Z5ZEhsT1lXMWxjeWgyWVd4MVpTazdYRzRnSUgxY2JseHVJQ0F2THlCSlJTQmtiMlZ6YmlkMElHMWhhMlVnWlhKeWIzSWdabWxsYkdSeklHNXZiaTFsYm5WdFpYSmhZbXhsWEc0Z0lDOHZJR2gwZEhBNkx5OXRjMlJ1TG0xcFkzSnZjMjltZEM1amIyMHZaVzR0ZFhNdmJHbGljbUZ5ZVM5cFpTOWtkM2MxTW5OaWRDaDJQWFp6TGprMEtTNWhjM0I0WEc0Z0lHbG1JQ2hwYzBWeWNtOXlLSFpoYkhWbEtWeHVJQ0FnSUNBZ0ppWWdLR3RsZVhNdWFXNWtaWGhQWmlnbmJXVnpjMkZuWlNjcElENDlJREFnZkh3Z2EyVjVjeTVwYm1SbGVFOW1LQ2RrWlhOamNtbHdkR2x2YmljcElENDlJREFwS1NCN1hHNGdJQ0FnY21WMGRYSnVJR1p2Y20xaGRFVnljbTl5S0haaGJIVmxLVHRjYmlBZ2ZWeHVYRzRnSUM4dklGTnZiV1VnZEhsd1pTQnZaaUJ2WW1wbFkzUWdkMmwwYUc5MWRDQndjbTl3WlhKMGFXVnpJR05oYmlCaVpTQnphRzl5ZEdOMWRIUmxaQzVjYmlBZ2FXWWdLR3RsZVhNdWJHVnVaM1JvSUQwOVBTQXdLU0I3WEc0Z0lDQWdhV1lnS0dselJuVnVZM1JwYjI0b2RtRnNkV1VwS1NCN1hHNGdJQ0FnSUNCMllYSWdibUZ0WlNBOUlIWmhiSFZsTG01aGJXVWdQeUFuT2lBbklDc2dkbUZzZFdVdWJtRnRaU0E2SUNjbk8xeHVJQ0FnSUNBZ2NtVjBkWEp1SUdOMGVDNXpkSGxzYVhwbEtDZGJSblZ1WTNScGIyNG5JQ3NnYm1GdFpTQXJJQ2RkSnl3Z0ozTndaV05wWVd3bktUdGNiaUFnSUNCOVhHNGdJQ0FnYVdZZ0tHbHpVbVZuUlhod0tIWmhiSFZsS1NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdOMGVDNXpkSGxzYVhwbEtGSmxaMFY0Y0M1d2NtOTBiM1I1Y0dVdWRHOVRkSEpwYm1jdVkyRnNiQ2gyWVd4MVpTa3NJQ2R5WldkbGVIQW5LVHRjYmlBZ0lDQjlYRzRnSUNBZ2FXWWdLR2x6UkdGMFpTaDJZV3gxWlNrcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCamRIZ3VjM1I1YkdsNlpTaEVZWFJsTG5CeWIzUnZkSGx3WlM1MGIxTjBjbWx1Wnk1allXeHNLSFpoYkhWbEtTd2dKMlJoZEdVbktUdGNiaUFnSUNCOVhHNGdJQ0FnYVdZZ0tHbHpSWEp5YjNJb2RtRnNkV1VwS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWm05eWJXRjBSWEp5YjNJb2RtRnNkV1VwTzF4dUlDQWdJSDFjYmlBZ2ZWeHVYRzRnSUhaaGNpQmlZWE5sSUQwZ0p5Y3NJR0Z5Y21GNUlEMGdabUZzYzJVc0lHSnlZV05sY3lBOUlGc25leWNzSUNkOUoxMDdYRzVjYmlBZ0x5OGdUV0ZyWlNCQmNuSmhlU0J6WVhrZ2RHaGhkQ0IwYUdWNUlHRnlaU0JCY25KaGVWeHVJQ0JwWmlBb2FYTkJjbkpoZVNoMllXeDFaU2twSUh0Y2JpQWdJQ0JoY25KaGVTQTlJSFJ5ZFdVN1hHNGdJQ0FnWW5KaFkyVnpJRDBnV3lkYkp5d2dKMTBuWFR0Y2JpQWdmVnh1WEc0Z0lDOHZJRTFoYTJVZ1puVnVZM1JwYjI1eklITmhlU0IwYUdGMElIUm9aWGtnWVhKbElHWjFibU4wYVc5dWMxeHVJQ0JwWmlBb2FYTkdkVzVqZEdsdmJpaDJZV3gxWlNrcElIdGNiaUFnSUNCMllYSWdiaUE5SUhaaGJIVmxMbTVoYldVZ1B5QW5PaUFuSUNzZ2RtRnNkV1V1Ym1GdFpTQTZJQ2NuTzF4dUlDQWdJR0poYzJVZ1BTQW5JRnRHZFc1amRHbHZiaWNnS3lCdUlDc2dKMTBuTzF4dUlDQjlYRzVjYmlBZ0x5OGdUV0ZyWlNCU1pXZEZlSEJ6SUhOaGVTQjBhR0YwSUhSb1pYa2dZWEpsSUZKbFowVjRjSE5jYmlBZ2FXWWdLR2x6VW1WblJYaHdLSFpoYkhWbEtTa2dlMXh1SUNBZ0lHSmhjMlVnUFNBbklDY2dLeUJTWldkRmVIQXVjSEp2ZEc5MGVYQmxMblJ2VTNSeWFXNW5MbU5oYkd3b2RtRnNkV1VwTzF4dUlDQjlYRzVjYmlBZ0x5OGdUV0ZyWlNCa1lYUmxjeUIzYVhSb0lIQnliM0JsY25ScFpYTWdabWx5YzNRZ2MyRjVJSFJvWlNCa1lYUmxYRzRnSUdsbUlDaHBjMFJoZEdVb2RtRnNkV1VwS1NCN1hHNGdJQ0FnWW1GelpTQTlJQ2NnSnlBcklFUmhkR1V1Y0hKdmRHOTBlWEJsTG5SdlZWUkRVM1J5YVc1bkxtTmhiR3dvZG1Gc2RXVXBPMXh1SUNCOVhHNWNiaUFnTHk4Z1RXRnJaU0JsY25KdmNpQjNhWFJvSUcxbGMzTmhaMlVnWm1seWMzUWdjMkY1SUhSb1pTQmxjbkp2Y2x4dUlDQnBaaUFvYVhORmNuSnZjaWgyWVd4MVpTa3BJSHRjYmlBZ0lDQmlZWE5sSUQwZ0p5QW5JQ3NnWm05eWJXRjBSWEp5YjNJb2RtRnNkV1VwTzF4dUlDQjlYRzVjYmlBZ2FXWWdLR3RsZVhNdWJHVnVaM1JvSUQwOVBTQXdJQ1ltSUNnaFlYSnlZWGtnZkh3Z2RtRnNkV1V1YkdWdVozUm9JRDA5SURBcEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUdKeVlXTmxjMXN3WFNBcklHSmhjMlVnS3lCaWNtRmpaWE5iTVYwN1hHNGdJSDFjYmx4dUlDQnBaaUFvY21WamRYSnpaVlJwYldWeklEd2dNQ2tnZTF4dUlDQWdJR2xtSUNocGMxSmxaMFY0Y0NoMllXeDFaU2twSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJqZEhndWMzUjViR2w2WlNoU1pXZEZlSEF1Y0hKdmRHOTBlWEJsTG5SdlUzUnlhVzVuTG1OaGJHd29kbUZzZFdVcExDQW5jbVZuWlhod0p5azdYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJqZEhndWMzUjViR2w2WlNnblcwOWlhbVZqZEYwbkxDQW5jM0JsWTJsaGJDY3BPMXh1SUNBZ0lIMWNiaUFnZlZ4dVhHNGdJR04wZUM1elpXVnVMbkIxYzJnb2RtRnNkV1VwTzF4dVhHNGdJSFpoY2lCdmRYUndkWFE3WEc0Z0lHbG1JQ2hoY25KaGVTa2dlMXh1SUNBZ0lHOTFkSEIxZENBOUlHWnZjbTFoZEVGeWNtRjVLR04wZUN3Z2RtRnNkV1VzSUhKbFkzVnljMlZVYVcxbGN5d2dkbWx6YVdKc1pVdGxlWE1zSUd0bGVYTXBPMXh1SUNCOUlHVnNjMlVnZTF4dUlDQWdJRzkxZEhCMWRDQTlJR3RsZVhNdWJXRndLR1oxYm1OMGFXOXVLR3RsZVNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdadmNtMWhkRkJ5YjNCbGNuUjVLR04wZUN3Z2RtRnNkV1VzSUhKbFkzVnljMlZVYVcxbGN5d2dkbWx6YVdKc1pVdGxlWE1zSUd0bGVTd2dZWEp5WVhrcE8xeHVJQ0FnSUgwcE8xeHVJQ0I5WEc1Y2JpQWdZM1I0TG5ObFpXNHVjRzl3S0NrN1hHNWNiaUFnY21WMGRYSnVJSEpsWkhWalpWUnZVMmx1WjJ4bFUzUnlhVzVuS0c5MWRIQjFkQ3dnWW1GelpTd2dZbkpoWTJWektUdGNibjFjYmx4dVhHNW1kVzVqZEdsdmJpQm1iM0p0WVhSUWNtbHRhWFJwZG1Vb1kzUjRMQ0IyWVd4MVpTa2dlMXh1SUNCcFppQW9hWE5WYm1SbFptbHVaV1FvZG1Gc2RXVXBLVnh1SUNBZ0lISmxkSFZ5YmlCamRIZ3VjM1I1YkdsNlpTZ25kVzVrWldacGJtVmtKeXdnSjNWdVpHVm1hVzVsWkNjcE8xeHVJQ0JwWmlBb2FYTlRkSEpwYm1jb2RtRnNkV1VwS1NCN1hHNGdJQ0FnZG1GeUlITnBiWEJzWlNBOUlDZGNYQ2NuSUNzZ1NsTlBUaTV6ZEhKcGJtZHBabmtvZG1Gc2RXVXBMbkpsY0d4aFkyVW9MMTVjSW54Y0lpUXZaeXdnSnljcFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQXVjbVZ3YkdGalpTZ3ZKeTluTENCY0lseGNYRnduWENJcFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQXVjbVZ3YkdGalpTZ3ZYRnhjWEZ3aUwyY3NJQ2RjSWljcElDc2dKMXhjSnljN1hHNGdJQ0FnY21WMGRYSnVJR04wZUM1emRIbHNhWHBsS0hOcGJYQnNaU3dnSjNOMGNtbHVaeWNwTzF4dUlDQjlYRzRnSUdsbUlDaHBjMDUxYldKbGNpaDJZV3gxWlNrcFhHNGdJQ0FnY21WMGRYSnVJR04wZUM1emRIbHNhWHBsS0NjbklDc2dkbUZzZFdVc0lDZHVkVzFpWlhJbktUdGNiaUFnYVdZZ0tHbHpRbTl2YkdWaGJpaDJZV3gxWlNrcFhHNGdJQ0FnY21WMGRYSnVJR04wZUM1emRIbHNhWHBsS0NjbklDc2dkbUZzZFdVc0lDZGliMjlzWldGdUp5azdYRzRnSUM4dklFWnZjaUJ6YjIxbElISmxZWE52YmlCMGVYQmxiMllnYm5Wc2JDQnBjeUJjSW05aWFtVmpkRndpTENCemJ5QnpjR1ZqYVdGc0lHTmhjMlVnYUdWeVpTNWNiaUFnYVdZZ0tHbHpUblZzYkNoMllXeDFaU2twWEc0Z0lDQWdjbVYwZFhKdUlHTjBlQzV6ZEhsc2FYcGxLQ2R1ZFd4c0p5d2dKMjUxYkd3bktUdGNibjFjYmx4dVhHNW1kVzVqZEdsdmJpQm1iM0p0WVhSRmNuSnZjaWgyWVd4MVpTa2dlMXh1SUNCeVpYUjFjbTRnSjFzbklDc2dSWEp5YjNJdWNISnZkRzkwZVhCbExuUnZVM1J5YVc1bkxtTmhiR3dvZG1Gc2RXVXBJQ3NnSjEwbk8xeHVmVnh1WEc1Y2JtWjFibU4wYVc5dUlHWnZjbTFoZEVGeWNtRjVLR04wZUN3Z2RtRnNkV1VzSUhKbFkzVnljMlZVYVcxbGN5d2dkbWx6YVdKc1pVdGxlWE1zSUd0bGVYTXBJSHRjYmlBZ2RtRnlJRzkxZEhCMWRDQTlJRnRkTzF4dUlDQm1iM0lnS0haaGNpQnBJRDBnTUN3Z2JDQTlJSFpoYkhWbExteGxibWQwYURzZ2FTQThJR3c3SUNzcmFTa2dlMXh1SUNBZ0lHbG1JQ2hvWVhOUGQyNVFjbTl3WlhKMGVTaDJZV3gxWlN3Z1UzUnlhVzVuS0drcEtTa2dlMXh1SUNBZ0lDQWdiM1YwY0hWMExuQjFjMmdvWm05eWJXRjBVSEp2Y0dWeWRIa29ZM1I0TENCMllXeDFaU3dnY21WamRYSnpaVlJwYldWekxDQjJhWE5wWW14bFMyVjVjeXhjYmlBZ0lDQWdJQ0FnSUNCVGRISnBibWNvYVNrc0lIUnlkV1VwS1R0Y2JpQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdiM1YwY0hWMExuQjFjMmdvSnljcE8xeHVJQ0FnSUgxY2JpQWdmVnh1SUNCclpYbHpMbVp2Y2tWaFkyZ29ablZ1WTNScGIyNG9hMlY1S1NCN1hHNGdJQ0FnYVdZZ0tDRnJaWGt1YldGMFkyZ29MMTVjWEdRckpDOHBLU0I3WEc0Z0lDQWdJQ0J2ZFhSd2RYUXVjSFZ6YUNobWIzSnRZWFJRY205d1pYSjBlU2hqZEhnc0lIWmhiSFZsTENCeVpXTjFjbk5sVkdsdFpYTXNJSFpwYzJsaWJHVkxaWGx6TEZ4dUlDQWdJQ0FnSUNBZ0lHdGxlU3dnZEhKMVpTa3BPMXh1SUNBZ0lIMWNiaUFnZlNrN1hHNGdJSEpsZEhWeWJpQnZkWFJ3ZFhRN1hHNTlYRzVjYmx4dVpuVnVZM1JwYjI0Z1ptOXliV0YwVUhKdmNHVnlkSGtvWTNSNExDQjJZV3gxWlN3Z2NtVmpkWEp6WlZScGJXVnpMQ0IyYVhOcFlteGxTMlY1Y3l3Z2EyVjVMQ0JoY25KaGVTa2dlMXh1SUNCMllYSWdibUZ0WlN3Z2MzUnlMQ0JrWlhOak8xeHVJQ0JrWlhOaklEMGdUMkpxWldOMExtZGxkRTkzYmxCeWIzQmxjblI1UkdWelkzSnBjSFJ2Y2loMllXeDFaU3dnYTJWNUtTQjhmQ0I3SUhaaGJIVmxPaUIyWVd4MVpWdHJaWGxkSUgwN1hHNGdJR2xtSUNoa1pYTmpMbWRsZENrZ2UxeHVJQ0FnSUdsbUlDaGtaWE5qTG5ObGRDa2dlMXh1SUNBZ0lDQWdjM1J5SUQwZ1kzUjRMbk4wZVd4cGVtVW9KMXRIWlhSMFpYSXZVMlYwZEdWeVhTY3NJQ2R6Y0dWamFXRnNKeWs3WEc0Z0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lITjBjaUE5SUdOMGVDNXpkSGxzYVhwbEtDZGJSMlYwZEdWeVhTY3NJQ2R6Y0dWamFXRnNKeWs3WEc0Z0lDQWdmVnh1SUNCOUlHVnNjMlVnZTF4dUlDQWdJR2xtSUNoa1pYTmpMbk5sZENrZ2UxeHVJQ0FnSUNBZ2MzUnlJRDBnWTNSNExuTjBlV3hwZW1Vb0oxdFRaWFIwWlhKZEp5d2dKM053WldOcFlXd25LVHRjYmlBZ0lDQjlYRzRnSUgxY2JpQWdhV1lnS0NGb1lYTlBkMjVRY205d1pYSjBlU2gyYVhOcFlteGxTMlY1Y3l3Z2EyVjVLU2tnZTF4dUlDQWdJRzVoYldVZ1BTQW5XeWNnS3lCclpYa2dLeUFuWFNjN1hHNGdJSDFjYmlBZ2FXWWdLQ0Z6ZEhJcElIdGNiaUFnSUNCcFppQW9ZM1I0TG5ObFpXNHVhVzVrWlhoUFppaGtaWE5qTG5aaGJIVmxLU0E4SURBcElIdGNiaUFnSUNBZ0lHbG1JQ2hwYzA1MWJHd29jbVZqZFhKelpWUnBiV1Z6S1NrZ2UxeHVJQ0FnSUNBZ0lDQnpkSElnUFNCbWIzSnRZWFJXWVd4MVpTaGpkSGdzSUdSbGMyTXVkbUZzZFdVc0lHNTFiR3dwTzF4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnYzNSeUlEMGdabTl5YldGMFZtRnNkV1VvWTNSNExDQmtaWE5qTG5aaGJIVmxMQ0J5WldOMWNuTmxWR2x0WlhNZ0xTQXhLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNoemRISXVhVzVrWlhoUFppZ25YRnh1SnlrZ1BpQXRNU2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9ZWEp5WVhrcElIdGNiaUFnSUNBZ0lDQWdJQ0J6ZEhJZ1BTQnpkSEl1YzNCc2FYUW9KMXhjYmljcExtMWhjQ2htZFc1amRHbHZiaWhzYVc1bEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnSnlBZ0p5QXJJR3hwYm1VN1hHNGdJQ0FnSUNBZ0lDQWdmU2t1YW05cGJpZ25YRnh1SnlrdWMzVmljM1J5S0RJcE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJSE4wY2lBOUlDZGNYRzRuSUNzZ2MzUnlMbk53YkdsMEtDZGNYRzRuS1M1dFlYQW9ablZ1WTNScGIyNG9iR2x1WlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ2NnSUNBbklDc2diR2x1WlR0Y2JpQWdJQ0FnSUNBZ0lDQjlLUzVxYjJsdUtDZGNYRzRuS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0J6ZEhJZ1BTQmpkSGd1YzNSNWJHbDZaU2duVzBOcGNtTjFiR0Z5WFNjc0lDZHpjR1ZqYVdGc0p5azdYRzRnSUNBZ2ZWeHVJQ0I5WEc0Z0lHbG1JQ2hwYzFWdVpHVm1hVzVsWkNodVlXMWxLU2tnZTF4dUlDQWdJR2xtSUNoaGNuSmhlU0FtSmlCclpYa3ViV0YwWTJnb0wxNWNYR1FySkM4cEtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2MzUnlPMXh1SUNBZ0lIMWNiaUFnSUNCdVlXMWxJRDBnU2xOUFRpNXpkSEpwYm1kcFpua29KeWNnS3lCclpYa3BPMXh1SUNBZ0lHbG1JQ2h1WVcxbExtMWhkR05vS0M5ZVhDSW9XMkV0ZWtFdFdsOWRXMkV0ZWtFdFdsOHdMVGxkS2lsY0lpUXZLU2tnZTF4dUlDQWdJQ0FnYm1GdFpTQTlJRzVoYldVdWMzVmljM1J5S0RFc0lHNWhiV1V1YkdWdVozUm9JQzBnTWlrN1hHNGdJQ0FnSUNCdVlXMWxJRDBnWTNSNExuTjBlV3hwZW1Vb2JtRnRaU3dnSjI1aGJXVW5LVHRjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ2JtRnRaU0E5SUc1aGJXVXVjbVZ3YkdGalpTZ3ZKeTluTENCY0lseGNYRnduWENJcFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDNXlaWEJzWVdObEtDOWNYRnhjWENJdlp5d2dKMXdpSnlsY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0xuSmxjR3hoWTJVb0x5aGVYQ0o4WENJa0tTOW5MQ0JjSWlkY0lpazdYRzRnSUNBZ0lDQnVZVzFsSUQwZ1kzUjRMbk4wZVd4cGVtVW9ibUZ0WlN3Z0ozTjBjbWx1WnljcE8xeHVJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lISmxkSFZ5YmlCdVlXMWxJQ3NnSnpvZ0p5QXJJSE4wY2p0Y2JuMWNibHh1WEc1bWRXNWpkR2x2YmlCeVpXUjFZMlZVYjFOcGJtZHNaVk4wY21sdVp5aHZkWFJ3ZFhRc0lHSmhjMlVzSUdKeVlXTmxjeWtnZTF4dUlDQjJZWElnYm5WdFRHbHVaWE5GYzNRZ1BTQXdPMXh1SUNCMllYSWdiR1Z1WjNSb0lEMGdiM1YwY0hWMExuSmxaSFZqWlNobWRXNWpkR2x2Ymlod2NtVjJMQ0JqZFhJcElIdGNiaUFnSUNCdWRXMU1hVzVsYzBWemRDc3JPMXh1SUNBZ0lHbG1JQ2hqZFhJdWFXNWtaWGhQWmlnblhGeHVKeWtnUGowZ01Da2diblZ0VEdsdVpYTkZjM1FyS3p0Y2JpQWdJQ0J5WlhSMWNtNGdjSEpsZGlBcklHTjFjaTV5WlhCc1lXTmxLQzljWEhVd01ERmlYRnhiWEZ4a1hGeGtQMjB2Wnl3Z0p5Y3BMbXhsYm1kMGFDQXJJREU3WEc0Z0lIMHNJREFwTzF4dVhHNGdJR2xtSUNoc1pXNW5kR2dnUGlBMk1Da2dlMXh1SUNBZ0lISmxkSFZ5YmlCaWNtRmpaWE5iTUYwZ0sxeHVJQ0FnSUNBZ0lDQWdJQ0FvWW1GelpTQTlQVDBnSnljZ1B5QW5KeUE2SUdKaGMyVWdLeUFuWEZ4dUlDY3BJQ3RjYmlBZ0lDQWdJQ0FnSUNBZ0p5QW5JQ3RjYmlBZ0lDQWdJQ0FnSUNBZ2IzVjBjSFYwTG1wdmFXNG9KeXhjWEc0Z0lDY3BJQ3RjYmlBZ0lDQWdJQ0FnSUNBZ0p5QW5JQ3RjYmlBZ0lDQWdJQ0FnSUNBZ1luSmhZMlZ6V3pGZE8xeHVJQ0I5WEc1Y2JpQWdjbVYwZFhKdUlHSnlZV05sYzFzd1hTQXJJR0poYzJVZ0t5QW5JQ2NnS3lCdmRYUndkWFF1YW05cGJpZ25MQ0FuS1NBcklDY2dKeUFySUdKeVlXTmxjMXN4WFR0Y2JuMWNibHh1WEc0dkx5Qk9UMVJGT2lCVWFHVnpaU0IwZVhCbElHTm9aV05yYVc1bklHWjFibU4wYVc5dWN5QnBiblJsYm5ScGIyNWhiR3g1SUdSdmJpZDBJSFZ6WlNCZ2FXNXpkR0Z1WTJWdlptQmNiaTh2SUdKbFkyRjFjMlVnYVhRZ2FYTWdabkpoWjJsc1pTQmhibVFnWTJGdUlHSmxJR1ZoYzJsc2VTQm1ZV3RsWkNCM2FYUm9JR0JQWW1wbFkzUXVZM0psWVhSbEtDbGdMbHh1Wm5WdVkzUnBiMjRnYVhOQmNuSmhlU2hoY2lrZ2UxeHVJQ0J5WlhSMWNtNGdRWEp5WVhrdWFYTkJjbkpoZVNoaGNpazdYRzU5WEc1bGVIQnZjblJ6TG1selFYSnlZWGtnUFNCcGMwRnljbUY1TzF4dVhHNW1kVzVqZEdsdmJpQnBjMEp2YjJ4bFlXNG9ZWEpuS1NCN1hHNGdJSEpsZEhWeWJpQjBlWEJsYjJZZ1lYSm5JRDA5UFNBblltOXZiR1ZoYmljN1hHNTlYRzVsZUhCdmNuUnpMbWx6UW05dmJHVmhiaUE5SUdselFtOXZiR1ZoYmp0Y2JseHVablZ1WTNScGIyNGdhWE5PZFd4c0tHRnlaeWtnZTF4dUlDQnlaWFIxY200Z1lYSm5JRDA5UFNCdWRXeHNPMXh1ZlZ4dVpYaHdiM0owY3k1cGMwNTFiR3dnUFNCcGMwNTFiR3c3WEc1Y2JtWjFibU4wYVc5dUlHbHpUblZzYkU5eVZXNWtaV1pwYm1Wa0tHRnlaeWtnZTF4dUlDQnlaWFIxY200Z1lYSm5JRDA5SUc1MWJHdzdYRzU5WEc1bGVIQnZjblJ6TG1selRuVnNiRTl5Vlc1a1pXWnBibVZrSUQwZ2FYTk9kV3hzVDNKVmJtUmxabWx1WldRN1hHNWNibVoxYm1OMGFXOXVJR2x6VG5WdFltVnlLR0Z5WnlrZ2UxeHVJQ0J5WlhSMWNtNGdkSGx3Wlc5bUlHRnlaeUE5UFQwZ0oyNTFiV0psY2ljN1hHNTlYRzVsZUhCdmNuUnpMbWx6VG5WdFltVnlJRDBnYVhOT2RXMWlaWEk3WEc1Y2JtWjFibU4wYVc5dUlHbHpVM1J5YVc1bktHRnlaeWtnZTF4dUlDQnlaWFIxY200Z2RIbHdaVzltSUdGeVp5QTlQVDBnSjNOMGNtbHVaeWM3WEc1OVhHNWxlSEJ2Y25SekxtbHpVM1J5YVc1bklEMGdhWE5UZEhKcGJtYzdYRzVjYm1aMWJtTjBhVzl1SUdselUzbHRZbTlzS0dGeVp5a2dlMXh1SUNCeVpYUjFjbTRnZEhsd1pXOW1JR0Z5WnlBOVBUMGdKM041YldKdmJDYzdYRzU5WEc1bGVIQnZjblJ6TG1selUzbHRZbTlzSUQwZ2FYTlRlVzFpYjJ3N1hHNWNibVoxYm1OMGFXOXVJR2x6Vlc1a1pXWnBibVZrS0dGeVp5a2dlMXh1SUNCeVpYUjFjbTRnWVhKbklEMDlQU0IyYjJsa0lEQTdYRzU5WEc1bGVIQnZjblJ6TG1selZXNWtaV1pwYm1Wa0lEMGdhWE5WYm1SbFptbHVaV1E3WEc1Y2JtWjFibU4wYVc5dUlHbHpVbVZuUlhod0tISmxLU0I3WEc0Z0lISmxkSFZ5YmlCcGMwOWlhbVZqZENoeVpTa2dKaVlnYjJKcVpXTjBWRzlUZEhKcGJtY29jbVVwSUQwOVBTQW5XMjlpYW1WamRDQlNaV2RGZUhCZEp6dGNibjFjYm1WNGNHOXlkSE11YVhOU1pXZEZlSEFnUFNCcGMxSmxaMFY0Y0R0Y2JseHVablZ1WTNScGIyNGdhWE5QWW1wbFkzUW9ZWEpuS1NCN1hHNGdJSEpsZEhWeWJpQjBlWEJsYjJZZ1lYSm5JRDA5UFNBbmIySnFaV04wSnlBbUppQmhjbWNnSVQwOUlHNTFiR3c3WEc1OVhHNWxlSEJ2Y25SekxtbHpUMkpxWldOMElEMGdhWE5QWW1wbFkzUTdYRzVjYm1aMWJtTjBhVzl1SUdselJHRjBaU2hrS1NCN1hHNGdJSEpsZEhWeWJpQnBjMDlpYW1WamRDaGtLU0FtSmlCdlltcGxZM1JVYjFOMGNtbHVaeWhrS1NBOVBUMGdKMXR2WW1wbFkzUWdSR0YwWlYwbk8xeHVmVnh1Wlhod2IzSjBjeTVwYzBSaGRHVWdQU0JwYzBSaGRHVTdYRzVjYm1aMWJtTjBhVzl1SUdselJYSnliM0lvWlNrZ2UxeHVJQ0J5WlhSMWNtNGdhWE5QWW1wbFkzUW9aU2tnSmlaY2JpQWdJQ0FnSUNodlltcGxZM1JVYjFOMGNtbHVaeWhsS1NBOVBUMGdKMXR2WW1wbFkzUWdSWEp5YjNKZEp5QjhmQ0JsSUdsdWMzUmhibU5sYjJZZ1JYSnliM0lwTzF4dWZWeHVaWGh3YjNKMGN5NXBjMFZ5Y205eUlEMGdhWE5GY25KdmNqdGNibHh1Wm5WdVkzUnBiMjRnYVhOR2RXNWpkR2x2YmloaGNtY3BJSHRjYmlBZ2NtVjBkWEp1SUhSNWNHVnZaaUJoY21jZ1BUMDlJQ2RtZFc1amRHbHZiaWM3WEc1OVhHNWxlSEJ2Y25SekxtbHpSblZ1WTNScGIyNGdQU0JwYzBaMWJtTjBhVzl1TzF4dVhHNW1kVzVqZEdsdmJpQnBjMUJ5YVcxcGRHbDJaU2hoY21jcElIdGNiaUFnY21WMGRYSnVJR0Z5WnlBOVBUMGdiblZzYkNCOGZGeHVJQ0FnSUNBZ0lDQWdkSGx3Wlc5bUlHRnlaeUE5UFQwZ0oySnZiMnhsWVc0bklIeDhYRzRnSUNBZ0lDQWdJQ0IwZVhCbGIyWWdZWEpuSUQwOVBTQW5iblZ0WW1WeUp5QjhmRnh1SUNBZ0lDQWdJQ0FnZEhsd1pXOW1JR0Z5WnlBOVBUMGdKM04wY21sdVp5Y2dmSHhjYmlBZ0lDQWdJQ0FnSUhSNWNHVnZaaUJoY21jZ1BUMDlJQ2R6ZVcxaWIyd25JSHg4SUNBdkx5QkZVellnYzNsdFltOXNYRzRnSUNBZ0lDQWdJQ0IwZVhCbGIyWWdZWEpuSUQwOVBTQW5kVzVrWldacGJtVmtKenRjYm4xY2JtVjRjRzl5ZEhNdWFYTlFjbWx0YVhScGRtVWdQU0JwYzFCeWFXMXBkR2wyWlR0Y2JseHVaWGh3YjNKMGN5NXBjMEoxWm1abGNpQTlJSEpsY1hWcGNtVW9KeTR2YzNWd2NHOXlkQzlwYzBKMVptWmxjaWNwTzF4dVhHNW1kVzVqZEdsdmJpQnZZbXBsWTNSVWIxTjBjbWx1WnlodktTQjdYRzRnSUhKbGRIVnliaUJQWW1wbFkzUXVjSEp2ZEc5MGVYQmxMblJ2VTNSeWFXNW5MbU5oYkd3b2J5azdYRzU5WEc1Y2JseHVablZ1WTNScGIyNGdjR0ZrS0c0cElIdGNiaUFnY21WMGRYSnVJRzRnUENBeE1DQS9JQ2N3SnlBcklHNHVkRzlUZEhKcGJtY29NVEFwSURvZ2JpNTBiMU4wY21sdVp5Z3hNQ2s3WEc1OVhHNWNibHh1ZG1GeUlHMXZiblJvY3lBOUlGc25TbUZ1Snl3Z0owWmxZaWNzSUNkTllYSW5MQ0FuUVhCeUp5d2dKMDFoZVNjc0lDZEtkVzRuTENBblNuVnNKeXdnSjBGMVp5Y3NJQ2RUWlhBbkxGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBblQyTjBKeXdnSjA1dmRpY3NJQ2RFWldNblhUdGNibHh1THk4Z01qWWdSbVZpSURFMk9qRTVPak0wWEc1bWRXNWpkR2x2YmlCMGFXMWxjM1JoYlhBb0tTQjdYRzRnSUhaaGNpQmtJRDBnYm1WM0lFUmhkR1VvS1R0Y2JpQWdkbUZ5SUhScGJXVWdQU0JiY0dGa0tHUXVaMlYwU0c5MWNuTW9LU2tzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSEJoWkNoa0xtZGxkRTFwYm5WMFpYTW9LU2tzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSEJoWkNoa0xtZGxkRk5sWTI5dVpITW9LU2xkTG1wdmFXNG9Kem9uS1R0Y2JpQWdjbVYwZFhKdUlGdGtMbWRsZEVSaGRHVW9LU3dnYlc5dWRHaHpXMlF1WjJWMFRXOXVkR2dvS1Ywc0lIUnBiV1ZkTG1wdmFXNG9KeUFuS1R0Y2JuMWNibHh1WEc0dkx5QnNiMmNnYVhNZ2FuVnpkQ0JoSUhSb2FXNGdkM0poY0hCbGNpQjBieUJqYjI1emIyeGxMbXh2WnlCMGFHRjBJSEJ5WlhCbGJtUnpJR0VnZEdsdFpYTjBZVzF3WEc1bGVIQnZjblJ6TG14dlp5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQmpiMjV6YjJ4bExteHZaeWduSlhNZ0xTQWxjeWNzSUhScGJXVnpkR0Z0Y0NncExDQmxlSEJ2Y25SekxtWnZjbTFoZEM1aGNIQnNlU2hsZUhCdmNuUnpMQ0JoY21kMWJXVnVkSE1wS1R0Y2JuMDdYRzVjYmx4dUx5b3FYRzRnS2lCSmJtaGxjbWwwSUhSb1pTQndjbTkwYjNSNWNHVWdiV1YwYUc5a2N5Qm1jbTl0SUc5dVpTQmpiMjV6ZEhKMVkzUnZjaUJwYm5SdklHRnViM1JvWlhJdVhHNGdLbHh1SUNvZ1ZHaGxJRVoxYm1OMGFXOXVMbkJ5YjNSdmRIbHdaUzVwYm1obGNtbDBjeUJtY205dElHeGhibWN1YW5NZ2NtVjNjbWwwZEdWdUlHRnpJR0VnYzNSaGJtUmhiRzl1WlZ4dUlDb2dablZ1WTNScGIyNGdLRzV2ZENCdmJpQkdkVzVqZEdsdmJpNXdjbTkwYjNSNWNHVXBMaUJPVDFSRk9pQkpaaUIwYUdseklHWnBiR1VnYVhNZ2RHOGdZbVVnYkc5aFpHVmtYRzRnS2lCa2RYSnBibWNnWW05dmRITjBjbUZ3Y0dsdVp5QjBhR2x6SUdaMWJtTjBhVzl1SUc1bFpXUnpJSFJ2SUdKbElISmxkM0pwZEhSbGJpQjFjMmx1WnlCemIyMWxJRzVoZEdsMlpWeHVJQ29nWm5WdVkzUnBiMjV6SUdGeklIQnliM1J2ZEhsd1pTQnpaWFIxY0NCMWMybHVaeUJ1YjNKdFlXd2dTbUYyWVZOamNtbHdkQ0JrYjJWeklHNXZkQ0IzYjNKcklHRnpYRzRnS2lCbGVIQmxZM1JsWkNCa2RYSnBibWNnWW05dmRITjBjbUZ3Y0dsdVp5QW9jMlZsSUcxcGNuSnZjaTVxY3lCcGJpQnlNVEUwT1RBektTNWNiaUFxWEc0Z0tpQkFjR0Z5WVcwZ2UyWjFibU4wYVc5dWZTQmpkRzl5SUVOdmJuTjBjblZqZEc5eUlHWjFibU4wYVc5dUlIZG9hV05vSUc1bFpXUnpJSFJ2SUdsdWFHVnlhWFFnZEdobFhHNGdLaUFnSUNBZ2NISnZkRzkwZVhCbExseHVJQ29nUUhCaGNtRnRJSHRtZFc1amRHbHZibjBnYzNWd1pYSkRkRzl5SUVOdmJuTjBjblZqZEc5eUlHWjFibU4wYVc5dUlIUnZJR2x1YUdWeWFYUWdjSEp2ZEc5MGVYQmxJR1p5YjIwdVhHNGdLaTljYm1WNGNHOXlkSE11YVc1b1pYSnBkSE1nUFNCeVpYRjFhWEpsS0NkcGJtaGxjbWwwY3ljcE8xeHVYRzVsZUhCdmNuUnpMbDlsZUhSbGJtUWdQU0JtZFc1amRHbHZiaWh2Y21sbmFXNHNJR0ZrWkNrZ2UxeHVJQ0F2THlCRWIyNG5kQ0JrYnlCaGJubDBhR2x1WnlCcFppQmhaR1FnYVhOdUozUWdZVzRnYjJKcVpXTjBYRzRnSUdsbUlDZ2hZV1JrSUh4OElDRnBjMDlpYW1WamRDaGhaR1FwS1NCeVpYUjFjbTRnYjNKcFoybHVPMXh1WEc0Z0lIWmhjaUJyWlhseklEMGdUMkpxWldOMExtdGxlWE1vWVdSa0tUdGNiaUFnZG1GeUlHa2dQU0JyWlhsekxteGxibWQwYUR0Y2JpQWdkMmhwYkdVZ0tHa3RMU2tnZTF4dUlDQWdJRzl5YVdkcGJsdHJaWGx6VzJsZFhTQTlJR0ZrWkZ0clpYbHpXMmxkWFR0Y2JpQWdmVnh1SUNCeVpYUjFjbTRnYjNKcFoybHVPMXh1ZlR0Y2JseHVablZ1WTNScGIyNGdhR0Z6VDNkdVVISnZjR1Z5ZEhrb2IySnFMQ0J3Y205d0tTQjdYRzRnSUhKbGRIVnliaUJQWW1wbFkzUXVjSEp2ZEc5MGVYQmxMbWhoYzA5M2JsQnliM0JsY25SNUxtTmhiR3dvYjJKcUxDQndjbTl3S1R0Y2JuMWNiaUpkZlE9PSIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLyoqXG4gKiBVdGlsaXR5IGZ1bmN0aW9uc1xuICovXG5cbnZhciB1dGlsID0ge307XG5cbnV0aWwuaXNPYmplY3QgPSBmdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxudXRpbC5pc051bWJlciA9IGZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbnV0aWwuaXNVbmRlZmluZWQgPSBmdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuXG51dGlsLmlzRnVuY3Rpb24gPSBmdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZyl7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5cbi8qKlxuICogRXZlbnRFbWl0dGVyIGNsYXNzXG4gKi9cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICBFdmVudEVtaXR0ZXIuaW5pdC5jYWxsKHRoaXMpO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG5FdmVudEVtaXR0ZXIuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59O1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghdXRpbC5pc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InICYmICF0aGlzLl9ldmVudHMuZXJyb3IpIHtcbiAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmICh1dGlsLmlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAodXRpbC5pc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodXRpbC5pc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghdXRpbC5pc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgdXRpbC5pc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmICh1dGlsLmlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAodXRpbC5pc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCF1dGlsLmlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG5cbiAgICAgIGlmICh1dGlsLmlzRnVuY3Rpb24oY29uc29sZS5lcnJvcikpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICB9XG4gICAgICBpZiAodXRpbC5pc0Z1bmN0aW9uKGNvbnNvbGUudHJhY2UpKVxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCF1dGlsLmlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghdXRpbC5pc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAodXRpbC5pc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmICh1dGlsLmlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAodXRpbC5pc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShsaXN0ZW5lcnMpKSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKHV0aWwuaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmICh1dGlsLmlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gdmltOnRzPTQ6c3RzPTQ6c3c9NDpcbi8qIVxuICpcbiAqIENvcHlyaWdodCAyMDA5LTIwMTIgS3JpcyBLb3dhbCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIE1JVFxuICogbGljZW5zZSBmb3VuZCBhdCBodHRwOi8vZ2l0aHViLmNvbS9rcmlza293YWwvcS9yYXcvbWFzdGVyL0xJQ0VOU0VcbiAqXG4gKiBXaXRoIHBhcnRzIGJ5IFR5bGVyIENsb3NlXG4gKiBDb3B5cmlnaHQgMjAwNy0yMDA5IFR5bGVyIENsb3NlIHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgTUlUIFggbGljZW5zZSBmb3VuZFxuICogYXQgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5odG1sXG4gKiBGb3JrZWQgYXQgcmVmX3NlbmQuanMgdmVyc2lvbjogMjAwOS0wNS0xMVxuICpcbiAqIFdpdGggcGFydHMgYnkgTWFyayBNaWxsZXJcbiAqIENvcHlyaWdodCAoQykgMjAxMSBHb29nbGUgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluaXRpb24pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8vIFRoaXMgZmlsZSB3aWxsIGZ1bmN0aW9uIHByb3Blcmx5IGFzIGEgPHNjcmlwdD4gdGFnLCBvciBhIG1vZHVsZVxuICAgIC8vIHVzaW5nIENvbW1vbkpTIGFuZCBOb2RlSlMgb3IgUmVxdWlyZUpTIG1vZHVsZSBmb3JtYXRzLiAgSW5cbiAgICAvLyBDb21tb24vTm9kZS9SZXF1aXJlSlMsIHRoZSBtb2R1bGUgZXhwb3J0cyB0aGUgUSBBUEkgYW5kIHdoZW5cbiAgICAvLyBleGVjdXRlZCBhcyBhIHNpbXBsZSA8c2NyaXB0PiwgaXQgY3JlYXRlcyBhIFEgZ2xvYmFsIGluc3RlYWQuXG5cbiAgICAvLyBNb250YWdlIFJlcXVpcmVcbiAgICBpZiAodHlwZW9mIGJvb3RzdHJhcCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGJvb3RzdHJhcChcInByb21pc2VcIiwgZGVmaW5pdGlvbik7XG5cbiAgICAvLyBDb21tb25KU1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGRlZmluaXRpb24oKTtcblxuICAgIC8vIFJlcXVpcmVKU1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKGRlZmluaXRpb24pO1xuXG4gICAgLy8gU0VTIChTZWN1cmUgRWNtYVNjcmlwdClcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZXMgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgaWYgKCFzZXMub2soKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VzLm1ha2VRID0gZGVmaW5pdGlvbjtcbiAgICAgICAgfVxuXG4gICAgLy8gPHNjcmlwdD5cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgfHwgdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gUHJlZmVyIHdpbmRvdyBvdmVyIHNlbGYgZm9yIGFkZC1vbiBzY3JpcHRzLiBVc2Ugc2VsZiBmb3JcbiAgICAgICAgLy8gbm9uLXdpbmRvd2VkIGNvbnRleHRzLlxuICAgICAgICB2YXIgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHNlbGY7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBgd2luZG93YCBvYmplY3QsIHNhdmUgdGhlIHByZXZpb3VzIFEgZ2xvYmFsXG4gICAgICAgIC8vIGFuZCBpbml0aWFsaXplIFEgYXMgYSBnbG9iYWwuXG4gICAgICAgIHZhciBwcmV2aW91c1EgPSBnbG9iYWwuUTtcbiAgICAgICAgZ2xvYmFsLlEgPSBkZWZpbml0aW9uKCk7XG5cbiAgICAgICAgLy8gQWRkIGEgbm9Db25mbGljdCBmdW5jdGlvbiBzbyBRIGNhbiBiZSByZW1vdmVkIGZyb20gdGhlXG4gICAgICAgIC8vIGdsb2JhbCBuYW1lc3BhY2UuXG4gICAgICAgIGdsb2JhbC5RLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBnbG9iYWwuUSA9IHByZXZpb3VzUTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBlbnZpcm9ubWVudCB3YXMgbm90IGFudGljaXBhdGVkIGJ5IFEuIFBsZWFzZSBmaWxlIGEgYnVnLlwiKTtcbiAgICB9XG5cbn0pKGZ1bmN0aW9uICgpIHtcblwidXNlIHN0cmljdFwiO1xuXG52YXIgaGFzU3RhY2tzID0gZmFsc2U7XG50cnkge1xuICAgIHRocm93IG5ldyBFcnJvcigpO1xufSBjYXRjaCAoZSkge1xuICAgIGhhc1N0YWNrcyA9ICEhZS5zdGFjaztcbn1cblxuLy8gQWxsIGNvZGUgYWZ0ZXIgdGhpcyBwb2ludCB3aWxsIGJlIGZpbHRlcmVkIGZyb20gc3RhY2sgdHJhY2VzIHJlcG9ydGVkXG4vLyBieSBRLlxudmFyIHFTdGFydGluZ0xpbmUgPSBjYXB0dXJlTGluZSgpO1xudmFyIHFGaWxlTmFtZTtcblxuLy8gc2hpbXNcblxuLy8gdXNlZCBmb3IgZmFsbGJhY2sgaW4gXCJhbGxSZXNvbHZlZFwiXG52YXIgbm9vcCA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vLyBVc2UgdGhlIGZhc3Rlc3QgcG9zc2libGUgbWVhbnMgdG8gZXhlY3V0ZSBhIHRhc2sgaW4gYSBmdXR1cmUgdHVyblxuLy8gb2YgdGhlIGV2ZW50IGxvb3AuXG52YXIgbmV4dFRpY2sgPShmdW5jdGlvbiAoKSB7XG4gICAgLy8gbGlua2VkIGxpc3Qgb2YgdGFza3MgKHNpbmdsZSwgd2l0aCBoZWFkIG5vZGUpXG4gICAgdmFyIGhlYWQgPSB7dGFzazogdm9pZCAwLCBuZXh0OiBudWxsfTtcbiAgICB2YXIgdGFpbCA9IGhlYWQ7XG4gICAgdmFyIGZsdXNoaW5nID0gZmFsc2U7XG4gICAgdmFyIHJlcXVlc3RUaWNrID0gdm9pZCAwO1xuICAgIHZhciBpc05vZGVKUyA9IGZhbHNlO1xuICAgIC8vIHF1ZXVlIGZvciBsYXRlIHRhc2tzLCB1c2VkIGJ5IHVuaGFuZGxlZCByZWplY3Rpb24gdHJhY2tpbmdcbiAgICB2YXIgbGF0ZXJRdWV1ZSA9IFtdO1xuXG4gICAgZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgICAgIC8qIGpzaGludCBsb29wZnVuYzogdHJ1ZSAqL1xuICAgICAgICB2YXIgdGFzaywgZG9tYWluO1xuXG4gICAgICAgIHdoaWxlIChoZWFkLm5leHQpIHtcbiAgICAgICAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XG4gICAgICAgICAgICB0YXNrID0gaGVhZC50YXNrO1xuICAgICAgICAgICAgaGVhZC50YXNrID0gdm9pZCAwO1xuICAgICAgICAgICAgZG9tYWluID0gaGVhZC5kb21haW47XG5cbiAgICAgICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgICAgICBoZWFkLmRvbWFpbiA9IHZvaWQgMDtcbiAgICAgICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJ1blNpbmdsZSh0YXNrLCBkb21haW4pO1xuXG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKGxhdGVyUXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICB0YXNrID0gbGF0ZXJRdWV1ZS5wb3AoKTtcbiAgICAgICAgICAgIHJ1blNpbmdsZSh0YXNrKTtcbiAgICAgICAgfVxuICAgICAgICBmbHVzaGluZyA9IGZhbHNlO1xuICAgIH1cbiAgICAvLyBydW5zIGEgc2luZ2xlIGZ1bmN0aW9uIGluIHRoZSBhc3luYyBxdWV1ZVxuICAgIGZ1bmN0aW9uIHJ1blNpbmdsZSh0YXNrLCBkb21haW4pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRhc2soKTtcblxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSlMpIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBub2RlLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBjb25zaWRlcmVkIGZhdGFsIGVycm9ycy5cbiAgICAgICAgICAgICAgICAvLyBSZS10aHJvdyB0aGVtIHN5bmNocm9ub3VzbHkgdG8gaW50ZXJydXB0IGZsdXNoaW5nIVxuXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNvbnRpbnVhdGlvbiBpZiB0aGUgdW5jYXVnaHQgZXhjZXB0aW9uIGlzIHN1cHByZXNzZWRcbiAgICAgICAgICAgICAgICAvLyBsaXN0ZW5pbmcgXCJ1bmNhdWdodEV4Y2VwdGlvblwiIGV2ZW50cyAoYXMgZG9tYWlucyBkb2VzKS5cbiAgICAgICAgICAgICAgICAvLyBDb250aW51ZSBpbiBuZXh0IGV2ZW50IHRvIGF2b2lkIHRpY2sgcmVjdXJzaW9uLlxuICAgICAgICAgICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XG4gICAgICAgICAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEluIGJyb3dzZXJzLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBub3QgZmF0YWwuXG4gICAgICAgICAgICAgICAgLy8gUmUtdGhyb3cgdGhlbSBhc3luY2hyb25vdXNseSB0byBhdm9pZCBzbG93LWRvd25zLlxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5leHRUaWNrID0gZnVuY3Rpb24gKHRhc2spIHtcbiAgICAgICAgdGFpbCA9IHRhaWwubmV4dCA9IHtcbiAgICAgICAgICAgIHRhc2s6IHRhc2ssXG4gICAgICAgICAgICBkb21haW46IGlzTm9kZUpTICYmIHByb2Nlc3MuZG9tYWluLFxuICAgICAgICAgICAgbmV4dDogbnVsbFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghZmx1c2hpbmcpIHtcbiAgICAgICAgICAgIGZsdXNoaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmXG4gICAgICAgIHByb2Nlc3MudG9TdHJpbmcoKSA9PT0gXCJbb2JqZWN0IHByb2Nlc3NdXCIgJiYgcHJvY2Vzcy5uZXh0VGljaykge1xuICAgICAgICAvLyBFbnN1cmUgUSBpcyBpbiBhIHJlYWwgTm9kZSBlbnZpcm9ubWVudCwgd2l0aCBhIGBwcm9jZXNzLm5leHRUaWNrYC5cbiAgICAgICAgLy8gVG8gc2VlIHRocm91Z2ggZmFrZSBOb2RlIGVudmlyb25tZW50czpcbiAgICAgICAgLy8gKiBNb2NoYSB0ZXN0IHJ1bm5lciAtIGV4cG9zZXMgYSBgcHJvY2Vzc2AgZ2xvYmFsIHdpdGhvdXQgYSBgbmV4dFRpY2tgXG4gICAgICAgIC8vICogQnJvd3NlcmlmeSAtIGV4cG9zZXMgYSBgcHJvY2Vzcy5uZXhUaWNrYCBmdW5jdGlvbiB0aGF0IHVzZXNcbiAgICAgICAgLy8gICBgc2V0VGltZW91dGAuIEluIHRoaXMgY2FzZSBgc2V0SW1tZWRpYXRlYCBpcyBwcmVmZXJyZWQgYmVjYXVzZVxuICAgICAgICAvLyAgICBpdCBpcyBmYXN0ZXIuIEJyb3dzZXJpZnkncyBgcHJvY2Vzcy50b1N0cmluZygpYCB5aWVsZHNcbiAgICAgICAgLy8gICBcIltvYmplY3QgT2JqZWN0XVwiLCB3aGlsZSBpbiBhIHJlYWwgTm9kZSBlbnZpcm9ubWVudFxuICAgICAgICAvLyAgIGBwcm9jZXNzLm5leHRUaWNrKClgIHlpZWxkcyBcIltvYmplY3QgcHJvY2Vzc11cIi5cbiAgICAgICAgaXNOb2RlSlMgPSB0cnVlO1xuXG4gICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gICAgICAgIH07XG5cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAvLyBJbiBJRTEwLCBOb2RlLmpzIDAuOSssIG9yIGh0dHBzOi8vZ2l0aHViLmNvbS9Ob2JsZUpTL3NldEltbWVkaWF0ZVxuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgcmVxdWVzdFRpY2sgPSBzZXRJbW1lZGlhdGUuYmluZCh3aW5kb3csIGZsdXNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShmbHVzaCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBtb2Rlcm4gYnJvd3NlcnNcbiAgICAgICAgLy8gaHR0cDovL3d3dy5ub25ibG9ja2luZy5pby8yMDExLzA2L3dpbmRvd25leHR0aWNrLmh0bWxcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgLy8gQXQgbGVhc3QgU2FmYXJpIFZlcnNpb24gNi4wLjUgKDg1MzYuMzAuMSkgaW50ZXJtaXR0ZW50bHkgY2Fubm90IGNyZWF0ZVxuICAgICAgICAvLyB3b3JraW5nIG1lc3NhZ2UgcG9ydHMgdGhlIGZpcnN0IHRpbWUgYSBwYWdlIGxvYWRzLlxuICAgICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrID0gcmVxdWVzdFBvcnRUaWNrO1xuICAgICAgICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgICAgICAgICAgIGZsdXNoKCk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciByZXF1ZXN0UG9ydFRpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBPcGVyYSByZXF1aXJlcyB1cyB0byBwcm92aWRlIGEgbWVzc2FnZSBwYXlsb2FkLCByZWdhcmRsZXNzIG9mXG4gICAgICAgICAgICAvLyB3aGV0aGVyIHdlIHVzZSBpdC5cbiAgICAgICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XG4gICAgICAgICAgICByZXF1ZXN0UG9ydFRpY2soKTtcbiAgICAgICAgfTtcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG9sZCBicm93c2Vyc1xuICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvLyBydW5zIGEgdGFzayBhZnRlciBhbGwgb3RoZXIgdGFza3MgaGF2ZSBiZWVuIHJ1blxuICAgIC8vIHRoaXMgaXMgdXNlZnVsIGZvciB1bmhhbmRsZWQgcmVqZWN0aW9uIHRyYWNraW5nIHRoYXQgbmVlZHMgdG8gaGFwcGVuXG4gICAgLy8gYWZ0ZXIgYWxsIGB0aGVuYGQgdGFza3MgaGF2ZSBiZWVuIHJ1bi5cbiAgICBuZXh0VGljay5ydW5BZnRlciA9IGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgIGxhdGVyUXVldWUucHVzaCh0YXNrKTtcbiAgICAgICAgaWYgKCFmbHVzaGluZykge1xuICAgICAgICAgICAgZmx1c2hpbmcgPSB0cnVlO1xuICAgICAgICAgICAgcmVxdWVzdFRpY2soKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIG5leHRUaWNrO1xufSkoKTtcblxuLy8gQXR0ZW1wdCB0byBtYWtlIGdlbmVyaWNzIHNhZmUgaW4gdGhlIGZhY2Ugb2YgZG93bnN0cmVhbVxuLy8gbW9kaWZpY2F0aW9ucy5cbi8vIFRoZXJlIGlzIG5vIHNpdHVhdGlvbiB3aGVyZSB0aGlzIGlzIG5lY2Vzc2FyeS5cbi8vIElmIHlvdSBuZWVkIGEgc2VjdXJpdHkgZ3VhcmFudGVlLCB0aGVzZSBwcmltb3JkaWFscyBuZWVkIHRvIGJlXG4vLyBkZWVwbHkgZnJvemVuIGFueXdheSwgYW5kIGlmIHlvdSBkb27igJl0IG5lZWQgYSBzZWN1cml0eSBndWFyYW50ZWUsXG4vLyB0aGlzIGlzIGp1c3QgcGxhaW4gcGFyYW5vaWQuXG4vLyBIb3dldmVyLCB0aGlzICoqbWlnaHQqKiBoYXZlIHRoZSBuaWNlIHNpZGUtZWZmZWN0IG9mIHJlZHVjaW5nIHRoZSBzaXplIG9mXG4vLyB0aGUgbWluaWZpZWQgY29kZSBieSByZWR1Y2luZyB4LmNhbGwoKSB0byBtZXJlbHkgeCgpXG4vLyBTZWUgTWFyayBNaWxsZXLigJlzIGV4cGxhbmF0aW9uIG9mIHdoYXQgdGhpcyBkb2VzLlxuLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9Y29udmVudGlvbnM6c2FmZV9tZXRhX3Byb2dyYW1taW5nXG52YXIgY2FsbCA9IEZ1bmN0aW9uLmNhbGw7XG5mdW5jdGlvbiB1bmN1cnJ5VGhpcyhmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGNhbGwuYXBwbHkoZiwgYXJndW1lbnRzKTtcbiAgICB9O1xufVxuLy8gVGhpcyBpcyBlcXVpdmFsZW50LCBidXQgc2xvd2VyOlxuLy8gdW5jdXJyeVRoaXMgPSBGdW5jdGlvbl9iaW5kLmJpbmQoRnVuY3Rpb25fYmluZC5jYWxsKTtcbi8vIGh0dHA6Ly9qc3BlcmYuY29tL3VuY3Vycnl0aGlzXG5cbnZhciBhcnJheV9zbGljZSA9IHVuY3VycnlUaGlzKEFycmF5LnByb3RvdHlwZS5zbGljZSk7XG5cbnZhciBhcnJheV9yZWR1Y2UgPSB1bmN1cnJ5VGhpcyhcbiAgICBBcnJheS5wcm90b3R5cGUucmVkdWNlIHx8IGZ1bmN0aW9uIChjYWxsYmFjaywgYmFzaXMpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gMCxcbiAgICAgICAgICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoO1xuICAgICAgICAvLyBjb25jZXJuaW5nIHRoZSBpbml0aWFsIHZhbHVlLCBpZiBvbmUgaXMgbm90IHByb3ZpZGVkXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAvLyBzZWVrIHRvIHRoZSBmaXJzdCB2YWx1ZSBpbiB0aGUgYXJyYXksIGFjY291bnRpbmdcbiAgICAgICAgICAgIC8vIGZvciB0aGUgcG9zc2liaWxpdHkgdGhhdCBpcyBpcyBhIHNwYXJzZSBhcnJheVxuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCBpbiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2lzID0gdGhpc1tpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgrK2luZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSB3aGlsZSAoMSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmVkdWNlXG4gICAgICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgLy8gYWNjb3VudCBmb3IgdGhlIHBvc3NpYmlsaXR5IHRoYXQgdGhlIGFycmF5IGlzIHNwYXJzZVxuICAgICAgICAgICAgaWYgKGluZGV4IGluIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBiYXNpcyA9IGNhbGxiYWNrKGJhc2lzLCB0aGlzW2luZGV4XSwgaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBiYXNpcztcbiAgICB9XG4pO1xuXG52YXIgYXJyYXlfaW5kZXhPZiA9IHVuY3VycnlUaGlzKFxuICAgIEFycmF5LnByb3RvdHlwZS5pbmRleE9mIHx8IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBub3QgYSB2ZXJ5IGdvb2Qgc2hpbSwgYnV0IGdvb2QgZW5vdWdoIGZvciBvdXIgb25lIHVzZSBvZiBpdFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzW2ldID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG4pO1xuXG52YXIgYXJyYXlfbWFwID0gdW5jdXJyeVRoaXMoXG4gICAgQXJyYXkucHJvdG90eXBlLm1hcCB8fCBmdW5jdGlvbiAoY2FsbGJhY2ssIHRoaXNwKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGNvbGxlY3QgPSBbXTtcbiAgICAgICAgYXJyYXlfcmVkdWNlKHNlbGYsIGZ1bmN0aW9uICh1bmRlZmluZWQsIHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgY29sbGVjdC5wdXNoKGNhbGxiYWNrLmNhbGwodGhpc3AsIHZhbHVlLCBpbmRleCwgc2VsZikpO1xuICAgICAgICB9LCB2b2lkIDApO1xuICAgICAgICByZXR1cm4gY29sbGVjdDtcbiAgICB9XG4pO1xuXG52YXIgb2JqZWN0X2NyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKHByb3RvdHlwZSkge1xuICAgIGZ1bmN0aW9uIFR5cGUoKSB7IH1cbiAgICBUeXBlLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICByZXR1cm4gbmV3IFR5cGUoKTtcbn07XG5cbnZhciBvYmplY3RfaGFzT3duUHJvcGVydHkgPSB1bmN1cnJ5VGhpcyhPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KTtcblxudmFyIG9iamVjdF9rZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgICAgICBpZiAob2JqZWN0X2hhc093blByb3BlcnR5KG9iamVjdCwga2V5KSkge1xuICAgICAgICAgICAga2V5cy5wdXNoKGtleSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGtleXM7XG59O1xuXG52YXIgb2JqZWN0X3RvU3RyaW5nID0gdW5jdXJyeVRoaXMoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyk7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID09PSBPYmplY3QodmFsdWUpO1xufVxuXG4vLyBnZW5lcmF0b3IgcmVsYXRlZCBzaGltc1xuXG4vLyBGSVhNRTogUmVtb3ZlIHRoaXMgZnVuY3Rpb24gb25jZSBFUzYgZ2VuZXJhdG9ycyBhcmUgaW4gU3BpZGVyTW9ua2V5LlxuZnVuY3Rpb24gaXNTdG9wSXRlcmF0aW9uKGV4Y2VwdGlvbikge1xuICAgIHJldHVybiAoXG4gICAgICAgIG9iamVjdF90b1N0cmluZyhleGNlcHRpb24pID09PSBcIltvYmplY3QgU3RvcEl0ZXJhdGlvbl1cIiB8fFxuICAgICAgICBleGNlcHRpb24gaW5zdGFuY2VvZiBRUmV0dXJuVmFsdWVcbiAgICApO1xufVxuXG4vLyBGSVhNRTogUmVtb3ZlIHRoaXMgaGVscGVyIGFuZCBRLnJldHVybiBvbmNlIEVTNiBnZW5lcmF0b3JzIGFyZSBpblxuLy8gU3BpZGVyTW9ua2V5LlxudmFyIFFSZXR1cm5WYWx1ZTtcbmlmICh0eXBlb2YgUmV0dXJuVmFsdWUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBRUmV0dXJuVmFsdWUgPSBSZXR1cm5WYWx1ZTtcbn0gZWxzZSB7XG4gICAgUVJldHVyblZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB9O1xufVxuXG4vLyBsb25nIHN0YWNrIHRyYWNlc1xuXG52YXIgU1RBQ0tfSlVNUF9TRVBBUkFUT1IgPSBcIkZyb20gcHJldmlvdXMgZXZlbnQ6XCI7XG5cbmZ1bmN0aW9uIG1ha2VTdGFja1RyYWNlTG9uZyhlcnJvciwgcHJvbWlzZSkge1xuICAgIC8vIElmIHBvc3NpYmxlLCB0cmFuc2Zvcm0gdGhlIGVycm9yIHN0YWNrIHRyYWNlIGJ5IHJlbW92aW5nIE5vZGUgYW5kIFFcbiAgICAvLyBjcnVmdCwgdGhlbiBjb25jYXRlbmF0aW5nIHdpdGggdGhlIHN0YWNrIHRyYWNlIG9mIGBwcm9taXNlYC4gU2VlICM1Ny5cbiAgICBpZiAoaGFzU3RhY2tzICYmXG4gICAgICAgIHByb21pc2Uuc3RhY2sgJiZcbiAgICAgICAgdHlwZW9mIGVycm9yID09PSBcIm9iamVjdFwiICYmXG4gICAgICAgIGVycm9yICE9PSBudWxsICYmXG4gICAgICAgIGVycm9yLnN0YWNrICYmXG4gICAgICAgIGVycm9yLnN0YWNrLmluZGV4T2YoU1RBQ0tfSlVNUF9TRVBBUkFUT1IpID09PSAtMVxuICAgICkge1xuICAgICAgICB2YXIgc3RhY2tzID0gW107XG4gICAgICAgIGZvciAodmFyIHAgPSBwcm9taXNlOyAhIXA7IHAgPSBwLnNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKHAuc3RhY2spIHtcbiAgICAgICAgICAgICAgICBzdGFja3MudW5zaGlmdChwLnN0YWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdGFja3MudW5zaGlmdChlcnJvci5zdGFjayk7XG5cbiAgICAgICAgdmFyIGNvbmNhdGVkU3RhY2tzID0gc3RhY2tzLmpvaW4oXCJcXG5cIiArIFNUQUNLX0pVTVBfU0VQQVJBVE9SICsgXCJcXG5cIik7XG4gICAgICAgIGVycm9yLnN0YWNrID0gZmlsdGVyU3RhY2tTdHJpbmcoY29uY2F0ZWRTdGFja3MpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZmlsdGVyU3RhY2tTdHJpbmcoc3RhY2tTdHJpbmcpIHtcbiAgICB2YXIgbGluZXMgPSBzdGFja1N0cmluZy5zcGxpdChcIlxcblwiKTtcbiAgICB2YXIgZGVzaXJlZExpbmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgbGluZSA9IGxpbmVzW2ldO1xuXG4gICAgICAgIGlmICghaXNJbnRlcm5hbEZyYW1lKGxpbmUpICYmICFpc05vZGVGcmFtZShsaW5lKSAmJiBsaW5lKSB7XG4gICAgICAgICAgICBkZXNpcmVkTGluZXMucHVzaChsaW5lKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVzaXJlZExpbmVzLmpvaW4oXCJcXG5cIik7XG59XG5cbmZ1bmN0aW9uIGlzTm9kZUZyYW1lKHN0YWNrTGluZSkge1xuICAgIHJldHVybiBzdGFja0xpbmUuaW5kZXhPZihcIihtb2R1bGUuanM6XCIpICE9PSAtMSB8fFxuICAgICAgICAgICBzdGFja0xpbmUuaW5kZXhPZihcIihub2RlLmpzOlwiKSAhPT0gLTE7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihzdGFja0xpbmUpIHtcbiAgICAvLyBOYW1lZCBmdW5jdGlvbnM6IFwiYXQgZnVuY3Rpb25OYW1lIChmaWxlbmFtZTpsaW5lTnVtYmVyOmNvbHVtbk51bWJlcilcIlxuICAgIC8vIEluIElFMTAgZnVuY3Rpb24gbmFtZSBjYW4gaGF2ZSBzcGFjZXMgKFwiQW5vbnltb3VzIGZ1bmN0aW9uXCIpIE9fb1xuICAgIHZhciBhdHRlbXB0MSA9IC9hdCAuKyBcXCgoLispOihcXGQrKTooPzpcXGQrKVxcKSQvLmV4ZWMoc3RhY2tMaW5lKTtcbiAgICBpZiAoYXR0ZW1wdDEpIHtcbiAgICAgICAgcmV0dXJuIFthdHRlbXB0MVsxXSwgTnVtYmVyKGF0dGVtcHQxWzJdKV07XG4gICAgfVxuXG4gICAgLy8gQW5vbnltb3VzIGZ1bmN0aW9uczogXCJhdCBmaWxlbmFtZTpsaW5lTnVtYmVyOmNvbHVtbk51bWJlclwiXG4gICAgdmFyIGF0dGVtcHQyID0gL2F0IChbXiBdKyk6KFxcZCspOig/OlxcZCspJC8uZXhlYyhzdGFja0xpbmUpO1xuICAgIGlmIChhdHRlbXB0Mikge1xuICAgICAgICByZXR1cm4gW2F0dGVtcHQyWzFdLCBOdW1iZXIoYXR0ZW1wdDJbMl0pXTtcbiAgICB9XG5cbiAgICAvLyBGaXJlZm94IHN0eWxlOiBcImZ1bmN0aW9uQGZpbGVuYW1lOmxpbmVOdW1iZXIgb3IgQGZpbGVuYW1lOmxpbmVOdW1iZXJcIlxuICAgIHZhciBhdHRlbXB0MyA9IC8uKkAoLispOihcXGQrKSQvLmV4ZWMoc3RhY2tMaW5lKTtcbiAgICBpZiAoYXR0ZW1wdDMpIHtcbiAgICAgICAgcmV0dXJuIFthdHRlbXB0M1sxXSwgTnVtYmVyKGF0dGVtcHQzWzJdKV07XG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc0ludGVybmFsRnJhbWUoc3RhY2tMaW5lKSB7XG4gICAgdmFyIGZpbGVOYW1lQW5kTGluZU51bWJlciA9IGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihzdGFja0xpbmUpO1xuXG4gICAgaWYgKCFmaWxlTmFtZUFuZExpbmVOdW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBmaWxlTmFtZSA9IGZpbGVOYW1lQW5kTGluZU51bWJlclswXTtcbiAgICB2YXIgbGluZU51bWJlciA9IGZpbGVOYW1lQW5kTGluZU51bWJlclsxXTtcblxuICAgIHJldHVybiBmaWxlTmFtZSA9PT0gcUZpbGVOYW1lICYmXG4gICAgICAgIGxpbmVOdW1iZXIgPj0gcVN0YXJ0aW5nTGluZSAmJlxuICAgICAgICBsaW5lTnVtYmVyIDw9IHFFbmRpbmdMaW5lO1xufVxuXG4vLyBkaXNjb3ZlciBvd24gZmlsZSBuYW1lIGFuZCBsaW5lIG51bWJlciByYW5nZSBmb3IgZmlsdGVyaW5nIHN0YWNrXG4vLyB0cmFjZXNcbmZ1bmN0aW9uIGNhcHR1cmVMaW5lKCkge1xuICAgIGlmICghaGFzU3RhY2tzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHZhciBsaW5lcyA9IGUuc3RhY2suc3BsaXQoXCJcXG5cIik7XG4gICAgICAgIHZhciBmaXJzdExpbmUgPSBsaW5lc1swXS5pbmRleE9mKFwiQFwiKSA+IDAgPyBsaW5lc1sxXSA6IGxpbmVzWzJdO1xuICAgICAgICB2YXIgZmlsZU5hbWVBbmRMaW5lTnVtYmVyID0gZ2V0RmlsZU5hbWVBbmRMaW5lTnVtYmVyKGZpcnN0TGluZSk7XG4gICAgICAgIGlmICghZmlsZU5hbWVBbmRMaW5lTnVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBxRmlsZU5hbWUgPSBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMF07XG4gICAgICAgIHJldHVybiBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMV07XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkZXByZWNhdGUoY2FsbGJhY2ssIG5hbWUsIGFsdGVybmF0aXZlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAgICAgICB0eXBlb2YgY29uc29sZS53YXJuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihuYW1lICsgXCIgaXMgZGVwcmVjYXRlZCwgdXNlIFwiICsgYWx0ZXJuYXRpdmUgK1xuICAgICAgICAgICAgICAgICAgICAgICAgIFwiIGluc3RlYWQuXCIsIG5ldyBFcnJvcihcIlwiKS5zdGFjayk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KGNhbGxiYWNrLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG5cbi8vIGVuZCBvZiBzaGltc1xuLy8gYmVnaW5uaW5nIG9mIHJlYWwgd29ya1xuXG4vKipcbiAqIENvbnN0cnVjdHMgYSBwcm9taXNlIGZvciBhbiBpbW1lZGlhdGUgcmVmZXJlbmNlLCBwYXNzZXMgcHJvbWlzZXMgdGhyb3VnaCwgb3JcbiAqIGNvZXJjZXMgcHJvbWlzZXMgZnJvbSBkaWZmZXJlbnQgc3lzdGVtcy5cbiAqIEBwYXJhbSB2YWx1ZSBpbW1lZGlhdGUgcmVmZXJlbmNlIG9yIHByb21pc2VcbiAqL1xuZnVuY3Rpb24gUSh2YWx1ZSkge1xuICAgIC8vIElmIHRoZSBvYmplY3QgaXMgYWxyZWFkeSBhIFByb21pc2UsIHJldHVybiBpdCBkaXJlY3RseS4gIFRoaXMgZW5hYmxlc1xuICAgIC8vIHRoZSByZXNvbHZlIGZ1bmN0aW9uIHRvIGJvdGggYmUgdXNlZCB0byBjcmVhdGVkIHJlZmVyZW5jZXMgZnJvbSBvYmplY3RzLFxuICAgIC8vIGJ1dCB0byB0b2xlcmFibHkgY29lcmNlIG5vbi1wcm9taXNlcyB0byBwcm9taXNlcy5cbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBhc3NpbWlsYXRlIHRoZW5hYmxlc1xuICAgIGlmIChpc1Byb21pc2VBbGlrZSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIGNvZXJjZSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZ1bGZpbGwodmFsdWUpO1xuICAgIH1cbn1cblEucmVzb2x2ZSA9IFE7XG5cbi8qKlxuICogUGVyZm9ybXMgYSB0YXNrIGluIGEgZnV0dXJlIHR1cm4gb2YgdGhlIGV2ZW50IGxvb3AuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0YXNrXG4gKi9cblEubmV4dFRpY2sgPSBuZXh0VGljaztcblxuLyoqXG4gKiBDb250cm9scyB3aGV0aGVyIG9yIG5vdCBsb25nIHN0YWNrIHRyYWNlcyB3aWxsIGJlIG9uXG4gKi9cblEubG9uZ1N0YWNrU3VwcG9ydCA9IGZhbHNlO1xuXG4vLyBlbmFibGUgbG9uZyBzdGFja3MgaWYgUV9ERUJVRyBpcyBzZXRcbmlmICh0eXBlb2YgcHJvY2VzcyA9PT0gXCJvYmplY3RcIiAmJiBwcm9jZXNzICYmIHByb2Nlc3MuZW52ICYmIHByb2Nlc3MuZW52LlFfREVCVUcpIHtcbiAgICBRLmxvbmdTdGFja1N1cHBvcnQgPSB0cnVlO1xufVxuXG4vKipcbiAqIENvbnN0cnVjdHMgYSB7cHJvbWlzZSwgcmVzb2x2ZSwgcmVqZWN0fSBvYmplY3QuXG4gKlxuICogYHJlc29sdmVgIGlzIGEgY2FsbGJhY2sgdG8gaW52b2tlIHdpdGggYSBtb3JlIHJlc29sdmVkIHZhbHVlIGZvciB0aGVcbiAqIHByb21pc2UuIFRvIGZ1bGZpbGwgdGhlIHByb21pc2UsIGludm9rZSBgcmVzb2x2ZWAgd2l0aCBhbnkgdmFsdWUgdGhhdCBpc1xuICogbm90IGEgdGhlbmFibGUuIFRvIHJlamVjdCB0aGUgcHJvbWlzZSwgaW52b2tlIGByZXNvbHZlYCB3aXRoIGEgcmVqZWN0ZWRcbiAqIHRoZW5hYmxlLCBvciBpbnZva2UgYHJlamVjdGAgd2l0aCB0aGUgcmVhc29uIGRpcmVjdGx5LiBUbyByZXNvbHZlIHRoZVxuICogcHJvbWlzZSB0byBhbm90aGVyIHRoZW5hYmxlLCB0aHVzIHB1dHRpbmcgaXQgaW4gdGhlIHNhbWUgc3RhdGUsIGludm9rZVxuICogYHJlc29sdmVgIHdpdGggdGhhdCBvdGhlciB0aGVuYWJsZS5cbiAqL1xuUS5kZWZlciA9IGRlZmVyO1xuZnVuY3Rpb24gZGVmZXIoKSB7XG4gICAgLy8gaWYgXCJtZXNzYWdlc1wiIGlzIGFuIFwiQXJyYXlcIiwgdGhhdCBpbmRpY2F0ZXMgdGhhdCB0aGUgcHJvbWlzZSBoYXMgbm90IHlldFxuICAgIC8vIGJlZW4gcmVzb2x2ZWQuICBJZiBpdCBpcyBcInVuZGVmaW5lZFwiLCBpdCBoYXMgYmVlbiByZXNvbHZlZC4gIEVhY2hcbiAgICAvLyBlbGVtZW50IG9mIHRoZSBtZXNzYWdlcyBhcnJheSBpcyBpdHNlbGYgYW4gYXJyYXkgb2YgY29tcGxldGUgYXJndW1lbnRzIHRvXG4gICAgLy8gZm9yd2FyZCB0byB0aGUgcmVzb2x2ZWQgcHJvbWlzZS4gIFdlIGNvZXJjZSB0aGUgcmVzb2x1dGlvbiB2YWx1ZSB0byBhXG4gICAgLy8gcHJvbWlzZSB1c2luZyB0aGUgYHJlc29sdmVgIGZ1bmN0aW9uIGJlY2F1c2UgaXQgaGFuZGxlcyBib3RoIGZ1bGx5XG4gICAgLy8gbm9uLXRoZW5hYmxlIHZhbHVlcyBhbmQgb3RoZXIgdGhlbmFibGVzIGdyYWNlZnVsbHkuXG4gICAgdmFyIG1lc3NhZ2VzID0gW10sIHByb2dyZXNzTGlzdGVuZXJzID0gW10sIHJlc29sdmVkUHJvbWlzZTtcblxuICAgIHZhciBkZWZlcnJlZCA9IG9iamVjdF9jcmVhdGUoZGVmZXIucHJvdG90eXBlKTtcbiAgICB2YXIgcHJvbWlzZSA9IG9iamVjdF9jcmVhdGUoUHJvbWlzZS5wcm90b3R5cGUpO1xuXG4gICAgcHJvbWlzZS5wcm9taXNlRGlzcGF0Y2ggPSBmdW5jdGlvbiAocmVzb2x2ZSwgb3AsIG9wZXJhbmRzKSB7XG4gICAgICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBtZXNzYWdlcy5wdXNoKGFyZ3MpO1xuICAgICAgICAgICAgaWYgKG9wID09PSBcIndoZW5cIiAmJiBvcGVyYW5kc1sxXSkgeyAvLyBwcm9ncmVzcyBvcGVyYW5kXG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3NMaXN0ZW5lcnMucHVzaChvcGVyYW5kc1sxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBRLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlZFByb21pc2UucHJvbWlzZURpc3BhdGNoLmFwcGx5KHJlc29sdmVkUHJvbWlzZSwgYXJncyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBYWFggZGVwcmVjYXRlZFxuICAgIHByb21pc2UudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbmVhcmVyVmFsdWUgPSBuZWFyZXIocmVzb2x2ZWRQcm9taXNlKTtcbiAgICAgICAgaWYgKGlzUHJvbWlzZShuZWFyZXJWYWx1ZSkpIHtcbiAgICAgICAgICAgIHJlc29sdmVkUHJvbWlzZSA9IG5lYXJlclZhbHVlOyAvLyBzaG9ydGVuIGNoYWluXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5lYXJlclZhbHVlO1xuICAgIH07XG5cbiAgICBwcm9taXNlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghcmVzb2x2ZWRQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdGF0ZTogXCJwZW5kaW5nXCIgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzb2x2ZWRQcm9taXNlLmluc3BlY3QoKTtcbiAgICB9O1xuXG4gICAgaWYgKFEubG9uZ1N0YWNrU3VwcG9ydCAmJiBoYXNTdGFja3MpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBOT1RFOiBkb24ndCB0cnkgdG8gdXNlIGBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZWAgb3IgdHJhbnNmZXIgdGhlXG4gICAgICAgICAgICAvLyBhY2Nlc3NvciBhcm91bmQ7IHRoYXQgY2F1c2VzIG1lbW9yeSBsZWFrcyBhcyBwZXIgR0gtMTExLiBKdXN0XG4gICAgICAgICAgICAvLyByZWlmeSB0aGUgc3RhY2sgdHJhY2UgYXMgYSBzdHJpbmcgQVNBUC5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBBdCB0aGUgc2FtZSB0aW1lLCBjdXQgb2ZmIHRoZSBmaXJzdCBsaW5lOyBpdCdzIGFsd2F5cyBqdXN0XG4gICAgICAgICAgICAvLyBcIltvYmplY3QgUHJvbWlzZV1cXG5cIiwgYXMgcGVyIHRoZSBgdG9TdHJpbmdgLlxuICAgICAgICAgICAgcHJvbWlzZS5zdGFjayA9IGUuc3RhY2suc3Vic3RyaW5nKGUuc3RhY2suaW5kZXhPZihcIlxcblwiKSArIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTk9URTogd2UgZG8gdGhlIGNoZWNrcyBmb3IgYHJlc29sdmVkUHJvbWlzZWAgaW4gZWFjaCBtZXRob2QsIGluc3RlYWQgb2ZcbiAgICAvLyBjb25zb2xpZGF0aW5nIHRoZW0gaW50byBgYmVjb21lYCwgc2luY2Ugb3RoZXJ3aXNlIHdlJ2QgY3JlYXRlIG5ld1xuICAgIC8vIHByb21pc2VzIHdpdGggdGhlIGxpbmVzIGBiZWNvbWUod2hhdGV2ZXIodmFsdWUpKWAuIFNlZSBlLmcuIEdILTI1Mi5cblxuICAgIGZ1bmN0aW9uIGJlY29tZShuZXdQcm9taXNlKSB7XG4gICAgICAgIHJlc29sdmVkUHJvbWlzZSA9IG5ld1Byb21pc2U7XG4gICAgICAgIHByb21pc2Uuc291cmNlID0gbmV3UHJvbWlzZTtcblxuICAgICAgICBhcnJheV9yZWR1Y2UobWVzc2FnZXMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG5ld1Byb21pc2UucHJvbWlzZURpc3BhdGNoLmFwcGx5KG5ld1Byb21pc2UsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIHZvaWQgMCk7XG5cbiAgICAgICAgbWVzc2FnZXMgPSB2b2lkIDA7XG4gICAgICAgIHByb2dyZXNzTGlzdGVuZXJzID0gdm9pZCAwO1xuICAgIH1cblxuICAgIGRlZmVycmVkLnByb21pc2UgPSBwcm9taXNlO1xuICAgIGRlZmVycmVkLnJlc29sdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgYmVjb21lKFEodmFsdWUpKTtcbiAgICB9O1xuXG4gICAgZGVmZXJyZWQuZnVsZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAocmVzb2x2ZWRQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBiZWNvbWUoZnVsZmlsbCh2YWx1ZSkpO1xuICAgIH07XG4gICAgZGVmZXJyZWQucmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICBpZiAocmVzb2x2ZWRQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBiZWNvbWUocmVqZWN0KHJlYXNvbikpO1xuICAgIH07XG4gICAgZGVmZXJyZWQubm90aWZ5ID0gZnVuY3Rpb24gKHByb2dyZXNzKSB7XG4gICAgICAgIGlmIChyZXNvbHZlZFByb21pc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGFycmF5X3JlZHVjZShwcm9ncmVzc0xpc3RlbmVycywgZnVuY3Rpb24gKHVuZGVmaW5lZCwgcHJvZ3Jlc3NMaXN0ZW5lcikge1xuICAgICAgICAgICAgUS5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3NMaXN0ZW5lcihwcm9ncmVzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgdm9pZCAwKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBOb2RlLXN0eWxlIGNhbGxiYWNrIHRoYXQgd2lsbCByZXNvbHZlIG9yIHJlamVjdCB0aGUgZGVmZXJyZWRcbiAqIHByb21pc2UuXG4gKiBAcmV0dXJucyBhIG5vZGViYWNrXG4gKi9cbmRlZmVyLnByb3RvdHlwZS5tYWtlTm9kZVJlc29sdmVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24gKGVycm9yLCB2YWx1ZSkge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIHNlbGYucmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgc2VsZi5yZXNvbHZlKGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5yZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG4vKipcbiAqIEBwYXJhbSByZXNvbHZlciB7RnVuY3Rpb259IGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIG5vdGhpbmcgYW5kIGFjY2VwdHNcbiAqIHRoZSByZXNvbHZlLCByZWplY3QsIGFuZCBub3RpZnkgZnVuY3Rpb25zIGZvciBhIGRlZmVycmVkLlxuICogQHJldHVybnMgYSBwcm9taXNlIHRoYXQgbWF5IGJlIHJlc29sdmVkIHdpdGggdGhlIGdpdmVuIHJlc29sdmUgYW5kIHJlamVjdFxuICogZnVuY3Rpb25zLCBvciByZWplY3RlZCBieSBhIHRocm93biBleGNlcHRpb24gaW4gcmVzb2x2ZXJcbiAqL1xuUS5Qcm9taXNlID0gcHJvbWlzZTsgLy8gRVM2XG5RLnByb21pc2UgPSBwcm9taXNlO1xuZnVuY3Rpb24gcHJvbWlzZShyZXNvbHZlcikge1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZXIgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicmVzb2x2ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB0cnkge1xuICAgICAgICByZXNvbHZlcihkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QsIGRlZmVycmVkLm5vdGlmeSk7XG4gICAgfSBjYXRjaCAocmVhc29uKSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChyZWFzb24pO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbn1cblxucHJvbWlzZS5yYWNlID0gcmFjZTsgLy8gRVM2XG5wcm9taXNlLmFsbCA9IGFsbDsgLy8gRVM2XG5wcm9taXNlLnJlamVjdCA9IHJlamVjdDsgLy8gRVM2XG5wcm9taXNlLnJlc29sdmUgPSBROyAvLyBFUzZcblxuLy8gWFhYIGV4cGVyaW1lbnRhbC4gIFRoaXMgbWV0aG9kIGlzIGEgd2F5IHRvIGRlbm90ZSB0aGF0IGEgbG9jYWwgdmFsdWUgaXNcbi8vIHNlcmlhbGl6YWJsZSBhbmQgc2hvdWxkIGJlIGltbWVkaWF0ZWx5IGRpc3BhdGNoZWQgdG8gYSByZW1vdGUgdXBvbiByZXF1ZXN0LFxuLy8gaW5zdGVhZCBvZiBwYXNzaW5nIGEgcmVmZXJlbmNlLlxuUS5wYXNzQnlDb3B5ID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIC8vZnJlZXplKG9iamVjdCk7XG4gICAgLy9wYXNzQnlDb3BpZXMuc2V0KG9iamVjdCwgdHJ1ZSk7XG4gICAgcmV0dXJuIG9iamVjdDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnBhc3NCeUNvcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy9mcmVlemUob2JqZWN0KTtcbiAgICAvL3Bhc3NCeUNvcGllcy5zZXQob2JqZWN0LCB0cnVlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogSWYgdHdvIHByb21pc2VzIGV2ZW50dWFsbHkgZnVsZmlsbCB0byB0aGUgc2FtZSB2YWx1ZSwgcHJvbWlzZXMgdGhhdCB2YWx1ZSxcbiAqIGJ1dCBvdGhlcndpc2UgcmVqZWN0cy5cbiAqIEBwYXJhbSB4IHtBbnkqfVxuICogQHBhcmFtIHkge0FueSp9XG4gKiBAcmV0dXJucyB7QW55Kn0gYSBwcm9taXNlIGZvciB4IGFuZCB5IGlmIHRoZXkgYXJlIHRoZSBzYW1lLCBidXQgYSByZWplY3Rpb25cbiAqIG90aGVyd2lzZS5cbiAqXG4gKi9cblEuam9pbiA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgcmV0dXJuIFEoeCkuam9pbih5KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmpvaW4gPSBmdW5jdGlvbiAodGhhdCkge1xuICAgIHJldHVybiBRKFt0aGlzLCB0aGF0XSkuc3ByZWFkKGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIGlmICh4ID09PSB5KSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBcIj09PVwiIHNob3VsZCBiZSBPYmplY3QuaXMgb3IgZXF1aXZcbiAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3Qgam9pbjogbm90IHRoZSBzYW1lOiBcIiArIHggKyBcIiBcIiArIHkpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgZmlyc3Qgb2YgYW4gYXJyYXkgb2YgcHJvbWlzZXMgdG8gYmVjb21lIHNldHRsZWQuXG4gKiBAcGFyYW0gYW5zd2VycyB7QXJyYXlbQW55Kl19IHByb21pc2VzIHRvIHJhY2VcbiAqIEByZXR1cm5zIHtBbnkqfSB0aGUgZmlyc3QgcHJvbWlzZSB0byBiZSBzZXR0bGVkXG4gKi9cblEucmFjZSA9IHJhY2U7XG5mdW5jdGlvbiByYWNlKGFuc3dlclBzKSB7XG4gICAgcmV0dXJuIHByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAvLyBTd2l0Y2ggdG8gdGhpcyBvbmNlIHdlIGNhbiBhc3N1bWUgYXQgbGVhc3QgRVM1XG4gICAgICAgIC8vIGFuc3dlclBzLmZvckVhY2goZnVuY3Rpb24gKGFuc3dlclApIHtcbiAgICAgICAgLy8gICAgIFEoYW5zd2VyUCkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgLy8gVXNlIHRoaXMgaW4gdGhlIG1lYW50aW1lXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhbnN3ZXJQcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgUShhbnN3ZXJQc1tpXSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblByb21pc2UucHJvdG90eXBlLnJhY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbihRLnJhY2UpO1xufTtcblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgUHJvbWlzZSB3aXRoIGEgcHJvbWlzZSBkZXNjcmlwdG9yIG9iamVjdCBhbmQgb3B0aW9uYWwgZmFsbGJhY2tcbiAqIGZ1bmN0aW9uLiAgVGhlIGRlc2NyaXB0b3IgY29udGFpbnMgbWV0aG9kcyBsaWtlIHdoZW4ocmVqZWN0ZWQpLCBnZXQobmFtZSksXG4gKiBzZXQobmFtZSwgdmFsdWUpLCBwb3N0KG5hbWUsIGFyZ3MpLCBhbmQgZGVsZXRlKG5hbWUpLCB3aGljaCBhbGxcbiAqIHJldHVybiBlaXRoZXIgYSB2YWx1ZSwgYSBwcm9taXNlIGZvciBhIHZhbHVlLCBvciBhIHJlamVjdGlvbi4gIFRoZSBmYWxsYmFja1xuICogYWNjZXB0cyB0aGUgb3BlcmF0aW9uIG5hbWUsIGEgcmVzb2x2ZXIsIGFuZCBhbnkgZnVydGhlciBhcmd1bWVudHMgdGhhdCB3b3VsZFxuICogaGF2ZSBiZWVuIGZvcndhcmRlZCB0byB0aGUgYXBwcm9wcmlhdGUgbWV0aG9kIGFib3ZlIGhhZCBhIG1ldGhvZCBiZWVuXG4gKiBwcm92aWRlZCB3aXRoIHRoZSBwcm9wZXIgbmFtZS4gIFRoZSBBUEkgbWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCB0aGUgbmF0dXJlXG4gKiBvZiB0aGUgcmV0dXJuZWQgb2JqZWN0LCBhcGFydCBmcm9tIHRoYXQgaXQgaXMgdXNhYmxlIHdoZXJlZXZlciBwcm9taXNlcyBhcmVcbiAqIGJvdWdodCBhbmQgc29sZC5cbiAqL1xuUS5tYWtlUHJvbWlzZSA9IFByb21pc2U7XG5mdW5jdGlvbiBQcm9taXNlKGRlc2NyaXB0b3IsIGZhbGxiYWNrLCBpbnNwZWN0KSB7XG4gICAgaWYgKGZhbGxiYWNrID09PSB2b2lkIDApIHtcbiAgICAgICAgZmFsbGJhY2sgPSBmdW5jdGlvbiAob3ApIHtcbiAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKFxuICAgICAgICAgICAgICAgIFwiUHJvbWlzZSBkb2VzIG5vdCBzdXBwb3J0IG9wZXJhdGlvbjogXCIgKyBvcFxuICAgICAgICAgICAgKSk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGlmIChpbnNwZWN0ID09PSB2b2lkIDApIHtcbiAgICAgICAgaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7c3RhdGU6IFwidW5rbm93blwifTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZSA9IG9iamVjdF9jcmVhdGUoUHJvbWlzZS5wcm90b3R5cGUpO1xuXG4gICAgcHJvbWlzZS5wcm9taXNlRGlzcGF0Y2ggPSBmdW5jdGlvbiAocmVzb2x2ZSwgb3AsIGFyZ3MpIHtcbiAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChkZXNjcmlwdG9yW29wXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGRlc2NyaXB0b3Jbb3BdLmFwcGx5KHByb21pc2UsIGFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxsYmFjay5jYWxsKHByb21pc2UsIG9wLCBhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZWplY3QoZXhjZXB0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzb2x2ZSkge1xuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHByb21pc2UuaW5zcGVjdCA9IGluc3BlY3Q7XG5cbiAgICAvLyBYWFggZGVwcmVjYXRlZCBgdmFsdWVPZmAgYW5kIGBleGNlcHRpb25gIHN1cHBvcnRcbiAgICBpZiAoaW5zcGVjdCkge1xuICAgICAgICB2YXIgaW5zcGVjdGVkID0gaW5zcGVjdCgpO1xuICAgICAgICBpZiAoaW5zcGVjdGVkLnN0YXRlID09PSBcInJlamVjdGVkXCIpIHtcbiAgICAgICAgICAgIHByb21pc2UuZXhjZXB0aW9uID0gaW5zcGVjdGVkLnJlYXNvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb21pc2UudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBpbnNwZWN0ZWQgPSBpbnNwZWN0KCk7XG4gICAgICAgICAgICBpZiAoaW5zcGVjdGVkLnN0YXRlID09PSBcInBlbmRpbmdcIiB8fFxuICAgICAgICAgICAgICAgIGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaW5zcGVjdGVkLnZhbHVlO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gXCJbb2JqZWN0IFByb21pc2VdXCI7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gKGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzZWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB2YXIgZG9uZSA9IGZhbHNlOyAgIC8vIGVuc3VyZSB0aGUgdW50cnVzdGVkIHByb21pc2UgbWFrZXMgYXQgbW9zdCBhXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGUgY2FsbCB0byBvbmUgb2YgdGhlIGNhbGxiYWNrc1xuXG4gICAgZnVuY3Rpb24gX2Z1bGZpbGxlZCh2YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBmdWxmaWxsZWQgPT09IFwiZnVuY3Rpb25cIiA/IGZ1bGZpbGxlZCh2YWx1ZSkgOiB2YWx1ZTtcbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KGV4Y2VwdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfcmVqZWN0ZWQoZXhjZXB0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcmVqZWN0ZWQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgbWFrZVN0YWNrVHJhY2VMb25nKGV4Y2VwdGlvbiwgc2VsZik7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZWplY3RlZChleGNlcHRpb24pO1xuICAgICAgICAgICAgfSBjYXRjaCAobmV3RXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXdFeGNlcHRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfcHJvZ3Jlc3NlZCh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIHByb2dyZXNzZWQgPT09IFwiZnVuY3Rpb25cIiA/IHByb2dyZXNzZWQodmFsdWUpIDogdmFsdWU7XG4gICAgfVxuXG4gICAgUS5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYucHJvbWlzZURpc3BhdGNoKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkb25lID0gdHJ1ZTtcblxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShfZnVsZmlsbGVkKHZhbHVlKSk7XG4gICAgICAgIH0sIFwid2hlblwiLCBbZnVuY3Rpb24gKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkb25lID0gdHJ1ZTtcblxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShfcmVqZWN0ZWQoZXhjZXB0aW9uKSk7XG4gICAgICAgIH1dKTtcbiAgICB9KTtcblxuICAgIC8vIFByb2dyZXNzIHByb3BhZ2F0b3IgbmVlZCB0byBiZSBhdHRhY2hlZCBpbiB0aGUgY3VycmVudCB0aWNrLlxuICAgIHNlbGYucHJvbWlzZURpc3BhdGNoKHZvaWQgMCwgXCJ3aGVuXCIsIFt2b2lkIDAsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgbmV3VmFsdWU7XG4gICAgICAgIHZhciB0aHJldyA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbmV3VmFsdWUgPSBfcHJvZ3Jlc3NlZCh2YWx1ZSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRocmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChRLm9uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBRLm9uZXJyb3IoZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRocmV3KSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5ub3RpZnkobmV3VmFsdWUpO1xuICAgICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG5RLnRhcCA9IGZ1bmN0aW9uIChwcm9taXNlLCBjYWxsYmFjaykge1xuICAgIHJldHVybiBRKHByb21pc2UpLnRhcChjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIFdvcmtzIGFsbW9zdCBsaWtlIFwiZmluYWxseVwiLCBidXQgbm90IGNhbGxlZCBmb3IgcmVqZWN0aW9ucy5cbiAqIE9yaWdpbmFsIHJlc29sdXRpb24gdmFsdWUgaXMgcGFzc2VkIHRocm91Z2ggY2FsbGJhY2sgdW5hZmZlY3RlZC5cbiAqIENhbGxiYWNrIG1heSByZXR1cm4gYSBwcm9taXNlIHRoYXQgd2lsbCBiZSBhd2FpdGVkIGZvci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcmV0dXJucyB7US5Qcm9taXNlfVxuICogQGV4YW1wbGVcbiAqIGRvU29tZXRoaW5nKClcbiAqICAgLnRoZW4oLi4uKVxuICogICAudGFwKGNvbnNvbGUubG9nKVxuICogICAudGhlbiguLi4pO1xuICovXG5Qcm9taXNlLnByb3RvdHlwZS50YXAgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IFEoY2FsbGJhY2spO1xuXG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmZjYWxsKHZhbHVlKS50aGVuUmVzb2x2ZSh2YWx1ZSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBvYnNlcnZlciBvbiBhIHByb21pc2UuXG4gKlxuICogR3VhcmFudGVlczpcbiAqXG4gKiAxLiB0aGF0IGZ1bGZpbGxlZCBhbmQgcmVqZWN0ZWQgd2lsbCBiZSBjYWxsZWQgb25seSBvbmNlLlxuICogMi4gdGhhdCBlaXRoZXIgdGhlIGZ1bGZpbGxlZCBjYWxsYmFjayBvciB0aGUgcmVqZWN0ZWQgY2FsbGJhY2sgd2lsbCBiZVxuICogICAgY2FsbGVkLCBidXQgbm90IGJvdGguXG4gKiAzLiB0aGF0IGZ1bGZpbGxlZCBhbmQgcmVqZWN0ZWQgd2lsbCBub3QgYmUgY2FsbGVkIGluIHRoaXMgdHVybi5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgICAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgdG8gb2JzZXJ2ZVxuICogQHBhcmFtIGZ1bGZpbGxlZCAgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIGZ1bGZpbGxlZCB2YWx1ZVxuICogQHBhcmFtIHJlamVjdGVkICAgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlamVjdGlvbiBleGNlcHRpb25cbiAqIEBwYXJhbSBwcm9ncmVzc2VkIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBhbnkgcHJvZ3Jlc3Mgbm90aWZpY2F0aW9uc1xuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlIGZyb20gdGhlIGludm9rZWQgY2FsbGJhY2tcbiAqL1xuUS53aGVuID0gd2hlbjtcbmZ1bmN0aW9uIHdoZW4odmFsdWUsIGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzZWQpIHtcbiAgICByZXR1cm4gUSh2YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzc2VkKTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUudGhlblJlc29sdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHZhbHVlOyB9KTtcbn07XG5cblEudGhlblJlc29sdmUgPSBmdW5jdGlvbiAocHJvbWlzZSwgdmFsdWUpIHtcbiAgICByZXR1cm4gUShwcm9taXNlKS50aGVuUmVzb2x2ZSh2YWx1ZSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuUmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKCkgeyB0aHJvdyByZWFzb247IH0pO1xufTtcblxuUS50aGVuUmVqZWN0ID0gZnVuY3Rpb24gKHByb21pc2UsIHJlYXNvbikge1xuICAgIHJldHVybiBRKHByb21pc2UpLnRoZW5SZWplY3QocmVhc29uKTtcbn07XG5cbi8qKlxuICogSWYgYW4gb2JqZWN0IGlzIG5vdCBhIHByb21pc2UsIGl0IGlzIGFzIFwibmVhclwiIGFzIHBvc3NpYmxlLlxuICogSWYgYSBwcm9taXNlIGlzIHJlamVjdGVkLCBpdCBpcyBhcyBcIm5lYXJcIiBhcyBwb3NzaWJsZSB0b28uXG4gKiBJZiBpdOKAmXMgYSBmdWxmaWxsZWQgcHJvbWlzZSwgdGhlIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5lYXJlci5cbiAqIElmIGl04oCZcyBhIGRlZmVycmVkIHByb21pc2UgYW5kIHRoZSBkZWZlcnJlZCBoYXMgYmVlbiByZXNvbHZlZCwgdGhlXG4gKiByZXNvbHV0aW9uIGlzIFwibmVhcmVyXCIuXG4gKiBAcGFyYW0gb2JqZWN0XG4gKiBAcmV0dXJucyBtb3N0IHJlc29sdmVkIChuZWFyZXN0KSBmb3JtIG9mIHRoZSBvYmplY3RcbiAqL1xuXG4vLyBYWFggc2hvdWxkIHdlIHJlLWRvIHRoaXM/XG5RLm5lYXJlciA9IG5lYXJlcjtcbmZ1bmN0aW9uIG5lYXJlcih2YWx1ZSkge1xuICAgIGlmIChpc1Byb21pc2UodmFsdWUpKSB7XG4gICAgICAgIHZhciBpbnNwZWN0ZWQgPSB2YWx1ZS5pbnNwZWN0KCk7XG4gICAgICAgIGlmIChpbnNwZWN0ZWQuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnNwZWN0ZWQudmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHByb21pc2UuXG4gKiBPdGhlcndpc2UgaXQgaXMgYSBmdWxmaWxsZWQgdmFsdWUuXG4gKi9cblEuaXNQcm9taXNlID0gaXNQcm9taXNlO1xuZnVuY3Rpb24gaXNQcm9taXNlKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3QgaW5zdGFuY2VvZiBQcm9taXNlO1xufVxuXG5RLmlzUHJvbWlzZUFsaWtlID0gaXNQcm9taXNlQWxpa2U7XG5mdW5jdGlvbiBpc1Byb21pc2VBbGlrZShvYmplY3QpIHtcbiAgICByZXR1cm4gaXNPYmplY3Qob2JqZWN0KSAmJiB0eXBlb2Ygb2JqZWN0LnRoZW4gPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSBwZW5kaW5nIHByb21pc2UsIG1lYW5pbmcgbm90XG4gKiBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG4gKi9cblEuaXNQZW5kaW5nID0gaXNQZW5kaW5nO1xuZnVuY3Rpb24gaXNQZW5kaW5nKG9iamVjdCkge1xuICAgIHJldHVybiBpc1Byb21pc2Uob2JqZWN0KSAmJiBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcInBlbmRpbmdcIjtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuaXNQZW5kaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJwZW5kaW5nXCI7XG59O1xuXG4vKipcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHZhbHVlIG9yIGZ1bGZpbGxlZFxuICogcHJvbWlzZS5cbiAqL1xuUS5pc0Z1bGZpbGxlZCA9IGlzRnVsZmlsbGVkO1xuZnVuY3Rpb24gaXNGdWxmaWxsZWQob2JqZWN0KSB7XG4gICAgcmV0dXJuICFpc1Byb21pc2Uob2JqZWN0KSB8fCBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5pc0Z1bGZpbGxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5pbnNwZWN0KCkuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCI7XG59O1xuXG4vKipcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHJlamVjdGVkIHByb21pc2UuXG4gKi9cblEuaXNSZWplY3RlZCA9IGlzUmVqZWN0ZWQ7XG5mdW5jdGlvbiBpc1JlamVjdGVkKG9iamVjdCkge1xuICAgIHJldHVybiBpc1Byb21pc2Uob2JqZWN0KSAmJiBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcInJlamVjdGVkXCI7XG59XG5cblByb21pc2UucHJvdG90eXBlLmlzUmVqZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5zcGVjdCgpLnN0YXRlID09PSBcInJlamVjdGVkXCI7XG59O1xuXG4vLy8vIEJFR0lOIFVOSEFORExFRCBSRUpFQ1RJT04gVFJBQ0tJTkdcblxuLy8gVGhpcyBwcm9taXNlIGxpYnJhcnkgY29uc3VtZXMgZXhjZXB0aW9ucyB0aHJvd24gaW4gaGFuZGxlcnMgc28gdGhleSBjYW4gYmVcbi8vIGhhbmRsZWQgYnkgYSBzdWJzZXF1ZW50IHByb21pc2UuICBUaGUgZXhjZXB0aW9ucyBnZXQgYWRkZWQgdG8gdGhpcyBhcnJheSB3aGVuXG4vLyB0aGV5IGFyZSBjcmVhdGVkLCBhbmQgcmVtb3ZlZCB3aGVuIHRoZXkgYXJlIGhhbmRsZWQuICBOb3RlIHRoYXQgaW4gRVM2IG9yXG4vLyBzaGltbWVkIGVudmlyb25tZW50cywgdGhpcyB3b3VsZCBuYXR1cmFsbHkgYmUgYSBgU2V0YC5cbnZhciB1bmhhbmRsZWRSZWFzb25zID0gW107XG52YXIgdW5oYW5kbGVkUmVqZWN0aW9ucyA9IFtdO1xudmFyIHJlcG9ydGVkVW5oYW5kbGVkUmVqZWN0aW9ucyA9IFtdO1xudmFyIHRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucyA9IHRydWU7XG5cbmZ1bmN0aW9uIHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucygpIHtcbiAgICB1bmhhbmRsZWRSZWFzb25zLmxlbmd0aCA9IDA7XG4gICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5sZW5ndGggPSAwO1xuXG4gICAgaWYgKCF0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMpIHtcbiAgICAgICAgdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zID0gdHJ1ZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRyYWNrUmVqZWN0aW9uKHByb21pc2UsIHJlYXNvbikge1xuICAgIGlmICghdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBwcm9jZXNzLmVtaXQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBRLm5leHRUaWNrLnJ1bkFmdGVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChhcnJheV9pbmRleE9mKHVuaGFuZGxlZFJlamVjdGlvbnMsIHByb21pc2UpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHByb2Nlc3MuZW1pdChcInVuaGFuZGxlZFJlamVjdGlvblwiLCByZWFzb24sIHByb21pc2UpO1xuICAgICAgICAgICAgICAgIHJlcG9ydGVkVW5oYW5kbGVkUmVqZWN0aW9ucy5wdXNoKHByb21pc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB1bmhhbmRsZWRSZWplY3Rpb25zLnB1c2gocHJvbWlzZSk7XG4gICAgaWYgKHJlYXNvbiAmJiB0eXBlb2YgcmVhc29uLnN0YWNrICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHVuaGFuZGxlZFJlYXNvbnMucHVzaChyZWFzb24uc3RhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHVuaGFuZGxlZFJlYXNvbnMucHVzaChcIihubyBzdGFjaykgXCIgKyByZWFzb24pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdW50cmFja1JlamVjdGlvbihwcm9taXNlKSB7XG4gICAgaWYgKCF0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBhdCA9IGFycmF5X2luZGV4T2YodW5oYW5kbGVkUmVqZWN0aW9ucywgcHJvbWlzZSk7XG4gICAgaWYgKGF0ICE9PSAtMSkge1xuICAgICAgICBpZiAodHlwZW9mIHByb2Nlc3MgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHByb2Nlc3MuZW1pdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBRLm5leHRUaWNrLnJ1bkFmdGVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXRSZXBvcnQgPSBhcnJheV9pbmRleE9mKHJlcG9ydGVkVW5oYW5kbGVkUmVqZWN0aW9ucywgcHJvbWlzZSk7XG4gICAgICAgICAgICAgICAgaWYgKGF0UmVwb3J0ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmVtaXQoXCJyZWplY3Rpb25IYW5kbGVkXCIsIHVuaGFuZGxlZFJlYXNvbnNbYXRdLCBwcm9taXNlKTtcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0ZWRVbmhhbmRsZWRSZWplY3Rpb25zLnNwbGljZShhdFJlcG9ydCwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5zcGxpY2UoYXQsIDEpO1xuICAgICAgICB1bmhhbmRsZWRSZWFzb25zLnNwbGljZShhdCwgMSk7XG4gICAgfVxufVxuXG5RLnJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucyA9IHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucztcblxuUS5nZXRVbmhhbmRsZWRSZWFzb25zID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIE1ha2UgYSBjb3B5IHNvIHRoYXQgY29uc3VtZXJzIGNhbid0IGludGVyZmVyZSB3aXRoIG91ciBpbnRlcm5hbCBzdGF0ZS5cbiAgICByZXR1cm4gdW5oYW5kbGVkUmVhc29ucy5zbGljZSgpO1xufTtcblxuUS5zdG9wVW5oYW5kbGVkUmVqZWN0aW9uVHJhY2tpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmVzZXRVbmhhbmRsZWRSZWplY3Rpb25zKCk7XG4gICAgdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zID0gZmFsc2U7XG59O1xuXG5yZXNldFVuaGFuZGxlZFJlamVjdGlvbnMoKTtcblxuLy8vLyBFTkQgVU5IQU5ETEVEIFJFSkVDVElPTiBUUkFDS0lOR1xuXG4vKipcbiAqIENvbnN0cnVjdHMgYSByZWplY3RlZCBwcm9taXNlLlxuICogQHBhcmFtIHJlYXNvbiB2YWx1ZSBkZXNjcmliaW5nIHRoZSBmYWlsdXJlXG4gKi9cblEucmVqZWN0ID0gcmVqZWN0O1xuZnVuY3Rpb24gcmVqZWN0KHJlYXNvbikge1xuICAgIHZhciByZWplY3Rpb24gPSBQcm9taXNlKHtcbiAgICAgICAgXCJ3aGVuXCI6IGZ1bmN0aW9uIChyZWplY3RlZCkge1xuICAgICAgICAgICAgLy8gbm90ZSB0aGF0IHRoZSBlcnJvciBoYXMgYmVlbiBoYW5kbGVkXG4gICAgICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICB1bnRyYWNrUmVqZWN0aW9uKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQocmVhc29uKSA6IHRoaXM7XG4gICAgICAgIH1cbiAgICB9LCBmdW5jdGlvbiBmYWxsYmFjaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSwgZnVuY3Rpb24gaW5zcGVjdCgpIHtcbiAgICAgICAgcmV0dXJuIHsgc3RhdGU6IFwicmVqZWN0ZWRcIiwgcmVhc29uOiByZWFzb24gfTtcbiAgICB9KTtcblxuICAgIC8vIE5vdGUgdGhhdCB0aGUgcmVhc29uIGhhcyBub3QgYmVlbiBoYW5kbGVkLlxuICAgIHRyYWNrUmVqZWN0aW9uKHJlamVjdGlvbiwgcmVhc29uKTtcblxuICAgIHJldHVybiByZWplY3Rpb247XG59XG5cbi8qKlxuICogQ29uc3RydWN0cyBhIGZ1bGZpbGxlZCBwcm9taXNlIGZvciBhbiBpbW1lZGlhdGUgcmVmZXJlbmNlLlxuICogQHBhcmFtIHZhbHVlIGltbWVkaWF0ZSByZWZlcmVuY2VcbiAqL1xuUS5mdWxmaWxsID0gZnVsZmlsbDtcbmZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHtcbiAgICByZXR1cm4gUHJvbWlzZSh7XG4gICAgICAgIFwid2hlblwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0XCI6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVbbmFtZV07XG4gICAgICAgIH0sXG4gICAgICAgIFwic2V0XCI6IGZ1bmN0aW9uIChuYW1lLCByaHMpIHtcbiAgICAgICAgICAgIHZhbHVlW25hbWVdID0gcmhzO1xuICAgICAgICB9LFxuICAgICAgICBcImRlbGV0ZVwiOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgZGVsZXRlIHZhbHVlW25hbWVdO1xuICAgICAgICB9LFxuICAgICAgICBcInBvc3RcIjogZnVuY3Rpb24gKG5hbWUsIGFyZ3MpIHtcbiAgICAgICAgICAgIC8vIE1hcmsgTWlsbGVyIHByb3Bvc2VzIHRoYXQgcG9zdCB3aXRoIG5vIG5hbWUgc2hvdWxkIGFwcGx5IGFcbiAgICAgICAgICAgIC8vIHByb21pc2VkIGZ1bmN0aW9uLlxuICAgICAgICAgICAgaWYgKG5hbWUgPT09IG51bGwgfHwgbmFtZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmFwcGx5KHZvaWQgMCwgYXJncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZVtuYW1lXS5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiYXBwbHlcIjogZnVuY3Rpb24gKHRoaXNwLCBhcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUuYXBwbHkodGhpc3AsIGFyZ3MpO1xuICAgICAgICB9LFxuICAgICAgICBcImtleXNcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG9iamVjdF9rZXlzKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sIHZvaWQgMCwgZnVuY3Rpb24gaW5zcGVjdCgpIHtcbiAgICAgICAgcmV0dXJuIHsgc3RhdGU6IFwiZnVsZmlsbGVkXCIsIHZhbHVlOiB2YWx1ZSB9O1xuICAgIH0pO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIHRoZW5hYmxlcyB0byBRIHByb21pc2VzLlxuICogQHBhcmFtIHByb21pc2UgdGhlbmFibGUgcHJvbWlzZVxuICogQHJldHVybnMgYSBRIHByb21pc2VcbiAqL1xuZnVuY3Rpb24gY29lcmNlKHByb21pc2UpIHtcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGRlZmVycmVkLnJlc29sdmUsIGRlZmVycmVkLnJlamVjdCwgZGVmZXJyZWQubm90aWZ5KTtcbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXhjZXB0aW9uKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufVxuXG4vKipcbiAqIEFubm90YXRlcyBhbiBvYmplY3Qgc3VjaCB0aGF0IGl0IHdpbGwgbmV2ZXIgYmVcbiAqIHRyYW5zZmVycmVkIGF3YXkgZnJvbSB0aGlzIHByb2Nlc3Mgb3ZlciBhbnkgcHJvbWlzZVxuICogY29tbXVuaWNhdGlvbiBjaGFubmVsLlxuICogQHBhcmFtIG9iamVjdFxuICogQHJldHVybnMgcHJvbWlzZSBhIHdyYXBwaW5nIG9mIHRoYXQgb2JqZWN0IHRoYXRcbiAqIGFkZGl0aW9uYWxseSByZXNwb25kcyB0byB0aGUgXCJpc0RlZlwiIG1lc3NhZ2VcbiAqIHdpdGhvdXQgYSByZWplY3Rpb24uXG4gKi9cblEubWFzdGVyID0gbWFzdGVyO1xuZnVuY3Rpb24gbWFzdGVyKG9iamVjdCkge1xuICAgIHJldHVybiBQcm9taXNlKHtcbiAgICAgICAgXCJpc0RlZlwiOiBmdW5jdGlvbiAoKSB7fVxuICAgIH0sIGZ1bmN0aW9uIGZhbGxiYWNrKG9wLCBhcmdzKSB7XG4gICAgICAgIHJldHVybiBkaXNwYXRjaChvYmplY3QsIG9wLCBhcmdzKTtcbiAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBRKG9iamVjdCkuaW5zcGVjdCgpO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIFNwcmVhZHMgdGhlIHZhbHVlcyBvZiBhIHByb21pc2VkIGFycmF5IG9mIGFyZ3VtZW50cyBpbnRvIHRoZVxuICogZnVsZmlsbG1lbnQgY2FsbGJhY2suXG4gKiBAcGFyYW0gZnVsZmlsbGVkIGNhbGxiYWNrIHRoYXQgcmVjZWl2ZXMgdmFyaWFkaWMgYXJndW1lbnRzIGZyb20gdGhlXG4gKiBwcm9taXNlZCBhcnJheVxuICogQHBhcmFtIHJlamVjdGVkIGNhbGxiYWNrIHRoYXQgcmVjZWl2ZXMgdGhlIGV4Y2VwdGlvbiBpZiB0aGUgcHJvbWlzZVxuICogaXMgcmVqZWN0ZWQuXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWUgb3IgdGhyb3duIGV4Y2VwdGlvbiBvZlxuICogZWl0aGVyIGNhbGxiYWNrLlxuICovXG5RLnNwcmVhZCA9IHNwcmVhZDtcbmZ1bmN0aW9uIHNwcmVhZCh2YWx1ZSwgZnVsZmlsbGVkLCByZWplY3RlZCkge1xuICAgIHJldHVybiBRKHZhbHVlKS5zcHJlYWQoZnVsZmlsbGVkLCByZWplY3RlZCk7XG59XG5cblByb21pc2UucHJvdG90eXBlLnNwcmVhZCA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkKSB7XG4gICAgcmV0dXJuIHRoaXMuYWxsKCkudGhlbihmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIGZ1bGZpbGxlZC5hcHBseSh2b2lkIDAsIGFycmF5KTtcbiAgICB9LCByZWplY3RlZCk7XG59O1xuXG4vKipcbiAqIFRoZSBhc3luYyBmdW5jdGlvbiBpcyBhIGRlY29yYXRvciBmb3IgZ2VuZXJhdG9yIGZ1bmN0aW9ucywgdHVybmluZ1xuICogdGhlbSBpbnRvIGFzeW5jaHJvbm91cyBnZW5lcmF0b3JzLiAgQWx0aG91Z2ggZ2VuZXJhdG9ycyBhcmUgb25seSBwYXJ0XG4gKiBvZiB0aGUgbmV3ZXN0IEVDTUFTY3JpcHQgNiBkcmFmdHMsIHRoaXMgY29kZSBkb2VzIG5vdCBjYXVzZSBzeW50YXhcbiAqIGVycm9ycyBpbiBvbGRlciBlbmdpbmVzLiAgVGhpcyBjb2RlIHNob3VsZCBjb250aW51ZSB0byB3b3JrIGFuZCB3aWxsXG4gKiBpbiBmYWN0IGltcHJvdmUgb3ZlciB0aW1lIGFzIHRoZSBsYW5ndWFnZSBpbXByb3Zlcy5cbiAqXG4gKiBFUzYgZ2VuZXJhdG9ycyBhcmUgY3VycmVudGx5IHBhcnQgb2YgVjggdmVyc2lvbiAzLjE5IHdpdGggdGhlXG4gKiAtLWhhcm1vbnktZ2VuZXJhdG9ycyBydW50aW1lIGZsYWcgZW5hYmxlZC4gIFNwaWRlck1vbmtleSBoYXMgaGFkIHRoZW1cbiAqIGZvciBsb25nZXIsIGJ1dCB1bmRlciBhbiBvbGRlciBQeXRob24taW5zcGlyZWQgZm9ybS4gIFRoaXMgZnVuY3Rpb25cbiAqIHdvcmtzIG9uIGJvdGgga2luZHMgb2YgZ2VuZXJhdG9ycy5cbiAqXG4gKiBEZWNvcmF0ZXMgYSBnZW5lcmF0b3IgZnVuY3Rpb24gc3VjaCB0aGF0OlxuICogIC0gaXQgbWF5IHlpZWxkIHByb21pc2VzXG4gKiAgLSBleGVjdXRpb24gd2lsbCBjb250aW51ZSB3aGVuIHRoYXQgcHJvbWlzZSBpcyBmdWxmaWxsZWRcbiAqICAtIHRoZSB2YWx1ZSBvZiB0aGUgeWllbGQgZXhwcmVzc2lvbiB3aWxsIGJlIHRoZSBmdWxmaWxsZWQgdmFsdWVcbiAqICAtIGl0IHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlICh3aGVuIHRoZSBnZW5lcmF0b3JcbiAqICAgIHN0b3BzIGl0ZXJhdGluZylcbiAqICAtIHRoZSBkZWNvcmF0ZWQgZnVuY3Rpb24gcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcbiAqICAgIG9mIHRoZSBnZW5lcmF0b3Igb3IgdGhlIGZpcnN0IHJlamVjdGVkIHByb21pc2UgYW1vbmcgdGhvc2VcbiAqICAgIHlpZWxkZWQuXG4gKiAgLSBpZiBhbiBlcnJvciBpcyB0aHJvd24gaW4gdGhlIGdlbmVyYXRvciwgaXQgcHJvcGFnYXRlcyB0aHJvdWdoXG4gKiAgICBldmVyeSBmb2xsb3dpbmcgeWllbGQgdW50aWwgaXQgaXMgY2F1Z2h0LCBvciB1bnRpbCBpdCBlc2NhcGVzXG4gKiAgICB0aGUgZ2VuZXJhdG9yIGZ1bmN0aW9uIGFsdG9nZXRoZXIsIGFuZCBpcyB0cmFuc2xhdGVkIGludG8gYVxuICogICAgcmVqZWN0aW9uIGZvciB0aGUgcHJvbWlzZSByZXR1cm5lZCBieSB0aGUgZGVjb3JhdGVkIGdlbmVyYXRvci5cbiAqL1xuUS5hc3luYyA9IGFzeW5jO1xuZnVuY3Rpb24gYXN5bmMobWFrZUdlbmVyYXRvcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIHdoZW4gdmVyYiBpcyBcInNlbmRcIiwgYXJnIGlzIGEgdmFsdWVcbiAgICAgICAgLy8gd2hlbiB2ZXJiIGlzIFwidGhyb3dcIiwgYXJnIGlzIGFuIGV4Y2VwdGlvblxuICAgICAgICBmdW5jdGlvbiBjb250aW51ZXIodmVyYiwgYXJnKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0O1xuXG4gICAgICAgICAgICAvLyBVbnRpbCBWOCAzLjE5IC8gQ2hyb21pdW0gMjkgaXMgcmVsZWFzZWQsIFNwaWRlck1vbmtleSBpcyB0aGUgb25seVxuICAgICAgICAgICAgLy8gZW5naW5lIHRoYXQgaGFzIGEgZGVwbG95ZWQgYmFzZSBvZiBicm93c2VycyB0aGF0IHN1cHBvcnQgZ2VuZXJhdG9ycy5cbiAgICAgICAgICAgIC8vIEhvd2V2ZXIsIFNNJ3MgZ2VuZXJhdG9ycyB1c2UgdGhlIFB5dGhvbi1pbnNwaXJlZCBzZW1hbnRpY3Mgb2ZcbiAgICAgICAgICAgIC8vIG91dGRhdGVkIEVTNiBkcmFmdHMuICBXZSB3b3VsZCBsaWtlIHRvIHN1cHBvcnQgRVM2LCBidXQgd2UnZCBhbHNvXG4gICAgICAgICAgICAvLyBsaWtlIHRvIG1ha2UgaXQgcG9zc2libGUgdG8gdXNlIGdlbmVyYXRvcnMgaW4gZGVwbG95ZWQgYnJvd3NlcnMsIHNvXG4gICAgICAgICAgICAvLyB3ZSBhbHNvIHN1cHBvcnQgUHl0aG9uLXN0eWxlIGdlbmVyYXRvcnMuICBBdCBzb21lIHBvaW50IHdlIGNhbiByZW1vdmVcbiAgICAgICAgICAgIC8vIHRoaXMgYmxvY2suXG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgU3RvcEl0ZXJhdGlvbiA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIC8vIEVTNiBHZW5lcmF0b3JzXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZ2VuZXJhdG9yW3ZlcmJdKGFyZyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBRKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdoZW4ocmVzdWx0LnZhbHVlLCBjYWxsYmFjaywgZXJyYmFjayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTcGlkZXJNb25rZXkgR2VuZXJhdG9yc1xuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBSZW1vdmUgdGhpcyBjYXNlIHdoZW4gU00gZG9lcyBFUzYgZ2VuZXJhdG9ycy5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBnZW5lcmF0b3JbdmVyYl0oYXJnKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzU3RvcEl0ZXJhdGlvbihleGNlcHRpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUShleGNlcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChleGNlcHRpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB3aGVuKHJlc3VsdCwgY2FsbGJhY2ssIGVycmJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBnZW5lcmF0b3IgPSBtYWtlR2VuZXJhdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGNvbnRpbnVlci5iaW5kKGNvbnRpbnVlciwgXCJuZXh0XCIpO1xuICAgICAgICB2YXIgZXJyYmFjayA9IGNvbnRpbnVlci5iaW5kKGNvbnRpbnVlciwgXCJ0aHJvd1wiKTtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBUaGUgc3Bhd24gZnVuY3Rpb24gaXMgYSBzbWFsbCB3cmFwcGVyIGFyb3VuZCBhc3luYyB0aGF0IGltbWVkaWF0ZWx5XG4gKiBjYWxscyB0aGUgZ2VuZXJhdG9yIGFuZCBhbHNvIGVuZHMgdGhlIHByb21pc2UgY2hhaW4sIHNvIHRoYXQgYW55XG4gKiB1bmhhbmRsZWQgZXJyb3JzIGFyZSB0aHJvd24gaW5zdGVhZCBvZiBmb3J3YXJkZWQgdG8gdGhlIGVycm9yXG4gKiBoYW5kbGVyLiBUaGlzIGlzIHVzZWZ1bCBiZWNhdXNlIGl0J3MgZXh0cmVtZWx5IGNvbW1vbiB0byBydW5cbiAqIGdlbmVyYXRvcnMgYXQgdGhlIHRvcC1sZXZlbCB0byB3b3JrIHdpdGggbGlicmFyaWVzLlxuICovXG5RLnNwYXduID0gc3Bhd247XG5mdW5jdGlvbiBzcGF3bihtYWtlR2VuZXJhdG9yKSB7XG4gICAgUS5kb25lKFEuYXN5bmMobWFrZUdlbmVyYXRvcikoKSk7XG59XG5cbi8vIEZJWE1FOiBSZW1vdmUgdGhpcyBpbnRlcmZhY2Ugb25jZSBFUzYgZ2VuZXJhdG9ycyBhcmUgaW4gU3BpZGVyTW9ua2V5LlxuLyoqXG4gKiBUaHJvd3MgYSBSZXR1cm5WYWx1ZSBleGNlcHRpb24gdG8gc3RvcCBhbiBhc3luY2hyb25vdXMgZ2VuZXJhdG9yLlxuICpcbiAqIFRoaXMgaW50ZXJmYWNlIGlzIGEgc3RvcC1nYXAgbWVhc3VyZSB0byBzdXBwb3J0IGdlbmVyYXRvciByZXR1cm5cbiAqIHZhbHVlcyBpbiBvbGRlciBGaXJlZm94L1NwaWRlck1vbmtleS4gIEluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBFUzZcbiAqIGdlbmVyYXRvcnMgbGlrZSBDaHJvbWl1bSAyOSwganVzdCB1c2UgXCJyZXR1cm5cIiBpbiB5b3VyIGdlbmVyYXRvclxuICogZnVuY3Rpb25zLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSB0aGUgcmV0dXJuIHZhbHVlIGZvciB0aGUgc3Vycm91bmRpbmcgZ2VuZXJhdG9yXG4gKiBAdGhyb3dzIFJldHVyblZhbHVlIGV4Y2VwdGlvbiB3aXRoIHRoZSB2YWx1ZS5cbiAqIEBleGFtcGxlXG4gKiAvLyBFUzYgc3R5bGVcbiAqIFEuYXN5bmMoZnVuY3Rpb24qICgpIHtcbiAqICAgICAgdmFyIGZvbyA9IHlpZWxkIGdldEZvb1Byb21pc2UoKTtcbiAqICAgICAgdmFyIGJhciA9IHlpZWxkIGdldEJhclByb21pc2UoKTtcbiAqICAgICAgcmV0dXJuIGZvbyArIGJhcjtcbiAqIH0pXG4gKiAvLyBPbGRlciBTcGlkZXJNb25rZXkgc3R5bGVcbiAqIFEuYXN5bmMoZnVuY3Rpb24gKCkge1xuICogICAgICB2YXIgZm9vID0geWllbGQgZ2V0Rm9vUHJvbWlzZSgpO1xuICogICAgICB2YXIgYmFyID0geWllbGQgZ2V0QmFyUHJvbWlzZSgpO1xuICogICAgICBRLnJldHVybihmb28gKyBiYXIpO1xuICogfSlcbiAqL1xuUVtcInJldHVyblwiXSA9IF9yZXR1cm47XG5mdW5jdGlvbiBfcmV0dXJuKHZhbHVlKSB7XG4gICAgdGhyb3cgbmV3IFFSZXR1cm5WYWx1ZSh2YWx1ZSk7XG59XG5cbi8qKlxuICogVGhlIHByb21pc2VkIGZ1bmN0aW9uIGRlY29yYXRvciBlbnN1cmVzIHRoYXQgYW55IHByb21pc2UgYXJndW1lbnRzXG4gKiBhcmUgc2V0dGxlZCBhbmQgcGFzc2VkIGFzIHZhbHVlcyAoYHRoaXNgIGlzIGFsc28gc2V0dGxlZCBhbmQgcGFzc2VkXG4gKiBhcyBhIHZhbHVlKS4gIEl0IHdpbGwgYWxzbyBlbnN1cmUgdGhhdCB0aGUgcmVzdWx0IG9mIGEgZnVuY3Rpb24gaXNcbiAqIGFsd2F5cyBhIHByb21pc2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIHZhciBhZGQgPSBRLnByb21pc2VkKGZ1bmN0aW9uIChhLCBiKSB7XG4gKiAgICAgcmV0dXJuIGEgKyBiO1xuICogfSk7XG4gKiBhZGQoUShhKSwgUShCKSk7XG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGRlY29yYXRlXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb259IGEgZnVuY3Rpb24gdGhhdCBoYXMgYmVlbiBkZWNvcmF0ZWQuXG4gKi9cblEucHJvbWlzZWQgPSBwcm9taXNlZDtcbmZ1bmN0aW9uIHByb21pc2VkKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNwcmVhZChbdGhpcywgYWxsKGFyZ3VtZW50cyldLCBmdW5jdGlvbiAoc2VsZiwgYXJncykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICB9O1xufVxuXG4vKipcbiAqIHNlbmRzIGEgbWVzc2FnZSB0byBhIHZhbHVlIGluIGEgZnV0dXJlIHR1cm5cbiAqIEBwYXJhbSBvYmplY3QqIHRoZSByZWNpcGllbnRcbiAqIEBwYXJhbSBvcCB0aGUgbmFtZSBvZiB0aGUgbWVzc2FnZSBvcGVyYXRpb24sIGUuZy4sIFwid2hlblwiLFxuICogQHBhcmFtIGFyZ3MgZnVydGhlciBhcmd1bWVudHMgdG8gYmUgZm9yd2FyZGVkIHRvIHRoZSBvcGVyYXRpb25cbiAqIEByZXR1cm5zIHJlc3VsdCB7UHJvbWlzZX0gYSBwcm9taXNlIGZvciB0aGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb25cbiAqL1xuUS5kaXNwYXRjaCA9IGRpc3BhdGNoO1xuZnVuY3Rpb24gZGlzcGF0Y2gob2JqZWN0LCBvcCwgYXJncykge1xuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2gob3AsIGFyZ3MpO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5kaXNwYXRjaCA9IGZ1bmN0aW9uIChvcCwgYXJncykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLnByb21pc2VEaXNwYXRjaChkZWZlcnJlZC5yZXNvbHZlLCBvcCwgYXJncyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgcHJvcGVydHkgdG8gZ2V0XG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSBwcm9wZXJ0eSB2YWx1ZVxuICovXG5RLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSkge1xuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJnZXRcIiwgW2tleV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwiZ2V0XCIsIFtrZXldKTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBpbiBhIGZ1dHVyZSB0dXJuLlxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIG9iamVjdCBvYmplY3RcbiAqIEBwYXJhbSBuYW1lICAgICAgbmFtZSBvZiBwcm9wZXJ0eSB0byBzZXRcbiAqIEBwYXJhbSB2YWx1ZSAgICAgbmV3IHZhbHVlIG9mIHByb3BlcnR5XG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcbiAqL1xuUS5zZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcInNldFwiLCBba2V5LCB2YWx1ZV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcInNldFwiLCBba2V5LCB2YWx1ZV0pO1xufTtcblxuLyoqXG4gKiBEZWxldGVzIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgcHJvcGVydHkgdG8gZGVsZXRlXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcbiAqL1xuUS5kZWwgPSAvLyBYWFggbGVnYWN5XG5RW1wiZGVsZXRlXCJdID0gZnVuY3Rpb24gKG9iamVjdCwga2V5KSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImRlbGV0ZVwiLCBba2V5XSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5kZWwgPSAvLyBYWFggbGVnYWN5XG5Qcm9taXNlLnByb3RvdHlwZVtcImRlbGV0ZVwiXSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImRlbGV0ZVwiLCBba2V5XSk7XG59O1xuXG4vKipcbiAqIEludm9rZXMgYSBtZXRob2QgaW4gYSBmdXR1cmUgdHVybi5cbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgbWV0aG9kIHRvIGludm9rZVxuICogQHBhcmFtIHZhbHVlICAgICBhIHZhbHVlIHRvIHBvc3QsIHR5cGljYWxseSBhbiBhcnJheSBvZlxuICogICAgICAgICAgICAgICAgICBpbnZvY2F0aW9uIGFyZ3VtZW50cyBmb3IgcHJvbWlzZXMgdGhhdFxuICogICAgICAgICAgICAgICAgICBhcmUgdWx0aW1hdGVseSBiYWNrZWQgd2l0aCBgcmVzb2x2ZWAgdmFsdWVzLFxuICogICAgICAgICAgICAgICAgICBhcyBvcHBvc2VkIHRvIHRob3NlIGJhY2tlZCB3aXRoIFVSTHNcbiAqICAgICAgICAgICAgICAgICAgd2hlcmVpbiB0aGUgcG9zdGVkIHZhbHVlIGNhbiBiZSBhbnlcbiAqICAgICAgICAgICAgICAgICAgSlNPTiBzZXJpYWxpemFibGUgb2JqZWN0LlxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXG4gKi9cbi8vIGJvdW5kIGxvY2FsbHkgYmVjYXVzZSBpdCBpcyB1c2VkIGJ5IG90aGVyIG1ldGhvZHNcblEubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcblEucG9zdCA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUsIGFyZ3MpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJnc10pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcblByb21pc2UucHJvdG90eXBlLnBvc3QgPSBmdW5jdGlvbiAobmFtZSwgYXJncykge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJnc10pO1xufTtcblxuLyoqXG4gKiBJbnZva2VzIGEgbWV0aG9kIGluIGEgZnV0dXJlIHR1cm4uXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIG1ldGhvZCB0byBpbnZva2VcbiAqIEBwYXJhbSAuLi5hcmdzICAgYXJyYXkgb2YgaW52b2NhdGlvbiBhcmd1bWVudHNcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZVxuICovXG5RLnNlbmQgPSAvLyBYWFggTWFyayBNaWxsZXIncyBwcm9wb3NlZCBwYXJsYW5jZVxuUS5tY2FsbCA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXG5RLmludm9rZSA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUgLyouLi5hcmdzKi8pIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAyKV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuc2VuZCA9IC8vIFhYWCBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIHBhcmxhbmNlXG5Qcm9taXNlLnByb3RvdHlwZS5tY2FsbCA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXG5Qcm9taXNlLnByb3RvdHlwZS5pbnZva2UgPSBmdW5jdGlvbiAobmFtZSAvKi4uLmFyZ3MqLykge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKV0pO1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIHRoZSBwcm9taXNlZCBmdW5jdGlvbiBpbiBhIGZ1dHVyZSB0dXJuLlxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBmdW5jdGlvblxuICogQHBhcmFtIGFyZ3MgICAgICBhcnJheSBvZiBhcHBsaWNhdGlvbiBhcmd1bWVudHNcbiAqL1xuUS5mYXBwbHkgPSBmdW5jdGlvbiAob2JqZWN0LCBhcmdzKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFyZ3NdKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmZhcHBseSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcmdzXSk7XG59O1xuXG4vKipcbiAqIENhbGxzIHRoZSBwcm9taXNlZCBmdW5jdGlvbiBpbiBhIGZ1dHVyZSB0dXJuLlxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBmdW5jdGlvblxuICogQHBhcmFtIC4uLmFyZ3MgICBhcnJheSBvZiBhcHBsaWNhdGlvbiBhcmd1bWVudHNcbiAqL1xuUVtcInRyeVwiXSA9XG5RLmZjYWxsID0gZnVuY3Rpb24gKG9iamVjdCAvKiAuLi5hcmdzKi8pIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwiYXBwbHlcIiwgW3ZvaWQgMCwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKV0pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZmNhbGwgPSBmdW5jdGlvbiAoLyouLi5hcmdzKi8pIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFycmF5X3NsaWNlKGFyZ3VtZW50cyldKTtcbn07XG5cbi8qKlxuICogQmluZHMgdGhlIHByb21pc2VkIGZ1bmN0aW9uLCB0cmFuc2Zvcm1pbmcgcmV0dXJuIHZhbHVlcyBpbnRvIGEgZnVsZmlsbGVkXG4gKiBwcm9taXNlIGFuZCB0aHJvd24gZXJyb3JzIGludG8gYSByZWplY3RlZCBvbmUuXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IGZ1bmN0aW9uXG4gKiBAcGFyYW0gLi4uYXJncyAgIGFycmF5IG9mIGFwcGxpY2F0aW9uIGFyZ3VtZW50c1xuICovXG5RLmZiaW5kID0gZnVuY3Rpb24gKG9iamVjdCAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBwcm9taXNlID0gUShvYmplY3QpO1xuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gZmJvdW5kKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS5kaXNwYXRjaChcImFwcGx5XCIsIFtcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKVxuICAgICAgICBdKTtcbiAgICB9O1xufTtcblByb21pc2UucHJvdG90eXBlLmZiaW5kID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gZmJvdW5kKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS5kaXNwYXRjaChcImFwcGx5XCIsIFtcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKVxuICAgICAgICBdKTtcbiAgICB9O1xufTtcblxuLyoqXG4gKiBSZXF1ZXN0cyB0aGUgbmFtZXMgb2YgdGhlIG93bmVkIHByb3BlcnRpZXMgb2YgYSBwcm9taXNlZFxuICogb2JqZWN0IGluIGEgZnV0dXJlIHR1cm4uXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUga2V5cyBvZiB0aGUgZXZlbnR1YWxseSBzZXR0bGVkIG9iamVjdFxuICovXG5RLmtleXMgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImtleXNcIiwgW10pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImtleXNcIiwgW10pO1xufTtcblxuLyoqXG4gKiBUdXJucyBhbiBhcnJheSBvZiBwcm9taXNlcyBpbnRvIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkuICBJZiBhbnkgb2ZcbiAqIHRoZSBwcm9taXNlcyBnZXRzIHJlamVjdGVkLCB0aGUgd2hvbGUgYXJyYXkgaXMgcmVqZWN0ZWQgaW1tZWRpYXRlbHkuXG4gKiBAcGFyYW0ge0FycmF5Kn0gYW4gYXJyYXkgKG9yIHByb21pc2UgZm9yIGFuIGFycmF5KSBvZiB2YWx1ZXMgKG9yXG4gKiBwcm9taXNlcyBmb3IgdmFsdWVzKVxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciBhbiBhcnJheSBvZiB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXNcbiAqL1xuLy8gQnkgTWFyayBNaWxsZXJcbi8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPXN0cmF3bWFuOmNvbmN1cnJlbmN5JnJldj0xMzA4Nzc2NTIxI2FsbGZ1bGZpbGxlZFxuUS5hbGwgPSBhbGw7XG5mdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcbiAgICByZXR1cm4gd2hlbihwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgICAgIHZhciBwZW5kaW5nQ291bnQgPSAwO1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgICAgICBhcnJheV9yZWR1Y2UocHJvbWlzZXMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIHByb21pc2UsIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgc25hcHNob3Q7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgaXNQcm9taXNlKHByb21pc2UpICYmXG4gICAgICAgICAgICAgICAgKHNuYXBzaG90ID0gcHJvbWlzZS5pbnNwZWN0KCkpLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBwcm9taXNlc1tpbmRleF0gPSBzbmFwc2hvdC52YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgKytwZW5kaW5nQ291bnQ7XG4gICAgICAgICAgICAgICAgd2hlbihcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlc1tpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgtLXBlbmRpbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocHJvbWlzZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChwcm9ncmVzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQubm90aWZ5KHsgaW5kZXg6IGluZGV4LCB2YWx1ZTogcHJvZ3Jlc3MgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB2b2lkIDApO1xuICAgICAgICBpZiAocGVuZGluZ0NvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHByb21pc2VzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9KTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuYWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGZpcnN0IHJlc29sdmVkIHByb21pc2Ugb2YgYW4gYXJyYXkuIFByaW9yIHJlamVjdGVkIHByb21pc2VzIGFyZVxuICogaWdub3JlZC4gIFJlamVjdHMgb25seSBpZiBhbGwgcHJvbWlzZXMgYXJlIHJlamVjdGVkLlxuICogQHBhcmFtIHtBcnJheSp9IGFuIGFycmF5IGNvbnRhaW5pbmcgdmFsdWVzIG9yIHByb21pc2VzIGZvciB2YWx1ZXNcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmdWxmaWxsZWQgd2l0aCB0aGUgdmFsdWUgb2YgdGhlIGZpcnN0IHJlc29sdmVkIHByb21pc2UsXG4gKiBvciBhIHJlamVjdGVkIHByb21pc2UgaWYgYWxsIHByb21pc2VzIGFyZSByZWplY3RlZC5cbiAqL1xuUS5hbnkgPSBhbnk7XG5cbmZ1bmN0aW9uIGFueShwcm9taXNlcykge1xuICAgIGlmIChwcm9taXNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIFEucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcbiAgICB2YXIgcGVuZGluZ0NvdW50ID0gMDtcbiAgICBhcnJheV9yZWR1Y2UocHJvbWlzZXMsIGZ1bmN0aW9uIChwcmV2LCBjdXJyZW50LCBpbmRleCkge1xuICAgICAgICB2YXIgcHJvbWlzZSA9IHByb21pc2VzW2luZGV4XTtcblxuICAgICAgICBwZW5kaW5nQ291bnQrKztcblxuICAgICAgICB3aGVuKHByb21pc2UsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCBvblByb2dyZXNzKTtcbiAgICAgICAgZnVuY3Rpb24gb25GdWxmaWxsZWQocmVzdWx0KSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gb25SZWplY3RlZCgpIHtcbiAgICAgICAgICAgIHBlbmRpbmdDb3VudC0tO1xuICAgICAgICAgICAgaWYgKHBlbmRpbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgIFwiQ2FuJ3QgZ2V0IGZ1bGZpbGxtZW50IHZhbHVlIGZyb20gYW55IHByb21pc2UsIGFsbCBcIiArXG4gICAgICAgICAgICAgICAgICAgIFwicHJvbWlzZXMgd2VyZSByZWplY3RlZC5cIlxuICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIG9uUHJvZ3Jlc3MocHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLm5vdGlmeSh7XG4gICAgICAgICAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBwcm9ncmVzc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LCB1bmRlZmluZWQpO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59XG5cblByb21pc2UucHJvdG90eXBlLmFueSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gYW55KHRoaXMpO1xufTtcblxuLyoqXG4gKiBXYWl0cyBmb3IgYWxsIHByb21pc2VzIHRvIGJlIHNldHRsZWQsIGVpdGhlciBmdWxmaWxsZWQgb3JcbiAqIHJlamVjdGVkLiAgVGhpcyBpcyBkaXN0aW5jdCBmcm9tIGBhbGxgIHNpbmNlIHRoYXQgd291bGQgc3RvcFxuICogd2FpdGluZyBhdCB0aGUgZmlyc3QgcmVqZWN0aW9uLiAgVGhlIHByb21pc2UgcmV0dXJuZWQgYnlcbiAqIGBhbGxSZXNvbHZlZGAgd2lsbCBuZXZlciBiZSByZWplY3RlZC5cbiAqIEBwYXJhbSBwcm9taXNlcyBhIHByb21pc2UgZm9yIGFuIGFycmF5IChvciBhbiBhcnJheSkgb2YgcHJvbWlzZXNcbiAqIChvciB2YWx1ZXMpXG4gKiBAcmV0dXJuIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkgb2YgcHJvbWlzZXNcbiAqL1xuUS5hbGxSZXNvbHZlZCA9IGRlcHJlY2F0ZShhbGxSZXNvbHZlZCwgXCJhbGxSZXNvbHZlZFwiLCBcImFsbFNldHRsZWRcIik7XG5mdW5jdGlvbiBhbGxSZXNvbHZlZChwcm9taXNlcykge1xuICAgIHJldHVybiB3aGVuKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICAgICAgcHJvbWlzZXMgPSBhcnJheV9tYXAocHJvbWlzZXMsIFEpO1xuICAgICAgICByZXR1cm4gd2hlbihhbGwoYXJyYXlfbWFwKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuIHdoZW4ocHJvbWlzZSwgbm9vcCwgbm9vcCk7XG4gICAgICAgIH0pKSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb21pc2VzO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuYWxsUmVzb2x2ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGFsbFJlc29sdmVkKHRoaXMpO1xufTtcblxuLyoqXG4gKiBAc2VlIFByb21pc2UjYWxsU2V0dGxlZFxuICovXG5RLmFsbFNldHRsZWQgPSBhbGxTZXR0bGVkO1xuZnVuY3Rpb24gYWxsU2V0dGxlZChwcm9taXNlcykge1xuICAgIHJldHVybiBRKHByb21pc2VzKS5hbGxTZXR0bGVkKCk7XG59XG5cbi8qKlxuICogVHVybnMgYW4gYXJyYXkgb2YgcHJvbWlzZXMgaW50byBhIHByb21pc2UgZm9yIGFuIGFycmF5IG9mIHRoZWlyIHN0YXRlcyAoYXNcbiAqIHJldHVybmVkIGJ5IGBpbnNwZWN0YCkgd2hlbiB0aGV5IGhhdmUgYWxsIHNldHRsZWQuXG4gKiBAcGFyYW0ge0FycmF5W0FueSpdfSB2YWx1ZXMgYW4gYXJyYXkgKG9yIHByb21pc2UgZm9yIGFuIGFycmF5KSBvZiB2YWx1ZXMgKG9yXG4gKiBwcm9taXNlcyBmb3IgdmFsdWVzKVxuICogQHJldHVybnMge0FycmF5W1N0YXRlXX0gYW4gYXJyYXkgb2Ygc3RhdGVzIGZvciB0aGUgcmVzcGVjdGl2ZSB2YWx1ZXMuXG4gKi9cblByb21pc2UucHJvdG90eXBlLmFsbFNldHRsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICAgICAgcmV0dXJuIGFsbChhcnJheV9tYXAocHJvbWlzZXMsIGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgICAgICAgICBwcm9taXNlID0gUShwcm9taXNlKTtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlZ2FyZGxlc3MoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2UuaW5zcGVjdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbihyZWdhcmRsZXNzLCByZWdhcmRsZXNzKTtcbiAgICAgICAgfSkpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDYXB0dXJlcyB0aGUgZmFpbHVyZSBvZiBhIHByb21pc2UsIGdpdmluZyBhbiBvcG9ydHVuaXR5IHRvIHJlY292ZXJcbiAqIHdpdGggYSBjYWxsYmFjay4gIElmIHRoZSBnaXZlbiBwcm9taXNlIGlzIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkXG4gKiBwcm9taXNlIGlzIGZ1bGZpbGxlZC5cbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZSBmb3Igc29tZXRoaW5nXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayB0byBmdWxmaWxsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlmIHRoZVxuICogZ2l2ZW4gcHJvbWlzZSBpcyByZWplY3RlZFxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBjYWxsYmFja1xuICovXG5RLmZhaWwgPSAvLyBYWFggbGVnYWN5XG5RW1wiY2F0Y2hcIl0gPSBmdW5jdGlvbiAob2JqZWN0LCByZWplY3RlZCkge1xuICAgIHJldHVybiBRKG9iamVjdCkudGhlbih2b2lkIDAsIHJlamVjdGVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmZhaWwgPSAvLyBYWFggbGVnYWN5XG5Qcm9taXNlLnByb3RvdHlwZVtcImNhdGNoXCJdID0gZnVuY3Rpb24gKHJlamVjdGVkKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbih2b2lkIDAsIHJlamVjdGVkKTtcbn07XG5cbi8qKlxuICogQXR0YWNoZXMgYSBsaXN0ZW5lciB0aGF0IGNhbiByZXNwb25kIHRvIHByb2dyZXNzIG5vdGlmaWNhdGlvbnMgZnJvbSBhXG4gKiBwcm9taXNlJ3Mgb3JpZ2luYXRpbmcgZGVmZXJyZWQuIFRoaXMgbGlzdGVuZXIgcmVjZWl2ZXMgdGhlIGV4YWN0IGFyZ3VtZW50c1xuICogcGFzc2VkIHRvIGBgZGVmZXJyZWQubm90aWZ5YGAuXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2UgZm9yIHNvbWV0aGluZ1xuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgdG8gcmVjZWl2ZSBhbnkgcHJvZ3Jlc3Mgbm90aWZpY2F0aW9uc1xuICogQHJldHVybnMgdGhlIGdpdmVuIHByb21pc2UsIHVuY2hhbmdlZFxuICovXG5RLnByb2dyZXNzID0gcHJvZ3Jlc3M7XG5mdW5jdGlvbiBwcm9ncmVzcyhvYmplY3QsIHByb2dyZXNzZWQpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLnRoZW4odm9pZCAwLCB2b2lkIDAsIHByb2dyZXNzZWQpO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5wcm9ncmVzcyA9IGZ1bmN0aW9uIChwcm9ncmVzc2VkKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbih2b2lkIDAsIHZvaWQgMCwgcHJvZ3Jlc3NlZCk7XG59O1xuXG4vKipcbiAqIFByb3ZpZGVzIGFuIG9wcG9ydHVuaXR5IHRvIG9ic2VydmUgdGhlIHNldHRsaW5nIG9mIGEgcHJvbWlzZSxcbiAqIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciB0aGUgcHJvbWlzZSBpcyBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuICBGb3J3YXJkc1xuICogdGhlIHJlc29sdXRpb24gdG8gdGhlIHJldHVybmVkIHByb21pc2Ugd2hlbiB0aGUgY2FsbGJhY2sgaXMgZG9uZS5cbiAqIFRoZSBjYWxsYmFjayBjYW4gcmV0dXJuIGEgcHJvbWlzZSB0byBkZWZlciBjb21wbGV0aW9uLlxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayB0byBvYnNlcnZlIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlblxuICogcHJvbWlzZSwgdGFrZXMgbm8gYXJndW1lbnRzLlxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gcHJvbWlzZSB3aGVuXG4gKiBgYGZpbmBgIGlzIGRvbmUuXG4gKi9cblEuZmluID0gLy8gWFhYIGxlZ2FjeVxuUVtcImZpbmFsbHlcIl0gPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgIHJldHVybiBRKG9iamVjdClbXCJmaW5hbGx5XCJdKGNhbGxiYWNrKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmZpbiA9IC8vIFhYWCBsZWdhY3lcblByb21pc2UucHJvdG90eXBlW1wiZmluYWxseVwiXSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gUShjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmZjYWxsKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gVE9ETyBhdHRlbXB0IHRvIHJlY3ljbGUgdGhlIHJlamVjdGlvbiB3aXRoIFwidGhpc1wiLlxuICAgICAgICByZXR1cm4gY2FsbGJhY2suZmNhbGwoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRocm93IHJlYXNvbjtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFRlcm1pbmF0ZXMgYSBjaGFpbiBvZiBwcm9taXNlcywgZm9yY2luZyByZWplY3Rpb25zIHRvIGJlXG4gKiB0aHJvd24gYXMgZXhjZXB0aW9ucy5cbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZSBhdCB0aGUgZW5kIG9mIGEgY2hhaW4gb2YgcHJvbWlzZXNcbiAqIEByZXR1cm5zIG5vdGhpbmdcbiAqL1xuUS5kb25lID0gZnVuY3Rpb24gKG9iamVjdCwgZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpIHtcbiAgICByZXR1cm4gUShvYmplY3QpLmRvbmUoZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykge1xuICAgIHZhciBvblVuaGFuZGxlZEVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIC8vIGZvcndhcmQgdG8gYSBmdXR1cmUgdHVybiBzbyB0aGF0IGBgd2hlbmBgXG4gICAgICAgIC8vIGRvZXMgbm90IGNhdGNoIGl0IGFuZCB0dXJuIGl0IGludG8gYSByZWplY3Rpb24uXG4gICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbWFrZVN0YWNrVHJhY2VMb25nKGVycm9yLCBwcm9taXNlKTtcbiAgICAgICAgICAgIGlmIChRLm9uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBRLm9uZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIEF2b2lkIHVubmVjZXNzYXJ5IGBuZXh0VGlja2BpbmcgdmlhIGFuIHVubmVjZXNzYXJ5IGB3aGVuYC5cbiAgICB2YXIgcHJvbWlzZSA9IGZ1bGZpbGxlZCB8fCByZWplY3RlZCB8fCBwcm9ncmVzcyA/XG4gICAgICAgIHRoaXMudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykgOlxuICAgICAgICB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmIHByb2Nlc3MgJiYgcHJvY2Vzcy5kb21haW4pIHtcbiAgICAgICAgb25VbmhhbmRsZWRFcnJvciA9IHByb2Nlc3MuZG9tYWluLmJpbmQob25VbmhhbmRsZWRFcnJvcik7XG4gICAgfVxuXG4gICAgcHJvbWlzZS50aGVuKHZvaWQgMCwgb25VbmhhbmRsZWRFcnJvcik7XG59O1xuXG4vKipcbiAqIENhdXNlcyBhIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQgaWYgaXQgZG9lcyBub3QgZ2V0IGZ1bGZpbGxlZCBiZWZvcmVcbiAqIHNvbWUgbWlsbGlzZWNvbmRzIHRpbWUgb3V0LlxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlXG4gKiBAcGFyYW0ge051bWJlcn0gbWlsbGlzZWNvbmRzIHRpbWVvdXRcbiAqIEBwYXJhbSB7QW55Kn0gY3VzdG9tIGVycm9yIG1lc3NhZ2Ugb3IgRXJyb3Igb2JqZWN0IChvcHRpb25hbClcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2UgaWYgaXQgaXNcbiAqIGZ1bGZpbGxlZCBiZWZvcmUgdGhlIHRpbWVvdXQsIG90aGVyd2lzZSByZWplY3RlZC5cbiAqL1xuUS50aW1lb3V0ID0gZnVuY3Rpb24gKG9iamVjdCwgbXMsIGVycm9yKSB7XG4gICAgcmV0dXJuIFEob2JqZWN0KS50aW1lb3V0KG1zLCBlcnJvcik7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aW1lb3V0ID0gZnVuY3Rpb24gKG1zLCBlcnJvcikge1xuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgdmFyIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIWVycm9yIHx8IFwic3RyaW5nXCIgPT09IHR5cGVvZiBlcnJvcikge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoZXJyb3IgfHwgXCJUaW1lZCBvdXQgYWZ0ZXIgXCIgKyBtcyArIFwiIG1zXCIpO1xuICAgICAgICAgICAgZXJyb3IuY29kZSA9IFwiRVRJTUVET1VUXCI7XG4gICAgICAgIH1cbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcbiAgICB9LCBtcyk7XG5cbiAgICB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHZhbHVlKTtcbiAgICB9LCBmdW5jdGlvbiAoZXhjZXB0aW9uKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXhjZXB0aW9uKTtcbiAgICB9LCBkZWZlcnJlZC5ub3RpZnkpO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgZ2l2ZW4gdmFsdWUgKG9yIHByb21pc2VkIHZhbHVlKSwgc29tZVxuICogbWlsbGlzZWNvbmRzIGFmdGVyIGl0IHJlc29sdmVkLiBQYXNzZXMgcmVqZWN0aW9ucyBpbW1lZGlhdGVseS5cbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZVxuICogQHBhcmFtIHtOdW1iZXJ9IG1pbGxpc2Vjb25kc1xuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gcHJvbWlzZSBhZnRlciBtaWxsaXNlY29uZHNcbiAqIHRpbWUgaGFzIGVsYXBzZWQgc2luY2UgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2UuXG4gKiBJZiB0aGUgZ2l2ZW4gcHJvbWlzZSByZWplY3RzLCB0aGF0IGlzIHBhc3NlZCBpbW1lZGlhdGVseS5cbiAqL1xuUS5kZWxheSA9IGZ1bmN0aW9uIChvYmplY3QsIHRpbWVvdXQpIHtcbiAgICBpZiAodGltZW91dCA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHRpbWVvdXQgPSBvYmplY3Q7XG4gICAgICAgIG9iamVjdCA9IHZvaWQgMDtcbiAgICB9XG4gICAgcmV0dXJuIFEob2JqZWN0KS5kZWxheSh0aW1lb3V0KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24gKHRpbWVvdXQpIHtcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUodmFsdWUpO1xuICAgICAgICB9LCB0aW1lb3V0KTtcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFBhc3NlcyBhIGNvbnRpbnVhdGlvbiB0byBhIE5vZGUgZnVuY3Rpb24sIHdoaWNoIGlzIGNhbGxlZCB3aXRoIHRoZSBnaXZlblxuICogYXJndW1lbnRzIHByb3ZpZGVkIGFzIGFuIGFycmF5LCBhbmQgcmV0dXJucyBhIHByb21pc2UuXG4gKlxuICogICAgICBRLm5mYXBwbHkoRlMucmVhZEZpbGUsIFtfX2ZpbGVuYW1lXSlcbiAqICAgICAgLnRoZW4oZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAqICAgICAgfSlcbiAqXG4gKi9cblEubmZhcHBseSA9IGZ1bmN0aW9uIChjYWxsYmFjaywgYXJncykge1xuICAgIHJldHVybiBRKGNhbGxiYWNrKS5uZmFwcGx5KGFyZ3MpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubmZhcHBseSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmdzKTtcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgdGhpcy5mYXBwbHkobm9kZUFyZ3MpLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbn07XG5cbi8qKlxuICogUGFzc2VzIGEgY29udGludWF0aW9uIHRvIGEgTm9kZSBmdW5jdGlvbiwgd2hpY2ggaXMgY2FsbGVkIHdpdGggdGhlIGdpdmVuXG4gKiBhcmd1bWVudHMgcHJvdmlkZWQgaW5kaXZpZHVhbGx5LCBhbmQgcmV0dXJucyBhIHByb21pc2UuXG4gKiBAZXhhbXBsZVxuICogUS5uZmNhbGwoRlMucmVhZEZpbGUsIF9fZmlsZW5hbWUpXG4gKiAudGhlbihmdW5jdGlvbiAoY29udGVudCkge1xuICogfSlcbiAqXG4gKi9cblEubmZjYWxsID0gZnVuY3Rpb24gKGNhbGxiYWNrIC8qLi4uYXJncyovKSB7XG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBRKGNhbGxiYWNrKS5uZmFwcGx5KGFyZ3MpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubmZjYWxsID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcbiAgICB0aGlzLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufTtcblxuLyoqXG4gKiBXcmFwcyBhIE5vZGVKUyBjb250aW51YXRpb24gcGFzc2luZyBmdW5jdGlvbiBhbmQgcmV0dXJucyBhbiBlcXVpdmFsZW50XG4gKiB2ZXJzaW9uIHRoYXQgcmV0dXJucyBhIHByb21pc2UuXG4gKiBAZXhhbXBsZVxuICogUS5uZmJpbmQoRlMucmVhZEZpbGUsIF9fZmlsZW5hbWUpKFwidXRmLThcIilcbiAqIC50aGVuKGNvbnNvbGUubG9nKVxuICogLmRvbmUoKVxuICovXG5RLm5mYmluZCA9XG5RLmRlbm9kZWlmeSA9IGZ1bmN0aW9uIChjYWxsYmFjayAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBiYXNlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGVBcmdzID0gYmFzZUFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpO1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgICAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgICAgIFEoY2FsbGJhY2spLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubmZiaW5kID1cblByb21pc2UucHJvdG90eXBlLmRlbm9kZWlmeSA9IGZ1bmN0aW9uICgvKi4uLmFyZ3MqLykge1xuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcbiAgICBhcmdzLnVuc2hpZnQodGhpcyk7XG4gICAgcmV0dXJuIFEuZGVub2RlaWZ5LmFwcGx5KHZvaWQgMCwgYXJncyk7XG59O1xuXG5RLm5iaW5kID0gZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzcCAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBiYXNlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGVBcmdzID0gYmFzZUFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpO1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgICAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgICAgIGZ1bmN0aW9uIGJvdW5kKCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KHRoaXNwLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgICAgIFEoYm91bmQpLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUubmJpbmQgPSBmdW5jdGlvbiAoLyp0aGlzcCwgLi4uYXJncyovKSB7XG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDApO1xuICAgIGFyZ3MudW5zaGlmdCh0aGlzKTtcbiAgICByZXR1cm4gUS5uYmluZC5hcHBseSh2b2lkIDAsIGFyZ3MpO1xufTtcblxuLyoqXG4gKiBDYWxscyBhIG1ldGhvZCBvZiBhIE5vZGUtc3R5bGUgb2JqZWN0IHRoYXQgYWNjZXB0cyBhIE5vZGUtc3R5bGVcbiAqIGNhbGxiYWNrIHdpdGggYSBnaXZlbiBhcnJheSBvZiBhcmd1bWVudHMsIHBsdXMgYSBwcm92aWRlZCBjYWxsYmFjay5cbiAqIEBwYXJhbSBvYmplY3QgYW4gb2JqZWN0IHRoYXQgaGFzIHRoZSBuYW1lZCBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIG1ldGhvZCBvZiBvYmplY3RcbiAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZDsgdGhlIGNhbGxiYWNrXG4gKiB3aWxsIGJlIHByb3ZpZGVkIGJ5IFEgYW5kIGFwcGVuZGVkIHRvIHRoZXNlIGFyZ3VtZW50cy5cbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHZhbHVlIG9yIGVycm9yXG4gKi9cblEubm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXG5RLm5wb3N0ID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSwgYXJncykge1xuICAgIHJldHVybiBRKG9iamVjdCkubnBvc3QobmFtZSwgYXJncyk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5ubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcblByb21pc2UucHJvdG90eXBlLm5wb3N0ID0gZnVuY3Rpb24gKG5hbWUsIGFyZ3MpIHtcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmdzIHx8IFtdKTtcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcbiAgICB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgbm9kZUFyZ3NdKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG4vKipcbiAqIENhbGxzIGEgbWV0aG9kIG9mIGEgTm9kZS1zdHlsZSBvYmplY3QgdGhhdCBhY2NlcHRzIGEgTm9kZS1zdHlsZVxuICogY2FsbGJhY2ssIGZvcndhcmRpbmcgdGhlIGdpdmVuIHZhcmlhZGljIGFyZ3VtZW50cywgcGx1cyBhIHByb3ZpZGVkXG4gKiBjYWxsYmFjayBhcmd1bWVudC5cbiAqIEBwYXJhbSBvYmplY3QgYW4gb2JqZWN0IHRoYXQgaGFzIHRoZSBuYW1lZCBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIG1ldGhvZCBvZiBvYmplY3RcbiAqIEBwYXJhbSAuLi5hcmdzIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBtZXRob2Q7IHRoZSBjYWxsYmFjayB3aWxsXG4gKiBiZSBwcm92aWRlZCBieSBRIGFuZCBhcHBlbmRlZCB0byB0aGVzZSBhcmd1bWVudHMuXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSB2YWx1ZSBvciBlcnJvclxuICovXG5RLm5zZW5kID0gLy8gWFhYIEJhc2VkIG9uIE1hcmsgTWlsbGVyJ3MgcHJvcG9zZWQgXCJzZW5kXCJcblEubm1jYWxsID0gLy8gWFhYIEJhc2VkIG9uIFwiUmVkc2FuZHJvJ3NcIiBwcm9wb3NhbFxuUS5uaW52b2tlID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSAvKi4uLmFyZ3MqLykge1xuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XG4gICAgUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgbm9kZUFyZ3NdKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5uc2VuZCA9IC8vIFhYWCBCYXNlZCBvbiBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIFwic2VuZFwiXG5Qcm9taXNlLnByb3RvdHlwZS5ubWNhbGwgPSAvLyBYWFggQmFzZWQgb24gXCJSZWRzYW5kcm8nc1wiIHByb3Bvc2FsXG5Qcm9taXNlLnByb3RvdHlwZS5uaW52b2tlID0gZnVuY3Rpb24gKG5hbWUgLyouLi5hcmdzKi8pIHtcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xuICAgIHRoaXMuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBub2RlQXJnc10pLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbn07XG5cbi8qKlxuICogSWYgYSBmdW5jdGlvbiB3b3VsZCBsaWtlIHRvIHN1cHBvcnQgYm90aCBOb2RlIGNvbnRpbnVhdGlvbi1wYXNzaW5nLXN0eWxlIGFuZFxuICogcHJvbWlzZS1yZXR1cm5pbmctc3R5bGUsIGl0IGNhbiBlbmQgaXRzIGludGVybmFsIHByb21pc2UgY2hhaW4gd2l0aFxuICogYG5vZGVpZnkobm9kZWJhY2spYCwgZm9yd2FyZGluZyB0aGUgb3B0aW9uYWwgbm9kZWJhY2sgYXJndW1lbnQuICBJZiB0aGUgdXNlclxuICogZWxlY3RzIHRvIHVzZSBhIG5vZGViYWNrLCB0aGUgcmVzdWx0IHdpbGwgYmUgc2VudCB0aGVyZS4gIElmIHRoZXkgZG8gbm90XG4gKiBwYXNzIGEgbm9kZWJhY2ssIHRoZXkgd2lsbCByZWNlaXZlIHRoZSByZXN1bHQgcHJvbWlzZS5cbiAqIEBwYXJhbSBvYmplY3QgYSByZXN1bHQgKG9yIGEgcHJvbWlzZSBmb3IgYSByZXN1bHQpXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBub2RlYmFjayBhIE5vZGUuanMtc3R5bGUgY2FsbGJhY2tcbiAqIEByZXR1cm5zIGVpdGhlciB0aGUgcHJvbWlzZSBvciBub3RoaW5nXG4gKi9cblEubm9kZWlmeSA9IG5vZGVpZnk7XG5mdW5jdGlvbiBub2RlaWZ5KG9iamVjdCwgbm9kZWJhY2spIHtcbiAgICByZXR1cm4gUShvYmplY3QpLm5vZGVpZnkobm9kZWJhY2spO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5ub2RlaWZ5ID0gZnVuY3Rpb24gKG5vZGViYWNrKSB7XG4gICAgaWYgKG5vZGViYWNrKSB7XG4gICAgICAgIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG5vZGViYWNrKG51bGwsIHZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIFEubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG5vZGViYWNrKGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59O1xuXG5RLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJRLm5vQ29uZmxpY3Qgb25seSB3b3JrcyB3aGVuIFEgaXMgdXNlZCBhcyBhIGdsb2JhbFwiKTtcbn07XG5cbi8vIEFsbCBjb2RlIGJlZm9yZSB0aGlzIHBvaW50IHdpbGwgYmUgZmlsdGVyZWQgZnJvbSBzdGFjayB0cmFjZXMuXG52YXIgcUVuZGluZ0xpbmUgPSBjYXB0dXJlTGluZSgpO1xuXG5yZXR1cm4gUTtcblxufSk7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OXhMM0V1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWp0QlFVRkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFTSXNJbVpwYkdVaU9pSm5aVzVsY21GMFpXUXVhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpTHk4Z2RtbHRPblJ6UFRRNmMzUnpQVFE2YzNjOU5EcGNiaThxSVZ4dUlDcGNiaUFxSUVOdmNIbHlhV2RvZENBeU1EQTVMVEl3TVRJZ1MzSnBjeUJMYjNkaGJDQjFibVJsY2lCMGFHVWdkR1Z5YlhNZ2IyWWdkR2hsSUUxSlZGeHVJQ29nYkdsalpXNXpaU0JtYjNWdVpDQmhkQ0JvZEhSd09pOHZaMmwwYUhWaUxtTnZiUzlyY21semEyOTNZV3d2Y1M5eVlYY3ZiV0Z6ZEdWeUwweEpRMFZPVTBWY2JpQXFYRzRnS2lCWGFYUm9JSEJoY25SeklHSjVJRlI1YkdWeUlFTnNiM05sWEc0Z0tpQkRiM0I1Y21sbmFIUWdNakF3TnkweU1EQTVJRlI1YkdWeUlFTnNiM05sSUhWdVpHVnlJSFJvWlNCMFpYSnRjeUJ2WmlCMGFHVWdUVWxVSUZnZ2JHbGpaVzV6WlNCbWIzVnVaRnh1SUNvZ1lYUWdhSFIwY0RvdkwzZDNkeTV2Y0dWdWMyOTFjbU5sTG05eVp5OXNhV05sYm5ObGN5OXRhWFF0YkdsalpXNXpaUzVvZEcxc1hHNGdLaUJHYjNKclpXUWdZWFFnY21WbVgzTmxibVF1YW5NZ2RtVnljMmx2YmpvZ01qQXdPUzB3TlMweE1WeHVJQ3BjYmlBcUlGZHBkR2dnY0dGeWRITWdZbmtnVFdGeWF5Qk5hV3hzWlhKY2JpQXFJRU52Y0hseWFXZG9kQ0FvUXlrZ01qQXhNU0JIYjI5bmJHVWdTVzVqTGx4dUlDcGNiaUFxSUV4cFkyVnVjMlZrSUhWdVpHVnlJSFJvWlNCQmNHRmphR1VnVEdsalpXNXpaU3dnVm1WeWMybHZiaUF5TGpBZ0tIUm9aU0JjSWt4cFkyVnVjMlZjSWlrN1hHNGdLaUI1YjNVZ2JXRjVJRzV2ZENCMWMyVWdkR2hwY3lCbWFXeGxJR1Y0WTJWd2RDQnBiaUJqYjIxd2JHbGhibU5sSUhkcGRHZ2dkR2hsSUV4cFkyVnVjMlV1WEc0Z0tpQlpiM1VnYldGNUlHOWlkR0ZwYmlCaElHTnZjSGtnYjJZZ2RHaGxJRXhwWTJWdWMyVWdZWFJjYmlBcVhHNGdLaUJvZEhSd09pOHZkM2QzTG1Gd1lXTm9aUzV2Y21jdmJHbGpaVzV6WlhNdlRFbERSVTVUUlMweUxqQmNiaUFxWEc0Z0tpQlZibXhsYzNNZ2NtVnhkV2x5WldRZ1lua2dZWEJ3YkdsallXSnNaU0JzWVhjZ2IzSWdZV2R5WldWa0lIUnZJR2x1SUhkeWFYUnBibWNzSUhOdlpuUjNZWEpsWEc0Z0tpQmthWE4wY21saWRYUmxaQ0IxYm1SbGNpQjBhR1VnVEdsalpXNXpaU0JwY3lCa2FYTjBjbWxpZFhSbFpDQnZiaUJoYmlCY0lrRlRJRWxUWENJZ1FrRlRTVk1zWEc0Z0tpQlhTVlJJVDFWVUlGZEJVbEpCVGxSSlJWTWdUMUlnUTA5T1JFbFVTVTlPVXlCUFJpQkJUbGtnUzBsT1JDd2daV2wwYUdWeUlHVjRjSEpsYzNNZ2IzSWdhVzF3YkdsbFpDNWNiaUFxSUZObFpTQjBhR1VnVEdsalpXNXpaU0JtYjNJZ2RHaGxJSE53WldOcFptbGpJR3hoYm1kMVlXZGxJR2R2ZG1WeWJtbHVaeUJ3WlhKdGFYTnphVzl1Y3lCaGJtUmNiaUFxSUd4cGJXbDBZWFJwYjI1eklIVnVaR1Z5SUhSb1pTQk1hV05sYm5ObExseHVJQ3BjYmlBcUwxeHVYRzRvWm5WdVkzUnBiMjRnS0dSbFptbHVhWFJwYjI0cElIdGNiaUFnSUNCY0luVnpaU0J6ZEhKcFkzUmNJanRjYmx4dUlDQWdJQzh2SUZSb2FYTWdabWxzWlNCM2FXeHNJR1oxYm1OMGFXOXVJSEJ5YjNCbGNteDVJR0Z6SUdFZ1BITmpjbWx3ZEQ0Z2RHRm5MQ0J2Y2lCaElHMXZaSFZzWlZ4dUlDQWdJQzh2SUhWemFXNW5JRU52YlcxdmJrcFRJR0Z1WkNCT2IyUmxTbE1nYjNJZ1VtVnhkV2x5WlVwVElHMXZaSFZzWlNCbWIzSnRZWFJ6TGlBZ1NXNWNiaUFnSUNBdkx5QkRiMjF0YjI0dlRtOWtaUzlTWlhGMWFYSmxTbE1zSUhSb1pTQnRiMlIxYkdVZ1pYaHdiM0owY3lCMGFHVWdVU0JCVUVrZ1lXNWtJSGRvWlc1Y2JpQWdJQ0F2THlCbGVHVmpkWFJsWkNCaGN5QmhJSE5wYlhCc1pTQThjMk55YVhCMFBpd2dhWFFnWTNKbFlYUmxjeUJoSUZFZ1oyeHZZbUZzSUdsdWMzUmxZV1F1WEc1Y2JpQWdJQ0F2THlCTmIyNTBZV2RsSUZKbGNYVnBjbVZjYmlBZ0lDQnBaaUFvZEhsd1pXOW1JR0p2YjNSemRISmhjQ0E5UFQwZ1hDSm1kVzVqZEdsdmJsd2lLU0I3WEc0Z0lDQWdJQ0FnSUdKdmIzUnpkSEpoY0NoY0luQnliMjFwYzJWY0lpd2daR1ZtYVc1cGRHbHZiaWs3WEc1Y2JpQWdJQ0F2THlCRGIyMXRiMjVLVTF4dUlDQWdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JR1Y0Y0c5eWRITWdQVDA5SUZ3aWIySnFaV04wWENJZ0ppWWdkSGx3Wlc5bUlHMXZaSFZzWlNBOVBUMGdYQ0p2WW1wbFkzUmNJaWtnZTF4dUlDQWdJQ0FnSUNCdGIyUjFiR1V1Wlhod2IzSjBjeUE5SUdSbFptbHVhWFJwYjI0b0tUdGNibHh1SUNBZ0lDOHZJRkpsY1hWcGNtVktVMXh1SUNBZ0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlHUmxabWx1WlNBOVBUMGdYQ0ptZFc1amRHbHZibHdpSUNZbUlHUmxabWx1WlM1aGJXUXBJSHRjYmlBZ0lDQWdJQ0FnWkdWbWFXNWxLR1JsWm1sdWFYUnBiMjRwTzF4dVhHNGdJQ0FnTHk4Z1UwVlRJQ2hUWldOMWNtVWdSV050WVZOamNtbHdkQ2xjYmlBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFI1Y0dWdlppQnpaWE1nSVQwOUlGd2lkVzVrWldacGJtVmtYQ0lwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLQ0Z6WlhNdWIyc29LU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJWekxtMWhhMlZSSUQwZ1pHVm1hVzVwZEdsdmJqdGNiaUFnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdMeThnUEhOamNtbHdkRDVjYmlBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFI1Y0dWdlppQjNhVzVrYjNjZ0lUMDlJRndpZFc1a1pXWnBibVZrWENJZ2ZId2dkSGx3Wlc5bUlITmxiR1lnSVQwOUlGd2lkVzVrWldacGJtVmtYQ0lwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdVSEpsWm1WeUlIZHBibVJ2ZHlCdmRtVnlJSE5sYkdZZ1ptOXlJR0ZrWkMxdmJpQnpZM0pwY0hSekxpQlZjMlVnYzJWc1ppQm1iM0pjYmlBZ0lDQWdJQ0FnTHk4Z2JtOXVMWGRwYm1SdmQyVmtJR052Ym5SbGVIUnpMbHh1SUNBZ0lDQWdJQ0IyWVhJZ1oyeHZZbUZzSUQwZ2RIbHdaVzltSUhkcGJtUnZkeUFoUFQwZ1hDSjFibVJsWm1sdVpXUmNJaUEvSUhkcGJtUnZkeUE2SUhObGJHWTdYRzVjYmlBZ0lDQWdJQ0FnTHk4Z1IyVjBJSFJvWlNCZ2QybHVaRzkzWUNCdlltcGxZM1FzSUhOaGRtVWdkR2hsSUhCeVpYWnBiM1Z6SUZFZ1oyeHZZbUZzWEc0Z0lDQWdJQ0FnSUM4dklHRnVaQ0JwYm1sMGFXRnNhWHBsSUZFZ1lYTWdZU0JuYkc5aVlXd3VYRzRnSUNBZ0lDQWdJSFpoY2lCd2NtVjJhVzkxYzFFZ1BTQm5iRzlpWVd3dVVUdGNiaUFnSUNBZ0lDQWdaMnh2WW1Gc0xsRWdQU0JrWldacGJtbDBhVzl1S0NrN1hHNWNiaUFnSUNBZ0lDQWdMeThnUVdSa0lHRWdibTlEYjI1bWJHbGpkQ0JtZFc1amRHbHZiaUJ6YnlCUklHTmhiaUJpWlNCeVpXMXZkbVZrSUdaeWIyMGdkR2hsWEc0Z0lDQWdJQ0FnSUM4dklHZHNiMkpoYkNCdVlXMWxjM0JoWTJVdVhHNGdJQ0FnSUNBZ0lHZHNiMkpoYkM1UkxtNXZRMjl1Wm14cFkzUWdQU0JtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JuYkc5aVlXd3VVU0E5SUhCeVpYWnBiM1Z6VVR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TzF4dUlDQWdJQ0FnSUNCOU8xeHVYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0Z3aVZHaHBjeUJsYm5acGNtOXViV1Z1ZENCM1lYTWdibTkwSUdGdWRHbGphWEJoZEdWa0lHSjVJRkV1SUZCc1pXRnpaU0JtYVd4bElHRWdZblZuTGx3aUtUdGNiaUFnSUNCOVhHNWNibjBwS0daMWJtTjBhVzl1SUNncElIdGNibHdpZFhObElITjBjbWxqZEZ3aU8xeHVYRzUyWVhJZ2FHRnpVM1JoWTJ0eklEMGdabUZzYzJVN1hHNTBjbmtnZTF4dUlDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ3BPMXh1ZlNCallYUmphQ0FvWlNrZ2UxeHVJQ0FnSUdoaGMxTjBZV05yY3lBOUlDRWhaUzV6ZEdGamF6dGNibjFjYmx4dUx5OGdRV3hzSUdOdlpHVWdZV1owWlhJZ2RHaHBjeUJ3YjJsdWRDQjNhV3hzSUdKbElHWnBiSFJsY21Wa0lHWnliMjBnYzNSaFkyc2dkSEpoWTJWeklISmxjRzl5ZEdWa1hHNHZMeUJpZVNCUkxseHVkbUZ5SUhGVGRHRnlkR2x1WjB4cGJtVWdQU0JqWVhCMGRYSmxUR2x1WlNncE8xeHVkbUZ5SUhGR2FXeGxUbUZ0WlR0Y2JseHVMeThnYzJocGJYTmNibHh1THk4Z2RYTmxaQ0JtYjNJZ1ptRnNiR0poWTJzZ2FXNGdYQ0poYkd4U1pYTnZiSFpsWkZ3aVhHNTJZWElnYm05dmNDQTlJR1oxYm1OMGFXOXVJQ2dwSUh0OU8xeHVYRzR2THlCVmMyVWdkR2hsSUdaaGMzUmxjM1FnY0c5emMybGliR1VnYldWaGJuTWdkRzhnWlhobFkzVjBaU0JoSUhSaGMyc2dhVzRnWVNCbWRYUjFjbVVnZEhWeWJseHVMeThnYjJZZ2RHaGxJR1YyWlc1MElHeHZiM0F1WEc1MllYSWdibVY0ZEZScFkyc2dQU2htZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnTHk4Z2JHbHVhMlZrSUd4cGMzUWdiMllnZEdGemEzTWdLSE5wYm1kc1pTd2dkMmwwYUNCb1pXRmtJRzV2WkdVcFhHNGdJQ0FnZG1GeUlHaGxZV1FnUFNCN2RHRnphem9nZG05cFpDQXdMQ0J1WlhoME9pQnVkV3hzZlR0Y2JpQWdJQ0IyWVhJZ2RHRnBiQ0E5SUdobFlXUTdYRzRnSUNBZ2RtRnlJR1pzZFhOb2FXNW5JRDBnWm1Gc2MyVTdYRzRnSUNBZ2RtRnlJSEpsY1hWbGMzUlVhV05ySUQwZ2RtOXBaQ0F3TzF4dUlDQWdJSFpoY2lCcGMwNXZaR1ZLVXlBOUlHWmhiSE5sTzF4dUlDQWdJQzh2SUhGMVpYVmxJR1p2Y2lCc1lYUmxJSFJoYzJ0ekxDQjFjMlZrSUdKNUlIVnVhR0Z1Wkd4bFpDQnlaV3BsWTNScGIyNGdkSEpoWTJ0cGJtZGNiaUFnSUNCMllYSWdiR0YwWlhKUmRXVjFaU0E5SUZ0ZE8xeHVYRzRnSUNBZ1puVnVZM1JwYjI0Z1pteDFjMmdvS1NCN1hHNGdJQ0FnSUNBZ0lDOHFJR3B6YUdsdWRDQnNiMjl3Wm5WdVl6b2dkSEoxWlNBcUwxeHVJQ0FnSUNBZ0lDQjJZWElnZEdGemF5d2daRzl0WVdsdU8xeHVYRzRnSUNBZ0lDQWdJSGRvYVd4bElDaG9aV0ZrTG01bGVIUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHaGxZV1FnUFNCb1pXRmtMbTVsZUhRN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwWVhOcklEMGdhR1ZoWkM1MFlYTnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FHVmhaQzUwWVhOcklEMGdkbTlwWkNBd08xeHVJQ0FnSUNBZ0lDQWdJQ0FnWkc5dFlXbHVJRDBnYUdWaFpDNWtiMjFoYVc0N1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaGtiMjFoYVc0cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQm9aV0ZrTG1SdmJXRnBiaUE5SUhadmFXUWdNRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JrYjIxaGFXNHVaVzUwWlhJb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJSEoxYmxOcGJtZHNaU2gwWVhOckxDQmtiMjFoYVc0cE8xeHVYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZDJocGJHVWdLR3hoZEdWeVVYVmxkV1V1YkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBZWE5ySUQwZ2JHRjBaWEpSZFdWMVpTNXdiM0FvS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEoxYmxOcGJtZHNaU2gwWVhOcktUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0JtYkhWemFHbHVaeUE5SUdaaGJITmxPMXh1SUNBZ0lIMWNiaUFnSUNBdkx5QnlkVzV6SUdFZ2MybHVaMnhsSUdaMWJtTjBhVzl1SUdsdUlIUm9aU0JoYzNsdVl5QnhkV1YxWlZ4dUlDQWdJR1oxYm1OMGFXOXVJSEoxYmxOcGJtZHNaU2gwWVhOckxDQmtiMjFoYVc0cElIdGNiaUFnSUNBZ0lDQWdkSEo1SUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJoYzJzb0tUdGNibHh1SUNBZ0lDQWdJQ0I5SUdOaGRHTm9JQ2hsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2FYTk9iMlJsU2xNcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQXZMeUJKYmlCdWIyUmxMQ0IxYm1OaGRXZG9kQ0JsZUdObGNIUnBiMjV6SUdGeVpTQmpiMjV6YVdSbGNtVmtJR1poZEdGc0lHVnljbTl5Y3k1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBdkx5QlNaUzEwYUhKdmR5QjBhR1Z0SUhONWJtTm9jbTl1YjNWemJIa2dkRzhnYVc1MFpYSnlkWEIwSUdac2RYTm9hVzVuSVZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0x5OGdSVzV6ZFhKbElHTnZiblJwYm5WaGRHbHZiaUJwWmlCMGFHVWdkVzVqWVhWbmFIUWdaWGhqWlhCMGFXOXVJR2x6SUhOMWNIQnlaWE56WldSY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBdkx5QnNhWE4wWlc1cGJtY2dYQ0oxYm1OaGRXZG9kRVY0WTJWd2RHbHZibHdpSUdWMlpXNTBjeUFvWVhNZ1pHOXRZV2x1Y3lCa2IyVnpLUzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0F2THlCRGIyNTBhVzUxWlNCcGJpQnVaWGgwSUdWMlpXNTBJSFJ2SUdGMmIybGtJSFJwWTJzZ2NtVmpkWEp6YVc5dUxseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2hrYjIxaGFXNHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pHOXRZV2x1TG1WNGFYUW9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWMFZHbHRaVzkxZENobWJIVnphQ3dnTUNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR1J2YldGcGJpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCa2IyMWhhVzR1Wlc1MFpYSW9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFISnZkeUJsTzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQzh2SUVsdUlHSnliM2R6WlhKekxDQjFibU5oZFdkb2RDQmxlR05sY0hScGIyNXpJR0Z5WlNCdWIzUWdabUYwWVd3dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0x5OGdVbVV0ZEdoeWIzY2dkR2hsYlNCaGMzbHVZMmh5YjI1dmRYTnNlU0IwYnlCaGRtOXBaQ0J6Ykc5M0xXUnZkMjV6TGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRGUnBiV1Z2ZFhRb1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFISnZkeUJsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwc0lEQXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnYVdZZ0tHUnZiV0ZwYmlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWkc5dFlXbHVMbVY0YVhRb0tUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lHNWxlSFJVYVdOcklEMGdablZ1WTNScGIyNGdLSFJoYzJzcElIdGNiaUFnSUNBZ0lDQWdkR0ZwYkNBOUlIUmhhV3d1Ym1WNGRDQTlJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIUmhjMnM2SUhSaGMyc3NYRzRnSUNBZ0lDQWdJQ0FnSUNCa2IyMWhhVzQ2SUdselRtOWtaVXBUSUNZbUlIQnliMk5sYzNNdVpHOXRZV2x1TEZ4dUlDQWdJQ0FnSUNBZ0lDQWdibVY0ZERvZ2JuVnNiRnh1SUNBZ0lDQWdJQ0I5TzF4dVhHNGdJQ0FnSUNBZ0lHbG1JQ2doWm14MWMyaHBibWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1pzZFhOb2FXNW5JRDBnZEhKMVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGNYVmxjM1JVYVdOcktDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdhV1lnS0hSNWNHVnZaaUJ3Y205alpYTnpJRDA5UFNCY0ltOWlhbVZqZEZ3aUlDWW1YRzRnSUNBZ0lDQWdJSEJ5YjJObGMzTXVkRzlUZEhKcGJtY29LU0E5UFQwZ1hDSmJiMkpxWldOMElIQnliMk5sYzNOZFhDSWdKaVlnY0hKdlkyVnpjeTV1WlhoMFZHbGpheWtnZTF4dUlDQWdJQ0FnSUNBdkx5QkZibk4xY21VZ1VTQnBjeUJwYmlCaElISmxZV3dnVG05a1pTQmxiblpwY205dWJXVnVkQ3dnZDJsMGFDQmhJR0J3Y205alpYTnpMbTVsZUhSVWFXTnJZQzVjYmlBZ0lDQWdJQ0FnTHk4Z1ZHOGdjMlZsSUhSb2NtOTFaMmdnWm1GclpTQk9iMlJsSUdWdWRtbHliMjV0Wlc1MGN6cGNiaUFnSUNBZ0lDQWdMeThnS2lCTmIyTm9ZU0IwWlhOMElISjFibTVsY2lBdElHVjRjRzl6WlhNZ1lTQmdjSEp2WTJWemMyQWdaMnh2WW1Gc0lIZHBkR2h2ZFhRZ1lTQmdibVY0ZEZScFkydGdYRzRnSUNBZ0lDQWdJQzh2SUNvZ1FuSnZkM05sY21sbWVTQXRJR1Y0Y0c5elpYTWdZU0JnY0hKdlkyVnpjeTV1WlhoVWFXTnJZQ0JtZFc1amRHbHZiaUIwYUdGMElIVnpaWE5jYmlBZ0lDQWdJQ0FnTHk4Z0lDQmdjMlYwVkdsdFpXOTFkR0F1SUVsdUlIUm9hWE1nWTJGelpTQmdjMlYwU1cxdFpXUnBZWFJsWUNCcGN5QndjbVZtWlhKeVpXUWdZbVZqWVhWelpWeHVJQ0FnSUNBZ0lDQXZMeUFnSUNCcGRDQnBjeUJtWVhOMFpYSXVJRUp5YjNkelpYSnBabmtuY3lCZ2NISnZZMlZ6Y3k1MGIxTjBjbWx1WnlncFlDQjVhV1ZzWkhOY2JpQWdJQ0FnSUNBZ0x5OGdJQ0JjSWx0dlltcGxZM1FnVDJKcVpXTjBYVndpTENCM2FHbHNaU0JwYmlCaElISmxZV3dnVG05a1pTQmxiblpwY205dWJXVnVkRnh1SUNBZ0lDQWdJQ0F2THlBZ0lHQndjbTlqWlhOekxtNWxlSFJVYVdOcktDbGdJSGxwWld4a2N5QmNJbHR2WW1wbFkzUWdjSEp2WTJWemMxMWNJaTVjYmlBZ0lDQWdJQ0FnYVhOT2IyUmxTbE1nUFNCMGNuVmxPMXh1WEc0Z0lDQWdJQ0FnSUhKbGNYVmxjM1JVYVdOcklEMGdablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjSEp2WTJWemN5NXVaWGgwVkdsamF5aG1iSFZ6YUNrN1hHNGdJQ0FnSUNBZ0lIMDdYRzVjYmlBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFI1Y0dWdlppQnpaWFJKYlcxbFpHbGhkR1VnUFQwOUlGd2lablZ1WTNScGIyNWNJaWtnZTF4dUlDQWdJQ0FnSUNBdkx5QkpiaUJKUlRFd0xDQk9iMlJsTG1weklEQXVPU3NzSUc5eUlHaDBkSEJ6T2k4dloybDBhSFZpTG1OdmJTOU9iMkpzWlVwVEwzTmxkRWx0YldWa2FXRjBaVnh1SUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhkcGJtUnZkeUFoUFQwZ1hDSjFibVJsWm1sdVpXUmNJaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVZ4ZFdWemRGUnBZMnNnUFNCelpYUkpiVzFsWkdsaGRHVXVZbWx1WkNoM2FXNWtiM2NzSUdac2RYTm9LVHRjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxjWFZsYzNSVWFXTnJJRDBnWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmxkRWx0YldWa2FXRjBaU2htYkhWemFDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOU8xeHVJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFI1Y0dWdlppQk5aWE56WVdkbFEyaGhibTVsYkNBaFBUMGdYQ0oxYm1SbFptbHVaV1JjSWlrZ2UxeHVJQ0FnSUNBZ0lDQXZMeUJ0YjJSbGNtNGdZbkp2ZDNObGNuTmNiaUFnSUNBZ0lDQWdMeThnYUhSMGNEb3ZMM2QzZHk1dWIyNWliRzlqYTJsdVp5NXBieTh5TURFeEx6QTJMM2RwYm1SdmQyNWxlSFIwYVdOckxtaDBiV3hjYmlBZ0lDQWdJQ0FnZG1GeUlHTm9ZVzV1Wld3Z1BTQnVaWGNnVFdWemMyRm5aVU5vWVc1dVpXd29LVHRjYmlBZ0lDQWdJQ0FnTHk4Z1FYUWdiR1ZoYzNRZ1UyRm1ZWEpwSUZabGNuTnBiMjRnTmk0d0xqVWdLRGcxTXpZdU16QXVNU2tnYVc1MFpYSnRhWFIwWlc1MGJIa2dZMkZ1Ym05MElHTnlaV0YwWlZ4dUlDQWdJQ0FnSUNBdkx5QjNiM0pyYVc1bklHMWxjM05oWjJVZ2NHOXlkSE1nZEdobElHWnBjbk4wSUhScGJXVWdZU0J3WVdkbElHeHZZV1J6TGx4dUlDQWdJQ0FnSUNCamFHRnVibVZzTG5CdmNuUXhMbTl1YldWemMyRm5aU0E5SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGNYVmxjM1JVYVdOcklEMGdjbVZ4ZFdWemRGQnZjblJVYVdOck8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWTJoaGJtNWxiQzV3YjNKME1TNXZibTFsYzNOaFoyVWdQU0JtYkhWemFEdGNiaUFnSUNBZ0lDQWdJQ0FnSUdac2RYTm9LQ2s3WEc0Z0lDQWdJQ0FnSUgwN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ5WlhGMVpYTjBVRzl5ZEZScFkyc2dQU0JtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0F2THlCUGNHVnlZU0J5WlhGMWFYSmxjeUIxY3lCMGJ5QndjbTkyYVdSbElHRWdiV1Z6YzJGblpTQndZWGxzYjJGa0xDQnlaV2RoY21Sc1pYTnpJRzltWEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUIzYUdWMGFHVnlJSGRsSUhWelpTQnBkQzVjYmlBZ0lDQWdJQ0FnSUNBZ0lHTm9ZVzV1Wld3dWNHOXlkREl1Y0c5emRFMWxjM05oWjJVb01DazdYRzRnSUNBZ0lDQWdJSDA3WEc0Z0lDQWdJQ0FnSUhKbGNYVmxjM1JVYVdOcklEMGdablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjMlYwVkdsdFpXOTFkQ2htYkhWemFDd2dNQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWEYxWlhOMFVHOXlkRlJwWTJzb0tUdGNiaUFnSUNBZ0lDQWdmVHRjYmx4dUlDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQzh2SUc5c1pDQmljbTkzYzJWeWMxeHVJQ0FnSUNBZ0lDQnlaWEYxWlhOMFZHbGpheUE5SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhObGRGUnBiV1Z2ZFhRb1pteDFjMmdzSURBcE8xeHVJQ0FnSUNBZ0lDQjlPMXh1SUNBZ0lIMWNiaUFnSUNBdkx5QnlkVzV6SUdFZ2RHRnpheUJoWm5SbGNpQmhiR3dnYjNSb1pYSWdkR0Z6YTNNZ2FHRjJaU0JpWldWdUlISjFibHh1SUNBZ0lDOHZJSFJvYVhNZ2FYTWdkWE5sWm5Wc0lHWnZjaUIxYm1oaGJtUnNaV1FnY21WcVpXTjBhVzl1SUhSeVlXTnJhVzVuSUhSb1lYUWdibVZsWkhNZ2RHOGdhR0Z3Y0dWdVhHNGdJQ0FnTHk4Z1lXWjBaWElnWVd4c0lHQjBhR1Z1WUdRZ2RHRnphM01nYUdGMlpTQmlaV1Z1SUhKMWJpNWNiaUFnSUNCdVpYaDBWR2xqYXk1eWRXNUJablJsY2lBOUlHWjFibU4wYVc5dUlDaDBZWE5yS1NCN1hHNGdJQ0FnSUNBZ0lHeGhkR1Z5VVhWbGRXVXVjSFZ6YUNoMFlYTnJLVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tDRm1iSFZ6YUdsdVp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pteDFjMmhwYm1jZ1BTQjBjblZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVZ4ZFdWemRGUnBZMnNvS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwN1hHNGdJQ0FnY21WMGRYSnVJRzVsZUhSVWFXTnJPMXh1ZlNrb0tUdGNibHh1THk4Z1FYUjBaVzF3ZENCMGJ5QnRZV3RsSUdkbGJtVnlhV056SUhOaFptVWdhVzRnZEdobElHWmhZMlVnYjJZZ1pHOTNibk4wY21WaGJWeHVMeThnYlc5a2FXWnBZMkYwYVc5dWN5NWNiaTh2SUZSb1pYSmxJR2x6SUc1dklITnBkSFZoZEdsdmJpQjNhR1Z5WlNCMGFHbHpJR2x6SUc1bFkyVnpjMkZ5ZVM1Y2JpOHZJRWxtSUhsdmRTQnVaV1ZrSUdFZ2MyVmpkWEpwZEhrZ1ozVmhjbUZ1ZEdWbExDQjBhR1Z6WlNCd2NtbHRiM0prYVdGc2N5QnVaV1ZrSUhSdklHSmxYRzR2THlCa1pXVndiSGtnWm5KdmVtVnVJR0Z1ZVhkaGVTd2dZVzVrSUdsbUlIbHZkU0JrYjI3aWdKbDBJRzVsWldRZ1lTQnpaV04xY21sMGVTQm5kV0Z5WVc1MFpXVXNYRzR2THlCMGFHbHpJR2x6SUdwMWMzUWdjR3hoYVc0Z2NHRnlZVzV2YVdRdVhHNHZMeUJJYjNkbGRtVnlMQ0IwYUdseklDb3FiV2xuYUhRcUtpQm9ZWFpsSUhSb1pTQnVhV05sSUhOcFpHVXRaV1ptWldOMElHOW1JSEpsWkhWamFXNW5JSFJvWlNCemFYcGxJRzltWEc0dkx5QjBhR1VnYldsdWFXWnBaV1FnWTI5a1pTQmllU0J5WldSMVkybHVaeUI0TG1OaGJHd29LU0IwYnlCdFpYSmxiSGtnZUNncFhHNHZMeUJUWldVZ1RXRnlheUJOYVd4c1pYTGlnSmx6SUdWNGNHeGhibUYwYVc5dUlHOW1JSGRvWVhRZ2RHaHBjeUJrYjJWekxseHVMeThnYUhSMGNEb3ZMM2RwYTJrdVpXTnRZWE5qY21sd2RDNXZjbWN2Wkc5cmRTNXdhSEEvYVdROVkyOXVkbVZ1ZEdsdmJuTTZjMkZtWlY5dFpYUmhYM0J5YjJkeVlXMXRhVzVuWEc1MllYSWdZMkZzYkNBOUlFWjFibU4wYVc5dUxtTmhiR3c3WEc1bWRXNWpkR2x2YmlCMWJtTjFjbko1VkdocGN5aG1LU0I3WEc0Z0lDQWdjbVYwZFhKdUlHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR05oYkd3dVlYQndiSGtvWml3Z1lYSm5kVzFsYm5SektUdGNiaUFnSUNCOU8xeHVmVnh1THk4Z1ZHaHBjeUJwY3lCbGNYVnBkbUZzWlc1MExDQmlkWFFnYzJ4dmQyVnlPbHh1THk4Z2RXNWpkWEp5ZVZSb2FYTWdQU0JHZFc1amRHbHZibDlpYVc1a0xtSnBibVFvUm5WdVkzUnBiMjVmWW1sdVpDNWpZV3hzS1R0Y2JpOHZJR2gwZEhBNkx5OXFjM0JsY21ZdVkyOXRMM1Z1WTNWeWNubDBhR2x6WEc1Y2JuWmhjaUJoY25KaGVWOXpiR2xqWlNBOUlIVnVZM1Z5Y25sVWFHbHpLRUZ5Y21GNUxuQnliM1J2ZEhsd1pTNXpiR2xqWlNrN1hHNWNiblpoY2lCaGNuSmhlVjl5WldSMVkyVWdQU0IxYm1OMWNuSjVWR2hwY3loY2JpQWdJQ0JCY25KaGVTNXdjbTkwYjNSNWNHVXVjbVZrZFdObElIeDhJR1oxYm1OMGFXOXVJQ2hqWVd4c1ltRmpheXdnWW1GemFYTXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHbHVaR1Y0SUQwZ01DeGNiaUFnSUNBZ0lDQWdJQ0FnSUd4bGJtZDBhQ0E5SUhSb2FYTXViR1Z1WjNSb08xeHVJQ0FnSUNBZ0lDQXZMeUJqYjI1alpYSnVhVzVuSUhSb1pTQnBibWwwYVdGc0lIWmhiSFZsTENCcFppQnZibVVnYVhNZ2JtOTBJSEJ5YjNacFpHVmtYRzRnSUNBZ0lDQWdJR2xtSUNoaGNtZDFiV1Z1ZEhNdWJHVnVaM1JvSUQwOVBTQXhLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJ6WldWcklIUnZJSFJvWlNCbWFYSnpkQ0IyWVd4MVpTQnBiaUIwYUdVZ1lYSnlZWGtzSUdGalkyOTFiblJwYm1kY2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUdadmNpQjBhR1VnY0c5emMybGlhV3hwZEhrZ2RHaGhkQ0JwY3lCcGN5QmhJSE53WVhKelpTQmhjbkpoZVZ4dUlDQWdJQ0FnSUNBZ0lDQWdaRzhnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHBibVJsZUNCcGJpQjBhR2x6S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR0poYzJseklEMGdkR2hwYzF0cGJtUmxlQ3NyWFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2dySzJsdVpHVjRJRDQ5SUd4bGJtZDBhQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdmU0IzYUdsc1pTQW9NU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0x5OGdjbVZrZFdObFhHNGdJQ0FnSUNBZ0lHWnZjaUFvT3lCcGJtUmxlQ0E4SUd4bGJtZDBhRHNnYVc1a1pYZ3JLeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdMeThnWVdOamIzVnVkQ0JtYjNJZ2RHaGxJSEJ2YzNOcFltbHNhWFI1SUhSb1lYUWdkR2hsSUdGeWNtRjVJR2x6SUhOd1lYSnpaVnh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR2x1WkdWNElHbHVJSFJvYVhNcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmlZWE5wY3lBOUlHTmhiR3hpWVdOcktHSmhjMmx6TENCMGFHbHpXMmx1WkdWNFhTd2dhVzVrWlhncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCaVlYTnBjenRjYmlBZ0lDQjlYRzRwTzF4dVhHNTJZWElnWVhKeVlYbGZhVzVrWlhoUFppQTlJSFZ1WTNWeWNubFVhR2x6S0Z4dUlDQWdJRUZ5Y21GNUxuQnliM1J2ZEhsd1pTNXBibVJsZUU5bUlIeDhJR1oxYm1OMGFXOXVJQ2gyWVd4MVpTa2dlMXh1SUNBZ0lDQWdJQ0F2THlCdWIzUWdZU0IyWlhKNUlHZHZiMlFnYzJocGJTd2dZblYwSUdkdmIyUWdaVzV2ZFdkb0lHWnZjaUJ2ZFhJZ2IyNWxJSFZ6WlNCdlppQnBkRnh1SUNBZ0lDQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUhSb2FYTXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGFHbHpXMmxkSUQwOVBTQjJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlBdE1UdGNiaUFnSUNCOVhHNHBPMXh1WEc1MllYSWdZWEp5WVhsZmJXRndJRDBnZFc1amRYSnllVlJvYVhNb1hHNGdJQ0FnUVhKeVlYa3VjSEp2ZEc5MGVYQmxMbTFoY0NCOGZDQm1kVzVqZEdsdmJpQW9ZMkZzYkdKaFkyc3NJSFJvYVhOd0tTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCelpXeG1JRDBnZEdocGN6dGNiaUFnSUNBZ0lDQWdkbUZ5SUdOdmJHeGxZM1FnUFNCYlhUdGNiaUFnSUNBZ0lDQWdZWEp5WVhsZmNtVmtkV05sS0hObGJHWXNJR1oxYm1OMGFXOXVJQ2gxYm1SbFptbHVaV1FzSUhaaGJIVmxMQ0JwYm1SbGVDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kyOXNiR1ZqZEM1d2RYTm9LR05oYkd4aVlXTnJMbU5oYkd3b2RHaHBjM0FzSUhaaGJIVmxMQ0JwYm1SbGVDd2djMlZzWmlrcE8xeHVJQ0FnSUNBZ0lDQjlMQ0IyYjJsa0lEQXBPMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdZMjlzYkdWamREdGNiaUFnSUNCOVhHNHBPMXh1WEc1MllYSWdiMkpxWldOMFgyTnlaV0YwWlNBOUlFOWlhbVZqZEM1amNtVmhkR1VnZkh3Z1puVnVZM1JwYjI0Z0tIQnliM1J2ZEhsd1pTa2dlMXh1SUNBZ0lHWjFibU4wYVc5dUlGUjVjR1VvS1NCN0lIMWNiaUFnSUNCVWVYQmxMbkJ5YjNSdmRIbHdaU0E5SUhCeWIzUnZkSGx3WlR0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZSNWNHVW9LVHRjYm4wN1hHNWNiblpoY2lCdlltcGxZM1JmYUdGelQzZHVVSEp2Y0dWeWRIa2dQU0IxYm1OMWNuSjVWR2hwY3loUFltcGxZM1F1Y0hKdmRHOTBlWEJsTG1oaGMwOTNibEJ5YjNCbGNuUjVLVHRjYmx4dWRtRnlJRzlpYW1WamRGOXJaWGx6SUQwZ1QySnFaV04wTG10bGVYTWdmSHdnWm5WdVkzUnBiMjRnS0c5aWFtVmpkQ2tnZTF4dUlDQWdJSFpoY2lCclpYbHpJRDBnVzEwN1hHNGdJQ0FnWm05eUlDaDJZWElnYTJWNUlHbHVJRzlpYW1WamRDa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2IySnFaV04wWDJoaGMwOTNibEJ5YjNCbGNuUjVLRzlpYW1WamRDd2dhMlY1S1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYTJWNWN5NXdkWE5vS0d0bGVTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUd0bGVYTTdYRzU5TzF4dVhHNTJZWElnYjJKcVpXTjBYM1J2VTNSeWFXNW5JRDBnZFc1amRYSnllVlJvYVhNb1QySnFaV04wTG5CeWIzUnZkSGx3WlM1MGIxTjBjbWx1WnlrN1hHNWNibVoxYm1OMGFXOXVJR2x6VDJKcVpXTjBLSFpoYkhWbEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUhaaGJIVmxJRDA5UFNCUFltcGxZM1FvZG1Gc2RXVXBPMXh1ZlZ4dVhHNHZMeUJuWlc1bGNtRjBiM0lnY21Wc1lYUmxaQ0J6YUdsdGMxeHVYRzR2THlCR1NWaE5SVG9nVW1WdGIzWmxJSFJvYVhNZ1puVnVZM1JwYjI0Z2IyNWpaU0JGVXpZZ1oyVnVaWEpoZEc5eWN5QmhjbVVnYVc0Z1UzQnBaR1Z5VFc5dWEyVjVMbHh1Wm5WdVkzUnBiMjRnYVhOVGRHOXdTWFJsY21GMGFXOXVLR1Y0WTJWd2RHbHZiaWtnZTF4dUlDQWdJSEpsZEhWeWJpQW9YRzRnSUNBZ0lDQWdJRzlpYW1WamRGOTBiMU4wY21sdVp5aGxlR05sY0hScGIyNHBJRDA5UFNCY0lsdHZZbXBsWTNRZ1UzUnZjRWwwWlhKaGRHbHZibDFjSWlCOGZGeHVJQ0FnSUNBZ0lDQmxlR05sY0hScGIyNGdhVzV6ZEdGdVkyVnZaaUJSVW1WMGRYSnVWbUZzZFdWY2JpQWdJQ0FwTzF4dWZWeHVYRzR2THlCR1NWaE5SVG9nVW1WdGIzWmxJSFJvYVhNZ2FHVnNjR1Z5SUdGdVpDQlJMbkpsZEhWeWJpQnZibU5sSUVWVE5pQm5aVzVsY21GMGIzSnpJR0Z5WlNCcGJseHVMeThnVTNCcFpHVnlUVzl1YTJWNUxseHVkbUZ5SUZGU1pYUjFjbTVXWVd4MVpUdGNibWxtSUNoMGVYQmxiMllnVW1WMGRYSnVWbUZzZFdVZ0lUMDlJRndpZFc1a1pXWnBibVZrWENJcElIdGNiaUFnSUNCUlVtVjBkWEp1Vm1Gc2RXVWdQU0JTWlhSMWNtNVdZV3gxWlR0Y2JuMGdaV3h6WlNCN1hHNGdJQ0FnVVZKbGRIVnlibFpoYkhWbElEMGdablZ1WTNScGIyNGdLSFpoYkhWbEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdWRtRnNkV1VnUFNCMllXeDFaVHRjYmlBZ0lDQjlPMXh1ZlZ4dVhHNHZMeUJzYjI1bklITjBZV05ySUhSeVlXTmxjMXh1WEc1MllYSWdVMVJCUTB0ZlNsVk5VRjlUUlZCQlVrRlVUMUlnUFNCY0lrWnliMjBnY0hKbGRtbHZkWE1nWlhabGJuUTZYQ0k3WEc1Y2JtWjFibU4wYVc5dUlHMWhhMlZUZEdGamExUnlZV05sVEc5dVp5aGxjbkp2Y2l3Z2NISnZiV2x6WlNrZ2UxeHVJQ0FnSUM4dklFbG1JSEJ2YzNOcFlteGxMQ0IwY21GdWMyWnZjbTBnZEdobElHVnljbTl5SUhOMFlXTnJJSFJ5WVdObElHSjVJSEpsYlc5MmFXNW5JRTV2WkdVZ1lXNWtJRkZjYmlBZ0lDQXZMeUJqY25WbWRDd2dkR2hsYmlCamIyNWpZWFJsYm1GMGFXNW5JSGRwZEdnZ2RHaGxJSE4wWVdOcklIUnlZV05sSUc5bUlHQndjbTl0YVhObFlDNGdVMlZsSUNNMU55NWNiaUFnSUNCcFppQW9hR0Z6VTNSaFkydHpJQ1ltWEc0Z0lDQWdJQ0FnSUhCeWIyMXBjMlV1YzNSaFkyc2dKaVpjYmlBZ0lDQWdJQ0FnZEhsd1pXOW1JR1Z5Y205eUlEMDlQU0JjSW05aWFtVmpkRndpSUNZbVhHNGdJQ0FnSUNBZ0lHVnljbTl5SUNFOVBTQnVkV3hzSUNZbVhHNGdJQ0FnSUNBZ0lHVnljbTl5TG5OMFlXTnJJQ1ltWEc0Z0lDQWdJQ0FnSUdWeWNtOXlMbk4wWVdOckxtbHVaR1Y0VDJZb1UxUkJRMHRmU2xWTlVGOVRSVkJCVWtGVVQxSXBJRDA5UFNBdE1WeHVJQ0FnSUNrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnYzNSaFkydHpJRDBnVzEwN1hHNGdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlIQWdQU0J3Y205dGFYTmxPeUFoSVhBN0lIQWdQU0J3TG5OdmRYSmpaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hBdWMzUmhZMnNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRmphM011ZFc1emFHbG1kQ2h3TG5OMFlXTnJLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0J6ZEdGamEzTXVkVzV6YUdsbWRDaGxjbkp2Y2k1emRHRmpheWs3WEc1Y2JpQWdJQ0FnSUNBZ2RtRnlJR052Ym1OaGRHVmtVM1JoWTJ0eklEMGdjM1JoWTJ0ekxtcHZhVzRvWENKY1hHNWNJaUFySUZOVVFVTkxYMHBWVFZCZlUwVlFRVkpCVkU5U0lDc2dYQ0pjWEc1Y0lpazdYRzRnSUNBZ0lDQWdJR1Z5Y205eUxuTjBZV05ySUQwZ1ptbHNkR1Z5VTNSaFkydFRkSEpwYm1jb1kyOXVZMkYwWldSVGRHRmphM01wTzF4dUlDQWdJSDFjYm4xY2JseHVablZ1WTNScGIyNGdabWxzZEdWeVUzUmhZMnRUZEhKcGJtY29jM1JoWTJ0VGRISnBibWNwSUh0Y2JpQWdJQ0IyWVhJZ2JHbHVaWE1nUFNCemRHRmphMU4wY21sdVp5NXpjR3hwZENoY0lseGNibHdpS1R0Y2JpQWdJQ0IyWVhJZ1pHVnphWEpsWkV4cGJtVnpJRDBnVzEwN1hHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCc2FXNWxjeTVzWlc1bmRHZzdJQ3NyYVNrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnYkdsdVpTQTlJR3hwYm1WelcybGRPMXh1WEc0Z0lDQWdJQ0FnSUdsbUlDZ2hhWE5KYm5SbGNtNWhiRVp5WVcxbEtHeHBibVVwSUNZbUlDRnBjMDV2WkdWR2NtRnRaU2hzYVc1bEtTQW1KaUJzYVc1bEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCa1pYTnBjbVZrVEdsdVpYTXVjSFZ6YUNoc2FXNWxLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z1pHVnphWEpsWkV4cGJtVnpMbXB2YVc0b1hDSmNYRzVjSWlrN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdselRtOWtaVVp5WVcxbEtITjBZV05yVEdsdVpTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCemRHRmphMHhwYm1VdWFXNWtaWGhQWmloY0lpaHRiMlIxYkdVdWFuTTZYQ0lwSUNFOVBTQXRNU0I4ZkZ4dUlDQWdJQ0FnSUNBZ0lDQnpkR0ZqYTB4cGJtVXVhVzVrWlhoUFppaGNJaWh1YjJSbExtcHpPbHdpS1NBaFBUMGdMVEU3WEc1OVhHNWNibVoxYm1OMGFXOXVJR2RsZEVacGJHVk9ZVzFsUVc1a1RHbHVaVTUxYldKbGNpaHpkR0ZqYTB4cGJtVXBJSHRjYmlBZ0lDQXZMeUJPWVcxbFpDQm1kVzVqZEdsdmJuTTZJRndpWVhRZ1puVnVZM1JwYjI1T1lXMWxJQ2htYVd4bGJtRnRaVHBzYVc1bFRuVnRZbVZ5T21OdmJIVnRiazUxYldKbGNpbGNJbHh1SUNBZ0lDOHZJRWx1SUVsRk1UQWdablZ1WTNScGIyNGdibUZ0WlNCallXNGdhR0YyWlNCemNHRmpaWE1nS0Z3aVFXNXZibmx0YjNWeklHWjFibU4wYVc5dVhDSXBJRTlmYjF4dUlDQWdJSFpoY2lCaGRIUmxiWEIwTVNBOUlDOWhkQ0F1S3lCY1hDZ29MaXNwT2loY1hHUXJLVG9vUHpwY1hHUXJLVnhjS1NRdkxtVjRaV01vYzNSaFkydE1hVzVsS1R0Y2JpQWdJQ0JwWmlBb1lYUjBaVzF3ZERFcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlGdGhkSFJsYlhCME1Wc3hYU3dnVG5WdFltVnlLR0YwZEdWdGNIUXhXekpkS1YwN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHk4Z1FXNXZibmx0YjNWeklHWjFibU4wYVc5dWN6b2dYQ0poZENCbWFXeGxibUZ0WlRwc2FXNWxUblZ0WW1WeU9tTnZiSFZ0Yms1MWJXSmxjbHdpWEc0Z0lDQWdkbUZ5SUdGMGRHVnRjSFF5SUQwZ0wyRjBJQ2hiWGlCZEt5azZLRnhjWkNzcE9pZy9PbHhjWkNzcEpDOHVaWGhsWXloemRHRmphMHhwYm1VcE8xeHVJQ0FnSUdsbUlDaGhkSFJsYlhCME1pa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdXMkYwZEdWdGNIUXlXekZkTENCT2RXMWlaWElvWVhSMFpXMXdkREpiTWwwcFhUdGNiaUFnSUNCOVhHNWNiaUFnSUNBdkx5QkdhWEpsWm05NElITjBlV3hsT2lCY0ltWjFibU4wYVc5dVFHWnBiR1Z1WVcxbE9teHBibVZPZFcxaVpYSWdiM0lnUUdacGJHVnVZVzFsT214cGJtVk9kVzFpWlhKY0lseHVJQ0FnSUhaaGNpQmhkSFJsYlhCME15QTlJQzh1S2tBb0xpc3BPaWhjWEdRcktTUXZMbVY0WldNb2MzUmhZMnRNYVc1bEtUdGNiaUFnSUNCcFppQW9ZWFIwWlcxd2RETXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRnRoZEhSbGJYQjBNMXN4WFN3Z1RuVnRZbVZ5S0dGMGRHVnRjSFF6V3pKZEtWMDdYRzRnSUNBZ2ZWeHVmVnh1WEc1bWRXNWpkR2x2YmlCcGMwbHVkR1Z5Ym1Gc1JuSmhiV1VvYzNSaFkydE1hVzVsS1NCN1hHNGdJQ0FnZG1GeUlHWnBiR1ZPWVcxbFFXNWtUR2x1WlU1MWJXSmxjaUE5SUdkbGRFWnBiR1ZPWVcxbFFXNWtUR2x1WlU1MWJXSmxjaWh6ZEdGamEweHBibVVwTzF4dVhHNGdJQ0FnYVdZZ0tDRm1hV3hsVG1GdFpVRnVaRXhwYm1WT2RXMWlaWElwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNBZ0lIMWNibHh1SUNBZ0lIWmhjaUJtYVd4bFRtRnRaU0E5SUdacGJHVk9ZVzFsUVc1a1RHbHVaVTUxYldKbGNsc3dYVHRjYmlBZ0lDQjJZWElnYkdsdVpVNTFiV0psY2lBOUlHWnBiR1ZPWVcxbFFXNWtUR2x1WlU1MWJXSmxjbHN4WFR0Y2JseHVJQ0FnSUhKbGRIVnliaUJtYVd4bFRtRnRaU0E5UFQwZ2NVWnBiR1ZPWVcxbElDWW1YRzRnSUNBZ0lDQWdJR3hwYm1WT2RXMWlaWElnUGowZ2NWTjBZWEowYVc1blRHbHVaU0FtSmx4dUlDQWdJQ0FnSUNCc2FXNWxUblZ0WW1WeUlEdzlJSEZGYm1ScGJtZE1hVzVsTzF4dWZWeHVYRzR2THlCa2FYTmpiM1psY2lCdmQyNGdabWxzWlNCdVlXMWxJR0Z1WkNCc2FXNWxJRzUxYldKbGNpQnlZVzVuWlNCbWIzSWdabWxzZEdWeWFXNW5JSE4wWVdOclhHNHZMeUIwY21GalpYTmNibVoxYm1OMGFXOXVJR05oY0hSMWNtVk1hVzVsS0NrZ2UxeHVJQ0FnSUdsbUlDZ2hhR0Z6VTNSaFkydHpLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQjlYRzVjYmlBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1JYSnliM0lvS1R0Y2JpQWdJQ0I5SUdOaGRHTm9JQ2hsS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJzYVc1bGN5QTlJR1V1YzNSaFkyc3VjM0JzYVhRb1hDSmNYRzVjSWlrN1hHNGdJQ0FnSUNBZ0lIWmhjaUJtYVhKemRFeHBibVVnUFNCc2FXNWxjMXN3WFM1cGJtUmxlRTltS0Z3aVFGd2lLU0ErSURBZ1B5QnNhVzVsYzFzeFhTQTZJR3hwYm1Weld6SmRPMXh1SUNBZ0lDQWdJQ0IyWVhJZ1ptbHNaVTVoYldWQmJtUk1hVzVsVG5WdFltVnlJRDBnWjJWMFJtbHNaVTVoYldWQmJtUk1hVzVsVG5WdFltVnlLR1pwY25OMFRHbHVaU2s3WEc0Z0lDQWdJQ0FnSUdsbUlDZ2habWxzWlU1aGJXVkJibVJNYVc1bFRuVnRZbVZ5S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCeFJtbHNaVTVoYldVZ1BTQm1hV3hsVG1GdFpVRnVaRXhwYm1WT2RXMWlaWEpiTUYwN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCbWFXeGxUbUZ0WlVGdVpFeHBibVZPZFcxaVpYSmJNVjA3WEc0Z0lDQWdmVnh1ZlZ4dVhHNW1kVzVqZEdsdmJpQmtaWEJ5WldOaGRHVW9ZMkZzYkdKaFkyc3NJRzVoYldVc0lHRnNkR1Z5Ym1GMGFYWmxLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCamIyNXpiMnhsSUNFOVBTQmNJblZ1WkdWbWFXNWxaRndpSUNZbVhHNGdJQ0FnSUNBZ0lDQWdJQ0IwZVhCbGIyWWdZMjl1YzI5c1pTNTNZWEp1SUQwOVBTQmNJbVoxYm1OMGFXOXVYQ0lwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR052Ym5OdmJHVXVkMkZ5YmlodVlXMWxJQ3NnWENJZ2FYTWdaR1Z3Y21WallYUmxaQ3dnZFhObElGd2lJQ3NnWVd4MFpYSnVZWFJwZG1VZ0sxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGd2lJR2x1YzNSbFlXUXVYQ0lzSUc1bGR5QkZjbkp2Y2loY0lsd2lLUzV6ZEdGamF5azdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR05oYkd4aVlXTnJMbUZ3Y0d4NUtHTmhiR3hpWVdOckxDQmhjbWQxYldWdWRITXBPMXh1SUNBZ0lIMDdYRzU5WEc1Y2JpOHZJR1Z1WkNCdlppQnphR2x0YzF4dUx5OGdZbVZuYVc1dWFXNW5JRzltSUhKbFlXd2dkMjl5YTF4dVhHNHZLaXBjYmlBcUlFTnZibk4wY25WamRITWdZU0J3Y205dGFYTmxJR1p2Y2lCaGJpQnBiVzFsWkdsaGRHVWdjbVZtWlhKbGJtTmxMQ0J3WVhOelpYTWdjSEp2YldselpYTWdkR2h5YjNWbmFDd2diM0pjYmlBcUlHTnZaWEpqWlhNZ2NISnZiV2x6WlhNZ1puSnZiU0JrYVdabVpYSmxiblFnYzNsemRHVnRjeTVjYmlBcUlFQndZWEpoYlNCMllXeDFaU0JwYlcxbFpHbGhkR1VnY21WbVpYSmxibU5sSUc5eUlIQnliMjFwYzJWY2JpQXFMMXh1Wm5WdVkzUnBiMjRnVVNoMllXeDFaU2tnZTF4dUlDQWdJQzh2SUVsbUlIUm9aU0J2WW1wbFkzUWdhWE1nWVd4eVpXRmtlU0JoSUZCeWIyMXBjMlVzSUhKbGRIVnliaUJwZENCa2FYSmxZM1JzZVM0Z0lGUm9hWE1nWlc1aFlteGxjMXh1SUNBZ0lDOHZJSFJvWlNCeVpYTnZiSFpsSUdaMWJtTjBhVzl1SUhSdklHSnZkR2dnWW1VZ2RYTmxaQ0IwYnlCamNtVmhkR1ZrSUhKbFptVnlaVzVqWlhNZ1puSnZiU0J2WW1wbFkzUnpMRnh1SUNBZ0lDOHZJR0oxZENCMGJ5QjBiMnhsY21GaWJIa2dZMjlsY21ObElHNXZiaTF3Y205dGFYTmxjeUIwYnlCd2NtOXRhWE5sY3k1Y2JpQWdJQ0JwWmlBb2RtRnNkV1VnYVc1emRHRnVZMlZ2WmlCUWNtOXRhWE5sS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMllXeDFaVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZMeUJoYzNOcGJXbHNZWFJsSUhSb1pXNWhZbXhsYzF4dUlDQWdJR2xtSUNocGMxQnliMjFwYzJWQmJHbHJaU2gyWVd4MVpTa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR052WlhKalpTaDJZV3gxWlNrN1hHNGdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1oxYkdacGJHd29kbUZzZFdVcE8xeHVJQ0FnSUgxY2JuMWNibEV1Y21WemIyeDJaU0E5SUZFN1hHNWNiaThxS2x4dUlDb2dVR1Z5Wm05eWJYTWdZU0IwWVhOcklHbHVJR0VnWm5WMGRYSmxJSFIxY200Z2IyWWdkR2hsSUdWMlpXNTBJR3h2YjNBdVhHNGdLaUJBY0dGeVlXMGdlMFoxYm1OMGFXOXVmU0IwWVhOclhHNGdLaTljYmxFdWJtVjRkRlJwWTJzZ1BTQnVaWGgwVkdsamF6dGNibHh1THlvcVhHNGdLaUJEYjI1MGNtOXNjeUIzYUdWMGFHVnlJRzl5SUc1dmRDQnNiMjVuSUhOMFlXTnJJSFJ5WVdObGN5QjNhV3hzSUdKbElHOXVYRzRnS2k5Y2JsRXViRzl1WjFOMFlXTnJVM1Z3Y0c5eWRDQTlJR1poYkhObE8xeHVYRzR2THlCbGJtRmliR1VnYkc5dVp5QnpkR0ZqYTNNZ2FXWWdVVjlFUlVKVlJ5QnBjeUJ6WlhSY2JtbG1JQ2gwZVhCbGIyWWdjSEp2WTJWemN5QTlQVDBnWENKdlltcGxZM1JjSWlBbUppQndjbTlqWlhOeklDWW1JSEJ5YjJObGMzTXVaVzUySUNZbUlIQnliMk5sYzNNdVpXNTJMbEZmUkVWQ1ZVY3BJSHRjYmlBZ0lDQlJMbXh2Ym1kVGRHRmphMU4xY0hCdmNuUWdQU0IwY25WbE8xeHVmVnh1WEc0dktpcGNiaUFxSUVOdmJuTjBjblZqZEhNZ1lTQjdjSEp2YldselpTd2djbVZ6YjJ4MlpTd2djbVZxWldOMGZTQnZZbXBsWTNRdVhHNGdLbHh1SUNvZ1lISmxjMjlzZG1WZ0lHbHpJR0VnWTJGc2JHSmhZMnNnZEc4Z2FXNTJiMnRsSUhkcGRHZ2dZU0J0YjNKbElISmxjMjlzZG1Wa0lIWmhiSFZsSUdadmNpQjBhR1ZjYmlBcUlIQnliMjFwYzJVdUlGUnZJR1oxYkdacGJHd2dkR2hsSUhCeWIyMXBjMlVzSUdsdWRtOXJaU0JnY21WemIyeDJaV0FnZDJsMGFDQmhibmtnZG1Gc2RXVWdkR2hoZENCcGMxeHVJQ29nYm05MElHRWdkR2hsYm1GaWJHVXVJRlJ2SUhKbGFtVmpkQ0IwYUdVZ2NISnZiV2x6WlN3Z2FXNTJiMnRsSUdCeVpYTnZiSFpsWUNCM2FYUm9JR0VnY21WcVpXTjBaV1JjYmlBcUlIUm9aVzVoWW14bExDQnZjaUJwYm5admEyVWdZSEpsYW1WamRHQWdkMmwwYUNCMGFHVWdjbVZoYzI5dUlHUnBjbVZqZEd4NUxpQlVieUJ5WlhOdmJIWmxJSFJvWlZ4dUlDb2djSEp2YldselpTQjBieUJoYm05MGFHVnlJSFJvWlc1aFlteGxMQ0IwYUhWeklIQjFkSFJwYm1jZ2FYUWdhVzRnZEdobElITmhiV1VnYzNSaGRHVXNJR2x1ZG05clpWeHVJQ29nWUhKbGMyOXNkbVZnSUhkcGRHZ2dkR2hoZENCdmRHaGxjaUIwYUdWdVlXSnNaUzVjYmlBcUwxeHVVUzVrWldabGNpQTlJR1JsWm1WeU8xeHVablZ1WTNScGIyNGdaR1ZtWlhJb0tTQjdYRzRnSUNBZ0x5OGdhV1lnWENKdFpYTnpZV2RsYzF3aUlHbHpJR0Z1SUZ3aVFYSnlZWGxjSWl3Z2RHaGhkQ0JwYm1ScFkyRjBaWE1nZEdoaGRDQjBhR1VnY0hKdmJXbHpaU0JvWVhNZ2JtOTBJSGxsZEZ4dUlDQWdJQzh2SUdKbFpXNGdjbVZ6YjJ4MlpXUXVJQ0JKWmlCcGRDQnBjeUJjSW5WdVpHVm1hVzVsWkZ3aUxDQnBkQ0JvWVhNZ1ltVmxiaUJ5WlhOdmJIWmxaQzRnSUVWaFkyaGNiaUFnSUNBdkx5QmxiR1Z0Wlc1MElHOW1JSFJvWlNCdFpYTnpZV2RsY3lCaGNuSmhlU0JwY3lCcGRITmxiR1lnWVc0Z1lYSnlZWGtnYjJZZ1kyOXRjR3hsZEdVZ1lYSm5kVzFsYm5SeklIUnZYRzRnSUNBZ0x5OGdabTl5ZDJGeVpDQjBieUIwYUdVZ2NtVnpiMngyWldRZ2NISnZiV2x6WlM0Z0lGZGxJR052WlhKalpTQjBhR1VnY21WemIyeDFkR2x2YmlCMllXeDFaU0IwYnlCaFhHNGdJQ0FnTHk4Z2NISnZiV2x6WlNCMWMybHVaeUIwYUdVZ1lISmxjMjlzZG1WZ0lHWjFibU4wYVc5dUlHSmxZMkYxYzJVZ2FYUWdhR0Z1Wkd4bGN5QmliM1JvSUdaMWJHeDVYRzRnSUNBZ0x5OGdibTl1TFhSb1pXNWhZbXhsSUhaaGJIVmxjeUJoYm1RZ2IzUm9aWElnZEdobGJtRmliR1Z6SUdkeVlXTmxablZzYkhrdVhHNGdJQ0FnZG1GeUlHMWxjM05oWjJWeklEMGdXMTBzSUhCeWIyZHlaWE56VEdsemRHVnVaWEp6SUQwZ1cxMHNJSEpsYzI5c2RtVmtVSEp2YldselpUdGNibHh1SUNBZ0lIWmhjaUJrWldabGNuSmxaQ0E5SUc5aWFtVmpkRjlqY21WaGRHVW9aR1ZtWlhJdWNISnZkRzkwZVhCbEtUdGNiaUFnSUNCMllYSWdjSEp2YldselpTQTlJRzlpYW1WamRGOWpjbVZoZEdVb1VISnZiV2x6WlM1d2NtOTBiM1I1Y0dVcE8xeHVYRzRnSUNBZ2NISnZiV2x6WlM1d2NtOXRhWE5sUkdsemNHRjBZMmdnUFNCbWRXNWpkR2x2YmlBb2NtVnpiMngyWlN3Z2IzQXNJRzl3WlhKaGJtUnpLU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQmhjbWR6SUQwZ1lYSnlZWGxmYzJ4cFkyVW9ZWEpuZFcxbGJuUnpLVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHMWxjM05oWjJWektTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCdFpYTnpZV2RsY3k1d2RYTm9LR0Z5WjNNcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHOXdJRDA5UFNCY0luZG9aVzVjSWlBbUppQnZjR1Z5WVc1a2Mxc3hYU2tnZXlBdkx5QndjbTluY21WemN5QnZjR1Z5WVc1a1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NISnZaM0psYzNOTWFYTjBaVzVsY25NdWNIVnphQ2h2Y0dWeVlXNWtjMXN4WFNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQlJMbTVsZUhSVWFXTnJLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYTnZiSFpsWkZCeWIyMXBjMlV1Y0hKdmJXbHpaVVJwYzNCaGRHTm9MbUZ3Y0d4NUtISmxjMjlzZG1Wa1VISnZiV2x6WlN3Z1lYSm5jeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCWVdGZ2daR1Z3Y21WallYUmxaRnh1SUNBZ0lIQnliMjFwYzJVdWRtRnNkV1ZQWmlBOUlHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHMWxjM05oWjJWektTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnY0hKdmJXbHpaVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCMllYSWdibVZoY21WeVZtRnNkV1VnUFNCdVpXRnlaWElvY21WemIyeDJaV1JRY205dGFYTmxLVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHbHpVSEp2YldselpTaHVaV0Z5WlhKV1lXeDFaU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsYzI5c2RtVmtVSEp2YldselpTQTlJRzVsWVhKbGNsWmhiSFZsT3lBdkx5QnphRzl5ZEdWdUlHTm9ZV2x1WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc1bFlYSmxjbFpoYkhWbE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCd2NtOXRhWE5sTG1sdWMzQmxZM1FnUFNCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJR2xtSUNnaGNtVnpiMngyWldSUWNtOXRhWE5sS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdleUJ6ZEdGMFpUb2dYQ0p3Wlc1a2FXNW5YQ0lnZlR0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2NtVnpiMngyWldSUWNtOXRhWE5sTG1sdWMzQmxZM1FvS1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnYVdZZ0tGRXViRzl1WjFOMFlXTnJVM1Z3Y0c5eWRDQW1KaUJvWVhOVGRHRmphM01wSUh0Y2JpQWdJQ0FnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lncE8xeHVJQ0FnSUNBZ0lDQjlJR05oZEdOb0lDaGxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJPVDFSRk9pQmtiMjRuZENCMGNua2dkRzhnZFhObElHQkZjbkp2Y2k1allYQjBkWEpsVTNSaFkydFVjbUZqWldBZ2IzSWdkSEpoYm5ObVpYSWdkR2hsWEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJoWTJObGMzTnZjaUJoY205MWJtUTdJSFJvWVhRZ1kyRjFjMlZ6SUcxbGJXOXllU0JzWldGcmN5QmhjeUJ3WlhJZ1IwZ3RNVEV4TGlCS2RYTjBYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QnlaV2xtZVNCMGFHVWdjM1JoWTJzZ2RISmhZMlVnWVhNZ1lTQnpkSEpwYm1jZ1FWTkJVQzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QkJkQ0IwYUdVZ2MyRnRaU0IwYVcxbExDQmpkWFFnYjJabUlIUm9aU0JtYVhKemRDQnNhVzVsT3lCcGRDZHpJR0ZzZDJGNWN5QnFkWE4wWEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJjSWx0dlltcGxZM1FnVUhKdmJXbHpaVjFjWEc1Y0lpd2dZWE1nY0dWeUlIUm9aU0JnZEc5VGRISnBibWRnTGx4dUlDQWdJQ0FnSUNBZ0lDQWdjSEp2YldselpTNXpkR0ZqYXlBOUlHVXVjM1JoWTJzdWMzVmljM1J5YVc1bktHVXVjM1JoWTJzdWFXNWtaWGhQWmloY0lseGNibHdpS1NBcklERXBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeThnVGs5VVJUb2dkMlVnWkc4Z2RHaGxJR05vWldOcmN5Qm1iM0lnWUhKbGMyOXNkbVZrVUhKdmJXbHpaV0FnYVc0Z1pXRmphQ0J0WlhSb2IyUXNJR2x1YzNSbFlXUWdiMlpjYmlBZ0lDQXZMeUJqYjI1emIyeHBaR0YwYVc1bklIUm9aVzBnYVc1MGJ5QmdZbVZqYjIxbFlDd2djMmx1WTJVZ2IzUm9aWEozYVhObElIZGxKMlFnWTNKbFlYUmxJRzVsZDF4dUlDQWdJQzh2SUhCeWIyMXBjMlZ6SUhkcGRHZ2dkR2hsSUd4cGJtVnpJR0JpWldOdmJXVW9kMmhoZEdWMlpYSW9kbUZzZFdVcEtXQXVJRk5sWlNCbExtY3VJRWRJTFRJMU1pNWNibHh1SUNBZ0lHWjFibU4wYVc5dUlHSmxZMjl0WlNodVpYZFFjbTl0YVhObEtTQjdYRzRnSUNBZ0lDQWdJSEpsYzI5c2RtVmtVSEp2YldselpTQTlJRzVsZDFCeWIyMXBjMlU3WEc0Z0lDQWdJQ0FnSUhCeWIyMXBjMlV1YzI5MWNtTmxJRDBnYm1WM1VISnZiV2x6WlR0Y2JseHVJQ0FnSUNBZ0lDQmhjbkpoZVY5eVpXUjFZMlVvYldWemMyRm5aWE1zSUdaMWJtTjBhVzl1SUNoMWJtUmxabWx1WldRc0lHMWxjM05oWjJVcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUZFdWJtVjRkRlJwWTJzb1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzVsZDFCeWIyMXBjMlV1Y0hKdmJXbHpaVVJwYzNCaGRHTm9MbUZ3Y0d4NUtHNWxkMUJ5YjIxcGMyVXNJRzFsYzNOaFoyVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSDBzSUhadmFXUWdNQ2s3WEc1Y2JpQWdJQ0FnSUNBZ2JXVnpjMkZuWlhNZ1BTQjJiMmxrSURBN1hHNGdJQ0FnSUNBZ0lIQnliMmR5WlhOelRHbHpkR1Z1WlhKeklEMGdkbTlwWkNBd08xeHVJQ0FnSUgxY2JseHVJQ0FnSUdSbFptVnljbVZrTG5CeWIyMXBjMlVnUFNCd2NtOXRhWE5sTzF4dUlDQWdJR1JsWm1WeWNtVmtMbkpsYzI5c2RtVWdQU0JtZFc1amRHbHZiaUFvZG1Gc2RXVXBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tISmxjMjlzZG1Wa1VISnZiV2x6WlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ1ltVmpiMjFsS0ZFb2RtRnNkV1VwS1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnWkdWbVpYSnlaV1F1Wm5Wc1ptbHNiQ0E5SUdaMWJtTjBhVzl1SUNoMllXeDFaU2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9jbVZ6YjJ4MlpXUlFjbTl0YVhObEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQmlaV052YldVb1puVnNabWxzYkNoMllXeDFaU2twTzF4dUlDQWdJSDA3WEc0Z0lDQWdaR1ZtWlhKeVpXUXVjbVZxWldOMElEMGdablZ1WTNScGIyNGdLSEpsWVhOdmJpa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2NtVnpiMngyWldSUWNtOXRhWE5sS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCaVpXTnZiV1VvY21WcVpXTjBLSEpsWVhOdmJpa3BPMXh1SUNBZ0lIMDdYRzRnSUNBZ1pHVm1aWEp5WldRdWJtOTBhV1o1SUQwZ1puVnVZM1JwYjI0Z0tIQnliMmR5WlhOektTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoeVpYTnZiSFpsWkZCeWIyMXBjMlVwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUdGeWNtRjVYM0psWkhWalpTaHdjbTluY21WemMweHBjM1JsYm1WeWN5d2dablZ1WTNScGIyNGdLSFZ1WkdWbWFXNWxaQ3dnY0hKdlozSmxjM05NYVhOMFpXNWxjaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdVUzV1WlhoMFZHbGpheWhtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NISnZaM0psYzNOTWFYTjBaVzVsY2lod2NtOW5jbVZ6Y3lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZTd2dkbTlwWkNBd0tUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ2NtVjBkWEp1SUdSbFptVnljbVZrTzF4dWZWeHVYRzR2S2lwY2JpQXFJRU55WldGMFpYTWdZU0JPYjJSbExYTjBlV3hsSUdOaGJHeGlZV05ySUhSb1lYUWdkMmxzYkNCeVpYTnZiSFpsSUc5eUlISmxhbVZqZENCMGFHVWdaR1ZtWlhKeVpXUmNiaUFxSUhCeWIyMXBjMlV1WEc0Z0tpQkFjbVYwZFhKdWN5QmhJRzV2WkdWaVlXTnJYRzRnS2k5Y2JtUmxabVZ5TG5CeWIzUnZkSGx3WlM1dFlXdGxUbTlrWlZKbGMyOXNkbVZ5SUQwZ1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lIWmhjaUJ6Wld4bUlEMGdkR2hwY3p0Y2JpQWdJQ0J5WlhSMWNtNGdablZ1WTNScGIyNGdLR1Z5Y205eUxDQjJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvWlhKeWIzSXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lITmxiR1l1Y21WcVpXTjBLR1Z5Y205eUtUdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hoY21kMWJXVnVkSE11YkdWdVozUm9JRDRnTWlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJWc1ppNXlaWE52YkhabEtHRnljbUY1WDNOc2FXTmxLR0Z5WjNWdFpXNTBjeXdnTVNrcE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJWc1ppNXlaWE52YkhabEtIWmhiSFZsS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwN1hHNTlPMXh1WEc0dktpcGNiaUFxSUVCd1lYSmhiU0J5WlhOdmJIWmxjaUI3Um5WdVkzUnBiMjU5SUdFZ1puVnVZM1JwYjI0Z2RHaGhkQ0J5WlhSMWNtNXpJRzV2ZEdocGJtY2dZVzVrSUdGalkyVndkSE5jYmlBcUlIUm9aU0J5WlhOdmJIWmxMQ0J5WldwbFkzUXNJR0Z1WkNCdWIzUnBabmtnWm5WdVkzUnBiMjV6SUdadmNpQmhJR1JsWm1WeWNtVmtMbHh1SUNvZ1FISmxkSFZ5Ym5NZ1lTQndjbTl0YVhObElIUm9ZWFFnYldGNUlHSmxJSEpsYzI5c2RtVmtJSGRwZEdnZ2RHaGxJR2RwZG1WdUlISmxjMjlzZG1VZ1lXNWtJSEpsYW1WamRGeHVJQ29nWm5WdVkzUnBiMjV6TENCdmNpQnlaV3BsWTNSbFpDQmllU0JoSUhSb2NtOTNiaUJsZUdObGNIUnBiMjRnYVc0Z2NtVnpiMngyWlhKY2JpQXFMMXh1VVM1UWNtOXRhWE5sSUQwZ2NISnZiV2x6WlRzZ0x5OGdSVk0yWEc1UkxuQnliMjFwYzJVZ1BTQndjbTl0YVhObE8xeHVablZ1WTNScGIyNGdjSEp2YldselpTaHlaWE52YkhabGNpa2dlMXh1SUNBZ0lHbG1JQ2gwZVhCbGIyWWdjbVZ6YjJ4MlpYSWdJVDA5SUZ3aVpuVnVZM1JwYjI1Y0lpa2dlMXh1SUNBZ0lDQWdJQ0IwYUhKdmR5QnVaWGNnVkhsd1pVVnljbTl5S0Z3aWNtVnpiMngyWlhJZ2JYVnpkQ0JpWlNCaElHWjFibU4wYVc5dUxsd2lLVHRjYmlBZ0lDQjlYRzRnSUNBZ2RtRnlJR1JsWm1WeWNtVmtJRDBnWkdWbVpYSW9LVHRjYmlBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNCeVpYTnZiSFpsY2loa1pXWmxjbkpsWkM1eVpYTnZiSFpsTENCa1pXWmxjbkpsWkM1eVpXcGxZM1FzSUdSbFptVnljbVZrTG01dmRHbG1lU2s3WEc0Z0lDQWdmU0JqWVhSamFDQW9jbVZoYzI5dUtTQjdYRzRnSUNBZ0lDQWdJR1JsWm1WeWNtVmtMbkpsYW1WamRDaHlaV0Z6YjI0cE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdaR1ZtWlhKeVpXUXVjSEp2YldselpUdGNibjFjYmx4dWNISnZiV2x6WlM1eVlXTmxJRDBnY21GalpUc2dMeThnUlZNMlhHNXdjbTl0YVhObExtRnNiQ0E5SUdGc2JEc2dMeThnUlZNMlhHNXdjbTl0YVhObExuSmxhbVZqZENBOUlISmxhbVZqZERzZ0x5OGdSVk0yWEc1d2NtOXRhWE5sTG5KbGMyOXNkbVVnUFNCUk95QXZMeUJGVXpaY2JseHVMeThnV0ZoWUlHVjRjR1Z5YVcxbGJuUmhiQzRnSUZSb2FYTWdiV1YwYUc5a0lHbHpJR0VnZDJGNUlIUnZJR1JsYm05MFpTQjBhR0YwSUdFZ2JHOWpZV3dnZG1Gc2RXVWdhWE5jYmk4dklITmxjbWxoYkdsNllXSnNaU0JoYm1RZ2MyaHZkV3hrSUdKbElHbHRiV1ZrYVdGMFpXeDVJR1JwYzNCaGRHTm9aV1FnZEc4Z1lTQnlaVzF2ZEdVZ2RYQnZiaUJ5WlhGMVpYTjBMRnh1THk4Z2FXNXpkR1ZoWkNCdlppQndZWE56YVc1bklHRWdjbVZtWlhKbGJtTmxMbHh1VVM1d1lYTnpRbmxEYjNCNUlEMGdablZ1WTNScGIyNGdLRzlpYW1WamRDa2dlMXh1SUNBZ0lDOHZabkpsWlhwbEtHOWlhbVZqZENrN1hHNGdJQ0FnTHk5d1lYTnpRbmxEYjNCcFpYTXVjMlYwS0c5aWFtVmpkQ3dnZEhKMVpTazdYRzRnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRHRjYm4wN1hHNWNibEJ5YjIxcGMyVXVjSEp2ZEc5MGVYQmxMbkJoYzNOQ2VVTnZjSGtnUFNCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0x5OW1jbVZsZW1Vb2IySnFaV04wS1R0Y2JpQWdJQ0F2TDNCaGMzTkNlVU52Y0dsbGN5NXpaWFFvYjJKcVpXTjBMQ0IwY25WbEtUdGNiaUFnSUNCeVpYUjFjbTRnZEdocGN6dGNibjA3WEc1Y2JpOHFLbHh1SUNvZ1NXWWdkSGR2SUhCeWIyMXBjMlZ6SUdWMlpXNTBkV0ZzYkhrZ1puVnNabWxzYkNCMGJ5QjBhR1VnYzJGdFpTQjJZV3gxWlN3Z2NISnZiV2x6WlhNZ2RHaGhkQ0IyWVd4MVpTeGNiaUFxSUdKMWRDQnZkR2hsY25kcGMyVWdjbVZxWldOMGN5NWNiaUFxSUVCd1lYSmhiU0I0SUh0QmJua3FmVnh1SUNvZ1FIQmhjbUZ0SUhrZ2UwRnVlU3A5WEc0Z0tpQkFjbVYwZFhKdWN5QjdRVzU1S24wZ1lTQndjbTl0YVhObElHWnZjaUI0SUdGdVpDQjVJR2xtSUhSb1pYa2dZWEpsSUhSb1pTQnpZVzFsTENCaWRYUWdZU0J5WldwbFkzUnBiMjVjYmlBcUlHOTBhR1Z5ZDJselpTNWNiaUFxWEc0Z0tpOWNibEV1YW05cGJpQTlJR1oxYm1OMGFXOXVJQ2g0TENCNUtTQjdYRzRnSUNBZ2NtVjBkWEp1SUZFb2VDa3VhbTlwYmloNUtUdGNibjA3WEc1Y2JsQnliMjFwYzJVdWNISnZkRzkwZVhCbExtcHZhVzRnUFNCbWRXNWpkR2x2YmlBb2RHaGhkQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQlJLRnQwYUdsekxDQjBhR0YwWFNrdWMzQnlaV0ZrS0daMWJtTjBhVzl1SUNoNExDQjVLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaDRJRDA5UFNCNUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QlVUMFJQT2lCY0lqMDlQVndpSUhOb2IzVnNaQ0JpWlNCUFltcGxZM1F1YVhNZ2IzSWdaWEYxYVhaY2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQjRPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0Z3aVEyRnVKM1FnYW05cGJqb2dibTkwSUhSb1pTQnpZVzFsT2lCY0lpQXJJSGdnS3lCY0lpQmNJaUFySUhrcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTazdYRzU5TzF4dVhHNHZLaXBjYmlBcUlGSmxkSFZ5Ym5NZ1lTQndjbTl0YVhObElHWnZjaUIwYUdVZ1ptbHljM1FnYjJZZ1lXNGdZWEp5WVhrZ2IyWWdjSEp2YldselpYTWdkRzhnWW1WamIyMWxJSE5sZEhSc1pXUXVYRzRnS2lCQWNHRnlZVzBnWVc1emQyVnljeUI3UVhKeVlYbGJRVzU1S2wxOUlIQnliMjFwYzJWeklIUnZJSEpoWTJWY2JpQXFJRUJ5WlhSMWNtNXpJSHRCYm5rcWZTQjBhR1VnWm1seWMzUWdjSEp2YldselpTQjBieUJpWlNCelpYUjBiR1ZrWEc0Z0tpOWNibEV1Y21GalpTQTlJSEpoWTJVN1hHNW1kVzVqZEdsdmJpQnlZV05sS0dGdWMzZGxjbEJ6S1NCN1hHNGdJQ0FnY21WMGRYSnVJSEJ5YjIxcGMyVW9ablZ1WTNScGIyNGdLSEpsYzI5c2RtVXNJSEpsYW1WamRDa2dlMXh1SUNBZ0lDQWdJQ0F2THlCVGQybDBZMmdnZEc4Z2RHaHBjeUJ2Ym1ObElIZGxJR05oYmlCaGMzTjFiV1VnWVhRZ2JHVmhjM1FnUlZNMVhHNGdJQ0FnSUNBZ0lDOHZJR0Z1YzNkbGNsQnpMbVp2Y2tWaFkyZ29ablZ1WTNScGIyNGdLR0Z1YzNkbGNsQXBJSHRjYmlBZ0lDQWdJQ0FnTHk4Z0lDQWdJRkVvWVc1emQyVnlVQ2t1ZEdobGJpaHlaWE52YkhabExDQnlaV3BsWTNRcE8xeHVJQ0FnSUNBZ0lDQXZMeUI5S1R0Y2JpQWdJQ0FnSUNBZ0x5OGdWWE5sSUhSb2FYTWdhVzRnZEdobElHMWxZVzUwYVcxbFhHNGdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3TENCc1pXNGdQU0JoYm5OM1pYSlFjeTVzWlc1bmRHZzdJR2tnUENCc1pXNDdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnVVNoaGJuTjNaWEpRYzF0cFhTa3VkR2hsYmloeVpYTnZiSFpsTENCeVpXcGxZM1FwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlNrN1hHNTlYRzVjYmxCeWIyMXBjMlV1Y0hKdmRHOTBlWEJsTG5KaFkyVWdQU0JtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnY21WMGRYSnVJSFJvYVhNdWRHaGxiaWhSTG5KaFkyVXBPMXh1ZlR0Y2JseHVMeW9xWEc0Z0tpQkRiMjV6ZEhKMVkzUnpJR0VnVUhKdmJXbHpaU0IzYVhSb0lHRWdjSEp2YldselpTQmtaWE5qY21sd2RHOXlJRzlpYW1WamRDQmhibVFnYjNCMGFXOXVZV3dnWm1Gc2JHSmhZMnRjYmlBcUlHWjFibU4wYVc5dUxpQWdWR2hsSUdSbGMyTnlhWEIwYjNJZ1kyOXVkR0ZwYm5NZ2JXVjBhRzlrY3lCc2FXdGxJSGRvWlc0b2NtVnFaV04wWldRcExDQm5aWFFvYm1GdFpTa3NYRzRnS2lCelpYUW9ibUZ0WlN3Z2RtRnNkV1VwTENCd2IzTjBLRzVoYldVc0lHRnlaM01wTENCaGJtUWdaR1ZzWlhSbEtHNWhiV1VwTENCM2FHbGphQ0JoYkd4Y2JpQXFJSEpsZEhWeWJpQmxhWFJvWlhJZ1lTQjJZV3gxWlN3Z1lTQndjbTl0YVhObElHWnZjaUJoSUhaaGJIVmxMQ0J2Y2lCaElISmxhbVZqZEdsdmJpNGdJRlJvWlNCbVlXeHNZbUZqYTF4dUlDb2dZV05qWlhCMGN5QjBhR1VnYjNCbGNtRjBhVzl1SUc1aGJXVXNJR0VnY21WemIyeDJaWElzSUdGdVpDQmhibmtnWm5WeWRHaGxjaUJoY21kMWJXVnVkSE1nZEdoaGRDQjNiM1ZzWkZ4dUlDb2dhR0YyWlNCaVpXVnVJR1p2Y25kaGNtUmxaQ0IwYnlCMGFHVWdZWEJ3Y205d2NtbGhkR1VnYldWMGFHOWtJR0ZpYjNabElHaGhaQ0JoSUcxbGRHaHZaQ0JpWldWdVhHNGdLaUJ3Y205MmFXUmxaQ0IzYVhSb0lIUm9aU0J3Y205d1pYSWdibUZ0WlM0Z0lGUm9aU0JCVUVrZ2JXRnJaWE1nYm04Z1ozVmhjbUZ1ZEdWbGN5QmhZbTkxZENCMGFHVWdibUYwZFhKbFhHNGdLaUJ2WmlCMGFHVWdjbVYwZFhKdVpXUWdiMkpxWldOMExDQmhjR0Z5ZENCbWNtOXRJSFJvWVhRZ2FYUWdhWE1nZFhOaFlteGxJSGRvWlhKbFpYWmxjaUJ3Y205dGFYTmxjeUJoY21WY2JpQXFJR0p2ZFdkb2RDQmhibVFnYzI5c1pDNWNiaUFxTDF4dVVTNXRZV3RsVUhKdmJXbHpaU0E5SUZCeWIyMXBjMlU3WEc1bWRXNWpkR2x2YmlCUWNtOXRhWE5sS0dSbGMyTnlhWEIwYjNJc0lHWmhiR3hpWVdOckxDQnBibk53WldOMEtTQjdYRzRnSUNBZ2FXWWdLR1poYkd4aVlXTnJJRDA5UFNCMmIybGtJREFwSUh0Y2JpQWdJQ0FnSUNBZ1ptRnNiR0poWTJzZ1BTQm1kVzVqZEdsdmJpQW9iM0FwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQnlaV3BsWTNRb2JtVjNJRVZ5Y205eUtGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGd2lVSEp2YldselpTQmtiMlZ6SUc1dmRDQnpkWEJ3YjNKMElHOXdaWEpoZEdsdmJqb2dYQ0lnS3lCdmNGeHVJQ0FnSUNBZ0lDQWdJQ0FnS1NrN1hHNGdJQ0FnSUNBZ0lIMDdYRzRnSUNBZ2ZWeHVJQ0FnSUdsbUlDaHBibk53WldOMElEMDlQU0IyYjJsa0lEQXBJSHRjYmlBZ0lDQWdJQ0FnYVc1emNHVmpkQ0E5SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUI3YzNSaGRHVTZJRndpZFc1cmJtOTNibHdpZlR0Y2JpQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNCOVhHNWNiaUFnSUNCMllYSWdjSEp2YldselpTQTlJRzlpYW1WamRGOWpjbVZoZEdVb1VISnZiV2x6WlM1d2NtOTBiM1I1Y0dVcE8xeHVYRzRnSUNBZ2NISnZiV2x6WlM1d2NtOXRhWE5sUkdsemNHRjBZMmdnUFNCbWRXNWpkR2x2YmlBb2NtVnpiMngyWlN3Z2IzQXNJR0Z5WjNNcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhKbGMzVnNkRHRjYmlBZ0lDQWdJQ0FnZEhKNUlIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaGtaWE5qY21sd2RHOXlXMjl3WFNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjM1ZzZENBOUlHUmxjMk55YVhCMGIzSmJiM0JkTG1Gd2NHeDVLSEJ5YjIxcGMyVXNJR0Z5WjNNcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhOMWJIUWdQU0JtWVd4c1ltRmpheTVqWVd4c0tIQnliMjFwYzJVc0lHOXdMQ0JoY21kektUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZTQmpZWFJqYUNBb1pYaGpaWEIwYVc5dUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYTjFiSFFnUFNCeVpXcGxZM1FvWlhoalpYQjBhVzl1S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnBaaUFvY21WemIyeDJaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVZ6YjJ4MlpTaHlaWE4xYkhRcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lIQnliMjFwYzJVdWFXNXpjR1ZqZENBOUlHbHVjM0JsWTNRN1hHNWNiaUFnSUNBdkx5QllXRmdnWkdWd2NtVmpZWFJsWkNCZ2RtRnNkV1ZQWm1BZ1lXNWtJR0JsZUdObGNIUnBiMjVnSUhOMWNIQnZjblJjYmlBZ0lDQnBaaUFvYVc1emNHVmpkQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdhVzV6Y0dWamRHVmtJRDBnYVc1emNHVmpkQ2dwTzF4dUlDQWdJQ0FnSUNCcFppQW9hVzV6Y0dWamRHVmtMbk4wWVhSbElEMDlQU0JjSW5KbGFtVmpkR1ZrWENJcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhCeWIyMXBjMlV1WlhoalpYQjBhVzl1SUQwZ2FXNXpjR1ZqZEdWa0xuSmxZWE52Ymp0Y2JpQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJSEJ5YjIxcGMyVXVkbUZzZFdWUFppQTlJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCcGJuTndaV04wWldRZ1BTQnBibk53WldOMEtDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9hVzV6Y0dWamRHVmtMbk4wWVhSbElEMDlQU0JjSW5CbGJtUnBibWRjSWlCOGZGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbHVjM0JsWTNSbFpDNXpkR0YwWlNBOVBUMGdYQ0p5WldwbFkzUmxaRndpS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhCeWIyMXBjMlU3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnYVc1emNHVmpkR1ZrTG5aaGJIVmxPMXh1SUNBZ0lDQWdJQ0I5TzF4dUlDQWdJSDFjYmx4dUlDQWdJSEpsZEhWeWJpQndjbTl0YVhObE8xeHVmVnh1WEc1UWNtOXRhWE5sTG5CeWIzUnZkSGx3WlM1MGIxTjBjbWx1WnlBOUlHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQnlaWFIxY200Z1hDSmJiMkpxWldOMElGQnliMjFwYzJWZFhDSTdYRzU5TzF4dVhHNVFjbTl0YVhObExuQnliM1J2ZEhsd1pTNTBhR1Z1SUQwZ1puVnVZM1JwYjI0Z0tHWjFiR1pwYkd4bFpDd2djbVZxWldOMFpXUXNJSEJ5YjJkeVpYTnpaV1FwSUh0Y2JpQWdJQ0IyWVhJZ2MyVnNaaUE5SUhSb2FYTTdYRzRnSUNBZ2RtRnlJR1JsWm1WeWNtVmtJRDBnWkdWbVpYSW9LVHRjYmlBZ0lDQjJZWElnWkc5dVpTQTlJR1poYkhObE95QWdJQzh2SUdWdWMzVnlaU0IwYUdVZ2RXNTBjblZ6ZEdWa0lIQnliMjFwYzJVZ2JXRnJaWE1nWVhRZ2JXOXpkQ0JoWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0F2THlCemFXNW5iR1VnWTJGc2JDQjBieUJ2Ym1VZ2IyWWdkR2hsSUdOaGJHeGlZV05yYzF4dVhHNGdJQ0FnWm5WdVkzUnBiMjRnWDJaMWJHWnBiR3hsWkNoMllXeDFaU2tnZTF4dUlDQWdJQ0FnSUNCMGNua2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhSNWNHVnZaaUJtZFd4bWFXeHNaV1FnUFQwOUlGd2lablZ1WTNScGIyNWNJaUEvSUdaMWJHWnBiR3hsWkNoMllXeDFaU2tnT2lCMllXeDFaVHRjYmlBZ0lDQWdJQ0FnZlNCallYUmphQ0FvWlhoalpYQjBhVzl1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdjbVZxWldOMEtHVjRZMlZ3ZEdsdmJpazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQm1kVzVqZEdsdmJpQmZjbVZxWldOMFpXUW9aWGhqWlhCMGFXOXVLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2NtVnFaV04wWldRZ1BUMDlJRndpWm5WdVkzUnBiMjVjSWlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYldGclpWTjBZV05yVkhKaFkyVk1iMjVuS0dWNFkyVndkR2x2Yml3Z2MyVnNaaWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJ5WldwbFkzUmxaQ2hsZUdObGNIUnBiMjRwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JqWVhSamFDQW9ibVYzUlhoalpYQjBhVzl1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhKbGFtVmpkQ2h1WlhkRmVHTmxjSFJwYjI0cE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCeVpXcGxZM1FvWlhoalpYQjBhVzl1S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0JtZFc1amRHbHZiaUJmY0hKdlozSmxjM05sWkNoMllXeDFaU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZEhsd1pXOW1JSEJ5YjJkeVpYTnpaV1FnUFQwOUlGd2lablZ1WTNScGIyNWNJaUEvSUhCeWIyZHlaWE56WldRb2RtRnNkV1VwSURvZ2RtRnNkV1U3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdVUzV1WlhoMFZHbGpheWhtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lITmxiR1l1Y0hKdmJXbHpaVVJwYzNCaGRHTm9LR1oxYm1OMGFXOXVJQ2gyWVd4MVpTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR1J2Ym1VcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQmtiMjVsSUQwZ2RISjFaVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdaR1ZtWlhKeVpXUXVjbVZ6YjJ4MlpTaGZablZzWm1sc2JHVmtLSFpoYkhWbEtTazdYRzRnSUNBZ0lDQWdJSDBzSUZ3aWQyaGxibHdpTENCYlpuVnVZM1JwYjI0Z0tHVjRZMlZ3ZEdsdmJpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR1J2Ym1VcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQmtiMjVsSUQwZ2RISjFaVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdaR1ZtWlhKeVpXUXVjbVZ6YjJ4MlpTaGZjbVZxWldOMFpXUW9aWGhqWlhCMGFXOXVLU2s3WEc0Z0lDQWdJQ0FnSUgxZEtUdGNiaUFnSUNCOUtUdGNibHh1SUNBZ0lDOHZJRkJ5YjJkeVpYTnpJSEJ5YjNCaFoyRjBiM0lnYm1WbFpDQjBieUJpWlNCaGRIUmhZMmhsWkNCcGJpQjBhR1VnWTNWeWNtVnVkQ0IwYVdOckxseHVJQ0FnSUhObGJHWXVjSEp2YldselpVUnBjM0JoZEdOb0tIWnZhV1FnTUN3Z1hDSjNhR1Z1WENJc0lGdDJiMmxrSURBc0lHWjFibU4wYVc5dUlDaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnYm1WM1ZtRnNkV1U3WEc0Z0lDQWdJQ0FnSUhaaGNpQjBhSEpsZHlBOUlHWmhiSE5sTzF4dUlDQWdJQ0FnSUNCMGNua2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2JtVjNWbUZzZFdVZ1BTQmZjSEp2WjNKbGMzTmxaQ2gyWVd4MVpTazdYRzRnSUNBZ0lDQWdJSDBnWTJGMFkyZ2dLR1VwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvY21WM0lEMGdkSEoxWlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoUkxtOXVaWEp5YjNJcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQlJMbTl1WlhKeWIzSW9aU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUm9jbTkzSUdVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQnBaaUFvSVhSb2NtVjNLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmtaV1psY25KbFpDNXViM1JwWm5rb2JtVjNWbUZzZFdVcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZWMHBPMXh1WEc0Z0lDQWdjbVYwZFhKdUlHUmxabVZ5Y21Wa0xuQnliMjFwYzJVN1hHNTlPMXh1WEc1UkxuUmhjQ0E5SUdaMWJtTjBhVzl1SUNod2NtOXRhWE5sTENCallXeHNZbUZqYXlrZ2UxeHVJQ0FnSUhKbGRIVnliaUJSS0hCeWIyMXBjMlVwTG5SaGNDaGpZV3hzWW1GamF5azdYRzU5TzF4dVhHNHZLaXBjYmlBcUlGZHZjbXR6SUdGc2JXOXpkQ0JzYVd0bElGd2labWx1WVd4c2VWd2lMQ0JpZFhRZ2JtOTBJR05oYkd4bFpDQm1iM0lnY21WcVpXTjBhVzl1Y3k1Y2JpQXFJRTl5YVdkcGJtRnNJSEpsYzI5c2RYUnBiMjRnZG1Gc2RXVWdhWE1nY0dGemMyVmtJSFJvY205MVoyZ2dZMkZzYkdKaFkyc2dkVzVoWm1abFkzUmxaQzVjYmlBcUlFTmhiR3hpWVdOcklHMWhlU0J5WlhSMWNtNGdZU0J3Y205dGFYTmxJSFJvWVhRZ2QybHNiQ0JpWlNCaGQyRnBkR1ZrSUdadmNpNWNiaUFxSUVCd1lYSmhiU0I3Um5WdVkzUnBiMjU5SUdOaGJHeGlZV05yWEc0Z0tpQkFjbVYwZFhKdWN5QjdVUzVRY205dGFYTmxmVnh1SUNvZ1FHVjRZVzF3YkdWY2JpQXFJR1J2VTI5dFpYUm9hVzVuS0NsY2JpQXFJQ0FnTG5Sb1pXNG9MaTR1S1Z4dUlDb2dJQ0F1ZEdGd0tHTnZibk52YkdVdWJHOW5LVnh1SUNvZ0lDQXVkR2hsYmlndUxpNHBPMXh1SUNvdlhHNVFjbTl0YVhObExuQnliM1J2ZEhsd1pTNTBZWEFnUFNCbWRXNWpkR2x2YmlBb1kyRnNiR0poWTJzcElIdGNiaUFnSUNCallXeHNZbUZqYXlBOUlGRW9ZMkZzYkdKaFkyc3BPMXh1WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE11ZEdobGJpaG1kVzVqZEdsdmJpQW9kbUZzZFdVcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHTmhiR3hpWVdOckxtWmpZV3hzS0haaGJIVmxLUzUwYUdWdVVtVnpiMngyWlNoMllXeDFaU2s3WEc0Z0lDQWdmU2s3WEc1OU8xeHVYRzR2S2lwY2JpQXFJRkpsWjJsemRHVnljeUJoYmlCdlluTmxjblpsY2lCdmJpQmhJSEJ5YjIxcGMyVXVYRzRnS2x4dUlDb2dSM1ZoY21GdWRHVmxjenBjYmlBcVhHNGdLaUF4TGlCMGFHRjBJR1oxYkdacGJHeGxaQ0JoYm1RZ2NtVnFaV04wWldRZ2QybHNiQ0JpWlNCallXeHNaV1FnYjI1c2VTQnZibU5sTGx4dUlDb2dNaTRnZEdoaGRDQmxhWFJvWlhJZ2RHaGxJR1oxYkdacGJHeGxaQ0JqWVd4c1ltRmpheUJ2Y2lCMGFHVWdjbVZxWldOMFpXUWdZMkZzYkdKaFkyc2dkMmxzYkNCaVpWeHVJQ29nSUNBZ1kyRnNiR1ZrTENCaWRYUWdibTkwSUdKdmRHZ3VYRzRnS2lBekxpQjBhR0YwSUdaMWJHWnBiR3hsWkNCaGJtUWdjbVZxWldOMFpXUWdkMmxzYkNCdWIzUWdZbVVnWTJGc2JHVmtJR2x1SUhSb2FYTWdkSFZ5Ymk1Y2JpQXFYRzRnS2lCQWNHRnlZVzBnZG1Gc2RXVWdJQ0FnSUNCd2NtOXRhWE5sSUc5eUlHbHRiV1ZrYVdGMFpTQnlaV1psY21WdVkyVWdkRzhnYjJKelpYSjJaVnh1SUNvZ1FIQmhjbUZ0SUdaMWJHWnBiR3hsWkNBZ1puVnVZM1JwYjI0Z2RHOGdZbVVnWTJGc2JHVmtJSGRwZEdnZ2RHaGxJR1oxYkdacGJHeGxaQ0IyWVd4MVpWeHVJQ29nUUhCaGNtRnRJSEpsYW1WamRHVmtJQ0FnWm5WdVkzUnBiMjRnZEc4Z1ltVWdZMkZzYkdWa0lIZHBkR2dnZEdobElISmxhbVZqZEdsdmJpQmxlR05sY0hScGIyNWNiaUFxSUVCd1lYSmhiU0J3Y205bmNtVnpjMlZrSUdaMWJtTjBhVzl1SUhSdklHSmxJR05oYkd4bFpDQnZiaUJoYm5rZ2NISnZaM0psYzNNZ2JtOTBhV1pwWTJGMGFXOXVjMXh1SUNvZ1FISmxkSFZ5YmlCd2NtOXRhWE5sSUdadmNpQjBhR1VnY21WMGRYSnVJSFpoYkhWbElHWnliMjBnZEdobElHbHVkbTlyWldRZ1kyRnNiR0poWTJ0Y2JpQXFMMXh1VVM1M2FHVnVJRDBnZDJobGJqdGNibVoxYm1OMGFXOXVJSGRvWlc0b2RtRnNkV1VzSUdaMWJHWnBiR3hsWkN3Z2NtVnFaV04wWldRc0lIQnliMmR5WlhOelpXUXBJSHRjYmlBZ0lDQnlaWFIxY200Z1VTaDJZV3gxWlNrdWRHaGxiaWhtZFd4bWFXeHNaV1FzSUhKbGFtVmpkR1ZrTENCd2NtOW5jbVZ6YzJWa0tUdGNibjFjYmx4dVVISnZiV2x6WlM1d2NtOTBiM1I1Y0dVdWRHaGxibEpsYzI5c2RtVWdQU0JtZFc1amRHbHZiaUFvZG1Gc2RXVXBJSHRjYmlBZ0lDQnlaWFIxY200Z2RHaHBjeTUwYUdWdUtHWjFibU4wYVc5dUlDZ3BJSHNnY21WMGRYSnVJSFpoYkhWbE95QjlLVHRjYm4wN1hHNWNibEV1ZEdobGJsSmxjMjlzZG1VZ1BTQm1kVzVqZEdsdmJpQW9jSEp2YldselpTd2dkbUZzZFdVcElIdGNiaUFnSUNCeVpYUjFjbTRnVVNod2NtOXRhWE5sS1M1MGFHVnVVbVZ6YjJ4MlpTaDJZV3gxWlNrN1hHNTlPMXh1WEc1UWNtOXRhWE5sTG5CeWIzUnZkSGx3WlM1MGFHVnVVbVZxWldOMElEMGdablZ1WTNScGIyNGdLSEpsWVhOdmJpa2dlMXh1SUNBZ0lISmxkSFZ5YmlCMGFHbHpMblJvWlc0b1puVnVZM1JwYjI0Z0tDa2dleUIwYUhKdmR5QnlaV0Z6YjI0N0lIMHBPMXh1ZlR0Y2JseHVVUzUwYUdWdVVtVnFaV04wSUQwZ1puVnVZM1JwYjI0Z0tIQnliMjFwYzJVc0lISmxZWE52YmlrZ2UxeHVJQ0FnSUhKbGRIVnliaUJSS0hCeWIyMXBjMlVwTG5Sb1pXNVNaV3BsWTNRb2NtVmhjMjl1S1R0Y2JuMDdYRzVjYmk4cUtseHVJQ29nU1dZZ1lXNGdiMkpxWldOMElHbHpJRzV2ZENCaElIQnliMjFwYzJVc0lHbDBJR2x6SUdGeklGd2libVZoY2x3aUlHRnpJSEJ2YzNOcFlteGxMbHh1SUNvZ1NXWWdZU0J3Y205dGFYTmxJR2x6SUhKbGFtVmpkR1ZrTENCcGRDQnBjeUJoY3lCY0ltNWxZWEpjSWlCaGN5QndiM056YVdKc1pTQjBiMjh1WEc0Z0tpQkpaaUJwZE9LQW1YTWdZU0JtZFd4bWFXeHNaV1FnY0hKdmJXbHpaU3dnZEdobElHWjFiR1pwYkd4dFpXNTBJSFpoYkhWbElHbHpJRzVsWVhKbGNpNWNiaUFxSUVsbUlHbDA0b0NaY3lCaElHUmxabVZ5Y21Wa0lIQnliMjFwYzJVZ1lXNWtJSFJvWlNCa1pXWmxjbkpsWkNCb1lYTWdZbVZsYmlCeVpYTnZiSFpsWkN3Z2RHaGxYRzRnS2lCeVpYTnZiSFYwYVc5dUlHbHpJRndpYm1WaGNtVnlYQ0l1WEc0Z0tpQkFjR0Z5WVcwZ2IySnFaV04wWEc0Z0tpQkFjbVYwZFhKdWN5QnRiM04wSUhKbGMyOXNkbVZrSUNodVpXRnlaWE4wS1NCbWIzSnRJRzltSUhSb1pTQnZZbXBsWTNSY2JpQXFMMXh1WEc0dkx5QllXRmdnYzJodmRXeGtJSGRsSUhKbExXUnZJSFJvYVhNL1hHNVJMbTVsWVhKbGNpQTlJRzVsWVhKbGNqdGNibVoxYm1OMGFXOXVJRzVsWVhKbGNpaDJZV3gxWlNrZ2UxeHVJQ0FnSUdsbUlDaHBjMUJ5YjIxcGMyVW9kbUZzZFdVcEtTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCcGJuTndaV04wWldRZ1BTQjJZV3gxWlM1cGJuTndaV04wS0NrN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hwYm5Od1pXTjBaV1F1YzNSaGRHVWdQVDA5SUZ3aVpuVnNabWxzYkdWa1hDSXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCcGJuTndaV04wWldRdWRtRnNkV1U3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlIWmhiSFZsTzF4dWZWeHVYRzR2S2lwY2JpQXFJRUJ5WlhSMWNtNXpJSGRvWlhSb1pYSWdkR2hsSUdkcGRtVnVJRzlpYW1WamRDQnBjeUJoSUhCeWIyMXBjMlV1WEc0Z0tpQlBkR2hsY25kcGMyVWdhWFFnYVhNZ1lTQm1kV3htYVd4c1pXUWdkbUZzZFdVdVhHNGdLaTljYmxFdWFYTlFjbTl0YVhObElEMGdhWE5RY205dGFYTmxPMXh1Wm5WdVkzUnBiMjRnYVhOUWNtOXRhWE5sS0c5aWFtVmpkQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQnZZbXBsWTNRZ2FXNXpkR0Z1WTJWdlppQlFjbTl0YVhObE8xeHVmVnh1WEc1UkxtbHpVSEp2YldselpVRnNhV3RsSUQwZ2FYTlFjbTl0YVhObFFXeHBhMlU3WEc1bWRXNWpkR2x2YmlCcGMxQnliMjFwYzJWQmJHbHJaU2h2WW1wbFkzUXBJSHRjYmlBZ0lDQnlaWFIxY200Z2FYTlBZbXBsWTNRb2IySnFaV04wS1NBbUppQjBlWEJsYjJZZ2IySnFaV04wTG5Sb1pXNGdQVDA5SUZ3aVpuVnVZM1JwYjI1Y0lqdGNibjFjYmx4dUx5b3FYRzRnS2lCQWNtVjBkWEp1Y3lCM2FHVjBhR1Z5SUhSb1pTQm5hWFpsYmlCdlltcGxZM1FnYVhNZ1lTQndaVzVrYVc1bklIQnliMjFwYzJVc0lHMWxZVzVwYm1jZ2JtOTBYRzRnS2lCbWRXeG1hV3hzWldRZ2IzSWdjbVZxWldOMFpXUXVYRzRnS2k5Y2JsRXVhWE5RWlc1a2FXNW5JRDBnYVhOUVpXNWthVzVuTzF4dVpuVnVZM1JwYjI0Z2FYTlFaVzVrYVc1bktHOWlhbVZqZENrZ2UxeHVJQ0FnSUhKbGRIVnliaUJwYzFCeWIyMXBjMlVvYjJKcVpXTjBLU0FtSmlCdlltcGxZM1F1YVc1emNHVmpkQ2dwTG5OMFlYUmxJRDA5UFNCY0luQmxibVJwYm1kY0lqdGNibjFjYmx4dVVISnZiV2x6WlM1d2NtOTBiM1I1Y0dVdWFYTlFaVzVrYVc1bklEMGdablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQjBhR2x6TG1sdWMzQmxZM1FvS1M1emRHRjBaU0E5UFQwZ1hDSndaVzVrYVc1blhDSTdYRzU5TzF4dVhHNHZLaXBjYmlBcUlFQnlaWFIxY201eklIZG9aWFJvWlhJZ2RHaGxJR2RwZG1WdUlHOWlhbVZqZENCcGN5QmhJSFpoYkhWbElHOXlJR1oxYkdacGJHeGxaRnh1SUNvZ2NISnZiV2x6WlM1Y2JpQXFMMXh1VVM1cGMwWjFiR1pwYkd4bFpDQTlJR2x6Um5Wc1ptbHNiR1ZrTzF4dVpuVnVZM1JwYjI0Z2FYTkdkV3htYVd4c1pXUW9iMkpxWldOMEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUNGcGMxQnliMjFwYzJVb2IySnFaV04wS1NCOGZDQnZZbXBsWTNRdWFXNXpjR1ZqZENncExuTjBZWFJsSUQwOVBTQmNJbVoxYkdacGJHeGxaRndpTzF4dWZWeHVYRzVRY205dGFYTmxMbkJ5YjNSdmRIbHdaUzVwYzBaMWJHWnBiR3hsWkNBOUlHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQnlaWFIxY200Z2RHaHBjeTVwYm5Od1pXTjBLQ2t1YzNSaGRHVWdQVDA5SUZ3aVpuVnNabWxzYkdWa1hDSTdYRzU5TzF4dVhHNHZLaXBjYmlBcUlFQnlaWFIxY201eklIZG9aWFJvWlhJZ2RHaGxJR2RwZG1WdUlHOWlhbVZqZENCcGN5QmhJSEpsYW1WamRHVmtJSEJ5YjIxcGMyVXVYRzRnS2k5Y2JsRXVhWE5TWldwbFkzUmxaQ0E5SUdselVtVnFaV04wWldRN1hHNW1kVzVqZEdsdmJpQnBjMUpsYW1WamRHVmtLRzlpYW1WamRDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCcGMxQnliMjFwYzJVb2IySnFaV04wS1NBbUppQnZZbXBsWTNRdWFXNXpjR1ZqZENncExuTjBZWFJsSUQwOVBTQmNJbkpsYW1WamRHVmtYQ0k3WEc1OVhHNWNibEJ5YjIxcGMyVXVjSEp2ZEc5MGVYQmxMbWx6VW1WcVpXTjBaV1FnUFNCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUhSb2FYTXVhVzV6Y0dWamRDZ3BMbk4wWVhSbElEMDlQU0JjSW5KbGFtVmpkR1ZrWENJN1hHNTlPMXh1WEc0dkx5OHZJRUpGUjBsT0lGVk9TRUZPUkV4RlJDQlNSVXBGUTFSSlQwNGdWRkpCUTB0SlRrZGNibHh1THk4Z1ZHaHBjeUJ3Y205dGFYTmxJR3hwWW5KaGNua2dZMjl1YzNWdFpYTWdaWGhqWlhCMGFXOXVjeUIwYUhKdmQyNGdhVzRnYUdGdVpHeGxjbk1nYzI4Z2RHaGxlU0JqWVc0Z1ltVmNiaTh2SUdoaGJtUnNaV1FnWW5rZ1lTQnpkV0p6WlhGMVpXNTBJSEJ5YjIxcGMyVXVJQ0JVYUdVZ1pYaGpaWEIwYVc5dWN5Qm5aWFFnWVdSa1pXUWdkRzhnZEdocGN5QmhjbkpoZVNCM2FHVnVYRzR2THlCMGFHVjVJR0Z5WlNCamNtVmhkR1ZrTENCaGJtUWdjbVZ0YjNabFpDQjNhR1Z1SUhSb1pYa2dZWEpsSUdoaGJtUnNaV1F1SUNCT2IzUmxJSFJvWVhRZ2FXNGdSVk0ySUc5eVhHNHZMeUJ6YUdsdGJXVmtJR1Z1ZG1seWIyNXRaVzUwY3l3Z2RHaHBjeUIzYjNWc1pDQnVZWFIxY21Gc2JIa2dZbVVnWVNCZ1UyVjBZQzVjYm5aaGNpQjFibWhoYm1Sc1pXUlNaV0Z6YjI1eklEMGdXMTA3WEc1MllYSWdkVzVvWVc1a2JHVmtVbVZxWldOMGFXOXVjeUE5SUZ0ZE8xeHVkbUZ5SUhKbGNHOXlkR1ZrVlc1b1lXNWtiR1ZrVW1WcVpXTjBhVzl1Y3lBOUlGdGRPMXh1ZG1GeUlIUnlZV05yVlc1b1lXNWtiR1ZrVW1WcVpXTjBhVzl1Y3lBOUlIUnlkV1U3WEc1Y2JtWjFibU4wYVc5dUlISmxjMlYwVlc1b1lXNWtiR1ZrVW1WcVpXTjBhVzl1Y3lncElIdGNiaUFnSUNCMWJtaGhibVJzWldSU1pXRnpiMjV6TG14bGJtZDBhQ0E5SURBN1hHNGdJQ0FnZFc1b1lXNWtiR1ZrVW1WcVpXTjBhVzl1Y3k1c1pXNW5kR2dnUFNBd08xeHVYRzRnSUNBZ2FXWWdLQ0YwY21GamExVnVhR0Z1Wkd4bFpGSmxhbVZqZEdsdmJuTXBJSHRjYmlBZ0lDQWdJQ0FnZEhKaFkydFZibWhoYm1Sc1pXUlNaV3BsWTNScGIyNXpJRDBnZEhKMVpUdGNiaUFnSUNCOVhHNTlYRzVjYm1aMWJtTjBhVzl1SUhSeVlXTnJVbVZxWldOMGFXOXVLSEJ5YjIxcGMyVXNJSEpsWVhOdmJpa2dlMXh1SUNBZ0lHbG1JQ2doZEhKaFkydFZibWhoYm1Sc1pXUlNaV3BsWTNScGIyNXpLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQjlYRzRnSUNBZ2FXWWdLSFI1Y0dWdlppQndjbTlqWlhOeklEMDlQU0JjSW05aWFtVmpkRndpSUNZbUlIUjVjR1Z2WmlCd2NtOWpaWE56TG1WdGFYUWdQVDA5SUZ3aVpuVnVZM1JwYjI1Y0lpa2dlMXh1SUNBZ0lDQWdJQ0JSTG01bGVIUlVhV05yTG5KMWJrRm1kR1Z5S0daMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaGhjbkpoZVY5cGJtUmxlRTltS0hWdWFHRnVaR3hsWkZKbGFtVmpkR2x2Ym5Nc0lIQnliMjFwYzJVcElDRTlQU0F0TVNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIQnliMk5sYzNNdVpXMXBkQ2hjSW5WdWFHRnVaR3hsWkZKbGFtVmpkR2x2Ymx3aUxDQnlaV0Z6YjI0c0lIQnliMjFwYzJVcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjRzl5ZEdWa1ZXNW9ZVzVrYkdWa1VtVnFaV04wYVc5dWN5NXdkWE5vS0hCeWIyMXBjMlVwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0IxYm1oaGJtUnNaV1JTWldwbFkzUnBiMjV6TG5CMWMyZ29jSEp2YldselpTazdYRzRnSUNBZ2FXWWdLSEpsWVhOdmJpQW1KaUIwZVhCbGIyWWdjbVZoYzI5dUxuTjBZV05ySUNFOVBTQmNJblZ1WkdWbWFXNWxaRndpS1NCN1hHNGdJQ0FnSUNBZ0lIVnVhR0Z1Wkd4bFpGSmxZWE52Ym5NdWNIVnphQ2h5WldGemIyNHVjM1JoWTJzcE8xeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhWdWFHRnVaR3hsWkZKbFlYTnZibk11Y0hWemFDaGNJaWh1YnlCemRHRmpheWtnWENJZ0t5QnlaV0Z6YjI0cE8xeHVJQ0FnSUgxY2JuMWNibHh1Wm5WdVkzUnBiMjRnZFc1MGNtRmphMUpsYW1WamRHbHZiaWh3Y205dGFYTmxLU0I3WEc0Z0lDQWdhV1lnS0NGMGNtRmphMVZ1YUdGdVpHeGxaRkpsYW1WamRHbHZibk1wSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJSDFjYmx4dUlDQWdJSFpoY2lCaGRDQTlJR0Z5Y21GNVgybHVaR1Y0VDJZb2RXNW9ZVzVrYkdWa1VtVnFaV04wYVc5dWN5d2djSEp2YldselpTazdYRzRnSUNBZ2FXWWdLR0YwSUNFOVBTQXRNU2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIQnliMk5sYzNNZ1BUMDlJRndpYjJKcVpXTjBYQ0lnSmlZZ2RIbHdaVzltSUhCeWIyTmxjM011WlcxcGRDQTlQVDBnWENKbWRXNWpkR2x2Ymx3aUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCUkxtNWxlSFJVYVdOckxuSjFia0ZtZEdWeUtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ1lYUlNaWEJ2Y25RZ1BTQmhjbkpoZVY5cGJtUmxlRTltS0hKbGNHOXlkR1ZrVlc1b1lXNWtiR1ZrVW1WcVpXTjBhVzl1Y3l3Z2NISnZiV2x6WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR0YwVW1Wd2IzSjBJQ0U5UFNBdE1Ta2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCd2NtOWpaWE56TG1WdGFYUW9YQ0p5WldwbFkzUnBiMjVJWVc1a2JHVmtYQ0lzSUhWdWFHRnVaR3hsWkZKbFlYTnZibk5iWVhSZExDQndjbTl0YVhObEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21Wd2IzSjBaV1JWYm1oaGJtUnNaV1JTWldwbFkzUnBiMjV6TG5Od2JHbGpaU2hoZEZKbGNHOXlkQ3dnTVNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdkVzVvWVc1a2JHVmtVbVZxWldOMGFXOXVjeTV6Y0d4cFkyVW9ZWFFzSURFcE8xeHVJQ0FnSUNBZ0lDQjFibWhoYm1Sc1pXUlNaV0Z6YjI1ekxuTndiR2xqWlNoaGRDd2dNU2s3WEc0Z0lDQWdmVnh1ZlZ4dVhHNVJMbkpsYzJWMFZXNW9ZVzVrYkdWa1VtVnFaV04wYVc5dWN5QTlJSEpsYzJWMFZXNW9ZVzVrYkdWa1VtVnFaV04wYVc5dWN6dGNibHh1VVM1blpYUlZibWhoYm1Sc1pXUlNaV0Z6YjI1eklEMGdablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQzh2SUUxaGEyVWdZU0JqYjNCNUlITnZJSFJvWVhRZ1kyOXVjM1Z0WlhKeklHTmhiaWQwSUdsdWRHVnlabVZ5WlNCM2FYUm9JRzkxY2lCcGJuUmxjbTVoYkNCemRHRjBaUzVjYmlBZ0lDQnlaWFIxY200Z2RXNW9ZVzVrYkdWa1VtVmhjMjl1Y3k1emJHbGpaU2dwTzF4dWZUdGNibHh1VVM1emRHOXdWVzVvWVc1a2JHVmtVbVZxWldOMGFXOXVWSEpoWTJ0cGJtY2dQU0JtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnY21WelpYUlZibWhoYm1Sc1pXUlNaV3BsWTNScGIyNXpLQ2s3WEc0Z0lDQWdkSEpoWTJ0VmJtaGhibVJzWldSU1pXcGxZM1JwYjI1eklEMGdabUZzYzJVN1hHNTlPMXh1WEc1eVpYTmxkRlZ1YUdGdVpHeGxaRkpsYW1WamRHbHZibk1vS1R0Y2JseHVMeTh2THlCRlRrUWdWVTVJUVU1RVRFVkVJRkpGU2tWRFZFbFBUaUJVVWtGRFMwbE9SMXh1WEc0dktpcGNiaUFxSUVOdmJuTjBjblZqZEhNZ1lTQnlaV3BsWTNSbFpDQndjbTl0YVhObExseHVJQ29nUUhCaGNtRnRJSEpsWVhOdmJpQjJZV3gxWlNCa1pYTmpjbWxpYVc1bklIUm9aU0JtWVdsc2RYSmxYRzRnS2k5Y2JsRXVjbVZxWldOMElEMGdjbVZxWldOME8xeHVablZ1WTNScGIyNGdjbVZxWldOMEtISmxZWE52YmlrZ2UxeHVJQ0FnSUhaaGNpQnlaV3BsWTNScGIyNGdQU0JRY205dGFYTmxLSHRjYmlBZ0lDQWdJQ0FnWENKM2FHVnVYQ0k2SUdaMWJtTjBhVzl1SUNoeVpXcGxZM1JsWkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z2JtOTBaU0IwYUdGMElIUm9aU0JsY25KdmNpQm9ZWE1nWW1WbGJpQm9ZVzVrYkdWa1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2NtVnFaV04wWldRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFiblJ5WVdOclVtVnFaV04wYVc5dUtIUm9hWE1wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhKbGFtVmpkR1ZrSUQ4Z2NtVnFaV04wWldRb2NtVmhjMjl1S1NBNklIUm9hWE03WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TENCbWRXNWpkR2x2YmlCbVlXeHNZbUZqYXlncElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIUm9hWE03WEc0Z0lDQWdmU3dnWm5WdVkzUnBiMjRnYVc1emNHVmpkQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhzZ2MzUmhkR1U2SUZ3aWNtVnFaV04wWldSY0lpd2djbVZoYzI5dU9pQnlaV0Z6YjI0Z2ZUdGNiaUFnSUNCOUtUdGNibHh1SUNBZ0lDOHZJRTV2ZEdVZ2RHaGhkQ0IwYUdVZ2NtVmhjMjl1SUdoaGN5QnViM1FnWW1WbGJpQm9ZVzVrYkdWa0xseHVJQ0FnSUhSeVlXTnJVbVZxWldOMGFXOXVLSEpsYW1WamRHbHZiaXdnY21WaGMyOXVLVHRjYmx4dUlDQWdJSEpsZEhWeWJpQnlaV3BsWTNScGIyNDdYRzU5WEc1Y2JpOHFLbHh1SUNvZ1EyOXVjM1J5ZFdOMGN5QmhJR1oxYkdacGJHeGxaQ0J3Y205dGFYTmxJR1p2Y2lCaGJpQnBiVzFsWkdsaGRHVWdjbVZtWlhKbGJtTmxMbHh1SUNvZ1FIQmhjbUZ0SUhaaGJIVmxJR2x0YldWa2FXRjBaU0J5WldabGNtVnVZMlZjYmlBcUwxeHVVUzVtZFd4bWFXeHNJRDBnWm5Wc1ptbHNiRHRjYm1aMWJtTjBhVzl1SUdaMWJHWnBiR3dvZG1Gc2RXVXBJSHRjYmlBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlNoN1hHNGdJQ0FnSUNBZ0lGd2lkMmhsYmx3aU9pQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2RtRnNkV1U3WEc0Z0lDQWdJQ0FnSUgwc1hHNGdJQ0FnSUNBZ0lGd2laMlYwWENJNklHWjFibU4wYVc5dUlDaHVZVzFsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdkbUZzZFdWYmJtRnRaVjA3WEc0Z0lDQWdJQ0FnSUgwc1hHNGdJQ0FnSUNBZ0lGd2ljMlYwWENJNklHWjFibU4wYVc5dUlDaHVZVzFsTENCeWFITXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhiSFZsVzI1aGJXVmRJRDBnY21oek8xeHVJQ0FnSUNBZ0lDQjlMRnh1SUNBZ0lDQWdJQ0JjSW1SbGJHVjBaVndpT2lCbWRXNWpkR2x2YmlBb2JtRnRaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdaR1ZzWlhSbElIWmhiSFZsVzI1aGJXVmRPMXh1SUNBZ0lDQWdJQ0I5TEZ4dUlDQWdJQ0FnSUNCY0luQnZjM1JjSWpvZ1puVnVZM1JwYjI0Z0tHNWhiV1VzSUdGeVozTXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJRTFoY21zZ1RXbHNiR1Z5SUhCeWIzQnZjMlZ6SUhSb1lYUWdjRzl6ZENCM2FYUm9JRzV2SUc1aGJXVWdjMmh2ZFd4a0lHRndjR3g1SUdGY2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUhCeWIyMXBjMlZrSUdaMWJtTjBhVzl1TGx4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0c1aGJXVWdQVDA5SUc1MWJHd2dmSHdnYm1GdFpTQTlQVDBnZG05cFpDQXdLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJSFpoYkhWbExtRndjR3g1S0hadmFXUWdNQ3dnWVhKbmN5azdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUIyWVd4MVpWdHVZVzFsWFM1aGNIQnNlU2gyWVd4MVpTd2dZWEpuY3lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgwc1hHNGdJQ0FnSUNBZ0lGd2lZWEJ3YkhsY0lqb2dablZ1WTNScGIyNGdLSFJvYVhOd0xDQmhjbWR6S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdkbUZzZFdVdVlYQndiSGtvZEdocGMzQXNJR0Z5WjNNcE8xeHVJQ0FnSUNBZ0lDQjlMRnh1SUNBZ0lDQWdJQ0JjSW10bGVYTmNJam9nWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGOXJaWGx6S0haaGJIVmxLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzSUhadmFXUWdNQ3dnWm5WdVkzUnBiMjRnYVc1emNHVmpkQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhzZ2MzUmhkR1U2SUZ3aVpuVnNabWxzYkdWa1hDSXNJSFpoYkhWbE9pQjJZV3gxWlNCOU8xeHVJQ0FnSUgwcE8xeHVmVnh1WEc0dktpcGNiaUFxSUVOdmJuWmxjblJ6SUhSb1pXNWhZbXhsY3lCMGJ5QlJJSEJ5YjIxcGMyVnpMbHh1SUNvZ1FIQmhjbUZ0SUhCeWIyMXBjMlVnZEdobGJtRmliR1VnY0hKdmJXbHpaVnh1SUNvZ1FISmxkSFZ5Ym5NZ1lTQlJJSEJ5YjIxcGMyVmNiaUFxTDF4dVpuVnVZM1JwYjI0Z1kyOWxjbU5sS0hCeWIyMXBjMlVwSUh0Y2JpQWdJQ0IyWVhJZ1pHVm1aWEp5WldRZ1BTQmtaV1psY2lncE8xeHVJQ0FnSUZFdWJtVjRkRlJwWTJzb1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0IwY25rZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY0hKdmJXbHpaUzUwYUdWdUtHUmxabVZ5Y21Wa0xuSmxjMjlzZG1Vc0lHUmxabVZ5Y21Wa0xuSmxhbVZqZEN3Z1pHVm1aWEp5WldRdWJtOTBhV1o1S1R0Y2JpQWdJQ0FnSUNBZ2ZTQmpZWFJqYUNBb1pYaGpaWEIwYVc5dUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCa1pXWmxjbkpsWkM1eVpXcGxZM1FvWlhoalpYQjBhVzl1S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwcE8xeHVJQ0FnSUhKbGRIVnliaUJrWldabGNuSmxaQzV3Y205dGFYTmxPMXh1ZlZ4dVhHNHZLaXBjYmlBcUlFRnVibTkwWVhSbGN5QmhiaUJ2WW1wbFkzUWdjM1ZqYUNCMGFHRjBJR2wwSUhkcGJHd2dibVYyWlhJZ1ltVmNiaUFxSUhSeVlXNXpabVZ5Y21Wa0lHRjNZWGtnWm5KdmJTQjBhR2x6SUhCeWIyTmxjM01nYjNabGNpQmhibmtnY0hKdmJXbHpaVnh1SUNvZ1kyOXRiWFZ1YVdOaGRHbHZiaUJqYUdGdWJtVnNMbHh1SUNvZ1FIQmhjbUZ0SUc5aWFtVmpkRnh1SUNvZ1FISmxkSFZ5Ym5NZ2NISnZiV2x6WlNCaElIZHlZWEJ3YVc1bklHOW1JSFJvWVhRZ2IySnFaV04wSUhSb1lYUmNiaUFxSUdGa1pHbDBhVzl1WVd4c2VTQnlaWE53YjI1a2N5QjBieUIwYUdVZ1hDSnBjMFJsWmx3aUlHMWxjM05oWjJWY2JpQXFJSGRwZEdodmRYUWdZU0J5WldwbFkzUnBiMjR1WEc0Z0tpOWNibEV1YldGemRHVnlJRDBnYldGemRHVnlPMXh1Wm5WdVkzUnBiMjRnYldGemRHVnlLRzlpYW1WamRDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCUWNtOXRhWE5sS0h0Y2JpQWdJQ0FnSUNBZ1hDSnBjMFJsWmx3aU9pQm1kVzVqZEdsdmJpQW9LU0I3ZlZ4dUlDQWdJSDBzSUdaMWJtTjBhVzl1SUdaaGJHeGlZV05yS0c5d0xDQmhjbWR6S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCa2FYTndZWFJqYUNodlltcGxZM1FzSUc5d0xDQmhjbWR6S1R0Y2JpQWdJQ0I5TENCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQlJLRzlpYW1WamRDa3VhVzV6Y0dWamRDZ3BPMXh1SUNBZ0lIMHBPMXh1ZlZ4dVhHNHZLaXBjYmlBcUlGTndjbVZoWkhNZ2RHaGxJSFpoYkhWbGN5QnZaaUJoSUhCeWIyMXBjMlZrSUdGeWNtRjVJRzltSUdGeVozVnRaVzUwY3lCcGJuUnZJSFJvWlZ4dUlDb2dablZzWm1sc2JHMWxiblFnWTJGc2JHSmhZMnN1WEc0Z0tpQkFjR0Z5WVcwZ1puVnNabWxzYkdWa0lHTmhiR3hpWVdOcklIUm9ZWFFnY21WalpXbDJaWE1nZG1GeWFXRmthV01nWVhKbmRXMWxiblJ6SUdaeWIyMGdkR2hsWEc0Z0tpQndjbTl0YVhObFpDQmhjbkpoZVZ4dUlDb2dRSEJoY21GdElISmxhbVZqZEdWa0lHTmhiR3hpWVdOcklIUm9ZWFFnY21WalpXbDJaWE1nZEdobElHVjRZMlZ3ZEdsdmJpQnBaaUIwYUdVZ2NISnZiV2x6WlZ4dUlDb2dhWE1nY21WcVpXTjBaV1F1WEc0Z0tpQkFjbVYwZFhKdWN5QmhJSEJ5YjIxcGMyVWdabTl5SUhSb1pTQnlaWFIxY200Z2RtRnNkV1VnYjNJZ2RHaHliM2R1SUdWNFkyVndkR2x2YmlCdlpseHVJQ29nWldsMGFHVnlJR05oYkd4aVlXTnJMbHh1SUNvdlhHNVJMbk53Y21WaFpDQTlJSE53Y21WaFpEdGNibVoxYm1OMGFXOXVJSE53Y21WaFpDaDJZV3gxWlN3Z1puVnNabWxzYkdWa0xDQnlaV3BsWTNSbFpDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCUktIWmhiSFZsS1M1emNISmxZV1FvWm5Wc1ptbHNiR1ZrTENCeVpXcGxZM1JsWkNrN1hHNTlYRzVjYmxCeWIyMXBjMlV1Y0hKdmRHOTBlWEJsTG5Od2NtVmhaQ0E5SUdaMWJtTjBhVzl1SUNobWRXeG1hV3hzWldRc0lISmxhbVZqZEdWa0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUhSb2FYTXVZV3hzS0NrdWRHaGxiaWhtZFc1amRHbHZiaUFvWVhKeVlYa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1oxYkdacGJHeGxaQzVoY0hCc2VTaDJiMmxrSURBc0lHRnljbUY1S1R0Y2JpQWdJQ0I5TENCeVpXcGxZM1JsWkNrN1hHNTlPMXh1WEc0dktpcGNiaUFxSUZSb1pTQmhjM2x1WXlCbWRXNWpkR2x2YmlCcGN5QmhJR1JsWTI5eVlYUnZjaUJtYjNJZ1oyVnVaWEpoZEc5eUlHWjFibU4wYVc5dWN5d2dkSFZ5Ym1sdVoxeHVJQ29nZEdobGJTQnBiblJ2SUdGemVXNWphSEp2Ym05MWN5Qm5aVzVsY21GMGIzSnpMaUFnUVd4MGFHOTFaMmdnWjJWdVpYSmhkRzl5Y3lCaGNtVWdiMjVzZVNCd1lYSjBYRzRnS2lCdlppQjBhR1VnYm1WM1pYTjBJRVZEVFVGVFkzSnBjSFFnTmlCa2NtRm1kSE1zSUhSb2FYTWdZMjlrWlNCa2IyVnpJRzV2ZENCallYVnpaU0J6ZVc1MFlYaGNiaUFxSUdWeWNtOXljeUJwYmlCdmJHUmxjaUJsYm1kcGJtVnpMaUFnVkdocGN5QmpiMlJsSUhOb2IzVnNaQ0JqYjI1MGFXNTFaU0IwYnlCM2IzSnJJR0Z1WkNCM2FXeHNYRzRnS2lCcGJpQm1ZV04wSUdsdGNISnZkbVVnYjNabGNpQjBhVzFsSUdGeklIUm9aU0JzWVc1bmRXRm5aU0JwYlhCeWIzWmxjeTVjYmlBcVhHNGdLaUJGVXpZZ1oyVnVaWEpoZEc5eWN5QmhjbVVnWTNWeWNtVnVkR3g1SUhCaGNuUWdiMllnVmpnZ2RtVnljMmx2YmlBekxqRTVJSGRwZEdnZ2RHaGxYRzRnS2lBdExXaGhjbTF2Ym5rdFoyVnVaWEpoZEc5eWN5QnlkVzUwYVcxbElHWnNZV2NnWlc1aFlteGxaQzRnSUZOd2FXUmxjazF2Ym10bGVTQm9ZWE1nYUdGa0lIUm9aVzFjYmlBcUlHWnZjaUJzYjI1blpYSXNJR0oxZENCMWJtUmxjaUJoYmlCdmJHUmxjaUJRZVhSb2IyNHRhVzV6Y0dseVpXUWdabTl5YlM0Z0lGUm9hWE1nWm5WdVkzUnBiMjVjYmlBcUlIZHZjbXR6SUc5dUlHSnZkR2dnYTJsdVpITWdiMllnWjJWdVpYSmhkRzl5Y3k1Y2JpQXFYRzRnS2lCRVpXTnZjbUYwWlhNZ1lTQm5aVzVsY21GMGIzSWdablZ1WTNScGIyNGdjM1ZqYUNCMGFHRjBPbHh1SUNvZ0lDMGdhWFFnYldGNUlIbHBaV3hrSUhCeWIyMXBjMlZ6WEc0Z0tpQWdMU0JsZUdWamRYUnBiMjRnZDJsc2JDQmpiMjUwYVc1MVpTQjNhR1Z1SUhSb1lYUWdjSEp2YldselpTQnBjeUJtZFd4bWFXeHNaV1JjYmlBcUlDQXRJSFJvWlNCMllXeDFaU0J2WmlCMGFHVWdlV2xsYkdRZ1pYaHdjbVZ6YzJsdmJpQjNhV3hzSUdKbElIUm9aU0JtZFd4bWFXeHNaV1FnZG1Gc2RXVmNiaUFxSUNBdElHbDBJSEpsZEhWeWJuTWdZU0J3Y205dGFYTmxJR1p2Y2lCMGFHVWdjbVYwZFhKdUlIWmhiSFZsSUNoM2FHVnVJSFJvWlNCblpXNWxjbUYwYjNKY2JpQXFJQ0FnSUhOMGIzQnpJR2wwWlhKaGRHbHVaeWxjYmlBcUlDQXRJSFJvWlNCa1pXTnZjbUYwWldRZ1puVnVZM1JwYjI0Z2NtVjBkWEp1Y3lCaElIQnliMjFwYzJVZ1ptOXlJSFJvWlNCeVpYUjFjbTRnZG1Gc2RXVmNiaUFxSUNBZ0lHOW1JSFJvWlNCblpXNWxjbUYwYjNJZ2IzSWdkR2hsSUdacGNuTjBJSEpsYW1WamRHVmtJSEJ5YjIxcGMyVWdZVzF2Ym1jZ2RHaHZjMlZjYmlBcUlDQWdJSGxwWld4a1pXUXVYRzRnS2lBZ0xTQnBaaUJoYmlCbGNuSnZjaUJwY3lCMGFISnZkMjRnYVc0Z2RHaGxJR2RsYm1WeVlYUnZjaXdnYVhRZ2NISnZjR0ZuWVhSbGN5QjBhSEp2ZFdkb1hHNGdLaUFnSUNCbGRtVnllU0JtYjJ4c2IzZHBibWNnZVdsbGJHUWdkVzUwYVd3Z2FYUWdhWE1nWTJGMVoyaDBMQ0J2Y2lCMWJuUnBiQ0JwZENCbGMyTmhjR1Z6WEc0Z0tpQWdJQ0IwYUdVZ1oyVnVaWEpoZEc5eUlHWjFibU4wYVc5dUlHRnNkRzluWlhSb1pYSXNJR0Z1WkNCcGN5QjBjbUZ1YzJ4aGRHVmtJR2x1ZEc4Z1lWeHVJQ29nSUNBZ2NtVnFaV04wYVc5dUlHWnZjaUIwYUdVZ2NISnZiV2x6WlNCeVpYUjFjbTVsWkNCaWVTQjBhR1VnWkdWamIzSmhkR1ZrSUdkbGJtVnlZWFJ2Y2k1Y2JpQXFMMXh1VVM1aGMzbHVZeUE5SUdGemVXNWpPMXh1Wm5WdVkzUnBiMjRnWVhONWJtTW9iV0ZyWlVkbGJtVnlZWFJ2Y2lrZ2UxeHVJQ0FnSUhKbGRIVnliaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lDOHZJSGRvWlc0Z2RtVnlZaUJwY3lCY0luTmxibVJjSWl3Z1lYSm5JR2x6SUdFZ2RtRnNkV1ZjYmlBZ0lDQWdJQ0FnTHk4Z2QyaGxiaUIyWlhKaUlHbHpJRndpZEdoeWIzZGNJaXdnWVhKbklHbHpJR0Z1SUdWNFkyVndkR2x2Ymx4dUlDQWdJQ0FnSUNCbWRXNWpkR2x2YmlCamIyNTBhVzUxWlhJb2RtVnlZaXdnWVhKbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdjbVZ6ZFd4ME8xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QlZiblJwYkNCV09DQXpMakU1SUM4Z1EyaHliMjFwZFcwZ01qa2dhWE1nY21Wc1pXRnpaV1FzSUZOd2FXUmxjazF2Ym10bGVTQnBjeUIwYUdVZ2IyNXNlVnh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdaVzVuYVc1bElIUm9ZWFFnYUdGeklHRWdaR1Z3Ykc5NVpXUWdZbUZ6WlNCdlppQmljbTkzYzJWeWN5QjBhR0YwSUhOMWNIQnZjblFnWjJWdVpYSmhkRzl5Y3k1Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUVodmQyVjJaWElzSUZOTkozTWdaMlZ1WlhKaGRHOXljeUIxYzJVZ2RHaGxJRkI1ZEdodmJpMXBibk53YVhKbFpDQnpaVzFoYm5ScFkzTWdiMlpjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJRzkxZEdSaGRHVmtJRVZUTmlCa2NtRm1kSE11SUNCWFpTQjNiM1ZzWkNCc2FXdGxJSFJ2SUhOMWNIQnZjblFnUlZNMkxDQmlkWFFnZDJVblpDQmhiSE52WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJzYVd0bElIUnZJRzFoYTJVZ2FYUWdjRzl6YzJsaWJHVWdkRzhnZFhObElHZGxibVZ5WVhSdmNuTWdhVzRnWkdWd2JHOTVaV1FnWW5KdmQzTmxjbk1zSUhOdlhHNGdJQ0FnSUNBZ0lDQWdJQ0F2THlCM1pTQmhiSE52SUhOMWNIQnZjblFnVUhsMGFHOXVMWE4wZVd4bElHZGxibVZ5WVhSdmNuTXVJQ0JCZENCemIyMWxJSEJ2YVc1MElIZGxJR05oYmlCeVpXMXZkbVZjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJSFJvYVhNZ1lteHZZMnN1WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnVTNSdmNFbDBaWEpoZEdsdmJpQTlQVDBnWENKMWJtUmxabWx1WldSY0lpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQzh2SUVWVE5pQkhaVzVsY21GMGIzSnpYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkSEo1SUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVZ6ZFd4MElEMGdaMlZ1WlhKaGRHOXlXM1psY21KZEtHRnlaeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCallYUmphQ0FvWlhoalpYQjBhVzl1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQnlaV3BsWTNRb1pYaGpaWEIwYVc5dUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hKbGMzVnNkQzVrYjI1bEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJSS0hKbGMzVnNkQzUyWVd4MVpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJSGRvWlc0b2NtVnpkV3gwTG5aaGJIVmxMQ0JqWVd4c1ltRmpheXdnWlhKeVltRmpheWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQXZMeUJUY0dsa1pYSk5iMjVyWlhrZ1IyVnVaWEpoZEc5eWMxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDOHZJRVpKV0UxRk9pQlNaVzF2ZG1VZ2RHaHBjeUJqWVhObElIZG9aVzRnVTAwZ1pHOWxjeUJGVXpZZ1oyVnVaWEpoZEc5eWN5NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWE4xYkhRZ1BTQm5aVzVsY21GMGIzSmJkbVZ5WWwwb1lYSm5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5SUdOaGRHTm9JQ2hsZUdObGNIUnBiMjRwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dselUzUnZjRWwwWlhKaGRHbHZiaWhsZUdObGNIUnBiMjRwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnVVNobGVHTmxjSFJwYjI0dWRtRnNkV1VwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhKbGFtVmpkQ2hsZUdObGNIUnBiMjRwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQjNhR1Z1S0hKbGMzVnNkQ3dnWTJGc2JHSmhZMnNzSUdWeWNtSmhZMnNwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhaaGNpQm5aVzVsY21GMGIzSWdQU0J0WVd0bFIyVnVaWEpoZEc5eUxtRndjR3g1S0hSb2FYTXNJR0Z5WjNWdFpXNTBjeWs3WEc0Z0lDQWdJQ0FnSUhaaGNpQmpZV3hzWW1GamF5QTlJR052Ym5ScGJuVmxjaTVpYVc1a0tHTnZiblJwYm5WbGNpd2dYQ0p1WlhoMFhDSXBPMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pYSnlZbUZqYXlBOUlHTnZiblJwYm5WbGNpNWlhVzVrS0dOdmJuUnBiblZsY2l3Z1hDSjBhSEp2ZDF3aUtUdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHTmhiR3hpWVdOcktDazdYRzRnSUNBZ2ZUdGNibjFjYmx4dUx5b3FYRzRnS2lCVWFHVWdjM0JoZDI0Z1puVnVZM1JwYjI0Z2FYTWdZU0J6YldGc2JDQjNjbUZ3Y0dWeUlHRnliM1Z1WkNCaGMzbHVZeUIwYUdGMElHbHRiV1ZrYVdGMFpXeDVYRzRnS2lCallXeHNjeUIwYUdVZ1oyVnVaWEpoZEc5eUlHRnVaQ0JoYkhOdklHVnVaSE1nZEdobElIQnliMjFwYzJVZ1kyaGhhVzRzSUhOdklIUm9ZWFFnWVc1NVhHNGdLaUIxYm1oaGJtUnNaV1FnWlhKeWIzSnpJR0Z5WlNCMGFISnZkMjRnYVc1emRHVmhaQ0J2WmlCbWIzSjNZWEprWldRZ2RHOGdkR2hsSUdWeWNtOXlYRzRnS2lCb1lXNWtiR1Z5TGlCVWFHbHpJR2x6SUhWelpXWjFiQ0JpWldOaGRYTmxJR2wwSjNNZ1pYaDBjbVZ0Wld4NUlHTnZiVzF2YmlCMGJ5QnlkVzVjYmlBcUlHZGxibVZ5WVhSdmNuTWdZWFFnZEdobElIUnZjQzFzWlhabGJDQjBieUIzYjNKcklIZHBkR2dnYkdsaWNtRnlhV1Z6TGx4dUlDb3ZYRzVSTG5Od1lYZHVJRDBnYzNCaGQyNDdYRzVtZFc1amRHbHZiaUJ6Y0dGM2JpaHRZV3RsUjJWdVpYSmhkRzl5S1NCN1hHNGdJQ0FnVVM1a2IyNWxLRkV1WVhONWJtTW9iV0ZyWlVkbGJtVnlZWFJ2Y2lrb0tTazdYRzU5WEc1Y2JpOHZJRVpKV0UxRk9pQlNaVzF2ZG1VZ2RHaHBjeUJwYm5SbGNtWmhZMlVnYjI1alpTQkZVellnWjJWdVpYSmhkRzl5Y3lCaGNtVWdhVzRnVTNCcFpHVnlUVzl1YTJWNUxseHVMeW9xWEc0Z0tpQlVhSEp2ZDNNZ1lTQlNaWFIxY201V1lXeDFaU0JsZUdObGNIUnBiMjRnZEc4Z2MzUnZjQ0JoYmlCaGMzbHVZMmh5YjI1dmRYTWdaMlZ1WlhKaGRHOXlMbHh1SUNwY2JpQXFJRlJvYVhNZ2FXNTBaWEptWVdObElHbHpJR0VnYzNSdmNDMW5ZWEFnYldWaGMzVnlaU0IwYnlCemRYQndiM0owSUdkbGJtVnlZWFJ2Y2lCeVpYUjFjbTVjYmlBcUlIWmhiSFZsY3lCcGJpQnZiR1JsY2lCR2FYSmxabTk0TDFOd2FXUmxjazF2Ym10bGVTNGdJRWx1SUdKeWIzZHpaWEp6SUhSb1lYUWdjM1Z3Y0c5eWRDQkZVelpjYmlBcUlHZGxibVZ5WVhSdmNuTWdiR2xyWlNCRGFISnZiV2wxYlNBeU9Td2dhblZ6ZENCMWMyVWdYQ0p5WlhSMWNtNWNJaUJwYmlCNWIzVnlJR2RsYm1WeVlYUnZjbHh1SUNvZ1puVnVZM1JwYjI1ekxseHVJQ3BjYmlBcUlFQndZWEpoYlNCMllXeDFaU0IwYUdVZ2NtVjBkWEp1SUhaaGJIVmxJR1p2Y2lCMGFHVWdjM1Z5Y205MWJtUnBibWNnWjJWdVpYSmhkRzl5WEc0Z0tpQkFkR2h5YjNkeklGSmxkSFZ5YmxaaGJIVmxJR1Y0WTJWd2RHbHZiaUIzYVhSb0lIUm9aU0IyWVd4MVpTNWNiaUFxSUVCbGVHRnRjR3hsWEc0Z0tpQXZMeUJGVXpZZ2MzUjViR1ZjYmlBcUlGRXVZWE41Ym1Nb1puVnVZM1JwYjI0cUlDZ3BJSHRjYmlBcUlDQWdJQ0FnZG1GeUlHWnZieUE5SUhscFpXeGtJR2RsZEVadmIxQnliMjFwYzJVb0tUdGNiaUFxSUNBZ0lDQWdkbUZ5SUdKaGNpQTlJSGxwWld4a0lHZGxkRUpoY2xCeWIyMXBjMlVvS1R0Y2JpQXFJQ0FnSUNBZ2NtVjBkWEp1SUdadmJ5QXJJR0poY2p0Y2JpQXFJSDBwWEc0Z0tpQXZMeUJQYkdSbGNpQlRjR2xrWlhKTmIyNXJaWGtnYzNSNWJHVmNiaUFxSUZFdVlYTjVibU1vWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ29nSUNBZ0lDQjJZWElnWm05dklEMGdlV2xsYkdRZ1oyVjBSbTl2VUhKdmJXbHpaU2dwTzF4dUlDb2dJQ0FnSUNCMllYSWdZbUZ5SUQwZ2VXbGxiR1FnWjJWMFFtRnlVSEp2YldselpTZ3BPMXh1SUNvZ0lDQWdJQ0JSTG5KbGRIVnliaWhtYjI4Z0t5QmlZWElwTzF4dUlDb2dmU2xjYmlBcUwxeHVVVnRjSW5KbGRIVnlibHdpWFNBOUlGOXlaWFIxY200N1hHNW1kVzVqZEdsdmJpQmZjbVYwZFhKdUtIWmhiSFZsS1NCN1hHNGdJQ0FnZEdoeWIzY2dibVYzSUZGU1pYUjFjbTVXWVd4MVpTaDJZV3gxWlNrN1hHNTlYRzVjYmk4cUtseHVJQ29nVkdobElIQnliMjFwYzJWa0lHWjFibU4wYVc5dUlHUmxZMjl5WVhSdmNpQmxibk4xY21WeklIUm9ZWFFnWVc1NUlIQnliMjFwYzJVZ1lYSm5kVzFsYm5SelhHNGdLaUJoY21VZ2MyVjBkR3hsWkNCaGJtUWdjR0Z6YzJWa0lHRnpJSFpoYkhWbGN5QW9ZSFJvYVhOZ0lHbHpJR0ZzYzI4Z2MyVjBkR3hsWkNCaGJtUWdjR0Z6YzJWa1hHNGdLaUJoY3lCaElIWmhiSFZsS1M0Z0lFbDBJSGRwYkd3Z1lXeHpieUJsYm5OMWNtVWdkR2hoZENCMGFHVWdjbVZ6ZFd4MElHOW1JR0VnWm5WdVkzUnBiMjRnYVhOY2JpQXFJR0ZzZDJGNWN5QmhJSEJ5YjIxcGMyVXVYRzRnS2x4dUlDb2dRR1Y0WVcxd2JHVmNiaUFxSUhaaGNpQmhaR1FnUFNCUkxuQnliMjFwYzJWa0tHWjFibU4wYVc5dUlDaGhMQ0JpS1NCN1hHNGdLaUFnSUNBZ2NtVjBkWEp1SUdFZ0t5QmlPMXh1SUNvZ2ZTazdYRzRnS2lCaFpHUW9VU2hoS1N3Z1VTaENLU2s3WEc0Z0tseHVJQ29nUUhCaGNtRnRJSHRtZFc1amRHbHZibjBnWTJGc2JHSmhZMnNnVkdobElHWjFibU4wYVc5dUlIUnZJR1JsWTI5eVlYUmxYRzRnS2lCQWNtVjBkWEp1Y3lCN1puVnVZM1JwYjI1OUlHRWdablZ1WTNScGIyNGdkR2hoZENCb1lYTWdZbVZsYmlCa1pXTnZjbUYwWldRdVhHNGdLaTljYmxFdWNISnZiV2x6WldRZ1BTQndjbTl0YVhObFpEdGNibVoxYm1OMGFXOXVJSEJ5YjIxcGMyVmtLR05oYkd4aVlXTnJLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSE53Y21WaFpDaGJkR2hwY3l3Z1lXeHNLR0Z5WjNWdFpXNTBjeWxkTENCbWRXNWpkR2x2YmlBb2MyVnNaaXdnWVhKbmN5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdOaGJHeGlZV05yTG1Gd2NHeDVLSE5sYkdZc0lHRnlaM01wTzF4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNCOU8xeHVmVnh1WEc0dktpcGNiaUFxSUhObGJtUnpJR0VnYldWemMyRm5aU0IwYnlCaElIWmhiSFZsSUdsdUlHRWdablYwZFhKbElIUjFjbTVjYmlBcUlFQndZWEpoYlNCdlltcGxZM1FxSUhSb1pTQnlaV05wY0dsbGJuUmNiaUFxSUVCd1lYSmhiU0J2Y0NCMGFHVWdibUZ0WlNCdlppQjBhR1VnYldWemMyRm5aU0J2Y0dWeVlYUnBiMjRzSUdVdVp5NHNJRndpZDJobGJsd2lMRnh1SUNvZ1FIQmhjbUZ0SUdGeVozTWdablZ5ZEdobGNpQmhjbWQxYldWdWRITWdkRzhnWW1VZ1ptOXlkMkZ5WkdWa0lIUnZJSFJvWlNCdmNHVnlZWFJwYjI1Y2JpQXFJRUJ5WlhSMWNtNXpJSEpsYzNWc2RDQjdVSEp2YldselpYMGdZU0J3Y205dGFYTmxJR1p2Y2lCMGFHVWdjbVZ6ZFd4MElHOW1JSFJvWlNCdmNHVnlZWFJwYjI1Y2JpQXFMMXh1VVM1a2FYTndZWFJqYUNBOUlHUnBjM0JoZEdOb08xeHVablZ1WTNScGIyNGdaR2x6Y0dGMFkyZ29iMkpxWldOMExDQnZjQ3dnWVhKbmN5a2dlMXh1SUNBZ0lISmxkSFZ5YmlCUktHOWlhbVZqZENrdVpHbHpjR0YwWTJnb2IzQXNJR0Z5WjNNcE8xeHVmVnh1WEc1UWNtOXRhWE5sTG5CeWIzUnZkSGx3WlM1a2FYTndZWFJqYUNBOUlHWjFibU4wYVc5dUlDaHZjQ3dnWVhKbmN5a2dlMXh1SUNBZ0lIWmhjaUJ6Wld4bUlEMGdkR2hwY3p0Y2JpQWdJQ0IyWVhJZ1pHVm1aWEp5WldRZ1BTQmtaV1psY2lncE8xeHVJQ0FnSUZFdWJtVjRkRlJwWTJzb1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0J6Wld4bUxuQnliMjFwYzJWRWFYTndZWFJqYUNoa1pXWmxjbkpsWkM1eVpYTnZiSFpsTENCdmNDd2dZWEpuY3lrN1hHNGdJQ0FnZlNrN1hHNGdJQ0FnY21WMGRYSnVJR1JsWm1WeWNtVmtMbkJ5YjIxcGMyVTdYRzU5TzF4dVhHNHZLaXBjYmlBcUlFZGxkSE1nZEdobElIWmhiSFZsSUc5bUlHRWdjSEp2Y0dWeWRIa2dhVzRnWVNCbWRYUjFjbVVnZEhWeWJpNWNiaUFxSUVCd1lYSmhiU0J2WW1wbFkzUWdJQ0FnY0hKdmJXbHpaU0J2Y2lCcGJXMWxaR2xoZEdVZ2NtVm1aWEpsYm1ObElHWnZjaUIwWVhKblpYUWdiMkpxWldOMFhHNGdLaUJBY0dGeVlXMGdibUZ0WlNBZ0lDQWdJRzVoYldVZ2IyWWdjSEp2Y0dWeWRIa2dkRzhnWjJWMFhHNGdLaUJBY21WMGRYSnVJSEJ5YjIxcGMyVWdabTl5SUhSb1pTQndjbTl3WlhKMGVTQjJZV3gxWlZ4dUlDb3ZYRzVSTG1kbGRDQTlJR1oxYm1OMGFXOXVJQ2h2WW1wbFkzUXNJR3RsZVNrZ2UxeHVJQ0FnSUhKbGRIVnliaUJSS0c5aWFtVmpkQ2t1WkdsemNHRjBZMmdvWENKblpYUmNJaXdnVzJ0bGVWMHBPMXh1ZlR0Y2JseHVVSEp2YldselpTNXdjbTkwYjNSNWNHVXVaMlYwSUQwZ1puVnVZM1JwYjI0Z0tHdGxlU2tnZTF4dUlDQWdJSEpsZEhWeWJpQjBhR2x6TG1ScGMzQmhkR05vS0Z3aVoyVjBYQ0lzSUZ0clpYbGRLVHRjYm4wN1hHNWNiaThxS2x4dUlDb2dVMlYwY3lCMGFHVWdkbUZzZFdVZ2IyWWdZU0J3Y205d1pYSjBlU0JwYmlCaElHWjFkSFZ5WlNCMGRYSnVMbHh1SUNvZ1FIQmhjbUZ0SUc5aWFtVmpkQ0FnSUNCd2NtOXRhWE5sSUc5eUlHbHRiV1ZrYVdGMFpTQnlaV1psY21WdVkyVWdabTl5SUc5aWFtVmpkQ0J2WW1wbFkzUmNiaUFxSUVCd1lYSmhiU0J1WVcxbElDQWdJQ0FnYm1GdFpTQnZaaUJ3Y205d1pYSjBlU0IwYnlCelpYUmNiaUFxSUVCd1lYSmhiU0IyWVd4MVpTQWdJQ0FnYm1WM0lIWmhiSFZsSUc5bUlIQnliM0JsY25SNVhHNGdLaUJBY21WMGRYSnVJSEJ5YjIxcGMyVWdabTl5SUhSb1pTQnlaWFIxY200Z2RtRnNkV1ZjYmlBcUwxeHVVUzV6WlhRZ1BTQm1kVzVqZEdsdmJpQW9iMkpxWldOMExDQnJaWGtzSUhaaGJIVmxLU0I3WEc0Z0lDQWdjbVYwZFhKdUlGRW9iMkpxWldOMEtTNWthWE53WVhSamFDaGNJbk5sZEZ3aUxDQmJhMlY1TENCMllXeDFaVjBwTzF4dWZUdGNibHh1VUhKdmJXbHpaUzV3Y205MGIzUjVjR1V1YzJWMElEMGdablZ1WTNScGIyNGdLR3RsZVN3Z2RtRnNkV1VwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdkR2hwY3k1a2FYTndZWFJqYUNoY0luTmxkRndpTENCYmEyVjVMQ0IyWVd4MVpWMHBPMXh1ZlR0Y2JseHVMeW9xWEc0Z0tpQkVaV3hsZEdWeklHRWdjSEp2Y0dWeWRIa2dhVzRnWVNCbWRYUjFjbVVnZEhWeWJpNWNiaUFxSUVCd1lYSmhiU0J2WW1wbFkzUWdJQ0FnY0hKdmJXbHpaU0J2Y2lCcGJXMWxaR2xoZEdVZ2NtVm1aWEpsYm1ObElHWnZjaUIwWVhKblpYUWdiMkpxWldOMFhHNGdLaUJBY0dGeVlXMGdibUZ0WlNBZ0lDQWdJRzVoYldVZ2IyWWdjSEp2Y0dWeWRIa2dkRzhnWkdWc1pYUmxYRzRnS2lCQWNtVjBkWEp1SUhCeWIyMXBjMlVnWm05eUlIUm9aU0J5WlhSMWNtNGdkbUZzZFdWY2JpQXFMMXh1VVM1a1pXd2dQU0F2THlCWVdGZ2diR1ZuWVdONVhHNVJXMXdpWkdWc1pYUmxYQ0pkSUQwZ1puVnVZM1JwYjI0Z0tHOWlhbVZqZEN3Z2EyVjVLU0I3WEc0Z0lDQWdjbVYwZFhKdUlGRW9iMkpxWldOMEtTNWthWE53WVhSamFDaGNJbVJsYkdWMFpWd2lMQ0JiYTJWNVhTazdYRzU5TzF4dVhHNVFjbTl0YVhObExuQnliM1J2ZEhsd1pTNWtaV3dnUFNBdkx5QllXRmdnYkdWbllXTjVYRzVRY205dGFYTmxMbkJ5YjNSdmRIbHdaVnRjSW1SbGJHVjBaVndpWFNBOUlHWjFibU4wYVc5dUlDaHJaWGtwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdkR2hwY3k1a2FYTndZWFJqYUNoY0ltUmxiR1YwWlZ3aUxDQmJhMlY1WFNrN1hHNTlPMXh1WEc0dktpcGNiaUFxSUVsdWRtOXJaWE1nWVNCdFpYUm9iMlFnYVc0Z1lTQm1kWFIxY21VZ2RIVnliaTVjYmlBcUlFQndZWEpoYlNCdlltcGxZM1FnSUNBZ2NISnZiV2x6WlNCdmNpQnBiVzFsWkdsaGRHVWdjbVZtWlhKbGJtTmxJR1p2Y2lCMFlYSm5aWFFnYjJKcVpXTjBYRzRnS2lCQWNHRnlZVzBnYm1GdFpTQWdJQ0FnSUc1aGJXVWdiMllnYldWMGFHOWtJSFJ2SUdsdWRtOXJaVnh1SUNvZ1FIQmhjbUZ0SUhaaGJIVmxJQ0FnSUNCaElIWmhiSFZsSUhSdklIQnZjM1FzSUhSNWNHbGpZV3hzZVNCaGJpQmhjbkpoZVNCdlpseHVJQ29nSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwYm5adlkyRjBhVzl1SUdGeVozVnRaVzUwY3lCbWIzSWdjSEp2YldselpYTWdkR2hoZEZ4dUlDb2dJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmhjbVVnZFd4MGFXMWhkR1ZzZVNCaVlXTnJaV1FnZDJsMGFDQmdjbVZ6YjJ4MlpXQWdkbUZzZFdWekxGeHVJQ29nSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JoY3lCdmNIQnZjMlZrSUhSdklIUm9iM05sSUdKaFkydGxaQ0IzYVhSb0lGVlNUSE5jYmlBcUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2QyaGxjbVZwYmlCMGFHVWdjRzl6ZEdWa0lIWmhiSFZsSUdOaGJpQmlaU0JoYm5sY2JpQXFJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdTbE5QVGlCelpYSnBZV3hwZW1GaWJHVWdiMkpxWldOMExseHVJQ29nUUhKbGRIVnliaUJ3Y205dGFYTmxJR1p2Y2lCMGFHVWdjbVYwZFhKdUlIWmhiSFZsWEc0Z0tpOWNiaTh2SUdKdmRXNWtJR3h2WTJGc2JIa2dZbVZqWVhWelpTQnBkQ0JwY3lCMWMyVmtJR0o1SUc5MGFHVnlJRzFsZEdodlpITmNibEV1YldGd2NHeDVJRDBnTHk4Z1dGaFlJRUZ6SUhCeWIzQnZjMlZrSUdKNUlGd2lVbVZrYzJGdVpISnZYQ0pjYmxFdWNHOXpkQ0E5SUdaMWJtTjBhVzl1SUNodlltcGxZM1FzSUc1aGJXVXNJR0Z5WjNNcElIdGNiaUFnSUNCeVpYUjFjbTRnVVNodlltcGxZM1FwTG1ScGMzQmhkR05vS0Z3aWNHOXpkRndpTENCYmJtRnRaU3dnWVhKbmMxMHBPMXh1ZlR0Y2JseHVVSEp2YldselpTNXdjbTkwYjNSNWNHVXViV0Z3Y0d4NUlEMGdMeThnV0ZoWUlFRnpJSEJ5YjNCdmMyVmtJR0o1SUZ3aVVtVmtjMkZ1WkhKdlhDSmNibEJ5YjIxcGMyVXVjSEp2ZEc5MGVYQmxMbkJ2YzNRZ1BTQm1kVzVqZEdsdmJpQW9ibUZ0WlN3Z1lYSm5jeWtnZTF4dUlDQWdJSEpsZEhWeWJpQjBhR2x6TG1ScGMzQmhkR05vS0Z3aWNHOXpkRndpTENCYmJtRnRaU3dnWVhKbmMxMHBPMXh1ZlR0Y2JseHVMeW9xWEc0Z0tpQkpiblp2YTJWeklHRWdiV1YwYUc5a0lHbHVJR0VnWm5WMGRYSmxJSFIxY200dVhHNGdLaUJBY0dGeVlXMGdiMkpxWldOMElDQWdJSEJ5YjIxcGMyVWdiM0lnYVcxdFpXUnBZWFJsSUhKbFptVnlaVzVqWlNCbWIzSWdkR0Z5WjJWMElHOWlhbVZqZEZ4dUlDb2dRSEJoY21GdElHNWhiV1VnSUNBZ0lDQnVZVzFsSUc5bUlHMWxkR2h2WkNCMGJ5QnBiblp2YTJWY2JpQXFJRUJ3WVhKaGJTQXVMaTVoY21keklDQWdZWEp5WVhrZ2IyWWdhVzUyYjJOaGRHbHZiaUJoY21kMWJXVnVkSE5jYmlBcUlFQnlaWFIxY200Z2NISnZiV2x6WlNCbWIzSWdkR2hsSUhKbGRIVnliaUIyWVd4MVpWeHVJQ292WEc1UkxuTmxibVFnUFNBdkx5QllXRmdnVFdGeWF5Qk5hV3hzWlhJbmN5QndjbTl3YjNObFpDQndZWEpzWVc1alpWeHVVUzV0WTJGc2JDQTlJQzh2SUZoWVdDQkJjeUJ3Y205d2IzTmxaQ0JpZVNCY0lsSmxaSE5oYm1SeWIxd2lYRzVSTG1sdWRtOXJaU0E5SUdaMWJtTjBhVzl1SUNodlltcGxZM1FzSUc1aGJXVWdMeW91TGk1aGNtZHpLaThwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdVU2h2WW1wbFkzUXBMbVJwYzNCaGRHTm9LRndpY0c5emRGd2lMQ0JiYm1GdFpTd2dZWEp5WVhsZmMyeHBZMlVvWVhKbmRXMWxiblJ6TENBeUtWMHBPMXh1ZlR0Y2JseHVVSEp2YldselpTNXdjbTkwYjNSNWNHVXVjMlZ1WkNBOUlDOHZJRmhZV0NCTllYSnJJRTFwYkd4bGNpZHpJSEJ5YjNCdmMyVmtJSEJoY214aGJtTmxYRzVRY205dGFYTmxMbkJ5YjNSdmRIbHdaUzV0WTJGc2JDQTlJQzh2SUZoWVdDQkJjeUJ3Y205d2IzTmxaQ0JpZVNCY0lsSmxaSE5oYm1SeWIxd2lYRzVRY205dGFYTmxMbkJ5YjNSdmRIbHdaUzVwYm5admEyVWdQU0JtZFc1amRHbHZiaUFvYm1GdFpTQXZLaTR1TG1GeVozTXFMeWtnZTF4dUlDQWdJSEpsZEhWeWJpQjBhR2x6TG1ScGMzQmhkR05vS0Z3aWNHOXpkRndpTENCYmJtRnRaU3dnWVhKeVlYbGZjMnhwWTJVb1lYSm5kVzFsYm5SekxDQXhLVjBwTzF4dWZUdGNibHh1THlvcVhHNGdLaUJCY0hCc2FXVnpJSFJvWlNCd2NtOXRhWE5sWkNCbWRXNWpkR2x2YmlCcGJpQmhJR1oxZEhWeVpTQjBkWEp1TGx4dUlDb2dRSEJoY21GdElHOWlhbVZqZENBZ0lDQndjbTl0YVhObElHOXlJR2x0YldWa2FXRjBaU0J5WldabGNtVnVZMlVnWm05eUlIUmhjbWRsZENCbWRXNWpkR2x2Ymx4dUlDb2dRSEJoY21GdElHRnlaM01nSUNBZ0lDQmhjbkpoZVNCdlppQmhjSEJzYVdOaGRHbHZiaUJoY21kMWJXVnVkSE5jYmlBcUwxeHVVUzVtWVhCd2JIa2dQU0JtZFc1amRHbHZiaUFvYjJKcVpXTjBMQ0JoY21kektTQjdYRzRnSUNBZ2NtVjBkWEp1SUZFb2IySnFaV04wS1M1a2FYTndZWFJqYUNoY0ltRndjR3g1WENJc0lGdDJiMmxrSURBc0lHRnlaM05kS1R0Y2JuMDdYRzVjYmxCeWIyMXBjMlV1Y0hKdmRHOTBlWEJsTG1aaGNIQnNlU0E5SUdaMWJtTjBhVzl1SUNoaGNtZHpLU0I3WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE11WkdsemNHRjBZMmdvWENKaGNIQnNlVndpTENCYmRtOXBaQ0F3TENCaGNtZHpYU2s3WEc1OU8xeHVYRzR2S2lwY2JpQXFJRU5oYkd4eklIUm9aU0J3Y205dGFYTmxaQ0JtZFc1amRHbHZiaUJwYmlCaElHWjFkSFZ5WlNCMGRYSnVMbHh1SUNvZ1FIQmhjbUZ0SUc5aWFtVmpkQ0FnSUNCd2NtOXRhWE5sSUc5eUlHbHRiV1ZrYVdGMFpTQnlaV1psY21WdVkyVWdabTl5SUhSaGNtZGxkQ0JtZFc1amRHbHZibHh1SUNvZ1FIQmhjbUZ0SUM0dUxtRnlaM01nSUNCaGNuSmhlU0J2WmlCaGNIQnNhV05oZEdsdmJpQmhjbWQxYldWdWRITmNiaUFxTDF4dVVWdGNJblJ5ZVZ3aVhTQTlYRzVSTG1aallXeHNJRDBnWm5WdVkzUnBiMjRnS0c5aWFtVmpkQ0F2S2lBdUxpNWhjbWR6S2k4cElIdGNiaUFnSUNCeVpYUjFjbTRnVVNodlltcGxZM1FwTG1ScGMzQmhkR05vS0Z3aVlYQndiSGxjSWl3Z1czWnZhV1FnTUN3Z1lYSnlZWGxmYzJ4cFkyVW9ZWEpuZFcxbGJuUnpMQ0F4S1YwcE8xeHVmVHRjYmx4dVVISnZiV2x6WlM1d2NtOTBiM1I1Y0dVdVptTmhiR3dnUFNCbWRXNWpkR2x2YmlBb0x5b3VMaTVoY21kektpOHBJSHRjYmlBZ0lDQnlaWFIxY200Z2RHaHBjeTVrYVhOd1lYUmphQ2hjSW1Gd2NHeDVYQ0lzSUZ0MmIybGtJREFzSUdGeWNtRjVYM05zYVdObEtHRnlaM1Z0Wlc1MGN5bGRLVHRjYm4wN1hHNWNiaThxS2x4dUlDb2dRbWx1WkhNZ2RHaGxJSEJ5YjIxcGMyVmtJR1oxYm1OMGFXOXVMQ0IwY21GdWMyWnZjbTFwYm1jZ2NtVjBkWEp1SUhaaGJIVmxjeUJwYm5SdklHRWdablZzWm1sc2JHVmtYRzRnS2lCd2NtOXRhWE5sSUdGdVpDQjBhSEp2ZDI0Z1pYSnliM0p6SUdsdWRHOGdZU0J5WldwbFkzUmxaQ0J2Ym1VdVhHNGdLaUJBY0dGeVlXMGdiMkpxWldOMElDQWdJSEJ5YjIxcGMyVWdiM0lnYVcxdFpXUnBZWFJsSUhKbFptVnlaVzVqWlNCbWIzSWdkR0Z5WjJWMElHWjFibU4wYVc5dVhHNGdLaUJBY0dGeVlXMGdMaTR1WVhKbmN5QWdJR0Z5Y21GNUlHOW1JR0Z3Y0d4cFkyRjBhVzl1SUdGeVozVnRaVzUwYzF4dUlDb3ZYRzVSTG1aaWFXNWtJRDBnWm5WdVkzUnBiMjRnS0c5aWFtVmpkQ0F2S2k0dUxtRnlaM01xTHlrZ2UxeHVJQ0FnSUhaaGNpQndjbTl0YVhObElEMGdVU2h2WW1wbFkzUXBPMXh1SUNBZ0lIWmhjaUJoY21keklEMGdZWEp5WVhsZmMyeHBZMlVvWVhKbmRXMWxiblJ6TENBeEtUdGNiaUFnSUNCeVpYUjFjbTRnWm5WdVkzUnBiMjRnWm1KdmRXNWtLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnY0hKdmJXbHpaUzVrYVhOd1lYUmphQ2hjSW1Gd2NHeDVYQ0lzSUZ0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhNc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JoY21kekxtTnZibU5oZENoaGNuSmhlVjl6YkdsalpTaGhjbWQxYldWdWRITXBLVnh1SUNBZ0lDQWdJQ0JkS1R0Y2JpQWdJQ0I5TzF4dWZUdGNibEJ5YjIxcGMyVXVjSEp2ZEc5MGVYQmxMbVppYVc1a0lEMGdablZ1WTNScGIyNGdLQzhxTGk0dVlYSm5jeW92S1NCN1hHNGdJQ0FnZG1GeUlIQnliMjFwYzJVZ1BTQjBhR2x6TzF4dUlDQWdJSFpoY2lCaGNtZHpJRDBnWVhKeVlYbGZjMnhwWTJVb1lYSm5kVzFsYm5SektUdGNiaUFnSUNCeVpYUjFjbTRnWm5WdVkzUnBiMjRnWm1KdmRXNWtLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnY0hKdmJXbHpaUzVrYVhOd1lYUmphQ2hjSW1Gd2NHeDVYQ0lzSUZ0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhNc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JoY21kekxtTnZibU5oZENoaGNuSmhlVjl6YkdsalpTaGhjbWQxYldWdWRITXBLVnh1SUNBZ0lDQWdJQ0JkS1R0Y2JpQWdJQ0I5TzF4dWZUdGNibHh1THlvcVhHNGdLaUJTWlhGMVpYTjBjeUIwYUdVZ2JtRnRaWE1nYjJZZ2RHaGxJRzkzYm1Wa0lIQnliM0JsY25ScFpYTWdiMllnWVNCd2NtOXRhWE5sWkZ4dUlDb2diMkpxWldOMElHbHVJR0VnWm5WMGRYSmxJSFIxY200dVhHNGdLaUJBY0dGeVlXMGdiMkpxWldOMElDQWdJSEJ5YjIxcGMyVWdiM0lnYVcxdFpXUnBZWFJsSUhKbFptVnlaVzVqWlNCbWIzSWdkR0Z5WjJWMElHOWlhbVZqZEZ4dUlDb2dRSEpsZEhWeWJpQndjbTl0YVhObElHWnZjaUIwYUdVZ2EyVjVjeUJ2WmlCMGFHVWdaWFpsYm5SMVlXeHNlU0J6WlhSMGJHVmtJRzlpYW1WamRGeHVJQ292WEc1UkxtdGxlWE1nUFNCbWRXNWpkR2x2YmlBb2IySnFaV04wS1NCN1hHNGdJQ0FnY21WMGRYSnVJRkVvYjJKcVpXTjBLUzVrYVhOd1lYUmphQ2hjSW10bGVYTmNJaXdnVzEwcE8xeHVmVHRjYmx4dVVISnZiV2x6WlM1d2NtOTBiM1I1Y0dVdWEyVjVjeUE5SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNCeVpYUjFjbTRnZEdocGN5NWthWE53WVhSamFDaGNJbXRsZVhOY0lpd2dXMTBwTzF4dWZUdGNibHh1THlvcVhHNGdLaUJVZFhKdWN5QmhiaUJoY25KaGVTQnZaaUJ3Y205dGFYTmxjeUJwYm5SdklHRWdjSEp2YldselpTQm1iM0lnWVc0Z1lYSnlZWGt1SUNCSlppQmhibmtnYjJaY2JpQXFJSFJvWlNCd2NtOXRhWE5sY3lCblpYUnpJSEpsYW1WamRHVmtMQ0IwYUdVZ2QyaHZiR1VnWVhKeVlYa2dhWE1nY21WcVpXTjBaV1FnYVcxdFpXUnBZWFJsYkhrdVhHNGdLaUJBY0dGeVlXMGdlMEZ5Y21GNUtuMGdZVzRnWVhKeVlYa2dLRzl5SUhCeWIyMXBjMlVnWm05eUlHRnVJR0Z5Y21GNUtTQnZaaUIyWVd4MVpYTWdLRzl5WEc0Z0tpQndjbTl0YVhObGN5Qm1iM0lnZG1Gc2RXVnpLVnh1SUNvZ1FISmxkSFZ5Ym5NZ1lTQndjbTl0YVhObElHWnZjaUJoYmlCaGNuSmhlU0J2WmlCMGFHVWdZMjl5Y21WemNHOXVaR2x1WnlCMllXeDFaWE5jYmlBcUwxeHVMeThnUW5rZ1RXRnlheUJOYVd4c1pYSmNiaTh2SUdoMGRIQTZMeTkzYVd0cExtVmpiV0Z6WTNKcGNIUXViM0puTDJSdmEzVXVjR2h3UDJsa1BYTjBjbUYzYldGdU9tTnZibU4xY25KbGJtTjVKbkpsZGoweE16QTROemMyTlRJeEkyRnNiR1oxYkdacGJHeGxaRnh1VVM1aGJHd2dQU0JoYkd3N1hHNW1kVzVqZEdsdmJpQmhiR3dvY0hKdmJXbHpaWE1wSUh0Y2JpQWdJQ0J5WlhSMWNtNGdkMmhsYmlod2NtOXRhWE5sY3l3Z1puVnVZM1JwYjI0Z0tIQnliMjFwYzJWektTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCd1pXNWthVzVuUTI5MWJuUWdQU0F3TzF4dUlDQWdJQ0FnSUNCMllYSWdaR1ZtWlhKeVpXUWdQU0JrWldabGNpZ3BPMXh1SUNBZ0lDQWdJQ0JoY25KaGVWOXlaV1IxWTJVb2NISnZiV2x6WlhNc0lHWjFibU4wYVc5dUlDaDFibVJsWm1sdVpXUXNJSEJ5YjIxcGMyVXNJR2x1WkdWNEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdjMjVoY0hOb2IzUTdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9YRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhWE5RY205dGFYTmxLSEJ5YjIxcGMyVXBJQ1ltWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnS0hOdVlYQnphRzkwSUQwZ2NISnZiV2x6WlM1cGJuTndaV04wS0NrcExuTjBZWFJsSUQwOVBTQmNJbVoxYkdacGJHeGxaRndpWEc0Z0lDQWdJQ0FnSUNBZ0lDQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J3Y205dGFYTmxjMXRwYm1SbGVGMGdQU0J6Ym1Gd2MyaHZkQzUyWVd4MVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnS3l0d1pXNWthVzVuUTI5MWJuUTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkMmhsYmloY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjSEp2YldselpTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWm5WdVkzUnBiMjRnS0haaGJIVmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J3Y205dGFYTmxjMXRwYm1SbGVGMGdQU0IyWVd4MVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2d0TFhCbGJtUnBibWREYjNWdWRDQTlQVDBnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1JsWm1WeWNtVmtMbkpsYzI5c2RtVW9jSEp2YldselpYTXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUxGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JrWldabGNuSmxaQzV5WldwbFkzUXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdaMWJtTjBhVzl1SUNod2NtOW5jbVZ6Y3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pHVm1aWEp5WldRdWJtOTBhV1o1S0hzZ2FXNWtaWGc2SUdsdVpHVjRMQ0IyWVd4MVpUb2djSEp2WjNKbGMzTWdmU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlMQ0IyYjJsa0lEQXBPMXh1SUNBZ0lDQWdJQ0JwWmlBb2NHVnVaR2x1WjBOdmRXNTBJRDA5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCa1pXWmxjbkpsWkM1eVpYTnZiSFpsS0hCeWIyMXBjMlZ6S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1pHVm1aWEp5WldRdWNISnZiV2x6WlR0Y2JpQWdJQ0I5S1R0Y2JuMWNibHh1VUhKdmJXbHpaUzV3Y205MGIzUjVjR1V1WVd4c0lEMGdablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQmhiR3dvZEdocGN5azdYRzU5TzF4dVhHNHZLaXBjYmlBcUlGSmxkSFZ5Ym5NZ2RHaGxJR1pwY25OMElISmxjMjlzZG1Wa0lIQnliMjFwYzJVZ2IyWWdZVzRnWVhKeVlYa3VJRkJ5YVc5eUlISmxhbVZqZEdWa0lIQnliMjFwYzJWeklHRnlaVnh1SUNvZ2FXZHViM0psWkM0Z0lGSmxhbVZqZEhNZ2IyNXNlU0JwWmlCaGJHd2djSEp2YldselpYTWdZWEpsSUhKbGFtVmpkR1ZrTGx4dUlDb2dRSEJoY21GdElIdEJjbkpoZVNwOUlHRnVJR0Z5Y21GNUlHTnZiblJoYVc1cGJtY2dkbUZzZFdWeklHOXlJSEJ5YjIxcGMyVnpJR1p2Y2lCMllXeDFaWE5jYmlBcUlFQnlaWFIxY201eklHRWdjSEp2YldselpTQm1kV3htYVd4c1pXUWdkMmwwYUNCMGFHVWdkbUZzZFdVZ2IyWWdkR2hsSUdacGNuTjBJSEpsYzI5c2RtVmtJSEJ5YjIxcGMyVXNYRzRnS2lCdmNpQmhJSEpsYW1WamRHVmtJSEJ5YjIxcGMyVWdhV1lnWVd4c0lIQnliMjFwYzJWeklHRnlaU0J5WldwbFkzUmxaQzVjYmlBcUwxeHVVUzVoYm5rZ1BTQmhibms3WEc1Y2JtWjFibU4wYVc5dUlHRnVlU2h3Y205dGFYTmxjeWtnZTF4dUlDQWdJR2xtSUNod2NtOXRhWE5sY3k1c1pXNW5kR2dnUFQwOUlEQXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRkV1Y21WemIyeDJaU2dwTzF4dUlDQWdJSDFjYmx4dUlDQWdJSFpoY2lCa1pXWmxjbkpsWkNBOUlGRXVaR1ZtWlhJb0tUdGNiaUFnSUNCMllYSWdjR1Z1WkdsdVowTnZkVzUwSUQwZ01EdGNiaUFnSUNCaGNuSmhlVjl5WldSMVkyVW9jSEp2YldselpYTXNJR1oxYm1OMGFXOXVJQ2h3Y21WMkxDQmpkWEp5Wlc1MExDQnBibVJsZUNrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnY0hKdmJXbHpaU0E5SUhCeWIyMXBjMlZ6VzJsdVpHVjRYVHRjYmx4dUlDQWdJQ0FnSUNCd1pXNWthVzVuUTI5MWJuUXJLenRjYmx4dUlDQWdJQ0FnSUNCM2FHVnVLSEJ5YjIxcGMyVXNJRzl1Um5Wc1ptbHNiR1ZrTENCdmJsSmxhbVZqZEdWa0xDQnZibEJ5YjJkeVpYTnpLVHRjYmlBZ0lDQWdJQ0FnWm5WdVkzUnBiMjRnYjI1R2RXeG1hV3hzWldRb2NtVnpkV3gwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JrWldabGNuSmxaQzV5WlhOdmJIWmxLSEpsYzNWc2RDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnWm5WdVkzUnBiMjRnYjI1U1pXcGxZM1JsWkNncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhCbGJtUnBibWREYjNWdWRDMHRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSEJsYm1ScGJtZERiM1Z1ZENBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdSbFptVnljbVZrTG5KbGFtVmpkQ2h1WlhjZ1JYSnliM0lvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGd2lRMkZ1SjNRZ1oyVjBJR1oxYkdacGJHeHRaVzUwSUhaaGJIVmxJR1p5YjIwZ1lXNTVJSEJ5YjIxcGMyVXNJR0ZzYkNCY0lpQXJYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUZ3aWNISnZiV2x6WlhNZ2QyVnlaU0J5WldwbFkzUmxaQzVjSWx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lHWjFibU4wYVc5dUlHOXVVSEp2WjNKbGMzTW9jSEp2WjNKbGMzTXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHUmxabVZ5Y21Wa0xtNXZkR2xtZVNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXNWtaWGc2SUdsdVpHVjRMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoYkhWbE9pQndjbTluY21WemMxeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxDQjFibVJsWm1sdVpXUXBPMXh1WEc0Z0lDQWdjbVYwZFhKdUlHUmxabVZ5Y21Wa0xuQnliMjFwYzJVN1hHNTlYRzVjYmxCeWIyMXBjMlV1Y0hKdmRHOTBlWEJsTG1GdWVTQTlJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdZVzU1S0hSb2FYTXBPMXh1ZlR0Y2JseHVMeW9xWEc0Z0tpQlhZV2wwY3lCbWIzSWdZV3hzSUhCeWIyMXBjMlZ6SUhSdklHSmxJSE5sZEhSc1pXUXNJR1ZwZEdobGNpQm1kV3htYVd4c1pXUWdiM0pjYmlBcUlISmxhbVZqZEdWa0xpQWdWR2hwY3lCcGN5QmthWE4wYVc1amRDQm1jbTl0SUdCaGJHeGdJSE5wYm1ObElIUm9ZWFFnZDI5MWJHUWdjM1J2Y0Z4dUlDb2dkMkZwZEdsdVp5QmhkQ0IwYUdVZ1ptbHljM1FnY21WcVpXTjBhVzl1TGlBZ1ZHaGxJSEJ5YjIxcGMyVWdjbVYwZFhKdVpXUWdZbmxjYmlBcUlHQmhiR3hTWlhOdmJIWmxaR0FnZDJsc2JDQnVaWFpsY2lCaVpTQnlaV3BsWTNSbFpDNWNiaUFxSUVCd1lYSmhiU0J3Y205dGFYTmxjeUJoSUhCeWIyMXBjMlVnWm05eUlHRnVJR0Z5Y21GNUlDaHZjaUJoYmlCaGNuSmhlU2tnYjJZZ2NISnZiV2x6WlhOY2JpQXFJQ2h2Y2lCMllXeDFaWE1wWEc0Z0tpQkFjbVYwZFhKdUlHRWdjSEp2YldselpTQm1iM0lnWVc0Z1lYSnlZWGtnYjJZZ2NISnZiV2x6WlhOY2JpQXFMMXh1VVM1aGJHeFNaWE52YkhabFpDQTlJR1JsY0hKbFkyRjBaU2hoYkd4U1pYTnZiSFpsWkN3Z1hDSmhiR3hTWlhOdmJIWmxaRndpTENCY0ltRnNiRk5sZEhSc1pXUmNJaWs3WEc1bWRXNWpkR2x2YmlCaGJHeFNaWE52YkhabFpDaHdjbTl0YVhObGN5a2dlMXh1SUNBZ0lISmxkSFZ5YmlCM2FHVnVLSEJ5YjIxcGMyVnpMQ0JtZFc1amRHbHZiaUFvY0hKdmJXbHpaWE1wSUh0Y2JpQWdJQ0FnSUNBZ2NISnZiV2x6WlhNZ1BTQmhjbkpoZVY5dFlYQW9jSEp2YldselpYTXNJRkVwTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZDJobGJpaGhiR3dvWVhKeVlYbGZiV0Z3S0hCeWIyMXBjMlZ6TENCbWRXNWpkR2x2YmlBb2NISnZiV2x6WlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJSGRvWlc0b2NISnZiV2x6WlN3Z2JtOXZjQ3dnYm05dmNDazdYRzRnSUNBZ0lDQWdJSDBwS1N3Z1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhCeWIyMXBjMlZ6TzF4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNCOUtUdGNibjFjYmx4dVVISnZiV2x6WlM1d2NtOTBiM1I1Y0dVdVlXeHNVbVZ6YjJ4MlpXUWdQU0JtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnY21WMGRYSnVJR0ZzYkZKbGMyOXNkbVZrS0hSb2FYTXBPMXh1ZlR0Y2JseHVMeW9xWEc0Z0tpQkFjMlZsSUZCeWIyMXBjMlVqWVd4c1UyVjBkR3hsWkZ4dUlDb3ZYRzVSTG1Gc2JGTmxkSFJzWldRZ1BTQmhiR3hUWlhSMGJHVmtPMXh1Wm5WdVkzUnBiMjRnWVd4c1UyVjBkR3hsWkNod2NtOXRhWE5sY3lrZ2UxeHVJQ0FnSUhKbGRIVnliaUJSS0hCeWIyMXBjMlZ6S1M1aGJHeFRaWFIwYkdWa0tDazdYRzU5WEc1Y2JpOHFLbHh1SUNvZ1ZIVnlibk1nWVc0Z1lYSnlZWGtnYjJZZ2NISnZiV2x6WlhNZ2FXNTBieUJoSUhCeWIyMXBjMlVnWm05eUlHRnVJR0Z5Y21GNUlHOW1JSFJvWldseUlITjBZWFJsY3lBb1lYTmNiaUFxSUhKbGRIVnlibVZrSUdKNUlHQnBibk53WldOMFlDa2dkMmhsYmlCMGFHVjVJR2hoZG1VZ1lXeHNJSE5sZEhSc1pXUXVYRzRnS2lCQWNHRnlZVzBnZTBGeWNtRjVXMEZ1ZVNwZGZTQjJZV3gxWlhNZ1lXNGdZWEp5WVhrZ0tHOXlJSEJ5YjIxcGMyVWdabTl5SUdGdUlHRnljbUY1S1NCdlppQjJZV3gxWlhNZ0tHOXlYRzRnS2lCd2NtOXRhWE5sY3lCbWIzSWdkbUZzZFdWektWeHVJQ29nUUhKbGRIVnlibk1nZTBGeWNtRjVXMU4wWVhSbFhYMGdZVzRnWVhKeVlYa2diMllnYzNSaGRHVnpJR1p2Y2lCMGFHVWdjbVZ6Y0dWamRHbDJaU0IyWVd4MVpYTXVYRzRnS2k5Y2JsQnliMjFwYzJVdWNISnZkRzkwZVhCbExtRnNiRk5sZEhSc1pXUWdQU0JtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnY21WMGRYSnVJSFJvYVhNdWRHaGxiaWhtZFc1amRHbHZiaUFvY0hKdmJXbHpaWE1wSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdGc2JDaGhjbkpoZVY5dFlYQW9jSEp2YldselpYTXNJR1oxYm1OMGFXOXVJQ2h3Y205dGFYTmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQndjbTl0YVhObElEMGdVU2h3Y205dGFYTmxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHWjFibU4wYVc5dUlISmxaMkZ5Wkd4bGMzTW9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJSEJ5YjIxcGMyVXVhVzV6Y0dWamRDZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJSEJ5YjIxcGMyVXVkR2hsYmloeVpXZGhjbVJzWlhOekxDQnlaV2RoY21Sc1pYTnpLVHRjYmlBZ0lDQWdJQ0FnZlNrcE8xeHVJQ0FnSUgwcE8xeHVmVHRjYmx4dUx5b3FYRzRnS2lCRFlYQjBkWEpsY3lCMGFHVWdabUZwYkhWeVpTQnZaaUJoSUhCeWIyMXBjMlVzSUdkcGRtbHVaeUJoYmlCdmNHOXlkSFZ1YVhSNUlIUnZJSEpsWTI5MlpYSmNiaUFxSUhkcGRHZ2dZU0JqWVd4c1ltRmpheTRnSUVsbUlIUm9aU0JuYVhabGJpQndjbTl0YVhObElHbHpJR1oxYkdacGJHeGxaQ3dnZEdobElISmxkSFZ5Ym1Wa1hHNGdLaUJ3Y205dGFYTmxJR2x6SUdaMWJHWnBiR3hsWkM1Y2JpQXFJRUJ3WVhKaGJTQjdRVzU1S24wZ2NISnZiV2x6WlNCbWIzSWdjMjl0WlhSb2FXNW5YRzRnS2lCQWNHRnlZVzBnZTBaMWJtTjBhVzl1ZlNCallXeHNZbUZqYXlCMGJ5Qm1kV3htYVd4c0lIUm9aU0J5WlhSMWNtNWxaQ0J3Y205dGFYTmxJR2xtSUhSb1pWeHVJQ29nWjJsMlpXNGdjSEp2YldselpTQnBjeUJ5WldwbFkzUmxaRnh1SUNvZ1FISmxkSFZ5Ym5NZ1lTQndjbTl0YVhObElHWnZjaUIwYUdVZ2NtVjBkWEp1SUhaaGJIVmxJRzltSUhSb1pTQmpZV3hzWW1GamExeHVJQ292WEc1UkxtWmhhV3dnUFNBdkx5QllXRmdnYkdWbllXTjVYRzVSVzF3aVkyRjBZMmhjSWwwZ1BTQm1kVzVqZEdsdmJpQW9iMkpxWldOMExDQnlaV3BsWTNSbFpDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCUktHOWlhbVZqZENrdWRHaGxiaWgyYjJsa0lEQXNJSEpsYW1WamRHVmtLVHRjYm4wN1hHNWNibEJ5YjIxcGMyVXVjSEp2ZEc5MGVYQmxMbVpoYVd3Z1BTQXZMeUJZV0ZnZ2JHVm5ZV041WEc1UWNtOXRhWE5sTG5CeWIzUnZkSGx3WlZ0Y0ltTmhkR05vWENKZElEMGdablZ1WTNScGIyNGdLSEpsYW1WamRHVmtLU0I3WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE11ZEdobGJpaDJiMmxrSURBc0lISmxhbVZqZEdWa0tUdGNibjA3WEc1Y2JpOHFLbHh1SUNvZ1FYUjBZV05vWlhNZ1lTQnNhWE4wWlc1bGNpQjBhR0YwSUdOaGJpQnlaWE53YjI1a0lIUnZJSEJ5YjJkeVpYTnpJRzV2ZEdsbWFXTmhkR2x2Ym5NZ1puSnZiU0JoWEc0Z0tpQndjbTl0YVhObEozTWdiM0pwWjJsdVlYUnBibWNnWkdWbVpYSnlaV1F1SUZSb2FYTWdiR2x6ZEdWdVpYSWdjbVZqWldsMlpYTWdkR2hsSUdWNFlXTjBJR0Z5WjNWdFpXNTBjMXh1SUNvZ2NHRnpjMlZrSUhSdklHQmdaR1ZtWlhKeVpXUXVibTkwYVdaNVlHQXVYRzRnS2lCQWNHRnlZVzBnZTBGdWVTcDlJSEJ5YjIxcGMyVWdabTl5SUhOdmJXVjBhR2x1WjF4dUlDb2dRSEJoY21GdElIdEdkVzVqZEdsdmJuMGdZMkZzYkdKaFkyc2dkRzhnY21WalpXbDJaU0JoYm5rZ2NISnZaM0psYzNNZ2JtOTBhV1pwWTJGMGFXOXVjMXh1SUNvZ1FISmxkSFZ5Ym5NZ2RHaGxJR2RwZG1WdUlIQnliMjFwYzJVc0lIVnVZMmhoYm1kbFpGeHVJQ292WEc1UkxuQnliMmR5WlhOeklEMGdjSEp2WjNKbGMzTTdYRzVtZFc1amRHbHZiaUJ3Y205bmNtVnpjeWh2WW1wbFkzUXNJSEJ5YjJkeVpYTnpaV1FwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdVU2h2WW1wbFkzUXBMblJvWlc0b2RtOXBaQ0F3TENCMmIybGtJREFzSUhCeWIyZHlaWE56WldRcE8xeHVmVnh1WEc1UWNtOXRhWE5sTG5CeWIzUnZkSGx3WlM1d2NtOW5jbVZ6Y3lBOUlHWjFibU4wYVc5dUlDaHdjbTluY21WemMyVmtLU0I3WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE11ZEdobGJpaDJiMmxrSURBc0lIWnZhV1FnTUN3Z2NISnZaM0psYzNObFpDazdYRzU5TzF4dVhHNHZLaXBjYmlBcUlGQnliM1pwWkdWeklHRnVJRzl3Y0c5eWRIVnVhWFI1SUhSdklHOWljMlZ5ZG1VZ2RHaGxJSE5sZEhSc2FXNW5JRzltSUdFZ2NISnZiV2x6WlN4Y2JpQXFJSEpsWjJGeVpHeGxjM01nYjJZZ2QyaGxkR2hsY2lCMGFHVWdjSEp2YldselpTQnBjeUJtZFd4bWFXeHNaV1FnYjNJZ2NtVnFaV04wWldRdUlDQkdiM0ozWVhKa2MxeHVJQ29nZEdobElISmxjMjlzZFhScGIyNGdkRzhnZEdobElISmxkSFZ5Ym1Wa0lIQnliMjFwYzJVZ2QyaGxiaUIwYUdVZ1kyRnNiR0poWTJzZ2FYTWdaRzl1WlM1Y2JpQXFJRlJvWlNCallXeHNZbUZqYXlCallXNGdjbVYwZFhKdUlHRWdjSEp2YldselpTQjBieUJrWldabGNpQmpiMjF3YkdWMGFXOXVMbHh1SUNvZ1FIQmhjbUZ0SUh0QmJua3FmU0J3Y205dGFYTmxYRzRnS2lCQWNHRnlZVzBnZTBaMWJtTjBhVzl1ZlNCallXeHNZbUZqYXlCMGJ5QnZZbk5sY25abElIUm9aU0J5WlhOdmJIVjBhVzl1SUc5bUlIUm9aU0JuYVhabGJseHVJQ29nY0hKdmJXbHpaU3dnZEdGclpYTWdibThnWVhKbmRXMWxiblJ6TGx4dUlDb2dRSEpsZEhWeWJuTWdZU0J3Y205dGFYTmxJR1p2Y2lCMGFHVWdjbVZ6YjJ4MWRHbHZiaUJ2WmlCMGFHVWdaMmwyWlc0Z2NISnZiV2x6WlNCM2FHVnVYRzRnS2lCZ1lHWnBibUJnSUdseklHUnZibVV1WEc0Z0tpOWNibEV1Wm1sdUlEMGdMeThnV0ZoWUlHeGxaMkZqZVZ4dVVWdGNJbVpwYm1Gc2JIbGNJbDBnUFNCbWRXNWpkR2x2YmlBb2IySnFaV04wTENCallXeHNZbUZqYXlrZ2UxeHVJQ0FnSUhKbGRIVnliaUJSS0c5aWFtVmpkQ2xiWENKbWFXNWhiR3g1WENKZEtHTmhiR3hpWVdOcktUdGNibjA3WEc1Y2JsQnliMjFwYzJVdWNISnZkRzkwZVhCbExtWnBiaUE5SUM4dklGaFlXQ0JzWldkaFkzbGNibEJ5YjIxcGMyVXVjSEp2ZEc5MGVYQmxXMXdpWm1sdVlXeHNlVndpWFNBOUlHWjFibU4wYVc5dUlDaGpZV3hzWW1GamF5a2dlMXh1SUNBZ0lHTmhiR3hpWVdOcklEMGdVU2hqWVd4c1ltRmpheWs3WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE11ZEdobGJpaG1kVzVqZEdsdmJpQW9kbUZzZFdVcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHTmhiR3hpWVdOckxtWmpZV3hzS0NrdWRHaGxiaWhtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdkbUZzZFdVN1hHNGdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lIMHNJR1oxYm1OMGFXOXVJQ2h5WldGemIyNHBJSHRjYmlBZ0lDQWdJQ0FnTHk4Z1ZFOUVUeUJoZEhSbGJYQjBJSFJ2SUhKbFkzbGpiR1VnZEdobElISmxhbVZqZEdsdmJpQjNhWFJvSUZ3aWRHaHBjMXdpTGx4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWTJGc2JHSmhZMnN1Wm1OaGJHd29LUzUwYUdWdUtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIUm9jbTkzSUhKbFlYTnZianRjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnZlNrN1hHNTlPMXh1WEc0dktpcGNiaUFxSUZSbGNtMXBibUYwWlhNZ1lTQmphR0ZwYmlCdlppQndjbTl0YVhObGN5d2dabTl5WTJsdVp5QnlaV3BsWTNScGIyNXpJSFJ2SUdKbFhHNGdLaUIwYUhKdmQyNGdZWE1nWlhoalpYQjBhVzl1Y3k1Y2JpQXFJRUJ3WVhKaGJTQjdRVzU1S24wZ2NISnZiV2x6WlNCaGRDQjBhR1VnWlc1a0lHOW1JR0VnWTJoaGFXNGdiMllnY0hKdmJXbHpaWE5jYmlBcUlFQnlaWFIxY201eklHNXZkR2hwYm1kY2JpQXFMMXh1VVM1a2IyNWxJRDBnWm5WdVkzUnBiMjRnS0c5aWFtVmpkQ3dnWm5Wc1ptbHNiR1ZrTENCeVpXcGxZM1JsWkN3Z2NISnZaM0psYzNNcElIdGNiaUFnSUNCeVpYUjFjbTRnVVNodlltcGxZM1FwTG1SdmJtVW9ablZzWm1sc2JHVmtMQ0J5WldwbFkzUmxaQ3dnY0hKdlozSmxjM01wTzF4dWZUdGNibHh1VUhKdmJXbHpaUzV3Y205MGIzUjVjR1V1Wkc5dVpTQTlJR1oxYm1OMGFXOXVJQ2htZFd4bWFXeHNaV1FzSUhKbGFtVmpkR1ZrTENCd2NtOW5jbVZ6Y3lrZ2UxeHVJQ0FnSUhaaGNpQnZibFZ1YUdGdVpHeGxaRVZ5Y205eUlEMGdablZ1WTNScGIyNGdLR1Z5Y205eUtTQjdYRzRnSUNBZ0lDQWdJQzh2SUdadmNuZGhjbVFnZEc4Z1lTQm1kWFIxY21VZ2RIVnliaUJ6YnlCMGFHRjBJR0JnZDJobGJtQmdYRzRnSUNBZ0lDQWdJQzh2SUdSdlpYTWdibTkwSUdOaGRHTm9JR2wwSUdGdVpDQjBkWEp1SUdsMElHbHVkRzhnWVNCeVpXcGxZM1JwYjI0dVhHNGdJQ0FnSUNBZ0lGRXVibVY0ZEZScFkyc29ablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdiV0ZyWlZOMFlXTnJWSEpoWTJWTWIyNW5LR1Z5Y205eUxDQndjbTl0YVhObEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaFJMbTl1WlhKeWIzSXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JSTG05dVpYSnliM0lvWlhKeWIzSXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFISnZkeUJsY25KdmNqdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lDOHZJRUYyYjJsa0lIVnVibVZqWlhOellYSjVJR0J1WlhoMFZHbGphMkJwYm1jZ2RtbGhJR0Z1SUhWdWJtVmpaWE56WVhKNUlHQjNhR1Z1WUM1Y2JpQWdJQ0IyWVhJZ2NISnZiV2x6WlNBOUlHWjFiR1pwYkd4bFpDQjhmQ0J5WldwbFkzUmxaQ0I4ZkNCd2NtOW5jbVZ6Y3lBL1hHNGdJQ0FnSUNBZ0lIUm9hWE11ZEdobGJpaG1kV3htYVd4c1pXUXNJSEpsYW1WamRHVmtMQ0J3Y205bmNtVnpjeWtnT2x4dUlDQWdJQ0FnSUNCMGFHbHpPMXh1WEc0Z0lDQWdhV1lnS0hSNWNHVnZaaUJ3Y205alpYTnpJRDA5UFNCY0ltOWlhbVZqZEZ3aUlDWW1JSEJ5YjJObGMzTWdKaVlnY0hKdlkyVnpjeTVrYjIxaGFXNHBJSHRjYmlBZ0lDQWdJQ0FnYjI1VmJtaGhibVJzWldSRmNuSnZjaUE5SUhCeWIyTmxjM011Wkc5dFlXbHVMbUpwYm1Rb2IyNVZibWhoYm1Sc1pXUkZjbkp2Y2lrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnY0hKdmJXbHpaUzUwYUdWdUtIWnZhV1FnTUN3Z2IyNVZibWhoYm1Sc1pXUkZjbkp2Y2lrN1hHNTlPMXh1WEc0dktpcGNiaUFxSUVOaGRYTmxjeUJoSUhCeWIyMXBjMlVnZEc4Z1ltVWdjbVZxWldOMFpXUWdhV1lnYVhRZ1pHOWxjeUJ1YjNRZ1oyVjBJR1oxYkdacGJHeGxaQ0JpWldadmNtVmNiaUFxSUhOdmJXVWdiV2xzYkdselpXTnZibVJ6SUhScGJXVWdiM1YwTGx4dUlDb2dRSEJoY21GdElIdEJibmtxZlNCd2NtOXRhWE5sWEc0Z0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ2JXbHNiR2x6WldOdmJtUnpJSFJwYldWdmRYUmNiaUFxSUVCd1lYSmhiU0I3UVc1NUtuMGdZM1Z6ZEc5dElHVnljbTl5SUcxbGMzTmhaMlVnYjNJZ1JYSnliM0lnYjJKcVpXTjBJQ2h2Y0hScGIyNWhiQ2xjYmlBcUlFQnlaWFIxY201eklHRWdjSEp2YldselpTQm1iM0lnZEdobElISmxjMjlzZFhScGIyNGdiMllnZEdobElHZHBkbVZ1SUhCeWIyMXBjMlVnYVdZZ2FYUWdhWE5jYmlBcUlHWjFiR1pwYkd4bFpDQmlaV1p2Y21VZ2RHaGxJSFJwYldWdmRYUXNJRzkwYUdWeWQybHpaU0J5WldwbFkzUmxaQzVjYmlBcUwxeHVVUzUwYVcxbGIzVjBJRDBnWm5WdVkzUnBiMjRnS0c5aWFtVmpkQ3dnYlhNc0lHVnljbTl5S1NCN1hHNGdJQ0FnY21WMGRYSnVJRkVvYjJKcVpXTjBLUzUwYVcxbGIzVjBLRzF6TENCbGNuSnZjaWs3WEc1OU8xeHVYRzVRY205dGFYTmxMbkJ5YjNSdmRIbHdaUzUwYVcxbGIzVjBJRDBnWm5WdVkzUnBiMjRnS0cxekxDQmxjbkp2Y2lrZ2UxeHVJQ0FnSUhaaGNpQmtaV1psY25KbFpDQTlJR1JsWm1WeUtDazdYRzRnSUNBZ2RtRnlJSFJwYldWdmRYUkpaQ0E5SUhObGRGUnBiV1Z2ZFhRb1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb0lXVnljbTl5SUh4OElGd2ljM1J5YVc1blhDSWdQVDA5SUhSNWNHVnZaaUJsY25KdmNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pYSnliM0lnUFNCdVpYY2dSWEp5YjNJb1pYSnliM0lnZkh3Z1hDSlVhVzFsWkNCdmRYUWdZV1owWlhJZ1hDSWdLeUJ0Y3lBcklGd2lJRzF6WENJcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWlhKeWIzSXVZMjlrWlNBOUlGd2lSVlJKVFVWRVQxVlVYQ0k3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ1pHVm1aWEp5WldRdWNtVnFaV04wS0dWeWNtOXlLVHRjYmlBZ0lDQjlMQ0J0Y3lrN1hHNWNiaUFnSUNCMGFHbHpMblJvWlc0b1puVnVZM1JwYjI0Z0tIWmhiSFZsS1NCN1hHNGdJQ0FnSUNBZ0lHTnNaV0Z5VkdsdFpXOTFkQ2gwYVcxbGIzVjBTV1FwTzF4dUlDQWdJQ0FnSUNCa1pXWmxjbkpsWkM1eVpYTnZiSFpsS0haaGJIVmxLVHRjYmlBZ0lDQjlMQ0JtZFc1amRHbHZiaUFvWlhoalpYQjBhVzl1S1NCN1hHNGdJQ0FnSUNBZ0lHTnNaV0Z5VkdsdFpXOTFkQ2gwYVcxbGIzVjBTV1FwTzF4dUlDQWdJQ0FnSUNCa1pXWmxjbkpsWkM1eVpXcGxZM1FvWlhoalpYQjBhVzl1S1R0Y2JpQWdJQ0I5TENCa1pXWmxjbkpsWkM1dWIzUnBabmtwTzF4dVhHNGdJQ0FnY21WMGRYSnVJR1JsWm1WeWNtVmtMbkJ5YjIxcGMyVTdYRzU5TzF4dVhHNHZLaXBjYmlBcUlGSmxkSFZ5Ym5NZ1lTQndjbTl0YVhObElHWnZjaUIwYUdVZ1oybDJaVzRnZG1Gc2RXVWdLRzl5SUhCeWIyMXBjMlZrSUhaaGJIVmxLU3dnYzI5dFpWeHVJQ29nYldsc2JHbHpaV052Ym1SeklHRm1kR1Z5SUdsMElISmxjMjlzZG1Wa0xpQlFZWE56WlhNZ2NtVnFaV04wYVc5dWN5QnBiVzFsWkdsaGRHVnNlUzVjYmlBcUlFQndZWEpoYlNCN1FXNTVLbjBnY0hKdmJXbHpaVnh1SUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUcxcGJHeHBjMlZqYjI1a2MxeHVJQ29nUUhKbGRIVnlibk1nWVNCd2NtOXRhWE5sSUdadmNpQjBhR1VnY21WemIyeDFkR2x2YmlCdlppQjBhR1VnWjJsMlpXNGdjSEp2YldselpTQmhablJsY2lCdGFXeHNhWE5sWTI5dVpITmNiaUFxSUhScGJXVWdhR0Z6SUdWc1lYQnpaV1FnYzJsdVkyVWdkR2hsSUhKbGMyOXNkWFJwYjI0Z2IyWWdkR2hsSUdkcGRtVnVJSEJ5YjIxcGMyVXVYRzRnS2lCSlppQjBhR1VnWjJsMlpXNGdjSEp2YldselpTQnlaV3BsWTNSekxDQjBhR0YwSUdseklIQmhjM05sWkNCcGJXMWxaR2xoZEdWc2VTNWNiaUFxTDF4dVVTNWtaV3hoZVNBOUlHWjFibU4wYVc5dUlDaHZZbXBsWTNRc0lIUnBiV1Z2ZFhRcElIdGNiaUFnSUNCcFppQW9kR2x0Wlc5MWRDQTlQVDBnZG05cFpDQXdLU0I3WEc0Z0lDQWdJQ0FnSUhScGJXVnZkWFFnUFNCdlltcGxZM1E3WEc0Z0lDQWdJQ0FnSUc5aWFtVmpkQ0E5SUhadmFXUWdNRHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUZFb2IySnFaV04wS1M1a1pXeGhlU2gwYVcxbGIzVjBLVHRjYm4wN1hHNWNibEJ5YjIxcGMyVXVjSEp2ZEc5MGVYQmxMbVJsYkdGNUlEMGdablZ1WTNScGIyNGdLSFJwYldWdmRYUXBJSHRjYmlBZ0lDQnlaWFIxY200Z2RHaHBjeTUwYUdWdUtHWjFibU4wYVc5dUlDaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnWkdWbVpYSnlaV1FnUFNCa1pXWmxjaWdwTzF4dUlDQWdJQ0FnSUNCelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHUmxabVZ5Y21Wa0xuSmxjMjlzZG1Vb2RtRnNkV1VwTzF4dUlDQWdJQ0FnSUNCOUxDQjBhVzFsYjNWMEtUdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHUmxabVZ5Y21Wa0xuQnliMjFwYzJVN1hHNGdJQ0FnZlNrN1hHNTlPMXh1WEc0dktpcGNiaUFxSUZCaGMzTmxjeUJoSUdOdmJuUnBiblZoZEdsdmJpQjBieUJoSUU1dlpHVWdablZ1WTNScGIyNHNJSGRvYVdOb0lHbHpJR05oYkd4bFpDQjNhWFJvSUhSb1pTQm5hWFpsYmx4dUlDb2dZWEpuZFcxbGJuUnpJSEJ5YjNacFpHVmtJR0Z6SUdGdUlHRnljbUY1TENCaGJtUWdjbVYwZFhKdWN5QmhJSEJ5YjIxcGMyVXVYRzRnS2x4dUlDb2dJQ0FnSUNCUkxtNW1ZWEJ3Ykhrb1JsTXVjbVZoWkVacGJHVXNJRnRmWDJacGJHVnVZVzFsWFNsY2JpQXFJQ0FnSUNBZ0xuUm9aVzRvWm5WdVkzUnBiMjRnS0dOdmJuUmxiblFwSUh0Y2JpQXFJQ0FnSUNBZ2ZTbGNiaUFxWEc0Z0tpOWNibEV1Ym1aaGNIQnNlU0E5SUdaMWJtTjBhVzl1SUNoallXeHNZbUZqYXl3Z1lYSm5jeWtnZTF4dUlDQWdJSEpsZEhWeWJpQlJLR05oYkd4aVlXTnJLUzV1Wm1Gd2NHeDVLR0Z5WjNNcE8xeHVmVHRjYmx4dVVISnZiV2x6WlM1d2NtOTBiM1I1Y0dVdWJtWmhjSEJzZVNBOUlHWjFibU4wYVc5dUlDaGhjbWR6S1NCN1hHNGdJQ0FnZG1GeUlHUmxabVZ5Y21Wa0lEMGdaR1ZtWlhJb0tUdGNiaUFnSUNCMllYSWdibTlrWlVGeVozTWdQU0JoY25KaGVWOXpiR2xqWlNoaGNtZHpLVHRjYmlBZ0lDQnViMlJsUVhKbmN5NXdkWE5vS0dSbFptVnljbVZrTG0xaGEyVk9iMlJsVW1WemIyeDJaWElvS1NrN1hHNGdJQ0FnZEdocGN5NW1ZWEJ3Ykhrb2JtOWtaVUZ5WjNNcExtWmhhV3dvWkdWbVpYSnlaV1F1Y21WcVpXTjBLVHRjYmlBZ0lDQnlaWFIxY200Z1pHVm1aWEp5WldRdWNISnZiV2x6WlR0Y2JuMDdYRzVjYmk4cUtseHVJQ29nVUdGemMyVnpJR0VnWTI5dWRHbHVkV0YwYVc5dUlIUnZJR0VnVG05a1pTQm1kVzVqZEdsdmJpd2dkMmhwWTJnZ2FYTWdZMkZzYkdWa0lIZHBkR2dnZEdobElHZHBkbVZ1WEc0Z0tpQmhjbWQxYldWdWRITWdjSEp2ZG1sa1pXUWdhVzVrYVhacFpIVmhiR3g1TENCaGJtUWdjbVYwZFhKdWN5QmhJSEJ5YjIxcGMyVXVYRzRnS2lCQVpYaGhiWEJzWlZ4dUlDb2dVUzV1Wm1OaGJHd29SbE11Y21WaFpFWnBiR1VzSUY5ZlptbHNaVzVoYldVcFhHNGdLaUF1ZEdobGJpaG1kVzVqZEdsdmJpQW9ZMjl1ZEdWdWRDa2dlMXh1SUNvZ2ZTbGNiaUFxWEc0Z0tpOWNibEV1Ym1aallXeHNJRDBnWm5WdVkzUnBiMjRnS0dOaGJHeGlZV05ySUM4cUxpNHVZWEpuY3lvdktTQjdYRzRnSUNBZ2RtRnlJR0Z5WjNNZ1BTQmhjbkpoZVY5emJHbGpaU2hoY21kMWJXVnVkSE1zSURFcE8xeHVJQ0FnSUhKbGRIVnliaUJSS0dOaGJHeGlZV05yS1M1dVptRndjR3g1S0dGeVozTXBPMXh1ZlR0Y2JseHVVSEp2YldselpTNXdjbTkwYjNSNWNHVXVibVpqWVd4c0lEMGdablZ1WTNScGIyNGdLQzhxTGk0dVlYSm5jeW92S1NCN1hHNGdJQ0FnZG1GeUlHNXZaR1ZCY21keklEMGdZWEp5WVhsZmMyeHBZMlVvWVhKbmRXMWxiblJ6S1R0Y2JpQWdJQ0IyWVhJZ1pHVm1aWEp5WldRZ1BTQmtaV1psY2lncE8xeHVJQ0FnSUc1dlpHVkJjbWR6TG5CMWMyZ29aR1ZtWlhKeVpXUXViV0ZyWlU1dlpHVlNaWE52YkhabGNpZ3BLVHRjYmlBZ0lDQjBhR2x6TG1aaGNIQnNlU2h1YjJSbFFYSm5jeWt1Wm1GcGJDaGtaV1psY25KbFpDNXlaV3BsWTNRcE8xeHVJQ0FnSUhKbGRIVnliaUJrWldabGNuSmxaQzV3Y205dGFYTmxPMXh1ZlR0Y2JseHVMeW9xWEc0Z0tpQlhjbUZ3Y3lCaElFNXZaR1ZLVXlCamIyNTBhVzUxWVhScGIyNGdjR0Z6YzJsdVp5Qm1kVzVqZEdsdmJpQmhibVFnY21WMGRYSnVjeUJoYmlCbGNYVnBkbUZzWlc1MFhHNGdLaUIyWlhKemFXOXVJSFJvWVhRZ2NtVjBkWEp1Y3lCaElIQnliMjFwYzJVdVhHNGdLaUJBWlhoaGJYQnNaVnh1SUNvZ1VTNXVabUpwYm1Rb1JsTXVjbVZoWkVacGJHVXNJRjlmWm1sc1pXNWhiV1VwS0Z3aWRYUm1MVGhjSWlsY2JpQXFJQzUwYUdWdUtHTnZibk52YkdVdWJHOW5LVnh1SUNvZ0xtUnZibVVvS1Z4dUlDb3ZYRzVSTG01bVltbHVaQ0E5WEc1UkxtUmxibTlrWldsbWVTQTlJR1oxYm1OMGFXOXVJQ2hqWVd4c1ltRmpheUF2S2k0dUxtRnlaM01xTHlrZ2UxeHVJQ0FnSUhaaGNpQmlZWE5sUVhKbmN5QTlJR0Z5Y21GNVgzTnNhV05sS0dGeVozVnRaVzUwY3l3Z01TazdYRzRnSUNBZ2NtVjBkWEp1SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUc1dlpHVkJjbWR6SUQwZ1ltRnpaVUZ5WjNNdVkyOXVZMkYwS0dGeWNtRjVYM05zYVdObEtHRnlaM1Z0Wlc1MGN5a3BPMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pHVm1aWEp5WldRZ1BTQmtaV1psY2lncE8xeHVJQ0FnSUNBZ0lDQnViMlJsUVhKbmN5NXdkWE5vS0dSbFptVnljbVZrTG0xaGEyVk9iMlJsVW1WemIyeDJaWElvS1NrN1hHNGdJQ0FnSUNBZ0lGRW9ZMkZzYkdKaFkyc3BMbVpoY0hCc2VTaHViMlJsUVhKbmN5a3VabUZwYkNoa1pXWmxjbkpsWkM1eVpXcGxZM1FwTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWkdWbVpYSnlaV1F1Y0hKdmJXbHpaVHRjYmlBZ0lDQjlPMXh1ZlR0Y2JseHVVSEp2YldselpTNXdjbTkwYjNSNWNHVXVibVppYVc1a0lEMWNibEJ5YjIxcGMyVXVjSEp2ZEc5MGVYQmxMbVJsYm05a1pXbG1lU0E5SUdaMWJtTjBhVzl1SUNndktpNHVMbUZ5WjNNcUx5a2dlMXh1SUNBZ0lIWmhjaUJoY21keklEMGdZWEp5WVhsZmMyeHBZMlVvWVhKbmRXMWxiblJ6S1R0Y2JpQWdJQ0JoY21kekxuVnVjMmhwWm5Rb2RHaHBjeWs3WEc0Z0lDQWdjbVYwZFhKdUlGRXVaR1Z1YjJSbGFXWjVMbUZ3Y0d4NUtIWnZhV1FnTUN3Z1lYSm5jeWs3WEc1OU8xeHVYRzVSTG01aWFXNWtJRDBnWm5WdVkzUnBiMjRnS0dOaGJHeGlZV05yTENCMGFHbHpjQ0F2S2k0dUxtRnlaM01xTHlrZ2UxeHVJQ0FnSUhaaGNpQmlZWE5sUVhKbmN5QTlJR0Z5Y21GNVgzTnNhV05sS0dGeVozVnRaVzUwY3l3Z01pazdYRzRnSUNBZ2NtVjBkWEp1SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUc1dlpHVkJjbWR6SUQwZ1ltRnpaVUZ5WjNNdVkyOXVZMkYwS0dGeWNtRjVYM05zYVdObEtHRnlaM1Z0Wlc1MGN5a3BPMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pHVm1aWEp5WldRZ1BTQmtaV1psY2lncE8xeHVJQ0FnSUNBZ0lDQnViMlJsUVhKbmN5NXdkWE5vS0dSbFptVnljbVZrTG0xaGEyVk9iMlJsVW1WemIyeDJaWElvS1NrN1hHNGdJQ0FnSUNBZ0lHWjFibU4wYVc5dUlHSnZkVzVrS0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR05oYkd4aVlXTnJMbUZ3Y0d4NUtIUm9hWE53TENCaGNtZDFiV1Z1ZEhNcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJRkVvWW05MWJtUXBMbVpoY0hCc2VTaHViMlJsUVhKbmN5a3VabUZwYkNoa1pXWmxjbkpsWkM1eVpXcGxZM1FwTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWkdWbVpYSnlaV1F1Y0hKdmJXbHpaVHRjYmlBZ0lDQjlPMXh1ZlR0Y2JseHVVSEp2YldselpTNXdjbTkwYjNSNWNHVXVibUpwYm1RZ1BTQm1kVzVqZEdsdmJpQW9MeXAwYUdsemNDd2dMaTR1WVhKbmN5b3ZLU0I3WEc0Z0lDQWdkbUZ5SUdGeVozTWdQU0JoY25KaGVWOXpiR2xqWlNoaGNtZDFiV1Z1ZEhNc0lEQXBPMXh1SUNBZ0lHRnlaM011ZFc1emFHbG1kQ2gwYUdsektUdGNiaUFnSUNCeVpYUjFjbTRnVVM1dVltbHVaQzVoY0hCc2VTaDJiMmxrSURBc0lHRnlaM01wTzF4dWZUdGNibHh1THlvcVhHNGdLaUJEWVd4c2N5QmhJRzFsZEdodlpDQnZaaUJoSUU1dlpHVXRjM1I1YkdVZ2IySnFaV04wSUhSb1lYUWdZV05qWlhCMGN5QmhJRTV2WkdVdGMzUjViR1ZjYmlBcUlHTmhiR3hpWVdOcklIZHBkR2dnWVNCbmFYWmxiaUJoY25KaGVTQnZaaUJoY21kMWJXVnVkSE1zSUhCc2RYTWdZU0J3Y205MmFXUmxaQ0JqWVd4c1ltRmpheTVjYmlBcUlFQndZWEpoYlNCdlltcGxZM1FnWVc0Z2IySnFaV04wSUhSb1lYUWdhR0Z6SUhSb1pTQnVZVzFsWkNCdFpYUm9iMlJjYmlBcUlFQndZWEpoYlNCN1UzUnlhVzVuZlNCdVlXMWxJRzVoYldVZ2IyWWdkR2hsSUcxbGRHaHZaQ0J2WmlCdlltcGxZM1JjYmlBcUlFQndZWEpoYlNCN1FYSnlZWGw5SUdGeVozTWdZWEpuZFcxbGJuUnpJSFJ2SUhCaGMzTWdkRzhnZEdobElHMWxkR2h2WkRzZ2RHaGxJR05oYkd4aVlXTnJYRzRnS2lCM2FXeHNJR0psSUhCeWIzWnBaR1ZrSUdKNUlGRWdZVzVrSUdGd2NHVnVaR1ZrSUhSdklIUm9aWE5sSUdGeVozVnRaVzUwY3k1Y2JpQXFJRUJ5WlhSMWNtNXpJR0VnY0hKdmJXbHpaU0JtYjNJZ2RHaGxJSFpoYkhWbElHOXlJR1Z5Y205eVhHNGdLaTljYmxFdWJtMWhjSEJzZVNBOUlDOHZJRmhZV0NCQmN5QndjbTl3YjNObFpDQmllU0JjSWxKbFpITmhibVJ5YjF3aVhHNVJMbTV3YjNOMElEMGdablZ1WTNScGIyNGdLRzlpYW1WamRDd2dibUZ0WlN3Z1lYSm5jeWtnZTF4dUlDQWdJSEpsZEhWeWJpQlJLRzlpYW1WamRDa3VibkJ2YzNRb2JtRnRaU3dnWVhKbmN5azdYRzU5TzF4dVhHNVFjbTl0YVhObExuQnliM1J2ZEhsd1pTNXViV0Z3Y0d4NUlEMGdMeThnV0ZoWUlFRnpJSEJ5YjNCdmMyVmtJR0o1SUZ3aVVtVmtjMkZ1WkhKdlhDSmNibEJ5YjIxcGMyVXVjSEp2ZEc5MGVYQmxMbTV3YjNOMElEMGdablZ1WTNScGIyNGdLRzVoYldVc0lHRnlaM01wSUh0Y2JpQWdJQ0IyWVhJZ2JtOWtaVUZ5WjNNZ1BTQmhjbkpoZVY5emJHbGpaU2hoY21keklIeDhJRnRkS1R0Y2JpQWdJQ0IyWVhJZ1pHVm1aWEp5WldRZ1BTQmtaV1psY2lncE8xeHVJQ0FnSUc1dlpHVkJjbWR6TG5CMWMyZ29aR1ZtWlhKeVpXUXViV0ZyWlU1dlpHVlNaWE52YkhabGNpZ3BLVHRjYmlBZ0lDQjBhR2x6TG1ScGMzQmhkR05vS0Z3aWNHOXpkRndpTENCYmJtRnRaU3dnYm05a1pVRnlaM05kS1M1bVlXbHNLR1JsWm1WeWNtVmtMbkpsYW1WamRDazdYRzRnSUNBZ2NtVjBkWEp1SUdSbFptVnljbVZrTG5CeWIyMXBjMlU3WEc1OU8xeHVYRzR2S2lwY2JpQXFJRU5oYkd4eklHRWdiV1YwYUc5a0lHOW1JR0VnVG05a1pTMXpkSGxzWlNCdlltcGxZM1FnZEdoaGRDQmhZMk5sY0hSeklHRWdUbTlrWlMxemRIbHNaVnh1SUNvZ1kyRnNiR0poWTJzc0lHWnZjbmRoY21ScGJtY2dkR2hsSUdkcGRtVnVJSFpoY21saFpHbGpJR0Z5WjNWdFpXNTBjeXdnY0d4MWN5QmhJSEJ5YjNacFpHVmtYRzRnS2lCallXeHNZbUZqYXlCaGNtZDFiV1Z1ZEM1Y2JpQXFJRUJ3WVhKaGJTQnZZbXBsWTNRZ1lXNGdiMkpxWldOMElIUm9ZWFFnYUdGeklIUm9aU0J1WVcxbFpDQnRaWFJvYjJSY2JpQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQnVZVzFsSUc1aGJXVWdiMllnZEdobElHMWxkR2h2WkNCdlppQnZZbXBsWTNSY2JpQXFJRUJ3WVhKaGJTQXVMaTVoY21keklHRnlaM1Z0Wlc1MGN5QjBieUJ3WVhOeklIUnZJSFJvWlNCdFpYUm9iMlE3SUhSb1pTQmpZV3hzWW1GamF5QjNhV3hzWEc0Z0tpQmlaU0J3Y205MmFXUmxaQ0JpZVNCUklHRnVaQ0JoY0hCbGJtUmxaQ0IwYnlCMGFHVnpaU0JoY21kMWJXVnVkSE11WEc0Z0tpQkFjbVYwZFhKdWN5QmhJSEJ5YjIxcGMyVWdabTl5SUhSb1pTQjJZV3gxWlNCdmNpQmxjbkp2Y2x4dUlDb3ZYRzVSTG01elpXNWtJRDBnTHk4Z1dGaFlJRUpoYzJWa0lHOXVJRTFoY21zZ1RXbHNiR1Z5SjNNZ2NISnZjRzl6WldRZ1hDSnpaVzVrWENKY2JsRXVibTFqWVd4c0lEMGdMeThnV0ZoWUlFSmhjMlZrSUc5dUlGd2lVbVZrYzJGdVpISnZKM05jSWlCd2NtOXdiM05oYkZ4dVVTNXVhVzUyYjJ0bElEMGdablZ1WTNScGIyNGdLRzlpYW1WamRDd2dibUZ0WlNBdktpNHVMbUZ5WjNNcUx5a2dlMXh1SUNBZ0lIWmhjaUJ1YjJSbFFYSm5jeUE5SUdGeWNtRjVYM05zYVdObEtHRnlaM1Z0Wlc1MGN5d2dNaWs3WEc0Z0lDQWdkbUZ5SUdSbFptVnljbVZrSUQwZ1pHVm1aWElvS1R0Y2JpQWdJQ0J1YjJSbFFYSm5jeTV3ZFhOb0tHUmxabVZ5Y21Wa0xtMWhhMlZPYjJSbFVtVnpiMngyWlhJb0tTazdYRzRnSUNBZ1VTaHZZbXBsWTNRcExtUnBjM0JoZEdOb0tGd2ljRzl6ZEZ3aUxDQmJibUZ0WlN3Z2JtOWtaVUZ5WjNOZEtTNW1ZV2xzS0dSbFptVnljbVZrTG5KbGFtVmpkQ2s3WEc0Z0lDQWdjbVYwZFhKdUlHUmxabVZ5Y21Wa0xuQnliMjFwYzJVN1hHNTlPMXh1WEc1UWNtOXRhWE5sTG5CeWIzUnZkSGx3WlM1dWMyVnVaQ0E5SUM4dklGaFlXQ0JDWVhObFpDQnZiaUJOWVhKcklFMXBiR3hsY2lkeklIQnliM0J2YzJWa0lGd2ljMlZ1WkZ3aVhHNVFjbTl0YVhObExuQnliM1J2ZEhsd1pTNXViV05oYkd3Z1BTQXZMeUJZV0ZnZ1FtRnpaV1FnYjI0Z1hDSlNaV1J6WVc1a2NtOG5jMXdpSUhCeWIzQnZjMkZzWEc1UWNtOXRhWE5sTG5CeWIzUnZkSGx3WlM1dWFXNTJiMnRsSUQwZ1puVnVZM1JwYjI0Z0tHNWhiV1VnTHlvdUxpNWhjbWR6S2k4cElIdGNiaUFnSUNCMllYSWdibTlrWlVGeVozTWdQU0JoY25KaGVWOXpiR2xqWlNoaGNtZDFiV1Z1ZEhNc0lERXBPMXh1SUNBZ0lIWmhjaUJrWldabGNuSmxaQ0E5SUdSbFptVnlLQ2s3WEc0Z0lDQWdibTlrWlVGeVozTXVjSFZ6YUNoa1pXWmxjbkpsWkM1dFlXdGxUbTlrWlZKbGMyOXNkbVZ5S0NrcE8xeHVJQ0FnSUhSb2FYTXVaR2x6Y0dGMFkyZ29YQ0p3YjNOMFhDSXNJRnR1WVcxbExDQnViMlJsUVhKbmMxMHBMbVpoYVd3b1pHVm1aWEp5WldRdWNtVnFaV04wS1R0Y2JpQWdJQ0J5WlhSMWNtNGdaR1ZtWlhKeVpXUXVjSEp2YldselpUdGNibjA3WEc1Y2JpOHFLbHh1SUNvZ1NXWWdZU0JtZFc1amRHbHZiaUIzYjNWc1pDQnNhV3RsSUhSdklITjFjSEJ2Y25RZ1ltOTBhQ0JPYjJSbElHTnZiblJwYm5WaGRHbHZiaTF3WVhOemFXNW5MWE4wZVd4bElHRnVaRnh1SUNvZ2NISnZiV2x6WlMxeVpYUjFjbTVwYm1jdGMzUjViR1VzSUdsMElHTmhiaUJsYm1RZ2FYUnpJR2x1ZEdWeWJtRnNJSEJ5YjIxcGMyVWdZMmhoYVc0Z2QybDBhRnh1SUNvZ1lHNXZaR1ZwWm5rb2JtOWtaV0poWTJzcFlDd2dabTl5ZDJGeVpHbHVaeUIwYUdVZ2IzQjBhVzl1WVd3Z2JtOWtaV0poWTJzZ1lYSm5kVzFsYm5RdUlDQkpaaUIwYUdVZ2RYTmxjbHh1SUNvZ1pXeGxZM1J6SUhSdklIVnpaU0JoSUc1dlpHVmlZV05yTENCMGFHVWdjbVZ6ZFd4MElIZHBiR3dnWW1VZ2MyVnVkQ0IwYUdWeVpTNGdJRWxtSUhSb1pYa2daRzhnYm05MFhHNGdLaUJ3WVhOeklHRWdibTlrWldKaFkyc3NJSFJvWlhrZ2QybHNiQ0J5WldObGFYWmxJSFJvWlNCeVpYTjFiSFFnY0hKdmJXbHpaUzVjYmlBcUlFQndZWEpoYlNCdlltcGxZM1FnWVNCeVpYTjFiSFFnS0c5eUlHRWdjSEp2YldselpTQm1iM0lnWVNCeVpYTjFiSFFwWEc0Z0tpQkFjR0Z5WVcwZ2UwWjFibU4wYVc5dWZTQnViMlJsWW1GamF5QmhJRTV2WkdVdWFuTXRjM1I1YkdVZ1kyRnNiR0poWTJ0Y2JpQXFJRUJ5WlhSMWNtNXpJR1ZwZEdobGNpQjBhR1VnY0hKdmJXbHpaU0J2Y2lCdWIzUm9hVzVuWEc0Z0tpOWNibEV1Ym05a1pXbG1lU0E5SUc1dlpHVnBabms3WEc1bWRXNWpkR2x2YmlCdWIyUmxhV1o1S0c5aWFtVmpkQ3dnYm05a1pXSmhZMnNwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdVU2h2WW1wbFkzUXBMbTV2WkdWcFpua29ibTlrWldKaFkyc3BPMXh1ZlZ4dVhHNVFjbTl0YVhObExuQnliM1J2ZEhsd1pTNXViMlJsYVdaNUlEMGdablZ1WTNScGIyNGdLRzV2WkdWaVlXTnJLU0I3WEc0Z0lDQWdhV1lnS0c1dlpHVmlZV05yS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11ZEdobGJpaG1kVzVqZEdsdmJpQW9kbUZzZFdVcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUZFdWJtVjRkRlJwWTJzb1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzV2WkdWaVlXTnJLRzUxYkd3c0lIWmhiSFZsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNCOUxDQm1kVzVqZEdsdmJpQW9aWEp5YjNJcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUZFdWJtVjRkRlJwWTJzb1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzV2WkdWaVlXTnJLR1Z5Y205eUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RHaHBjenRjYmlBZ0lDQjlYRzU5TzF4dVhHNVJMbTV2UTI5dVpteHBZM1FnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNCMGFISnZkeUJ1WlhjZ1JYSnliM0lvWENKUkxtNXZRMjl1Wm14cFkzUWdiMjVzZVNCM2IzSnJjeUIzYUdWdUlGRWdhWE1nZFhObFpDQmhjeUJoSUdkc2IySmhiRndpS1R0Y2JuMDdYRzVjYmk4dklFRnNiQ0JqYjJSbElHSmxabTl5WlNCMGFHbHpJSEJ2YVc1MElIZHBiR3dnWW1VZ1ptbHNkR1Z5WldRZ1puSnZiU0J6ZEdGamF5QjBjbUZqWlhNdVhHNTJZWElnY1VWdVpHbHVaMHhwYm1VZ1BTQmpZWEIwZFhKbFRHbHVaU2dwTzF4dVhHNXlaWFIxY200Z1VUdGNibHh1ZlNrN1hHNGlYWDA9IiwidmFyIFEgPSByZXF1aXJlKCdxJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnbm9kZS1ldmVudC1lbWl0dGVyJyk7XG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLyBMb2dnaW5nIHV0aWxpdHkgbWV0aG9kcyAvLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbnZhciBERUJVRyA9IGZhbHNlO1xudmFyIExvZ2dlciA9IHtcblx0bG9nOiBmdW5jdGlvbihtZXNzYWdlKXtcblx0XHRpZihERUJVRykgY29uc29sZS5sb2cobWVzc2FnZSk7XG5cdH0sXG5cblx0ZXJyb3I6IGZ1bmN0aW9uKG1lc3NhZ2Upe1xuXHRcdGlmKERFQlVHKSBjb25zb2xlLmVycm9yKG1lc3NhZ2UpO1xuXHR9XG59XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5mdW5jdGlvbiBEaXlhTm9kZSgpe1xuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLl9zdGF0dXMgPSAnY2xvc2VkJztcblx0dGhpcy5fYWRkciA9IG51bGw7XG5cdHRoaXMuX3NvY2tldCA9IG51bGw7XG5cdHRoaXMuX25leHRJZCA9IDA7XG5cdHRoaXMuX2Nvbm5lY3Rpb25EZWZlcnJlZCA9IG51bGw7XG5cdHRoaXMuX2Rpc2Nvbm5lY3Rpb25EZWZlcnJlZCA9IG51bGw7XG5cdHRoaXMuX3BlbmRpbmdNZXNzYWdlcyA9IFtdO1xuXHR0aGlzLl9wZWVycyA9IFtdO1xuXHR0aGlzLl9yZWNvbm5lY3RUaW1lb3V0ID0gMTAwMDtcblx0dGhpcy5fY29ubmVjdFRpbWVvdXQgPSA1MDAwO1xufVxuaW5oZXJpdHMoRGl5YU5vZGUsIEV2ZW50RW1pdHRlcik7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLyBQdWJsaWMgQVBJIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuRGl5YU5vZGUucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbihhZGRyLCBXU29ja2V0KXtcblx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdGlmKHRoaXMuX2FkZHIgPT09IGFkZHIpe1xuXHRcdGlmKHRoaXMuX3N0YXR1cyA9PT0gJ29wZW5lZCcpXG5cdFx0XHRyZXR1cm4gUSgpO1xuXHRcdGVsc2UgaWYodGhpcy5fY29ubmVjdGlvbkRlZmVycmVkICYmICF0aGlzLl9jb25uZWN0aW9uRGVmZXJyZWQucHJvbWlzZS5pc0Z1bGZpbGxlZCgpKVxuXHRcdFx0cmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb25EZWZlcnJlZC5wcm9taXNlO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuY2xvc2UoKS50aGVuKGZ1bmN0aW9uKCl7XG5cblx0XHRMb2dnZXIubG9nKCdkMTogY29ubmVjdCcpO1xuXG5cdFx0dGhhdC5fYWRkciA9IGFkZHI7XG5cblx0XHR0aGF0Ll9jb25uZWN0aW9uRGVmZXJyZWQgPSBRLmRlZmVyKCk7XG5cblx0XHRpZighV1NvY2tldCkgV1NvY2tldCA9IHdpbmRvdy5XZWJTb2NrZXQ7XG5cdFx0dGhhdC5fV1NvY2tldCA9IFdTb2NrZXQ7XG5cblx0XHR0aGF0Ll9zb2NrZXQgPSBuZXcgV1NvY2tldCh0aGF0Ll9hZGRyKTtcblxuXHRcdHRoYXQuX3NvY2tldE9wZW5DYWxsYmFjayA9IHRoYXQuX29ub3Blbi5iaW5kKHRoYXQpO1xuXHRcdHRoYXQuX3NvY2tldENsb3NlQ2FsbGJhY2sgPSB0aGF0Ll9vbmNsb3NlLmJpbmQodGhhdCk7XG5cdFx0dGhhdC5fc29ja2V0TWVzc2FnZUNhbGxiYWNrID0gdGhhdC5fb25tZXNzYWdlLmJpbmQodGhhdCk7XG5cblx0XHR0aGF0Ll9zb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignb3BlbicsIHRoYXQuX3NvY2tldE9wZW5DYWxsYmFjayk7XG5cdFx0dGhhdC5fc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJyx0aGF0Ll9zb2NrZXRDbG9zZUNhbGxiYWNrKTtcblx0XHR0aGF0Ll9zb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHRoYXQuX3NvY2tldE1lc3NhZ2VDYWxsYmFjayk7XG5cblxuXHRcdHRoYXQuX3NvY2tldC5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRMb2dnZXIuZXJyb3IoXCJbV1NdIGVycm9yIDogXCIrZXJyKTtcblx0XHR9KTtcblxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdGlmKHRoYXQuX3N0YXR1cyAhPT0gJ29wZW5lZCcpe1xuXHRcdFx0XHRMb2dnZXIubG9nKCdkMTogdGltZWQgb3V0IHdoaWxlIGNvbm5lY3RpbmcnKTtcblx0XHRcdFx0dGhhdC5fc29ja2V0LmNsb3NlKCk7XG5cdFx0XHR9XG5cdFx0fSwgdGhhdC5fY29ubmVjdFRpbWVvdXQpO1xuXG5cdFx0cmV0dXJuIHRoYXQuX2Nvbm5lY3Rpb25EZWZlcnJlZC5wcm9taXNlO1xuXHR9KTtcbn07XG5cbkRpeWFOb2RlLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCl7XG5cblx0dGhpcy5fc3RvcFBpbmdSZXNwb25zZSgpO1xuXG5cdGlmKHRoaXMuX2Rpc2Nvbm5lY3Rpb25EZWZlcnJlZCkgcmV0dXJuIHRoaXMuX2Rpc2Nvbm5lY3Rpb25EZWZlcnJlZC5wcm9taXNlO1xuXG5cdGVsc2UgaWYodGhpcy5fc29ja2V0ICYmIHRoaXMuX3N0YXR1cyA9PT0gJ29wZW5lZCcpe1xuXHRcdHRoaXMuX2Rpc2Nvbm5lY3Rpb25EZWZlcnJlZCA9IG5ldyBRLmRlZmVyKCk7XG5cdFx0dGhpcy5fc29ja2V0LmNsb3NlKCk7XG5cdFx0cmV0dXJuIHRoaXMuX2Rpc2Nvbm5lY3Rpb25EZWZlcnJlZC5wcm9taXNlO1xuXHR9XG5cblx0ZWxzZSBpZih0aGlzLl9zdGF0dXMgPT09ICdjbG9zZWQnKXtcblx0XHRyZXR1cm4gUSgpO1xuXHR9XG5cblx0ZWxzZXtcblx0XHRyZXR1cm4gUSgpO1xuXHR9XG59O1xuXG5EaXlhTm9kZS5wcm90b3R5cGUuaXNDb25uZWN0ZWQgPSBmdW5jdGlvbigpe1xuXHRyZXR1cm4gKHRoaXMuX3NvY2tldCAmJiB0aGlzLl9zb2NrZXQucmVhZHlTdGF0ZSA9PSB0aGlzLl9XU29ja2V0Lk9QRU4gJiYgdGhpcy5fc3RhdHVzID09PSAnb3BlbmVkJyk7XG59O1xuXG5EaXlhTm9kZS5wcm90b3R5cGUucmVxdWVzdCA9IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2ssIHRpbWVvdXQpe1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0aWYoIXBhcmFtcy5zZXJ2aWNlKSB7XG5cdFx0TG9nZ2VyLmVycm9yKCdObyBzZXJ2aWNlIGRlZmluZWQgZm9yIHJlcXVlc3QgIScpO1xuXHRcdHJldHVybiA7XG5cdH1cblxuXHR2YXIgbWVzc2FnZSA9IHRoaXMuX2NyZWF0ZU1lc3NhZ2UocGFyYW1zLCBcIlJlcXVlc3RcIik7XG5cdHRoaXMuX2FwcGVuZE1lc3NhZ2UobWVzc2FnZSwgY2FsbGJhY2spO1xuXG5cdGlmKCFpc05hTih0aW1lb3V0KSAmJiB0aW1lb3V0ID4gMCl7XG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0dmFyIGhhbmRsZXIgPSB0aGF0Ll9yZW1vdmVNZXNzYWdlKG1lc3NhZ2UuaWQpO1xuXHRcdFx0aWYoaGFuZGxlcikgdGhhdC5fbm90aWZ5TGlzdGVuZXIoaGFuZGxlciwgJ1RpbWVvdXQgZXhjZWVkZWQgKCcrdGltZW91dCsnbXMpICEnKTtcblx0XHR9LCB0aW1lb3V0KTtcblx0fVxuXG5cdGlmKCF0aGlzLl9zZW5kKG1lc3NhZ2UpKXtcblx0XHR0aGlzLl9yZW1vdmVNZXNzYWdlKG1lc3NhZ2UuaWQpO1xuXHRcdExvZ2dlci5lcnJvcignQ2Fubm90IHNlbmQgcmVxdWVzdCAhJyk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0cmV0dXJuIHRydWU7XG59O1xuXG5EaXlhTm9kZS5wcm90b3R5cGUuc3Vic2NyaWJlID0gZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFjayl7XG5cdGlmKCFwYXJhbXMuc2VydmljZSl7XG5cdFx0TG9nZ2VyLmVycm9yKCdObyBzZXJ2aWNlIGRlZmluZWQgZm9yIHN1YnNjcmlwdGlvbiAhJyk7XG5cdFx0cmV0dXJuIDtcblx0fVxuXG5cdHZhciBtZXNzYWdlID0gdGhpcy5fY3JlYXRlTWVzc2FnZShwYXJhbXMsIFwiU3Vic2NyaXB0aW9uXCIpO1xuXHR0aGlzLl9hcHBlbmRNZXNzYWdlKG1lc3NhZ2UsIGNhbGxiYWNrKTtcblxuXHRpZighdGhpcy5fc2VuZChtZXNzYWdlKSl7XG5cdFx0dGhpcy5fcmVtb3ZlTWVzc2FnZShtZXNzYWdlLmlkKTtcblx0XHRMb2dnZXIuZXJyb3IoJ0Nhbm5vdCBzZW5kIHN1YnNjcmlwdGlvbiAhJyk7XG5cdFx0cmV0dXJuIC0xO1xuXHR9XG5cblx0cmV0dXJuIG1lc3NhZ2UuaWQ7XG59O1xuXG5EaXlhTm9kZS5wcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbihzdWJJZCl7XG5cdGlmKHRoaXMuX3BlbmRpbmdNZXNzYWdlc1tzdWJJZF0gJiYgdGhpcy5fcGVuZGluZ01lc3NhZ2VzW3N1YklkXS50eXBlID09PSBcIlN1YnNjcmlwdGlvblwiKXtcblx0XHR2YXIgc3Vic2NyaXB0aW9uID0gdGhpcy5fcmVtb3ZlTWVzc2FnZShzdWJJZCk7XG5cblx0XHR2YXIgbWVzc2FnZSA9IHRoaXMuX2NyZWF0ZU1lc3NhZ2Uoe1xuXHRcdFx0dGFyZ2V0OiBzdWJzY3JpcHRpb24udGFyZ2V0LFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRzdWJJZDogc3ViSWRcblx0XHRcdH1cblx0XHR9LCBcIlVuc3Vic2NyaWJlXCIpO1xuXG5cdFx0aWYoIXRoaXMuX3NlbmQobWVzc2FnZSkpe1xuXHRcdFx0TG9nZ2VyLmVycm9yKCdDYW5ub3Qgc2VuZCB1bnN1YnNjcmliZSAhJyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cbn07XG5cbkRpeWFOb2RlLnByb3RvdHlwZS5wZWVycyA9IGZ1bmN0aW9uKCl7XG5cdHJldHVybiB0aGlzLl9wZWVycztcbn1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vIEludGVybmFsIG1ldGhvZHMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5EaXlhTm9kZS5wcm90b3R5cGUuX2FwcGVuZE1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlLCBjYWxsYmFjayl7XG5cdHRoaXMuX3BlbmRpbmdNZXNzYWdlc1ttZXNzYWdlLmlkXSA9IHtcblx0XHRjYWxsYmFjazogY2FsbGJhY2ssXG5cdFx0dHlwZTogbWVzc2FnZS50eXBlLFxuXHRcdHRhcmdldDogbWVzc2FnZS50YXJnZXRcblx0fTtcbn07XG5cbkRpeWFOb2RlLnByb3RvdHlwZS5fcmVtb3ZlTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2VJZCl7XG5cdHZhciBoYW5kbGVyID0gdGhpcy5fcGVuZGluZ01lc3NhZ2VzW21lc3NhZ2VJZF07XG5cdGlmKGhhbmRsZXIpe1xuXHRcdGRlbGV0ZSB0aGlzLl9wZW5kaW5nTWVzc2FnZXNbbWVzc2FnZUlkXTtcblx0XHRyZXR1cm4gaGFuZGxlcjtcblx0fWVsc2V7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cbn07XG5cbkRpeWFOb2RlLnByb3RvdHlwZS5fY2xlYXJNZXNzYWdlcyA9IGZ1bmN0aW9uKGVyciwgZGF0YSl7XG5cdGZvcih2YXIgbWVzc2FnZUlkIGluIHRoaXMuX3BlbmRpbmdNZXNzYWdlcyl7XG5cdFx0dmFyIGhhbmRsZXIgPSB0aGlzLl9yZW1vdmVNZXNzYWdlKG1lc3NhZ2VJZCk7XG5cdFx0dGhpcy5fbm90aWZ5TGlzdGVuZXIoaGFuZGxlciwgZXJyLCBkYXRhKTtcblx0fVxufTtcblxuRGl5YU5vZGUucHJvdG90eXBlLl9jbGVhclBlZXJzID0gZnVuY3Rpb24oKXtcblx0d2hpbGUodGhpcy5fcGVlcnMubGVuZ3RoKSB0aGlzLmVtaXQoJ3BlZXItZGlzY29ubmVjdGVkJywgdGhpcy5fcGVlcnMucG9wKCkpO1xufVxuXG5EaXlhTm9kZS5wcm90b3R5cGUuX2dldE1lc3NhZ2VIYW5kbGVyID0gZnVuY3Rpb24obWVzc2FnZUlkKXtcblx0dmFyIGhhbmRsZXIgPSB0aGlzLl9wZW5kaW5nTWVzc2FnZXNbbWVzc2FnZUlkXTtcblx0cmV0dXJuIGhhbmRsZXIgPyBoYW5kbGVyIDogbnVsbDtcbn07XG5cbkRpeWFOb2RlLnByb3RvdHlwZS5fbm90aWZ5TGlzdGVuZXIgPSBmdW5jdGlvbihoYW5kbGVyLCBlcnJvciwgZGF0YSl7XG5cdGlmKGhhbmRsZXIgJiYgdHlwZW9mIGhhbmRsZXIuY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcblx0XHRlcnJvciA9IGVycm9yID8gZXJyb3IgOiBudWxsO1xuXHRcdGRhdGEgPSBkYXRhID8gZGF0YSA6IG51bGw7XG5cdFx0aGFuZGxlci5jYWxsYmFjayhlcnJvciwgZGF0YSk7XG5cdH1cbn07XG5cbkRpeWFOb2RlLnByb3RvdHlwZS5fc2VuZCA9IGZ1bmN0aW9uKG1lc3NhZ2Upe1xuXHR0cnl7XG5cdFx0dmFyIGRhdGEgPSBKU09OLnN0cmluZ2lmeShtZXNzYWdlKTtcblx0fWNhdGNoKGVycil7XG5cdFx0TG9nZ2VyLmVycm9yKCdDYW5ub3Qgc2VyaWFsaXplIG1lc3NhZ2UnKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR0cnl7XG5cdFx0dGhpcy5fc29ja2V0LnNlbmQoZGF0YSk7XG5cdH1jYXRjaChlcnIpe1xuXHRcdExvZ2dlci5lcnJvcignQ2Fubm90IHNlbmQgbWVzc2FnZScpO1xuXHRcdExvZ2dlci5lcnJvcihlcnIpO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHJldHVybiB0cnVlO1xufTtcblxuRGl5YU5vZGUucHJvdG90eXBlLl9zZXR1cFBpbmdSZXNwb25zZSA9IGZ1bmN0aW9uKCl7XG5cdHZhciB0aGF0ID0gdGhpcztcblxuXHR0aGlzLl9waW5nVGltZW91dCA9IDE1MDAwO1xuXHR0aGlzLl9sYXN0UGluZyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG5cdGZ1bmN0aW9uIGNoZWNrUGluZygpe1xuXHRcdHZhciBjdXJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0aWYoY3VyVGltZSAtIHRoYXQuX2xhc3RQaW5nID4gdGhhdC5fcGluZ1RpbWVvdXQpe1xuXHRcdFx0dGhhdC5fZm9yY2VDbG9zZSgpO1xuXHRcdFx0TG9nZ2VyLmxvZyhcImQxOiBjb25uZWN0aW9uIHRpbWVkIG91dCAhXCIpO1xuXHRcdH1lbHNle1xuXHRcdFx0TG9nZ2VyLmxvZyhcImQxOiBsYXN0IHBpbmcgb2tcIik7XG5cdFx0XHR0aGF0Ll9waW5nU2V0VGltZW91dElkID0gc2V0VGltZW91dChjaGVja1BpbmcsIE1hdGgucm91bmQodGhhdC5fcGluZ1RpbWVvdXQgLyAyLjEpKTtcblx0XHR9XG5cdH1cblxuXHRjaGVja1BpbmcoKTtcbn07XG5cbkRpeWFOb2RlLnByb3RvdHlwZS5fc3RvcFBpbmdSZXNwb25zZSA9IGZ1bmN0aW9uKCl7XG5cdGNsZWFyVGltZW91dCh0aGlzLl9waW5nU2V0VGltZW91dElkKTtcbn07XG5cbkRpeWFOb2RlLnByb3RvdHlwZS5fZm9yY2VDbG9zZSA9IGZ1bmN0aW9uKCl7XG5cdHRoaXMuX3NvY2tldC5jbG9zZSgpO1xuXHR0aGlzLl9vbmNsb3NlKCk7XG59XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLyBTb2NrZXQgZXZlbnQgaGFuZGxlcnMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5EaXlhTm9kZS5wcm90b3R5cGUuX29ub3BlbiA9IGZ1bmN0aW9uKCl7XG5cdHRoaXMuX3NldHVwUGluZ1Jlc3BvbnNlKCk7XG59O1xuXG5cbkRpeWFOb2RlLnByb3RvdHlwZS5fb25tZXNzYWdlID0gZnVuY3Rpb24oZXZ0KXtcblx0dHJ5e1xuXHRcdHZhciBtZXNzYWdlID0gSlNPTi5wYXJzZShldnQuZGF0YSk7XG5cdH1jYXRjaChlcnIpe1xuXHRcdExvZ2dlci5lcnJvcihcIltXU10gY2Fubm90IHBhcnNlIG1lc3NhZ2UsIGRyb3BwaW5nLi4uXCIpO1xuXHRcdHJldHVybiA7XG5cdH1cblxuXHRpZihpc05hTihtZXNzYWdlLmlkKSkge1xuXHRcdHRoaXMuX2hhbmRsZUludGVybmFsTWVzc2FnZShtZXNzYWdlKTtcblx0fWVsc2V7XG5cdFx0dmFyIGhhbmRsZXIgPSB0aGlzLl9nZXRNZXNzYWdlSGFuZGxlcihtZXNzYWdlLmlkKTtcblx0XHRpZihoYW5kbGVyKXtcblx0XHRcdHN3aXRjaChoYW5kbGVyLnR5cGUpe1xuXHRcdFx0XHRjYXNlIFwiUmVxdWVzdFwiOlxuXHRcdFx0XHRcdHRoaXMuX2hhbmRsZVJlcXVlc3QoaGFuZGxlciwgbWVzc2FnZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgXCJTdWJzY3JpcHRpb25cIjpcblx0XHRcdFx0XHR0aGlzLl9oYW5kbGVTdWJzY3JpcHRpb24oaGFuZGxlciwgbWVzc2FnZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG5EaXlhTm9kZS5wcm90b3R5cGUuX29uY2xvc2UgPSBmdW5jdGlvbigpe1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0aWYodGhpcy5fc29ja2V0ICYmICh0eXBlb2YgdGhpcy5fc29ja2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIgPT09ICdmdW5jdGlvbicpKXtcblx0XHR0aGlzLl9zb2NrZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignb3BlbicsIHRoaXMuX3NvY2tldE9wZW5DYWxsYmFjayk7XG5cdFx0dGhpcy5fc29ja2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgdGhpcy5fc29ja2V0Q2xvc2VDYWxsYmFjayk7XG5cdFx0dGhpcy5fc29ja2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCB0aGlzLl9zb2NrZXRNZXNzYWdlQ2FsbGJhY2spO1xuXHR9ZWxzZSBpZih0aGlzLl9zb2NrZXQgJiYgKHR5cGVvZiB0aGlzLl9zb2NrZXQucmVtb3ZlQWxsTGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSl7XG5cdFx0dGhpcy5fc29ja2V0LnJlbW92ZUFsbExpc3RlbmVycygpO1xuXHR9XG5cblx0TG9nZ2VyLmxvZyhcImQxOiBvbiBjbG9zZVwiKTtcblxuXHR0aGlzLl9zdG9wUGluZ1Jlc3BvbnNlKCk7XG5cblx0dGhpcy5fY2xlYXJNZXNzYWdlcygnUGVlckRpc2Nvbm5lY3RlZCcpO1xuXHR0aGlzLl9jbGVhclBlZXJzKCk7XG5cdHRoaXMuX3N0YXR1cyA9ICdjbG9zZWQnO1xuXG5cdGlmKHRoaXMuX2Nvbm5lY3Rpb25EZWZlcnJlZCl7XG5cdFx0TG9nZ2VyLmxvZygnZDE6IGNvbm5lY3Rpb24gZmFpbGVkJyk7XG5cdFx0dGhpcy5fY29ubmVjdGlvbkRlZmVycmVkLnJlamVjdChcImQxOiBjb25uZWN0aW9uIGZhaWxlZFwiKTtcblx0XHR0aGlzLl9jb25uZWN0aW9uRGVmZXJyZWQgPSBudWxsO1xuXHR9XG5cblx0Ly9pZiBjbG9zZSB3YXMgcmVxdWVzdGVkLCByZXNvbHZlIHByb21pc2Vcblx0aWYodGhpcy5fZGlzY29ubmVjdGlvbkRlZmVycmVkKXtcblx0XHRMb2dnZXIubG9nKCdkMTogZGlzY29ubmVjdGlvbiBkb25lJyk7XG5cdFx0dGhpcy5fZGlzY29ubmVjdGlvbkRlZmVycmVkLnJlc29sdmUoKTtcblx0XHR0aGlzLl9kaXNjb25uZWN0aW9uRGVmZXJyZWQgPSBudWxsO1xuXHR9XG5cdC8vT3RoZXJ3aXNlLCB0cnkgdG8gcmVjb25uZWN0XG5cdGVsc2V7XG5cdFx0TG9nZ2VyLmxvZygnZDE6IGNvbm5lY3Rpb24gbG9zdCwgdHJ5IHJlY29ubmVjdGluZycpO1xuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdHRoYXQuY29ubmVjdCh0aGF0Ll9hZGRyLCB0aGF0Ll9XU29ja2V0KS5jYXRjaChmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRcblx0XHRcdH0pO1xuXHRcdH0sIHRoYXQuX3JlY29ubmVjdFRpbWVvdXQpO1xuXHR9XG5cblx0dGhpcy5lbWl0KCdjbG9zZScsIHRoaXMuX2FkZHIpO1xufTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vIFByb3RvY29sIGV2ZW50IGhhbmRsZXJzIC8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5EaXlhTm9kZS5wcm90b3R5cGUuX2hhbmRsZUludGVybmFsTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2Upe1xuXHRzd2l0Y2gobWVzc2FnZS50eXBlKXtcblx0XHRjYXNlIFwiUGVlckNvbm5lY3RlZFwiOlxuXHRcdFx0dGhpcy5faGFuZGxlUGVlckNvbm5lY3RlZChtZXNzYWdlKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgXCJQZWVyRGlzY29ubmVjdGVkXCI6XG5cdFx0XHR0aGlzLl9oYW5kbGVQZWVyRGlzY29ubmVjdGVkKG1lc3NhZ2UpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSBcIkhhbmRzaGFrZVwiOlxuXHRcdFx0dGhpcy5faGFuZGxlSGFuZHNoYWtlKG1lc3NhZ2UpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSBcIlBpbmdcIjpcblx0XHRcdHRoaXMuX2hhbmRsZVBpbmcobWVzc2FnZSk7XG5cdFx0XHRicmVhaztcblx0fVxufTtcblxuRGl5YU5vZGUucHJvdG90eXBlLl9oYW5kbGVQaW5nID0gZnVuY3Rpb24obWVzc2FnZSl7XG5cdG1lc3NhZ2UudHlwZSA9IFwiUG9uZ1wiO1xuXG5cdHRoaXMuX2xhc3RQaW5nID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cblx0dGhpcy5fc2VuZChtZXNzYWdlKTtcbn07XG5cbkRpeWFOb2RlLnByb3RvdHlwZS5faGFuZGxlSGFuZHNoYWtlID0gZnVuY3Rpb24obWVzc2FnZSl7XG5cdGlmKG1lc3NhZ2UucGVlcnMgPT09IHVuZGVmaW5lZCl7XG5cdFx0TG9nZ2VyLmVycm9yKFwiTWlzc2luZyBhcmd1bW5lbnRzIGZvciBIYW5kc2hha2UgbWVzc2FnZSwgZHJvcHBpbmcuLi5cIik7XG5cdFx0cmV0dXJuIDtcblx0fVxuXG5cdGZvcih2YXIgaT0wO2k8bWVzc2FnZS5wZWVycy5sZW5ndGg7IGkrKyl7XG5cdFx0dGhpcy5fcGVlcnMucHVzaChtZXNzYWdlLnBlZXJzW2ldKTtcblx0XHR0aGlzLmVtaXQoJ3BlZXItY29ubmVjdGVkJywgbWVzc2FnZS5wZWVyc1tpXSk7XG5cdH1cblxuXHRpZih0aGlzLl9jb25uZWN0aW9uRGVmZXJyZWQgJiYgIXRoaXMuX2Nvbm5lY3Rpb25EZWZlcnJlZC5wcm9taXNlLmlzRnVsZmlsbGVkKCkpe1xuXHRcdHRoaXMuX2Nvbm5lY3Rpb25EZWZlcnJlZC5yZXNvbHZlKCk7XG5cdFx0dGhpcy5lbWl0KCdvcGVuJywgdGhpcy5fYWRkcik7XG5cdFx0dGhpcy5fc3RhdHVzID0gJ29wZW5lZCc7XG5cdFx0dGhpcy5fY29ubmVjdGlvbkRlZmVycmVkID0gbnVsbDtcblx0fVxufTtcblxuRGl5YU5vZGUucHJvdG90eXBlLl9oYW5kbGVQZWVyQ29ubmVjdGVkID0gZnVuY3Rpb24obWVzc2FnZSl7XG5cdGlmKG1lc3NhZ2UucGVlcklkID09PSB1bmRlZmluZWQpe1xuXHRcdExvZ2dlci5lcnJvcihcIk1pc3NpbmcgYXJndW1lbnRzIGZvciBQZWVyQ29ubmVjdGVkIG1lc3NhZ2UsIGRyb3BwaW5nLi4uXCIpO1xuXHRcdHJldHVybiA7XG5cdH1cblxuXHQvL0FkZCBwZWVyIHRvIHRoZSBsaXN0IG9mIHJlYWNoYWJsZSBwZWVyc1xuXHR0aGlzLl9wZWVycy5wdXNoKG1lc3NhZ2UucGVlcklkKTtcblxuXHR0aGlzLmVtaXQoJ3BlZXItY29ubmVjdGVkJywgbWVzc2FnZS5wZWVySWQpO1xufTtcblxuRGl5YU5vZGUucHJvdG90eXBlLl9oYW5kbGVQZWVyRGlzY29ubmVjdGVkID0gZnVuY3Rpb24obWVzc2FnZSl7XG5cdGlmKG1lc3NhZ2UucGVlcklkID09PSB1bmRlZmluZWQpe1xuXHRcdExvZ2dlci5lcnJvcihcIk1pc3NpbmcgYXJndW1lbnRzIGZvciBQZWVyRGlzY29ubmVjdGVkIE1lc3NhZ2UsIGRyb3BwaW5nLi4uXCIpO1xuXHRcdHJldHVybiA7XG5cdH1cblxuXHQvL0dvIHRocm91Z2ggYWxsIHBlbmRpbmcgbWVzc2FnZXMgYW5kIG5vdGlmeSB0aGUgb25lcyB0aGF0IGFyZSB0YXJnZXRlZFxuXHQvL2F0IHRoZSBkaXNjb25uZWN0ZWQgcGVlciB0aGF0IGl0IGRpc2Nvbm5lY3RlZCBhbmQgdGhlcmVmb3JlIHRoZSBjb21tYW5kXG5cdC8vY2Fubm90IGJlIGZ1bGZpbGxlZFxuXHRmb3IodmFyIG1lc3NhZ2VJZCBpbiB0aGlzLl9wZW5kaW5nTWVzc2FnZXMpe1xuXHRcdHZhciBoYW5kbGVyID0gdGhpcy5fZ2V0TWVzc2FnZUhhbmRsZXIobWVzc2FnZUlkKTtcblx0XHRpZihoYW5kbGVyICYmIGhhbmRsZXIudGFyZ2V0ID09PSBtZXNzYWdlLnBlZXJJZCkge1xuXHRcdFx0dGhpcy5fcmVtb3ZlTWVzc2FnZShtZXNzYWdlSWQpO1xuXHRcdFx0dGhpcy5fbm90aWZ5TGlzdGVuZXIoaGFuZGxlciwgJ1BlZXJEaXNjb25uZWN0ZWQnLCBudWxsKTtcblx0XHR9XG5cdH1cblxuXHQvL1JlbW92ZSBwZWVyIGZyb20gbGlzdCBvZiByZWFjaGFibGUgcGVlcnNcblx0Zm9yKHZhciBpPXRoaXMuX3BlZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKXtcblx0XHRpZih0aGlzLl9wZWVyc1tpXSA9PT0gbWVzc2FnZS5wZWVySWQpe1xuXHRcdFx0dGhpcy5fcGVlcnMuc3BsaWNlKGksIDEpO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0dGhpcy5lbWl0KCdwZWVyLWRpc2Nvbm5lY3RlZCcsIG1lc3NhZ2UucGVlcklkKTtcbn07XG5cbkRpeWFOb2RlLnByb3RvdHlwZS5faGFuZGxlUmVxdWVzdCA9IGZ1bmN0aW9uKGhhbmRsZXIsIG1lc3NhZ2Upe1xuXHR0aGlzLl9yZW1vdmVNZXNzYWdlKG1lc3NhZ2UuaWQpO1xuXHR0aGlzLl9ub3RpZnlMaXN0ZW5lcihoYW5kbGVyLCBtZXNzYWdlLmVycm9yLCBtZXNzYWdlLmRhdGEpO1xufTtcblxuRGl5YU5vZGUucHJvdG90eXBlLl9oYW5kbGVTdWJzY3JpcHRpb24gPSBmdW5jdGlvbihoYW5kbGVyLCBtZXNzYWdlKXtcblx0Ly9yZW1vdmUgc3Vic2NyaXB0aW9uIGlmIGl0IHdhcyBjbG9zZWQgZnJvbSBub2RlXG5cdGlmKG1lc3NhZ2UucmVzdWx0ID09PSBcImNsb3NlZFwiKSB7XG5cdFx0dGhpcy5fcmVtb3ZlTWVzc2FnZShtZXNzYWdlLmlkKTtcblx0XHRtZXNzYWdlLmVycm9yID0gJ1N1YnNjcmlwdGlvbkNsb3NlZCc7XG5cdH1cblx0dGhpcy5fbm90aWZ5TGlzdGVuZXIoaGFuZGxlciwgbWVzc2FnZS5lcnJvciwgbWVzc2FnZS5kYXRhID8gbWVzc2FnZS5kYXRhIDogbnVsbCk7XG59O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gVXRpbGl0eSBtZXRob2RzIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbkRpeWFOb2RlLnByb3RvdHlwZS5fY3JlYXRlTWVzc2FnZSA9IGZ1bmN0aW9uKHBhcmFtcywgdHlwZSl7XG5cdGlmKCFwYXJhbXMgfHwgIXR5cGUgfHwgKHR5cGUgIT09IFwiUmVxdWVzdFwiICYmIHR5cGUgIT09IFwiU3Vic2NyaXB0aW9uXCIgJiYgdHlwZSAhPT0gXCJVbnN1YnNjcmliZVwiKSl7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdHR5cGU6IHR5cGUsXG5cdFx0aWQ6IHRoaXMuX2dlbmVyYXRlSWQoKSxcblx0XHRzZXJ2aWNlOiBwYXJhbXMuc2VydmljZSxcblx0XHR0YXJnZXQ6IHBhcmFtcy50YXJnZXQsXG5cdFx0dG9rZW46IHBhcmFtcy50b2tlbixcblx0XHRmdW5jOiBwYXJhbXMuZnVuYyxcblx0XHRvYmo6IHBhcmFtcy5vYmosXG5cdFx0ZGF0YTogcGFyYW1zLmRhdGFcblx0fVxufTtcblxuRGl5YU5vZGUucHJvdG90eXBlLl9nZW5lcmF0ZUlkID0gZnVuY3Rpb24oKXtcblx0dmFyIGlkID0gdGhpcy5fbmV4dElkO1xuXHR0aGlzLl9uZXh0SWQrKztcblx0cmV0dXJuIGlkO1xufTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gRGl5YU5vZGU7XG4iLCJ2YXIgUSA9IHJlcXVpcmUoJ3EnKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdub2RlLWV2ZW50LWVtaXR0ZXInKTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbnZhciBEaXlhTm9kZSA9IHJlcXVpcmUoJy4vRGl5YU5vZGUnKTtcblxudmFyIGNvbm5lY3Rpb24gPSBuZXcgRGl5YU5vZGUoKTtcbnZhciBjb25uZWN0aW9uRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcigpO1xudmFyIHRva2VuID0gbnVsbDtcblxuZnVuY3Rpb24gZDEoc2VsZWN0b3Ipe1xuXHRyZXR1cm4gbmV3IERpeWFTZWxlY3RvcihzZWxlY3Rvcik7XG59XG5cblxuZDEuRGl5YU5vZGUgPSBEaXlhTm9kZTtcbmQxLkRpeWFTZWxlY3RvciA9IERpeWFTZWxlY3RvcjtcblxuZDEuY29ubmVjdCA9IGZ1bmN0aW9uKGFkZHIsIFdTb2NrZXQpe1xuXHRyZXR1cm4gY29ubmVjdGlvbi5jb25uZWN0KGFkZHIsIFdTb2NrZXQpO1xufTtcblxuZDEuZGlzY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG5cdHRva2VuID0gbnVsbDtcblx0cmV0dXJuIGNvbm5lY3Rpb24uY2xvc2UoKTtcbn07XG5cbmQxLmN1cnJlbnRTZXJ2ZXIgPSBmdW5jdGlvbigpe1xuXHRyZXR1cm4gY29ubmVjdGlvbi5fYWRkcjtcbn1cblxuZDEub24gPSBmdW5jdGlvbihldmVudCwgY2FsbGJhY2spe1xuXHRjb25uZWN0aW9uLm9uKGV2ZW50LCBjYWxsYmFjayk7XG5cdHJldHVybiBkMTtcbn07XG5cbmQxLmRlYXV0aGVudGljYXRlID0gZnVuY3Rpb24oKXtcblx0dG9rZW4gPSBudWxsO1xufTtcblxuZnVuY3Rpb24gRGl5YVNlbGVjdG9yKHNlbGVjdG9yKXtcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5fc2VsZWN0b3IgPSBzZWxlY3Rvcjtcblx0dGhpcy5fbGlzdGVuZXJDb3VudCA9IDA7XG5cdHRoaXMuX2xpc3RlbkNhbGxiYWNrID0gbnVsbDtcblx0dGhpcy5fY2FsbGJhY2tBdHRhY2hlZCA9IGZhbHNlO1xufVxuaW5oZXJpdHMoRGl5YVNlbGVjdG9yLCBFdmVudEVtaXR0ZXIpO1xuXG5cbmZ1bmN0aW9uIG1hdGNoKHNlbGVjdG9yLCBzdHIpe1xuXHRpZighc2VsZWN0b3IpIHJldHVybiBmYWxzZTtcblx0ZWxzZSBpZihzZWxlY3Rvci5jb25zdHJ1Y3Rvci5uYW1lID09PSAnU3RyaW5nJyl7XG5cdFx0cmV0dXJuIG1hdGNoU3RyaW5nKHNlbGVjdG9yLCBzdHIpO1xuXHR9ZWxzZSBpZihzZWxlY3Rvci5jb25zdHJ1Y3Rvci5uYW1lID09PSAnUmVnRXhwJyl7XG5cdFx0cmV0dXJuIG1hdGNoUmVnRXhwKHNlbGVjdG9yLCBzdHIpO1xuXHR9ZWxzZSBpZihBcnJheS5pc0FycmF5KHNlbGVjdG9yKSl7XG5cdFx0cmV0dXJuIG1hdGNoQXJyYXkoc2VsZWN0b3IsIHN0cik7XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBtYXRjaFN0cmluZyhzZWxlY3Rvciwgc3RyKXtcblx0cmV0dXJuIHNlbGVjdG9yID09PSBzdHI7XG59XG5cbmZ1bmN0aW9uIG1hdGNoUmVnRXhwKHNlbGVjdG9yLCBzdHIpe1xuXHRyZXR1cm4gc3RyLm1hdGNoKHNlbGVjdG9yKTtcbn1cblxuZnVuY3Rpb24gbWF0Y2hBcnJheShzZWxlY3Rvciwgc3RyKXtcblx0Zm9yKHZhciBpPTA7aTxzZWxlY3Rvci5sZW5ndGg7IGkrKyl7XG5cdFx0aWYoc2VsZWN0b3JbaV0gPT09IHN0cikgcmV0dXJuIHRydWU7XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUuX3NlbGVjdCA9IGZ1bmN0aW9uKHNlbGVjdG9yRnVuY3Rpb24pe1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0aWYoIWNvbm5lY3Rpb24pIHJldHVybiBbXTtcblx0cmV0dXJuIGNvbm5lY3Rpb24ucGVlcnMoKS5maWx0ZXIoZnVuY3Rpb24ocGVlcklkKXtcblx0XHRyZXR1cm4gbWF0Y2godGhhdC5fc2VsZWN0b3IsIHBlZXJJZCk7XG5cdH0pO1xufTtcblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS5fYWRkQ29ubmVjdGlvbkxpc3RlbmVyID0gZnVuY3Rpb24oKXtcblx0aWYodGhpcy5fbGlzdGVuZXJDb3VudCA9PT0gMCl7XG5cdFx0dGhpcy5fYXR0YWNoTGlzdGVuQ2FsbGJhY2soKTtcblx0fVxuXHR0aGlzLl9saXN0ZW5lckNvdW50Kys7XG59O1xuXG5EaXlhU2VsZWN0b3IucHJvdG90eXBlLl9yZW1vdmVDb25uZWN0aW9uTGlzdGVuZXIgPSBmdW5jdGlvbigpe1xuXHRpZih0aGlzLl9saXN0ZW5lckNvdW50ID09PSAwKSByZXR1cm4gO1xuXHR0aGlzLl9saXN0ZW5lckNvdW50LS07XG5cdGlmKHRoaXMuX2xpc3RlbmVyQ291bnQgPT09IDApe1xuXHRcdHRoaXMuX2RldGFjaExpc3RlbkNhbGxiYWNrKCk7XG5cdH1cbn07XG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUuX2F0dGFjaExpc3RlbkNhbGxiYWNrID0gZnVuY3Rpb24oKXtcblxuXHR0aGlzLl9jb25uZWN0ZWRDYWxsYmFjayA9IHRoaXMuX2hhbmRsZVBlZXJDb25uZWN0ZWQuYmluZCh0aGlzKTtcblx0dGhpcy5fZGlzY29ubmVjdGVkQ2FsbGJhY2sgPSB0aGlzLl9oYW5kbGVQZWVyRGlzY29ubmVjdGVkLmJpbmQodGhpcyk7XG5cblx0Y29ubmVjdGlvbi5vbigncGVlci1jb25uZWN0ZWQnLCB0aGlzLl9jb25uZWN0ZWRDYWxsYmFjayk7XG5cdGNvbm5lY3Rpb24ub24oJ3BlZXItZGlzY29ubmVjdGVkJywgdGhpcy5fZGlzY29ubmVjdGVkQ2FsbGJhY2spO1xuXG5cdGlmKGNvbm5lY3Rpb24uaXNDb25uZWN0ZWQoKSl7XG5cdFx0dmFyIHBlZXJzID0gY29ubmVjdGlvbi5wZWVycygpO1xuXHRcdGZvcih2YXIgaT0wO2k8cGVlcnMubGVuZ3RoOyBpKyspe1xuXHRcdFx0dGhpcy5faGFuZGxlUGVlckNvbm5lY3RlZChwZWVyc1tpXSk7XG5cdFx0fVxuXHR9XG59O1xuXG5EaXlhU2VsZWN0b3IucHJvdG90eXBlLl9kZXRhY2hMaXN0ZW5DYWxsYmFjayA9IGZ1bmN0aW9uKCl7XG5cdGNvbm5lY3Rpb24ucmVtb3ZlTGlzdGVuZXIoJ3BlZXItY29ubmVjdGVkJywgdGhpcy5fY29ubmVjdGVkQ2FsbGJhY2spO1xuXHRjb25uZWN0aW9uLnJlbW92ZUxpc3RlbmVyKCdwZWVyLWRpc2Nvbm5lY3RlZCcsIHRoaXMuX2Rpc2Nvbm5lY3RlZENhbGxiYWNrKTtcbn07XG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUuX2hhbmRsZVBlZXJDb25uZWN0ZWQgPSBmdW5jdGlvbihwZWVySWQpe1xuXHRpZihtYXRjaCh0aGlzLl9zZWxlY3RvciwgcGVlcklkKSkge1xuXHRcdHRoaXMuZW1pdCgncGVlci1jb25uZWN0ZWQnLCBwZWVySWQpO1xuXHR9XG59O1xuXG5EaXlhU2VsZWN0b3IucHJvdG90eXBlLl9oYW5kbGVQZWVyRGlzY29ubmVjdGVkID0gZnVuY3Rpb24ocGVlcklkKXtcblx0aWYobWF0Y2godGhpcy5fc2VsZWN0b3IsIHBlZXJJZCkpIHtcblx0XHR0aGlzLmVtaXQoJ3BlZXItZGlzY29ubmVjdGVkJywgcGVlcklkKTtcblx0fVxufVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIFB1YmxpYyBBUEkgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS5saXN0ZW4gPSBmdW5jdGlvbigpe1xuXHR0aGlzLl9hZGRDb25uZWN0aW9uTGlzdGVuZXIoKTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG5EaXlhU2VsZWN0b3IucHJvdG90eXBlLmVhY2ggPSBmdW5jdGlvbihjYil7XG5cdHZhciBwZWVycyA9IHRoaXMuX3NlbGVjdCgpO1xuXHRmb3IodmFyIGk9MDsgaTxwZWVycy5sZW5ndGg7IGkrKykgY2IuYmluZCh0aGlzKShwZWVyc1tpXSk7XG5cdHJldHVybiB0aGlzO1xufTtcblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS5yZXF1ZXN0ID0gZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFjaywgdGltZW91dCl7XG5cdGlmKCFjb25uZWN0aW9uKSByZXR1cm4gdGhpcztcblxuXHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKHBlZXJJZCl7XG5cdFx0cGFyYW1zLnRhcmdldCA9IHBlZXJJZDtcblx0XHRwYXJhbXMudG9rZW4gPSB0b2tlbjtcblx0XHRjb25uZWN0aW9uLnJlcXVlc3QocGFyYW1zLCBmdW5jdGlvbihlcnIsIGRhdGEpe1xuXHRcdFx0aWYodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSBjYWxsYmFjayhwZWVySWQsIGVyciwgZGF0YSk7XG5cdFx0fSwgdGltZW91dCk7XG5cdH0pO1xufTtcblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrLCBvcHRpb25zKXtcblxuXHRmdW5jdGlvbiBkb1N1YnNjcmliZShwZWVySWQpe1xuXHRcdHBhcmFtcy50YXJnZXQgPSBwZWVySWQ7XG5cdFx0cGFyYW1zLnRva2VuID0gdG9rZW47XG5cdFx0dmFyIHN1YklkID0gY29ubmVjdGlvbi5zdWJzY3JpYmUocGFyYW1zLCBmdW5jdGlvbihlcnIsIGRhdGEpe1xuXHRcdFx0Y2FsbGJhY2socGVlcklkLCBlcnIsIGRhdGEpO1xuXHRcdH0pO1xuXHRcdGlmKG9wdGlvbnMgJiYgQXJyYXkuaXNBcnJheShvcHRpb25zLnN1YklkcykpXG5cdFx0XHRvcHRpb25zLnN1Yklkc1twZWVySWRdID0gc3ViSWQ7XG5cdH1cblxuXHQvL3NlbmQgc3Vic2NyaXB0aW9uIHRvIGFsbCBzZWxlY3RlZCBwZWVyXG5cdHRoaXMuZWFjaChkb1N1YnNjcmliZSk7XG5cdGlmKG9wdGlvbnMgJiYgb3B0aW9ucy5hdXRvKXtcblx0XHR0aGlzLl9hZGRDb25uZWN0aW9uTGlzdGVuZXIoKTtcblx0XHR0aGlzLm9uKCdwZWVyLWNvbm5lY3RlZCcsIGRvU3Vic2NyaWJlKTtcblx0fVxuXHRyZXR1cm4gdGhpcztcbn07XG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbihzdWJJZHMpe1xuXHR0aGlzLmVhY2goZnVuY3Rpb24ocGVlcklkKXtcblx0XHR2YXIgc3ViSWQgPSBzdWJJZHNbcGVlcklkXTtcblx0XHRpZihzdWJJZCkgY29ubmVjdGlvbi51bnN1YnNjcmliZShzdWJJZCk7XG5cdH0pO1xuXHR0aGlzLl9yZW1vdmVDb25uZWN0aW9uTGlzdGVuZXIoKTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG5EaXlhU2VsZWN0b3IucHJvdG90eXBlLmF1dGggPSBmdW5jdGlvbih1c2VyLCBwYXNzd29yZCwgY2FsbGJhY2ssIHRpbWVvdXQpe1xuXHRpZih0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpXG5cdFx0Y2FsbGJhY2sgPSBjYWxsYmFjay5iaW5kKHRoaXMpO1xuXG5cdHJldHVybiB0aGlzLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICdhdXRoJyxcblx0XHRmdW5jOiAnQXV0aGVudGljYXRlJyxcblx0XHRkYXRhOiB7XG5cdFx0XHR1c2VyOiB1c2VyLFxuXHRcdFx0cGFzc3dvcmQ6IHBhc3N3b3JkXG5cdFx0fVxuXHR9LCBmdW5jdGlvbihwZWVySWQsIGVyciwgZGF0YSl7XG5cblx0XHRpZihlcnIgPT09ICdTZXJ2aWNlTm90Rm91bmQnKXtcblx0XHRcdGlmKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykgY2FsbGJhY2socGVlcklkLCB0cnVlKTtcblx0XHRcdHJldHVybiA7XG5cdFx0fVxuXG5cdFx0aWYoIWVyciAmJiBkYXRhICYmIGRhdGEuYXV0aGVudGljYXRlZCAmJiBkYXRhLnRva2VuKXtcblx0XHRcdHRva2VuID0gZGF0YS50b2tlbjtcblx0XHRcdGlmKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykgY2FsbGJhY2socGVlcklkLCB0cnVlKTtcblx0XHR9ZWxzZSB7XG5cdFx0XHRpZih0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIGNhbGxiYWNrKHBlZXJJZCwgZmFsc2UpO1xuXHRcdH1cblxuXHR9LCB0aW1lb3V0KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZDE7XG4iLCJ2YXIgZDEgPSByZXF1aXJlKCcuL0RpeWFTZWxlY3Rvci5qcycpO1xuXG5yZXF1aXJlKCcuL3NlcnZpY2VzL3RpbWVyL3RpbWVyLmpzJyk7XG5yZXF1aXJlKCcuL3NlcnZpY2VzL3J0Yy9ydGMuanMnKTtcbnJlcXVpcmUoJy4vc2VydmljZXMvdXBkYXRlL3VwZGF0ZS5qcycpO1xucmVxdWlyZSgnLi9zZXJ2aWNlcy9leHBsb3Jlci9leHBsb3Jlci5qcycpO1xucmVxdWlyZSgnLi9zZXJ2aWNlcy9waWNvL3BpY28uanMnKTtcbnJlcXVpcmUoJy4vc2VydmljZXMvdmlld2VyX2V4cGxvcmVyL3ZpZXdlcl9leHBsb3Jlci5qcycpO1xucmVxdWlyZSgnLi9zZXJ2aWNlcy9pZXEvaWVxLmpzJyk7XG5yZXF1aXJlKCcuL3NlcnZpY2VzL25ldHdvcmtJZC9OZXR3b3JrSWQuanMnKTtcbnJlcXVpcmUoJy4vc2VydmljZXMvbWFwcy9tYXBzLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZDE7XG4iLCIvKiBtYXlhLWNsaWVudFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgUGFydG5lcmluZyBSb2JvdGljcywgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgbGlicmFyeSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3JcbiAqIG1vZGlmeSBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWNcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IHZlcnNpb25cbiAqICAzLjAgb2YgdGhlIExpY2Vuc2UuIFRoaXMgbGlicmFyeSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZVxuICogdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW5cbiAqIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVJcbiAqIFBVUlBPU0UuIFNlZSB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBsaWJyYXJ5LlxuICovXG5EaXlhU2VsZWN0b3IgPSByZXF1aXJlKCcuLi8uLi9EaXlhU2VsZWN0b3InKS5EaXlhU2VsZWN0b3I7XG5cbmZ1bmN0aW9uIGV4cGxvcmVyKG5vZGUpe1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cdHRoaXMubm9kZSA9IG5vZGU7XG5cdHJldHVybiB0aGlzO1xufVxuXG5EaXlhU2VsZWN0b3IucHJvdG90eXBlLmxpc3RGaWxlcyA9IGZ1bmN0aW9uKGZpbGUsIGNhbGxiYWNrKXtcdC8vYWRkIGEgcGF0aCBpbiBkYXRhIHRvIGxpc3QgZmlsZXMgaW4gVEhJUyBwYXRoXG5cdHRoaXMucmVxdWVzdCh7XG5cdFx0c2VydmljZTogJ2V4cGxvcmVyJyxcblx0XHRmdW5jOiAnTGlzdEZpbGVzJyxcblx0XHQgZGF0YToge2VsdDogZmlsZX1cblx0fSwgZnVuY3Rpb24ocGVlcklkLCBlcnIsIGRhdGEpe1xuICAgICBcdFx0XG5cdFx0XHRpZihkYXRhKXtcblx0XHRcdFx0Y2FsbGJhY2socGVlcklkLCBudWxsLCBkYXRhKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYoZXJyKXtcblx0XHRcdFx0Y2FsbGJhY2socGVlcklkLCBlcnIsIG51bGwpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHJldHVybiB0aGlzO1xufTtcblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS5vcGVuRmlsZSA9IGZ1bmN0aW9uKGZpbGUsIHR5cGUsIGNhbGxiYWNrKXtcblx0XHR0aGlzLnJlcXVlc3Qoe1xuXHRcdFx0c2VydmljZTogJ2V4cGxvcmVyJyxcblx0XHRcdGZ1bmM6ICdPcGVuRmlsZScsXG5cdFx0XHRkYXRhOntcblx0XHRcdFx0ZmlsZTogZmlsZSxcblx0XHRcdFx0dHlwZTogdHlwZVxuXHRcdFx0fVxuXHRcdH0sIGZ1bmN0aW9uKHBlZXJJZCwgZXJyLCBkYXRhKXtcblx0XHRcdGNhbGxiYWNrKHBlZXJJZCwgbnVsbCwgZGF0YSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcztcbn07XG5cblxuXG52YXIgZXhwID0ge1xuXHRcdGV4cGxvcmVyOiBleHBsb3JlclxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cDtcbiIsIi8qIG1heWEtY2xpZW50XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFBhcnRuZXJpbmcgUm9ib3RpY3MsIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGxpYnJhcnkgaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yXG4gKiBtb2RpZnkgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyB2ZXJzaW9uXG4gKlx0My4wIG9mIHRoZSBMaWNlbnNlLiBUaGlzIGxpYnJhcnkgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGVcbiAqIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuXG4gKiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSXG4gKiBQVVJQT1NFLiBTZWUgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpY1xuICogTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgbGlicmFyeS5cbiAqL1xuXG4vKipcbiAgIFRvZG8gOlxuICAgY2hlY2sgZXJyIGZvciBlYWNoIGRhdGFcbiAgIGltcHJvdmUgQVBJIDogZ2V0RGF0YShzZW5zb3JOYW1lLCBkYXRhQ29uZmlnKVxuICAgcmV0dXJuIGFkYXB0ZWQgdmVjdG9yIGZvciBkaXNwbGF5IHdpdGggRDMgdG8gcmVkdWNlIGNvZGUgaW4gSUhNID9cbiAgIHVwZGF0ZURhdGEoc2Vuc29yTmFtZSwgZGF0YUNvbmZpZylcbiAgIHNldCBhbmQgZ2V0IGZvciB0aGUgZGlmZmVyZW50IGRhdGFDb25maWcgcGFyYW1zXG5cbiovXG5cbkRpeWFTZWxlY3RvciA9IHJlcXVpcmUoJy4uLy4uL0RpeWFTZWxlY3RvcicpLkRpeWFTZWxlY3RvcjtcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuXG5cbnZhciBNZXNzYWdlID0gcmVxdWlyZSgnLi4vbWVzc2FnZScpO1xuXG4vKipcbiAqXHRjYWxsYmFjayA6IGZ1bmN0aW9uIGNhbGxlZCBhZnRlciBtb2RlbCB1cGRhdGVkXG4gKiAqL1xuZnVuY3Rpb24gSUVRKHNlbGVjdG9yKXtcblx0dmFyIHRoYXQgPSB0aGlzO1xuXHR0aGlzLnNlbGVjdG9yID0gc2VsZWN0b3I7XG5cdHRoaXMuZGF0YU1vZGVsPXt9O1xuXG5cblx0LyoqKiBzdHJ1Y3R1cmUgb2YgZGF0YSBjb25maWcgKioqXG5cdFx0IGNyaXRlcmlhIDpcblx0XHQgICB0aW1lOiBhbGwgMyB0aW1lIGNyaXRlcmlhIHNob3VsZCBub3QgYmUgZGVmaW5lZCBhdCB0aGUgc2FtZSB0aW1lLiAocmFuZ2Ugd291bGQgYmUgZ2l2ZW4gdXApXG5cdFx0ICAgICBiZWc6IHtbbnVsbF0sdGltZX0gKG51bGwgbWVhbnMgbW9zdCByZWNlbnQpIC8vIHN0b3JlZCBhIFVUQyBpbiBtcyAobnVtKVxuXHRcdCAgICAgZW5kOiB7W251bGxdLCB0aW1lfSAobnVsbCBtZWFucyBtb3N0IG9sZGVzdCkgLy8gc3RvcmVkIGFzIFVUQyBpbiBtcyAobnVtKVxuXHRcdCAgICAgcmFuZ2U6IHtbbnVsbF0sIHRpbWV9IChyYW5nZSBvZiB0aW1lKHBvc2l0aXZlKSApIC8vIGluIHMgKG51bSlcblx0XHQgICByb2JvdDoge0FycmF5T2YgSUQgb3IgW1wiYWxsXCJdfVxuXHRcdCAgIHBsYWNlOiB7QXJyYXlPZiBJRCBvciBbXCJhbGxcIl19XG5cdFx0IG9wZXJhdG9yOiB7W2xhc3RdLCBtYXgsIG1veSwgc2R9IC0oIG1heWJlIG1veSBzaG91bGQgYmUgZGVmYXVsdFxuXHRcdCAuLi5cblxuXHRcdCBzZW5zb3JzIDoge1tudWxsXSBvciBBcnJheU9mIFNlbnNvck5hbWV9XG5cblx0XHQgc2FtcGxpbmc6IHtbbnVsbF0gb3IgaW50fVxuXHQqL1xuXHR0aGlzLmRhdGFDb25maWcgPSB7XG5cdFx0Y3JpdGVyaWE6IHtcblx0XHRcdHRpbWU6IHtcblx0XHRcdFx0YmVnOiBudWxsLFxuXHRcdFx0XHRlbmQ6IG51bGwsXG5cdFx0XHRcdHJhbmdlOiBudWxsIC8vIGluIHNcblx0XHRcdH0sXG5cdFx0XHRyb2JvdDogbnVsbCxcblx0XHRcdHBsYWNlOiBudWxsXG5cdFx0fSxcblx0XHRvcGVyYXRvcjogJ2xhc3QnLFxuXHRcdHNlbnNvcnM6IG51bGwsXG5cdFx0c2FtcGxpbmc6IG51bGwgLy9zYW1wbGluZ1xuXHR9O1xuXG5cdHJldHVybiB0aGlzO1xufTtcbi8qKlxuICogR2V0IGRhdGFNb2RlbCA6XG4gKiB7XG4gKlx0XCJzZW5zZXVyWFhcIjoge1xuICpcdFx0XHRkYXRhOltGTE9BVCwgLi4uXSxcbiAqXHRcdFx0dGltZTpbRkxPQVQsIC4uLl0sXG4gKlx0XHRcdHJvYm90OltGTE9BVCwgLi4uXSxcbiAqXHRcdFx0cGxhY2U6W0ZMT0FULCAuLi5dLFxuICpcdFx0XHRxdWFsaXR5SW5kZXg6W0ZMT0FULCAuLi5dLFxuICpcdFx0XHRyYW5nZTogW0ZMT0FULCBGTE9BVF0sXG4gKlx0XHRcdHVuaXQ6IHN0cmluZyxcbiAqXHRcdGxhYmVsOiBzdHJpbmdcbiAqXHRcdH0sXG4gKlx0IC4uLiAoXCJzZW5zZXVyc1lZXCIpXG4gKiB9XG4gKi9cbklFUS5wcm90b3R5cGUuZ2V0RGF0YU1vZGVsID0gZnVuY3Rpb24oKXtcblx0cmV0dXJuIHRoaXMuZGF0YU1vZGVsO1xufTtcbklFUS5wcm90b3R5cGUuZ2V0RGF0YVJhbmdlID0gZnVuY3Rpb24oKXtcblx0cmV0dXJuIHRoaXMuZGF0YU1vZGVsLnJhbmdlO1xufTtcblxuLyoqXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YUNvbmZpZyBjb25maWcgZm9yIGRhdGEgcmVxdWVzdFxuICogaWYgZGF0YUNvbmZpZyBpcyBkZWZpbmUgOiBzZXQgYW5kIHJldHVybiB0aGlzXG4gKlx0IEByZXR1cm4ge0lFUX0gdGhpc1xuICogZWxzZVxuICpcdCBAcmV0dXJuIHtPYmplY3R9IGN1cnJlbnQgZGF0YUNvbmZpZ1xuICovXG5JRVEucHJvdG90eXBlLkRhdGFDb25maWcgPSBmdW5jdGlvbihuZXdEYXRhQ29uZmlnKXtcblx0aWYobmV3RGF0YUNvbmZpZykge1xuXHRcdHRoaXMuZGF0YUNvbmZpZz1uZXdEYXRhQ29uZmlnO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cdGVsc2Vcblx0XHRyZXR1cm4gdGhpcy5kYXRhQ29uZmlnO1xufTtcbi8qKlxuICogVE8gQkUgSU1QTEVNRU5URUQgOiBvcGVyYXRvciBtYW5hZ2VtZW50IGluIEROLUlFUVxuICogQHBhcmFtICB7U3RyaW5nfVx0IG5ld09wZXJhdG9yIDoge1tsYXN0XSwgbWF4LCBtb3ksIHNkfVxuICogQHJldHVybiB7SUVRfSB0aGlzIC0gY2hhaW5hYmxlXG4gKiBTZXQgb3BlcmF0b3IgY3JpdGVyaWEuXG4gKiBEZXBlbmRzIG9uIG5ld09wZXJhdG9yXG4gKlx0QHBhcmFtIHtTdHJpbmd9IG5ld09wZXJhdG9yXG4gKlx0QHJldHVybiB0aGlzXG4gKiBHZXQgb3BlcmF0b3IgY3JpdGVyaWEuXG4gKlx0QHJldHVybiB7U3RyaW5nfSBvcGVyYXRvclxuICovXG5JRVEucHJvdG90eXBlLkRhdGFPcGVyYXRvciA9IGZ1bmN0aW9uKG5ld09wZXJhdG9yKXtcblx0aWYobmV3T3BlcmF0b3IpIHtcblx0XHR0aGlzLmRhdGFDb25maWcub3BlcmF0b3IgPSBuZXdPcGVyYXRvcjtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXHRlbHNlXG5cdFx0cmV0dXJuIHRoaXMuZGF0YUNvbmZpZy5vcGVyYXRvcjtcbn07XG4vKipcbiAqIERlcGVuZHMgb24gbnVtU2FtcGxlc1xuICogQHBhcmFtIHtpbnR9IG51bWJlciBvZiBzYW1wbGVzIGluIGRhdGFNb2RlbFxuICogaWYgZGVmaW5lZCA6IHNldCBudW1iZXIgb2Ygc2FtcGxlc1xuICpcdEByZXR1cm4ge0lFUX0gdGhpc1xuICogZWxzZVxuICpcdEByZXR1cm4ge2ludH0gbnVtYmVyIG9mIHNhbXBsZXNcbiAqKi9cbklFUS5wcm90b3R5cGUuRGF0YVNhbXBsaW5nID0gZnVuY3Rpb24obnVtU2FtcGxlcyl7XG5cdGlmKG51bVNhbXBsZXMpIHtcblx0XHR0aGlzLmRhdGFDb25maWcuc2FtcGxpbmcgPSBudW1TYW1wbGVzO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cdGVsc2Vcblx0XHRyZXR1cm4gdGhpcy5kYXRhQ29uZmlnLnNhbXBsaW5nO1xufTtcbi8qKlxuICogU2V0IG9yIGdldCBkYXRhIHRpbWUgY3JpdGVyaWEgYmVnIGFuZCBlbmQuXG4gKiBJZiBwYXJhbSBkZWZpbmVkXG4gKlx0QHBhcmFtIHtEYXRlfSBuZXdUaW1lQmVnIC8vIG1heSBiZSBudWxsXG4gKlx0QHBhcmFtIHtEYXRlfSBuZXdUaW1lRW5kIC8vIG1heSBiZSBudWxsXG4gKlx0QHJldHVybiB7SUVRfSB0aGlzXG4gKiBJZiBubyBwYXJhbSBkZWZpbmVkOlxuICpcdEByZXR1cm4ge09iamVjdH0gVGltZSBvYmplY3Q6IGZpZWxkcyBiZWcgYW5kIGVuZC5cbiAqL1xuSUVRLnByb3RvdHlwZS5EYXRhVGltZSA9IGZ1bmN0aW9uKG5ld1RpbWVCZWcsbmV3VGltZUVuZCwgbmV3UmFuZ2Upe1xuXHRpZihuZXdUaW1lQmVnIHx8IG5ld1RpbWVFbmQgfHwgbmV3UmFuZ2UpIHtcblx0XHR0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5iZWcgPSBuZXdUaW1lQmVnLmdldFRpbWUoKTtcblx0XHR0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5lbmQgPSBuZXdUaW1lRW5kLmdldFRpbWUoKTtcblx0XHR0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5yYW5nZSA9IG5ld1JhbmdlO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cdGVsc2Vcblx0XHRyZXR1cm4ge1xuXHRcdFx0YmVnOiBuZXcgRGF0ZSh0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5iZWcpLFxuXHRcdFx0ZW5kOiBuZXcgRGF0ZSh0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEudGltZS5lbmQpLFxuXHRcdFx0cmFuZ2U6IG5ldyBEYXRlKHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS50aW1lLnJhbmdlKVxuXHRcdH07XG59O1xuLyoqXG4gKiBEZXBlbmRzIG9uIHJvYm90SWRzXG4gKiBTZXQgcm9ib3QgY3JpdGVyaWEuXG4gKlx0QHBhcmFtIHtBcnJheVtJbnRdfSByb2JvdElkcyBsaXN0IG9mIHJvYm90IElkc1xuICogR2V0IHJvYm90IGNyaXRlcmlhLlxuICpcdEByZXR1cm4ge0FycmF5W0ludF19IGxpc3Qgb2Ygcm9ib3QgSWRzXG4gKi9cbklFUS5wcm90b3R5cGUuRGF0YVJvYm90SWRzID0gZnVuY3Rpb24ocm9ib3RJZHMpe1xuXHRpZihyb2JvdElkcykge1xuXHRcdHRoaXMuZGF0YUNvbmZpZy5jcml0ZXJpYS5yb2JvdCA9IHJvYm90SWRzO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cdGVsc2Vcblx0XHRyZXR1cm4gdGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnJvYm90O1xufTtcbi8qKlxuICogRGVwZW5kcyBvbiBwbGFjZUlkc1xuICogU2V0IHBsYWNlIGNyaXRlcmlhLlxuICpcdEBwYXJhbSB7QXJyYXlbSW50XX0gcGxhY2VJZHMgbGlzdCBvZiBwbGFjZSBJZHNcbiAqIEdldCBwbGFjZSBjcml0ZXJpYS5cbiAqXHRAcmV0dXJuIHtBcnJheVtJbnRdfSBsaXN0IG9mIHBsYWNlIElkc1xuICovXG5JRVEucHJvdG90eXBlLkRhdGFQbGFjZUlkcyA9IGZ1bmN0aW9uKHBsYWNlSWRzKXtcblx0aWYocGxhY2VJZHMpIHtcblx0XHR0aGlzLmRhdGFDb25maWcuY3JpdGVyaWEucGxhY2VJZCA9IHBsYWNlSWRzO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cdGVsc2Vcblx0XHRyZXR1cm4gdGhpcy5kYXRhQ29uZmlnLmNyaXRlcmlhLnBsYWNlO1xufTtcbi8qKlxuICogR2V0IGRhdGEgYnkgc2Vuc29yIG5hbWUuXG4gKlx0QHBhcmFtIHtBcnJheVtTdHJpbmddfSBzZW5zb3JOYW1lIGxpc3Qgb2Ygc2Vuc29yc1xuICovXG5JRVEucHJvdG90eXBlLmdldERhdGFCeU5hbWUgPSBmdW5jdGlvbihzZW5zb3JOYW1lcyl7XG5cdHZhciBkYXRhPVtdO1xuXHRmb3IodmFyIG4gaW4gc2Vuc29yTmFtZXMpIHtcblx0XHRkYXRhLnB1c2godGhpcy5kYXRhTW9kZWxbc2Vuc29yTmFtZXNbbl1dKTtcblx0fVxuXHRyZXR1cm4gZGF0YTtcbn07XG4vKipcbiAqIFVwZGF0ZSBkYXRhIGdpdmVuIGRhdGFDb25maWcuXG4gKiBAcGFyYW0ge2Z1bmN9IGNhbGxiYWNrIDogY2FsbGVkIGFmdGVyIHVwZGF0ZVxuICogVE9ETyBVU0UgUFJPTUlTRVxuICovXG5JRVEucHJvdG90eXBlLnVwZGF0ZURhdGEgPSBmdW5jdGlvbihjYWxsYmFjaywgZGF0YUNvbmZpZyl7XG5cdHZhciB0aGF0PXRoaXM7XG5cdGlmKGRhdGFDb25maWcpXG5cdFx0dGhpcy5EYXRhQ29uZmlnKGRhdGFDb25maWcpO1xuXHQvLyBjb25zb2xlLmxvZyhcIlJlcXVlc3Q6IFwiK0pTT04uc3RyaW5naWZ5KGRhdGFDb25maWcpKTtcblx0dGhpcy5zZWxlY3Rvci5yZXF1ZXN0KHtcblx0XHRzZXJ2aWNlOiBcImllcVwiLFxuXHRcdGZ1bmM6IFwiRGF0YVJlcXVlc3RcIixcblx0XHRkYXRhOiB7XG5cdFx0XHR0eXBlOlwic3BsUmVxXCIsXG5cdFx0XHRkYXRhQ29uZmlnOiB0aGF0LmRhdGFDb25maWdcblx0XHR9XG5cdH0sIGZ1bmN0aW9uKGRuSWQsIGVyciwgZGF0YSl7XG5cdFx0aWYoZXJyKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhcIlJlY3YgZXJyOiBcIitlcnIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRcblx0XHRpZihkYXRhLmhlYWRlci5lcnJvcikge1xuXHRcdFx0Ly8gVE9ETyA6IGNoZWNrL3VzZSBlcnIgc3RhdHVzIGFuZCBhZGFwdCBiZWhhdmlvciBhY2NvcmRpbmdseVxuXHRcdFx0Y29uc29sZS5sb2coXCJVcGRhdGVEYXRhOlxcblwiK0pTT04uc3RyaW5naWZ5KGRhdGEuaGVhZGVyLmRhdGFDb25maWcpKTtcblx0XHRcdGNvbnNvbGUubG9nKFwiRGF0YSByZXF1ZXN0IGZhaWxlZCAoXCIrZGF0YS5oZWFkZXIuZXJyb3Iuc3QrXCIpOiBcIitkYXRhLmhlYWRlci5lcnJvci5tc2cpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHRoYXQuZGF0YU1vZGVsKSk7XG5cdFx0dGhhdC5fZ2V0RGF0YU1vZGVsRnJvbVJlY3YoZGF0YSk7XG5cblx0XHQvLyBjb25zb2xlLmxvZyh0aGF0LmdldERhdGFNb2RlbCgpKTtcblxuXHRcdGNhbGxiYWNrID0gY2FsbGJhY2suYmluZCh0aGF0KTsgLy8gYmluZCBjYWxsYmFjayB3aXRoIElFUVxuXHRcdGNhbGxiYWNrKHRoYXQuZ2V0RGF0YU1vZGVsKCkpOyAvLyBjYWxsYmFjayBmdW5jXG5cdH0pO1xuXHQvKiogVE9ETyBVU0UgUFJPTUlTRSA/ICovXG59O1xuXG5JRVEucHJvdG90eXBlLl9pc0RhdGFNb2RlbFdpdGhOYU4gPSBmdW5jdGlvbigpIHtcblx0dmFyIGRhdGFNb2RlbE5hTj1mYWxzZTtcblx0dmFyIHNlbnNvck5hbjtcblx0Zm9yKHZhciBuIGluIHRoaXMuZGF0YU1vZGVsKSB7XG5cdFx0c2Vuc29yTmFuID0gdGhpcy5kYXRhTW9kZWxbbl0uZGF0YS5yZWR1Y2UoZnVuY3Rpb24obmFuUHJlcyxkKSB7XG5cdFx0XHRyZXR1cm4gbmFuUHJlcyAmJiBpc05hTihkKTtcblx0XHR9LGZhbHNlKTtcblx0XHRkYXRhTW9kZWxOYU4gPSBkYXRhTW9kZWxOYU4gJiYgc2Vuc29yTmFuO1xuXHRcdGNvbnNvbGUubG9nKG4rXCIgd2l0aCBuYW4gOiBcIitzZW5zb3JOYW4rXCIgKFwiK2RhdGFNb2RlbE5hTitcIikgLyBcIit0aGlzLmRhdGFNb2RlbFtuXS5kYXRhLmxlbmd0aCk7XG5cdH1cbn07XG5cbklFUS5wcm90b3R5cGUuZ2V0Q29uZmluZW1lbnRMZXZlbCA9IGZ1bmN0aW9uKCl7XG5cdHJldHVybiB0aGlzLmNvbmZpbmVtZW50O1xufTtcblxuSUVRLnByb3RvdHlwZS5nZXRBaXJRdWFsaXR5TGV2ZWwgPSBmdW5jdGlvbigpe1xuXHRyZXR1cm4gdGhpcy5haXJRdWFsaXR5O1xufTtcblxuSUVRLnByb3RvdHlwZS5nZXRFbnZRdWFsaXR5TGV2ZWwgPSBmdW5jdGlvbigpe1xuXHRyZXR1cm4gdGhpcy5lbnZRdWFsaXR5O1xufTtcblxuLyoqXG4gKiBVcGRhdGUgaW50ZXJuYWwgbW9kZWwgd2l0aCByZWNlaXZlZCBkYXRhXG4gKiBAcGFyYW0gIHtPYmplY3R9IGRhdGEgZGF0YSByZWNlaXZlZCBmcm9tIERpeWFOb2RlIGJ5IHdlYnNvY2tldFxuICogQHJldHVybiB7W3R5cGVdfVx0XHRbZGVzY3JpcHRpb25dXG4gKi9cbklFUS5wcm90b3R5cGUuX2dldERhdGFNb2RlbEZyb21SZWN2ID0gZnVuY3Rpb24oZGF0YSl7XG5cdHZhciBkYXRhTW9kZWw9bnVsbDtcblx0LypcXFxuXHQgIHwqfFxuXHQgIHwqfCAgdXRpbGl0YWlyZXMgZGUgbWFuaXB1bGF0aW9ucyBkZSBjaGHDrm5lcyBiYXNlIDY0IC8gYmluYWlyZXMgLyBVVEYtOFxuXHQgIHwqfFxuXHQgIHwqfCAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZnIvZG9jcy9Ew6ljb2Rlcl9lbmNvZGVyX2VuX2Jhc2U2NFxuXHQgIHwqfFxuXHQgIFxcKi9cblx0LyoqIERlY29kZXIgdW4gdGFibGVhdSBkJ29jdGV0cyBkZXB1aXMgdW5lIGNoYcOubmUgZW4gYmFzZTY0ICovXG5cdHZhciBiNjRUb1VpbnQ2ID0gZnVuY3Rpb24obkNocikge1xuXHRcdHJldHVybiBuQ2hyID4gNjQgJiYgbkNociA8IDkxID9cblx0XHRcdG5DaHIgLSA2NVxuXHRcdFx0OiBuQ2hyID4gOTYgJiYgbkNociA8IDEyMyA/XG5cdFx0XHRuQ2hyIC0gNzFcblx0XHRcdDogbkNociA+IDQ3ICYmIG5DaHIgPCA1OCA/XG5cdFx0XHRuQ2hyICsgNFxuXHRcdFx0OiBuQ2hyID09PSA0MyA/XG5cdFx0XHQ2MlxuXHRcdFx0OiBuQ2hyID09PSA0NyA/XG5cdFx0XHQ2M1xuXHRcdFx0Olx0MDtcblx0fTtcblx0LyoqXG5cdCAqIERlY29kZSBiYXNlNjQgc3RyaW5nIHRvIFVJbnQ4QXJyYXlcblx0ICogQHBhcmFtICB7U3RyaW5nfSBzQmFzZTY0XHRcdGJhc2U2NCBjb2RlZCBzdHJpbmdcblx0ICogQHBhcmFtICB7aW50fSBuQmxvY2tzU2l6ZSBzaXplIG9mIGJsb2NrcyBvZiBieXRlcyB0byBiZSByZWFkLiBPdXRwdXQgYnl0ZUFycmF5IGxlbmd0aCB3aWxsIGJlIGEgbXVsdGlwbGUgb2YgdGhpcyB2YWx1ZS5cblx0ICogQHJldHVybiB7VWludDhBcnJheX1cdFx0XHRcdHRhYiBvZiBkZWNvZGVkIGJ5dGVzXG5cdCAqL1xuXHR2YXIgYmFzZTY0RGVjVG9BcnIgPSBmdW5jdGlvbihzQmFzZTY0LCBuQmxvY2tzU2l6ZSkge1xuXHRcdHZhclxuXHRcdHNCNjRFbmMgPSBzQmFzZTY0LnJlcGxhY2UoL1teQS1aYS16MC05XFwrXFwvXS9nLCBcIlwiKSwgbkluTGVuID0gc0I2NEVuYy5sZW5ndGgsXG5cdFx0bk91dExlbiA9IG5CbG9ja3NTaXplID8gTWF0aC5jZWlsKChuSW5MZW4gKiAzICsgMSA+PiAyKSAvIG5CbG9ja3NTaXplKSAqIG5CbG9ja3NTaXplIDogbkluTGVuICogMyArIDEgPj4gMixcblx0XHRidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIobk91dExlbiksIHRhQnl0ZXMgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuXG5cdFx0Zm9yICh2YXIgbk1vZDMsIG5Nb2Q0LCBuVWludDI0ID0gMCwgbk91dElkeCA9IDAsIG5JbklkeCA9IDA7IG5JbklkeCA8IG5JbkxlbjsgbkluSWR4KyspIHtcblx0XHRcdG5Nb2Q0ID0gbkluSWR4ICYgMzsgLyogbiBtb2QgNCAqL1xuXHRcdFx0blVpbnQyNCB8PSBiNjRUb1VpbnQ2KHNCNjRFbmMuY2hhckNvZGVBdChuSW5JZHgpKSA8PCAxOCAtIDYgKiBuTW9kNDtcblx0XHRcdGlmIChuTW9kNCA9PT0gMyB8fCBuSW5MZW4gLSBuSW5JZHggPT09IDEpIHtcblx0XHRcdFx0Zm9yIChuTW9kMyA9IDA7IG5Nb2QzIDwgMyAmJiBuT3V0SWR4IDwgbk91dExlbjsgbk1vZDMrKywgbk91dElkeCsrKSB7XG5cdFx0XHRcdFx0dGFCeXRlc1tuT3V0SWR4XSA9IG5VaW50MjQgPj4+ICgxNiA+Pj4gbk1vZDMgJiAyNCkgJiAyNTU7XG5cdFx0XHRcdH1cblx0XHRcdFx0blVpbnQyNCA9IDA7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGNvbnNvbGUubG9nKFwidThpbnQgOiBcIitKU09OLnN0cmluZ2lmeSh0YUJ5dGVzKSk7XG5cdFx0cmV0dXJuIGJ1ZmZlcjtcblx0fTtcblxuXHR2YXIgYXJyYXlGcm9tQnVmZmVyID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdC8qIGRlY29kZSBkYXRhIHRvIEZsb2F0MzJBcnJheSovXG5cdFx0dmFyIGJ1ZiA9IGJhc2U2NERlY1RvQXJyKGRhdGEudmFscywgZGF0YS5ieXRlQ29kaW5nKTtcblx0XHR2YXIgZkFycmF5PW51bGw7XG5cdFx0aWYoZGF0YS5ieXRlQ29kaW5nPT09NClcblx0XHRcdGZBcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmKTtcblx0XHRlbHNlIGlmIChkYXRhLmJ5dGVDb2Rpbmc9PT04KVxuXHRcdFx0ZkFycmF5ID0gbmV3IEZsb2F0NjRBcnJheShidWYpO1xuXG5cdFx0aWYoZGF0YS5zaXplICE9IGZBcnJheS5sZW5ndGgpIGNvbnNvbGUubG9nKFwiTWlzbWF0Y2ggb2Ygc2l6ZSBcIitkYXRhLnNpemUrXCIgdnMgXCIrZkFycmF5Lmxlbmd0aCk7XG5cdFx0dmFyIHRhYiA9IG5ldyBBcnJheShkYXRhLnNpemUpO1xuXHRcdC8qIHVwZGF0ZSBuYiBvZiBzYW1wbGVzIHN0b3JlZCAqL1xuXHRcdGZvcih2YXIgaSBpbiBmQXJyYXkpIHtcblx0XHRcdHRhYltwYXJzZUludChpKV09ZkFycmF5W2ldOyAvKiBrZWVwIGZpcnN0IHZhbCAtIG5hbWUgb2YgY29sdW1uICovXG5cdFx0fVxuXHRcdHJldHVybiB0YWI7XG5cdH07XG5cblx0aWYoZGF0YSAmJiBkYXRhLmhlYWRlcikge1xuXHRcdGZvciAodmFyIG4gaW4gZGF0YSkge1xuXHRcdFx0aWYobiAhPSBcImhlYWRlclwiICYmIG4gIT0gXCJlcnJcIikge1xuXG5cdFx0XHRcdGlmKGRhdGFbbl0uZXJyICYmIGRhdGFbbl0uZXJyLnN0PjApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhuK1wiIHdhcyBpbiBlcnJvcjogXCIrZGF0YVtuXS5lcnIubXNnKTtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0aWYoIWRhdGFNb2RlbClcblx0XHRcdFx0XHRkYXRhTW9kZWw9e307XG5cblx0XHRcdFx0Ly8gY29uc29sZS5sb2cobik7XG5cdFx0XHRcdGlmKCFkYXRhTW9kZWxbbl0pIHtcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl09e307XG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLmRhdGE9e307XG5cdFx0XHRcdH1cblx0XHRcdFx0LyogdXBkYXRlIGRhdGEgcmFuZ2UgKi9cblx0XHRcdFx0ZGF0YU1vZGVsW25dLnJhbmdlPWRhdGFbbl0ucmFuZ2U7XG5cdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIHJhbmdlICovXG5cdFx0XHRcdGRhdGFNb2RlbFtuXS50aW1lUmFuZ2U9ZGF0YVtuXS50aW1lUmFuZ2U7XG5cdFx0XHRcdC8qIHVwZGF0ZSBkYXRhIGxhYmVsICovXG5cdFx0XHRcdGRhdGFNb2RlbFtuXS5sYWJlbD1kYXRhW25dLmxhYmVsO1xuXHRcdFx0XHQvKiB1cGRhdGUgZGF0YSB1bml0ICovXG5cdFx0XHRcdGRhdGFNb2RlbFtuXS51bml0PWRhdGFbbl0udW5pdDtcblx0XHRcdFx0LyogdXBkYXRlIGRhdGEgaW5kZXhSYW5nZSAqL1xuXHRcdFx0XHRkYXRhTW9kZWxbbl0ucXVhbGl0eUNvbmZpZz17XG5cdFx0XHRcdFx0LyogY29uZm9ydFJhbmdlOiBkYXRhW25dLmNvbmZvcnRSYW5nZSwgKi9cblx0XHRcdFx0XHRpbmRleFJhbmdlOiBkYXRhW25dLmluZGV4UmFuZ2Vcblx0XHRcdFx0fTtcblx0XHRcdFx0Ly9cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJkYXRhIDogXCIrSlNPTi5zdHJpbmdpZnkoZGF0YVtuXSkpO1xuXHRcdFx0XHRpZihkYXRhW25dLmRhdGEudmFscy5sZW5ndGggPiAwKVxuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5kYXRhID0gYXJyYXlGcm9tQnVmZmVyKGRhdGFbbl0uZGF0YSk7XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGlmKGRhdGFbbl0uZGF0YS5zaXplICE9IDApIGNvbnNvbGUubG9nKFwiU2l6ZSBtaXNtYXRjaCByZWNlaXZlZCBkYXRhIChubyBkYXRhIHZlcnN1cyBzaXplPVwiK2RhdGFbbl0uZGF0YS5zaXplK1wiKVwiKTtcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0uZGF0YSA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmKGRhdGFbbl0udGltZS52YWxzLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnRpbWUgPSBhcnJheUZyb21CdWZmZXIoZGF0YVtuXS50aW1lKTtcblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0aWYoZGF0YVtuXS50aW1lLnNpemUgIT0gMCkgY29uc29sZS5sb2coXCJTaXplIG1pc21hdGNoIHJlY2VpdmVkIGRhdGEgKG5vIGRhdGEgdmVyc3VzIHNpemU9XCIrZGF0YVtuXS50aW1lLnNpemUrXCIpXCIpO1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS50aW1lID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYoZGF0YVtuXS5pbmRleC52YWxzLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnF1YWxpdHlJbmRleCA9IGFycmF5RnJvbUJ1ZmZlcihkYXRhW25dLmluZGV4KTtcblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0aWYoZGF0YVtuXS5pbmRleC5zaXplICE9IDApIGNvbnNvbGUubG9nKFwiU2l6ZSBtaXNtYXRjaCByZWNlaXZlZCBkYXRhIChubyBkYXRhIHZlcnN1cyBzaXplPVwiK2RhdGFbbl0uaW5kZXguc2l6ZStcIilcIik7XG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnF1YWxpdHlJbmRleCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmKGRhdGFbbl0ucm9ib3RJZC52YWxzLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnJvYm90SWQgPSBhcnJheUZyb21CdWZmZXIoZGF0YVtuXS5yb2JvdElkKTtcblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0aWYoZGF0YVtuXS5yb2JvdElkLnNpemUgIT0gMCkgY29uc29sZS5sb2coXCJTaXplIG1pc21hdGNoIHJlY2VpdmVkIGRhdGEgKG5vIGRhdGEgdmVyc3VzIHNpemU9XCIrZGF0YVtuXS5yb2JvdElkLnNpemUrXCIpXCIpO1xuXHRcdFx0XHRcdGRhdGFNb2RlbFtuXS5yb2JvdElkID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYoZGF0YVtuXS5wbGFjZUlkLnZhbHMubGVuZ3RoID4gMClcblx0XHRcdFx0XHRkYXRhTW9kZWxbbl0ucGxhY2VJZCA9IGFycmF5RnJvbUJ1ZmZlcihkYXRhW25dLnBsYWNlSWQpO1xuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRpZihkYXRhW25dLnBsYWNlSWQuc2l6ZSAhPSAwKSBjb25zb2xlLmxvZyhcIlNpemUgbWlzbWF0Y2ggcmVjZWl2ZWQgZGF0YSAobm8gZGF0YSB2ZXJzdXMgc2l6ZT1cIitkYXRhW25dLnBsYWNlSWQuc2l6ZStcIilcIik7XG5cdFx0XHRcdFx0ZGF0YU1vZGVsW25dLnBsYWNlSWQgPSBbXTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBkYXRhTW9kZWxbbl0uZGF0YSA9IEFycmF5LmZyb20oZkFycmF5KTtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnbXlkYXRhICcrSlNPTi5zdHJpbmdpZnkoZGF0YU1vZGVsW25dLmRhdGEpKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0ZWxzZSB7XG5cdFx0Y29uc29sZS5sb2coXCJObyBEYXRhIHRvIHJlYWQgb3IgaGVhZGVyIGlzIG1pc3NpbmcgIVwiKTtcblx0fVxuXHR0aGlzLmRhdGFNb2RlbD1kYXRhTW9kZWw7XG5cdHJldHVybiBkYXRhTW9kZWw7XG59O1xuXG4vKiogY3JlYXRlIElFUSBzZXJ2aWNlICoqL1xuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS5JRVEgPSBmdW5jdGlvbigpe1xuXHR2YXIgaWVxID0gbmV3IElFUSh0aGlzKTtcblx0cmV0dXJuIGllcTtcbn07XG4iLCJFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdub2RlLWV2ZW50LWVtaXR0ZXInKTtcblxuLyoqXG4gKiBDb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSBtYXAge1N0cmluZ30gbWFwJ3MgbmFtZVxuICovXG5mdW5jdGlvbiBNYXBzKHNlbGVjdG9yLCBtYXApIHtcblxuXG5cdHRoaXMuX21hcCA9IG1hcDsgLy8gbWFwIG5hbWVcblx0dGhpcy5fc2VsZWN0b3IgPSBzZWxlY3RvcjsgLy8gZDEoKVxuXHR0aGlzLl9zdWJJZHMgPSB7fTsgLy8gbGlzdCBvZiBzdWJzY3JpcHRpb24gSWQgKGZvciB1bnN1YnNjcmlwdGlvbiBwdXJwb3NlKSBlLmcge3BlZXJJZDA6IHN1YklkMCwgLi4ufVxuXG5cdC8vIGxpc3Qgb2YgcmVnaXN0ZXJlZCBwbGFjZSBieSBEaXlhXG5cdHRoaXMuX2RpeWFzID0ge307XG5cblx0Ly8gZ2V0IGEgbGlzdCBvZiBEaXlhIGZyb20gc2VsZWN0b3IgYW5kIHNvcnQgaXRcblx0dmFyIGxpc3REaXlhID0gW107Ly8sIGVudGVyRGl5YSA9IG51bGwsIGV4aXREaXlhID0gW107XG5cdHRoaXMuX3NlbGVjdG9yLmVhY2goZnVuY3Rpb24ocGVlcklkKSB7IGxpc3REaXlhLnB1c2gocGVlcklkKTsgfSk7XG5cdGxpc3REaXlhLnNvcnQoKTtcblxuXHR0aGlzLmxpc3REaXlhID0gbGlzdERpeWE7XG59XG5pbmhlcml0cyhNYXBzLCBFdmVudEVtaXR0ZXIpO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vL+KIleKIleKIleKIleKIleKIlS8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL+KIleKIleKIleKIleKIleKIlS8vL1xuLy8vLyBTdGF0aWMgZnVuY3Rpb25zIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy/iiJXiiJXiiJXiiJXiiJXiiJUvLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8v4oiV4oiV4oiV4oiV4oiV4oiVLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8v4oiV4oiV4oiV4oiV4oiV4oiVLy8vXG5cbi8qKlxuICogc3RhdGljIGZ1bmN0aW9uLCBnZXQgY3VycmVudCBwbGFjZSBmcm9tIGRpeWFub2RlXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yIHtSZWdFeHAvU3RyaW5nL0FycmF5PFN0cmluZz59IHNlbGVjdG9yIG9mIERpeWFOb2RlIChhbHNvIHJvYm90KVxuICogQHBhcmFtIG1hcCB7U3RyaW5nfSBtYXAncyBuYW1lXG4gKiBAcGFyYW0gZnVuYyB7ZnVuY3Rpb24oKX0gY2FsbGJhY2sgZnVuY3Rpb24gd2l0aCByZXR1cm4gcGVlcklkLCBlcnJvciBhbmQgZGF0YSAoeyBtYXBJZCwgbGFiZWwsIG5ldXJvbklkLCAgeCwgeX0pXG4gKi9cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUuZ2V0Q3VycmVudFBsYWNlID0gZnVuY3Rpb24oIG1hcCwgZnVuYykge1xuXHR0aGlzLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICdtYXBzJyxcblx0XHRmdW5jOiAnR2V0Q3VycmVudFBsYWNlJyxcblx0XHRvYmo6IFsgbWFwIF0sXG5cdH0sIGZ1bmN0aW9uKHBlZXJJZCwgZXJyLCBkYXRhKSB7XG5cdFx0ZnVuYyhwZWVySWQsIGVyciwgZGF0YSk7XG5cdH0pO1xufVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vL+KIleKIleKIleKIleKIleKIlS8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL+KIleKIleKIleKIleKIleKIlS8vL1xuLy8vLyBJbnRlcm5hbCBmdW5jdGlvbnMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy/iiJXiiJXiiJXiiJXiiJXiiJUvLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8v4oiV4oiV4oiV4oiV4oiV4oiVLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8v4oiV4oiV4oiV4oiV4oiV4oiVLy8vXG5cbi8qKlxuICogcm91bmQgZmxvYXQgdG8gc2l4IGRlY2ltYWxzIHRvIGNvbXBhcmUsIGFzIHRoZSBudW1iZXIgaW4ganMgaXMgZW5jb2RlZCBpblxuICogSUVFRSA3NTQgc3RhbmRhcmQgfiBhcm91bmQgMTYgZGVjaW1hbCBkaWdpdHMgcHJlY2lzaW9uLCB3ZSBsaW1pdCB0byA2IGZvclxuICogZWFzaWVyIGNvbXBhcmlzaW9uIGFuZCBlcnJvciBkdWUgdG8gYXJpdGhtZXRpYyBvcGVyYXRpb25cbiAqL1xuTWFwcy5wcm90b3R5cGUuX3JvdW5kID0gZnVuY3Rpb24gKHZhbCkge1xuXHQvLyByb3VkaW5nIHRvIHNpeCBkZWNpbWFsc1xuXHRyZXR1cm4gTWF0aC5yb3VuZChwYXJzZUZsb2F0KHZhbCkgKiAxMDAwMDAwKSAvIDEwMDAwMDA7XG59O1xuXG4vKipcbiAqIGNoZWNrIGVxdWFsIHdpdGggcm91bmRpbmdcbiAqL1xuTWFwcy5wcm90b3R5cGUuX2lzRmxvYXRFcXVhbCA9IGZ1bmN0aW9uICh2YWwxLCB2YWwyKSB7XG5cdC8vIHJvdWRpbmcgdG8gdHdvIGRlY2ltYWxzXG5cdHJldHVybiB0aGlzLl9yb3VuZCh2YWwxKSA9PT0gdGhpcy5fcm91bmQodmFsMik7XG59O1xuXG4vKipcbiAqIGNoZWNrIGlmIG1hcCBpcyBtb2RpZmllZCBieSBjb21wYXJlIHdpdGggaW50ZXJuYWwgbGlzdFxuICovXG5NYXBzLnByb3RvdHlwZS5tYXBJc01vZGlmaWVkID0gZnVuY3Rpb24ocGVlcklkLCBtYXBfaW5mbykge1xuXHQvLyBkb3VibGUgY2hlY2tcblx0bWFwX2luZm8uc2NhbGUgPSBBcnJheS5pc0FycmF5KG1hcF9pbmZvLnNjYWxlKSA/IG1hcF9pbmZvLnNjYWxlWzBdIDogbWFwX2luZm8uc2NhbGVcblxuXHQvLyB1Z2x5IGNvZGUgYnV0IHF1aWNrIGNvbXBhcmUgdG8gbG9vcFxuXHRyZXR1cm4gISh0aGlzLl9pc0Zsb2F0RXF1YWwodGhpcy5fZGl5YXNbcGVlcklkXS5wYXRoLnNjYWxlLCBtYXBfaW5mby5zY2FsZSkgJiZcblx0XHRcdFx0dGhpcy5faXNGbG9hdEVxdWFsKHRoaXMuX2RpeWFzW3BlZXJJZF0ucGF0aC5yb3RhdGUsIG1hcF9pbmZvLnJvdGF0ZSkgJiZcblx0XHRcdFx0dGhpcy5faXNGbG9hdEVxdWFsKHRoaXMuX2RpeWFzW3BlZXJJZF0ucGF0aC50cmFuc2xhdGVbMF0sIG1hcF9pbmZvLnRyYW5zbGF0ZVswXSkgJiZcblx0XHRcdFx0dGhpcy5faXNGbG9hdEVxdWFsKHRoaXMuX2RpeWFzW3BlZXJJZF0ucGF0aC50cmFuc2xhdGVbMV0sIG1hcF9pbmZvLnRyYW5zbGF0ZVsxXSkgJiZcblx0XHRcdFx0dGhpcy5faXNGbG9hdEVxdWFsKHRoaXMuX2RpeWFzW3BlZXJJZF0ucGF0aC5yYXRpbywgbWFwX2luZm8ucmF0aW8pKTtcbn1cblxuLyoqXG4gKiBjaGVjayBpZiBwbGFjZSBpcyBtb2RpZmllZCBieSBjb21wYXJlIHdpdGggaW50ZXJuYWwgbGlzdFxuICovXG5NYXBzLnByb3RvdHlwZS5wbGFjZUlzTW9kaWZpZWQgPSBmdW5jdGlvbihwZWVySWQsIHBsYWNlX2luZm8pIHtcblx0Ly8gdWdseSBjb2RlIGJ1dCBxdWljayBjb21wYXJlIHRvIGxvb3Bcblx0cmV0dXJuICEodGhpcy5faXNGbG9hdEVxdWFsKHRoaXMuX2RpeWFzW3BlZXJJZF0ucGxhY2VzW3BsYWNlX2luZm8uaWRdLngsIHBsYWNlX2luZm8ueCkgJiZcblx0XHRcdFx0dGhpcy5faXNGbG9hdEVxdWFsKHRoaXMuX2RpeWFzW3BlZXJJZF0ucGxhY2VzW3BsYWNlX2luZm8uaWRdLnksIHBsYWNlX2luZm8ueSkpO1xufVxuXG4vLyAvKipcbi8vICAqIGFkZCBhIERpeWEgd2hlbiBzZWxlY3RvciBjaGFuZ2VkIGFuZCBoYWQgbmV3IERpeWFcbi8vICAqXG4vLyAgKiBAcGFyYW0gcGVlcklkIHtTdHJpbmd9IHBlZXJJZCBvZiBEaXlhTm9kZSAoYWxzbyByb2JvdClcbi8vICAqIEBwYXJhbSBjb2xvciB7ZDNfcmdifSBkMyBjb2xvclxuLy8gICovXG4vLyBNYXBzLnByb3RvdHlwZS5hZGRQZWVyID0gZnVuY3Rpb24ocGVlcklkKSB7XG4vLyBcdHRoaXMuX2RpeWFzW3BlZXJJZF0gPSB7XG4vLyBcdFx0bWFwSWQ6IG51bGwsXG4vLyBcdFx0cGF0aDogbnVsbCwgLy8ge3RyYW5zbGF0ZTogW10sIHNjYWxlOiBudWxsLCByb3RhdGU6IG51bGx9LFxuLy8gXHRcdHBsYWNlczoge30sXG4vLyBcdFx0bWFwSXNNb2RpZmllZDogZmFsc2UsXG4vLyBcdH07XG4vLyB9XG5cbi8qKlxuICogcmVtb3ZlIGEgRGl5YSB3aGVuIHRoZXJlIGlzIGEgcHJvYmxlbSBpbiBsaXN0ZW4gbWFwIChzdWJzY3JpcHRpb24pXG4gKlxuICogQHBhcmFtIHBlZXJJZCB7U3RyaW5nfSBwZWVySWQgb2YgRGl5YU5vZGUgKGFsc28gcm9ib3QpXG4gKi9cbk1hcHMucHJvdG90eXBlLnJlbW92ZVBlZXIgPSBmdW5jdGlvbihwZWVySWQpIHtcblx0aWYgKHRoaXMuX2RpeWFzW3BlZXJJZF0pIHtcblx0XHQvLyByZW1vdmVcblx0XHRkZWxldGUgdGhpcy5fZGl5YXNbcGVlcklkXTtcblx0XHR0aGlzLmVtaXQoXCJwZWVyLXVuc3Vic2NyaWJlZFwiLCBwZWVySWQpO1xuXHR9XG5cblx0Ly8gbmVjY2Vzc2FyeT8gaWYgZGl5YW5vZGUgcmVjb25uZWN0P1xuXHRpZiAodGhpcy5fc3ViSWRzW3BlZXJJZF0gIT09IG51bGwgJiYgIWlzTmFOKHRoaXMuX3N1Yklkc1twZWVySWRdKSkge1xuXHRcdC8vIGV4aXN0ZWQgc3Vic2NyaXB0aW9uID8/XG5cdFx0Ly8gdW5zdWJzY3JpYmVcblx0XHRkMShwZWVySWQpLnVuc3Vic2NyaWJlKHRoaXMuX3N1Yklkcylcblx0XHRkZWxldGUgdGhpcy5fc3ViSWRzW3BlZXJJZF07XG5cdH1cbn1cblxuLyoqXG4gKiBjb25uZWN0IHRvIHNlcnZpY2UgbWFwXG4gKi9cbk1hcHMucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbigpIHtcblx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdC8vIG9wdGlvbnMgZm9yIHN1YnNjcmlwdGlvblxuXHR2YXIgb3B0aW9ucyA9IHtcblx0XHRhdXRvOiB0cnVlLCAvLyBhdXRvIHJlc3Vic2NyaWJlP1xuXHRcdHN1YklkczogW10gLy8gaW4gZmFjdCwgaXQgaXMgYSBsaXN0LCBidXQgdGhlIGNvZGUgaW4gRGl5YVNlbGVjdG9yIGNoZWNrIGZvciBhcnJheVxuXHR9O1xuXG5cdC8vIHN1YnNjcmliZSBmb3IgbWFwIHNlcnZpY2Vcblx0dGhpcy5fc2VsZWN0b3Iuc3Vic2NyaWJlKHtcblx0XHRzZXJ2aWNlOiAnbWFwcycsXG5cdFx0ZnVuYzogJ0xpc3Rlbk1hcCcsXG5cdFx0b2JqOiBbIHRoaXMuX21hcCBdXG5cdH0sIGZ1bmN0aW9uKHBlZXJJZCwgZXJyLCBkYXRhKSB7XG5cdFx0aWYgKGVyciB8fCBkYXRhLmVycm9yKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhcIk1hcHM6IFBlZXIgW1wiLCBwZWVySWQsIFwiXTogZmFpbCB0byBnZXQgaW5mbyBmcm9tIG1hcCAnXCIgKyB0aGF0Ll9tYXAgKyBcIicsIGVycm9yOlwiLCBlcnIgfHwgZGF0YS5lcnJvciwgXCIhXCIpOyAvLyBtb3N0bHkgUGVlckRpc2Nvbm5lY3RlZFxuXG5cdFx0XHQvLyByZW1vdmUgdGhhdCBwZWVyXG5cdFx0XHR0aGF0LnJlbW92ZVBlZXIocGVlcklkKTsvLy4uLlxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmIChkYXRhID09IG51bGwpIHJldHVybiA7XG5cblx0XHRpZiAoIUFycmF5LmlzQXJyYXkoZGF0YS5wbGFjZXMpKSB7IC8vIHdpbm5lciwgdGhpcyBpc24ndCAxc3QgbWVzc2FnZVxuXHRcdFx0ZGF0YS5wbGFjZXMgPSBbXTtcblx0XHR9XG5cblx0XHQvLyBkYXRhLnBsYWNlIGlzIGN1cnJlbnQgcGxhY2Vcblx0XHRpZiAoZGF0YS5wbGFjZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRkYXRhLnBsYWNlcy5wdXNoKGRhdGEucGxhY2UpOyAvLyBtYXkgYmUgbnVsbCAuLi5cblx0XHR9XG5cblx0XHR2YXIgbWFwX2luZm8gPSBudWxsLCBwbGFjZXNfaW5mbyA9IFtdO1xuXG5cdFx0aWYgKGRhdGEuaWQpIHsgLy8gZmlyc3QgbWVzc2FnZSBmcm9tIERpeWFOb2RlXG5cdFx0XHQvLyBkYXRhIDoge2lkLCBuYW1lLCBwbGFjZXMsIHJvdGF0ZSwgc2NhbGUsIHR4LCB0eSwgcmF0aW99XG5cdFx0XHRpZiAodGhhdC5fZGl5YXNbcGVlcklkXSA9PSBudWxsKSB7XG5cdFx0XHRcdHRoYXQuX2RpeWFzW3BlZXJJZF0gPSB7XG5cdFx0XHRcdFx0bWFwSWQ6IGRhdGEuaWQsXG5cdFx0XHRcdFx0cGF0aDoge1xuXHRcdFx0XHRcdFx0dHJhbnNsYXRlOiBbZGF0YS50eCwgZGF0YS50eV0sXG5cdFx0XHRcdFx0XHRzY2FsZTogZGF0YS5zY2FsZSxcblx0XHRcdFx0XHRcdHJvdGF0ZTogZGF0YS5yb3RhdGUsXG5cdFx0XHRcdFx0XHRyYXRpbzogZGF0YS5yYXRpb1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0cGxhY2VzOiB7fVxuXHRcdFx0XHR9O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhhdC5fZGl5YXNbcGVlcklkXS5tYXBJZCA9IGRhdGEuaWQ7XG5cblx0XHRcdFx0aWYgKHRoYXQuX2RpeWFzW3BlZXJJZF0ucGF0aCA9PSBudWxsKSB7XG5cdFx0XHRcdFx0dGhhdC5fZGl5YXNbcGVlcklkXS5wYXRoID0ge307XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhhdC5fZGl5YXNbcGVlcklkXS5wYXRoLnRyYW5zbGF0ZSA9IFtkYXRhLnR4LCBkYXRhLnR5XTtcblx0XHRcdFx0dGhhdC5fZGl5YXNbcGVlcklkXS5wYXRoLnNjYWxlID0gZGF0YS5zY2FsZTtcblx0XHRcdFx0dGhhdC5fZGl5YXNbcGVlcklkXS5wYXRoLnJvdGF0ZSA9IGRhdGEucm90YXRlO1xuXHRcdFx0XHR0aGF0Ll9kaXlhc1twZWVySWRdLnBhdGgucmF0aW8gPSBkYXRhLnJhdGlvO1xuXG5cdFx0XHRcdGlmICh0aGF0Ll9kaXlhc1twZWVySWRdLnBsYWNlcyA9PSBudWxsKSB7XG5cdFx0XHRcdFx0dGhhdC5fZGl5YXNbcGVlcklkXS5wbGFjZXMgPSB7fTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRtYXBfaW5mbyA9IHtcblx0XHRcdFx0aWQ6IGRhdGEuaWQsXG5cdFx0XHRcdG5hbWU6IGRhdGEubmFtZSxcblx0XHRcdFx0cm90YXRlOiBkYXRhLnJvdGF0ZSxcblx0XHRcdFx0c2NhbGU6IGRhdGEuc2NhbGUsXG5cdFx0XHRcdHRyYW5zbGF0ZTogW2RhdGEudHgsIGRhdGEudHldLFxuXHRcdFx0XHRyYXRpbzogZGF0YS5yYXRpb1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHNhdmUgZGF0YSB2YWx1ZXNcblx0XHRkYXRhLnBsYWNlcy5tYXAoZnVuY3Rpb24ocGxhY2UpIHtcblx0XHRcdGlmIChwbGFjZSkgeyAvLyBudWxsIGlmIGN1cnJlbnRwbGFjZSBpc24ndCBpbml0IGluIERpeWFOb2RlXG5cdFx0XHRcdC8vIHBsYWNlIHsgbWFwSWQsIGxhYmVsLCBuZXVyb25JZCwgIHgsIHl9XG5cblx0XHRcdFx0Ly8gbmV1cm9uSWQgKGFsc28gcGxhY2UgJ3MgSWQpXG5cdFx0XHRcdHZhciBpZCA9IHBsYWNlLm5ldXJvbklkO1xuXG5cdFx0XHRcdC8vIFVwZGF0ZSBpbnRlcm5hbCBsaXN0XG5cdFx0XHRcdC8vIGNvbnZlcnQgZnJvbSBEaXlhIHBhcmFtZXRlciAoMC4uMSBrbSkgdG8gZGl5YS1tYXAgKDAuLjEwMDAwMClcblx0XHRcdFx0cGxhY2UgPSB7XG5cdFx0XHRcdFx0aWQ6IGlkLFxuXHRcdFx0XHRcdGxhYmVsOiBwbGFjZS5sYWJlbCxcblx0XHRcdFx0XHR4OiBwbGFjZS54LFxuXHRcdFx0XHRcdHk6IHBsYWNlLnksXG5cdFx0XHRcdFx0dDogMzYwICogcGxhY2UudFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGlmICh0aGF0Ll9kaXlhc1twZWVySWRdLnBsYWNlc1tpZF0gPT0gbnVsbCkgeyAvLyBub25leGlzdGVudCBwbGFjZVxuXHRcdFx0XHRcdC8vIGlmIGlzIG51bGwgb3IgdW5kZWZpbmVkXG5cdFx0XHRcdFx0dGhhdC5fZGl5YXNbcGVlcklkXS5wbGFjZXNbaWRdID0gcGxhY2U7IC8vIHNhdmUgaXRcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHBsYWNlc19pbmZvLnB1c2goT2JqZWN0LmNyZWF0ZShwbGFjZSkpOy8vIGNyZWF0ZSBhIGNvcHkgdG8gc2VuZCB0byB1c2VyXG5cblx0XHRcdFx0Ly8gc2F2ZSBiYXNlIHBsYWNlIChmaXJzdCBrbm93biBwbGFjZSwgYWxzbyBmaXJzdCBlbGVtZW50IG9mIHBsYWNlcyBhcnJheSlcblx0XHRcdFx0Ly8gdXNlbGVzcyBhdCB0aGUgbW9tZW50XG5cdFx0XHRcdC8vIGlmICghdGhhdC5fZGl5YXNbcGVlcklkXS5iYXNlUGxhY2UpIHRoYXQuX2RpeWFzW3BlZXJJZF0uYmFzZVBsYWNlID0gcGxhY2U7XG5cdFx0XHR9IGVsc2UgeyAvLyBjdXJyZW50IHBsYWNlIGlzIG51bGxcblx0XHRcdFx0cGxhY2VzX2luZm8ucHVzaChudWxsKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGlmIChwbGFjZXNfaW5mby5sZW5ndGggPT09IDApIHBsYWNlc19pbmZvID0gbnVsbDtcblxuXHRcdHRoYXQuZW1pdChcInBlZXItc3Vic2NyaWJlZFwiLHBlZXJJZCwgbWFwX2luZm8sIHBsYWNlc19pbmZvKTtcblx0fSwgb3B0aW9ucyk7XG5cblx0Zm9yICh2YXIgcGVlcklkIGluIG9wdGlvbnMuc3ViSWRzKSB7XG5cdFx0aWYgKHRoaXMuX3N1Yklkc1twZWVySWRdICE9PSBudWxsICYmICFpc05hTih0aGlzLl9zdWJJZHNbcGVlcklkXSkpIHtcblx0XHRcdC8vIGV4aXN0ZWQgc3Vic2NyaXB0aW9uID8/XG5cdFx0XHRkMShwZWVySWQpLnVuc3Vic2NyaWJlKHRoaXMuX3N1Yklkcylcblx0XHRcdGRlbGV0ZSB0aGlzLl9zdWJJZHNbcGVlcklkXTtcblx0XHRcdGNvbnNvbGUubG9nKFwiTWFwczogYnVnOiBleGlzdGVkIHN1YnNjcmlwdGlvbiA/P1wiKVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBzYXZlIHN1YklkIGZvciBsYXRlciB1bnN1YnNjcmlwdGlvblxuXHRcdFx0dGhpcy5fc3ViSWRzW3BlZXJJZF0gPSBvcHRpb25zLnN1Yklkc1twZWVySWRdO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0aGlzO1xufVxuXG4vKipcbiAqIGRpc2Nvbm5lY3QgZnJvbSBzZXJ2aWNlIG1hcCwgZnJlZSBldmVyeXRoaW5nIHNvIGl0IGlzIHNhZmUgdG8gZ2FyYmFnZSBjb2xsZWN0ZSB0aGlzIHNlcnZpY2VcbiAqL1xuTWFwcy5wcm90b3R5cGUuZGlzY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cdHRoaXMuX3NlbGVjdG9yLnVuc3Vic2NyaWJlKHRoaXMuX3N1Yklkcyk7XG5cdHRoaXMuX2RpeWFzID0ge307Ly8gZGVsZXRlID9cblx0dGhpcy5fc2VsZWN0b3IuZWFjaChmdW5jdGlvbihwZWVySWQpIHtcblx0XHR0aGF0LmVtaXQoXCJwZWVyLXVuc3Vic2NyaWJlZFwiLCBwZWVySWQpO1xuXHR9KTtcblx0dGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbn1cblxuLyoqXG4gKiBzYXZlIG1hcFxuICpcbiAqIEBwYXJhbSBwZWVySWQge1N0cmluZ30gcGVlcklkIG9mIERpeWFOb2RlIChhbHNvIHJvYm90KVxuICogQHBhcmFtIG1hcF9pbmZvIHtPYmplY3R9ICh7cm90YXRlLCBzY2FsZSwgdHJhbnNsYXRlfSlcbiAqIEBwYXJhbSBjYiB7RnVuY3Rpb259IGNhbGxiYWNrIHdpdGggZXJyb3IgYXMgYXJndW1lbnRcbiAqL1xuTWFwcy5wcm90b3R5cGUuc2F2ZU1hcCA9IGZ1bmN0aW9uIChwZWVySWQsIG1hcF9pbmZvLCBjYikge1xuXHR2YXIgX21hcF9pbmZvID0gT2JqZWN0LmNyZWF0ZShtYXBfaW5mbyk7IC8vIGNyZWF0ZSBhIGR1cGxpY2F0ZSBvZiBtYXBfaW5mb1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cdC8vIHNhdmUgbWFwJ3MgaW5mb1xuXHRfbWFwX2luZm8uc2NhbGUgPSBBcnJheS5pc0FycmF5KF9tYXBfaW5mby5zY2FsZSkgPyBfbWFwX2luZm8uc2NhbGVbMF0gOiBfbWFwX2luZm8uc2NhbGVcblxuXHRpZiAodGhpcy5tYXBJc01vZGlmaWVkKHBlZXJJZCwgX21hcF9pbmZvKSkge1xuXHRcdGQxKHBlZXJJZCkucmVxdWVzdCh7XG5cdFx0XHRzZXJ2aWNlOiAnbWFwcycsXG5cdFx0XHRmdW5jOiAnVXBkYXRlTWFwJyxcblx0XHRcdG9iajogWyB0aGlzLl9tYXAgXSxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0c2NhbGU6IF9tYXBfaW5mby5zY2FsZSxcblx0XHRcdFx0dHg6IF9tYXBfaW5mby50cmFuc2xhdGVbMF0sXG5cdFx0XHRcdHR5OiBfbWFwX2luZm8udHJhbnNsYXRlWzFdLFxuXHRcdFx0XHRyb3RhdGU6IF9tYXBfaW5mby5yb3RhdGUsXG5cdFx0XHRcdHJhdGlvOiBfbWFwX2luZm8ucmF0aW9cblx0XHRcdH1cblx0XHR9LCBmdW5jdGlvbihwZWVySWQsIGVyciwgZGF0YSkge1xuXHRcdFx0aWYgKGVyciAhPSBudWxsKSB7XG5cdFx0XHRcdHRoYXQuX2RpeWFzW3BlZXJJZF0ucGF0aC5zY2FsZSA9IF9tYXBfaW5mby5zY2FsZTtcblx0XHRcdFx0dGhhdC5fZGl5YXNbcGVlcklkXS5wYXRoLnJvdGF0ZSA9IF9tYXBfaW5mby5yb3RhdGU7XG5cdFx0XHRcdHRoYXQuX2RpeWFzW3BlZXJJZF0ucGF0aC50cmFuc2xhdGVbMF0gPSBfbWFwX2luZm8udHJhbnNsYXRlWzBdO1xuXHRcdFx0XHR0aGF0Ll9kaXlhc1twZWVySWRdLnBhdGgudHJhbnNsYXRlWzFdID0gX21hcF9pbmZvLnRyYW5zbGF0ZVsxXTtcblx0XHRcdH1cblx0XHRcdGlmIChjYikgY2IoZXJyKTtcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRpZiAoY2IpIGNiKG5ldyBFcnJvcihcIk5vIGNoYW5nZSB0byBtYXAgJ1wiICsgdGhpcy5fbWFwICsgXCInIVwiKSk7XG5cdH1cbn1cblxuLyoqXG4gKiB1cGRhdGUgZXZlcnkgcGxhY2VzXG4gKlxuICogQHBhcmFtIHBlZXJJZCB7U3RyaW5nfSBwZWVySWQgb2YgRGl5YU5vZGUgKGFsc28gcm9ib3QpXG4gKiBAcGFyYW0gcGxhY2VfaW5mbyB7T2JqZWN0fSAoeyBpZCwgeCwgeX0pXG4gKiBAcGFyYW0gY2Ige0Z1bmN0aW9ufSBjYWxsYmFjayB3aXRoIGVycm9yIGFzIGFyZ3VtZW50XG4gKi9cbk1hcHMucHJvdG90eXBlLnNhdmVQbGFjZSA9IGZ1bmN0aW9uIChwZWVySWQsIHBsYWNlX2luZm8sIGNiKSB7XG5cdC8vIHNhdmUgbWFwJ3MgaW5mb1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cdHZhciBlcnJvciA9IFwiXCI7XG5cblx0dmFyIF9wbGFjZV9pbmZvID0gT2JqZWN0LmNyZWF0ZShwbGFjZV9pbmZvKTtcblxuXHQvLyBzYXZlIHBsYWNlXG5cdGlmICh0aGlzLnBsYWNlSXNNb2RpZmllZChwZWVySWQsIF9wbGFjZV9pbmZvKSkge1xuXHRcdGQxKHBlZXJJZCkucmVxdWVzdCh7XG5cdFx0XHRzZXJ2aWNlOiAnbWFwcycsXG5cdFx0XHRmdW5jOiAnVXBkYXRlUGxhY2UnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRtYXBJZDogdGhpcy5fZGl5YXNbcGVlcklkXS5tYXBJZCxcblx0XHRcdFx0bmV1cm9uSWQ6IF9wbGFjZV9pbmZvLmlkLFxuXHRcdFx0XHR4OiBfcGxhY2VfaW5mby54LFxuXHRcdFx0XHR5OiBfcGxhY2VfaW5mby55XG5cdFx0XHR9XG5cdFx0fSwgZnVuY3Rpb24ocGVlcklkLCBlcnIsIGRhdGEpIHtcblx0XHRcdGlmIChlcnIgIT0gbnVsbCkge1xuXHRcdFx0XHR0aGF0Ll9kaXlhc1twZWVySWRdLnBsYWNlc1tfcGxhY2VfaW5mby5pZF0ueCA9IF9wbGFjZV9pbmZvLng7XG5cdFx0XHRcdHRoYXQuX2RpeWFzW3BlZXJJZF0ucGxhY2VzW19wbGFjZV9pbmZvLmlkXS55ID0gX3BsYWNlX2luZm8ueTtcblx0XHRcdH1cblx0XHRcdGlmIChjYikgY2IoZXJyKTtcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRpZiAoY2IpIGNiKG5ldyBFcnJvcihcIk5vIGNoYW5nZSB0byBwbGFjZSBuwrBcIiArIF9wbGFjZV9pbmZvLmlkICsgXCIhXCIpKTtcblx0fVxufVxuXG4vKipcbiAqIGRlbGV0ZSBldmVyeSBzYXZlZCBwbGFjZXMgb2YgRGl5YSAoY2hvb3NlbiBpbiBzZWxlY3RvcilcbiAqXG4gKiBAcGFyYW0gcGVlcklkIHtTdHJpbmd9IHBlZXJJZCBvZiBEaXlhTm9kZSAoYWxzbyByb2JvdClcbiAqIEBwYXJhbSBjYiB7RnVuY3Rpb259IGNhbGxiYWNrIHdpdGggZXJyb3IgYXMgYXJndW1lbnRcbiAqL1xuTWFwcy5wcm90b3R5cGUuY2xlYXJQbGFjZXMgPSBmdW5jdGlvbihwZWVySWQsIGNiKSB7XG5cdHZhciB0aGF0ID0gdGhpcztcblxuXHRkMShwZWVySWQpLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICdtYXBzJyxcblx0XHRmdW5jOiAnQ2xlYXJNYXAnLFxuXHRcdG9iajogWyB0aGlzLl9tYXAgXVxuXHR9LCBmdW5jdGlvbihwZWVySWQsIGVyciwgZGF0YSkge1xuXHRcdGlmIChlcnIgIT0gbnVsbCkge1xuXHRcdFx0Ly8gZGVsZXRlIGZyb20gaW50ZXJuYWwgbGlzdFxuXHRcdFx0dGhhdC5fZGl5YXNbcGVlcklkXS5wbGFjZXMgPSB7fTtcblx0XHR9XG5cdFx0aWYgKGNiKSBjYihlcnIpO1xuXHR9KTtcbn1cblxuLy8gZXhwb3J0IGl0IGFzIG1vZHVsZSBvZiBEaXlhU2VsZWN0b3JcbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUubWFwcyA9IGZ1bmN0aW9uKG1hcCkge1xuXHR2YXIgbWFwcyA9IG5ldyBNYXBzKHRoaXMsIG1hcCk7XG5cblx0cmV0dXJuIG1hcHM7XG59XG4iLCIvKiBtYXlhLWNsaWVudFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgUGFydG5lcmluZyBSb2JvdGljcywgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgbGlicmFyeSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3JcbiAqIG1vZGlmeSBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWNcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IHZlcnNpb25cbiAqICAzLjAgb2YgdGhlIExpY2Vuc2UgVGhpcyBsaWJyYXJ5IGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlXG4gKiB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlblxuICogdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUlxuICogUFVSUE9TRS4gU2VlIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWNcbiAqIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIGxpYnJhcnkuXG4gKi9cblxuXG5cbmZ1bmN0aW9uIE1lc3NhZ2Uoc2VydmljZSwgZnVuYywgb2JqLCBwZXJtYW5lbnQpe1xuXG5cdHRoaXMuc2VydmljZSA9IHNlcnZpY2U7XG5cdHRoaXMuZnVuYyA9IGZ1bmM7XG5cdHRoaXMub2JqID0gb2JqO1xuXHRcblx0dGhpcy5wZXJtYW5lbnQgPSBwZXJtYW5lbnQ7IC8vSWYgdGhpcyBmbGFnIGlzIG9uLCB0aGUgY29tbWFuZCB3aWxsIHN0YXkgb24gdGhlIGNhbGxiYWNrIGxpc3QgbGlzdGVuaW5nIGZvciBldmVudHNcbn1cblxuTWVzc2FnZS5idWlsZFNpZ25hdHVyZSA9IGZ1bmN0aW9uKG1zZyl7XG5cdHJldHVybiBtc2cuc2VydmljZSsnLicrbXNnLmZ1bmMrJy4nK21zZy5vYmo7XG59XG5cblxuTWVzc2FnZS5wcm90b3R5cGUuc2lnbmF0dXJlID0gZnVuY3Rpb24oKXtcblx0cmV0dXJuIHRoaXMuc2VydmljZSsnLicrdGhpcy5mdW5jKycuJyt0aGlzLm9iajtcbn1cblxuTWVzc2FnZS5wcm90b3R5cGUuZXhlYyA9IGZ1bmN0aW9uKGRhdGEpe1xuXHRyZXR1cm4ge1xuXHRcdHNlcnZpY2U6IHRoaXMuc2VydmljZSxcblx0XHRmdW5jOiB0aGlzLmZ1bmMsXG5cdFx0b2JqOiB0aGlzLm9iaixcblx0XHRkYXRhOiBkYXRhXG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlO1xuIiwidmFyIERpeWFTZWxlY3RvciA9IHJlcXVpcmUoJy4uLy4uL0RpeWFTZWxlY3RvcicpLkRpeWFTZWxlY3RvcjtcblxuXG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUuaXAgPSBmdW5jdGlvbihpZmFjZSwgY2FsbGJhY2spe1xuXHRyZXR1cm4gdGhpcy5yZXF1ZXN0KHtcblx0XHRzZXJ2aWNlOiAnbmV0d29ya0lkJyxcblx0XHRmdW5jOiAnR2V0TG9jYWxJUCcsXG5cdFx0ZGF0YToge1xuXHRcdFx0aWZhY2U6IGlmYWNlXG5cdFx0fVxuXHR9LCBmdW5jdGlvbihwZWVySWQsIGVyciwgZGF0YSl7XG5cdFx0Y2FsbGJhY2socGVlcklkLCAoIWVyciAmJiBkYXRhICYmIGRhdGEuYWRkcmVzcykgPyBkYXRhLmFkZHJlc3MgOiBudWxsKTtcblx0fSk7XG59O1xuIiwiLyogbWF5YS1jbGllbnRcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFBhcnRuZXJpbmcgUm9ib3RpY3MsIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGxpYnJhcnkgaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yXG4gKiBtb2RpZnkgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyB2ZXJzaW9uXG4gKiAgMy4wIG9mIHRoZSBMaWNlbnNlLiBUaGlzIGxpYnJhcnkgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGVcbiAqIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuXG4gKiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSXG4gKiBQVVJQT1NFLiBTZWUgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpY1xuICogTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgbGlicmFyeS5cbiAqL1xuXG5EaWFTZWxlY3RvciA9IHJlcXVpcmUoJy4uLy4uL0RpeWFTZWxlY3RvcicpLkRpeWFTZWxlY3RvcjtcblxuZnVuY3Rpb24gcGljbyhub2RlKXtcblx0dmFyIHRoYXQgPSB0aGlzO1xuXHR0aGlzLm5vZGUgPSBub2RlO1xuXHRyZXR1cm4gdGhpcztcbn1cblxuLy9cblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS5wb3dlciA9IGZ1bmN0aW9uKCl7XG5cblx0dGhpcy5yZXF1ZXN0KHtcblx0XHRzZXJ2aWNlOiAncGljbycsXG5cdFx0ZnVuYzogJ1Bvd2VyJ1xuXHR9LCBmdW5jdGlvbihwZWVySWQsIGVyciwgZGF0YSl7XG5cdFx0LyppZihkYXRhLnBpY28pXG5cdFx0XHRjYWxsYmFjayhudWxsLGRhdGEucGljbyk7XG5cdFx0aWYoZGF0YS5lcnJvcilcblx0XHRcdGNhbGxiYWNrKGRhdGEuZXJyb3IsbnVsbCk7Ki9cblxuXHR9KTtcbn1cblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS56b29tID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuXG5cdHRoaXMucmVxdWVzdCh7XG5cdFx0c2VydmljZTogJ3BpY28nLFxuXHRcdGZ1bmM6ICdab29tJ1xuXHR9LCBmdW5jdGlvbihkYXRhKXtcblx0XHQvKmlmKGRhdGEucGljbylcblx0XHRcdGNhbGxiYWNrKG51bGwsZGF0YS5waWNvKTtcblx0XHRpZihkYXRhLmVycm9yKVxuXHRcdFx0Y2FsbGJhY2soZGF0YS5lcnJvcixudWxsKTsqL1xuXG5cdH0pO1xufVxuXG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUuYmFjayA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblxuXHR0aGlzLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICdwaWNvJyxcblx0XHRmdW5jOiAnQmFjaydcblx0fSwgZnVuY3Rpb24oZGF0YSl7XG5cdFx0LyppZihkYXRhLnBpY28pXG5cdFx0XHRjYWxsYmFjayhudWxsLGRhdGEucGljbyk7XG5cdFx0aWYoZGF0YS5lcnJvcilcblx0XHRcdGNhbGxiYWNrKGRhdGEuZXJyb3IsbnVsbCk7XG5cdFx0Ki9cblx0fSk7XG59XG5cblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS51cCA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblxuXHR0aGlzLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICdwaWNvJyxcblx0XHRmdW5jOiAnVXAnXG5cdH0sIGZ1bmN0aW9uKGRhdGEpe1xuXHQvKlx0aWYoZGF0YS5waWNvKVxuXHRcdFx0Y2FsbGJhY2sobnVsbCxkYXRhLnBpY28pO1xuXHRcdGlmKGRhdGEuZXJyb3IpXG5cdFx0XHRjYWxsYmFjayhkYXRhLmVycm9yLG51bGwpO1xuXHQqL1xuXHR9KTtcbn1cblxuXG5EaXlhU2VsZWN0b3IucHJvdG90eXBlLmxlZnQgPSBmdW5jdGlvbihjYWxsYmFjayl7XG5cblx0dGhpcy5yZXF1ZXN0KHtcblx0XHRzZXJ2aWNlOiAncGljbycsXG5cdFx0ZnVuYzogJ0xlZnQnXG5cdH0sIGZ1bmN0aW9uKGRhdGEpe1xuXHQvKlx0aWYoZGF0YS5waWNvKVxuXHRcdFx0Y2FsbGJhY2sobnVsbCxkYXRhLnBpY28pO1xuXHRcdGlmKGRhdGEuZXJyb3IpXG5cdFx0XHRjYWxsYmFjayhkYXRhLmVycm9yLG51bGwpO1xuXHQqL1xuXHR9KTtcbn1cblxuXG5EaXlhU2VsZWN0b3IucHJvdG90eXBlLm9rID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuXG5cdHRoaXMucmVxdWVzdCh7XG5cdFx0c2VydmljZTogJ3BpY28nLFxuXHRcdGZ1bmM6ICdPaydcblx0fSwgZnVuY3Rpb24oZGF0YSl7XG5cdC8qXHRpZihkYXRhLnBpY28pXG5cdFx0XHRjYWxsYmFjayhudWxsLGRhdGEucGljbyk7XG5cdFx0aWYoZGF0YS5lcnJvcilcblx0XHRcdGNhbGxiYWNrKGRhdGEuZXJyb3IsbnVsbCk7XG5cdFx0Ki9cblx0fSk7XG59XG5cblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS5yaWdodCA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblxuXHR0aGlzLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICdwaWNvJyxcblx0XHRmdW5jOiAnUmlnaHQnXG5cdH0sIGZ1bmN0aW9uKGRhdGEpe1xuXHQvKlx0aWYoZGF0YS5waWNvKVxuXHRcdFx0Y2FsbGJhY2sobnVsbCxkYXRhLnBpY28pO1xuXHRcdGlmKGRhdGEuZXJyb3IpXG5cdFx0XHRjYWxsYmFjayhkYXRhLmVycm9yLG51bGwpO1xuXHRcdCovXG5cdH0pO1xufVxuXG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUuZG93biA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblxuXHR0aGlzLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICdwaWNvJyxcblx0XHRmdW5jOiAnRG93bidcblx0fSwgZnVuY3Rpb24oZGF0YSl7XG5cdC8qXHRpZihkYXRhLnBpY28pXG5cdFx0XHRjYWxsYmFjayhudWxsLGRhdGEucGljbyk7XG5cdFx0aWYoZGF0YS5lcnJvcilcblx0XHRcdGNhbGxiYWNrKGRhdGEuZXJyb3IsbnVsbCk7XG5cdFx0Ki9cblx0fSk7XG59XG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUucHJldiA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblxuXHR0aGlzLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICdwaWNvJyxcblx0XHRmdW5jOiAnUHJldidcblx0fSwgZnVuY3Rpb24oZGF0YSl7XG5cdC8qXHRpZihkYXRhLnBpY28pXG5cdFx0XHRjYWxsYmFjayhudWxsLGRhdGEucGljbyk7XG5cdFx0aWYoZGF0YS5lcnJvcilcblx0XHRcdGNhbGxiYWNrKGRhdGEuZXJyb3IsbnVsbCk7XG5cdFx0Ki9cblx0fSk7XG59XG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblxuXHR0aGlzLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICdwaWNvJyxcblx0XHRmdW5jOiAnUGxheSdcblx0fSwgZnVuY3Rpb24oZGF0YSl7XG5cdC8qXHRpZihkYXRhLnBpY28pXG5cdFx0XHRjYWxsYmFjayhudWxsLGRhdGEucGljbyk7XG5cdFx0aWYoZGF0YS5lcnJvcilcblx0XHRcdGNhbGxiYWNrKGRhdGEuZXJyb3IsbnVsbCk7XG5cdFx0Ki9cblx0fSk7XG59XG5EaXlhU2VsZWN0b3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbihjYWxsYmFjayl7XG5cblx0dGhpcy5yZXF1ZXN0KHtcblx0XHRzZXJ2aWNlOiAncGljbycsXG5cdFx0ZnVuYzogJ05leHQnXG5cdH0sIGZ1bmN0aW9uKGRhdGEpe1xuLypcdFx0aWYoZGF0YS5waWNvKVxuXHRcdFx0Y2FsbGJhY2sobnVsbCxkYXRhLnBpY28pO1xuXHRcdGlmKGRhdGEuZXJyb3IpXG5cdFx0XHRjYWxsYmFjayhkYXRhLmVycm9yLG51bGwpO1xuXHQqL1xuXHR9KTtcbn1cblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS5sdW1pRG93biA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblxuXHR0aGlzLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICdwaWNvJyxcblx0XHRmdW5jOiAnTHVtaURvd24nXG5cdH0sIGZ1bmN0aW9uKGRhdGEpe1xuLypcdFx0aWYoZGF0YS5waWNvKVxuXHRcdFx0Y2FsbGJhY2sobnVsbCxkYXRhLnBpY28pO1xuXHRcdGlmKGRhdGEuZXJyb3IpXG5cdFx0XHRjYWxsYmFjayhkYXRhLmVycm9yLG51bGwpO1xuXHQqL1xuXHR9KTtcbn1cblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS5sdW1pVXAgPSBmdW5jdGlvbihjYWxsYmFjayl7XG5cblx0dGhpcy5yZXF1ZXN0KHtcblx0XHRzZXJ2aWNlOiAncGljbycsXG5cdFx0ZnVuYzogJ0x1bWlVcCdcblx0fSwgZnVuY3Rpb24oZGF0YSl7XG5cdC8qXHRpZihkYXRhLnBpY28pXG5cdFx0XHRjYWxsYmFjayhudWxsLGRhdGEucGljbyk7XG5cdFx0aWYoZGF0YS5lcnJvcilcblx0XHRcdGNhbGxiYWNrKGRhdGEuZXJyb3IsbnVsbCk7XG5cdFx0Ki9cblx0fSk7XG59XG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUudm9sdW1lRG93biA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblxuXHR0aGlzLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICdwaWNvJyxcblx0XHRmdW5jOiAnVm9sdW1lRG93bidcblx0fSwgZnVuY3Rpb24oZGF0YSl7XG5cdFx0LyppZihkYXRhLnBpY28pXG5cdFx0XHRjYWxsYmFjayhudWxsLGRhdGEucGljbyk7XG5cdFx0aWYoZGF0YS5lcnJvcilcblx0XHRcdGNhbGxiYWNrKGRhdGEuZXJyb3IsbnVsbCk7XG5cdCovXG5cdH0pO1xufVxuXG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUubXV0ZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblxuXHR0aGlzLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICdwaWNvJyxcblx0XHRmdW5jOiAnTXV0ZSdcblx0fSwgZnVuY3Rpb24oZGF0YSl7XG5cdC8qXHRpZihkYXRhLnBpY28pXG5cdFx0XHRjYWxsYmFjayhudWxsLGRhdGEucGljbyk7XG5cdFx0aWYoZGF0YS5lcnJvcilcblx0XHRcdGNhbGxiYWNrKGRhdGEuZXJyb3IsbnVsbCk7XG5cdFx0Ki9cblx0fSk7XG59XG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUudm9sdW1lVXAgPSBmdW5jdGlvbihjYWxsYmFjayl7XG5cblx0dGhpcy5yZXF1ZXN0KHtcblx0XHRzZXJ2aWNlOiAncGljbycsXG5cdFx0ZnVuYzogJ1ZvbHVtZVVwJ1xuXHR9LCBmdW5jdGlvbihkYXRhKXtcblx0LypcdGlmKGRhdGEucGljbylcblx0XHRcdGNhbGxiYWNrKG51bGwsZGF0YS5waWNvKTtcblx0XHRpZihkYXRhLmVycm9yKVxuXHRcdFx0Y2FsbGJhY2soZGF0YS5lcnJvcixudWxsKTtcblx0XHQqL1xuXHR9KTtcbn1cblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS5kaXNwbGF5ID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuXG5cdHRoaXMucmVxdWVzdCh7XG5cdFx0c2VydmljZTogJ3BpY28nLFxuXHRcdGZ1bmM6ICdEaXNwbGF5Jyxcblx0XHQvLyBkYXRhOiByZXFcblx0fSwgZnVuY3Rpb24oZGF0YSl7XG5cblx0fSk7XG59XG5cblxuXG52YXIgZXhwID0ge1xuXHRcdHBpY286IHBpY29cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBleHA7XG4iLCJEaXlhU2VsZWN0b3IgPSByZXF1aXJlKCcuLi8uLi9EaXlhU2VsZWN0b3InKS5EaXlhU2VsZWN0b3I7XG5FdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdub2RlLWV2ZW50LWVtaXR0ZXInKTtcbmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuXG5pZih0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyl7XG5cdHZhciBSVENQZWVyQ29ubmVjdGlvbiA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiB8fCB3aW5kb3cubW96UlRDUGVlckNvbm5lY3Rpb24gfHwgd2luZG93LndlYmtpdFJUQ1BlZXJDb25uZWN0aW9uO1xuXHR2YXIgUlRDSWNlQ2FuZGlkYXRlID0gd2luZG93LlJUQ0ljZUNhbmRpZGF0ZSB8fCB3aW5kb3cubW96UlRDSWNlQ2FuZGlkYXRlIHx8IHdpbmRvdy53ZWJraXRSVENJY2VDYW5kaWRhdGU7XG5cdHZhciBSVENTZXNzaW9uRGVzY3JpcHRpb24gPSB3aW5kb3cuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uIHx8IHdpbmRvdy5tb3pSVENTZXNzaW9uRGVzY3JpcHRpb24gfHwgd2luZG93LndlYmtpdFJUQ1Nlc3Npb25EZXNjcmlwdGlvbjtcbn1cblxuXG5mdW5jdGlvbiBDaGFubmVsKGRuSWQsIG5hbWUsIG9wZW5fY2Ipe1xuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblx0dGhpcy5uYW1lID0gbmFtZTtcblx0dGhpcy5kbklkID0gZG5JZDtcblxuXHR0aGlzLmZyZXF1ZW5jeSA9IDIwO1xuXG5cdHRoaXMuY2hhbm5lbCA9IHVuZGVmaW5lZDtcblx0dGhpcy5vbm9wZW4gPSBvcGVuX2NiO1xuXHR0aGlzLmNsb3NlZCA9IGZhbHNlO1xufVxuaW5oZXJpdHMoQ2hhbm5lbCwgRXZlbnRFbWl0dGVyKTtcblxuQ2hhbm5lbC5wcm90b3R5cGUuc2V0Q2hhbm5lbCA9IGZ1bmN0aW9uKGRhdGFjaGFubmVsKXtcblx0dmFyIHRoYXQgPSB0aGlzO1xuXHR0aGlzLmNoYW5uZWwgPSBkYXRhY2hhbm5lbDtcblx0dGhpcy5fbmVnb2NpYXRlKCk7XG5cbn07XG5cbkNoYW5uZWwucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKXtcblx0dGhpcy5jbG9zZWQgPSB0cnVlO1xufTtcblxuQ2hhbm5lbC5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihpbmRleCwgdmFsdWUpe1xuXHRpZihpbmRleCA8IDAgfHwgaW5kZXggPiB0aGlzLnNpemUgfHwgaXNOYU4odmFsdWUpKSByZXR1cm4gZmFsc2U7XG5cdHRoaXMuX2J1ZmZlcltpbmRleF0gPSB2YWx1ZTtcblx0dGhpcy5fcmVxdWVzdFNlbmQoKTtcblx0cmV0dXJuIHRydWU7XG59O1xuXG5DaGFubmVsLnByb3RvdHlwZS53cml0ZUFsbCA9IGZ1bmN0aW9uKHZhbHVlcyl7XG5cdGlmKCFBcnJheS5pc0FycmF5KHZhbHVlcykgfHwgdmFsdWVzLmxlbmd0aCAhPT0gdGhpcy5zaXplKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaTx2YWx1ZXMubGVuZ3RoOyBpKyspe1xuICAgICAgICBpZihpc05hTih2YWx1ZXNbaV0pKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHRoaXMuX2J1ZmZlcltpXSA9IHZhbHVlc1tpXTtcbiAgICB9XG4gICAgdGhpcy5fcmVxdWVzdFNlbmQoKTtcbn07XG5cbkNoYW5uZWwucHJvdG90eXBlLl9yZXF1ZXN0U2VuZCA9IGZ1bmN0aW9uKCl7XG5cdHZhciB0aGF0ID0gdGhpcztcblxuXHR2YXIgZWxhcHNlZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHRoaXMuX2xhc3RTZW5kVGltZXN0YW1wO1xuXHR2YXIgcGVyaW9kID0gMTAwMCAvIHRoaXMuZnJlcXVlbmN5O1xuXHRpZihlbGFwc2VkVGltZSA+PSBwZXJpb2Qpe1xuXHRcdGRvU2VuZCgpO1xuXHR9ZWxzZSBpZighdGhpcy5fc2VuZFJlcXVlc3RlZCl7XG5cdFx0dGhpcy5fc2VuZFJlcXVlc3RlZCA9IHRydWU7XG5cdFx0c2V0VGltZW91dChkb1NlbmQsIHBlcmlvZCAtIGVsYXBzZWRUaW1lKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGRvU2VuZCgpe1xuXHRcdHRoYXQuX3NlbmRSZXF1ZXN0ZWQgPSBmYWxzZTtcblx0XHR0aGF0Ll9sYXN0U2VuZFRpbWVzdGFtcCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdHZhciByZXQgPSB0aGF0Ll9zZW5kKHRoYXQuX2J1ZmZlcik7XG5cdFx0Ly9JZiBhdXRvc2VuZCBpcyBzZXQsIGF1dG9tYXRpY2FsbHkgc2VuZCBidWZmZXIgYXQgdGhlIGdpdmVuIGZyZXF1ZW5jeVxuXHRcdGlmKHJldCAmJiB0aGF0LmF1dG9zZW5kKSB0aGF0Ll9yZXF1ZXN0U2VuZCgpO1xuXHR9XG59O1xuXG5DaGFubmVsLnByb3RvdHlwZS5fc2VuZCA9IGZ1bmN0aW9uKG1zZyl7XG5cdGlmKHRoaXMuY2xvc2VkKSByZXR1cm4gZmFsc2U7XG5cdGVsc2UgaWYodGhpcy5jaGFubmVsLnJlYWR5U3RhdGUgPT09ICdvcGVuJyl7XG5cdFx0dHJ5e1xuXHRcdFx0dGhpcy5jaGFubmVsLnNlbmQobXNnKTtcblx0XHR9Y2F0Y2goZSl7XG5cdFx0XHRjb25zb2xlLmxvZygnW3J0Yy5jaGFubmVsLndyaXRlXSBleGNlcHRpb24gb2NjdXJlZCB3aGlsZSBzZW5kaW5nIGRhdGEnKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblx0ZWxzZXtcblx0XHRjb25zb2xlLmxvZygnW3J0Yy5jaGFubmVsLndyaXRlXSB3YXJuaW5nIDogd2VicnRjIGRhdGFjaGFubmVsIHN0YXRlID0gJyt0aGlzLmNoYW5uZWwucmVhZHlTdGF0ZSk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59O1xuXG5DaGFubmVsLnByb3RvdHlwZS5fbmVnb2NpYXRlID0gZnVuY3Rpb24oKXtcblx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdHRoaXMuY2hhbm5lbC5vbm1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKXtcblx0XHR2YXIgdmlldyA9IG5ldyBEYXRhVmlldyhtZXNzYWdlLmRhdGEpO1xuXG5cdFx0dmFyIHR5cGVDaGFyID0gU3RyaW5nLmZyb21DaGFyQ29kZSh2aWV3LmdldFVpbnQ4KDApKTtcblx0XHRpZih0eXBlQ2hhciA9PT0gJ08nKXtcblx0XHRcdC8vSW5wdXRcblx0XHRcdHRoYXQudHlwZSA9ICdpbnB1dCc7IC8vUHJvbWV0aGUgT3V0cHV0ID0gQ2xpZW50IElucHV0XG5cdFx0fWVsc2UgaWYodHlwZUNoYXIgPT09ICdJJyl7XG5cdFx0XHQvL091dHB1dFxuXHRcdFx0dGhhdC50eXBlID0gJ291dHB1dCc7IC8vUHJvbWV0aGUgSW5wdXQgPSBDbGllbnQgT3V0cHV0XG5cdFx0fWVsc2V7XG5cdFx0XHQvL0Vycm9yXG5cdFx0fVxuXG5cdFx0dmFyIHNpemUgPSB2aWV3LmdldEludDMyKDEsdHJ1ZSk7XG5cdFx0aWYoc2l6ZSAhPSB1bmRlZmluZWQpe1xuXHRcdFx0dGhhdC5zaXplID0gc2l6ZTtcblx0XHRcdHRoYXQuX2J1ZmZlciA9IG5ldyBGbG9hdDMyQXJyYXkoc2l6ZSk7XG5cdFx0fWVsc2V7XG5cdFx0XHQvL2Vycm9yXG5cdFx0fVxuXG5cdFx0dGhhdC5jaGFubmVsLm9ubWVzc2FnZSA9IHRoYXQuX29uTWVzc2FnZS5iaW5kKHRoYXQpO1xuXG5cdFx0dGhhdC5jaGFubmVsLm9uY2xvc2UgPSB0aGF0Ll9vbkNsb3NlLmJpbmQodGhhdCk7XG5cblx0XHRpZih0eXBlb2YgdGhhdC5vbm9wZW4gPT09ICdmdW5jdGlvbicpIHRoYXQub25vcGVuKHRoYXQuZG5JZCwgdGhhdCk7XG5cblx0XHRjb25zb2xlLmxvZygnY2hhbm5lbCAnK3RoYXQubmFtZSsnIG5lZ29jaWF0ZWQgIScpXG5cdH1cbn07XG5cbkNoYW5uZWwucHJvdG90eXBlLl9vbk1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKXtcblx0dmFyIHZhbEFycmF5ID0gbmV3IEZsb2F0MzJBcnJheShtZXNzYWdlLmRhdGEpO1xuXHR0aGlzLmVtaXQoJ3ZhbHVlJywgdmFsQXJyYXkpO1xufTtcblxuQ2hhbm5lbC5wcm90b3R5cGUuX29uQ2xvc2UgPSBmdW5jdGlvbigpe1xuXHRjb25zb2xlLmxvZygnY2hhbm5lbCAnK3RoaXMubmFtZSsnIGNsb3NlZCAhJyk7XG5cdHRoaXMuZW1pdCgnY2xvc2UnKTtcbn07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8gUlRDIFBlZXIgaW1wbGVtZW50YXRpb24gLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbmZ1bmN0aW9uIFBlZXIoZG5JZCwgcnRjLCBpZCwgY2hhbm5lbHMpe1xuXHR0aGlzLmRuID0gZDEoZG5JZCk7XG5cdHRoaXMuZG5JZCA9IGRuSWQ7XG5cdHRoaXMuaWQgPSBpZDtcblx0dGhpcy5jaGFubmVscyA9IGNoYW5uZWxzO1xuXHR0aGlzLnJ0YyA9IHJ0Yztcblx0dGhpcy5wZWVyID0gbnVsbDtcblxuXHR0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuXHR0aGlzLmNsb3NlZCA9IGZhbHNlO1xuXG5cdHRoaXMuX2Nvbm5lY3QoKTtcbn1cblxuUGVlci5wcm90b3R5cGUuX2Nvbm5lY3QgPSBmdW5jdGlvbigpe1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0dGhpcy5zdWJJZHMgPSBbXTtcblxuXHR0aGlzLmRuLnN1YnNjcmliZSh7XG5cdFx0c2VydmljZTogJ3J0YycsXG5cdFx0ZnVuYzogJ0Nvbm5lY3QnLFxuXHRcdG9iajogdGhpcy5jaGFubmVscyxcblx0XHRkYXRhOiB7XG5cdFx0XHRwcm9tSUQ6IHRoaXMuaWRcblx0XHR9XG5cdH0sXG5cdGZ1bmN0aW9uKGRpeWEsIGVyciwgZGF0YSl7XG5cdFx0aWYoZGF0YSkgdGhhdC5faGFuZGxlTmVnb2NpYXRpb25NZXNzYWdlKGRhdGEpO1xuXHR9LCB0aGlzLnN1Yklkcyk7XG5cblx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdGlmKCF0aGF0LmNvbm5lY3RlZCAmJiAhdGhhdC5jbG9zZWQpe1xuXHRcdFx0dGhhdC5fcmVjb25uZWN0KCk7XG5cdFx0fVxuXHR9LCAxMDAwMCk7XG59O1xuXG5QZWVyLnByb3RvdHlwZS5fcmVjb25uZWN0ID0gZnVuY3Rpb24oKXtcblx0dGhpcy5jbG9zZSgpO1xuXG5cdHRoaXMucGVlciA9IG51bGw7XG5cdHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG5cdHRoaXMuY2xvc2VkID0gZmFsc2U7XG5cblx0dGhpcy5fY29ubmVjdCgpO1xufTtcblxuXG5QZWVyLnByb3RvdHlwZS5faGFuZGxlTmVnb2NpYXRpb25NZXNzYWdlID0gZnVuY3Rpb24obXNnKXtcblx0aWYobXNnLmV2ZW50VHlwZSA9PT0gJ1JlbW90ZU9mZmVyJyl7XG5cdFx0dGhpcy5fY3JlYXRlUGVlcihtc2cpO1xuXHR9ZWxzZSBpZihtc2cuZXZlbnRUeXBlID09PSAnUmVtb3RlSUNFQ2FuZGlkYXRlJyl7XG5cdFx0dGhpcy5fYWRkUmVtb3RlSUNFQ2FuZGlkYXRlKG1zZyk7XG5cdH1cbn07XG5cbnZhciBzZXJ2ZXJzID0ge1wiaWNlU2VydmVyc1wiOiBbe1widXJsXCI6IFwic3R1bjpzdHVuLmwuZ29vZ2xlLmNvbToxOTMwMlwifV19O1xuXG5QZWVyLnByb3RvdHlwZS5fY3JlYXRlUGVlciA9IGZ1bmN0aW9uKGRhdGEpe1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0dmFyIHBlZXIgPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24oc2VydmVycywgIHttYW5kYXRvcnk6IFt7RHRsc1NydHBLZXlBZ3JlZW1lbnQ6IHRydWV9LCB7RW5hYmxlRHRsc1NydHA6IHRydWV9XX0pO1xuXHR0aGlzLnBlZXIgPSBwZWVyO1xuXG5cdHBlZXIuc2V0UmVtb3RlRGVzY3JpcHRpb24obmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbih7c2RwOiBkYXRhLnNkcCwgdHlwZTogZGF0YS50eXBlfSkpO1xuXG5cdHBlZXIuY3JlYXRlQW5zd2VyKGZ1bmN0aW9uKHNlc3Npb25fZGVzY3JpcHRpb24pe1xuXHRcdHBlZXIuc2V0TG9jYWxEZXNjcmlwdGlvbihzZXNzaW9uX2Rlc2NyaXB0aW9uKTtcblxuXHRcdHRoYXQuZG4ucmVxdWVzdCh7XG5cdFx0XHRzZXJ2aWNlOiAncnRjJyxcblx0XHRcdGZ1bmM6ICdBbnN3ZXInLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRwcm9tSUQ6IGRhdGEucHJvbUlELFxuXHRcdFx0XHRwZWVySWQ6IGRhdGEucGVlcklkLFxuXHRcdFx0XHRzZHA6IHNlc3Npb25fZGVzY3JpcHRpb24uc2RwLFxuXHRcdFx0XHR0eXBlOiBzZXNzaW9uX2Rlc2NyaXB0aW9uLnR5cGVcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0ZnVuY3Rpb24oZXJyKXtcblx0XHRjb25zb2xlLmxvZyhcIlJUQzogY2Fubm90IGNyZWF0ZSBhbnN3ZXIgOlwiKTtcblx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHR9LFxuXHR7J21hbmRhdG9yeSc6IHsgJ09mZmVyVG9SZWNlaXZlQXVkaW8nOiB0cnVlLCAnT2ZmZXJUb1JlY2VpdmVWaWRlbyc6IHRydWV9fSk7XG5cblx0cGVlci5vbmljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCl7XG5cdFx0Y29uc29sZS5sb2coJ1JUQzogc3RhdGUgY2hhbmdlKCcrdGhhdC5pZCsnOicrdGhhdC5kbklkKycpIDogJytwZWVyLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG5cdFx0aWYocGVlci5pY2VDb25uZWN0aW9uU3RhdGUgPT09ICdjb25uZWN0ZWQnKXtcblx0XHRcdHRoYXQuY29ubmVjdGVkID0gdHJ1ZTtcblx0XHRcdHRoYXQuZG4udW5zdWJzY3JpYmUodGhhdC5zdWJJZHMpO1xuXHRcdH1cblx0XHRlbHNlIGlmKHBlZXIuaWNlQ29ubmVjdGlvblN0YXRlID09PSAnZGlzY29ubmVjdGVkJyl7XG5cdFx0XHRpZighdGhhdC5jbG9zZWQpIHRoYXQuX3JlY29ubmVjdCgpO1xuXHRcdH1cblx0fTtcblxuXHRwZWVyLm9uaWNlY2FuZGlkYXRlID0gZnVuY3Rpb24oZXZ0KXtcblx0XHR0aGF0LmRuLnJlcXVlc3Qoe1xuXHRcdFx0c2VydmljZTogJ3J0YycsXG5cdFx0XHRmdW5jOiAnSUNFQ2FuZGlkYXRlJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0cGVlcklkOiBkYXRhLnBlZXJJZCxcblx0XHRcdFx0cHJvbUlEOiB0aGF0LmlkLFxuXHRcdFx0XHRjYW5kaWRhdGU6IGV2dC5jYW5kaWRhdGVcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxuXHRwZWVyLm9uZGF0YWNoYW5uZWwgPSBmdW5jdGlvbihldnQpe1xuXHRcdHRoYXQuY29ubmVjdGVkID0gdHJ1ZTtcblx0XHR0aGF0LnJ0Yy5fb25EYXRhQ2hhbm5lbCh0aGF0LmRuSWQsIGV2dC5jaGFubmVsKTtcblx0fTtcbn07XG5cblxuUGVlci5wcm90b3R5cGUuX2FkZFJlbW90ZUlDRUNhbmRpZGF0ZSA9IGZ1bmN0aW9uKGRhdGEpe1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cdHRyeXtcblx0XHR2YXIgY2FuZGlkYXRlID0gbmV3IFJUQ0ljZUNhbmRpZGF0ZShkYXRhLmNhbmRpZGF0ZSk7XG5cdFx0dGhpcy5wZWVyLmFkZEljZUNhbmRpZGF0ZShjYW5kaWRhdGUsIGZ1bmN0aW9uKCl7XG5cdFx0XHRjb25zb2xlLmxvZyhcIlJUQzogY2FuZGlkYXRlIGFkZGVkKFwiK3RoYXQuaWQrXCI6XCIrdGhhdC5kbklkK1wiKSA6IFwiK3RoYXQucGVlci5pY2VDb25uZWN0aW9uU3RhdGUpO1xuXHRcdH0sZnVuY3Rpb24oZXJyKXtcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJSVEM6IGNhbm5vdCBhZGQgUmVtb3RlSUNFQ2FuZGlkYXRlIDpcIik7XG5cdFx0XHRjb25zb2xlLmVycm9yKGVycik7XG5cdFx0fSk7XG5cdH1jYXRjaChlcnIpe1xuXHRcdGNvbnNvbGUuZXJyb3IoXCJSVEM6IGNhbm5vdCBhZGQgUmVtb3RlSUNFQ2FuZGlkYXRlIDogXCIpO1xuXHRcdGNvbnNvbGUuZXJyb3IoZXJyKTtcblx0fVxufTtcblxuUGVlci5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpe1xuXHR0aGlzLmRuLnVuc3Vic2NyaWJlKHRoaXMuc3ViSWRzKTtcblx0aWYodGhpcy5wZWVyKXtcblx0XHR0cnl7XG5cdFx0XHR0aGlzLnBlZXIuY2xvc2UoKTtcblx0XHR9Y2F0Y2goZSl7fVxuXHRcdHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG5cdFx0dGhpcy5jbG9zZWQgPSB0cnVlO1xuXHR9XG59O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIFJUQyBzZXJ2aWNlIGltcGxlbWVudGF0aW9uIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5cbmZ1bmN0aW9uIFJUQyhzZWxlY3Rvcil7XG5cdHZhciB0aGF0ID0gdGhpcztcblx0dGhpcy5zZWxlY3RvciA9IHNlbGVjdG9yO1xuXG5cdHRoaXMucmVxdWVzdGVkQ2hhbm5lbHMgPSBbXTtcbn1cblxuXG5SVEMucHJvdG90eXBlLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpe1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0dGhpcy5zZWxlY3Rvci5lYWNoKGZ1bmN0aW9uKGRuSWQpe1xuXHRcdGZvcih2YXIgcHJvbUlEIGluIHRoYXRbZG5JZF0ucGVlcnMpe1xuXHRcdFx0dGhhdC5fY2xvc2VQZWVyKGRuSWQsIHByb21JRCk7XG5cdFx0fVxuXHR9KTtcblxuXHR0aGlzLnNlbGVjdG9yLnVuc3Vic2NyaWJlKHRoaXMuc3ViSWRzKTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG5SVEMucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uKG5hbWVfcmVnZXgsIG9ub3Blbl9jYWxsYmFjayl7XG5cdHRoaXMucmVxdWVzdGVkQ2hhbm5lbHMucHVzaCh7cmVnZXg6IG5hbWVfcmVnZXgsIGNiOiBvbm9wZW5fY2FsbGJhY2t9KTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG5SVEMucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbigpe1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0dGhpcy5zdWJJZHMgPSBbXTtcblxuXHR0aGlzLnNlbGVjdG9yLnN1YnNjcmliZSh7XG5cdFx0c2VydmljZTogJ3J0YycsXG5cdFx0ZnVuYzogJ0xpc3RlblBlZXJzJ1xuXHR9LCBmdW5jdGlvbihkbklkLCBlcnIsIGRhdGEpe1xuXG5cdFx0aWYoIXRoYXRbZG5JZF0pIHRoYXQuX2NyZWF0ZURpeWFOb2RlKGRuSWQpO1xuXG5cdFx0aWYoZXJyID09PSAnU3Vic2NyaXB0aW9uQ2xvc2VkJyB8fCBlcnIgPT09ICdQZWVyRGlzY29ubmVjdGVkJyl7XG5cdFx0XHR0aGF0Ll9jbG9zZURpeWFOb2RlKGRuSWQpO1xuXHRcdFx0cmV0dXJuIDtcblx0XHR9XG5cblx0XHRpZihkYXRhICYmIGRhdGEuZXZlbnRUeXBlICYmIGRhdGEucHJvbUlEICE9PSB1bmRlZmluZWQpe1xuXG5cdFx0XHRpZihkYXRhLmV2ZW50VHlwZSA9PT0gJ1BlZXJDb25uZWN0ZWQnKXtcblx0XHRcdFx0aWYoIXRoYXRbZG5JZF0ucGVlcnNbZGF0YS5wcm9tSURdKXtcblx0XHRcdFx0XHR2YXIgY2hhbm5lbHMgPSB0aGF0Ll9tYXRjaENoYW5uZWxzKGRuSWQsIGRhdGEuY2hhbm5lbHMpO1xuXHRcdFx0XHRcdGlmKGNoYW5uZWxzLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRcdFx0dGhhdFtkbklkXS5wZWVyc1tkYXRhLnByb21JRF0gPSBuZXcgUGVlcihkbklkLCB0aGF0LCBkYXRhLnByb21JRCwgY2hhbm5lbHMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZihkYXRhLmV2ZW50VHlwZSA9PT0gJ1BlZXJDbG9zZWQnKXtcblx0XHRcdFx0aWYodGhhdFtkbklkXS5wZWVyc1tkYXRhLnByb21JRF0pe1xuXHRcdFx0XHRcdHRoYXQuX2Nsb3NlUGVlcihkbklkLCBkYXRhLnByb21JRCk7XG5cdFx0XHRcdFx0aWYodHlwZW9mIHRoYXQub25jbG9zZSA9PT0gJ2Z1bmN0aW9uJykgdGhhdC5vbmNsb3NlKGRuSWQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9XG5cblx0fSwge3N1YklkczogdGhpcy5zdWJJZHMsIGF1dG86IHRydWV9KTtcblxuXHRyZXR1cm4gdGhpcztcbn07XG5cblJUQy5wcm90b3R5cGUuX2NyZWF0ZURpeWFOb2RlID0gZnVuY3Rpb24oZG5JZCl7XG5cdHZhciB0aGF0ID0gdGhpcztcblxuXHR0aGlzW2RuSWRdID0ge1xuXHRcdGRuSWQ6IGRuSWQsXG5cdFx0dXNlZENoYW5uZWxzOiBbXSxcblx0XHRyZXF1ZXN0ZWRDaGFubmVsczogW10sXG5cdFx0cGVlcnM6IFtdXG5cdH1cblxuXHR0aGlzLnJlcXVlc3RlZENoYW5uZWxzLmZvckVhY2goZnVuY3Rpb24oYyl7dGhhdFtkbklkXS5yZXF1ZXN0ZWRDaGFubmVscy5wdXNoKGMpfSk7XG59O1xuXG5SVEMucHJvdG90eXBlLl9jbG9zZURpeWFOb2RlID0gZnVuY3Rpb24oZG5JZCl7XG5cdGZvcih2YXIgcHJvbUlEIGluIHRoaXNbZG5JZF0ucGVlcnMpe1xuXHRcdHRoaXMuX2Nsb3NlUGVlcihkbklkLCBwcm9tSUQpO1xuXHR9XG5cblx0ZGVsZXRlIHRoaXNbZG5JZF07XG59O1xuXG5SVEMucHJvdG90eXBlLl9jbG9zZVBlZXIgPSBmdW5jdGlvbihkbklkLCBwcm9tSUQpe1xuXHRpZih0aGlzW2RuSWRdLnBlZXJzW3Byb21JRF0pe1xuXHRcdHZhciBwID0gdGhpc1tkbklkXS5wZWVyc1twcm9tSURdO1xuXHRcdHAuY2xvc2UoKTtcblxuXHRcdGZvcih2YXIgaT0wO2k8cC5jaGFubmVscy5sZW5ndGg7IGkrKyl7XG5cdFx0XHRkZWxldGUgdGhpc1tkbklkXS51c2VkQ2hhbm5lbHNbcC5jaGFubmVsc1tpXV07XG5cdFx0fVxuXG5cdFx0ZGVsZXRlIHRoaXNbZG5JZF0ucGVlcnNbcHJvbUlEXTtcblx0fVxufTtcblxuUlRDLnByb3RvdHlwZS5fbWF0Y2hDaGFubmVscyA9IGZ1bmN0aW9uKGRuSWQsIHJlY2VpdmVkQ2hhbm5lbHMpe1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0dmFyIGNoYW5uZWxzID0gW107XG5cblx0Zm9yKHZhciBpID0gMDsgaSA8IHJlY2VpdmVkQ2hhbm5lbHMubGVuZ3RoOyBpKyspe1xuXHRcdHZhciBuYW1lID0gcmVjZWl2ZWRDaGFubmVsc1tpXTtcblxuXHRcdGZvcih2YXIgaiA9IDA7IGogPCB0aGF0W2RuSWRdLnJlcXVlc3RlZENoYW5uZWxzLmxlbmd0aDsgaisrKXtcblx0XHRcdHZhciByZXEgPSB0aGF0W2RuSWRdLnJlcXVlc3RlZENoYW5uZWxzW2pdO1xuXG5cdFx0XHRpZihuYW1lICYmIG5hbWUubWF0Y2gocmVxLnJlZ2V4KSAmJiAhdGhhdFtkbklkXS51c2VkQ2hhbm5lbHNbbmFtZV0pe1xuXHRcdFx0XHR0aGF0W2RuSWRdLnVzZWRDaGFubmVsc1tuYW1lXSA9IG5ldyBDaGFubmVsKGRuSWQsIG5hbWUsIHJlcS5jYik7XG5cdFx0XHRcdGNoYW5uZWxzLnB1c2gobmFtZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuICBjaGFubmVscztcbn07XG5cblxuUlRDLnByb3RvdHlwZS5fb25EYXRhQ2hhbm5lbCA9IGZ1bmN0aW9uKGRuSWQsIGRhdGFjaGFubmVsKXtcblx0dmFyIGNoYW5uZWwgPSB0aGlzW2RuSWRdLnVzZWRDaGFubmVsc1tkYXRhY2hhbm5lbC5sYWJlbF07XG5cblx0aWYoIWNoYW5uZWwpe1xuXHRcdGNvbnNvbGUubG9nKFwiQ2hhbm5lbCBcIitkYXRhY2hhbm5lbC5sYWJlbCtcIiB1bm1hdGNoZWQsIGNsb3NpbmcgIVwiKTtcblx0XHRkYXRhY2hhbm5lbC5jbG9zZSgpO1xuXHRcdHJldHVybiA7XG5cdH1cblx0Y29uc29sZS5sb2coXCJDaGFubmVsIFwiK2RhdGFjaGFubmVsLmxhYmVsK1wiIGNyZWF0ZWQgIVwiKTtcblxuXHRjaGFubmVsLnNldENoYW5uZWwoZGF0YWNoYW5uZWwpO1xufTtcblxuXG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUucnRjID0gZnVuY3Rpb24oZG9tTm9kZSwgc2VsZWN0ZWROb2Rlcyl7XG5cdHZhciBydGMgPSBuZXcgUlRDKHRoaXMpO1xuXG5cdGlmKGRvbU5vZGUpe1xuXHRcdGNyZWF0ZU5ldXJvbnNGcm9tRE9NKGRvbU5vZGUsIHNlbGVjdGVkTm9kZXMsIHJ0Yyk7XG5cdH1cblxuXHRyZXR1cm4gcnRjO1xufTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5mdW5jdGlvbiBjcmVhdGVOZXVyb25zRnJvbURPTShkb21Ob2RlLCBzZWxlY3RlZE5vZGVzLCBydGMpe1xuXHRpZighZG9tTm9kZSB8fCAhZG9tTm9kZS5xdWVyeVNlbGVjdG9yQWxsKSByZXR1cm4gO1xuXG5cblx0Ly9SZXRyaWV2ZSBhbGwgdGFncyB3aGljaCBuYW1lIHN0YXJ0cyB3aXRoIFwibmV1cm9uLVwiXG5cdHZhciBuZXVyb25Ob2RlTGlzdCA9IGRvbU5vZGUucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuXHR2YXIgbmV1cm9uTm9kZXMgPSBbXTtcblx0Zm9yKHZhciBpPTA7aTxuZXVyb25Ob2RlTGlzdC5sZW5ndGg7IGkrKyl7XG5cdFx0aWYoaXNOZXVyb25UYWcobmV1cm9uTm9kZUxpc3RbaV0pKXtcblx0XHRcdG5ldXJvbk5vZGVzLnB1c2gobmV1cm9uTm9kZUxpc3RbaV0pO1xuXHRcdFx0aWYoQXJyYXkuaXNBcnJheShzZWxlY3RlZE5vZGVzKSkgc2VsZWN0ZWROb2Rlcy5wdXNoKG5ldXJvbk5vZGVMaXN0W2ldKTtcblx0XHR9XG5cdH1cblxuXHQvL2ZvciBlYWNoIHRhZyB0aGF0IGhhcyBhIG5hbWUgYXR0cmlidXRlLCBjcmVhdGUgYSBuZXVyb24gYXNzb2NpYXRlZCB3aXRoIGl0XG5cdG5ldXJvbk5vZGVzLmZvckVhY2goZnVuY3Rpb24obmV1cm9uTm9kZSl7XG5cblx0XHR2YXIgY2hhbm5lbCA9IGdldENoYW5uZWwobmV1cm9uTm9kZS5hdHRyaWJ1dGVzW1wibmFtZVwiXS52YWx1ZSk7XG5cblx0XHRydGMudXNlKGNoYW5uZWwsIGZ1bmN0aW9uKGRuSWQsIG5ldXJvbil7XG5cdFx0XHRuZXVyb25Ob2RlLnNldE5ldXJvbihkbklkLCBuZXVyb24pO1xuXHRcdH0pO1xuXG5cdH0pO1xuXG59XG5cblxuZnVuY3Rpb24gaXNOZXVyb25UYWcobm9kZSl7XG5cdHJldHVybiBub2RlLnRhZ05hbWUuc3RhcnRzV2l0aChcIk5FVVJPTi1cIikgJiZcblx0XHRub2RlLmF0dHJpYnV0ZXNbXCJuYW1lXCJdICYmXG5cdFx0KHR5cGVvZiBub2RlLnNldE5ldXJvbiA9PT0gJ2Z1bmN0aW9uJyk7XG59XG5cbmZ1bmN0aW9uIGdldENoYW5uZWwobmFtZSl7XG5cdHJldHVybiBuYW1lLnJlcGxhY2UoL1xccysvLCBcIlwiKTtcbn1cbiIsIkRpeWFTZWxlY3RvciA9IHJlcXVpcmUoJy4uLy4uL0RpeWFTZWxlY3RvcicpLkRpeWFTZWxlY3RvcjtcblxuRGl5YVNlbGVjdG9yLnByb3RvdHlwZS50aW1lID0gZnVuY3Rpb24obG9vcCwgY2FsbGJhY2spe1xuXHRpZihsb29wKXtcblx0XHR0aGlzLnN1YnNjcmliZSh7XG5cdFx0XHRzZXJ2aWNlOiAndGltZXInLFxuXHRcdFx0ZnVuYzogJ1N1YnNjcmliZVRpbWVyJyxcblx0XHR9LCBjYWxsYmFjaywge2F1dG86IHRydWV9KTtcblx0fWVsc2V7XG5cdFx0dGhpcy5yZXF1ZXN0KHtcblx0XHRcdHNlcnZpY2U6ICd0aW1lcicsXG5cdFx0XHRmdW5jOiAnR2V0VGltZScsXG5cdFx0fSwgY2FsbGJhY2spO1xuXHR9XG5cdHJldHVybiB0aGlzO1xufTtcbiIsIi8qIG1heWEtY2xpZW50XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBQYXJ0bmVyaW5nIFJvYm90aWNzLCBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBsaWJyYXJ5IGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vclxuICogbW9kaWZ5IGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpY1xuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgdmVyc2lvblxuICogIDMuMCBvZiB0aGUgTGljZW5zZS4gVGhpcyBsaWJyYXJ5IGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlXG4gKiB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlblxuICogdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUlxuICogUFVSUE9TRS4gU2VlIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWNcbiAqIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIGxpYnJhcnkuXG4gKi9cblxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbiBcbkRpeWFTZWxlY3RvciA9IHJlcXVpcmUoJy4uLy4uL0RpeWFTZWxlY3RvcicpLkRpeWFTZWxlY3RvcjtcbnZhciBNZXNzYWdlID0gcmVxdWlyZSgnLi4vbWVzc2FnZScpO1xuXG5EaXlhU2VsZWN0b3IucHJvdG90eXBlLnN0YXR1c1VwZGF0ZSA9IGZ1bmN0aW9uKFN1YklELGNhbGxiYWNrKXtcblx0XG5cdFxuXHR0aGlzLnN1YnNjcmliZSh7XG5cdFx0XHRzZXJ2aWNlOiAndXBkYXRlJyxcblx0XHRcdGZ1bmM6ICdTdWJzY3JpYmVVcGRhdGVTdGF0dXMnXG5cdFx0fSwgXG5cdFx0ZnVuY3Rpb24ocGVlcklkLCBlcnJvciwgcmVzKXtcblx0XHRcdGNhbGxiYWNrKHBlZXJJZCxlcnJvcixyZXMpO1xuXHRcdFx0Y29uc29sZS5sb2cocmVzLmxvY2tTdGF0dXMpO1xuXHRcdH0se2F1dG86dHJ1ZSwgc3ViSWRzOlN1YklEfSk7XG5cbn07XG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUubGlzdFBhY2thZ2VzID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuXG5cdHRoaXMucmVxdWVzdCh7XG5cdFx0c2VydmljZTogJ3VwZGF0ZScsXG5cdFx0ZnVuYzogJ0xpc3RQYWNrYWdlcydcblx0fSwgZnVuY3Rpb24ocGVlcklkLCBlcnJvciwgZGF0YSl7XG5cdFx0aWYoZGF0YS5wYWNrYWdlcykgXG5cdFx0XHRjYWxsYmFjayhudWxsLGRhdGEucGFja2FnZXMpOyBcblx0XHRpZihlcnJvcilcblx0XHRcdGNhbGxiYWNrKGVycm9yLG51bGwpO1xuXHRcdFxuXHR9KTsgXG59O1xuXHRcbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUudXBncmFkZUFsbCA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblxuXHR0aGlzLnJlcXVlc3Qoe1xuXHRcdHNlcnZpY2U6ICd1cGRhdGUnLFxuXHRcdGZ1bmM6ICdVcGdyYWRlQWxsJ1xuXHR9LCBmdW5jdGlvbihwZWVySWQsIGVycm9yLCBkYXRhKXtcblx0XHRpZihkYXRhKVxuXHRcdFx0aWYoZGF0YS5wYWNrYWdlcykgXG5cdFx0XHRcdGNhbGxiYWNrKG51bGwsZGF0YS5wYWNrYWdlcyk7IFxuXHRcdGlmKGVycm9yKVxuXHRcdFx0Y2FsbGJhY2soZXJyb3IsbnVsbCk7XG5cdH0pOyBcbn07XG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUudXBkYXRlQWxsID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuXG5cdHRoaXMucmVxdWVzdCh7XG5cdFx0c2VydmljZTogJ3VwZGF0ZScsXG5cdFx0ZnVuYzogJ1VwZGF0ZUFsbCdcblx0fSwgZnVuY3Rpb24ocGVlcklkLCBlcnJvciwgZGF0YSl7XG5cdFx0aWYoZGF0YSlcblx0XHRcdGlmKGRhdGEucGFja2FnZXMpIFxuXHRcdFx0XHRjYWxsYmFjayhudWxsLGRhdGEpOyBcblx0XHRpZihlcnJvcilcblx0XHRcdGNhbGxiYWNrKGVycm9yLG51bGwpO1xuXHR9KTsgXG59O1xuXHRcbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUuaW5zdGFsbFBhY2thZ2UgPSBmdW5jdGlvbihwa2csIGNhbGxiYWNrKXtcblx0XHRcblx0aWYgKChwa2cgPT09ICdVbmRlZmluZWQnKSB8fCAodHlwZW9mIHBrZyAhPT0gJ3N0cmluZycpIHx8IChwa2cubGVuZ3RoIDwgMikpe1xuXHRcdGNhbGxiYWNrKCd1bmRlZmluZWRQYWNrYWdlJyxudWxsKTtcblx0fVxuXHRlbHNlIHtcblx0XG5cdFx0dmFyIElOVkFMSURfUEFSQU1FVEVSU19SRUdFWCA9IC9eLXxbXlxcc11cXHMrW15cXHNdfC0kLztcblx0XHR2YXIgdGVzdE5hbWVQa2c9IElOVkFMSURfUEFSQU1FVEVSU19SRUdFWC50ZXN0KHBrZyk7XG5cdFx0aWYgKHRlc3ROYW1lUGtnKVxuXHRcdFx0Y2FsbGJhY2soXCJJbnZhbGlkUGFyYW1ldGVyc1wiLG51bGwpO1xuXHRcdGVsc2V7XG5cdFx0XHRcdFxuXHRcdFx0dGhpcy5yZXF1ZXN0KHtcblx0XHRcdFx0c2VydmljZTogJ3VwZGF0ZScsXG5cdFx0XHRcdGZ1bmM6ICdJbnN0YWxsUGFja2FnZScsXG5cdFx0XHRcdGRhdGE6e1xuXHRcdFx0XHRcdHBhY2thZ2U6IHBrZyxcblx0XHRcdFx0fVxuXHRcdFx0fSwgZnVuY3Rpb24ocGVlcklkLCBlcnJvciwgZGF0YSl7XG5cdFx0XHRcdGlmKGRhdGEpXG5cdFx0XHRcdFx0aWYoZGF0YS5wYWNrYWdlcykgXG5cdFx0XHRcdFx0XHRjYWxsYmFjayhudWxsLGRhdGEucGFja2FnZXMpOyBcblx0XHRcdFx0aWYoZXJyb3IpXG5cdFx0XHRcdFx0Y2FsbGJhY2soZXJyb3IsbnVsbCk7XG5cdFx0XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblx0XG59O1xuXG5EaXlhU2VsZWN0b3IucHJvdG90eXBlLnJlbW92ZVBhY2thZ2UgPSBmdW5jdGlvbihwa2csIGNhbGxiYWNrKXtcblx0XHRcblx0aWYgKChwa2cgPT09ICdVbmRlZmluZWQnKSB8fCAodHlwZW9mIHBrZyAhPT0gJ3N0cmluZycpIHx8IChwa2cubGVuZ3RoIDwgMikpe1xuXHRcdGNhbGxiYWNrKCd1bmRlZmluZWRQYWNrYWdlJyxudWxsKTtcblx0fVxuXHRlbHNlIHtcblx0XG5cdFx0dmFyIElOVkFMSURfUEFSQU1FVEVSU19SRUdFWCA9IC9eWysgLV18W15cXHNdXFxzK1teXFxzXXxbKyAtXSQvO1xuXHRcdHZhciB0ZXN0TmFtZVBrZz0gSU5WQUxJRF9QQVJBTUVURVJTX1JFR0VYLnRlc3QocGtnKTtcblx0XHRpZiAodGVzdE5hbWVQa2cpXG5cdFx0XHRjYWxsYmFjayhcIkludmFsaWRQYXJhbWV0ZXJzXCIsbnVsbCk7XG5cdFx0ZWxzZXtcblx0XHRcdFx0XG5cdFx0XHR0aGlzLnJlcXVlc3Qoe1xuXHRcdFx0XHRzZXJ2aWNlOiAndXBkYXRlJyxcblx0XHRcdFx0ZnVuYzogJ1JlbW92ZVBhY2thZ2UnLFxuXHRcdFx0XHRkYXRhOntcblx0XHRcdFx0XHRwYWNrYWdlOiBwa2csXG5cdFx0XHRcdH1cblx0XHRcdH0sIGZ1bmN0aW9uKHBlZXJJZCwgZXJyb3IsIGRhdGEpe1xuXHRcdFx0XHRpZiAoZGF0YSlcblx0XHRcdFx0XHRpZihkYXRhLnBhY2thZ2VzKSBcblx0XHRcdFx0XHRcdGNhbGxiYWNrKG51bGwsZGF0YS5wYWNrYWdlcyk7IFxuXHRcdFx0XHRpZihlcnJvcilcblx0XHRcdFx0XHRjYWxsYmFjayhlcnJvcixudWxsKTtcdFxuXHRcdFx0XHRcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXHRcbn07XG5cdFx0XG4iLCIvKiBtYXlhLWNsaWVudFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgUGFydG5lcmluZyBSb2JvdGljcywgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgbGlicmFyeSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3JcbiAqIG1vZGlmeSBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWNcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IHZlcnNpb25cbiAqICAzLjAgb2YgdGhlIExpY2Vuc2UuIFRoaXMgbGlicmFyeSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZVxuICogdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW5cbiAqIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVJcbiAqIFBVUlBPU0UuIFNlZSB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljXG4gKiBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBsaWJyYXJ5LlxuICovXG5EaXlhU2VsZWN0b3IgPSByZXF1aXJlKCcuLi8uLi9EaXlhU2VsZWN0b3InKS5EaXlhU2VsZWN0b3I7XG5cbmZ1bmN0aW9uIGV4cGxvcmVyKG5vZGUpe1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cdHRoaXMubm9kZSA9IG5vZGU7XG5cdHJldHVybiB0aGlzO1xufVxuXG5cbkRpeWFTZWxlY3Rvci5wcm90b3R5cGUubGlzdGVuVmlld2VycyA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblx0XHR0aGlzLnN1YnNjcmliZSh7XG5cdFx0XHRzZXJ2aWNlOiAnZXhwbG9yZXInLFxuXHRcdFx0ZnVuYzogJ0xpc3RlblZpZXdlcnMnLFxuXHRcdFx0Ly8gZGF0YTogeyBmaWxlOiBmaWxlfVxuXG5cdFx0fSwgZnVuY3Rpb24ocGVlcklkLCBlcnIsIGRhdGEpe1xuXHRcdFx0Y2FsbGJhY2socGVlcklkLCBudWxsLCBkYXRhKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzO1xufTtcbiJdfQ==
