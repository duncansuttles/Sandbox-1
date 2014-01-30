
define([], 
function() { return( 
	{
		setup:function()
		{
			
			this.performanceNow();
			this.errorHandler();
			this.websocket();
			this.localStorage();
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
		websocket:function()
		{
			if (!window.WebSocket && window.MozWebSocket) window.WebSocket=window.MozWebSocket;
		},
		errorHandler:function()
		{
			window.errorCount = 0;
			
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
					success: function(err,data,xhr)
					{
						if (xhr.status != 200)
						{
							alertify.error('Sorry, an error has occured, but could not be logged');
						}else
							alertify.error('Sorry, an error has occured and was logged to the server.');

					},
					error: function(e)
					{
						alertify.error('Sorry, an error has occured, but could not be logged');
					},
					async: true,
					dataType: "text"
				});
			};
		}
	});
});
