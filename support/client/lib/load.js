//this is the main loader. load all the deps, then load boot

//trick the optimizer into concating these files - it seems that it will not detect and concatenate the files from the nested requries below.
//note: the files in the below array are in a specific order, to deal with depenancies. Since the files are concatenated in this order, it's very imporant
if(false)
{
	require(["jquery-2.0.3.min.js","closure/base.js","async.js","crypto.js","md5.js","jquery-migrate-1.2.1.min.js","jquery-ui-1.10.3.custom.min.js","jquery.transit.min.js","jquery-mousewheel.js","jquery-scrollpane.min.js","./vwf/model/threejs/three.js","./vwf/model/threejs/ColladaLoader.js","./vwf/model/threejs/UTF8JSONLoader.js","./vwf/view/localization/json2.min.js","./vwf/view/localization/l10n.min.js","./vwf/view/localization/localizations.js","compatibility.js","closure/deps.js",
    "closure/vec/float32array.js",
    "closure/vec/float64array.js",
    "closure/vec/vec.js",
    "closure/vec/vec3.js",
    "closure/vec/vec4.js",
    "closure/vec/mat4.js",
    "closure/vec/quaternion.js",
    "./vwf.js","boot"]);
}
//if window.jQuery is defined, than the Require Optimizer has run, and appended it to the top of this file. Thus, we don't need to worry about loading all the dependancy libraries
if(!window.jQuery)	
{
  //so,we are doing a regular load, and the optimizer has not run. 
  //this is somewhat carefully scripted to specify which files can download in parallel.
  require(["jquery-2.0.3.min.js","closure/base.js","async.js","crypto.js"],
  	function()
  	{
	    require(["jquery-migrate-1.2.1.min.js","jquery-ui-1.10.3.custom.min.js","md5.js","closure/deps.js","jquery.transit.min.js","jquery-mousewheel.js","jquery-scrollpane.min.js","../vwf/model/threejs/three.js","closure/vec/float32array.js","closure/vec/float64array.js"],
	    	function()
	    	{
		       require(["../vwf/model/threejs/ColladaLoader.js","../vwf/model/threejs/UTF8JSONLoader.js","../vwf/view/localization/json2.min.js","../vwf/view/localization/l10n.min.js","../vwf/view/localization/localizations.js","compatibility.js","closure/vec/vec.js","../vwf.js"],
		       	function()
		       	{
					require(["closure/vec/vec3.js","closure/vec/vec4.js"],
			       	function()
			       	{
			       		require(["closure/vec/mat4.js","closure/vec/quaternion.js"],
					       	function()
					       	{
						       require(["boot"],function(boot)
						       {
						       		//ok, the loading stage is complete - fire up some initial gui logic
						       		startup(boot);
					    	   })
					    	})
					})    	   
	    		})
    		}) 
  	});	
}
else
{
   //so, if window.jQuery is defined, then we don't need to worry about the other libs - they are already loaded. Just fire the startup.
   require(["boot"],function(boot)
   {
   		//note that the boot module returns a function that does all the VWF setup
   		startup(boot);
   })
}

  //ok, at this point, we have all the libraries. Let's do a bit of gui logic and setup
  function startup(boot)
  {
        //remove the instnace name from requests to make things cache
      $.ajaxSetup({ cache: true });

     $.ajaxPrefilter( function(options, originalOptions, jqXHR) 
     {

      var p = window.location.pathname;
      if(p[p.length-1] == '/') {p = p.substring(0,p.length -1)};
      p = p.substring(p.lastIndexOf('/')+1);

      var query = options.url.indexOf('?');
      var found = options.url.indexOf(p);

            //dont strip the url out of query strings
            //I can't beleive this did not cause problems before
            if(found < query)
              options.url = options.url.replace(p,'');
            


          }
          );
      //some hookups for simple access to math libraries    
      window.Vec3 = goog.vec.Vec3;    
      window.Vec4 = goog.vec.Vec4;
      window.Mat4 = goog.vec.Mat4;
      window.Quaternion = goog.vec.Quaternion;

    //start when document is ready
    $(window).ready(function(){

      //do the check for support, and callback when done
      //this checks for support for webgl, websockets and javascript
      updateOverlay(function(supported){

        //if not supported, load alertify, alert, and stop
        if(!supported)
        {
          window.setTimeout(function(){

            $('#loadstatus').fadeOut();
            require(['vwf/view/editorview/alertify.js-0.3.9/src/alertify'], function (alertify) {
              alertify.alert('Sorry, this browser is not supported. Click ok to view the browser test page.',
               function(){

                window.location = window.location +"../test";
              });
            });


          },1500);


          return;
        }

        //hide the compatibility check
        $('#loadstatus').fadeOut();

        //check if the user is logged in
        $.ajax({url:'/vwfdatamanager.svc/profile',
          success:function(data2,status2,xhr2)
          {
            //if they are, fire up the boot module
           boot();
          },
          error:function()
          {
            //if they are not, warn them by loading alertify and alerting
            require(['vwf/view/editorview/alertify.js-0.3.9/src/alertify'], function (alertify) {

              alertify.set({ labels: {
                ok     : "Login",
                cancel : "Continue as Guest"
              } });


              alertify.confirm("You are viewing this world as a guest. You will be able to view the world, but not interact with it. Would you like to go back and log in?",
                function(e)
                {

                  //if they choose to go back and log in
                  if(e)
                    window.location =  "../login?return=" + window.location.pathname.substr(13) + window.location.hash;
                  else
                  {

                    alertify.set({ labels: {
                      ok     : "Ok",
                      cancel : "Cancel"
                    } });

                    //continue as guest, fire up the boot.js
                    boot();
                  }
                }
                );


            });
          }});
  });
  }) ;
}
