
define([], 
function() { return( 
	{
		setup:function()
		{
			
			this.performanceNow();
			this.errorHandler();
			this.websocket();
			this.localStorage();
			this.detectIE11();
			this.escapeHTMLStrings();
			this.setImmediate();
		},
		escapeHTMLStrings:function()
		{
			var entityMap = {
			    "&": "&amp;",
			    "<": "&lt;",
			    ">": "&gt;",
			    '"': '&quot;',
			    "'": '&#39;',
			    "/": '&#x2F;'
			  };

			String.prototype.escape = function()
			{

				return this.replace(/[&<>"'\/]/g, function (s) {
			      return entityMap[s];
			    });
			}

		},
		setImmediate:function()
		{

			//https://github.com/NobleJS/setImmediate
			(function (global, undefined) {
			    "use strict";

			    var tasks = (function () {
			        function Task(handler, args) {
			            this.handler = handler;
			            this.args = args;
			        }
			        Task.prototype.run = function () {
			            // See steps in section 5 of the spec.
			            if (typeof this.handler === "function") {
			                // Choice of `thisArg` is not in the setImmediate spec; `undefined` is in the setTimeout spec though:
			                // http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html
			                this.handler.apply(undefined, this.args);
			            } else {
			                var scriptSource = "" + this.handler;
			                /*jshint evil: true */
			                eval(scriptSource);
			            }
			        };

			        var nextHandle = 1; // Spec says greater than zero
			        var tasksByHandle = {};
			        var currentlyRunningATask = false;

			        return {
			            addFromSetImmediateArguments: function (args) {
			                var handler = args[0];
			                var argsToHandle = Array.prototype.slice.call(args, 1);
			                var task = new Task(handler, argsToHandle);

			                var thisHandle = nextHandle++;
			                tasksByHandle[thisHandle] = task;
			                return thisHandle;
			            },
			            runIfPresent: function (handle) {
			                // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
			                // So if we're currently running a task, we'll need to delay this invocation.
			                if (!currentlyRunningATask) {
			                    var task = tasksByHandle[handle];
			                    if (task) {
			                        currentlyRunningATask = true;
			                        try {
			                            task.run();
			                        } finally {
			                            delete tasksByHandle[handle];
			                            currentlyRunningATask = false;
			                        }
			                    }
			                } else {
			                    // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
			                    // "too much recursion" error.
			                    global.setTimeout(function () {
			                        tasks.runIfPresent(handle);
			                    }, 0);
			                }
			            },
			            remove: function (handle) {
			                delete tasksByHandle[handle];
			            }
			        };
			    }());

			    function canUseNextTick() {
			        // Don't get fooled by e.g. browserify environments.
			        return typeof process === "object" &&
			               Object.prototype.toString.call(process) === "[object process]";
			    }

			    function canUseMessageChannel() {
			        return !!global.MessageChannel;
			    }

			    function canUsePostMessage() {
			        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
			        // where `global.postMessage` means something completely different and can't be used for this purpose.

			        if (!global.postMessage || global.importScripts) {
			            return false;
			        }

			        var postMessageIsAsynchronous = true;
			        var oldOnMessage = global.onmessage;
			        global.onmessage = function () {
			            postMessageIsAsynchronous = false;
			        };
			        global.postMessage("", "*");
			        global.onmessage = oldOnMessage;

			        return postMessageIsAsynchronous;
			    }

			    function canUseReadyStateChange() {
			        return "document" in global && "onreadystatechange" in global.document.createElement("script");
			    }

			    function installNextTickImplementation(attachTo) {
			        attachTo.setImmediate = function () {
			            var handle = tasks.addFromSetImmediateArguments(arguments);

			            process.nextTick(function () {
			                tasks.runIfPresent(handle);
			            });

			            return handle;
			        };
			    }

			    function installMessageChannelImplementation(attachTo) {
			        var channel = new global.MessageChannel();
			        channel.port1.onmessage = function (event) {
			            var handle = event.data;
			            tasks.runIfPresent(handle);
			        };
			        attachTo.setImmediate = function () {
			            var handle = tasks.addFromSetImmediateArguments(arguments);

			            channel.port2.postMessage(handle);

			            return handle;
			        };
			    }

			    function installPostMessageImplementation(attachTo) {
			        // Installs an event handler on `global` for the `message` event: see
			        // * https://developer.mozilla.org/en/DOM/window.postMessage
			        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

			        var MESSAGE_PREFIX = "com.bn.NobleJS.setImmediate" + Math.random();

			        function isStringAndStartsWith(string, putativeStart) {
			            return typeof string === "string" && string.substring(0, putativeStart.length) === putativeStart;
			        }

			        function onGlobalMessage(event) {
			            // This will catch all incoming messages (even from other windows!), so we need to try reasonably hard to
			            // avoid letting anyone else trick us into firing off. We test the origin is still this window, and that a
			            // (randomly generated) unpredictable identifying prefix is present.
			            if (event.source === global && isStringAndStartsWith(event.data, MESSAGE_PREFIX)) {
			                var handle = event.data.substring(MESSAGE_PREFIX.length);
			                tasks.runIfPresent(handle);
			            }
			        }
			        if (global.addEventListener) {
			            global.addEventListener("message", onGlobalMessage, false);
			        } else {
			            global.attachEvent("onmessage", onGlobalMessage);
			        }

			        attachTo.setImmediate = function () {
			            var handle = tasks.addFromSetImmediateArguments(arguments);

			            // Make `global` post a message to itself with the handle and identifying prefix, thus asynchronously
			            // invoking our onGlobalMessage listener above.
			            global.postMessage(MESSAGE_PREFIX + handle, "*");

			            return handle;
			        };
			    }

			    function installReadyStateChangeImplementation(attachTo) {
			        attachTo.setImmediate = function () {
			            var handle = tasks.addFromSetImmediateArguments(arguments);

			            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
			            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
			            var scriptEl = global.document.createElement("script");
			            scriptEl.onreadystatechange = function () {
			                tasks.runIfPresent(handle);

			                scriptEl.onreadystatechange = null;
			                scriptEl.parentNode.removeChild(scriptEl);
			                scriptEl = null;
			            };
			            global.document.documentElement.appendChild(scriptEl);

			            return handle;
			        };
			    }

			    function installSetTimeoutImplementation(attachTo) {
			        attachTo.setImmediate = function () {
			            var handle = tasks.addFromSetImmediateArguments(arguments);

			            global.setTimeout(function () {
			                tasks.runIfPresent(handle);
			            }, 0);

			            return handle;
			        };
			    }

			    if (!global.setImmediate) {
			        // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
			        var attachTo = typeof Object.getPrototypeOf === "function" && "setTimeout" in Object.getPrototypeOf(global) ?
			                          Object.getPrototypeOf(global)
			                        : global;

			        if (canUseNextTick()) {
			            // For Node.js before 0.9
			            installNextTickImplementation(attachTo);
			        } else if (canUsePostMessage()) {
			            // For non-IE10 modern browsers
			            installPostMessageImplementation(attachTo);
			        } else if (canUseMessageChannel()) {
			            // For web workers, where supported
			            installMessageChannelImplementation(attachTo);
			        } else if (canUseReadyStateChange()) {
			            // For IE 6–8
			            installReadyStateChangeImplementation(attachTo);
			        } else {
			            // For older browsers
			            installSetTimeoutImplementation(attachTo);
			        }

			        attachTo.clearImmediate = tasks.remove;
			    }
			}(window));


		},
		performanceNow:function()
		{

			 // prepare base perf object
			  if (typeof window.performance === 'undefined') {
			      window.performance = {};
			  }
			 
			  if (!window.performance.now)
			  {
			    
				    var nowOffset = Date.now();
				 
				    if (performance.timing && performance.timing.navigationStart){
				      nowOffset = performance.timing.navigationStart
				    }
				 
				 
				    window.performance.now = function now(){
				      return Date.now() - nowOffset;
				    }
			   }
		},
		localStorage:function()
		{
			//https://gist.github.com/remy/350433
			if (typeof window.localStorage == 'undefined' || typeof window.sessionStorage == 'undefined') (function () {
			 
			var Storage = function (type) {
			  function createCookie(name, value, days) {
			    var date, expires;
			 
			    if (days) {
			      date = new Date();
			      date.setTime(date.getTime()+(days*24*60*60*1000));
			      expires = "; expires="+date.toGMTString();
			    } else {
			      expires = "";
			    }
			    document.cookie = name+"="+value+expires+"; path=/";
			  }
			 
			  function readCookie(name) {
			    var nameEQ = name + "=",
			        ca = document.cookie.split(';'),
			        i, c;
			 
			    for (i=0; i < ca.length; i++) {
			      c = ca[i];
			      while (c.charAt(0)==' ') {
			        c = c.substring(1,c.length);
			      }
			 
			      if (c.indexOf(nameEQ) == 0) {
			        return c.substring(nameEQ.length,c.length);
			      }
			    }
			    return null;
			  }
			  
			  function setData(data) {
			    data = JSON.stringify(data);
			    if (type == 'session') {
			      window.name = data;
			    } else {
			      createCookie('localStorage', data, 365);
			    }
			  }
			  
			  function clearData() {
			    if (type == 'session') {
			      window.name = '';
			    } else {
			      createCookie('localStorage', '', 365);
			    }
			  }
			  
			  function getData() {
			    var data = type == 'session' ? window.name : readCookie('localStorage');
			    return data ? JSON.parse(data) : {};
			  }
			 
			 
			  // initialise if there's already data
			  var data = getData();
			 
			  return {
			    length: 0,
			    clear: function () {
			      data = {};
			      this.length = 0;
			      clearData();
			    },
			    getItem: function (key) {
			      return data[key] === undefined ? null : data[key];
			    },
			    key: function (i) {
			      // not perfect, but works
			      var ctr = 0;
			      for (var k in data) {
			        if (ctr == i) return k;
			        else ctr++;
			      }
			      return null;
			    },
			    removeItem: function (key) {
			      delete data[key];
			      this.length--;
			      setData(data);
			    },
			    setItem: function (key, value) {
			      data[key] = value+''; // forces the value to a string
			      this.length++;
			      setData(data);
			    }
			  };
			};
			 
			if (typeof window.localStorage == 'undefined') window.localStorage = new Storage('local');
			if (typeof window.sessionStorage == 'undefined') window.sessionStorage = new Storage('session');
			 
			})();
		},
		detectIE11:function()
		{
			window.isIE  = function() { return ((navigator.appName == 'Microsoft Internet Explorer') || ((navigator.appName == 'Netscape') && (new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})").exec(navigator.userAgent) != null))); }

		},
		websocket:function()
		{
			if (!window.WebSocket && window.MozWebSocket) window.WebSocket=window.MozWebSocket;
		},
		errorHandler:function()
		{
			window.errorCount = 0;
			var lastError = performance.now();
			window.onerror = function(message,source,line,column, errorObj){
			   
			   window.errorCount ++;
			   if(window.errorCount > 30) return;
			   var user = null;
			   if(window._UserManager)
			   		user = _UserManager.GetCurrentUserName();
			   var session = null;
			   if(window._DataManager)
			   		session = _DataManager.getCurrentSession();
			   var time = (new Date());
			   var stack = (errorObj || (new Error())).stack;
			   var error = {user:user,sesssion:session,time:time,message:message,source:source,line:line,stack:stack,column:column};
			   jQuery.ajax(
			   {
					type: 'POST',
					url:  './vwfDataManager.svc/error',
					data: JSON.stringify(error),
					contentType: "application/json; charset=utf-8",
					success: function(err,data,xhr)
					{

						if(performance.now() - lastError > 5000)
						{
							if (xhr.status != 200)
							{
								alertify.error('Sorry, an error has occured, but could not be logged');
							}else
								alertify.error('Sorry, an error has occured and was logged to the server.');
							lastError = performance.now();
						}
					},
					error: function(e)
					{
						if(performance.now() - lastError > 5000)
						{
							alertify.error('Sorry, an error has occured, but could not be logged');
							lastError = performance.now();
						}
					},
					async: true,
					dataType: "text"
				});
			};
		}
	});
});
