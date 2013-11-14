    var camera, scene, renderer;
    var geometry, material, skin, t = 0, lastFrame = 34, totalFrames = 27, startFrame = 7;

    init();


	var container, stats;

	var camera, scene, renderer;

	var mesh, light;

	var mouseX = 0, mouseY = 0;

	var windowHalfX = window.innerWidth / 2;
	var windowHalfY = window.innerHeight / 2;

	var animations = [];
	var buffalos = [];
	var offset = [];
	var box;
	var floor, dz = 0, dstep = -10, playback = false;
	var clock = new THREE.Clock();
	
    function init() {
		
	   camera = new THREE.PerspectiveCamera( 25, 1, 1, 10000 );
		camera.position.set( -2, -3.2, 5.8 );
		camera.up.set( 0, 0, 1 );

        scene = new THREE.Scene();
        scene.add( mesh );
		scene.add( new THREE.AmbientLight( 0xcccccc ) );

        renderer = new THREE.WebGLRenderer();
        renderer.setSize( 400, 400 );

       $("#previewRender").html( renderer.domElement );
	   
	    var loader = new THREE.ColladaLoader();
		loader.load( "./avatars/VWS_Business_Male1.DAE", createScene );
    }
	
	function createScene( geo, materials ) {
		
		geometry = geo;
       // var material = new THREE.MeshBasicMaterial( materials );

       // mesh = new THREE.Mesh( geometry, material );
		
		scene.add( geometry.scene );
		camera.lookAt( geometry.scene.position );
		camera.lookAt(geometry.scene.children[0].children[1].position)
		skin = geometry.skins[0];

		loop();
	}
	
	
	function loop() {
		
		
		geometry.scene.rotation.z += .015;
		requestAnimationFrame( loop, renderer.domElement );
		var delta = clock.getDelta();
		
		if ( t > 1.2 ) t = 0;
		if ( skin )
		{
			skin.morphTargetInfluences[lastFrame] = 0;
			var currentFrame = startFrame + Math.floor(t*totalFrames/1.2);
			skin.morphTargetInfluences[currentFrame] = 1;
			t += delta;
			lastFrame = currentFrame;
		}
		
		THREE.AnimationHandler.update( delta );
		renderer.render( scene, camera );
	}

