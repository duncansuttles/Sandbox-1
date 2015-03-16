define(["vwf/view/threejs/screenAlignedQuad"], function(quad)
{
	return function SandboxRenderer(r, c)
	{
		this.renderer = r;
		this.canvas = c;
		this.hilightObjects = [];
		this.hilightMouseOver = false;
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
		this.overrideMaterial = new THREE.MeshBasicMaterial();
		this.overrideMaterial.color.r = 0;
		this.overrideMaterial.color.g = 0;
		this.overrideMaterial.color.b = 1;

		this.overrideMaterial2 = new THREE.MeshBasicMaterial();
		this.overrideMaterial2.color.r = 0;
		this.overrideMaterial2.color.g = 1;
		this.overrideMaterial2.color.b = 0;

		this.overrideMaterial3 = new THREE.MeshBasicMaterial();
		this.overrideMaterial3.color.r = 1;
		this.overrideMaterial3.color.g = 0;
		this.overrideMaterial3.color.b = 0;
		this.rttCamera = new THREE.OrthographicCamera();
		this.rttScene = new THREE.Scene();
		this.rttScene.add(quad);
		quad.material.uniforms.tDiffuse.value = this.rtt;
		this.flashHilight = function(mesh)
		{
			if(this.cb)
				this.cb();
			this.cb = null;
			if(this.cbt)
				window.clearTimeout(this.cbt);
			this.cbt = null;
			var index = this.hilightObjects.indexOf(mesh);
			if(index > -1) return;
			this.addHilightObject(mesh);
			var self = this;
			
			this.cb = function(){
				self.removeHilightObject(mesh);
			}
			this.cbt = window.setTimeout(function()
				{
					if(self.cb)
						self.cb();
				},1000);
		}
		this.startMouseHoverHilight = function()
		{
			this.hilightMouseOver = true;
		}
		this.stopMouseHoverHilight = function()
		{
			this.hilightMouseOver = false;
		}
		this.flashHilightMult = function(mesh)
		{
			
			var index = this.hilightObjects.indexOf(mesh);
			if(index > -1) return;
			this.addHilightObject(mesh);
			var self = this; 
			window.setTimeout(function(){
				self.removeHilightObject(mesh);
			},1000);
		}
		this.render = function render(scene, camera)
		{
			this.renderer.render(scene, camera);
			
			

			if(_Editor.GetSelectedVWFID() || this.hilightObjects.length > 0 || this.hilightMouseOver)
			{
				//render into RTT1
				this.renderer.setRenderTarget(this.rtt);
				this.renderer.setClearColor(this.renderer.getClearColor(),0.0);
				this.renderer.clear();
			
				if(_Editor.GetSelectedVWFID())
				for(var i = 0; i < _Editor.getSelectionCount(); i++)
					this.renderObject(findviewnode(_Editor.GetSelectedVWFID(i)), scene, camera,this.overrideMaterial);
		
				
				for(var i = 0; i < this.hilightObjects.length; i++)
				{
					this.renderObject(this.hilightObjects[i], scene, camera,this.overrideMaterial2);
				}
			
				if(this.hilightMouseOver)
				{
					if(vwf.views[0].lastPickId && findviewnode(vwf.views[0].lastPickId))
					{
						this.renderObject(findviewnode(vwf.views[0].lastPickId), scene, camera,this.overrideMaterial3);		
					}
				}

				
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
		this.addHilightObject = function(object)
		{
			this.hilightObjects.push(object);
		}
		this.removeHilightObject = function(object)
		{
			var index = this.hilightObjects.indexOf(object);
			if(index > -1)
				this.hilightObjects.splice(index,1);
		}
		this.renderObject = function(object, scene, camera,material)
		{
			if (!object) return;
			if(object instanceof THREE.Scene) return; 
			var lights = scene.__lights;
			var fog = scene.fog;
			var objects = this.flattenObject(object);
			var keys = Object.keys(scene.__webglObjects)
			for (var k = 0; k < keys.length; k++)
			{
				var i = keys[k];
				for (var j=0; j< scene.__webglObjects[i].length; j++)
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