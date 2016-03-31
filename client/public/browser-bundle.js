(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function corslite(url, callback, cors) {
    var sent = false;

    if (typeof window.XMLHttpRequest === 'undefined') {
        return callback(Error('Browser not supported'));
    }

    if (typeof cors === 'undefined') {
        var m = url.match(/^\s*https?:\/\/[^\/]*/);
        cors = m && (m[0] !== location.protocol + '//' + location.hostname +
                (location.port ? ':' + location.port : ''));
    }

    var x = new window.XMLHttpRequest();

    function isSuccessful(status) {
        return status >= 200 && status < 300 || status === 304;
    }

    if (cors && !('withCredentials' in x)) {
        // IE8-9
        x = new window.XDomainRequest();

        // Ensure callback is never called synchronously, i.e., before
        // x.send() returns (this has been observed in the wild).
        // See https://github.com/mapbox/mapbox.js/issues/472
        var original = callback;
        callback = function() {
            if (sent) {
                original.apply(this, arguments);
            } else {
                var that = this, args = arguments;
                setTimeout(function() {
                    original.apply(that, args);
                }, 0);
            }
        }
    }

    function loaded() {
        if (
            // XDomainRequest
            x.status === undefined ||
            // modern browsers
            isSuccessful(x.status)) callback.call(x, null, x);
        else callback.call(x, x, null);
    }

    // Both `onreadystatechange` and `onload` can fire. `onreadystatechange`
    // has [been supported for longer](http://stackoverflow.com/a/9181508/229001).
    if ('onload' in x) {
        x.onload = loaded;
    } else {
        x.onreadystatechange = function readystate() {
            if (x.readyState === 4) {
                loaded();
            }
        };
    }

    // Call the callback with the XMLHttpRequest object as an error and prevent
    // it from ever being called again by reassigning it to `noop`
    x.onerror = function error(evt) {
        // XDomainRequest provides no evt parameter
        callback.call(this, evt || true, null);
        callback = function() { };
    };

    // IE9 must have onprogress be set to a unique function.
    x.onprogress = function() { };

    x.ontimeout = function(evt) {
        callback.call(this, evt, null);
        callback = function() { };
    };

    x.onabort = function(evt) {
        callback.call(this, evt, null);
        callback = function() { };
    };

    // GET is the only supported HTTP Verb by XDomainRequest and is the
    // only one supported here.
    x.open('GET', url, true);

    // Send the request. Sending data is not supported.
    x.send(null);
    sent = true;

    return x;
}

if (typeof module !== 'undefined') module.exports = corslite;

},{}],2:[function(require,module,exports){
/*
 Leaflet, a JavaScript library for mobile-friendly interactive maps. http://leafletjs.com
 (c) 2010-2013, Vladimir Agafonkin
 (c) 2010-2011, CloudMade
*/
(function (window, document, undefined) {
var oldL = window.L,
    L = {};

L.version = '0.7.7';

// define Leaflet for Node module pattern loaders, including Browserify
if (typeof module === 'object' && typeof module.exports === 'object') {
	module.exports = L;

// define Leaflet as an AMD module
} else if (typeof define === 'function' && define.amd) {
	define(L);
}

// define Leaflet as a global L variable, saving the original L to restore later if needed

L.noConflict = function () {
	window.L = oldL;
	return this;
};

window.L = L;


/*
 * L.Util contains various utility functions used throughout Leaflet code.
 */

L.Util = {
	extend: function (dest) { // (Object[, Object, ...]) ->
		var sources = Array.prototype.slice.call(arguments, 1),
		    i, j, len, src;

		for (j = 0, len = sources.length; j < len; j++) {
			src = sources[j] || {};
			for (i in src) {
				if (src.hasOwnProperty(i)) {
					dest[i] = src[i];
				}
			}
		}
		return dest;
	},

	bind: function (fn, obj) { // (Function, Object) -> Function
		var args = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : null;
		return function () {
			return fn.apply(obj, args || arguments);
		};
	},

	stamp: (function () {
		var lastId = 0,
		    key = '_leaflet_id';
		return function (obj) {
			obj[key] = obj[key] || ++lastId;
			return obj[key];
		};
	}()),

	invokeEach: function (obj, method, context) {
		var i, args;

		if (typeof obj === 'object') {
			args = Array.prototype.slice.call(arguments, 3);

			for (i in obj) {
				method.apply(context, [i, obj[i]].concat(args));
			}
			return true;
		}

		return false;
	},

	limitExecByInterval: function (fn, time, context) {
		var lock, execOnUnlock;

		return function wrapperFn() {
			var args = arguments;

			if (lock) {
				execOnUnlock = true;
				return;
			}

			lock = true;

			setTimeout(function () {
				lock = false;

				if (execOnUnlock) {
					wrapperFn.apply(context, args);
					execOnUnlock = false;
				}
			}, time);

			fn.apply(context, args);
		};
	},

	falseFn: function () {
		return false;
	},

	formatNum: function (num, digits) {
		var pow = Math.pow(10, digits || 5);
		return Math.round(num * pow) / pow;
	},

	trim: function (str) {
		return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
	},

	splitWords: function (str) {
		return L.Util.trim(str).split(/\s+/);
	},

	setOptions: function (obj, options) {
		obj.options = L.extend({}, obj.options, options);
		return obj.options;
	},

	getParamString: function (obj, existingUrl, uppercase) {
		var params = [];
		for (var i in obj) {
			params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + '=' + encodeURIComponent(obj[i]));
		}
		return ((!existingUrl || existingUrl.indexOf('?') === -1) ? '?' : '&') + params.join('&');
	},
	template: function (str, data) {
		return str.replace(/\{ *([\w_]+) *\}/g, function (str, key) {
			var value = data[key];
			if (value === undefined) {
				throw new Error('No value provided for variable ' + str);
			} else if (typeof value === 'function') {
				value = value(data);
			}
			return value;
		});
	},

	isArray: Array.isArray || function (obj) {
		return (Object.prototype.toString.call(obj) === '[object Array]');
	},

	emptyImageUrl: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
};

(function () {

	// inspired by http://paulirish.com/2011/requestanimationframe-for-smart-animating/

	function getPrefixed(name) {
		var i, fn,
		    prefixes = ['webkit', 'moz', 'o', 'ms'];

		for (i = 0; i < prefixes.length && !fn; i++) {
			fn = window[prefixes[i] + name];
		}

		return fn;
	}

	var lastTime = 0;

	function timeoutDefer(fn) {
		var time = +new Date(),
		    timeToCall = Math.max(0, 16 - (time - lastTime));

		lastTime = time + timeToCall;
		return window.setTimeout(fn, timeToCall);
	}

	var requestFn = window.requestAnimationFrame ||
	        getPrefixed('RequestAnimationFrame') || timeoutDefer;

	var cancelFn = window.cancelAnimationFrame ||
	        getPrefixed('CancelAnimationFrame') ||
	        getPrefixed('CancelRequestAnimationFrame') ||
	        function (id) { window.clearTimeout(id); };


	L.Util.requestAnimFrame = function (fn, context, immediate, element) {
		fn = L.bind(fn, context);

		if (immediate && requestFn === timeoutDefer) {
			fn();
		} else {
			return requestFn.call(window, fn, element);
		}
	};

	L.Util.cancelAnimFrame = function (id) {
		if (id) {
			cancelFn.call(window, id);
		}
	};

}());

// shortcuts for most used utility functions
L.extend = L.Util.extend;
L.bind = L.Util.bind;
L.stamp = L.Util.stamp;
L.setOptions = L.Util.setOptions;


/*
 * L.Class powers the OOP facilities of the library.
 * Thanks to John Resig and Dean Edwards for inspiration!
 */

L.Class = function () {};

L.Class.extend = function (props) {

	// extended class with the new prototype
	var NewClass = function () {

		// call the constructor
		if (this.initialize) {
			this.initialize.apply(this, arguments);
		}

		// call all constructor hooks
		if (this._initHooks) {
			this.callInitHooks();
		}
	};

	// instantiate class without calling constructor
	var F = function () {};
	F.prototype = this.prototype;

	var proto = new F();
	proto.constructor = NewClass;

	NewClass.prototype = proto;

	//inherit parent's statics
	for (var i in this) {
		if (this.hasOwnProperty(i) && i !== 'prototype') {
			NewClass[i] = this[i];
		}
	}

	// mix static properties into the class
	if (props.statics) {
		L.extend(NewClass, props.statics);
		delete props.statics;
	}

	// mix includes into the prototype
	if (props.includes) {
		L.Util.extend.apply(null, [proto].concat(props.includes));
		delete props.includes;
	}

	// merge options
	if (props.options && proto.options) {
		props.options = L.extend({}, proto.options, props.options);
	}

	// mix given properties into the prototype
	L.extend(proto, props);

	proto._initHooks = [];

	var parent = this;
	// jshint camelcase: false
	NewClass.__super__ = parent.prototype;

	// add method for calling all hooks
	proto.callInitHooks = function () {

		if (this._initHooksCalled) { return; }

		if (parent.prototype.callInitHooks) {
			parent.prototype.callInitHooks.call(this);
		}

		this._initHooksCalled = true;

		for (var i = 0, len = proto._initHooks.length; i < len; i++) {
			proto._initHooks[i].call(this);
		}
	};

	return NewClass;
};


// method for adding properties to prototype
L.Class.include = function (props) {
	L.extend(this.prototype, props);
};

// merge new default options to the Class
L.Class.mergeOptions = function (options) {
	L.extend(this.prototype.options, options);
};

// add a constructor hook
L.Class.addInitHook = function (fn) { // (Function) || (String, args...)
	var args = Array.prototype.slice.call(arguments, 1);

	var init = typeof fn === 'function' ? fn : function () {
		this[fn].apply(this, args);
	};

	this.prototype._initHooks = this.prototype._initHooks || [];
	this.prototype._initHooks.push(init);
};


/*
 * L.Mixin.Events is used to add custom events functionality to Leaflet classes.
 */

var eventsKey = '_leaflet_events';

L.Mixin = {};

L.Mixin.Events = {

	addEventListener: function (types, fn, context) { // (String, Function[, Object]) or (Object[, Object])

		// types can be a map of types/handlers
		if (L.Util.invokeEach(types, this.addEventListener, this, fn, context)) { return this; }

		var events = this[eventsKey] = this[eventsKey] || {},
		    contextId = context && context !== this && L.stamp(context),
		    i, len, event, type, indexKey, indexLenKey, typeIndex;

		// types can be a string of space-separated words
		types = L.Util.splitWords(types);

		for (i = 0, len = types.length; i < len; i++) {
			event = {
				action: fn,
				context: context || this
			};
			type = types[i];

			if (contextId) {
				// store listeners of a particular context in a separate hash (if it has an id)
				// gives a major performance boost when removing thousands of map layers

				indexKey = type + '_idx';
				indexLenKey = indexKey + '_len';

				typeIndex = events[indexKey] = events[indexKey] || {};

				if (!typeIndex[contextId]) {
					typeIndex[contextId] = [];

					// keep track of the number of keys in the index to quickly check if it's empty
					events[indexLenKey] = (events[indexLenKey] || 0) + 1;
				}

				typeIndex[contextId].push(event);


			} else {
				events[type] = events[type] || [];
				events[type].push(event);
			}
		}

		return this;
	},

	hasEventListeners: function (type) { // (String) -> Boolean
		var events = this[eventsKey];
		return !!events && ((type in events && events[type].length > 0) ||
		                    (type + '_idx' in events && events[type + '_idx_len'] > 0));
	},

	removeEventListener: function (types, fn, context) { // ([String, Function, Object]) or (Object[, Object])

		if (!this[eventsKey]) {
			return this;
		}

		if (!types) {
			return this.clearAllEventListeners();
		}

		if (L.Util.invokeEach(types, this.removeEventListener, this, fn, context)) { return this; }

		var events = this[eventsKey],
		    contextId = context && context !== this && L.stamp(context),
		    i, len, type, listeners, j, indexKey, indexLenKey, typeIndex, removed;

		types = L.Util.splitWords(types);

		for (i = 0, len = types.length; i < len; i++) {
			type = types[i];
			indexKey = type + '_idx';
			indexLenKey = indexKey + '_len';

			typeIndex = events[indexKey];

			if (!fn) {
				// clear all listeners for a type if function isn't specified
				delete events[type];
				delete events[indexKey];
				delete events[indexLenKey];

			} else {
				listeners = contextId && typeIndex ? typeIndex[contextId] : events[type];

				if (listeners) {
					for (j = listeners.length - 1; j >= 0; j--) {
						if ((listeners[j].action === fn) && (!context || (listeners[j].context === context))) {
							removed = listeners.splice(j, 1);
							// set the old action to a no-op, because it is possible
							// that the listener is being iterated over as part of a dispatch
							removed[0].action = L.Util.falseFn;
						}
					}

					if (context && typeIndex && (listeners.length === 0)) {
						delete typeIndex[contextId];
						events[indexLenKey]--;
					}
				}
			}
		}

		return this;
	},

	clearAllEventListeners: function () {
		delete this[eventsKey];
		return this;
	},

	fireEvent: function (type, data) { // (String[, Object])
		if (!this.hasEventListeners(type)) {
			return this;
		}

		var event = L.Util.extend({}, data, { type: type, target: this });

		var events = this[eventsKey],
		    listeners, i, len, typeIndex, contextId;

		if (events[type]) {
			// make sure adding/removing listeners inside other listeners won't cause infinite loop
			listeners = events[type].slice();

			for (i = 0, len = listeners.length; i < len; i++) {
				listeners[i].action.call(listeners[i].context, event);
			}
		}

		// fire event for the context-indexed listeners as well
		typeIndex = events[type + '_idx'];

		for (contextId in typeIndex) {
			listeners = typeIndex[contextId].slice();

			if (listeners) {
				for (i = 0, len = listeners.length; i < len; i++) {
					listeners[i].action.call(listeners[i].context, event);
				}
			}
		}

		return this;
	},

	addOneTimeEventListener: function (types, fn, context) {

		if (L.Util.invokeEach(types, this.addOneTimeEventListener, this, fn, context)) { return this; }

		var handler = L.bind(function () {
			this
			    .removeEventListener(types, fn, context)
			    .removeEventListener(types, handler, context);
		}, this);

		return this
		    .addEventListener(types, fn, context)
		    .addEventListener(types, handler, context);
	}
};

L.Mixin.Events.on = L.Mixin.Events.addEventListener;
L.Mixin.Events.off = L.Mixin.Events.removeEventListener;
L.Mixin.Events.once = L.Mixin.Events.addOneTimeEventListener;
L.Mixin.Events.fire = L.Mixin.Events.fireEvent;


/*
 * L.Browser handles different browser and feature detections for internal Leaflet use.
 */

(function () {

	var ie = 'ActiveXObject' in window,
		ielt9 = ie && !document.addEventListener,

	    // terrible browser detection to work around Safari / iOS / Android browser bugs
	    ua = navigator.userAgent.toLowerCase(),
	    webkit = ua.indexOf('webkit') !== -1,
	    chrome = ua.indexOf('chrome') !== -1,
	    phantomjs = ua.indexOf('phantom') !== -1,
	    android = ua.indexOf('android') !== -1,
	    android23 = ua.search('android [23]') !== -1,
		gecko = ua.indexOf('gecko') !== -1,

	    mobile = typeof orientation !== undefined + '',
	    msPointer = !window.PointerEvent && window.MSPointerEvent,
		pointer = (window.PointerEvent && window.navigator.pointerEnabled) ||
				  msPointer,
	    retina = ('devicePixelRatio' in window && window.devicePixelRatio > 1) ||
	             ('matchMedia' in window && window.matchMedia('(min-resolution:144dpi)') &&
	              window.matchMedia('(min-resolution:144dpi)').matches),

	    doc = document.documentElement,
	    ie3d = ie && ('transition' in doc.style),
	    webkit3d = ('WebKitCSSMatrix' in window) && ('m11' in new window.WebKitCSSMatrix()) && !android23,
	    gecko3d = 'MozPerspective' in doc.style,
	    opera3d = 'OTransition' in doc.style,
	    any3d = !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d || opera3d) && !phantomjs;

	var touch = !window.L_NO_TOUCH && !phantomjs && (pointer || 'ontouchstart' in window ||
		(window.DocumentTouch && document instanceof window.DocumentTouch));

	L.Browser = {
		ie: ie,
		ielt9: ielt9,
		webkit: webkit,
		gecko: gecko && !webkit && !window.opera && !ie,

		android: android,
		android23: android23,

		chrome: chrome,

		ie3d: ie3d,
		webkit3d: webkit3d,
		gecko3d: gecko3d,
		opera3d: opera3d,
		any3d: any3d,

		mobile: mobile,
		mobileWebkit: mobile && webkit,
		mobileWebkit3d: mobile && webkit3d,
		mobileOpera: mobile && window.opera,

		touch: touch,
		msPointer: msPointer,
		pointer: pointer,

		retina: retina
	};

}());


/*
 * L.Point represents a point with x and y coordinates.
 */

L.Point = function (/*Number*/ x, /*Number*/ y, /*Boolean*/ round) {
	this.x = (round ? Math.round(x) : x);
	this.y = (round ? Math.round(y) : y);
};

L.Point.prototype = {

	clone: function () {
		return new L.Point(this.x, this.y);
	},

	// non-destructive, returns a new point
	add: function (point) {
		return this.clone()._add(L.point(point));
	},

	// destructive, used directly for performance in situations where it's safe to modify existing point
	_add: function (point) {
		this.x += point.x;
		this.y += point.y;
		return this;
	},

	subtract: function (point) {
		return this.clone()._subtract(L.point(point));
	},

	_subtract: function (point) {
		this.x -= point.x;
		this.y -= point.y;
		return this;
	},

	divideBy: function (num) {
		return this.clone()._divideBy(num);
	},

	_divideBy: function (num) {
		this.x /= num;
		this.y /= num;
		return this;
	},

	multiplyBy: function (num) {
		return this.clone()._multiplyBy(num);
	},

	_multiplyBy: function (num) {
		this.x *= num;
		this.y *= num;
		return this;
	},

	round: function () {
		return this.clone()._round();
	},

	_round: function () {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	},

	floor: function () {
		return this.clone()._floor();
	},

	_floor: function () {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	},

	distanceTo: function (point) {
		point = L.point(point);

		var x = point.x - this.x,
		    y = point.y - this.y;

		return Math.sqrt(x * x + y * y);
	},

	equals: function (point) {
		point = L.point(point);

		return point.x === this.x &&
		       point.y === this.y;
	},

	contains: function (point) {
		point = L.point(point);

		return Math.abs(point.x) <= Math.abs(this.x) &&
		       Math.abs(point.y) <= Math.abs(this.y);
	},

	toString: function () {
		return 'Point(' +
		        L.Util.formatNum(this.x) + ', ' +
		        L.Util.formatNum(this.y) + ')';
	}
};

L.point = function (x, y, round) {
	if (x instanceof L.Point) {
		return x;
	}
	if (L.Util.isArray(x)) {
		return new L.Point(x[0], x[1]);
	}
	if (x === undefined || x === null) {
		return x;
	}
	return new L.Point(x, y, round);
};


/*
 * L.Bounds represents a rectangular area on the screen in pixel coordinates.
 */

L.Bounds = function (a, b) { //(Point, Point) or Point[]
	if (!a) { return; }

	var points = b ? [a, b] : a;

	for (var i = 0, len = points.length; i < len; i++) {
		this.extend(points[i]);
	}
};

L.Bounds.prototype = {
	// extend the bounds to contain the given point
	extend: function (point) { // (Point)
		point = L.point(point);

		if (!this.min && !this.max) {
			this.min = point.clone();
			this.max = point.clone();
		} else {
			this.min.x = Math.min(point.x, this.min.x);
			this.max.x = Math.max(point.x, this.max.x);
			this.min.y = Math.min(point.y, this.min.y);
			this.max.y = Math.max(point.y, this.max.y);
		}
		return this;
	},

	getCenter: function (round) { // (Boolean) -> Point
		return new L.Point(
		        (this.min.x + this.max.x) / 2,
		        (this.min.y + this.max.y) / 2, round);
	},

	getBottomLeft: function () { // -> Point
		return new L.Point(this.min.x, this.max.y);
	},

	getTopRight: function () { // -> Point
		return new L.Point(this.max.x, this.min.y);
	},

	getSize: function () {
		return this.max.subtract(this.min);
	},

	contains: function (obj) { // (Bounds) or (Point) -> Boolean
		var min, max;

		if (typeof obj[0] === 'number' || obj instanceof L.Point) {
			obj = L.point(obj);
		} else {
			obj = L.bounds(obj);
		}

		if (obj instanceof L.Bounds) {
			min = obj.min;
			max = obj.max;
		} else {
			min = max = obj;
		}

		return (min.x >= this.min.x) &&
		       (max.x <= this.max.x) &&
		       (min.y >= this.min.y) &&
		       (max.y <= this.max.y);
	},

	intersects: function (bounds) { // (Bounds) -> Boolean
		bounds = L.bounds(bounds);

		var min = this.min,
		    max = this.max,
		    min2 = bounds.min,
		    max2 = bounds.max,
		    xIntersects = (max2.x >= min.x) && (min2.x <= max.x),
		    yIntersects = (max2.y >= min.y) && (min2.y <= max.y);

		return xIntersects && yIntersects;
	},

	isValid: function () {
		return !!(this.min && this.max);
	}
};

L.bounds = function (a, b) { // (Bounds) or (Point, Point) or (Point[])
	if (!a || a instanceof L.Bounds) {
		return a;
	}
	return new L.Bounds(a, b);
};


/*
 * L.Transformation is an utility class to perform simple point transformations through a 2d-matrix.
 */

L.Transformation = function (a, b, c, d) {
	this._a = a;
	this._b = b;
	this._c = c;
	this._d = d;
};

L.Transformation.prototype = {
	transform: function (point, scale) { // (Point, Number) -> Point
		return this._transform(point.clone(), scale);
	},

	// destructive transform (faster)
	_transform: function (point, scale) {
		scale = scale || 1;
		point.x = scale * (this._a * point.x + this._b);
		point.y = scale * (this._c * point.y + this._d);
		return point;
	},

	untransform: function (point, scale) {
		scale = scale || 1;
		return new L.Point(
		        (point.x / scale - this._b) / this._a,
		        (point.y / scale - this._d) / this._c);
	}
};


/*
 * L.DomUtil contains various utility functions for working with DOM.
 */

L.DomUtil = {
	get: function (id) {
		return (typeof id === 'string' ? document.getElementById(id) : id);
	},

	getStyle: function (el, style) {

		var value = el.style[style];

		if (!value && el.currentStyle) {
			value = el.currentStyle[style];
		}

		if ((!value || value === 'auto') && document.defaultView) {
			var css = document.defaultView.getComputedStyle(el, null);
			value = css ? css[style] : null;
		}

		return value === 'auto' ? null : value;
	},

	getViewportOffset: function (element) {

		var top = 0,
		    left = 0,
		    el = element,
		    docBody = document.body,
		    docEl = document.documentElement,
		    pos;

		do {
			top  += el.offsetTop  || 0;
			left += el.offsetLeft || 0;

			//add borders
			top += parseInt(L.DomUtil.getStyle(el, 'borderTopWidth'), 10) || 0;
			left += parseInt(L.DomUtil.getStyle(el, 'borderLeftWidth'), 10) || 0;

			pos = L.DomUtil.getStyle(el, 'position');

			if (el.offsetParent === docBody && pos === 'absolute') { break; }

			if (pos === 'fixed') {
				top  += docBody.scrollTop  || docEl.scrollTop  || 0;
				left += docBody.scrollLeft || docEl.scrollLeft || 0;
				break;
			}

			if (pos === 'relative' && !el.offsetLeft) {
				var width = L.DomUtil.getStyle(el, 'width'),
				    maxWidth = L.DomUtil.getStyle(el, 'max-width'),
				    r = el.getBoundingClientRect();

				if (width !== 'none' || maxWidth !== 'none') {
					left += r.left + el.clientLeft;
				}

				//calculate full y offset since we're breaking out of the loop
				top += r.top + (docBody.scrollTop  || docEl.scrollTop  || 0);

				break;
			}

			el = el.offsetParent;

		} while (el);

		el = element;

		do {
			if (el === docBody) { break; }

			top  -= el.scrollTop  || 0;
			left -= el.scrollLeft || 0;

			el = el.parentNode;
		} while (el);

		return new L.Point(left, top);
	},

	documentIsLtr: function () {
		if (!L.DomUtil._docIsLtrCached) {
			L.DomUtil._docIsLtrCached = true;
			L.DomUtil._docIsLtr = L.DomUtil.getStyle(document.body, 'direction') === 'ltr';
		}
		return L.DomUtil._docIsLtr;
	},

	create: function (tagName, className, container) {

		var el = document.createElement(tagName);
		el.className = className;

		if (container) {
			container.appendChild(el);
		}

		return el;
	},

	hasClass: function (el, name) {
		if (el.classList !== undefined) {
			return el.classList.contains(name);
		}
		var className = L.DomUtil._getClass(el);
		return className.length > 0 && new RegExp('(^|\\s)' + name + '(\\s|$)').test(className);
	},

	addClass: function (el, name) {
		if (el.classList !== undefined) {
			var classes = L.Util.splitWords(name);
			for (var i = 0, len = classes.length; i < len; i++) {
				el.classList.add(classes[i]);
			}
		} else if (!L.DomUtil.hasClass(el, name)) {
			var className = L.DomUtil._getClass(el);
			L.DomUtil._setClass(el, (className ? className + ' ' : '') + name);
		}
	},

	removeClass: function (el, name) {
		if (el.classList !== undefined) {
			el.classList.remove(name);
		} else {
			L.DomUtil._setClass(el, L.Util.trim((' ' + L.DomUtil._getClass(el) + ' ').replace(' ' + name + ' ', ' ')));
		}
	},

	_setClass: function (el, name) {
		if (el.className.baseVal === undefined) {
			el.className = name;
		} else {
			// in case of SVG element
			el.className.baseVal = name;
		}
	},

	_getClass: function (el) {
		return el.className.baseVal === undefined ? el.className : el.className.baseVal;
	},

	setOpacity: function (el, value) {

		if ('opacity' in el.style) {
			el.style.opacity = value;

		} else if ('filter' in el.style) {

			var filter = false,
			    filterName = 'DXImageTransform.Microsoft.Alpha';

			// filters collection throws an error if we try to retrieve a filter that doesn't exist
			try {
				filter = el.filters.item(filterName);
			} catch (e) {
				// don't set opacity to 1 if we haven't already set an opacity,
				// it isn't needed and breaks transparent pngs.
				if (value === 1) { return; }
			}

			value = Math.round(value * 100);

			if (filter) {
				filter.Enabled = (value !== 100);
				filter.Opacity = value;
			} else {
				el.style.filter += ' progid:' + filterName + '(opacity=' + value + ')';
			}
		}
	},

	testProp: function (props) {

		var style = document.documentElement.style;

		for (var i = 0; i < props.length; i++) {
			if (props[i] in style) {
				return props[i];
			}
		}
		return false;
	},

	getTranslateString: function (point) {
		// on WebKit browsers (Chrome/Safari/iOS Safari/Android) using translate3d instead of translate
		// makes animation smoother as it ensures HW accel is used. Firefox 13 doesn't care
		// (same speed either way), Opera 12 doesn't support translate3d

		var is3d = L.Browser.webkit3d,
		    open = 'translate' + (is3d ? '3d' : '') + '(',
		    close = (is3d ? ',0' : '') + ')';

		return open + point.x + 'px,' + point.y + 'px' + close;
	},

	getScaleString: function (scale, origin) {

		var preTranslateStr = L.DomUtil.getTranslateString(origin.add(origin.multiplyBy(-1 * scale))),
		    scaleStr = ' scale(' + scale + ') ';

		return preTranslateStr + scaleStr;
	},

	setPosition: function (el, point, disable3D) { // (HTMLElement, Point[, Boolean])

		// jshint camelcase: false
		el._leaflet_pos = point;

		if (!disable3D && L.Browser.any3d) {
			el.style[L.DomUtil.TRANSFORM] =  L.DomUtil.getTranslateString(point);
		} else {
			el.style.left = point.x + 'px';
			el.style.top = point.y + 'px';
		}
	},

	getPosition: function (el) {
		// this method is only used for elements previously positioned using setPosition,
		// so it's safe to cache the position for performance

		// jshint camelcase: false
		return el._leaflet_pos;
	}
};


// prefix style property names

L.DomUtil.TRANSFORM = L.DomUtil.testProp(
        ['transform', 'WebkitTransform', 'OTransform', 'MozTransform', 'msTransform']);

// webkitTransition comes first because some browser versions that drop vendor prefix don't do
// the same for the transitionend event, in particular the Android 4.1 stock browser

L.DomUtil.TRANSITION = L.DomUtil.testProp(
        ['webkitTransition', 'transition', 'OTransition', 'MozTransition', 'msTransition']);

L.DomUtil.TRANSITION_END =
        L.DomUtil.TRANSITION === 'webkitTransition' || L.DomUtil.TRANSITION === 'OTransition' ?
        L.DomUtil.TRANSITION + 'End' : 'transitionend';

(function () {
    if ('onselectstart' in document) {
        L.extend(L.DomUtil, {
            disableTextSelection: function () {
                L.DomEvent.on(window, 'selectstart', L.DomEvent.preventDefault);
            },

            enableTextSelection: function () {
                L.DomEvent.off(window, 'selectstart', L.DomEvent.preventDefault);
            }
        });
    } else {
        var userSelectProperty = L.DomUtil.testProp(
            ['userSelect', 'WebkitUserSelect', 'OUserSelect', 'MozUserSelect', 'msUserSelect']);

        L.extend(L.DomUtil, {
            disableTextSelection: function () {
                if (userSelectProperty) {
                    var style = document.documentElement.style;
                    this._userSelect = style[userSelectProperty];
                    style[userSelectProperty] = 'none';
                }
            },

            enableTextSelection: function () {
                if (userSelectProperty) {
                    document.documentElement.style[userSelectProperty] = this._userSelect;
                    delete this._userSelect;
                }
            }
        });
    }

	L.extend(L.DomUtil, {
		disableImageDrag: function () {
			L.DomEvent.on(window, 'dragstart', L.DomEvent.preventDefault);
		},

		enableImageDrag: function () {
			L.DomEvent.off(window, 'dragstart', L.DomEvent.preventDefault);
		}
	});
})();


/*
 * L.LatLng represents a geographical point with latitude and longitude coordinates.
 */

L.LatLng = function (lat, lng, alt) { // (Number, Number, Number)
	lat = parseFloat(lat);
	lng = parseFloat(lng);

	if (isNaN(lat) || isNaN(lng)) {
		throw new Error('Invalid LatLng object: (' + lat + ', ' + lng + ')');
	}

	this.lat = lat;
	this.lng = lng;

	if (alt !== undefined) {
		this.alt = parseFloat(alt);
	}
};

L.extend(L.LatLng, {
	DEG_TO_RAD: Math.PI / 180,
	RAD_TO_DEG: 180 / Math.PI,
	MAX_MARGIN: 1.0E-9 // max margin of error for the "equals" check
});

L.LatLng.prototype = {
	equals: function (obj) { // (LatLng) -> Boolean
		if (!obj) { return false; }

		obj = L.latLng(obj);

		var margin = Math.max(
		        Math.abs(this.lat - obj.lat),
		        Math.abs(this.lng - obj.lng));

		return margin <= L.LatLng.MAX_MARGIN;
	},

	toString: function (precision) { // (Number) -> String
		return 'LatLng(' +
		        L.Util.formatNum(this.lat, precision) + ', ' +
		        L.Util.formatNum(this.lng, precision) + ')';
	},

	// Haversine distance formula, see http://en.wikipedia.org/wiki/Haversine_formula
	// TODO move to projection code, LatLng shouldn't know about Earth
	distanceTo: function (other) { // (LatLng) -> Number
		other = L.latLng(other);

		var R = 6378137, // earth radius in meters
		    d2r = L.LatLng.DEG_TO_RAD,
		    dLat = (other.lat - this.lat) * d2r,
		    dLon = (other.lng - this.lng) * d2r,
		    lat1 = this.lat * d2r,
		    lat2 = other.lat * d2r,
		    sin1 = Math.sin(dLat / 2),
		    sin2 = Math.sin(dLon / 2);

		var a = sin1 * sin1 + sin2 * sin2 * Math.cos(lat1) * Math.cos(lat2);

		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	},

	wrap: function (a, b) { // (Number, Number) -> LatLng
		var lng = this.lng;

		a = a || -180;
		b = b ||  180;

		lng = (lng + b) % (b - a) + (lng < a || lng === b ? b : a);

		return new L.LatLng(this.lat, lng);
	}
};

L.latLng = function (a, b) { // (LatLng) or ([Number, Number]) or (Number, Number)
	if (a instanceof L.LatLng) {
		return a;
	}
	if (L.Util.isArray(a)) {
		if (typeof a[0] === 'number' || typeof a[0] === 'string') {
			return new L.LatLng(a[0], a[1], a[2]);
		} else {
			return null;
		}
	}
	if (a === undefined || a === null) {
		return a;
	}
	if (typeof a === 'object' && 'lat' in a) {
		return new L.LatLng(a.lat, 'lng' in a ? a.lng : a.lon);
	}
	if (b === undefined) {
		return null;
	}
	return new L.LatLng(a, b);
};



/*
 * L.LatLngBounds represents a rectangular area on the map in geographical coordinates.
 */

L.LatLngBounds = function (southWest, northEast) { // (LatLng, LatLng) or (LatLng[])
	if (!southWest) { return; }

	var latlngs = northEast ? [southWest, northEast] : southWest;

	for (var i = 0, len = latlngs.length; i < len; i++) {
		this.extend(latlngs[i]);
	}
};

L.LatLngBounds.prototype = {
	// extend the bounds to contain the given point or bounds
	extend: function (obj) { // (LatLng) or (LatLngBounds)
		if (!obj) { return this; }

		var latLng = L.latLng(obj);
		if (latLng !== null) {
			obj = latLng;
		} else {
			obj = L.latLngBounds(obj);
		}

		if (obj instanceof L.LatLng) {
			if (!this._southWest && !this._northEast) {
				this._southWest = new L.LatLng(obj.lat, obj.lng);
				this._northEast = new L.LatLng(obj.lat, obj.lng);
			} else {
				this._southWest.lat = Math.min(obj.lat, this._southWest.lat);
				this._southWest.lng = Math.min(obj.lng, this._southWest.lng);

				this._northEast.lat = Math.max(obj.lat, this._northEast.lat);
				this._northEast.lng = Math.max(obj.lng, this._northEast.lng);
			}
		} else if (obj instanceof L.LatLngBounds) {
			this.extend(obj._southWest);
			this.extend(obj._northEast);
		}
		return this;
	},

	// extend the bounds by a percentage
	pad: function (bufferRatio) { // (Number) -> LatLngBounds
		var sw = this._southWest,
		    ne = this._northEast,
		    heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio,
		    widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;

		return new L.LatLngBounds(
		        new L.LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer),
		        new L.LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer));
	},

	getCenter: function () { // -> LatLng
		return new L.LatLng(
		        (this._southWest.lat + this._northEast.lat) / 2,
		        (this._southWest.lng + this._northEast.lng) / 2);
	},

	getSouthWest: function () {
		return this._southWest;
	},

	getNorthEast: function () {
		return this._northEast;
	},

	getNorthWest: function () {
		return new L.LatLng(this.getNorth(), this.getWest());
	},

	getSouthEast: function () {
		return new L.LatLng(this.getSouth(), this.getEast());
	},

	getWest: function () {
		return this._southWest.lng;
	},

	getSouth: function () {
		return this._southWest.lat;
	},

	getEast: function () {
		return this._northEast.lng;
	},

	getNorth: function () {
		return this._northEast.lat;
	},

	contains: function (obj) { // (LatLngBounds) or (LatLng) -> Boolean
		if (typeof obj[0] === 'number' || obj instanceof L.LatLng) {
			obj = L.latLng(obj);
		} else {
			obj = L.latLngBounds(obj);
		}

		var sw = this._southWest,
		    ne = this._northEast,
		    sw2, ne2;

		if (obj instanceof L.LatLngBounds) {
			sw2 = obj.getSouthWest();
			ne2 = obj.getNorthEast();
		} else {
			sw2 = ne2 = obj;
		}

		return (sw2.lat >= sw.lat) && (ne2.lat <= ne.lat) &&
		       (sw2.lng >= sw.lng) && (ne2.lng <= ne.lng);
	},

	intersects: function (bounds) { // (LatLngBounds)
		bounds = L.latLngBounds(bounds);

		var sw = this._southWest,
		    ne = this._northEast,
		    sw2 = bounds.getSouthWest(),
		    ne2 = bounds.getNorthEast(),

		    latIntersects = (ne2.lat >= sw.lat) && (sw2.lat <= ne.lat),
		    lngIntersects = (ne2.lng >= sw.lng) && (sw2.lng <= ne.lng);

		return latIntersects && lngIntersects;
	},

	toBBoxString: function () {
		return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(',');
	},

	equals: function (bounds) { // (LatLngBounds)
		if (!bounds) { return false; }

		bounds = L.latLngBounds(bounds);

		return this._southWest.equals(bounds.getSouthWest()) &&
		       this._northEast.equals(bounds.getNorthEast());
	},

	isValid: function () {
		return !!(this._southWest && this._northEast);
	}
};

//TODO International date line?

L.latLngBounds = function (a, b) { // (LatLngBounds) or (LatLng, LatLng)
	if (!a || a instanceof L.LatLngBounds) {
		return a;
	}
	return new L.LatLngBounds(a, b);
};


/*
 * L.Projection contains various geographical projections used by CRS classes.
 */

L.Projection = {};


/*
 * Spherical Mercator is the most popular map projection, used by EPSG:3857 CRS used by default.
 */

L.Projection.SphericalMercator = {
	MAX_LATITUDE: 85.0511287798,

	project: function (latlng) { // (LatLng) -> Point
		var d = L.LatLng.DEG_TO_RAD,
		    max = this.MAX_LATITUDE,
		    lat = Math.max(Math.min(max, latlng.lat), -max),
		    x = latlng.lng * d,
		    y = lat * d;

		y = Math.log(Math.tan((Math.PI / 4) + (y / 2)));

		return new L.Point(x, y);
	},

	unproject: function (point) { // (Point, Boolean) -> LatLng
		var d = L.LatLng.RAD_TO_DEG,
		    lng = point.x * d,
		    lat = (2 * Math.atan(Math.exp(point.y)) - (Math.PI / 2)) * d;

		return new L.LatLng(lat, lng);
	}
};


/*
 * Simple equirectangular (Plate Carree) projection, used by CRS like EPSG:4326 and Simple.
 */

L.Projection.LonLat = {
	project: function (latlng) {
		return new L.Point(latlng.lng, latlng.lat);
	},

	unproject: function (point) {
		return new L.LatLng(point.y, point.x);
	}
};


/*
 * L.CRS is a base object for all defined CRS (Coordinate Reference Systems) in Leaflet.
 */

L.CRS = {
	latLngToPoint: function (latlng, zoom) { // (LatLng, Number) -> Point
		var projectedPoint = this.projection.project(latlng),
		    scale = this.scale(zoom);

		return this.transformation._transform(projectedPoint, scale);
	},

	pointToLatLng: function (point, zoom) { // (Point, Number[, Boolean]) -> LatLng
		var scale = this.scale(zoom),
		    untransformedPoint = this.transformation.untransform(point, scale);

		return this.projection.unproject(untransformedPoint);
	},

	project: function (latlng) {
		return this.projection.project(latlng);
	},

	scale: function (zoom) {
		return 256 * Math.pow(2, zoom);
	},

	getSize: function (zoom) {
		var s = this.scale(zoom);
		return L.point(s, s);
	}
};


/*
 * A simple CRS that can be used for flat non-Earth maps like panoramas or game maps.
 */

L.CRS.Simple = L.extend({}, L.CRS, {
	projection: L.Projection.LonLat,
	transformation: new L.Transformation(1, 0, -1, 0),

	scale: function (zoom) {
		return Math.pow(2, zoom);
	}
});


/*
 * L.CRS.EPSG3857 (Spherical Mercator) is the most common CRS for web mapping
 * and is used by Leaflet by default.
 */

L.CRS.EPSG3857 = L.extend({}, L.CRS, {
	code: 'EPSG:3857',

	projection: L.Projection.SphericalMercator,
	transformation: new L.Transformation(0.5 / Math.PI, 0.5, -0.5 / Math.PI, 0.5),

	project: function (latlng) { // (LatLng) -> Point
		var projectedPoint = this.projection.project(latlng),
		    earthRadius = 6378137;
		return projectedPoint.multiplyBy(earthRadius);
	}
});

L.CRS.EPSG900913 = L.extend({}, L.CRS.EPSG3857, {
	code: 'EPSG:900913'
});


/*
 * L.CRS.EPSG4326 is a CRS popular among advanced GIS specialists.
 */

L.CRS.EPSG4326 = L.extend({}, L.CRS, {
	code: 'EPSG:4326',

	projection: L.Projection.LonLat,
	transformation: new L.Transformation(1 / 360, 0.5, -1 / 360, 0.5)
});


/*
 * L.Map is the central class of the API - it is used to create a map.
 */

L.Map = L.Class.extend({

	includes: L.Mixin.Events,

	options: {
		crs: L.CRS.EPSG3857,

		/*
		center: LatLng,
		zoom: Number,
		layers: Array,
		*/

		fadeAnimation: L.DomUtil.TRANSITION && !L.Browser.android23,
		trackResize: true,
		markerZoomAnimation: L.DomUtil.TRANSITION && L.Browser.any3d
	},

	initialize: function (id, options) { // (HTMLElement or String, Object)
		options = L.setOptions(this, options);


		this._initContainer(id);
		this._initLayout();

		// hack for https://github.com/Leaflet/Leaflet/issues/1980
		this._onResize = L.bind(this._onResize, this);

		this._initEvents();

		if (options.maxBounds) {
			this.setMaxBounds(options.maxBounds);
		}

		if (options.center && options.zoom !== undefined) {
			this.setView(L.latLng(options.center), options.zoom, {reset: true});
		}

		this._handlers = [];

		this._layers = {};
		this._zoomBoundLayers = {};
		this._tileLayersNum = 0;

		this.callInitHooks();

		this._addLayers(options.layers);
	},


	// public methods that modify map state

	// replaced by animation-powered implementation in Map.PanAnimation.js
	setView: function (center, zoom) {
		zoom = zoom === undefined ? this.getZoom() : zoom;
		this._resetView(L.latLng(center), this._limitZoom(zoom));
		return this;
	},

	setZoom: function (zoom, options) {
		if (!this._loaded) {
			this._zoom = this._limitZoom(zoom);
			return this;
		}
		return this.setView(this.getCenter(), zoom, {zoom: options});
	},

	zoomIn: function (delta, options) {
		return this.setZoom(this._zoom + (delta || 1), options);
	},

	zoomOut: function (delta, options) {
		return this.setZoom(this._zoom - (delta || 1), options);
	},

	setZoomAround: function (latlng, zoom, options) {
		var scale = this.getZoomScale(zoom),
		    viewHalf = this.getSize().divideBy(2),
		    containerPoint = latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng),

		    centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale),
		    newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));

		return this.setView(newCenter, zoom, {zoom: options});
	},

	fitBounds: function (bounds, options) {

		options = options || {};
		bounds = bounds.getBounds ? bounds.getBounds() : L.latLngBounds(bounds);

		var paddingTL = L.point(options.paddingTopLeft || options.padding || [0, 0]),
		    paddingBR = L.point(options.paddingBottomRight || options.padding || [0, 0]),

		    zoom = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR));

		zoom = (options.maxZoom) ? Math.min(options.maxZoom, zoom) : zoom;

		var paddingOffset = paddingBR.subtract(paddingTL).divideBy(2),

		    swPoint = this.project(bounds.getSouthWest(), zoom),
		    nePoint = this.project(bounds.getNorthEast(), zoom),
		    center = this.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom);

		return this.setView(center, zoom, options);
	},

	fitWorld: function (options) {
		return this.fitBounds([[-90, -180], [90, 180]], options);
	},

	panTo: function (center, options) { // (LatLng)
		return this.setView(center, this._zoom, {pan: options});
	},

	panBy: function (offset) { // (Point)
		// replaced with animated panBy in Map.PanAnimation.js
		this.fire('movestart');

		this._rawPanBy(L.point(offset));

		this.fire('move');
		return this.fire('moveend');
	},

	setMaxBounds: function (bounds) {
		bounds = L.latLngBounds(bounds);

		this.options.maxBounds = bounds;

		if (!bounds) {
			return this.off('moveend', this._panInsideMaxBounds, this);
		}

		if (this._loaded) {
			this._panInsideMaxBounds();
		}

		return this.on('moveend', this._panInsideMaxBounds, this);
	},

	panInsideBounds: function (bounds, options) {
		var center = this.getCenter(),
			newCenter = this._limitCenter(center, this._zoom, bounds);

		if (center.equals(newCenter)) { return this; }

		return this.panTo(newCenter, options);
	},

	addLayer: function (layer) {
		// TODO method is too big, refactor

		var id = L.stamp(layer);

		if (this._layers[id]) { return this; }

		this._layers[id] = layer;

		// TODO getMaxZoom, getMinZoom in ILayer (instead of options)
		if (layer.options && (!isNaN(layer.options.maxZoom) || !isNaN(layer.options.minZoom))) {
			this._zoomBoundLayers[id] = layer;
			this._updateZoomLevels();
		}

		// TODO looks ugly, refactor!!!
		if (this.options.zoomAnimation && L.TileLayer && (layer instanceof L.TileLayer)) {
			this._tileLayersNum++;
			this._tileLayersToLoad++;
			layer.on('load', this._onTileLayerLoad, this);
		}

		if (this._loaded) {
			this._layerAdd(layer);
		}

		return this;
	},

	removeLayer: function (layer) {
		var id = L.stamp(layer);

		if (!this._layers[id]) { return this; }

		if (this._loaded) {
			layer.onRemove(this);
		}

		delete this._layers[id];

		if (this._loaded) {
			this.fire('layerremove', {layer: layer});
		}

		if (this._zoomBoundLayers[id]) {
			delete this._zoomBoundLayers[id];
			this._updateZoomLevels();
		}

		// TODO looks ugly, refactor
		if (this.options.zoomAnimation && L.TileLayer && (layer instanceof L.TileLayer)) {
			this._tileLayersNum--;
			this._tileLayersToLoad--;
			layer.off('load', this._onTileLayerLoad, this);
		}

		return this;
	},

	hasLayer: function (layer) {
		if (!layer) { return false; }

		return (L.stamp(layer) in this._layers);
	},

	eachLayer: function (method, context) {
		for (var i in this._layers) {
			method.call(context, this._layers[i]);
		}
		return this;
	},

	invalidateSize: function (options) {
		if (!this._loaded) { return this; }

		options = L.extend({
			animate: false,
			pan: true
		}, options === true ? {animate: true} : options);

		var oldSize = this.getSize();
		this._sizeChanged = true;
		this._initialCenter = null;

		var newSize = this.getSize(),
		    oldCenter = oldSize.divideBy(2).round(),
		    newCenter = newSize.divideBy(2).round(),
		    offset = oldCenter.subtract(newCenter);

		if (!offset.x && !offset.y) { return this; }

		if (options.animate && options.pan) {
			this.panBy(offset);

		} else {
			if (options.pan) {
				this._rawPanBy(offset);
			}

			this.fire('move');

			if (options.debounceMoveend) {
				clearTimeout(this._sizeTimer);
				this._sizeTimer = setTimeout(L.bind(this.fire, this, 'moveend'), 200);
			} else {
				this.fire('moveend');
			}
		}

		return this.fire('resize', {
			oldSize: oldSize,
			newSize: newSize
		});
	},

	// TODO handler.addTo
	addHandler: function (name, HandlerClass) {
		if (!HandlerClass) { return this; }

		var handler = this[name] = new HandlerClass(this);

		this._handlers.push(handler);

		if (this.options[name]) {
			handler.enable();
		}

		return this;
	},

	remove: function () {
		if (this._loaded) {
			this.fire('unload');
		}

		this._initEvents('off');

		try {
			// throws error in IE6-8
			delete this._container._leaflet;
		} catch (e) {
			this._container._leaflet = undefined;
		}

		this._clearPanes();
		if (this._clearControlPos) {
			this._clearControlPos();
		}

		this._clearHandlers();

		return this;
	},


	// public methods for getting map state

	getCenter: function () { // (Boolean) -> LatLng
		this._checkIfLoaded();

		if (this._initialCenter && !this._moved()) {
			return this._initialCenter;
		}
		return this.layerPointToLatLng(this._getCenterLayerPoint());
	},

	getZoom: function () {
		return this._zoom;
	},

	getBounds: function () {
		var bounds = this.getPixelBounds(),
		    sw = this.unproject(bounds.getBottomLeft()),
		    ne = this.unproject(bounds.getTopRight());

		return new L.LatLngBounds(sw, ne);
	},

	getMinZoom: function () {
		return this.options.minZoom === undefined ?
			(this._layersMinZoom === undefined ? 0 : this._layersMinZoom) :
			this.options.minZoom;
	},

	getMaxZoom: function () {
		return this.options.maxZoom === undefined ?
			(this._layersMaxZoom === undefined ? Infinity : this._layersMaxZoom) :
			this.options.maxZoom;
	},

	getBoundsZoom: function (bounds, inside, padding) { // (LatLngBounds[, Boolean, Point]) -> Number
		bounds = L.latLngBounds(bounds);

		var zoom = this.getMinZoom() - (inside ? 1 : 0),
		    maxZoom = this.getMaxZoom(),
		    size = this.getSize(),

		    nw = bounds.getNorthWest(),
		    se = bounds.getSouthEast(),

		    zoomNotFound = true,
		    boundsSize;

		padding = L.point(padding || [0, 0]);

		do {
			zoom++;
			boundsSize = this.project(se, zoom).subtract(this.project(nw, zoom)).add(padding);
			zoomNotFound = !inside ? size.contains(boundsSize) : boundsSize.x < size.x || boundsSize.y < size.y;

		} while (zoomNotFound && zoom <= maxZoom);

		if (zoomNotFound && inside) {
			return null;
		}

		return inside ? zoom : zoom - 1;
	},

	getSize: function () {
		if (!this._size || this._sizeChanged) {
			this._size = new L.Point(
				this._container.clientWidth,
				this._container.clientHeight);

			this._sizeChanged = false;
		}
		return this._size.clone();
	},

	getPixelBounds: function () {
		var topLeftPoint = this._getTopLeftPoint();
		return new L.Bounds(topLeftPoint, topLeftPoint.add(this.getSize()));
	},

	getPixelOrigin: function () {
		this._checkIfLoaded();
		return this._initialTopLeftPoint;
	},

	getPanes: function () {
		return this._panes;
	},

	getContainer: function () {
		return this._container;
	},


	// TODO replace with universal implementation after refactoring projections

	getZoomScale: function (toZoom) {
		var crs = this.options.crs;
		return crs.scale(toZoom) / crs.scale(this._zoom);
	},

	getScaleZoom: function (scale) {
		return this._zoom + (Math.log(scale) / Math.LN2);
	},


	// conversion methods

	project: function (latlng, zoom) { // (LatLng[, Number]) -> Point
		zoom = zoom === undefined ? this._zoom : zoom;
		return this.options.crs.latLngToPoint(L.latLng(latlng), zoom);
	},

	unproject: function (point, zoom) { // (Point[, Number]) -> LatLng
		zoom = zoom === undefined ? this._zoom : zoom;
		return this.options.crs.pointToLatLng(L.point(point), zoom);
	},

	layerPointToLatLng: function (point) { // (Point)
		var projectedPoint = L.point(point).add(this.getPixelOrigin());
		return this.unproject(projectedPoint);
	},

	latLngToLayerPoint: function (latlng) { // (LatLng)
		var projectedPoint = this.project(L.latLng(latlng))._round();
		return projectedPoint._subtract(this.getPixelOrigin());
	},

	containerPointToLayerPoint: function (point) { // (Point)
		return L.point(point).subtract(this._getMapPanePos());
	},

	layerPointToContainerPoint: function (point) { // (Point)
		return L.point(point).add(this._getMapPanePos());
	},

	containerPointToLatLng: function (point) {
		var layerPoint = this.containerPointToLayerPoint(L.point(point));
		return this.layerPointToLatLng(layerPoint);
	},

	latLngToContainerPoint: function (latlng) {
		return this.layerPointToContainerPoint(this.latLngToLayerPoint(L.latLng(latlng)));
	},

	mouseEventToContainerPoint: function (e) { // (MouseEvent)
		return L.DomEvent.getMousePosition(e, this._container);
	},

	mouseEventToLayerPoint: function (e) { // (MouseEvent)
		return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e));
	},

	mouseEventToLatLng: function (e) { // (MouseEvent)
		return this.layerPointToLatLng(this.mouseEventToLayerPoint(e));
	},


	// map initialization methods

	_initContainer: function (id) {
		var container = this._container = L.DomUtil.get(id);

		if (!container) {
			throw new Error('Map container not found.');
		} else if (container._leaflet) {
			throw new Error('Map container is already initialized.');
		}

		container._leaflet = true;
	},

	_initLayout: function () {
		var container = this._container;

		L.DomUtil.addClass(container, 'leaflet-container' +
			(L.Browser.touch ? ' leaflet-touch' : '') +
			(L.Browser.retina ? ' leaflet-retina' : '') +
			(L.Browser.ielt9 ? ' leaflet-oldie' : '') +
			(this.options.fadeAnimation ? ' leaflet-fade-anim' : ''));

		var position = L.DomUtil.getStyle(container, 'position');

		if (position !== 'absolute' && position !== 'relative' && position !== 'fixed') {
			container.style.position = 'relative';
		}

		this._initPanes();

		if (this._initControlPos) {
			this._initControlPos();
		}
	},

	_initPanes: function () {
		var panes = this._panes = {};

		this._mapPane = panes.mapPane = this._createPane('leaflet-map-pane', this._container);

		this._tilePane = panes.tilePane = this._createPane('leaflet-tile-pane', this._mapPane);
		panes.objectsPane = this._createPane('leaflet-objects-pane', this._mapPane);
		panes.shadowPane = this._createPane('leaflet-shadow-pane');
		panes.overlayPane = this._createPane('leaflet-overlay-pane');
		panes.markerPane = this._createPane('leaflet-marker-pane');
		panes.popupPane = this._createPane('leaflet-popup-pane');

		var zoomHide = ' leaflet-zoom-hide';

		if (!this.options.markerZoomAnimation) {
			L.DomUtil.addClass(panes.markerPane, zoomHide);
			L.DomUtil.addClass(panes.shadowPane, zoomHide);
			L.DomUtil.addClass(panes.popupPane, zoomHide);
		}
	},

	_createPane: function (className, container) {
		return L.DomUtil.create('div', className, container || this._panes.objectsPane);
	},

	_clearPanes: function () {
		this._container.removeChild(this._mapPane);
	},

	_addLayers: function (layers) {
		layers = layers ? (L.Util.isArray(layers) ? layers : [layers]) : [];

		for (var i = 0, len = layers.length; i < len; i++) {
			this.addLayer(layers[i]);
		}
	},


	// private methods that modify map state

	_resetView: function (center, zoom, preserveMapOffset, afterZoomAnim) {

		var zoomChanged = (this._zoom !== zoom);

		if (!afterZoomAnim) {
			this.fire('movestart');

			if (zoomChanged) {
				this.fire('zoomstart');
			}
		}

		this._zoom = zoom;
		this._initialCenter = center;

		this._initialTopLeftPoint = this._getNewTopLeftPoint(center);

		if (!preserveMapOffset) {
			L.DomUtil.setPosition(this._mapPane, new L.Point(0, 0));
		} else {
			this._initialTopLeftPoint._add(this._getMapPanePos());
		}

		this._tileLayersToLoad = this._tileLayersNum;

		var loading = !this._loaded;
		this._loaded = true;

		this.fire('viewreset', {hard: !preserveMapOffset});

		if (loading) {
			this.fire('load');
			this.eachLayer(this._layerAdd, this);
		}

		this.fire('move');

		if (zoomChanged || afterZoomAnim) {
			this.fire('zoomend');
		}

		this.fire('moveend', {hard: !preserveMapOffset});
	},

	_rawPanBy: function (offset) {
		L.DomUtil.setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
	},

	_getZoomSpan: function () {
		return this.getMaxZoom() - this.getMinZoom();
	},

	_updateZoomLevels: function () {
		var i,
			minZoom = Infinity,
			maxZoom = -Infinity,
			oldZoomSpan = this._getZoomSpan();

		for (i in this._zoomBoundLayers) {
			var layer = this._zoomBoundLayers[i];
			if (!isNaN(layer.options.minZoom)) {
				minZoom = Math.min(minZoom, layer.options.minZoom);
			}
			if (!isNaN(layer.options.maxZoom)) {
				maxZoom = Math.max(maxZoom, layer.options.maxZoom);
			}
		}

		if (i === undefined) { // we have no tilelayers
			this._layersMaxZoom = this._layersMinZoom = undefined;
		} else {
			this._layersMaxZoom = maxZoom;
			this._layersMinZoom = minZoom;
		}

		if (oldZoomSpan !== this._getZoomSpan()) {
			this.fire('zoomlevelschange');
		}
	},

	_panInsideMaxBounds: function () {
		this.panInsideBounds(this.options.maxBounds);
	},

	_checkIfLoaded: function () {
		if (!this._loaded) {
			throw new Error('Set map center and zoom first.');
		}
	},

	// map events

	_initEvents: function (onOff) {
		if (!L.DomEvent) { return; }

		onOff = onOff || 'on';

		L.DomEvent[onOff](this._container, 'click', this._onMouseClick, this);

		var events = ['dblclick', 'mousedown', 'mouseup', 'mouseenter',
		              'mouseleave', 'mousemove', 'contextmenu'],
		    i, len;

		for (i = 0, len = events.length; i < len; i++) {
			L.DomEvent[onOff](this._container, events[i], this._fireMouseEvent, this);
		}

		if (this.options.trackResize) {
			L.DomEvent[onOff](window, 'resize', this._onResize, this);
		}
	},

	_onResize: function () {
		L.Util.cancelAnimFrame(this._resizeRequest);
		this._resizeRequest = L.Util.requestAnimFrame(
		        function () { this.invalidateSize({debounceMoveend: true}); }, this, false, this._container);
	},

	_onMouseClick: function (e) {
		if (!this._loaded || (!e._simulated &&
		        ((this.dragging && this.dragging.moved()) ||
		         (this.boxZoom  && this.boxZoom.moved()))) ||
		            L.DomEvent._skipped(e)) { return; }

		this.fire('preclick');
		this._fireMouseEvent(e);
	},

	_fireMouseEvent: function (e) {
		if (!this._loaded || L.DomEvent._skipped(e)) { return; }

		var type = e.type;

		type = (type === 'mouseenter' ? 'mouseover' : (type === 'mouseleave' ? 'mouseout' : type));

		if (!this.hasEventListeners(type)) { return; }

		if (type === 'contextmenu') {
			L.DomEvent.preventDefault(e);
		}

		var containerPoint = this.mouseEventToContainerPoint(e),
		    layerPoint = this.containerPointToLayerPoint(containerPoint),
		    latlng = this.layerPointToLatLng(layerPoint);

		this.fire(type, {
			latlng: latlng,
			layerPoint: layerPoint,
			containerPoint: containerPoint,
			originalEvent: e
		});
	},

	_onTileLayerLoad: function () {
		this._tileLayersToLoad--;
		if (this._tileLayersNum && !this._tileLayersToLoad) {
			this.fire('tilelayersload');
		}
	},

	_clearHandlers: function () {
		for (var i = 0, len = this._handlers.length; i < len; i++) {
			this._handlers[i].disable();
		}
	},

	whenReady: function (callback, context) {
		if (this._loaded) {
			callback.call(context || this, this);
		} else {
			this.on('load', callback, context);
		}
		return this;
	},

	_layerAdd: function (layer) {
		layer.onAdd(this);
		this.fire('layeradd', {layer: layer});
	},


	// private methods for getting map state

	_getMapPanePos: function () {
		return L.DomUtil.getPosition(this._mapPane);
	},

	_moved: function () {
		var pos = this._getMapPanePos();
		return pos && !pos.equals([0, 0]);
	},

	_getTopLeftPoint: function () {
		return this.getPixelOrigin().subtract(this._getMapPanePos());
	},

	_getNewTopLeftPoint: function (center, zoom) {
		var viewHalf = this.getSize()._divideBy(2);
		// TODO round on display, not calculation to increase precision?
		return this.project(center, zoom)._subtract(viewHalf)._round();
	},

	_latLngToNewLayerPoint: function (latlng, newZoom, newCenter) {
		var topLeft = this._getNewTopLeftPoint(newCenter, newZoom).add(this._getMapPanePos());
		return this.project(latlng, newZoom)._subtract(topLeft);
	},

	// layer point of the current center
	_getCenterLayerPoint: function () {
		return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
	},

	// offset of the specified place to the current center in pixels
	_getCenterOffset: function (latlng) {
		return this.latLngToLayerPoint(latlng).subtract(this._getCenterLayerPoint());
	},

	// adjust center for view to get inside bounds
	_limitCenter: function (center, zoom, bounds) {

		if (!bounds) { return center; }

		var centerPoint = this.project(center, zoom),
		    viewHalf = this.getSize().divideBy(2),
		    viewBounds = new L.Bounds(centerPoint.subtract(viewHalf), centerPoint.add(viewHalf)),
		    offset = this._getBoundsOffset(viewBounds, bounds, zoom);

		return this.unproject(centerPoint.add(offset), zoom);
	},

	// adjust offset for view to get inside bounds
	_limitOffset: function (offset, bounds) {
		if (!bounds) { return offset; }

		var viewBounds = this.getPixelBounds(),
		    newBounds = new L.Bounds(viewBounds.min.add(offset), viewBounds.max.add(offset));

		return offset.add(this._getBoundsOffset(newBounds, bounds));
	},

	// returns offset needed for pxBounds to get inside maxBounds at a specified zoom
	_getBoundsOffset: function (pxBounds, maxBounds, zoom) {
		var nwOffset = this.project(maxBounds.getNorthWest(), zoom).subtract(pxBounds.min),
		    seOffset = this.project(maxBounds.getSouthEast(), zoom).subtract(pxBounds.max),

		    dx = this._rebound(nwOffset.x, -seOffset.x),
		    dy = this._rebound(nwOffset.y, -seOffset.y);

		return new L.Point(dx, dy);
	},

	_rebound: function (left, right) {
		return left + right > 0 ?
			Math.round(left - right) / 2 :
			Math.max(0, Math.ceil(left)) - Math.max(0, Math.floor(right));
	},

	_limitZoom: function (zoom) {
		var min = this.getMinZoom(),
		    max = this.getMaxZoom();

		return Math.max(min, Math.min(max, zoom));
	}
});

L.map = function (id, options) {
	return new L.Map(id, options);
};


/*
 * Mercator projection that takes into account that the Earth is not a perfect sphere.
 * Less popular than spherical mercator; used by projections like EPSG:3395.
 */

L.Projection.Mercator = {
	MAX_LATITUDE: 85.0840591556,

	R_MINOR: 6356752.314245179,
	R_MAJOR: 6378137,

	project: function (latlng) { // (LatLng) -> Point
		var d = L.LatLng.DEG_TO_RAD,
		    max = this.MAX_LATITUDE,
		    lat = Math.max(Math.min(max, latlng.lat), -max),
		    r = this.R_MAJOR,
		    r2 = this.R_MINOR,
		    x = latlng.lng * d * r,
		    y = lat * d,
		    tmp = r2 / r,
		    eccent = Math.sqrt(1.0 - tmp * tmp),
		    con = eccent * Math.sin(y);

		con = Math.pow((1 - con) / (1 + con), eccent * 0.5);

		var ts = Math.tan(0.5 * ((Math.PI * 0.5) - y)) / con;
		y = -r * Math.log(ts);

		return new L.Point(x, y);
	},

	unproject: function (point) { // (Point, Boolean) -> LatLng
		var d = L.LatLng.RAD_TO_DEG,
		    r = this.R_MAJOR,
		    r2 = this.R_MINOR,
		    lng = point.x * d / r,
		    tmp = r2 / r,
		    eccent = Math.sqrt(1 - (tmp * tmp)),
		    ts = Math.exp(- point.y / r),
		    phi = (Math.PI / 2) - 2 * Math.atan(ts),
		    numIter = 15,
		    tol = 1e-7,
		    i = numIter,
		    dphi = 0.1,
		    con;

		while ((Math.abs(dphi) > tol) && (--i > 0)) {
			con = eccent * Math.sin(phi);
			dphi = (Math.PI / 2) - 2 * Math.atan(ts *
			            Math.pow((1.0 - con) / (1.0 + con), 0.5 * eccent)) - phi;
			phi += dphi;
		}

		return new L.LatLng(phi * d, lng);
	}
};



L.CRS.EPSG3395 = L.extend({}, L.CRS, {
	code: 'EPSG:3395',

	projection: L.Projection.Mercator,

	transformation: (function () {
		var m = L.Projection.Mercator,
		    r = m.R_MAJOR,
		    scale = 0.5 / (Math.PI * r);

		return new L.Transformation(scale, 0.5, -scale, 0.5);
	}())
});


/*
 * L.TileLayer is used for standard xyz-numbered tile layers.
 */

L.TileLayer = L.Class.extend({
	includes: L.Mixin.Events,

	options: {
		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,
		subdomains: 'abc',
		errorTileUrl: '',
		attribution: '',
		zoomOffset: 0,
		opacity: 1,
		/*
		maxNativeZoom: null,
		zIndex: null,
		tms: false,
		continuousWorld: false,
		noWrap: false,
		zoomReverse: false,
		detectRetina: false,
		reuseTiles: false,
		bounds: false,
		*/
		unloadInvisibleTiles: L.Browser.mobile,
		updateWhenIdle: L.Browser.mobile
	},

	initialize: function (url, options) {
		options = L.setOptions(this, options);

		// detecting retina displays, adjusting tileSize and zoom levels
		if (options.detectRetina && L.Browser.retina && options.maxZoom > 0) {

			options.tileSize = Math.floor(options.tileSize / 2);
			options.zoomOffset++;

			if (options.minZoom > 0) {
				options.minZoom--;
			}
			this.options.maxZoom--;
		}

		if (options.bounds) {
			options.bounds = L.latLngBounds(options.bounds);
		}

		this._url = url;

		var subdomains = this.options.subdomains;

		if (typeof subdomains === 'string') {
			this.options.subdomains = subdomains.split('');
		}
	},

	onAdd: function (map) {
		this._map = map;
		this._animated = map._zoomAnimated;

		// create a container div for tiles
		this._initContainer();

		// set up events
		map.on({
			'viewreset': this._reset,
			'moveend': this._update
		}, this);

		if (this._animated) {
			map.on({
				'zoomanim': this._animateZoom,
				'zoomend': this._endZoomAnim
			}, this);
		}

		if (!this.options.updateWhenIdle) {
			this._limitedUpdate = L.Util.limitExecByInterval(this._update, 150, this);
			map.on('move', this._limitedUpdate, this);
		}

		this._reset();
		this._update();
	},

	addTo: function (map) {
		map.addLayer(this);
		return this;
	},

	onRemove: function (map) {
		this._container.parentNode.removeChild(this._container);

		map.off({
			'viewreset': this._reset,
			'moveend': this._update
		}, this);

		if (this._animated) {
			map.off({
				'zoomanim': this._animateZoom,
				'zoomend': this._endZoomAnim
			}, this);
		}

		if (!this.options.updateWhenIdle) {
			map.off('move', this._limitedUpdate, this);
		}

		this._container = null;
		this._map = null;
	},

	bringToFront: function () {
		var pane = this._map._panes.tilePane;

		if (this._container) {
			pane.appendChild(this._container);
			this._setAutoZIndex(pane, Math.max);
		}

		return this;
	},

	bringToBack: function () {
		var pane = this._map._panes.tilePane;

		if (this._container) {
			pane.insertBefore(this._container, pane.firstChild);
			this._setAutoZIndex(pane, Math.min);
		}

		return this;
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	getContainer: function () {
		return this._container;
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;

		if (this._map) {
			this._updateOpacity();
		}

		return this;
	},

	setZIndex: function (zIndex) {
		this.options.zIndex = zIndex;
		this._updateZIndex();

		return this;
	},

	setUrl: function (url, noRedraw) {
		this._url = url;

		if (!noRedraw) {
			this.redraw();
		}

		return this;
	},

	redraw: function () {
		if (this._map) {
			this._reset({hard: true});
			this._update();
		}
		return this;
	},

	_updateZIndex: function () {
		if (this._container && this.options.zIndex !== undefined) {
			this._container.style.zIndex = this.options.zIndex;
		}
	},

	_setAutoZIndex: function (pane, compare) {

		var layers = pane.children,
		    edgeZIndex = -compare(Infinity, -Infinity), // -Infinity for max, Infinity for min
		    zIndex, i, len;

		for (i = 0, len = layers.length; i < len; i++) {

			if (layers[i] !== this._container) {
				zIndex = parseInt(layers[i].style.zIndex, 10);

				if (!isNaN(zIndex)) {
					edgeZIndex = compare(edgeZIndex, zIndex);
				}
			}
		}

		this.options.zIndex = this._container.style.zIndex =
		        (isFinite(edgeZIndex) ? edgeZIndex : 0) + compare(1, -1);
	},

	_updateOpacity: function () {
		var i,
		    tiles = this._tiles;

		if (L.Browser.ielt9) {
			for (i in tiles) {
				L.DomUtil.setOpacity(tiles[i], this.options.opacity);
			}
		} else {
			L.DomUtil.setOpacity(this._container, this.options.opacity);
		}
	},

	_initContainer: function () {
		var tilePane = this._map._panes.tilePane;

		if (!this._container) {
			this._container = L.DomUtil.create('div', 'leaflet-layer');

			this._updateZIndex();

			if (this._animated) {
				var className = 'leaflet-tile-container';

				this._bgBuffer = L.DomUtil.create('div', className, this._container);
				this._tileContainer = L.DomUtil.create('div', className, this._container);

			} else {
				this._tileContainer = this._container;
			}

			tilePane.appendChild(this._container);

			if (this.options.opacity < 1) {
				this._updateOpacity();
			}
		}
	},

	_reset: function (e) {
		for (var key in this._tiles) {
			this.fire('tileunload', {tile: this._tiles[key]});
		}

		this._tiles = {};
		this._tilesToLoad = 0;

		if (this.options.reuseTiles) {
			this._unusedTiles = [];
		}

		this._tileContainer.innerHTML = '';

		if (this._animated && e && e.hard) {
			this._clearBgBuffer();
		}

		this._initContainer();
	},

	_getTileSize: function () {
		var map = this._map,
		    zoom = map.getZoom() + this.options.zoomOffset,
		    zoomN = this.options.maxNativeZoom,
		    tileSize = this.options.tileSize;

		if (zoomN && zoom > zoomN) {
			tileSize = Math.round(map.getZoomScale(zoom) / map.getZoomScale(zoomN) * tileSize);
		}

		return tileSize;
	},

	_update: function () {

		if (!this._map) { return; }

		var map = this._map,
		    bounds = map.getPixelBounds(),
		    zoom = map.getZoom(),
		    tileSize = this._getTileSize();

		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
			return;
		}

		var tileBounds = L.bounds(
		        bounds.min.divideBy(tileSize)._floor(),
		        bounds.max.divideBy(tileSize)._floor());

		this._addTilesFromCenterOut(tileBounds);

		if (this.options.unloadInvisibleTiles || this.options.reuseTiles) {
			this._removeOtherTiles(tileBounds);
		}
	},

	_addTilesFromCenterOut: function (bounds) {
		var queue = [],
		    center = bounds.getCenter();

		var j, i, point;

		for (j = bounds.min.y; j <= bounds.max.y; j++) {
			for (i = bounds.min.x; i <= bounds.max.x; i++) {
				point = new L.Point(i, j);

				if (this._tileShouldBeLoaded(point)) {
					queue.push(point);
				}
			}
		}

		var tilesToLoad = queue.length;

		if (tilesToLoad === 0) { return; }

		// load tiles in order of their distance to center
		queue.sort(function (a, b) {
			return a.distanceTo(center) - b.distanceTo(center);
		});

		var fragment = document.createDocumentFragment();

		// if its the first batch of tiles to load
		if (!this._tilesToLoad) {
			this.fire('loading');
		}

		this._tilesToLoad += tilesToLoad;

		for (i = 0; i < tilesToLoad; i++) {
			this._addTile(queue[i], fragment);
		}

		this._tileContainer.appendChild(fragment);
	},

	_tileShouldBeLoaded: function (tilePoint) {
		if ((tilePoint.x + ':' + tilePoint.y) in this._tiles) {
			return false; // already loaded
		}

		var options = this.options;

		if (!options.continuousWorld) {
			var limit = this._getWrapTileNum();

			// don't load if exceeds world bounds
			if ((options.noWrap && (tilePoint.x < 0 || tilePoint.x >= limit.x)) ||
				tilePoint.y < 0 || tilePoint.y >= limit.y) { return false; }
		}

		if (options.bounds) {
			var tileSize = this._getTileSize(),
			    nwPoint = tilePoint.multiplyBy(tileSize),
			    sePoint = nwPoint.add([tileSize, tileSize]),
			    nw = this._map.unproject(nwPoint),
			    se = this._map.unproject(sePoint);

			// TODO temporary hack, will be removed after refactoring projections
			// https://github.com/Leaflet/Leaflet/issues/1618
			if (!options.continuousWorld && !options.noWrap) {
				nw = nw.wrap();
				se = se.wrap();
			}

			if (!options.bounds.intersects([nw, se])) { return false; }
		}

		return true;
	},

	_removeOtherTiles: function (bounds) {
		var kArr, x, y, key;

		for (key in this._tiles) {
			kArr = key.split(':');
			x = parseInt(kArr[0], 10);
			y = parseInt(kArr[1], 10);

			// remove tile if it's out of bounds
			if (x < bounds.min.x || x > bounds.max.x || y < bounds.min.y || y > bounds.max.y) {
				this._removeTile(key);
			}
		}
	},

	_removeTile: function (key) {
		var tile = this._tiles[key];

		this.fire('tileunload', {tile: tile, url: tile.src});

		if (this.options.reuseTiles) {
			L.DomUtil.removeClass(tile, 'leaflet-tile-loaded');
			this._unusedTiles.push(tile);

		} else if (tile.parentNode === this._tileContainer) {
			this._tileContainer.removeChild(tile);
		}

		// for https://github.com/CloudMade/Leaflet/issues/137
		if (!L.Browser.android) {
			tile.onload = null;
			tile.src = L.Util.emptyImageUrl;
		}

		delete this._tiles[key];
	},

	_addTile: function (tilePoint, container) {
		var tilePos = this._getTilePos(tilePoint);

		// get unused tile - or create a new tile
		var tile = this._getTile();

		/*
		Chrome 20 layouts much faster with top/left (verify with timeline, frames)
		Android 4 browser has display issues with top/left and requires transform instead
		(other browsers don't currently care) - see debug/hacks/jitter.html for an example
		*/
		L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome);

		this._tiles[tilePoint.x + ':' + tilePoint.y] = tile;

		this._loadTile(tile, tilePoint);

		if (tile.parentNode !== this._tileContainer) {
			container.appendChild(tile);
		}
	},

	_getZoomForUrl: function () {

		var options = this.options,
		    zoom = this._map.getZoom();

		if (options.zoomReverse) {
			zoom = options.maxZoom - zoom;
		}

		zoom += options.zoomOffset;

		return options.maxNativeZoom ? Math.min(zoom, options.maxNativeZoom) : zoom;
	},

	_getTilePos: function (tilePoint) {
		var origin = this._map.getPixelOrigin(),
		    tileSize = this._getTileSize();

		return tilePoint.multiplyBy(tileSize).subtract(origin);
	},

	// image-specific code (override to implement e.g. Canvas or SVG tile layer)

	getTileUrl: function (tilePoint) {
		return L.Util.template(this._url, L.extend({
			s: this._getSubdomain(tilePoint),
			z: tilePoint.z,
			x: tilePoint.x,
			y: tilePoint.y
		}, this.options));
	},

	_getWrapTileNum: function () {
		var crs = this._map.options.crs,
		    size = crs.getSize(this._map.getZoom());
		return size.divideBy(this._getTileSize())._floor();
	},

	_adjustTilePoint: function (tilePoint) {

		var limit = this._getWrapTileNum();

		// wrap tile coordinates
		if (!this.options.continuousWorld && !this.options.noWrap) {
			tilePoint.x = ((tilePoint.x % limit.x) + limit.x) % limit.x;
		}

		if (this.options.tms) {
			tilePoint.y = limit.y - tilePoint.y - 1;
		}

		tilePoint.z = this._getZoomForUrl();
	},

	_getSubdomain: function (tilePoint) {
		var index = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
		return this.options.subdomains[index];
	},

	_getTile: function () {
		if (this.options.reuseTiles && this._unusedTiles.length > 0) {
			var tile = this._unusedTiles.pop();
			this._resetTile(tile);
			return tile;
		}
		return this._createTile();
	},

	// Override if data stored on a tile needs to be cleaned up before reuse
	_resetTile: function (/*tile*/) {},

	_createTile: function () {
		var tile = L.DomUtil.create('img', 'leaflet-tile');
		tile.style.width = tile.style.height = this._getTileSize() + 'px';
		tile.galleryimg = 'no';

		tile.onselectstart = tile.onmousemove = L.Util.falseFn;

		if (L.Browser.ielt9 && this.options.opacity !== undefined) {
			L.DomUtil.setOpacity(tile, this.options.opacity);
		}
		// without this hack, tiles disappear after zoom on Chrome for Android
		// https://github.com/Leaflet/Leaflet/issues/2078
		if (L.Browser.mobileWebkit3d) {
			tile.style.WebkitBackfaceVisibility = 'hidden';
		}
		return tile;
	},

	_loadTile: function (tile, tilePoint) {
		tile._layer  = this;
		tile.onload  = this._tileOnLoad;
		tile.onerror = this._tileOnError;

		this._adjustTilePoint(tilePoint);
		tile.src     = this.getTileUrl(tilePoint);

		this.fire('tileloadstart', {
			tile: tile,
			url: tile.src
		});
	},

	_tileLoaded: function () {
		this._tilesToLoad--;

		if (this._animated) {
			L.DomUtil.addClass(this._tileContainer, 'leaflet-zoom-animated');
		}

		if (!this._tilesToLoad) {
			this.fire('load');

			if (this._animated) {
				// clear scaled tiles after all new tiles are loaded (for performance)
				clearTimeout(this._clearBgBufferTimer);
				this._clearBgBufferTimer = setTimeout(L.bind(this._clearBgBuffer, this), 500);
			}
		}
	},

	_tileOnLoad: function () {
		var layer = this._layer;

		//Only if we are loading an actual image
		if (this.src !== L.Util.emptyImageUrl) {
			L.DomUtil.addClass(this, 'leaflet-tile-loaded');

			layer.fire('tileload', {
				tile: this,
				url: this.src
			});
		}

		layer._tileLoaded();
	},

	_tileOnError: function () {
		var layer = this._layer;

		layer.fire('tileerror', {
			tile: this,
			url: this.src
		});

		var newUrl = layer.options.errorTileUrl;
		if (newUrl) {
			this.src = newUrl;
		}

		layer._tileLoaded();
	}
});

L.tileLayer = function (url, options) {
	return new L.TileLayer(url, options);
};


/*
 * L.TileLayer.WMS is used for putting WMS tile layers on the map.
 */

L.TileLayer.WMS = L.TileLayer.extend({

	defaultWmsParams: {
		service: 'WMS',
		request: 'GetMap',
		version: '1.1.1',
		layers: '',
		styles: '',
		format: 'image/jpeg',
		transparent: false
	},

	initialize: function (url, options) { // (String, Object)

		this._url = url;

		var wmsParams = L.extend({}, this.defaultWmsParams),
		    tileSize = options.tileSize || this.options.tileSize;

		if (options.detectRetina && L.Browser.retina) {
			wmsParams.width = wmsParams.height = tileSize * 2;
		} else {
			wmsParams.width = wmsParams.height = tileSize;
		}

		for (var i in options) {
			// all keys that are not TileLayer options go to WMS params
			if (!this.options.hasOwnProperty(i) && i !== 'crs') {
				wmsParams[i] = options[i];
			}
		}

		this.wmsParams = wmsParams;

		L.setOptions(this, options);
	},

	onAdd: function (map) {

		this._crs = this.options.crs || map.options.crs;

		this._wmsVersion = parseFloat(this.wmsParams.version);

		var projectionKey = this._wmsVersion >= 1.3 ? 'crs' : 'srs';
		this.wmsParams[projectionKey] = this._crs.code;

		L.TileLayer.prototype.onAdd.call(this, map);
	},

	getTileUrl: function (tilePoint) { // (Point, Number) -> String

		var map = this._map,
		    tileSize = this.options.tileSize,

		    nwPoint = tilePoint.multiplyBy(tileSize),
		    sePoint = nwPoint.add([tileSize, tileSize]),

		    nw = this._crs.project(map.unproject(nwPoint, tilePoint.z)),
		    se = this._crs.project(map.unproject(sePoint, tilePoint.z)),
		    bbox = this._wmsVersion >= 1.3 && this._crs === L.CRS.EPSG4326 ?
		        [se.y, nw.x, nw.y, se.x].join(',') :
		        [nw.x, se.y, se.x, nw.y].join(','),

		    url = L.Util.template(this._url, {s: this._getSubdomain(tilePoint)});

		return url + L.Util.getParamString(this.wmsParams, url, true) + '&BBOX=' + bbox;
	},

	setParams: function (params, noRedraw) {

		L.extend(this.wmsParams, params);

		if (!noRedraw) {
			this.redraw();
		}

		return this;
	}
});

L.tileLayer.wms = function (url, options) {
	return new L.TileLayer.WMS(url, options);
};


/*
 * L.TileLayer.Canvas is a class that you can use as a base for creating
 * dynamically drawn Canvas-based tile layers.
 */

L.TileLayer.Canvas = L.TileLayer.extend({
	options: {
		async: false
	},

	initialize: function (options) {
		L.setOptions(this, options);
	},

	redraw: function () {
		if (this._map) {
			this._reset({hard: true});
			this._update();
		}

		for (var i in this._tiles) {
			this._redrawTile(this._tiles[i]);
		}
		return this;
	},

	_redrawTile: function (tile) {
		this.drawTile(tile, tile._tilePoint, this._map._zoom);
	},

	_createTile: function () {
		var tile = L.DomUtil.create('canvas', 'leaflet-tile');
		tile.width = tile.height = this.options.tileSize;
		tile.onselectstart = tile.onmousemove = L.Util.falseFn;
		return tile;
	},

	_loadTile: function (tile, tilePoint) {
		tile._layer = this;
		tile._tilePoint = tilePoint;

		this._redrawTile(tile);

		if (!this.options.async) {
			this.tileDrawn(tile);
		}
	},

	drawTile: function (/*tile, tilePoint*/) {
		// override with rendering code
	},

	tileDrawn: function (tile) {
		this._tileOnLoad.call(tile);
	}
});


L.tileLayer.canvas = function (options) {
	return new L.TileLayer.Canvas(options);
};


/*
 * L.ImageOverlay is used to overlay images over the map (to specific geographical bounds).
 */

L.ImageOverlay = L.Class.extend({
	includes: L.Mixin.Events,

	options: {
		opacity: 1
	},

	initialize: function (url, bounds, options) { // (String, LatLngBounds, Object)
		this._url = url;
		this._bounds = L.latLngBounds(bounds);

		L.setOptions(this, options);
	},

	onAdd: function (map) {
		this._map = map;

		if (!this._image) {
			this._initImage();
		}

		map._panes.overlayPane.appendChild(this._image);

		map.on('viewreset', this._reset, this);

		if (map.options.zoomAnimation && L.Browser.any3d) {
			map.on('zoomanim', this._animateZoom, this);
		}

		this._reset();
	},

	onRemove: function (map) {
		map.getPanes().overlayPane.removeChild(this._image);

		map.off('viewreset', this._reset, this);

		if (map.options.zoomAnimation) {
			map.off('zoomanim', this._animateZoom, this);
		}
	},

	addTo: function (map) {
		map.addLayer(this);
		return this;
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;
		this._updateOpacity();
		return this;
	},

	// TODO remove bringToFront/bringToBack duplication from TileLayer/Path
	bringToFront: function () {
		if (this._image) {
			this._map._panes.overlayPane.appendChild(this._image);
		}
		return this;
	},

	bringToBack: function () {
		var pane = this._map._panes.overlayPane;
		if (this._image) {
			pane.insertBefore(this._image, pane.firstChild);
		}
		return this;
	},

	setUrl: function (url) {
		this._url = url;
		this._image.src = this._url;
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	_initImage: function () {
		this._image = L.DomUtil.create('img', 'leaflet-image-layer');

		if (this._map.options.zoomAnimation && L.Browser.any3d) {
			L.DomUtil.addClass(this._image, 'leaflet-zoom-animated');
		} else {
			L.DomUtil.addClass(this._image, 'leaflet-zoom-hide');
		}

		this._updateOpacity();

		//TODO createImage util method to remove duplication
		L.extend(this._image, {
			galleryimg: 'no',
			onselectstart: L.Util.falseFn,
			onmousemove: L.Util.falseFn,
			onload: L.bind(this._onImageLoad, this),
			src: this._url
		});
	},

	_animateZoom: function (e) {
		var map = this._map,
		    image = this._image,
		    scale = map.getZoomScale(e.zoom),
		    nw = this._bounds.getNorthWest(),
		    se = this._bounds.getSouthEast(),

		    topLeft = map._latLngToNewLayerPoint(nw, e.zoom, e.center),
		    size = map._latLngToNewLayerPoint(se, e.zoom, e.center)._subtract(topLeft),
		    origin = topLeft._add(size._multiplyBy((1 / 2) * (1 - 1 / scale)));

		image.style[L.DomUtil.TRANSFORM] =
		        L.DomUtil.getTranslateString(origin) + ' scale(' + scale + ') ';
	},

	_reset: function () {
		var image   = this._image,
		    topLeft = this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
		    size = this._map.latLngToLayerPoint(this._bounds.getSouthEast())._subtract(topLeft);

		L.DomUtil.setPosition(image, topLeft);

		image.style.width  = size.x + 'px';
		image.style.height = size.y + 'px';
	},

	_onImageLoad: function () {
		this.fire('load');
	},

	_updateOpacity: function () {
		L.DomUtil.setOpacity(this._image, this.options.opacity);
	}
});

L.imageOverlay = function (url, bounds, options) {
	return new L.ImageOverlay(url, bounds, options);
};


/*
 * L.Icon is an image-based icon class that you can use with L.Marker for custom markers.
 */

L.Icon = L.Class.extend({
	options: {
		/*
		iconUrl: (String) (required)
		iconRetinaUrl: (String) (optional, used for retina devices if detected)
		iconSize: (Point) (can be set through CSS)
		iconAnchor: (Point) (centered by default, can be set in CSS with negative margins)
		popupAnchor: (Point) (if not specified, popup opens in the anchor point)
		shadowUrl: (String) (no shadow by default)
		shadowRetinaUrl: (String) (optional, used for retina devices if detected)
		shadowSize: (Point)
		shadowAnchor: (Point)
		*/
		className: ''
	},

	initialize: function (options) {
		L.setOptions(this, options);
	},

	createIcon: function (oldIcon) {
		return this._createIcon('icon', oldIcon);
	},

	createShadow: function (oldIcon) {
		return this._createIcon('shadow', oldIcon);
	},

	_createIcon: function (name, oldIcon) {
		var src = this._getIconUrl(name);

		if (!src) {
			if (name === 'icon') {
				throw new Error('iconUrl not set in Icon options (see the docs).');
			}
			return null;
		}

		var img;
		if (!oldIcon || oldIcon.tagName !== 'IMG') {
			img = this._createImg(src);
		} else {
			img = this._createImg(src, oldIcon);
		}
		this._setIconStyles(img, name);

		return img;
	},

	_setIconStyles: function (img, name) {
		var options = this.options,
		    size = L.point(options[name + 'Size']),
		    anchor;

		if (name === 'shadow') {
			anchor = L.point(options.shadowAnchor || options.iconAnchor);
		} else {
			anchor = L.point(options.iconAnchor);
		}

		if (!anchor && size) {
			anchor = size.divideBy(2, true);
		}

		img.className = 'leaflet-marker-' + name + ' ' + options.className;

		if (anchor) {
			img.style.marginLeft = (-anchor.x) + 'px';
			img.style.marginTop  = (-anchor.y) + 'px';
		}

		if (size) {
			img.style.width  = size.x + 'px';
			img.style.height = size.y + 'px';
		}
	},

	_createImg: function (src, el) {
		el = el || document.createElement('img');
		el.src = src;
		return el;
	},

	_getIconUrl: function (name) {
		if (L.Browser.retina && this.options[name + 'RetinaUrl']) {
			return this.options[name + 'RetinaUrl'];
		}
		return this.options[name + 'Url'];
	}
});

L.icon = function (options) {
	return new L.Icon(options);
};


/*
 * L.Icon.Default is the blue marker icon used by default in Leaflet.
 */

L.Icon.Default = L.Icon.extend({

	options: {
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],

		shadowSize: [41, 41]
	},

	_getIconUrl: function (name) {
		var key = name + 'Url';

		if (this.options[key]) {
			return this.options[key];
		}

		if (L.Browser.retina && name === 'icon') {
			name += '-2x';
		}

		var path = L.Icon.Default.imagePath;

		if (!path) {
			throw new Error('Couldn\'t autodetect L.Icon.Default.imagePath, set it manually.');
		}

		return path + '/marker-' + name + '.png';
	}
});

L.Icon.Default.imagePath = (function () {
	var scripts = document.getElementsByTagName('script'),
	    leafletRe = /[\/^]leaflet[\-\._]?([\w\-\._]*)\.js\??/;

	var i, len, src, matches, path;

	for (i = 0, len = scripts.length; i < len; i++) {
		src = scripts[i].src;
		matches = src.match(leafletRe);

		if (matches) {
			path = src.split(leafletRe)[0];
			return (path ? path + '/' : '') + 'images';
		}
	}
}());


/*
 * L.Marker is used to display clickable/draggable icons on the map.
 */

L.Marker = L.Class.extend({

	includes: L.Mixin.Events,

	options: {
		icon: new L.Icon.Default(),
		title: '',
		alt: '',
		clickable: true,
		draggable: false,
		keyboard: true,
		zIndexOffset: 0,
		opacity: 1,
		riseOnHover: false,
		riseOffset: 250
	},

	initialize: function (latlng, options) {
		L.setOptions(this, options);
		this._latlng = L.latLng(latlng);
	},

	onAdd: function (map) {
		this._map = map;

		map.on('viewreset', this.update, this);

		this._initIcon();
		this.update();
		this.fire('add');

		if (map.options.zoomAnimation && map.options.markerZoomAnimation) {
			map.on('zoomanim', this._animateZoom, this);
		}
	},

	addTo: function (map) {
		map.addLayer(this);
		return this;
	},

	onRemove: function (map) {
		if (this.dragging) {
			this.dragging.disable();
		}

		this._removeIcon();
		this._removeShadow();

		this.fire('remove');

		map.off({
			'viewreset': this.update,
			'zoomanim': this._animateZoom
		}, this);

		this._map = null;
	},

	getLatLng: function () {
		return this._latlng;
	},

	setLatLng: function (latlng) {
		this._latlng = L.latLng(latlng);

		this.update();

		return this.fire('move', { latlng: this._latlng });
	},

	setZIndexOffset: function (offset) {
		this.options.zIndexOffset = offset;
		this.update();

		return this;
	},

	setIcon: function (icon) {

		this.options.icon = icon;

		if (this._map) {
			this._initIcon();
			this.update();
		}

		if (this._popup) {
			this.bindPopup(this._popup);
		}

		return this;
	},

	update: function () {
		if (this._icon) {
			this._setPos(this._map.latLngToLayerPoint(this._latlng).round());
		}
		return this;
	},

	_initIcon: function () {
		var options = this.options,
		    map = this._map,
		    animation = (map.options.zoomAnimation && map.options.markerZoomAnimation),
		    classToAdd = animation ? 'leaflet-zoom-animated' : 'leaflet-zoom-hide';

		var icon = options.icon.createIcon(this._icon),
			addIcon = false;

		// if we're not reusing the icon, remove the old one and init new one
		if (icon !== this._icon) {
			if (this._icon) {
				this._removeIcon();
			}
			addIcon = true;

			if (options.title) {
				icon.title = options.title;
			}

			if (options.alt) {
				icon.alt = options.alt;
			}
		}

		L.DomUtil.addClass(icon, classToAdd);

		if (options.keyboard) {
			icon.tabIndex = '0';
		}

		this._icon = icon;

		this._initInteraction();

		if (options.riseOnHover) {
			L.DomEvent
				.on(icon, 'mouseover', this._bringToFront, this)
				.on(icon, 'mouseout', this._resetZIndex, this);
		}

		var newShadow = options.icon.createShadow(this._shadow),
			addShadow = false;

		if (newShadow !== this._shadow) {
			this._removeShadow();
			addShadow = true;
		}

		if (newShadow) {
			L.DomUtil.addClass(newShadow, classToAdd);
		}
		this._shadow = newShadow;


		if (options.opacity < 1) {
			this._updateOpacity();
		}


		var panes = this._map._panes;

		if (addIcon) {
			panes.markerPane.appendChild(this._icon);
		}

		if (newShadow && addShadow) {
			panes.shadowPane.appendChild(this._shadow);
		}
	},

	_removeIcon: function () {
		if (this.options.riseOnHover) {
			L.DomEvent
			    .off(this._icon, 'mouseover', this._bringToFront)
			    .off(this._icon, 'mouseout', this._resetZIndex);
		}

		this._map._panes.markerPane.removeChild(this._icon);

		this._icon = null;
	},

	_removeShadow: function () {
		if (this._shadow) {
			this._map._panes.shadowPane.removeChild(this._shadow);
		}
		this._shadow = null;
	},

	_setPos: function (pos) {
		L.DomUtil.setPosition(this._icon, pos);

		if (this._shadow) {
			L.DomUtil.setPosition(this._shadow, pos);
		}

		this._zIndex = pos.y + this.options.zIndexOffset;

		this._resetZIndex();
	},

	_updateZIndex: function (offset) {
		this._icon.style.zIndex = this._zIndex + offset;
	},

	_animateZoom: function (opt) {
		var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();

		this._setPos(pos);
	},

	_initInteraction: function () {

		if (!this.options.clickable) { return; }

		// TODO refactor into something shared with Map/Path/etc. to DRY it up

		var icon = this._icon,
		    events = ['dblclick', 'mousedown', 'mouseover', 'mouseout', 'contextmenu'];

		L.DomUtil.addClass(icon, 'leaflet-clickable');
		L.DomEvent.on(icon, 'click', this._onMouseClick, this);
		L.DomEvent.on(icon, 'keypress', this._onKeyPress, this);

		for (var i = 0; i < events.length; i++) {
			L.DomEvent.on(icon, events[i], this._fireMouseEvent, this);
		}

		if (L.Handler.MarkerDrag) {
			this.dragging = new L.Handler.MarkerDrag(this);

			if (this.options.draggable) {
				this.dragging.enable();
			}
		}
	},

	_onMouseClick: function (e) {
		var wasDragged = this.dragging && this.dragging.moved();

		if (this.hasEventListeners(e.type) || wasDragged) {
			L.DomEvent.stopPropagation(e);
		}

		if (wasDragged) { return; }

		if ((!this.dragging || !this.dragging._enabled) && this._map.dragging && this._map.dragging.moved()) { return; }

		this.fire(e.type, {
			originalEvent: e,
			latlng: this._latlng
		});
	},

	_onKeyPress: function (e) {
		if (e.keyCode === 13) {
			this.fire('click', {
				originalEvent: e,
				latlng: this._latlng
			});
		}
	},

	_fireMouseEvent: function (e) {

		this.fire(e.type, {
			originalEvent: e,
			latlng: this._latlng
		});

		// TODO proper custom event propagation
		// this line will always be called if marker is in a FeatureGroup
		if (e.type === 'contextmenu' && this.hasEventListeners(e.type)) {
			L.DomEvent.preventDefault(e);
		}
		if (e.type !== 'mousedown') {
			L.DomEvent.stopPropagation(e);
		} else {
			L.DomEvent.preventDefault(e);
		}
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;
		if (this._map) {
			this._updateOpacity();
		}

		return this;
	},

	_updateOpacity: function () {
		L.DomUtil.setOpacity(this._icon, this.options.opacity);
		if (this._shadow) {
			L.DomUtil.setOpacity(this._shadow, this.options.opacity);
		}
	},

	_bringToFront: function () {
		this._updateZIndex(this.options.riseOffset);
	},

	_resetZIndex: function () {
		this._updateZIndex(0);
	}
});

L.marker = function (latlng, options) {
	return new L.Marker(latlng, options);
};


/*
 * L.DivIcon is a lightweight HTML-based icon class (as opposed to the image-based L.Icon)
 * to use with L.Marker.
 */

L.DivIcon = L.Icon.extend({
	options: {
		iconSize: [12, 12], // also can be set through CSS
		/*
		iconAnchor: (Point)
		popupAnchor: (Point)
		html: (String)
		bgPos: (Point)
		*/
		className: 'leaflet-div-icon',
		html: false
	},

	createIcon: function (oldIcon) {
		var div = (oldIcon && oldIcon.tagName === 'DIV') ? oldIcon : document.createElement('div'),
		    options = this.options;

		if (options.html !== false) {
			div.innerHTML = options.html;
		} else {
			div.innerHTML = '';
		}

		if (options.bgPos) {
			div.style.backgroundPosition =
			        (-options.bgPos.x) + 'px ' + (-options.bgPos.y) + 'px';
		}

		this._setIconStyles(div, 'icon');
		return div;
	},

	createShadow: function () {
		return null;
	}
});

L.divIcon = function (options) {
	return new L.DivIcon(options);
};


/*
 * L.Popup is used for displaying popups on the map.
 */

L.Map.mergeOptions({
	closePopupOnClick: true
});

L.Popup = L.Class.extend({
	includes: L.Mixin.Events,

	options: {
		minWidth: 50,
		maxWidth: 300,
		// maxHeight: null,
		autoPan: true,
		closeButton: true,
		offset: [0, 7],
		autoPanPadding: [5, 5],
		// autoPanPaddingTopLeft: null,
		// autoPanPaddingBottomRight: null,
		keepInView: false,
		className: '',
		zoomAnimation: true
	},

	initialize: function (options, source) {
		L.setOptions(this, options);

		this._source = source;
		this._animated = L.Browser.any3d && this.options.zoomAnimation;
		this._isOpen = false;
	},

	onAdd: function (map) {
		this._map = map;

		if (!this._container) {
			this._initLayout();
		}

		var animFade = map.options.fadeAnimation;

		if (animFade) {
			L.DomUtil.setOpacity(this._container, 0);
		}
		map._panes.popupPane.appendChild(this._container);

		map.on(this._getEvents(), this);

		this.update();

		if (animFade) {
			L.DomUtil.setOpacity(this._container, 1);
		}

		this.fire('open');

		map.fire('popupopen', {popup: this});

		if (this._source) {
			this._source.fire('popupopen', {popup: this});
		}
	},

	addTo: function (map) {
		map.addLayer(this);
		return this;
	},

	openOn: function (map) {
		map.openPopup(this);
		return this;
	},

	onRemove: function (map) {
		map._panes.popupPane.removeChild(this._container);

		L.Util.falseFn(this._container.offsetWidth); // force reflow

		map.off(this._getEvents(), this);

		if (map.options.fadeAnimation) {
			L.DomUtil.setOpacity(this._container, 0);
		}

		this._map = null;

		this.fire('close');

		map.fire('popupclose', {popup: this});

		if (this._source) {
			this._source.fire('popupclose', {popup: this});
		}
	},

	getLatLng: function () {
		return this._latlng;
	},

	setLatLng: function (latlng) {
		this._latlng = L.latLng(latlng);
		if (this._map) {
			this._updatePosition();
			this._adjustPan();
		}
		return this;
	},

	getContent: function () {
		return this._content;
	},

	setContent: function (content) {
		this._content = content;
		this.update();
		return this;
	},

	update: function () {
		if (!this._map) { return; }

		this._container.style.visibility = 'hidden';

		this._updateContent();
		this._updateLayout();
		this._updatePosition();

		this._container.style.visibility = '';

		this._adjustPan();
	},

	_getEvents: function () {
		var events = {
			viewreset: this._updatePosition
		};

		if (this._animated) {
			events.zoomanim = this._zoomAnimation;
		}
		if ('closeOnClick' in this.options ? this.options.closeOnClick : this._map.options.closePopupOnClick) {
			events.preclick = this._close;
		}
		if (this.options.keepInView) {
			events.moveend = this._adjustPan;
		}

		return events;
	},

	_close: function () {
		if (this._map) {
			this._map.closePopup(this);
		}
	},

	_initLayout: function () {
		var prefix = 'leaflet-popup',
			containerClass = prefix + ' ' + this.options.className + ' leaflet-zoom-' +
			        (this._animated ? 'animated' : 'hide'),
			container = this._container = L.DomUtil.create('div', containerClass),
			closeButton;

		if (this.options.closeButton) {
			closeButton = this._closeButton =
			        L.DomUtil.create('a', prefix + '-close-button', container);
			closeButton.href = '#close';
			closeButton.innerHTML = '&#215;';
			L.DomEvent.disableClickPropagation(closeButton);

			L.DomEvent.on(closeButton, 'click', this._onCloseButtonClick, this);
		}

		var wrapper = this._wrapper =
		        L.DomUtil.create('div', prefix + '-content-wrapper', container);
		L.DomEvent.disableClickPropagation(wrapper);

		this._contentNode = L.DomUtil.create('div', prefix + '-content', wrapper);

		L.DomEvent.disableScrollPropagation(this._contentNode);
		L.DomEvent.on(wrapper, 'contextmenu', L.DomEvent.stopPropagation);

		this._tipContainer = L.DomUtil.create('div', prefix + '-tip-container', container);
		this._tip = L.DomUtil.create('div', prefix + '-tip', this._tipContainer);
	},

	_updateContent: function () {
		if (!this._content) { return; }

		if (typeof this._content === 'string') {
			this._contentNode.innerHTML = this._content;
		} else {
			while (this._contentNode.hasChildNodes()) {
				this._contentNode.removeChild(this._contentNode.firstChild);
			}
			this._contentNode.appendChild(this._content);
		}
		this.fire('contentupdate');
	},

	_updateLayout: function () {
		var container = this._contentNode,
		    style = container.style;

		style.width = '';
		style.whiteSpace = 'nowrap';

		var width = container.offsetWidth;
		width = Math.min(width, this.options.maxWidth);
		width = Math.max(width, this.options.minWidth);

		style.width = (width + 1) + 'px';
		style.whiteSpace = '';

		style.height = '';

		var height = container.offsetHeight,
		    maxHeight = this.options.maxHeight,
		    scrolledClass = 'leaflet-popup-scrolled';

		if (maxHeight && height > maxHeight) {
			style.height = maxHeight + 'px';
			L.DomUtil.addClass(container, scrolledClass);
		} else {
			L.DomUtil.removeClass(container, scrolledClass);
		}

		this._containerWidth = this._container.offsetWidth;
	},

	_updatePosition: function () {
		if (!this._map) { return; }

		var pos = this._map.latLngToLayerPoint(this._latlng),
		    animated = this._animated,
		    offset = L.point(this.options.offset);

		if (animated) {
			L.DomUtil.setPosition(this._container, pos);
		}

		this._containerBottom = -offset.y - (animated ? 0 : pos.y);
		this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x + (animated ? 0 : pos.x);

		// bottom position the popup in case the height of the popup changes (images loading etc)
		this._container.style.bottom = this._containerBottom + 'px';
		this._container.style.left = this._containerLeft + 'px';
	},

	_zoomAnimation: function (opt) {
		var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center);

		L.DomUtil.setPosition(this._container, pos);
	},

	_adjustPan: function () {
		if (!this.options.autoPan) { return; }

		var map = this._map,
		    containerHeight = this._container.offsetHeight,
		    containerWidth = this._containerWidth,

		    layerPos = new L.Point(this._containerLeft, -containerHeight - this._containerBottom);

		if (this._animated) {
			layerPos._add(L.DomUtil.getPosition(this._container));
		}

		var containerPos = map.layerPointToContainerPoint(layerPos),
		    padding = L.point(this.options.autoPanPadding),
		    paddingTL = L.point(this.options.autoPanPaddingTopLeft || padding),
		    paddingBR = L.point(this.options.autoPanPaddingBottomRight || padding),
		    size = map.getSize(),
		    dx = 0,
		    dy = 0;

		if (containerPos.x + containerWidth + paddingBR.x > size.x) { // right
			dx = containerPos.x + containerWidth - size.x + paddingBR.x;
		}
		if (containerPos.x - dx - paddingTL.x < 0) { // left
			dx = containerPos.x - paddingTL.x;
		}
		if (containerPos.y + containerHeight + paddingBR.y > size.y) { // bottom
			dy = containerPos.y + containerHeight - size.y + paddingBR.y;
		}
		if (containerPos.y - dy - paddingTL.y < 0) { // top
			dy = containerPos.y - paddingTL.y;
		}

		if (dx || dy) {
			map
			    .fire('autopanstart')
			    .panBy([dx, dy]);
		}
	},

	_onCloseButtonClick: function (e) {
		this._close();
		L.DomEvent.stop(e);
	}
});

L.popup = function (options, source) {
	return new L.Popup(options, source);
};


L.Map.include({
	openPopup: function (popup, latlng, options) { // (Popup) or (String || HTMLElement, LatLng[, Object])
		this.closePopup();

		if (!(popup instanceof L.Popup)) {
			var content = popup;

			popup = new L.Popup(options)
			    .setLatLng(latlng)
			    .setContent(content);
		}
		popup._isOpen = true;

		this._popup = popup;
		return this.addLayer(popup);
	},

	closePopup: function (popup) {
		if (!popup || popup === this._popup) {
			popup = this._popup;
			this._popup = null;
		}
		if (popup) {
			this.removeLayer(popup);
			popup._isOpen = false;
		}
		return this;
	}
});


/*
 * Popup extension to L.Marker, adding popup-related methods.
 */

L.Marker.include({
	openPopup: function () {
		if (this._popup && this._map && !this._map.hasLayer(this._popup)) {
			this._popup.setLatLng(this._latlng);
			this._map.openPopup(this._popup);
		}

		return this;
	},

	closePopup: function () {
		if (this._popup) {
			this._popup._close();
		}
		return this;
	},

	togglePopup: function () {
		if (this._popup) {
			if (this._popup._isOpen) {
				this.closePopup();
			} else {
				this.openPopup();
			}
		}
		return this;
	},

	bindPopup: function (content, options) {
		var anchor = L.point(this.options.icon.options.popupAnchor || [0, 0]);

		anchor = anchor.add(L.Popup.prototype.options.offset);

		if (options && options.offset) {
			anchor = anchor.add(options.offset);
		}

		options = L.extend({offset: anchor}, options);

		if (!this._popupHandlersAdded) {
			this
			    .on('click', this.togglePopup, this)
			    .on('remove', this.closePopup, this)
			    .on('move', this._movePopup, this);
			this._popupHandlersAdded = true;
		}

		if (content instanceof L.Popup) {
			L.setOptions(content, options);
			this._popup = content;
			content._source = this;
		} else {
			this._popup = new L.Popup(options, this)
				.setContent(content);
		}

		return this;
	},

	setPopupContent: function (content) {
		if (this._popup) {
			this._popup.setContent(content);
		}
		return this;
	},

	unbindPopup: function () {
		if (this._popup) {
			this._popup = null;
			this
			    .off('click', this.togglePopup, this)
			    .off('remove', this.closePopup, this)
			    .off('move', this._movePopup, this);
			this._popupHandlersAdded = false;
		}
		return this;
	},

	getPopup: function () {
		return this._popup;
	},

	_movePopup: function (e) {
		this._popup.setLatLng(e.latlng);
	}
});


/*
 * L.LayerGroup is a class to combine several layers into one so that
 * you can manipulate the group (e.g. add/remove it) as one layer.
 */

L.LayerGroup = L.Class.extend({
	initialize: function (layers) {
		this._layers = {};

		var i, len;

		if (layers) {
			for (i = 0, len = layers.length; i < len; i++) {
				this.addLayer(layers[i]);
			}
		}
	},

	addLayer: function (layer) {
		var id = this.getLayerId(layer);

		this._layers[id] = layer;

		if (this._map) {
			this._map.addLayer(layer);
		}

		return this;
	},

	removeLayer: function (layer) {
		var id = layer in this._layers ? layer : this.getLayerId(layer);

		if (this._map && this._layers[id]) {
			this._map.removeLayer(this._layers[id]);
		}

		delete this._layers[id];

		return this;
	},

	hasLayer: function (layer) {
		if (!layer) { return false; }

		return (layer in this._layers || this.getLayerId(layer) in this._layers);
	},

	clearLayers: function () {
		this.eachLayer(this.removeLayer, this);
		return this;
	},

	invoke: function (methodName) {
		var args = Array.prototype.slice.call(arguments, 1),
		    i, layer;

		for (i in this._layers) {
			layer = this._layers[i];

			if (layer[methodName]) {
				layer[methodName].apply(layer, args);
			}
		}

		return this;
	},

	onAdd: function (map) {
		this._map = map;
		this.eachLayer(map.addLayer, map);
	},

	onRemove: function (map) {
		this.eachLayer(map.removeLayer, map);
		this._map = null;
	},

	addTo: function (map) {
		map.addLayer(this);
		return this;
	},

	eachLayer: function (method, context) {
		for (var i in this._layers) {
			method.call(context, this._layers[i]);
		}
		return this;
	},

	getLayer: function (id) {
		return this._layers[id];
	},

	getLayers: function () {
		var layers = [];

		for (var i in this._layers) {
			layers.push(this._layers[i]);
		}
		return layers;
	},

	setZIndex: function (zIndex) {
		return this.invoke('setZIndex', zIndex);
	},

	getLayerId: function (layer) {
		return L.stamp(layer);
	}
});

L.layerGroup = function (layers) {
	return new L.LayerGroup(layers);
};


/*
 * L.FeatureGroup extends L.LayerGroup by introducing mouse events and additional methods
 * shared between a group of interactive layers (like vectors or markers).
 */

L.FeatureGroup = L.LayerGroup.extend({
	includes: L.Mixin.Events,

	statics: {
		EVENTS: 'click dblclick mouseover mouseout mousemove contextmenu popupopen popupclose'
	},

	addLayer: function (layer) {
		if (this.hasLayer(layer)) {
			return this;
		}

		if ('on' in layer) {
			layer.on(L.FeatureGroup.EVENTS, this._propagateEvent, this);
		}

		L.LayerGroup.prototype.addLayer.call(this, layer);

		if (this._popupContent && layer.bindPopup) {
			layer.bindPopup(this._popupContent, this._popupOptions);
		}

		return this.fire('layeradd', {layer: layer});
	},

	removeLayer: function (layer) {
		if (!this.hasLayer(layer)) {
			return this;
		}
		if (layer in this._layers) {
			layer = this._layers[layer];
		}

		if ('off' in layer) {
			layer.off(L.FeatureGroup.EVENTS, this._propagateEvent, this);
		}

		L.LayerGroup.prototype.removeLayer.call(this, layer);

		if (this._popupContent) {
			this.invoke('unbindPopup');
		}

		return this.fire('layerremove', {layer: layer});
	},

	bindPopup: function (content, options) {
		this._popupContent = content;
		this._popupOptions = options;
		return this.invoke('bindPopup', content, options);
	},

	openPopup: function (latlng) {
		// open popup on the first layer
		for (var id in this._layers) {
			this._layers[id].openPopup(latlng);
			break;
		}
		return this;
	},

	setStyle: function (style) {
		return this.invoke('setStyle', style);
	},

	bringToFront: function () {
		return this.invoke('bringToFront');
	},

	bringToBack: function () {
		return this.invoke('bringToBack');
	},

	getBounds: function () {
		var bounds = new L.LatLngBounds();

		this.eachLayer(function (layer) {
			bounds.extend(layer instanceof L.Marker ? layer.getLatLng() : layer.getBounds());
		});

		return bounds;
	},

	_propagateEvent: function (e) {
		e = L.extend({
			layer: e.target,
			target: this
		}, e);
		this.fire(e.type, e);
	}
});

L.featureGroup = function (layers) {
	return new L.FeatureGroup(layers);
};


/*
 * L.Path is a base class for rendering vector paths on a map. Inherited by Polyline, Circle, etc.
 */

L.Path = L.Class.extend({
	includes: [L.Mixin.Events],

	statics: {
		// how much to extend the clip area around the map view
		// (relative to its size, e.g. 0.5 is half the screen in each direction)
		// set it so that SVG element doesn't exceed 1280px (vectors flicker on dragend if it is)
		CLIP_PADDING: (function () {
			var max = L.Browser.mobile ? 1280 : 2000,
			    target = (max / Math.max(window.outerWidth, window.outerHeight) - 1) / 2;
			return Math.max(0, Math.min(0.5, target));
		})()
	},

	options: {
		stroke: true,
		color: '#0033ff',
		dashArray: null,
		lineCap: null,
		lineJoin: null,
		weight: 5,
		opacity: 0.5,

		fill: false,
		fillColor: null, //same as color by default
		fillOpacity: 0.2,

		clickable: true
	},

	initialize: function (options) {
		L.setOptions(this, options);
	},

	onAdd: function (map) {
		this._map = map;

		if (!this._container) {
			this._initElements();
			this._initEvents();
		}

		this.projectLatlngs();
		this._updatePath();

		if (this._container) {
			this._map._pathRoot.appendChild(this._container);
		}

		this.fire('add');

		map.on({
			'viewreset': this.projectLatlngs,
			'moveend': this._updatePath
		}, this);
	},

	addTo: function (map) {
		map.addLayer(this);
		return this;
	},

	onRemove: function (map) {
		map._pathRoot.removeChild(this._container);

		// Need to fire remove event before we set _map to null as the event hooks might need the object
		this.fire('remove');
		this._map = null;

		if (L.Browser.vml) {
			this._container = null;
			this._stroke = null;
			this._fill = null;
		}

		map.off({
			'viewreset': this.projectLatlngs,
			'moveend': this._updatePath
		}, this);
	},

	projectLatlngs: function () {
		// do all projection stuff here
	},

	setStyle: function (style) {
		L.setOptions(this, style);

		if (this._container) {
			this._updateStyle();
		}

		return this;
	},

	redraw: function () {
		if (this._map) {
			this.projectLatlngs();
			this._updatePath();
		}
		return this;
	}
});

L.Map.include({
	_updatePathViewport: function () {
		var p = L.Path.CLIP_PADDING,
		    size = this.getSize(),
		    panePos = L.DomUtil.getPosition(this._mapPane),
		    min = panePos.multiplyBy(-1)._subtract(size.multiplyBy(p)._round()),
		    max = min.add(size.multiplyBy(1 + p * 2)._round());

		this._pathViewport = new L.Bounds(min, max);
	}
});


/*
 * Extends L.Path with SVG-specific rendering code.
 */

L.Path.SVG_NS = 'http://www.w3.org/2000/svg';

L.Browser.svg = !!(document.createElementNS && document.createElementNS(L.Path.SVG_NS, 'svg').createSVGRect);

L.Path = L.Path.extend({
	statics: {
		SVG: L.Browser.svg
	},

	bringToFront: function () {
		var root = this._map._pathRoot,
		    path = this._container;

		if (path && root.lastChild !== path) {
			root.appendChild(path);
		}
		return this;
	},

	bringToBack: function () {
		var root = this._map._pathRoot,
		    path = this._container,
		    first = root.firstChild;

		if (path && first !== path) {
			root.insertBefore(path, first);
		}
		return this;
	},

	getPathString: function () {
		// form path string here
	},

	_createElement: function (name) {
		return document.createElementNS(L.Path.SVG_NS, name);
	},

	_initElements: function () {
		this._map._initPathRoot();
		this._initPath();
		this._initStyle();
	},

	_initPath: function () {
		this._container = this._createElement('g');

		this._path = this._createElement('path');

		if (this.options.className) {
			L.DomUtil.addClass(this._path, this.options.className);
		}

		this._container.appendChild(this._path);
	},

	_initStyle: function () {
		if (this.options.stroke) {
			this._path.setAttribute('stroke-linejoin', 'round');
			this._path.setAttribute('stroke-linecap', 'round');
		}
		if (this.options.fill) {
			this._path.setAttribute('fill-rule', 'evenodd');
		}
		if (this.options.pointerEvents) {
			this._path.setAttribute('pointer-events', this.options.pointerEvents);
		}
		if (!this.options.clickable && !this.options.pointerEvents) {
			this._path.setAttribute('pointer-events', 'none');
		}
		this._updateStyle();
	},

	_updateStyle: function () {
		if (this.options.stroke) {
			this._path.setAttribute('stroke', this.options.color);
			this._path.setAttribute('stroke-opacity', this.options.opacity);
			this._path.setAttribute('stroke-width', this.options.weight);
			if (this.options.dashArray) {
				this._path.setAttribute('stroke-dasharray', this.options.dashArray);
			} else {
				this._path.removeAttribute('stroke-dasharray');
			}
			if (this.options.lineCap) {
				this._path.setAttribute('stroke-linecap', this.options.lineCap);
			}
			if (this.options.lineJoin) {
				this._path.setAttribute('stroke-linejoin', this.options.lineJoin);
			}
		} else {
			this._path.setAttribute('stroke', 'none');
		}
		if (this.options.fill) {
			this._path.setAttribute('fill', this.options.fillColor || this.options.color);
			this._path.setAttribute('fill-opacity', this.options.fillOpacity);
		} else {
			this._path.setAttribute('fill', 'none');
		}
	},

	_updatePath: function () {
		var str = this.getPathString();
		if (!str) {
			// fix webkit empty string parsing bug
			str = 'M0 0';
		}
		this._path.setAttribute('d', str);
	},

	// TODO remove duplication with L.Map
	_initEvents: function () {
		if (this.options.clickable) {
			if (L.Browser.svg || !L.Browser.vml) {
				L.DomUtil.addClass(this._path, 'leaflet-clickable');
			}

			L.DomEvent.on(this._container, 'click', this._onMouseClick, this);

			var events = ['dblclick', 'mousedown', 'mouseover',
			              'mouseout', 'mousemove', 'contextmenu'];
			for (var i = 0; i < events.length; i++) {
				L.DomEvent.on(this._container, events[i], this._fireMouseEvent, this);
			}
		}
	},

	_onMouseClick: function (e) {
		if (this._map.dragging && this._map.dragging.moved()) { return; }

		this._fireMouseEvent(e);
	},

	_fireMouseEvent: function (e) {
		if (!this._map || !this.hasEventListeners(e.type)) { return; }

		var map = this._map,
		    containerPoint = map.mouseEventToContainerPoint(e),
		    layerPoint = map.containerPointToLayerPoint(containerPoint),
		    latlng = map.layerPointToLatLng(layerPoint);

		this.fire(e.type, {
			latlng: latlng,
			layerPoint: layerPoint,
			containerPoint: containerPoint,
			originalEvent: e
		});

		if (e.type === 'contextmenu') {
			L.DomEvent.preventDefault(e);
		}
		if (e.type !== 'mousemove') {
			L.DomEvent.stopPropagation(e);
		}
	}
});

L.Map.include({
	_initPathRoot: function () {
		if (!this._pathRoot) {
			this._pathRoot = L.Path.prototype._createElement('svg');
			this._panes.overlayPane.appendChild(this._pathRoot);

			if (this.options.zoomAnimation && L.Browser.any3d) {
				L.DomUtil.addClass(this._pathRoot, 'leaflet-zoom-animated');

				this.on({
					'zoomanim': this._animatePathZoom,
					'zoomend': this._endPathZoom
				});
			} else {
				L.DomUtil.addClass(this._pathRoot, 'leaflet-zoom-hide');
			}

			this.on('moveend', this._updateSvgViewport);
			this._updateSvgViewport();
		}
	},

	_animatePathZoom: function (e) {
		var scale = this.getZoomScale(e.zoom),
		    offset = this._getCenterOffset(e.center)._multiplyBy(-scale)._add(this._pathViewport.min);

		this._pathRoot.style[L.DomUtil.TRANSFORM] =
		        L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ') ';

		this._pathZooming = true;
	},

	_endPathZoom: function () {
		this._pathZooming = false;
	},

	_updateSvgViewport: function () {

		if (this._pathZooming) {
			// Do not update SVGs while a zoom animation is going on otherwise the animation will break.
			// When the zoom animation ends we will be updated again anyway
			// This fixes the case where you do a momentum move and zoom while the move is still ongoing.
			return;
		}

		this._updatePathViewport();

		var vp = this._pathViewport,
		    min = vp.min,
		    max = vp.max,
		    width = max.x - min.x,
		    height = max.y - min.y,
		    root = this._pathRoot,
		    pane = this._panes.overlayPane;

		// Hack to make flicker on drag end on mobile webkit less irritating
		if (L.Browser.mobileWebkit) {
			pane.removeChild(root);
		}

		L.DomUtil.setPosition(root, min);
		root.setAttribute('width', width);
		root.setAttribute('height', height);
		root.setAttribute('viewBox', [min.x, min.y, width, height].join(' '));

		if (L.Browser.mobileWebkit) {
			pane.appendChild(root);
		}
	}
});


/*
 * Popup extension to L.Path (polylines, polygons, circles), adding popup-related methods.
 */

L.Path.include({

	bindPopup: function (content, options) {

		if (content instanceof L.Popup) {
			this._popup = content;
		} else {
			if (!this._popup || options) {
				this._popup = new L.Popup(options, this);
			}
			this._popup.setContent(content);
		}

		if (!this._popupHandlersAdded) {
			this
			    .on('click', this._openPopup, this)
			    .on('remove', this.closePopup, this);

			this._popupHandlersAdded = true;
		}

		return this;
	},

	unbindPopup: function () {
		if (this._popup) {
			this._popup = null;
			this
			    .off('click', this._openPopup)
			    .off('remove', this.closePopup);

			this._popupHandlersAdded = false;
		}
		return this;
	},

	openPopup: function (latlng) {

		if (this._popup) {
			// open the popup from one of the path's points if not specified
			latlng = latlng || this._latlng ||
			         this._latlngs[Math.floor(this._latlngs.length / 2)];

			this._openPopup({latlng: latlng});
		}

		return this;
	},

	closePopup: function () {
		if (this._popup) {
			this._popup._close();
		}
		return this;
	},

	_openPopup: function (e) {
		this._popup.setLatLng(e.latlng);
		this._map.openPopup(this._popup);
	}
});


/*
 * Vector rendering for IE6-8 through VML.
 * Thanks to Dmitry Baranovsky and his Raphael library for inspiration!
 */

L.Browser.vml = !L.Browser.svg && (function () {
	try {
		var div = document.createElement('div');
		div.innerHTML = '<v:shape adj="1"/>';

		var shape = div.firstChild;
		shape.style.behavior = 'url(#default#VML)';

		return shape && (typeof shape.adj === 'object');

	} catch (e) {
		return false;
	}
}());

L.Path = L.Browser.svg || !L.Browser.vml ? L.Path : L.Path.extend({
	statics: {
		VML: true,
		CLIP_PADDING: 0.02
	},

	_createElement: (function () {
		try {
			document.namespaces.add('lvml', 'urn:schemas-microsoft-com:vml');
			return function (name) {
				return document.createElement('<lvml:' + name + ' class="lvml">');
			};
		} catch (e) {
			return function (name) {
				return document.createElement(
				        '<' + name + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
			};
		}
	}()),

	_initPath: function () {
		var container = this._container = this._createElement('shape');

		L.DomUtil.addClass(container, 'leaflet-vml-shape' +
			(this.options.className ? ' ' + this.options.className : ''));

		if (this.options.clickable) {
			L.DomUtil.addClass(container, 'leaflet-clickable');
		}

		container.coordsize = '1 1';

		this._path = this._createElement('path');
		container.appendChild(this._path);

		this._map._pathRoot.appendChild(container);
	},

	_initStyle: function () {
		this._updateStyle();
	},

	_updateStyle: function () {
		var stroke = this._stroke,
		    fill = this._fill,
		    options = this.options,
		    container = this._container;

		container.stroked = options.stroke;
		container.filled = options.fill;

		if (options.stroke) {
			if (!stroke) {
				stroke = this._stroke = this._createElement('stroke');
				stroke.endcap = 'round';
				container.appendChild(stroke);
			}
			stroke.weight = options.weight + 'px';
			stroke.color = options.color;
			stroke.opacity = options.opacity;

			if (options.dashArray) {
				stroke.dashStyle = L.Util.isArray(options.dashArray) ?
				    options.dashArray.join(' ') :
				    options.dashArray.replace(/( *, *)/g, ' ');
			} else {
				stroke.dashStyle = '';
			}
			if (options.lineCap) {
				stroke.endcap = options.lineCap.replace('butt', 'flat');
			}
			if (options.lineJoin) {
				stroke.joinstyle = options.lineJoin;
			}

		} else if (stroke) {
			container.removeChild(stroke);
			this._stroke = null;
		}

		if (options.fill) {
			if (!fill) {
				fill = this._fill = this._createElement('fill');
				container.appendChild(fill);
			}
			fill.color = options.fillColor || options.color;
			fill.opacity = options.fillOpacity;

		} else if (fill) {
			container.removeChild(fill);
			this._fill = null;
		}
	},

	_updatePath: function () {
		var style = this._container.style;

		style.display = 'none';
		this._path.v = this.getPathString() + ' '; // the space fixes IE empty path string bug
		style.display = '';
	}
});

L.Map.include(L.Browser.svg || !L.Browser.vml ? {} : {
	_initPathRoot: function () {
		if (this._pathRoot) { return; }

		var root = this._pathRoot = document.createElement('div');
		root.className = 'leaflet-vml-container';
		this._panes.overlayPane.appendChild(root);

		this.on('moveend', this._updatePathViewport);
		this._updatePathViewport();
	}
});


/*
 * Vector rendering for all browsers that support canvas.
 */

L.Browser.canvas = (function () {
	return !!document.createElement('canvas').getContext;
}());

L.Path = (L.Path.SVG && !window.L_PREFER_CANVAS) || !L.Browser.canvas ? L.Path : L.Path.extend({
	statics: {
		//CLIP_PADDING: 0.02, // not sure if there's a need to set it to a small value
		CANVAS: true,
		SVG: false
	},

	redraw: function () {
		if (this._map) {
			this.projectLatlngs();
			this._requestUpdate();
		}
		return this;
	},

	setStyle: function (style) {
		L.setOptions(this, style);

		if (this._map) {
			this._updateStyle();
			this._requestUpdate();
		}
		return this;
	},

	onRemove: function (map) {
		map
		    .off('viewreset', this.projectLatlngs, this)
		    .off('moveend', this._updatePath, this);

		if (this.options.clickable) {
			this._map.off('click', this._onClick, this);
			this._map.off('mousemove', this._onMouseMove, this);
		}

		this._requestUpdate();
		
		this.fire('remove');
		this._map = null;
	},

	_requestUpdate: function () {
		if (this._map && !L.Path._updateRequest) {
			L.Path._updateRequest = L.Util.requestAnimFrame(this._fireMapMoveEnd, this._map);
		}
	},

	_fireMapMoveEnd: function () {
		L.Path._updateRequest = null;
		this.fire('moveend');
	},

	_initElements: function () {
		this._map._initPathRoot();
		this._ctx = this._map._canvasCtx;
	},

	_updateStyle: function () {
		var options = this.options;

		if (options.stroke) {
			this._ctx.lineWidth = options.weight;
			this._ctx.strokeStyle = options.color;
		}
		if (options.fill) {
			this._ctx.fillStyle = options.fillColor || options.color;
		}

		if (options.lineCap) {
			this._ctx.lineCap = options.lineCap;
		}
		if (options.lineJoin) {
			this._ctx.lineJoin = options.lineJoin;
		}
	},

	_drawPath: function () {
		var i, j, len, len2, point, drawMethod;

		this._ctx.beginPath();

		for (i = 0, len = this._parts.length; i < len; i++) {
			for (j = 0, len2 = this._parts[i].length; j < len2; j++) {
				point = this._parts[i][j];
				drawMethod = (j === 0 ? 'move' : 'line') + 'To';

				this._ctx[drawMethod](point.x, point.y);
			}
			// TODO refactor ugly hack
			if (this instanceof L.Polygon) {
				this._ctx.closePath();
			}
		}
	},

	_checkIfEmpty: function () {
		return !this._parts.length;
	},

	_updatePath: function () {
		if (this._checkIfEmpty()) { return; }

		var ctx = this._ctx,
		    options = this.options;

		this._drawPath();
		ctx.save();
		this._updateStyle();

		if (options.fill) {
			ctx.globalAlpha = options.fillOpacity;
			ctx.fill(options.fillRule || 'evenodd');
		}

		if (options.stroke) {
			ctx.globalAlpha = options.opacity;
			ctx.stroke();
		}

		ctx.restore();

		// TODO optimization: 1 fill/stroke for all features with equal style instead of 1 for each feature
	},

	_initEvents: function () {
		if (this.options.clickable) {
			this._map.on('mousemove', this._onMouseMove, this);
			this._map.on('click dblclick contextmenu', this._fireMouseEvent, this);
		}
	},

	_fireMouseEvent: function (e) {
		if (this._containsPoint(e.layerPoint)) {
			this.fire(e.type, e);
		}
	},

	_onMouseMove: function (e) {
		if (!this._map || this._map._animatingZoom) { return; }

		// TODO don't do on each move
		if (this._containsPoint(e.layerPoint)) {
			this._ctx.canvas.style.cursor = 'pointer';
			this._mouseInside = true;
			this.fire('mouseover', e);

		} else if (this._mouseInside) {
			this._ctx.canvas.style.cursor = '';
			this._mouseInside = false;
			this.fire('mouseout', e);
		}
	}
});

L.Map.include((L.Path.SVG && !window.L_PREFER_CANVAS) || !L.Browser.canvas ? {} : {
	_initPathRoot: function () {
		var root = this._pathRoot,
		    ctx;

		if (!root) {
			root = this._pathRoot = document.createElement('canvas');
			root.style.position = 'absolute';
			ctx = this._canvasCtx = root.getContext('2d');

			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';

			this._panes.overlayPane.appendChild(root);

			if (this.options.zoomAnimation) {
				this._pathRoot.className = 'leaflet-zoom-animated';
				this.on('zoomanim', this._animatePathZoom);
				this.on('zoomend', this._endPathZoom);
			}
			this.on('moveend', this._updateCanvasViewport);
			this._updateCanvasViewport();
		}
	},

	_updateCanvasViewport: function () {
		// don't redraw while zooming. See _updateSvgViewport for more details
		if (this._pathZooming) { return; }
		this._updatePathViewport();

		var vp = this._pathViewport,
		    min = vp.min,
		    size = vp.max.subtract(min),
		    root = this._pathRoot;

		//TODO check if this works properly on mobile webkit
		L.DomUtil.setPosition(root, min);
		root.width = size.x;
		root.height = size.y;
		root.getContext('2d').translate(-min.x, -min.y);
	}
});


/*
 * L.LineUtil contains different utility functions for line segments
 * and polylines (clipping, simplification, distances, etc.)
 */

/*jshint bitwise:false */ // allow bitwise operations for this file

L.LineUtil = {

	// Simplify polyline with vertex reduction and Douglas-Peucker simplification.
	// Improves rendering performance dramatically by lessening the number of points to draw.

	simplify: function (/*Point[]*/ points, /*Number*/ tolerance) {
		if (!tolerance || !points.length) {
			return points.slice();
		}

		var sqTolerance = tolerance * tolerance;

		// stage 1: vertex reduction
		points = this._reducePoints(points, sqTolerance);

		// stage 2: Douglas-Peucker simplification
		points = this._simplifyDP(points, sqTolerance);

		return points;
	},

	// distance from a point to a segment between two points
	pointToSegmentDistance:  function (/*Point*/ p, /*Point*/ p1, /*Point*/ p2) {
		return Math.sqrt(this._sqClosestPointOnSegment(p, p1, p2, true));
	},

	closestPointOnSegment: function (/*Point*/ p, /*Point*/ p1, /*Point*/ p2) {
		return this._sqClosestPointOnSegment(p, p1, p2);
	},

	// Douglas-Peucker simplification, see http://en.wikipedia.org/wiki/Douglas-Peucker_algorithm
	_simplifyDP: function (points, sqTolerance) {

		var len = points.length,
		    ArrayConstructor = typeof Uint8Array !== undefined + '' ? Uint8Array : Array,
		    markers = new ArrayConstructor(len);

		markers[0] = markers[len - 1] = 1;

		this._simplifyDPStep(points, markers, sqTolerance, 0, len - 1);

		var i,
		    newPoints = [];

		for (i = 0; i < len; i++) {
			if (markers[i]) {
				newPoints.push(points[i]);
			}
		}

		return newPoints;
	},

	_simplifyDPStep: function (points, markers, sqTolerance, first, last) {

		var maxSqDist = 0,
		    index, i, sqDist;

		for (i = first + 1; i <= last - 1; i++) {
			sqDist = this._sqClosestPointOnSegment(points[i], points[first], points[last], true);

			if (sqDist > maxSqDist) {
				index = i;
				maxSqDist = sqDist;
			}
		}

		if (maxSqDist > sqTolerance) {
			markers[index] = 1;

			this._simplifyDPStep(points, markers, sqTolerance, first, index);
			this._simplifyDPStep(points, markers, sqTolerance, index, last);
		}
	},

	// reduce points that are too close to each other to a single point
	_reducePoints: function (points, sqTolerance) {
		var reducedPoints = [points[0]];

		for (var i = 1, prev = 0, len = points.length; i < len; i++) {
			if (this._sqDist(points[i], points[prev]) > sqTolerance) {
				reducedPoints.push(points[i]);
				prev = i;
			}
		}
		if (prev < len - 1) {
			reducedPoints.push(points[len - 1]);
		}
		return reducedPoints;
	},

	// Cohen-Sutherland line clipping algorithm.
	// Used to avoid rendering parts of a polyline that are not currently visible.

	clipSegment: function (a, b, bounds, useLastCode) {
		var codeA = useLastCode ? this._lastCode : this._getBitCode(a, bounds),
		    codeB = this._getBitCode(b, bounds),

		    codeOut, p, newCode;

		// save 2nd code to avoid calculating it on the next segment
		this._lastCode = codeB;

		while (true) {
			// if a,b is inside the clip window (trivial accept)
			if (!(codeA | codeB)) {
				return [a, b];
			// if a,b is outside the clip window (trivial reject)
			} else if (codeA & codeB) {
				return false;
			// other cases
			} else {
				codeOut = codeA || codeB;
				p = this._getEdgeIntersection(a, b, codeOut, bounds);
				newCode = this._getBitCode(p, bounds);

				if (codeOut === codeA) {
					a = p;
					codeA = newCode;
				} else {
					b = p;
					codeB = newCode;
				}
			}
		}
	},

	_getEdgeIntersection: function (a, b, code, bounds) {
		var dx = b.x - a.x,
		    dy = b.y - a.y,
		    min = bounds.min,
		    max = bounds.max;

		if (code & 8) { // top
			return new L.Point(a.x + dx * (max.y - a.y) / dy, max.y);
		} else if (code & 4) { // bottom
			return new L.Point(a.x + dx * (min.y - a.y) / dy, min.y);
		} else if (code & 2) { // right
			return new L.Point(max.x, a.y + dy * (max.x - a.x) / dx);
		} else if (code & 1) { // left
			return new L.Point(min.x, a.y + dy * (min.x - a.x) / dx);
		}
	},

	_getBitCode: function (/*Point*/ p, bounds) {
		var code = 0;

		if (p.x < bounds.min.x) { // left
			code |= 1;
		} else if (p.x > bounds.max.x) { // right
			code |= 2;
		}
		if (p.y < bounds.min.y) { // bottom
			code |= 4;
		} else if (p.y > bounds.max.y) { // top
			code |= 8;
		}

		return code;
	},

	// square distance (to avoid unnecessary Math.sqrt calls)
	_sqDist: function (p1, p2) {
		var dx = p2.x - p1.x,
		    dy = p2.y - p1.y;
		return dx * dx + dy * dy;
	},

	// return closest point on segment or distance to that point
	_sqClosestPointOnSegment: function (p, p1, p2, sqDist) {
		var x = p1.x,
		    y = p1.y,
		    dx = p2.x - x,
		    dy = p2.y - y,
		    dot = dx * dx + dy * dy,
		    t;

		if (dot > 0) {
			t = ((p.x - x) * dx + (p.y - y) * dy) / dot;

			if (t > 1) {
				x = p2.x;
				y = p2.y;
			} else if (t > 0) {
				x += dx * t;
				y += dy * t;
			}
		}

		dx = p.x - x;
		dy = p.y - y;

		return sqDist ? dx * dx + dy * dy : new L.Point(x, y);
	}
};


/*
 * L.Polyline is used to display polylines on a map.
 */

L.Polyline = L.Path.extend({
	initialize: function (latlngs, options) {
		L.Path.prototype.initialize.call(this, options);

		this._latlngs = this._convertLatLngs(latlngs);
	},

	options: {
		// how much to simplify the polyline on each zoom level
		// more = better performance and smoother look, less = more accurate
		smoothFactor: 1.0,
		noClip: false
	},

	projectLatlngs: function () {
		this._originalPoints = [];

		for (var i = 0, len = this._latlngs.length; i < len; i++) {
			this._originalPoints[i] = this._map.latLngToLayerPoint(this._latlngs[i]);
		}
	},

	getPathString: function () {
		for (var i = 0, len = this._parts.length, str = ''; i < len; i++) {
			str += this._getPathPartStr(this._parts[i]);
		}
		return str;
	},

	getLatLngs: function () {
		return this._latlngs;
	},

	setLatLngs: function (latlngs) {
		this._latlngs = this._convertLatLngs(latlngs);
		return this.redraw();
	},

	addLatLng: function (latlng) {
		this._latlngs.push(L.latLng(latlng));
		return this.redraw();
	},

	spliceLatLngs: function () { // (Number index, Number howMany)
		var removed = [].splice.apply(this._latlngs, arguments);
		this._convertLatLngs(this._latlngs, true);
		this.redraw();
		return removed;
	},

	closestLayerPoint: function (p) {
		var minDistance = Infinity, parts = this._parts, p1, p2, minPoint = null;

		for (var j = 0, jLen = parts.length; j < jLen; j++) {
			var points = parts[j];
			for (var i = 1, len = points.length; i < len; i++) {
				p1 = points[i - 1];
				p2 = points[i];
				var sqDist = L.LineUtil._sqClosestPointOnSegment(p, p1, p2, true);
				if (sqDist < minDistance) {
					minDistance = sqDist;
					minPoint = L.LineUtil._sqClosestPointOnSegment(p, p1, p2);
				}
			}
		}
		if (minPoint) {
			minPoint.distance = Math.sqrt(minDistance);
		}
		return minPoint;
	},

	getBounds: function () {
		return new L.LatLngBounds(this.getLatLngs());
	},

	_convertLatLngs: function (latlngs, overwrite) {
		var i, len, target = overwrite ? latlngs : [];

		for (i = 0, len = latlngs.length; i < len; i++) {
			if (L.Util.isArray(latlngs[i]) && typeof latlngs[i][0] !== 'number') {
				return;
			}
			target[i] = L.latLng(latlngs[i]);
		}
		return target;
	},

	_initEvents: function () {
		L.Path.prototype._initEvents.call(this);
	},

	_getPathPartStr: function (points) {
		var round = L.Path.VML;

		for (var j = 0, len2 = points.length, str = '', p; j < len2; j++) {
			p = points[j];
			if (round) {
				p._round();
			}
			str += (j ? 'L' : 'M') + p.x + ' ' + p.y;
		}
		return str;
	},

	_clipPoints: function () {
		var points = this._originalPoints,
		    len = points.length,
		    i, k, segment;

		if (this.options.noClip) {
			this._parts = [points];
			return;
		}

		this._parts = [];

		var parts = this._parts,
		    vp = this._map._pathViewport,
		    lu = L.LineUtil;

		for (i = 0, k = 0; i < len - 1; i++) {
			segment = lu.clipSegment(points[i], points[i + 1], vp, i);
			if (!segment) {
				continue;
			}

			parts[k] = parts[k] || [];
			parts[k].push(segment[0]);

			// if segment goes out of screen, or it's the last one, it's the end of the line part
			if ((segment[1] !== points[i + 1]) || (i === len - 2)) {
				parts[k].push(segment[1]);
				k++;
			}
		}
	},

	// simplify each clipped part of the polyline
	_simplifyPoints: function () {
		var parts = this._parts,
		    lu = L.LineUtil;

		for (var i = 0, len = parts.length; i < len; i++) {
			parts[i] = lu.simplify(parts[i], this.options.smoothFactor);
		}
	},

	_updatePath: function () {
		if (!this._map) { return; }

		this._clipPoints();
		this._simplifyPoints();

		L.Path.prototype._updatePath.call(this);
	}
});

L.polyline = function (latlngs, options) {
	return new L.Polyline(latlngs, options);
};


/*
 * L.PolyUtil contains utility functions for polygons (clipping, etc.).
 */

/*jshint bitwise:false */ // allow bitwise operations here

L.PolyUtil = {};

/*
 * Sutherland-Hodgeman polygon clipping algorithm.
 * Used to avoid rendering parts of a polygon that are not currently visible.
 */
L.PolyUtil.clipPolygon = function (points, bounds) {
	var clippedPoints,
	    edges = [1, 4, 2, 8],
	    i, j, k,
	    a, b,
	    len, edge, p,
	    lu = L.LineUtil;

	for (i = 0, len = points.length; i < len; i++) {
		points[i]._code = lu._getBitCode(points[i], bounds);
	}

	// for each edge (left, bottom, right, top)
	for (k = 0; k < 4; k++) {
		edge = edges[k];
		clippedPoints = [];

		for (i = 0, len = points.length, j = len - 1; i < len; j = i++) {
			a = points[i];
			b = points[j];

			// if a is inside the clip window
			if (!(a._code & edge)) {
				// if b is outside the clip window (a->b goes out of screen)
				if (b._code & edge) {
					p = lu._getEdgeIntersection(b, a, edge, bounds);
					p._code = lu._getBitCode(p, bounds);
					clippedPoints.push(p);
				}
				clippedPoints.push(a);

			// else if b is inside the clip window (a->b enters the screen)
			} else if (!(b._code & edge)) {
				p = lu._getEdgeIntersection(b, a, edge, bounds);
				p._code = lu._getBitCode(p, bounds);
				clippedPoints.push(p);
			}
		}
		points = clippedPoints;
	}

	return points;
};


/*
 * L.Polygon is used to display polygons on a map.
 */

L.Polygon = L.Polyline.extend({
	options: {
		fill: true
	},

	initialize: function (latlngs, options) {
		L.Polyline.prototype.initialize.call(this, latlngs, options);
		this._initWithHoles(latlngs);
	},

	_initWithHoles: function (latlngs) {
		var i, len, hole;
		if (latlngs && L.Util.isArray(latlngs[0]) && (typeof latlngs[0][0] !== 'number')) {
			this._latlngs = this._convertLatLngs(latlngs[0]);
			this._holes = latlngs.slice(1);

			for (i = 0, len = this._holes.length; i < len; i++) {
				hole = this._holes[i] = this._convertLatLngs(this._holes[i]);
				if (hole[0].equals(hole[hole.length - 1])) {
					hole.pop();
				}
			}
		}

		// filter out last point if its equal to the first one
		latlngs = this._latlngs;

		if (latlngs.length >= 2 && latlngs[0].equals(latlngs[latlngs.length - 1])) {
			latlngs.pop();
		}
	},

	projectLatlngs: function () {
		L.Polyline.prototype.projectLatlngs.call(this);

		// project polygon holes points
		// TODO move this logic to Polyline to get rid of duplication
		this._holePoints = [];

		if (!this._holes) { return; }

		var i, j, len, len2;

		for (i = 0, len = this._holes.length; i < len; i++) {
			this._holePoints[i] = [];

			for (j = 0, len2 = this._holes[i].length; j < len2; j++) {
				this._holePoints[i][j] = this._map.latLngToLayerPoint(this._holes[i][j]);
			}
		}
	},

	setLatLngs: function (latlngs) {
		if (latlngs && L.Util.isArray(latlngs[0]) && (typeof latlngs[0][0] !== 'number')) {
			this._initWithHoles(latlngs);
			return this.redraw();
		} else {
			return L.Polyline.prototype.setLatLngs.call(this, latlngs);
		}
	},

	_clipPoints: function () {
		var points = this._originalPoints,
		    newParts = [];

		this._parts = [points].concat(this._holePoints);

		if (this.options.noClip) { return; }

		for (var i = 0, len = this._parts.length; i < len; i++) {
			var clipped = L.PolyUtil.clipPolygon(this._parts[i], this._map._pathViewport);
			if (clipped.length) {
				newParts.push(clipped);
			}
		}

		this._parts = newParts;
	},

	_getPathPartStr: function (points) {
		var str = L.Polyline.prototype._getPathPartStr.call(this, points);
		return str + (L.Browser.svg ? 'z' : 'x');
	}
});

L.polygon = function (latlngs, options) {
	return new L.Polygon(latlngs, options);
};


/*
 * Contains L.MultiPolyline and L.MultiPolygon layers.
 */

(function () {
	function createMulti(Klass) {

		return L.FeatureGroup.extend({

			initialize: function (latlngs, options) {
				this._layers = {};
				this._options = options;
				this.setLatLngs(latlngs);
			},

			setLatLngs: function (latlngs) {
				var i = 0,
				    len = latlngs.length;

				this.eachLayer(function (layer) {
					if (i < len) {
						layer.setLatLngs(latlngs[i++]);
					} else {
						this.removeLayer(layer);
					}
				}, this);

				while (i < len) {
					this.addLayer(new Klass(latlngs[i++], this._options));
				}

				return this;
			},

			getLatLngs: function () {
				var latlngs = [];

				this.eachLayer(function (layer) {
					latlngs.push(layer.getLatLngs());
				});

				return latlngs;
			}
		});
	}

	L.MultiPolyline = createMulti(L.Polyline);
	L.MultiPolygon = createMulti(L.Polygon);

	L.multiPolyline = function (latlngs, options) {
		return new L.MultiPolyline(latlngs, options);
	};

	L.multiPolygon = function (latlngs, options) {
		return new L.MultiPolygon(latlngs, options);
	};
}());


/*
 * L.Rectangle extends Polygon and creates a rectangle when passed a LatLngBounds object.
 */

L.Rectangle = L.Polygon.extend({
	initialize: function (latLngBounds, options) {
		L.Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds), options);
	},

	setBounds: function (latLngBounds) {
		this.setLatLngs(this._boundsToLatLngs(latLngBounds));
	},

	_boundsToLatLngs: function (latLngBounds) {
		latLngBounds = L.latLngBounds(latLngBounds);
		return [
			latLngBounds.getSouthWest(),
			latLngBounds.getNorthWest(),
			latLngBounds.getNorthEast(),
			latLngBounds.getSouthEast()
		];
	}
});

L.rectangle = function (latLngBounds, options) {
	return new L.Rectangle(latLngBounds, options);
};


/*
 * L.Circle is a circle overlay (with a certain radius in meters).
 */

L.Circle = L.Path.extend({
	initialize: function (latlng, radius, options) {
		L.Path.prototype.initialize.call(this, options);

		this._latlng = L.latLng(latlng);
		this._mRadius = radius;
	},

	options: {
		fill: true
	},

	setLatLng: function (latlng) {
		this._latlng = L.latLng(latlng);
		return this.redraw();
	},

	setRadius: function (radius) {
		this._mRadius = radius;
		return this.redraw();
	},

	projectLatlngs: function () {
		var lngRadius = this._getLngRadius(),
		    latlng = this._latlng,
		    pointLeft = this._map.latLngToLayerPoint([latlng.lat, latlng.lng - lngRadius]);

		this._point = this._map.latLngToLayerPoint(latlng);
		this._radius = Math.max(this._point.x - pointLeft.x, 1);
	},

	getBounds: function () {
		var lngRadius = this._getLngRadius(),
		    latRadius = (this._mRadius / 40075017) * 360,
		    latlng = this._latlng;

		return new L.LatLngBounds(
		        [latlng.lat - latRadius, latlng.lng - lngRadius],
		        [latlng.lat + latRadius, latlng.lng + lngRadius]);
	},

	getLatLng: function () {
		return this._latlng;
	},

	getPathString: function () {
		var p = this._point,
		    r = this._radius;

		if (this._checkIfEmpty()) {
			return '';
		}

		if (L.Browser.svg) {
			return 'M' + p.x + ',' + (p.y - r) +
			       'A' + r + ',' + r + ',0,1,1,' +
			       (p.x - 0.1) + ',' + (p.y - r) + ' z';
		} else {
			p._round();
			r = Math.round(r);
			return 'AL ' + p.x + ',' + p.y + ' ' + r + ',' + r + ' 0,' + (65535 * 360);
		}
	},

	getRadius: function () {
		return this._mRadius;
	},

	// TODO Earth hardcoded, move into projection code!

	_getLatRadius: function () {
		return (this._mRadius / 40075017) * 360;
	},

	_getLngRadius: function () {
		return this._getLatRadius() / Math.cos(L.LatLng.DEG_TO_RAD * this._latlng.lat);
	},

	_checkIfEmpty: function () {
		if (!this._map) {
			return false;
		}
		var vp = this._map._pathViewport,
		    r = this._radius,
		    p = this._point;

		return p.x - r > vp.max.x || p.y - r > vp.max.y ||
		       p.x + r < vp.min.x || p.y + r < vp.min.y;
	}
});

L.circle = function (latlng, radius, options) {
	return new L.Circle(latlng, radius, options);
};


/*
 * L.CircleMarker is a circle overlay with a permanent pixel radius.
 */

L.CircleMarker = L.Circle.extend({
	options: {
		radius: 10,
		weight: 2
	},

	initialize: function (latlng, options) {
		L.Circle.prototype.initialize.call(this, latlng, null, options);
		this._radius = this.options.radius;
	},

	projectLatlngs: function () {
		this._point = this._map.latLngToLayerPoint(this._latlng);
	},

	_updateStyle : function () {
		L.Circle.prototype._updateStyle.call(this);
		this.setRadius(this.options.radius);
	},

	setLatLng: function (latlng) {
		L.Circle.prototype.setLatLng.call(this, latlng);
		if (this._popup && this._popup._isOpen) {
			this._popup.setLatLng(latlng);
		}
		return this;
	},

	setRadius: function (radius) {
		this.options.radius = this._radius = radius;
		return this.redraw();
	},

	getRadius: function () {
		return this._radius;
	}
});

L.circleMarker = function (latlng, options) {
	return new L.CircleMarker(latlng, options);
};


/*
 * Extends L.Polyline to be able to manually detect clicks on Canvas-rendered polylines.
 */

L.Polyline.include(!L.Path.CANVAS ? {} : {
	_containsPoint: function (p, closed) {
		var i, j, k, len, len2, dist, part,
		    w = this.options.weight / 2;

		if (L.Browser.touch) {
			w += 10; // polyline click tolerance on touch devices
		}

		for (i = 0, len = this._parts.length; i < len; i++) {
			part = this._parts[i];
			for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
				if (!closed && (j === 0)) {
					continue;
				}

				dist = L.LineUtil.pointToSegmentDistance(p, part[k], part[j]);

				if (dist <= w) {
					return true;
				}
			}
		}
		return false;
	}
});


/*
 * Extends L.Polygon to be able to manually detect clicks on Canvas-rendered polygons.
 */

L.Polygon.include(!L.Path.CANVAS ? {} : {
	_containsPoint: function (p) {
		var inside = false,
		    part, p1, p2,
		    i, j, k,
		    len, len2;

		// TODO optimization: check if within bounds first

		if (L.Polyline.prototype._containsPoint.call(this, p, true)) {
			// click on polygon border
			return true;
		}

		// ray casting algorithm for detecting if point is in polygon

		for (i = 0, len = this._parts.length; i < len; i++) {
			part = this._parts[i];

			for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
				p1 = part[j];
				p2 = part[k];

				if (((p1.y > p.y) !== (p2.y > p.y)) &&
						(p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x)) {
					inside = !inside;
				}
			}
		}

		return inside;
	}
});


/*
 * Extends L.Circle with Canvas-specific code.
 */

L.Circle.include(!L.Path.CANVAS ? {} : {
	_drawPath: function () {
		var p = this._point;
		this._ctx.beginPath();
		this._ctx.arc(p.x, p.y, this._radius, 0, Math.PI * 2, false);
	},

	_containsPoint: function (p) {
		var center = this._point,
		    w2 = this.options.stroke ? this.options.weight / 2 : 0;

		return (p.distanceTo(center) <= this._radius + w2);
	}
});


/*
 * CircleMarker canvas specific drawing parts.
 */

L.CircleMarker.include(!L.Path.CANVAS ? {} : {
	_updateStyle: function () {
		L.Path.prototype._updateStyle.call(this);
	}
});


/*
 * L.GeoJSON turns any GeoJSON data into a Leaflet layer.
 */

L.GeoJSON = L.FeatureGroup.extend({

	initialize: function (geojson, options) {
		L.setOptions(this, options);

		this._layers = {};

		if (geojson) {
			this.addData(geojson);
		}
	},

	addData: function (geojson) {
		var features = L.Util.isArray(geojson) ? geojson : geojson.features,
		    i, len, feature;

		if (features) {
			for (i = 0, len = features.length; i < len; i++) {
				// Only add this if geometry or geometries are set and not null
				feature = features[i];
				if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
					this.addData(features[i]);
				}
			}
			return this;
		}

		var options = this.options;

		if (options.filter && !options.filter(geojson)) { return; }

		var layer = L.GeoJSON.geometryToLayer(geojson, options.pointToLayer, options.coordsToLatLng, options);
		layer.feature = L.GeoJSON.asFeature(geojson);

		layer.defaultOptions = layer.options;
		this.resetStyle(layer);

		if (options.onEachFeature) {
			options.onEachFeature(geojson, layer);
		}

		return this.addLayer(layer);
	},

	resetStyle: function (layer) {
		var style = this.options.style;
		if (style) {
			// reset any custom styles
			L.Util.extend(layer.options, layer.defaultOptions);

			this._setLayerStyle(layer, style);
		}
	},

	setStyle: function (style) {
		this.eachLayer(function (layer) {
			this._setLayerStyle(layer, style);
		}, this);
	},

	_setLayerStyle: function (layer, style) {
		if (typeof style === 'function') {
			style = style(layer.feature);
		}
		if (layer.setStyle) {
			layer.setStyle(style);
		}
	}
});

L.extend(L.GeoJSON, {
	geometryToLayer: function (geojson, pointToLayer, coordsToLatLng, vectorOptions) {
		var geometry = geojson.type === 'Feature' ? geojson.geometry : geojson,
		    coords = geometry.coordinates,
		    layers = [],
		    latlng, latlngs, i, len;

		coordsToLatLng = coordsToLatLng || this.coordsToLatLng;

		switch (geometry.type) {
		case 'Point':
			latlng = coordsToLatLng(coords);
			return pointToLayer ? pointToLayer(geojson, latlng) : new L.Marker(latlng);

		case 'MultiPoint':
			for (i = 0, len = coords.length; i < len; i++) {
				latlng = coordsToLatLng(coords[i]);
				layers.push(pointToLayer ? pointToLayer(geojson, latlng) : new L.Marker(latlng));
			}
			return new L.FeatureGroup(layers);

		case 'LineString':
			latlngs = this.coordsToLatLngs(coords, 0, coordsToLatLng);
			return new L.Polyline(latlngs, vectorOptions);

		case 'Polygon':
			if (coords.length === 2 && !coords[1].length) {
				throw new Error('Invalid GeoJSON object.');
			}
			latlngs = this.coordsToLatLngs(coords, 1, coordsToLatLng);
			return new L.Polygon(latlngs, vectorOptions);

		case 'MultiLineString':
			latlngs = this.coordsToLatLngs(coords, 1, coordsToLatLng);
			return new L.MultiPolyline(latlngs, vectorOptions);

		case 'MultiPolygon':
			latlngs = this.coordsToLatLngs(coords, 2, coordsToLatLng);
			return new L.MultiPolygon(latlngs, vectorOptions);

		case 'GeometryCollection':
			for (i = 0, len = geometry.geometries.length; i < len; i++) {

				layers.push(this.geometryToLayer({
					geometry: geometry.geometries[i],
					type: 'Feature',
					properties: geojson.properties
				}, pointToLayer, coordsToLatLng, vectorOptions));
			}
			return new L.FeatureGroup(layers);

		default:
			throw new Error('Invalid GeoJSON object.');
		}
	},

	coordsToLatLng: function (coords) { // (Array[, Boolean]) -> LatLng
		return new L.LatLng(coords[1], coords[0], coords[2]);
	},

	coordsToLatLngs: function (coords, levelsDeep, coordsToLatLng) { // (Array[, Number, Function]) -> Array
		var latlng, i, len,
		    latlngs = [];

		for (i = 0, len = coords.length; i < len; i++) {
			latlng = levelsDeep ?
			        this.coordsToLatLngs(coords[i], levelsDeep - 1, coordsToLatLng) :
			        (coordsToLatLng || this.coordsToLatLng)(coords[i]);

			latlngs.push(latlng);
		}

		return latlngs;
	},

	latLngToCoords: function (latlng) {
		var coords = [latlng.lng, latlng.lat];

		if (latlng.alt !== undefined) {
			coords.push(latlng.alt);
		}
		return coords;
	},

	latLngsToCoords: function (latLngs) {
		var coords = [];

		for (var i = 0, len = latLngs.length; i < len; i++) {
			coords.push(L.GeoJSON.latLngToCoords(latLngs[i]));
		}

		return coords;
	},

	getFeature: function (layer, newGeometry) {
		return layer.feature ? L.extend({}, layer.feature, {geometry: newGeometry}) : L.GeoJSON.asFeature(newGeometry);
	},

	asFeature: function (geoJSON) {
		if (geoJSON.type === 'Feature') {
			return geoJSON;
		}

		return {
			type: 'Feature',
			properties: {},
			geometry: geoJSON
		};
	}
});

var PointToGeoJSON = {
	toGeoJSON: function () {
		return L.GeoJSON.getFeature(this, {
			type: 'Point',
			coordinates: L.GeoJSON.latLngToCoords(this.getLatLng())
		});
	}
};

L.Marker.include(PointToGeoJSON);
L.Circle.include(PointToGeoJSON);
L.CircleMarker.include(PointToGeoJSON);

L.Polyline.include({
	toGeoJSON: function () {
		return L.GeoJSON.getFeature(this, {
			type: 'LineString',
			coordinates: L.GeoJSON.latLngsToCoords(this.getLatLngs())
		});
	}
});

L.Polygon.include({
	toGeoJSON: function () {
		var coords = [L.GeoJSON.latLngsToCoords(this.getLatLngs())],
		    i, len, hole;

		coords[0].push(coords[0][0]);

		if (this._holes) {
			for (i = 0, len = this._holes.length; i < len; i++) {
				hole = L.GeoJSON.latLngsToCoords(this._holes[i]);
				hole.push(hole[0]);
				coords.push(hole);
			}
		}

		return L.GeoJSON.getFeature(this, {
			type: 'Polygon',
			coordinates: coords
		});
	}
});

(function () {
	function multiToGeoJSON(type) {
		return function () {
			var coords = [];

			this.eachLayer(function (layer) {
				coords.push(layer.toGeoJSON().geometry.coordinates);
			});

			return L.GeoJSON.getFeature(this, {
				type: type,
				coordinates: coords
			});
		};
	}

	L.MultiPolyline.include({toGeoJSON: multiToGeoJSON('MultiLineString')});
	L.MultiPolygon.include({toGeoJSON: multiToGeoJSON('MultiPolygon')});

	L.LayerGroup.include({
		toGeoJSON: function () {

			var geometry = this.feature && this.feature.geometry,
				jsons = [],
				json;

			if (geometry && geometry.type === 'MultiPoint') {
				return multiToGeoJSON('MultiPoint').call(this);
			}

			var isGeometryCollection = geometry && geometry.type === 'GeometryCollection';

			this.eachLayer(function (layer) {
				if (layer.toGeoJSON) {
					json = layer.toGeoJSON();
					jsons.push(isGeometryCollection ? json.geometry : L.GeoJSON.asFeature(json));
				}
			});

			if (isGeometryCollection) {
				return L.GeoJSON.getFeature(this, {
					geometries: jsons,
					type: 'GeometryCollection'
				});
			}

			return {
				type: 'FeatureCollection',
				features: jsons
			};
		}
	});
}());

L.geoJson = function (geojson, options) {
	return new L.GeoJSON(geojson, options);
};


/*
 * L.DomEvent contains functions for working with DOM events.
 */

L.DomEvent = {
	/* inspired by John Resig, Dean Edwards and YUI addEvent implementations */
	addListener: function (obj, type, fn, context) { // (HTMLElement, String, Function[, Object])

		var id = L.stamp(fn),
		    key = '_leaflet_' + type + id,
		    handler, originalHandler, newType;

		if (obj[key]) { return this; }

		handler = function (e) {
			return fn.call(context || obj, e || L.DomEvent._getEvent());
		};

		if (L.Browser.pointer && type.indexOf('touch') === 0) {
			return this.addPointerListener(obj, type, handler, id);
		}
		if (L.Browser.touch && (type === 'dblclick') && this.addDoubleTapListener) {
			this.addDoubleTapListener(obj, handler, id);
		}

		if ('addEventListener' in obj) {

			if (type === 'mousewheel') {
				obj.addEventListener('DOMMouseScroll', handler, false);
				obj.addEventListener(type, handler, false);

			} else if ((type === 'mouseenter') || (type === 'mouseleave')) {

				originalHandler = handler;
				newType = (type === 'mouseenter' ? 'mouseover' : 'mouseout');

				handler = function (e) {
					if (!L.DomEvent._checkMouse(obj, e)) { return; }
					return originalHandler(e);
				};

				obj.addEventListener(newType, handler, false);

			} else if (type === 'click' && L.Browser.android) {
				originalHandler = handler;
				handler = function (e) {
					return L.DomEvent._filterClick(e, originalHandler);
				};

				obj.addEventListener(type, handler, false);
			} else {
				obj.addEventListener(type, handler, false);
			}

		} else if ('attachEvent' in obj) {
			obj.attachEvent('on' + type, handler);
		}

		obj[key] = handler;

		return this;
	},

	removeListener: function (obj, type, fn) {  // (HTMLElement, String, Function)

		var id = L.stamp(fn),
		    key = '_leaflet_' + type + id,
		    handler = obj[key];

		if (!handler) { return this; }

		if (L.Browser.pointer && type.indexOf('touch') === 0) {
			this.removePointerListener(obj, type, id);
		} else if (L.Browser.touch && (type === 'dblclick') && this.removeDoubleTapListener) {
			this.removeDoubleTapListener(obj, id);

		} else if ('removeEventListener' in obj) {

			if (type === 'mousewheel') {
				obj.removeEventListener('DOMMouseScroll', handler, false);
				obj.removeEventListener(type, handler, false);

			} else if ((type === 'mouseenter') || (type === 'mouseleave')) {
				obj.removeEventListener((type === 'mouseenter' ? 'mouseover' : 'mouseout'), handler, false);
			} else {
				obj.removeEventListener(type, handler, false);
			}
		} else if ('detachEvent' in obj) {
			obj.detachEvent('on' + type, handler);
		}

		obj[key] = null;

		return this;
	},

	stopPropagation: function (e) {

		if (e.stopPropagation) {
			e.stopPropagation();
		} else {
			e.cancelBubble = true;
		}
		L.DomEvent._skipped(e);

		return this;
	},

	disableScrollPropagation: function (el) {
		var stop = L.DomEvent.stopPropagation;

		return L.DomEvent
			.on(el, 'mousewheel', stop)
			.on(el, 'MozMousePixelScroll', stop);
	},

	disableClickPropagation: function (el) {
		var stop = L.DomEvent.stopPropagation;

		for (var i = L.Draggable.START.length - 1; i >= 0; i--) {
			L.DomEvent.on(el, L.Draggable.START[i], stop);
		}

		return L.DomEvent
			.on(el, 'click', L.DomEvent._fakeStop)
			.on(el, 'dblclick', stop);
	},

	preventDefault: function (e) {

		if (e.preventDefault) {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}
		return this;
	},

	stop: function (e) {
		return L.DomEvent
			.preventDefault(e)
			.stopPropagation(e);
	},

	getMousePosition: function (e, container) {
		if (!container) {
			return new L.Point(e.clientX, e.clientY);
		}

		var rect = container.getBoundingClientRect();

		return new L.Point(
			e.clientX - rect.left - container.clientLeft,
			e.clientY - rect.top - container.clientTop);
	},

	getWheelDelta: function (e) {

		var delta = 0;

		if (e.wheelDelta) {
			delta = e.wheelDelta / 120;
		}
		if (e.detail) {
			delta = -e.detail / 3;
		}
		return delta;
	},

	_skipEvents: {},

	_fakeStop: function (e) {
		// fakes stopPropagation by setting a special event flag, checked/reset with L.DomEvent._skipped(e)
		L.DomEvent._skipEvents[e.type] = true;
	},

	_skipped: function (e) {
		var skipped = this._skipEvents[e.type];
		// reset when checking, as it's only used in map container and propagates outside of the map
		this._skipEvents[e.type] = false;
		return skipped;
	},

	// check if element really left/entered the event target (for mouseenter/mouseleave)
	_checkMouse: function (el, e) {

		var related = e.relatedTarget;

		if (!related) { return true; }

		try {
			while (related && (related !== el)) {
				related = related.parentNode;
			}
		} catch (err) {
			return false;
		}
		return (related !== el);
	},

	_getEvent: function () { // evil magic for IE
		/*jshint noarg:false */
		var e = window.event;
		if (!e) {
			var caller = arguments.callee.caller;
			while (caller) {
				e = caller['arguments'][0];
				if (e && window.Event === e.constructor) {
					break;
				}
				caller = caller.caller;
			}
		}
		return e;
	},

	// this is a horrible workaround for a bug in Android where a single touch triggers two click events
	_filterClick: function (e, handler) {
		var timeStamp = (e.timeStamp || e.originalEvent.timeStamp),
			elapsed = L.DomEvent._lastClick && (timeStamp - L.DomEvent._lastClick);

		// are they closer together than 500ms yet more than 100ms?
		// Android typically triggers them ~300ms apart while multiple listeners
		// on the same event should be triggered far faster;
		// or check if click is simulated on the element, and if it is, reject any non-simulated events

		if ((elapsed && elapsed > 100 && elapsed < 500) || (e.target._simulatedClick && !e._simulated)) {
			L.DomEvent.stop(e);
			return;
		}
		L.DomEvent._lastClick = timeStamp;

		return handler(e);
	}
};

L.DomEvent.on = L.DomEvent.addListener;
L.DomEvent.off = L.DomEvent.removeListener;


/*
 * L.Draggable allows you to add dragging capabilities to any element. Supports mobile devices too.
 */

L.Draggable = L.Class.extend({
	includes: L.Mixin.Events,

	statics: {
		START: L.Browser.touch ? ['touchstart', 'mousedown'] : ['mousedown'],
		END: {
			mousedown: 'mouseup',
			touchstart: 'touchend',
			pointerdown: 'touchend',
			MSPointerDown: 'touchend'
		},
		MOVE: {
			mousedown: 'mousemove',
			touchstart: 'touchmove',
			pointerdown: 'touchmove',
			MSPointerDown: 'touchmove'
		}
	},

	initialize: function (element, dragStartTarget) {
		this._element = element;
		this._dragStartTarget = dragStartTarget || element;
	},

	enable: function () {
		if (this._enabled) { return; }

		for (var i = L.Draggable.START.length - 1; i >= 0; i--) {
			L.DomEvent.on(this._dragStartTarget, L.Draggable.START[i], this._onDown, this);
		}

		this._enabled = true;
	},

	disable: function () {
		if (!this._enabled) { return; }

		for (var i = L.Draggable.START.length - 1; i >= 0; i--) {
			L.DomEvent.off(this._dragStartTarget, L.Draggable.START[i], this._onDown, this);
		}

		this._enabled = false;
		this._moved = false;
	},

	_onDown: function (e) {
		this._moved = false;

		if (e.shiftKey || ((e.which !== 1) && (e.button !== 1) && !e.touches)) { return; }

		L.DomEvent.stopPropagation(e);

		if (L.Draggable._disabled) { return; }

		L.DomUtil.disableImageDrag();
		L.DomUtil.disableTextSelection();

		if (this._moving) { return; }

		var first = e.touches ? e.touches[0] : e;

		this._startPoint = new L.Point(first.clientX, first.clientY);
		this._startPos = this._newPos = L.DomUtil.getPosition(this._element);

		L.DomEvent
		    .on(document, L.Draggable.MOVE[e.type], this._onMove, this)
		    .on(document, L.Draggable.END[e.type], this._onUp, this);
	},

	_onMove: function (e) {
		if (e.touches && e.touches.length > 1) {
			this._moved = true;
			return;
		}

		var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
		    newPoint = new L.Point(first.clientX, first.clientY),
		    offset = newPoint.subtract(this._startPoint);

		if (!offset.x && !offset.y) { return; }
		if (L.Browser.touch && Math.abs(offset.x) + Math.abs(offset.y) < 3) { return; }

		L.DomEvent.preventDefault(e);

		if (!this._moved) {
			this.fire('dragstart');

			this._moved = true;
			this._startPos = L.DomUtil.getPosition(this._element).subtract(offset);

			L.DomUtil.addClass(document.body, 'leaflet-dragging');
			this._lastTarget = e.target || e.srcElement;
			L.DomUtil.addClass(this._lastTarget, 'leaflet-drag-target');
		}

		this._newPos = this._startPos.add(offset);
		this._moving = true;

		L.Util.cancelAnimFrame(this._animRequest);
		this._animRequest = L.Util.requestAnimFrame(this._updatePosition, this, true, this._dragStartTarget);
	},

	_updatePosition: function () {
		this.fire('predrag');
		L.DomUtil.setPosition(this._element, this._newPos);
		this.fire('drag');
	},

	_onUp: function () {
		L.DomUtil.removeClass(document.body, 'leaflet-dragging');

		if (this._lastTarget) {
			L.DomUtil.removeClass(this._lastTarget, 'leaflet-drag-target');
			this._lastTarget = null;
		}

		for (var i in L.Draggable.MOVE) {
			L.DomEvent
			    .off(document, L.Draggable.MOVE[i], this._onMove)
			    .off(document, L.Draggable.END[i], this._onUp);
		}

		L.DomUtil.enableImageDrag();
		L.DomUtil.enableTextSelection();

		if (this._moved && this._moving) {
			// ensure drag is not fired after dragend
			L.Util.cancelAnimFrame(this._animRequest);

			this.fire('dragend', {
				distance: this._newPos.distanceTo(this._startPos)
			});
		}

		this._moving = false;
	}
});


/*
	L.Handler is a base class for handler classes that are used internally to inject
	interaction features like dragging to classes like Map and Marker.
*/

L.Handler = L.Class.extend({
	initialize: function (map) {
		this._map = map;
	},

	enable: function () {
		if (this._enabled) { return; }

		this._enabled = true;
		this.addHooks();
	},

	disable: function () {
		if (!this._enabled) { return; }

		this._enabled = false;
		this.removeHooks();
	},

	enabled: function () {
		return !!this._enabled;
	}
});


/*
 * L.Handler.MapDrag is used to make the map draggable (with panning inertia), enabled by default.
 */

L.Map.mergeOptions({
	dragging: true,

	inertia: !L.Browser.android23,
	inertiaDeceleration: 3400, // px/s^2
	inertiaMaxSpeed: Infinity, // px/s
	inertiaThreshold: L.Browser.touch ? 32 : 18, // ms
	easeLinearity: 0.25,

	// TODO refactor, move to CRS
	worldCopyJump: false
});

L.Map.Drag = L.Handler.extend({
	addHooks: function () {
		if (!this._draggable) {
			var map = this._map;

			this._draggable = new L.Draggable(map._mapPane, map._container);

			this._draggable.on({
				'dragstart': this._onDragStart,
				'drag': this._onDrag,
				'dragend': this._onDragEnd
			}, this);

			if (map.options.worldCopyJump) {
				this._draggable.on('predrag', this._onPreDrag, this);
				map.on('viewreset', this._onViewReset, this);

				map.whenReady(this._onViewReset, this);
			}
		}
		this._draggable.enable();
	},

	removeHooks: function () {
		this._draggable.disable();
	},

	moved: function () {
		return this._draggable && this._draggable._moved;
	},

	_onDragStart: function () {
		var map = this._map;

		if (map._panAnim) {
			map._panAnim.stop();
		}

		map
		    .fire('movestart')
		    .fire('dragstart');

		if (map.options.inertia) {
			this._positions = [];
			this._times = [];
		}
	},

	_onDrag: function () {
		if (this._map.options.inertia) {
			var time = this._lastTime = +new Date(),
			    pos = this._lastPos = this._draggable._newPos;

			this._positions.push(pos);
			this._times.push(time);

			if (time - this._times[0] > 200) {
				this._positions.shift();
				this._times.shift();
			}
		}

		this._map
		    .fire('move')
		    .fire('drag');
	},

	_onViewReset: function () {
		// TODO fix hardcoded Earth values
		var pxCenter = this._map.getSize()._divideBy(2),
		    pxWorldCenter = this._map.latLngToLayerPoint([0, 0]);

		this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
		this._worldWidth = this._map.project([0, 180]).x;
	},

	_onPreDrag: function () {
		// TODO refactor to be able to adjust map pane position after zoom
		var worldWidth = this._worldWidth,
		    halfWidth = Math.round(worldWidth / 2),
		    dx = this._initialWorldOffset,
		    x = this._draggable._newPos.x,
		    newX1 = (x - halfWidth + dx) % worldWidth + halfWidth - dx,
		    newX2 = (x + halfWidth + dx) % worldWidth - halfWidth - dx,
		    newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;

		this._draggable._newPos.x = newX;
	},

	_onDragEnd: function (e) {
		var map = this._map,
		    options = map.options,
		    delay = +new Date() - this._lastTime,

		    noInertia = !options.inertia || delay > options.inertiaThreshold || !this._positions[0];

		map.fire('dragend', e);

		if (noInertia) {
			map.fire('moveend');

		} else {

			var direction = this._lastPos.subtract(this._positions[0]),
			    duration = (this._lastTime + delay - this._times[0]) / 1000,
			    ease = options.easeLinearity,

			    speedVector = direction.multiplyBy(ease / duration),
			    speed = speedVector.distanceTo([0, 0]),

			    limitedSpeed = Math.min(options.inertiaMaxSpeed, speed),
			    limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed),

			    decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease),
			    offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();

			if (!offset.x || !offset.y) {
				map.fire('moveend');

			} else {
				offset = map._limitOffset(offset, map.options.maxBounds);

				L.Util.requestAnimFrame(function () {
					map.panBy(offset, {
						duration: decelerationDuration,
						easeLinearity: ease,
						noMoveStart: true
					});
				});
			}
		}
	}
});

L.Map.addInitHook('addHandler', 'dragging', L.Map.Drag);


/*
 * L.Handler.DoubleClickZoom is used to handle double-click zoom on the map, enabled by default.
 */

L.Map.mergeOptions({
	doubleClickZoom: true
});

L.Map.DoubleClickZoom = L.Handler.extend({
	addHooks: function () {
		this._map.on('dblclick', this._onDoubleClick, this);
	},

	removeHooks: function () {
		this._map.off('dblclick', this._onDoubleClick, this);
	},

	_onDoubleClick: function (e) {
		var map = this._map,
		    zoom = map.getZoom() + (e.originalEvent.shiftKey ? -1 : 1);

		if (map.options.doubleClickZoom === 'center') {
			map.setZoom(zoom);
		} else {
			map.setZoomAround(e.containerPoint, zoom);
		}
	}
});

L.Map.addInitHook('addHandler', 'doubleClickZoom', L.Map.DoubleClickZoom);


/*
 * L.Handler.ScrollWheelZoom is used by L.Map to enable mouse scroll wheel zoom on the map.
 */

L.Map.mergeOptions({
	scrollWheelZoom: true
});

L.Map.ScrollWheelZoom = L.Handler.extend({
	addHooks: function () {
		L.DomEvent.on(this._map._container, 'mousewheel', this._onWheelScroll, this);
		L.DomEvent.on(this._map._container, 'MozMousePixelScroll', L.DomEvent.preventDefault);
		this._delta = 0;
	},

	removeHooks: function () {
		L.DomEvent.off(this._map._container, 'mousewheel', this._onWheelScroll);
		L.DomEvent.off(this._map._container, 'MozMousePixelScroll', L.DomEvent.preventDefault);
	},

	_onWheelScroll: function (e) {
		var delta = L.DomEvent.getWheelDelta(e);

		this._delta += delta;
		this._lastMousePos = this._map.mouseEventToContainerPoint(e);

		if (!this._startTime) {
			this._startTime = +new Date();
		}

		var left = Math.max(40 - (+new Date() - this._startTime), 0);

		clearTimeout(this._timer);
		this._timer = setTimeout(L.bind(this._performZoom, this), left);

		L.DomEvent.preventDefault(e);
		L.DomEvent.stopPropagation(e);
	},

	_performZoom: function () {
		var map = this._map,
		    delta = this._delta,
		    zoom = map.getZoom();

		delta = delta > 0 ? Math.ceil(delta) : Math.floor(delta);
		delta = Math.max(Math.min(delta, 4), -4);
		delta = map._limitZoom(zoom + delta) - zoom;

		this._delta = 0;
		this._startTime = null;

		if (!delta) { return; }

		if (map.options.scrollWheelZoom === 'center') {
			map.setZoom(zoom + delta);
		} else {
			map.setZoomAround(this._lastMousePos, zoom + delta);
		}
	}
});

L.Map.addInitHook('addHandler', 'scrollWheelZoom', L.Map.ScrollWheelZoom);


/*
 * Extends the event handling code with double tap support for mobile browsers.
 */

L.extend(L.DomEvent, {

	_touchstart: L.Browser.msPointer ? 'MSPointerDown' : L.Browser.pointer ? 'pointerdown' : 'touchstart',
	_touchend: L.Browser.msPointer ? 'MSPointerUp' : L.Browser.pointer ? 'pointerup' : 'touchend',

	// inspired by Zepto touch code by Thomas Fuchs
	addDoubleTapListener: function (obj, handler, id) {
		var last,
		    doubleTap = false,
		    delay = 250,
		    touch,
		    pre = '_leaflet_',
		    touchstart = this._touchstart,
		    touchend = this._touchend,
		    trackedTouches = [];

		function onTouchStart(e) {
			var count;

			if (L.Browser.pointer) {
				trackedTouches.push(e.pointerId);
				count = trackedTouches.length;
			} else {
				count = e.touches.length;
			}
			if (count > 1) {
				return;
			}

			var now = Date.now(),
				delta = now - (last || now);

			touch = e.touches ? e.touches[0] : e;
			doubleTap = (delta > 0 && delta <= delay);
			last = now;
		}

		function onTouchEnd(e) {
			if (L.Browser.pointer) {
				var idx = trackedTouches.indexOf(e.pointerId);
				if (idx === -1) {
					return;
				}
				trackedTouches.splice(idx, 1);
			}

			if (doubleTap) {
				if (L.Browser.pointer) {
					// work around .type being readonly with MSPointer* events
					var newTouch = { },
						prop;

					// jshint forin:false
					for (var i in touch) {
						prop = touch[i];
						if (typeof prop === 'function') {
							newTouch[i] = prop.bind(touch);
						} else {
							newTouch[i] = prop;
						}
					}
					touch = newTouch;
				}
				touch.type = 'dblclick';
				handler(touch);
				last = null;
			}
		}
		obj[pre + touchstart + id] = onTouchStart;
		obj[pre + touchend + id] = onTouchEnd;

		// on pointer we need to listen on the document, otherwise a drag starting on the map and moving off screen
		// will not come through to us, so we will lose track of how many touches are ongoing
		var endElement = L.Browser.pointer ? document.documentElement : obj;

		obj.addEventListener(touchstart, onTouchStart, false);
		endElement.addEventListener(touchend, onTouchEnd, false);

		if (L.Browser.pointer) {
			endElement.addEventListener(L.DomEvent.POINTER_CANCEL, onTouchEnd, false);
		}

		return this;
	},

	removeDoubleTapListener: function (obj, id) {
		var pre = '_leaflet_';

		obj.removeEventListener(this._touchstart, obj[pre + this._touchstart + id], false);
		(L.Browser.pointer ? document.documentElement : obj).removeEventListener(
		        this._touchend, obj[pre + this._touchend + id], false);

		if (L.Browser.pointer) {
			document.documentElement.removeEventListener(L.DomEvent.POINTER_CANCEL, obj[pre + this._touchend + id],
				false);
		}

		return this;
	}
});


/*
 * Extends L.DomEvent to provide touch support for Internet Explorer and Windows-based devices.
 */

L.extend(L.DomEvent, {

	//static
	POINTER_DOWN: L.Browser.msPointer ? 'MSPointerDown' : 'pointerdown',
	POINTER_MOVE: L.Browser.msPointer ? 'MSPointerMove' : 'pointermove',
	POINTER_UP: L.Browser.msPointer ? 'MSPointerUp' : 'pointerup',
	POINTER_CANCEL: L.Browser.msPointer ? 'MSPointerCancel' : 'pointercancel',

	_pointers: [],
	_pointerDocumentListener: false,

	// Provides a touch events wrapper for (ms)pointer events.
	// Based on changes by veproza https://github.com/CloudMade/Leaflet/pull/1019
	//ref http://www.w3.org/TR/pointerevents/ https://www.w3.org/Bugs/Public/show_bug.cgi?id=22890

	addPointerListener: function (obj, type, handler, id) {

		switch (type) {
		case 'touchstart':
			return this.addPointerListenerStart(obj, type, handler, id);
		case 'touchend':
			return this.addPointerListenerEnd(obj, type, handler, id);
		case 'touchmove':
			return this.addPointerListenerMove(obj, type, handler, id);
		default:
			throw 'Unknown touch event type';
		}
	},

	addPointerListenerStart: function (obj, type, handler, id) {
		var pre = '_leaflet_',
		    pointers = this._pointers;

		var cb = function (e) {
			if (e.pointerType !== 'mouse' && e.pointerType !== e.MSPOINTER_TYPE_MOUSE) {
				L.DomEvent.preventDefault(e);
			}

			var alreadyInArray = false;
			for (var i = 0; i < pointers.length; i++) {
				if (pointers[i].pointerId === e.pointerId) {
					alreadyInArray = true;
					break;
				}
			}
			if (!alreadyInArray) {
				pointers.push(e);
			}

			e.touches = pointers.slice();
			e.changedTouches = [e];

			handler(e);
		};

		obj[pre + 'touchstart' + id] = cb;
		obj.addEventListener(this.POINTER_DOWN, cb, false);

		// need to also listen for end events to keep the _pointers list accurate
		// this needs to be on the body and never go away
		if (!this._pointerDocumentListener) {
			var internalCb = function (e) {
				for (var i = 0; i < pointers.length; i++) {
					if (pointers[i].pointerId === e.pointerId) {
						pointers.splice(i, 1);
						break;
					}
				}
			};
			//We listen on the documentElement as any drags that end by moving the touch off the screen get fired there
			document.documentElement.addEventListener(this.POINTER_UP, internalCb, false);
			document.documentElement.addEventListener(this.POINTER_CANCEL, internalCb, false);

			this._pointerDocumentListener = true;
		}

		return this;
	},

	addPointerListenerMove: function (obj, type, handler, id) {
		var pre = '_leaflet_',
		    touches = this._pointers;

		function cb(e) {

			// don't fire touch moves when mouse isn't down
			if ((e.pointerType === e.MSPOINTER_TYPE_MOUSE || e.pointerType === 'mouse') && e.buttons === 0) { return; }

			for (var i = 0; i < touches.length; i++) {
				if (touches[i].pointerId === e.pointerId) {
					touches[i] = e;
					break;
				}
			}

			e.touches = touches.slice();
			e.changedTouches = [e];

			handler(e);
		}

		obj[pre + 'touchmove' + id] = cb;
		obj.addEventListener(this.POINTER_MOVE, cb, false);

		return this;
	},

	addPointerListenerEnd: function (obj, type, handler, id) {
		var pre = '_leaflet_',
		    touches = this._pointers;

		var cb = function (e) {
			for (var i = 0; i < touches.length; i++) {
				if (touches[i].pointerId === e.pointerId) {
					touches.splice(i, 1);
					break;
				}
			}

			e.touches = touches.slice();
			e.changedTouches = [e];

			handler(e);
		};

		obj[pre + 'touchend' + id] = cb;
		obj.addEventListener(this.POINTER_UP, cb, false);
		obj.addEventListener(this.POINTER_CANCEL, cb, false);

		return this;
	},

	removePointerListener: function (obj, type, id) {
		var pre = '_leaflet_',
		    cb = obj[pre + type + id];

		switch (type) {
		case 'touchstart':
			obj.removeEventListener(this.POINTER_DOWN, cb, false);
			break;
		case 'touchmove':
			obj.removeEventListener(this.POINTER_MOVE, cb, false);
			break;
		case 'touchend':
			obj.removeEventListener(this.POINTER_UP, cb, false);
			obj.removeEventListener(this.POINTER_CANCEL, cb, false);
			break;
		}

		return this;
	}
});


/*
 * L.Handler.TouchZoom is used by L.Map to add pinch zoom on supported mobile browsers.
 */

L.Map.mergeOptions({
	touchZoom: L.Browser.touch && !L.Browser.android23,
	bounceAtZoomLimits: true
});

L.Map.TouchZoom = L.Handler.extend({
	addHooks: function () {
		L.DomEvent.on(this._map._container, 'touchstart', this._onTouchStart, this);
	},

	removeHooks: function () {
		L.DomEvent.off(this._map._container, 'touchstart', this._onTouchStart, this);
	},

	_onTouchStart: function (e) {
		var map = this._map;

		if (!e.touches || e.touches.length !== 2 || map._animatingZoom || this._zooming) { return; }

		var p1 = map.mouseEventToLayerPoint(e.touches[0]),
		    p2 = map.mouseEventToLayerPoint(e.touches[1]),
		    viewCenter = map._getCenterLayerPoint();

		this._startCenter = p1.add(p2)._divideBy(2);
		this._startDist = p1.distanceTo(p2);

		this._moved = false;
		this._zooming = true;

		this._centerOffset = viewCenter.subtract(this._startCenter);

		if (map._panAnim) {
			map._panAnim.stop();
		}

		L.DomEvent
		    .on(document, 'touchmove', this._onTouchMove, this)
		    .on(document, 'touchend', this._onTouchEnd, this);

		L.DomEvent.preventDefault(e);
	},

	_onTouchMove: function (e) {
		var map = this._map;

		if (!e.touches || e.touches.length !== 2 || !this._zooming) { return; }

		var p1 = map.mouseEventToLayerPoint(e.touches[0]),
		    p2 = map.mouseEventToLayerPoint(e.touches[1]);

		this._scale = p1.distanceTo(p2) / this._startDist;
		this._delta = p1._add(p2)._divideBy(2)._subtract(this._startCenter);

		if (this._scale === 1) { return; }

		if (!map.options.bounceAtZoomLimits) {
			if ((map.getZoom() === map.getMinZoom() && this._scale < 1) ||
			    (map.getZoom() === map.getMaxZoom() && this._scale > 1)) { return; }
		}

		if (!this._moved) {
			L.DomUtil.addClass(map._mapPane, 'leaflet-touching');

			map
			    .fire('movestart')
			    .fire('zoomstart');

			this._moved = true;
		}

		L.Util.cancelAnimFrame(this._animRequest);
		this._animRequest = L.Util.requestAnimFrame(
		        this._updateOnMove, this, true, this._map._container);

		L.DomEvent.preventDefault(e);
	},

	_updateOnMove: function () {
		var map = this._map,
		    origin = this._getScaleOrigin(),
		    center = map.layerPointToLatLng(origin),
		    zoom = map.getScaleZoom(this._scale);

		map._animateZoom(center, zoom, this._startCenter, this._scale, this._delta, false, true);
	},

	_onTouchEnd: function () {
		if (!this._moved || !this._zooming) {
			this._zooming = false;
			return;
		}

		var map = this._map;

		this._zooming = false;
		L.DomUtil.removeClass(map._mapPane, 'leaflet-touching');
		L.Util.cancelAnimFrame(this._animRequest);

		L.DomEvent
		    .off(document, 'touchmove', this._onTouchMove)
		    .off(document, 'touchend', this._onTouchEnd);

		var origin = this._getScaleOrigin(),
		    center = map.layerPointToLatLng(origin),

		    oldZoom = map.getZoom(),
		    floatZoomDelta = map.getScaleZoom(this._scale) - oldZoom,
		    roundZoomDelta = (floatZoomDelta > 0 ?
		            Math.ceil(floatZoomDelta) : Math.floor(floatZoomDelta)),

		    zoom = map._limitZoom(oldZoom + roundZoomDelta),
		    scale = map.getZoomScale(zoom) / this._scale;

		map._animateZoom(center, zoom, origin, scale);
	},

	_getScaleOrigin: function () {
		var centerOffset = this._centerOffset.subtract(this._delta).divideBy(this._scale);
		return this._startCenter.add(centerOffset);
	}
});

L.Map.addInitHook('addHandler', 'touchZoom', L.Map.TouchZoom);


/*
 * L.Map.Tap is used to enable mobile hacks like quick taps and long hold.
 */

L.Map.mergeOptions({
	tap: true,
	tapTolerance: 15
});

L.Map.Tap = L.Handler.extend({
	addHooks: function () {
		L.DomEvent.on(this._map._container, 'touchstart', this._onDown, this);
	},

	removeHooks: function () {
		L.DomEvent.off(this._map._container, 'touchstart', this._onDown, this);
	},

	_onDown: function (e) {
		if (!e.touches) { return; }

		L.DomEvent.preventDefault(e);

		this._fireClick = true;

		// don't simulate click or track longpress if more than 1 touch
		if (e.touches.length > 1) {
			this._fireClick = false;
			clearTimeout(this._holdTimeout);
			return;
		}

		var first = e.touches[0],
		    el = first.target;

		this._startPos = this._newPos = new L.Point(first.clientX, first.clientY);

		// if touching a link, highlight it
		if (el.tagName && el.tagName.toLowerCase() === 'a') {
			L.DomUtil.addClass(el, 'leaflet-active');
		}

		// simulate long hold but setting a timeout
		this._holdTimeout = setTimeout(L.bind(function () {
			if (this._isTapValid()) {
				this._fireClick = false;
				this._onUp();
				this._simulateEvent('contextmenu', first);
			}
		}, this), 1000);

		L.DomEvent
			.on(document, 'touchmove', this._onMove, this)
			.on(document, 'touchend', this._onUp, this);
	},

	_onUp: function (e) {
		clearTimeout(this._holdTimeout);

		L.DomEvent
			.off(document, 'touchmove', this._onMove, this)
			.off(document, 'touchend', this._onUp, this);

		if (this._fireClick && e && e.changedTouches) {

			var first = e.changedTouches[0],
			    el = first.target;

			if (el && el.tagName && el.tagName.toLowerCase() === 'a') {
				L.DomUtil.removeClass(el, 'leaflet-active');
			}

			// simulate click if the touch didn't move too much
			if (this._isTapValid()) {
				this._simulateEvent('click', first);
			}
		}
	},

	_isTapValid: function () {
		return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
	},

	_onMove: function (e) {
		var first = e.touches[0];
		this._newPos = new L.Point(first.clientX, first.clientY);
	},

	_simulateEvent: function (type, e) {
		var simulatedEvent = document.createEvent('MouseEvents');

		simulatedEvent._simulated = true;
		e.target._simulatedClick = true;

		simulatedEvent.initMouseEvent(
		        type, true, true, window, 1,
		        e.screenX, e.screenY,
		        e.clientX, e.clientY,
		        false, false, false, false, 0, null);

		e.target.dispatchEvent(simulatedEvent);
	}
});

if (L.Browser.touch && !L.Browser.pointer) {
	L.Map.addInitHook('addHandler', 'tap', L.Map.Tap);
}


/*
 * L.Handler.ShiftDragZoom is used to add shift-drag zoom interaction to the map
  * (zoom to a selected bounding box), enabled by default.
 */

L.Map.mergeOptions({
	boxZoom: true
});

L.Map.BoxZoom = L.Handler.extend({
	initialize: function (map) {
		this._map = map;
		this._container = map._container;
		this._pane = map._panes.overlayPane;
		this._moved = false;
	},

	addHooks: function () {
		L.DomEvent.on(this._container, 'mousedown', this._onMouseDown, this);
	},

	removeHooks: function () {
		L.DomEvent.off(this._container, 'mousedown', this._onMouseDown);
		this._moved = false;
	},

	moved: function () {
		return this._moved;
	},

	_onMouseDown: function (e) {
		this._moved = false;

		if (!e.shiftKey || ((e.which !== 1) && (e.button !== 1))) { return false; }

		L.DomUtil.disableTextSelection();
		L.DomUtil.disableImageDrag();

		this._startLayerPoint = this._map.mouseEventToLayerPoint(e);

		L.DomEvent
		    .on(document, 'mousemove', this._onMouseMove, this)
		    .on(document, 'mouseup', this._onMouseUp, this)
		    .on(document, 'keydown', this._onKeyDown, this);
	},

	_onMouseMove: function (e) {
		if (!this._moved) {
			this._box = L.DomUtil.create('div', 'leaflet-zoom-box', this._pane);
			L.DomUtil.setPosition(this._box, this._startLayerPoint);

			//TODO refactor: move cursor to styles
			this._container.style.cursor = 'crosshair';
			this._map.fire('boxzoomstart');
		}

		var startPoint = this._startLayerPoint,
		    box = this._box,

		    layerPoint = this._map.mouseEventToLayerPoint(e),
		    offset = layerPoint.subtract(startPoint),

		    newPos = new L.Point(
		        Math.min(layerPoint.x, startPoint.x),
		        Math.min(layerPoint.y, startPoint.y));

		L.DomUtil.setPosition(box, newPos);

		this._moved = true;

		// TODO refactor: remove hardcoded 4 pixels
		box.style.width  = (Math.max(0, Math.abs(offset.x) - 4)) + 'px';
		box.style.height = (Math.max(0, Math.abs(offset.y) - 4)) + 'px';
	},

	_finish: function () {
		if (this._moved) {
			this._pane.removeChild(this._box);
			this._container.style.cursor = '';
		}

		L.DomUtil.enableTextSelection();
		L.DomUtil.enableImageDrag();

		L.DomEvent
		    .off(document, 'mousemove', this._onMouseMove)
		    .off(document, 'mouseup', this._onMouseUp)
		    .off(document, 'keydown', this._onKeyDown);
	},

	_onMouseUp: function (e) {

		this._finish();

		var map = this._map,
		    layerPoint = map.mouseEventToLayerPoint(e);

		if (this._startLayerPoint.equals(layerPoint)) { return; }

		var bounds = new L.LatLngBounds(
		        map.layerPointToLatLng(this._startLayerPoint),
		        map.layerPointToLatLng(layerPoint));

		map.fitBounds(bounds);

		map.fire('boxzoomend', {
			boxZoomBounds: bounds
		});
	},

	_onKeyDown: function (e) {
		if (e.keyCode === 27) {
			this._finish();
		}
	}
});

L.Map.addInitHook('addHandler', 'boxZoom', L.Map.BoxZoom);


/*
 * L.Map.Keyboard is handling keyboard interaction with the map, enabled by default.
 */

L.Map.mergeOptions({
	keyboard: true,
	keyboardPanOffset: 80,
	keyboardZoomOffset: 1
});

L.Map.Keyboard = L.Handler.extend({

	keyCodes: {
		left:    [37],
		right:   [39],
		down:    [40],
		up:      [38],
		zoomIn:  [187, 107, 61, 171],
		zoomOut: [189, 109, 173]
	},

	initialize: function (map) {
		this._map = map;

		this._setPanOffset(map.options.keyboardPanOffset);
		this._setZoomOffset(map.options.keyboardZoomOffset);
	},

	addHooks: function () {
		var container = this._map._container;

		// make the container focusable by tabbing
		if (container.tabIndex === -1) {
			container.tabIndex = '0';
		}

		L.DomEvent
		    .on(container, 'focus', this._onFocus, this)
		    .on(container, 'blur', this._onBlur, this)
		    .on(container, 'mousedown', this._onMouseDown, this);

		this._map
		    .on('focus', this._addHooks, this)
		    .on('blur', this._removeHooks, this);
	},

	removeHooks: function () {
		this._removeHooks();

		var container = this._map._container;

		L.DomEvent
		    .off(container, 'focus', this._onFocus, this)
		    .off(container, 'blur', this._onBlur, this)
		    .off(container, 'mousedown', this._onMouseDown, this);

		this._map
		    .off('focus', this._addHooks, this)
		    .off('blur', this._removeHooks, this);
	},

	_onMouseDown: function () {
		if (this._focused) { return; }

		var body = document.body,
		    docEl = document.documentElement,
		    top = body.scrollTop || docEl.scrollTop,
		    left = body.scrollLeft || docEl.scrollLeft;

		this._map._container.focus();

		window.scrollTo(left, top);
	},

	_onFocus: function () {
		this._focused = true;
		this._map.fire('focus');
	},

	_onBlur: function () {
		this._focused = false;
		this._map.fire('blur');
	},

	_setPanOffset: function (pan) {
		var keys = this._panKeys = {},
		    codes = this.keyCodes,
		    i, len;

		for (i = 0, len = codes.left.length; i < len; i++) {
			keys[codes.left[i]] = [-1 * pan, 0];
		}
		for (i = 0, len = codes.right.length; i < len; i++) {
			keys[codes.right[i]] = [pan, 0];
		}
		for (i = 0, len = codes.down.length; i < len; i++) {
			keys[codes.down[i]] = [0, pan];
		}
		for (i = 0, len = codes.up.length; i < len; i++) {
			keys[codes.up[i]] = [0, -1 * pan];
		}
	},

	_setZoomOffset: function (zoom) {
		var keys = this._zoomKeys = {},
		    codes = this.keyCodes,
		    i, len;

		for (i = 0, len = codes.zoomIn.length; i < len; i++) {
			keys[codes.zoomIn[i]] = zoom;
		}
		for (i = 0, len = codes.zoomOut.length; i < len; i++) {
			keys[codes.zoomOut[i]] = -zoom;
		}
	},

	_addHooks: function () {
		L.DomEvent.on(document, 'keydown', this._onKeyDown, this);
	},

	_removeHooks: function () {
		L.DomEvent.off(document, 'keydown', this._onKeyDown, this);
	},

	_onKeyDown: function (e) {
		var key = e.keyCode,
		    map = this._map;

		if (key in this._panKeys) {

			if (map._panAnim && map._panAnim._inProgress) { return; }

			map.panBy(this._panKeys[key]);

			if (map.options.maxBounds) {
				map.panInsideBounds(map.options.maxBounds);
			}

		} else if (key in this._zoomKeys) {
			map.setZoom(map.getZoom() + this._zoomKeys[key]);

		} else {
			return;
		}

		L.DomEvent.stop(e);
	}
});

L.Map.addInitHook('addHandler', 'keyboard', L.Map.Keyboard);


/*
 * L.Handler.MarkerDrag is used internally by L.Marker to make the markers draggable.
 */

L.Handler.MarkerDrag = L.Handler.extend({
	initialize: function (marker) {
		this._marker = marker;
	},

	addHooks: function () {
		var icon = this._marker._icon;
		if (!this._draggable) {
			this._draggable = new L.Draggable(icon, icon);
		}

		this._draggable
			.on('dragstart', this._onDragStart, this)
			.on('drag', this._onDrag, this)
			.on('dragend', this._onDragEnd, this);
		this._draggable.enable();
		L.DomUtil.addClass(this._marker._icon, 'leaflet-marker-draggable');
	},

	removeHooks: function () {
		this._draggable
			.off('dragstart', this._onDragStart, this)
			.off('drag', this._onDrag, this)
			.off('dragend', this._onDragEnd, this);

		this._draggable.disable();
		L.DomUtil.removeClass(this._marker._icon, 'leaflet-marker-draggable');
	},

	moved: function () {
		return this._draggable && this._draggable._moved;
	},

	_onDragStart: function () {
		this._marker
		    .closePopup()
		    .fire('movestart')
		    .fire('dragstart');
	},

	_onDrag: function () {
		var marker = this._marker,
		    shadow = marker._shadow,
		    iconPos = L.DomUtil.getPosition(marker._icon),
		    latlng = marker._map.layerPointToLatLng(iconPos);

		// update shadow position
		if (shadow) {
			L.DomUtil.setPosition(shadow, iconPos);
		}

		marker._latlng = latlng;

		marker
		    .fire('move', {latlng: latlng})
		    .fire('drag');
	},

	_onDragEnd: function (e) {
		this._marker
		    .fire('moveend')
		    .fire('dragend', e);
	}
});


/*
 * L.Control is a base class for implementing map controls. Handles positioning.
 * All other controls extend from this class.
 */

L.Control = L.Class.extend({
	options: {
		position: 'topright'
	},

	initialize: function (options) {
		L.setOptions(this, options);
	},

	getPosition: function () {
		return this.options.position;
	},

	setPosition: function (position) {
		var map = this._map;

		if (map) {
			map.removeControl(this);
		}

		this.options.position = position;

		if (map) {
			map.addControl(this);
		}

		return this;
	},

	getContainer: function () {
		return this._container;
	},

	addTo: function (map) {
		this._map = map;

		var container = this._container = this.onAdd(map),
		    pos = this.getPosition(),
		    corner = map._controlCorners[pos];

		L.DomUtil.addClass(container, 'leaflet-control');

		if (pos.indexOf('bottom') !== -1) {
			corner.insertBefore(container, corner.firstChild);
		} else {
			corner.appendChild(container);
		}

		return this;
	},

	removeFrom: function (map) {
		var pos = this.getPosition(),
		    corner = map._controlCorners[pos];

		corner.removeChild(this._container);
		this._map = null;

		if (this.onRemove) {
			this.onRemove(map);
		}

		return this;
	},

	_refocusOnMap: function () {
		if (this._map) {
			this._map.getContainer().focus();
		}
	}
});

L.control = function (options) {
	return new L.Control(options);
};


// adds control-related methods to L.Map

L.Map.include({
	addControl: function (control) {
		control.addTo(this);
		return this;
	},

	removeControl: function (control) {
		control.removeFrom(this);
		return this;
	},

	_initControlPos: function () {
		var corners = this._controlCorners = {},
		    l = 'leaflet-',
		    container = this._controlContainer =
		            L.DomUtil.create('div', l + 'control-container', this._container);

		function createCorner(vSide, hSide) {
			var className = l + vSide + ' ' + l + hSide;

			corners[vSide + hSide] = L.DomUtil.create('div', className, container);
		}

		createCorner('top', 'left');
		createCorner('top', 'right');
		createCorner('bottom', 'left');
		createCorner('bottom', 'right');
	},

	_clearControlPos: function () {
		this._container.removeChild(this._controlContainer);
	}
});


/*
 * L.Control.Zoom is used for the default zoom buttons on the map.
 */

L.Control.Zoom = L.Control.extend({
	options: {
		position: 'topleft',
		zoomInText: '+',
		zoomInTitle: 'Zoom in',
		zoomOutText: '-',
		zoomOutTitle: 'Zoom out'
	},

	onAdd: function (map) {
		var zoomName = 'leaflet-control-zoom',
		    container = L.DomUtil.create('div', zoomName + ' leaflet-bar');

		this._map = map;

		this._zoomInButton  = this._createButton(
		        this.options.zoomInText, this.options.zoomInTitle,
		        zoomName + '-in',  container, this._zoomIn,  this);
		this._zoomOutButton = this._createButton(
		        this.options.zoomOutText, this.options.zoomOutTitle,
		        zoomName + '-out', container, this._zoomOut, this);

		this._updateDisabled();
		map.on('zoomend zoomlevelschange', this._updateDisabled, this);

		return container;
	},

	onRemove: function (map) {
		map.off('zoomend zoomlevelschange', this._updateDisabled, this);
	},

	_zoomIn: function (e) {
		this._map.zoomIn(e.shiftKey ? 3 : 1);
	},

	_zoomOut: function (e) {
		this._map.zoomOut(e.shiftKey ? 3 : 1);
	},

	_createButton: function (html, title, className, container, fn, context) {
		var link = L.DomUtil.create('a', className, container);
		link.innerHTML = html;
		link.href = '#';
		link.title = title;

		var stop = L.DomEvent.stopPropagation;

		L.DomEvent
		    .on(link, 'click', stop)
		    .on(link, 'mousedown', stop)
		    .on(link, 'dblclick', stop)
		    .on(link, 'click', L.DomEvent.preventDefault)
		    .on(link, 'click', fn, context)
		    .on(link, 'click', this._refocusOnMap, context);

		return link;
	},

	_updateDisabled: function () {
		var map = this._map,
			className = 'leaflet-disabled';

		L.DomUtil.removeClass(this._zoomInButton, className);
		L.DomUtil.removeClass(this._zoomOutButton, className);

		if (map._zoom === map.getMinZoom()) {
			L.DomUtil.addClass(this._zoomOutButton, className);
		}
		if (map._zoom === map.getMaxZoom()) {
			L.DomUtil.addClass(this._zoomInButton, className);
		}
	}
});

L.Map.mergeOptions({
	zoomControl: true
});

L.Map.addInitHook(function () {
	if (this.options.zoomControl) {
		this.zoomControl = new L.Control.Zoom();
		this.addControl(this.zoomControl);
	}
});

L.control.zoom = function (options) {
	return new L.Control.Zoom(options);
};



/*
 * L.Control.Attribution is used for displaying attribution on the map (added by default).
 */

L.Control.Attribution = L.Control.extend({
	options: {
		position: 'bottomright',
		prefix: '<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>'
	},

	initialize: function (options) {
		L.setOptions(this, options);

		this._attributions = {};
	},

	onAdd: function (map) {
		this._container = L.DomUtil.create('div', 'leaflet-control-attribution');
		L.DomEvent.disableClickPropagation(this._container);

		for (var i in map._layers) {
			if (map._layers[i].getAttribution) {
				this.addAttribution(map._layers[i].getAttribution());
			}
		}
		
		map
		    .on('layeradd', this._onLayerAdd, this)
		    .on('layerremove', this._onLayerRemove, this);

		this._update();

		return this._container;
	},

	onRemove: function (map) {
		map
		    .off('layeradd', this._onLayerAdd)
		    .off('layerremove', this._onLayerRemove);

	},

	setPrefix: function (prefix) {
		this.options.prefix = prefix;
		this._update();
		return this;
	},

	addAttribution: function (text) {
		if (!text) { return; }

		if (!this._attributions[text]) {
			this._attributions[text] = 0;
		}
		this._attributions[text]++;

		this._update();

		return this;
	},

	removeAttribution: function (text) {
		if (!text) { return; }

		if (this._attributions[text]) {
			this._attributions[text]--;
			this._update();
		}

		return this;
	},

	_update: function () {
		if (!this._map) { return; }

		var attribs = [];

		for (var i in this._attributions) {
			if (this._attributions[i]) {
				attribs.push(i);
			}
		}

		var prefixAndAttribs = [];

		if (this.options.prefix) {
			prefixAndAttribs.push(this.options.prefix);
		}
		if (attribs.length) {
			prefixAndAttribs.push(attribs.join(', '));
		}

		this._container.innerHTML = prefixAndAttribs.join(' | ');
	},

	_onLayerAdd: function (e) {
		if (e.layer.getAttribution) {
			this.addAttribution(e.layer.getAttribution());
		}
	},

	_onLayerRemove: function (e) {
		if (e.layer.getAttribution) {
			this.removeAttribution(e.layer.getAttribution());
		}
	}
});

L.Map.mergeOptions({
	attributionControl: true
});

L.Map.addInitHook(function () {
	if (this.options.attributionControl) {
		this.attributionControl = (new L.Control.Attribution()).addTo(this);
	}
});

L.control.attribution = function (options) {
	return new L.Control.Attribution(options);
};


/*
 * L.Control.Scale is used for displaying metric/imperial scale on the map.
 */

L.Control.Scale = L.Control.extend({
	options: {
		position: 'bottomleft',
		maxWidth: 100,
		metric: true,
		imperial: true,
		updateWhenIdle: false
	},

	onAdd: function (map) {
		this._map = map;

		var className = 'leaflet-control-scale',
		    container = L.DomUtil.create('div', className),
		    options = this.options;

		this._addScales(options, className, container);

		map.on(options.updateWhenIdle ? 'moveend' : 'move', this._update, this);
		map.whenReady(this._update, this);

		return container;
	},

	onRemove: function (map) {
		map.off(this.options.updateWhenIdle ? 'moveend' : 'move', this._update, this);
	},

	_addScales: function (options, className, container) {
		if (options.metric) {
			this._mScale = L.DomUtil.create('div', className + '-line', container);
		}
		if (options.imperial) {
			this._iScale = L.DomUtil.create('div', className + '-line', container);
		}
	},

	_update: function () {
		var bounds = this._map.getBounds(),
		    centerLat = bounds.getCenter().lat,
		    halfWorldMeters = 6378137 * Math.PI * Math.cos(centerLat * Math.PI / 180),
		    dist = halfWorldMeters * (bounds.getNorthEast().lng - bounds.getSouthWest().lng) / 180,

		    size = this._map.getSize(),
		    options = this.options,
		    maxMeters = 0;

		if (size.x > 0) {
			maxMeters = dist * (options.maxWidth / size.x);
		}

		this._updateScales(options, maxMeters);
	},

	_updateScales: function (options, maxMeters) {
		if (options.metric && maxMeters) {
			this._updateMetric(maxMeters);
		}

		if (options.imperial && maxMeters) {
			this._updateImperial(maxMeters);
		}
	},

	_updateMetric: function (maxMeters) {
		var meters = this._getRoundNum(maxMeters);

		this._mScale.style.width = this._getScaleWidth(meters / maxMeters) + 'px';
		this._mScale.innerHTML = meters < 1000 ? meters + ' m' : (meters / 1000) + ' km';
	},

	_updateImperial: function (maxMeters) {
		var maxFeet = maxMeters * 3.2808399,
		    scale = this._iScale,
		    maxMiles, miles, feet;

		if (maxFeet > 5280) {
			maxMiles = maxFeet / 5280;
			miles = this._getRoundNum(maxMiles);

			scale.style.width = this._getScaleWidth(miles / maxMiles) + 'px';
			scale.innerHTML = miles + ' mi';

		} else {
			feet = this._getRoundNum(maxFeet);

			scale.style.width = this._getScaleWidth(feet / maxFeet) + 'px';
			scale.innerHTML = feet + ' ft';
		}
	},

	_getScaleWidth: function (ratio) {
		return Math.round(this.options.maxWidth * ratio) - 10;
	},

	_getRoundNum: function (num) {
		var pow10 = Math.pow(10, (Math.floor(num) + '').length - 1),
		    d = num / pow10;

		d = d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1;

		return pow10 * d;
	}
});

L.control.scale = function (options) {
	return new L.Control.Scale(options);
};


/*
 * L.Control.Layers is a control to allow users to switch between different layers on the map.
 */

L.Control.Layers = L.Control.extend({
	options: {
		collapsed: true,
		position: 'topright',
		autoZIndex: true
	},

	initialize: function (baseLayers, overlays, options) {
		L.setOptions(this, options);

		this._layers = {};
		this._lastZIndex = 0;
		this._handlingClick = false;

		for (var i in baseLayers) {
			this._addLayer(baseLayers[i], i);
		}

		for (i in overlays) {
			this._addLayer(overlays[i], i, true);
		}
	},

	onAdd: function (map) {
		this._initLayout();
		this._update();

		map
		    .on('layeradd', this._onLayerChange, this)
		    .on('layerremove', this._onLayerChange, this);

		return this._container;
	},

	onRemove: function (map) {
		map
		    .off('layeradd', this._onLayerChange, this)
		    .off('layerremove', this._onLayerChange, this);
	},

	addBaseLayer: function (layer, name) {
		this._addLayer(layer, name);
		this._update();
		return this;
	},

	addOverlay: function (layer, name) {
		this._addLayer(layer, name, true);
		this._update();
		return this;
	},

	removeLayer: function (layer) {
		var id = L.stamp(layer);
		delete this._layers[id];
		this._update();
		return this;
	},

	_initLayout: function () {
		var className = 'leaflet-control-layers',
		    container = this._container = L.DomUtil.create('div', className);

		//Makes this work on IE10 Touch devices by stopping it from firing a mouseout event when the touch is released
		container.setAttribute('aria-haspopup', true);

		if (!L.Browser.touch) {
			L.DomEvent
				.disableClickPropagation(container)
				.disableScrollPropagation(container);
		} else {
			L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
		}

		var form = this._form = L.DomUtil.create('form', className + '-list');

		if (this.options.collapsed) {
			if (!L.Browser.android) {
				L.DomEvent
				    .on(container, 'mouseover', this._expand, this)
				    .on(container, 'mouseout', this._collapse, this);
			}
			var link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
			link.href = '#';
			link.title = 'Layers';

			if (L.Browser.touch) {
				L.DomEvent
				    .on(link, 'click', L.DomEvent.stop)
				    .on(link, 'click', this._expand, this);
			}
			else {
				L.DomEvent.on(link, 'focus', this._expand, this);
			}
			//Work around for Firefox android issue https://github.com/Leaflet/Leaflet/issues/2033
			L.DomEvent.on(form, 'click', function () {
				setTimeout(L.bind(this._onInputClick, this), 0);
			}, this);

			this._map.on('click', this._collapse, this);
			// TODO keyboard accessibility
		} else {
			this._expand();
		}

		this._baseLayersList = L.DomUtil.create('div', className + '-base', form);
		this._separator = L.DomUtil.create('div', className + '-separator', form);
		this._overlaysList = L.DomUtil.create('div', className + '-overlays', form);

		container.appendChild(form);
	},

	_addLayer: function (layer, name, overlay) {
		var id = L.stamp(layer);

		this._layers[id] = {
			layer: layer,
			name: name,
			overlay: overlay
		};

		if (this.options.autoZIndex && layer.setZIndex) {
			this._lastZIndex++;
			layer.setZIndex(this._lastZIndex);
		}
	},

	_update: function () {
		if (!this._container) {
			return;
		}

		this._baseLayersList.innerHTML = '';
		this._overlaysList.innerHTML = '';

		var baseLayersPresent = false,
		    overlaysPresent = false,
		    i, obj;

		for (i in this._layers) {
			obj = this._layers[i];
			this._addItem(obj);
			overlaysPresent = overlaysPresent || obj.overlay;
			baseLayersPresent = baseLayersPresent || !obj.overlay;
		}

		this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';
	},

	_onLayerChange: function (e) {
		var obj = this._layers[L.stamp(e.layer)];

		if (!obj) { return; }

		if (!this._handlingClick) {
			this._update();
		}

		var type = obj.overlay ?
			(e.type === 'layeradd' ? 'overlayadd' : 'overlayremove') :
			(e.type === 'layeradd' ? 'baselayerchange' : null);

		if (type) {
			this._map.fire(type, obj);
		}
	},

	// IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
	_createRadioElement: function (name, checked) {

		var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"';
		if (checked) {
			radioHtml += ' checked="checked"';
		}
		radioHtml += '/>';

		var radioFragment = document.createElement('div');
		radioFragment.innerHTML = radioHtml;

		return radioFragment.firstChild;
	},

	_addItem: function (obj) {
		var label = document.createElement('label'),
		    input,
		    checked = this._map.hasLayer(obj.layer);

		if (obj.overlay) {
			input = document.createElement('input');
			input.type = 'checkbox';
			input.className = 'leaflet-control-layers-selector';
			input.defaultChecked = checked;
		} else {
			input = this._createRadioElement('leaflet-base-layers', checked);
		}

		input.layerId = L.stamp(obj.layer);

		L.DomEvent.on(input, 'click', this._onInputClick, this);

		var name = document.createElement('span');
		name.innerHTML = ' ' + obj.name;

		label.appendChild(input);
		label.appendChild(name);

		var container = obj.overlay ? this._overlaysList : this._baseLayersList;
		container.appendChild(label);

		return label;
	},

	_onInputClick: function () {
		var i, input, obj,
		    inputs = this._form.getElementsByTagName('input'),
		    inputsLen = inputs.length;

		this._handlingClick = true;

		for (i = 0; i < inputsLen; i++) {
			input = inputs[i];
			obj = this._layers[input.layerId];

			if (input.checked && !this._map.hasLayer(obj.layer)) {
				this._map.addLayer(obj.layer);

			} else if (!input.checked && this._map.hasLayer(obj.layer)) {
				this._map.removeLayer(obj.layer);
			}
		}

		this._handlingClick = false;

		this._refocusOnMap();
	},

	_expand: function () {
		L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
	},

	_collapse: function () {
		this._container.className = this._container.className.replace(' leaflet-control-layers-expanded', '');
	}
});

L.control.layers = function (baseLayers, overlays, options) {
	return new L.Control.Layers(baseLayers, overlays, options);
};


/*
 * L.PosAnimation is used by Leaflet internally for pan animations.
 */

L.PosAnimation = L.Class.extend({
	includes: L.Mixin.Events,

	run: function (el, newPos, duration, easeLinearity) { // (HTMLElement, Point[, Number, Number])
		this.stop();

		this._el = el;
		this._inProgress = true;
		this._newPos = newPos;

		this.fire('start');

		el.style[L.DomUtil.TRANSITION] = 'all ' + (duration || 0.25) +
		        's cubic-bezier(0,0,' + (easeLinearity || 0.5) + ',1)';

		L.DomEvent.on(el, L.DomUtil.TRANSITION_END, this._onTransitionEnd, this);
		L.DomUtil.setPosition(el, newPos);

		// toggle reflow, Chrome flickers for some reason if you don't do this
		L.Util.falseFn(el.offsetWidth);

		// there's no native way to track value updates of transitioned properties, so we imitate this
		this._stepTimer = setInterval(L.bind(this._onStep, this), 50);
	},

	stop: function () {
		if (!this._inProgress) { return; }

		// if we just removed the transition property, the element would jump to its final position,
		// so we need to make it stay at the current position

		L.DomUtil.setPosition(this._el, this._getPos());
		this._onTransitionEnd();
		L.Util.falseFn(this._el.offsetWidth); // force reflow in case we are about to start a new animation
	},

	_onStep: function () {
		var stepPos = this._getPos();
		if (!stepPos) {
			this._onTransitionEnd();
			return;
		}
		// jshint camelcase: false
		// make L.DomUtil.getPosition return intermediate position value during animation
		this._el._leaflet_pos = stepPos;

		this.fire('step');
	},

	// you can't easily get intermediate values of properties animated with CSS3 Transitions,
	// we need to parse computed style (in case of transform it returns matrix string)

	_transformRe: /([-+]?(?:\d*\.)?\d+)\D*, ([-+]?(?:\d*\.)?\d+)\D*\)/,

	_getPos: function () {
		var left, top, matches,
		    el = this._el,
		    style = window.getComputedStyle(el);

		if (L.Browser.any3d) {
			matches = style[L.DomUtil.TRANSFORM].match(this._transformRe);
			if (!matches) { return; }
			left = parseFloat(matches[1]);
			top  = parseFloat(matches[2]);
		} else {
			left = parseFloat(style.left);
			top  = parseFloat(style.top);
		}

		return new L.Point(left, top, true);
	},

	_onTransitionEnd: function () {
		L.DomEvent.off(this._el, L.DomUtil.TRANSITION_END, this._onTransitionEnd, this);

		if (!this._inProgress) { return; }
		this._inProgress = false;

		this._el.style[L.DomUtil.TRANSITION] = '';

		// jshint camelcase: false
		// make sure L.DomUtil.getPosition returns the final position value after animation
		this._el._leaflet_pos = this._newPos;

		clearInterval(this._stepTimer);

		this.fire('step').fire('end');
	}

});


/*
 * Extends L.Map to handle panning animations.
 */

L.Map.include({

	setView: function (center, zoom, options) {

		zoom = zoom === undefined ? this._zoom : this._limitZoom(zoom);
		center = this._limitCenter(L.latLng(center), zoom, this.options.maxBounds);
		options = options || {};

		if (this._panAnim) {
			this._panAnim.stop();
		}

		if (this._loaded && !options.reset && options !== true) {

			if (options.animate !== undefined) {
				options.zoom = L.extend({animate: options.animate}, options.zoom);
				options.pan = L.extend({animate: options.animate}, options.pan);
			}

			// try animating pan or zoom
			var animated = (this._zoom !== zoom) ?
				this._tryAnimatedZoom && this._tryAnimatedZoom(center, zoom, options.zoom) :
				this._tryAnimatedPan(center, options.pan);

			if (animated) {
				// prevent resize handler call, the view will refresh after animation anyway
				clearTimeout(this._sizeTimer);
				return this;
			}
		}

		// animation didn't start, just reset the map view
		this._resetView(center, zoom);

		return this;
	},

	panBy: function (offset, options) {
		offset = L.point(offset).round();
		options = options || {};

		if (!offset.x && !offset.y) {
			return this;
		}

		if (!this._panAnim) {
			this._panAnim = new L.PosAnimation();

			this._panAnim.on({
				'step': this._onPanTransitionStep,
				'end': this._onPanTransitionEnd
			}, this);
		}

		// don't fire movestart if animating inertia
		if (!options.noMoveStart) {
			this.fire('movestart');
		}

		// animate pan unless animate: false specified
		if (options.animate !== false) {
			L.DomUtil.addClass(this._mapPane, 'leaflet-pan-anim');

			var newPos = this._getMapPanePos().subtract(offset);
			this._panAnim.run(this._mapPane, newPos, options.duration || 0.25, options.easeLinearity);
		} else {
			this._rawPanBy(offset);
			this.fire('move').fire('moveend');
		}

		return this;
	},

	_onPanTransitionStep: function () {
		this.fire('move');
	},

	_onPanTransitionEnd: function () {
		L.DomUtil.removeClass(this._mapPane, 'leaflet-pan-anim');
		this.fire('moveend');
	},

	_tryAnimatedPan: function (center, options) {
		// difference between the new and current centers in pixels
		var offset = this._getCenterOffset(center)._floor();

		// don't animate too far unless animate: true specified in options
		if ((options && options.animate) !== true && !this.getSize().contains(offset)) { return false; }

		this.panBy(offset, options);

		return true;
	}
});


/*
 * L.PosAnimation fallback implementation that powers Leaflet pan animations
 * in browsers that don't support CSS3 Transitions.
 */

L.PosAnimation = L.DomUtil.TRANSITION ? L.PosAnimation : L.PosAnimation.extend({

	run: function (el, newPos, duration, easeLinearity) { // (HTMLElement, Point[, Number, Number])
		this.stop();

		this._el = el;
		this._inProgress = true;
		this._duration = duration || 0.25;
		this._easeOutPower = 1 / Math.max(easeLinearity || 0.5, 0.2);

		this._startPos = L.DomUtil.getPosition(el);
		this._offset = newPos.subtract(this._startPos);
		this._startTime = +new Date();

		this.fire('start');

		this._animate();
	},

	stop: function () {
		if (!this._inProgress) { return; }

		this._step();
		this._complete();
	},

	_animate: function () {
		// animation loop
		this._animId = L.Util.requestAnimFrame(this._animate, this);
		this._step();
	},

	_step: function () {
		var elapsed = (+new Date()) - this._startTime,
		    duration = this._duration * 1000;

		if (elapsed < duration) {
			this._runFrame(this._easeOut(elapsed / duration));
		} else {
			this._runFrame(1);
			this._complete();
		}
	},

	_runFrame: function (progress) {
		var pos = this._startPos.add(this._offset.multiplyBy(progress));
		L.DomUtil.setPosition(this._el, pos);

		this.fire('step');
	},

	_complete: function () {
		L.Util.cancelAnimFrame(this._animId);

		this._inProgress = false;
		this.fire('end');
	},

	_easeOut: function (t) {
		return 1 - Math.pow(1 - t, this._easeOutPower);
	}
});


/*
 * Extends L.Map to handle zoom animations.
 */

L.Map.mergeOptions({
	zoomAnimation: true,
	zoomAnimationThreshold: 4
});

if (L.DomUtil.TRANSITION) {

	L.Map.addInitHook(function () {
		// don't animate on browsers without hardware-accelerated transitions or old Android/Opera
		this._zoomAnimated = this.options.zoomAnimation && L.DomUtil.TRANSITION &&
				L.Browser.any3d && !L.Browser.android23 && !L.Browser.mobileOpera;

		// zoom transitions run with the same duration for all layers, so if one of transitionend events
		// happens after starting zoom animation (propagating to the map pane), we know that it ended globally
		if (this._zoomAnimated) {
			L.DomEvent.on(this._mapPane, L.DomUtil.TRANSITION_END, this._catchTransitionEnd, this);
		}
	});
}

L.Map.include(!L.DomUtil.TRANSITION ? {} : {

	_catchTransitionEnd: function (e) {
		if (this._animatingZoom && e.propertyName.indexOf('transform') >= 0) {
			this._onZoomTransitionEnd();
		}
	},

	_nothingToAnimate: function () {
		return !this._container.getElementsByClassName('leaflet-zoom-animated').length;
	},

	_tryAnimatedZoom: function (center, zoom, options) {

		if (this._animatingZoom) { return true; }

		options = options || {};

		// don't animate if disabled, not supported or zoom difference is too large
		if (!this._zoomAnimated || options.animate === false || this._nothingToAnimate() ||
		        Math.abs(zoom - this._zoom) > this.options.zoomAnimationThreshold) { return false; }

		// offset is the pixel coords of the zoom origin relative to the current center
		var scale = this.getZoomScale(zoom),
		    offset = this._getCenterOffset(center)._divideBy(1 - 1 / scale),
			origin = this._getCenterLayerPoint()._add(offset);

		// don't animate if the zoom origin isn't within one screen from the current center, unless forced
		if (options.animate !== true && !this.getSize().contains(offset)) { return false; }

		this
		    .fire('movestart')
		    .fire('zoomstart');

		this._animateZoom(center, zoom, origin, scale, null, true);

		return true;
	},

	_animateZoom: function (center, zoom, origin, scale, delta, backwards, forTouchZoom) {

		if (!forTouchZoom) {
			this._animatingZoom = true;
		}

		// put transform transition on all layers with leaflet-zoom-animated class
		L.DomUtil.addClass(this._mapPane, 'leaflet-zoom-anim');

		// remember what center/zoom to set after animation
		this._animateToCenter = center;
		this._animateToZoom = zoom;

		// disable any dragging during animation
		if (L.Draggable) {
			L.Draggable._disabled = true;
		}

		L.Util.requestAnimFrame(function () {
			this.fire('zoomanim', {
				center: center,
				zoom: zoom,
				origin: origin,
				scale: scale,
				delta: delta,
				backwards: backwards
			});
			// horrible hack to work around a Chrome bug https://github.com/Leaflet/Leaflet/issues/3689
			setTimeout(L.bind(this._onZoomTransitionEnd, this), 250);
		}, this);
	},

	_onZoomTransitionEnd: function () {
		if (!this._animatingZoom) { return; }

		this._animatingZoom = false;

		L.DomUtil.removeClass(this._mapPane, 'leaflet-zoom-anim');

		L.Util.requestAnimFrame(function () {
			this._resetView(this._animateToCenter, this._animateToZoom, true, true);

			if (L.Draggable) {
				L.Draggable._disabled = false;
			}
		}, this);
	}
});


/*
	Zoom animation logic for L.TileLayer.
*/

L.TileLayer.include({
	_animateZoom: function (e) {
		if (!this._animating) {
			this._animating = true;
			this._prepareBgBuffer();
		}

		var bg = this._bgBuffer,
		    transform = L.DomUtil.TRANSFORM,
		    initialTransform = e.delta ? L.DomUtil.getTranslateString(e.delta) : bg.style[transform],
		    scaleStr = L.DomUtil.getScaleString(e.scale, e.origin);

		bg.style[transform] = e.backwards ?
				scaleStr + ' ' + initialTransform :
				initialTransform + ' ' + scaleStr;
	},

	_endZoomAnim: function () {
		var front = this._tileContainer,
		    bg = this._bgBuffer;

		front.style.visibility = '';
		front.parentNode.appendChild(front); // Bring to fore

		// force reflow
		L.Util.falseFn(bg.offsetWidth);

		var zoom = this._map.getZoom();
		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
			this._clearBgBuffer();
		}

		this._animating = false;
	},

	_clearBgBuffer: function () {
		var map = this._map;

		if (map && !map._animatingZoom && !map.touchZoom._zooming) {
			this._bgBuffer.innerHTML = '';
			this._bgBuffer.style[L.DomUtil.TRANSFORM] = '';
		}
	},

	_prepareBgBuffer: function () {

		var front = this._tileContainer,
		    bg = this._bgBuffer;

		// if foreground layer doesn't have many tiles but bg layer does,
		// keep the existing bg layer and just zoom it some more

		var bgLoaded = this._getLoadedTilesPercentage(bg),
		    frontLoaded = this._getLoadedTilesPercentage(front);

		if (bg && bgLoaded > 0.5 && frontLoaded < 0.5) {

			front.style.visibility = 'hidden';
			this._stopLoadingImages(front);
			return;
		}

		// prepare the buffer to become the front tile pane
		bg.style.visibility = 'hidden';
		bg.style[L.DomUtil.TRANSFORM] = '';

		// switch out the current layer to be the new bg layer (and vice-versa)
		this._tileContainer = bg;
		bg = this._bgBuffer = front;

		this._stopLoadingImages(bg);

		//prevent bg buffer from clearing right after zoom
		clearTimeout(this._clearBgBufferTimer);
	},

	_getLoadedTilesPercentage: function (container) {
		var tiles = container.getElementsByTagName('img'),
		    i, len, count = 0;

		for (i = 0, len = tiles.length; i < len; i++) {
			if (tiles[i].complete) {
				count++;
			}
		}
		return count / len;
	},

	// stops loading all tiles in the background layer
	_stopLoadingImages: function (container) {
		var tiles = Array.prototype.slice.call(container.getElementsByTagName('img')),
		    i, len, tile;

		for (i = 0, len = tiles.length; i < len; i++) {
			tile = tiles[i];

			if (!tile.complete) {
				tile.onload = L.Util.falseFn;
				tile.onerror = L.Util.falseFn;
				tile.src = L.Util.emptyImageUrl;

				tile.parentNode.removeChild(tile);
			}
		}
	}
});


/*
 * Provides L.Map with convenient shortcuts for using browser geolocation features.
 */

L.Map.include({
	_defaultLocateOptions: {
		watch: false,
		setView: false,
		maxZoom: Infinity,
		timeout: 10000,
		maximumAge: 0,
		enableHighAccuracy: false
	},

	locate: function (/*Object*/ options) {

		options = this._locateOptions = L.extend(this._defaultLocateOptions, options);

		if (!navigator.geolocation) {
			this._handleGeolocationError({
				code: 0,
				message: 'Geolocation not supported.'
			});
			return this;
		}

		var onResponse = L.bind(this._handleGeolocationResponse, this),
			onError = L.bind(this._handleGeolocationError, this);

		if (options.watch) {
			this._locationWatchId =
			        navigator.geolocation.watchPosition(onResponse, onError, options);
		} else {
			navigator.geolocation.getCurrentPosition(onResponse, onError, options);
		}
		return this;
	},

	stopLocate: function () {
		if (navigator.geolocation) {
			navigator.geolocation.clearWatch(this._locationWatchId);
		}
		if (this._locateOptions) {
			this._locateOptions.setView = false;
		}
		return this;
	},

	_handleGeolocationError: function (error) {
		var c = error.code,
		    message = error.message ||
		            (c === 1 ? 'permission denied' :
		            (c === 2 ? 'position unavailable' : 'timeout'));

		if (this._locateOptions.setView && !this._loaded) {
			this.fitWorld();
		}

		this.fire('locationerror', {
			code: c,
			message: 'Geolocation error: ' + message + '.'
		});
	},

	_handleGeolocationResponse: function (pos) {
		var lat = pos.coords.latitude,
		    lng = pos.coords.longitude,
		    latlng = new L.LatLng(lat, lng),

		    latAccuracy = 180 * pos.coords.accuracy / 40075017,
		    lngAccuracy = latAccuracy / Math.cos(L.LatLng.DEG_TO_RAD * lat),

		    bounds = L.latLngBounds(
		            [lat - latAccuracy, lng - lngAccuracy],
		            [lat + latAccuracy, lng + lngAccuracy]),

		    options = this._locateOptions;

		if (options.setView) {
			var zoom = Math.min(this.getBoundsZoom(bounds), options.maxZoom);
			this.setView(latlng, zoom);
		}

		var data = {
			latlng: latlng,
			bounds: bounds,
			timestamp: pos.timestamp
		};

		for (var i in pos.coords) {
			if (typeof pos.coords[i] === 'number') {
				data[i] = pos.coords[i];
			}
		}

		this.fire('locationfound', data);
	}
});


}(window, document));
},{}],3:[function(require,module,exports){
'use strict';

/**
 * Based off of [the offical Google document](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
 *
 * Some parts from [this implementation](http://facstaff.unca.edu/mcmcclur/GoogleMaps/EncodePolyline/PolylineEncoder.js)
 * by [Mark McClure](http://facstaff.unca.edu/mcmcclur/)
 *
 * @module polyline
 */

var polyline = {};

function encode(coordinate, factor) {
    coordinate = Math.round(coordinate * factor);
    coordinate <<= 1;
    if (coordinate < 0) {
        coordinate = ~coordinate;
    }
    var output = '';
    while (coordinate >= 0x20) {
        output += String.fromCharCode((0x20 | (coordinate & 0x1f)) + 63);
        coordinate >>= 5;
    }
    output += String.fromCharCode(coordinate + 63);
    return output;
}

/**
 * Decodes to a [latitude, longitude] coordinates array.
 *
 * This is adapted from the implementation in Project-OSRM.
 *
 * @param {String} str
 * @param {Number} precision
 * @returns {Array}
 *
 * @see https://github.com/Project-OSRM/osrm-frontend/blob/master/WebContent/routing/OSRM.RoutingGeometry.js
 */
polyline.decode = function(str, precision) {
    var index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision || 5);

    // Coordinates have variable length when encoded, so just keep
    // track of whether we've hit the end of the string. In each
    // loop iteration, a single coordinate is decoded.
    while (index < str.length) {

        // Reset shift, result, and byte
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
};

/**
 * Encodes the given [latitude, longitude] coordinates array.
 *
 * @param {Array.<Array.<Number>>} coordinates
 * @param {Number} precision
 * @returns {String}
 */
polyline.encode = function(coordinates, precision) {
    if (!coordinates.length) { return ''; }

    var factor = Math.pow(10, precision || 5),
        output = encode(coordinates[0][0], factor) + encode(coordinates[0][1], factor);

    for (var i = 1; i < coordinates.length; i++) {
        var a = coordinates[i], b = coordinates[i - 1];
        output += encode(a[0] - b[0], factor);
        output += encode(a[1] - b[1], factor);
    }

    return output;
};

function flipped(coords) {
    var flipped = [];
    for (var i = 0; i < coords.length; i++) {
        flipped.push(coords[i].slice().reverse());
    }
    return flipped;
}

/**
 * Encodes a GeoJSON LineString feature/geometry.
 *
 * @param {Object} geojson
 * @param {Number} precision
 * @returns {String}
 */
polyline.fromGeoJSON = function(geojson, precision) {
    if (geojson && geojson.type === 'Feature') {
        geojson = geojson.geometry;
    }
    if (!geojson || geojson.type !== 'LineString') {
        throw new Error('Input must be a GeoJSON LineString');
    }
    return polyline.encode(flipped(geojson.coordinates), precision);
};

/**
 * Decodes to a GeoJSON LineString geometry.
 *
 * @param {String} str
 * @param {Number} precision
 * @returns {Object}
 */
polyline.toGeoJSON = function(str, precision) {
    var coords = polyline.decode(str, precision);
    return {
        type: 'LineString',
        coordinates: flipped(coords)
    };
};

if (typeof module === 'object' && module.exports) {
    module.exports = polyline;
}

},{}],4:[function(require,module,exports){
(function (global){
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null),
	Nominatim = require('./geocoders/nominatim')["class"];

module.exports = {
	"class": L.Control.extend({
		options: {
			showResultIcons: false,
			collapsed: true,
			expand: 'click',
			position: 'topright',
			placeholder: 'Search...',
			errorMessage: 'Nothing found.'
		},

		_callbackId: 0,

		initialize: function (options) {
			L.Util.setOptions(this, options);
			if (!this.options.geocoder) {
				this.options.geocoder = new Nominatim();
			}
		},

		onAdd: function (map) {
			var className = 'leaflet-control-geocoder',
			    container = L.DomUtil.create('div', className + ' leaflet-bar'),
			    icon = L.DomUtil.create('a', 'leaflet-control-geocoder-icon', container),
			    form = this._form = L.DomUtil.create('form', className + '-form', container),
			    input;

			icon.innerHTML = '&nbsp;';
			icon.href = 'javascript:void(0);';
			this._map = map;
			this._container = container;
			input = this._input = L.DomUtil.create('input');
			input.type = 'text';
			input.placeholder = this.options.placeholder;

			L.DomEvent.addListener(input, 'keydown', this._keydown, this);
			//L.DomEvent.addListener(input, 'onpaste', this._clearResults, this);
			//L.DomEvent.addListener(input, 'oninput', this._clearResults, this);

			this._errorElement = document.createElement('div');
			this._errorElement.className = className + '-form-no-error';
			this._errorElement.innerHTML = this.options.errorMessage;

			this._alts = L.DomUtil.create('ul', className + '-alternatives leaflet-control-geocoder-alternatives-minimized');

			form.appendChild(input);
			this._container.appendChild(this._errorElement);
			container.appendChild(this._alts);

			L.DomEvent.addListener(form, 'submit', this._geocode, this);

			if (this.options.collapsed) {
				if (this.options.expand === 'click') {
					L.DomEvent.addListener(icon, 'click', function(e) {
						// TODO: touch
						if (e.button === 0 && e.detail !== 2) {
							this._toggle();
						}
					}, this);
				} else {
					L.DomEvent.addListener(icon, 'mouseover', this._expand, this);
					L.DomEvent.addListener(icon, 'mouseout', this._collapse, this);
					this._map.on('movestart', this._collapse, this);
				}
			} else {
				L.DomEvent.addListener(icon, 'click', function(e) {
					this._geocode(e);
				}, this);
				this._expand();
			}

			L.DomEvent.disableClickPropagation(container);

			return container;
		},

		_geocodeResult: function (results) {
			L.DomUtil.removeClass(this._container, 'leaflet-control-geocoder-throbber');
			if (results.length === 1) {
				this._geocodeResultSelected(results[0]);
			} else if (results.length > 0) {
				this._alts.innerHTML = '';
				this._results = results;
				L.DomUtil.removeClass(this._alts, 'leaflet-control-geocoder-alternatives-minimized');
				for (var i = 0; i < results.length; i++) {
					this._alts.appendChild(this._createAlt(results[i], i));
				}
			} else {
				L.DomUtil.addClass(this._errorElement, 'leaflet-control-geocoder-error');
			}
		},

		markGeocode: function(result) {
		            this._map.fitBounds(result.bbox);
								// Add Custom Icon result
										var addSicon = new L.icon({
										    iconUrl: 'public/images/pinpfs.png',
										    iconRetinaUrl: 'public/images/pinpfs.png',
										    iconSize: [36, 47],
										    iconAnchor: [18, 47],
										    popupAnchor: [0, -48],
										});
										var uiconPopupcss = {
										  'className': 'uiconPopupcss'
										};
		            if (this._geocodeMarker) {
		                this._map.removeLayer(this._geocodeMarker);
		            }
		            this._geocodeMarker = new L.Marker(result.center, {icon: addSicon})
		                .bindPopup(result.html || result.name, uiconPopupcss)
		                .addTo(this._map)
		                .openPopup();
		            var _this = this;
		            this._geocodeMarker.once("dblclick", function () {
		                _this._map.removeLayer(_this._geocodeMarker);
		                _this._geocodeMarker = null;
		            });

		            return this;
		        },

		_geocode: function(event) {
			L.DomEvent.preventDefault(event);

			L.DomUtil.addClass(this._container, 'leaflet-control-geocoder-throbber');
			this._clearResults();
			this.options.geocoder.geocode(this._input.value, this._geocodeResult, this);

			return false;
		},

		_geocodeResultSelected: function(result) {
			if (this.options.collapsed) {
				this._collapse();
			} else {
				this._clearResults();
			}
			this.markGeocode(result);
		},

		_toggle: function() {
			if (this._container.className.indexOf('leaflet-control-geocoder-expanded') >= 0) {
				this._collapse();
			} else {
				this._expand();
			}
		},

		_expand: function () {
			L.DomUtil.addClass(this._container, 'leaflet-control-geocoder-expanded');
			this._input.select();
		},

		_collapse: function () {
			this._container.className = this._container.className.replace(' leaflet-control-geocoder-expanded', '');
			L.DomUtil.addClass(this._alts, 'leaflet-control-geocoder-alternatives-minimized');
			L.DomUtil.removeClass(this._errorElement, 'leaflet-control-geocoder-error');
		},

		_clearResults: function () {
			L.DomUtil.addClass(this._alts, 'leaflet-control-geocoder-alternatives-minimized');
			this._selection = null;
			L.DomUtil.removeClass(this._errorElement, 'leaflet-control-geocoder-error');
		},

		_createAlt: function(result, index) {
			var li = L.DomUtil.create('li', ''),
				a = L.DomUtil.create('a', '', li),
			    icon = this.options.showResultIcons && result.icon ? L.DomUtil.create('img', '', a) : null,
			    text = result.html ? undefined : document.createTextNode(result.name),
			    clickHandler = function clickHandler(e) {
					L.DomEvent.preventDefault(e);
					this._geocodeResultSelected(result);
				};

			if (icon) {
				icon.src = result.icon;
			}

			li.setAttribute('data-result-index', index);

			if (result.html) {
				a.innerHTML = result.html;
			} else {
				a.appendChild(text);
			}

			L.DomEvent.addListener(li, 'click', clickHandler, this);

			return li;
		},

		_keydown: function(e) {
			var _this = this,
			    select = function select(dir) {
					if (_this._selection) {
						L.DomUtil.removeClass(_this._selection, 'leaflet-control-geocoder-selected');
						_this._selection = _this._selection[dir > 0 ? 'nextSibling' : 'previousSibling'];
					}
					if (!_this._selection) {
						_this._selection = _this._alts[dir > 0 ? 'firstChild' : 'lastChild'];
					}

					if (_this._selection) {
						L.DomUtil.addClass(_this._selection, 'leaflet-control-geocoder-selected');
					}
				};

			switch (e.keyCode) {
			// Escape
			case 27:
				if (this.options.collapsed) {
					this._collapse();
				}
				break;
			// Up
			case 38:
				select(-1);
				L.DomEvent.preventDefault(e);
				break;
			// Up
			case 40:
				select(1);
				L.DomEvent.preventDefault(e);
				break;
			// Enter
			case 13:
				if (this._selection) {
					var index = parseInt(this._selection.getAttribute('data-result-index'), 10);
					this._geocodeResultSelected(this._results[index]);
					this._clearResults();
					L.DomEvent.preventDefault(e);
				}
			}
			return true;
		}
	}),
	factory: function(options) {
		return new L.Control.Geocoder(options);
	}
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./geocoders/nominatim":7}],2:[function(require,module,exports){
(function (global){
var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null),
	Util = require('./util.js');

module.exports = {
	"class": L.Class.extend({
		initialize: function(key) {
			this.key = key;
		},

		geocode : function (query, cb, context) {
			Util.jsonp('//dev.virtualearth.net/REST/v1/Locations', {
				query: query,
				key : this.key
			}, function(data) {
				var results = [];
				if( data.resourceSets.length > 0 ){
					for (var i = data.resourceSets[0].resources.length - 1; i >= 0; i--) {
						var resource = data.resourceSets[0].resources[i],
							bbox = resource.bbox;
						results[i] = {
							name: resource.name,
							bbox: L.latLngBounds([bbox[0], bbox[1]], [bbox[2], bbox[3]]),
							center: L.latLng(resource.point.coordinates)
						};
					}
				}
				cb.call(context, results);
			}, this, 'jsonp');
		},

		reverse: function(location, scale, cb, context) {
			Util.jsonp('//dev.virtualearth.net/REST/v1/Locations/' + location.lat + ',' + location.lng, {
				key : this.key
			}, function(data) {
				var results = [];
				for (var i = data.resourceSets[0].resources.length - 1; i >= 0; i--) {
					var resource = data.resourceSets[0].resources[i],
						bbox = resource.bbox;
					results[i] = {
						name: resource.name,
						bbox: L.latLngBounds([bbox[0], bbox[1]], [bbox[2], bbox[3]]),
						center: L.latLng(resource.point.coordinates)
					};
				}
				cb.call(context, results);
			}, this, 'jsonp');
		}
	}),

	factory: function(key) {
		return new L.Control.Geocoder.Bing(key);
	}
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util":11}],3:[function(require,module,exports){
(function (global){
var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null),
	Util = require('./util');

module.exports = {
	"class": L.Class.extend({
		options: {
			serviceUrl: 'https://maps.googleapis.com/maps/api/geocode/json',
			geocodingQueryParams: {},
			reverseQueryParams: {}
		},

		initialize: function(key, options) {
			this._key = key;
			L.setOptions(this, options);
			// Backwards compatibility
			this.options.serviceUrl = this.options.service_url || this.options.serviceUrl;
		},

		geocode: function(query, cb, context) {
			var params = {
				address: query
			};

			if (this._key && this._key.length) {
				params.key = this._key;
			}

			params = L.Util.extend(params, this.options.geocodingQueryParams);

			Util.getJSON(this.options.serviceUrl, params, function(data) {
				var results = [],
						loc,
						latLng,
						latLngBounds;
				if (data.results && data.results.length) {
					for (var i = 0; i <= data.results.length - 1; i++) {
						loc = data.results[i];
						latLng = L.latLng(loc.geometry.location);
						latLngBounds = L.latLngBounds(L.latLng(loc.geometry.viewport.northeast), L.latLng(loc.geometry.viewport.southwest));
						results[i] = {
							name: loc.formatted_address,
							bbox: latLngBounds,
							center: latLng,
							properties: loc.address_components
						};
					}
				}

				cb.call(context, results);
			});
		},

		reverse: function(location, scale, cb, context) {
			var params = {
				latlng: encodeURIComponent(location.lat) + ',' + encodeURIComponent(location.lng)
			};
			params = L.Util.extend(params, this.options.reverseQueryParams);
			if (this._key && this._key.length) {
				params.key = this._key;
			}

			Util.getJSON(this.options.serviceUrl, params, function(data) {
				var results = [],
						loc,
						latLng,
						latLngBounds;
				if (data.results && data.results.length) {
					for (var i = 0; i <= data.results.length - 1; i++) {
						loc = data.results[i];
						latLng = L.latLng(loc.geometry.location);
						latLngBounds = L.latLngBounds(L.latLng(loc.geometry.viewport.northeast), L.latLng(loc.geometry.viewport.southwest));
						results[i] = {
							name: loc.formatted_address,
							bbox: latLngBounds,
							center: latLng,
							properties: loc.address_components
						};
					}
				}

				cb.call(context, results);
			});
		}
	}),

	factory: function(key, options) {
		return new L.Control.Geocoder.Google(key, options);
	}
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util":11}],4:[function(require,module,exports){
(function (global){
var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null),
	Util = require('./util');

module.exports = {
	"class": L.Class.extend({
		options: {
			serviceUrl: 'https://api.tiles.mapbox.com/v4/geocode/mapbox.places-v1/'
		},

		initialize: function(accessToken, options) {
			L.setOptions(this, options);
			this._accessToken = accessToken;
		},

		geocode: function(query, cb, context) {
			Util.getJSON(this.options.serviceUrl + encodeURIComponent(query) + '.json', {
				access_token: this._accessToken
			}, function(data) {
				var results = [],
				loc,
				latLng,
				latLngBounds;
				if (data.features && data.features.length) {
					for (var i = 0; i <= data.features.length - 1; i++) {
						loc = data.features[i];
						latLng = L.latLng(loc.center.reverse());
						if(loc.hasOwnProperty('bbox'))
						{
							latLngBounds = L.latLngBounds(L.latLng(loc.bbox.slice(0, 2).reverse()), L.latLng(loc.bbox.slice(2, 4).reverse()));
						}
						else
						{
							latLngBounds = L.latLngBounds(latLng, latLng);
						}
						results[i] = {
							name: loc.place_name,
							bbox: latLngBounds,
							center: latLng
						};
					}
				}

				cb.call(context, results);
			});
		},

		suggest: function(query, cb, context) {
			return this.geocode(query, cb, context);
		},

		reverse: function(location, scale, cb, context) {
			Util.getJSON(this.options.serviceUrl + encodeURIComponent(location.lng) + ',' + encodeURIComponent(location.lat) + '.json', {
				access_token: this._accessToken
			}, function(data) {
				var results = [],
				loc,
				latLng,
				latLngBounds;
				if (data.features && data.features.length) {
					for (var i = 0; i <= data.features.length - 1; i++) {
						loc = data.features[i];
						latLng = L.latLng(loc.center.reverse());
						if(loc.hasOwnProperty('bbox'))
						{
							latLngBounds = L.latLngBounds(L.latLng(loc.bbox.slice(0, 2).reverse()), L.latLng(loc.bbox.slice(2, 4).reverse()));
						}
						else
						{
							latLngBounds = L.latLngBounds(latLng, latLng);
						}
						results[i] = {
							name: loc.place_name,
							bbox: latLngBounds,
							center: latLng
						};
					}
				}

				cb.call(context, results);
			});
		}
	}),

	factory: function(accessToken, options) {
		return new L.Control.Geocoder.Mapbox(accessToken, options);
	}
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util":11}],5:[function(require,module,exports){
(function (global){
var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null),
	Util = require('./util');

module.exports = {
	"class": L.Class.extend({
		options: {
			serviceUrl: '//www.mapquestapi.com/geocoding/v1'
		},

		initialize: function(key, options) {
			// MapQuest seems to provide URI encoded API keys,
			// so to avoid encoding them twice, we decode them here
			this._key = decodeURIComponent(key);

			L.Util.setOptions(this, options);
		},

		_formatName: function() {
			var r = [],
				i;
			for (i = 0; i < arguments.length; i++) {
				if (arguments[i]) {
					r.push(arguments[i]);
				}
			}

			return r.join(', ');
		},

		geocode: function(query, cb, context) {
			Util.jsonp(this.options.serviceUrl + '/address', {
				key: this._key,
				location: query,
				limit: 5,
				outFormat: 'json'
			}, function(data) {
				var results = [],
					loc,
					latLng;
				if (data.results && data.results[0].locations) {
					for (var i = data.results[0].locations.length - 1; i >= 0; i--) {
						loc = data.results[0].locations[i];
						latLng = L.latLng(loc.latLng);
						results[i] = {
							name: this._formatName(loc.street, loc.adminArea4, loc.adminArea3, loc.adminArea1),
							bbox: L.latLngBounds(latLng, latLng),
							center: latLng
						};
					}
				}

				cb.call(context, results);
			}, this);
		},

		reverse: function(location, scale, cb, context) {
			Util.jsonp(this.options.serviceUrl + '/reverse', {
				key: this._key,
				location: location.lat + ',' + location.lng,
				outputFormat: 'json'
			}, function(data) {
				var results = [],
					loc,
					latLng;
				if (data.results && data.results[0].locations) {
					for (var i = data.results[0].locations.length - 1; i >= 0; i--) {
						loc = data.results[0].locations[i];
						latLng = L.latLng(loc.latLng);
						results[i] = {
							name: this._formatName(loc.street, loc.adminArea4, loc.adminArea3, loc.adminArea1),
							bbox: L.latLngBounds(latLng, latLng),
							center: latLng
						};
					}
				}

				cb.call(context, results);
			}, this);
		}
	}),

	factory: function(key, options) {
		return new L.Control.Geocoder.MapQuest(key, options);
	}
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util":11}],6:[function(require,module,exports){
(function (global){
var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null),
	Util = require('./util');

module.exports = {
	"class": L.Class.extend({
		options: {
			serviceUrl: '//search.mapzen.com/v1',
			geocodingQueryParams: {},
			reverseQueryParams: {}
		},

		initialize: function(apiKey, options) {
			L.Util.setOptions(this, options);
			this._apiKey = apiKey;
			this._lastSuggest = 0;
		},

		geocode: function(query, cb, context) {
			var _this = this;
			Util.getJSON(this.options.serviceUrl + "/search", L.extend({
				'api_key': this._apiKey,
				'text': query
			}, this.options.geocodingQueryParams), function(data) {
				cb.call(context, _this._parseResults(data, "bbox"));
			});
		},

		suggest: function(query, cb, context) {
			var _this = this;
			Util.getJSON(this.options.serviceUrl + "/autocomplete", L.extend({
				'api_key': this._apiKey,
				'text': query
			}, this.options.geocodingQueryParams), function(data) {
				if (data.geocoding.timestamp > this._lastSuggest) {
					this._lastSuggest = data.geocoding.timestamp;
					cb.call(context, _this._parseResults(data, "bbox"));
				}
			});
		},

		reverse: function(location, scale, cb, context) {
			var _this = this;
			Util.getJSON(this.options.serviceUrl + "/reverse", L.extend({
				'api_key': this._apiKey,
				'point.lat': location.lat,
				'point.lon': location.lng
			}, this.options.reverseQueryParams), function(data) {
				cb.call(context, _this._parseResults(data, "bounds"));
			});
		},

		_parseResults: function(data, bboxname) {
			var results = [];
			L.geoJson(data, {
				pointToLayer: function (feature, latlng) {
					return L.circleMarker(latlng);
				},
				onEachFeature: function(feature, layer) {
					var result = {};
					result['name'] = layer.feature.properties.label;
					result[bboxname] = layer.getBounds();
					result['center'] = result[bboxname].getCenter();
					result['properties'] = layer.feature.properties;
					results.push(result);
				}
			});
			return results;
		}
	}),

	factory: function(apiKey, options) {
		return new L.Control.Geocoder.Mapzen(apiKey, options);
	}
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util":11}],7:[function(require,module,exports){
(function (global){
var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null),
	Util = require('./util');

module.exports = {
	"class": L.Class.extend({
		options: {
			serviceUrl: 'https://nominatim.openstreetmap.org/',
			geocodingQueryParams: {},
			reverseQueryParams: {},
			htmlTemplate: function(r) {
				var a = r.address,
					parts = [];
				if (a.road || a.building) {
					parts.push('{building} {road} {house_number}');
				}

				if (a.city || a.town || a.village) {
					parts.push('<span class="' + (parts.length > 0 ? 'leaflet-control-geocoder-address-detail' : '') +
						'">{postcode} {city} {town} {village}</span>');
				}

				if (a.state || a.country) {
					parts.push('<span class="' + (parts.length > 0 ? 'leaflet-control-geocoder-address-context' : '') +
						'">{state} {country}</span>');
				}

				return Util.template(parts.join('<br/>'), a, true);
			}
		},

		initialize: function(options) {
			L.Util.setOptions(this, options);
		},

		geocode: function(query, cb, context) {
			Util.jsonp(this.options.serviceUrl + 'search', L.extend({
				q: query,
				limit: 5,
				format: 'json',
				addressdetails: 1
			}, this.options.geocodingQueryParams),
			function(data) {
				var results = [];
				for (var i = data.length - 1; i >= 0; i--) {
					var bbox = data[i].boundingbox;
					for (var j = 0; j < 4; j++) bbox[j] = parseFloat(bbox[j]);
					results[i] = {
						icon: data[i].icon,
						name: data[i].display_name,
						html: this.options.htmlTemplate ?
							this.options.htmlTemplate(data[i])
							: undefined,
						bbox: L.latLngBounds([bbox[0], bbox[2]], [bbox[1], bbox[3]]),
						center: L.latLng(data[i].lat, data[i].lon),
						properties: data[i]
					};
				}
				cb.call(context, results);
			}, this, 'json_callback');
		},

		reverse: function(location, scale, cb, context) {
			Util.jsonp(this.options.serviceUrl + 'reverse', L.extend({
				lat: location.lat,
				lon: location.lng,
				zoom: Math.round(Math.log(scale / 256) / Math.log(2)),
				addressdetails: 1,
				format: 'json'
			}, this.options.reverseQueryParams), function(data) {
				var result = [],
				    loc;

				if (data && data.lat && data.lon) {
					loc = L.latLng(data.lat, data.lon);
					result.push({
						name: data.display_name,
						html: this.options.htmlTemplate ?
							this.options.htmlTemplate(data)
							: undefined,
						center: loc,
						bounds: L.latLngBounds(loc, loc),
						properties: data
					});
				}

				cb.call(context, result);
			}, this, 'json_callback');
		}
	}),

	factory: function(options) {
		return new L.Control.Geocoder.Nominatim(options);
	}
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util":11}],8:[function(require,module,exports){
(function (global){
var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null),
	Util = require('./util');

module.exports = {
	"class": L.Class.extend({
		options: {
			serviceUrl: 'https://photon.komoot.de/api/',
			reverseUrl: '//photon.komoot.de/reverse/',
			nameProperties: [
				'name',
				'street',
				'suburb',
				'hamlet',
				'town',
				'city',
				'state',
				'country'
			]
		},

		initialize: function(options) {
			L.setOptions(this, options);
		},

		geocode: function(query, cb, context) {
			var params = L.extend({
				q: query
			}, this.options.geocodingQueryParams);

			Util.getJSON(this.options.serviceUrl, params, L.bind(function(data) {
				cb.call(context, this._decodeFeatures(data));
			}, this));
		},

		suggest: function(query, cb, context) {
			return this.geocode(query, cb, context);
		},

		reverse: function(latLng, scale, cb, context) {
			var params = L.extend({
				lat: latLng.lat,
				lon: latLng.lng
			}, this.options.geocodingQueryParams);

			Util.getJSON(this.options.reverseUrl, params, L.bind(function(data) {
				cb.call(context, this._decodeFeatures(data));
			}, this));
		},

		_decodeFeatures: function(data) {
			var results = [],
				i,
				f,
				c,
				latLng,
				extent,
				bbox;

			if (data && data.features) {
				for (i = 0; i < data.features.length; i++) {
					f = data.features[i];
					c = f.geometry.coordinates;
					latLng = L.latLng(c[1], c[0]);
					extent = f.properties.extent;

					if (extent) {
						bbox = L.latLngBounds([extent[1], extent[0]], [extent[3], extent[2]]);
					} else {
						bbox = L.latLngBounds(latLng, latLng);
					}

					results.push({
						name: this._deocodeFeatureName(f),
						center: latLng,
						bbox: bbox,
						properties: f.properties
					});
				}
			}

			return results;
		},

		_deocodeFeatureName: function(f) {
			var j,
				name;
			for (j = 0; !name && j < this.options.nameProperties.length; j++) {
				name = f.properties[this.options.nameProperties[j]];
			}

			return name;
		}
	}),

	factory: function(options) {
		return new L.Control.Geocoder.Photon(options);
	}
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util":11}],9:[function(require,module,exports){
(function (global){
var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null),
	Util = require('./util');

module.exports = {
	"class": L.Class.extend({
		options: {
			serviceUrl: 'http://api.what3words.com/'
		},

		initialize: function(accessToken) {
			this._accessToken = accessToken;
		},

		geocode: function(query, cb, context) {
			//get three words and make a dot based string
			Util.getJSON(this.options.serviceUrl +'w3w', {
				key: this._accessToken,
				string: query.split(/\s+/).join('.')
			}, function(data) {
				var results = [], loc, latLng, latLngBounds;
				if (data.position && data.position.length) {
					loc = data.words;
					latLng = L.latLng(data.position[0],data.position[1]);
					latLngBounds = L.latLngBounds(latLng, latLng);
					results[0] = {
						name: loc.join('.'),
						bbox: latLngBounds,
						center: latLng
					};
				}

				cb.call(context, results);
			});
		},

		suggest: function(query, cb, context) {
			return this.geocode(query, cb, context);
		},

		reverse: function(location, scale, cb, context) {
			Util.getJSON(this.options.serviceUrl +'position', {
				key: this._accessToken,
				position: [location.lat,location.lng].join(',')
			}, function(data) {
				var results = [],loc,latLng,latLngBounds;
				if (data.position && data.position.length) {
					loc = data.words;
					latLng = L.latLng(data.position[0],data.position[1]);
					latLngBounds = L.latLngBounds(latLng, latLng);
					results[0] = {
						name: loc.join('.'),
						bbox: latLngBounds,
						center: latLng
					};
				}
				cb.call(context, results);
			});
		}
	}),

	factory: function(accessToken) {
		return new L.Control.Geocoder.What3Words(accessToken);
	}
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util":11}],10:[function(require,module,exports){
(function (global){
var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null),
	Control = require('./control'),
	Nominatim = require('./geocoders/nominatim'),
	Bing = require('./geocoders/bing'),
	MapQuest = require('./geocoders/mapquest'),
	Mapbox = require('./geocoders/mapbox'),
	What3Words = require('./geocoders/what3words'),
	Google = require('./geocoders/google'),
	Photon = require('./geocoders/photon'),
	Mapzen = require('./geocoders/mapzen');

module.exports = L.Util.extend(Control["class"], {
	Nominatim: Nominatim["class"],
	nominatim: Nominatim.factory,
	Bing: Bing["class"],
	bing: Bing.factory,
	MapQuest: MapQuest["class"],
	mapQuest: MapQuest.factory,
	Mapbox: Mapbox["class"],
	mapbox: Mapbox.factory,
	What3Words: What3Words["class"],
	what3words: What3Words.factory,
	Google: Google["class"],
	google: Google.factory,
	Photon: Photon["class"],
	photon: Photon.factory,
	Mapzen: Mapzen["class"],
	mapzen: Mapzen.factory
});

L.Util.extend(L.Control, {
	Geocoder: module.exports,
	geocoder: Control.factory
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./control":1,"./geocoders/bing":2,"./geocoders/google":3,"./geocoders/mapbox":4,"./geocoders/mapquest":5,"./geocoders/mapzen":6,"./geocoders/nominatim":7,"./geocoders/photon":8,"./geocoders/what3words":9}],11:[function(require,module,exports){
(function (global){
var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null),
	lastCallbackId = 0,
	htmlEscape = (function() {
		// Adapted from handlebars.js
		// https://github.com/wycats/handlebars.js/
		var badChars = /[&<>"'`]/g;
		var possible = /[&<>"'`]/;
		var escape = {
		  '&': '&amp;',
		  '<': '&lt;',
		  '>': '&gt;',
		  '"': '&quot;',
		  '\'': '&#x27;',
		  '`': '&#x60;'
		};

		function escapeChar(chr) {
		  return escape[chr];
		}

		return function(string) {
			if (string == null) {
				return '';
			} else if (!string) {
				return string + '';
			}

			// Force a string conversion as this will be done by the append regardless and
			// the regex test will do this transparently behind the scenes, causing issues if
			// an object's to string has escaped characters in it.
			string = '' + string;

			if (!possible.test(string)) {
				return string;
			}
			return string.replace(badChars, escapeChar);
		};
	})();

module.exports = {
	jsonp: function(url, params, callback, context, jsonpParam) {
		var callbackId = '_l_geocoder_' + (lastCallbackId++);
		params[jsonpParam || 'callback'] = callbackId;
		window[callbackId] = L.Util.bind(callback, context);
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = url + L.Util.getParamString(params);
		script.id = callbackId;
		document.getElementsByTagName('head')[0].appendChild(script);
	},

	getJSON: function(url, params, callback) {
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.onreadystatechange = function () {
			if (xmlHttp.readyState !== 4){
				return;
			}
			if (xmlHttp.status !== 200 && xmlHttp.status !== 304){
				callback('');
				return;
			}
			callback(JSON.parse(xmlHttp.response));
		};
		xmlHttp.open('GET', url + L.Util.getParamString(params), true);
		xmlHttp.setRequestHeader('Accept', 'application/json');
		xmlHttp.send(null);
	},

	template: function (str, data) {
		return str.replace(/\{ *([\w_]+) *\}/g, function (str, key) {
			var value = data[key];
			if (value === undefined) {
				value = '';
			} else if (typeof value === 'function') {
				value = value(data);
			}
			return htmlEscape(value);
		});
	},

	htmlEscape: htmlEscape
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[10]);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9Db250cm9sLkdlb2NvZGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSh7MTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgTCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydMJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydMJ10gOiBudWxsKSxcblx0Tm9taW5hdGltID0gcmVxdWlyZSgnLi9nZW9jb2RlcnMvbm9taW5hdGltJylbXCJjbGFzc1wiXTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdFwiY2xhc3NcIjogTC5Db250cm9sLmV4dGVuZCh7XG5cdFx0b3B0aW9uczoge1xuXHRcdFx0c2hvd1Jlc3VsdEljb25zOiBmYWxzZSxcblx0XHRcdGNvbGxhcHNlZDogdHJ1ZSxcblx0XHRcdGV4cGFuZDogJ2NsaWNrJyxcblx0XHRcdHBvc2l0aW9uOiAndG9wcmlnaHQnLFxuXHRcdFx0cGxhY2Vob2xkZXI6ICdTZWFyY2guLi4nLFxuXHRcdFx0ZXJyb3JNZXNzYWdlOiAnTm90aGluZyBmb3VuZC4nXG5cdFx0fSxcblxuXHRcdF9jYWxsYmFja0lkOiAwLFxuXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0XHRcdEwuVXRpbC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xuXHRcdFx0aWYgKCF0aGlzLm9wdGlvbnMuZ2VvY29kZXIpIHtcblx0XHRcdFx0dGhpcy5vcHRpb25zLmdlb2NvZGVyID0gbmV3IE5vbWluYXRpbSgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRvbkFkZDogZnVuY3Rpb24gKG1hcCkge1xuXHRcdFx0dmFyIGNsYXNzTmFtZSA9ICdsZWFmbGV0LWNvbnRyb2wtZ2VvY29kZXInLFxuXHRcdFx0ICAgIGNvbnRhaW5lciA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsIGNsYXNzTmFtZSArICcgbGVhZmxldC1iYXInKSxcblx0XHRcdCAgICBpY29uID0gTC5Eb21VdGlsLmNyZWF0ZSgnYScsICdsZWFmbGV0LWNvbnRyb2wtZ2VvY29kZXItaWNvbicsIGNvbnRhaW5lciksXG5cdFx0XHQgICAgZm9ybSA9IHRoaXMuX2Zvcm0gPSBMLkRvbVV0aWwuY3JlYXRlKCdmb3JtJywgY2xhc3NOYW1lICsgJy1mb3JtJywgY29udGFpbmVyKSxcblx0XHRcdCAgICBpbnB1dDtcblxuXHRcdFx0aWNvbi5pbm5lckhUTUwgPSAnJm5ic3A7Jztcblx0XHRcdGljb24uaHJlZiA9ICdqYXZhc2NyaXB0OnZvaWQoMCk7Jztcblx0XHRcdHRoaXMuX21hcCA9IG1hcDtcblx0XHRcdHRoaXMuX2NvbnRhaW5lciA9IGNvbnRhaW5lcjtcblx0XHRcdGlucHV0ID0gdGhpcy5faW5wdXQgPSBMLkRvbVV0aWwuY3JlYXRlKCdpbnB1dCcpO1xuXHRcdFx0aW5wdXQudHlwZSA9ICd0ZXh0Jztcblx0XHRcdGlucHV0LnBsYWNlaG9sZGVyID0gdGhpcy5vcHRpb25zLnBsYWNlaG9sZGVyO1xuXG5cdFx0XHRMLkRvbUV2ZW50LmFkZExpc3RlbmVyKGlucHV0LCAna2V5ZG93bicsIHRoaXMuX2tleWRvd24sIHRoaXMpO1xuXHRcdFx0Ly9MLkRvbUV2ZW50LmFkZExpc3RlbmVyKGlucHV0LCAnb25wYXN0ZScsIHRoaXMuX2NsZWFyUmVzdWx0cywgdGhpcyk7XG5cdFx0XHQvL0wuRG9tRXZlbnQuYWRkTGlzdGVuZXIoaW5wdXQsICdvbmlucHV0JywgdGhpcy5fY2xlYXJSZXN1bHRzLCB0aGlzKTtcblxuXHRcdFx0dGhpcy5fZXJyb3JFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHR0aGlzLl9lcnJvckVsZW1lbnQuY2xhc3NOYW1lID0gY2xhc3NOYW1lICsgJy1mb3JtLW5vLWVycm9yJztcblx0XHRcdHRoaXMuX2Vycm9yRWxlbWVudC5pbm5lckhUTUwgPSB0aGlzLm9wdGlvbnMuZXJyb3JNZXNzYWdlO1xuXG5cdFx0XHR0aGlzLl9hbHRzID0gTC5Eb21VdGlsLmNyZWF0ZSgndWwnLCBjbGFzc05hbWUgKyAnLWFsdGVybmF0aXZlcyBsZWFmbGV0LWNvbnRyb2wtZ2VvY29kZXItYWx0ZXJuYXRpdmVzLW1pbmltaXplZCcpO1xuXG5cdFx0XHRmb3JtLmFwcGVuZENoaWxkKGlucHV0KTtcblx0XHRcdHRoaXMuX2NvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLl9lcnJvckVsZW1lbnQpO1xuXHRcdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuX2FsdHMpO1xuXG5cdFx0XHRMLkRvbUV2ZW50LmFkZExpc3RlbmVyKGZvcm0sICdzdWJtaXQnLCB0aGlzLl9nZW9jb2RlLCB0aGlzKTtcblxuXHRcdFx0aWYgKHRoaXMub3B0aW9ucy5jb2xsYXBzZWQpIHtcblx0XHRcdFx0aWYgKHRoaXMub3B0aW9ucy5leHBhbmQgPT09ICdjbGljaycpIHtcblx0XHRcdFx0XHRMLkRvbUV2ZW50LmFkZExpc3RlbmVyKGljb24sICdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRcdC8vIFRPRE86IHRvdWNoXG5cdFx0XHRcdFx0XHRpZiAoZS5idXR0b24gPT09IDAgJiYgZS5kZXRhaWwgIT09IDIpIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5fdG9nZ2xlKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSwgdGhpcyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0TC5Eb21FdmVudC5hZGRMaXN0ZW5lcihpY29uLCAnbW91c2VvdmVyJywgdGhpcy5fZXhwYW5kLCB0aGlzKTtcblx0XHRcdFx0XHRMLkRvbUV2ZW50LmFkZExpc3RlbmVyKGljb24sICdtb3VzZW91dCcsIHRoaXMuX2NvbGxhcHNlLCB0aGlzKTtcblx0XHRcdFx0XHR0aGlzLl9tYXAub24oJ21vdmVzdGFydCcsIHRoaXMuX2NvbGxhcHNlLCB0aGlzKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0TC5Eb21FdmVudC5hZGRMaXN0ZW5lcihpY29uLCAnY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0dGhpcy5fZ2VvY29kZShlKTtcblx0XHRcdFx0fSwgdGhpcyk7XG5cdFx0XHRcdHRoaXMuX2V4cGFuZCgpO1xuXHRcdFx0fVxuXG5cdFx0XHRMLkRvbUV2ZW50LmRpc2FibGVDbGlja1Byb3BhZ2F0aW9uKGNvbnRhaW5lcik7XG5cblx0XHRcdHJldHVybiBjb250YWluZXI7XG5cdFx0fSxcblxuXHRcdF9nZW9jb2RlUmVzdWx0OiBmdW5jdGlvbiAocmVzdWx0cykge1xuXHRcdFx0TC5Eb21VdGlsLnJlbW92ZUNsYXNzKHRoaXMuX2NvbnRhaW5lciwgJ2xlYWZsZXQtY29udHJvbC1nZW9jb2Rlci10aHJvYmJlcicpO1xuXHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdHRoaXMuX2dlb2NvZGVSZXN1bHRTZWxlY3RlZChyZXN1bHRzWzBdKTtcblx0XHRcdH0gZWxzZSBpZiAocmVzdWx0cy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdHRoaXMuX2FsdHMuaW5uZXJIVE1MID0gJyc7XG5cdFx0XHRcdHRoaXMuX3Jlc3VsdHMgPSByZXN1bHRzO1xuXHRcdFx0XHRMLkRvbVV0aWwucmVtb3ZlQ2xhc3ModGhpcy5fYWx0cywgJ2xlYWZsZXQtY29udHJvbC1nZW9jb2Rlci1hbHRlcm5hdGl2ZXMtbWluaW1pemVkJyk7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcmVzdWx0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdHRoaXMuX2FsdHMuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlQWx0KHJlc3VsdHNbaV0sIGkpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0TC5Eb21VdGlsLmFkZENsYXNzKHRoaXMuX2Vycm9yRWxlbWVudCwgJ2xlYWZsZXQtY29udHJvbC1nZW9jb2Rlci1lcnJvcicpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRtYXJrR2VvY29kZTogZnVuY3Rpb24ocmVzdWx0KSB7XG5cdFx0ICAgICAgICAgICAgdGhpcy5fbWFwLmZpdEJvdW5kcyhyZXN1bHQuYmJveCk7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gQWRkIEN1c3RvbSBJY29uIHJlc3VsdFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR2YXIgYWRkU2ljb24gPSBuZXcgTC5pY29uKHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0ICAgIGljb25Vcmw6ICdwdWJsaWMvaW1hZ2VzL3BpbnBmcy5wbmcnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQgICAgaWNvblJldGluYVVybDogJ3B1YmxpYy9pbWFnZXMvcGlucGZzLnBuZycsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCAgICBpY29uU2l6ZTogWzM2LCA0N10sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCAgICBpY29uQW5jaG9yOiBbMTgsIDQ3XSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0ICAgIHBvcHVwQW5jaG9yOiBbMCwgLTQ4XSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHZhciB1aWNvblBvcHVwY3NzID0ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQgICdjbGFzc05hbWUnOiAndWljb25Qb3B1cGNzcydcblx0XHRcdFx0XHRcdFx0XHRcdFx0fTtcblx0XHQgICAgICAgICAgICBpZiAodGhpcy5fZ2VvY29kZU1hcmtlcikge1xuXHRcdCAgICAgICAgICAgICAgICB0aGlzLl9tYXAucmVtb3ZlTGF5ZXIodGhpcy5fZ2VvY29kZU1hcmtlcik7XG5cdFx0ICAgICAgICAgICAgfVxuXHRcdCAgICAgICAgICAgIHRoaXMuX2dlb2NvZGVNYXJrZXIgPSBuZXcgTC5NYXJrZXIocmVzdWx0LmNlbnRlciwge2ljb246IGFkZFNpY29ufSlcblx0XHQgICAgICAgICAgICAgICAgLmJpbmRQb3B1cChyZXN1bHQuaHRtbCB8fCByZXN1bHQubmFtZSwgdWljb25Qb3B1cGNzcylcblx0XHQgICAgICAgICAgICAgICAgLmFkZFRvKHRoaXMuX21hcClcblx0XHQgICAgICAgICAgICAgICAgLm9wZW5Qb3B1cCgpO1xuXHRcdCAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cdFx0ICAgICAgICAgICAgdGhpcy5fZ2VvY29kZU1hcmtlci5vbmNlKFwiZGJsY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xuXHRcdCAgICAgICAgICAgICAgICBfdGhpcy5fbWFwLnJlbW92ZUxheWVyKF90aGlzLl9nZW9jb2RlTWFya2VyKTtcblx0XHQgICAgICAgICAgICAgICAgX3RoaXMuX2dlb2NvZGVNYXJrZXIgPSBudWxsO1xuXHRcdCAgICAgICAgICAgIH0pO1xuXG5cdFx0ICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG5cdFx0ICAgICAgICB9LFxuXG5cdFx0X2dlb2NvZGU6IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KGV2ZW50KTtcblxuXHRcdFx0TC5Eb21VdGlsLmFkZENsYXNzKHRoaXMuX2NvbnRhaW5lciwgJ2xlYWZsZXQtY29udHJvbC1nZW9jb2Rlci10aHJvYmJlcicpO1xuXHRcdFx0dGhpcy5fY2xlYXJSZXN1bHRzKCk7XG5cdFx0XHR0aGlzLm9wdGlvbnMuZ2VvY29kZXIuZ2VvY29kZSh0aGlzLl9pbnB1dC52YWx1ZSwgdGhpcy5fZ2VvY29kZVJlc3VsdCwgdGhpcyk7XG5cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LFxuXG5cdFx0X2dlb2NvZGVSZXN1bHRTZWxlY3RlZDogZnVuY3Rpb24ocmVzdWx0KSB7XG5cdFx0XHRpZiAodGhpcy5vcHRpb25zLmNvbGxhcHNlZCkge1xuXHRcdFx0XHR0aGlzLl9jb2xsYXBzZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fY2xlYXJSZXN1bHRzKCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLm1hcmtHZW9jb2RlKHJlc3VsdCk7XG5cdFx0fSxcblxuXHRcdF90b2dnbGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKHRoaXMuX2NvbnRhaW5lci5jbGFzc05hbWUuaW5kZXhPZignbGVhZmxldC1jb250cm9sLWdlb2NvZGVyLWV4cGFuZGVkJykgPj0gMCkge1xuXHRcdFx0XHR0aGlzLl9jb2xsYXBzZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fZXhwYW5kKCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdF9leHBhbmQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdEwuRG9tVXRpbC5hZGRDbGFzcyh0aGlzLl9jb250YWluZXIsICdsZWFmbGV0LWNvbnRyb2wtZ2VvY29kZXItZXhwYW5kZWQnKTtcblx0XHRcdHRoaXMuX2lucHV0LnNlbGVjdCgpO1xuXHRcdH0sXG5cblx0XHRfY29sbGFwc2U6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHRoaXMuX2NvbnRhaW5lci5jbGFzc05hbWUgPSB0aGlzLl9jb250YWluZXIuY2xhc3NOYW1lLnJlcGxhY2UoJyBsZWFmbGV0LWNvbnRyb2wtZ2VvY29kZXItZXhwYW5kZWQnLCAnJyk7XG5cdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fYWx0cywgJ2xlYWZsZXQtY29udHJvbC1nZW9jb2Rlci1hbHRlcm5hdGl2ZXMtbWluaW1pemVkJyk7XG5cdFx0XHRMLkRvbVV0aWwucmVtb3ZlQ2xhc3ModGhpcy5fZXJyb3JFbGVtZW50LCAnbGVhZmxldC1jb250cm9sLWdlb2NvZGVyLWVycm9yJyk7XG5cdFx0fSxcblxuXHRcdF9jbGVhclJlc3VsdHM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdEwuRG9tVXRpbC5hZGRDbGFzcyh0aGlzLl9hbHRzLCAnbGVhZmxldC1jb250cm9sLWdlb2NvZGVyLWFsdGVybmF0aXZlcy1taW5pbWl6ZWQnKTtcblx0XHRcdHRoaXMuX3NlbGVjdGlvbiA9IG51bGw7XG5cdFx0XHRMLkRvbVV0aWwucmVtb3ZlQ2xhc3ModGhpcy5fZXJyb3JFbGVtZW50LCAnbGVhZmxldC1jb250cm9sLWdlb2NvZGVyLWVycm9yJyk7XG5cdFx0fSxcblxuXHRcdF9jcmVhdGVBbHQ6IGZ1bmN0aW9uKHJlc3VsdCwgaW5kZXgpIHtcblx0XHRcdHZhciBsaSA9IEwuRG9tVXRpbC5jcmVhdGUoJ2xpJywgJycpLFxuXHRcdFx0XHRhID0gTC5Eb21VdGlsLmNyZWF0ZSgnYScsICcnLCBsaSksXG5cdFx0XHQgICAgaWNvbiA9IHRoaXMub3B0aW9ucy5zaG93UmVzdWx0SWNvbnMgJiYgcmVzdWx0Lmljb24gPyBMLkRvbVV0aWwuY3JlYXRlKCdpbWcnLCAnJywgYSkgOiBudWxsLFxuXHRcdFx0ICAgIHRleHQgPSByZXN1bHQuaHRtbCA/IHVuZGVmaW5lZCA6IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHJlc3VsdC5uYW1lKSxcblx0XHRcdCAgICBjbGlja0hhbmRsZXIgPSBmdW5jdGlvbiBjbGlja0hhbmRsZXIoZSkge1xuXHRcdFx0XHRcdEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQoZSk7XG5cdFx0XHRcdFx0dGhpcy5fZ2VvY29kZVJlc3VsdFNlbGVjdGVkKHJlc3VsdCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdGlmIChpY29uKSB7XG5cdFx0XHRcdGljb24uc3JjID0gcmVzdWx0Lmljb247XG5cdFx0XHR9XG5cblx0XHRcdGxpLnNldEF0dHJpYnV0ZSgnZGF0YS1yZXN1bHQtaW5kZXgnLCBpbmRleCk7XG5cblx0XHRcdGlmIChyZXN1bHQuaHRtbCkge1xuXHRcdFx0XHRhLmlubmVySFRNTCA9IHJlc3VsdC5odG1sO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YS5hcHBlbmRDaGlsZCh0ZXh0KTtcblx0XHRcdH1cblxuXHRcdFx0TC5Eb21FdmVudC5hZGRMaXN0ZW5lcihsaSwgJ2NsaWNrJywgY2xpY2tIYW5kbGVyLCB0aGlzKTtcblxuXHRcdFx0cmV0dXJuIGxpO1xuXHRcdH0sXG5cblx0XHRfa2V5ZG93bjogZnVuY3Rpb24oZSkge1xuXHRcdFx0dmFyIF90aGlzID0gdGhpcyxcblx0XHRcdCAgICBzZWxlY3QgPSBmdW5jdGlvbiBzZWxlY3QoZGlyKSB7XG5cdFx0XHRcdFx0aWYgKF90aGlzLl9zZWxlY3Rpb24pIHtcblx0XHRcdFx0XHRcdEwuRG9tVXRpbC5yZW1vdmVDbGFzcyhfdGhpcy5fc2VsZWN0aW9uLCAnbGVhZmxldC1jb250cm9sLWdlb2NvZGVyLXNlbGVjdGVkJyk7XG5cdFx0XHRcdFx0XHRfdGhpcy5fc2VsZWN0aW9uID0gX3RoaXMuX3NlbGVjdGlvbltkaXIgPiAwID8gJ25leHRTaWJsaW5nJyA6ICdwcmV2aW91c1NpYmxpbmcnXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCFfdGhpcy5fc2VsZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHRfdGhpcy5fc2VsZWN0aW9uID0gX3RoaXMuX2FsdHNbZGlyID4gMCA/ICdmaXJzdENoaWxkJyA6ICdsYXN0Q2hpbGQnXTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoX3RoaXMuX3NlbGVjdGlvbikge1xuXHRcdFx0XHRcdFx0TC5Eb21VdGlsLmFkZENsYXNzKF90aGlzLl9zZWxlY3Rpb24sICdsZWFmbGV0LWNvbnRyb2wtZ2VvY29kZXItc2VsZWN0ZWQnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdHN3aXRjaCAoZS5rZXlDb2RlKSB7XG5cdFx0XHQvLyBFc2NhcGVcblx0XHRcdGNhc2UgMjc6XG5cdFx0XHRcdGlmICh0aGlzLm9wdGlvbnMuY29sbGFwc2VkKSB7XG5cdFx0XHRcdFx0dGhpcy5fY29sbGFwc2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdC8vIFVwXG5cdFx0XHRjYXNlIDM4OlxuXHRcdFx0XHRzZWxlY3QoLTEpO1xuXHRcdFx0XHRMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KGUpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdC8vIFVwXG5cdFx0XHRjYXNlIDQwOlxuXHRcdFx0XHRzZWxlY3QoMSk7XG5cdFx0XHRcdEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQoZSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Ly8gRW50ZXJcblx0XHRcdGNhc2UgMTM6XG5cdFx0XHRcdGlmICh0aGlzLl9zZWxlY3Rpb24pIHtcblx0XHRcdFx0XHR2YXIgaW5kZXggPSBwYXJzZUludCh0aGlzLl9zZWxlY3Rpb24uZ2V0QXR0cmlidXRlKCdkYXRhLXJlc3VsdC1pbmRleCcpLCAxMCk7XG5cdFx0XHRcdFx0dGhpcy5fZ2VvY29kZVJlc3VsdFNlbGVjdGVkKHRoaXMuX3Jlc3VsdHNbaW5kZXhdKTtcblx0XHRcdFx0XHR0aGlzLl9jbGVhclJlc3VsdHMoKTtcblx0XHRcdFx0XHRMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdH0pLFxuXHRmYWN0b3J5OiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0cmV0dXJuIG5ldyBMLkNvbnRyb2wuR2VvY29kZXIob3B0aW9ucyk7XG5cdH1cbn07XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxufSx7XCIuL2dlb2NvZGVycy9ub21pbmF0aW1cIjo3fV0sMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgTCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydMJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydMJ10gOiBudWxsKSxcblx0VXRpbCA9IHJlcXVpcmUoJy4vdXRpbC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0XCJjbGFzc1wiOiBMLkNsYXNzLmV4dGVuZCh7XG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHR0aGlzLmtleSA9IGtleTtcblx0XHR9LFxuXG5cdFx0Z2VvY29kZSA6IGZ1bmN0aW9uIChxdWVyeSwgY2IsIGNvbnRleHQpIHtcblx0XHRcdFV0aWwuanNvbnAoJy8vZGV2LnZpcnR1YWxlYXJ0aC5uZXQvUkVTVC92MS9Mb2NhdGlvbnMnLCB7XG5cdFx0XHRcdHF1ZXJ5OiBxdWVyeSxcblx0XHRcdFx0a2V5IDogdGhpcy5rZXlcblx0XHRcdH0sIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0dmFyIHJlc3VsdHMgPSBbXTtcblx0XHRcdFx0aWYoIGRhdGEucmVzb3VyY2VTZXRzLmxlbmd0aCA+IDAgKXtcblx0XHRcdFx0XHRmb3IgKHZhciBpID0gZGF0YS5yZXNvdXJjZVNldHNbMF0ucmVzb3VyY2VzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRcdFx0XHR2YXIgcmVzb3VyY2UgPSBkYXRhLnJlc291cmNlU2V0c1swXS5yZXNvdXJjZXNbaV0sXG5cdFx0XHRcdFx0XHRcdGJib3ggPSByZXNvdXJjZS5iYm94O1xuXHRcdFx0XHRcdFx0cmVzdWx0c1tpXSA9IHtcblx0XHRcdFx0XHRcdFx0bmFtZTogcmVzb3VyY2UubmFtZSxcblx0XHRcdFx0XHRcdFx0YmJveDogTC5sYXRMbmdCb3VuZHMoW2Jib3hbMF0sIGJib3hbMV1dLCBbYmJveFsyXSwgYmJveFszXV0pLFxuXHRcdFx0XHRcdFx0XHRjZW50ZXI6IEwubGF0TG5nKHJlc291cmNlLnBvaW50LmNvb3JkaW5hdGVzKVxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2IuY2FsbChjb250ZXh0LCByZXN1bHRzKTtcblx0XHRcdH0sIHRoaXMsICdqc29ucCcpO1xuXHRcdH0sXG5cblx0XHRyZXZlcnNlOiBmdW5jdGlvbihsb2NhdGlvbiwgc2NhbGUsIGNiLCBjb250ZXh0KSB7XG5cdFx0XHRVdGlsLmpzb25wKCcvL2Rldi52aXJ0dWFsZWFydGgubmV0L1JFU1QvdjEvTG9jYXRpb25zLycgKyBsb2NhdGlvbi5sYXQgKyAnLCcgKyBsb2NhdGlvbi5sbmcsIHtcblx0XHRcdFx0a2V5IDogdGhpcy5rZXlcblx0XHRcdH0sIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0dmFyIHJlc3VsdHMgPSBbXTtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IGRhdGEucmVzb3VyY2VTZXRzWzBdLnJlc291cmNlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0XHRcdHZhciByZXNvdXJjZSA9IGRhdGEucmVzb3VyY2VTZXRzWzBdLnJlc291cmNlc1tpXSxcblx0XHRcdFx0XHRcdGJib3ggPSByZXNvdXJjZS5iYm94O1xuXHRcdFx0XHRcdHJlc3VsdHNbaV0gPSB7XG5cdFx0XHRcdFx0XHRuYW1lOiByZXNvdXJjZS5uYW1lLFxuXHRcdFx0XHRcdFx0YmJveDogTC5sYXRMbmdCb3VuZHMoW2Jib3hbMF0sIGJib3hbMV1dLCBbYmJveFsyXSwgYmJveFszXV0pLFxuXHRcdFx0XHRcdFx0Y2VudGVyOiBMLmxhdExuZyhyZXNvdXJjZS5wb2ludC5jb29yZGluYXRlcylcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNiLmNhbGwoY29udGV4dCwgcmVzdWx0cyk7XG5cdFx0XHR9LCB0aGlzLCAnanNvbnAnKTtcblx0XHR9XG5cdH0pLFxuXG5cdGZhY3Rvcnk6IGZ1bmN0aW9uKGtleSkge1xuXHRcdHJldHVybiBuZXcgTC5Db250cm9sLkdlb2NvZGVyLkJpbmcoa2V5KTtcblx0fVxufTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pXG59LHtcIi4vdXRpbFwiOjExfV0sMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgTCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydMJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydMJ10gOiBudWxsKSxcblx0VXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0XCJjbGFzc1wiOiBMLkNsYXNzLmV4dGVuZCh7XG5cdFx0b3B0aW9uczoge1xuXHRcdFx0c2VydmljZVVybDogJ2h0dHBzOi8vbWFwcy5nb29nbGVhcGlzLmNvbS9tYXBzL2FwaS9nZW9jb2RlL2pzb24nLFxuXHRcdFx0Z2VvY29kaW5nUXVlcnlQYXJhbXM6IHt9LFxuXHRcdFx0cmV2ZXJzZVF1ZXJ5UGFyYW1zOiB7fVxuXHRcdH0sXG5cblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbihrZXksIG9wdGlvbnMpIHtcblx0XHRcdHRoaXMuX2tleSA9IGtleTtcblx0XHRcdEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcblx0XHRcdC8vIEJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG5cdFx0XHR0aGlzLm9wdGlvbnMuc2VydmljZVVybCA9IHRoaXMub3B0aW9ucy5zZXJ2aWNlX3VybCB8fCB0aGlzLm9wdGlvbnMuc2VydmljZVVybDtcblx0XHR9LFxuXG5cdFx0Z2VvY29kZTogZnVuY3Rpb24ocXVlcnksIGNiLCBjb250ZXh0KSB7XG5cdFx0XHR2YXIgcGFyYW1zID0ge1xuXHRcdFx0XHRhZGRyZXNzOiBxdWVyeVxuXHRcdFx0fTtcblxuXHRcdFx0aWYgKHRoaXMuX2tleSAmJiB0aGlzLl9rZXkubGVuZ3RoKSB7XG5cdFx0XHRcdHBhcmFtcy5rZXkgPSB0aGlzLl9rZXk7XG5cdFx0XHR9XG5cblx0XHRcdHBhcmFtcyA9IEwuVXRpbC5leHRlbmQocGFyYW1zLCB0aGlzLm9wdGlvbnMuZ2VvY29kaW5nUXVlcnlQYXJhbXMpO1xuXG5cdFx0XHRVdGlsLmdldEpTT04odGhpcy5vcHRpb25zLnNlcnZpY2VVcmwsIHBhcmFtcywgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHR2YXIgcmVzdWx0cyA9IFtdLFxuXHRcdFx0XHRcdFx0bG9jLFxuXHRcdFx0XHRcdFx0bGF0TG5nLFxuXHRcdFx0XHRcdFx0bGF0TG5nQm91bmRzO1xuXHRcdFx0XHRpZiAoZGF0YS5yZXN1bHRzICYmIGRhdGEucmVzdWx0cy5sZW5ndGgpIHtcblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8PSBkYXRhLnJlc3VsdHMubGVuZ3RoIC0gMTsgaSsrKSB7XG5cdFx0XHRcdFx0XHRsb2MgPSBkYXRhLnJlc3VsdHNbaV07XG5cdFx0XHRcdFx0XHRsYXRMbmcgPSBMLmxhdExuZyhsb2MuZ2VvbWV0cnkubG9jYXRpb24pO1xuXHRcdFx0XHRcdFx0bGF0TG5nQm91bmRzID0gTC5sYXRMbmdCb3VuZHMoTC5sYXRMbmcobG9jLmdlb21ldHJ5LnZpZXdwb3J0Lm5vcnRoZWFzdCksIEwubGF0TG5nKGxvYy5nZW9tZXRyeS52aWV3cG9ydC5zb3V0aHdlc3QpKTtcblx0XHRcdFx0XHRcdHJlc3VsdHNbaV0gPSB7XG5cdFx0XHRcdFx0XHRcdG5hbWU6IGxvYy5mb3JtYXR0ZWRfYWRkcmVzcyxcblx0XHRcdFx0XHRcdFx0YmJveDogbGF0TG5nQm91bmRzLFxuXHRcdFx0XHRcdFx0XHRjZW50ZXI6IGxhdExuZyxcblx0XHRcdFx0XHRcdFx0cHJvcGVydGllczogbG9jLmFkZHJlc3NfY29tcG9uZW50c1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYi5jYWxsKGNvbnRleHQsIHJlc3VsdHMpO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdHJldmVyc2U6IGZ1bmN0aW9uKGxvY2F0aW9uLCBzY2FsZSwgY2IsIGNvbnRleHQpIHtcblx0XHRcdHZhciBwYXJhbXMgPSB7XG5cdFx0XHRcdGxhdGxuZzogZW5jb2RlVVJJQ29tcG9uZW50KGxvY2F0aW9uLmxhdCkgKyAnLCcgKyBlbmNvZGVVUklDb21wb25lbnQobG9jYXRpb24ubG5nKVxuXHRcdFx0fTtcblx0XHRcdHBhcmFtcyA9IEwuVXRpbC5leHRlbmQocGFyYW1zLCB0aGlzLm9wdGlvbnMucmV2ZXJzZVF1ZXJ5UGFyYW1zKTtcblx0XHRcdGlmICh0aGlzLl9rZXkgJiYgdGhpcy5fa2V5Lmxlbmd0aCkge1xuXHRcdFx0XHRwYXJhbXMua2V5ID0gdGhpcy5fa2V5O1xuXHRcdFx0fVxuXG5cdFx0XHRVdGlsLmdldEpTT04odGhpcy5vcHRpb25zLnNlcnZpY2VVcmwsIHBhcmFtcywgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHR2YXIgcmVzdWx0cyA9IFtdLFxuXHRcdFx0XHRcdFx0bG9jLFxuXHRcdFx0XHRcdFx0bGF0TG5nLFxuXHRcdFx0XHRcdFx0bGF0TG5nQm91bmRzO1xuXHRcdFx0XHRpZiAoZGF0YS5yZXN1bHRzICYmIGRhdGEucmVzdWx0cy5sZW5ndGgpIHtcblx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8PSBkYXRhLnJlc3VsdHMubGVuZ3RoIC0gMTsgaSsrKSB7XG5cdFx0XHRcdFx0XHRsb2MgPSBkYXRhLnJlc3VsdHNbaV07XG5cdFx0XHRcdFx0XHRsYXRMbmcgPSBMLmxhdExuZyhsb2MuZ2VvbWV0cnkubG9jYXRpb24pO1xuXHRcdFx0XHRcdFx0bGF0TG5nQm91bmRzID0gTC5sYXRMbmdCb3VuZHMoTC5sYXRMbmcobG9jLmdlb21ldHJ5LnZpZXdwb3J0Lm5vcnRoZWFzdCksIEwubGF0TG5nKGxvYy5nZW9tZXRyeS52aWV3cG9ydC5zb3V0aHdlc3QpKTtcblx0XHRcdFx0XHRcdHJlc3VsdHNbaV0gPSB7XG5cdFx0XHRcdFx0XHRcdG5hbWU6IGxvYy5mb3JtYXR0ZWRfYWRkcmVzcyxcblx0XHRcdFx0XHRcdFx0YmJveDogbGF0TG5nQm91bmRzLFxuXHRcdFx0XHRcdFx0XHRjZW50ZXI6IGxhdExuZyxcblx0XHRcdFx0XHRcdFx0cHJvcGVydGllczogbG9jLmFkZHJlc3NfY29tcG9uZW50c1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYi5jYWxsKGNvbnRleHQsIHJlc3VsdHMpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KSxcblxuXHRmYWN0b3J5OiBmdW5jdGlvbihrZXksIG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gbmV3IEwuQ29udHJvbC5HZW9jb2Rlci5Hb29nbGUoa2V5LCBvcHRpb25zKTtcblx0fVxufTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pXG59LHtcIi4vdXRpbFwiOjExfV0sNDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgTCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydMJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydMJ10gOiBudWxsKSxcblx0VXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0XCJjbGFzc1wiOiBMLkNsYXNzLmV4dGVuZCh7XG5cdFx0b3B0aW9uczoge1xuXHRcdFx0c2VydmljZVVybDogJ2h0dHBzOi8vYXBpLnRpbGVzLm1hcGJveC5jb20vdjQvZ2VvY29kZS9tYXBib3gucGxhY2VzLXYxLydcblx0XHR9LFxuXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oYWNjZXNzVG9rZW4sIG9wdGlvbnMpIHtcblx0XHRcdEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcblx0XHRcdHRoaXMuX2FjY2Vzc1Rva2VuID0gYWNjZXNzVG9rZW47XG5cdFx0fSxcblxuXHRcdGdlb2NvZGU6IGZ1bmN0aW9uKHF1ZXJ5LCBjYiwgY29udGV4dCkge1xuXHRcdFx0VXRpbC5nZXRKU09OKHRoaXMub3B0aW9ucy5zZXJ2aWNlVXJsICsgZW5jb2RlVVJJQ29tcG9uZW50KHF1ZXJ5KSArICcuanNvbicsIHtcblx0XHRcdFx0YWNjZXNzX3Rva2VuOiB0aGlzLl9hY2Nlc3NUb2tlblxuXHRcdFx0fSwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHR2YXIgcmVzdWx0cyA9IFtdLFxuXHRcdFx0XHRsb2MsXG5cdFx0XHRcdGxhdExuZyxcblx0XHRcdFx0bGF0TG5nQm91bmRzO1xuXHRcdFx0XHRpZiAoZGF0YS5mZWF0dXJlcyAmJiBkYXRhLmZlYXR1cmVzLmxlbmd0aCkge1xuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDw9IGRhdGEuZmVhdHVyZXMubGVuZ3RoIC0gMTsgaSsrKSB7XG5cdFx0XHRcdFx0XHRsb2MgPSBkYXRhLmZlYXR1cmVzW2ldO1xuXHRcdFx0XHRcdFx0bGF0TG5nID0gTC5sYXRMbmcobG9jLmNlbnRlci5yZXZlcnNlKCkpO1xuXHRcdFx0XHRcdFx0aWYobG9jLmhhc093blByb3BlcnR5KCdiYm94JykpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGxhdExuZ0JvdW5kcyA9IEwubGF0TG5nQm91bmRzKEwubGF0TG5nKGxvYy5iYm94LnNsaWNlKDAsIDIpLnJldmVyc2UoKSksIEwubGF0TG5nKGxvYy5iYm94LnNsaWNlKDIsIDQpLnJldmVyc2UoKSkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRsYXRMbmdCb3VuZHMgPSBMLmxhdExuZ0JvdW5kcyhsYXRMbmcsIGxhdExuZyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXN1bHRzW2ldID0ge1xuXHRcdFx0XHRcdFx0XHRuYW1lOiBsb2MucGxhY2VfbmFtZSxcblx0XHRcdFx0XHRcdFx0YmJveDogbGF0TG5nQm91bmRzLFxuXHRcdFx0XHRcdFx0XHRjZW50ZXI6IGxhdExuZ1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYi5jYWxsKGNvbnRleHQsIHJlc3VsdHMpO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdHN1Z2dlc3Q6IGZ1bmN0aW9uKHF1ZXJ5LCBjYiwgY29udGV4dCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2VvY29kZShxdWVyeSwgY2IsIGNvbnRleHQpO1xuXHRcdH0sXG5cblx0XHRyZXZlcnNlOiBmdW5jdGlvbihsb2NhdGlvbiwgc2NhbGUsIGNiLCBjb250ZXh0KSB7XG5cdFx0XHRVdGlsLmdldEpTT04odGhpcy5vcHRpb25zLnNlcnZpY2VVcmwgKyBlbmNvZGVVUklDb21wb25lbnQobG9jYXRpb24ubG5nKSArICcsJyArIGVuY29kZVVSSUNvbXBvbmVudChsb2NhdGlvbi5sYXQpICsgJy5qc29uJywge1xuXHRcdFx0XHRhY2Nlc3NfdG9rZW46IHRoaXMuX2FjY2Vzc1Rva2VuXG5cdFx0XHR9LCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdHZhciByZXN1bHRzID0gW10sXG5cdFx0XHRcdGxvYyxcblx0XHRcdFx0bGF0TG5nLFxuXHRcdFx0XHRsYXRMbmdCb3VuZHM7XG5cdFx0XHRcdGlmIChkYXRhLmZlYXR1cmVzICYmIGRhdGEuZmVhdHVyZXMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPD0gZGF0YS5mZWF0dXJlcy5sZW5ndGggLSAxOyBpKyspIHtcblx0XHRcdFx0XHRcdGxvYyA9IGRhdGEuZmVhdHVyZXNbaV07XG5cdFx0XHRcdFx0XHRsYXRMbmcgPSBMLmxhdExuZyhsb2MuY2VudGVyLnJldmVyc2UoKSk7XG5cdFx0XHRcdFx0XHRpZihsb2MuaGFzT3duUHJvcGVydHkoJ2Jib3gnKSlcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0bGF0TG5nQm91bmRzID0gTC5sYXRMbmdCb3VuZHMoTC5sYXRMbmcobG9jLmJib3guc2xpY2UoMCwgMikucmV2ZXJzZSgpKSwgTC5sYXRMbmcobG9jLmJib3guc2xpY2UoMiwgNCkucmV2ZXJzZSgpKSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGxhdExuZ0JvdW5kcyA9IEwubGF0TG5nQm91bmRzKGxhdExuZywgbGF0TG5nKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJlc3VsdHNbaV0gPSB7XG5cdFx0XHRcdFx0XHRcdG5hbWU6IGxvYy5wbGFjZV9uYW1lLFxuXHRcdFx0XHRcdFx0XHRiYm94OiBsYXRMbmdCb3VuZHMsXG5cdFx0XHRcdFx0XHRcdGNlbnRlcjogbGF0TG5nXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNiLmNhbGwoY29udGV4dCwgcmVzdWx0cyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0pLFxuXG5cdGZhY3Rvcnk6IGZ1bmN0aW9uKGFjY2Vzc1Rva2VuLCBvcHRpb25zKSB7XG5cdFx0cmV0dXJuIG5ldyBMLkNvbnRyb2wuR2VvY29kZXIuTWFwYm94KGFjY2Vzc1Rva2VuLCBvcHRpb25zKTtcblx0fVxufTtcblxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbn0se1wiLi91dGlsXCI6MTF9XSw1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciBMID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ0wnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ0wnXSA6IG51bGwpLFxuXHRVdGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRcImNsYXNzXCI6IEwuQ2xhc3MuZXh0ZW5kKHtcblx0XHRvcHRpb25zOiB7XG5cdFx0XHRzZXJ2aWNlVXJsOiAnLy93d3cubWFwcXVlc3RhcGkuY29tL2dlb2NvZGluZy92MSdcblx0XHR9LFxuXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oa2V5LCBvcHRpb25zKSB7XG5cdFx0XHQvLyBNYXBRdWVzdCBzZWVtcyB0byBwcm92aWRlIFVSSSBlbmNvZGVkIEFQSSBrZXlzLFxuXHRcdFx0Ly8gc28gdG8gYXZvaWQgZW5jb2RpbmcgdGhlbSB0d2ljZSwgd2UgZGVjb2RlIHRoZW0gaGVyZVxuXHRcdFx0dGhpcy5fa2V5ID0gZGVjb2RlVVJJQ29tcG9uZW50KGtleSk7XG5cblx0XHRcdEwuVXRpbC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xuXHRcdH0sXG5cblx0XHRfZm9ybWF0TmFtZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgciA9IFtdLFxuXHRcdFx0XHRpO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAoYXJndW1lbnRzW2ldKSB7XG5cdFx0XHRcdFx0ci5wdXNoKGFyZ3VtZW50c1tpXSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHIuam9pbignLCAnKTtcblx0XHR9LFxuXG5cdFx0Z2VvY29kZTogZnVuY3Rpb24ocXVlcnksIGNiLCBjb250ZXh0KSB7XG5cdFx0XHRVdGlsLmpzb25wKHRoaXMub3B0aW9ucy5zZXJ2aWNlVXJsICsgJy9hZGRyZXNzJywge1xuXHRcdFx0XHRrZXk6IHRoaXMuX2tleSxcblx0XHRcdFx0bG9jYXRpb246IHF1ZXJ5LFxuXHRcdFx0XHRsaW1pdDogNSxcblx0XHRcdFx0b3V0Rm9ybWF0OiAnanNvbidcblx0XHRcdH0sIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0dmFyIHJlc3VsdHMgPSBbXSxcblx0XHRcdFx0XHRsb2MsXG5cdFx0XHRcdFx0bGF0TG5nO1xuXHRcdFx0XHRpZiAoZGF0YS5yZXN1bHRzICYmIGRhdGEucmVzdWx0c1swXS5sb2NhdGlvbnMpIHtcblx0XHRcdFx0XHRmb3IgKHZhciBpID0gZGF0YS5yZXN1bHRzWzBdLmxvY2F0aW9ucy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0XHRcdFx0bG9jID0gZGF0YS5yZXN1bHRzWzBdLmxvY2F0aW9uc1tpXTtcblx0XHRcdFx0XHRcdGxhdExuZyA9IEwubGF0TG5nKGxvYy5sYXRMbmcpO1xuXHRcdFx0XHRcdFx0cmVzdWx0c1tpXSA9IHtcblx0XHRcdFx0XHRcdFx0bmFtZTogdGhpcy5fZm9ybWF0TmFtZShsb2Muc3RyZWV0LCBsb2MuYWRtaW5BcmVhNCwgbG9jLmFkbWluQXJlYTMsIGxvYy5hZG1pbkFyZWExKSxcblx0XHRcdFx0XHRcdFx0YmJveDogTC5sYXRMbmdCb3VuZHMobGF0TG5nLCBsYXRMbmcpLFxuXHRcdFx0XHRcdFx0XHRjZW50ZXI6IGxhdExuZ1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYi5jYWxsKGNvbnRleHQsIHJlc3VsdHMpO1xuXHRcdFx0fSwgdGhpcyk7XG5cdFx0fSxcblxuXHRcdHJldmVyc2U6IGZ1bmN0aW9uKGxvY2F0aW9uLCBzY2FsZSwgY2IsIGNvbnRleHQpIHtcblx0XHRcdFV0aWwuanNvbnAodGhpcy5vcHRpb25zLnNlcnZpY2VVcmwgKyAnL3JldmVyc2UnLCB7XG5cdFx0XHRcdGtleTogdGhpcy5fa2V5LFxuXHRcdFx0XHRsb2NhdGlvbjogbG9jYXRpb24ubGF0ICsgJywnICsgbG9jYXRpb24ubG5nLFxuXHRcdFx0XHRvdXRwdXRGb3JtYXQ6ICdqc29uJ1xuXHRcdFx0fSwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHR2YXIgcmVzdWx0cyA9IFtdLFxuXHRcdFx0XHRcdGxvYyxcblx0XHRcdFx0XHRsYXRMbmc7XG5cdFx0XHRcdGlmIChkYXRhLnJlc3VsdHMgJiYgZGF0YS5yZXN1bHRzWzBdLmxvY2F0aW9ucykge1xuXHRcdFx0XHRcdGZvciAodmFyIGkgPSBkYXRhLnJlc3VsdHNbMF0ubG9jYXRpb25zLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRcdFx0XHRsb2MgPSBkYXRhLnJlc3VsdHNbMF0ubG9jYXRpb25zW2ldO1xuXHRcdFx0XHRcdFx0bGF0TG5nID0gTC5sYXRMbmcobG9jLmxhdExuZyk7XG5cdFx0XHRcdFx0XHRyZXN1bHRzW2ldID0ge1xuXHRcdFx0XHRcdFx0XHRuYW1lOiB0aGlzLl9mb3JtYXROYW1lKGxvYy5zdHJlZXQsIGxvYy5hZG1pbkFyZWE0LCBsb2MuYWRtaW5BcmVhMywgbG9jLmFkbWluQXJlYTEpLFxuXHRcdFx0XHRcdFx0XHRiYm94OiBMLmxhdExuZ0JvdW5kcyhsYXRMbmcsIGxhdExuZyksXG5cdFx0XHRcdFx0XHRcdGNlbnRlcjogbGF0TG5nXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNiLmNhbGwoY29udGV4dCwgcmVzdWx0cyk7XG5cdFx0XHR9LCB0aGlzKTtcblx0XHR9XG5cdH0pLFxuXG5cdGZhY3Rvcnk6IGZ1bmN0aW9uKGtleSwgb3B0aW9ucykge1xuXHRcdHJldHVybiBuZXcgTC5Db250cm9sLkdlb2NvZGVyLk1hcFF1ZXN0KGtleSwgb3B0aW9ucyk7XG5cdH1cbn07XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxufSx7XCIuL3V0aWxcIjoxMX1dLDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyIEwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snTCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnTCddIDogbnVsbCksXG5cdFV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdFwiY2xhc3NcIjogTC5DbGFzcy5leHRlbmQoe1xuXHRcdG9wdGlvbnM6IHtcblx0XHRcdHNlcnZpY2VVcmw6ICcvL3NlYXJjaC5tYXB6ZW4uY29tL3YxJyxcblx0XHRcdGdlb2NvZGluZ1F1ZXJ5UGFyYW1zOiB7fSxcblx0XHRcdHJldmVyc2VRdWVyeVBhcmFtczoge31cblx0XHR9LFxuXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oYXBpS2V5LCBvcHRpb25zKSB7XG5cdFx0XHRMLlV0aWwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcblx0XHRcdHRoaXMuX2FwaUtleSA9IGFwaUtleTtcblx0XHRcdHRoaXMuX2xhc3RTdWdnZXN0ID0gMDtcblx0XHR9LFxuXG5cdFx0Z2VvY29kZTogZnVuY3Rpb24ocXVlcnksIGNiLCBjb250ZXh0KSB7XG5cdFx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXHRcdFx0VXRpbC5nZXRKU09OKHRoaXMub3B0aW9ucy5zZXJ2aWNlVXJsICsgXCIvc2VhcmNoXCIsIEwuZXh0ZW5kKHtcblx0XHRcdFx0J2FwaV9rZXknOiB0aGlzLl9hcGlLZXksXG5cdFx0XHRcdCd0ZXh0JzogcXVlcnlcblx0XHRcdH0sIHRoaXMub3B0aW9ucy5nZW9jb2RpbmdRdWVyeVBhcmFtcyksIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0Y2IuY2FsbChjb250ZXh0LCBfdGhpcy5fcGFyc2VSZXN1bHRzKGRhdGEsIFwiYmJveFwiKSk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0c3VnZ2VzdDogZnVuY3Rpb24ocXVlcnksIGNiLCBjb250ZXh0KSB7XG5cdFx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXHRcdFx0VXRpbC5nZXRKU09OKHRoaXMub3B0aW9ucy5zZXJ2aWNlVXJsICsgXCIvYXV0b2NvbXBsZXRlXCIsIEwuZXh0ZW5kKHtcblx0XHRcdFx0J2FwaV9rZXknOiB0aGlzLl9hcGlLZXksXG5cdFx0XHRcdCd0ZXh0JzogcXVlcnlcblx0XHRcdH0sIHRoaXMub3B0aW9ucy5nZW9jb2RpbmdRdWVyeVBhcmFtcyksIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0aWYgKGRhdGEuZ2VvY29kaW5nLnRpbWVzdGFtcCA+IHRoaXMuX2xhc3RTdWdnZXN0KSB7XG5cdFx0XHRcdFx0dGhpcy5fbGFzdFN1Z2dlc3QgPSBkYXRhLmdlb2NvZGluZy50aW1lc3RhbXA7XG5cdFx0XHRcdFx0Y2IuY2FsbChjb250ZXh0LCBfdGhpcy5fcGFyc2VSZXN1bHRzKGRhdGEsIFwiYmJveFwiKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRyZXZlcnNlOiBmdW5jdGlvbihsb2NhdGlvbiwgc2NhbGUsIGNiLCBjb250ZXh0KSB7XG5cdFx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXHRcdFx0VXRpbC5nZXRKU09OKHRoaXMub3B0aW9ucy5zZXJ2aWNlVXJsICsgXCIvcmV2ZXJzZVwiLCBMLmV4dGVuZCh7XG5cdFx0XHRcdCdhcGlfa2V5JzogdGhpcy5fYXBpS2V5LFxuXHRcdFx0XHQncG9pbnQubGF0JzogbG9jYXRpb24ubGF0LFxuXHRcdFx0XHQncG9pbnQubG9uJzogbG9jYXRpb24ubG5nXG5cdFx0XHR9LCB0aGlzLm9wdGlvbnMucmV2ZXJzZVF1ZXJ5UGFyYW1zKSwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRjYi5jYWxsKGNvbnRleHQsIF90aGlzLl9wYXJzZVJlc3VsdHMoZGF0YSwgXCJib3VuZHNcIikpO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdF9wYXJzZVJlc3VsdHM6IGZ1bmN0aW9uKGRhdGEsIGJib3huYW1lKSB7XG5cdFx0XHR2YXIgcmVzdWx0cyA9IFtdO1xuXHRcdFx0TC5nZW9Kc29uKGRhdGEsIHtcblx0XHRcdFx0cG9pbnRUb0xheWVyOiBmdW5jdGlvbiAoZmVhdHVyZSwgbGF0bG5nKSB7XG5cdFx0XHRcdFx0cmV0dXJuIEwuY2lyY2xlTWFya2VyKGxhdGxuZyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRWFjaEZlYXR1cmU6IGZ1bmN0aW9uKGZlYXR1cmUsIGxheWVyKSB7XG5cdFx0XHRcdFx0dmFyIHJlc3VsdCA9IHt9O1xuXHRcdFx0XHRcdHJlc3VsdFsnbmFtZSddID0gbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzLmxhYmVsO1xuXHRcdFx0XHRcdHJlc3VsdFtiYm94bmFtZV0gPSBsYXllci5nZXRCb3VuZHMoKTtcblx0XHRcdFx0XHRyZXN1bHRbJ2NlbnRlciddID0gcmVzdWx0W2Jib3huYW1lXS5nZXRDZW50ZXIoKTtcblx0XHRcdFx0XHRyZXN1bHRbJ3Byb3BlcnRpZXMnXSA9IGxheWVyLmZlYXR1cmUucHJvcGVydGllcztcblx0XHRcdFx0XHRyZXN1bHRzLnB1c2gocmVzdWx0KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gcmVzdWx0cztcblx0XHR9XG5cdH0pLFxuXG5cdGZhY3Rvcnk6IGZ1bmN0aW9uKGFwaUtleSwgb3B0aW9ucykge1xuXHRcdHJldHVybiBuZXcgTC5Db250cm9sLkdlb2NvZGVyLk1hcHplbihhcGlLZXksIG9wdGlvbnMpO1xuXHR9XG59O1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbn0se1wiLi91dGlsXCI6MTF9XSw3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciBMID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ0wnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ0wnXSA6IG51bGwpLFxuXHRVdGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRcImNsYXNzXCI6IEwuQ2xhc3MuZXh0ZW5kKHtcblx0XHRvcHRpb25zOiB7XG5cdFx0XHRzZXJ2aWNlVXJsOiAnaHR0cHM6Ly9ub21pbmF0aW0ub3BlbnN0cmVldG1hcC5vcmcvJyxcblx0XHRcdGdlb2NvZGluZ1F1ZXJ5UGFyYW1zOiB7fSxcblx0XHRcdHJldmVyc2VRdWVyeVBhcmFtczoge30sXG5cdFx0XHRodG1sVGVtcGxhdGU6IGZ1bmN0aW9uKHIpIHtcblx0XHRcdFx0dmFyIGEgPSByLmFkZHJlc3MsXG5cdFx0XHRcdFx0cGFydHMgPSBbXTtcblx0XHRcdFx0aWYgKGEucm9hZCB8fCBhLmJ1aWxkaW5nKSB7XG5cdFx0XHRcdFx0cGFydHMucHVzaCgne2J1aWxkaW5nfSB7cm9hZH0ge2hvdXNlX251bWJlcn0nKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChhLmNpdHkgfHwgYS50b3duIHx8IGEudmlsbGFnZSkge1xuXHRcdFx0XHRcdHBhcnRzLnB1c2goJzxzcGFuIGNsYXNzPVwiJyArIChwYXJ0cy5sZW5ndGggPiAwID8gJ2xlYWZsZXQtY29udHJvbC1nZW9jb2Rlci1hZGRyZXNzLWRldGFpbCcgOiAnJykgK1xuXHRcdFx0XHRcdFx0J1wiPntwb3N0Y29kZX0ge2NpdHl9IHt0b3dufSB7dmlsbGFnZX08L3NwYW4+Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoYS5zdGF0ZSB8fCBhLmNvdW50cnkpIHtcblx0XHRcdFx0XHRwYXJ0cy5wdXNoKCc8c3BhbiBjbGFzcz1cIicgKyAocGFydHMubGVuZ3RoID4gMCA/ICdsZWFmbGV0LWNvbnRyb2wtZ2VvY29kZXItYWRkcmVzcy1jb250ZXh0JyA6ICcnKSArXG5cdFx0XHRcdFx0XHQnXCI+e3N0YXRlfSB7Y291bnRyeX08L3NwYW4+Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gVXRpbC50ZW1wbGF0ZShwYXJ0cy5qb2luKCc8YnIvPicpLCBhLCB0cnVlKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdFx0TC5VdGlsLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG5cdFx0fSxcblxuXHRcdGdlb2NvZGU6IGZ1bmN0aW9uKHF1ZXJ5LCBjYiwgY29udGV4dCkge1xuXHRcdFx0VXRpbC5qc29ucCh0aGlzLm9wdGlvbnMuc2VydmljZVVybCArICdzZWFyY2gnLCBMLmV4dGVuZCh7XG5cdFx0XHRcdHE6IHF1ZXJ5LFxuXHRcdFx0XHRsaW1pdDogNSxcblx0XHRcdFx0Zm9ybWF0OiAnanNvbicsXG5cdFx0XHRcdGFkZHJlc3NkZXRhaWxzOiAxXG5cdFx0XHR9LCB0aGlzLm9wdGlvbnMuZ2VvY29kaW5nUXVlcnlQYXJhbXMpLFxuXHRcdFx0ZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHR2YXIgcmVzdWx0cyA9IFtdO1xuXHRcdFx0XHRmb3IgKHZhciBpID0gZGF0YS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0XHRcdHZhciBiYm94ID0gZGF0YVtpXS5ib3VuZGluZ2JveDtcblx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IDQ7IGorKykgYmJveFtqXSA9IHBhcnNlRmxvYXQoYmJveFtqXSk7XG5cdFx0XHRcdFx0cmVzdWx0c1tpXSA9IHtcblx0XHRcdFx0XHRcdGljb246IGRhdGFbaV0uaWNvbixcblx0XHRcdFx0XHRcdG5hbWU6IGRhdGFbaV0uZGlzcGxheV9uYW1lLFxuXHRcdFx0XHRcdFx0aHRtbDogdGhpcy5vcHRpb25zLmh0bWxUZW1wbGF0ZSA/XG5cdFx0XHRcdFx0XHRcdHRoaXMub3B0aW9ucy5odG1sVGVtcGxhdGUoZGF0YVtpXSlcblx0XHRcdFx0XHRcdFx0OiB1bmRlZmluZWQsXG5cdFx0XHRcdFx0XHRiYm94OiBMLmxhdExuZ0JvdW5kcyhbYmJveFswXSwgYmJveFsyXV0sIFtiYm94WzFdLCBiYm94WzNdXSksXG5cdFx0XHRcdFx0XHRjZW50ZXI6IEwubGF0TG5nKGRhdGFbaV0ubGF0LCBkYXRhW2ldLmxvbiksXG5cdFx0XHRcdFx0XHRwcm9wZXJ0aWVzOiBkYXRhW2ldXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYi5jYWxsKGNvbnRleHQsIHJlc3VsdHMpO1xuXHRcdFx0fSwgdGhpcywgJ2pzb25fY2FsbGJhY2snKTtcblx0XHR9LFxuXG5cdFx0cmV2ZXJzZTogZnVuY3Rpb24obG9jYXRpb24sIHNjYWxlLCBjYiwgY29udGV4dCkge1xuXHRcdFx0VXRpbC5qc29ucCh0aGlzLm9wdGlvbnMuc2VydmljZVVybCArICdyZXZlcnNlJywgTC5leHRlbmQoe1xuXHRcdFx0XHRsYXQ6IGxvY2F0aW9uLmxhdCxcblx0XHRcdFx0bG9uOiBsb2NhdGlvbi5sbmcsXG5cdFx0XHRcdHpvb206IE1hdGgucm91bmQoTWF0aC5sb2coc2NhbGUgLyAyNTYpIC8gTWF0aC5sb2coMikpLFxuXHRcdFx0XHRhZGRyZXNzZGV0YWlsczogMSxcblx0XHRcdFx0Zm9ybWF0OiAnanNvbidcblx0XHRcdH0sIHRoaXMub3B0aW9ucy5yZXZlcnNlUXVlcnlQYXJhbXMpLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdHZhciByZXN1bHQgPSBbXSxcblx0XHRcdFx0ICAgIGxvYztcblxuXHRcdFx0XHRpZiAoZGF0YSAmJiBkYXRhLmxhdCAmJiBkYXRhLmxvbikge1xuXHRcdFx0XHRcdGxvYyA9IEwubGF0TG5nKGRhdGEubGF0LCBkYXRhLmxvbik7XG5cdFx0XHRcdFx0cmVzdWx0LnB1c2goe1xuXHRcdFx0XHRcdFx0bmFtZTogZGF0YS5kaXNwbGF5X25hbWUsXG5cdFx0XHRcdFx0XHRodG1sOiB0aGlzLm9wdGlvbnMuaHRtbFRlbXBsYXRlID9cblx0XHRcdFx0XHRcdFx0dGhpcy5vcHRpb25zLmh0bWxUZW1wbGF0ZShkYXRhKVxuXHRcdFx0XHRcdFx0XHQ6IHVuZGVmaW5lZCxcblx0XHRcdFx0XHRcdGNlbnRlcjogbG9jLFxuXHRcdFx0XHRcdFx0Ym91bmRzOiBMLmxhdExuZ0JvdW5kcyhsb2MsIGxvYyksXG5cdFx0XHRcdFx0XHRwcm9wZXJ0aWVzOiBkYXRhXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYi5jYWxsKGNvbnRleHQsIHJlc3VsdCk7XG5cdFx0XHR9LCB0aGlzLCAnanNvbl9jYWxsYmFjaycpO1xuXHRcdH1cblx0fSksXG5cblx0ZmFjdG9yeTogZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdHJldHVybiBuZXcgTC5Db250cm9sLkdlb2NvZGVyLk5vbWluYXRpbShvcHRpb25zKTtcblx0fVxufTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pXG59LHtcIi4vdXRpbFwiOjExfV0sODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgTCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydMJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydMJ10gOiBudWxsKSxcblx0VXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0XCJjbGFzc1wiOiBMLkNsYXNzLmV4dGVuZCh7XG5cdFx0b3B0aW9uczoge1xuXHRcdFx0c2VydmljZVVybDogJ2h0dHBzOi8vcGhvdG9uLmtvbW9vdC5kZS9hcGkvJyxcblx0XHRcdHJldmVyc2VVcmw6ICcvL3Bob3Rvbi5rb21vb3QuZGUvcmV2ZXJzZS8nLFxuXHRcdFx0bmFtZVByb3BlcnRpZXM6IFtcblx0XHRcdFx0J25hbWUnLFxuXHRcdFx0XHQnc3RyZWV0Jyxcblx0XHRcdFx0J3N1YnVyYicsXG5cdFx0XHRcdCdoYW1sZXQnLFxuXHRcdFx0XHQndG93bicsXG5cdFx0XHRcdCdjaXR5Jyxcblx0XHRcdFx0J3N0YXRlJyxcblx0XHRcdFx0J2NvdW50cnknXG5cdFx0XHRdXG5cdFx0fSxcblxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRcdEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcblx0XHR9LFxuXG5cdFx0Z2VvY29kZTogZnVuY3Rpb24ocXVlcnksIGNiLCBjb250ZXh0KSB7XG5cdFx0XHR2YXIgcGFyYW1zID0gTC5leHRlbmQoe1xuXHRcdFx0XHRxOiBxdWVyeVxuXHRcdFx0fSwgdGhpcy5vcHRpb25zLmdlb2NvZGluZ1F1ZXJ5UGFyYW1zKTtcblxuXHRcdFx0VXRpbC5nZXRKU09OKHRoaXMub3B0aW9ucy5zZXJ2aWNlVXJsLCBwYXJhbXMsIEwuYmluZChmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdGNiLmNhbGwoY29udGV4dCwgdGhpcy5fZGVjb2RlRmVhdHVyZXMoZGF0YSkpO1xuXHRcdFx0fSwgdGhpcykpO1xuXHRcdH0sXG5cblx0XHRzdWdnZXN0OiBmdW5jdGlvbihxdWVyeSwgY2IsIGNvbnRleHQpIHtcblx0XHRcdHJldHVybiB0aGlzLmdlb2NvZGUocXVlcnksIGNiLCBjb250ZXh0KTtcblx0XHR9LFxuXG5cdFx0cmV2ZXJzZTogZnVuY3Rpb24obGF0TG5nLCBzY2FsZSwgY2IsIGNvbnRleHQpIHtcblx0XHRcdHZhciBwYXJhbXMgPSBMLmV4dGVuZCh7XG5cdFx0XHRcdGxhdDogbGF0TG5nLmxhdCxcblx0XHRcdFx0bG9uOiBsYXRMbmcubG5nXG5cdFx0XHR9LCB0aGlzLm9wdGlvbnMuZ2VvY29kaW5nUXVlcnlQYXJhbXMpO1xuXG5cdFx0XHRVdGlsLmdldEpTT04odGhpcy5vcHRpb25zLnJldmVyc2VVcmwsIHBhcmFtcywgTC5iaW5kKGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0Y2IuY2FsbChjb250ZXh0LCB0aGlzLl9kZWNvZGVGZWF0dXJlcyhkYXRhKSk7XG5cdFx0XHR9LCB0aGlzKSk7XG5cdFx0fSxcblxuXHRcdF9kZWNvZGVGZWF0dXJlczogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0dmFyIHJlc3VsdHMgPSBbXSxcblx0XHRcdFx0aSxcblx0XHRcdFx0Zixcblx0XHRcdFx0Yyxcblx0XHRcdFx0bGF0TG5nLFxuXHRcdFx0XHRleHRlbnQsXG5cdFx0XHRcdGJib3g7XG5cblx0XHRcdGlmIChkYXRhICYmIGRhdGEuZmVhdHVyZXMpIHtcblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IGRhdGEuZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRmID0gZGF0YS5mZWF0dXJlc1tpXTtcblx0XHRcdFx0XHRjID0gZi5nZW9tZXRyeS5jb29yZGluYXRlcztcblx0XHRcdFx0XHRsYXRMbmcgPSBMLmxhdExuZyhjWzFdLCBjWzBdKTtcblx0XHRcdFx0XHRleHRlbnQgPSBmLnByb3BlcnRpZXMuZXh0ZW50O1xuXG5cdFx0XHRcdFx0aWYgKGV4dGVudCkge1xuXHRcdFx0XHRcdFx0YmJveCA9IEwubGF0TG5nQm91bmRzKFtleHRlbnRbMV0sIGV4dGVudFswXV0sIFtleHRlbnRbM10sIGV4dGVudFsyXV0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRiYm94ID0gTC5sYXRMbmdCb3VuZHMobGF0TG5nLCBsYXRMbmcpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJlc3VsdHMucHVzaCh7XG5cdFx0XHRcdFx0XHRuYW1lOiB0aGlzLl9kZW9jb2RlRmVhdHVyZU5hbWUoZiksXG5cdFx0XHRcdFx0XHRjZW50ZXI6IGxhdExuZyxcblx0XHRcdFx0XHRcdGJib3g6IGJib3gsXG5cdFx0XHRcdFx0XHRwcm9wZXJ0aWVzOiBmLnByb3BlcnRpZXNcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcmVzdWx0cztcblx0XHR9LFxuXG5cdFx0X2Rlb2NvZGVGZWF0dXJlTmFtZTogZnVuY3Rpb24oZikge1xuXHRcdFx0dmFyIGosXG5cdFx0XHRcdG5hbWU7XG5cdFx0XHRmb3IgKGogPSAwOyAhbmFtZSAmJiBqIDwgdGhpcy5vcHRpb25zLm5hbWVQcm9wZXJ0aWVzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdG5hbWUgPSBmLnByb3BlcnRpZXNbdGhpcy5vcHRpb25zLm5hbWVQcm9wZXJ0aWVzW2pdXTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIG5hbWU7XG5cdFx0fVxuXHR9KSxcblxuXHRmYWN0b3J5OiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0cmV0dXJuIG5ldyBMLkNvbnRyb2wuR2VvY29kZXIuUGhvdG9uKG9wdGlvbnMpO1xuXHR9XG59O1xuXG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxufSx7XCIuL3V0aWxcIjoxMX1dLDk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyIEwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snTCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnTCddIDogbnVsbCksXG5cdFV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdFwiY2xhc3NcIjogTC5DbGFzcy5leHRlbmQoe1xuXHRcdG9wdGlvbnM6IHtcblx0XHRcdHNlcnZpY2VVcmw6ICdodHRwOi8vYXBpLndoYXQzd29yZHMuY29tLydcblx0XHR9LFxuXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oYWNjZXNzVG9rZW4pIHtcblx0XHRcdHRoaXMuX2FjY2Vzc1Rva2VuID0gYWNjZXNzVG9rZW47XG5cdFx0fSxcblxuXHRcdGdlb2NvZGU6IGZ1bmN0aW9uKHF1ZXJ5LCBjYiwgY29udGV4dCkge1xuXHRcdFx0Ly9nZXQgdGhyZWUgd29yZHMgYW5kIG1ha2UgYSBkb3QgYmFzZWQgc3RyaW5nXG5cdFx0XHRVdGlsLmdldEpTT04odGhpcy5vcHRpb25zLnNlcnZpY2VVcmwgKyd3M3cnLCB7XG5cdFx0XHRcdGtleTogdGhpcy5fYWNjZXNzVG9rZW4sXG5cdFx0XHRcdHN0cmluZzogcXVlcnkuc3BsaXQoL1xccysvKS5qb2luKCcuJylcblx0XHRcdH0sIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0dmFyIHJlc3VsdHMgPSBbXSwgbG9jLCBsYXRMbmcsIGxhdExuZ0JvdW5kcztcblx0XHRcdFx0aWYgKGRhdGEucG9zaXRpb24gJiYgZGF0YS5wb3NpdGlvbi5sZW5ndGgpIHtcblx0XHRcdFx0XHRsb2MgPSBkYXRhLndvcmRzO1xuXHRcdFx0XHRcdGxhdExuZyA9IEwubGF0TG5nKGRhdGEucG9zaXRpb25bMF0sZGF0YS5wb3NpdGlvblsxXSk7XG5cdFx0XHRcdFx0bGF0TG5nQm91bmRzID0gTC5sYXRMbmdCb3VuZHMobGF0TG5nLCBsYXRMbmcpO1xuXHRcdFx0XHRcdHJlc3VsdHNbMF0gPSB7XG5cdFx0XHRcdFx0XHRuYW1lOiBsb2Muam9pbignLicpLFxuXHRcdFx0XHRcdFx0YmJveDogbGF0TG5nQm91bmRzLFxuXHRcdFx0XHRcdFx0Y2VudGVyOiBsYXRMbmdcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2IuY2FsbChjb250ZXh0LCByZXN1bHRzKTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRzdWdnZXN0OiBmdW5jdGlvbihxdWVyeSwgY2IsIGNvbnRleHQpIHtcblx0XHRcdHJldHVybiB0aGlzLmdlb2NvZGUocXVlcnksIGNiLCBjb250ZXh0KTtcblx0XHR9LFxuXG5cdFx0cmV2ZXJzZTogZnVuY3Rpb24obG9jYXRpb24sIHNjYWxlLCBjYiwgY29udGV4dCkge1xuXHRcdFx0VXRpbC5nZXRKU09OKHRoaXMub3B0aW9ucy5zZXJ2aWNlVXJsICsncG9zaXRpb24nLCB7XG5cdFx0XHRcdGtleTogdGhpcy5fYWNjZXNzVG9rZW4sXG5cdFx0XHRcdHBvc2l0aW9uOiBbbG9jYXRpb24ubGF0LGxvY2F0aW9uLmxuZ10uam9pbignLCcpXG5cdFx0XHR9LCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdHZhciByZXN1bHRzID0gW10sbG9jLGxhdExuZyxsYXRMbmdCb3VuZHM7XG5cdFx0XHRcdGlmIChkYXRhLnBvc2l0aW9uICYmIGRhdGEucG9zaXRpb24ubGVuZ3RoKSB7XG5cdFx0XHRcdFx0bG9jID0gZGF0YS53b3Jkcztcblx0XHRcdFx0XHRsYXRMbmcgPSBMLmxhdExuZyhkYXRhLnBvc2l0aW9uWzBdLGRhdGEucG9zaXRpb25bMV0pO1xuXHRcdFx0XHRcdGxhdExuZ0JvdW5kcyA9IEwubGF0TG5nQm91bmRzKGxhdExuZywgbGF0TG5nKTtcblx0XHRcdFx0XHRyZXN1bHRzWzBdID0ge1xuXHRcdFx0XHRcdFx0bmFtZTogbG9jLmpvaW4oJy4nKSxcblx0XHRcdFx0XHRcdGJib3g6IGxhdExuZ0JvdW5kcyxcblx0XHRcdFx0XHRcdGNlbnRlcjogbGF0TG5nXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYi5jYWxsKGNvbnRleHQsIHJlc3VsdHMpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KSxcblxuXHRmYWN0b3J5OiBmdW5jdGlvbihhY2Nlc3NUb2tlbikge1xuXHRcdHJldHVybiBuZXcgTC5Db250cm9sLkdlb2NvZGVyLldoYXQzV29yZHMoYWNjZXNzVG9rZW4pO1xuXHR9XG59O1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbn0se1wiLi91dGlsXCI6MTF9XSwxMDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgTCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydMJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydMJ10gOiBudWxsKSxcblx0Q29udHJvbCA9IHJlcXVpcmUoJy4vY29udHJvbCcpLFxuXHROb21pbmF0aW0gPSByZXF1aXJlKCcuL2dlb2NvZGVycy9ub21pbmF0aW0nKSxcblx0QmluZyA9IHJlcXVpcmUoJy4vZ2VvY29kZXJzL2JpbmcnKSxcblx0TWFwUXVlc3QgPSByZXF1aXJlKCcuL2dlb2NvZGVycy9tYXBxdWVzdCcpLFxuXHRNYXBib3ggPSByZXF1aXJlKCcuL2dlb2NvZGVycy9tYXBib3gnKSxcblx0V2hhdDNXb3JkcyA9IHJlcXVpcmUoJy4vZ2VvY29kZXJzL3doYXQzd29yZHMnKSxcblx0R29vZ2xlID0gcmVxdWlyZSgnLi9nZW9jb2RlcnMvZ29vZ2xlJyksXG5cdFBob3RvbiA9IHJlcXVpcmUoJy4vZ2VvY29kZXJzL3Bob3RvbicpLFxuXHRNYXB6ZW4gPSByZXF1aXJlKCcuL2dlb2NvZGVycy9tYXB6ZW4nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBMLlV0aWwuZXh0ZW5kKENvbnRyb2xbXCJjbGFzc1wiXSwge1xuXHROb21pbmF0aW06IE5vbWluYXRpbVtcImNsYXNzXCJdLFxuXHRub21pbmF0aW06IE5vbWluYXRpbS5mYWN0b3J5LFxuXHRCaW5nOiBCaW5nW1wiY2xhc3NcIl0sXG5cdGJpbmc6IEJpbmcuZmFjdG9yeSxcblx0TWFwUXVlc3Q6IE1hcFF1ZXN0W1wiY2xhc3NcIl0sXG5cdG1hcFF1ZXN0OiBNYXBRdWVzdC5mYWN0b3J5LFxuXHRNYXBib3g6IE1hcGJveFtcImNsYXNzXCJdLFxuXHRtYXBib3g6IE1hcGJveC5mYWN0b3J5LFxuXHRXaGF0M1dvcmRzOiBXaGF0M1dvcmRzW1wiY2xhc3NcIl0sXG5cdHdoYXQzd29yZHM6IFdoYXQzV29yZHMuZmFjdG9yeSxcblx0R29vZ2xlOiBHb29nbGVbXCJjbGFzc1wiXSxcblx0Z29vZ2xlOiBHb29nbGUuZmFjdG9yeSxcblx0UGhvdG9uOiBQaG90b25bXCJjbGFzc1wiXSxcblx0cGhvdG9uOiBQaG90b24uZmFjdG9yeSxcblx0TWFwemVuOiBNYXB6ZW5bXCJjbGFzc1wiXSxcblx0bWFwemVuOiBNYXB6ZW4uZmFjdG9yeVxufSk7XG5cbkwuVXRpbC5leHRlbmQoTC5Db250cm9sLCB7XG5cdEdlb2NvZGVyOiBtb2R1bGUuZXhwb3J0cyxcblx0Z2VvY29kZXI6IENvbnRyb2wuZmFjdG9yeVxufSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxufSx7XCIuL2NvbnRyb2xcIjoxLFwiLi9nZW9jb2RlcnMvYmluZ1wiOjIsXCIuL2dlb2NvZGVycy9nb29nbGVcIjozLFwiLi9nZW9jb2RlcnMvbWFwYm94XCI6NCxcIi4vZ2VvY29kZXJzL21hcHF1ZXN0XCI6NSxcIi4vZ2VvY29kZXJzL21hcHplblwiOjYsXCIuL2dlb2NvZGVycy9ub21pbmF0aW1cIjo3LFwiLi9nZW9jb2RlcnMvcGhvdG9uXCI6OCxcIi4vZ2VvY29kZXJzL3doYXQzd29yZHNcIjo5fV0sMTE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyIEwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snTCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnTCddIDogbnVsbCksXG5cdGxhc3RDYWxsYmFja0lkID0gMCxcblx0aHRtbEVzY2FwZSA9IChmdW5jdGlvbigpIHtcblx0XHQvLyBBZGFwdGVkIGZyb20gaGFuZGxlYmFycy5qc1xuXHRcdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS93eWNhdHMvaGFuZGxlYmFycy5qcy9cblx0XHR2YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2c7XG5cdFx0dmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cdFx0dmFyIGVzY2FwZSA9IHtcblx0XHQgICcmJzogJyZhbXA7Jyxcblx0XHQgICc8JzogJyZsdDsnLFxuXHRcdCAgJz4nOiAnJmd0OycsXG5cdFx0ICAnXCInOiAnJnF1b3Q7Jyxcblx0XHQgICdcXCcnOiAnJiN4Mjc7Jyxcblx0XHQgICdgJzogJyYjeDYwOydcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gZXNjYXBlQ2hhcihjaHIpIHtcblx0XHQgIHJldHVybiBlc2NhcGVbY2hyXTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRpZiAoc3RyaW5nID09IG51bGwpIHtcblx0XHRcdFx0cmV0dXJuICcnO1xuXHRcdFx0fSBlbHNlIGlmICghc3RyaW5nKSB7XG5cdFx0XHRcdHJldHVybiBzdHJpbmcgKyAnJztcblx0XHRcdH1cblxuXHRcdFx0Ly8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG5cdFx0XHQvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcblx0XHRcdC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuXHRcdFx0c3RyaW5nID0gJycgKyBzdHJpbmc7XG5cblx0XHRcdGlmICghcG9zc2libGUudGVzdChzdHJpbmcpKSB7XG5cdFx0XHRcdHJldHVybiBzdHJpbmc7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xuXHRcdH07XG5cdH0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRqc29ucDogZnVuY3Rpb24odXJsLCBwYXJhbXMsIGNhbGxiYWNrLCBjb250ZXh0LCBqc29ucFBhcmFtKSB7XG5cdFx0dmFyIGNhbGxiYWNrSWQgPSAnX2xfZ2VvY29kZXJfJyArIChsYXN0Q2FsbGJhY2tJZCsrKTtcblx0XHRwYXJhbXNbanNvbnBQYXJhbSB8fCAnY2FsbGJhY2snXSA9IGNhbGxiYWNrSWQ7XG5cdFx0d2luZG93W2NhbGxiYWNrSWRdID0gTC5VdGlsLmJpbmQoY2FsbGJhY2ssIGNvbnRleHQpO1xuXHRcdHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcblx0XHRzY3JpcHQudHlwZSA9ICd0ZXh0L2phdmFzY3JpcHQnO1xuXHRcdHNjcmlwdC5zcmMgPSB1cmwgKyBMLlV0aWwuZ2V0UGFyYW1TdHJpbmcocGFyYW1zKTtcblx0XHRzY3JpcHQuaWQgPSBjYWxsYmFja0lkO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQoc2NyaXB0KTtcblx0fSxcblxuXHRnZXRKU09OOiBmdW5jdGlvbih1cmwsIHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHR2YXIgeG1sSHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHhtbEh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHhtbEh0dHAucmVhZHlTdGF0ZSAhPT0gNCl7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGlmICh4bWxIdHRwLnN0YXR1cyAhPT0gMjAwICYmIHhtbEh0dHAuc3RhdHVzICE9PSAzMDQpe1xuXHRcdFx0XHRjYWxsYmFjaygnJyk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGNhbGxiYWNrKEpTT04ucGFyc2UoeG1sSHR0cC5yZXNwb25zZSkpO1xuXHRcdH07XG5cdFx0eG1sSHR0cC5vcGVuKCdHRVQnLCB1cmwgKyBMLlV0aWwuZ2V0UGFyYW1TdHJpbmcocGFyYW1zKSwgdHJ1ZSk7XG5cdFx0eG1sSHR0cC5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuXHRcdHhtbEh0dHAuc2VuZChudWxsKTtcblx0fSxcblxuXHR0ZW1wbGF0ZTogZnVuY3Rpb24gKHN0ciwgZGF0YSkge1xuXHRcdHJldHVybiBzdHIucmVwbGFjZSgvXFx7ICooW1xcd19dKykgKlxcfS9nLCBmdW5jdGlvbiAoc3RyLCBrZXkpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGRhdGFba2V5XTtcblx0XHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHZhbHVlID0gJyc7XG5cdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHR2YWx1ZSA9IHZhbHVlKGRhdGEpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGh0bWxFc2NhcGUodmFsdWUpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdGh0bWxFc2NhcGU6IGh0bWxFc2NhcGVcbn07XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxufSx7fV19LHt9LFsxMF0pO1xuIl19
},{"./control":17,"./geocoders/bing":18,"./geocoders/google":19,"./geocoders/mapbox":20,"./geocoders/mapquest":21,"./geocoders/mapzen":22,"./geocoders/nominatim":23,"./geocoders/photon":24,"./geocoders/what3words":25,"./util":31,"./util.js":31}],5:[function(require,module,exports){
(function() {
	'use strict';

	L.Routing = L.Routing || {};

	L.Routing.Autocomplete = L.Class.extend({
		options: {
			timeout: 500,
			blurTimeout: 100,
			noResultsMessage: 'No results found.'
		},

		initialize: function(elem, callback, context, options) {
			L.setOptions(this, options);

			this._elem = elem;
			this._resultFn = options.resultFn ? L.Util.bind(options.resultFn, options.resultContext) : null;
			this._autocomplete = options.autocompleteFn ? L.Util.bind(options.autocompleteFn, options.autocompleteContext) : null;
			this._selectFn = L.Util.bind(callback, context);
			this._container = L.DomUtil.create('div', 'leaflet-routing-geocoder-result');
			this._resultTable = L.DomUtil.create('table', '', this._container);

			// TODO: looks a bit like a kludge to register same for input and keypress -
			// browsers supporting both will get duplicate events; just registering
			// input will not catch enter, though.
			L.DomEvent.addListener(this._elem, 'input', this._keyPressed, this);
			L.DomEvent.addListener(this._elem, 'keypress', this._keyPressed, this);
			L.DomEvent.addListener(this._elem, 'keydown', this._keyDown, this);
			L.DomEvent.addListener(this._elem, 'blur', function() {
				if (this._isOpen) {
					this.close();
				}
			}, this);
		},

		close: function() {
			L.DomUtil.removeClass(this._container, 'leaflet-routing-geocoder-result-open');
			this._isOpen = false;
		},

		_open: function() {
			var rect = this._elem.getBoundingClientRect();
			if (!this._container.parentElement) {
				this._container.style.left = (rect.left + window.scrollX) + 'px';
				this._container.style.top = (rect.bottom + window.scrollY) + 'px';
				this._container.style.width = (rect.right - rect.left) + 'px';
				document.body.appendChild(this._container);
			}

			L.DomUtil.addClass(this._container, 'leaflet-routing-geocoder-result-open');
			this._isOpen = true;
		},

		_setResults: function(results) {
			var i,
			    tr,
			    td,
			    text;

			delete this._selection;
			this._results = results;

			while (this._resultTable.firstChild) {
				this._resultTable.removeChild(this._resultTable.firstChild);
			}

			for (i = 0; i < results.length; i++) {
				tr = L.DomUtil.create('tr', '', this._resultTable);
				tr.setAttribute('data-result-index', i);
				td = L.DomUtil.create('td', '', tr);
				text = document.createTextNode(results[i].name);
				td.appendChild(text);
				// mousedown + click because:
				// http://stackoverflow.com/questions/10652852/jquery-fire-click-before-blur-event
				L.DomEvent.addListener(td, 'mousedown', L.DomEvent.preventDefault);
				L.DomEvent.addListener(td, 'click', this._createClickListener(results[i]));
			}

			if (!i) {
				tr = L.DomUtil.create('tr', '', this._resultTable);
				td = L.DomUtil.create('td', 'leaflet-routing-geocoder-no-results', tr);
				td.innerHTML = this.options.noResultsMessage;
			}

			this._open();

			if (results.length > 0) {
				// Select the first entry
				this._select(1);
			}
		},

		_createClickListener: function(r) {
			var resultSelected = this._resultSelected(r);
			return L.bind(function() {
				this._elem.blur();
				resultSelected();
			}, this);
		},

		_resultSelected: function(r) {
			return L.bind(function() {
				this.close();
				this._elem.value = r.name;
				this._lastCompletedText = r.name;
				this._selectFn(r);
			}, this);
		},

		_keyPressed: function(e) {
			var index;

			if (this._isOpen && e.keyCode === 13 && this._selection) {
				index = parseInt(this._selection.getAttribute('data-result-index'), 10);
				this._resultSelected(this._results[index])();
				L.DomEvent.preventDefault(e);
				return;
			}

			if (e.keyCode === 13) {
				this._complete(this._resultFn, true);
				return;
			}

			if (this._autocomplete && document.activeElement === this._elem) {
				if (this._timer) {
					clearTimeout(this._timer);
				}
				this._timer = setTimeout(L.Util.bind(function() { this._complete(this._autocomplete); }, this),
					this.options.timeout);
				return;
			}

			this._unselect();
		},

		_select: function(dir) {
			var sel = this._selection;
			if (sel) {
				L.DomUtil.removeClass(sel.firstChild, 'leaflet-routing-geocoder-selected');
				sel = sel[dir > 0 ? 'nextSibling' : 'previousSibling'];
			}
			if (!sel) {
				sel = this._resultTable[dir > 0 ? 'firstChild' : 'lastChild'];
			}

			if (sel) {
				L.DomUtil.addClass(sel.firstChild, 'leaflet-routing-geocoder-selected');
				this._selection = sel;
			}
		},

		_unselect: function() {
			if (this._selection) {
				L.DomUtil.removeClass(this._selection.firstChild, 'leaflet-routing-geocoder-selected');
			}
			delete this._selection;
		},

		_keyDown: function(e) {
			if (this._isOpen) {
				switch (e.keyCode) {
				// Escape
				case 27:
					this.close();
					L.DomEvent.preventDefault(e);
					return;
				// Up
				case 38:
					this._select(-1);
					L.DomEvent.preventDefault(e);
					return;
				// Down
				case 40:
					this._select(1);
					L.DomEvent.preventDefault(e);
					return;
				}
			}
		},

		_complete: function(completeFn, trySelect) {
			var v = this._elem.value;
			function completeResults(results) {
				this._lastCompletedText = v;
				if (trySelect && results.length === 1) {
					this._resultSelected(results[0])();
				} else {
					this._setResults(results);
				}
			}

			if (!v) {
				return;
			}

			if (v !== this._lastCompletedText) {
				completeFn(v, completeResults, this);
			} else if (trySelect) {
				completeResults.call(this, this._results);
			}
		}
	});
})();

},{}],6:[function(require,module,exports){
(function() {
	'use strict';

	L.Routing = L.Routing || {};

	L.Routing.ErrorControl = L.Control.extend({
		options: {
			header: 'Routing error',
			formatMessage: function(error) {
				if (error.status < 0) {
					return 'Calculating the route caused an error. Technical description follows: <code><pre>' +
						error.message + '</pre></code';
				} else {
					return 'The route could not be calculated. ' +
						error.message;
				}
			}
		},

		initialize: function(routingControl, options) {
			L.Control.prototype.initialize.call(this, options);
			routingControl
				.on('routingerror', L.bind(function(e) {
					if (this._element) {
						this._element.children[1].innerHTML = this.options.formatMessage(e.error);
						this._element.style.visibility = 'visible';
					}
				}, this))
				.on('routingstart', L.bind(function() {
					if (this._element) {
						this._element.style.visibility = 'hidden';
					}
				}, this));
		},

		onAdd: function() {
			var header,
				message;

			this._element = L.DomUtil.create('div', 'leaflet-bar leaflet-routing-error');
			this._element.style.visibility = 'hidden';

			header = L.DomUtil.create('h3', null, this._element);
			message = L.DomUtil.create('span', null, this._element);

			header.innerHTML = this.options.header;

			return this._element;
		},

		onRemove: function() {
			delete this._element;
		}
	});

	L.Routing.errorControl = function(routingControl, options) {
		return new L.Routing.ErrorControl(routingControl, options);
	};
})();

},{}],7:[function(require,module,exports){
(function() {
	'use strict';

	var L = require('leaflet');

	L.Routing = L.Routing || {};

	L.extend(L.Routing, require('./L.Routing.Localization'));

	L.Routing.Formatter = L.Class.extend({
		options: {
			units: 'metric',
			unitNames: {
				meters: 'm',
				kilometers: 'km',
				yards: 'yd',
				miles: 'mi',
				hours: 'h',
				minutes: 'mín',
				seconds: 's'
			},
			language: 'en',
			roundingSensitivity: 1,
			distanceTemplate: '{value} {unit}'
		},

		initialize: function(options) {
			L.setOptions(this, options);
		},

		formatDistance: function(d /* Number (meters) */, sensitivity) {
			var un = this.options.unitNames,
				simpleRounding = sensitivity <= 0,
				round = simpleRounding ? function(v) { return v; } : L.bind(this._round, this),
			    v,
			    yards,
				data,
				pow10;

			if (this.options.units === 'imperial') {
				yards = d / 0.9144;
				if (yards >= 1000) {
					data = {
						value: round(d / 1609.344, sensitivity),
						unit: un.miles
					};
				} else {
					data = {
						value: round(yards, sensitivity),
						unit: un.yards
					};
				}
			} else {
				v = round(d, sensitivity);
				data = {
					value: v >= 1000 ? (v / 1000) : v,
					unit: v >= 1000 ? un.kilometers : un.meters
				};
			}

			if (simpleRounding) {
				pow10 = Math.pow(10, -sensitivity);
				data.value = Math.round(data.value * pow10) / pow10;
			}

			return L.Util.template(this.options.distanceTemplate, data);
		},

		_round: function(d, sensitivity) {
			var s = sensitivity || this.options.roundingSensitivity,
				pow10 = Math.pow(10, (Math.floor(d / s) + '').length - 1),
				r = Math.floor(d / pow10),
				p = (r > 5) ? pow10 : pow10 / 2;

			return Math.round(d / p) * p;
		},

		formatTime: function(t /* Number (seconds) */) {
			if (t > 86400) {
				return Math.round(t / 3600) + ' h';
			} else if (t > 3600) {
				return Math.floor(t / 3600) + ' h ' +
					Math.round((t % 3600) / 60) + ' min';
			} else if (t > 300) {
				return Math.round(t / 60) + ' min';
			} else if (t > 60) {
				return Math.floor(t / 60) + ' min' +
					(t % 60 !== 0 ? ' ' + (t % 60) + ' s' : '');
			} else {
				return t + ' s';
			}
		},

		formatInstruction: function(instr, i) {
			if (instr.text === undefined) {
				return L.Util.template(this._getInstructionTemplate(instr, i),
					L.extend({
						exitStr: instr.exit ? L.Routing.Localization[this.options.language].formatOrder(instr.exit) : '',
						dir: L.Routing.Localization[this.options.language].directions[instr.direction]
					},
					instr));
			} else {
				return instr.text;
			}
		},

		getIconName: function(instr, i) {
			switch (instr.type) {
			case 'Straight':
				return (i === 0 ? 'depart' : 'continue');
			case 'SlightRight':
				return 'bear-right';
			case 'Right':
				return 'turn-right';
			case 'SharpRight':
				return 'sharp-right';
			case 'TurnAround':
				return 'u-turn';
			case 'SharpLeft':
				return 'sharp-left';
			case 'Left':
				return 'turn-left';
			case 'SlightLeft':
				return 'bear-left';
			case 'WaypointReached':
				return 'via';
			case 'Roundabout':
				return 'enter-roundabout';
			case 'DestinationReached':
				return 'arrive';
			}
		},

		_getInstructionTemplate: function(instr, i) {
			var type = instr.type === 'Straight' ? (i === 0 ? 'Head' : 'Continue') : instr.type,
				strings = L.Routing.Localization[this.options.language].instructions[type];

			return strings[0] + (strings.length > 1 && instr.road ? strings[1] : '');
		}
	});

	module.exports = L.Routing;
})();


},{"./L.Routing.Localization":12,"leaflet":2}],8:[function(require,module,exports){
(function() {
	'use strict';

	var L = require('leaflet');
	L.Routing = L.Routing || {};
	L.extend(L.Routing, require('./L.Routing.Autocomplete'));

	function selectInputText(input) {
		if (input.setSelectionRange) {
			// On iOS, select() doesn't work
			input.setSelectionRange(0, 9999);
		} else {
			// On at least IE8, setSeleectionRange doesn't exist
			input.select();
		}
	}

	L.Routing.GeocoderElement = L.Class.extend({
		includes: L.Mixin.Events,

		options: {
			createGeocoder: function(i, nWps, options) {
				var container = L.DomUtil.create('div', 'leaflet-routing-geocoder'),
					input = L.DomUtil.create('input', '', container),
					remove = options.addWaypoints ? L.DomUtil.create('span', 'leaflet-routing-remove-waypoint', container) : undefined;

				input.disabled = !options.addWaypoints;

				return {
					container: container,
					input: input,
					closeButton: remove
				};
			},
			geocoderPlaceholder: function(i, numberWaypoints, plan) {
				var l = L.Routing.Localization[plan.options.language].ui;
				return i === 0 ?
					l.startPlaceholder :
					(i < numberWaypoints - 1 ?
						L.Util.template(l.viaPlaceholder, {viaNumber: i}) :
						l.endPlaceholder);
			},

			geocoderClass: function() {
				return '';
			},

			waypointNameFallback: function(latLng) {
				var ns = latLng.lat < 0 ? 'S' : 'N',
					ew = latLng.lng < 0 ? 'W' : 'E',
					lat = (Math.round(Math.abs(latLng.lat) * 10000) / 10000).toString(),
					lng = (Math.round(Math.abs(latLng.lng) * 10000) / 10000).toString();
				return ns + lat + ', ' + ew + lng;
			},
			maxGeocoderTolerance: 200,
			autocompleteOptions: {},
			language: 'en',
		},

		initialize: function(wp, i, nWps, options) {
			L.setOptions(this, options);

			var g = this.options.createGeocoder(i, nWps, this.options),
				closeButton = g.closeButton,
				geocoderInput = g.input;
			geocoderInput.setAttribute('placeholder', this.options.geocoderPlaceholder(i, nWps, this));
			geocoderInput.className = this.options.geocoderClass(i, nWps);

			this._element = g;
			this._waypoint = wp;

			this.update();
			// This has to be here, or geocoder's value will not be properly
			// initialized.
			// TODO: look into why and make _updateWaypointName fix this.
			geocoderInput.value = wp.name;

			L.DomEvent.addListener(geocoderInput, 'click', function() {
				selectInputText(this);
			}, geocoderInput);

			if (closeButton) {
				L.DomEvent.addListener(closeButton, 'click', function() {
					this.fire('delete', { waypoint: this._waypoint });
				}, this);
			}

			new L.Routing.Autocomplete(geocoderInput, function(r) {
					geocoderInput.value = r.name;
					wp.name = r.name;
					wp.latLng = r.center;
					this.fire('geocoded', { waypoint: wp, value: r });
				}, this, L.extend({
					resultFn: this.options.geocoder.geocode,
					resultContext: this.options.geocoder,
					autocompleteFn: this.options.geocoder.suggest,
					autocompleteContext: this.options.geocoder
				}, this.options.autocompleteOptions));
		},

		getContainer: function() {
			return this._element.container;
		},

		setValue: function(v) {
			this._element.input.value = v;
		},

		update: function(force) {
			var wp = this._waypoint,
				wpCoords;

			wp.name = wp.name || '';

			if (wp.latLng && (force || !wp.name)) {
				wpCoords = this.options.waypointNameFallback(wp.latLng);
				if (this.options.geocoder && this.options.geocoder.reverse) {
					this.options.geocoder.reverse(wp.latLng, 67108864 /* zoom 18 */, function(rs) {
						if (rs.length > 0 && rs[0].center.distanceTo(wp.latLng) < this.options.maxGeocoderTolerance) {
							wp.name = rs[0].name;
						} else {
							wp.name = wpCoords;
						}
						this._update();
					}, this);
				} else {
					wp.name = wpCoords;
					this._update();
				}
			}
		},

		focus: function() {
			var input = this._element.input;
			input.focus();
			selectInputText(input);
		},

		_update: function() {
			var wp = this._waypoint,
			    value = wp && wp.name ? wp.name : '';
			this.setValue(value);
			this.fire('reversegeocoded', {waypoint: wp, value: value});
		}
	});

	L.Routing.geocoderElement = function(wp, i, nWps, plan) {
		return new L.Routing.GeocoderElement(wp, i, nWps, plan);
	};

	module.exports = L.Routing;
})();

},{"./L.Routing.Autocomplete":5,"leaflet":2}],9:[function(require,module,exports){
(function() {
	'use strict';

	var L = require('leaflet');

	L.Routing = L.Routing || {};
	L.extend(L.Routing, require('./L.Routing.Formatter'));
	L.extend(L.Routing, require('./L.Routing.ItineraryBuilder'));

	L.Routing.Itinerary = L.Control.extend({
		includes: L.Mixin.Events,

		options: {
			pointMarkerStyle: {
				radius: 5,
				color: '#03f',
				fillColor: 'white',
				opacity: 1,
				fillOpacity: 0.7
			},
			summaryTemplate: '<h2>{name}</h2><h3>{distance}, {time}</h3>',
			timeTemplate: '{time}',
			containerClassName: '',
			alternativeClassName: '',
			minimizedClassName: '',
			itineraryClassName: '',
			totalDistanceRoundingSensitivity: -1,
			show: true,
			collapsible: undefined,
			collapseBtn: function(itinerary) {
				var collapseBtn = L.DomUtil.create('span', itinerary.options.collapseBtnClass);
				L.DomEvent.on(collapseBtn, 'click', itinerary._toggle, itinerary);
				itinerary._container.insertBefore(collapseBtn, itinerary._container.firstChild);
			},
			collapseBtnClass: 'leaflet-routing-collapse-btn'
		},

		initialize: function(options) {
			L.setOptions(this, options);
			this._formatter = this.options.formatter || new L.Routing.Formatter(this.options);
			this._itineraryBuilder = this.options.itineraryBuilder || new L.Routing.ItineraryBuilder({
				containerClassName: this.options.itineraryClassName
			});
		},

		onAdd: function(map) {
			var collapsible = this.options.collapsible;

			collapsible = collapsible || (collapsible === undefined && map.getSize().x <= 640);

			this._container = L.DomUtil.create('div', 'leaflet-routing-container leaflet-bar ' +
				(!this.options.show ? 'leaflet-routing-container-hide ' : '') +
				(collapsible ? 'leaflet-routing-collapsible ' : '') +
				this.options.containerClassName);
			this._altContainer = this.createAlternativesContainer();
			this._container.appendChild(this._altContainer);
			L.DomEvent.disableClickPropagation(this._container);
			L.DomEvent.addListener(this._container, 'mousewheel', function(e) {
				L.DomEvent.stopPropagation(e);
			});

			if (collapsible) {
				this.options.collapseBtn(this);
			}

			return this._container;
		},

		onRemove: function() {
		},

		createAlternativesContainer: function() {
			return L.DomUtil.create('div', 'leaflet-routing-alternatives-container');
		},

		setAlternatives: function(routes) {
			var i,
			    alt,
			    altDiv;

			this._clearAlts();

			this._routes = routes;

			for (i = 0; i < this._routes.length; i++) {
				alt = this._routes[i];
				altDiv = this._createAlternative(alt, i);
				this._altContainer.appendChild(altDiv);
				this._altElements.push(altDiv);
			}

			this._selectRoute({route: this._routes[0], alternatives: this._routes.slice(1)});

			return this;
		},

		show: function() {
			L.DomUtil.removeClass(this._container, 'leaflet-routing-container-hide');
		},

		hide: function() {
			L.DomUtil.addClass(this._container, 'leaflet-routing-container-hide');
		},

		_toggle: function() {
			var collapsed = L.DomUtil.hasClass(this._container, 'leaflet-routing-container-hide');
			this[collapsed ? 'show' : 'hide']();
		},

		_createAlternative: function(alt, i) {
			var altDiv = L.DomUtil.create('div', 'leaflet-routing-alt ' +
				this.options.alternativeClassName +
				(i > 0 ? ' leaflet-routing-alt-minimized ' + this.options.minimizedClassName : '')),
				template = this.options.summaryTemplate,
				data = L.extend({
					name: alt.name,
					distance: this._formatter.formatDistance(alt.summary.totalDistance, this.options.totalDistanceRoundingSensitivity),
					time: this._formatter.formatTime(alt.summary.totalTime)
				}, alt);
			altDiv.innerHTML = typeof(template) === 'function' ? template(data) : L.Util.template(template, data);
			L.DomEvent.addListener(altDiv, 'click', this._onAltClicked, this);
			this.on('routeselected', this._selectAlt, this);

			altDiv.appendChild(this._createItineraryContainer(alt));
			return altDiv;
		},

		_clearAlts: function() {
			var el = this._altContainer;
			while (el && el.firstChild) {
				el.removeChild(el.firstChild);
			}

			this._altElements = [];
		},

		_createItineraryContainer: function(r) {
			var container = this._itineraryBuilder.createContainer(),
			    steps = this._itineraryBuilder.createStepsContainer(),
			    i,
			    instr,
			    step,
			    distance,
			    text,
			    icon;

			container.appendChild(steps);

			for (i = 0; i < r.instructions.length; i++) {
				instr = r.instructions[i];
				text = this._formatter.formatInstruction(instr, i);
				distance = this._formatter.formatDistance(instr.distance);
				icon = this._formatter.getIconName(instr, i);
				step = this._itineraryBuilder.createStep(text, distance, icon, steps);

				this._addRowListeners(step, r.coordinates[instr.index]);
			}

			return container;
		},

		_addRowListeners: function(row, coordinate) {
			L.DomEvent.addListener(row, 'mouseover', function() {
				this._marker = L.circleMarker(coordinate,
					this.options.pointMarkerStyle).addTo(this._map);
			}, this);
			L.DomEvent.addListener(row, 'mouseout', function() {
				if (this._marker) {
					this._map.removeLayer(this._marker);
					delete this._marker;
				}
			}, this);
			L.DomEvent.addListener(row, 'click', function(e) {
				this._map.panTo(coordinate);
				L.DomEvent.stopPropagation(e);
			}, this);
		},

		_onAltClicked: function(e) {
			var altElem = e.target || window.event.srcElement;
			while (!L.DomUtil.hasClass(altElem, 'leaflet-routing-alt')) {
				altElem = altElem.parentElement;
			}

			var j = this._altElements.indexOf(altElem);
			var alts = this._routes.slice();
			var route = alts.splice(j, 1)[0];

			this.fire('routeselected', {
				route: route,
				alternatives: alts
			});
		},

		_selectAlt: function(e) {
			var altElem,
			    j,
			    n,
			    classFn;

			altElem = this._altElements[e.route.routesIndex];

			if (L.DomUtil.hasClass(altElem, 'leaflet-routing-alt-minimized')) {
				for (j = 0; j < this._altElements.length; j++) {
					n = this._altElements[j];
					classFn = j === e.route.routesIndex ? 'removeClass' : 'addClass';
					L.DomUtil[classFn](n, 'leaflet-routing-alt-minimized');
					if (this.options.minimizedClassName) {
						L.DomUtil[classFn](n, this.options.minimizedClassName);
					}

					if (j !== e.route.routesIndex) n.scrollTop = 0;
				}
			}

			L.DomEvent.stop(e);
		},

		_selectRoute: function(routes) {
			if (this._marker) {
				this._map.removeLayer(this._marker);
				delete this._marker;
			}
			this.fire('routeselected', routes);
		}
	});

	L.Routing.itinerary = function(options) {
		return new L.Routing.Itinerary(options);
	};

	module.exports = L.Routing;
})();

},{"./L.Routing.Formatter":7,"./L.Routing.ItineraryBuilder":10,"leaflet":2}],10:[function(require,module,exports){
(function() {
	'use strict';

	var L = require('leaflet');
	L.Routing = L.Routing || {};

	L.Routing.ItineraryBuilder = L.Class.extend({
		options: {
			containerClassName: ''
		},

		initialize: function(options) {
			L.setOptions(this, options);
		},

		createContainer: function(className) {
			var table = L.DomUtil.create('table', className || ''),
				colgroup = L.DomUtil.create('colgroup', '', table);

			L.DomUtil.create('col', 'leaflet-routing-instruction-icon', colgroup);
			L.DomUtil.create('col', 'leaflet-routing-instruction-text', colgroup);
			L.DomUtil.create('col', 'leaflet-routing-instruction-distance', colgroup);

			return table;
		},

		createStepsContainer: function() {
			return L.DomUtil.create('tbody', '');
		},

		createStep: function(text, distance, icon, steps) {
			var row = L.DomUtil.create('tr', '', steps),
				span,
				td;
			td = L.DomUtil.create('td', '', row);
			span = L.DomUtil.create('span', 'leaflet-routing-icon leaflet-routing-icon-'+icon, td);
			td.appendChild(span);
			td = L.DomUtil.create('td', '', row);
			td.appendChild(document.createTextNode(text));
			td = L.DomUtil.create('td', '', row);
			td.appendChild(document.createTextNode(distance));
			return row;
		}
	});

	module.exports = L.Routing;
})();

},{"leaflet":2}],11:[function(require,module,exports){
(function() {
	'use strict';

	var L = require('leaflet');

	L.Routing = L.Routing || {};

	L.Routing.Line = L.LayerGroup.extend({
		includes: L.Mixin.Events,

		options: {
			styles: [
				{color: 'black', opacity: 0.15, weight: 9},
				{color: 'white', opacity: 0.8, weight: 6},
				{color: 'red', opacity: 1, weight: 2}
			],
			missingRouteStyles: [
				{color: 'black', opacity: 0.15, weight: 7},
				{color: 'white', opacity: 0.6, weight: 4},
				{color: 'gray', opacity: 0.8, weight: 2, dashArray: '7,12'}
			],
			addWaypoints: true,
			extendToWaypoints: true,
			missingRouteTolerance: 10
		},

		initialize: function(route, options) {
			L.setOptions(this, options);
			L.LayerGroup.prototype.initialize.call(this, options);
			this._route = route;

			if (this.options.extendToWaypoints) {
				this._extendToWaypoints();
			}

			this._addSegment(
				route.coordinates,
				this.options.styles,
				this.options.addWaypoints);
		},

		addTo: function(map) {
			map.addLayer(this);
			return this;
		},
		getBounds: function() {
			return L.latLngBounds(this._route.coordinates);
		},

		_findWaypointIndices: function() {
			var wps = this._route.inputWaypoints,
			    indices = [],
			    i;
			for (i = 0; i < wps.length; i++) {
				indices.push(this._findClosestRoutePoint(wps[i].latLng));
			}

			return indices;
		},

		_findClosestRoutePoint: function(latlng) {
			var minDist = Number.MAX_VALUE,
				minIndex,
			    i,
			    d;

			for (i = this._route.coordinates.length - 1; i >= 0 ; i--) {
				// TODO: maybe do this in pixel space instead?
				d = latlng.distanceTo(this._route.coordinates[i]);
				if (d < minDist) {
					minIndex = i;
					minDist = d;
				}
			}

			return minIndex;
		},

		_extendToWaypoints: function() {
			var wps = this._route.inputWaypoints,
				wpIndices = this._getWaypointIndices(),
			    i,
			    wpLatLng,
			    routeCoord;

			for (i = 0; i < wps.length; i++) {
				wpLatLng = wps[i].latLng;
				routeCoord = L.latLng(this._route.coordinates[wpIndices[i]]);
				if (wpLatLng.distanceTo(routeCoord) >
					this.options.missingRouteTolerance) {
					this._addSegment([wpLatLng, routeCoord],
						this.options.missingRouteStyles);
				}
			}
		},

		_addSegment: function(coords, styles, mouselistener) {
			var i,
				pl;

			for (i = 0; i < styles.length; i++) {
				pl = L.polyline(coords, styles[i]);
				this.addLayer(pl);
				if (mouselistener) {
					pl.on('mousedown', this._onLineTouched, this);
				}
			}
		},

		_findNearestWpBefore: function(i) {
			var wpIndices = this._getWaypointIndices(),
				j = wpIndices.length - 1;
			while (j >= 0 && wpIndices[j] > i) {
				j--;
			}

			return j;
		},

		_onLineTouched: function(e) {
			var afterIndex = this._findNearestWpBefore(this._findClosestRoutePoint(e.latlng));
			this.fire('linetouched', {
				afterIndex: afterIndex,
				latlng: e.latlng
			});
		},

		_getWaypointIndices: function() {
			if (!this._wpIndices) {
				this._wpIndices = this._route.waypointIndices || this._findWaypointIndices();
			}

			return this._wpIndices;
		}
	});

	L.Routing.line = function(route, options) {
		return new L.Routing.Line(route, options);
	};

	module.exports = L.Routing;
})();

},{"leaflet":2}],12:[function(require,module,exports){
(function() {
	'use strict';
	L.Routing = L.Routing || {};

	L.Routing.Localization = {
		'en': {
			directions: {
				N: 'north',
				NE: 'northeast',
				E: 'east',
				SE: 'southeast',
				S: 'south',
				SW: 'southwest',
				W: 'west',
				NW: 'northwest'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Head {dir}', ' on {road}'],
				'Continue':
					['Continue {dir}', ' on {road}'],
				'SlightRight':
					['Slight right', ' onto {road}'],
				'Right':
					['Right', ' onto {road}'],
				'SharpRight':
					['Sharp right', ' onto {road}'],
				'TurnAround':
					['Turn around'],
				'SharpLeft':
					['Sharp left', ' onto {road}'],
				'Left':
					['Left', ' onto {road}'],
				'SlightLeft':
					['Slight left', ' onto {road}'],
				'WaypointReached':
					['Waypoint reached'],
				'Roundabout':
					['Take the {exitStr} exit in the roundabout', ' onto {road}'],
				'DestinationReached':
					['Destination reached'],
			},
			formatOrder: function(n) {
				var i = n % 10 - 1,
				suffix = ['st', 'nd', 'rd'];

				return suffix[i] ? n + suffix[i] : n + 'th';
			},
			ui: {
				startPlaceholder: 'Start',
				viaPlaceholder: 'Via {viaNumber}',
				endPlaceholder: 'End'
			}
		},

		'de': {
			directions: {
				N: 'Norden',
				NE: 'Nordosten',
				E: 'Osten',
				SE: 'Südosten',
				S: 'Süden',
				SW: 'Südwesten',
				W: 'Westen',
				NW: 'Nordwesten'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Richtung {dir}', ' auf {road}'],
				'Continue':
					['Geradeaus Richtung {dir}', ' auf {road}'],
				'SlightRight':
					['Leicht rechts abbiegen', ' auf {road}'],
				'Right':
					['Rechts abbiegen', ' auf {road}'],
				'SharpRight':
					['Scharf rechts abbiegen', ' auf {road}'],
				'TurnAround':
					['Wenden'],
				'SharpLeft':
					['Scharf links abbiegen', ' auf {road}'],
				'Left':
					['Links abbiegen', ' auf {road}'],
				'SlightLeft':
					['Leicht links abbiegen', ' auf {road}'],
				'WaypointReached':
					['Zwischenhalt erreicht'],
				'Roundabout':
					['Nehmen Sie die {exitStr} Ausfahrt im Kreisverkehr', ' auf {road}'],
				'DestinationReached':
					['Sie haben ihr Ziel erreicht'],
			},
			formatOrder: function(n) {
				return n + '.';
			},
			ui: {
				startPlaceholder: 'Start',
				viaPlaceholder: 'Via {viaNumber}',
				endPlaceholder: 'Ziel'
			}
		},

		'sv': {
			directions: {
				N: 'norr',
				NE: 'nordost',
				E: 'öst',
				SE: 'sydost',
				S: 'syd',
				SW: 'sydväst',
				W: 'väst',
				NW: 'nordväst'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Åk åt {dir}', ' på {road}'],
				'Continue':
					['Fortsätt {dir}', ' på {road}'],
				'SlightRight':
					['Svagt höger', ' på {road}'],
				'Right':
					['Sväng höger', ' på {road}'],
				'SharpRight':
					['Skarpt höger', ' på {road}'],
				'TurnAround':
					['Vänd'],
				'SharpLeft':
					['Skarpt vänster', ' på {road}'],
				'Left':
					['Sväng vänster', ' på {road}'],
				'SlightLeft':
					['Svagt vänster', ' på {road}'],
				'WaypointReached':
					['Viapunkt nådd'],
				'Roundabout':
					['Tag {exitStr} avfarten i rondellen', ' till {road}'],
				'DestinationReached':
					['Framme vid resans mål'],
			},
			formatOrder: function(n) {
				return ['första', 'andra', 'tredje', 'fjärde', 'femte',
					'sjätte', 'sjunde', 'åttonde', 'nionde', 'tionde'
					/* Can't possibly be more than ten exits, can there? */][n - 1];
			},
			ui: {
				startPlaceholder: 'Från',
				viaPlaceholder: 'Via {viaNumber}',
				endPlaceholder: 'Till'
			}
		},

		'sp': {
			directions: {
				N: 'norte',
				NE: 'noreste',
				E: 'este',
				SE: 'sureste',
				S: 'sur',
				SW: 'suroeste',
				W: 'oeste',
				NW: 'noroeste'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Derecho {dir}', ' sobre {road}'],
				'Continue':
					['Continuar {dir}', ' en {road}'],
				'SlightRight':
					['Leve giro a la derecha', ' sobre {road}'],
				'Right':
					['Derecha', ' sobre {road}'],
				'SharpRight':
					['Giro pronunciado a la derecha', ' sobre {road}'],
				'TurnAround':
					['Dar vuelta'],
				'SharpLeft':
					['Giro pronunciado a la izquierda', ' sobre {road}'],
				'Left':
					['Izquierda', ' en {road}'],
				'SlightLeft':
					['Leve giro a la izquierda', ' en {road}'],
				'WaypointReached':
					['Llegó a un punto del camino'],
				'Roundabout':
					['Tomar {exitStr} salida en la rotonda', ' en {road}'],
				'DestinationReached':
					['Llegada a destino'],
			},
			formatOrder: function(n) {
				return n + 'º';
			},
			ui: {
				startPlaceholder: 'Inicio',
				viaPlaceholder: 'Via {viaNumber}',
				endPlaceholder: 'Destino'
			}
		},
		'nl': {
			directions: {
				N: 'noordelijke',
				NE: 'noordoostelijke',
				E: 'oostelijke',
				SE: 'zuidoostelijke',
				S: 'zuidelijke',
				SW: 'zuidewestelijke',
				W: 'westelijke',
				NW: 'noordwestelijke'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Vertrek in {dir} richting', ' de {road} op'],
				'Continue':
					['Ga in {dir} richting', ' de {road} op'],
				'SlightRight':
					['Volg de weg naar rechts', ' de {road} op'],
				'Right':
					['Ga rechtsaf', ' de {road} op'],
				'SharpRight':
					['Ga scherpe bocht naar rechts', ' de {road} op'],
				'TurnAround':
					['Keer om'],
				'SharpLeft':
					['Ga scherpe bocht naar links', ' de {road} op'],
				'Left':
					['Ga linksaf', ' de {road} op'],
				'SlightLeft':
					['Volg de weg naar links', ' de {road} op'],
				'WaypointReached':
					['Aangekomen bij tussenpunt'],
				'Roundabout':
					['Neem de {exitStr} afslag op de rotonde', ' de {road} op'],
				'DestinationReached':
					['Aangekomen op eindpunt'],
			},
			formatOrder: function(n) {
				if (n === 1 || n >= 20) {
					return n + 'ste';
				} else {
					return n + 'de';
				}
			},
			ui: {
				startPlaceholder: 'Vertrekpunt',
				viaPlaceholder: 'Via {viaNumber}',
				endPlaceholder: 'Bestemming'
			}
		},
		'fr': {
			directions: {
				N: 'nord',
				NE: 'nord-est',
				E: 'est',
				SE: 'sud-est',
				S: 'sud',
				SW: 'sud-ouest',
				W: 'ouest',
				NW: 'nord-ouest'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Tout droit au {dir}', ' sur {road}'],
				'Continue':
					['Continuer au {dir}', ' sur {road}'],
				'SlightRight':
					['Légèrement à droite', ' sur {road}'],
				'Right':
					['A droite', ' sur {road}'],
				'SharpRight':
					['Complètement à droite', ' sur {road}'],
				'TurnAround':
					['Faire demi-tour'],
				'SharpLeft':
					['Complètement à gauche', ' sur {road}'],
				'Left':
					['A gauche', ' sur {road}'],
				'SlightLeft':
					['Légèrement à gauche', ' sur {road}'],
				'WaypointReached':
					['Point d\'étape atteint'],
				'Roundabout':
					['Au rond-point, prenez la {exitStr} sortie', ' sur {road}'],
				'DestinationReached':
					['Destination atteinte'],
			},
			formatOrder: function(n) {
				return n + 'º';
			},
			ui: {
				startPlaceholder: 'Départ',
				viaPlaceholder: 'Intermédiaire {viaNumber}',
				endPlaceholder: 'Arrivée'
			}
		},
		'it': {
			directions: {
				N: 'nord',
				NE: 'nord-est',
				E: 'est',
				SE: 'sud-est',
				S: 'sud',
				SW: 'sud-ovest',
				W: 'ovest',
				NW: 'nord-ovest'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Dritto verso {dir}', ' su {road}'],
				'Continue':
					['Continuare verso {dir}', ' su {road}'],
				'SlightRight':
					['Mantenere la destra', ' su {road}'],
				'Right':
					['A destra', ' su {road}'],
				'SharpRight':
					['Strettamente a destra', ' su {road}'],
				'TurnAround':
					['Fare inversione di marcia'],
				'SharpLeft':
					['Strettamente a sinistra', ' su {road}'],
				'Left':
					['A sinistra', ' sur {road}'],
				'SlightLeft':
					['Mantenere la sinistra', ' su {road}'],
				'WaypointReached':
					['Punto di passaggio raggiunto'],
				'Roundabout':
					['Alla rotonda, prendere la {exitStr} uscita'],
				'DestinationReached':
					['Destinazione raggiunta'],
			},
			formatOrder: function(n) {
				return n + 'º';
			},
			ui: {
				startPlaceholder: 'Partenza',
				viaPlaceholder: 'Intermedia {viaNumber}',
				endPlaceholder: 'Destinazione'
			}
		},
		'pt': {
			directions: {
				N: 'norte',
				NE: 'nordeste',
				E: 'leste',
				SE: 'sudeste',
				S: 'sul',
				SW: 'sudoeste',
				W: 'oeste',
				NW: 'noroeste'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Siga {dir}', ' na {road}'],
				'Continue':
					['Continue {dir}', ' na {road}'],
				'SlightRight':
					['Curva ligeira a direita', ' na {road}'],
				'Right':
					['Curva a direita', ' na {road}'],
				'SharpRight':
					['Curva fechada a direita', ' na {road}'],
				'TurnAround':
					['Retorne'],
				'SharpLeft':
					['Curva fechada a esquerda', ' na {road}'],
				'Left':
					['Curva a esquerda', ' na {road}'],
				'SlightLeft':
					['Curva ligueira a esquerda', ' na {road}'],
				'WaypointReached':
					['Ponto de interesse atingido'],
				'Roundabout':
					['Pegue a {exitStr} saída na rotatória', ' na {road}'],
				'DestinationReached':
					['Destino atingido'],
			},
			formatOrder: function(n) {
				return n + 'º';
			},
			ui: {
				startPlaceholder: 'Origem',
				viaPlaceholder: 'Intermédio {viaNumber}',
				endPlaceholder: 'Destino'
			}
		},
		'sk': {
			directions: {
				N: 'sever',
				NE: 'serverovýchod',
				E: 'východ',
				SE: 'juhovýchod',
				S: 'juh',
				SW: 'juhozápad',
				W: 'západ',
				NW: 'serverozápad'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Mierte na {dir}', ' na {road}'],
				'Continue':
					['Pokračujte na {dir}', ' na {road}'],
				'SlightRight':
					['Mierne doprava', ' na {road}'],
				'Right':
					['Doprava', ' na {road}'],
				'SharpRight':
					['Prudko doprava', ' na {road}'],
				'TurnAround':
					['Otočte sa'],
				'SharpLeft':
					['Prudko doľava', ' na {road}'],
				'Left':
					['Doľava', ' na {road}'],
				'SlightLeft':
					['Mierne doľava', ' na {road}'],
				'WaypointReached':
					['Ste v prejazdovom bode.'],
				'Roundabout':
					['Odbočte na {exitStr} výjazde', ' na {road}'],
				'DestinationReached':
					['Prišli ste do cieľa.'],
			},
			formatOrder: function(n) {
				var i = n % 10 - 1,
				suffix = ['.', '.', '.'];

				return suffix[i] ? n + suffix[i] : n + '.';
			},
			ui: {
				startPlaceholder: 'Začiatok',
				viaPlaceholder: 'Cez {viaNumber}',
				endPlaceholder: 'Koniec'
			}
		},
		'el': {
			directions: {
				N: 'βόρεια',
				NE: 'βορειοανατολικά',
				E: 'ανατολικά',
				SE: 'νοτιοανατολικά',
				S: 'νότια',
				SW: 'νοτιοδυτικά',
				W: 'δυτικά',
				NW: 'βορειοδυτικά'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Κατευθυνθείτε {dir}', ' στην {road}'],
				'Continue':
					['Συνεχίστε {dir}', ' στην {road}'],
				'SlightRight':
					['Ελαφρώς δεξιά', ' στην {road}'],
				'Right':
					['Δεξιά', ' στην {road}'],
				'SharpRight':
					['Απότομη δεξιά στροφή', ' στην {road}'],
				'TurnAround':
					['Κάντε αναστροφή'],
				'SharpLeft':
					['Απότομη αριστερή στροφή', ' στην {road}'],
				'Left':
					['Αριστερά', ' στην {road}'],
				'SlightLeft':
					['Ελαφρώς αριστερά', ' στην {road}'],
				'WaypointReached':
					['Φτάσατε στο σημείο αναφοράς'],
				'Roundabout':
					['Ακολουθήστε την {exitStr} έξοδο στο κυκλικό κόμβο', ' στην {road}'],
				'DestinationReached':
					['Φτάσατε στον προορισμό σας'],
			},
			formatOrder: function(n) {
				return n + 'º';
			},
			ui: {
				startPlaceholder: 'Αφετηρία',
				viaPlaceholder: 'μέσω {viaNumber}',
				endPlaceholder: 'Προορισμός'
			}
		}
	};

	module.exports = L.Routing;
})();

},{}],13:[function(require,module,exports){
(function() {
	'use strict';

	var L = require('leaflet'),
		corslite = require('corslite'),
		polyline = require('polyline');

	// Ignore camelcase naming for this file, since OSRM's API uses
	// underscores.
	/* jshint camelcase: false */

	L.Routing = L.Routing || {};
	L.extend(L.Routing, require('./L.Routing.Waypoint'));

	L.Routing.OSRM = L.Class.extend({
		options: {
			serviceUrl: 'https://router.project-osrm.org/viaroute',
			timeout: 30 * 1000,
			routingOptions: {},
			polylinePrecision: 6
		},

		initialize: function(options) {
			L.Util.setOptions(this, options);
			this._hints = {
				locations: {}
			};
		},

		route: function(waypoints, callback, context, options) {
			var timedOut = false,
				wps = [],
				url,
				timer,
				wp,
				i;

			url = this.buildRouteUrl(waypoints, L.extend({}, this.options.routingOptions, options));

			timer = setTimeout(function() {
				timedOut = true;
				callback.call(context || callback, {
					status: -1,
					message: 'OSRM request timed out.'
				});
			}, this.options.timeout);

			// Create a copy of the waypoints, since they
			// might otherwise be asynchronously modified while
			// the request is being processed.
			for (i = 0; i < waypoints.length; i++) {
				wp = waypoints[i];
				wps.push(new L.Routing.Waypoint(wp.latLng, wp.name, wp.options));
			}

			corslite(url, L.bind(function(err, resp) {
				var data,
					errorMessage,
					statusCode;

				clearTimeout(timer);
				if (!timedOut) {
					errorMessage = 'HTTP request failed: ' + err;
					statusCode = -1;

					if (!err) {
						try {
							data = JSON.parse(resp.responseText);
							try {
								return this._routeDone(data, wps, callback, context);
							} catch (ex) {
								statusCode = -3;
								errorMessage = ex.toString();
							}
						} catch (ex) {
							statusCode = -2;
							errorMessage = 'Error parsing OSRM response: ' + ex.toString();
						}
					}

					callback.call(context || callback, {
						status: statusCode,
						message: errorMessage
					});
				}
			}, this));

			return this;
		},

		_routeDone: function(response, inputWaypoints, callback, context) {
			var coordinates,
			    alts,
			    actualWaypoints,
			    i;

			context = context || callback;
			if (response.status !== 0 && response.status !== 200) {
				callback.call(context, {
					status: response.status,
					message: response.status_message
				});
				return;
			}

			coordinates = this._decodePolyline(response.route_geometry);
			actualWaypoints = this._toWaypoints(inputWaypoints, response.via_points);
			alts = [{
				name: this._createName(response.route_name),
				coordinates: coordinates,
				instructions: response.route_instructions ? this._convertInstructions(response.route_instructions) : [],
				summary: response.route_summary ? this._convertSummary(response.route_summary) : [],
				inputWaypoints: inputWaypoints,
				waypoints: actualWaypoints,
				waypointIndices: this._clampIndices(response.via_indices, coordinates)
			}];

			if (response.alternative_geometries) {
				for (i = 0; i < response.alternative_geometries.length; i++) {
					coordinates = this._decodePolyline(response.alternative_geometries[i]);
					alts.push({
						name: this._createName(response.alternative_names[i]),
						coordinates: coordinates,
						instructions: response.alternative_instructions[i] ? this._convertInstructions(response.alternative_instructions[i]) : [],
						summary: response.alternative_summaries[i] ? this._convertSummary(response.alternative_summaries[i]) : [],
						inputWaypoints: inputWaypoints,
						waypoints: actualWaypoints,
						waypointIndices: this._clampIndices(response.alternative_geometries.length === 1 ?
							// Unsure if this is a bug in OSRM or not, but alternative_indices
							// does not appear to be an array of arrays, at least not when there is
							// a single alternative route.
							response.alternative_indices : response.alternative_indices[i],
							coordinates)
					});
				}
			}

			// only versions <4.5.0 will support this flag
			if (response.hint_data) {
				this._saveHintData(response.hint_data, inputWaypoints);
			}
			callback.call(context, null, alts);
		},

		_decodePolyline: function(routeGeometry) {
			var cs = polyline.decode(routeGeometry, this.options.polylinePrecision),
				result = new Array(cs.length),
				i;
			for (i = cs.length - 1; i >= 0; i--) {
				result[i] = L.latLng(cs[i]);
			}

			return result;
		},

		_toWaypoints: function(inputWaypoints, vias) {
			var wps = [],
			    i;
			for (i = 0; i < vias.length; i++) {
				wps.push(L.Routing.waypoint(L.latLng(vias[i]),
				                            inputWaypoints[i].name,
				                            inputWaypoints[i].options));
			}

			return wps;
		},

		_createName: function(nameParts) {
			var name = '',
				i;

			for (i = 0; i < nameParts.length; i++) {
				if (nameParts[i]) {
					if (name) {
						name += ', ';
					}
					name += nameParts[i].charAt(0).toUpperCase() + nameParts[i].slice(1);
				}
			}

			return name;
		},

		buildRouteUrl: function(waypoints, options) {
			var locs = [],
				wp,
			    computeInstructions,
			    computeAlternative,
			    locationKey,
			    hint;

			for (var i = 0; i < waypoints.length; i++) {
				wp = waypoints[i];
				locationKey = this._locationKey(wp.latLng);
				locs.push('loc=' + locationKey);

				hint = this._hints.locations[locationKey];
				if (hint) {
					locs.push('hint=' + hint);
				}

				if (wp.options && wp.options.allowUTurn) {
					locs.push('u=true');
				}
			}

			computeAlternative = computeInstructions =
				!(options && options.geometryOnly);

			return this.options.serviceUrl + '?' +
				'instructions=' + computeInstructions.toString() + '&' +
				'alt=' + computeAlternative.toString() + '&' +
				(options.z ? 'z=' + options.z + '&' : '') +
				locs.join('&') +
				(this._hints.checksum !== undefined ? '&checksum=' + this._hints.checksum : '') +
				(options.fileformat ? '&output=' + options.fileformat : '') +
				(options.allowUTurns ? '&uturns=' + options.allowUTurns : '');
		},

		_locationKey: function(location) {
			return location.lat + ',' + location.lng;
		},

		_saveHintData: function(hintData, waypoints) {
			var loc;
			this._hints = {
				checksum: hintData.checksum,
				locations: {}
			};
			for (var i = hintData.locations.length - 1; i >= 0; i--) {
				loc = waypoints[i].latLng;
				this._hints.locations[this._locationKey(loc)] = hintData.locations[i];
			}
		},

		_convertSummary: function(osrmSummary) {
			return {
				totalDistance: osrmSummary.total_distance,
				totalTime: osrmSummary.total_time
			};
		},

		_convertInstructions: function(osrmInstructions) {
			var result = [],
			    i,
			    instr,
			    type,
			    driveDir;

			for (i = 0; i < osrmInstructions.length; i++) {
				instr = osrmInstructions[i];
				type = this._drivingDirectionType(instr[0]);
				driveDir = instr[0].split('-');
				if (type) {
					result.push({
						type: type,
						distance: instr[2],
						time: instr[4],
						road: instr[1],
						direction: instr[6],
						exit: driveDir.length > 1 ? driveDir[1] : undefined,
						index: instr[3]
					});
				}
			}

			return result;
		},

		_drivingDirectionType: function(d) {
			switch (parseInt(d, 10)) {
			case 1:
				return 'Straight';
			case 2:
				return 'SlightRight';
			case 3:
				return 'Right';
			case 4:
				return 'SharpRight';
			case 5:
				return 'TurnAround';
			case 6:
				return 'SharpLeft';
			case 7:
				return 'Left';
			case 8:
				return 'SlightLeft';
			case 9:
				return 'WaypointReached';
			case 10:
				// TODO: "Head on"
				// https://github.com/DennisOSRM/Project-OSRM/blob/master/DataStructures/TurnInstructions.h#L48
				return 'Straight';
			case 11:
			case 12:
				return 'Roundabout';
			case 15:
				return 'DestinationReached';
			default:
				return null;
			}
		},

		_clampIndices: function(indices, coords) {
			var maxCoordIndex = coords.length - 1,
				i;
			for (i = 0; i < indices.length; i++) {
				indices[i] = Math.min(maxCoordIndex, Math.max(indices[i], 0));
			}
			return indices;
		}
	});

	L.Routing.osrm = function(options) {
		return new L.Routing.OSRM(options);
	};

	module.exports = L.Routing;
})();

},{"./L.Routing.Waypoint":15,"corslite":1,"leaflet":2,"polyline":3}],14:[function(require,module,exports){
(function() {
	'use strict';

	var L = require('leaflet');
	L.Routing = L.Routing || {};
	L.extend(L.Routing, require('./L.Routing.GeocoderElement'));
	L.extend(L.Routing, require('./L.Routing.Waypoint'));

	L.Routing.Plan = L.Class.extend({
		includes: L.Mixin.Events,

		options: {
			dragStyles: [
				{color: 'black', opacity: 0.15, weight: 9},
				{color: 'white', opacity: 0.8, weight: 6},
				{color: 'red', opacity: 1, weight: 2, dashArray: '7,12'}
			],
			draggableWaypoints: true,
			routeWhileDragging: false,
			addWaypoints: true,
			reverseWaypoints: false,
			addButtonClassName: '',
			language: 'en',
			createGeocoderElement: L.Routing.geocoderElement,
			createMarker: function(i, wp) {
				var options = {
						draggable: this.draggableWaypoints
					},
				    marker = L.marker(wp.latLng, options);

				return marker;
			},
			geocodersClassName: ''
		},

		initialize: function(waypoints, options) {
			L.Util.setOptions(this, options);
			this._waypoints = [];
			this.setWaypoints(waypoints);
		},

		isReady: function() {
			var i;
			for (i = 0; i < this._waypoints.length; i++) {
				if (!this._waypoints[i].latLng) {
					return false;
				}
			}

			return true;
		},

		getWaypoints: function() {
			var i,
				wps = [];

			for (i = 0; i < this._waypoints.length; i++) {
				wps.push(this._waypoints[i]);
			}

			return wps;
		},

		setWaypoints: function(waypoints) {
			var args = [0, this._waypoints.length].concat(waypoints);
			this.spliceWaypoints.apply(this, args);
			return this;
		},

		spliceWaypoints: function() {
			var args = [arguments[0], arguments[1]],
			    i;

			for (i = 2; i < arguments.length; i++) {
				args.push(arguments[i] && arguments[i].hasOwnProperty('latLng') ? arguments[i] : L.Routing.waypoint(arguments[i]));
			}

			[].splice.apply(this._waypoints, args);

			// Make sure there's always at least two waypoints
			while (this._waypoints.length < 2) {
				this.spliceWaypoints(this._waypoints.length, 0, null);
			}

			this._updateMarkers();
			this._fireChanged.apply(this, args);
		},

		onAdd: function(map) {
			this._map = map;
			this._updateMarkers();
		},

		onRemove: function() {
			var i;
			this._removeMarkers();

			if (this._newWp) {
				for (i = 0; i < this._newWp.lines.length; i++) {
					this._map.removeLayer(this._newWp.lines[i]);
				}
			}

			delete this._map;
		},

		createGeocoders: function() {
			var container = L.DomUtil.create('div', 'leaflet-routing-geocoders ' + this.options.geocodersClassName),
				waypoints = this._waypoints,
			    addWpBtn,
			    reverseBtn;

			this._geocoderContainer = container;
			this._geocoderElems = [];


			if (this.options.addWaypoints) {
				addWpBtn = L.DomUtil.create('button', 'leaflet-routing-add-waypoint ' + this.options.addButtonClassName, container);
				addWpBtn.setAttribute('type', 'button');
				L.DomEvent.addListener(addWpBtn, 'click', function() {
					this.spliceWaypoints(waypoints.length, 0, null);
				}, this);
			}

			if (this.options.reverseWaypoints) {
				reverseBtn = L.DomUtil.create('button', 'leaflet-routing-reverse-waypoints', container);
				reverseBtn.setAttribute('type', 'button');
				L.DomEvent.addListener(reverseBtn, 'click', function() {
					this._waypoints.reverse();
					this.setWaypoints(this._waypoints);
				}, this);
			}

			this._updateGeocoders();
			this.on('waypointsspliced', this._updateGeocoders);

			return container;
		},

		_createGeocoder: function(i) {
			var geocoder = this.options.createGeocoderElement(this._waypoints[i], i, this._waypoints.length, this.options);
			geocoder
			.on('delete', function() {
				if (i > 0 || this._waypoints.length > 2) {
					this.spliceWaypoints(i, 1);
				} else {
					this.spliceWaypoints(i, 1, new L.Routing.Waypoint());
				}
			}, this)
			.on('geocoded', function(e) {
				this._updateMarkers();
				this._fireChanged();
				this._focusGeocoder(i + 1);
				this.fire('waypointgeocoded', {
					waypointIndex: i,
					waypoint: e.waypoint
				});
			}, this)
			.on('reversegeocoded', function(e) {
				this.fire('waypointgeocoded', {
					waypointIndex: i,
					waypoint: e.waypoint
				});
			}, this);

			return geocoder;
		},

		_updateGeocoders: function() {
			var elems = [],
				i,
			    geocoderElem;

			for (i = 0; i < this._geocoderElems.length; i++) {
				this._geocoderContainer.removeChild(this._geocoderElems[i].getContainer());
			}

			for (i = this._waypoints.length - 1; i >= 0; i--) {
				geocoderElem = this._createGeocoder(i);
				this._geocoderContainer.insertBefore(geocoderElem.getContainer(), this._geocoderContainer.firstChild);
				elems.push(geocoderElem);
			}

			this._geocoderElems = elems.reverse();
		},

		_removeMarkers: function() {
			var i;
			if (this._markers) {
				for (i = 0; i < this._markers.length; i++) {
					if (this._markers[i]) {
						this._map.removeLayer(this._markers[i]);
					}
				}
			}
			this._markers = [];
		},

		_updateMarkers: function() {
			var i,
			    m;

			if (!this._map) {
				return;
			}

			this._removeMarkers();

			for (i = 0; i < this._waypoints.length; i++) {
				if (this._waypoints[i].latLng) {
					m = this.options.createMarker(i, this._waypoints[i], this._waypoints.length);
					if (m) {
						m.addTo(this._map);
						if (this.options.draggableWaypoints) {
							this._hookWaypointEvents(m, i);
						}
					}
				} else {
					m = null;
				}
				this._markers.push(m);
			}
		},

		_fireChanged: function() {
			this.fire('waypointschanged', {waypoints: this.getWaypoints()});

			if (arguments.length >= 2) {
				this.fire('waypointsspliced', {
					index: Array.prototype.shift.call(arguments),
					nRemoved: Array.prototype.shift.call(arguments),
					added: arguments
				});
			}
		},

		_hookWaypointEvents: function(m, i, trackMouseMove) {
			var eventLatLng = function(e) {
					return trackMouseMove ? e.latlng : e.target.getLatLng();
				},
				dragStart = L.bind(function(e) {
					this.fire('waypointdragstart', {index: i, latlng: eventLatLng(e)});
				}, this),
				drag = L.bind(function(e) {
					this._waypoints[i].latLng = eventLatLng(e);
					this.fire('waypointdrag', {index: i, latlng: eventLatLng(e)});
				}, this),
				dragEnd = L.bind(function(e) {
					this._waypoints[i].latLng = eventLatLng(e);
					this._waypoints[i].name = '';
					if (this._geocoderElems) {
						this._geocoderElems[i].update(true);
					}
					this.fire('waypointdragend', {index: i, latlng: eventLatLng(e)});
					this._fireChanged();
				}, this),
				mouseMove,
				mouseUp;

			if (trackMouseMove) {
				mouseMove = L.bind(function(e) {
					this._markers[i].setLatLng(e.latlng);
					drag(e);
				}, this);
				mouseUp = L.bind(function(e) {
					this._map.dragging.enable();
					this._map.off('mouseup', mouseUp);
					this._map.off('mousemove', mouseMove);
					dragEnd(e);
				}, this);
				this._map.dragging.disable();
				this._map.on('mousemove', mouseMove);
				this._map.on('mouseup', mouseUp);
				dragStart({latlng: this._waypoints[i].latLng});
			} else {
				m.on('dragstart', dragStart);
				m.on('drag', drag);
				m.on('dragend', dragEnd);
			}
		},

		dragNewWaypoint: function(e) {
			var newWpIndex = e.afterIndex + 1;
			if (this.options.routeWhileDragging) {
				this.spliceWaypoints(newWpIndex, 0, e.latlng);
				this._hookWaypointEvents(this._markers[newWpIndex], newWpIndex, true);
			} else {
				this._dragNewWaypoint(newWpIndex, e.latlng);
			}
		},

		_dragNewWaypoint: function(newWpIndex, initialLatLng) {
			var wp = new L.Routing.Waypoint(initialLatLng),
				prevWp = this._waypoints[newWpIndex - 1],
				nextWp = this._waypoints[newWpIndex],
				marker = this.options.createMarker(newWpIndex, wp, this._waypoints.length + 1),
				lines = [],
				mouseMove = L.bind(function(e) {
					var i;
					if (marker) {
						marker.setLatLng(e.latlng);
					}
					for (i = 0; i < lines.length; i++) {
						lines[i].spliceLatLngs(1, 1, e.latlng);
					}
				}, this),
				mouseUp = L.bind(function(e) {
					var i;
					if (marker) {
						this._map.removeLayer(marker);
					}
					for (i = 0; i < lines.length; i++) {
						this._map.removeLayer(lines[i]);
					}
					this._map.off('mousemove', mouseMove);
					this._map.off('mouseup', mouseUp);
					this.spliceWaypoints(newWpIndex, 0, e.latlng);
				}, this),
				i;

			if (marker) {
				marker.addTo(this._map);
			}

			for (i = 0; i < this.options.dragStyles.length; i++) {
				lines.push(L.polyline([prevWp.latLng, initialLatLng, nextWp.latLng],
					this.options.dragStyles[i]).addTo(this._map));
			}

			this._map.on('mousemove', mouseMove);
			this._map.on('mouseup', mouseUp);
		},

		_focusGeocoder: function(i) {
			if (this._geocoderElems[i]) {
				this._geocoderElems[i].focus();
			} else {
				document.activeElement.blur();
			}
		}
	});

	L.Routing.plan = function(waypoints, options) {
		return new L.Routing.Plan(waypoints, options);
	};

	module.exports = L.Routing;
})();

},{"./L.Routing.GeocoderElement":8,"./L.Routing.Waypoint":15,"leaflet":2}],15:[function(require,module,exports){
(function() {
	'use strict';

	var L = require('leaflet');
	L.Routing = L.Routing || {};

	L.Routing.Waypoint = L.Class.extend({
			options: {
				allowUTurn: false,
			},
			initialize: function(latLng, name, options) {
				L.Util.setOptions(this, options);
				this.latLng = L.latLng(latLng);
				this.name = name;
			}
		});

	L.Routing.waypoint = function(latLng, name, options) {
		return new L.Routing.Waypoint(latLng, name, options);
	};

	module.exports = L.Routing;
})();

},{"leaflet":2}],16:[function(require,module,exports){
// require modules
var L = require('leaflet');
require('./leaflet-routing-machine.js');
require('./Control.Geocoder.js');
require('./leaflet.MiniMap.js');
require('./leaflet.Locate.js');
require('./leaflet-sidebar.js');
require('./leaflet.Hash.js');
// specify the path to the leaflet images folder
L.Icon.Default.imagePath = 'node_modules/leaflet/dist/images/';



//disable zoomControl (which is topleft by default) when initializing map&options
var map = new L.map('map', {
  attributionControl: false,
  zoomControl: false
});



// set map url tiles layer
var osmUrl='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// set OpenStreetMap attribution
var osmAttrib = " ";

// set Map tiles layer and Options
var osm = new L.TileLayer(osmUrl, {
  minZoom: 1,
  maxZoom: 19,
  detectRetina: true,
});

// add the tile layer to the map
map.addLayer(osm);

// set the position and zoom level of the map
map.setView(new L.LatLng(46.8, 3.8),3);



// icon for the routing machine
var startRicon = L.icon({
    iconUrl: 'public/images/pinstart.png',
    iconRetinaUrl: 'public/images/pinstart.png',
    iconSize: [36, 47],
    iconAnchor: [18, 47],
    popupAnchor: [0, -48],
});
var endRicon = L.icon({
    iconUrl: 'public/images/pinend.png',
    iconRetinaUrl: 'public/images/pinend.png',
    iconSize: [36, 47],
    iconAnchor: [18, 47],
    popupAnchor: [0, -48],
});



// Routing machine features
var sidebarlrm = L.Routing.control({
  plan: L.Routing.plan(null, {
      createMarker: function(i, startwp) {
        return L.marker(startwp.latLng, {
          draggable: true,
          icon: startRicon
        });
      },
      geocoder: L.Control.Geocoder.nominatim(),
      routeWhileDragging: true,
      reverseWaypoints: true,
      draggable: true
    }),
    position: 'topleft',
    collapsible: false,
    routeWhileDragging: true,
    routeDragTimeout: 250,
    draggableWaypoints:true
});
// include the routing machine into the sidebar
var lrmBlock = sidebarlrm.onAdd(map);
document.getElementById('sidebarlrm').appendChild(lrmBlock);



// Stand alone Geocoder features
var geocoder = L.Control.geocoder({
  position: 'topleft',
  collapsed: false,
  placeholder: 'Drop a marker',
  errorMessage: '‘X’ never, ever marks the spot.'
});
// include the geocoder into the sidebar
var gecBlock = geocoder.onAdd(map);
document.getElementById('sidebarex').appendChild(gecBlock);



// MiniMap layer Options
var esriUrl='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

// set MiniMap attribution
var esriAttrib='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

// set MiniMap features
var esri = new L.TileLayer(esriUrl, {
  minZoom: 0,
  maxZoom: 11,
  attribution: esriAttrib
});

// set MiniMap on map
var miniMap = new L.Control.MiniMap(esri, {
  position: 'bottomright',
  width: 80,
  height: 80
}).addTo(map);



//add zoom control with your options
L.control.zoom({
  position:'bottomright'
}).addTo(map);



// icon for locate
var markerLicon = {
    iconUrl: 'public/images/bluedot.png',
    iconSize: [17, 17],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
    labelAnchor: [3, -4],
};

// locate controle on the top right side
L.control.locate(
  {
  position: 'topright',
  icon: 'fa fa-location-arrow',
  iconLoading: 'fa fa-refresh fa-spin',
  drawCircle: true,
  circlePadding: [20, 20],
  circleStyle: {
    color: "#FFF",
    fillColor: "#000",
    fillOpacity: "0.1",
    weight: "2",
  },
  follow: true,
  markerClass: L.marker,
  markerStyle: {
    icon: L.icon( markerLicon ),
    className: 'locatemarker-pulsate',
  },
  metric: true,
  strings: {
    title: "Show me where I am",
    metersUnit: "meters",
    feetUnit: "feet",
    popup: "<center>You are around " + "{distance} {unit} " + "from this point</center>",
    outsideMapBoundsMsg: "You seem located outside the boundaries of the map"
    },
  locateOptions: {
    enableHighAccuracy: true,
    maxZoom: 20
  }
}).addTo(map);



// spawn the sidebar on map
var sidebar = L.control.sidebar('sidebar').addTo(map);



// hash the address bar with the {./#ZOOM/LAT/LNG} center of the map
var addresshash = new L.Hash(map);

},{"./Control.Geocoder.js":4,"./leaflet-routing-machine.js":26,"./leaflet-sidebar.js":27,"./leaflet.Hash.js":28,"./leaflet.Locate.js":29,"./leaflet.MiniMap.js":30,"leaflet":2}],17:[function(require,module,exports){
var L = require('leaflet'),
	Nominatim = require('./geocoders/nominatim').class;

module.exports = {
	class: L.Control.extend({
		options: {
			showResultIcons: false,
			collapsed: true,
			expand: 'click',
			position: 'topright',
			placeholder: 'Search...',
			errorMessage: 'Nothing found.'
		},

		_callbackId: 0,

		initialize: function (options) {
			L.Util.setOptions(this, options);
			if (!this.options.geocoder) {
				this.options.geocoder = new Nominatim();
			}
		},

		onAdd: function (map) {
			var className = 'leaflet-control-geocoder',
			    container = L.DomUtil.create('div', className + ' leaflet-bar'),
			    icon = L.DomUtil.create('a', 'leaflet-control-geocoder-icon', container),
			    form = this._form = L.DomUtil.create('form', className + '-form', container),
			    input;

			icon.innerHTML = '&nbsp;';
			icon.href = 'javascript:void(0);';
			this._map = map;
			this._container = container;
			input = this._input = L.DomUtil.create('input');
			input.type = 'text';
			input.placeholder = this.options.placeholder;

			L.DomEvent.addListener(input, 'keydown', this._keydown, this);
			//L.DomEvent.addListener(input, 'onpaste', this._clearResults, this);
			//L.DomEvent.addListener(input, 'oninput', this._clearResults, this);

			this._errorElement = document.createElement('div');
			this._errorElement.className = className + '-form-no-error';
			this._errorElement.innerHTML = this.options.errorMessage;

			this._alts = L.DomUtil.create('ul', className + '-alternatives leaflet-control-geocoder-alternatives-minimized');

			form.appendChild(input);
			this._container.appendChild(this._errorElement);
			container.appendChild(this._alts);

			L.DomEvent.addListener(form, 'submit', this._geocode, this);

			if (this.options.collapsed) {
				if (this.options.expand === 'click') {
					L.DomEvent.addListener(icon, 'click', function(e) {
						// TODO: touch
						if (e.button === 0 && e.detail !== 2) {
							this._toggle();
						}
					}, this);
				} else {
					L.DomEvent.addListener(icon, 'mouseover', this._expand, this);
					L.DomEvent.addListener(icon, 'mouseout', this._collapse, this);
					this._map.on('movestart', this._collapse, this);
				}
			} else {
				L.DomEvent.addListener(icon, 'click', function(e) {
					this._geocode(e);
				}, this);
				this._expand();
			}

			L.DomEvent.disableClickPropagation(container);

			return container;
		},

		_geocodeResult: function (results) {
			L.DomUtil.removeClass(this._container, 'leaflet-control-geocoder-throbber');
			if (results.length === 1) {
				this._geocodeResultSelected(results[0]);
			} else if (results.length > 0) {
				this._alts.innerHTML = '';
				this._results = results;
				L.DomUtil.removeClass(this._alts, 'leaflet-control-geocoder-alternatives-minimized');
				for (var i = 0; i < results.length; i++) {
					this._alts.appendChild(this._createAlt(results[i], i));
				}
			} else {
				L.DomUtil.addClass(this._errorElement, 'leaflet-control-geocoder-error');
			}
		},

		markGeocode: function(result) {
			this._map.fitBounds(result.bbox);

			if (this._geocodeMarker) {
				this._map.removeLayer(this._geocodeMarker);
			}

			this._geocodeMarker = new L.Marker(result.center)
				.bindPopup(result.html || result.name)
				.addTo(this._map)
				.openPopup();

			return this;
		},

		_geocode: function(event) {
			L.DomEvent.preventDefault(event);

			L.DomUtil.addClass(this._container, 'leaflet-control-geocoder-throbber');
			this._clearResults();
			this.options.geocoder.geocode(this._input.value, this._geocodeResult, this);

			return false;
		},

		_geocodeResultSelected: function(result) {
			if (this.options.collapsed) {
				this._collapse();
			} else {
				this._clearResults();
			}
			this.markGeocode(result);
		},

		_toggle: function() {
			if (this._container.className.indexOf('leaflet-control-geocoder-expanded') >= 0) {
				this._collapse();
			} else {
				this._expand();
			}
		},

		_expand: function () {
			L.DomUtil.addClass(this._container, 'leaflet-control-geocoder-expanded');
			this._input.select();
		},

		_collapse: function () {
			this._container.className = this._container.className.replace(' leaflet-control-geocoder-expanded', '');
			L.DomUtil.addClass(this._alts, 'leaflet-control-geocoder-alternatives-minimized');
			L.DomUtil.removeClass(this._errorElement, 'leaflet-control-geocoder-error');
		},

		_clearResults: function () {
			L.DomUtil.addClass(this._alts, 'leaflet-control-geocoder-alternatives-minimized');
			this._selection = null;
			L.DomUtil.removeClass(this._errorElement, 'leaflet-control-geocoder-error');
		},

		_createAlt: function(result, index) {
			var li = L.DomUtil.create('li', ''),
				a = L.DomUtil.create('a', '', li),
			    icon = this.options.showResultIcons && result.icon ? L.DomUtil.create('img', '', a) : null,
			    text = result.html ? undefined : document.createTextNode(result.name),
			    clickHandler = function clickHandler(e) {
					L.DomEvent.preventDefault(e);
					this._geocodeResultSelected(result);
				};

			if (icon) {
				icon.src = result.icon;
			}

			li.setAttribute('data-result-index', index);

			if (result.html) {
				a.innerHTML = a.innerHTML + result.html;
			} else {
				a.appendChild(text);
			}

			L.DomEvent.addListener(li, 'click', clickHandler, this);

			return li;
		},

		_keydown: function(e) {
			var _this = this,
			    select = function select(dir) {
					if (_this._selection) {
						L.DomUtil.removeClass(_this._selection, 'leaflet-control-geocoder-selected');
						_this._selection = _this._selection[dir > 0 ? 'nextSibling' : 'previousSibling'];
					}
					if (!_this._selection) {
						_this._selection = _this._alts[dir > 0 ? 'firstChild' : 'lastChild'];
					}

					if (_this._selection) {
						L.DomUtil.addClass(_this._selection, 'leaflet-control-geocoder-selected');
					}
				};

			switch (e.keyCode) {
			// Escape
			case 27:
				if (this.options.collapsed) {
					this._collapse();
				}
				break;
			// Up
			case 38:
				select(-1);
				L.DomEvent.preventDefault(e);
				break;
			// Up
			case 40:
				select(1);
				L.DomEvent.preventDefault(e);
				break;
			// Enter
			case 13:
				if (this._selection) {
					var index = parseInt(this._selection.getAttribute('data-result-index'), 10);
					this._geocodeResultSelected(this._results[index]);
					this._clearResults();
					L.DomEvent.preventDefault(e);
				}
			}
			return true;
		}
	}),
	factory: function(options) {
		return new L.Control.Geocoder(options);
	}
};

},{"./geocoders/nominatim":23,"leaflet":2}],18:[function(require,module,exports){
var L = require('leaflet'),
	Util = require('../util');

module.exports = {
	class: L.Class.extend({
		initialize: function(key) {
			this.key = key;
		},

		geocode : function (query, cb, context) {
			Util.jsonp('//dev.virtualearth.net/REST/v1/Locations', {
				query: query,
				key : this.key
			}, function(data) {
				var results = [];
				if( data.resourceSets.length > 0 ){
					for (var i = data.resourceSets[0].resources.length - 1; i >= 0; i--) {
						var resource = data.resourceSets[0].resources[i],
							bbox = resource.bbox;
						results[i] = {
							name: resource.name,
							bbox: L.latLngBounds([bbox[0], bbox[1]], [bbox[2], bbox[3]]),
							center: L.latLng(resource.point.coordinates)
						};
					}
				}
				cb.call(context, results);
			}, this, 'jsonp');
		},

		reverse: function(location, scale, cb, context) {
			Util.jsonp('//dev.virtualearth.net/REST/v1/Locations/' + location.lat + ',' + location.lng, {
				key : this.key
			}, function(data) {
				var results = [];
				for (var i = data.resourceSets[0].resources.length - 1; i >= 0; i--) {
					var resource = data.resourceSets[0].resources[i],
						bbox = resource.bbox;
					results[i] = {
						name: resource.name,
						bbox: L.latLngBounds([bbox[0], bbox[1]], [bbox[2], bbox[3]]),
						center: L.latLng(resource.point.coordinates)
					};
				}
				cb.call(context, results);
			}, this, 'jsonp');
		}
	}),

	factory: function(key) {
		return new L.Control.Geocoder.Bing(key);
	}
};

},{"../util":31,"leaflet":2}],19:[function(require,module,exports){
var L = require('leaflet'),
	Util = require('../util');

module.exports = {
	class: L.Class.extend({
		options: {
			serviceUrl: 'https://maps.googleapis.com/maps/api/geocode/json',
			geocodingQueryParams: {},
			reverseQueryParams: {}
		},

		initialize: function(key, options) {
			this._key = key;
			L.setOptions(this, options);
			// Backwards compatibility
			this.options.serviceUrl = this.options.service_url || this.options.serviceUrl;
		},

		geocode: function(query, cb, context) {
			var params = {
				address: query,
			};

			if (this._key && this._key.length) {
				params.key = this._key;
			}

			params = L.Util.extend(params, this.options.geocodingQueryParams);

			Util.getJSON(this.options.serviceUrl, params, function(data) {
				var results = [],
						loc,
						latLng,
						latLngBounds;
				if (data.results && data.results.length) {
					for (var i = 0; i <= data.results.length - 1; i++) {
						loc = data.results[i];
						latLng = L.latLng(loc.geometry.location);
						latLngBounds = L.latLngBounds(L.latLng(loc.geometry.viewport.northeast), L.latLng(loc.geometry.viewport.southwest));
						results[i] = {
							name: loc.formatted_address,
							bbox: latLngBounds,
							center: latLng,
							properties: loc.address_components
						};
					}
				}

				cb.call(context, results);
			});
		},

		reverse: function(location, scale, cb, context) {
			var params = {
				latlng: encodeURIComponent(location.lat) + ',' + encodeURIComponent(location.lng)
			};
			params = L.Util.extend(params, this.options.reverseQueryParams);
			if (this._key && this._key.length) {
				params.key = this._key;
			}

			Util.getJSON(this.options.serviceUrl, params, function(data) {
				var results = [],
						loc,
						latLng,
						latLngBounds;
				if (data.results && data.results.length) {
					for (var i = 0; i <= data.results.length - 1; i++) {
						loc = data.results[i];
						latLng = L.latLng(loc.geometry.location);
						latLngBounds = L.latLngBounds(L.latLng(loc.geometry.viewport.northeast), L.latLng(loc.geometry.viewport.southwest));
						results[i] = {
							name: loc.formatted_address,
							bbox: latLngBounds,
							center: latLng,
							properties: loc.address_components
						};
					}
				}

				cb.call(context, results);
			});
		}
	}),

	factory: function(key, options) {
		return new L.Control.Geocoder.Google(key, options);
	}
};

},{"../util":31,"leaflet":2}],20:[function(require,module,exports){
var L = require('leaflet'),
	Util = require('../util');

module.exports = {
	class: L.Class.extend({
		options: {
			serviceUrl: 'https://api.tiles.mapbox.com/v4/geocode/mapbox.places-v1/'
		},

		initialize: function(accessToken, options) {
			L.setOptions(this, options);
			this._accessToken = accessToken;
		},

		geocode: function(query, cb, context) {
			Util.getJSON(this.options.serviceUrl + encodeURIComponent(query) + '.json', {
				access_token: this._accessToken,
			}, function(data) {
				var results = [],
				loc,
				latLng,
				latLngBounds;
				if (data.features && data.features.length) {
					for (var i = 0; i <= data.features.length - 1; i++) {
						loc = data.features[i];
						latLng = L.latLng(loc.center.reverse());
						if(loc.hasOwnProperty('bbox'))
						{
							latLngBounds = L.latLngBounds(L.latLng(loc.bbox.slice(0, 2).reverse()), L.latLng(loc.bbox.slice(2, 4).reverse()));
						}
						else
						{
							latLngBounds = L.latLngBounds(latLng, latLng);
						}
						results[i] = {
							name: loc.place_name,
							bbox: latLngBounds,
							center: latLng
						};
					}
				}

				cb.call(context, results);
			});
		},

		suggest: function(query, cb, context) {
			return this.geocode(query, cb, context);
		},

		reverse: function(location, scale, cb, context) {
			Util.getJSON(this.options.serviceUrl + encodeURIComponent(location.lng) + ',' + encodeURIComponent(location.lat) + '.json', {
				access_token: this._accessToken,
			}, function(data) {
				var results = [],
				loc,
				latLng,
				latLngBounds;
				if (data.features && data.features.length) {
					for (var i = 0; i <= data.features.length - 1; i++) {
						loc = data.features[i];
						latLng = L.latLng(loc.center.reverse());
						if(loc.hasOwnProperty('bbox'))
						{
							latLngBounds = L.latLngBounds(L.latLng(loc.bbox.slice(0, 2).reverse()), L.latLng(loc.bbox.slice(2, 4).reverse()));
						}
						else
						{
							latLngBounds = L.latLngBounds(latLng, latLng);
						}
						results[i] = {
							name: loc.place_name,
							bbox: latLngBounds,
							center: latLng
						};
					}
				}

				cb.call(context, results);
			});
		}
	}),

	factory: function(accessToken, options) {
		return new L.Control.Geocoder.Mapbox(accessToken, options);
	}
};


},{"../util":31,"leaflet":2}],21:[function(require,module,exports){
var L = require('leaflet'),
	Util = require('../util');

module.exports = {
	class: L.Class.extend({
		options: {
			serviceUrl: '//www.mapquestapi.com/geocoding/v1'
		},

		initialize: function(key, options) {
			// MapQuest seems to provide URI encoded API keys,
			// so to avoid encoding them twice, we decode them here
			this._key = decodeURIComponent(key);

			L.Util.setOptions(this, options);
		},

		_formatName: function() {
			var r = [],
				i;
			for (i = 0; i < arguments.length; i++) {
				if (arguments[i]) {
					r.push(arguments[i]);
				}
			}

			return r.join(', ');
		},

		geocode: function(query, cb, context) {
			Util.jsonp(this.options.serviceUrl + '/address', {
				key: this._key,
				location: query,
				limit: 5,
				outFormat: 'json'
			}, function(data) {
				var results = [],
					loc,
					latLng;
				if (data.results && data.results[0].locations) {
					for (var i = data.results[0].locations.length - 1; i >= 0; i--) {
						loc = data.results[0].locations[i];
						latLng = L.latLng(loc.latLng);
						results[i] = {
							name: this._formatName(loc.street, loc.adminArea4, loc.adminArea3, loc.adminArea1),
							bbox: L.latLngBounds(latLng, latLng),
							center: latLng
						};
					}
				}

				cb.call(context, results);
			}, this);
		},

		reverse: function(location, scale, cb, context) {
			Util.jsonp(this.options.serviceUrl + '/reverse', {
				key: this._key,
				location: location.lat + ',' + location.lng,
				outputFormat: 'json'
			}, function(data) {
				var results = [],
					loc,
					latLng;
				if (data.results && data.results[0].locations) {
					for (var i = data.results[0].locations.length - 1; i >= 0; i--) {
						loc = data.results[0].locations[i];
						latLng = L.latLng(loc.latLng);
						results[i] = {
							name: this._formatName(loc.street, loc.adminArea4, loc.adminArea3, loc.adminArea1),
							bbox: L.latLngBounds(latLng, latLng),
							center: latLng
						};
					}
				}

				cb.call(context, results);
			}, this);
		}
	}),

	factory: function(key, options) {
		return new L.Control.Geocoder.MapQuest(key, options);
	}
};

},{"../util":31,"leaflet":2}],22:[function(require,module,exports){
var L = require('leaflet'),
	Util = require('../util');

module.exports = {
	class: L.Class.extend({
		options: {
			serviceUrl: '//search.mapzen.com/v1',
			geocodingQueryParams: {},
			reverseQueryParams: {}
		},

		initialize: function(apiKey, options) {
			L.Util.setOptions(this, options);
			this._apiKey = apiKey;
			this._lastSuggest = 0;
		},

		geocode: function(query, cb, context) {
			var _this = this;
			Util.getJSON(this.options.serviceUrl + "/search", L.extend({
				'api_key': this._apiKey,
				'text': query
			}, this.options.geocodingQueryParams), function(data) {
				cb.call(context, _this._parseResults(data, "bbox"));
			});
		},

		suggest: function(query, cb, context) {
			var _this = this;
			Util.getJSON(this.options.serviceUrl + "/autocomplete", L.extend({
				'api_key': this._apiKey,
				'text': query
			}, this.options.geocodingQueryParams), L.bind(function(data) {
				if (data.geocoding.timestamp > this._lastSuggest) {
					this._lastSuggest = data.geocoding.timestamp;
					cb.call(context, _this._parseResults(data, "bbox"));
				}
			}, this));
		},

		reverse: function(location, scale, cb, context) {
			var _this = this;
			Util.getJSON(this.options.serviceUrl + "/reverse", L.extend({
				'api_key': this._apiKey,
				'point.lat': location.lat,
				'point.lon': location.lng
			}, this.options.reverseQueryParams), function(data) {
				cb.call(context, _this._parseResults(data, "bounds"));
			});
		},

		_parseResults: function(data, bboxname) {
			var results = [];
			L.geoJson(data, {
				pointToLayer: function (feature, latlng) {
					return L.circleMarker(latlng);
				},
				onEachFeature: function(feature, layer) {
					var result = {};
					result['name'] = layer.feature.properties.label;
					result[bboxname] = layer.getBounds();
					result['center'] = result[bboxname].getCenter();
					result['properties'] = layer.feature.properties;
					results.push(result);
				}
			});
			return results;
		}
	}),

	factory: function(apiKey, options) {
		return new L.Control.Geocoder.Mapzen(apiKey, options);
	}
};

},{"../util":31,"leaflet":2}],23:[function(require,module,exports){
var L = require('leaflet'),
	Util = require('../util');

module.exports = {
	class: L.Class.extend({
		options: {
			serviceUrl: '//nominatim.openstreetmap.org/',
			geocodingQueryParams: {},
			reverseQueryParams: {},
			htmlTemplate: function(r) {
				var a = r.address,
					parts = [];
				if (a.road || a.building) {
					parts.push('{building} {road} {house_number}');
				}

				if (a.city || a.town || a.village || a.hamlet) {
					parts.push('<span class="' + (parts.length > 0 ? 'leaflet-control-geocoder-address-detail' : '') +
						'">{postcode} {city} {town} {village} {hamlet}</span>');
				}

				if (a.state || a.country) {
					parts.push('<span class="' + (parts.length > 0 ? 'leaflet-control-geocoder-address-context' : '') +
						'">{state} {country}</span>');
				}

				return Util.template(parts.join('<br/>'), a, true);
			}
		},

		initialize: function(options) {
			L.Util.setOptions(this, options);
		},

		geocode: function(query, cb, context) {
			Util.jsonp(this.options.serviceUrl + 'search', L.extend({
				q: query,
				limit: 5,
				format: 'json',
				addressdetails: 1
			}, this.options.geocodingQueryParams),
			function(data) {
				var results = [];
				for (var i = data.length - 1; i >= 0; i--) {
					var bbox = data[i].boundingbox;
					for (var j = 0; j < 4; j++) bbox[j] = parseFloat(bbox[j]);
					results[i] = {
						icon: data[i].icon,
						name: data[i].display_name,
						html: this.options.htmlTemplate ?
							this.options.htmlTemplate(data[i])
							: undefined,
						bbox: L.latLngBounds([bbox[0], bbox[2]], [bbox[1], bbox[3]]),
						center: L.latLng(data[i].lat, data[i].lon),
						properties: data[i]
					};
				}
				cb.call(context, results);
			}, this, 'json_callback');
		},

		reverse: function(location, scale, cb, context) {
			Util.jsonp(this.options.serviceUrl + 'reverse', L.extend({
				lat: location.lat,
				lon: location.lng,
				zoom: Math.round(Math.log(scale / 256) / Math.log(2)),
				addressdetails: 1,
				format: 'json'
			}, this.options.reverseQueryParams), function(data) {
				var result = [],
				    loc;

				if (data && data.lat && data.lon) {
					loc = L.latLng(data.lat, data.lon);
					result.push({
						name: data.display_name,
						html: this.options.htmlTemplate ?
							this.options.htmlTemplate(data)
							: undefined,
						center: loc,
						bounds: L.latLngBounds(loc, loc),
						properties: data
					});
				}

				cb.call(context, result);
			}, this, 'json_callback');
		}
	}),

	factory: function(options) {
		return new L.Control.Geocoder.Nominatim(options);
	}
};

},{"../util":31,"leaflet":2}],24:[function(require,module,exports){
var L = require('leaflet'),
	Util = require('../util');

module.exports = {
	class: L.Class.extend({
		options: {
			serviceUrl: 'https://photon.komoot.de/api/',
			reverseUrl: 'https://photon.komoot.de/reverse/',
			nameProperties: [
				'name',
				'street',
				'suburb',
				'hamlet',
				'town',
				'city',
				'state',
				'country'
			]
		},

		initialize: function(options) {
			L.setOptions(this, options);
		},

		geocode: function(query, cb, context) {
			var params = L.extend({
				q: query,
			}, this.options.geocodingQueryParams);

			Util.getJSON(this.options.serviceUrl, params, L.bind(function(data) {
				cb.call(context, this._decodeFeatures(data));
			}, this));
		},

		suggest: function(query, cb, context) {
			return this.geocode(query, cb, context);
		},

		reverse: function(latLng, scale, cb, context) {
			var params = L.extend({
				lat: latLng.lat,
				lon: latLng.lng
			}, this.options.geocodingQueryParams);

			Util.getJSON(this.options.reverseUrl, params, L.bind(function(data) {
				cb.call(context, this._decodeFeatures(data));
			}, this));
		},

		_decodeFeatures: function(data) {
			var results = [],
				i,
				f,
				c,
				latLng,
				extent,
				bbox;

			if (data && data.features) {
				for (i = 0; i < data.features.length; i++) {
					f = data.features[i];
					c = f.geometry.coordinates;
					latLng = L.latLng(c[1], c[0]);
					extent = f.properties.extent;

					if (extent) {
						bbox = L.latLngBounds([extent[1], extent[0]], [extent[3], extent[2]]);
					} else {
						bbox = L.latLngBounds(latLng, latLng);
					}

					results.push({
						name: this._deocodeFeatureName(f),
						center: latLng,
						bbox: bbox,
						properties: f.properties
					});
				}
			}

			return results;
		},

		_deocodeFeatureName: function(f) {
			var j,
				name;
			for (j = 0; !name && j < this.options.nameProperties.length; j++) {
				name = f.properties[this.options.nameProperties[j]];
			}

			return name;
		}
	}),

	factory: function(options) {
		return new L.Control.Geocoder.Photon(options);
	}
};

},{"../util":31,"leaflet":2}],25:[function(require,module,exports){
var L = require('leaflet'),
	Util = require('../util');

module.exports = {
	class: L.Class.extend({
		options: {
			serviceUrl: 'http://api.what3words.com/'
		},

		initialize: function(accessToken) {
			this._accessToken = accessToken;
		},

		geocode: function(query, cb, context) {
			//get three words and make a dot based string
			Util.getJSON(this.options.serviceUrl +'w3w', {
				key: this._accessToken,
				string: query.split(/\s+/).join('.'),
			}, function(data) {
				var results = [], loc, latLng, latLngBounds;
				if (data.position && data.position.length) {
					loc = data.words;
					latLng = L.latLng(data.position[0],data.position[1]);
					latLngBounds = L.latLngBounds(latLng, latLng);
					results[0] = {
						name: loc.join('.'),
						bbox: latLngBounds,
						center: latLng
					};
				}

				cb.call(context, results);
			});
		},

		suggest: function(query, cb, context) {
			return this.geocode(query, cb, context);
		},

		reverse: function(location, scale, cb, context) {
			Util.getJSON(this.options.serviceUrl +'position', {
				key: this._accessToken,
				position: [location.lat,location.lng].join(',')
			}, function(data) {
				var results = [],loc,latLng,latLngBounds;
				if (data.position && data.position.length) {
					loc = data.words;
					latLng = L.latLng(data.position[0],data.position[1]);
					latLngBounds = L.latLngBounds(latLng, latLng);
					results[0] = {
						name: loc.join('.'),
						bbox: latLngBounds,
						center: latLng
					};
				}
				cb.call(context, results);
			});
		}
	}),

	factory: function(accessToken) {
		return new L.Control.Geocoder.What3Words(accessToken);
	}
};

},{"../util":31,"leaflet":2}],26:[function(require,module,exports){
(function (global){
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),(f.L||(f.L={})).Routing=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function corslite(url, callback, cors) {
    var sent = false;

    if (typeof window.XMLHttpRequest === 'undefined') {
        return callback(Error('Browser not supported'));
    }

    if (typeof cors === 'undefined') {
        var m = url.match(/^\s*https?:\/\/[^\/]*/);
        cors = m && (m[0] !== location.protocol + '//' + location.domain +
                (location.port ? ':' + location.port : ''));
    }

    var x = new window.XMLHttpRequest();

    function isSuccessful(status) {
        return status >= 200 && status < 300 || status === 304;
    }

    if (cors && !('withCredentials' in x)) {
        // IE8-9
        x = new window.XDomainRequest();

        // Ensure callback is never called synchronously, i.e., before
        // x.send() returns (this has been observed in the wild).
        // See https://github.com/mapbox/mapbox.js/issues/472
        var original = callback;
        callback = function() {
            if (sent) {
                original.apply(this, arguments);
            } else {
                var that = this, args = arguments;
                setTimeout(function() {
                    original.apply(that, args);
                }, 0);
            }
        }
    }

    function loaded() {
        if (
            // XDomainRequest
            x.status === undefined ||
            // modern browsers
            isSuccessful(x.status)) callback.call(x, null, x);
        else callback.call(x, x, null);
    }

    // Both `onreadystatechange` and `onload` can fire. `onreadystatechange`
    // has [been supported for longer](http://stackoverflow.com/a/9181508/229001).
    if ('onload' in x) {
        x.onload = loaded;
    } else {
        x.onreadystatechange = function readystate() {
            if (x.readyState === 4) {
                loaded();
            }
        };
    }

    // Call the callback with the XMLHttpRequest object as an error and prevent
    // it from ever being called again by reassigning it to `noop`
    x.onerror = function error(evt) {
        // XDomainRequest provides no evt parameter
        callback.call(this, evt || true, null);
        callback = function() { };
    };

    // IE9 must have onprogress be set to a unique function.
    x.onprogress = function() { };

    x.ontimeout = function(evt) {
        callback.call(this, evt, null);
        callback = function() { };
    };

    x.onabort = function(evt) {
        callback.call(this, evt, null);
        callback = function() { };
    };

    // GET is the only supported HTTP Verb by XDomainRequest and is the
    // only one supported here.
    x.open('GET', url, true);

    // Send the request. Sending data is not supported.
    x.send(null);
    sent = true;

    return x;
}

if (typeof module !== 'undefined') module.exports = corslite;

},{}],2:[function(require,module,exports){
var polyline = {};

// Based off of [the offical Google document](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
//
// Some parts from [this implementation](http://facstaff.unca.edu/mcmcclur/GoogleMaps/EncodePolyline/PolylineEncoder.js)
// by [Mark McClure](http://facstaff.unca.edu/mcmcclur/)

function encode(coordinate, factor) {
    coordinate = Math.round(coordinate * factor);
    coordinate <<= 1;
    if (coordinate < 0) {
        coordinate = ~coordinate;
    }
    var output = '';
    while (coordinate >= 0x20) {
        output += String.fromCharCode((0x20 | (coordinate & 0x1f)) + 63);
        coordinate >>= 5;
    }
    output += String.fromCharCode(coordinate + 63);
    return output;
}

// This is adapted from the implementation in Project-OSRM
// https://github.com/DennisOSRM/Project-OSRM-Web/blob/master/WebContent/routing/OSRM.RoutingGeometry.js
polyline.decode = function(str, precision) {
    var index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision || 5);

    // Coordinates have variable length when encoded, so just keep
    // track of whether we've hit the end of the string. In each
    // loop iteration, a single coordinate is decoded.
    while (index < str.length) {

        // Reset shift, result, and byte
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
};

polyline.encode = function(coordinates, precision) {
    if (!coordinates.length) return '';

    var factor = Math.pow(10, precision || 5),
        output = encode(coordinates[0][0], factor) + encode(coordinates[0][1], factor);

    for (var i = 1; i < coordinates.length; i++) {
        var a = coordinates[i], b = coordinates[i - 1];
        output += encode(a[0] - b[0], factor);
        output += encode(a[1] - b[1], factor);
    }

    return output;
};

if (typeof module !== undefined) module.exports = polyline;

},{}],3:[function(require,module,exports){
(function() {
	'use strict';

	L.Routing = L.Routing || {};

	L.Routing.Autocomplete = L.Class.extend({
		options: {
			timeout: 500,
			blurTimeout: 100,
			noResultsMessage: 'No results found.'
		},

		initialize: function(elem, callback, context, options) {
			L.setOptions(this, options);

			this._elem = elem;
			this._resultFn = options.resultFn ? L.Util.bind(options.resultFn, options.resultContext) : null;
			this._autocomplete = options.autocompleteFn ? L.Util.bind(options.autocompleteFn, options.autocompleteContext) : null;
			this._selectFn = L.Util.bind(callback, context);
			this._container = L.DomUtil.create('div', 'leaflet-routing-geocoder-result');
			this._resultTable = L.DomUtil.create('table', '', this._container);

			// TODO: looks a bit like a kludge to register same for input and keypress -
			// browsers supporting both will get duplicate events; just registering
			// input will not catch enter, though.
			L.DomEvent.addListener(this._elem, 'input', this._keyPressed, this);
			L.DomEvent.addListener(this._elem, 'keypress', this._keyPressed, this);
			L.DomEvent.addListener(this._elem, 'keydown', this._keyDown, this);
			L.DomEvent.addListener(this._elem, 'blur', function() {
				if (this._isOpen) {
					this.close();
				}
			}, this);
		},

		close: function() {
			L.DomUtil.removeClass(this._container, 'leaflet-routing-geocoder-result-open');
			this._isOpen = false;
		},

		_open: function() {
			var rect = this._elem.getBoundingClientRect();
			if (!this._container.parentElement) {
				this._container.style.left = (rect.left + window.scrollX) + 'px';
				this._container.style.top = (rect.bottom + window.scrollY) + 'px';
				this._container.style.width = (rect.right - rect.left) + 'px';
				document.body.appendChild(this._container);
			}

			L.DomUtil.addClass(this._container, 'leaflet-routing-geocoder-result-open');
			this._isOpen = true;
		},

		_setResults: function(results) {
			var i,
			    tr,
			    td,
			    text;

			delete this._selection;
			this._results = results;

			while (this._resultTable.firstChild) {
				this._resultTable.removeChild(this._resultTable.firstChild);
			}

			for (i = 0; i < results.length; i++) {
				tr = L.DomUtil.create('tr', '', this._resultTable);
				tr.setAttribute('data-result-index', i);
				td = L.DomUtil.create('td', '', tr);
				text = document.createTextNode(results[i].name);
				td.appendChild(text);
				// mousedown + click because:
				// http://stackoverflow.com/questions/10652852/jquery-fire-click-before-blur-event
				L.DomEvent.addListener(td, 'mousedown', L.DomEvent.preventDefault);
				L.DomEvent.addListener(td, 'click', this._createClickListener(results[i]));
			}

			if (!i) {
				tr = L.DomUtil.create('tr', '', this._resultTable);
				td = L.DomUtil.create('td', 'leaflet-routing-geocoder-no-results', tr);
				td.innerHTML = this.options.noResultsMessage;
			}

			this._open();

			if (results.length > 0) {
				// Select the first entry
				this._select(1);
			}
		},

		_createClickListener: function(r) {
			var resultSelected = this._resultSelected(r);
			return L.bind(function() {
				this._elem.blur();
				resultSelected();
			}, this);
		},

		_resultSelected: function(r) {
			return L.bind(function() {
				this.close();
				this._elem.value = r.name;
				this._lastCompletedText = r.name;
				this._selectFn(r);
			}, this);
		},

		_keyPressed: function(e) {
			var index;

			if (this._isOpen && e.keyCode === 13 && this._selection) {
				index = parseInt(this._selection.getAttribute('data-result-index'), 10);
				this._resultSelected(this._results[index])();
				L.DomEvent.preventDefault(e);
				return;
			}

			if (e.keyCode === 13) {
				this._complete(this._resultFn, true);
				return;
			}

			if (this._autocomplete && document.activeElement === this._elem) {
				if (this._timer) {
					clearTimeout(this._timer);
				}
				this._timer = setTimeout(L.Util.bind(function() { this._complete(this._autocomplete); }, this),
					this.options.timeout);
				return;
			}

			this._unselect();
		},

		_select: function(dir) {
			var sel = this._selection;
			if (sel) {
				L.DomUtil.removeClass(sel.firstChild, 'leaflet-routing-geocoder-selected');
				sel = sel[dir > 0 ? 'nextSibling' : 'previousSibling'];
			}
			if (!sel) {
				sel = this._resultTable[dir > 0 ? 'firstChild' : 'lastChild'];
			}

			if (sel) {
				L.DomUtil.addClass(sel.firstChild, 'leaflet-routing-geocoder-selected');
				this._selection = sel;
			}
		},

		_unselect: function() {
			if (this._selection) {
				L.DomUtil.removeClass(this._selection.firstChild, 'leaflet-routing-geocoder-selected');
			}
			delete this._selection;
		},

		_keyDown: function(e) {
			if (this._isOpen) {
				switch (e.keyCode) {
				// Escape
				case 27:
					this.close();
					L.DomEvent.preventDefault(e);
					return;
				// Up
				case 38:
					this._select(-1);
					L.DomEvent.preventDefault(e);
					return;
				// Down
				case 40:
					this._select(1);
					L.DomEvent.preventDefault(e);
					return;
				}
			}
		},

		_complete: function(completeFn, trySelect) {
			var v = this._elem.value;
			function completeResults(results) {
				this._lastCompletedText = v;
				if (trySelect && results.length === 1) {
					this._resultSelected(results[0])();
				} else {
					this._setResults(results);
				}
			}

			if (!v) {
				return;
			}

			if (v !== this._lastCompletedText) {
				completeFn(v, completeResults, this);
			} else if (trySelect) {
				completeResults.call(this, this._results);
			}
		}
	});
})();

},{}],4:[function(require,module,exports){
(function (global){
(function() {
	'use strict';

	var L = (typeof window !== "undefined" ? window.L : typeof global !== "undefined" ? global.L : null);

	L.Routing = L.Routing || {};
	L.extend(L.Routing, require('./L.Routing.Itinerary'));
	L.extend(L.Routing, require('./L.Routing.Line'));
	L.extend(L.Routing, require('./L.Routing.Plan'));
	L.extend(L.Routing, require('./L.Routing.OSRM'));
	L.extend(L.Routing, require('./L.Routing.ErrorControl'));

	L.Routing.Control = L.Routing.Itinerary.extend({
		options: {
			fitSelectedRoutes: 'smart',
			routeLine: function(route, options) { return L.Routing.line(route, options); },
			autoRoute: true,
			routeWhileDragging: false,
			routeDragInterval: 500,
			waypointMode: 'connect',
			useZoomParameter: false,
			showAlternatives: false
		},

		initialize: function(options) {
			L.Util.setOptions(this, options);

			this._router = this.options.router || new L.Routing.OSRM(options);
			this._plan = this.options.plan || L.Routing.plan(this.options.waypoints, options);
			this._requestCount = 0;

			L.Routing.Itinerary.prototype.initialize.call(this, options);

			this.on('routeselected', this._routeSelected, this);
			this._plan.on('waypointschanged', this._onWaypointsChanged, this);
			if (options.routeWhileDragging) {
				this._setupRouteDragging();
			}

			if (this.options.autoRoute) {
				this.route();
			}
		},

		onAdd: function(map) {
			var container = L.Routing.Itinerary.prototype.onAdd.call(this, map);

			this._map = map;
			this._map.addLayer(this._plan);

			if (this.options.useZoomParameter) {
				this._map.on('zoomend', function() {
					this.route({
						callback: L.bind(this._updateLineCallback, this)
					});
				}, this);
			}

			if (this._plan.options.geocoder) {
				container.insertBefore(this._plan.createGeocoders(), container.firstChild);
			}

			return container;
		},

		onRemove: function(map) {
			if (this._line) {
				map.removeLayer(this._line);
			}
			map.removeLayer(this._plan);
			return L.Routing.Itinerary.prototype.onRemove.call(this, map);
		},

		getWaypoints: function() {
			return this._plan.getWaypoints();
		},

		setWaypoints: function(waypoints) {
			this._plan.setWaypoints(waypoints);
			return this;
		},

		spliceWaypoints: function() {
			var removed = this._plan.spliceWaypoints.apply(this._plan, arguments);
			return removed;
		},

		getPlan: function() {
			return this._plan;
		},

		getRouter: function() {
			return this._router;
		},

		_routeSelected: function(e) {
			var route = e.route,
				alternatives = this.options.showAlternatives && e.alternatives,
				fitMode = this.options.fitSelectedRoutes,
				fitBounds =
					(fitMode === 'smart' && !this._waypointsVisible()) ||
					(fitMode !== 'smart' && fitMode);

			this._updateLines({route: route, alternatives: alternatives});

			if (fitBounds) {
				this._map.fitBounds(this._line.getBounds());
			}

			if (this.options.waypointMode === 'snap') {
				this._plan.off('waypointschanged', this._onWaypointsChanged, this);
				this.setWaypoints(route.waypoints);
				this._plan.on('waypointschanged', this._onWaypointsChanged, this);
			}
		},

		_waypointsVisible: function() {
			var wps = this.getWaypoints(),
				mapSize,
				bounds,
				boundsSize,
				i,
				p;

			try {
				mapSize = this._map.getSize();

				for (i = 0; i < wps.length; i++) {
					p = this._map.latLngToLayerPoint(wps[i].latLng);

					if (bounds) {
						bounds.extend(p);
					} else {
						bounds = L.bounds([p]);
					}
				}

				boundsSize = bounds.getSize();
				return (boundsSize.x > mapSize.x / 5 ||
					boundsSize.y > mapSize.y / 5) && this._waypointsInViewport();

			} catch (e) {
				return false;
			}
		},

		_waypointsInViewport: function() {
			var wps = this.getWaypoints(),
				mapBounds,
				i;

			try {
				mapBounds = this._map.getBounds();
			} catch (e) {
				return false;
			}

			for (i = 0; i < wps.length; i++) {
				if (mapBounds.contains(wps[i].latLng)) {
					return true;
				}
			}

			return false;
		},

		_updateLines: function(routes) {
			var addWaypoints = this.options.addWaypoints !== undefined ?
				this.options.addWaypoints : true;
			this._clearLines();

			// add alternatives first so they lie below the main route
			this._alternatives = [];
			if (routes.alternatives) routes.alternatives.forEach(function(alt, i) {
				this._alternatives[i] = this.options.routeLine(alt,
					L.extend({
						isAlternative: true
					}, this.options.altLineOptions || this.options.lineOptions));
				this._alternatives[i].addTo(this._map);
				this._hookAltEvents(this._alternatives[i]);
			}, this);

			this._line = this.options.routeLine(routes.route,
				L.extend({
					addWaypoints: addWaypoints,
					extendToWaypoints: this.options.waypointMode === 'connect'
				}, this.options.lineOptions));
			this._line.addTo(this._map);
			this._hookEvents(this._line);
		},

		_hookEvents: function(l) {
			l.on('linetouched', function(e) {
				this._plan.dragNewWaypoint(e);
			}, this);
		},

		_hookAltEvents: function(l) {
			l.on('linetouched', function(e) {
				var alts = this._routes.slice();
				var selected = alts.splice(e.target._route.routesIndex, 1)[0];
				this.fire('routeselected', {route: selected, alternatives: alts});
			}, this);
		},

		_onWaypointsChanged: function(e) {
			if (this.options.autoRoute) {
				this.route({});
			}
			if (!this._plan.isReady()) {
				this._clearLines();
				this._clearAlts();
			}
			this.fire('waypointschanged', {waypoints: e.waypoints});
		},

		_setupRouteDragging: function() {
			var timer = 0,
				waypoints;

			this._plan.on('waypointdrag', L.bind(function(e) {
				waypoints = e.waypoints;

				if (!timer) {
					timer = setTimeout(L.bind(function() {
						this.route({
							waypoints: waypoints,
							geometryOnly: true,
							callback: L.bind(this._updateLineCallback, this)
						});
						timer = undefined;
					}, this), this.options.routeDragInterval);
				}
			}, this));
			this._plan.on('waypointdragend', function() {
				if (timer) {
					clearTimeout(timer);
					timer = undefined;
				}
				this.route();
			}, this);
		},

		_updateLineCallback: function(err, routes) {
			if (!err) {
				this._updateLines({route: routes[0], alternatives: routes.slice(1) });
			} else {
				this._clearLines();
			}
		},

		route: function(options) {
			var ts = ++this._requestCount,
				wps;

			options = options || {};

			if (this._plan.isReady()) {
				if (this.options.useZoomParameter) {
					options.z = this._map && this._map.getZoom();
				}

				wps = options && options.waypoints || this._plan.getWaypoints();
				this.fire('routingstart', {waypoints: wps});
				this._router.route(wps, options.callback || function(err, routes) {
					// Prevent race among multiple requests,
					// by checking the current request's timestamp
					// against the last request's; ignore result if
					// this isn't the latest request.
					if (ts === this._requestCount) {
						this._clearLines();
						this._clearAlts();
						if (err) {
							this.fire('routingerror', {error: err});
							return;
						}

						routes.forEach(function(route, i) { route.routesIndex = i; });

						if (!options.geometryOnly) {
							this.fire('routesfound', {waypoints: wps, routes: routes});
							this.setAlternatives(routes);
						} else {
							var selectedRoute = routes.splice(0,1)[0];
							this._routeSelected({route: selectedRoute, alternatives: routes});
						}
					}
				}, this, options);
			}
		},

		_clearLines: function() {
			if (this._line) {
				this._map.removeLayer(this._line);
				delete this._line;
			}
			if (this._alternatives && this._alternatives.length) {
				for (var i in this._alternatives) {
					this._map.removeLayer(this._alternatives[i]);
				}
				this._alternatives = [];
			}
		}
	});

	L.Routing.control = function(options) {
		return new L.Routing.Control(options);
	};

	module.exports = L.Routing;
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./L.Routing.ErrorControl":5,"./L.Routing.Itinerary":8,"./L.Routing.Line":10,"./L.Routing.OSRM":12,"./L.Routing.Plan":13}],5:[function(require,module,exports){
(function() {
	'use strict';

	L.Routing = L.Routing || {};

	L.Routing.ErrorControl = L.Control.extend({
		options: {
			header: 'Routing error',
			formatMessage: function(error) {
				if (error.status < 0) {
					return 'Calculating the route caused an error. Technical description follows: <code><pre>' +
						error.message + '</pre></code';
				} else {
					return 'The route could not be calculated. ' +
						error.message;
				}
			}
		},

		initialize: function(routingControl, options) {
			L.Control.prototype.initialize.call(this, options);
			routingControl
				.on('routingerror', L.bind(function(e) {
					if (this._element) {
						this._element.children[1].innerHTML = this.options.formatMessage(e.error);
						this._element.style.visibility = 'visible';
					}
				}, this))
				.on('routingstart', L.bind(function() {
					if (this._element) {
						this._element.style.visibility = 'hidden';
					}
				}, this));
		},

		onAdd: function() {
			var header,
				message;

			this._element = L.DomUtil.create('div', 'leaflet-bar leaflet-routing-error');
			this._element.style.visibility = 'hidden';

			header = L.DomUtil.create('h3', null, this._element);
			message = L.DomUtil.create('span', null, this._element);

			header.innerHTML = this.options.header;

			return this._element;
		},

		onRemove: function() {
			delete this._element;
		}
	});

	L.Routing.errorControl = function(routingControl, options) {
		return new L.Routing.ErrorControl(routingControl, options);
	};
})();

},{}],6:[function(require,module,exports){
(function (global){
(function() {
	'use strict';

	var L = (typeof window !== "undefined" ? window.L : typeof global !== "undefined" ? global.L : null);

	L.Routing = L.Routing || {};

	L.extend(L.Routing, require('./L.Routing.Localization'));

	L.Routing.Formatter = L.Class.extend({
		options: {
			units: 'metric',
			unitNames: {
				meters: 'm',
				kilometers: 'km',
				yards: 'yd',
				miles: 'mi',
				hours: 'h',
				minutes: 'mín',
				seconds: 's'
			},
			language: 'en',
			roundingSensitivity: 1,
			distanceTemplate: '{value} {unit}'
		},

		initialize: function(options) {
			L.setOptions(this, options);
		},

		formatDistance: function(d /* Number (meters) */, sensitivity) {
			var un = this.options.unitNames,
				simpleRounding = sensitivity <= 0,
				round = simpleRounding ? function(v) { return v; } : L.bind(this._round, this),
			    v,
			    yards,
				data,
				pow10;

			if (this.options.units === 'imperial') {
				yards = d / 0.9144;
				if (yards >= 1000) {
					data = {
						value: round(d / 1609.344, sensitivity),
						unit: un.miles
					};
				} else {
					data = {
						value: round(yards, sensitivity),
						unit: un.yards
					};
				}
			} else {
				v = round(d, sensitivity);
				data = {
					value: v >= 1000 ? (v / 1000) : v,
					unit: v >= 1000 ? un.kilometers : un.meters
				};
			}

			if (simpleRounding) {
				pow10 = Math.pow(10, -sensitivity);
				data.value = Math.round(data.value * pow10) / pow10;
			}

			return L.Util.template(this.options.distanceTemplate, data);
		},

		_round: function(d, sensitivity) {
			var s = sensitivity || this.options.roundingSensitivity,
				pow10 = Math.pow(10, (Math.floor(d / s) + '').length - 1),
				r = Math.floor(d / pow10),
				p = (r > 5) ? pow10 : pow10 / 2;

			return Math.round(d / p) * p;
		},

		formatTime: function(t /* Number (seconds) */) {
			if (t > 86400) {
				return Math.round(t / 3600) + ' h';
			} else if (t > 3600) {
				return Math.floor(t / 3600) + ' h ' +
					Math.round((t % 3600) / 60) + ' min';
			} else if (t > 300) {
				return Math.round(t / 60) + ' min';
			} else if (t > 60) {
				return Math.floor(t / 60) + ' min' +
					(t % 60 !== 0 ? ' ' + (t % 60) + ' s' : '');
			} else {
				return t + ' s';
			}
		},

		formatInstruction: function(instr, i) {
			if (instr.text === undefined) {
				return L.Util.template(this._getInstructionTemplate(instr, i),
					L.extend({
						exitStr: instr.exit ? L.Routing.Localization[this.options.language].formatOrder(instr.exit) : '',
						dir: L.Routing.Localization[this.options.language].directions[instr.direction]
					},
					instr));
			} else {
				return instr.text;
			}
		},

		getIconName: function(instr, i) {
			switch (instr.type) {
			case 'Straight':
				return (i === 0 ? 'depart' : 'continue');
			case 'SlightRight':
				return 'bear-right';
			case 'Right':
				return 'turn-right';
			case 'SharpRight':
				return 'sharp-right';
			case 'TurnAround':
				return 'u-turn';
			case 'SharpLeft':
				return 'sharp-left';
			case 'Left':
				return 'turn-left';
			case 'SlightLeft':
				return 'bear-left';
			case 'WaypointReached':
				return 'via';
			case 'Roundabout':
				return 'enter-roundabout';
			case 'DestinationReached':
				return 'arrive';
			}
		},

		_getInstructionTemplate: function(instr, i) {
			var type = instr.type === 'Straight' ? (i === 0 ? 'Head' : 'Continue') : instr.type,
				strings = L.Routing.Localization[this.options.language].instructions[type];

			return strings[0] + (strings.length > 1 && instr.road ? strings[1] : '');
		}
	});

	module.exports = L.Routing;
})();


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./L.Routing.Localization":11}],7:[function(require,module,exports){
(function (global){
(function() {
	'use strict';

	var L = (typeof window !== "undefined" ? window.L : typeof global !== "undefined" ? global.L : null);
	L.Routing = L.Routing || {};
	L.extend(L.Routing, require('./L.Routing.Autocomplete'));

	function selectInputText(input) {
		if (input.setSelectionRange) {
			// On iOS, select() doesn't work
			input.setSelectionRange(0, 9999);
		} else {
			// On at least IE8, setSeleectionRange doesn't exist
			input.select();
		}
	}

	L.Routing.GeocoderElement = L.Class.extend({
		includes: L.Mixin.Events,

		options: {
			createGeocoder: function(i, nWps, options) {
				var container = L.DomUtil.create('div', 'leaflet-routing-geocoder'),
					input = L.DomUtil.create('input', '', container),
					remove = options.addWaypoints ? L.DomUtil.create('span', 'leaflet-routing-remove-waypoint', container) : undefined;

				input.disabled = !options.addWaypoints;

				return {
					container: container,
					input: input,
					closeButton: remove
				};
			},
			geocoderPlaceholder: function(i, numberWaypoints, plan) {
				var l = L.Routing.Localization[plan.options.language].ui;
				return i === 0 ?
					l.startPlaceholder :
					(i < numberWaypoints - 1 ?
						L.Util.template(l.viaPlaceholder, {viaNumber: i}) :
						l.endPlaceholder);
			},

			geocoderClass: function() {
				return '';
			},

			waypointNameFallback: function(latLng) {
				var ns = latLng.lat < 0 ? 'S' : 'N',
					ew = latLng.lng < 0 ? 'W' : 'E',
					lat = (Math.round(Math.abs(latLng.lat) * 10000) / 10000).toString(),
					lng = (Math.round(Math.abs(latLng.lng) * 10000) / 10000).toString();
				return ns + lat + ', ' + ew + lng;
			},
			maxGeocoderTolerance: 200,
			autocompleteOptions: {},
			language: 'en',
		},

		initialize: function(wp, i, nWps, options) {
			L.setOptions(this, options);

			var g = this.options.createGeocoder(i, nWps, this.options),
				closeButton = g.closeButton,
				geocoderInput = g.input;
			geocoderInput.setAttribute('placeholder', this.options.geocoderPlaceholder(i, nWps, this));
			geocoderInput.className = this.options.geocoderClass(i, nWps);

			this._element = g;
			this._waypoint = wp;

			this.update();
			// This has to be here, or geocoder's value will not be properly
			// initialized.
			// TODO: look into why and make _updateWaypointName fix this.
			geocoderInput.value = wp.name;

			L.DomEvent.addListener(geocoderInput, 'click', function() {
				selectInputText(this);
			}, geocoderInput);

			if (closeButton) {
				L.DomEvent.addListener(closeButton, 'click', function() {
					this.fire('delete', { waypoint: this._waypoint });
				}, this);
			}

			new L.Routing.Autocomplete(geocoderInput, function(r) {
					geocoderInput.value = r.name;
					wp.name = r.name;
					wp.latLng = r.center;
					this.fire('geocoded', { waypoint: wp, value: r });
				}, this, L.extend({
					resultFn: this.options.geocoder.geocode,
					resultContext: this.options.geocoder,
					autocompleteFn: this.options.geocoder.suggest,
					autocompleteContext: this.options.geocoder
				}, this.options.autocompleteOptions));
		},

		getContainer: function() {
			return this._element.container;
		},

		setValue: function(v) {
			this._element.input.value = v;
		},

		update: function(force) {
			var wp = this._waypoint,
				wpCoords;

			wp.name = wp.name || '';

			if (wp.latLng && (force || !wp.name)) {
				wpCoords = this.options.waypointNameFallback(wp.latLng);
				if (this.options.geocoder && this.options.geocoder.reverse) {
					this.options.geocoder.reverse(wp.latLng, 67108864 /* zoom 18 */, function(rs) {
						if (rs.length > 0 && rs[0].center.distanceTo(wp.latLng) < this.options.maxGeocoderTolerance) {
							wp.name = rs[0].name;
						} else {
							wp.name = wpCoords;
						}
						this._update();
					}, this);
				} else {
					wp.name = wpCoords;
					this._update();
				}
			}
		},

		focus: function() {
			var input = this._element.input;
			input.focus();
			selectInputText(input);
		},

		_update: function() {
			var wp = this._waypoint,
			    value = wp && wp.name ? wp.name : '';
			this.setValue(value);
			this.fire('reversegeocoded', {waypoint: wp, value: value});
		}
	});

	L.Routing.geocoderElement = function(wp, i, nWps, plan) {
		return new L.Routing.GeocoderElement(wp, i, nWps, plan);
	};

	module.exports = L.Routing;
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./L.Routing.Autocomplete":3}],8:[function(require,module,exports){
(function (global){
(function() {
	'use strict';

	var L = (typeof window !== "undefined" ? window.L : typeof global !== "undefined" ? global.L : null);

	L.Routing = L.Routing || {};
	L.extend(L.Routing, require('./L.Routing.Formatter'));
	L.extend(L.Routing, require('./L.Routing.ItineraryBuilder'));

	L.Routing.Itinerary = L.Control.extend({
		includes: L.Mixin.Events,

		options: {
			pointMarkerStyle: {
				radius: 5,
				color: '#03f',
				fillColor: 'white',
				opacity: 1,
				fillOpacity: 0.7
			},
			summaryTemplate: '<h2>{name}</h2><h3>{distance}, {time}</h3>',
			timeTemplate: '{time}',
			containerClassName: '',
			alternativeClassName: '',
			minimizedClassName: '',
			itineraryClassName: '',
			totalDistanceRoundingSensitivity: -1,
			show: true,
			collapsible: false,
			collapseBtn: function(itinerary) {
				var collapseBtn = L.DomUtil.create('span', itinerary.options.collapseBtnClass);
				L.DomEvent.on(collapseBtn, 'click', itinerary._toggle, itinerary);
				itinerary._container.insertBefore(collapseBtn, itinerary._container.firstChild);
			},
			collapseBtnClass: 'leaflet-routing-collapse-btn'
		},

		initialize: function(options) {
			L.setOptions(this, options);
			this._formatter = this.options.formatter || new L.Routing.Formatter(this.options);
			this._itineraryBuilder = this.options.itineraryBuilder || new L.Routing.ItineraryBuilder({
				containerClassName: this.options.itineraryClassName
			});
		},

		onAdd: function(map) {
			var collapsible = this.options.collapsible;

			collapsible = collapsible || (collapsible === undefined && map.getSize().x <= 640);

			this._container = L.DomUtil.create('div', 'leaflet-routing-container leaflet-bar ' +
				(!this.options.show ? 'leaflet-routing-container-hide ' : '') +
				(collapsible ? 'leaflet-routing-collapsible ' : '') +
				this.options.containerClassName);
			this._altContainer = this.createAlternativesContainer();
			this._container.appendChild(this._altContainer);
			L.DomEvent.disableClickPropagation(this._container);
			L.DomEvent.addListener(this._container, 'mousewheel', function(e) {
				L.DomEvent.stopPropagation(e);
			});

			if (collapsible) {
				this.options.collapseBtn(this);
			}

			return this._container;
		},

		onRemove: function() {
		},

		createAlternativesContainer: function() {
			return L.DomUtil.create('div', 'leaflet-routing-alternatives-container');
		},

		setAlternatives: function(routes) {
			var i,
			    alt,
			    altDiv;

			this._clearAlts();

			this._routes = routes;

			for (i = 0; i < this._routes.length; i++) {
				alt = this._routes[i];
				altDiv = this._createAlternative(alt, i);
				this._altContainer.appendChild(altDiv);
				this._altElements.push(altDiv);
			}

			this._selectRoute({route: this._routes[0], alternatives: this._routes.slice(1)});

			return this;
		},

		show: function() {
			L.DomUtil.removeClass(this._container, 'leaflet-routing-container-hide');
		},

		hide: function() {
			L.DomUtil.addClass(this._container, 'leaflet-routing-container-hide');
		},

		_toggle: function() {
			var collapsed = L.DomUtil.hasClass(this._container, 'leaflet-routing-container-hide');
			this[collapsed ? 'show' : 'hide']();
		},

		_createAlternative: function(alt, i) {
			var altDiv = L.DomUtil.create('div', 'leaflet-routing-alt ' +
				this.options.alternativeClassName +
				(i > 0 ? ' leaflet-routing-alt-minimized ' + this.options.minimizedClassName : '')),
				template = this.options.summaryTemplate,
				data = L.extend({
					name: alt.name,
					distance: this._formatter.formatDistance(alt.summary.totalDistance, this.options.totalDistanceRoundingSensitivity),
					time: this._formatter.formatTime(alt.summary.totalTime)
				}, alt);
			altDiv.innerHTML = typeof(template) === 'function' ? template(data) : L.Util.template(template, data);
			L.DomEvent.addListener(altDiv, 'click', this._onAltClicked, this);
			this.on('routeselected', this._selectAlt, this);

			altDiv.appendChild(this._createItineraryContainer(alt));
			return altDiv;
		},

		_clearAlts: function() {
			var el = this._altContainer;
			while (el && el.firstChild) {
				el.removeChild(el.firstChild);
			}

			this._altElements = [];
		},

		_createItineraryContainer: function(r) {
			var container = this._itineraryBuilder.createContainer(),
			    steps = this._itineraryBuilder.createStepsContainer(),
			    i,
			    instr,
			    step,
			    distance,
			    text,
			    icon;

			container.appendChild(steps);

			for (i = 0; i < r.instructions.length; i++) {
				instr = r.instructions[i];
				text = this._formatter.formatInstruction(instr, i);
				distance = this._formatter.formatDistance(instr.distance);
				icon = this._formatter.getIconName(instr, i);
				step = this._itineraryBuilder.createStep(text, distance, icon, steps);

				this._addRowListeners(step, r.coordinates[instr.index]);
			}

			return container;
		},

		_addRowListeners: function(row, coordinate) {
			L.DomEvent.addListener(row, 'mouseover', function() {
				this._marker = L.circleMarker(coordinate,
					this.options.pointMarkerStyle).addTo(this._map);
			}, this);
			L.DomEvent.addListener(row, 'mouseout', function() {
				if (this._marker) {
					this._map.removeLayer(this._marker);
					delete this._marker;
				}
			}, this);
			L.DomEvent.addListener(row, 'click', function(e) {
				this._map.panTo(coordinate);
				L.DomEvent.stopPropagation(e);
			}, this);
		},

		_onAltClicked: function(e) {
			var altElem = e.target || window.event.srcElement;
			while (!L.DomUtil.hasClass(altElem, 'leaflet-routing-alt')) {
				altElem = altElem.parentElement;
			}

			var j = this._altElements.indexOf(altElem);
			var alts = this._routes.slice();
			var route = alts.splice(j, 1)[0];

			this.fire('routeselected', {
				route: route,
				alternatives: alts
			});
		},

		_selectAlt: function(e) {
			var altElem,
			    j,
			    n,
			    classFn;

			altElem = this._altElements[e.route.routesIndex];

			if (L.DomUtil.hasClass(altElem, 'leaflet-routing-alt-minimized')) {
				for (j = 0; j < this._altElements.length; j++) {
					n = this._altElements[j];
					classFn = j === e.route.routesIndex ? 'removeClass' : 'addClass';
					L.DomUtil[classFn](n, 'leaflet-routing-alt-minimized');
					if (this.options.minimizedClassName) {
						L.DomUtil[classFn](n, this.options.minimizedClassName);
					}

					if (j !== e.route.routesIndex) n.scrollTop = 0;
				}
			}

			L.DomEvent.stop(e);
		},

		_selectRoute: function(routes) {
			if (this._marker) {
				this._map.removeLayer(this._marker);
				delete this._marker;
			}
			this.fire('routeselected', routes);
		}
	});

	L.Routing.itinerary = function(options) {
		return new L.Routing.Itinerary(options);
	};

	module.exports = L.Routing;
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./L.Routing.Formatter":6,"./L.Routing.ItineraryBuilder":9}],9:[function(require,module,exports){
(function (global){
(function() {
	'use strict';

	var L = (typeof window !== "undefined" ? window.L : typeof global !== "undefined" ? global.L : null);
	L.Routing = L.Routing || {};

	L.Routing.ItineraryBuilder = L.Class.extend({
		options: {
			containerClassName: ''
		},

		initialize: function(options) {
			L.setOptions(this, options);
		},

		createContainer: function(className) {
			var table = L.DomUtil.create('table', className || ''),
				colgroup = L.DomUtil.create('colgroup', '', table);

			L.DomUtil.create('col', 'leaflet-routing-instruction-icon', colgroup);
			L.DomUtil.create('col', 'leaflet-routing-instruction-text', colgroup);
			L.DomUtil.create('col', 'leaflet-routing-instruction-distance', colgroup);

			return table;
		},

		createStepsContainer: function() {
			return L.DomUtil.create('tbody', '');
		},

		createStep: function(text, distance, icon, steps) {
			var row = L.DomUtil.create('tr', '', steps),
				span,
				td;
			td = L.DomUtil.create('td', '', row);
			span = L.DomUtil.create('span', 'leaflet-routing-icon leaflet-routing-icon-'+icon, td);
			td.appendChild(span);
			td = L.DomUtil.create('td', '', row);
			td.appendChild(document.createTextNode(text));
			td = L.DomUtil.create('td', '', row);
			td.appendChild(document.createTextNode(distance));
			return row;
		}
	});

	module.exports = L.Routing;
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],10:[function(require,module,exports){
(function (global){
(function() {
	'use strict';

	var L = (typeof window !== "undefined" ? window.L : typeof global !== "undefined" ? global.L : null);

	L.Routing = L.Routing || {};

	L.Routing.Line = L.LayerGroup.extend({
		includes: L.Mixin.Events,

		options: {
			styles: [
				{color: 'black', opacity: 0.15, weight: 9},
				{color: 'white', opacity: 0.8, weight: 6},
				{color: 'red', opacity: 1, weight: 2}
			],
			missingRouteStyles: [
				{color: 'black', opacity: 0.15, weight: 7},
				{color: 'white', opacity: 0.6, weight: 4},
				{color: 'gray', opacity: 0.8, weight: 2, dashArray: '7,12'}
			],
			addWaypoints: true,
			extendToWaypoints: true,
			missingRouteTolerance: 10
		},

		initialize: function(route, options) {
			L.setOptions(this, options);
			L.LayerGroup.prototype.initialize.call(this, options);
			this._route = route;

			if (this.options.extendToWaypoints) {
				this._extendToWaypoints();
			}

			this._addSegment(
				route.coordinates,
				this.options.styles,
				this.options.addWaypoints);
		},

		addTo: function(map) {
			map.addLayer(this);
			return this;
		},
		getBounds: function() {
			return L.latLngBounds(this._route.coordinates);
		},

		_findWaypointIndices: function() {
			var wps = this._route.inputWaypoints,
			    indices = [],
			    i;
			for (i = 0; i < wps.length; i++) {
				indices.push(this._findClosestRoutePoint(wps[i].latLng));
			}

			return indices;
		},

		_findClosestRoutePoint: function(latlng) {
			var minDist = Number.MAX_VALUE,
				minIndex,
			    i,
			    d;

			for (i = this._route.coordinates.length - 1; i >= 0 ; i--) {
				// TODO: maybe do this in pixel space instead?
				d = latlng.distanceTo(this._route.coordinates[i]);
				if (d < minDist) {
					minIndex = i;
					minDist = d;
				}
			}

			return minIndex;
		},

		_extendToWaypoints: function() {
			var wps = this._route.inputWaypoints,
				wpIndices = this._getWaypointIndices(),
			    i,
			    wpLatLng,
			    routeCoord;

			for (i = 0; i < wps.length; i++) {
				wpLatLng = wps[i].latLng;
				routeCoord = L.latLng(this._route.coordinates[wpIndices[i]]);
				if (wpLatLng.distanceTo(routeCoord) >
					this.options.missingRouteTolerance) {
					this._addSegment([wpLatLng, routeCoord],
						this.options.missingRouteStyles);
				}
			}
		},

		_addSegment: function(coords, styles, mouselistener) {
			var i,
				pl;

			for (i = 0; i < styles.length; i++) {
				pl = L.polyline(coords, styles[i]);
				this.addLayer(pl);
				if (mouselistener) {
					pl.on('mousedown', this._onLineTouched, this);
				}
			}
		},

		_findNearestWpBefore: function(i) {
			var wpIndices = this._getWaypointIndices(),
				j = wpIndices.length - 1;
			while (j >= 0 && wpIndices[j] > i) {
				j--;
			}

			return j;
		},

		_onLineTouched: function(e) {
			var afterIndex = this._findNearestWpBefore(this._findClosestRoutePoint(e.latlng));
			this.fire('linetouched', {
				afterIndex: afterIndex,
				latlng: e.latlng
			});
		},

		_getWaypointIndices: function() {
			if (!this._wpIndices) {
				this._wpIndices = this._route.waypointIndices || this._findWaypointIndices();
			}

			return this._wpIndices;
		}
	});

	L.Routing.line = function(route, options) {
		return new L.Routing.Line(route, options);
	};

	module.exports = L.Routing;
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],11:[function(require,module,exports){
(function() {
	'use strict';
	L.Routing = L.Routing || {};

	L.Routing.Localization = {
		'en': {
			directions: {
				N: 'north',
				NE: 'northeast',
				E: 'east',
				SE: 'southeast',
				S: 'south',
				SW: 'southwest',
				W: 'west',
				NW: 'northwest'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Head {dir}', ' on {road}'],
				'Continue':
					['Continue {dir}', ' on {road}'],
				'SlightRight':
					['Slight right', ' onto {road}'],
				'Right':
					['Right', ' onto {road}'],
				'SharpRight':
					['Sharp right', ' onto {road}'],
				'TurnAround':
					['Turn around'],
				'SharpLeft':
					['Sharp left', ' onto {road}'],
				'Left':
					['Left', ' onto {road}'],
				'SlightLeft':
					['Slight left', ' onto {road}'],
				'WaypointReached':
					['Waypoint reached'],
				'Roundabout':
					['Take the {exitStr} exit in the roundabout', ' onto {road}'],
				'DestinationReached':
					['Destination reached'],
			},
			formatOrder: function(n) {
				var i = n % 10 - 1,
				suffix = ['st', 'nd', 'rd'];

				return suffix[i] ? n + suffix[i] : n + 'th';
			},
			ui: {
				startPlaceholder: 'Start',
				viaPlaceholder: 'Via {viaNumber}',
				endPlaceholder: 'End'
			}
		},

		'de': {
			directions: {
				N: 'Norden',
				NE: 'Nordosten',
				E: 'Osten',
				SE: 'Südosten',
				S: 'Süden',
				SW: 'Südwesten',
				W: 'Westen',
				NW: 'Nordwesten'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Richtung {dir}', ' auf {road}'],
				'Continue':
					['Geradeaus Richtung {dir}', ' auf {road}'],
				'SlightRight':
					['Leicht rechts abbiegen', ' auf {road}'],
				'Right':
					['Rechts abbiegen', ' auf {road}'],
				'SharpRight':
					['Scharf rechts abbiegen', ' auf {road}'],
				'TurnAround':
					['Wenden'],
				'SharpLeft':
					['Scharf links abbiegen', ' auf {road}'],
				'Left':
					['Links abbiegen', ' auf {road}'],
				'SlightLeft':
					['Leicht links abbiegen', ' auf {road}'],
				'WaypointReached':
					['Zwischenhalt erreicht'],
				'Roundabout':
					['Nehmen Sie die {exitStr} Ausfahrt im Kreisverkehr', ' auf {road}'],
				'DestinationReached':
					['Sie haben ihr Ziel erreicht'],
			},
			formatOrder: function(n) {
				return n + '.';
			},
			ui: {
				startPlaceholder: 'Start',
				viaPlaceholder: 'Via {viaNumber}',
				endPlaceholder: 'Ziel'
			}
		},

		'sv': {
			directions: {
				N: 'norr',
				NE: 'nordost',
				E: 'öst',
				SE: 'sydost',
				S: 'syd',
				SW: 'sydväst',
				W: 'väst',
				NW: 'nordväst'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Åk åt {dir}', ' på {road}'],
				'Continue':
					['Fortsätt {dir}', ' på {road}'],
				'SlightRight':
					['Svagt höger', ' på {road}'],
				'Right':
					['Sväng höger', ' på {road}'],
				'SharpRight':
					['Skarpt höger', ' på {road}'],
				'TurnAround':
					['Vänd'],
				'SharpLeft':
					['Skarpt vänster', ' på {road}'],
				'Left':
					['Sväng vänster', ' på {road}'],
				'SlightLeft':
					['Svagt vänster', ' på {road}'],
				'WaypointReached':
					['Viapunkt nådd'],
				'Roundabout':
					['Tag {exitStr} avfarten i rondellen', ' till {road}'],
				'DestinationReached':
					['Framme vid resans mål'],
			},
			formatOrder: function(n) {
				return ['första', 'andra', 'tredje', 'fjärde', 'femte',
					'sjätte', 'sjunde', 'åttonde', 'nionde', 'tionde'
					/* Can't possibly be more than ten exits, can there? */][n - 1];
			},
			ui: {
				startPlaceholder: 'Från',
				viaPlaceholder: 'Via {viaNumber}',
				endPlaceholder: 'Till'
			}
		},

		'sp': {
			directions: {
				N: 'norte',
				NE: 'noreste',
				E: 'este',
				SE: 'sureste',
				S: 'sur',
				SW: 'suroeste',
				W: 'oeste',
				NW: 'noroeste'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Derecho {dir}', ' sobre {road}'],
				'Continue':
					['Continuar {dir}', ' en {road}'],
				'SlightRight':
					['Leve giro a la derecha', ' sobre {road}'],
				'Right':
					['Derecha', ' sobre {road}'],
				'SharpRight':
					['Giro pronunciado a la derecha', ' sobre {road}'],
				'TurnAround':
					['Dar vuelta'],
				'SharpLeft':
					['Giro pronunciado a la izquierda', ' sobre {road}'],
				'Left':
					['Izquierda', ' en {road}'],
				'SlightLeft':
					['Leve giro a la izquierda', ' en {road}'],
				'WaypointReached':
					['Llegó a un punto del camino'],
				'Roundabout':
					['Tomar {exitStr} salida en la rotonda', ' en {road}'],
				'DestinationReached':
					['Llegada a destino'],
			},
			formatOrder: function(n) {
				return n + 'º';
			},
			ui: {
				startPlaceholder: 'Inicio',
				viaPlaceholder: 'Via {viaNumber}',
				endPlaceholder: 'Destino'
			}
		},
		'nl': {
			directions: {
				N: 'noordelijke',
				NE: 'noordoostelijke',
				E: 'oostelijke',
				SE: 'zuidoostelijke',
				S: 'zuidelijke',
				SW: 'zuidewestelijke',
				W: 'westelijke',
				NW: 'noordwestelijke'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Vertrek in {dir} richting', ' de {road} op'],
				'Continue':
					['Ga in {dir} richting', ' de {road} op'],
				'SlightRight':
					['Volg de weg naar rechts', ' de {road} op'],
				'Right':
					['Ga rechtsaf', ' de {road} op'],
				'SharpRight':
					['Ga scherpe bocht naar rechts', ' de {road} op'],
				'TurnAround':
					['Keer om'],
				'SharpLeft':
					['Ga scherpe bocht naar links', ' de {road} op'],
				'Left':
					['Ga linksaf', ' de {road} op'],
				'SlightLeft':
					['Volg de weg naar links', ' de {road} op'],
				'WaypointReached':
					['Aangekomen bij tussenpunt'],
				'Roundabout':
					['Neem de {exitStr} afslag op de rotonde', ' de {road} op'],
				'DestinationReached':
					['Aangekomen op eindpunt'],
			},
			formatOrder: function(n) {
				if (n === 1 || n >= 20) {
					return n + 'ste';
				} else {
					return n + 'de';
				}
			},
			ui: {
				startPlaceholder: 'Vertrekpunt',
				viaPlaceholder: 'Via {viaNumber}',
				endPlaceholder: 'Bestemming'
			}
		},
		'fr': {
			directions: {
				N: 'nord',
				NE: 'nord-est',
				E: 'est',
				SE: 'sud-est',
				S: 'sud',
				SW: 'sud-ouest',
				W: 'ouest',
				NW: 'nord-ouest'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Tout droit au {dir}', ' sur {road}'],
				'Continue':
					['Continuer au {dir}', ' sur {road}'],
				'SlightRight':
					['Légèrement à droite', ' sur {road}'],
				'Right':
					['A droite', ' sur {road}'],
				'SharpRight':
					['Complètement à droite', ' sur {road}'],
				'TurnAround':
					['Faire demi-tour'],
				'SharpLeft':
					['Complètement à gauche', ' sur {road}'],
				'Left':
					['A gauche', ' sur {road}'],
				'SlightLeft':
					['Légèrement à gauche', ' sur {road}'],
				'WaypointReached':
					['Point d\'étape atteint'],
				'Roundabout':
					['Au rond-point, prenez la {exitStr} sortie', ' sur {road}'],
				'DestinationReached':
					['Destination atteinte'],
			},
			formatOrder: function(n) {
				return n + 'º';
			},
			ui: {
				startPlaceholder: 'Départ',
				viaPlaceholder: 'Intermédiaire {viaNumber}',
				endPlaceholder: 'Arrivée'
			}
		},
		'it': {
			directions: {
				N: 'nord',
				NE: 'nord-est',
				E: 'est',
				SE: 'sud-est',
				S: 'sud',
				SW: 'sud-ovest',
				W: 'ovest',
				NW: 'nord-ovest'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Dritto verso {dir}', ' su {road}'],
				'Continue':
					['Continuare verso {dir}', ' su {road}'],
				'SlightRight':
					['Mantenere la destra', ' su {road}'],
				'Right':
					['A destra', ' su {road}'],
				'SharpRight':
					['Strettamente a destra', ' su {road}'],
				'TurnAround':
					['Fare inversione di marcia'],
				'SharpLeft':
					['Strettamente a sinistra', ' su {road}'],
				'Left':
					['A sinistra', ' sur {road}'],
				'SlightLeft':
					['Mantenere la sinistra', ' su {road}'],
				'WaypointReached':
					['Punto di passaggio raggiunto'],
				'Roundabout':
					['Alla rotonda, prendere la {exitStr} uscita'],
				'DestinationReached':
					['Destinazione raggiunta'],
			},
			formatOrder: function(n) {
				return n + 'º';
			},
			ui: {
				startPlaceholder: 'Partenza',
				viaPlaceholder: 'Intermedia {viaNumber}',
				endPlaceholder: 'Destinazione'
			}
		},
		'pt': {
			directions: {
				N: 'norte',
				NE: 'nordeste',
				E: 'leste',
				SE: 'sudeste',
				S: 'sul',
				SW: 'sudoeste',
				W: 'oeste',
				NW: 'noroeste'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Siga {dir}', ' na {road}'],
				'Continue':
					['Continue {dir}', ' na {road}'],
				'SlightRight':
					['Curva ligeira a direita', ' na {road}'],
				'Right':
					['Curva a direita', ' na {road}'],
				'SharpRight':
					['Curva fechada a direita', ' na {road}'],
				'TurnAround':
					['Retorne'],
				'SharpLeft':
					['Curva fechada a esquerda', ' na {road}'],
				'Left':
					['Curva a esquerda', ' na {road}'],
				'SlightLeft':
					['Curva ligueira a esquerda', ' na {road}'],
				'WaypointReached':
					['Ponto de interesse atingido'],
				'Roundabout':
					['Pegue a {exitStr} saída na rotatória', ' na {road}'],
				'DestinationReached':
					['Destino atingido'],
			},
			formatOrder: function(n) {
				return n + 'º';
			},
			ui: {
				startPlaceholder: 'Origem',
				viaPlaceholder: 'Intermédio {viaNumber}',
				endPlaceholder: 'Destino'
			}
		},
		'sk': {
			directions: {
				N: 'sever',
				NE: 'serverovýchod',
				E: 'východ',
				SE: 'juhovýchod',
				S: 'juh',
				SW: 'juhozápad',
				W: 'západ',
				NW: 'serverozápad'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Mierte na {dir}', ' na {road}'],
				'Continue':
					['Pokračujte na {dir}', ' na {road}'],
				'SlightRight':
					['Mierne doprava', ' na {road}'],
				'Right':
					['Doprava', ' na {road}'],
				'SharpRight':
					['Prudko doprava', ' na {road}'],
				'TurnAround':
					['Otočte sa'],
				'SharpLeft':
					['Prudko doľava', ' na {road}'],
				'Left':
					['Doľava', ' na {road}'],
				'SlightLeft':
					['Mierne doľava', ' na {road}'],
				'WaypointReached':
					['Ste v prejazdovom bode.'],
				'Roundabout':
					['Odbočte na {exitStr} výjazde', ' na {road}'],
				'DestinationReached':
					['Prišli ste do cieľa.'],
			},
			formatOrder: function(n) {
				var i = n % 10 - 1,
				suffix = ['.', '.', '.'];

				return suffix[i] ? n + suffix[i] : n + '.';
			},
			ui: {
				startPlaceholder: 'Začiatok',
				viaPlaceholder: 'Cez {viaNumber}',
				endPlaceholder: 'Koniec'
			}
		},
		'el': {
			directions: {
				N: 'βόρεια',
				NE: 'βορειοανατολικά',
				E: 'ανατολικά',
				SE: 'νοτιοανατολικά',
				S: 'νότια',
				SW: 'νοτιοδυτικά',
				W: 'δυτικά',
				NW: 'βορειοδυτικά'
			},
			instructions: {
				// instruction, postfix if the road is named
				'Head':
					['Κατευθυνθείτε {dir}', ' στην {road}'],
				'Continue':
					['Συνεχίστε {dir}', ' στην {road}'],
				'SlightRight':
					['Ελαφρώς δεξιά', ' στην {road}'],
				'Right':
					['Δεξιά', ' στην {road}'],
				'SharpRight':
					['Απότομη δεξιά στροφή', ' στην {road}'],
				'TurnAround':
					['Κάντε αναστροφή'],
				'SharpLeft':
					['Απότομη αριστερή στροφή', ' στην {road}'],
				'Left':
					['Αριστερά', ' στην {road}'],
				'SlightLeft':
					['Ελαφρώς αριστερά', ' στην {road}'],
				'WaypointReached':
					['Φτάσατε στο σημείο αναφοράς'],
				'Roundabout':
					['Ακολουθήστε την {exitStr} έξοδο στο κυκλικό κόμβο', ' στην {road}'],
				'DestinationReached':
					['Φτάσατε στον προορισμό σας'],
			},
			formatOrder: function(n) {
				return n + 'º';
			},
			ui: {
				startPlaceholder: 'Αφετηρία',
				viaPlaceholder: 'μέσω {viaNumber}',
				endPlaceholder: 'Προορισμός'
			}
		}
	};

	module.exports = L.Routing;
})();

},{}],12:[function(require,module,exports){
(function (global){
(function() {
	'use strict';

	var L = (typeof window !== "undefined" ? window.L : typeof global !== "undefined" ? global.L : null),
		corslite = require('corslite'),
		polyline = require('polyline');

	// Ignore camelcase naming for this file, since OSRM's API uses
	// underscores.
	/* jshint camelcase: false */

	L.Routing = L.Routing || {};
	L.extend(L.Routing, require('./L.Routing.Waypoint'));

	L.Routing.OSRM = L.Class.extend({
		options: {
			serviceUrl: 'https://router.project-osrm.org/viaroute',
			timeout: 30 * 1000,
			routingOptions: {},
			polylinePrecision: 6
		},

		initialize: function(options) {
			L.Util.setOptions(this, options);
			this._hints = {
				locations: {}
			};
		},

		route: function(waypoints, callback, context, options) {
			var timedOut = false,
				wps = [],
				url,
				timer,
				wp,
				i;

			url = this.buildRouteUrl(waypoints, L.extend({}, this.options.routingOptions, options));

			timer = setTimeout(function() {
				timedOut = true;
				callback.call(context || callback, {
					status: -1,
					message: 'OSRM request timed out.'
				});
			}, this.options.timeout);

			// Create a copy of the waypoints, since they
			// might otherwise be asynchronously modified while
			// the request is being processed.
			for (i = 0; i < waypoints.length; i++) {
				wp = waypoints[i];
				wps.push(new L.Routing.Waypoint(wp.latLng, wp.name, wp.options));
			}

			corslite(url, L.bind(function(err, resp) {
				var data,
					errorMessage,
					statusCode;

				clearTimeout(timer);
				if (!timedOut) {
					errorMessage = 'HTTP request failed: ' + err;
					statusCode = -1;

					if (!err) {
						try {
							data = JSON.parse(resp.responseText);
							try {
								return this._routeDone(data, wps, callback, context);
							} catch (ex) {
								statusCode = -3;
								errorMessage = ex.toString();
							}
						} catch (ex) {
							statusCode = -2;
							errorMessage = 'Error parsing OSRM response: ' + ex.toString();
						}
					}

					callback.call(context || callback, {
						status: statusCode,
						message: errorMessage
					});
				}
			}, this));

			return this;
		},

		_routeDone: function(response, inputWaypoints, callback, context) {
			var coordinates,
			    alts,
			    actualWaypoints,
			    i;

			context = context || callback;
			if (response.status !== 0 && response.status !== 200) {
				callback.call(context, {
					status: response.status,
					message: response.status_message
				});
				return;
			}

			coordinates = this._decodePolyline(response.route_geometry);
			actualWaypoints = this._toWaypoints(inputWaypoints, response.via_points);
			alts = [{
				name: this._createName(response.route_name),
				coordinates: coordinates,
				instructions: response.route_instructions ? this._convertInstructions(response.route_instructions) : [],
				summary: response.route_summary ? this._convertSummary(response.route_summary) : [],
				inputWaypoints: inputWaypoints,
				waypoints: actualWaypoints,
				waypointIndices: this._clampIndices(response.via_indices, coordinates)
			}];

			if (response.alternative_geometries) {
				for (i = 0; i < response.alternative_geometries.length; i++) {
					coordinates = this._decodePolyline(response.alternative_geometries[i]);
					alts.push({
						name: this._createName(response.alternative_names[i]),
						coordinates: coordinates,
						instructions: response.alternative_instructions[i] ? this._convertInstructions(response.alternative_instructions[i]) : [],
						summary: response.alternative_summaries[i] ? this._convertSummary(response.alternative_summaries[i]) : [],
						inputWaypoints: inputWaypoints,
						waypoints: actualWaypoints,
						waypointIndices: this._clampIndices(response.alternative_geometries.length === 1 ?
							// Unsure if this is a bug in OSRM or not, but alternative_indices
							// does not appear to be an array of arrays, at least not when there is
							// a single alternative route.
							response.alternative_indices : response.alternative_indices[i],
							coordinates)
					});
				}
			}

			// only versions <4.5.0 will support this flag
			if (response.hint_data) {
				this._saveHintData(response.hint_data, inputWaypoints);
			}
			callback.call(context, null, alts);
		},

		_decodePolyline: function(routeGeometry) {
			var cs = polyline.decode(routeGeometry, this.options.polylinePrecision),
				result = new Array(cs.length),
				i;
			for (i = cs.length - 1; i >= 0; i--) {
				result[i] = L.latLng(cs[i]);
			}

			return result;
		},

		_toWaypoints: function(inputWaypoints, vias) {
			var wps = [],
			    i;
			for (i = 0; i < vias.length; i++) {
				wps.push(L.Routing.waypoint(L.latLng(vias[i]),
				                            inputWaypoints[i].name,
				                            inputWaypoints[i].options));
			}

			return wps;
		},

		_createName: function(nameParts) {
			var name = '',
				i;

			for (i = 0; i < nameParts.length; i++) {
				if (nameParts[i]) {
					if (name) {
						name += ', ';
					}
					name += nameParts[i].charAt(0).toUpperCase() + nameParts[i].slice(1);
				}
			}

			return name;
		},

		buildRouteUrl: function(waypoints, options) {
			var locs = [],
				wp,
			    computeInstructions,
			    computeAlternative,
			    locationKey,
			    hint;

			for (var i = 0; i < waypoints.length; i++) {
				wp = waypoints[i];
				locationKey = this._locationKey(wp.latLng);
				locs.push('loc=' + locationKey);

				hint = this._hints.locations[locationKey];
				if (hint) {
					locs.push('hint=' + hint);
				}

				if (wp.options && wp.options.allowUTurn) {
					locs.push('u=true');
				}
			}

			computeAlternative = computeInstructions =
				!(options && options.geometryOnly);

			return this.options.serviceUrl + '?' +
				'instructions=' + computeInstructions.toString() + '&' +
				'alt=' + computeAlternative.toString() + '&' +
				(options.z ? 'z=' + options.z + '&' : '') +
				locs.join('&') +
				(this._hints.checksum !== undefined ? '&checksum=' + this._hints.checksum : '') +
				(options.fileformat ? '&output=' + options.fileformat : '') +
				(options.allowUTurns ? '&uturns=' + options.allowUTurns : '');
		},

		_locationKey: function(location) {
			return location.lat + ',' + location.lng;
		},

		_saveHintData: function(hintData, waypoints) {
			var loc;
			this._hints = {
				checksum: hintData.checksum,
				locations: {}
			};
			for (var i = hintData.locations.length - 1; i >= 0; i--) {
				loc = waypoints[i].latLng;
				this._hints.locations[this._locationKey(loc)] = hintData.locations[i];
			}
		},

		_convertSummary: function(osrmSummary) {
			return {
				totalDistance: osrmSummary.total_distance,
				totalTime: osrmSummary.total_time
			};
		},

		_convertInstructions: function(osrmInstructions) {
			var result = [],
			    i,
			    instr,
			    type,
			    driveDir;

			for (i = 0; i < osrmInstructions.length; i++) {
				instr = osrmInstructions[i];
				type = this._drivingDirectionType(instr[0]);
				driveDir = instr[0].split('-');
				if (type) {
					result.push({
						type: type,
						distance: instr[2],
						time: instr[4],
						road: instr[1],
						direction: instr[6],
						exit: driveDir.length > 1 ? driveDir[1] : undefined,
						index: instr[3]
					});
				}
			}

			return result;
		},

		_drivingDirectionType: function(d) {
			switch (parseInt(d, 10)) {
			case 1:
				return 'Straight';
			case 2:
				return 'SlightRight';
			case 3:
				return 'Right';
			case 4:
				return 'SharpRight';
			case 5:
				return 'TurnAround';
			case 6:
				return 'SharpLeft';
			case 7:
				return 'Left';
			case 8:
				return 'SlightLeft';
			case 9:
				return 'WaypointReached';
			case 10:
				// TODO: "Head on"
				// https://github.com/DennisOSRM/Project-OSRM/blob/master/DataStructures/TurnInstructions.h#L48
				return 'Straight';
			case 11:
			case 12:
				return 'Roundabout';
			case 15:
				return 'DestinationReached';
			default:
				return null;
			}
		},

		_clampIndices: function(indices, coords) {
			var maxCoordIndex = coords.length - 1,
				i;
			for (i = 0; i < indices.length; i++) {
				indices[i] = Math.min(maxCoordIndex, Math.max(indices[i], 0));
			}
			return indices;
		}
	});

	L.Routing.osrm = function(options) {
		return new L.Routing.OSRM(options);
	};

	module.exports = L.Routing;
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./L.Routing.Waypoint":14,"corslite":1,"polyline":2}],13:[function(require,module,exports){
(function (global){
(function() {
	'use strict';

	var L = (typeof window !== "undefined" ? window.L : typeof global !== "undefined" ? global.L : null);
	L.Routing = L.Routing || {};
	L.extend(L.Routing, require('./L.Routing.GeocoderElement'));
	L.extend(L.Routing, require('./L.Routing.Waypoint'));

	L.Routing.Plan = L.Class.extend({
		includes: L.Mixin.Events,

		options: {
			dragStyles: [
				{color: 'black', opacity: 0.15, weight: 9},
				{color: 'white', opacity: 0.8, weight: 6},
				{color: 'red', opacity: 1, weight: 2, dashArray: '7,12'}
			],
			draggableWaypoints: true,
			routeWhileDragging: false,
			addWaypoints: true,
			reverseWaypoints: false,
			addButtonClassName: '',
			language: 'en',
			createGeocoderElement: L.Routing.geocoderElement,
			createMarker: function(i, wp) {
				var options = {
						draggable: this.draggableWaypoints
					},
				    marker = L.marker(wp.latLng, options);

				return marker;
			},
			geocodersClassName: ''
		},

		initialize: function(waypoints, options) {
			L.Util.setOptions(this, options);
			this._waypoints = [];
			this.setWaypoints(waypoints);
		},

		isReady: function() {
			var i;
			for (i = 0; i < this._waypoints.length; i++) {
				if (!this._waypoints[i].latLng) {
					return false;
				}
			}

			return true;
		},

		getWaypoints: function() {
			var i,
				wps = [];

			for (i = 0; i < this._waypoints.length; i++) {
				wps.push(this._waypoints[i]);
			}

			return wps;
		},

		setWaypoints: function(waypoints) {
			var args = [0, this._waypoints.length].concat(waypoints);
			this.spliceWaypoints.apply(this, args);
			return this;
		},

		spliceWaypoints: function() {
			var args = [arguments[0], arguments[1]],
			    i;

			for (i = 2; i < arguments.length; i++) {
				args.push(arguments[i] && arguments[i].hasOwnProperty('latLng') ? arguments[i] : L.Routing.waypoint(arguments[i]));
			}

			[].splice.apply(this._waypoints, args);

			// Make sure there's always at least two waypoints
			while (this._waypoints.length < 2) {
				this.spliceWaypoints(this._waypoints.length, 0, null);
			}

			this._updateMarkers();
			this._fireChanged.apply(this, args);
		},

		onAdd: function(map) {
			this._map = map;
			this._updateMarkers();
		},

		onRemove: function() {
			var i;
			this._removeMarkers();

			if (this._newWp) {
				for (i = 0; i < this._newWp.lines.length; i++) {
					this._map.removeLayer(this._newWp.lines[i]);
				}
			}

			delete this._map;
		},

		createGeocoders: function() {
			var container = L.DomUtil.create('div', 'leaflet-routing-geocoders ' + this.options.geocodersClassName),
				waypoints = this._waypoints,
			    addWpBtn,
			    reverseBtn;

			this._geocoderContainer = container;
			this._geocoderElems = [];


			if (this.options.addWaypoints) {
				addWpBtn = L.DomUtil.create('button', 'leaflet-routing-add-waypoint ' + this.options.addButtonClassName, container);
				addWpBtn.setAttribute('type', 'button');
				L.DomEvent.addListener(addWpBtn, 'click', function() {
					this.spliceWaypoints(waypoints.length, 0, null);
				}, this);
			}

			if (this.options.reverseWaypoints) {
				reverseBtn = L.DomUtil.create('button', 'leaflet-routing-reverse-waypoints', container);
				reverseBtn.setAttribute('type', 'button');
				L.DomEvent.addListener(reverseBtn, 'click', function() {
					this._waypoints.reverse();
					this.setWaypoints(this._waypoints);
				}, this);
			}

			this._updateGeocoders();
			this.on('waypointsspliced', this._updateGeocoders);

			return container;
		},

		_createGeocoder: function(i) {
			var geocoder = this.options.createGeocoderElement(this._waypoints[i], i, this._waypoints.length, this.options);
			geocoder
			.on('delete', function() {
				if (i > 0 || this._waypoints.length > 2) {
					this.spliceWaypoints(i, 1);
				} else {
					this.spliceWaypoints(i, 1, new L.Routing.Waypoint());
				}
			}, this)
			.on('geocoded', function(e) {
				this._updateMarkers();
				this._fireChanged();
				this._focusGeocoder(i + 1);
				this.fire('waypointgeocoded', {
					waypointIndex: i,
					waypoint: e.waypoint
				});
			}, this)
			.on('reversegeocoded', function(e) {
				this.fire('waypointgeocoded', {
					waypointIndex: i,
					waypoint: e.waypoint
				});
			}, this);

			return geocoder;
		},

		_updateGeocoders: function() {
			var elems = [],
				i,
			    geocoderElem;

			for (i = 0; i < this._geocoderElems.length; i++) {
				this._geocoderContainer.removeChild(this._geocoderElems[i].getContainer());
			}

			for (i = this._waypoints.length - 1; i >= 0; i--) {
				geocoderElem = this._createGeocoder(i);
				this._geocoderContainer.insertBefore(geocoderElem.getContainer(), this._geocoderContainer.firstChild);
				elems.push(geocoderElem);
			}

			this._geocoderElems = elems.reverse();
		},

		_removeMarkers: function() {
			var i;
			if (this._markers) {
				for (i = 0; i < this._markers.length; i++) {
					if (this._markers[i]) {
						this._map.removeLayer(this._markers[i]);
					}
				}
			}
			this._markers = [];
		},

		_updateMarkers: function() {
			var i,
			    m;

			if (!this._map) {
				return;
			}

			this._removeMarkers();

			for (i = 0; i < this._waypoints.length; i++) {
				if (this._waypoints[i].latLng) {
					m = this.options.createMarker(i, this._waypoints[i], this._waypoints.length);
					if (m) {
						m.addTo(this._map);
						if (this.options.draggableWaypoints) {
							this._hookWaypointEvents(m, i);
						}
					}
				} else {
					m = null;
				}
				this._markers.push(m);
			}
		},

		_fireChanged: function() {
			this.fire('waypointschanged', {waypoints: this.getWaypoints()});

			if (arguments.length >= 2) {
				this.fire('waypointsspliced', {
					index: Array.prototype.shift.call(arguments),
					nRemoved: Array.prototype.shift.call(arguments),
					added: arguments
				});
			}
		},

		_hookWaypointEvents: function(m, i, trackMouseMove) {
			var eventLatLng = function(e) {
					return trackMouseMove ? e.latlng : e.target.getLatLng();
				},
				dragStart = L.bind(function(e) {
					this.fire('waypointdragstart', {index: i, latlng: eventLatLng(e)});
				}, this),
				drag = L.bind(function(e) {
					this._waypoints[i].latLng = eventLatLng(e);
					this.fire('waypointdrag', {index: i, latlng: eventLatLng(e)});
				}, this),
				dragEnd = L.bind(function(e) {
					this._waypoints[i].latLng = eventLatLng(e);
					this._waypoints[i].name = '';
					if (this._geocoderElems) {
						this._geocoderElems[i].update(true);
					}
					this.fire('waypointdragend', {index: i, latlng: eventLatLng(e)});
					this._fireChanged();
				}, this),
				mouseMove,
				mouseUp;

			if (trackMouseMove) {
				mouseMove = L.bind(function(e) {
					this._markers[i].setLatLng(e.latlng);
					drag(e);
				}, this);
				mouseUp = L.bind(function(e) {
					this._map.dragging.enable();
					this._map.off('mouseup', mouseUp);
					this._map.off('mousemove', mouseMove);
					dragEnd(e);
				}, this);
				this._map.dragging.disable();
				this._map.on('mousemove', mouseMove);
				this._map.on('mouseup', mouseUp);
				dragStart({latlng: this._waypoints[i].latLng});
			} else {
				m.on('dragstart', dragStart);
				m.on('drag', drag);
				m.on('dragend', dragEnd);
			}
		},

		dragNewWaypoint: function(e) {
			var newWpIndex = e.afterIndex + 1;
			if (this.options.routeWhileDragging) {
				this.spliceWaypoints(newWpIndex, 0, e.latlng);
				this._hookWaypointEvents(this._markers[newWpIndex], newWpIndex, true);
			} else {
				this._dragNewWaypoint(newWpIndex, e.latlng);
			}
		},

		_dragNewWaypoint: function(newWpIndex, initialLatLng) {
			var wp = new L.Routing.Waypoint(initialLatLng),
				prevWp = this._waypoints[newWpIndex - 1],
				nextWp = this._waypoints[newWpIndex],
				marker = this.options.createMarker(newWpIndex, wp, this._waypoints.length + 1),
				lines = [],
				mouseMove = L.bind(function(e) {
					var i;
					if (marker) {
						marker.setLatLng(e.latlng);
					}
					for (i = 0; i < lines.length; i++) {
						lines[i].spliceLatLngs(1, 1, e.latlng);
					}
				}, this),
				mouseUp = L.bind(function(e) {
					var i;
					if (marker) {
						this._map.removeLayer(marker);
					}
					for (i = 0; i < lines.length; i++) {
						this._map.removeLayer(lines[i]);
					}
					this._map.off('mousemove', mouseMove);
					this._map.off('mouseup', mouseUp);
					this.spliceWaypoints(newWpIndex, 0, e.latlng);
				}, this),
				i;

			if (marker) {
				marker.addTo(this._map);
			}

			for (i = 0; i < this.options.dragStyles.length; i++) {
				lines.push(L.polyline([prevWp.latLng, initialLatLng, nextWp.latLng],
					this.options.dragStyles[i]).addTo(this._map));
			}

			this._map.on('mousemove', mouseMove);
			this._map.on('mouseup', mouseUp);
		},

		_focusGeocoder: function(i) {
			if (this._geocoderElems[i]) {
				this._geocoderElems[i].focus();
			} else {
				document.activeElement.blur();
			}
		}
	});

	L.Routing.plan = function(waypoints, options) {
		return new L.Routing.Plan(waypoints, options);
	};

	module.exports = L.Routing;
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./L.Routing.GeocoderElement":7,"./L.Routing.Waypoint":14}],14:[function(require,module,exports){
(function (global){
(function() {
	'use strict';

	var L = (typeof window !== "undefined" ? window.L : typeof global !== "undefined" ? global.L : null);
	L.Routing = L.Routing || {};

	L.Routing.Waypoint = L.Class.extend({
			options: {
				allowUTurn: false,
			},
			initialize: function(latLng, name, options) {
				L.Util.setOptions(this, options);
				this.latLng = L.latLng(latLng);
				this.name = name;
			}
		});

	L.Routing.waypoint = function(latLng, name, options) {
		return new L.Routing.Waypoint(latLng, name, options);
	};

	module.exports = L.Routing;
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[4])(4)
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9sZWFmbGV0LXJvdXRpbmctbWFjaGluZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIiFmdW5jdGlvbihlKXtpZihcIm9iamVjdFwiPT10eXBlb2YgZXhwb3J0cyYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZSltb2R1bGUuZXhwb3J0cz1lKCk7ZWxzZSBpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQpZGVmaW5lKFtdLGUpO2Vsc2V7dmFyIGY7XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdpbmRvdz9mPXdpbmRvdzpcInVuZGVmaW5lZFwiIT10eXBlb2YgZ2xvYmFsP2Y9Z2xvYmFsOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBzZWxmJiYoZj1zZWxmKSwoZi5MfHwoZi5MPXt9KSkuUm91dGluZz1lKCl9fShmdW5jdGlvbigpe3ZhciBkZWZpbmUsbW9kdWxlLGV4cG9ydHM7cmV0dXJuIChmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pKHsxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbmZ1bmN0aW9uIGNvcnNsaXRlKHVybCwgY2FsbGJhY2ssIGNvcnMpIHtcbiAgICB2YXIgc2VudCA9IGZhbHNlO1xuXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cuWE1MSHR0cFJlcXVlc3QgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhFcnJvcignQnJvd3NlciBub3Qgc3VwcG9ydGVkJykpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgY29ycyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdmFyIG0gPSB1cmwubWF0Y2goL15cXHMqaHR0cHM/OlxcL1xcL1teXFwvXSovKTtcbiAgICAgICAgY29ycyA9IG0gJiYgKG1bMF0gIT09IGxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIGxvY2F0aW9uLmRvbWFpbiArXG4gICAgICAgICAgICAgICAgKGxvY2F0aW9uLnBvcnQgPyAnOicgKyBsb2NhdGlvbi5wb3J0IDogJycpKTtcbiAgICB9XG5cbiAgICB2YXIgeCA9IG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIGZ1bmN0aW9uIGlzU3VjY2Vzc2Z1bChzdGF0dXMpIHtcbiAgICAgICAgcmV0dXJuIHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDwgMzAwIHx8IHN0YXR1cyA9PT0gMzA0O1xuICAgIH1cblxuICAgIGlmIChjb3JzICYmICEoJ3dpdGhDcmVkZW50aWFscycgaW4geCkpIHtcbiAgICAgICAgLy8gSUU4LTlcbiAgICAgICAgeCA9IG5ldyB3aW5kb3cuWERvbWFpblJlcXVlc3QoKTtcblxuICAgICAgICAvLyBFbnN1cmUgY2FsbGJhY2sgaXMgbmV2ZXIgY2FsbGVkIHN5bmNocm9ub3VzbHksIGkuZS4sIGJlZm9yZVxuICAgICAgICAvLyB4LnNlbmQoKSByZXR1cm5zICh0aGlzIGhhcyBiZWVuIG9ic2VydmVkIGluIHRoZSB3aWxkKS5cbiAgICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXBib3gvbWFwYm94LmpzL2lzc3Vlcy80NzJcbiAgICAgICAgdmFyIG9yaWdpbmFsID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoc2VudCkge1xuICAgICAgICAgICAgICAgIG9yaWdpbmFsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbC5hcHBseSh0aGF0LCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxvYWRlZCgpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgLy8gWERvbWFpblJlcXVlc3RcbiAgICAgICAgICAgIHguc3RhdHVzID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAgIC8vIG1vZGVybiBicm93c2Vyc1xuICAgICAgICAgICAgaXNTdWNjZXNzZnVsKHguc3RhdHVzKSkgY2FsbGJhY2suY2FsbCh4LCBudWxsLCB4KTtcbiAgICAgICAgZWxzZSBjYWxsYmFjay5jYWxsKHgsIHgsIG51bGwpO1xuICAgIH1cblxuICAgIC8vIEJvdGggYG9ucmVhZHlzdGF0ZWNoYW5nZWAgYW5kIGBvbmxvYWRgIGNhbiBmaXJlLiBgb25yZWFkeXN0YXRlY2hhbmdlYFxuICAgIC8vIGhhcyBbYmVlbiBzdXBwb3J0ZWQgZm9yIGxvbmdlcl0oaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvOTE4MTUwOC8yMjkwMDEpLlxuICAgIGlmICgnb25sb2FkJyBpbiB4KSB7XG4gICAgICAgIHgub25sb2FkID0gbG9hZGVkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHgub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gcmVhZHlzdGF0ZSgpIHtcbiAgICAgICAgICAgIGlmICh4LnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICBsb2FkZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBDYWxsIHRoZSBjYWxsYmFjayB3aXRoIHRoZSBYTUxIdHRwUmVxdWVzdCBvYmplY3QgYXMgYW4gZXJyb3IgYW5kIHByZXZlbnRcbiAgICAvLyBpdCBmcm9tIGV2ZXIgYmVpbmcgY2FsbGVkIGFnYWluIGJ5IHJlYXNzaWduaW5nIGl0IHRvIGBub29wYFxuICAgIHgub25lcnJvciA9IGZ1bmN0aW9uIGVycm9yKGV2dCkge1xuICAgICAgICAvLyBYRG9tYWluUmVxdWVzdCBwcm92aWRlcyBubyBldnQgcGFyYW1ldGVyXG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpcywgZXZ0IHx8IHRydWUsIG51bGwpO1xuICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKCkgeyB9O1xuICAgIH07XG5cbiAgICAvLyBJRTkgbXVzdCBoYXZlIG9ucHJvZ3Jlc3MgYmUgc2V0IHRvIGEgdW5pcXVlIGZ1bmN0aW9uLlxuICAgIHgub25wcm9ncmVzcyA9IGZ1bmN0aW9uKCkgeyB9O1xuXG4gICAgeC5vbnRpbWVvdXQgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBldnQsIG51bGwpO1xuICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKCkgeyB9O1xuICAgIH07XG5cbiAgICB4Lm9uYWJvcnQgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBldnQsIG51bGwpO1xuICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKCkgeyB9O1xuICAgIH07XG5cbiAgICAvLyBHRVQgaXMgdGhlIG9ubHkgc3VwcG9ydGVkIEhUVFAgVmVyYiBieSBYRG9tYWluUmVxdWVzdCBhbmQgaXMgdGhlXG4gICAgLy8gb25seSBvbmUgc3VwcG9ydGVkIGhlcmUuXG4gICAgeC5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xuXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdC4gU2VuZGluZyBkYXRhIGlzIG5vdCBzdXBwb3J0ZWQuXG4gICAgeC5zZW5kKG51bGwpO1xuICAgIHNlbnQgPSB0cnVlO1xuXG4gICAgcmV0dXJuIHg7XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykgbW9kdWxlLmV4cG9ydHMgPSBjb3JzbGl0ZTtcblxufSx7fV0sMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgcG9seWxpbmUgPSB7fTtcblxuLy8gQmFzZWQgb2ZmIG9mIFt0aGUgb2ZmaWNhbCBHb29nbGUgZG9jdW1lbnRdKGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL21hcHMvZG9jdW1lbnRhdGlvbi91dGlsaXRpZXMvcG9seWxpbmVhbGdvcml0aG0pXG4vL1xuLy8gU29tZSBwYXJ0cyBmcm9tIFt0aGlzIGltcGxlbWVudGF0aW9uXShodHRwOi8vZmFjc3RhZmYudW5jYS5lZHUvbWNtY2NsdXIvR29vZ2xlTWFwcy9FbmNvZGVQb2x5bGluZS9Qb2x5bGluZUVuY29kZXIuanMpXG4vLyBieSBbTWFyayBNY0NsdXJlXShodHRwOi8vZmFjc3RhZmYudW5jYS5lZHUvbWNtY2NsdXIvKVxuXG5mdW5jdGlvbiBlbmNvZGUoY29vcmRpbmF0ZSwgZmFjdG9yKSB7XG4gICAgY29vcmRpbmF0ZSA9IE1hdGgucm91bmQoY29vcmRpbmF0ZSAqIGZhY3Rvcik7XG4gICAgY29vcmRpbmF0ZSA8PD0gMTtcbiAgICBpZiAoY29vcmRpbmF0ZSA8IDApIHtcbiAgICAgICAgY29vcmRpbmF0ZSA9IH5jb29yZGluYXRlO1xuICAgIH1cbiAgICB2YXIgb3V0cHV0ID0gJyc7XG4gICAgd2hpbGUgKGNvb3JkaW5hdGUgPj0gMHgyMCkge1xuICAgICAgICBvdXRwdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoMHgyMCB8IChjb29yZGluYXRlICYgMHgxZikpICsgNjMpO1xuICAgICAgICBjb29yZGluYXRlID4+PSA1O1xuICAgIH1cbiAgICBvdXRwdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb29yZGluYXRlICsgNjMpO1xuICAgIHJldHVybiBvdXRwdXQ7XG59XG5cbi8vIFRoaXMgaXMgYWRhcHRlZCBmcm9tIHRoZSBpbXBsZW1lbnRhdGlvbiBpbiBQcm9qZWN0LU9TUk1cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9EZW5uaXNPU1JNL1Byb2plY3QtT1NSTS1XZWIvYmxvYi9tYXN0ZXIvV2ViQ29udGVudC9yb3V0aW5nL09TUk0uUm91dGluZ0dlb21ldHJ5LmpzXG5wb2x5bGluZS5kZWNvZGUgPSBmdW5jdGlvbihzdHIsIHByZWNpc2lvbikge1xuICAgIHZhciBpbmRleCA9IDAsXG4gICAgICAgIGxhdCA9IDAsXG4gICAgICAgIGxuZyA9IDAsXG4gICAgICAgIGNvb3JkaW5hdGVzID0gW10sXG4gICAgICAgIHNoaWZ0ID0gMCxcbiAgICAgICAgcmVzdWx0ID0gMCxcbiAgICAgICAgYnl0ZSA9IG51bGwsXG4gICAgICAgIGxhdGl0dWRlX2NoYW5nZSxcbiAgICAgICAgbG9uZ2l0dWRlX2NoYW5nZSxcbiAgICAgICAgZmFjdG9yID0gTWF0aC5wb3coMTAsIHByZWNpc2lvbiB8fCA1KTtcblxuICAgIC8vIENvb3JkaW5hdGVzIGhhdmUgdmFyaWFibGUgbGVuZ3RoIHdoZW4gZW5jb2RlZCwgc28ganVzdCBrZWVwXG4gICAgLy8gdHJhY2sgb2Ygd2hldGhlciB3ZSd2ZSBoaXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLiBJbiBlYWNoXG4gICAgLy8gbG9vcCBpdGVyYXRpb24sIGEgc2luZ2xlIGNvb3JkaW5hdGUgaXMgZGVjb2RlZC5cbiAgICB3aGlsZSAoaW5kZXggPCBzdHIubGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gUmVzZXQgc2hpZnQsIHJlc3VsdCwgYW5kIGJ5dGVcbiAgICAgICAgYnl0ZSA9IG51bGw7XG4gICAgICAgIHNoaWZ0ID0gMDtcbiAgICAgICAgcmVzdWx0ID0gMDtcblxuICAgICAgICBkbyB7XG4gICAgICAgICAgICBieXRlID0gc3RyLmNoYXJDb2RlQXQoaW5kZXgrKykgLSA2MztcbiAgICAgICAgICAgIHJlc3VsdCB8PSAoYnl0ZSAmIDB4MWYpIDw8IHNoaWZ0O1xuICAgICAgICAgICAgc2hpZnQgKz0gNTtcbiAgICAgICAgfSB3aGlsZSAoYnl0ZSA+PSAweDIwKTtcblxuICAgICAgICBsYXRpdHVkZV9jaGFuZ2UgPSAoKHJlc3VsdCAmIDEpID8gfihyZXN1bHQgPj4gMSkgOiAocmVzdWx0ID4+IDEpKTtcblxuICAgICAgICBzaGlmdCA9IHJlc3VsdCA9IDA7XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgYnl0ZSA9IHN0ci5jaGFyQ29kZUF0KGluZGV4KyspIC0gNjM7XG4gICAgICAgICAgICByZXN1bHQgfD0gKGJ5dGUgJiAweDFmKSA8PCBzaGlmdDtcbiAgICAgICAgICAgIHNoaWZ0ICs9IDU7XG4gICAgICAgIH0gd2hpbGUgKGJ5dGUgPj0gMHgyMCk7XG5cbiAgICAgICAgbG9uZ2l0dWRlX2NoYW5nZSA9ICgocmVzdWx0ICYgMSkgPyB+KHJlc3VsdCA+PiAxKSA6IChyZXN1bHQgPj4gMSkpO1xuXG4gICAgICAgIGxhdCArPSBsYXRpdHVkZV9jaGFuZ2U7XG4gICAgICAgIGxuZyArPSBsb25naXR1ZGVfY2hhbmdlO1xuXG4gICAgICAgIGNvb3JkaW5hdGVzLnB1c2goW2xhdCAvIGZhY3RvciwgbG5nIC8gZmFjdG9yXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvb3JkaW5hdGVzO1xufTtcblxucG9seWxpbmUuZW5jb2RlID0gZnVuY3Rpb24oY29vcmRpbmF0ZXMsIHByZWNpc2lvbikge1xuICAgIGlmICghY29vcmRpbmF0ZXMubGVuZ3RoKSByZXR1cm4gJyc7XG5cbiAgICB2YXIgZmFjdG9yID0gTWF0aC5wb3coMTAsIHByZWNpc2lvbiB8fCA1KSxcbiAgICAgICAgb3V0cHV0ID0gZW5jb2RlKGNvb3JkaW5hdGVzWzBdWzBdLCBmYWN0b3IpICsgZW5jb2RlKGNvb3JkaW5hdGVzWzBdWzFdLCBmYWN0b3IpO1xuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBjb29yZGluYXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgYSA9IGNvb3JkaW5hdGVzW2ldLCBiID0gY29vcmRpbmF0ZXNbaSAtIDFdO1xuICAgICAgICBvdXRwdXQgKz0gZW5jb2RlKGFbMF0gLSBiWzBdLCBmYWN0b3IpO1xuICAgICAgICBvdXRwdXQgKz0gZW5jb2RlKGFbMV0gLSBiWzFdLCBmYWN0b3IpO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gdW5kZWZpbmVkKSBtb2R1bGUuZXhwb3J0cyA9IHBvbHlsaW5lO1xuXG59LHt9XSwzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdEwuUm91dGluZyA9IEwuUm91dGluZyB8fCB7fTtcblxuXHRMLlJvdXRpbmcuQXV0b2NvbXBsZXRlID0gTC5DbGFzcy5leHRlbmQoe1xuXHRcdG9wdGlvbnM6IHtcblx0XHRcdHRpbWVvdXQ6IDUwMCxcblx0XHRcdGJsdXJUaW1lb3V0OiAxMDAsXG5cdFx0XHRub1Jlc3VsdHNNZXNzYWdlOiAnTm8gcmVzdWx0cyBmb3VuZC4nXG5cdFx0fSxcblxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKGVsZW0sIGNhbGxiYWNrLCBjb250ZXh0LCBvcHRpb25zKSB7XG5cdFx0XHRMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG5cblx0XHRcdHRoaXMuX2VsZW0gPSBlbGVtO1xuXHRcdFx0dGhpcy5fcmVzdWx0Rm4gPSBvcHRpb25zLnJlc3VsdEZuID8gTC5VdGlsLmJpbmQob3B0aW9ucy5yZXN1bHRGbiwgb3B0aW9ucy5yZXN1bHRDb250ZXh0KSA6IG51bGw7XG5cdFx0XHR0aGlzLl9hdXRvY29tcGxldGUgPSBvcHRpb25zLmF1dG9jb21wbGV0ZUZuID8gTC5VdGlsLmJpbmQob3B0aW9ucy5hdXRvY29tcGxldGVGbiwgb3B0aW9ucy5hdXRvY29tcGxldGVDb250ZXh0KSA6IG51bGw7XG5cdFx0XHR0aGlzLl9zZWxlY3RGbiA9IEwuVXRpbC5iaW5kKGNhbGxiYWNrLCBjb250ZXh0KTtcblx0XHRcdHRoaXMuX2NvbnRhaW5lciA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsICdsZWFmbGV0LXJvdXRpbmctZ2VvY29kZXItcmVzdWx0Jyk7XG5cdFx0XHR0aGlzLl9yZXN1bHRUYWJsZSA9IEwuRG9tVXRpbC5jcmVhdGUoJ3RhYmxlJywgJycsIHRoaXMuX2NvbnRhaW5lcik7XG5cblx0XHRcdC8vIFRPRE86IGxvb2tzIGEgYml0IGxpa2UgYSBrbHVkZ2UgdG8gcmVnaXN0ZXIgc2FtZSBmb3IgaW5wdXQgYW5kIGtleXByZXNzIC1cblx0XHRcdC8vIGJyb3dzZXJzIHN1cHBvcnRpbmcgYm90aCB3aWxsIGdldCBkdXBsaWNhdGUgZXZlbnRzOyBqdXN0IHJlZ2lzdGVyaW5nXG5cdFx0XHQvLyBpbnB1dCB3aWxsIG5vdCBjYXRjaCBlbnRlciwgdGhvdWdoLlxuXHRcdFx0TC5Eb21FdmVudC5hZGRMaXN0ZW5lcih0aGlzLl9lbGVtLCAnaW5wdXQnLCB0aGlzLl9rZXlQcmVzc2VkLCB0aGlzKTtcblx0XHRcdEwuRG9tRXZlbnQuYWRkTGlzdGVuZXIodGhpcy5fZWxlbSwgJ2tleXByZXNzJywgdGhpcy5fa2V5UHJlc3NlZCwgdGhpcyk7XG5cdFx0XHRMLkRvbUV2ZW50LmFkZExpc3RlbmVyKHRoaXMuX2VsZW0sICdrZXlkb3duJywgdGhpcy5fa2V5RG93biwgdGhpcyk7XG5cdFx0XHRMLkRvbUV2ZW50LmFkZExpc3RlbmVyKHRoaXMuX2VsZW0sICdibHVyJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9pc09wZW4pIHtcblx0XHRcdFx0XHR0aGlzLmNsb3NlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIHRoaXMpO1xuXHRcdH0sXG5cblx0XHRjbG9zZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRMLkRvbVV0aWwucmVtb3ZlQ2xhc3ModGhpcy5fY29udGFpbmVyLCAnbGVhZmxldC1yb3V0aW5nLWdlb2NvZGVyLXJlc3VsdC1vcGVuJyk7XG5cdFx0XHR0aGlzLl9pc09wZW4gPSBmYWxzZTtcblx0XHR9LFxuXG5cdFx0X29wZW46IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHJlY3QgPSB0aGlzLl9lbGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXHRcdFx0aWYgKCF0aGlzLl9jb250YWluZXIucGFyZW50RWxlbWVudCkge1xuXHRcdFx0XHR0aGlzLl9jb250YWluZXIuc3R5bGUubGVmdCA9IChyZWN0LmxlZnQgKyB3aW5kb3cuc2Nyb2xsWCkgKyAncHgnO1xuXHRcdFx0XHR0aGlzLl9jb250YWluZXIuc3R5bGUudG9wID0gKHJlY3QuYm90dG9tICsgd2luZG93LnNjcm9sbFkpICsgJ3B4Jztcblx0XHRcdFx0dGhpcy5fY29udGFpbmVyLnN0eWxlLndpZHRoID0gKHJlY3QucmlnaHQgLSByZWN0LmxlZnQpICsgJ3B4Jztcblx0XHRcdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLl9jb250YWluZXIpO1xuXHRcdFx0fVxuXG5cdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fY29udGFpbmVyLCAnbGVhZmxldC1yb3V0aW5nLWdlb2NvZGVyLXJlc3VsdC1vcGVuJyk7XG5cdFx0XHR0aGlzLl9pc09wZW4gPSB0cnVlO1xuXHRcdH0sXG5cblx0XHRfc2V0UmVzdWx0czogZnVuY3Rpb24ocmVzdWx0cykge1xuXHRcdFx0dmFyIGksXG5cdFx0XHQgICAgdHIsXG5cdFx0XHQgICAgdGQsXG5cdFx0XHQgICAgdGV4dDtcblxuXHRcdFx0ZGVsZXRlIHRoaXMuX3NlbGVjdGlvbjtcblx0XHRcdHRoaXMuX3Jlc3VsdHMgPSByZXN1bHRzO1xuXG5cdFx0XHR3aGlsZSAodGhpcy5fcmVzdWx0VGFibGUuZmlyc3RDaGlsZCkge1xuXHRcdFx0XHR0aGlzLl9yZXN1bHRUYWJsZS5yZW1vdmVDaGlsZCh0aGlzLl9yZXN1bHRUYWJsZS5maXJzdENoaWxkKTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHJlc3VsdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dHIgPSBMLkRvbVV0aWwuY3JlYXRlKCd0cicsICcnLCB0aGlzLl9yZXN1bHRUYWJsZSk7XG5cdFx0XHRcdHRyLnNldEF0dHJpYnV0ZSgnZGF0YS1yZXN1bHQtaW5kZXgnLCBpKTtcblx0XHRcdFx0dGQgPSBMLkRvbVV0aWwuY3JlYXRlKCd0ZCcsICcnLCB0cik7XG5cdFx0XHRcdHRleHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShyZXN1bHRzW2ldLm5hbWUpO1xuXHRcdFx0XHR0ZC5hcHBlbmRDaGlsZCh0ZXh0KTtcblx0XHRcdFx0Ly8gbW91c2Vkb3duICsgY2xpY2sgYmVjYXVzZTpcblx0XHRcdFx0Ly8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDY1Mjg1Mi9qcXVlcnktZmlyZS1jbGljay1iZWZvcmUtYmx1ci1ldmVudFxuXHRcdFx0XHRMLkRvbUV2ZW50LmFkZExpc3RlbmVyKHRkLCAnbW91c2Vkb3duJywgTC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCk7XG5cdFx0XHRcdEwuRG9tRXZlbnQuYWRkTGlzdGVuZXIodGQsICdjbGljaycsIHRoaXMuX2NyZWF0ZUNsaWNrTGlzdGVuZXIocmVzdWx0c1tpXSkpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIWkpIHtcblx0XHRcdFx0dHIgPSBMLkRvbVV0aWwuY3JlYXRlKCd0cicsICcnLCB0aGlzLl9yZXN1bHRUYWJsZSk7XG5cdFx0XHRcdHRkID0gTC5Eb21VdGlsLmNyZWF0ZSgndGQnLCAnbGVhZmxldC1yb3V0aW5nLWdlb2NvZGVyLW5vLXJlc3VsdHMnLCB0cik7XG5cdFx0XHRcdHRkLmlubmVySFRNTCA9IHRoaXMub3B0aW9ucy5ub1Jlc3VsdHNNZXNzYWdlO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9vcGVuKCk7XG5cblx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Ly8gU2VsZWN0IHRoZSBmaXJzdCBlbnRyeVxuXHRcdFx0XHR0aGlzLl9zZWxlY3QoMSk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdF9jcmVhdGVDbGlja0xpc3RlbmVyOiBmdW5jdGlvbihyKSB7XG5cdFx0XHR2YXIgcmVzdWx0U2VsZWN0ZWQgPSB0aGlzLl9yZXN1bHRTZWxlY3RlZChyKTtcblx0XHRcdHJldHVybiBMLmJpbmQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHRoaXMuX2VsZW0uYmx1cigpO1xuXHRcdFx0XHRyZXN1bHRTZWxlY3RlZCgpO1xuXHRcdFx0fSwgdGhpcyk7XG5cdFx0fSxcblxuXHRcdF9yZXN1bHRTZWxlY3RlZDogZnVuY3Rpb24ocikge1xuXHRcdFx0cmV0dXJuIEwuYmluZChmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xuXHRcdFx0XHR0aGlzLl9lbGVtLnZhbHVlID0gci5uYW1lO1xuXHRcdFx0XHR0aGlzLl9sYXN0Q29tcGxldGVkVGV4dCA9IHIubmFtZTtcblx0XHRcdFx0dGhpcy5fc2VsZWN0Rm4ocik7XG5cdFx0XHR9LCB0aGlzKTtcblx0XHR9LFxuXG5cdFx0X2tleVByZXNzZWQ6IGZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciBpbmRleDtcblxuXHRcdFx0aWYgKHRoaXMuX2lzT3BlbiAmJiBlLmtleUNvZGUgPT09IDEzICYmIHRoaXMuX3NlbGVjdGlvbikge1xuXHRcdFx0XHRpbmRleCA9IHBhcnNlSW50KHRoaXMuX3NlbGVjdGlvbi5nZXRBdHRyaWJ1dGUoJ2RhdGEtcmVzdWx0LWluZGV4JyksIDEwKTtcblx0XHRcdFx0dGhpcy5fcmVzdWx0U2VsZWN0ZWQodGhpcy5fcmVzdWx0c1tpbmRleF0pKCk7XG5cdFx0XHRcdEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQoZSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcblx0XHRcdFx0dGhpcy5fY29tcGxldGUodGhpcy5fcmVzdWx0Rm4sIHRydWUpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9hdXRvY29tcGxldGUgJiYgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhpcy5fZWxlbSkge1xuXHRcdFx0XHRpZiAodGhpcy5fdGltZXIpIHtcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGhpcy5fdGltZXIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuX3RpbWVyID0gc2V0VGltZW91dChMLlV0aWwuYmluZChmdW5jdGlvbigpIHsgdGhpcy5fY29tcGxldGUodGhpcy5fYXV0b2NvbXBsZXRlKTsgfSwgdGhpcyksXG5cdFx0XHRcdFx0dGhpcy5vcHRpb25zLnRpbWVvdXQpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuX3Vuc2VsZWN0KCk7XG5cdFx0fSxcblxuXHRcdF9zZWxlY3Q6IGZ1bmN0aW9uKGRpcikge1xuXHRcdFx0dmFyIHNlbCA9IHRoaXMuX3NlbGVjdGlvbjtcblx0XHRcdGlmIChzZWwpIHtcblx0XHRcdFx0TC5Eb21VdGlsLnJlbW92ZUNsYXNzKHNlbC5maXJzdENoaWxkLCAnbGVhZmxldC1yb3V0aW5nLWdlb2NvZGVyLXNlbGVjdGVkJyk7XG5cdFx0XHRcdHNlbCA9IHNlbFtkaXIgPiAwID8gJ25leHRTaWJsaW5nJyA6ICdwcmV2aW91c1NpYmxpbmcnXTtcblx0XHRcdH1cblx0XHRcdGlmICghc2VsKSB7XG5cdFx0XHRcdHNlbCA9IHRoaXMuX3Jlc3VsdFRhYmxlW2RpciA+IDAgPyAnZmlyc3RDaGlsZCcgOiAnbGFzdENoaWxkJ107XG5cdFx0XHR9XG5cblx0XHRcdGlmIChzZWwpIHtcblx0XHRcdFx0TC5Eb21VdGlsLmFkZENsYXNzKHNlbC5maXJzdENoaWxkLCAnbGVhZmxldC1yb3V0aW5nLWdlb2NvZGVyLXNlbGVjdGVkJyk7XG5cdFx0XHRcdHRoaXMuX3NlbGVjdGlvbiA9IHNlbDtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0X3Vuc2VsZWN0OiBmdW5jdGlvbigpIHtcblx0XHRcdGlmICh0aGlzLl9zZWxlY3Rpb24pIHtcblx0XHRcdFx0TC5Eb21VdGlsLnJlbW92ZUNsYXNzKHRoaXMuX3NlbGVjdGlvbi5maXJzdENoaWxkLCAnbGVhZmxldC1yb3V0aW5nLWdlb2NvZGVyLXNlbGVjdGVkJyk7XG5cdFx0XHR9XG5cdFx0XHRkZWxldGUgdGhpcy5fc2VsZWN0aW9uO1xuXHRcdH0sXG5cblx0XHRfa2V5RG93bjogZnVuY3Rpb24oZSkge1xuXHRcdFx0aWYgKHRoaXMuX2lzT3Blbikge1xuXHRcdFx0XHRzd2l0Y2ggKGUua2V5Q29kZSkge1xuXHRcdFx0XHQvLyBFc2NhcGVcblx0XHRcdFx0Y2FzZSAyNzpcblx0XHRcdFx0XHR0aGlzLmNsb3NlKCk7XG5cdFx0XHRcdFx0TC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdChlKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdC8vIFVwXG5cdFx0XHRcdGNhc2UgMzg6XG5cdFx0XHRcdFx0dGhpcy5fc2VsZWN0KC0xKTtcblx0XHRcdFx0XHRMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KGUpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0Ly8gRG93blxuXHRcdFx0XHRjYXNlIDQwOlxuXHRcdFx0XHRcdHRoaXMuX3NlbGVjdCgxKTtcblx0XHRcdFx0XHRMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KGUpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRfY29tcGxldGU6IGZ1bmN0aW9uKGNvbXBsZXRlRm4sIHRyeVNlbGVjdCkge1xuXHRcdFx0dmFyIHYgPSB0aGlzLl9lbGVtLnZhbHVlO1xuXHRcdFx0ZnVuY3Rpb24gY29tcGxldGVSZXN1bHRzKHJlc3VsdHMpIHtcblx0XHRcdFx0dGhpcy5fbGFzdENvbXBsZXRlZFRleHQgPSB2O1xuXHRcdFx0XHRpZiAodHJ5U2VsZWN0ICYmIHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0dGhpcy5fcmVzdWx0U2VsZWN0ZWQocmVzdWx0c1swXSkoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLl9zZXRSZXN1bHRzKHJlc3VsdHMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmICghdikge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmICh2ICE9PSB0aGlzLl9sYXN0Q29tcGxldGVkVGV4dCkge1xuXHRcdFx0XHRjb21wbGV0ZUZuKHYsIGNvbXBsZXRlUmVzdWx0cywgdGhpcyk7XG5cdFx0XHR9IGVsc2UgaWYgKHRyeVNlbGVjdCkge1xuXHRcdFx0XHRjb21wbGV0ZVJlc3VsdHMuY2FsbCh0aGlzLCB0aGlzLl9yZXN1bHRzKTtcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xufSkoKTtcblxufSx7fV0sNDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oZnVuY3Rpb24gKGdsb2JhbCl7XG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgTCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LkwgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLkwgOiBudWxsKTtcblxuXHRMLlJvdXRpbmcgPSBMLlJvdXRpbmcgfHwge307XG5cdEwuZXh0ZW5kKEwuUm91dGluZywgcmVxdWlyZSgnLi9MLlJvdXRpbmcuSXRpbmVyYXJ5JykpO1xuXHRMLmV4dGVuZChMLlJvdXRpbmcsIHJlcXVpcmUoJy4vTC5Sb3V0aW5nLkxpbmUnKSk7XG5cdEwuZXh0ZW5kKEwuUm91dGluZywgcmVxdWlyZSgnLi9MLlJvdXRpbmcuUGxhbicpKTtcblx0TC5leHRlbmQoTC5Sb3V0aW5nLCByZXF1aXJlKCcuL0wuUm91dGluZy5PU1JNJykpO1xuXHRMLmV4dGVuZChMLlJvdXRpbmcsIHJlcXVpcmUoJy4vTC5Sb3V0aW5nLkVycm9yQ29udHJvbCcpKTtcblxuXHRMLlJvdXRpbmcuQ29udHJvbCA9IEwuUm91dGluZy5JdGluZXJhcnkuZXh0ZW5kKHtcblx0XHRvcHRpb25zOiB7XG5cdFx0XHRmaXRTZWxlY3RlZFJvdXRlczogJ3NtYXJ0Jyxcblx0XHRcdHJvdXRlTGluZTogZnVuY3Rpb24ocm91dGUsIG9wdGlvbnMpIHsgcmV0dXJuIEwuUm91dGluZy5saW5lKHJvdXRlLCBvcHRpb25zKTsgfSxcblx0XHRcdGF1dG9Sb3V0ZTogdHJ1ZSxcblx0XHRcdHJvdXRlV2hpbGVEcmFnZ2luZzogZmFsc2UsXG5cdFx0XHRyb3V0ZURyYWdJbnRlcnZhbDogNTAwLFxuXHRcdFx0d2F5cG9pbnRNb2RlOiAnY29ubmVjdCcsXG5cdFx0XHR1c2Vab29tUGFyYW1ldGVyOiBmYWxzZSxcblx0XHRcdHNob3dBbHRlcm5hdGl2ZXM6IGZhbHNlXG5cdFx0fSxcblxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRcdEwuVXRpbC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xuXG5cdFx0XHR0aGlzLl9yb3V0ZXIgPSB0aGlzLm9wdGlvbnMucm91dGVyIHx8IG5ldyBMLlJvdXRpbmcuT1NSTShvcHRpb25zKTtcblx0XHRcdHRoaXMuX3BsYW4gPSB0aGlzLm9wdGlvbnMucGxhbiB8fCBMLlJvdXRpbmcucGxhbih0aGlzLm9wdGlvbnMud2F5cG9pbnRzLCBvcHRpb25zKTtcblx0XHRcdHRoaXMuX3JlcXVlc3RDb3VudCA9IDA7XG5cblx0XHRcdEwuUm91dGluZy5JdGluZXJhcnkucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuXHRcdFx0dGhpcy5vbigncm91dGVzZWxlY3RlZCcsIHRoaXMuX3JvdXRlU2VsZWN0ZWQsIHRoaXMpO1xuXHRcdFx0dGhpcy5fcGxhbi5vbignd2F5cG9pbnRzY2hhbmdlZCcsIHRoaXMuX29uV2F5cG9pbnRzQ2hhbmdlZCwgdGhpcyk7XG5cdFx0XHRpZiAob3B0aW9ucy5yb3V0ZVdoaWxlRHJhZ2dpbmcpIHtcblx0XHRcdFx0dGhpcy5fc2V0dXBSb3V0ZURyYWdnaW5nKCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLm9wdGlvbnMuYXV0b1JvdXRlKSB7XG5cdFx0XHRcdHRoaXMucm91dGUoKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0b25BZGQ6IGZ1bmN0aW9uKG1hcCkge1xuXHRcdFx0dmFyIGNvbnRhaW5lciA9IEwuUm91dGluZy5JdGluZXJhcnkucHJvdG90eXBlLm9uQWRkLmNhbGwodGhpcywgbWFwKTtcblxuXHRcdFx0dGhpcy5fbWFwID0gbWFwO1xuXHRcdFx0dGhpcy5fbWFwLmFkZExheWVyKHRoaXMuX3BsYW4pO1xuXG5cdFx0XHRpZiAodGhpcy5vcHRpb25zLnVzZVpvb21QYXJhbWV0ZXIpIHtcblx0XHRcdFx0dGhpcy5fbWFwLm9uKCd6b29tZW5kJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGhpcy5yb3V0ZSh7XG5cdFx0XHRcdFx0XHRjYWxsYmFjazogTC5iaW5kKHRoaXMuX3VwZGF0ZUxpbmVDYWxsYmFjaywgdGhpcylcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSwgdGhpcyk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9wbGFuLm9wdGlvbnMuZ2VvY29kZXIpIHtcblx0XHRcdFx0Y29udGFpbmVyLmluc2VydEJlZm9yZSh0aGlzLl9wbGFuLmNyZWF0ZUdlb2NvZGVycygpLCBjb250YWluZXIuZmlyc3RDaGlsZCk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBjb250YWluZXI7XG5cdFx0fSxcblxuXHRcdG9uUmVtb3ZlOiBmdW5jdGlvbihtYXApIHtcblx0XHRcdGlmICh0aGlzLl9saW5lKSB7XG5cdFx0XHRcdG1hcC5yZW1vdmVMYXllcih0aGlzLl9saW5lKTtcblx0XHRcdH1cblx0XHRcdG1hcC5yZW1vdmVMYXllcih0aGlzLl9wbGFuKTtcblx0XHRcdHJldHVybiBMLlJvdXRpbmcuSXRpbmVyYXJ5LnByb3RvdHlwZS5vblJlbW92ZS5jYWxsKHRoaXMsIG1hcCk7XG5cdFx0fSxcblxuXHRcdGdldFdheXBvaW50czogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fcGxhbi5nZXRXYXlwb2ludHMoKTtcblx0XHR9LFxuXG5cdFx0c2V0V2F5cG9pbnRzOiBmdW5jdGlvbih3YXlwb2ludHMpIHtcblx0XHRcdHRoaXMuX3BsYW4uc2V0V2F5cG9pbnRzKHdheXBvaW50cyk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXG5cdFx0c3BsaWNlV2F5cG9pbnRzOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciByZW1vdmVkID0gdGhpcy5fcGxhbi5zcGxpY2VXYXlwb2ludHMuYXBwbHkodGhpcy5fcGxhbiwgYXJndW1lbnRzKTtcblx0XHRcdHJldHVybiByZW1vdmVkO1xuXHRcdH0sXG5cblx0XHRnZXRQbGFuOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLl9wbGFuO1xuXHRcdH0sXG5cblx0XHRnZXRSb3V0ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3JvdXRlcjtcblx0XHR9LFxuXG5cdFx0X3JvdXRlU2VsZWN0ZWQ6IGZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciByb3V0ZSA9IGUucm91dGUsXG5cdFx0XHRcdGFsdGVybmF0aXZlcyA9IHRoaXMub3B0aW9ucy5zaG93QWx0ZXJuYXRpdmVzICYmIGUuYWx0ZXJuYXRpdmVzLFxuXHRcdFx0XHRmaXRNb2RlID0gdGhpcy5vcHRpb25zLmZpdFNlbGVjdGVkUm91dGVzLFxuXHRcdFx0XHRmaXRCb3VuZHMgPVxuXHRcdFx0XHRcdChmaXRNb2RlID09PSAnc21hcnQnICYmICF0aGlzLl93YXlwb2ludHNWaXNpYmxlKCkpIHx8XG5cdFx0XHRcdFx0KGZpdE1vZGUgIT09ICdzbWFydCcgJiYgZml0TW9kZSk7XG5cblx0XHRcdHRoaXMuX3VwZGF0ZUxpbmVzKHtyb3V0ZTogcm91dGUsIGFsdGVybmF0aXZlczogYWx0ZXJuYXRpdmVzfSk7XG5cblx0XHRcdGlmIChmaXRCb3VuZHMpIHtcblx0XHRcdFx0dGhpcy5fbWFwLmZpdEJvdW5kcyh0aGlzLl9saW5lLmdldEJvdW5kcygpKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMub3B0aW9ucy53YXlwb2ludE1vZGUgPT09ICdzbmFwJykge1xuXHRcdFx0XHR0aGlzLl9wbGFuLm9mZignd2F5cG9pbnRzY2hhbmdlZCcsIHRoaXMuX29uV2F5cG9pbnRzQ2hhbmdlZCwgdGhpcyk7XG5cdFx0XHRcdHRoaXMuc2V0V2F5cG9pbnRzKHJvdXRlLndheXBvaW50cyk7XG5cdFx0XHRcdHRoaXMuX3BsYW4ub24oJ3dheXBvaW50c2NoYW5nZWQnLCB0aGlzLl9vbldheXBvaW50c0NoYW5nZWQsIHRoaXMpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRfd2F5cG9pbnRzVmlzaWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd3BzID0gdGhpcy5nZXRXYXlwb2ludHMoKSxcblx0XHRcdFx0bWFwU2l6ZSxcblx0XHRcdFx0Ym91bmRzLFxuXHRcdFx0XHRib3VuZHNTaXplLFxuXHRcdFx0XHRpLFxuXHRcdFx0XHRwO1xuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRtYXBTaXplID0gdGhpcy5fbWFwLmdldFNpemUoKTtcblxuXHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgd3BzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0cCA9IHRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQod3BzW2ldLmxhdExuZyk7XG5cblx0XHRcdFx0XHRpZiAoYm91bmRzKSB7XG5cdFx0XHRcdFx0XHRib3VuZHMuZXh0ZW5kKHApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRib3VuZHMgPSBMLmJvdW5kcyhbcF0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJvdW5kc1NpemUgPSBib3VuZHMuZ2V0U2l6ZSgpO1xuXHRcdFx0XHRyZXR1cm4gKGJvdW5kc1NpemUueCA+IG1hcFNpemUueCAvIDUgfHxcblx0XHRcdFx0XHRib3VuZHNTaXplLnkgPiBtYXBTaXplLnkgLyA1KSAmJiB0aGlzLl93YXlwb2ludHNJblZpZXdwb3J0KCk7XG5cblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRfd2F5cG9pbnRzSW5WaWV3cG9ydDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd3BzID0gdGhpcy5nZXRXYXlwb2ludHMoKSxcblx0XHRcdFx0bWFwQm91bmRzLFxuXHRcdFx0XHRpO1xuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRtYXBCb3VuZHMgPSB0aGlzLl9tYXAuZ2V0Qm91bmRzKCk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHdwcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAobWFwQm91bmRzLmNvbnRhaW5zKHdwc1tpXS5sYXRMbmcpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0sXG5cblx0XHRfdXBkYXRlTGluZXM6IGZ1bmN0aW9uKHJvdXRlcykge1xuXHRcdFx0dmFyIGFkZFdheXBvaW50cyA9IHRoaXMub3B0aW9ucy5hZGRXYXlwb2ludHMgIT09IHVuZGVmaW5lZCA/XG5cdFx0XHRcdHRoaXMub3B0aW9ucy5hZGRXYXlwb2ludHMgOiB0cnVlO1xuXHRcdFx0dGhpcy5fY2xlYXJMaW5lcygpO1xuXG5cdFx0XHQvLyBhZGQgYWx0ZXJuYXRpdmVzIGZpcnN0IHNvIHRoZXkgbGllIGJlbG93IHRoZSBtYWluIHJvdXRlXG5cdFx0XHR0aGlzLl9hbHRlcm5hdGl2ZXMgPSBbXTtcblx0XHRcdGlmIChyb3V0ZXMuYWx0ZXJuYXRpdmVzKSByb3V0ZXMuYWx0ZXJuYXRpdmVzLmZvckVhY2goZnVuY3Rpb24oYWx0LCBpKSB7XG5cdFx0XHRcdHRoaXMuX2FsdGVybmF0aXZlc1tpXSA9IHRoaXMub3B0aW9ucy5yb3V0ZUxpbmUoYWx0LFxuXHRcdFx0XHRcdEwuZXh0ZW5kKHtcblx0XHRcdFx0XHRcdGlzQWx0ZXJuYXRpdmU6IHRydWVcblx0XHRcdFx0XHR9LCB0aGlzLm9wdGlvbnMuYWx0TGluZU9wdGlvbnMgfHwgdGhpcy5vcHRpb25zLmxpbmVPcHRpb25zKSk7XG5cdFx0XHRcdHRoaXMuX2FsdGVybmF0aXZlc1tpXS5hZGRUbyh0aGlzLl9tYXApO1xuXHRcdFx0XHR0aGlzLl9ob29rQWx0RXZlbnRzKHRoaXMuX2FsdGVybmF0aXZlc1tpXSk7XG5cdFx0XHR9LCB0aGlzKTtcblxuXHRcdFx0dGhpcy5fbGluZSA9IHRoaXMub3B0aW9ucy5yb3V0ZUxpbmUocm91dGVzLnJvdXRlLFxuXHRcdFx0XHRMLmV4dGVuZCh7XG5cdFx0XHRcdFx0YWRkV2F5cG9pbnRzOiBhZGRXYXlwb2ludHMsXG5cdFx0XHRcdFx0ZXh0ZW5kVG9XYXlwb2ludHM6IHRoaXMub3B0aW9ucy53YXlwb2ludE1vZGUgPT09ICdjb25uZWN0J1xuXHRcdFx0XHR9LCB0aGlzLm9wdGlvbnMubGluZU9wdGlvbnMpKTtcblx0XHRcdHRoaXMuX2xpbmUuYWRkVG8odGhpcy5fbWFwKTtcblx0XHRcdHRoaXMuX2hvb2tFdmVudHModGhpcy5fbGluZSk7XG5cdFx0fSxcblxuXHRcdF9ob29rRXZlbnRzOiBmdW5jdGlvbihsKSB7XG5cdFx0XHRsLm9uKCdsaW5ldG91Y2hlZCcsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dGhpcy5fcGxhbi5kcmFnTmV3V2F5cG9pbnQoZSk7XG5cdFx0XHR9LCB0aGlzKTtcblx0XHR9LFxuXG5cdFx0X2hvb2tBbHRFdmVudHM6IGZ1bmN0aW9uKGwpIHtcblx0XHRcdGwub24oJ2xpbmV0b3VjaGVkJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHR2YXIgYWx0cyA9IHRoaXMuX3JvdXRlcy5zbGljZSgpO1xuXHRcdFx0XHR2YXIgc2VsZWN0ZWQgPSBhbHRzLnNwbGljZShlLnRhcmdldC5fcm91dGUucm91dGVzSW5kZXgsIDEpWzBdO1xuXHRcdFx0XHR0aGlzLmZpcmUoJ3JvdXRlc2VsZWN0ZWQnLCB7cm91dGU6IHNlbGVjdGVkLCBhbHRlcm5hdGl2ZXM6IGFsdHN9KTtcblx0XHRcdH0sIHRoaXMpO1xuXHRcdH0sXG5cblx0XHRfb25XYXlwb2ludHNDaGFuZ2VkOiBmdW5jdGlvbihlKSB7XG5cdFx0XHRpZiAodGhpcy5vcHRpb25zLmF1dG9Sb3V0ZSkge1xuXHRcdFx0XHR0aGlzLnJvdXRlKHt9KTtcblx0XHRcdH1cblx0XHRcdGlmICghdGhpcy5fcGxhbi5pc1JlYWR5KCkpIHtcblx0XHRcdFx0dGhpcy5fY2xlYXJMaW5lcygpO1xuXHRcdFx0XHR0aGlzLl9jbGVhckFsdHMoKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuZmlyZSgnd2F5cG9pbnRzY2hhbmdlZCcsIHt3YXlwb2ludHM6IGUud2F5cG9pbnRzfSk7XG5cdFx0fSxcblxuXHRcdF9zZXR1cFJvdXRlRHJhZ2dpbmc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRpbWVyID0gMCxcblx0XHRcdFx0d2F5cG9pbnRzO1xuXG5cdFx0XHR0aGlzLl9wbGFuLm9uKCd3YXlwb2ludGRyYWcnLCBMLmJpbmQoZnVuY3Rpb24oZSkge1xuXHRcdFx0XHR3YXlwb2ludHMgPSBlLndheXBvaW50cztcblxuXHRcdFx0XHRpZiAoIXRpbWVyKSB7XG5cdFx0XHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KEwuYmluZChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHRoaXMucm91dGUoe1xuXHRcdFx0XHRcdFx0XHR3YXlwb2ludHM6IHdheXBvaW50cyxcblx0XHRcdFx0XHRcdFx0Z2VvbWV0cnlPbmx5OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRjYWxsYmFjazogTC5iaW5kKHRoaXMuX3VwZGF0ZUxpbmVDYWxsYmFjaywgdGhpcylcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0dGltZXIgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0fSwgdGhpcyksIHRoaXMub3B0aW9ucy5yb3V0ZURyYWdJbnRlcnZhbCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIHRoaXMpKTtcblx0XHRcdHRoaXMuX3BsYW4ub24oJ3dheXBvaW50ZHJhZ2VuZCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAodGltZXIpIHtcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xuXHRcdFx0XHRcdHRpbWVyID0gdW5kZWZpbmVkO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMucm91dGUoKTtcblx0XHRcdH0sIHRoaXMpO1xuXHRcdH0sXG5cblx0XHRfdXBkYXRlTGluZUNhbGxiYWNrOiBmdW5jdGlvbihlcnIsIHJvdXRlcykge1xuXHRcdFx0aWYgKCFlcnIpIHtcblx0XHRcdFx0dGhpcy5fdXBkYXRlTGluZXMoe3JvdXRlOiByb3V0ZXNbMF0sIGFsdGVybmF0aXZlczogcm91dGVzLnNsaWNlKDEpIH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fY2xlYXJMaW5lcygpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRyb3V0ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdFx0dmFyIHRzID0gKyt0aGlzLl9yZXF1ZXN0Q291bnQsXG5cdFx0XHRcdHdwcztcblxuXHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0XHRcdGlmICh0aGlzLl9wbGFuLmlzUmVhZHkoKSkge1xuXHRcdFx0XHRpZiAodGhpcy5vcHRpb25zLnVzZVpvb21QYXJhbWV0ZXIpIHtcblx0XHRcdFx0XHRvcHRpb25zLnogPSB0aGlzLl9tYXAgJiYgdGhpcy5fbWFwLmdldFpvb20oKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHdwcyA9IG9wdGlvbnMgJiYgb3B0aW9ucy53YXlwb2ludHMgfHwgdGhpcy5fcGxhbi5nZXRXYXlwb2ludHMoKTtcblx0XHRcdFx0dGhpcy5maXJlKCdyb3V0aW5nc3RhcnQnLCB7d2F5cG9pbnRzOiB3cHN9KTtcblx0XHRcdFx0dGhpcy5fcm91dGVyLnJvdXRlKHdwcywgb3B0aW9ucy5jYWxsYmFjayB8fCBmdW5jdGlvbihlcnIsIHJvdXRlcykge1xuXHRcdFx0XHRcdC8vIFByZXZlbnQgcmFjZSBhbW9uZyBtdWx0aXBsZSByZXF1ZXN0cyxcblx0XHRcdFx0XHQvLyBieSBjaGVja2luZyB0aGUgY3VycmVudCByZXF1ZXN0J3MgdGltZXN0YW1wXG5cdFx0XHRcdFx0Ly8gYWdhaW5zdCB0aGUgbGFzdCByZXF1ZXN0J3M7IGlnbm9yZSByZXN1bHQgaWZcblx0XHRcdFx0XHQvLyB0aGlzIGlzbid0IHRoZSBsYXRlc3QgcmVxdWVzdC5cblx0XHRcdFx0XHRpZiAodHMgPT09IHRoaXMuX3JlcXVlc3RDb3VudCkge1xuXHRcdFx0XHRcdFx0dGhpcy5fY2xlYXJMaW5lcygpO1xuXHRcdFx0XHRcdFx0dGhpcy5fY2xlYXJBbHRzKCk7XG5cdFx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuZmlyZSgncm91dGluZ2Vycm9yJywge2Vycm9yOiBlcnJ9KTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRyb3V0ZXMuZm9yRWFjaChmdW5jdGlvbihyb3V0ZSwgaSkgeyByb3V0ZS5yb3V0ZXNJbmRleCA9IGk7IH0pO1xuXG5cdFx0XHRcdFx0XHRpZiAoIW9wdGlvbnMuZ2VvbWV0cnlPbmx5KSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuZmlyZSgncm91dGVzZm91bmQnLCB7d2F5cG9pbnRzOiB3cHMsIHJvdXRlczogcm91dGVzfSk7XG5cdFx0XHRcdFx0XHRcdHRoaXMuc2V0QWx0ZXJuYXRpdmVzKHJvdXRlcyk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR2YXIgc2VsZWN0ZWRSb3V0ZSA9IHJvdXRlcy5zcGxpY2UoMCwxKVswXTtcblx0XHRcdFx0XHRcdFx0dGhpcy5fcm91dGVTZWxlY3RlZCh7cm91dGU6IHNlbGVjdGVkUm91dGUsIGFsdGVybmF0aXZlczogcm91dGVzfSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCB0aGlzLCBvcHRpb25zKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0X2NsZWFyTGluZXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKHRoaXMuX2xpbmUpIHtcblx0XHRcdFx0dGhpcy5fbWFwLnJlbW92ZUxheWVyKHRoaXMuX2xpbmUpO1xuXHRcdFx0XHRkZWxldGUgdGhpcy5fbGluZTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLl9hbHRlcm5hdGl2ZXMgJiYgdGhpcy5fYWx0ZXJuYXRpdmVzLmxlbmd0aCkge1xuXHRcdFx0XHRmb3IgKHZhciBpIGluIHRoaXMuX2FsdGVybmF0aXZlcykge1xuXHRcdFx0XHRcdHRoaXMuX21hcC5yZW1vdmVMYXllcih0aGlzLl9hbHRlcm5hdGl2ZXNbaV0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuX2FsdGVybmF0aXZlcyA9IFtdO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0TC5Sb3V0aW5nLmNvbnRyb2wgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0cmV0dXJuIG5ldyBMLlJvdXRpbmcuQ29udHJvbChvcHRpb25zKTtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IEwuUm91dGluZztcbn0pKCk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxufSx7XCIuL0wuUm91dGluZy5FcnJvckNvbnRyb2xcIjo1LFwiLi9MLlJvdXRpbmcuSXRpbmVyYXJ5XCI6OCxcIi4vTC5Sb3V0aW5nLkxpbmVcIjoxMCxcIi4vTC5Sb3V0aW5nLk9TUk1cIjoxMixcIi4vTC5Sb3V0aW5nLlBsYW5cIjoxM31dLDU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0TC5Sb3V0aW5nID0gTC5Sb3V0aW5nIHx8IHt9O1xuXG5cdEwuUm91dGluZy5FcnJvckNvbnRyb2wgPSBMLkNvbnRyb2wuZXh0ZW5kKHtcblx0XHRvcHRpb25zOiB7XG5cdFx0XHRoZWFkZXI6ICdSb3V0aW5nIGVycm9yJyxcblx0XHRcdGZvcm1hdE1lc3NhZ2U6IGZ1bmN0aW9uKGVycm9yKSB7XG5cdFx0XHRcdGlmIChlcnJvci5zdGF0dXMgPCAwKSB7XG5cdFx0XHRcdFx0cmV0dXJuICdDYWxjdWxhdGluZyB0aGUgcm91dGUgY2F1c2VkIGFuIGVycm9yLiBUZWNobmljYWwgZGVzY3JpcHRpb24gZm9sbG93czogPGNvZGU+PHByZT4nICtcblx0XHRcdFx0XHRcdGVycm9yLm1lc3NhZ2UgKyAnPC9wcmU+PC9jb2RlJztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gJ1RoZSByb3V0ZSBjb3VsZCBub3QgYmUgY2FsY3VsYXRlZC4gJyArXG5cdFx0XHRcdFx0XHRlcnJvci5tZXNzYWdlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKHJvdXRpbmdDb250cm9sLCBvcHRpb25zKSB7XG5cdFx0XHRMLkNvbnRyb2wucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBvcHRpb25zKTtcblx0XHRcdHJvdXRpbmdDb250cm9sXG5cdFx0XHRcdC5vbigncm91dGluZ2Vycm9yJywgTC5iaW5kKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRpZiAodGhpcy5fZWxlbWVudCkge1xuXHRcdFx0XHRcdFx0dGhpcy5fZWxlbWVudC5jaGlsZHJlblsxXS5pbm5lckhUTUwgPSB0aGlzLm9wdGlvbnMuZm9ybWF0TWVzc2FnZShlLmVycm9yKTtcblx0XHRcdFx0XHRcdHRoaXMuX2VsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIHRoaXMpKVxuXHRcdFx0XHQub24oJ3JvdXRpbmdzdGFydCcsIEwuYmluZChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAodGhpcy5fZWxlbWVudCkge1xuXHRcdFx0XHRcdFx0dGhpcy5fZWxlbWVudC5zdHlsZS52aXNpYmlsaXR5ID0gJ2hpZGRlbic7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCB0aGlzKSk7XG5cdFx0fSxcblxuXHRcdG9uQWRkOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBoZWFkZXIsXG5cdFx0XHRcdG1lc3NhZ2U7XG5cblx0XHRcdHRoaXMuX2VsZW1lbnQgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLCAnbGVhZmxldC1iYXIgbGVhZmxldC1yb3V0aW5nLWVycm9yJyk7XG5cdFx0XHR0aGlzLl9lbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSAnaGlkZGVuJztcblxuXHRcdFx0aGVhZGVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnaDMnLCBudWxsLCB0aGlzLl9lbGVtZW50KTtcblx0XHRcdG1lc3NhZ2UgPSBMLkRvbVV0aWwuY3JlYXRlKCdzcGFuJywgbnVsbCwgdGhpcy5fZWxlbWVudCk7XG5cblx0XHRcdGhlYWRlci5pbm5lckhUTUwgPSB0aGlzLm9wdGlvbnMuaGVhZGVyO1xuXG5cdFx0XHRyZXR1cm4gdGhpcy5fZWxlbWVudDtcblx0XHR9LFxuXG5cdFx0b25SZW1vdmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0ZGVsZXRlIHRoaXMuX2VsZW1lbnQ7XG5cdFx0fVxuXHR9KTtcblxuXHRMLlJvdXRpbmcuZXJyb3JDb250cm9sID0gZnVuY3Rpb24ocm91dGluZ0NvbnRyb2wsIG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gbmV3IEwuUm91dGluZy5FcnJvckNvbnRyb2wocm91dGluZ0NvbnRyb2wsIG9wdGlvbnMpO1xuXHR9O1xufSkoKTtcblxufSx7fV0sNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oZnVuY3Rpb24gKGdsb2JhbCl7XG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgTCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LkwgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLkwgOiBudWxsKTtcblxuXHRMLlJvdXRpbmcgPSBMLlJvdXRpbmcgfHwge307XG5cblx0TC5leHRlbmQoTC5Sb3V0aW5nLCByZXF1aXJlKCcuL0wuUm91dGluZy5Mb2NhbGl6YXRpb24nKSk7XG5cblx0TC5Sb3V0aW5nLkZvcm1hdHRlciA9IEwuQ2xhc3MuZXh0ZW5kKHtcblx0XHRvcHRpb25zOiB7XG5cdFx0XHR1bml0czogJ21ldHJpYycsXG5cdFx0XHR1bml0TmFtZXM6IHtcblx0XHRcdFx0bWV0ZXJzOiAnbScsXG5cdFx0XHRcdGtpbG9tZXRlcnM6ICdrbScsXG5cdFx0XHRcdHlhcmRzOiAneWQnLFxuXHRcdFx0XHRtaWxlczogJ21pJyxcblx0XHRcdFx0aG91cnM6ICdoJyxcblx0XHRcdFx0bWludXRlczogJ23DrW4nLFxuXHRcdFx0XHRzZWNvbmRzOiAncydcblx0XHRcdH0sXG5cdFx0XHRsYW5ndWFnZTogJ2VuJyxcblx0XHRcdHJvdW5kaW5nU2Vuc2l0aXZpdHk6IDEsXG5cdFx0XHRkaXN0YW5jZVRlbXBsYXRlOiAne3ZhbHVlfSB7dW5pdH0nXG5cdFx0fSxcblxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRcdEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcblx0XHR9LFxuXG5cdFx0Zm9ybWF0RGlzdGFuY2U6IGZ1bmN0aW9uKGQgLyogTnVtYmVyIChtZXRlcnMpICovLCBzZW5zaXRpdml0eSkge1xuXHRcdFx0dmFyIHVuID0gdGhpcy5vcHRpb25zLnVuaXROYW1lcyxcblx0XHRcdFx0c2ltcGxlUm91bmRpbmcgPSBzZW5zaXRpdml0eSA8PSAwLFxuXHRcdFx0XHRyb3VuZCA9IHNpbXBsZVJvdW5kaW5nID8gZnVuY3Rpb24odikgeyByZXR1cm4gdjsgfSA6IEwuYmluZCh0aGlzLl9yb3VuZCwgdGhpcyksXG5cdFx0XHQgICAgdixcblx0XHRcdCAgICB5YXJkcyxcblx0XHRcdFx0ZGF0YSxcblx0XHRcdFx0cG93MTA7XG5cblx0XHRcdGlmICh0aGlzLm9wdGlvbnMudW5pdHMgPT09ICdpbXBlcmlhbCcpIHtcblx0XHRcdFx0eWFyZHMgPSBkIC8gMC45MTQ0O1xuXHRcdFx0XHRpZiAoeWFyZHMgPj0gMTAwMCkge1xuXHRcdFx0XHRcdGRhdGEgPSB7XG5cdFx0XHRcdFx0XHR2YWx1ZTogcm91bmQoZCAvIDE2MDkuMzQ0LCBzZW5zaXRpdml0eSksXG5cdFx0XHRcdFx0XHR1bml0OiB1bi5taWxlc1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZGF0YSA9IHtcblx0XHRcdFx0XHRcdHZhbHVlOiByb3VuZCh5YXJkcywgc2Vuc2l0aXZpdHkpLFxuXHRcdFx0XHRcdFx0dW5pdDogdW4ueWFyZHNcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2ID0gcm91bmQoZCwgc2Vuc2l0aXZpdHkpO1xuXHRcdFx0XHRkYXRhID0ge1xuXHRcdFx0XHRcdHZhbHVlOiB2ID49IDEwMDAgPyAodiAvIDEwMDApIDogdixcblx0XHRcdFx0XHR1bml0OiB2ID49IDEwMDAgPyB1bi5raWxvbWV0ZXJzIDogdW4ubWV0ZXJzXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdGlmIChzaW1wbGVSb3VuZGluZykge1xuXHRcdFx0XHRwb3cxMCA9IE1hdGgucG93KDEwLCAtc2Vuc2l0aXZpdHkpO1xuXHRcdFx0XHRkYXRhLnZhbHVlID0gTWF0aC5yb3VuZChkYXRhLnZhbHVlICogcG93MTApIC8gcG93MTA7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBMLlV0aWwudGVtcGxhdGUodGhpcy5vcHRpb25zLmRpc3RhbmNlVGVtcGxhdGUsIGRhdGEpO1xuXHRcdH0sXG5cblx0XHRfcm91bmQ6IGZ1bmN0aW9uKGQsIHNlbnNpdGl2aXR5KSB7XG5cdFx0XHR2YXIgcyA9IHNlbnNpdGl2aXR5IHx8IHRoaXMub3B0aW9ucy5yb3VuZGluZ1NlbnNpdGl2aXR5LFxuXHRcdFx0XHRwb3cxMCA9IE1hdGgucG93KDEwLCAoTWF0aC5mbG9vcihkIC8gcykgKyAnJykubGVuZ3RoIC0gMSksXG5cdFx0XHRcdHIgPSBNYXRoLmZsb29yKGQgLyBwb3cxMCksXG5cdFx0XHRcdHAgPSAociA+IDUpID8gcG93MTAgOiBwb3cxMCAvIDI7XG5cblx0XHRcdHJldHVybiBNYXRoLnJvdW5kKGQgLyBwKSAqIHA7XG5cdFx0fSxcblxuXHRcdGZvcm1hdFRpbWU6IGZ1bmN0aW9uKHQgLyogTnVtYmVyIChzZWNvbmRzKSAqLykge1xuXHRcdFx0aWYgKHQgPiA4NjQwMCkge1xuXHRcdFx0XHRyZXR1cm4gTWF0aC5yb3VuZCh0IC8gMzYwMCkgKyAnIGgnO1xuXHRcdFx0fSBlbHNlIGlmICh0ID4gMzYwMCkge1xuXHRcdFx0XHRyZXR1cm4gTWF0aC5mbG9vcih0IC8gMzYwMCkgKyAnIGggJyArXG5cdFx0XHRcdFx0TWF0aC5yb3VuZCgodCAlIDM2MDApIC8gNjApICsgJyBtaW4nO1xuXHRcdFx0fSBlbHNlIGlmICh0ID4gMzAwKSB7XG5cdFx0XHRcdHJldHVybiBNYXRoLnJvdW5kKHQgLyA2MCkgKyAnIG1pbic7XG5cdFx0XHR9IGVsc2UgaWYgKHQgPiA2MCkge1xuXHRcdFx0XHRyZXR1cm4gTWF0aC5mbG9vcih0IC8gNjApICsgJyBtaW4nICtcblx0XHRcdFx0XHQodCAlIDYwICE9PSAwID8gJyAnICsgKHQgJSA2MCkgKyAnIHMnIDogJycpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIHQgKyAnIHMnO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRmb3JtYXRJbnN0cnVjdGlvbjogZnVuY3Rpb24oaW5zdHIsIGkpIHtcblx0XHRcdGlmIChpbnN0ci50ZXh0ID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cmV0dXJuIEwuVXRpbC50ZW1wbGF0ZSh0aGlzLl9nZXRJbnN0cnVjdGlvblRlbXBsYXRlKGluc3RyLCBpKSxcblx0XHRcdFx0XHRMLmV4dGVuZCh7XG5cdFx0XHRcdFx0XHRleGl0U3RyOiBpbnN0ci5leGl0ID8gTC5Sb3V0aW5nLkxvY2FsaXphdGlvblt0aGlzLm9wdGlvbnMubGFuZ3VhZ2VdLmZvcm1hdE9yZGVyKGluc3RyLmV4aXQpIDogJycsXG5cdFx0XHRcdFx0XHRkaXI6IEwuUm91dGluZy5Mb2NhbGl6YXRpb25bdGhpcy5vcHRpb25zLmxhbmd1YWdlXS5kaXJlY3Rpb25zW2luc3RyLmRpcmVjdGlvbl1cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGluc3RyKSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gaW5zdHIudGV4dDtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Z2V0SWNvbk5hbWU6IGZ1bmN0aW9uKGluc3RyLCBpKSB7XG5cdFx0XHRzd2l0Y2ggKGluc3RyLnR5cGUpIHtcblx0XHRcdGNhc2UgJ1N0cmFpZ2h0Jzpcblx0XHRcdFx0cmV0dXJuIChpID09PSAwID8gJ2RlcGFydCcgOiAnY29udGludWUnKTtcblx0XHRcdGNhc2UgJ1NsaWdodFJpZ2h0Jzpcblx0XHRcdFx0cmV0dXJuICdiZWFyLXJpZ2h0Jztcblx0XHRcdGNhc2UgJ1JpZ2h0Jzpcblx0XHRcdFx0cmV0dXJuICd0dXJuLXJpZ2h0Jztcblx0XHRcdGNhc2UgJ1NoYXJwUmlnaHQnOlxuXHRcdFx0XHRyZXR1cm4gJ3NoYXJwLXJpZ2h0Jztcblx0XHRcdGNhc2UgJ1R1cm5Bcm91bmQnOlxuXHRcdFx0XHRyZXR1cm4gJ3UtdHVybic7XG5cdFx0XHRjYXNlICdTaGFycExlZnQnOlxuXHRcdFx0XHRyZXR1cm4gJ3NoYXJwLWxlZnQnO1xuXHRcdFx0Y2FzZSAnTGVmdCc6XG5cdFx0XHRcdHJldHVybiAndHVybi1sZWZ0Jztcblx0XHRcdGNhc2UgJ1NsaWdodExlZnQnOlxuXHRcdFx0XHRyZXR1cm4gJ2JlYXItbGVmdCc7XG5cdFx0XHRjYXNlICdXYXlwb2ludFJlYWNoZWQnOlxuXHRcdFx0XHRyZXR1cm4gJ3ZpYSc7XG5cdFx0XHRjYXNlICdSb3VuZGFib3V0Jzpcblx0XHRcdFx0cmV0dXJuICdlbnRlci1yb3VuZGFib3V0Jztcblx0XHRcdGNhc2UgJ0Rlc3RpbmF0aW9uUmVhY2hlZCc6XG5cdFx0XHRcdHJldHVybiAnYXJyaXZlJztcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0X2dldEluc3RydWN0aW9uVGVtcGxhdGU6IGZ1bmN0aW9uKGluc3RyLCBpKSB7XG5cdFx0XHR2YXIgdHlwZSA9IGluc3RyLnR5cGUgPT09ICdTdHJhaWdodCcgPyAoaSA9PT0gMCA/ICdIZWFkJyA6ICdDb250aW51ZScpIDogaW5zdHIudHlwZSxcblx0XHRcdFx0c3RyaW5ncyA9IEwuUm91dGluZy5Mb2NhbGl6YXRpb25bdGhpcy5vcHRpb25zLmxhbmd1YWdlXS5pbnN0cnVjdGlvbnNbdHlwZV07XG5cblx0XHRcdHJldHVybiBzdHJpbmdzWzBdICsgKHN0cmluZ3MubGVuZ3RoID4gMSAmJiBpbnN0ci5yb2FkID8gc3RyaW5nc1sxXSA6ICcnKTtcblx0XHR9XG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gTC5Sb3V0aW5nO1xufSkoKTtcblxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbn0se1wiLi9MLlJvdXRpbmcuTG9jYWxpemF0aW9uXCI6MTF9XSw3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbihmdW5jdGlvbiAoZ2xvYmFsKXtcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBMID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuTCA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuTCA6IG51bGwpO1xuXHRMLlJvdXRpbmcgPSBMLlJvdXRpbmcgfHwge307XG5cdEwuZXh0ZW5kKEwuUm91dGluZywgcmVxdWlyZSgnLi9MLlJvdXRpbmcuQXV0b2NvbXBsZXRlJykpO1xuXG5cdGZ1bmN0aW9uIHNlbGVjdElucHV0VGV4dChpbnB1dCkge1xuXHRcdGlmIChpbnB1dC5zZXRTZWxlY3Rpb25SYW5nZSkge1xuXHRcdFx0Ly8gT24gaU9TLCBzZWxlY3QoKSBkb2Vzbid0IHdvcmtcblx0XHRcdGlucHV0LnNldFNlbGVjdGlvblJhbmdlKDAsIDk5OTkpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBPbiBhdCBsZWFzdCBJRTgsIHNldFNlbGVlY3Rpb25SYW5nZSBkb2Vzbid0IGV4aXN0XG5cdFx0XHRpbnB1dC5zZWxlY3QoKTtcblx0XHR9XG5cdH1cblxuXHRMLlJvdXRpbmcuR2VvY29kZXJFbGVtZW50ID0gTC5DbGFzcy5leHRlbmQoe1xuXHRcdGluY2x1ZGVzOiBMLk1peGluLkV2ZW50cyxcblxuXHRcdG9wdGlvbnM6IHtcblx0XHRcdGNyZWF0ZUdlb2NvZGVyOiBmdW5jdGlvbihpLCBuV3BzLCBvcHRpb25zKSB7XG5cdFx0XHRcdHZhciBjb250YWluZXIgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLCAnbGVhZmxldC1yb3V0aW5nLWdlb2NvZGVyJyksXG5cdFx0XHRcdFx0aW5wdXQgPSBMLkRvbVV0aWwuY3JlYXRlKCdpbnB1dCcsICcnLCBjb250YWluZXIpLFxuXHRcdFx0XHRcdHJlbW92ZSA9IG9wdGlvbnMuYWRkV2F5cG9pbnRzID8gTC5Eb21VdGlsLmNyZWF0ZSgnc3BhbicsICdsZWFmbGV0LXJvdXRpbmctcmVtb3ZlLXdheXBvaW50JywgY29udGFpbmVyKSA6IHVuZGVmaW5lZDtcblxuXHRcdFx0XHRpbnB1dC5kaXNhYmxlZCA9ICFvcHRpb25zLmFkZFdheXBvaW50cztcblxuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGNvbnRhaW5lcjogY29udGFpbmVyLFxuXHRcdFx0XHRcdGlucHV0OiBpbnB1dCxcblx0XHRcdFx0XHRjbG9zZUJ1dHRvbjogcmVtb3ZlXG5cdFx0XHRcdH07XG5cdFx0XHR9LFxuXHRcdFx0Z2VvY29kZXJQbGFjZWhvbGRlcjogZnVuY3Rpb24oaSwgbnVtYmVyV2F5cG9pbnRzLCBwbGFuKSB7XG5cdFx0XHRcdHZhciBsID0gTC5Sb3V0aW5nLkxvY2FsaXphdGlvbltwbGFuLm9wdGlvbnMubGFuZ3VhZ2VdLnVpO1xuXHRcdFx0XHRyZXR1cm4gaSA9PT0gMCA/XG5cdFx0XHRcdFx0bC5zdGFydFBsYWNlaG9sZGVyIDpcblx0XHRcdFx0XHQoaSA8IG51bWJlcldheXBvaW50cyAtIDEgP1xuXHRcdFx0XHRcdFx0TC5VdGlsLnRlbXBsYXRlKGwudmlhUGxhY2Vob2xkZXIsIHt2aWFOdW1iZXI6IGl9KSA6XG5cdFx0XHRcdFx0XHRsLmVuZFBsYWNlaG9sZGVyKTtcblx0XHRcdH0sXG5cblx0XHRcdGdlb2NvZGVyQ2xhc3M6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gJyc7XG5cdFx0XHR9LFxuXG5cdFx0XHR3YXlwb2ludE5hbWVGYWxsYmFjazogZnVuY3Rpb24obGF0TG5nKSB7XG5cdFx0XHRcdHZhciBucyA9IGxhdExuZy5sYXQgPCAwID8gJ1MnIDogJ04nLFxuXHRcdFx0XHRcdGV3ID0gbGF0TG5nLmxuZyA8IDAgPyAnVycgOiAnRScsXG5cdFx0XHRcdFx0bGF0ID0gKE1hdGgucm91bmQoTWF0aC5hYnMobGF0TG5nLmxhdCkgKiAxMDAwMCkgLyAxMDAwMCkudG9TdHJpbmcoKSxcblx0XHRcdFx0XHRsbmcgPSAoTWF0aC5yb3VuZChNYXRoLmFicyhsYXRMbmcubG5nKSAqIDEwMDAwKSAvIDEwMDAwKS50b1N0cmluZygpO1xuXHRcdFx0XHRyZXR1cm4gbnMgKyBsYXQgKyAnLCAnICsgZXcgKyBsbmc7XG5cdFx0XHR9LFxuXHRcdFx0bWF4R2VvY29kZXJUb2xlcmFuY2U6IDIwMCxcblx0XHRcdGF1dG9jb21wbGV0ZU9wdGlvbnM6IHt9LFxuXHRcdFx0bGFuZ3VhZ2U6ICdlbicsXG5cdFx0fSxcblxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKHdwLCBpLCBuV3BzLCBvcHRpb25zKSB7XG5cdFx0XHRMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG5cblx0XHRcdHZhciBnID0gdGhpcy5vcHRpb25zLmNyZWF0ZUdlb2NvZGVyKGksIG5XcHMsIHRoaXMub3B0aW9ucyksXG5cdFx0XHRcdGNsb3NlQnV0dG9uID0gZy5jbG9zZUJ1dHRvbixcblx0XHRcdFx0Z2VvY29kZXJJbnB1dCA9IGcuaW5wdXQ7XG5cdFx0XHRnZW9jb2RlcklucHV0LnNldEF0dHJpYnV0ZSgncGxhY2Vob2xkZXInLCB0aGlzLm9wdGlvbnMuZ2VvY29kZXJQbGFjZWhvbGRlcihpLCBuV3BzLCB0aGlzKSk7XG5cdFx0XHRnZW9jb2RlcklucHV0LmNsYXNzTmFtZSA9IHRoaXMub3B0aW9ucy5nZW9jb2RlckNsYXNzKGksIG5XcHMpO1xuXG5cdFx0XHR0aGlzLl9lbGVtZW50ID0gZztcblx0XHRcdHRoaXMuX3dheXBvaW50ID0gd3A7XG5cblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0XHQvLyBUaGlzIGhhcyB0byBiZSBoZXJlLCBvciBnZW9jb2RlcidzIHZhbHVlIHdpbGwgbm90IGJlIHByb3Blcmx5XG5cdFx0XHQvLyBpbml0aWFsaXplZC5cblx0XHRcdC8vIFRPRE86IGxvb2sgaW50byB3aHkgYW5kIG1ha2UgX3VwZGF0ZVdheXBvaW50TmFtZSBmaXggdGhpcy5cblx0XHRcdGdlb2NvZGVySW5wdXQudmFsdWUgPSB3cC5uYW1lO1xuXG5cdFx0XHRMLkRvbUV2ZW50LmFkZExpc3RlbmVyKGdlb2NvZGVySW5wdXQsICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxlY3RJbnB1dFRleHQodGhpcyk7XG5cdFx0XHR9LCBnZW9jb2RlcklucHV0KTtcblxuXHRcdFx0aWYgKGNsb3NlQnV0dG9uKSB7XG5cdFx0XHRcdEwuRG9tRXZlbnQuYWRkTGlzdGVuZXIoY2xvc2VCdXR0b24sICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRoaXMuZmlyZSgnZGVsZXRlJywgeyB3YXlwb2ludDogdGhpcy5fd2F5cG9pbnQgfSk7XG5cdFx0XHRcdH0sIHRoaXMpO1xuXHRcdFx0fVxuXG5cdFx0XHRuZXcgTC5Sb3V0aW5nLkF1dG9jb21wbGV0ZShnZW9jb2RlcklucHV0LCBmdW5jdGlvbihyKSB7XG5cdFx0XHRcdFx0Z2VvY29kZXJJbnB1dC52YWx1ZSA9IHIubmFtZTtcblx0XHRcdFx0XHR3cC5uYW1lID0gci5uYW1lO1xuXHRcdFx0XHRcdHdwLmxhdExuZyA9IHIuY2VudGVyO1xuXHRcdFx0XHRcdHRoaXMuZmlyZSgnZ2VvY29kZWQnLCB7IHdheXBvaW50OiB3cCwgdmFsdWU6IHIgfSk7XG5cdFx0XHRcdH0sIHRoaXMsIEwuZXh0ZW5kKHtcblx0XHRcdFx0XHRyZXN1bHRGbjogdGhpcy5vcHRpb25zLmdlb2NvZGVyLmdlb2NvZGUsXG5cdFx0XHRcdFx0cmVzdWx0Q29udGV4dDogdGhpcy5vcHRpb25zLmdlb2NvZGVyLFxuXHRcdFx0XHRcdGF1dG9jb21wbGV0ZUZuOiB0aGlzLm9wdGlvbnMuZ2VvY29kZXIuc3VnZ2VzdCxcblx0XHRcdFx0XHRhdXRvY29tcGxldGVDb250ZXh0OiB0aGlzLm9wdGlvbnMuZ2VvY29kZXJcblx0XHRcdFx0fSwgdGhpcy5vcHRpb25zLmF1dG9jb21wbGV0ZU9wdGlvbnMpKTtcblx0XHR9LFxuXG5cdFx0Z2V0Q29udGFpbmVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLl9lbGVtZW50LmNvbnRhaW5lcjtcblx0XHR9LFxuXG5cdFx0c2V0VmFsdWU6IGZ1bmN0aW9uKHYpIHtcblx0XHRcdHRoaXMuX2VsZW1lbnQuaW5wdXQudmFsdWUgPSB2O1xuXHRcdH0sXG5cblx0XHR1cGRhdGU6IGZ1bmN0aW9uKGZvcmNlKSB7XG5cdFx0XHR2YXIgd3AgPSB0aGlzLl93YXlwb2ludCxcblx0XHRcdFx0d3BDb29yZHM7XG5cblx0XHRcdHdwLm5hbWUgPSB3cC5uYW1lIHx8ICcnO1xuXG5cdFx0XHRpZiAod3AubGF0TG5nICYmIChmb3JjZSB8fCAhd3AubmFtZSkpIHtcblx0XHRcdFx0d3BDb29yZHMgPSB0aGlzLm9wdGlvbnMud2F5cG9pbnROYW1lRmFsbGJhY2sod3AubGF0TG5nKTtcblx0XHRcdFx0aWYgKHRoaXMub3B0aW9ucy5nZW9jb2RlciAmJiB0aGlzLm9wdGlvbnMuZ2VvY29kZXIucmV2ZXJzZSkge1xuXHRcdFx0XHRcdHRoaXMub3B0aW9ucy5nZW9jb2Rlci5yZXZlcnNlKHdwLmxhdExuZywgNjcxMDg4NjQgLyogem9vbSAxOCAqLywgZnVuY3Rpb24ocnMpIHtcblx0XHRcdFx0XHRcdGlmIChycy5sZW5ndGggPiAwICYmIHJzWzBdLmNlbnRlci5kaXN0YW5jZVRvKHdwLmxhdExuZykgPCB0aGlzLm9wdGlvbnMubWF4R2VvY29kZXJUb2xlcmFuY2UpIHtcblx0XHRcdFx0XHRcdFx0d3AubmFtZSA9IHJzWzBdLm5hbWU7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR3cC5uYW1lID0gd3BDb29yZHM7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0aGlzLl91cGRhdGUoKTtcblx0XHRcdFx0XHR9LCB0aGlzKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR3cC5uYW1lID0gd3BDb29yZHM7XG5cdFx0XHRcdFx0dGhpcy5fdXBkYXRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Zm9jdXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGlucHV0ID0gdGhpcy5fZWxlbWVudC5pbnB1dDtcblx0XHRcdGlucHV0LmZvY3VzKCk7XG5cdFx0XHRzZWxlY3RJbnB1dFRleHQoaW5wdXQpO1xuXHRcdH0sXG5cblx0XHRfdXBkYXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB3cCA9IHRoaXMuX3dheXBvaW50LFxuXHRcdFx0ICAgIHZhbHVlID0gd3AgJiYgd3AubmFtZSA/IHdwLm5hbWUgOiAnJztcblx0XHRcdHRoaXMuc2V0VmFsdWUodmFsdWUpO1xuXHRcdFx0dGhpcy5maXJlKCdyZXZlcnNlZ2VvY29kZWQnLCB7d2F5cG9pbnQ6IHdwLCB2YWx1ZTogdmFsdWV9KTtcblx0XHR9XG5cdH0pO1xuXG5cdEwuUm91dGluZy5nZW9jb2RlckVsZW1lbnQgPSBmdW5jdGlvbih3cCwgaSwgbldwcywgcGxhbikge1xuXHRcdHJldHVybiBuZXcgTC5Sb3V0aW5nLkdlb2NvZGVyRWxlbWVudCh3cCwgaSwgbldwcywgcGxhbik7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBMLlJvdXRpbmc7XG59KSgpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbn0se1wiLi9MLlJvdXRpbmcuQXV0b2NvbXBsZXRlXCI6M31dLDg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChnbG9iYWwpe1xuKGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIEwgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5MIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5MIDogbnVsbCk7XG5cblx0TC5Sb3V0aW5nID0gTC5Sb3V0aW5nIHx8IHt9O1xuXHRMLmV4dGVuZChMLlJvdXRpbmcsIHJlcXVpcmUoJy4vTC5Sb3V0aW5nLkZvcm1hdHRlcicpKTtcblx0TC5leHRlbmQoTC5Sb3V0aW5nLCByZXF1aXJlKCcuL0wuUm91dGluZy5JdGluZXJhcnlCdWlsZGVyJykpO1xuXG5cdEwuUm91dGluZy5JdGluZXJhcnkgPSBMLkNvbnRyb2wuZXh0ZW5kKHtcblx0XHRpbmNsdWRlczogTC5NaXhpbi5FdmVudHMsXG5cblx0XHRvcHRpb25zOiB7XG5cdFx0XHRwb2ludE1hcmtlclN0eWxlOiB7XG5cdFx0XHRcdHJhZGl1czogNSxcblx0XHRcdFx0Y29sb3I6ICcjMDNmJyxcblx0XHRcdFx0ZmlsbENvbG9yOiAnd2hpdGUnLFxuXHRcdFx0XHRvcGFjaXR5OiAxLFxuXHRcdFx0XHRmaWxsT3BhY2l0eTogMC43XG5cdFx0XHR9LFxuXHRcdFx0c3VtbWFyeVRlbXBsYXRlOiAnPGgyPntuYW1lfTwvaDI+PGgzPntkaXN0YW5jZX0sIHt0aW1lfTwvaDM+Jyxcblx0XHRcdHRpbWVUZW1wbGF0ZTogJ3t0aW1lfScsXG5cdFx0XHRjb250YWluZXJDbGFzc05hbWU6ICcnLFxuXHRcdFx0YWx0ZXJuYXRpdmVDbGFzc05hbWU6ICcnLFxuXHRcdFx0bWluaW1pemVkQ2xhc3NOYW1lOiAnJyxcblx0XHRcdGl0aW5lcmFyeUNsYXNzTmFtZTogJycsXG5cdFx0XHR0b3RhbERpc3RhbmNlUm91bmRpbmdTZW5zaXRpdml0eTogLTEsXG5cdFx0XHRzaG93OiB0cnVlLFxuXHRcdFx0Y29sbGFwc2libGU6IGZhbHNlLFxuXHRcdFx0Y29sbGFwc2VCdG46IGZ1bmN0aW9uKGl0aW5lcmFyeSkge1xuXHRcdFx0XHR2YXIgY29sbGFwc2VCdG4gPSBMLkRvbVV0aWwuY3JlYXRlKCdzcGFuJywgaXRpbmVyYXJ5Lm9wdGlvbnMuY29sbGFwc2VCdG5DbGFzcyk7XG5cdFx0XHRcdEwuRG9tRXZlbnQub24oY29sbGFwc2VCdG4sICdjbGljaycsIGl0aW5lcmFyeS5fdG9nZ2xlLCBpdGluZXJhcnkpO1xuXHRcdFx0XHRpdGluZXJhcnkuX2NvbnRhaW5lci5pbnNlcnRCZWZvcmUoY29sbGFwc2VCdG4sIGl0aW5lcmFyeS5fY29udGFpbmVyLmZpcnN0Q2hpbGQpO1xuXHRcdFx0fSxcblx0XHRcdGNvbGxhcHNlQnRuQ2xhc3M6ICdsZWFmbGV0LXJvdXRpbmctY29sbGFwc2UtYnRuJ1xuXHRcdH0sXG5cblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0XHRMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG5cdFx0XHR0aGlzLl9mb3JtYXR0ZXIgPSB0aGlzLm9wdGlvbnMuZm9ybWF0dGVyIHx8IG5ldyBMLlJvdXRpbmcuRm9ybWF0dGVyKHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLl9pdGluZXJhcnlCdWlsZGVyID0gdGhpcy5vcHRpb25zLml0aW5lcmFyeUJ1aWxkZXIgfHwgbmV3IEwuUm91dGluZy5JdGluZXJhcnlCdWlsZGVyKHtcblx0XHRcdFx0Y29udGFpbmVyQ2xhc3NOYW1lOiB0aGlzLm9wdGlvbnMuaXRpbmVyYXJ5Q2xhc3NOYW1lXG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0b25BZGQ6IGZ1bmN0aW9uKG1hcCkge1xuXHRcdFx0dmFyIGNvbGxhcHNpYmxlID0gdGhpcy5vcHRpb25zLmNvbGxhcHNpYmxlO1xuXG5cdFx0XHRjb2xsYXBzaWJsZSA9IGNvbGxhcHNpYmxlIHx8IChjb2xsYXBzaWJsZSA9PT0gdW5kZWZpbmVkICYmIG1hcC5nZXRTaXplKCkueCA8PSA2NDApO1xuXG5cdFx0XHR0aGlzLl9jb250YWluZXIgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLCAnbGVhZmxldC1yb3V0aW5nLWNvbnRhaW5lciBsZWFmbGV0LWJhciAnICtcblx0XHRcdFx0KCF0aGlzLm9wdGlvbnMuc2hvdyA/ICdsZWFmbGV0LXJvdXRpbmctY29udGFpbmVyLWhpZGUgJyA6ICcnKSArXG5cdFx0XHRcdChjb2xsYXBzaWJsZSA/ICdsZWFmbGV0LXJvdXRpbmctY29sbGFwc2libGUgJyA6ICcnKSArXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5jb250YWluZXJDbGFzc05hbWUpO1xuXHRcdFx0dGhpcy5fYWx0Q29udGFpbmVyID0gdGhpcy5jcmVhdGVBbHRlcm5hdGl2ZXNDb250YWluZXIoKTtcblx0XHRcdHRoaXMuX2NvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLl9hbHRDb250YWluZXIpO1xuXHRcdFx0TC5Eb21FdmVudC5kaXNhYmxlQ2xpY2tQcm9wYWdhdGlvbih0aGlzLl9jb250YWluZXIpO1xuXHRcdFx0TC5Eb21FdmVudC5hZGRMaXN0ZW5lcih0aGlzLl9jb250YWluZXIsICdtb3VzZXdoZWVsJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbihlKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoY29sbGFwc2libGUpIHtcblx0XHRcdFx0dGhpcy5vcHRpb25zLmNvbGxhcHNlQnRuKHRoaXMpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5fY29udGFpbmVyO1xuXHRcdH0sXG5cblx0XHRvblJlbW92ZTogZnVuY3Rpb24oKSB7XG5cdFx0fSxcblxuXHRcdGNyZWF0ZUFsdGVybmF0aXZlc0NvbnRhaW5lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2JywgJ2xlYWZsZXQtcm91dGluZy1hbHRlcm5hdGl2ZXMtY29udGFpbmVyJyk7XG5cdFx0fSxcblxuXHRcdHNldEFsdGVybmF0aXZlczogZnVuY3Rpb24ocm91dGVzKSB7XG5cdFx0XHR2YXIgaSxcblx0XHRcdCAgICBhbHQsXG5cdFx0XHQgICAgYWx0RGl2O1xuXG5cdFx0XHR0aGlzLl9jbGVhckFsdHMoKTtcblxuXHRcdFx0dGhpcy5fcm91dGVzID0gcm91dGVzO1xuXG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5fcm91dGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGFsdCA9IHRoaXMuX3JvdXRlc1tpXTtcblx0XHRcdFx0YWx0RGl2ID0gdGhpcy5fY3JlYXRlQWx0ZXJuYXRpdmUoYWx0LCBpKTtcblx0XHRcdFx0dGhpcy5fYWx0Q29udGFpbmVyLmFwcGVuZENoaWxkKGFsdERpdik7XG5cdFx0XHRcdHRoaXMuX2FsdEVsZW1lbnRzLnB1c2goYWx0RGl2KTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fc2VsZWN0Um91dGUoe3JvdXRlOiB0aGlzLl9yb3V0ZXNbMF0sIGFsdGVybmF0aXZlczogdGhpcy5fcm91dGVzLnNsaWNlKDEpfSk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cblx0XHRzaG93OiBmdW5jdGlvbigpIHtcblx0XHRcdEwuRG9tVXRpbC5yZW1vdmVDbGFzcyh0aGlzLl9jb250YWluZXIsICdsZWFmbGV0LXJvdXRpbmctY29udGFpbmVyLWhpZGUnKTtcblx0XHR9LFxuXG5cdFx0aGlkZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRMLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fY29udGFpbmVyLCAnbGVhZmxldC1yb3V0aW5nLWNvbnRhaW5lci1oaWRlJyk7XG5cdFx0fSxcblxuXHRcdF90b2dnbGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGNvbGxhcHNlZCA9IEwuRG9tVXRpbC5oYXNDbGFzcyh0aGlzLl9jb250YWluZXIsICdsZWFmbGV0LXJvdXRpbmctY29udGFpbmVyLWhpZGUnKTtcblx0XHRcdHRoaXNbY29sbGFwc2VkID8gJ3Nob3cnIDogJ2hpZGUnXSgpO1xuXHRcdH0sXG5cblx0XHRfY3JlYXRlQWx0ZXJuYXRpdmU6IGZ1bmN0aW9uKGFsdCwgaSkge1xuXHRcdFx0dmFyIGFsdERpdiA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsICdsZWFmbGV0LXJvdXRpbmctYWx0ICcgK1xuXHRcdFx0XHR0aGlzLm9wdGlvbnMuYWx0ZXJuYXRpdmVDbGFzc05hbWUgK1xuXHRcdFx0XHQoaSA+IDAgPyAnIGxlYWZsZXQtcm91dGluZy1hbHQtbWluaW1pemVkICcgKyB0aGlzLm9wdGlvbnMubWluaW1pemVkQ2xhc3NOYW1lIDogJycpKSxcblx0XHRcdFx0dGVtcGxhdGUgPSB0aGlzLm9wdGlvbnMuc3VtbWFyeVRlbXBsYXRlLFxuXHRcdFx0XHRkYXRhID0gTC5leHRlbmQoe1xuXHRcdFx0XHRcdG5hbWU6IGFsdC5uYW1lLFxuXHRcdFx0XHRcdGRpc3RhbmNlOiB0aGlzLl9mb3JtYXR0ZXIuZm9ybWF0RGlzdGFuY2UoYWx0LnN1bW1hcnkudG90YWxEaXN0YW5jZSwgdGhpcy5vcHRpb25zLnRvdGFsRGlzdGFuY2VSb3VuZGluZ1NlbnNpdGl2aXR5KSxcblx0XHRcdFx0XHR0aW1lOiB0aGlzLl9mb3JtYXR0ZXIuZm9ybWF0VGltZShhbHQuc3VtbWFyeS50b3RhbFRpbWUpXG5cdFx0XHRcdH0sIGFsdCk7XG5cdFx0XHRhbHREaXYuaW5uZXJIVE1MID0gdHlwZW9mKHRlbXBsYXRlKSA9PT0gJ2Z1bmN0aW9uJyA/IHRlbXBsYXRlKGRhdGEpIDogTC5VdGlsLnRlbXBsYXRlKHRlbXBsYXRlLCBkYXRhKTtcblx0XHRcdEwuRG9tRXZlbnQuYWRkTGlzdGVuZXIoYWx0RGl2LCAnY2xpY2snLCB0aGlzLl9vbkFsdENsaWNrZWQsIHRoaXMpO1xuXHRcdFx0dGhpcy5vbigncm91dGVzZWxlY3RlZCcsIHRoaXMuX3NlbGVjdEFsdCwgdGhpcyk7XG5cblx0XHRcdGFsdERpdi5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVJdGluZXJhcnlDb250YWluZXIoYWx0KSk7XG5cdFx0XHRyZXR1cm4gYWx0RGl2O1xuXHRcdH0sXG5cblx0XHRfY2xlYXJBbHRzOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBlbCA9IHRoaXMuX2FsdENvbnRhaW5lcjtcblx0XHRcdHdoaWxlIChlbCAmJiBlbC5maXJzdENoaWxkKSB7XG5cdFx0XHRcdGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9hbHRFbGVtZW50cyA9IFtdO1xuXHRcdH0sXG5cblx0XHRfY3JlYXRlSXRpbmVyYXJ5Q29udGFpbmVyOiBmdW5jdGlvbihyKSB7XG5cdFx0XHR2YXIgY29udGFpbmVyID0gdGhpcy5faXRpbmVyYXJ5QnVpbGRlci5jcmVhdGVDb250YWluZXIoKSxcblx0XHRcdCAgICBzdGVwcyA9IHRoaXMuX2l0aW5lcmFyeUJ1aWxkZXIuY3JlYXRlU3RlcHNDb250YWluZXIoKSxcblx0XHRcdCAgICBpLFxuXHRcdFx0ICAgIGluc3RyLFxuXHRcdFx0ICAgIHN0ZXAsXG5cdFx0XHQgICAgZGlzdGFuY2UsXG5cdFx0XHQgICAgdGV4dCxcblx0XHRcdCAgICBpY29uO1xuXG5cdFx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQoc3RlcHMpO1xuXG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgci5pbnN0cnVjdGlvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aW5zdHIgPSByLmluc3RydWN0aW9uc1tpXTtcblx0XHRcdFx0dGV4dCA9IHRoaXMuX2Zvcm1hdHRlci5mb3JtYXRJbnN0cnVjdGlvbihpbnN0ciwgaSk7XG5cdFx0XHRcdGRpc3RhbmNlID0gdGhpcy5fZm9ybWF0dGVyLmZvcm1hdERpc3RhbmNlKGluc3RyLmRpc3RhbmNlKTtcblx0XHRcdFx0aWNvbiA9IHRoaXMuX2Zvcm1hdHRlci5nZXRJY29uTmFtZShpbnN0ciwgaSk7XG5cdFx0XHRcdHN0ZXAgPSB0aGlzLl9pdGluZXJhcnlCdWlsZGVyLmNyZWF0ZVN0ZXAodGV4dCwgZGlzdGFuY2UsIGljb24sIHN0ZXBzKTtcblxuXHRcdFx0XHR0aGlzLl9hZGRSb3dMaXN0ZW5lcnMoc3RlcCwgci5jb29yZGluYXRlc1tpbnN0ci5pbmRleF0pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gY29udGFpbmVyO1xuXHRcdH0sXG5cblx0XHRfYWRkUm93TGlzdGVuZXJzOiBmdW5jdGlvbihyb3csIGNvb3JkaW5hdGUpIHtcblx0XHRcdEwuRG9tRXZlbnQuYWRkTGlzdGVuZXIocm93LCAnbW91c2VvdmVyJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHRoaXMuX21hcmtlciA9IEwuY2lyY2xlTWFya2VyKGNvb3JkaW5hdGUsXG5cdFx0XHRcdFx0dGhpcy5vcHRpb25zLnBvaW50TWFya2VyU3R5bGUpLmFkZFRvKHRoaXMuX21hcCk7XG5cdFx0XHR9LCB0aGlzKTtcblx0XHRcdEwuRG9tRXZlbnQuYWRkTGlzdGVuZXIocm93LCAnbW91c2VvdXQnLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKHRoaXMuX21hcmtlcikge1xuXHRcdFx0XHRcdHRoaXMuX21hcC5yZW1vdmVMYXllcih0aGlzLl9tYXJrZXIpO1xuXHRcdFx0XHRcdGRlbGV0ZSB0aGlzLl9tYXJrZXI7XG5cdFx0XHRcdH1cblx0XHRcdH0sIHRoaXMpO1xuXHRcdFx0TC5Eb21FdmVudC5hZGRMaXN0ZW5lcihyb3csICdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dGhpcy5fbWFwLnBhblRvKGNvb3JkaW5hdGUpO1xuXHRcdFx0XHRMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbihlKTtcblx0XHRcdH0sIHRoaXMpO1xuXHRcdH0sXG5cblx0XHRfb25BbHRDbGlja2VkOiBmdW5jdGlvbihlKSB7XG5cdFx0XHR2YXIgYWx0RWxlbSA9IGUudGFyZ2V0IHx8IHdpbmRvdy5ldmVudC5zcmNFbGVtZW50O1xuXHRcdFx0d2hpbGUgKCFMLkRvbVV0aWwuaGFzQ2xhc3MoYWx0RWxlbSwgJ2xlYWZsZXQtcm91dGluZy1hbHQnKSkge1xuXHRcdFx0XHRhbHRFbGVtID0gYWx0RWxlbS5wYXJlbnRFbGVtZW50O1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgaiA9IHRoaXMuX2FsdEVsZW1lbnRzLmluZGV4T2YoYWx0RWxlbSk7XG5cdFx0XHR2YXIgYWx0cyA9IHRoaXMuX3JvdXRlcy5zbGljZSgpO1xuXHRcdFx0dmFyIHJvdXRlID0gYWx0cy5zcGxpY2UoaiwgMSlbMF07XG5cblx0XHRcdHRoaXMuZmlyZSgncm91dGVzZWxlY3RlZCcsIHtcblx0XHRcdFx0cm91dGU6IHJvdXRlLFxuXHRcdFx0XHRhbHRlcm5hdGl2ZXM6IGFsdHNcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRfc2VsZWN0QWx0OiBmdW5jdGlvbihlKSB7XG5cdFx0XHR2YXIgYWx0RWxlbSxcblx0XHRcdCAgICBqLFxuXHRcdFx0ICAgIG4sXG5cdFx0XHQgICAgY2xhc3NGbjtcblxuXHRcdFx0YWx0RWxlbSA9IHRoaXMuX2FsdEVsZW1lbnRzW2Uucm91dGUucm91dGVzSW5kZXhdO1xuXG5cdFx0XHRpZiAoTC5Eb21VdGlsLmhhc0NsYXNzKGFsdEVsZW0sICdsZWFmbGV0LXJvdXRpbmctYWx0LW1pbmltaXplZCcpKSB7XG5cdFx0XHRcdGZvciAoaiA9IDA7IGogPCB0aGlzLl9hbHRFbGVtZW50cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdG4gPSB0aGlzLl9hbHRFbGVtZW50c1tqXTtcblx0XHRcdFx0XHRjbGFzc0ZuID0gaiA9PT0gZS5yb3V0ZS5yb3V0ZXNJbmRleCA/ICdyZW1vdmVDbGFzcycgOiAnYWRkQ2xhc3MnO1xuXHRcdFx0XHRcdEwuRG9tVXRpbFtjbGFzc0ZuXShuLCAnbGVhZmxldC1yb3V0aW5nLWFsdC1taW5pbWl6ZWQnKTtcblx0XHRcdFx0XHRpZiAodGhpcy5vcHRpb25zLm1pbmltaXplZENsYXNzTmFtZSkge1xuXHRcdFx0XHRcdFx0TC5Eb21VdGlsW2NsYXNzRm5dKG4sIHRoaXMub3B0aW9ucy5taW5pbWl6ZWRDbGFzc05hbWUpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChqICE9PSBlLnJvdXRlLnJvdXRlc0luZGV4KSBuLnNjcm9sbFRvcCA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0TC5Eb21FdmVudC5zdG9wKGUpO1xuXHRcdH0sXG5cblx0XHRfc2VsZWN0Um91dGU6IGZ1bmN0aW9uKHJvdXRlcykge1xuXHRcdFx0aWYgKHRoaXMuX21hcmtlcikge1xuXHRcdFx0XHR0aGlzLl9tYXAucmVtb3ZlTGF5ZXIodGhpcy5fbWFya2VyKTtcblx0XHRcdFx0ZGVsZXRlIHRoaXMuX21hcmtlcjtcblx0XHRcdH1cblx0XHRcdHRoaXMuZmlyZSgncm91dGVzZWxlY3RlZCcsIHJvdXRlcyk7XG5cdFx0fVxuXHR9KTtcblxuXHRMLlJvdXRpbmcuaXRpbmVyYXJ5ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdHJldHVybiBuZXcgTC5Sb3V0aW5nLkl0aW5lcmFyeShvcHRpb25zKTtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IEwuUm91dGluZztcbn0pKCk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxufSx7XCIuL0wuUm91dGluZy5Gb3JtYXR0ZXJcIjo2LFwiLi9MLlJvdXRpbmcuSXRpbmVyYXJ5QnVpbGRlclwiOjl9XSw5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbihmdW5jdGlvbiAoZ2xvYmFsKXtcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBMID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuTCA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuTCA6IG51bGwpO1xuXHRMLlJvdXRpbmcgPSBMLlJvdXRpbmcgfHwge307XG5cblx0TC5Sb3V0aW5nLkl0aW5lcmFyeUJ1aWxkZXIgPSBMLkNsYXNzLmV4dGVuZCh7XG5cdFx0b3B0aW9uczoge1xuXHRcdFx0Y29udGFpbmVyQ2xhc3NOYW1lOiAnJ1xuXHRcdH0sXG5cblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0XHRMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG5cdFx0fSxcblxuXHRcdGNyZWF0ZUNvbnRhaW5lcjogZnVuY3Rpb24oY2xhc3NOYW1lKSB7XG5cdFx0XHR2YXIgdGFibGUgPSBMLkRvbVV0aWwuY3JlYXRlKCd0YWJsZScsIGNsYXNzTmFtZSB8fCAnJyksXG5cdFx0XHRcdGNvbGdyb3VwID0gTC5Eb21VdGlsLmNyZWF0ZSgnY29sZ3JvdXAnLCAnJywgdGFibGUpO1xuXG5cdFx0XHRMLkRvbVV0aWwuY3JlYXRlKCdjb2wnLCAnbGVhZmxldC1yb3V0aW5nLWluc3RydWN0aW9uLWljb24nLCBjb2xncm91cCk7XG5cdFx0XHRMLkRvbVV0aWwuY3JlYXRlKCdjb2wnLCAnbGVhZmxldC1yb3V0aW5nLWluc3RydWN0aW9uLXRleHQnLCBjb2xncm91cCk7XG5cdFx0XHRMLkRvbVV0aWwuY3JlYXRlKCdjb2wnLCAnbGVhZmxldC1yb3V0aW5nLWluc3RydWN0aW9uLWRpc3RhbmNlJywgY29sZ3JvdXApO1xuXG5cdFx0XHRyZXR1cm4gdGFibGU7XG5cdFx0fSxcblxuXHRcdGNyZWF0ZVN0ZXBzQ29udGFpbmVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBMLkRvbVV0aWwuY3JlYXRlKCd0Ym9keScsICcnKTtcblx0XHR9LFxuXG5cdFx0Y3JlYXRlU3RlcDogZnVuY3Rpb24odGV4dCwgZGlzdGFuY2UsIGljb24sIHN0ZXBzKSB7XG5cdFx0XHR2YXIgcm93ID0gTC5Eb21VdGlsLmNyZWF0ZSgndHInLCAnJywgc3RlcHMpLFxuXHRcdFx0XHRzcGFuLFxuXHRcdFx0XHR0ZDtcblx0XHRcdHRkID0gTC5Eb21VdGlsLmNyZWF0ZSgndGQnLCAnJywgcm93KTtcblx0XHRcdHNwYW4gPSBMLkRvbVV0aWwuY3JlYXRlKCdzcGFuJywgJ2xlYWZsZXQtcm91dGluZy1pY29uIGxlYWZsZXQtcm91dGluZy1pY29uLScraWNvbiwgdGQpO1xuXHRcdFx0dGQuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cdFx0XHR0ZCA9IEwuRG9tVXRpbC5jcmVhdGUoJ3RkJywgJycsIHJvdyk7XG5cdFx0XHR0ZC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0ZXh0KSk7XG5cdFx0XHR0ZCA9IEwuRG9tVXRpbC5jcmVhdGUoJ3RkJywgJycsIHJvdyk7XG5cdFx0XHR0ZC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShkaXN0YW5jZSkpO1xuXHRcdFx0cmV0dXJuIHJvdztcblx0XHR9XG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gTC5Sb3V0aW5nO1xufSkoKTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pXG59LHt9XSwxMDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oZnVuY3Rpb24gKGdsb2JhbCl7XG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgTCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LkwgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLkwgOiBudWxsKTtcblxuXHRMLlJvdXRpbmcgPSBMLlJvdXRpbmcgfHwge307XG5cblx0TC5Sb3V0aW5nLkxpbmUgPSBMLkxheWVyR3JvdXAuZXh0ZW5kKHtcblx0XHRpbmNsdWRlczogTC5NaXhpbi5FdmVudHMsXG5cblx0XHRvcHRpb25zOiB7XG5cdFx0XHRzdHlsZXM6IFtcblx0XHRcdFx0e2NvbG9yOiAnYmxhY2snLCBvcGFjaXR5OiAwLjE1LCB3ZWlnaHQ6IDl9LFxuXHRcdFx0XHR7Y29sb3I6ICd3aGl0ZScsIG9wYWNpdHk6IDAuOCwgd2VpZ2h0OiA2fSxcblx0XHRcdFx0e2NvbG9yOiAncmVkJywgb3BhY2l0eTogMSwgd2VpZ2h0OiAyfVxuXHRcdFx0XSxcblx0XHRcdG1pc3NpbmdSb3V0ZVN0eWxlczogW1xuXHRcdFx0XHR7Y29sb3I6ICdibGFjaycsIG9wYWNpdHk6IDAuMTUsIHdlaWdodDogN30sXG5cdFx0XHRcdHtjb2xvcjogJ3doaXRlJywgb3BhY2l0eTogMC42LCB3ZWlnaHQ6IDR9LFxuXHRcdFx0XHR7Y29sb3I6ICdncmF5Jywgb3BhY2l0eTogMC44LCB3ZWlnaHQ6IDIsIGRhc2hBcnJheTogJzcsMTInfVxuXHRcdFx0XSxcblx0XHRcdGFkZFdheXBvaW50czogdHJ1ZSxcblx0XHRcdGV4dGVuZFRvV2F5cG9pbnRzOiB0cnVlLFxuXHRcdFx0bWlzc2luZ1JvdXRlVG9sZXJhbmNlOiAxMFxuXHRcdH0sXG5cblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbihyb3V0ZSwgb3B0aW9ucykge1xuXHRcdFx0TC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xuXHRcdFx0TC5MYXllckdyb3VwLnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cdFx0XHR0aGlzLl9yb3V0ZSA9IHJvdXRlO1xuXG5cdFx0XHRpZiAodGhpcy5vcHRpb25zLmV4dGVuZFRvV2F5cG9pbnRzKSB7XG5cdFx0XHRcdHRoaXMuX2V4dGVuZFRvV2F5cG9pbnRzKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuX2FkZFNlZ21lbnQoXG5cdFx0XHRcdHJvdXRlLmNvb3JkaW5hdGVzLFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuc3R5bGVzLFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuYWRkV2F5cG9pbnRzKTtcblx0XHR9LFxuXG5cdFx0YWRkVG86IGZ1bmN0aW9uKG1hcCkge1xuXHRcdFx0bWFwLmFkZExheWVyKHRoaXMpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRnZXRCb3VuZHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIEwubGF0TG5nQm91bmRzKHRoaXMuX3JvdXRlLmNvb3JkaW5hdGVzKTtcblx0XHR9LFxuXG5cdFx0X2ZpbmRXYXlwb2ludEluZGljZXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHdwcyA9IHRoaXMuX3JvdXRlLmlucHV0V2F5cG9pbnRzLFxuXHRcdFx0ICAgIGluZGljZXMgPSBbXSxcblx0XHRcdCAgICBpO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHdwcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpbmRpY2VzLnB1c2godGhpcy5fZmluZENsb3Nlc3RSb3V0ZVBvaW50KHdwc1tpXS5sYXRMbmcpKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGluZGljZXM7XG5cdFx0fSxcblxuXHRcdF9maW5kQ2xvc2VzdFJvdXRlUG9pbnQ6IGZ1bmN0aW9uKGxhdGxuZykge1xuXHRcdFx0dmFyIG1pbkRpc3QgPSBOdW1iZXIuTUFYX1ZBTFVFLFxuXHRcdFx0XHRtaW5JbmRleCxcblx0XHRcdCAgICBpLFxuXHRcdFx0ICAgIGQ7XG5cblx0XHRcdGZvciAoaSA9IHRoaXMuX3JvdXRlLmNvb3JkaW5hdGVzLmxlbmd0aCAtIDE7IGkgPj0gMCA7IGktLSkge1xuXHRcdFx0XHQvLyBUT0RPOiBtYXliZSBkbyB0aGlzIGluIHBpeGVsIHNwYWNlIGluc3RlYWQ/XG5cdFx0XHRcdGQgPSBsYXRsbmcuZGlzdGFuY2VUbyh0aGlzLl9yb3V0ZS5jb29yZGluYXRlc1tpXSk7XG5cdFx0XHRcdGlmIChkIDwgbWluRGlzdCkge1xuXHRcdFx0XHRcdG1pbkluZGV4ID0gaTtcblx0XHRcdFx0XHRtaW5EaXN0ID0gZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gbWluSW5kZXg7XG5cdFx0fSxcblxuXHRcdF9leHRlbmRUb1dheXBvaW50czogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd3BzID0gdGhpcy5fcm91dGUuaW5wdXRXYXlwb2ludHMsXG5cdFx0XHRcdHdwSW5kaWNlcyA9IHRoaXMuX2dldFdheXBvaW50SW5kaWNlcygpLFxuXHRcdFx0ICAgIGksXG5cdFx0XHQgICAgd3BMYXRMbmcsXG5cdFx0XHQgICAgcm91dGVDb29yZDtcblxuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHdwcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR3cExhdExuZyA9IHdwc1tpXS5sYXRMbmc7XG5cdFx0XHRcdHJvdXRlQ29vcmQgPSBMLmxhdExuZyh0aGlzLl9yb3V0ZS5jb29yZGluYXRlc1t3cEluZGljZXNbaV1dKTtcblx0XHRcdFx0aWYgKHdwTGF0TG5nLmRpc3RhbmNlVG8ocm91dGVDb29yZCkgPlxuXHRcdFx0XHRcdHRoaXMub3B0aW9ucy5taXNzaW5nUm91dGVUb2xlcmFuY2UpIHtcblx0XHRcdFx0XHR0aGlzLl9hZGRTZWdtZW50KFt3cExhdExuZywgcm91dGVDb29yZF0sXG5cdFx0XHRcdFx0XHR0aGlzLm9wdGlvbnMubWlzc2luZ1JvdXRlU3R5bGVzKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRfYWRkU2VnbWVudDogZnVuY3Rpb24oY29vcmRzLCBzdHlsZXMsIG1vdXNlbGlzdGVuZXIpIHtcblx0XHRcdHZhciBpLFxuXHRcdFx0XHRwbDtcblxuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHN0eWxlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRwbCA9IEwucG9seWxpbmUoY29vcmRzLCBzdHlsZXNbaV0pO1xuXHRcdFx0XHR0aGlzLmFkZExheWVyKHBsKTtcblx0XHRcdFx0aWYgKG1vdXNlbGlzdGVuZXIpIHtcblx0XHRcdFx0XHRwbC5vbignbW91c2Vkb3duJywgdGhpcy5fb25MaW5lVG91Y2hlZCwgdGhpcyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0X2ZpbmROZWFyZXN0V3BCZWZvcmU6IGZ1bmN0aW9uKGkpIHtcblx0XHRcdHZhciB3cEluZGljZXMgPSB0aGlzLl9nZXRXYXlwb2ludEluZGljZXMoKSxcblx0XHRcdFx0aiA9IHdwSW5kaWNlcy5sZW5ndGggLSAxO1xuXHRcdFx0d2hpbGUgKGogPj0gMCAmJiB3cEluZGljZXNbal0gPiBpKSB7XG5cdFx0XHRcdGotLTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGo7XG5cdFx0fSxcblxuXHRcdF9vbkxpbmVUb3VjaGVkOiBmdW5jdGlvbihlKSB7XG5cdFx0XHR2YXIgYWZ0ZXJJbmRleCA9IHRoaXMuX2ZpbmROZWFyZXN0V3BCZWZvcmUodGhpcy5fZmluZENsb3Nlc3RSb3V0ZVBvaW50KGUubGF0bG5nKSk7XG5cdFx0XHR0aGlzLmZpcmUoJ2xpbmV0b3VjaGVkJywge1xuXHRcdFx0XHRhZnRlckluZGV4OiBhZnRlckluZGV4LFxuXHRcdFx0XHRsYXRsbmc6IGUubGF0bG5nXG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0X2dldFdheXBvaW50SW5kaWNlczogZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoIXRoaXMuX3dwSW5kaWNlcykge1xuXHRcdFx0XHR0aGlzLl93cEluZGljZXMgPSB0aGlzLl9yb3V0ZS53YXlwb2ludEluZGljZXMgfHwgdGhpcy5fZmluZFdheXBvaW50SW5kaWNlcygpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5fd3BJbmRpY2VzO1xuXHRcdH1cblx0fSk7XG5cblx0TC5Sb3V0aW5nLmxpbmUgPSBmdW5jdGlvbihyb3V0ZSwgb3B0aW9ucykge1xuXHRcdHJldHVybiBuZXcgTC5Sb3V0aW5nLkxpbmUocm91dGUsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gTC5Sb3V0aW5nO1xufSkoKTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pXG59LHt9XSwxMTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0TC5Sb3V0aW5nID0gTC5Sb3V0aW5nIHx8IHt9O1xuXG5cdEwuUm91dGluZy5Mb2NhbGl6YXRpb24gPSB7XG5cdFx0J2VuJzoge1xuXHRcdFx0ZGlyZWN0aW9uczoge1xuXHRcdFx0XHROOiAnbm9ydGgnLFxuXHRcdFx0XHRORTogJ25vcnRoZWFzdCcsXG5cdFx0XHRcdEU6ICdlYXN0Jyxcblx0XHRcdFx0U0U6ICdzb3V0aGVhc3QnLFxuXHRcdFx0XHRTOiAnc291dGgnLFxuXHRcdFx0XHRTVzogJ3NvdXRod2VzdCcsXG5cdFx0XHRcdFc6ICd3ZXN0Jyxcblx0XHRcdFx0Tlc6ICdub3J0aHdlc3QnXG5cdFx0XHR9LFxuXHRcdFx0aW5zdHJ1Y3Rpb25zOiB7XG5cdFx0XHRcdC8vIGluc3RydWN0aW9uLCBwb3N0Zml4IGlmIHRoZSByb2FkIGlzIG5hbWVkXG5cdFx0XHRcdCdIZWFkJzpcblx0XHRcdFx0XHRbJ0hlYWQge2Rpcn0nLCAnIG9uIHtyb2FkfSddLFxuXHRcdFx0XHQnQ29udGludWUnOlxuXHRcdFx0XHRcdFsnQ29udGludWUge2Rpcn0nLCAnIG9uIHtyb2FkfSddLFxuXHRcdFx0XHQnU2xpZ2h0UmlnaHQnOlxuXHRcdFx0XHRcdFsnU2xpZ2h0IHJpZ2h0JywgJyBvbnRvIHtyb2FkfSddLFxuXHRcdFx0XHQnUmlnaHQnOlxuXHRcdFx0XHRcdFsnUmlnaHQnLCAnIG9udG8ge3JvYWR9J10sXG5cdFx0XHRcdCdTaGFycFJpZ2h0Jzpcblx0XHRcdFx0XHRbJ1NoYXJwIHJpZ2h0JywgJyBvbnRvIHtyb2FkfSddLFxuXHRcdFx0XHQnVHVybkFyb3VuZCc6XG5cdFx0XHRcdFx0WydUdXJuIGFyb3VuZCddLFxuXHRcdFx0XHQnU2hhcnBMZWZ0Jzpcblx0XHRcdFx0XHRbJ1NoYXJwIGxlZnQnLCAnIG9udG8ge3JvYWR9J10sXG5cdFx0XHRcdCdMZWZ0Jzpcblx0XHRcdFx0XHRbJ0xlZnQnLCAnIG9udG8ge3JvYWR9J10sXG5cdFx0XHRcdCdTbGlnaHRMZWZ0Jzpcblx0XHRcdFx0XHRbJ1NsaWdodCBsZWZ0JywgJyBvbnRvIHtyb2FkfSddLFxuXHRcdFx0XHQnV2F5cG9pbnRSZWFjaGVkJzpcblx0XHRcdFx0XHRbJ1dheXBvaW50IHJlYWNoZWQnXSxcblx0XHRcdFx0J1JvdW5kYWJvdXQnOlxuXHRcdFx0XHRcdFsnVGFrZSB0aGUge2V4aXRTdHJ9IGV4aXQgaW4gdGhlIHJvdW5kYWJvdXQnLCAnIG9udG8ge3JvYWR9J10sXG5cdFx0XHRcdCdEZXN0aW5hdGlvblJlYWNoZWQnOlxuXHRcdFx0XHRcdFsnRGVzdGluYXRpb24gcmVhY2hlZCddLFxuXHRcdFx0fSxcblx0XHRcdGZvcm1hdE9yZGVyOiBmdW5jdGlvbihuKSB7XG5cdFx0XHRcdHZhciBpID0gbiAlIDEwIC0gMSxcblx0XHRcdFx0c3VmZml4ID0gWydzdCcsICduZCcsICdyZCddO1xuXG5cdFx0XHRcdHJldHVybiBzdWZmaXhbaV0gPyBuICsgc3VmZml4W2ldIDogbiArICd0aCc7XG5cdFx0XHR9LFxuXHRcdFx0dWk6IHtcblx0XHRcdFx0c3RhcnRQbGFjZWhvbGRlcjogJ1N0YXJ0Jyxcblx0XHRcdFx0dmlhUGxhY2Vob2xkZXI6ICdWaWEge3ZpYU51bWJlcn0nLFxuXHRcdFx0XHRlbmRQbGFjZWhvbGRlcjogJ0VuZCdcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0J2RlJzoge1xuXHRcdFx0ZGlyZWN0aW9uczoge1xuXHRcdFx0XHROOiAnTm9yZGVuJyxcblx0XHRcdFx0TkU6ICdOb3Jkb3N0ZW4nLFxuXHRcdFx0XHRFOiAnT3N0ZW4nLFxuXHRcdFx0XHRTRTogJ1PDvGRvc3RlbicsXG5cdFx0XHRcdFM6ICdTw7xkZW4nLFxuXHRcdFx0XHRTVzogJ1PDvGR3ZXN0ZW4nLFxuXHRcdFx0XHRXOiAnV2VzdGVuJyxcblx0XHRcdFx0Tlc6ICdOb3Jkd2VzdGVuJ1xuXHRcdFx0fSxcblx0XHRcdGluc3RydWN0aW9uczoge1xuXHRcdFx0XHQvLyBpbnN0cnVjdGlvbiwgcG9zdGZpeCBpZiB0aGUgcm9hZCBpcyBuYW1lZFxuXHRcdFx0XHQnSGVhZCc6XG5cdFx0XHRcdFx0WydSaWNodHVuZyB7ZGlyfScsICcgYXVmIHtyb2FkfSddLFxuXHRcdFx0XHQnQ29udGludWUnOlxuXHRcdFx0XHRcdFsnR2VyYWRlYXVzIFJpY2h0dW5nIHtkaXJ9JywgJyBhdWYge3JvYWR9J10sXG5cdFx0XHRcdCdTbGlnaHRSaWdodCc6XG5cdFx0XHRcdFx0WydMZWljaHQgcmVjaHRzIGFiYmllZ2VuJywgJyBhdWYge3JvYWR9J10sXG5cdFx0XHRcdCdSaWdodCc6XG5cdFx0XHRcdFx0WydSZWNodHMgYWJiaWVnZW4nLCAnIGF1ZiB7cm9hZH0nXSxcblx0XHRcdFx0J1NoYXJwUmlnaHQnOlxuXHRcdFx0XHRcdFsnU2NoYXJmIHJlY2h0cyBhYmJpZWdlbicsICcgYXVmIHtyb2FkfSddLFxuXHRcdFx0XHQnVHVybkFyb3VuZCc6XG5cdFx0XHRcdFx0WydXZW5kZW4nXSxcblx0XHRcdFx0J1NoYXJwTGVmdCc6XG5cdFx0XHRcdFx0WydTY2hhcmYgbGlua3MgYWJiaWVnZW4nLCAnIGF1ZiB7cm9hZH0nXSxcblx0XHRcdFx0J0xlZnQnOlxuXHRcdFx0XHRcdFsnTGlua3MgYWJiaWVnZW4nLCAnIGF1ZiB7cm9hZH0nXSxcblx0XHRcdFx0J1NsaWdodExlZnQnOlxuXHRcdFx0XHRcdFsnTGVpY2h0IGxpbmtzIGFiYmllZ2VuJywgJyBhdWYge3JvYWR9J10sXG5cdFx0XHRcdCdXYXlwb2ludFJlYWNoZWQnOlxuXHRcdFx0XHRcdFsnWndpc2NoZW5oYWx0IGVycmVpY2h0J10sXG5cdFx0XHRcdCdSb3VuZGFib3V0Jzpcblx0XHRcdFx0XHRbJ05laG1lbiBTaWUgZGllIHtleGl0U3RyfSBBdXNmYWhydCBpbSBLcmVpc3ZlcmtlaHInLCAnIGF1ZiB7cm9hZH0nXSxcblx0XHRcdFx0J0Rlc3RpbmF0aW9uUmVhY2hlZCc6XG5cdFx0XHRcdFx0WydTaWUgaGFiZW4gaWhyIFppZWwgZXJyZWljaHQnXSxcblx0XHRcdH0sXG5cdFx0XHRmb3JtYXRPcmRlcjogZnVuY3Rpb24obikge1xuXHRcdFx0XHRyZXR1cm4gbiArICcuJztcblx0XHRcdH0sXG5cdFx0XHR1aToge1xuXHRcdFx0XHRzdGFydFBsYWNlaG9sZGVyOiAnU3RhcnQnLFxuXHRcdFx0XHR2aWFQbGFjZWhvbGRlcjogJ1ZpYSB7dmlhTnVtYmVyfScsXG5cdFx0XHRcdGVuZFBsYWNlaG9sZGVyOiAnWmllbCdcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0J3N2Jzoge1xuXHRcdFx0ZGlyZWN0aW9uczoge1xuXHRcdFx0XHROOiAnbm9ycicsXG5cdFx0XHRcdE5FOiAnbm9yZG9zdCcsXG5cdFx0XHRcdEU6ICfDtnN0Jyxcblx0XHRcdFx0U0U6ICdzeWRvc3QnLFxuXHRcdFx0XHRTOiAnc3lkJyxcblx0XHRcdFx0U1c6ICdzeWR2w6RzdCcsXG5cdFx0XHRcdFc6ICd2w6RzdCcsXG5cdFx0XHRcdE5XOiAnbm9yZHbDpHN0J1xuXHRcdFx0fSxcblx0XHRcdGluc3RydWN0aW9uczoge1xuXHRcdFx0XHQvLyBpbnN0cnVjdGlvbiwgcG9zdGZpeCBpZiB0aGUgcm9hZCBpcyBuYW1lZFxuXHRcdFx0XHQnSGVhZCc6XG5cdFx0XHRcdFx0WyfDhWsgw6V0IHtkaXJ9JywgJyBww6Uge3JvYWR9J10sXG5cdFx0XHRcdCdDb250aW51ZSc6XG5cdFx0XHRcdFx0WydGb3J0c8OkdHQge2Rpcn0nLCAnIHDDpSB7cm9hZH0nXSxcblx0XHRcdFx0J1NsaWdodFJpZ2h0Jzpcblx0XHRcdFx0XHRbJ1N2YWd0IGjDtmdlcicsICcgcMOlIHtyb2FkfSddLFxuXHRcdFx0XHQnUmlnaHQnOlxuXHRcdFx0XHRcdFsnU3bDpG5nIGjDtmdlcicsICcgcMOlIHtyb2FkfSddLFxuXHRcdFx0XHQnU2hhcnBSaWdodCc6XG5cdFx0XHRcdFx0WydTa2FycHQgaMO2Z2VyJywgJyBww6Uge3JvYWR9J10sXG5cdFx0XHRcdCdUdXJuQXJvdW5kJzpcblx0XHRcdFx0XHRbJ1bDpG5kJ10sXG5cdFx0XHRcdCdTaGFycExlZnQnOlxuXHRcdFx0XHRcdFsnU2thcnB0IHbDpG5zdGVyJywgJyBww6Uge3JvYWR9J10sXG5cdFx0XHRcdCdMZWZ0Jzpcblx0XHRcdFx0XHRbJ1N2w6RuZyB2w6Ruc3RlcicsICcgcMOlIHtyb2FkfSddLFxuXHRcdFx0XHQnU2xpZ2h0TGVmdCc6XG5cdFx0XHRcdFx0WydTdmFndCB2w6Ruc3RlcicsICcgcMOlIHtyb2FkfSddLFxuXHRcdFx0XHQnV2F5cG9pbnRSZWFjaGVkJzpcblx0XHRcdFx0XHRbJ1ZpYXB1bmt0IG7DpWRkJ10sXG5cdFx0XHRcdCdSb3VuZGFib3V0Jzpcblx0XHRcdFx0XHRbJ1RhZyB7ZXhpdFN0cn0gYXZmYXJ0ZW4gaSByb25kZWxsZW4nLCAnIHRpbGwge3JvYWR9J10sXG5cdFx0XHRcdCdEZXN0aW5hdGlvblJlYWNoZWQnOlxuXHRcdFx0XHRcdFsnRnJhbW1lIHZpZCByZXNhbnMgbcOlbCddLFxuXHRcdFx0fSxcblx0XHRcdGZvcm1hdE9yZGVyOiBmdW5jdGlvbihuKSB7XG5cdFx0XHRcdHJldHVybiBbJ2bDtnJzdGEnLCAnYW5kcmEnLCAndHJlZGplJywgJ2Zqw6RyZGUnLCAnZmVtdGUnLFxuXHRcdFx0XHRcdCdzasOkdHRlJywgJ3NqdW5kZScsICfDpXR0b25kZScsICduaW9uZGUnLCAndGlvbmRlJ1xuXHRcdFx0XHRcdC8qIENhbid0IHBvc3NpYmx5IGJlIG1vcmUgdGhhbiB0ZW4gZXhpdHMsIGNhbiB0aGVyZT8gKi9dW24gLSAxXTtcblx0XHRcdH0sXG5cdFx0XHR1aToge1xuXHRcdFx0XHRzdGFydFBsYWNlaG9sZGVyOiAnRnLDpW4nLFxuXHRcdFx0XHR2aWFQbGFjZWhvbGRlcjogJ1ZpYSB7dmlhTnVtYmVyfScsXG5cdFx0XHRcdGVuZFBsYWNlaG9sZGVyOiAnVGlsbCdcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0J3NwJzoge1xuXHRcdFx0ZGlyZWN0aW9uczoge1xuXHRcdFx0XHROOiAnbm9ydGUnLFxuXHRcdFx0XHRORTogJ25vcmVzdGUnLFxuXHRcdFx0XHRFOiAnZXN0ZScsXG5cdFx0XHRcdFNFOiAnc3VyZXN0ZScsXG5cdFx0XHRcdFM6ICdzdXInLFxuXHRcdFx0XHRTVzogJ3N1cm9lc3RlJyxcblx0XHRcdFx0VzogJ29lc3RlJyxcblx0XHRcdFx0Tlc6ICdub3JvZXN0ZSdcblx0XHRcdH0sXG5cdFx0XHRpbnN0cnVjdGlvbnM6IHtcblx0XHRcdFx0Ly8gaW5zdHJ1Y3Rpb24sIHBvc3RmaXggaWYgdGhlIHJvYWQgaXMgbmFtZWRcblx0XHRcdFx0J0hlYWQnOlxuXHRcdFx0XHRcdFsnRGVyZWNobyB7ZGlyfScsICcgc29icmUge3JvYWR9J10sXG5cdFx0XHRcdCdDb250aW51ZSc6XG5cdFx0XHRcdFx0WydDb250aW51YXIge2Rpcn0nLCAnIGVuIHtyb2FkfSddLFxuXHRcdFx0XHQnU2xpZ2h0UmlnaHQnOlxuXHRcdFx0XHRcdFsnTGV2ZSBnaXJvIGEgbGEgZGVyZWNoYScsICcgc29icmUge3JvYWR9J10sXG5cdFx0XHRcdCdSaWdodCc6XG5cdFx0XHRcdFx0WydEZXJlY2hhJywgJyBzb2JyZSB7cm9hZH0nXSxcblx0XHRcdFx0J1NoYXJwUmlnaHQnOlxuXHRcdFx0XHRcdFsnR2lybyBwcm9udW5jaWFkbyBhIGxhIGRlcmVjaGEnLCAnIHNvYnJlIHtyb2FkfSddLFxuXHRcdFx0XHQnVHVybkFyb3VuZCc6XG5cdFx0XHRcdFx0WydEYXIgdnVlbHRhJ10sXG5cdFx0XHRcdCdTaGFycExlZnQnOlxuXHRcdFx0XHRcdFsnR2lybyBwcm9udW5jaWFkbyBhIGxhIGl6cXVpZXJkYScsICcgc29icmUge3JvYWR9J10sXG5cdFx0XHRcdCdMZWZ0Jzpcblx0XHRcdFx0XHRbJ0l6cXVpZXJkYScsICcgZW4ge3JvYWR9J10sXG5cdFx0XHRcdCdTbGlnaHRMZWZ0Jzpcblx0XHRcdFx0XHRbJ0xldmUgZ2lybyBhIGxhIGl6cXVpZXJkYScsICcgZW4ge3JvYWR9J10sXG5cdFx0XHRcdCdXYXlwb2ludFJlYWNoZWQnOlxuXHRcdFx0XHRcdFsnTGxlZ8OzIGEgdW4gcHVudG8gZGVsIGNhbWlubyddLFxuXHRcdFx0XHQnUm91bmRhYm91dCc6XG5cdFx0XHRcdFx0WydUb21hciB7ZXhpdFN0cn0gc2FsaWRhIGVuIGxhIHJvdG9uZGEnLCAnIGVuIHtyb2FkfSddLFxuXHRcdFx0XHQnRGVzdGluYXRpb25SZWFjaGVkJzpcblx0XHRcdFx0XHRbJ0xsZWdhZGEgYSBkZXN0aW5vJ10sXG5cdFx0XHR9LFxuXHRcdFx0Zm9ybWF0T3JkZXI6IGZ1bmN0aW9uKG4pIHtcblx0XHRcdFx0cmV0dXJuIG4gKyAnwronO1xuXHRcdFx0fSxcblx0XHRcdHVpOiB7XG5cdFx0XHRcdHN0YXJ0UGxhY2Vob2xkZXI6ICdJbmljaW8nLFxuXHRcdFx0XHR2aWFQbGFjZWhvbGRlcjogJ1ZpYSB7dmlhTnVtYmVyfScsXG5cdFx0XHRcdGVuZFBsYWNlaG9sZGVyOiAnRGVzdGlubydcblx0XHRcdH1cblx0XHR9LFxuXHRcdCdubCc6IHtcblx0XHRcdGRpcmVjdGlvbnM6IHtcblx0XHRcdFx0TjogJ25vb3JkZWxpamtlJyxcblx0XHRcdFx0TkU6ICdub29yZG9vc3RlbGlqa2UnLFxuXHRcdFx0XHRFOiAnb29zdGVsaWprZScsXG5cdFx0XHRcdFNFOiAnenVpZG9vc3RlbGlqa2UnLFxuXHRcdFx0XHRTOiAnenVpZGVsaWprZScsXG5cdFx0XHRcdFNXOiAnenVpZGV3ZXN0ZWxpamtlJyxcblx0XHRcdFx0VzogJ3dlc3RlbGlqa2UnLFxuXHRcdFx0XHROVzogJ25vb3Jkd2VzdGVsaWprZSdcblx0XHRcdH0sXG5cdFx0XHRpbnN0cnVjdGlvbnM6IHtcblx0XHRcdFx0Ly8gaW5zdHJ1Y3Rpb24sIHBvc3RmaXggaWYgdGhlIHJvYWQgaXMgbmFtZWRcblx0XHRcdFx0J0hlYWQnOlxuXHRcdFx0XHRcdFsnVmVydHJlayBpbiB7ZGlyfSByaWNodGluZycsICcgZGUge3JvYWR9IG9wJ10sXG5cdFx0XHRcdCdDb250aW51ZSc6XG5cdFx0XHRcdFx0WydHYSBpbiB7ZGlyfSByaWNodGluZycsICcgZGUge3JvYWR9IG9wJ10sXG5cdFx0XHRcdCdTbGlnaHRSaWdodCc6XG5cdFx0XHRcdFx0WydWb2xnIGRlIHdlZyBuYWFyIHJlY2h0cycsICcgZGUge3JvYWR9IG9wJ10sXG5cdFx0XHRcdCdSaWdodCc6XG5cdFx0XHRcdFx0WydHYSByZWNodHNhZicsICcgZGUge3JvYWR9IG9wJ10sXG5cdFx0XHRcdCdTaGFycFJpZ2h0Jzpcblx0XHRcdFx0XHRbJ0dhIHNjaGVycGUgYm9jaHQgbmFhciByZWNodHMnLCAnIGRlIHtyb2FkfSBvcCddLFxuXHRcdFx0XHQnVHVybkFyb3VuZCc6XG5cdFx0XHRcdFx0WydLZWVyIG9tJ10sXG5cdFx0XHRcdCdTaGFycExlZnQnOlxuXHRcdFx0XHRcdFsnR2Egc2NoZXJwZSBib2NodCBuYWFyIGxpbmtzJywgJyBkZSB7cm9hZH0gb3AnXSxcblx0XHRcdFx0J0xlZnQnOlxuXHRcdFx0XHRcdFsnR2EgbGlua3NhZicsICcgZGUge3JvYWR9IG9wJ10sXG5cdFx0XHRcdCdTbGlnaHRMZWZ0Jzpcblx0XHRcdFx0XHRbJ1ZvbGcgZGUgd2VnIG5hYXIgbGlua3MnLCAnIGRlIHtyb2FkfSBvcCddLFxuXHRcdFx0XHQnV2F5cG9pbnRSZWFjaGVkJzpcblx0XHRcdFx0XHRbJ0Fhbmdla29tZW4gYmlqIHR1c3NlbnB1bnQnXSxcblx0XHRcdFx0J1JvdW5kYWJvdXQnOlxuXHRcdFx0XHRcdFsnTmVlbSBkZSB7ZXhpdFN0cn0gYWZzbGFnIG9wIGRlIHJvdG9uZGUnLCAnIGRlIHtyb2FkfSBvcCddLFxuXHRcdFx0XHQnRGVzdGluYXRpb25SZWFjaGVkJzpcblx0XHRcdFx0XHRbJ0Fhbmdla29tZW4gb3AgZWluZHB1bnQnXSxcblx0XHRcdH0sXG5cdFx0XHRmb3JtYXRPcmRlcjogZnVuY3Rpb24obikge1xuXHRcdFx0XHRpZiAobiA9PT0gMSB8fCBuID49IDIwKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG4gKyAnc3RlJztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gbiArICdkZSc7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR1aToge1xuXHRcdFx0XHRzdGFydFBsYWNlaG9sZGVyOiAnVmVydHJla3B1bnQnLFxuXHRcdFx0XHR2aWFQbGFjZWhvbGRlcjogJ1ZpYSB7dmlhTnVtYmVyfScsXG5cdFx0XHRcdGVuZFBsYWNlaG9sZGVyOiAnQmVzdGVtbWluZydcblx0XHRcdH1cblx0XHR9LFxuXHRcdCdmcic6IHtcblx0XHRcdGRpcmVjdGlvbnM6IHtcblx0XHRcdFx0TjogJ25vcmQnLFxuXHRcdFx0XHRORTogJ25vcmQtZXN0Jyxcblx0XHRcdFx0RTogJ2VzdCcsXG5cdFx0XHRcdFNFOiAnc3VkLWVzdCcsXG5cdFx0XHRcdFM6ICdzdWQnLFxuXHRcdFx0XHRTVzogJ3N1ZC1vdWVzdCcsXG5cdFx0XHRcdFc6ICdvdWVzdCcsXG5cdFx0XHRcdE5XOiAnbm9yZC1vdWVzdCdcblx0XHRcdH0sXG5cdFx0XHRpbnN0cnVjdGlvbnM6IHtcblx0XHRcdFx0Ly8gaW5zdHJ1Y3Rpb24sIHBvc3RmaXggaWYgdGhlIHJvYWQgaXMgbmFtZWRcblx0XHRcdFx0J0hlYWQnOlxuXHRcdFx0XHRcdFsnVG91dCBkcm9pdCBhdSB7ZGlyfScsICcgc3VyIHtyb2FkfSddLFxuXHRcdFx0XHQnQ29udGludWUnOlxuXHRcdFx0XHRcdFsnQ29udGludWVyIGF1IHtkaXJ9JywgJyBzdXIge3JvYWR9J10sXG5cdFx0XHRcdCdTbGlnaHRSaWdodCc6XG5cdFx0XHRcdFx0WydMw6lnw6hyZW1lbnQgw6AgZHJvaXRlJywgJyBzdXIge3JvYWR9J10sXG5cdFx0XHRcdCdSaWdodCc6XG5cdFx0XHRcdFx0WydBIGRyb2l0ZScsICcgc3VyIHtyb2FkfSddLFxuXHRcdFx0XHQnU2hhcnBSaWdodCc6XG5cdFx0XHRcdFx0WydDb21wbMOodGVtZW50IMOgIGRyb2l0ZScsICcgc3VyIHtyb2FkfSddLFxuXHRcdFx0XHQnVHVybkFyb3VuZCc6XG5cdFx0XHRcdFx0WydGYWlyZSBkZW1pLXRvdXInXSxcblx0XHRcdFx0J1NoYXJwTGVmdCc6XG5cdFx0XHRcdFx0WydDb21wbMOodGVtZW50IMOgIGdhdWNoZScsICcgc3VyIHtyb2FkfSddLFxuXHRcdFx0XHQnTGVmdCc6XG5cdFx0XHRcdFx0WydBIGdhdWNoZScsICcgc3VyIHtyb2FkfSddLFxuXHRcdFx0XHQnU2xpZ2h0TGVmdCc6XG5cdFx0XHRcdFx0WydMw6lnw6hyZW1lbnQgw6AgZ2F1Y2hlJywgJyBzdXIge3JvYWR9J10sXG5cdFx0XHRcdCdXYXlwb2ludFJlYWNoZWQnOlxuXHRcdFx0XHRcdFsnUG9pbnQgZFxcJ8OpdGFwZSBhdHRlaW50J10sXG5cdFx0XHRcdCdSb3VuZGFib3V0Jzpcblx0XHRcdFx0XHRbJ0F1IHJvbmQtcG9pbnQsIHByZW5leiBsYSB7ZXhpdFN0cn0gc29ydGllJywgJyBzdXIge3JvYWR9J10sXG5cdFx0XHRcdCdEZXN0aW5hdGlvblJlYWNoZWQnOlxuXHRcdFx0XHRcdFsnRGVzdGluYXRpb24gYXR0ZWludGUnXSxcblx0XHRcdH0sXG5cdFx0XHRmb3JtYXRPcmRlcjogZnVuY3Rpb24obikge1xuXHRcdFx0XHRyZXR1cm4gbiArICfCuic7XG5cdFx0XHR9LFxuXHRcdFx0dWk6IHtcblx0XHRcdFx0c3RhcnRQbGFjZWhvbGRlcjogJ0TDqXBhcnQnLFxuXHRcdFx0XHR2aWFQbGFjZWhvbGRlcjogJ0ludGVybcOpZGlhaXJlIHt2aWFOdW1iZXJ9Jyxcblx0XHRcdFx0ZW5kUGxhY2Vob2xkZXI6ICdBcnJpdsOpZSdcblx0XHRcdH1cblx0XHR9LFxuXHRcdCdpdCc6IHtcblx0XHRcdGRpcmVjdGlvbnM6IHtcblx0XHRcdFx0TjogJ25vcmQnLFxuXHRcdFx0XHRORTogJ25vcmQtZXN0Jyxcblx0XHRcdFx0RTogJ2VzdCcsXG5cdFx0XHRcdFNFOiAnc3VkLWVzdCcsXG5cdFx0XHRcdFM6ICdzdWQnLFxuXHRcdFx0XHRTVzogJ3N1ZC1vdmVzdCcsXG5cdFx0XHRcdFc6ICdvdmVzdCcsXG5cdFx0XHRcdE5XOiAnbm9yZC1vdmVzdCdcblx0XHRcdH0sXG5cdFx0XHRpbnN0cnVjdGlvbnM6IHtcblx0XHRcdFx0Ly8gaW5zdHJ1Y3Rpb24sIHBvc3RmaXggaWYgdGhlIHJvYWQgaXMgbmFtZWRcblx0XHRcdFx0J0hlYWQnOlxuXHRcdFx0XHRcdFsnRHJpdHRvIHZlcnNvIHtkaXJ9JywgJyBzdSB7cm9hZH0nXSxcblx0XHRcdFx0J0NvbnRpbnVlJzpcblx0XHRcdFx0XHRbJ0NvbnRpbnVhcmUgdmVyc28ge2Rpcn0nLCAnIHN1IHtyb2FkfSddLFxuXHRcdFx0XHQnU2xpZ2h0UmlnaHQnOlxuXHRcdFx0XHRcdFsnTWFudGVuZXJlIGxhIGRlc3RyYScsICcgc3Uge3JvYWR9J10sXG5cdFx0XHRcdCdSaWdodCc6XG5cdFx0XHRcdFx0WydBIGRlc3RyYScsICcgc3Uge3JvYWR9J10sXG5cdFx0XHRcdCdTaGFycFJpZ2h0Jzpcblx0XHRcdFx0XHRbJ1N0cmV0dGFtZW50ZSBhIGRlc3RyYScsICcgc3Uge3JvYWR9J10sXG5cdFx0XHRcdCdUdXJuQXJvdW5kJzpcblx0XHRcdFx0XHRbJ0ZhcmUgaW52ZXJzaW9uZSBkaSBtYXJjaWEnXSxcblx0XHRcdFx0J1NoYXJwTGVmdCc6XG5cdFx0XHRcdFx0WydTdHJldHRhbWVudGUgYSBzaW5pc3RyYScsICcgc3Uge3JvYWR9J10sXG5cdFx0XHRcdCdMZWZ0Jzpcblx0XHRcdFx0XHRbJ0Egc2luaXN0cmEnLCAnIHN1ciB7cm9hZH0nXSxcblx0XHRcdFx0J1NsaWdodExlZnQnOlxuXHRcdFx0XHRcdFsnTWFudGVuZXJlIGxhIHNpbmlzdHJhJywgJyBzdSB7cm9hZH0nXSxcblx0XHRcdFx0J1dheXBvaW50UmVhY2hlZCc6XG5cdFx0XHRcdFx0WydQdW50byBkaSBwYXNzYWdnaW8gcmFnZ2l1bnRvJ10sXG5cdFx0XHRcdCdSb3VuZGFib3V0Jzpcblx0XHRcdFx0XHRbJ0FsbGEgcm90b25kYSwgcHJlbmRlcmUgbGEge2V4aXRTdHJ9IHVzY2l0YSddLFxuXHRcdFx0XHQnRGVzdGluYXRpb25SZWFjaGVkJzpcblx0XHRcdFx0XHRbJ0Rlc3RpbmF6aW9uZSByYWdnaXVudGEnXSxcblx0XHRcdH0sXG5cdFx0XHRmb3JtYXRPcmRlcjogZnVuY3Rpb24obikge1xuXHRcdFx0XHRyZXR1cm4gbiArICfCuic7XG5cdFx0XHR9LFxuXHRcdFx0dWk6IHtcblx0XHRcdFx0c3RhcnRQbGFjZWhvbGRlcjogJ1BhcnRlbnphJyxcblx0XHRcdFx0dmlhUGxhY2Vob2xkZXI6ICdJbnRlcm1lZGlhIHt2aWFOdW1iZXJ9Jyxcblx0XHRcdFx0ZW5kUGxhY2Vob2xkZXI6ICdEZXN0aW5hemlvbmUnXG5cdFx0XHR9XG5cdFx0fSxcblx0XHQncHQnOiB7XG5cdFx0XHRkaXJlY3Rpb25zOiB7XG5cdFx0XHRcdE46ICdub3J0ZScsXG5cdFx0XHRcdE5FOiAnbm9yZGVzdGUnLFxuXHRcdFx0XHRFOiAnbGVzdGUnLFxuXHRcdFx0XHRTRTogJ3N1ZGVzdGUnLFxuXHRcdFx0XHRTOiAnc3VsJyxcblx0XHRcdFx0U1c6ICdzdWRvZXN0ZScsXG5cdFx0XHRcdFc6ICdvZXN0ZScsXG5cdFx0XHRcdE5XOiAnbm9yb2VzdGUnXG5cdFx0XHR9LFxuXHRcdFx0aW5zdHJ1Y3Rpb25zOiB7XG5cdFx0XHRcdC8vIGluc3RydWN0aW9uLCBwb3N0Zml4IGlmIHRoZSByb2FkIGlzIG5hbWVkXG5cdFx0XHRcdCdIZWFkJzpcblx0XHRcdFx0XHRbJ1NpZ2Ege2Rpcn0nLCAnIG5hIHtyb2FkfSddLFxuXHRcdFx0XHQnQ29udGludWUnOlxuXHRcdFx0XHRcdFsnQ29udGludWUge2Rpcn0nLCAnIG5hIHtyb2FkfSddLFxuXHRcdFx0XHQnU2xpZ2h0UmlnaHQnOlxuXHRcdFx0XHRcdFsnQ3VydmEgbGlnZWlyYSBhIGRpcmVpdGEnLCAnIG5hIHtyb2FkfSddLFxuXHRcdFx0XHQnUmlnaHQnOlxuXHRcdFx0XHRcdFsnQ3VydmEgYSBkaXJlaXRhJywgJyBuYSB7cm9hZH0nXSxcblx0XHRcdFx0J1NoYXJwUmlnaHQnOlxuXHRcdFx0XHRcdFsnQ3VydmEgZmVjaGFkYSBhIGRpcmVpdGEnLCAnIG5hIHtyb2FkfSddLFxuXHRcdFx0XHQnVHVybkFyb3VuZCc6XG5cdFx0XHRcdFx0WydSZXRvcm5lJ10sXG5cdFx0XHRcdCdTaGFycExlZnQnOlxuXHRcdFx0XHRcdFsnQ3VydmEgZmVjaGFkYSBhIGVzcXVlcmRhJywgJyBuYSB7cm9hZH0nXSxcblx0XHRcdFx0J0xlZnQnOlxuXHRcdFx0XHRcdFsnQ3VydmEgYSBlc3F1ZXJkYScsICcgbmEge3JvYWR9J10sXG5cdFx0XHRcdCdTbGlnaHRMZWZ0Jzpcblx0XHRcdFx0XHRbJ0N1cnZhIGxpZ3VlaXJhIGEgZXNxdWVyZGEnLCAnIG5hIHtyb2FkfSddLFxuXHRcdFx0XHQnV2F5cG9pbnRSZWFjaGVkJzpcblx0XHRcdFx0XHRbJ1BvbnRvIGRlIGludGVyZXNzZSBhdGluZ2lkbyddLFxuXHRcdFx0XHQnUm91bmRhYm91dCc6XG5cdFx0XHRcdFx0WydQZWd1ZSBhIHtleGl0U3RyfSBzYcOtZGEgbmEgcm90YXTDs3JpYScsICcgbmEge3JvYWR9J10sXG5cdFx0XHRcdCdEZXN0aW5hdGlvblJlYWNoZWQnOlxuXHRcdFx0XHRcdFsnRGVzdGlubyBhdGluZ2lkbyddLFxuXHRcdFx0fSxcblx0XHRcdGZvcm1hdE9yZGVyOiBmdW5jdGlvbihuKSB7XG5cdFx0XHRcdHJldHVybiBuICsgJ8K6Jztcblx0XHRcdH0sXG5cdFx0XHR1aToge1xuXHRcdFx0XHRzdGFydFBsYWNlaG9sZGVyOiAnT3JpZ2VtJyxcblx0XHRcdFx0dmlhUGxhY2Vob2xkZXI6ICdJbnRlcm3DqWRpbyB7dmlhTnVtYmVyfScsXG5cdFx0XHRcdGVuZFBsYWNlaG9sZGVyOiAnRGVzdGlubydcblx0XHRcdH1cblx0XHR9LFxuXHRcdCdzayc6IHtcblx0XHRcdGRpcmVjdGlvbnM6IHtcblx0XHRcdFx0TjogJ3NldmVyJyxcblx0XHRcdFx0TkU6ICdzZXJ2ZXJvdsO9Y2hvZCcsXG5cdFx0XHRcdEU6ICd2w71jaG9kJyxcblx0XHRcdFx0U0U6ICdqdWhvdsO9Y2hvZCcsXG5cdFx0XHRcdFM6ICdqdWgnLFxuXHRcdFx0XHRTVzogJ2p1aG96w6FwYWQnLFxuXHRcdFx0XHRXOiAnesOhcGFkJyxcblx0XHRcdFx0Tlc6ICdzZXJ2ZXJvesOhcGFkJ1xuXHRcdFx0fSxcblx0XHRcdGluc3RydWN0aW9uczoge1xuXHRcdFx0XHQvLyBpbnN0cnVjdGlvbiwgcG9zdGZpeCBpZiB0aGUgcm9hZCBpcyBuYW1lZFxuXHRcdFx0XHQnSGVhZCc6XG5cdFx0XHRcdFx0WydNaWVydGUgbmEge2Rpcn0nLCAnIG5hIHtyb2FkfSddLFxuXHRcdFx0XHQnQ29udGludWUnOlxuXHRcdFx0XHRcdFsnUG9rcmHEjXVqdGUgbmEge2Rpcn0nLCAnIG5hIHtyb2FkfSddLFxuXHRcdFx0XHQnU2xpZ2h0UmlnaHQnOlxuXHRcdFx0XHRcdFsnTWllcm5lIGRvcHJhdmEnLCAnIG5hIHtyb2FkfSddLFxuXHRcdFx0XHQnUmlnaHQnOlxuXHRcdFx0XHRcdFsnRG9wcmF2YScsICcgbmEge3JvYWR9J10sXG5cdFx0XHRcdCdTaGFycFJpZ2h0Jzpcblx0XHRcdFx0XHRbJ1BydWRrbyBkb3ByYXZhJywgJyBuYSB7cm9hZH0nXSxcblx0XHRcdFx0J1R1cm5Bcm91bmQnOlxuXHRcdFx0XHRcdFsnT3RvxI10ZSBzYSddLFxuXHRcdFx0XHQnU2hhcnBMZWZ0Jzpcblx0XHRcdFx0XHRbJ1BydWRrbyBkb8S+YXZhJywgJyBuYSB7cm9hZH0nXSxcblx0XHRcdFx0J0xlZnQnOlxuXHRcdFx0XHRcdFsnRG/EvmF2YScsICcgbmEge3JvYWR9J10sXG5cdFx0XHRcdCdTbGlnaHRMZWZ0Jzpcblx0XHRcdFx0XHRbJ01pZXJuZSBkb8S+YXZhJywgJyBuYSB7cm9hZH0nXSxcblx0XHRcdFx0J1dheXBvaW50UmVhY2hlZCc6XG5cdFx0XHRcdFx0WydTdGUgdiBwcmVqYXpkb3ZvbSBib2RlLiddLFxuXHRcdFx0XHQnUm91bmRhYm91dCc6XG5cdFx0XHRcdFx0WydPZGJvxI10ZSBuYSB7ZXhpdFN0cn0gdsO9amF6ZGUnLCAnIG5hIHtyb2FkfSddLFxuXHRcdFx0XHQnRGVzdGluYXRpb25SZWFjaGVkJzpcblx0XHRcdFx0XHRbJ1ByacWhbGkgc3RlIGRvIGNpZcS+YS4nXSxcblx0XHRcdH0sXG5cdFx0XHRmb3JtYXRPcmRlcjogZnVuY3Rpb24obikge1xuXHRcdFx0XHR2YXIgaSA9IG4gJSAxMCAtIDEsXG5cdFx0XHRcdHN1ZmZpeCA9IFsnLicsICcuJywgJy4nXTtcblxuXHRcdFx0XHRyZXR1cm4gc3VmZml4W2ldID8gbiArIHN1ZmZpeFtpXSA6IG4gKyAnLic7XG5cdFx0XHR9LFxuXHRcdFx0dWk6IHtcblx0XHRcdFx0c3RhcnRQbGFjZWhvbGRlcjogJ1phxI1pYXRvaycsXG5cdFx0XHRcdHZpYVBsYWNlaG9sZGVyOiAnQ2V6IHt2aWFOdW1iZXJ9Jyxcblx0XHRcdFx0ZW5kUGxhY2Vob2xkZXI6ICdLb25pZWMnXG5cdFx0XHR9XG5cdFx0fSxcblx0XHQnZWwnOiB7XG5cdFx0XHRkaXJlY3Rpb25zOiB7XG5cdFx0XHRcdE46ICfOss+Mz4HOtc65zrEnLFxuXHRcdFx0XHRORTogJ86yzr/Pgc61zrnOv86xzr3Osc+Ezr/Ou865zrrOrCcsXG5cdFx0XHRcdEU6ICfOsc69zrHPhM6/zrvOuc66zqwnLFxuXHRcdFx0XHRTRTogJ869zr/PhM65zr/Osc69zrHPhM6/zrvOuc66zqwnLFxuXHRcdFx0XHRTOiAnzr3PjM+EzrnOsScsXG5cdFx0XHRcdFNXOiAnzr3Ov8+EzrnOv860z4XPhM65zrrOrCcsXG5cdFx0XHRcdFc6ICfOtM+Fz4TOuc66zqwnLFxuXHRcdFx0XHROVzogJ86yzr/Pgc61zrnOv860z4XPhM65zrrOrCdcblx0XHRcdH0sXG5cdFx0XHRpbnN0cnVjdGlvbnM6IHtcblx0XHRcdFx0Ly8gaW5zdHJ1Y3Rpb24sIHBvc3RmaXggaWYgdGhlIHJvYWQgaXMgbmFtZWRcblx0XHRcdFx0J0hlYWQnOlxuXHRcdFx0XHRcdFsnzprOsc+EzrXPhc64z4XOvc64zrXOr8+EzrUge2Rpcn0nLCAnIM+Dz4TOt869IHtyb2FkfSddLFxuXHRcdFx0XHQnQ29udGludWUnOlxuXHRcdFx0XHRcdFsnzqPPhc69zrXPh86vz4PPhM61IHtkaXJ9JywgJyDPg8+EzrfOvSB7cm9hZH0nXSxcblx0XHRcdFx0J1NsaWdodFJpZ2h0Jzpcblx0XHRcdFx0XHRbJ86VzrvOsc+Gz4HPjs+CIM60zrXOvs65zqwnLCAnIM+Dz4TOt869IHtyb2FkfSddLFxuXHRcdFx0XHQnUmlnaHQnOlxuXHRcdFx0XHRcdFsnzpTOtc6+zrnOrCcsICcgz4PPhM63zr0ge3JvYWR9J10sXG5cdFx0XHRcdCdTaGFycFJpZ2h0Jzpcblx0XHRcdFx0XHRbJ86Rz4DPjM+Ezr/OvM63IM60zrXOvs65zqwgz4PPhM+Bzr/Phs6uJywgJyDPg8+EzrfOvSB7cm9hZH0nXSxcblx0XHRcdFx0J1R1cm5Bcm91bmQnOlxuXHRcdFx0XHRcdFsnzprOrM69z4TOtSDOsc69zrHPg8+Ez4HOv8+Gzq4nXSxcblx0XHRcdFx0J1NoYXJwTGVmdCc6XG5cdFx0XHRcdFx0WyfOkc+Az4zPhM6/zrzOtyDOsc+BzrnPg8+EzrXPgc6uIM+Dz4TPgc6/z4bOricsICcgz4PPhM63zr0ge3JvYWR9J10sXG5cdFx0XHRcdCdMZWZ0Jzpcblx0XHRcdFx0XHRbJ86Rz4HOuc+Dz4TOtc+BzqwnLCAnIM+Dz4TOt869IHtyb2FkfSddLFxuXHRcdFx0XHQnU2xpZ2h0TGVmdCc6XG5cdFx0XHRcdFx0WyfOlc67zrHPhs+Bz47PgiDOsc+BzrnPg8+EzrXPgc6sJywgJyDPg8+EzrfOvSB7cm9hZH0nXSxcblx0XHRcdFx0J1dheXBvaW50UmVhY2hlZCc6XG5cdFx0XHRcdFx0WyfOps+EzqzPg86xz4TOtSDPg8+Ezr8gz4POt868zrXOr86/IM6xzr3Osc+Gzr/Pgc6sz4InXSxcblx0XHRcdFx0J1JvdW5kYWJvdXQnOlxuXHRcdFx0XHRcdFsnzpHOus6/zrvOv8+FzrjOrs+Dz4TOtSDPhM63zr0ge2V4aXRTdHJ9IM6tzr7Ov860zr8gz4PPhM6/IM66z4XOus67zrnOus+MIM66z4zOvM6yzr8nLCAnIM+Dz4TOt869IHtyb2FkfSddLFxuXHRcdFx0XHQnRGVzdGluYXRpb25SZWFjaGVkJzpcblx0XHRcdFx0XHRbJ86mz4TOrM+DzrHPhM61IM+Dz4TOv869IM+Az4HOv86/z4HOuc+DzrzPjCDPg86xz4InXSxcblx0XHRcdH0sXG5cdFx0XHRmb3JtYXRPcmRlcjogZnVuY3Rpb24obikge1xuXHRcdFx0XHRyZXR1cm4gbiArICfCuic7XG5cdFx0XHR9LFxuXHRcdFx0dWk6IHtcblx0XHRcdFx0c3RhcnRQbGFjZWhvbGRlcjogJ86Rz4bOtc+EzrfPgc6vzrEnLFxuXHRcdFx0XHR2aWFQbGFjZWhvbGRlcjogJ868zq3Pg8+JIHt2aWFOdW1iZXJ9Jyxcblx0XHRcdFx0ZW5kUGxhY2Vob2xkZXI6ICfOoM+Bzr/Ov8+BzrnPg868z4zPgidcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBMLlJvdXRpbmc7XG59KSgpO1xuXG59LHt9XSwxMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oZnVuY3Rpb24gKGdsb2JhbCl7XG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgTCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LkwgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLkwgOiBudWxsKSxcblx0XHRjb3JzbGl0ZSA9IHJlcXVpcmUoJ2NvcnNsaXRlJyksXG5cdFx0cG9seWxpbmUgPSByZXF1aXJlKCdwb2x5bGluZScpO1xuXG5cdC8vIElnbm9yZSBjYW1lbGNhc2UgbmFtaW5nIGZvciB0aGlzIGZpbGUsIHNpbmNlIE9TUk0ncyBBUEkgdXNlc1xuXHQvLyB1bmRlcnNjb3Jlcy5cblx0LyoganNoaW50IGNhbWVsY2FzZTogZmFsc2UgKi9cblxuXHRMLlJvdXRpbmcgPSBMLlJvdXRpbmcgfHwge307XG5cdEwuZXh0ZW5kKEwuUm91dGluZywgcmVxdWlyZSgnLi9MLlJvdXRpbmcuV2F5cG9pbnQnKSk7XG5cblx0TC5Sb3V0aW5nLk9TUk0gPSBMLkNsYXNzLmV4dGVuZCh7XG5cdFx0b3B0aW9uczoge1xuXHRcdFx0c2VydmljZVVybDogJ2h0dHBzOi8vcm91dGVyLnByb2plY3Qtb3NybS5vcmcvdmlhcm91dGUnLFxuXHRcdFx0dGltZW91dDogMzAgKiAxMDAwLFxuXHRcdFx0cm91dGluZ09wdGlvbnM6IHt9LFxuXHRcdFx0cG9seWxpbmVQcmVjaXNpb246IDZcblx0XHR9LFxuXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdFx0TC5VdGlsLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG5cdFx0XHR0aGlzLl9oaW50cyA9IHtcblx0XHRcdFx0bG9jYXRpb25zOiB7fVxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0cm91dGU6IGZ1bmN0aW9uKHdheXBvaW50cywgY2FsbGJhY2ssIGNvbnRleHQsIG9wdGlvbnMpIHtcblx0XHRcdHZhciB0aW1lZE91dCA9IGZhbHNlLFxuXHRcdFx0XHR3cHMgPSBbXSxcblx0XHRcdFx0dXJsLFxuXHRcdFx0XHR0aW1lcixcblx0XHRcdFx0d3AsXG5cdFx0XHRcdGk7XG5cblx0XHRcdHVybCA9IHRoaXMuYnVpbGRSb3V0ZVVybCh3YXlwb2ludHMsIEwuZXh0ZW5kKHt9LCB0aGlzLm9wdGlvbnMucm91dGluZ09wdGlvbnMsIG9wdGlvbnMpKTtcblxuXHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aW1lZE91dCA9IHRydWU7XG5cdFx0XHRcdGNhbGxiYWNrLmNhbGwoY29udGV4dCB8fCBjYWxsYmFjaywge1xuXHRcdFx0XHRcdHN0YXR1czogLTEsXG5cdFx0XHRcdFx0bWVzc2FnZTogJ09TUk0gcmVxdWVzdCB0aW1lZCBvdXQuJ1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sIHRoaXMub3B0aW9ucy50aW1lb3V0KTtcblxuXHRcdFx0Ly8gQ3JlYXRlIGEgY29weSBvZiB0aGUgd2F5cG9pbnRzLCBzaW5jZSB0aGV5XG5cdFx0XHQvLyBtaWdodCBvdGhlcndpc2UgYmUgYXN5bmNocm9ub3VzbHkgbW9kaWZpZWQgd2hpbGVcblx0XHRcdC8vIHRoZSByZXF1ZXN0IGlzIGJlaW5nIHByb2Nlc3NlZC5cblx0XHRcdGZvciAoaSA9IDA7IGkgPCB3YXlwb2ludHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0d3AgPSB3YXlwb2ludHNbaV07XG5cdFx0XHRcdHdwcy5wdXNoKG5ldyBMLlJvdXRpbmcuV2F5cG9pbnQod3AubGF0TG5nLCB3cC5uYW1lLCB3cC5vcHRpb25zKSk7XG5cdFx0XHR9XG5cblx0XHRcdGNvcnNsaXRlKHVybCwgTC5iaW5kKGZ1bmN0aW9uKGVyciwgcmVzcCkge1xuXHRcdFx0XHR2YXIgZGF0YSxcblx0XHRcdFx0XHRlcnJvck1lc3NhZ2UsXG5cdFx0XHRcdFx0c3RhdHVzQ29kZTtcblxuXHRcdFx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xuXHRcdFx0XHRpZiAoIXRpbWVkT3V0KSB7XG5cdFx0XHRcdFx0ZXJyb3JNZXNzYWdlID0gJ0hUVFAgcmVxdWVzdCBmYWlsZWQ6ICcgKyBlcnI7XG5cdFx0XHRcdFx0c3RhdHVzQ29kZSA9IC0xO1xuXG5cdFx0XHRcdFx0aWYgKCFlcnIpIHtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGRhdGEgPSBKU09OLnBhcnNlKHJlc3AucmVzcG9uc2VUZXh0KTtcblx0XHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5fcm91dGVEb25lKGRhdGEsIHdwcywgY2FsbGJhY2ssIGNvbnRleHQpO1xuXHRcdFx0XHRcdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRcdFx0XHRcdHN0YXR1c0NvZGUgPSAtMztcblx0XHRcdFx0XHRcdFx0XHRlcnJvck1lc3NhZ2UgPSBleC50b1N0cmluZygpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRcdFx0XHRzdGF0dXNDb2RlID0gLTI7XG5cdFx0XHRcdFx0XHRcdGVycm9yTWVzc2FnZSA9ICdFcnJvciBwYXJzaW5nIE9TUk0gcmVzcG9uc2U6ICcgKyBleC50b1N0cmluZygpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGNhbGxiYWNrLmNhbGwoY29udGV4dCB8fCBjYWxsYmFjaywge1xuXHRcdFx0XHRcdFx0c3RhdHVzOiBzdGF0dXNDb2RlLFxuXHRcdFx0XHRcdFx0bWVzc2FnZTogZXJyb3JNZXNzYWdlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIHRoaXMpKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblxuXHRcdF9yb3V0ZURvbmU6IGZ1bmN0aW9uKHJlc3BvbnNlLCBpbnB1dFdheXBvaW50cywgY2FsbGJhY2ssIGNvbnRleHQpIHtcblx0XHRcdHZhciBjb29yZGluYXRlcyxcblx0XHRcdCAgICBhbHRzLFxuXHRcdFx0ICAgIGFjdHVhbFdheXBvaW50cyxcblx0XHRcdCAgICBpO1xuXG5cdFx0XHRjb250ZXh0ID0gY29udGV4dCB8fCBjYWxsYmFjaztcblx0XHRcdGlmIChyZXNwb25zZS5zdGF0dXMgIT09IDAgJiYgcmVzcG9uc2Uuc3RhdHVzICE9PSAyMDApIHtcblx0XHRcdFx0Y2FsbGJhY2suY2FsbChjb250ZXh0LCB7XG5cdFx0XHRcdFx0c3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXG5cdFx0XHRcdFx0bWVzc2FnZTogcmVzcG9uc2Uuc3RhdHVzX21lc3NhZ2Vcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Y29vcmRpbmF0ZXMgPSB0aGlzLl9kZWNvZGVQb2x5bGluZShyZXNwb25zZS5yb3V0ZV9nZW9tZXRyeSk7XG5cdFx0XHRhY3R1YWxXYXlwb2ludHMgPSB0aGlzLl90b1dheXBvaW50cyhpbnB1dFdheXBvaW50cywgcmVzcG9uc2UudmlhX3BvaW50cyk7XG5cdFx0XHRhbHRzID0gW3tcblx0XHRcdFx0bmFtZTogdGhpcy5fY3JlYXRlTmFtZShyZXNwb25zZS5yb3V0ZV9uYW1lKSxcblx0XHRcdFx0Y29vcmRpbmF0ZXM6IGNvb3JkaW5hdGVzLFxuXHRcdFx0XHRpbnN0cnVjdGlvbnM6IHJlc3BvbnNlLnJvdXRlX2luc3RydWN0aW9ucyA/IHRoaXMuX2NvbnZlcnRJbnN0cnVjdGlvbnMocmVzcG9uc2Uucm91dGVfaW5zdHJ1Y3Rpb25zKSA6IFtdLFxuXHRcdFx0XHRzdW1tYXJ5OiByZXNwb25zZS5yb3V0ZV9zdW1tYXJ5ID8gdGhpcy5fY29udmVydFN1bW1hcnkocmVzcG9uc2Uucm91dGVfc3VtbWFyeSkgOiBbXSxcblx0XHRcdFx0aW5wdXRXYXlwb2ludHM6IGlucHV0V2F5cG9pbnRzLFxuXHRcdFx0XHR3YXlwb2ludHM6IGFjdHVhbFdheXBvaW50cyxcblx0XHRcdFx0d2F5cG9pbnRJbmRpY2VzOiB0aGlzLl9jbGFtcEluZGljZXMocmVzcG9uc2UudmlhX2luZGljZXMsIGNvb3JkaW5hdGVzKVxuXHRcdFx0fV07XG5cblx0XHRcdGlmIChyZXNwb25zZS5hbHRlcm5hdGl2ZV9nZW9tZXRyaWVzKSB7XG5cdFx0XHRcdGZvciAoaSA9IDA7IGkgPCByZXNwb25zZS5hbHRlcm5hdGl2ZV9nZW9tZXRyaWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0Y29vcmRpbmF0ZXMgPSB0aGlzLl9kZWNvZGVQb2x5bGluZShyZXNwb25zZS5hbHRlcm5hdGl2ZV9nZW9tZXRyaWVzW2ldKTtcblx0XHRcdFx0XHRhbHRzLnB1c2goe1xuXHRcdFx0XHRcdFx0bmFtZTogdGhpcy5fY3JlYXRlTmFtZShyZXNwb25zZS5hbHRlcm5hdGl2ZV9uYW1lc1tpXSksXG5cdFx0XHRcdFx0XHRjb29yZGluYXRlczogY29vcmRpbmF0ZXMsXG5cdFx0XHRcdFx0XHRpbnN0cnVjdGlvbnM6IHJlc3BvbnNlLmFsdGVybmF0aXZlX2luc3RydWN0aW9uc1tpXSA/IHRoaXMuX2NvbnZlcnRJbnN0cnVjdGlvbnMocmVzcG9uc2UuYWx0ZXJuYXRpdmVfaW5zdHJ1Y3Rpb25zW2ldKSA6IFtdLFxuXHRcdFx0XHRcdFx0c3VtbWFyeTogcmVzcG9uc2UuYWx0ZXJuYXRpdmVfc3VtbWFyaWVzW2ldID8gdGhpcy5fY29udmVydFN1bW1hcnkocmVzcG9uc2UuYWx0ZXJuYXRpdmVfc3VtbWFyaWVzW2ldKSA6IFtdLFxuXHRcdFx0XHRcdFx0aW5wdXRXYXlwb2ludHM6IGlucHV0V2F5cG9pbnRzLFxuXHRcdFx0XHRcdFx0d2F5cG9pbnRzOiBhY3R1YWxXYXlwb2ludHMsXG5cdFx0XHRcdFx0XHR3YXlwb2ludEluZGljZXM6IHRoaXMuX2NsYW1wSW5kaWNlcyhyZXNwb25zZS5hbHRlcm5hdGl2ZV9nZW9tZXRyaWVzLmxlbmd0aCA9PT0gMSA/XG5cdFx0XHRcdFx0XHRcdC8vIFVuc3VyZSBpZiB0aGlzIGlzIGEgYnVnIGluIE9TUk0gb3Igbm90LCBidXQgYWx0ZXJuYXRpdmVfaW5kaWNlc1xuXHRcdFx0XHRcdFx0XHQvLyBkb2VzIG5vdCBhcHBlYXIgdG8gYmUgYW4gYXJyYXkgb2YgYXJyYXlzLCBhdCBsZWFzdCBub3Qgd2hlbiB0aGVyZSBpc1xuXHRcdFx0XHRcdFx0XHQvLyBhIHNpbmdsZSBhbHRlcm5hdGl2ZSByb3V0ZS5cblx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuYWx0ZXJuYXRpdmVfaW5kaWNlcyA6IHJlc3BvbnNlLmFsdGVybmF0aXZlX2luZGljZXNbaV0sXG5cdFx0XHRcdFx0XHRcdGNvb3JkaW5hdGVzKVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIG9ubHkgdmVyc2lvbnMgPDQuNS4wIHdpbGwgc3VwcG9ydCB0aGlzIGZsYWdcblx0XHRcdGlmIChyZXNwb25zZS5oaW50X2RhdGEpIHtcblx0XHRcdFx0dGhpcy5fc2F2ZUhpbnREYXRhKHJlc3BvbnNlLmhpbnRfZGF0YSwgaW5wdXRXYXlwb2ludHMpO1xuXHRcdFx0fVxuXHRcdFx0Y2FsbGJhY2suY2FsbChjb250ZXh0LCBudWxsLCBhbHRzKTtcblx0XHR9LFxuXG5cdFx0X2RlY29kZVBvbHlsaW5lOiBmdW5jdGlvbihyb3V0ZUdlb21ldHJ5KSB7XG5cdFx0XHR2YXIgY3MgPSBwb2x5bGluZS5kZWNvZGUocm91dGVHZW9tZXRyeSwgdGhpcy5vcHRpb25zLnBvbHlsaW5lUHJlY2lzaW9uKSxcblx0XHRcdFx0cmVzdWx0ID0gbmV3IEFycmF5KGNzLmxlbmd0aCksXG5cdFx0XHRcdGk7XG5cdFx0XHRmb3IgKGkgPSBjcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0XHRyZXN1bHRbaV0gPSBMLmxhdExuZyhjc1tpXSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fSxcblxuXHRcdF90b1dheXBvaW50czogZnVuY3Rpb24oaW5wdXRXYXlwb2ludHMsIHZpYXMpIHtcblx0XHRcdHZhciB3cHMgPSBbXSxcblx0XHRcdCAgICBpO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHZpYXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0d3BzLnB1c2goTC5Sb3V0aW5nLndheXBvaW50KEwubGF0TG5nKHZpYXNbaV0pLFxuXHRcdFx0XHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRXYXlwb2ludHNbaV0ubmFtZSxcblx0XHRcdFx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0V2F5cG9pbnRzW2ldLm9wdGlvbnMpKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHdwcztcblx0XHR9LFxuXG5cdFx0X2NyZWF0ZU5hbWU6IGZ1bmN0aW9uKG5hbWVQYXJ0cykge1xuXHRcdFx0dmFyIG5hbWUgPSAnJyxcblx0XHRcdFx0aTtcblxuXHRcdFx0Zm9yIChpID0gMDsgaSA8IG5hbWVQYXJ0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAobmFtZVBhcnRzW2ldKSB7XG5cdFx0XHRcdFx0aWYgKG5hbWUpIHtcblx0XHRcdFx0XHRcdG5hbWUgKz0gJywgJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bmFtZSArPSBuYW1lUGFydHNbaV0uY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lUGFydHNbaV0uc2xpY2UoMSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIG5hbWU7XG5cdFx0fSxcblxuXHRcdGJ1aWxkUm91dGVVcmw6IGZ1bmN0aW9uKHdheXBvaW50cywgb3B0aW9ucykge1xuXHRcdFx0dmFyIGxvY3MgPSBbXSxcblx0XHRcdFx0d3AsXG5cdFx0XHQgICAgY29tcHV0ZUluc3RydWN0aW9ucyxcblx0XHRcdCAgICBjb21wdXRlQWx0ZXJuYXRpdmUsXG5cdFx0XHQgICAgbG9jYXRpb25LZXksXG5cdFx0XHQgICAgaGludDtcblxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB3YXlwb2ludHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0d3AgPSB3YXlwb2ludHNbaV07XG5cdFx0XHRcdGxvY2F0aW9uS2V5ID0gdGhpcy5fbG9jYXRpb25LZXkod3AubGF0TG5nKTtcblx0XHRcdFx0bG9jcy5wdXNoKCdsb2M9JyArIGxvY2F0aW9uS2V5KTtcblxuXHRcdFx0XHRoaW50ID0gdGhpcy5faGludHMubG9jYXRpb25zW2xvY2F0aW9uS2V5XTtcblx0XHRcdFx0aWYgKGhpbnQpIHtcblx0XHRcdFx0XHRsb2NzLnB1c2goJ2hpbnQ9JyArIGhpbnQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHdwLm9wdGlvbnMgJiYgd3Aub3B0aW9ucy5hbGxvd1VUdXJuKSB7XG5cdFx0XHRcdFx0bG9jcy5wdXNoKCd1PXRydWUnKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRjb21wdXRlQWx0ZXJuYXRpdmUgPSBjb21wdXRlSW5zdHJ1Y3Rpb25zID1cblx0XHRcdFx0IShvcHRpb25zICYmIG9wdGlvbnMuZ2VvbWV0cnlPbmx5KTtcblxuXHRcdFx0cmV0dXJuIHRoaXMub3B0aW9ucy5zZXJ2aWNlVXJsICsgJz8nICtcblx0XHRcdFx0J2luc3RydWN0aW9ucz0nICsgY29tcHV0ZUluc3RydWN0aW9ucy50b1N0cmluZygpICsgJyYnICtcblx0XHRcdFx0J2FsdD0nICsgY29tcHV0ZUFsdGVybmF0aXZlLnRvU3RyaW5nKCkgKyAnJicgK1xuXHRcdFx0XHQob3B0aW9ucy56ID8gJ3o9JyArIG9wdGlvbnMueiArICcmJyA6ICcnKSArXG5cdFx0XHRcdGxvY3Muam9pbignJicpICtcblx0XHRcdFx0KHRoaXMuX2hpbnRzLmNoZWNrc3VtICE9PSB1bmRlZmluZWQgPyAnJmNoZWNrc3VtPScgKyB0aGlzLl9oaW50cy5jaGVja3N1bSA6ICcnKSArXG5cdFx0XHRcdChvcHRpb25zLmZpbGVmb3JtYXQgPyAnJm91dHB1dD0nICsgb3B0aW9ucy5maWxlZm9ybWF0IDogJycpICtcblx0XHRcdFx0KG9wdGlvbnMuYWxsb3dVVHVybnMgPyAnJnV0dXJucz0nICsgb3B0aW9ucy5hbGxvd1VUdXJucyA6ICcnKTtcblx0XHR9LFxuXG5cdFx0X2xvY2F0aW9uS2V5OiBmdW5jdGlvbihsb2NhdGlvbikge1xuXHRcdFx0cmV0dXJuIGxvY2F0aW9uLmxhdCArICcsJyArIGxvY2F0aW9uLmxuZztcblx0XHR9LFxuXG5cdFx0X3NhdmVIaW50RGF0YTogZnVuY3Rpb24oaGludERhdGEsIHdheXBvaW50cykge1xuXHRcdFx0dmFyIGxvYztcblx0XHRcdHRoaXMuX2hpbnRzID0ge1xuXHRcdFx0XHRjaGVja3N1bTogaGludERhdGEuY2hlY2tzdW0sXG5cdFx0XHRcdGxvY2F0aW9uczoge31cblx0XHRcdH07XG5cdFx0XHRmb3IgKHZhciBpID0gaGludERhdGEubG9jYXRpb25zLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRcdGxvYyA9IHdheXBvaW50c1tpXS5sYXRMbmc7XG5cdFx0XHRcdHRoaXMuX2hpbnRzLmxvY2F0aW9uc1t0aGlzLl9sb2NhdGlvbktleShsb2MpXSA9IGhpbnREYXRhLmxvY2F0aW9uc1tpXTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0X2NvbnZlcnRTdW1tYXJ5OiBmdW5jdGlvbihvc3JtU3VtbWFyeSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dG90YWxEaXN0YW5jZTogb3NybVN1bW1hcnkudG90YWxfZGlzdGFuY2UsXG5cdFx0XHRcdHRvdGFsVGltZTogb3NybVN1bW1hcnkudG90YWxfdGltZVxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0X2NvbnZlcnRJbnN0cnVjdGlvbnM6IGZ1bmN0aW9uKG9zcm1JbnN0cnVjdGlvbnMpIHtcblx0XHRcdHZhciByZXN1bHQgPSBbXSxcblx0XHRcdCAgICBpLFxuXHRcdFx0ICAgIGluc3RyLFxuXHRcdFx0ICAgIHR5cGUsXG5cdFx0XHQgICAgZHJpdmVEaXI7XG5cblx0XHRcdGZvciAoaSA9IDA7IGkgPCBvc3JtSW5zdHJ1Y3Rpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGluc3RyID0gb3NybUluc3RydWN0aW9uc1tpXTtcblx0XHRcdFx0dHlwZSA9IHRoaXMuX2RyaXZpbmdEaXJlY3Rpb25UeXBlKGluc3RyWzBdKTtcblx0XHRcdFx0ZHJpdmVEaXIgPSBpbnN0clswXS5zcGxpdCgnLScpO1xuXHRcdFx0XHRpZiAodHlwZSkge1xuXHRcdFx0XHRcdHJlc3VsdC5wdXNoKHtcblx0XHRcdFx0XHRcdHR5cGU6IHR5cGUsXG5cdFx0XHRcdFx0XHRkaXN0YW5jZTogaW5zdHJbMl0sXG5cdFx0XHRcdFx0XHR0aW1lOiBpbnN0cls0XSxcblx0XHRcdFx0XHRcdHJvYWQ6IGluc3RyWzFdLFxuXHRcdFx0XHRcdFx0ZGlyZWN0aW9uOiBpbnN0cls2XSxcblx0XHRcdFx0XHRcdGV4aXQ6IGRyaXZlRGlyLmxlbmd0aCA+IDEgPyBkcml2ZURpclsxXSA6IHVuZGVmaW5lZCxcblx0XHRcdFx0XHRcdGluZGV4OiBpbnN0clszXVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fSxcblxuXHRcdF9kcml2aW5nRGlyZWN0aW9uVHlwZTogZnVuY3Rpb24oZCkge1xuXHRcdFx0c3dpdGNoIChwYXJzZUludChkLCAxMCkpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0cmV0dXJuICdTdHJhaWdodCc7XG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHJldHVybiAnU2xpZ2h0UmlnaHQnO1xuXHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHRyZXR1cm4gJ1JpZ2h0Jztcblx0XHRcdGNhc2UgNDpcblx0XHRcdFx0cmV0dXJuICdTaGFycFJpZ2h0Jztcblx0XHRcdGNhc2UgNTpcblx0XHRcdFx0cmV0dXJuICdUdXJuQXJvdW5kJztcblx0XHRcdGNhc2UgNjpcblx0XHRcdFx0cmV0dXJuICdTaGFycExlZnQnO1xuXHRcdFx0Y2FzZSA3OlxuXHRcdFx0XHRyZXR1cm4gJ0xlZnQnO1xuXHRcdFx0Y2FzZSA4OlxuXHRcdFx0XHRyZXR1cm4gJ1NsaWdodExlZnQnO1xuXHRcdFx0Y2FzZSA5OlxuXHRcdFx0XHRyZXR1cm4gJ1dheXBvaW50UmVhY2hlZCc7XG5cdFx0XHRjYXNlIDEwOlxuXHRcdFx0XHQvLyBUT0RPOiBcIkhlYWQgb25cIlxuXHRcdFx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vRGVubmlzT1NSTS9Qcm9qZWN0LU9TUk0vYmxvYi9tYXN0ZXIvRGF0YVN0cnVjdHVyZXMvVHVybkluc3RydWN0aW9ucy5oI0w0OFxuXHRcdFx0XHRyZXR1cm4gJ1N0cmFpZ2h0Jztcblx0XHRcdGNhc2UgMTE6XG5cdFx0XHRjYXNlIDEyOlxuXHRcdFx0XHRyZXR1cm4gJ1JvdW5kYWJvdXQnO1xuXHRcdFx0Y2FzZSAxNTpcblx0XHRcdFx0cmV0dXJuICdEZXN0aW5hdGlvblJlYWNoZWQnO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdF9jbGFtcEluZGljZXM6IGZ1bmN0aW9uKGluZGljZXMsIGNvb3Jkcykge1xuXHRcdFx0dmFyIG1heENvb3JkSW5kZXggPSBjb29yZHMubGVuZ3RoIC0gMSxcblx0XHRcdFx0aTtcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBpbmRpY2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGluZGljZXNbaV0gPSBNYXRoLm1pbihtYXhDb29yZEluZGV4LCBNYXRoLm1heChpbmRpY2VzW2ldLCAwKSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gaW5kaWNlcztcblx0XHR9XG5cdH0pO1xuXG5cdEwuUm91dGluZy5vc3JtID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdHJldHVybiBuZXcgTC5Sb3V0aW5nLk9TUk0ob3B0aW9ucyk7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBMLlJvdXRpbmc7XG59KSgpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbn0se1wiLi9MLlJvdXRpbmcuV2F5cG9pbnRcIjoxNCxcImNvcnNsaXRlXCI6MSxcInBvbHlsaW5lXCI6Mn1dLDEzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbihmdW5jdGlvbiAoZ2xvYmFsKXtcbihmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBMID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuTCA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuTCA6IG51bGwpO1xuXHRMLlJvdXRpbmcgPSBMLlJvdXRpbmcgfHwge307XG5cdEwuZXh0ZW5kKEwuUm91dGluZywgcmVxdWlyZSgnLi9MLlJvdXRpbmcuR2VvY29kZXJFbGVtZW50JykpO1xuXHRMLmV4dGVuZChMLlJvdXRpbmcsIHJlcXVpcmUoJy4vTC5Sb3V0aW5nLldheXBvaW50JykpO1xuXG5cdEwuUm91dGluZy5QbGFuID0gTC5DbGFzcy5leHRlbmQoe1xuXHRcdGluY2x1ZGVzOiBMLk1peGluLkV2ZW50cyxcblxuXHRcdG9wdGlvbnM6IHtcblx0XHRcdGRyYWdTdHlsZXM6IFtcblx0XHRcdFx0e2NvbG9yOiAnYmxhY2snLCBvcGFjaXR5OiAwLjE1LCB3ZWlnaHQ6IDl9LFxuXHRcdFx0XHR7Y29sb3I6ICd3aGl0ZScsIG9wYWNpdHk6IDAuOCwgd2VpZ2h0OiA2fSxcblx0XHRcdFx0e2NvbG9yOiAncmVkJywgb3BhY2l0eTogMSwgd2VpZ2h0OiAyLCBkYXNoQXJyYXk6ICc3LDEyJ31cblx0XHRcdF0sXG5cdFx0XHRkcmFnZ2FibGVXYXlwb2ludHM6IHRydWUsXG5cdFx0XHRyb3V0ZVdoaWxlRHJhZ2dpbmc6IGZhbHNlLFxuXHRcdFx0YWRkV2F5cG9pbnRzOiB0cnVlLFxuXHRcdFx0cmV2ZXJzZVdheXBvaW50czogZmFsc2UsXG5cdFx0XHRhZGRCdXR0b25DbGFzc05hbWU6ICcnLFxuXHRcdFx0bGFuZ3VhZ2U6ICdlbicsXG5cdFx0XHRjcmVhdGVHZW9jb2RlckVsZW1lbnQ6IEwuUm91dGluZy5nZW9jb2RlckVsZW1lbnQsXG5cdFx0XHRjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGksIHdwKSB7XG5cdFx0XHRcdHZhciBvcHRpb25zID0ge1xuXHRcdFx0XHRcdFx0ZHJhZ2dhYmxlOiB0aGlzLmRyYWdnYWJsZVdheXBvaW50c1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdCAgICBtYXJrZXIgPSBMLm1hcmtlcih3cC5sYXRMbmcsIG9wdGlvbnMpO1xuXG5cdFx0XHRcdHJldHVybiBtYXJrZXI7XG5cdFx0XHR9LFxuXHRcdFx0Z2VvY29kZXJzQ2xhc3NOYW1lOiAnJ1xuXHRcdH0sXG5cblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbih3YXlwb2ludHMsIG9wdGlvbnMpIHtcblx0XHRcdEwuVXRpbC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xuXHRcdFx0dGhpcy5fd2F5cG9pbnRzID0gW107XG5cdFx0XHR0aGlzLnNldFdheXBvaW50cyh3YXlwb2ludHMpO1xuXHRcdH0sXG5cblx0XHRpc1JlYWR5OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHRoaXMuX3dheXBvaW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAoIXRoaXMuX3dheXBvaW50c1tpXS5sYXRMbmcpIHtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSxcblxuXHRcdGdldFdheXBvaW50czogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgaSxcblx0XHRcdFx0d3BzID0gW107XG5cblx0XHRcdGZvciAoaSA9IDA7IGkgPCB0aGlzLl93YXlwb2ludHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0d3BzLnB1c2godGhpcy5fd2F5cG9pbnRzW2ldKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHdwcztcblx0XHR9LFxuXG5cdFx0c2V0V2F5cG9pbnRzOiBmdW5jdGlvbih3YXlwb2ludHMpIHtcblx0XHRcdHZhciBhcmdzID0gWzAsIHRoaXMuX3dheXBvaW50cy5sZW5ndGhdLmNvbmNhdCh3YXlwb2ludHMpO1xuXHRcdFx0dGhpcy5zcGxpY2VXYXlwb2ludHMuYXBwbHkodGhpcywgYXJncyk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXG5cdFx0c3BsaWNlV2F5cG9pbnRzOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhcmdzID0gW2FyZ3VtZW50c1swXSwgYXJndW1lbnRzWzFdXSxcblx0XHRcdCAgICBpO1xuXG5cdFx0XHRmb3IgKGkgPSAyOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGFyZ3MucHVzaChhcmd1bWVudHNbaV0gJiYgYXJndW1lbnRzW2ldLmhhc093blByb3BlcnR5KCdsYXRMbmcnKSA/IGFyZ3VtZW50c1tpXSA6IEwuUm91dGluZy53YXlwb2ludChhcmd1bWVudHNbaV0pKTtcblx0XHRcdH1cblxuXHRcdFx0W10uc3BsaWNlLmFwcGx5KHRoaXMuX3dheXBvaW50cywgYXJncyk7XG5cblx0XHRcdC8vIE1ha2Ugc3VyZSB0aGVyZSdzIGFsd2F5cyBhdCBsZWFzdCB0d28gd2F5cG9pbnRzXG5cdFx0XHR3aGlsZSAodGhpcy5fd2F5cG9pbnRzLmxlbmd0aCA8IDIpIHtcblx0XHRcdFx0dGhpcy5zcGxpY2VXYXlwb2ludHModGhpcy5fd2F5cG9pbnRzLmxlbmd0aCwgMCwgbnVsbCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuX3VwZGF0ZU1hcmtlcnMoKTtcblx0XHRcdHRoaXMuX2ZpcmVDaGFuZ2VkLmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdH0sXG5cblx0XHRvbkFkZDogZnVuY3Rpb24obWFwKSB7XG5cdFx0XHR0aGlzLl9tYXAgPSBtYXA7XG5cdFx0XHR0aGlzLl91cGRhdGVNYXJrZXJzKCk7XG5cdFx0fSxcblxuXHRcdG9uUmVtb3ZlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpO1xuXHRcdFx0dGhpcy5fcmVtb3ZlTWFya2VycygpO1xuXG5cdFx0XHRpZiAodGhpcy5fbmV3V3ApIHtcblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IHRoaXMuX25ld1dwLmxpbmVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dGhpcy5fbWFwLnJlbW92ZUxheWVyKHRoaXMuX25ld1dwLmxpbmVzW2ldKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRkZWxldGUgdGhpcy5fbWFwO1xuXHRcdH0sXG5cblx0XHRjcmVhdGVHZW9jb2RlcnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGNvbnRhaW5lciA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsICdsZWFmbGV0LXJvdXRpbmctZ2VvY29kZXJzICcgKyB0aGlzLm9wdGlvbnMuZ2VvY29kZXJzQ2xhc3NOYW1lKSxcblx0XHRcdFx0d2F5cG9pbnRzID0gdGhpcy5fd2F5cG9pbnRzLFxuXHRcdFx0ICAgIGFkZFdwQnRuLFxuXHRcdFx0ICAgIHJldmVyc2VCdG47XG5cblx0XHRcdHRoaXMuX2dlb2NvZGVyQ29udGFpbmVyID0gY29udGFpbmVyO1xuXHRcdFx0dGhpcy5fZ2VvY29kZXJFbGVtcyA9IFtdO1xuXG5cblx0XHRcdGlmICh0aGlzLm9wdGlvbnMuYWRkV2F5cG9pbnRzKSB7XG5cdFx0XHRcdGFkZFdwQnRuID0gTC5Eb21VdGlsLmNyZWF0ZSgnYnV0dG9uJywgJ2xlYWZsZXQtcm91dGluZy1hZGQtd2F5cG9pbnQgJyArIHRoaXMub3B0aW9ucy5hZGRCdXR0b25DbGFzc05hbWUsIGNvbnRhaW5lcik7XG5cdFx0XHRcdGFkZFdwQnRuLnNldEF0dHJpYnV0ZSgndHlwZScsICdidXR0b24nKTtcblx0XHRcdFx0TC5Eb21FdmVudC5hZGRMaXN0ZW5lcihhZGRXcEJ0biwgJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGhpcy5zcGxpY2VXYXlwb2ludHMod2F5cG9pbnRzLmxlbmd0aCwgMCwgbnVsbCk7XG5cdFx0XHRcdH0sIHRoaXMpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5vcHRpb25zLnJldmVyc2VXYXlwb2ludHMpIHtcblx0XHRcdFx0cmV2ZXJzZUJ0biA9IEwuRG9tVXRpbC5jcmVhdGUoJ2J1dHRvbicsICdsZWFmbGV0LXJvdXRpbmctcmV2ZXJzZS13YXlwb2ludHMnLCBjb250YWluZXIpO1xuXHRcdFx0XHRyZXZlcnNlQnRuLnNldEF0dHJpYnV0ZSgndHlwZScsICdidXR0b24nKTtcblx0XHRcdFx0TC5Eb21FdmVudC5hZGRMaXN0ZW5lcihyZXZlcnNlQnRuLCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR0aGlzLl93YXlwb2ludHMucmV2ZXJzZSgpO1xuXHRcdFx0XHRcdHRoaXMuc2V0V2F5cG9pbnRzKHRoaXMuX3dheXBvaW50cyk7XG5cdFx0XHRcdH0sIHRoaXMpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl91cGRhdGVHZW9jb2RlcnMoKTtcblx0XHRcdHRoaXMub24oJ3dheXBvaW50c3NwbGljZWQnLCB0aGlzLl91cGRhdGVHZW9jb2RlcnMpO1xuXG5cdFx0XHRyZXR1cm4gY29udGFpbmVyO1xuXHRcdH0sXG5cblx0XHRfY3JlYXRlR2VvY29kZXI6IGZ1bmN0aW9uKGkpIHtcblx0XHRcdHZhciBnZW9jb2RlciA9IHRoaXMub3B0aW9ucy5jcmVhdGVHZW9jb2RlckVsZW1lbnQodGhpcy5fd2F5cG9pbnRzW2ldLCBpLCB0aGlzLl93YXlwb2ludHMubGVuZ3RoLCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0Z2VvY29kZXJcblx0XHRcdC5vbignZGVsZXRlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChpID4gMCB8fCB0aGlzLl93YXlwb2ludHMubGVuZ3RoID4gMikge1xuXHRcdFx0XHRcdHRoaXMuc3BsaWNlV2F5cG9pbnRzKGksIDEpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuc3BsaWNlV2F5cG9pbnRzKGksIDEsIG5ldyBMLlJvdXRpbmcuV2F5cG9pbnQoKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIHRoaXMpXG5cdFx0XHQub24oJ2dlb2NvZGVkJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHR0aGlzLl91cGRhdGVNYXJrZXJzKCk7XG5cdFx0XHRcdHRoaXMuX2ZpcmVDaGFuZ2VkKCk7XG5cdFx0XHRcdHRoaXMuX2ZvY3VzR2VvY29kZXIoaSArIDEpO1xuXHRcdFx0XHR0aGlzLmZpcmUoJ3dheXBvaW50Z2VvY29kZWQnLCB7XG5cdFx0XHRcdFx0d2F5cG9pbnRJbmRleDogaSxcblx0XHRcdFx0XHR3YXlwb2ludDogZS53YXlwb2ludFxuXHRcdFx0XHR9KTtcblx0XHRcdH0sIHRoaXMpXG5cdFx0XHQub24oJ3JldmVyc2VnZW9jb2RlZCcsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dGhpcy5maXJlKCd3YXlwb2ludGdlb2NvZGVkJywge1xuXHRcdFx0XHRcdHdheXBvaW50SW5kZXg6IGksXG5cdFx0XHRcdFx0d2F5cG9pbnQ6IGUud2F5cG9pbnRcblx0XHRcdFx0fSk7XG5cdFx0XHR9LCB0aGlzKTtcblxuXHRcdFx0cmV0dXJuIGdlb2NvZGVyO1xuXHRcdH0sXG5cblx0XHRfdXBkYXRlR2VvY29kZXJzOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBlbGVtcyA9IFtdLFxuXHRcdFx0XHRpLFxuXHRcdFx0ICAgIGdlb2NvZGVyRWxlbTtcblxuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHRoaXMuX2dlb2NvZGVyRWxlbXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dGhpcy5fZ2VvY29kZXJDb250YWluZXIucmVtb3ZlQ2hpbGQodGhpcy5fZ2VvY29kZXJFbGVtc1tpXS5nZXRDb250YWluZXIoKSk7XG5cdFx0XHR9XG5cblx0XHRcdGZvciAoaSA9IHRoaXMuX3dheXBvaW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0XHRnZW9jb2RlckVsZW0gPSB0aGlzLl9jcmVhdGVHZW9jb2RlcihpKTtcblx0XHRcdFx0dGhpcy5fZ2VvY29kZXJDb250YWluZXIuaW5zZXJ0QmVmb3JlKGdlb2NvZGVyRWxlbS5nZXRDb250YWluZXIoKSwgdGhpcy5fZ2VvY29kZXJDb250YWluZXIuZmlyc3RDaGlsZCk7XG5cdFx0XHRcdGVsZW1zLnB1c2goZ2VvY29kZXJFbGVtKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fZ2VvY29kZXJFbGVtcyA9IGVsZW1zLnJldmVyc2UoKTtcblx0XHR9LFxuXG5cdFx0X3JlbW92ZU1hcmtlcnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGk7XG5cdFx0XHRpZiAodGhpcy5fbWFya2Vycykge1xuXHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5fbWFya2Vycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGlmICh0aGlzLl9tYXJrZXJzW2ldKSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9tYXAucmVtb3ZlTGF5ZXIodGhpcy5fbWFya2Vyc1tpXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9tYXJrZXJzID0gW107XG5cdFx0fSxcblxuXHRcdF91cGRhdGVNYXJrZXJzOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpLFxuXHRcdFx0ICAgIG07XG5cblx0XHRcdGlmICghdGhpcy5fbWFwKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fcmVtb3ZlTWFya2VycygpO1xuXG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5fd2F5cG9pbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmICh0aGlzLl93YXlwb2ludHNbaV0ubGF0TG5nKSB7XG5cdFx0XHRcdFx0bSA9IHRoaXMub3B0aW9ucy5jcmVhdGVNYXJrZXIoaSwgdGhpcy5fd2F5cG9pbnRzW2ldLCB0aGlzLl93YXlwb2ludHMubGVuZ3RoKTtcblx0XHRcdFx0XHRpZiAobSkge1xuXHRcdFx0XHRcdFx0bS5hZGRUbyh0aGlzLl9tYXApO1xuXHRcdFx0XHRcdFx0aWYgKHRoaXMub3B0aW9ucy5kcmFnZ2FibGVXYXlwb2ludHMpIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5faG9va1dheXBvaW50RXZlbnRzKG0sIGkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRtID0gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLl9tYXJrZXJzLnB1c2gobSk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdF9maXJlQ2hhbmdlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmZpcmUoJ3dheXBvaW50c2NoYW5nZWQnLCB7d2F5cG9pbnRzOiB0aGlzLmdldFdheXBvaW50cygpfSk7XG5cblx0XHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID49IDIpIHtcblx0XHRcdFx0dGhpcy5maXJlKCd3YXlwb2ludHNzcGxpY2VkJywge1xuXHRcdFx0XHRcdGluZGV4OiBBcnJheS5wcm90b3R5cGUuc2hpZnQuY2FsbChhcmd1bWVudHMpLFxuXHRcdFx0XHRcdG5SZW1vdmVkOiBBcnJheS5wcm90b3R5cGUuc2hpZnQuY2FsbChhcmd1bWVudHMpLFxuXHRcdFx0XHRcdGFkZGVkOiBhcmd1bWVudHNcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdF9ob29rV2F5cG9pbnRFdmVudHM6IGZ1bmN0aW9uKG0sIGksIHRyYWNrTW91c2VNb3ZlKSB7XG5cdFx0XHR2YXIgZXZlbnRMYXRMbmcgPSBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRyYWNrTW91c2VNb3ZlID8gZS5sYXRsbmcgOiBlLnRhcmdldC5nZXRMYXRMbmcoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZHJhZ1N0YXJ0ID0gTC5iaW5kKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHR0aGlzLmZpcmUoJ3dheXBvaW50ZHJhZ3N0YXJ0Jywge2luZGV4OiBpLCBsYXRsbmc6IGV2ZW50TGF0TG5nKGUpfSk7XG5cdFx0XHRcdH0sIHRoaXMpLFxuXHRcdFx0XHRkcmFnID0gTC5iaW5kKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHR0aGlzLl93YXlwb2ludHNbaV0ubGF0TG5nID0gZXZlbnRMYXRMbmcoZSk7XG5cdFx0XHRcdFx0dGhpcy5maXJlKCd3YXlwb2ludGRyYWcnLCB7aW5kZXg6IGksIGxhdGxuZzogZXZlbnRMYXRMbmcoZSl9KTtcblx0XHRcdFx0fSwgdGhpcyksXG5cdFx0XHRcdGRyYWdFbmQgPSBMLmJpbmQoZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHRoaXMuX3dheXBvaW50c1tpXS5sYXRMbmcgPSBldmVudExhdExuZyhlKTtcblx0XHRcdFx0XHR0aGlzLl93YXlwb2ludHNbaV0ubmFtZSA9ICcnO1xuXHRcdFx0XHRcdGlmICh0aGlzLl9nZW9jb2RlckVsZW1zKSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9nZW9jb2RlckVsZW1zW2ldLnVwZGF0ZSh0cnVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5maXJlKCd3YXlwb2ludGRyYWdlbmQnLCB7aW5kZXg6IGksIGxhdGxuZzogZXZlbnRMYXRMbmcoZSl9KTtcblx0XHRcdFx0XHR0aGlzLl9maXJlQ2hhbmdlZCgpO1xuXHRcdFx0XHR9LCB0aGlzKSxcblx0XHRcdFx0bW91c2VNb3ZlLFxuXHRcdFx0XHRtb3VzZVVwO1xuXG5cdFx0XHRpZiAodHJhY2tNb3VzZU1vdmUpIHtcblx0XHRcdFx0bW91c2VNb3ZlID0gTC5iaW5kKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHR0aGlzLl9tYXJrZXJzW2ldLnNldExhdExuZyhlLmxhdGxuZyk7XG5cdFx0XHRcdFx0ZHJhZyhlKTtcblx0XHRcdFx0fSwgdGhpcyk7XG5cdFx0XHRcdG1vdXNlVXAgPSBMLmJpbmQoZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHRoaXMuX21hcC5kcmFnZ2luZy5lbmFibGUoKTtcblx0XHRcdFx0XHR0aGlzLl9tYXAub2ZmKCdtb3VzZXVwJywgbW91c2VVcCk7XG5cdFx0XHRcdFx0dGhpcy5fbWFwLm9mZignbW91c2Vtb3ZlJywgbW91c2VNb3ZlKTtcblx0XHRcdFx0XHRkcmFnRW5kKGUpO1xuXHRcdFx0XHR9LCB0aGlzKTtcblx0XHRcdFx0dGhpcy5fbWFwLmRyYWdnaW5nLmRpc2FibGUoKTtcblx0XHRcdFx0dGhpcy5fbWFwLm9uKCdtb3VzZW1vdmUnLCBtb3VzZU1vdmUpO1xuXHRcdFx0XHR0aGlzLl9tYXAub24oJ21vdXNldXAnLCBtb3VzZVVwKTtcblx0XHRcdFx0ZHJhZ1N0YXJ0KHtsYXRsbmc6IHRoaXMuX3dheXBvaW50c1tpXS5sYXRMbmd9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG0ub24oJ2RyYWdzdGFydCcsIGRyYWdTdGFydCk7XG5cdFx0XHRcdG0ub24oJ2RyYWcnLCBkcmFnKTtcblx0XHRcdFx0bS5vbignZHJhZ2VuZCcsIGRyYWdFbmQpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRkcmFnTmV3V2F5cG9pbnQ6IGZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciBuZXdXcEluZGV4ID0gZS5hZnRlckluZGV4ICsgMTtcblx0XHRcdGlmICh0aGlzLm9wdGlvbnMucm91dGVXaGlsZURyYWdnaW5nKSB7XG5cdFx0XHRcdHRoaXMuc3BsaWNlV2F5cG9pbnRzKG5ld1dwSW5kZXgsIDAsIGUubGF0bG5nKTtcblx0XHRcdFx0dGhpcy5faG9va1dheXBvaW50RXZlbnRzKHRoaXMuX21hcmtlcnNbbmV3V3BJbmRleF0sIG5ld1dwSW5kZXgsIHRydWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fZHJhZ05ld1dheXBvaW50KG5ld1dwSW5kZXgsIGUubGF0bG5nKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0X2RyYWdOZXdXYXlwb2ludDogZnVuY3Rpb24obmV3V3BJbmRleCwgaW5pdGlhbExhdExuZykge1xuXHRcdFx0dmFyIHdwID0gbmV3IEwuUm91dGluZy5XYXlwb2ludChpbml0aWFsTGF0TG5nKSxcblx0XHRcdFx0cHJldldwID0gdGhpcy5fd2F5cG9pbnRzW25ld1dwSW5kZXggLSAxXSxcblx0XHRcdFx0bmV4dFdwID0gdGhpcy5fd2F5cG9pbnRzW25ld1dwSW5kZXhdLFxuXHRcdFx0XHRtYXJrZXIgPSB0aGlzLm9wdGlvbnMuY3JlYXRlTWFya2VyKG5ld1dwSW5kZXgsIHdwLCB0aGlzLl93YXlwb2ludHMubGVuZ3RoICsgMSksXG5cdFx0XHRcdGxpbmVzID0gW10sXG5cdFx0XHRcdG1vdXNlTW92ZSA9IEwuYmluZChmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0dmFyIGk7XG5cdFx0XHRcdFx0aWYgKG1hcmtlcikge1xuXHRcdFx0XHRcdFx0bWFya2VyLnNldExhdExuZyhlLmxhdGxuZyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZvciAoaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0bGluZXNbaV0uc3BsaWNlTGF0TG5ncygxLCAxLCBlLmxhdGxuZyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCB0aGlzKSxcblx0XHRcdFx0bW91c2VVcCA9IEwuYmluZChmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0dmFyIGk7XG5cdFx0XHRcdFx0aWYgKG1hcmtlcikge1xuXHRcdFx0XHRcdFx0dGhpcy5fbWFwLnJlbW92ZUxheWVyKG1hcmtlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZvciAoaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0dGhpcy5fbWFwLnJlbW92ZUxheWVyKGxpbmVzW2ldKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5fbWFwLm9mZignbW91c2Vtb3ZlJywgbW91c2VNb3ZlKTtcblx0XHRcdFx0XHR0aGlzLl9tYXAub2ZmKCdtb3VzZXVwJywgbW91c2VVcCk7XG5cdFx0XHRcdFx0dGhpcy5zcGxpY2VXYXlwb2ludHMobmV3V3BJbmRleCwgMCwgZS5sYXRsbmcpO1xuXHRcdFx0XHR9LCB0aGlzKSxcblx0XHRcdFx0aTtcblxuXHRcdFx0aWYgKG1hcmtlcikge1xuXHRcdFx0XHRtYXJrZXIuYWRkVG8odGhpcy5fbWFwKTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHRoaXMub3B0aW9ucy5kcmFnU3R5bGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGxpbmVzLnB1c2goTC5wb2x5bGluZShbcHJldldwLmxhdExuZywgaW5pdGlhbExhdExuZywgbmV4dFdwLmxhdExuZ10sXG5cdFx0XHRcdFx0dGhpcy5vcHRpb25zLmRyYWdTdHlsZXNbaV0pLmFkZFRvKHRoaXMuX21hcCkpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9tYXAub24oJ21vdXNlbW92ZScsIG1vdXNlTW92ZSk7XG5cdFx0XHR0aGlzLl9tYXAub24oJ21vdXNldXAnLCBtb3VzZVVwKTtcblx0XHR9LFxuXG5cdFx0X2ZvY3VzR2VvY29kZXI6IGZ1bmN0aW9uKGkpIHtcblx0XHRcdGlmICh0aGlzLl9nZW9jb2RlckVsZW1zW2ldKSB7XG5cdFx0XHRcdHRoaXMuX2dlb2NvZGVyRWxlbXNbaV0uZm9jdXMoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQuYmx1cigpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0TC5Sb3V0aW5nLnBsYW4gPSBmdW5jdGlvbih3YXlwb2ludHMsIG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gbmV3IEwuUm91dGluZy5QbGFuKHdheXBvaW50cywgb3B0aW9ucyk7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBMLlJvdXRpbmc7XG59KSgpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbn0se1wiLi9MLlJvdXRpbmcuR2VvY29kZXJFbGVtZW50XCI6NyxcIi4vTC5Sb3V0aW5nLldheXBvaW50XCI6MTR9XSwxNDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oZnVuY3Rpb24gKGdsb2JhbCl7XG4oZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgTCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LkwgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLkwgOiBudWxsKTtcblx0TC5Sb3V0aW5nID0gTC5Sb3V0aW5nIHx8IHt9O1xuXG5cdEwuUm91dGluZy5XYXlwb2ludCA9IEwuQ2xhc3MuZXh0ZW5kKHtcblx0XHRcdG9wdGlvbnM6IHtcblx0XHRcdFx0YWxsb3dVVHVybjogZmFsc2UsXG5cdFx0XHR9LFxuXHRcdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24obGF0TG5nLCBuYW1lLCBvcHRpb25zKSB7XG5cdFx0XHRcdEwuVXRpbC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xuXHRcdFx0XHR0aGlzLmxhdExuZyA9IEwubGF0TG5nKGxhdExuZyk7XG5cdFx0XHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0TC5Sb3V0aW5nLndheXBvaW50ID0gZnVuY3Rpb24obGF0TG5nLCBuYW1lLCBvcHRpb25zKSB7XG5cdFx0cmV0dXJuIG5ldyBMLlJvdXRpbmcuV2F5cG9pbnQobGF0TG5nLCBuYW1lLCBvcHRpb25zKTtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IEwuUm91dGluZztcbn0pKCk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxufSx7fV19LHt9LFs0XSkoNClcbn0pO1xuIl19
},{"./L.Routing.Autocomplete":5,"./L.Routing.ErrorControl":6,"./L.Routing.Formatter":7,"./L.Routing.GeocoderElement":8,"./L.Routing.Itinerary":9,"./L.Routing.ItineraryBuilder":10,"./L.Routing.Line":11,"./L.Routing.Localization":12,"./L.Routing.OSRM":13,"./L.Routing.Plan":14,"./L.Routing.Waypoint":15,"corslite":1,"polyline":3}],27:[function(require,module,exports){
/**
 * @name Sidebar
 * @class L.Control.Sidebar
 * @extends L.Control
 * @param {string} id - The id of the sidebar element (without the # character)
 * @param {Object} [options] - Optional options object
 * @param {string} [options.position=left] - Position of the sidebar: 'left' or 'right'
 * @see L.control.sidebar
 */
L.Control.Sidebar = L.Control.extend(/** @lends L.Control.Sidebar.prototype */ {
    includes: L.Mixin.Events,

    options: {
        position: 'left'
    },

    initialize: function (id, options) {
        var i, child;

        L.setOptions(this, options);

        // Find sidebar HTMLElement
        this._sidebar = L.DomUtil.get(id);

        // Attach .sidebar-left/right class
        L.DomUtil.addClass(this._sidebar, 'sidebar-' + this.options.position);

        // Attach touch styling if necessary
        if (L.Browser.touch)
            L.DomUtil.addClass(this._sidebar, 'leaflet-touch');

        // Find sidebar > div.sidebar-content
        for (i = this._sidebar.children.length - 1; i >= 0; i--) {
            child = this._sidebar.children[i];
            if (child.tagName == 'DIV' &&
                    L.DomUtil.hasClass(child, 'sidebar-content'))
                this._container = child;
        }

        // Find sidebar ul.sidebar-tabs > li, sidebar .sidebar-tabs > ul > li
        this._tabitems = this._sidebar.querySelectorAll('ul.sidebar-tabs > li, .sidebar-tabs > ul > li');
        for (i = this._tabitems.length - 1; i >= 0; i--) {
            this._tabitems[i]._sidebar = this;
        }

        // Find sidebar > div.sidebar-content > div.sidebar-pane
        this._panes = [];
        this._closeButtons = [];
        for (i = this._container.children.length - 1; i >= 0; i--) {
            child = this._container.children[i];
            if (child.tagName == 'DIV' &&
                L.DomUtil.hasClass(child, 'sidebar-pane')) {
                this._panes.push(child);

                var closeButtons = child.querySelectorAll('.sidebar-close');
                for (var j = 0, len = closeButtons.length; j < len; j++)
                    this._closeButtons.push(closeButtons[j]);
            }
        }
    },

    /**
     * Add this sidebar to the specified map.
     *
     * @param {L.Map} map
     * @returns {Sidebar}
     */
    addTo: function (map) {
        var i, child;

        this._map = map;

        for (i = this._tabitems.length - 1; i >= 0; i--) {
            child = this._tabitems[i];
            L.DomEvent
                .on(child.querySelector('a'), 'click', L.DomEvent.preventDefault )
                .on(child.querySelector('a'), 'click', this._onClick, child);
        }

        for (i = this._closeButtons.length - 1; i >= 0; i--) {
            child = this._closeButtons[i];
            L.DomEvent.on(child, 'click', this._onCloseClick, this);
        }

        return this;
    },

    /**
     * Remove this sidebar from the map.
     *
     * @param {L.Map} map
     * @returns {Sidebar}
     */
    removeFrom: function (map) {
        var i, child;

        this._map = null;

        for (i = this._tabitems.length - 1; i >= 0; i--) {
            child = this._tabitems[i];
            L.DomEvent.off(child.querySelector('a'), 'click', this._onClick);
        }

        for (i = this._closeButtons.length - 1; i >= 0; i--) {
            child = this._closeButtons[i];
            L.DomEvent.off(child, 'click', this._onCloseClick, this);
        }

        return this;
    },

    /**
     * Open sidebar (if necessary) and show the specified tab.
     *
     * @param {string} id - The id of the tab to show (without the # character)
     */
    open: function(id) {
        var i, child;

        // hide old active contents and show new content
        for (i = this._panes.length - 1; i >= 0; i--) {
            child = this._panes[i];
            if (child.id == id)
                L.DomUtil.addClass(child, 'active');
            else if (L.DomUtil.hasClass(child, 'active'))
                L.DomUtil.removeClass(child, 'active');
        }

        // remove old active highlights and set new highlight
        for (i = this._tabitems.length - 1; i >= 0; i--) {
            child = this._tabitems[i];
            if (child.querySelector('a').hash == '#' + id)
                L.DomUtil.addClass(child, 'active');
            else if (L.DomUtil.hasClass(child, 'active'))
                L.DomUtil.removeClass(child, 'active');
        }

        this.fire('content', { id: id });

        // open sidebar (if necessary)
        if (L.DomUtil.hasClass(this._sidebar, 'collapsed')) {
            this.fire('opening');
            L.DomUtil.removeClass(this._sidebar, 'collapsed');
        }

        return this;
    },

    /**
     * Close the sidebar (if necessary).
     */
    close: function() {
        // remove old active highlights
        for (var i = this._tabitems.length - 1; i >= 0; i--) {
            var child = this._tabitems[i];
            if (L.DomUtil.hasClass(child, 'active'))
                L.DomUtil.removeClass(child, 'active');
        }

        // close sidebar
        if (!L.DomUtil.hasClass(this._sidebar, 'collapsed')) {
            this.fire('closing');
            L.DomUtil.addClass(this._sidebar, 'collapsed');
        }

        return this;
    },

    /**
     * @private
     */
    _onClick: function() {
        if (L.DomUtil.hasClass(this, 'active'))
            this._sidebar.close();
        else if (!L.DomUtil.hasClass(this, 'disabled'))
            this._sidebar.open(this.querySelector('a').hash.slice(1));
    },

    /**
     * @private
     */
    _onCloseClick: function () {
        this.close();
    }
});

/**
 * Creates a new sidebar.
 *
 * @example
 * var sidebar = L.control.sidebar('sidebar').addTo(map);
 *
 * @param {string} id - The id of the sidebar element (without the # character)
 * @param {Object} [options] - Optional options object
 * @param {string} [options.position=left] - Position of the sidebar: 'left' or 'right'
 * @returns {Sidebar} A new sidebar instance
 */
L.control.sidebar = function (id, options) {
    return new L.Control.Sidebar(id, options);
};

},{}],28:[function(require,module,exports){
(function(window) {
	var HAS_HASHCHANGE = (function() {
		var doc_mode = window.documentMode;
		return ('onhashchange' in window) &&
			(doc_mode === undefined || doc_mode > 7);
	})();

	L.Hash = function(map) {
		this.onHashChange = L.Util.bind(this.onHashChange, this);

		if (map) {
			this.init(map);
		}
	};

	L.Hash.parseHash = function(hash) {
		if(hash.indexOf('#') === 0) {
			hash = hash.substr(1);
		}
		var args = hash.split("/");
		if (args.length == 3) {
			var zoom = parseInt(args[0], 10),
			lat = parseFloat(args[1]),
			lon = parseFloat(args[2]);
			if (isNaN(zoom) || isNaN(lat) || isNaN(lon)) {
				return false;
			} else {
				return {
					center: new L.LatLng(lat, lon),
					zoom: zoom
				};
			}
		} else {
			return false;
		}
	};

	L.Hash.formatHash = function(map) {
		var center = map.getCenter(),
		    zoom = map.getZoom(),
		    precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));

		return "#" + [zoom,
			center.lat.toFixed(precision),
			center.lng.toFixed(precision)
		].join("/");
	},

	L.Hash.prototype = {
		map: null,
		lastHash: null,

		parseHash: L.Hash.parseHash,
		formatHash: L.Hash.formatHash,

		init: function(map) {
			this.map = map;

			// reset the hash
			this.lastHash = null;
			this.onHashChange();

			if (!this.isListening) {
				this.startListening();
			}
		},

		removeFrom: function(map) {
			if (this.changeTimeout) {
				clearTimeout(this.changeTimeout);
			}

			if (this.isListening) {
				this.stopListening();
			}

			this.map = null;
		},

		onMapMove: function() {
			// bail if we're moving the map (updating from a hash),
			// or if the map is not yet loaded

			if (this.movingMap || !this.map._loaded) {
				return false;
			}

			var hash = this.formatHash(this.map);
			if (this.lastHash != hash) {
				location.replace(hash);
				this.lastHash = hash;
			}
		},

		movingMap: false,
		update: function() {
			var hash = location.hash;
			if (hash === this.lastHash) {
				return;
			}
			var parsed = this.parseHash(hash);
			if (parsed) {
				this.movingMap = true;

				this.map.setView(parsed.center, parsed.zoom);

				this.movingMap = false;
			} else {
				this.onMapMove(this.map);
			}
		},

		// defer hash change updates every 100ms
		changeDefer: 100,
		changeTimeout: null,
		onHashChange: function() {
			// throttle calls to update() so that they only happen every
			// `changeDefer` ms
			if (!this.changeTimeout) {
				var that = this;
				this.changeTimeout = setTimeout(function() {
					that.update();
					that.changeTimeout = null;
				}, this.changeDefer);
			}
		},

		isListening: false,
		hashChangeInterval: null,
		startListening: function() {
			this.map.on("moveend", this.onMapMove, this);

			if (HAS_HASHCHANGE) {
				L.DomEvent.addListener(window, "hashchange", this.onHashChange);
			} else {
				clearInterval(this.hashChangeInterval);
				this.hashChangeInterval = setInterval(this.onHashChange, 50);
			}
			this.isListening = true;
		},

		stopListening: function() {
			this.map.off("moveend", this.onMapMove, this);

			if (HAS_HASHCHANGE) {
				L.DomEvent.removeListener(window, "hashchange", this.onHashChange);
			} else {
				clearInterval(this.hashChangeInterval);
			}
			this.isListening = false;
		}
	};
	L.hash = function(map) {
		return new L.Hash(map);
	};
	L.Map.prototype.addHash = function() {
		this._hash = L.hash(this);
	};
	L.Map.prototype.removeHash = function() {
		this._hash.removeFrom();
	};
})(window);

},{}],29:[function(require,module,exports){
/*! Version: 0.49.0
Copyright (c) 2016 Dominik Moritz */

!function(a,b){"function"==typeof define&&define.amd?define(["leaflet"],a):"object"==typeof exports&&("undefined"!=typeof b&&b.L?module.exports=a(L):module.exports=a(require("leaflet"))),"undefined"!=typeof b&&b.L&&(b.L.Locate=a(L))}(function(a){return a.Control.Locate=a.Control.extend({options:{position:"topleft",layer:void 0,drawCircle:!0,follow:!1,stopFollowingOnDrag:!1,remainActive:!1,markerClass:a.circleMarker,circleStyle:{color:"#136AEC",fillColor:"#136AEC",fillOpacity:.15,weight:2,opacity:.5},markerStyle:{color:"#136AEC",fillColor:"#2A93EE",fillOpacity:.7,weight:2,opacity:.9,radius:5},followCircleStyle:{},followMarkerStyle:{},icon:"fa fa-map-marker",iconLoading:"fa fa-spinner fa-spin",iconElementTag:"span",circlePadding:[0,0],metric:!0,onLocationError:function(a){alert(a.message)},onLocationOutsideMapBounds:function(a){a.stop(),alert(a.options.strings.outsideMapBoundsMsg)},setView:!0,keepCurrentZoomLevel:!1,showPopup:!0,strings:{title:"Show me where I am",metersUnit:"meters",feetUnit:"feet",popup:"You are within {distance} {unit} from this point",outsideMapBoundsMsg:"You seem located outside the boundaries of the map"},locateOptions:{maxZoom:1/0,watch:!0}},initialize:function(b){a.Map.addInitHook(function(){this.options.locateControl&&this.addControl(this)});for(var c in b)"object"==typeof this.options[c]?a.extend(this.options[c],b[c]):this.options[c]=b[c];a.extend(this.options.locateOptions,{setView:!1})},_activate:function(){this.options.setView&&(this._locateOnNextLocationFound=!0),this._active||this._map.locate(this.options.locateOptions),this._active=!0,this.options.follow&&this._startFollowing(this._map)},_deactivate:function(){this._map.stopLocate(),this._map.off("dragstart",this._stopFollowing,this),this.options.follow&&this._following&&this._stopFollowing(this._map)},drawMarker:function(b){void 0===this._event.accuracy&&(this._event.accuracy=0);var c=this._event.accuracy;this._locateOnNextLocationFound&&(this._isOutsideMapBounds()?this.options.onLocationOutsideMapBounds(this):this.options.keepCurrentZoomLevel?b.panTo([this._event.latitude,this._event.longitude]):b.fitBounds(this._event.bounds,{padding:this.options.circlePadding,maxZoom:this.options.keepCurrentZoomLevel?b.getZoom():this.options.locateOptions.maxZoom}),this._locateOnNextLocationFound=!1);var d,e;if(this.options.drawCircle)if(d=this._following?this.options.followCircleStyle:this.options.circleStyle,this._circle){this._circle.setLatLng(this._event.latlng).setRadius(c);for(e in d)this._circle.options[e]=d[e]}else this._circle=a.circle(this._event.latlng,c,d).addTo(this._layer);var f,g;this.options.metric?(f=c.toFixed(0),g=this.options.strings.metersUnit):(f=(3.2808399*c).toFixed(0),g=this.options.strings.feetUnit);var h;h=this._following?this.options.followMarkerStyle:this.options.markerStyle,this._marker?this.updateMarker(this._event.latlng,h):this._marker=this.createMarker(this._event.latlng,h).addTo(this._layer);var i=this.options.strings.popup;this.options.showPopup&&i&&this._marker.bindPopup(a.Util.template(i,{distance:f,unit:g}))._popup.setLatLng(this._event.latlng),this._toggleContainerStyle()},createMarker:function(a,b){return this.options.markerClass(a,b)},updateMarker:function(a,b){this._marker.setLatLng(a);for(var c in b)this._marker.options[c]=b[c]},removeMarker:function(){this._layer.clearLayers(),this._marker=void 0,this._circle=void 0},onAdd:function(b){var c=a.DomUtil.create("div","leaflet-control-locate leaflet-bar leaflet-control");this._layer=this.options.layer||new a.LayerGroup,this._layer.addTo(b),this._event=void 0;var d={};return a.extend(d,this.options.markerStyle,this.options.followMarkerStyle),this.options.followMarkerStyle=d,d={},a.extend(d,this.options.circleStyle,this.options.followCircleStyle),this.options.followCircleStyle=d,this._link=a.DomUtil.create("a","leaflet-bar-part leaflet-bar-part-single",c),this._link.href="#",this._link.title=this.options.strings.title,this._icon=a.DomUtil.create(this.options.iconElementTag,this.options.icon,this._link),a.DomEvent.on(this._link,"click",a.DomEvent.stopPropagation).on(this._link,"click",a.DomEvent.preventDefault).on(this._link,"click",function(){var a=void 0===this._event||this._map.getBounds().contains(this._event.latlng)||!this.options.setView||this._isOutsideMapBounds();!this.options.remainActive&&this._active&&a?this.stop():this.start()},this).on(this._link,"dblclick",a.DomEvent.stopPropagation),this._resetVariables(),this.bindEvents(b),c},bindEvents:function(a){a.on("locationfound",this._onLocationFound,this),a.on("locationerror",this._onLocationError,this),a.on("unload",this.stop,this)},start:function(){this._activate(),this._event?this.drawMarker(this._map):this._setClasses("requesting")},stop:function(){this._deactivate(),this._cleanClasses(),this._resetVariables(),this.removeMarker()},_onLocationError:function(a){3==a.code&&this.options.locateOptions.watch||(this.stop(),this.options.onLocationError(a))},_onLocationFound:function(a){this._event&&this._event.latlng.lat===a.latlng.lat&&this._event.latlng.lng===a.latlng.lng&&this._event.accuracy===a.accuracy||this._active&&(this._event=a,this.options.follow&&this._following&&(this._locateOnNextLocationFound=!0),this.drawMarker(this._map))},_startFollowing:function(){this._map.fire("startfollowing",this),this._following=!0,this.options.stopFollowingOnDrag&&this._map.on("dragstart",this._stopFollowing,this)},_stopFollowing:function(){this._map.fire("stopfollowing",this),this._following=!1,this.options.stopFollowingOnDrag&&this._map.off("dragstart",this._stopFollowing,this),this._toggleContainerStyle()},_isOutsideMapBounds:function(){return void 0===this._event?!1:this._map.options.maxBounds&&!this._map.options.maxBounds.contains(this._event.latlng)},_toggleContainerStyle:function(){this._container&&(this._following?this._setClasses("following"):this._setClasses("active"))},_setClasses:function(b){"requesting"==b?(a.DomUtil.removeClasses(this._container,"active following"),a.DomUtil.addClasses(this._container,"requesting"),a.DomUtil.removeClasses(this._icon,this.options.icon),a.DomUtil.addClasses(this._icon,this.options.iconLoading)):"active"==b?(a.DomUtil.removeClasses(this._container,"requesting following"),a.DomUtil.addClasses(this._container,"active"),a.DomUtil.removeClasses(this._icon,this.options.iconLoading),a.DomUtil.addClasses(this._icon,this.options.icon)):"following"==b&&(a.DomUtil.removeClasses(this._container,"requesting"),a.DomUtil.addClasses(this._container,"active following"),a.DomUtil.removeClasses(this._icon,this.options.iconLoading),a.DomUtil.addClasses(this._icon,this.options.icon))},_cleanClasses:function(){a.DomUtil.removeClass(this._container,"requesting"),a.DomUtil.removeClass(this._container,"active"),a.DomUtil.removeClass(this._container,"following"),a.DomUtil.removeClasses(this._icon,this.options.iconLoading),a.DomUtil.addClasses(this._icon,this.options.icon)},_resetVariables:function(){this._active=!1,this._locateOnNextLocationFound=this.options.setView,this._following=!1}}),a.control.locate=function(b){return new a.Control.Locate(b)},function(){var b=function(b,c,d){d=d.split(" "),d.forEach(function(d){a.DomUtil[b].call(this,c,d)})};a.DomUtil.addClasses=function(a,c){b("addClass",a,c)},a.DomUtil.removeClasses=function(a,c){b("removeClass",a,c)}}(),a.Control.Locate},window);
//# sourceMappingURL=L.Control.Locate.min.js.map

},{"leaflet":2}],30:[function(require,module,exports){
// Following https://github.com/Leaflet/Leaflet/blob/master/PLUGIN-GUIDE.md
(function (factory, window) {

	// define an AMD module that relies on 'leaflet'
	if (typeof define === 'function' && define.amd) {
		define(['leaflet'], factory);

	// define a Common JS module that relies on 'leaflet'
	} else if (typeof exports === 'object') {
		module.exports = factory(require('leaflet'));
	}

	// attach your plugin to the global 'L' variable
	if (typeof window !== 'undefined' && window.L) {
		window.L.Control.MiniMap = factory(L);
		window.L.control.minimap = function (layer, options) {
			return new window.L.Control.MiniMap(layer, options);
		};
	}
}(function (L) {

	var MiniMap = L.Control.extend({
		options: {
			position: 'bottomleft',
			toggleDisplay: false,
			zoomLevelOffset: -5,
			zoomLevelFixed: false,
			centerFixed: false,
			zoomAnimation: false,
			autoToggleDisplay: false,
			width: 150,
			height: 150,
			collapsedWidth: 19,
			collapsedHeight: 19,
			aimingRectOptions: {color: '#33A6FF', weight: 1, clickable: true},
			shadowRectOptions: {color: '#3D3D3D', weight: 1, clickable: true, opacity: 0, fillOpacity: 0},
			strings: {hideText: 'Hide MiniMap', showText: 'Show MiniMap'},
			mapOptions: {}  // Allows definition / override of Leaflet map options.
		},

		// layer is the map layer to be shown in the minimap
		initialize: function (layer, options) {
			L.Util.setOptions(this, options);
			// Make sure the aiming rects are non-clickable even if the user tries to set them clickable (most likely by forgetting to specify them false)
			this.options.aimingRectOptions.clickable = false;
			this.options.shadowRectOptions.clickable = false;
			this._layer = layer;
		},

		onAdd: function (map) {

			this._mainMap = map;

			// Creating the container and stopping events from spilling through to the main map.
			this._container = L.DomUtil.create('div', 'leaflet-control-minimap');
			this._container.style.width = this.options.width + 'px';
			this._container.style.height = this.options.height + 'px';
			L.DomEvent.disableClickPropagation(this._container);
			L.DomEvent.on(this._container, 'mousewheel', L.DomEvent.stopPropagation);

			var mapOptions = {
				attributionControl: false,
				dragging: !this.options.centerFixed,
				zoomControl: false,
				zoomAnimation: this.options.zoomAnimation,
				autoToggleDisplay: this.options.autoToggleDisplay,
				touchZoom: this.options.centerFixed ? 'center' : !this._isZoomLevelFixed(),
				scrollWheelZoom: this.options.centerFixed ? 'center' : !this._isZoomLevelFixed(),
				doubleClickZoom: this.options.centerFixed ? 'center' : !this._isZoomLevelFixed(),
				boxZoom: !this._isZoomLevelFixed(),
				crs: map.options.crs
			};
			mapOptions = L.Util.extend(this.options.mapOptions, mapOptions);  // merge with priority of the local mapOptions object.

			this._miniMap = new L.Map(this._container, mapOptions);

			this._miniMap.addLayer(this._layer);

			// These bools are used to prevent infinite loops of the two maps notifying each other that they've moved.
			this._mainMapMoving = false;
			this._miniMapMoving = false;

			// Keep a record of this to prevent auto toggling when the user explicitly doesn't want it.
			this._userToggledDisplay = false;
			this._minimized = false;

			if (this.options.toggleDisplay) {
				this._addToggleButton();
			}

			this._miniMap.whenReady(L.Util.bind(function () {
				this._aimingRect = L.rectangle(this._mainMap.getBounds(), this.options.aimingRectOptions).addTo(this._miniMap);
				this._shadowRect = L.rectangle(this._mainMap.getBounds(), this.options.shadowRectOptions).addTo(this._miniMap);
				this._mainMap.on('moveend', this._onMainMapMoved, this);
				this._mainMap.on('move', this._onMainMapMoving, this);
				this._miniMap.on('movestart', this._onMiniMapMoveStarted, this);
				this._miniMap.on('move', this._onMiniMapMoving, this);
				this._miniMap.on('moveend', this._onMiniMapMoved, this);
			}, this));

			return this._container;
		},

		addTo: function (map) {
			L.Control.prototype.addTo.call(this, map);

			var center = this.options.centerFixed || this._mainMap.getCenter();
			this._miniMap.setView(center, this._decideZoom(true));
			this._setDisplay(this._decideMinimized());
			return this;
		},

		onRemove: function (map) {
			this._mainMap.off('moveend', this._onMainMapMoved, this);
			this._mainMap.off('move', this._onMainMapMoving, this);
			this._miniMap.off('moveend', this._onMiniMapMoved, this);

			this._miniMap.removeLayer(this._layer);
		},

		changeLayer: function (layer) {
			this._miniMap.removeLayer(this._layer);
			this._layer = layer;
			this._miniMap.addLayer(this._layer);
		},

		_addToggleButton: function () {
			this._toggleDisplayButton = this.options.toggleDisplay ? this._createButton(
				'', this.options.strings.hideText, ('leaflet-control-minimap-toggle-display leaflet-control-minimap-toggle-display-' +
				this.options.position), this._container, this._toggleDisplayButtonClicked, this) : undefined;

			this._toggleDisplayButton.style.width = this.options.collapsedWidth + 'px';
			this._toggleDisplayButton.style.height = this.options.collapsedHeight + 'px';
		},

		_createButton: function (html, title, className, container, fn, context) {
			var link = L.DomUtil.create('a', className, container);
			link.innerHTML = html;
			link.href = '#';
			link.title = title;

			var stop = L.DomEvent.stopPropagation;

			L.DomEvent
				.on(link, 'click', stop)
				.on(link, 'mousedown', stop)
				.on(link, 'dblclick', stop)
				.on(link, 'click', L.DomEvent.preventDefault)
				.on(link, 'click', fn, context);

			return link;
		},

		_toggleDisplayButtonClicked: function () {
			this._userToggledDisplay = true;
			if (!this._minimized) {
				this._minimize();
				this._toggleDisplayButton.title = this.options.strings.showText;
			} else {
				this._restore();
				this._toggleDisplayButton.title = this.options.strings.hideText;
			}
		},

		_setDisplay: function (minimize) {
			if (minimize !== this._minimized) {
				if (!this._minimized) {
					this._minimize();
				} else {
					this._restore();
				}
			}
		},

		_minimize: function () {
			// hide the minimap
			if (this.options.toggleDisplay) {
				this._container.style.width = this.options.collapsedWidth + 'px';
				this._container.style.height = this.options.collapsedHeight + 'px';
				this._toggleDisplayButton.className += (' minimized-' + this.options.position);
			} else {
				this._container.style.display = 'none';
			}
			this._minimized = true;
		},

		_restore: function () {
			if (this.options.toggleDisplay) {
				this._container.style.width = this.options.width + 'px';
				this._container.style.height = this.options.height + 'px';
				this._toggleDisplayButton.className = this._toggleDisplayButton.className
					.replace('minimized-'	+ this.options.position, '');
			} else {
				this._container.style.display = 'block';
			}
			this._minimized = false;
		},

		_onMainMapMoved: function (e) {
			if (!this._miniMapMoving) {
				var center = this.options.centerFixed || this._mainMap.getCenter();

				this._mainMapMoving = true;
				this._miniMap.setView(center, this._decideZoom(true));
				this._setDisplay(this._decideMinimized());
			} else {
				this._miniMapMoving = false;
			}
			this._aimingRect.setBounds(this._mainMap.getBounds());
		},

		_onMainMapMoving: function (e) {
			this._aimingRect.setBounds(this._mainMap.getBounds());
		},

		_onMiniMapMoveStarted: function (e) {
			if (!this.options.centerFixed) {
				var lastAimingRect = this._aimingRect.getBounds();
				var sw = this._miniMap.latLngToContainerPoint(lastAimingRect.getSouthWest());
				var ne = this._miniMap.latLngToContainerPoint(lastAimingRect.getNorthEast());
				this._lastAimingRectPosition = {sw: sw, ne: ne};
			}
		},

		_onMiniMapMoving: function (e) {
			if (!this.options.centerFixed) {
				if (!this._mainMapMoving && this._lastAimingRectPosition) {
					this._shadowRect.setBounds(new L.LatLngBounds(this._miniMap.containerPointToLatLng(this._lastAimingRectPosition.sw), this._miniMap.containerPointToLatLng(this._lastAimingRectPosition.ne)));
					this._shadowRect.setStyle({opacity: 1, fillOpacity: 0.3});
				}
			}
		},

		_onMiniMapMoved: function (e) {
			if (!this._mainMapMoving) {
				this._miniMapMoving = true;
				this._mainMap.setView(this._mainMap.getCenter(), this._decideZoom(false));
				this._shadowRect.setStyle({opacity: 0, fillOpacity: 0});
			} else {
				this._mainMapMoving = false;
			}
		},

		_isZoomLevelFixed: function () {
			var zoomLevelFixed = this.options.zoomLevelFixed;
			return this._isDefined(zoomLevelFixed) && this._isInteger(zoomLevelFixed);
		},

		_decideZoom: function (fromMaintoMini) {
			if (!this._isZoomLevelFixed()) {
				if (fromMaintoMini) {
					return this._mainMap.getZoom() + this.options.zoomLevelOffset;
				} else {
					var currentDiff = this._miniMap.getZoom() - this._mainMap.getZoom();
					var proposedZoom = this._miniMap.getZoom() - this.options.zoomLevelOffset;
					var toRet;

					if (currentDiff > this.options.zoomLevelOffset && this._mainMap.getZoom() < this._miniMap.getMinZoom() - this.options.zoomLevelOffset) {
						// This means the miniMap is zoomed out to the minimum zoom level and can't zoom any more.
						if (this._miniMap.getZoom() > this._lastMiniMapZoom) {
							// This means the user is trying to zoom in by using the minimap, zoom the main map.
							toRet = this._mainMap.getZoom() + 1;
							// Also we cheat and zoom the minimap out again to keep it visually consistent.
							this._miniMap.setZoom(this._miniMap.getZoom() - 1);
						} else {
							// Either the user is trying to zoom out past the mini map's min zoom or has just panned using it, we can't tell the difference.
							// Therefore, we ignore it!
							toRet = this._mainMap.getZoom();
						}
					} else {
						// This is what happens in the majority of cases, and always if you configure the min levels + offset in a sane fashion.
						toRet = proposedZoom;
					}
					this._lastMiniMapZoom = this._miniMap.getZoom();
					return toRet;
				}
			} else {
				if (fromMaintoMini) {
					return this.options.zoomLevelFixed;
				} else {
					return this._mainMap.getZoom();
				}
			}
		},

		_decideMinimized: function () {
			if (this._userToggledDisplay) {
				return this._minimized;
			}

			if (this.options.autoToggleDisplay) {
				if (this._mainMap.getBounds().contains(this._miniMap.getBounds())) {
					return true;
				}
				return false;
			}

			return this._minimized;
		},

		_isInteger: function (value) {
			return typeof value === 'number';
		},

		_isDefined: function (value) {
			return typeof value !== 'undefined';
		}
	});

	L.Map.mergeOptions({
		miniMapControl: false
	});

	L.Map.addInitHook(function () {
		if (this.options.miniMapControl) {
			this.miniMapControl = (new MiniMap()).addTo(this);
		}
	});

	return MiniMap;

}, window));

},{"leaflet":2}],31:[function(require,module,exports){
var L = require('leaflet'),
	lastCallbackId = 0,
	htmlEscape = (function() {
		// Adapted from handlebars.js
		// https://github.com/wycats/handlebars.js/
		var badChars = /[&<>"'`]/g;
		var possible = /[&<>"'`]/;
		var escape = {
		  '&': '&amp;',
		  '<': '&lt;',
		  '>': '&gt;',
		  '"': '&quot;',
		  '\'': '&#x27;',
		  '`': '&#x60;'
		};

		function escapeChar(chr) {
		  return escape[chr];
		}

		return function(string) {
			if (string == null) {
				return '';
			} else if (!string) {
				return string + '';
			}

			// Force a string conversion as this will be done by the append regardless and
			// the regex test will do this transparently behind the scenes, causing issues if
			// an object's to string has escaped characters in it.
			string = '' + string;

			if (!possible.test(string)) {
				return string;
			}
			return string.replace(badChars, escapeChar);
		};
	})();

module.exports = {
	jsonp: function(url, params, callback, context, jsonpParam) {
		var callbackId = '_l_geocoder_' + (lastCallbackId++);
		params[jsonpParam || 'callback'] = callbackId;
		window[callbackId] = L.Util.bind(callback, context);
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = url + L.Util.getParamString(params);
		script.id = callbackId;
		document.getElementsByTagName('head')[0].appendChild(script);
	},

	getJSON: function(url, params, callback) {
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.onreadystatechange = function () {
			if (xmlHttp.readyState !== 4){
				return;
			}
			if (xmlHttp.status !== 200 && xmlHttp.status !== 304){
				callback('');
				return;
			}
			callback(JSON.parse(xmlHttp.response));
		};
		xmlHttp.open('GET', url + L.Util.getParamString(params), true);
		xmlHttp.setRequestHeader('Accept', 'application/json');
		xmlHttp.send(null);
	},

	template: function (str, data) {
		return str.replace(/\{ *([\w_]+) *\}/g, function (str, key) {
			var value = data[key];
			if (value === undefined) {
				value = '';
			} else if (typeof value === 'function') {
				value = value(data);
			}
			return htmlEscape(value);
		});
	},

	htmlEscape: htmlEscape
};

},{"leaflet":2}]},{},[16])