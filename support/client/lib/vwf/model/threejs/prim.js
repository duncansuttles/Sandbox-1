(function(){
		function prim(childID, childSource, childName)
		{
			this.callingMethod = function(methodName,args)
			{
				if(methodName == 'GetMesh')
				{
					return this.GetMesh();
				}
				if(methodName == 'dirtyStack')
				{
					return this.dirtyStack();
				}
				if(methodName == 'updateStack')
				{
					return this.updateStack();
				}
				if(methodName == 'updateSelf')
				{
					return this.updateSelf();
				}
			}	
			this.initializingNode = function()
			{
				this.dirtyStack();
			}			
			this.GetMesh = function()
			{
				return this.rootnode.children[0];
			}
			this.GetBounds = function()
			{
				return this.GetMesh().getBoundingBox(true);
			}
			this.updateSelf = function(rebuild)
			{
				if(rebuild)
				{
				   this.Build();
				   this.backupMesh();
				}
				else
				{
					this.restoreMesh();   
				}
				this.GetMesh().geometry.dirtyMesh = true;
				this.GetMesh().castShadow = true;
				this.GetMesh().receiveShadow = true;
			}
			
			this.dirtyStack = function(rebuild)
			{
				this.updateStack(rebuild);
			}
			this.gettingProperty = function(propertyName)
			{
				if(propertyName == 'type')
				{	
					return 'Primitive';
				}
				
			}
			this.updateStack = function(rebuild)
			{

				this.updateSelf(rebuild);
				
				var children = vwf.children(this.ID);
				
				
				for(var i in children)
				{
					return vwf.callMethod(children[i],'updateStack');
				}
			}
			this.backupMesh = function()
			{
				
				if(!this.GetMesh())
					return;
				var geometry = this.GetMesh().geometry;
				if(geometry.vertices)
					geometry.originalPositions = this.copyArray([],geometry.vertices);
				if(geometry.faces)
					geometry.originalFaces = this.copyArray([],geometry.faces);
				if(geometry.normals)
					geometry.originalNormals = this.copyArray([],geometry.normals);
			   
			}
			this.copyArray = function(arrNew, arrOld)
			{
				if(!arrNew)
					arrNew = [];
				arrNew.length = 0;
				for(var i =0; i< arrOld.length; i++)
					arrNew.push(arrOld[i].clone());
				return arrNew;
			}
			this.restoreMesh = function()
			{
			  if(!this.GetMesh())
					return;
				var geometry = this.GetMesh().geometry;
				if(!geometry)
					return;
				if(geometry.originalPositions)
					 this.copyArray(geometry.vertices,geometry.originalPositions);
				if(geometry.originalNormals)    
					 this.copyArray(geometry.normals,geometry.originalNormals);
				if(geometry.originalFaces)
					 this.copyArray(geometry.faces,geometry.originalFaces);
				
				geometry.verticesNeedUpdate = true;
				geometry.normalsNeedUpdate = true;
				geometry.facesNeedUpdate = true;
			}
			this.Build = function()
			{
				var mat;
				if( this.rootnode.children[0])
					mat = this.rootnode.children[0].material;
				else
					mat =  new THREE.MeshPhongMaterial();
				
				if(this.mesh)
					this.rootnode.remove(this.mesh);
				
				var mesh = this.BuildMesh(mat);
				this.mesh = mesh;
				mesh.castShadows = true;
				mesh.receiveShadows = true;
				this.rootnode.add(mesh);
				
			}
			this.inherits = ['vwf/model/threejs/materialDef.js'];
		}
		//default factory code
        return function(childID, childSource, childName) {
			//name of the node constructor
            return new prim(childID, childSource, childName);
        }
})();