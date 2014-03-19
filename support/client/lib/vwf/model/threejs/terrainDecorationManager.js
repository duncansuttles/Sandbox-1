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
				
		}
		
	}
	this.createGrassMesh = function()
	{
		return new THREE.Mesh(new THREE.CubeGeometry(this.tileW,this.tileW,1));
	}
	this.init = function()
	{
		window._dGrass = this;
		this.camera = new THREE.OrthographicCamera(1,-1,1,-1,1,10);
		this.scene = new THREE.Scene();
		//this.scene.add(this.root);
		for(var i =0; i < this.dim; i++)
		{
			this.positions[i] = [];
			for(var j =0; j < this.dim; j++)
			{
				var grassMesh = this.createGrassMesh();
				this.root.add(grassMesh);

				var entry = {};
				entry.position = [(i - this.dim/2) * this.tileW, (j - this.dim/2) * this.tileW, ];
				entry.mesh = grassMesh;
				grassMesh.geometry.InvisibleToCPUPick = true;
				grassMesh.position.x = entry.position[0];
				grassMesh.position.y = entry.position[1];
				grassMesh.updateMatrixWorld();
				this.positions[i][j] = entry;
			}
		}

	}

})()