//this is the main loader. load all the deps, then load boot

//trick the optimizer into concating these files - it seems that it will not detect and concatenate the files from the nested requries below.
//note: the files in the below array are in a specific order, to deal with depenancies. Since the files are concatenated in this order, it's very imporant
if(false)
{
	require(["./vwf/view/editorview/lib/jquery-2.0.3.min.js","closure/base.js","async.js","crypto.js","md5.js","./vwf/view/editorview/lib/jquery-migrate-1.2.1.min.js","./vwf/view/editorview/lib/jquery-ui-1.10.3.custom.min.js","./vwf/view/editorview/lib/jquery.transit.min.js","./vwf/view/editorview/lib/jquery-mousewheel.js","./vwf/view/editorview/lib/jquery-scrollpane.min.js","./vwf/model/threejs/three.js","./vwf/model/threejs/ColladaLoader.js","./vwf/model/threejs/UTF8JSONLoader.js","./vwf/view/localization/i18next-1.7.2.min.js","./vwf/view/localization/cookies.js","compatibility.js","closure/deps.js",
    "closure/vec/float32array.js",
    "closure/vec/float64array.js",
    "closure/vec/vec.js",
    "closure/vec/vec3.js",
    "closure/vec/vec4.js",
    "closure/vec/mat4.js",
    "closure/vec/quaternion.js",
    "alea.js",
    "mash.js",
    "./vwfbuild.js","boot"]);
}



//if window.jQuery is defined, than the Require Optimizer has run, and appended it to the top of this file. Thus, we don't need to worry about loading all the dependancy libraries
if(!window.jQuery)	
{
 
  //so,we are doing a regular load, and the optimizer has not run. 
  //this is somewhat carefully scripted to specify which files can download in parallel.
  require(["./vwf/view/editorview/lib/jquery-2.0.3.min.js","closure/base.js","async.js","crypto.js"],
  	function()
  	{
	    require(["../vwf/view/editorview/lib/jquery-migrate-1.2.1.min.js","../vwf/view/editorview/lib/jquery-ui-1.10.3.custom.min.js","md5.js","closure/deps.js","../vwf/view/editorview/lib/jquery.transit.min.js","../vwf/view/editorview/lib/jquery-mousewheel.js","../vwf/view/editorview/lib/jquery-scrollpane.min.js","../vwf/model/threejs/three.js","closure/vec/float32array.js","closure/vec/float64array.js"],
	    	function()
	    	{
		       require(["../vwf/model/threejs/ColladaLoader.js","../vwf/model/threejs/UTF8JSONLoader.js","../vwf/view/localization/i18next-1.7.2.min.js","../vwf/view/localization/cookies.js","compatibility.js","closure/vec/vec.js","../vwf.js"],
		       	function()
		       	{
					require(["closure/vec/vec3.js","closure/vec/vec4.js"],
			       	function()
			       	{
			       		require(["closure/vec/mat4.js","closure/vec/quaternion.js","alea.js","mash.js","Class.create.js","jquery-encoder-0.1.0.js","rAF.js","centerinclient.js"],
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
     //TODO: Try to read this and set from config.json in the build process
     //window.appPath = "/adl/sandbox/";
     window.appPath = "/adl/sandbox/";

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

      //localization
      var lang = docCookies.getItem('i18next');
      var option = {
        lng: lang,
        resGetPath: 'vwf/view/localization/locales/__lng__/__ns__.json',
        useLocalStorage: true,
        debug: true,
        getAsync: false
      };
      i18n.init(option);


    //start when document is ready
    $(window).ready(function(){


        //hide the compatibility check
        $('#loadstatus').fadeOut();


        //get the state settings
              var stateData = $.ajax({
                url:"./vwfDataManager.svc/statedata?SID=" + window.location.pathname.substring(window.location.pathname.indexOf(window.appPath)) + window.location.hash,
                method:'GET',
                async:false
              });
              try{
                stateData = JSON.parse(stateData.responseText);
              }catch(e)
              {
                stateData = null;
              }      

        //check if the user is logged in
        $.ajax({url:'/vwfdatamanager.svc/profile',
          success:function(data2,status2,xhr2)
          {
            //if they are, fire up the boot module
           boot(stateData);
          },
          error:function()
          {
            //if they are not, warn them by loading alertify and alerting
            require(['vwf/view/editorview/lib/alertify.js-0.3.9/src/alertify'], function (alertify) {

            

              

              

              //if the world is set to allow anonymous, don't pop up the login warning
              if(stateData && stateData.publishSettings && (stateData.publishSettings.isPublished !== false) && stateData.publishSettings.allowAnonymous)
              {
                boot(stateData);
              }
              else
              {

              alertify.set({ labels: {
                ok     : i18n.t("Login"),
                cancel : i18n.t("Continue as Guest")
              } });

              alertify.confirm(i18n.t("You are viewing this world as a guest")+"."+i18n.t("You will be able to view the world, but not interact with it")+"."+i18n.t("Would you like to go back and log in")+"?",
                function(e)
                {


                  //if they choose to go back and log in
                  if(e)
                    window.location =  "../login?return=" + window.location.pathname.substring(window.location.pathname.indexOf(window.appPath)+window.appPath.length) + window.location.hash + window.location.search;
                  else
                  {

                    alertify.set({ labels: {
                      ok     : i18n.t("Ok"),
                      cancel : i18n.t("Cancel")
                    } });

                    //continue as guest, fire up the boot.js
                    boot(stateData);
                  }
                }
                );
            }


            });
          }});
  });
}
