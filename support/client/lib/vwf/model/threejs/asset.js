"use strict";

function MorphRawJSONLoader() {
    this.load = function(url, callback) {
        $.get(url, function(data) {
            var dummyNode = new THREE.Object3D();
            dummyNode.morphTarget = JSON.parse(data);
            callback({
                scene: dummyNode
            });
        });
    }
}

function MorphBinaryLoader() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";

    xhr.onload = function(url, callback) {
        var arrayBuffer = xhr.response;
        if (arrayBuffer) {
            var byteArray = new Float32Array(arrayBuffer);
            for (var i = 0; i < byteArray.byteLength; i++) {
                var dummyNode = new THREE.Object3D();
                dummyNode.morphTarget = JSON.parse(byteArray.byteLength[i]);
                callback({
                    scene: dummyNode
                });
            }
        }
    };
}

(function() {

    //enum to keep track of assets that fail to load
    var NOT_STARTED = 0;
    var PENDING = 1;
    var FAILED = 2;
    var SUCCEDED = 3;
    var LOAD_FAIL_TIME = 20*1000;
    function asset(childID, childSource, childName, childType, assetSource, asyncCallback, assetRegistry) {


        //asyncCallback(false);

        //handle for wrapping the glTF animation format so animatable.js can read it
        function AnimationHandleWrapper(gltfAnimations) {
            this.duration = 0;
            this.glTFAnimations = gltfAnimations;
            for (var i in this.glTFAnimations) {
                this.duration = Math.max(this.duration, this.glTFAnimations[i].duration)
            }
            this.setKey = function(key,fps) {
                for (var j in this.glTFAnimations) {
                    var i, len = this.glTFAnimations[j].interps.length;
                    for (i = 0; i < len; i++) {
                        this.glTFAnimations[j].interps[i].interp(key / fps);
                    }
                }

            }
            this.data = {
                length: this.duration,
                fps: 30
            };
        }
        this.loadState = NOT_STARTED;
        this.failTimeout = null;
        this.inherits = ['vwf/model/threejs/transformable.js', 'vwf/model/threejs/materialDef.js', 'vwf/model/threejs/animatable.js', 'vwf/model/threejs/shadowcaster.js', 'vwf/model/threejs/passable.js', 'vwf/model/threejs/visible.js', 'vwf/model/threejs/static.js', 'vwf/model/threejs/selectable.js'];
        this.initializingNode = function() {


            //somehow this is not called by the loaders 
            this.getRoot().updateMatrixWorld(true);
            //the parent is an asset object
            if (true) {
                
                var parentRoot = null;
                if(this.parentNode && this.parentNode.getRoot)  //if the parent internal driver object is just the scene, it does not have a getRoot function
                    parentRoot = this.parentNode.getRoot();
                var skeleton = null;
                var parentSkin = null;
                var thisroot = this.getRoot().parent;  // the asset initializing

                var walk = function(node) {
                    //dont search skeleton into self
                    if (node == thisroot) return;
                    //if (node !== parentRoot) return;
                    // get skeleton data
                    if (node.skeleton) {
                        skeleton = node.skeleton;
                        parentSkin = node;
                        return;
                    }
                    for (var i = 0; i < node.children.length;i++)
                        walk(node.children[i])
                }
                if(parentRoot)
                    walk(parentRoot); // this really seems right. 

                var skin = null;
                var walk = function(node) {
                    // get skinned mesh from initialing asset
                    if (node instanceof THREE.SkinnedMesh) {
                        skin = node;
                        return;
                    }
                    for (var i = 0; i < node.children.length;i++)
                        walk(node.children[i])
                }
                walk(this.getRoot());
                // bind skinned mesh of init node to parent skeleton
                    if (skeleton && skin) {
                 
                   
                    skin.updateMatrixWorld(true);
                    this.settingProperty('animationFrame',0);
                    skin.bind(skeleton,parentSkin.matrix.clone());
                    skin.boundingSphere = parentSkin.boundingSphere;
                    skin.updateMatrixWorld(true);
                    skin.frustumCulled = false;
                    for(var i in skin.children)
                    {
                        if(skin.children[i] instanceof THREE.Bone)
                            skin.remove(skin.children[i]);
                    }
                    }
                }

                if (childType === "subDriver/threejs/asset/vnd.raw-morphttarget") {

                    var parentRoot = null;
                    if (this.parentNode && this.parentNode.getRoot) //if the parent internal driver object is just the scene, it does not have a getRoot function
                        parentRoot = this.parentNode.getRoot();
                    var parentSkin = null;

                    var walk = function(node) {
                        if (node.skeleton) {
                            parentSkin = node;
                            return;
                        }
                        for (var i = 0; i < node.children.length; i++)
                            walk(node.children[i])
                    }
                    walk(parentRoot);
                    /////////////////////////////////////////////////////////
                    // clone the parent mesh and attach the new geometry

                    var parent = parentSkin.parent;
                    parent.remove(parentSkin);


                    var newgeo = new THREE.Geometry;
                    var oldgeo = parentSkin.geometry;
                    for (var i in oldgeo.faces)
                        newgeo.faces.push(oldgeo.faces[i].clone());
                    for (var i in oldgeo.vertices)
                        newgeo.vertices.push(oldgeo.vertices[i].clone());
                    for (var i in oldgeo.skinIndices)
                        newgeo.skinIndices.push(oldgeo.skinIndices[i].clone());
                    for (var i in oldgeo.skinWeights)
                        newgeo.skinWeights.push(oldgeo.skinWeights[i].clone())
                    newgeo.RayTraceAccelerationStructure = oldgeo.RayTraceAccelerationStructure;

                    newgeo.faceVertexUvs = [];
                    for (var i in oldgeo.faceVertexUvs) {
                        var uv = oldgeo.faceVertexUvs[i];
                        var newuv = [];
                        newgeo.faceVertexUvs.push(newuv);
                        for (var j in uv) {
                            var u = uv[j];
                            var newu = [];
                            newuv.push(newu);
                            for (var k in u)
                                newu.push(u[k].clone());
                        }
                    }
                    newgeo.dynamic = oldgeo.dynamic;
                    newgeo.bones = [];
                    for (var i in oldgeo.bones) {
                        var newbone = new THREE.Bone();
                        var oldbone = oldgeo.bones[i];

                        newgeo.bones.push(newbone);
                        newbone.matrix = oldbone.matrix.clone();
                        newbone.name = oldbone.name;
                        newbone.pos = oldbone.pos.splice();
                        newbone.rotq = oldbone.rotq.splice();
                        newbone.scl = oldbone.scl.splice();
                        newbone.parent = oldbone.parent;
                    }
                    
                    newgeo.animation = oldgeo.animation;
                    var newSkin = new THREE.SkinnedMesh(newgeo, parentSkin.material,true);
                    newSkin.animationHandle = parentSkin.animationHandle;
                    newSkin.bindMatrix = parentSkin.bindMatrix.clone();
                    newSkin.bindMatrixInverse = parentSkin.bindMatrixInverse.clone();
                    newSkin.matrix = parentSkin.matrix.clone();;
                    newSkin.matrixWorld = parentSkin.matrixWorld.clone();
                    newSkin.orthoMatrixWorld = parentSkin.orthoMatrixWorld.clone();
                    newSkin.position.copy(parentSkin.position);
                    newSkin.quaternion.copy(parentSkin.quaternion);
                    newSkin.rotation.copy(parentSkin.rotation);
                    newSkin.scale.copy(parentSkin.scale);
                    newSkin.bindMode = parentSkin.bindMode;


                    for (var i =0; i < parentSkin.children.length; i++) {
                        newSkin.children.push(parentSkin.children[i].clone());
                    }

                    parent.add(newSkin);
                    newSkin.bind(parentSkin.skeleton, newSkin.matrix.clone());



                    ///////////////////////////////////////////////////////////

                    parentSkin = newSkin;
                    if (parentSkin) {

                        var morph = this.assetRegistry[assetSource].node.morphTarget;

                        if (morph) {

                            if ((morph.length / 3) % parentSkin.geometry.vertices.length > 0) {
                                console.warn('target is wrong vertex count');
                                return;
                            }

                            if (!parentSkin.geometry.morphTargets)
                                parentSkin.geometry.morphTargets = [];

                            parentSkin.geometry.morphTargets.push({
                                name: 'base',
                                vertices: parentSkin.geometry.vertices.map(function(vert) {
                                    return vert.clone()
                                })
                            });

                            var targetCount = (morph.length / 3) / parentSkin.geometry.vertices.length;
                            var pointer = 0;

                            var defaultInfluences = [];
                            for (var i = 0; i < targetCount; i++)
                                defaultInfluences.push(0);

                            //notify the kernel of the state of the property so the default value is not null
                            if(!vwf.getProperty(this.parentNode.ID, 'morphTargetInfluences'))
                                vwf.setProperty(this.parentNode.ID, 'morphTargetInfluences', defaultInfluences)

                            for (var i = 0; i < targetCount; i++) {
                                var verts = [];
                                for (var j = 0; j < parentSkin.geometry.vertices.length; j++) {
                                    var x = morph[pointer];
                                    pointer++;
                                    var y = morph[pointer];
                                    pointer++;
                                    var z = morph[pointer];
                                    pointer++;
                                    verts.push(new THREE.Vector3(x, y, z));
                                }
                                parentSkin.geometry.morphTargets.push({
                                    name: this.assetSource + i,
                                    vertices: verts
                                });

                            }

                            vwf.setProperty(this.parentNode.ID, 'morphTargetInfluences',vwf.getProperty(this.parentNode.ID, 'morphTargetInfluences'))

                            //  parentSkin.geometry.morphTargetsNeedUpdate = true;
                            //  parentSkin.updateMorphTargets();
                            //  window.parentSkin = parentSkin;

                            //  parentSkin.material.morphTargets = true;
                            //  parentSkin.morphTargetInfluences[0] = 1;
                        }
                  
                }
            }
         

        }
        this.loadSucceded = function()
        {
            console.log('load SUCCEDED');
            this.loadState = SUCCEDED;
            window.clearTimeout(this.failTimeout);
            this.failTimeout = null;
        }
        this.loadStarted = function()
        {
            console.log('load started');
            this.loadState = PENDING;
            this.failTimeout = window.setTimeout(function(){
                this.loadFailed();
                this.loadState = FAILED;
                console.log('load failed due to timeout');
            }.bind(this),
            LOAD_FAIL_TIME);
        }
        this.gettingProperty = function(propertyName) {


        }
        this.settingProperty = function(propertyName, propertyValue) {

        }
        this.gettingProperty = function(propertyName) {
            if (propertyName == 'materialDef') {

                if (this.materialDef == null) {

                    var list = [];
                    this.GetAllLeafMeshes(this.rootnode, list);
                    if (list[0])
                        return _MaterialCache.getDefForMaterial(list[0].material);
                    else return undefined;

                } else {
                    return this.materialDef;
                }
            }
        }
        //must be defined by the object
        this.getRoot = function() {
            return this.rootnode;
        }
        this.rootnode = new THREE.Object3D();

        //for the subNode case
        this.setAsset = function(asset) {
            if (asset) {

                this.initializedFromAsset = true;
                this.backupmats = [];
                this.backupMatrix = asset.matrix;
                //asset.matrix = asset.matrix.clone();
                this.rootnode = asset;
                this.rootnode = asset;
                asset.initializedFromAsset = true;
                var list = [];
                this.GetAllLeafMeshes(this.rootnode, list);
                for (var i = 0; i < list.length; i++) {
                    if (list[i].material) {
                        this.backupmats.push([list[i], list[i].material.clone()]);
                    }
                }
                asset.matrixAutoUpdate = false;
                asset.updateMatrixWorld(true);
                _SceneManager.setDirty(asset);

                this.settingProperty('transform', this.gettingProperty('transform'));

                if (asset instanceof THREE.Bone) {


                    for (var i in asset.children) {
                        if (asset.children[i].name == 'BoneSelectionHandle') {
                            asset.children[i].material.color.r = 1;
                        }
                    }
                }
            }
        }
        this.deletingNode = function() {

            if (this.initializedFromAsset) {

                delete this.rootnode.vwfID;
                //delete this.rootnode.initializedFromAsset;

                for (var i = 0; i < this.backupmats.length; i++) {

                    this.backupmats[i][0].material = this.backupmats[i][1];
                }
                this.rootnode.matrix = this.backupMatrix
                this.rootnode.updateMatrixWorld(true);

                //AHH be very careful - this is handled in the main driver, and if you do it here,
                //the main driver will not know that it was linked, and will delete the node
                //delete this.rootnode.initializedFromAsset;
                if (this.rootnode instanceof THREE.Bone) {

                    for (var i in this.rootnode.children) {
                        if (this.rootnode.children[i].name == 'BoneSelectionHandle') {
                            this.rootnode.children[i].material.color.r = .5;
                        }
                    }
                    //need to update root skin if changed transform of bone
                    var parent = this.rootnode.parent;
                    while (parent) {
                        if (parent instanceof THREE.SkinnedMesh) {
                            parent.updateMatrixWorld();
                            //since it makes no sense for a bone to effect the skin farther up the hierarchy
                            break;
                        }
                        parent = parent.parent
                    }
                }

            }
        }
        this.loadFailed = function(id) {
                if(this.loadState !== PENDING) return; // in this case, the callback from the load either came too late, and we have decided it failed, or came twice, which really it never should

            //the collada loader uses the failed callback as progress. data means this is not really an error;
            if (!id) {
                if (window._Notifier) {
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
                for (var i = 0; i < reg.callbacks.length; i++)
                    reg.callbacks[i](null);
                //nothing should be waiting on callbacks now.
                reg.callbacks = [];

                _ProgressBar.hide();
                asyncCallback(true);
            } else {

                //this is actuall a progress event!
                _ProgressBar.setProgress(id.loaded / id.total);
                _ProgressBar.setMessage(this.assetSource);
                _ProgressBar.show();


            }

        }
        this.GetAllLeafMeshes = function(threeObject, list) {
            if (threeObject instanceof THREE.Mesh) {
                list.push(threeObject);
                for (var i = 0; i < threeObject.children.length; i++) {
                    this.GetAllLeafMeshes(threeObject.children[i], list);
                }
            }
                if (threeObject && threeObject.children) {
                for (var i = 0; i < threeObject.children.length; i++) {
                    this.GetAllLeafMeshes(threeObject.children[i], list);
                }
            }
        }
        this.removeLights = function(node) {
            if (node instanceof THREE.DirectionalLight ||
                node instanceof THREE.PointLight ||
                node instanceof THREE.SpotLight ||
                node instanceof THREE.AmbientLight) {
                node.parent.remove(node);
                return;
            }
            if (node && node.children) {
                for (var i = 0; i < node.children.length; i++)
                    this.removeLights(node.children[i]);
            }
        }
        this.cleanTHREEJSnodes = function(node) {
            var list = [];
            this.removeLights(node);
            this.GetAllLeafMeshes(node, list);
            for (var i = 0; i < list.length; i++) {
                    list[i].geometry.dynamic = true;
                list[i].castShadow = _SettingsManager.getKey('shadows');
                list[i].receiveShadow = _SettingsManager.getKey('shadows');
                if (list[i].geometry instanceof THREE.BufferGeometry) continue;

                var materials = [];
                if(list[i] && list[i].material)
                {
                    materials.push(list[i].material)
                }
                if(list[i] && list[i].material && list[i].material instanceof THREE.MeshFaceMaterial)
                {
                    materials = materials.concat(list[i].material.materials)
                }
                for (var j in materials)
                {
                    if(materials[j].hasOwnProperty('map') && !materials[j].map)
                            materials[j].map = _SceneManager.getTexture('white.png');
                }
               
                //pass all materials through the material system to normalize them with the render options
                var def = _MaterialCache.getDefForMaterial(list[i].material);
                //must break the reference, because of deallocation in materialdef.js
                list[i].material = new THREE.MeshPhongMaterial();
                
                _MaterialCache.setMaterial(list[i], def);
                list[i].material = list[i].material.clone();
                if(i == 0)
                    this.materialDef = def; //we must remember the value, otherwise when we fire the getter in materialdef.js, we will get
                //the def generated from the material, which may have been edited by the above on one client but not another


                //If the incomming mesh does not have UVs on channel one, fill with zeros.
                if (!list[i].geometry.faceVertexUvs[0] || list[i].geometry.faceVertexUvs[0].length == 0) {
                    list[i].geometry.faceVertexUvs[0] = [];
                    for (var k = 0; k < list[i].geometry.faces.length; k++) {
                        if (!list[i].geometry.faces[k].d)
                            list[i].geometry.faceVertexUvs[0].push([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
                        else
                            list[i].geometry.faceVertexUvs[0].push([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
                    }
                }

                //lets set all animations to frame 0
                if (list[i].animationHandle) {
                    list[i].animationHandle.setKey(this.animationFrame);
                    list[i].updateMatrixWorld();
                    //odd, does not seem to update matrix on first child bone. 
                    //how does the bone relate to the skeleton?
                    for (var j = 0; j < list[i].children.length; j++) {
                        list[i].children[j].updateMatrixWorld(true);
                    }
                }
            }
        }
        this.loaded = function(asset) {

            if(this.loadState !== PENDING) return; // in this case, the callback from the load either came too late, and we have decided it failed, or came twice, which really it never should

            

            _ProgressBar.hide();
            if (!asset) {
                this.loadFailed();
                return;
            }
            this.loadSucceded();
            $(document).trigger('EndParse', ['Loading...', assetSource]);


            //get the entry from the asset registry
            reg = this.assetRegistry[this.assetSource];
            //it's not pending, and it is loaded
            reg.pending = false;
            reg.loaded = true;

            //store this asset in the registry

            //actually, is this necessary? can we just store the raw loaded asset in the cache? 
                if (childType !== 'subDriver/threejs/asset/vnd.gltf+json' && childType !== 'subDriver/threejs/asset/vnd.raw-animation')
                    reg.node = asset.scene; //dont clone into the cache, since we clone on the way out
            else {
                glTFCloner.clone(asset.scene, asset.rawAnimationChannels, function(clone) {
                    reg.node = clone;
                    reg.rawAnimationChannels = asset.rawAnimationChannels
                });
            }
            this.cleanTHREEJSnodes(reg.node);

            //you may be wondering why we are cloning again - this is so that the object in the scene is 
            //never the same object as in the cache
            var self = this;
            if (childType !== 'subDriver/threejs/asset/vnd.gltf+json')
                this.getRoot().add(reg.node.clone());
            else {
                glTFCloner.clone(asset.scene, asset.rawAnimationChannels, function(clone) {
                    self.getRoot().add(clone);
                    self.getRoot().GetBoundingBox();
                });
            }

            //set some defaults now that the mesh is loaded
            //the VWF should set some defaults as well
            vwf.setProperty(childID ,'materialDef', this.materialDef);
            this.settingProperty('animationFrame', 0);
            //if any callbacks were waiting on the asset, call those callbacks

            for (var i = 0; i < reg.callbacks.length; i++)
                reg.callbacks[i](asset.scene, asset.rawAnimationChannels);
            //nothing should be waiting on callbacks now.
            reg.callbacks = [];

            this.getRoot().GetBoundingBox();
            asyncCallback(true);



        }.bind(this);


        //if there is no asset source, perhaps because this linked to an existing node from a parent asset, just continue with loading
        if (!assetSource) {

            return;
        }



        this.assetRegistry = assetRegistry;
        this.assetSource = assetSource;

        // if there is no entry in the registry, create one
        if (!assetRegistry[assetSource]) {
            //its new, so not waiting, and not loaded
            assetRegistry[assetSource] = {};
            assetRegistry[assetSource].loaded = false;
            assetRegistry[assetSource].pending = false;
            assetRegistry[assetSource].callbacks = [];

            //see if it was preloaded
                if (childType == 'subDriver/threejs/asset/vnd.raw-morphttarget' && _assetLoader.getMorphs(assetSource)) {
                    assetRegistry[assetSource].loaded = true;
                    assetRegistry[assetSource].pending = false;
                    assetRegistry[assetSource].node = _assetLoader.getMorphs(assetSource).scene;
                    this.cleanTHREEJSnodes(assetRegistry[assetSource].node);
                }
            if (childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed' && _assetLoader.getUtf8Json(assetSource)) {
                assetRegistry[assetSource].loaded = true;
                assetRegistry[assetSource].pending = false;
                assetRegistry[assetSource].node = _assetLoader.getUtf8Json(assetSource).scene;
                this.cleanTHREEJSnodes(assetRegistry[assetSource].node);
            }
            if (childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed+optimized' && _assetLoader.getUtf8JsonOptimized(assetSource)) {
                assetRegistry[assetSource].loaded = true;
                assetRegistry[assetSource].pending = false;
                assetRegistry[assetSource].node = _assetLoader.getUtf8JsonOptimized(assetSource).scene;
                this.cleanTHREEJSnodes(assetRegistry[assetSource].node);
            }
            if (childType == 'subDriver/threejs/asset/vnd.collada+xml' && _assetLoader.getCollada(assetSource)) {
                assetRegistry[assetSource].loaded = true;
                assetRegistry[assetSource].pending = false;
                assetRegistry[assetSource].node = _assetLoader.getCollada(assetSource).scene;
                this.cleanTHREEJSnodes(assetRegistry[assetSource].node);
            }
            if (childType == 'subDriver/threejs/asset/vnd.collada+xml+optimized' && _assetLoader.getColladaOptimized(assetSource)) {
                assetRegistry[assetSource].loaded = true;
                assetRegistry[assetSource].pending = false;
                assetRegistry[assetSource].node = _assetLoader.getColladaOptimized(assetSource).scene;
                this.cleanTHREEJSnodes(assetRegistry[assetSource].node);
            }
                if ((childType == 'subDriver/threejs/asset/vnd.gltf+json' || childType == 'subDriver/threejs/asset/vnd.raw-animation') && _assetLoader.getglTF(assetSource)) {

                assetRegistry[assetSource].loaded = true;
                assetRegistry[assetSource].pending = false;
                assetRegistry[assetSource].node = _assetLoader.getglTF(assetSource).scene;
                assetRegistry[assetSource].animations = _assetLoader.getglTF(assetSource).animations;
                assetRegistry[assetSource].rawAnimationChannels = _assetLoader.getglTF(assetSource).rawAnimationChannels;
                this.cleanTHREEJSnodes(assetRegistry[assetSource].node);
            }
        }


        //grab the registry entry for this asset
        var reg = assetRegistry[assetSource];

        //if the asset entry is not loaded and not pending, you'll have to actaully go download and parse it
        if (reg.loaded == false && reg.pending == false) {


            //thus, it becomes pending
            reg.pending = true;
            asyncCallback(false);

            if (childType == 'subDriver/threejs/asset/vnd.collada+xml') {
                this.loader = new THREE.ColladaLoader();

                this.loader.load(assetSource, this.loaded.bind(this), this.loadFailed.bind(this));
                this.loadStarted();
                asyncCallback(false);   
            }
            if (childType == 'subDriver/threejs/asset/vnd.collada+xml+optimized') {
                this.loader = new ColladaLoaderOptimized();

                this.loader.load(assetSource, this.loaded.bind(this), this.loadFailed.bind(this));
                this.loadStarted();
                asyncCallback(false);
            }
            if (childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed+optimized') {
                this.loader = new UTF8JsonLoader_Optimized({
                    source: assetSource
                }, this.loaded.bind(this), this.loadFailed.bind(this));
                this.loadStarted();
                asyncCallback(false);
            }
            if (childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed') {

                this.loader = new UTF8JsonLoader({
                    source: assetSource
                }, this.loaded.bind(this), this.loadFailed.bind(this));
                this.loadStarted();
                asyncCallback(false);
            }
                if (childType == 'subDriver/threejs/asset/vnd.gltf+json' || childType == 'subDriver/threejs/asset/vnd.raw-animation') {
                
                var node = this;
                node.loader = new THREE.glTFLoader()
                node.loader.useBufferGeometry = true;
                node.source = assetSource;
                this.loadStarted();
                asyncCallback(false);
                    var animOnly = childType === 'subDriver/threejs/asset/vnd.raw-animation'

                //create a queue to hold requests to the loader, since the loader cannot be re-entered for parallel loads
                    if (!THREE.glTFLoader.queue) {
                    //task is an object that olds the info about what to load
                    //nexttask is supplied by async to trigger the next in the queue;
                        THREE.glTFLoader.queue = new async.queue(function(task, nextTask) {
                        var node = task.node;
                        var cb = task.cb;
                        //call the actual load function
                        //signature of callback dictated by loader
                        node.loader.load( node.source, function(geometry , materials) {
                            //ok, this model loaded, we can start the next load
                            nextTask();
                            //do whatever it was (asset loaded) that this load was going to do when complete
                            cb(geometry , materials);
                            }, animOnly);

                    },1);
                }
                
                
                //we need to queue up our entry to this module, since it cannot handle re-entry. This means that while it 
                //is an async function, it cannot be entered again before it completes
                    THREE.glTFLoader.queue.push({
                        node: node,
                        cb: node.loaded.bind(this)
                    })


            }
                //load as a normal gltf file TODO:add this to the preloader, since it should work normally
                if (childType == 'subDriver/threejs/asset/vnd.raw-morphttarget') {
                    this.loader = new MorphRawJSONLoader();
                    this.loader.load(assetSource, this.loaded.bind(this));
                    this.loadStarted();
                    asyncCallback(false);
                }



        }
        //if the asset registry entry is not pending and it is loaded, then just grab a copy, no download or parse necessary
        else if (reg.loaded == true && reg.pending == false) {

            if (childType === 'subDriver/threejs/asset/vnd.gltf+json') {
                //here we signal the driver that we going to execute an asynchronous load

                //asyncCallback(false);
                var self = this;


                //self.getRoot().add(reg.node);
                glTFCloner.clone(reg.node, reg.rawAnimationChannels, function(clone) {
                    // Finally, attach our cloned model
                    self.getRoot().add(clone);
                    self.cleanTHREEJSnodes(self.getRoot());

                    vwf.setProperty(childID,'materialDef', self.materialDef);
                    $(document).trigger('EndParse');

                    self.getRoot().updateMatrixWorld(true);

                    self.getRoot().GetBoundingBox();
                    //ok, load is complete - ask the kernel to continue the simulation
                    window.setImmediate(function() {
                        //asyncCallback(true);
                    })

                });
            } else {
                    console.log("Loading Assets from Cache...");
                this.getRoot().add(reg.node.clone());
                
                vwf.setProperty(childID,'materialDef', this.materialDef);
                $(document).trigger('EndParse');
                this.getRoot().updateMatrixWorld(true);
                this.getRoot().GetBoundingBox();
            }
        }
        //if it's pending but not done, register a callback so that when it is done, it can be attached.
        else if (reg.loaded == false && reg.pending == true) {
            asyncCallback(false);
            var tcal = asyncCallback;
            reg.callbacks.push(function(node, rawAnimationChannels) {

                //just clone the node and attach it.
                //this should not clone the geometry, so much lower memory.
                //seems to take near nothing to duplicated animated avatar

                if (node) {

                    if (childType === 'subDriver/threejs/asset/vnd.gltf+json') {
                        var self = this;

                        glTFCloner.clone(node, rawAnimationChannels, function(clone) {
                            // Finally, attach our cloned model
                            self.cleanTHREEJSnodes(self.getRoot());
                            self.getRoot().add(clone);

                            vwf.setProperty(childID ,'materialDef', self.materialDef);
                            $(document).trigger('EndParse');
                            self.getRoot().updateMatrixWorld(true);

                            tcal(true);
                        })
                    } else {
                        $(document).trigger('EndParse');
                        this.getRoot().add(node.clone());
                        this.cleanTHREEJSnodes(this.getRoot());
                        vwf.setProperty(childID ,'materialDef', this.materialDef);
                        this.getRoot().updateMatrixWorld(true);

                        tcal(true);
                    }
                } else {
                    tcal(true);
                }
            }.bind(this));
        }



        //this.Build();
    }
    //default factory code
    return function(childID, childSource, childName, childType, assetSource, asyncCallback) {
        //name of the node constructor



        //create an asset registry if one does not exist for this driver
        if (!this.assetRegistry) {
            this.assetRegistry = {};
        }



        return new asset(childID, childSource, childName, childType, assetSource, asyncCallback, this.assetRegistry);
    }
})();

//@ sourceURL=threejs.subdriver.asset