new (function(){

	this.root = null;
	this.generator = null;
	this.lastCameraPosition = null;
	this.grassMeshes = [];
	this.positions = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]

	this.setRoot= function(r)
	{
		if(r instanceof THREE.Object3D)
			this.root = r;
		else
			console.log("root should be an Object3D");
	}
	this.setGenerator= function(r)
	{	
		this.generator = r;
	}
	this.dim = 8;
	this.tileW = 8;
	this.update = function(cameraPosition)
	{

		if(!this.lastCameraPosition)
			this.lastCameraPosition = cameraPosition.clone();
		var updated = false;
		
		while( (cameraPosition.x - this.lastCameraPosition.x) <= -this.tileW)
		{	
			var x = this.positions.pop();
			for(var i =0; i < this.dim; i++)
			{
				x[i].position[0] -= this.dim * this.tileW;
				x[i].mesh.position.x -= this.dim * this.tileW;
			//	x[i].mesh.position.z = this.generator.sample(x[i].mesh.position)+1 ;
				x[i].mesh.updateMatrixWorld();
			}
			this.positions.unshift(x);
			this.lastCameraPosition.x -= this.tileW;
			updated = true;
		}
		while( (cameraPosition.x - this.lastCameraPosition.x) > this.tileW)
		{	
			var x = this.positions.shift();
			for(var i =0; i < this.dim; i++)
			{
				x[i].position[0] += this.dim * this.tileW;
				x[i].mesh.position.x += this.dim * this.tileW;
			//	x[i].mesh.position.z = this.generator.sample(x[i].mesh.position) +1 ;
				x[i].mesh.updateMatrixWorld();
			}
			this.positions.push(x);
			this.lastCameraPosition.x += this.tileW;
			updated = true;
				
		}

		while( (cameraPosition.y - this.lastCameraPosition.y) <= -this.tileW)
		{	
			
			for(var i =0; i < this.dim; i++)
			{	
				var x = this.positions[i].pop();
				x.position[1] -= this.dim * this.tileW;
				x.mesh.position.y -= this.dim * this.tileW;
				//x.mesh.position.z = this.generator.sample(x.mesh.position)+1 ;
				x.mesh.updateMatrixWorld();
				this.positions[i].unshift(x);
			}
			
			this.lastCameraPosition.y -= this.tileW;
			updated = true;
		}
		while( (cameraPosition.y - this.lastCameraPosition.y) > this.tileW)
		{	
			for(var i =0; i < this.dim; i++)
			{	
				var x = this.positions[i].shift();
				x.position[1] += this.dim * this.tileW;
				x.mesh.position.y += this.dim * this.tileW;
				//x.mesh.position.z = this.generator.sample(x.mesh.position) +1;
				x.mesh.updateMatrixWorld();
				this.positions[i].push(x);
			}
			this.lastCameraPosition.y += this.tileW;
			updated = true;
				
		}
		if(updated == true)
		{
			//this.renderHeightMap();
			this.needReRender = true;
			this.lastCameraPosition.z = cameraPosition.z;
		}
		
	}
	this.renderHeightMap = function()
	{
		if(!this.counter) this.counter = 0;
this.counter++;
		this.mat.uniforms.time.value += deltaTime * (1.5+Math.sin(this.counter/100))* (1.5+Math.sin(this.counter/500))* (1.5+Math.sin(this.counter/1000)) || 1;
		if(!this.needReRender) return;
		this.needReRender = false;
		var oldparent = this.root.parent;
		
		this.camera.position = this.lastCameraPosition.clone();
		this.camera.position.z += 500;
		this.camera.updateMatrixWorld();
		this.camera.updateProjectionMatrix();
		//this.cameraHelper.updateMatrixWorld();
		var matrixWorldInverse = new THREE.Matrix4();
		var _viewProjectionMatrix = new THREE.Matrix4();
		matrixWorldInverse.getInverse( this.camera.matrixWorld );
					
		_viewProjectionMatrix.multiplyMatrices( this.camera.projectionMatrix, matrixWorldInverse );

		this.mat.uniforms.projection.value =_viewProjectionMatrix;
		this.mat.uniforms.campos.value =this.camera.position;
		var meshes_to_toggle = [];
		for(var i=0; i < this.dim; i++)
		for(var j=0; j < this.dim; j++)
		{
			meshes_to_toggle.push(this.positions[i][j].mesh);
		}
		var self = this;
		this.root.parent.parent.traverse(function(child){
			if(child.parent !== self.root && child.visible === true)
			{
				meshes_to_toggle.push(child);
			}
		});


		for(var i=0; i < meshes_to_toggle.length; i++)
		{
				meshes_to_toggle[i].visible = false;
		}

		this.root.traverse(function(child){
			if(child.visible === true && child.material && child.material.uniforms.renderMode)  //should only be terrain tiles 
			{
				child.material.uniforms.renderMode.value = 1;
				child.material.side = 2;
			}
		});


		_dRenderer.clearTarget(this.rtt);
		_dRenderer.render(_dScene,this.camera,this.rtt);


		this.root.traverse(function(child){
			if(child.visible === true && child.material && child.material.uniforms.renderMode)  //should only be terrain tiles 
			{
				child.material.uniforms.renderMode.value = 2;
			
			}
		});


		_dRenderer.clearTarget(this.rtt2);
		_dRenderer.render(_dScene,this.camera,this.rtt2);

		
		this.root.traverse(function(child){
			if(child.visible === true && child.material && child.material.uniforms.renderMode)  //should only be terrain tiles 
			{
				child.material.uniforms.renderMode.value = 0;
				child.material.side = 0;
			}
		});

		for(var i=0; i < meshes_to_toggle.length; i++)
		{
				meshes_to_toggle[i].visible = true;

		}

	}
	this.getMat = function(vertcount)
	{
		if(!this.mat)
		{
		var currentmat = new THREE.ShaderMaterial({
						uniforms: {
							
							heightMap:   { type: "t", value: this.rtt},
							gBuffer:   { type: "t", value: this.rtt2},
							diffuseTex:   { type: "t", value: _SceneManager.getTexture('./terrain/grass.png')},
							projection:   { type: "m4", value: new THREE.Matrix4()},
							campos:   { type: "v3", value: new THREE.Vector3()},
							time:   { type: "f", value: 0}
						},
						attributes: {},
						vertexShader: 
						"varying vec2 tc;"+
						"varying vec2 progtc;"+
						"uniform mat4 projection;"+
						"uniform vec3 campos;"+
						"uniform sampler2D heightMap;"+
						"uniform float time;"+
						"attribute float random;"+
						"varying float ar;"+
						"varying float rand;"+
						"varying vec2 wind;"+
						"float unpack_depth(const in vec4 rgba_depth)\n"+
						"{\n"+
						    "const vec4 bit_shift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);\n"+
						    "float depth = dot(rgba_depth, bit_shift);\n"+
						    "return depth;\n"+
						"}\n"+
						"void main() {    "+
						
						"    tc = (( projection * modelMatrix  ) * vec4( position, 1.0 )).xy;\n"+
						"    progtc = (tc + 1.0) / 2.0;\n"+
						"    vec4 color1 = texture2DLod(heightMap,progtc,0.0);"+
						"    float z = unpack_depth(color1) * 1000.0;"+
						"    mat4 modMat = modelMatrix;"+
						"    modMat[3][2] =0.0;"+
						"  wind = vec2(sin(position.x/2.0 + time/1900.0)+cos(position.y/2.0 + time/1900.0),0.0);\n"+
						"wind = (wind + 1.0) / 4.0;\n"+
						"    gl_Position = modMat * vec4( position.xy + wind * uv.y,position.z+z-0.45, 1.0 );\n"+
						"    ar = length(gl_Position.xyz - cameraPosition)/20.0;\n"+
						//"    gl_Position.z = z;"+
						"    gl_Position = viewMatrix * gl_Position;\n"+
						
						"    gl_Position = projectionMatrix * gl_Position;\n"+
							"tc = uv;\n"+
							"rand = random;"+
						"} ",
						fragmentShader: 
						"uniform sampler2D diffuseTex;"+
						"uniform sampler2D gBuffer;"+
						"varying vec2 progtc;"+
						"varying vec2 tc;"+
						"varying float rand;"+
						"varying vec2 wind;"+
						"varying float ar;"+
						"void main() { "+
						"vec4 color1 = texture2D(diffuseTex,tc);"+
						"vec4 gb = texture2D(gBuffer,progtc);\n"+
						"float light =  gb.a;"+
						"float density =  gb.g;"+

						"if ( color1.a < ar * ar ) discard;\n"+
						"if ( color1.a * density < .5) discard;\n"+
						"gl_FragColor = color1;"+
						"gl_FragColor.xyz *= (light +.15*rand) + wind.x * wind.x * tc.y* tc.y;\n"+
						
						"}"
						

					});
		currentmat.attributes.random = {type:'f',value:[]};
		for(var i = 0; i<vertcount; i+=6)
		{
			var rand = Math.random();
			for(var j=0; j < 6; j++)
				currentmat.attributes.random.value.push(rand);
		}
		this.mat = currentmat;
		this.mat.side  =2;
		this.mat.uniforms.diffuseTex.value.wrapS = THREE.ClampToEdgeWrapping;
		this.mat.uniforms.diffuseTex.value.wrapT = THREE.ClampToEdgeWrapping;
		this.mat.uniforms.diffuseTex.anisotropy = 1;
		}
		return this.mat;

	}
	this.createGrassMesh = function()
	{
		if(!this.geo)
		{
		var grassWidth = this.tileW/1;
		var grassHeight = 1;
		var grassDensity = 3;
		var geo = new THREE.Geometry();
		geo.faceVertexUvs[0] = [];
		for(var x=-this.tileW/2; x < this.tileW/2; x+=.5)
			for(var y=-this.tileW/2; y < this.tileW/2; y+=.5)
			{
				for(var i =0; i < grassDensity; i++)
				{
					grassHeight = .5 + Math.random();
					var centerRnd = new THREE.Vector3((Math.random() - .5)*2,(Math.random() - .5)*2,0);
					var center = new THREE.Vector3(x + grassWidth/4 + centerRnd.x,y + grassWidth/4 + centerRnd.y,0);
					var rot = new THREE.Vector3(Math.random()-.5,Math.random()-.5,0);
					
					rot = rot.setLength(grassWidth/8);
					var point1 = new THREE.Vector3(center.x - rot.x,center.y - rot.y,center.z);
					var point2 = new THREE.Vector3(center.x + rot.x,center.y + rot.y,center.z);
					var point3 = new THREE.Vector3(point1.x+ rot.y*.5,point1.y+ rot.x*.5,point1.z + grassHeight);
					var point4 = new THREE.Vector3(point2.x+ rot.y*.5,point2.y+ rot.x*.5,point2.z + grassHeight);
					var idx = geo.vertices.length;
					geo.vertices.push(point1);
					geo.vertices.push(point2);
					geo.vertices.push(point3);
					geo.vertices.push(point4);
					var face1 = new THREE.Face3(idx+0,idx+1,idx+2);
					var face2 = new THREE.Face3(idx+2,idx+3,idx+1);
					geo.faces.push(face1,face2);
					geo.faceVertexUvs[0].push([new THREE.Vector2(1,0),
						new THREE.Vector2(0,0),
						new THREE.Vector2(1,1)]);
					geo.faceVertexUvs[0].push([new THREE.Vector2(1,1),
						new THREE.Vector2(0,1),
						new THREE.Vector2(0,0)]);

					geo.faceVertexUvs[0].push([new THREE.Vector2(1,0),
						new THREE.Vector2(0,0),
						new THREE.Vector2(1,1)]);
					geo.faceVertexUvs[0].push([new THREE.Vector2(1,1),
						new THREE.Vector2(0,1),
						new THREE.Vector2(0,0)]);
				}
			}

			this.geo =geo;
		}
		return  new THREE.Mesh(this.geo,this.getMat(this.geo.vertices.length));
		
	}
	this.init = function()
	{
		window._dGrass = this;

		var h = (this.dim *this.tileW )/2;
		

		this.camera = new THREE.OrthographicCamera(-h,h,-h,h,0,1000);
		//this.camera = new THREE.PerspectiveCamera();
	//	this.cameraHelper = new THREE.CameraHelper(this.camera);
	//	this.cameraHelper.InvisibleToCPUPick = true;
	//	this.root.add(this.cameraHelper,true);
		this.rtt = new  THREE.WebGLRenderTarget( 128,128 ,{ } );
		this.rtt2 = new  THREE.WebGLRenderTarget( 128,128 ,{ } );
	//	this.rtt.generateMipmaps = false;
		
		//this.scene.add(this.root);
		_dView.bind('postprerender',this.renderHeightMap.bind(this));
		for(var i =0; i < this.dim; i++)
		{
			this.positions[i] = [];
			for(var j =0; j < this.dim; j++)
			{
				var grassMesh = this.createGrassMesh();
				this.root.add(grassMesh);

				var entry = {};
				entry.position = [(i - this.dim/2) * this.tileW + this.tileW/2, (j - this.dim/2) * this.tileW+ this.tileW/2 ];
				entry.mesh = grassMesh;
				grassMesh.geometry.InvisibleToCPUPick = true;
				grassMesh.position.x = entry.position[0];
				grassMesh.position.y = entry.position[1];
				
				grassMesh.updateMatrixWorld();
				grassMesh.geometry.computeBoundingSphere()

				grassMesh.geometry.boundingSphere.radius = Infinity

				this.positions[i][j] = entry;
			}
		}

	}

})()