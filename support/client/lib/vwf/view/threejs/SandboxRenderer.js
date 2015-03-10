define(["vwf/view/threejs/screenAlignedQuad"], function(quad)
{
	return function SandboxRenderer(r, c)
	{
		this.renderer = r;
		this.canvas = c;

		this.rtt = new THREE.WebGLRenderTarget(1024, 1024,
		{
			format: THREE.RGBAFormat,
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter
		});
		this.rtt2 = new THREE.WebGLRenderTarget(1024, 1024,
		{
			format: THREE.RGBAFormat,
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter
		});
		this.overrideMaterial = new THREE.MeshPhongMaterial();

		this.rttCamera = new THREE.OrthographicCamera();
		this.rttScene = new THREE.Scene();
		this.rttScene.add(quad);
		quad.material.uniforms.tDiffuse.value = this.rtt;
		this.render = function render(scene, camera)
		{
			this.renderer.render(scene, camera);
			
			

			if(_Editor.GetSelectedVWFID())
			{
				//render into RTT1
				this.renderer.setRenderTarget(this.rtt);
				this.renderer.setClearColor(this.renderer.getClearColor(),0.0);
				this.renderer.clear();
				for(var i = 0; i < _Editor.getSelectionCount(); i++)
				this.renderObject(findviewnode(_Editor.GetSelectedVWFID(i)), scene, camera,this.overrideMaterial);
				
			

				
				//render to the screen
				quad.material = quad.dialateMaterial;
				quad.material.uniforms.tDiffuse.value = this.rtt;
				this.renderer.setRenderTarget(null);
				this.renderer.render(this.rttScene, this.rttCamera);

				this.renderer.setClearColor(this.renderer.getClearColor(),1.0);
			}
			

			

			if(_Editor.GetSelectedVWFID())
			{
				//this.renderer.setDepthTest(false);
				//this.renderObject(findviewnode(_Editor.GetSelectedVWFID()), scene, camera);
				
			}

			this.renderer.setDepthTest(false);
			this.renderObject(_Editor.GetMoveGizmo(), scene, camera);
		}
		
		this.flattenObject = function(object)
		{
			var list = [];
			object.traverse(function(o)
			{
				if (o instanceof THREE.Mesh)
					list.push(o);
			});
			return list;
		}
		this.renderObject = function(object, scene, camera,material)
		{
			if (!object) return;
			if(object instanceof THREE.Scene) return; 
			var lights = scene.__lights;
			var fog = scene.fog;
			var objects = this.flattenObject(object);
			for (var i in scene.__webglObjects)
			{
				for (var j in scene.__webglObjects[i])
					if (objects.indexOf(scene.__webglObjects[i][j].object) > -1)
					{
						
						var renderObject = scene.__webglObjects[i][j];
						if(! (material ||renderObject.material)) continue;
						renderObject.object._modelViewMatrix.multiplyMatrices( camera.matrixWorldInverse, renderObject.object.matrixWorld );
						//renderObject.object._normalMatrix.getNormalMatrix( renderObject.object._modelViewMatrix );


						var oldTransparent = renderObject.object.material.transparent;
						renderObject.object.material.transparent = false;
						if (renderObject.object.geometry instanceof THREE.BufferGeometry)
							this.renderer.renderBufferDirect(camera, [], null,material || renderObject.object.material, renderObject.object.geometry, renderObject.object)
						else if (renderObject.object.geometry instanceof THREE.Geometry)
							this.renderer.renderBuffer(camera, lights, fog, material ||renderObject.material, renderObject.buffer, renderObject.object)
						renderObject.object.material.transparent = oldTransparent;
					}
			}
		}
	}
})