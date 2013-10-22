require.config({
	   
	    paths: {
		"vwf": "../vwf"
	    },
		shims: {
			'vwf/view/xapi/xapiwrapper': {
				deps: ['vwf/view/editorview/sha256', "vwf/view/editorview/_3DRIntegration"],
				exports: 'XAPIWrapper'
			}
		},
	    waitSeconds: 15
	  });		
        require( [
            
            "domReady",
            "vwf/view/editorview/ObjectPools",
			"/socket.io/socket.io.js",
        ], function( ready ) {

            require("vwf/view/editorview/ObjectPools").getSingleton();
            ready( function() {

                // With the scripts loaded, we must initialize the framework. vwf.initialize()
                // accepts three parameters: a world specification, model configuration parameters,
                // and view configuration parameters.
				$(document.body).append('<div id="glyphOverlay" style="display:none"/>');
               
                 vwf.loadConfiguration(application, userLibraries, updateOverlay);

            } );

        } );
