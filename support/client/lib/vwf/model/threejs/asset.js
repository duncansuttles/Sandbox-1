(function(){
		function asset(childID, childSource, childName, childType, assetSource, asyncCallback, assetRegistry)
		{
		
			
			//asyncCallback(false);

			//handle for wrapping the glTF animation format so animatable.js can read it
			function AnimationHandleWrapper(gltfAnimations)
			{
				this.duration = 0;
				this.glTFAnimations = gltfAnimations;
				for(var i in this.glTFAnimations)
				{
					this.duration = Math.max(this.duration,this.glTFAnimations[i].duration)
				}
				this.setKey = function(key)
				{
					for(var j in this.glTFAnimations)
					{
						var i, len = this.glTFAnimations[j].interps.length;
						for (i = 0; i < len; i++)
						{
							this.glTFAnimations[j].interps[i].interp(key/30);
						}
					}

				}
				this.data = {length:this.duration,fps:30};
			}
		
			this.inherits = ['vwf/model/threejs/transformable.js','vwf/model/threejs/materialDef.js','vwf/model/threejs/animatable.js','vwf/model/threejs/shadowcaster.js','vwf/model/threejs/passable.js','vwf/model/threejs/visible.js','vwf/model/threejs/static.js'];
			this.initializingNode = function()
			{
				
			}
			this.gettingProperty = function(propertyName)
			{
				
				
			}
			this.settingProperty = function(propertyName,propertyValue)
			{
				
			}
			this.gettingProperty = function(propertyName)
			{
				if(propertyName == 'materialDef')
				{
					
					if(this.materialDef == null)
					{
						
						var list = [];
						this.GetAllLeafMeshes(this.rootnode,list);
						if(list[0])
							return this.getDefForMaterial(list[0].material);
						else return undefined;
					
					}else
					{
						return this.materialDef;
					}
				}
			}
			//must be defined by the object
			this.getRoot = function()
			{
				return this.rootnode;
			}
			this.rootnode = new THREE.Object3D();
			
			//for the subNode case
			this.setAsset = function(asset)
			{
				if(asset)
				{
					this.initializedFromAsset = true;
					this.backupmats = [];
					this.backupMatrix = asset.matrix.clone();
					this.rootnode = asset;
					this.rootnode = asset;
					asset.initializedFromAsset = true;
					var list = [];
					this.GetAllLeafMeshes(this.rootnode,list);
					for(var i =0; i < list.length; i++)
					{
						if(list[i].material)
						{
							this.backupmats.push([list[i],list[i].material.clone()]);
						}					
					}
					asset.matrixAutoUpdate = false;
					asset.updateMatrixWorld(true);      
					_SceneManager.setDirty(asset);	
					
					this.settingProperty('transform',this.gettingProperty('transform'));
				}
			}
			this.deletingNode = function()
			{
				
				if(this.initializedFromAsset)
				{
					
					delete this.rootnode.vwfID;
					//delete this.rootnode.initializedFromAsset;
					
					for(var i =0; i < this.backupmats.length; i++)
					{
						
						this.backupmats[i][0].material = this.backupmats[i][1];
					}
					this.rootnode.matrix = this.backupMatrix
					this.rootnode.updateMatrixWorld(true);
				}
			}
			this.loadFailed = function(id)
			{
				
				
				//the collada loader uses the failed callback as progress. data means this is not really an error;
				if(!id)
				{
					if(window._Notifier)
					{
						_Notifier.alert('error loading asset ' + this.assetSource);
					}
					//get the entry from the asset registry
					reg = this.assetRegistry[this.assetSource];
					$(document).trigger('EndParse');
					//it's not pending, and it is loaded
					reg.pending = false;
					reg.loaded = true;
					//store this asset in the registry
					reg.node = null;
					
					//if any callbacks were waiting on the asset, call those callbacks
					for(var i = 0; i < reg.callbacks.length; i++)
						reg.callbacks[i](null);
					//nothing should be waiting on callbacks now.	
					reg.callbacks = [];	
					
					_ProgressBar.hide();
					asyncCallback(true);
				}else
				{
					
					//this is actuall a progress event!
					_ProgressBar.setProgress(id.loaded/id.total);
					_ProgressBar.setMessage(this.assetSource);
					_ProgressBar.show();


				}

			}
			this.GetAllLeafMeshes = function(threeObject,list)
			{
				if(threeObject instanceof THREE.Mesh)
				{
					list.push(threeObject);
					for(var i=0; i < threeObject.children.length; i++)
					{
						this.GetAllLeafMeshes(threeObject.children[i],list);
					}           
				}
				if(threeObject.children)
				{
					for(var i=0; i < threeObject.children.length; i++)
					{
						this.GetAllLeafMeshes(threeObject.children[i],list);
					}               
				}     
			}
			this.removeLights = function(node)
			{
				if(node instanceof THREE.DirectionalLight ||
					node instanceof THREE.PointLight ||
					node instanceof THREE.SpotLight ||
					node instanceof THREE.AmbientLight)
				{
					node.parent.remove(node);
					return;
				}
				if(node && node.children)
				{
					for(var i = 0; i < node.children.length; i++)
						this.removeLights(node.children[i]);
				}
			}
			this.cleanTHREEJSnodes = function(node)
			{
					var list = [];
					this.removeLights(node);
					this.GetAllLeafMeshes(node,list);
					for(var i =0; i < list.length; i++)
					{
						list[i].geometry.dynamic = false;
						list[i].castShadow = _SettingsManager.getKey('shadows');
						list[i].receiveShadow = _SettingsManager.getKey('shadows');
						if(list[i].geometry instanceof THREE.BufferGeometry) continue;
						//humm, the below looks useful. Why is it removed?
					/*	if(list[i].material)
						{
							list[i].material = list[i].material.clone();
							list[i].material.needsUpdate = true;
							if(list[i].material.map)
							{
								list[i].material.map =  _SceneManager.getTexture(list[i].material.map._SMsrc || list[i].material.map.image.src);
								list[i].material.map.needsUpdate = true;
							}else
							{
								list[i].material.map =  _SceneManager.getTexture('white.png');
								list[i].material.map.needsUpdate = true;
							}
							if(list[i].material.bumpMap)
							{
								list[i].material.bumpMap = _SceneManager.getTexture(list[i].material.map._SMsrc || list[i].material.map.image.src);
								list[i].material.bumpMap.needsUpdate = true;
							}
							if(list[i].material.lightMap)
							{
								list[i].material.lightMap = _SceneManager.getTexture(list[i].material.map._SMsrc || list[i].material.map.image.src);
								list[i].material.lightMap.needsUpdate = true;
							}
							if(list[i].material.normalMap)
							{
								list[i].material.normalMap = _SceneManager.getTexture(list[i].material.map._SMsrc || list[i].material.map.image.src);
								list[i].material.normalMap.needsUpdate = true;								
							}
											
							list[i].materialUpdated();
						}else
						{
							list[i].material = new THREE.MeshPhongMaterial();
							list[i].material.map =  _SceneManager.getTexture('white.png');		
						}
						*/
						
						//If the incomming mesh does not have UVs on channel one, fill with zeros.
						if(!list[i].geometry.faceVertexUvs[0] || list[i].geometry.faceVertexUvs[0].length == 0)
						{
							list[i].geometry.faceVertexUvs[0] = [];
							for(var k = 0; k < list[i].geometry.faces.length; k++)
							{
								if(!list[i].geometry.faces[k].d)
									list[i].geometry.faceVertexUvs[0].push([new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()]);
								else
									list[i].geometry.faceVertexUvs[0].push([new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()]);
							}
						}
					}
			}
			this.loaded = function(asset)
			{
				_ProgressBar.hide();
				if(!asset)
				{
					this.loadFailed();
					return;
				}
				
				$(document).trigger('EndParse',['Loading...',assetSource]);
				
				
				//get the entry from the asset registry
				reg = this.assetRegistry[this.assetSource];
				//it's not pending, and it is loaded
				reg.pending = false;
				reg.loaded = true;
				//store this asset in the registry

				//somehow the glTF loader creates meshes that do not clone properly
				if(childType !== 'subDriver/threejs/asset/vnd.gltf+json')
					reg.node = asset.scene.clone();
				else
				{

					reg.node = asset.scene;
					var list = [];
					this.GetAllLeafMeshes(reg.node,list);
					for(var i =0; i < list.length; i++)
					{
						if(list[i] instanceof THREE.SkinnedMesh)
							list[i].animationHandle = new AnimationHandleWrapper(asset.animations);
					}
				}



				this.cleanTHREEJSnodes(reg.node);
				
				//somehow the glTF loader creates meshes that do not clone properly
				if(childType !== 'subDriver/threejs/asset/vnd.gltf+json')
					this.getRoot().add(reg.node.clone());
				else
					this.getRoot().add(reg.node);
				
				this.settingProperty('materialDef',this.materialDef);
				//if any callbacks were waiting on the asset, call those callbacks
				for(var i = 0; i < reg.callbacks.length; i++)
					reg.callbacks[i](asset.scene);
				//nothing should be waiting on callbacks now.	
				reg.callbacks = [];	
				
				
				asyncCallback(true);
				
				
			
			}.bind(this);
			
			
			//if there is no asset source, perhaps because this linked to an existing node from a parent asset, just continue with loading
			if(!assetSource)
			{
				
				return;
			}
			
			
			
			
			
		
			
		this.assetRegistry	= assetRegistry;
		this.assetSource = assetSource;
			
			// if there is no entry in the registry, create one
		if(!assetRegistry[assetSource])
		{
			//its new, so not waiting, and not loaded
			assetRegistry[assetSource] = {};
			assetRegistry[assetSource].loaded = false;
			assetRegistry[assetSource].pending = false;
			assetRegistry[assetSource].callbacks = [];

			//see if it was preloaded
			if(childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed' && _assetLoader.getUtf8Json(assetSource))
			{
				assetRegistry[assetSource].loaded = true;
				assetRegistry[assetSource].pending = false;
				assetRegistry[assetSource].node = _assetLoader.getUtf8Json(assetSource).scene;
				this.cleanTHREEJSnodes(assetRegistry[assetSource].node);
			}
			if(childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed+optimized' && _assetLoader.getUtf8JsonOptimized(assetSource))
			{
				assetRegistry[assetSource].loaded = true;
				assetRegistry[assetSource].pending = false;
				assetRegistry[assetSource].node = _assetLoader.getUtf8JsonOptimized(assetSource).scene;
				this.cleanTHREEJSnodes(assetRegistry[assetSource].node);
			}
			if(childType == 'subDriver/threejs/asset/vnd.collada+xml' && _assetLoader.getCollada(assetSource))
			{
				assetRegistry[assetSource].loaded = true;
				assetRegistry[assetSource].pending = false;
				assetRegistry[assetSource].node = _assetLoader.getCollada(assetSource).scene;
				this.cleanTHREEJSnodes(assetRegistry[assetSource].node);
			}
			if(childType == 'subDriver/threejs/asset/vnd.collada+xml+optimized' && _assetLoader.getColladaOptimized(assetSource))
			{
				assetRegistry[assetSource].loaded = true;
				assetRegistry[assetSource].pending = false;
				assetRegistry[assetSource].node = _assetLoader.getColladaOptimized(assetSource).scene;
				this.cleanTHREEJSnodes(assetRegistry[assetSource].node);
			}
		}
		
			
			//grab the registry entry for this asset
			var reg = assetRegistry[assetSource];
			
			//if the asset entry is not loaded and not pending, you'll have to actaully go download and parse it
			if(reg.loaded == false && reg.pending == false)
			{
				//thus, it becomes pending
				reg.pending = true;
				asyncCallback( false );
			
				$(document).trigger('BeginParse',['Loading...',assetSource]);
				
				if(childType == 'subDriver/threejs/asset/vnd.collada+xml')
				{
					this.loader = new THREE.ColladaLoader();
					
					this.loader.load(assetSource,this.loaded.bind(this),this.loadFailed.bind(this));
					
					asyncCallback(false);
				}
				if(childType == 'subDriver/threejs/asset/vnd.collada+xml+optimized')
				{
					this.loader = new ColladaLoaderOptimized();
					
					this.loader.load(assetSource,this.loaded.bind(this),this.loadFailed.bind(this));
					
					asyncCallback(false);
				}
				if(childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed+optimized')
				{
					this.loader = new UTF8JsonLoader_Optimized({source:assetSource},this.loaded.bind(this),this.loadFailed.bind(this));
					asyncCallback(false);
				}
				if(childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed')
				{
					
					this.loader = new UTF8JsonLoader({source:assetSource},this.loaded.bind(this),this.loadFailed.bind(this));
					
					asyncCallback(false);
				}
				if(childType == 'subDriver/threejs/asset/vnd.gltf+json')
				{
					this.loader = new THREE.glTFLoader()
                	this.loader.useBufferGeometry = true;
					this.loader.load(assetSource,this.loaded.bind(this));
					
					asyncCallback(false);
				}
				
				
				
			}
			//if the asset registry entry is not pending and it is loaded, then just grab a copy, no download or parse necessary
			else if(reg.loaded == true && reg.pending == false)
			{
				
				this.getRoot().add(reg.node.clone());		
				this.cleanTHREEJSnodes(this.getRoot());
				this.settingProperty('materialDef',this.materialDef);
				$(document).trigger('EndParse');
			}
			//if it's pending but not done, register a callback so that when it is done, it can be attached.
			else if(reg.loaded == false && reg.pending == true)
			{	
				asyncCallback( false );
				var tcal = asyncCallback;
				reg.callbacks.push(function(node)
				{
					
					//just clone the node and attach it.
					//this should not clone the geometry, so much lower memory.
					//seems to take near nothing to duplicated animated avatar
					$(document).trigger('EndParse');
					if(node)
					{
						this.getRoot().add(node.clone());
						this.cleanTHREEJSnodes(this.getRoot());
						this.settingProperty('materialDef',this.materialDef);
						this.getRoot().updateMatrixWorld(true);
					}
					tcal( true );
				}.bind(this));
			}	
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			//this.Build();
		}
		//default factory code
        return function(childID, childSource, childName, childType, assetSource, asyncCallback) {
			//name of the node constructor

			
			
		//create an asset registry if one does not exist for this driver
		if(!this.assetRegistry)
		{
			this.assetRegistry = {};
		}
		
    	    
	    
            return new asset(childID, childSource, childName, childType, assetSource, asyncCallback, this.assetRegistry);
        }
})();