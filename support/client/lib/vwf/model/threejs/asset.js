"use strict";


(function()
{
    //enum to keep track of assets that fail to load
   

    function asset(childID, childSource, childName, childType, assetSource, asyncCallback)
        {
            //asyncCallback(false);
            //handle for wrapping the glTF animation format so animatable.js can read it
            function AnimationHandleWrapper(gltfAnimations)
            {
                this.duration = 0;
                this.glTFAnimations = gltfAnimations;
                for (var i in this.glTFAnimations)
                {
                    this.duration = Math.max(this.duration, this.glTFAnimations[i].duration)
                }
                this.setKey = function(key, fps)
                {
                    for (var j in this.glTFAnimations)
                    {
                        var i, len = this.glTFAnimations[j].interps.length;
                        for (i = 0; i < len; i++)
                        {
                            this.glTFAnimations[j].interps[i].interp(key / fps);
                        }
                    }
                }
                this.data = {
                    length: this.duration,
                    fps: 30
                };
            }
            this.inherits = ['vwf/model/threejs/transformable.js', 'vwf/model/threejs/materialDef.js', 'vwf/model/threejs/animatable.js', 'vwf/model/threejs/shadowcaster.js', 'vwf/model/threejs/passable.js', 'vwf/model/threejs/visible.js', 'vwf/model/threejs/static.js', 'vwf/model/threejs/selectable.js'];
            this.initializingNode = function()
            {
                //somehow this is not called by the loaders 
                this.getRoot().updateMatrixWorld(true);
                //the parent is an asset object
                if (true)
                {
                    var parentRoot = null;
                    if (this.parentNode && this.parentNode.getRoot) //if the parent internal driver object is just the scene, it does not have a getRoot function
                        parentRoot = this.parentNode.getRoot();
                    var skeleton = null;
                    var parentSkin = null;
                    var thisroot = this.getRoot().parent; // the asset initializing
                    var walk = function(node)
                    {
                        //dont search skeleton into self
                        if (node == thisroot) return;
                        //if (node !== parentRoot) return;
                        // get skeleton data
                        if (node.skeleton)
                        {
                            skeleton = node.skeleton;
                            parentSkin = node;
                            return;
                        }
                        for (var i = 0; i < node.children.length; i++)
                            walk(node.children[i])
                    }
                    if (parentRoot)
                        walk(parentRoot); // this really seems right. 
                    var skin = null;
                    var walk = function(node)
                    {
                        // get skinned mesh from initialing asset
                        if (node instanceof THREE.SkinnedMesh)
                        {
                            skin = node;
                            return;
                        }
                        for (var i = 0; i < node.children.length; i++)
                            walk(node.children[i])
                    }
                    walk(this.getRoot());
                    // bind skinned mesh of init node to parent skeleton
                    if (skeleton && skin)
                    {
                        skin.updateMatrixWorld(true);
                        this.settingProperty('animationFrame', 0);
                        skin.bind(skeleton, parentSkin.matrix.clone());
                        skin.boundingSphere = parentSkin.boundingSphere;
                        skin.updateMatrixWorld(true);
                        skin.frustumCulled = false;
                        for (var i in skin.children)
                        {
                            if (skin.children[i] instanceof THREE.Bone)
                                skin.remove(skin.children[i]);
                        }
                    }
                }
                if (childType === "subDriver/threejs/asset/vnd.raw-morphttarget")
                {
                    var parentRoot = null;
                    if (this.parentNode && this.parentNode.getRoot) //if the parent internal driver object is just the scene, it does not have a getRoot function
                        parentRoot = this.parentNode.getRoot();
                    var parentSkin = null;
                    var walk = function(node)
                    {
                        if (node.skeleton)
                        {
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
                    for (var i in oldgeo.faceVertexUvs)
                    {
                        var uv = oldgeo.faceVertexUvs[i];
                        var newuv = [];
                        newgeo.faceVertexUvs.push(newuv);
                        for (var j in uv)
                        {
                            var u = uv[j];
                            var newu = [];
                            newuv.push(newu);
                            for (var k in u)
                                newu.push(u[k].clone());
                        }
                    }
                    newgeo.dynamic = oldgeo.dynamic;
                    newgeo.bones = [];
                    for (var i in oldgeo.bones)
                    {
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
                    var newSkin = new THREE.SkinnedMesh(newgeo, parentSkin.material, true);
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
                    for (var i = 0; i < parentSkin.children.length; i++)
                    {
                        newSkin.children.push(parentSkin.children[i].clone());
                    }
                    parent.add(newSkin);
                    newSkin.bind(parentSkin.skeleton, newSkin.matrix.clone());
                    ///////////////////////////////////////////////////////////
                    parentSkin = newSkin;
                    if (parentSkin)
                    {
                        var morph = this.assetRegistry[assetSource].node.morphTarget;
                        if (morph)
                        {
                            if ((morph.length / 3) % parentSkin.geometry.vertices.length > 0)
                            {
                                console.warn('target is wrong vertex count');
                                return;
                            }
                            if (!parentSkin.geometry.morphTargets)
                                parentSkin.geometry.morphTargets = [];
                            parentSkin.geometry.morphTargets.push(
                            {
                                name: 'base',
                                vertices: parentSkin.geometry.vertices.map(function(vert)
                                {
                                    return vert.clone()
                                })
                            });
                            var targetCount = (morph.length / 3) / parentSkin.geometry.vertices.length;
                            var pointer = 0;
                            var defaultInfluences = [];
                            for (var i = 0; i < targetCount; i++)
                                defaultInfluences.push(0);
                            //notify the kernel of the state of the property so the default value is not null
                            if (!vwf.getProperty(this.parentNode.ID, 'morphTargetInfluences'))
                                vwf.setProperty(this.parentNode.ID, 'morphTargetInfluences', defaultInfluences)
                            for (var i = 0; i < targetCount; i++)
                            {
                                var verts = [];
                                for (var j = 0; j < parentSkin.geometry.vertices.length; j++)
                                {
                                    var x = morph[pointer];
                                    pointer++;
                                    var y = morph[pointer];
                                    pointer++;
                                    var z = morph[pointer];
                                    pointer++;
                                    verts.push(new THREE.Vector3(x, y, z));
                                }
                                parentSkin.geometry.morphTargets.push(
                                {
                                    name: this.assetSource + i,
                                    vertices: verts
                                });
                            }
                            vwf.setProperty(this.parentNode.ID, 'morphTargetInfluences', vwf.getProperty(this.parentNode.ID, 'morphTargetInfluences'))
                                //  parentSkin.geometry.morphTargetsNeedUpdate = true;
                                //  parentSkin.updateMorphTargets();
                                //  window.parentSkin = parentSkin;
                                //  parentSkin.material.morphTargets = true;
                                //  parentSkin.morphTargetInfluences[0] = 1;
                        }
                    }
                }
            }
            
            this.gettingProperty = function(propertyName) {}
            this.settingProperty = function(propertyName, propertyValue) {}
            this.gettingProperty = function(propertyName)
                {
                    if (propertyName == 'materialDef')
                    {
                        if (this.materialDef == null)
                        {
                            var list = [];
                            this.GetAllLeafMeshes(this.rootnode, list);
                            if (list[0])
                                return _MaterialCache.getDefForMaterial(list[0].material);
                            else return undefined;
                        }
                        else
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
                if (asset)
                {
                    this.initializedFromAsset = true;
                    this.backupmats = [];
                    this.backupMatrix = asset.matrix;
                    //asset.matrix = asset.matrix.clone();
                    this.rootnode = asset;
                    this.rootnode = asset;
                    asset.initializedFromAsset = true;
                    var list = [];
                    this.GetAllLeafMeshes(this.rootnode, list);
                    for (var i = 0; i < list.length; i++)
                    {
                        if (list[i].material)
                        {
                            this.backupmats.push([list[i], list[i].material.clone()]);
                        }
                    }
                    asset.matrixAutoUpdate = false;
                    asset.updateMatrixWorld(true);
                    _SceneManager.setDirty(asset);
                    this.settingProperty('transform', this.gettingProperty('transform'));
                    if (asset instanceof THREE.Bone)
                    {
                        for (var i in asset.children)
                        {
                            if (asset.children[i].name == 'BoneSelectionHandle')
                            {
                                asset.children[i].material.color.r = 1;
                            }
                        }
                    }
                }
            }
            this.deletingNode = function()
            {
                if (this.initializedFromAsset)
                {
                    delete this.rootnode.vwfID;
                    //delete this.rootnode.initializedFromAsset;
                    for (var i = 0; i < this.backupmats.length; i++)
                    {
                        this.backupmats[i][0].material = this.backupmats[i][1];
                    }
                    this.rootnode.matrix = this.backupMatrix
                    this.rootnode.updateMatrixWorld(true);
                    //AHH be very careful - this is handled in the main driver, and if you do it here,
                    //the main driver will not know that it was linked, and will delete the node
                    //delete this.rootnode.initializedFromAsset;
                    if (this.rootnode instanceof THREE.Bone)
                    {
                        for (var i in this.rootnode.children)
                        {
                            if (this.rootnode.children[i].name == 'BoneSelectionHandle')
                            {
                                this.rootnode.children[i].material.color.r = .5;
                            }
                        }
                        //need to update root skin if changed transform of bone
                        var parent = this.rootnode.parent;
                        while (parent)
                        {
                            if (parent instanceof THREE.SkinnedMesh)
                            {
                                parent.updateMatrixWorld();
                                //since it makes no sense for a bone to effect the skin farther up the hierarchy
                                break;
                            }
                            parent = parent.parent
                        }
                    }
                }
            }
            
            this.GetAllLeafMeshes = function(threeObject, list)
            {
                if (threeObject instanceof THREE.Mesh)
                {
                    list.push(threeObject);
                    for (var i = 0; i < threeObject.children.length; i++)
                    {
                        this.GetAllLeafMeshes(threeObject.children[i], list);
                    }
                }
                if (threeObject && threeObject.children)
                {
                    for (var i = 0; i < threeObject.children.length; i++)
                    {
                        this.GetAllLeafMeshes(threeObject.children[i], list);
                    }
                }
            }
            this.removeLights = function(node)
            {
                if (node instanceof THREE.DirectionalLight ||
                    node instanceof THREE.PointLight ||
                    node instanceof THREE.SpotLight ||
                    node instanceof THREE.AmbientLight)
                {
                    node.parent.remove(node);
                    return;
                }
                if (node && node.children)
                {
                    for (var i = 0; i < node.children.length; i++)
                        this.removeLights(node.children[i]);
                }
            }
            this.cleanTHREEJSnodes = function(node)
            {
                var list = [];
                this.removeLights(node);
                this.GetAllLeafMeshes(node, list);
                for (var i = 0; i < list.length; i++)
                {
                    if (list[i].name == "BoneSelectionHandle") continue;
                    list[i].geometry.dynamic = true;
                    list[i].castShadow = _SettingsManager.getKey('shadows');
                    list[i].receiveShadow = _SettingsManager.getKey('shadows');
                    var materials = [];
                    if (list[i] && list[i].material)
                    {
                        materials.push(list[i].material)
                    }
                    if (list[i] && list[i].material && list[i].material instanceof THREE.MeshFaceMaterial)
                    {
                        materials = materials.concat(list[i].material.materials)
                    }
                    for (var j in materials)
                    {
                        if (materials[j].hasOwnProperty('map') && !materials[j].map)
                            materials[j].map = _SceneManager.getTexture('white.png');
                    }
                    //pass all materials through the material system to normalize them with the render options
                    var def = _MaterialCache.getDefForMaterial(list[i].material);
                    //must break the reference, because of deallocation in materialdef.js
                    list[i].material = new THREE.MeshPhongMaterial();
                    _MaterialCache.setMaterial(list[i], def);
                    if (list[i].animationHandle)
                        list[i].material.skinning = true;
                    list[i].material = list[i].material.clone();
                    if (!this.materialDef)
                        this.materialDef = [];
                    if (this.materialDef.constructor === Array)
                        this.materialDef.push(def); //we must remember the value, otherwise when we fire the getter in materialdef.js, we will get
                    //the def generated from the material, which may have been edited by the above on one client but not another
                    //If the incomming mesh does not have UVs on channel one, fill with zeros.
                    if (list[i].geometry instanceof THREE.Geometry && (!list[i].geometry.faceVertexUvs[0] || list[i].geometry.faceVertexUvs[0].length == 0))
                    {
                        list[i].geometry.faceVertexUvs[0] = [];
                        for (var k = 0; k < list[i].geometry.faces.length; k++)
                        {
                            if (!list[i].geometry.faces[k].d)
                                list[i].geometry.faceVertexUvs[0].push([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
                            else
                                list[i].geometry.faceVertexUvs[0].push([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
                        }
                    }
                    //lets set all animations to frame 0
                    if (list[i].animationHandle)
                    {
                        list[i].CPUPick([0, 0, 0], [0, 0, 1],
                        {}); //this is sort of a silly way to initialize the bone handles, but it works
                        list[i].animationHandle.setKey(this.animationFrame);
                        list[i].updateMatrixWorld();
                        //odd, does not seem to update matrix on first child bone. 
                        //how does the bone relate to the skeleton?
                        for (var j = 0; j < list[i].children.length; j++)
                        {
                            list[i].children[j].updateMatrixWorld(true);
                        }
                    }
                }
                if (this.materialDef.length === 1)
                    this.materialDef = this.materialDef[0];
            }
            this.loaded = function(asset,rawAnimationChannels)
            {
                
                if (!asset)
                {
                    this.loadFailed();
                    return;
                }
                $(document).trigger('EndParse', ['Loading...', assetSource]);
                
                //you may be wondering why we are cloning again - this is so that the object in the scene is 
                //never the same object as in the cache
                var self = this;
                if (childType !== 'subDriver/threejs/asset/vnd.gltf+json')
                    this.getRoot().add(asset.clone());
                else
                {
                    glTFCloner.clone(asset, rawAnimationChannels, function(clone)
                    {
                        self.getRoot().add(clone);
                        self.getRoot().GetBoundingBox();
                    });
                }
                this.cleanTHREEJSnodes(this.getRoot());
                //set some defaults now that the mesh is loaded
                //the VWF should set some defaults as well
                vwf.setProperty(childID, 'materialDef', this.materialDef);
                this.settingProperty('animationFrame', 0);
                //if any callbacks were waiting on the asset, call those callbacks
                this.getRoot().GetBoundingBox();
                asyncCallback(true);
            }.bind(this);
            this.loadFailed = function(id) {
                asyncCallback(true);
            }.bind(this);

            //if there is no asset source, perhaps because this linked to an existing node from a parent asset, just continue with loading
            if (!assetSource)
            {
                return;
            }
            asyncCallback(false);
            
            
            assetRegistry.get(childType,assetSource,this.loaded,this.loadFailed);
            
        }
        //default factory code
    return function(childID, childSource, childName, childType, assetSource, asyncCallback)
    {
        //name of the node constructor
        return new asset(childID, childSource, childName, childType, assetSource, asyncCallback);
    }
})();
//@ sourceURL=threejs.subdriver.asset