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
	this.tileW = 4;
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
				x[i].mesh.position.z = this.generator.sample(x[i].mesh.position)+1 ;
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
				x[i].mesh.position.z = this.generator.sample(x[i].mesh.position) +1 ;
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
				x.mesh.position.z = this.generator.sample(x.mesh.position)+1 ;
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
				x.mesh.position.z = this.generator.sample(x.mesh.position) +1;
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

		if(!this.needReRender) return;
		this.needReRender = false;
		var oldparent = this.root.parent;
		
		this.camera.position = this.lastCameraPosition.clone();
		this.camera.position.z += 500;
		this.camera.updateMatrixWorld();
		this.camera.updateProjectionMatrix();
		this.cameraHelper.updateMatrixWorld();

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
				child.material.uniforms.renderMode.value = 0;
				child.material.side = 0;
			}
		});

		for(var i=0; i < meshes_to_toggle.length; i++)
		{
				meshes_to_toggle[i].visible = true;

		}

	}
	this.getMat = function()
	{
		if(!this.mat)
		{
		var currentmat = new THREE.ShaderMaterial({
						uniforms: {
							
							texture1:   { type: "t", value: this.rtt},
							projection:   { type: "m4", value: new THREE.Matrix4()},
							campos:   { type: "v3", value: new THREE.Vector3()}
						},
						attributes: {},
						vertexShader: 
						"varying vec2 tc;"+
						"uniform mat4 projection;"+
						"uniform vec3 campos;"+
						"uniform sampler2D texture1;"+
						"float unpack_depth(const in vec4 rgba_depth)\n"+
						"{\n"+
						    "const vec4 bit_shift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);\n"+
						    "float depth = dot(rgba_depth, bit_shift);\n"+
						    "return depth;\n"+
						"}\n"+
						"void main() {    "+
						
						"    tc = (( projection * modelMatrix  ) * vec4( position, 1.0 )).xy;\n"+
						"    vec4 color1 = texture2D(texture1,(tc + 1.0) / 2.0);"+
						"    float z =unpack_depth(color1) * 1000.0;"+
						"    mat4 modMat = modelMatrix;"+
						"    modMat[3][2] =0.0;"+
						"    gl_Position = modMat * vec4( position.xy,z, 1.0 );\n"+
						//"    gl_Position.z = z;"+
						"    gl_Position = viewMatrix * gl_Position;\n"+
						"    gl_Position = projectionMatrix * gl_Position;\n"+

						"} ",
						fragmentShader: 
						"uniform sampler2D texture1;"+
						"varying vec2 tc;"+
						"void main() { "+
						"vec4 color1 = texture2D(texture1,(tc + 1.0) / 2.0);"+
						
						"gl_FragColor = color1;"+
						
						"}"
						
					});
		this.mat = currentmat;
		}
		return this.mat;

	}
	this.createGrassMesh = function()
	{

		return new THREE.Mesh(new THREE.CubeGeometry(this.tileW,this.tileW,1,10,10,2),this.getMat());
	}
	this.init = function()
	{
		window._dGrass = this;

		var h = (this.dim *this.tileW )/2;
		

		this.camera = new THREE.OrthographicCamera(-h,h,-h,h,0,1000);
		//this.camera = new THREE.PerspectiveCamera();
		this.cameraHelper = new THREE.CameraHelper(this.camera);
		this.cameraHelper.InvisibleToCPUPick = true;
		//this.root.add(this.cameraHelper,true);
		this.rtt = new  THREE.WebGLRenderTarget( 1024,1024 ,{ } );
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