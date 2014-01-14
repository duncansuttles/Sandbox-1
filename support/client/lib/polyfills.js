		
define([], 
function() { return( 
	{
		setup:function()
		{
			
			this.performanceNow();
			this.errorHandler();
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
		errorHandler:function()
		{
			window.errorCount = 0;
			return;
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
