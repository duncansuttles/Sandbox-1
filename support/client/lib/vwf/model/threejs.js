"use strict";

// Copyright 2012 United States Government, as represented by the Secretary of Defense, Under
// Secretary of Defense (Personnel & Readiness).
// 
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
// 
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software distributed under the License
// is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
// or implied. See the License for the specific language governing permissions and limitations under
// the License.



function matCpy(mat) {
    var ret = [];
    for (var i = 0; i < 16; i++)
        ret.push(mat[i]);
    return ret.slice(0);
}

function matComp(m1, m2) {

    for (var i = 0; i < 16; i++) {
        if (m1[i] != m2[i])
            return false;
    }
    return true;
}

function matComploose(m1, m2) {

    for (var i = 0; i < 16; i++) {
        if (Math.abs(m1[i] - m2[i]) > .000001)
            return false;
    }
    return true;
}

function setMeshDynamic(node, val) {
    if (node instanceof THREE.Mesh)
        node.setDynamic(val);
    for (var i = 0; i < node.children.length; i++)
        setMeshDynamic(node.children[i], val);
}

function setMeshStatic(node, val) {
    if (node instanceof THREE.Mesh)
        node.setStatic(val);
    for (var i = 0; i < node.children.length; i++)
        setMeshStatic(node.children[i], val);
}

define(["module", "vwf/model", "vwf/utility", "vwf/utility/color", "vwf/model/threejs/backgroundLoader", "vwf/model/threejs/glTFCloner", "vwf/model/threejs/glTFLoaderUtils", "vwf/model/threejs/glTFLoader", "vwf/model/threejs/glTFAnimation", "vwf/model/threejs/glTFAnimation", "vwf/model/threejs/materialCache"], function(module, model, utility, Color, backgroundLoader) {



    THREE.Matrix4.prototype.lookAt = function(eye, target, up, axis) {

        var te = this.elements;
        if (axis === undefined)
            axis = 2;
        var x = new THREE.Vector3();
        var y = new THREE.Vector3();
        var z = new THREE.Vector3();
        z.subVectors(eye, target).normalize();

        if (z.length() === 0) {

            z.z = 1;

        }

        x.crossVectors(up, z).normalize();

        if (x.length() === 0) {

            z.x += 0.0001;
            x.crossVectors(up, z).normalize();

        }

        y.crossVectors(z, x);


        if (axis == 2) {

            te[0] = x.x;
            te[4] = y.x;
            te[8] = z.x;
            te[1] = x.y;
            te[5] = y.y;
            te[9] = z.y;
            te[2] = x.z;
            te[6] = y.z;
            te[10] = z.z;
        }
        if (axis == 1) {
            te[0] = x.x;
            te[4] = z.x;
            te[8] = y.x;
            te[1] = x.y;
            te[5] = z.y;
            te[9] = y.y;
            te[2] = x.z;
            te[6] = z.z;
            te[10] = y.z;
        }
        if (axis == 0) {
            te[0] = z.x;
            te[4] = x.x;
            te[8] = y.x;
            te[1] = z.y;
            te[5] = x.y;
            te[9] = y.y;
            te[2] = z.z;
            te[6] = x.z;
            te[10] = y.z;
        }

        return this;

    }



    return model.load(module, {

        // == Module Definition ====================================================================

        // -- initialize ---------------------------------------------------------------------------

        initialize: function() {

            this.state.scenes = {}; // id => { MATHDocument: new MATH.Document(), MATHRenderer: new MATH.Renderer(), MATHScene: new MATH.Scene() }
            this.state.nodes = {}; // id => { name: string, MATHObject: MATH.Object, MATH.Collada, MATH.Light, or other...? }
            this.state.kernel = this.kernel.kernel;
            this.state.sceneRootID = "index-vwf";

            window.backgroundLoader = backgroundLoader;

            this.delayedProperties = {};
            this.subDriverFactory = new SubDriverFactory();



            window.rebuildAllMaterials = function(start) {

                if (!start) {
                    for (var i in this.state.scenes) {
                        rebuildAllMaterials(this.state.scenes[i].threeScene);
                    }
                } else {
                    if (start && start.material) {
                        start.material.needsUpdate = true;
                    }
                    if (start && start.children) {
                        for (var i in start.children)
                            rebuildAllMaterials(start.children[i]);
                    }
                }
            }.bind(this);

        },

        initializingNode: function(nodeID, childID) {

            var node = this.state.nodes[childID]; // { name: childName, MATHObject: undefined }
            if (!node) node = this.state.scenes[childID]; // { name: childName, MATHObject: undefined }
            var value = undefined;

            //this driver has no representation of this node, so there is nothing to do.
            if (!node) return;

            if (node.initializingNode)
                node.initializingNode();
        },
        // == Model API ============================================================================

        // -- creatingNode ------------------------------------------------------------------------

        creatingNode: function(nodeID, childID, childExtendsID, childImplementsIDs,
            childSource, childType, childURI, childName, callback) {

            //console.log(["creatingNode:",nodeID,childID,childExtendsID,childType]);
            //console.log("Create " + childID);


            var parentNode, threeChild, threeParent;

            if (nodeID) {
                var parentNode = this.state.nodes[nodeID];
                if (!parentNode)
                    parentNode = this.state.scenes[nodeID];
                if (parentNode) {
                    threeParent = parentNode.threeObject ? parentNode.threeObject : parentNode.threeScene;
                    if (threeParent && childName) {
                        threeChild = FindChildByName.call(this, threeParent, childName, childExtendsID);
                    }
                }
            }
            var kernel = this.kernel.kernel;


            var protos = getPrototypes.call(this, kernel, childExtendsID);
            if (isSceneDefinition.call(this, protos) && childID == this.state.sceneRootID) {
                var sceneNode = CreateThreeJSSceneNode(nodeID, childID, childExtendsID);
                _SceneManager.initialize(sceneNode.threeScene);
                this.state.scenes[childID] = sceneNode;

                var cam = CreateThreeCamera();
                sceneNode.camera.threeJScameras[sceneNode.camera.defaultCamID] = cam;
                sceneNode.camera.ID = sceneNode.camera.defaultCamID;

                var ambient = new THREE.AmbientLight();
                ambient.color.r = .5;
                ambient.color.g = .5;
                ambient.color.b = .5;
                sceneNode.threeScene.add(ambient);
                sceneNode.threeScene.add(cam);





                cam.name = 'camera';
                this.state.cameraInUse = cam;
                var camType = "http://vwf.example.com/camera.vwf";

                vwf.createChild(childID, "camera", {
                    "extends": camType
                });
            }

            if (!nodeID) {
                return;

            }

            if (protos && isCameraDefinition.call(this, protos)) {

                var camName = childID.substring(childID.lastIndexOf('-') + 1);
                var sceneNode = this.state.scenes[this.state.sceneRootID];
                var node = this.state.nodes[childID] = {
                    name: childName,
                    threeObject: threeChild,
                    ID: childID,
                    parentID: nodeID,
                    sceneID: this.state.sceneRootID,
                    threeScene: sceneNode ? sceneNode.threeScene : undefined,
                    type: childExtendsID,
                    sourceType: childType,
                };
                // if there was not a preexisting object, then you have to make a new camera
                if (!node.threeObject) {
                    createCamera.call(this, nodeID, childID, childName);
                }
                //if the scene node is using this as the default camera, but it does not exist, you must create it
                if (sceneNode && sceneNode.camera) {
                    if (childID == sceneNode.camera.defaultCamID) {
                        if (!sceneNode.camera.threeJScameras[childID]) {
                            var cam = CreateThreeCamera();
                            sceneNode.camera.threeJScameras[childID] = cam;

                            //cam.position.set(0, 0, 0);
                            //cam.lookAt( sceneNode.threeScene.position );

                        }
                        node.name = camName;
                        node.threeObject = sceneNode.camera.threeJScameras[childID];

                    } else if (node.threeObject) {
                        sceneNode.camera.threeJScameras[childID] = node.threeObject;

                    }
                }
            } else if (protos && isLightDefinition.call(this, protos)) {
                node = this.state.nodes[childID] = {
                    name: childName,
                    threeObject: threeChild,
                    ID: childID,
                    parentID: nodeID,
                    type: childExtendsID,
                    sourceType: childType,
                };
                if (!node.threeObject) {

                    createLight.call(this, nodeID, childID, childName);
                }

            } else if (protos && isMaterialDefinition.call(this, protos)) {


                node = this.state.nodes[childID] = {
                    name: childName,
                    threeObject: parentNode.threeObject,
                    ID: childID,
                    parentID: nodeID,
                    type: childExtendsID,
                    sourceType: childType,
                };
                //node.threeMaterial = GetMaterial(node.threeObject);
                if (!node.threeMaterial) {
                    node.threeMaterial = new THREE.MeshPhongMaterial();
                    SetMaterial(node.threeObject, node.threeMaterial, childName)
                }
            } else if (protos && isParticleDefinition.call(this, protos)) {

                node = this.state.nodes[childID] = this.subDriverFactory.createNode(childID, 'vwf/model/threejs/particlesystem.js', childName, childType, null, callback);

                node.name = childName,
                node.ID = childID;
                node.parentID = nodeID;
                node.sourceType = childType;
                node.type = childExtendsID;
                node.sceneID = this.state.sceneRootID;
                node.children = [];
                node.threeObject = new THREE.Object3D();
                node.threeObject.add(node.getRoot());
                threeParent.add(node.threeObject);
                
            } else if (protos && isNodeDefinition.call(this, protos)) {

                var sceneNode = this.state.scenes[this.state.sceneRootID];
                if (childType == "model/vnd.collada+xml" || childType == "model/vnd.osgjs+json+compressed") {

                    
                    node = this.state.nodes[childID] = {
                        name: childName,
                        threeObject: threeChild,
                        source: utility.resolveURI(childSource, childURI),
                        ID: childID,
                        parentID: nodeID,
                        sourceType: childType,
                        type: childExtendsID,
                        //no load callback, maybe don't need this?
                        loadingCallback: callback,
                        sceneID: this.state.sceneRootID
                    };
                    //pass the callback. We'll only call it if we cant load sync from memory
                    loadAsset.call(this, parentNode, node, childType, callback);
                } else if (childType == "mesh/definition") {

                    callback(false);
                    node = this.state.nodes[childID] = {
                        name: childName,
                        //threeObject: threeChild,
                        source: utility.resolveURI(childSource, childURI),
                        ID: childID,
                        parentID: nodeID,
                        sourceType: childType,
                        type: childExtendsID,
                        sceneID: this.state.sceneRootID,
                    };
                    node.threeObject = new THREE.Object3D();
                    if (threeParent !== undefined) {
                        threeParent.add(node.threeObject);
                    }
                } else if (childType == "link_existing/threejs") {
                    //debugger;
                    node = this.state.nodes[childID] = this.subDriverFactory.createNode(childID, 'vwf/model/threejs/asset.js', childName, childType, null, callback);

                    node.name = childName;
                    node.threeObject = null;
                    node.ID = childID;
                    node.parentID = nodeID;
                    node.type = childExtendsID;
                    node.sourceType = childType;

                    var scenenode = FindChildByName(parentNode.threeObject, childSource);

                    if (!scenenode)
                        scenenode = new THREE.Object3D();

                    node.setAsset(scenenode);
                    node.threeObject = scenenode;
                    //we need to mark this node - because the VWF node is layered onto a GLGE node loaded from the art asset, deleteing the VWF node should not
                    //delete the GLGE node. This should probably undo any changes made to the GLGE node by the VWF. This is tricky. I'm going to backup the matrix, and reset it
                    //when deleting the VWF node.
                    if (node.threeObject) {
                        node.threeObject.initializedFromAsset = true;
                        node.threeObject.backupMatrix = [];
                        node.threeObject.vwfID = node.ID;
                        for (var u = 0; u < 16; u++)
                            node.threeObject.backupMatrix.push(node.threeObject.matrix.elements[u]);
                    } else {
                        console.log("failed to find view node for " + childSource);
                        node.threeObject = new THREE.Object3D();
                        node.threeObject.vwfID = node.ID;
                    }
                    callback(true);
                }
                //use a pluggable model for createing nodes. This should make it easier to develop a driver that is not one long
                //set of gets and sets
                else if (childType == "subDriver/threejs") {

                    node = this.state.nodes[childID] = this.subDriverFactory.createNode(childID, childSource, childName, childType, null, callback);

                    node.name = childName,
                    node.ID = childID;
                    node.parentID = nodeID;
                    node.sourceType = childType;
                    node.type = childExtendsID;
                    node.sceneID = this.state.sceneRootID;
                    node.children = [];
                    node.threeObject = new THREE.Object3D();
                    node.threeObject.add(node.getRoot());
                    threeParent.add(node.threeObject);
                } else if (childType == "subDriver/threejs/asset/vnd.collada+xml" || childType == "subDriver/threejs/asset/vnd.osgjs+json+compressed" || childType == "subDriver/threejs/asset/vnd.collada+xml+optimized" || childType == "subDriver/threejs/asset/vnd.gltf+json") {

                    node = this.state.nodes[childID] = this.subDriverFactory.createNode(childID, 'vwf/model/threejs/asset.js', childName, childType, childSource, callback);

                    node.name = childName,
                    node.ID = childID;
                    node.parentID = nodeID;
                    node.sourceType = childType;
                    node.type = childExtendsID;
                    node.sceneID = this.state.sceneRootID;

                    node.threeObject = new THREE.Object3D();
                    node.threeObject.add(node.getRoot());
                    threeParent.add(node.threeObject);
                } else {

                    node = this.state.nodes[childID] = {
                        name: childName,
                        threeObject: threeChild,
                        source: utility.resolveURI(childSource, childURI),
                        ID: childID,
                        parentID: nodeID,
                        sourceType: childType,
                        type: childExtendsID,
                        //no load callback, maybe don't need this?
                        //loadingCallback: callback,
                        sceneID: this.state.sceneRootID
                    };
                    if (!node.threeObject && childName)
                        node.threeObject = findThreeObjectInParent.call(this, childName, nodeID);
                    //The parent three object did not have any childrent with the name matching the nodeID, so make a new group
                    if (!node.threeObject) {
                        // doesn't this object need to be added to the parent node
                        node.threeObject = new THREE.Object3D();
                        if (threeParent !== undefined) {
                            threeParent.add(node.threeObject);
                        }
                    }
                }

                if (node && node.threeObject) {
                    if (!node.threeObject.vwfID) node.threeObject.vwfID = childID;
                    if (!node.threeObject.name) node.threeObject.name = childName;
                }
                if (node && parentNode) {
                    if (!parentNode.children)
                        parentNode.children = {};
                    parentNode.children[node.ID] = node;

                    node.parentNode = parentNode;
                    if (parentNode.childAdded)
                        parentNode.childAdded(node);
                }

            }

        },

        // -- deletingNode -------------------------------------------------------------------------

        deletingNode: function(nodeID) {

            //console.log('three driver saw delete command for ' + nodeID)
            if (nodeID) {
                var childNode = this.state.nodes[nodeID];
                if (!childNode) return;

                if (childNode.children) {

                    for (var i = 0; i < childNode.children.length; i++) {
                        this.deletingNode(childNode.children[i].ID);
                    }
                }

                if (childNode) {
                    if (childNode.deletingNode)
                        childNode.deletingNode();

                    if (!childNode.threeObject.initializedFromAsset) {
                        var threeObject = childNode.threeObject;
                        if (threeObject && threeObject.parent) {

                            threeObject.parent.remove(threeObject);

                        }
                    }


                    var parentNode = childNode.parentNode;

                    if (parentNode && parentNode.children)
                        delete parentNode.children[nodeID];

                    delete this.state.nodes[nodeID];
                }
            }
        },

        // -- addingChild ------------------------------------------------------------------------

        addingChild: function(nodeID, childID, childName) {

        },

        // -- movingChild ------------------------------------------------------------------------

        movingChild: function(nodeID, childID, childName) {},

        // -- removingChild ------------------------------------------------------------------------

        removingChild: function(nodeID, childID, childName) {},

        // -- creatingProperty ---------------------------------------------------------------------

        creatingProperty: function(nodeID, propertyName, propertyValue) {
            return this.initializingProperty(nodeID, propertyName, propertyValue);
        },

        // -- initializingProperty -----------------------------------------------------------------

        initializingProperty: function(nodeID, propertyName, propertyValue) {

            var value = undefined;
            //console.log(["initializingProperty: ",nodeID,propertyName,propertyValue]);

            if (!(propertyValue === undefined)) {
                var node = this.state.nodes[nodeID];
                if (!node) node = this.state.scenes[nodeID];
                if (node) {
                    switch (propertyName) {
                        case "meshDefinition":
                            createMesh.call(this, node, propertyValue);
                            break;
                        default:
                            value = this.settingProperty(nodeID, propertyName, propertyValue);
                            break;
                    }
                }
            }

            return value;

        },

        // -- settingProperty ----------------------------------------------------------------------

        settingProperty: function(nodeID, propertyName, propertyValue) {

            //console.log(["settingProperty: ",nodeID,propertyName,propertyValue]);
            var node = this.state.nodes[nodeID]; // { name: childName, MATHObject: undefined }
            if (!node) node = this.state.scenes[nodeID]; // { name: childName, MATHObject: undefined }
            var value = undefined;

            //this driver has no representation of this node, so there is nothing to do.
            if (!node) return;

            if (node.settingProperty)
                value = node.settingProperty(propertyName, propertyValue);
            if (value !== undefined)
                return value;

            var threeObject = node.threeObject;
            if (!threeObject)
                threeObject = node.threeScene;

            //if it's a material node, we'll work with the threeMaterial
            //might be more elegant to simply make the node.threeObject the material, but keeping it seperate
            //in case we later need access to the object the material is on.
            if (node.threeMaterial)
                threeObject = node.threeMaterial;

            //There is not three object for this node, so there is nothing this driver can do. return
            if (!threeObject) return value;


            if (node && threeObject && propertyValue !== undefined) {
                if (threeObject instanceof THREE.Object3D) {
                    if ((propertyName == 'transform' || propertyName == 'localMatrix') && nodeID != vwf.application()) {


                        //console.info( "setting transform of: " + nodeID + " to " + Array.prototype.slice.call( propertyValue ) );
                        var transform = goog.vec.Mat4.createFromArray(propertyValue || []);

                        // Rotate 90 degress around X to convert from VWF Z-up to MATH Y-up.
                        if (threeObject instanceof THREE.Camera) {
                            var columny = goog.vec.Vec4.create();
                            goog.vec.Mat4.getColumn(transform, 1, columny);
                            var columnz = goog.vec.Vec4.create();
                            goog.vec.Mat4.getColumn(transform, 2, columnz);
                            goog.vec.Mat4.setColumn(transform, 1, columnz);
                            goog.vec.Mat4.setColumn(transform, 2, goog.vec.Vec4.negate(columny, columny));
                        }

                        if (!matComploose(transform, threeObject.matrix.elements)) {
                            if (threeObject instanceof THREE.PointCloud) {
                                threeObject.updateTransform(transform);
                            }

                            threeObject.matrixAutoUpdate = false;
                            threeObject.matrix.elements = matCpy(transform);
                            threeObject.updateMatrixWorld(true);

                            threeObject.sceneManagerUpdate();
                        }

                    }
                    if (propertyName == 'lookAt') {
                        //Threejs does not currently support auto tracking the lookat,
                        //instead, we'll take the position of the node and look at that.
                        if (typeof propertyValue == 'string') {

                            var lookatNode = this.state.nodes[propertyValue];

                            var lookatObject = null;
                            if (lookatNode && lookatNode.threeObject) lookatObject = lookatNode.threeObject;
                            else if (lookatNode && lookatNode.threeScene) lookatObject = lookatNode.threeScene;

                            if (lookatObject) {

                                var lookatPosition = new THREE.Vector3();
                                var thisPosition = new THREE.Vector3();
                                var thisMatrix = new THREE.Matrix4();
                                thisMatrix.elements = matCpy(threeObject.matrix.elements);


                                lookatPosition.getPositionFromMatrix(lookatObject.matrix);
                                thisPosition.getPositionFromMatrix(thisMatrix);


                                var up = this.kernel.getProperty(nodeID, 'upAxis') || 2;
                                var upaxis = [0, 0, 0];
                                upaxis[up] = 1;
                                upaxis = new THREE.Vector3(upaxis[0], upaxis[1], upaxis[2]);
                                var axis = this.kernel.getProperty(nodeID, 'lookAxis') || 2;

                                threeObject.matrix.lookAt(thisPosition, lookatPosition, upaxis, axis);

                                threeObject.updateMatrixWorld(true);

                            }

                        } else if (propertyValue instanceof Array || propertyValue instanceof Float32Array) {

                            var lookatPosition = new THREE.Vector3();
                            var thisPosition = new THREE.Vector3();
                            var thisMatrix = new THREE.Matrix4();
                            thisMatrix.elements = matCpy(threeObject.matrix.elements);


                            lookatPosition.set(propertyValue[0], propertyValue[1], propertyValue[2]);
                            thisPosition.getPositionFromMatrix(thisMatrix);

                            var up = this.kernel.getProperty(nodeID, 'upAxis') || 2;
                            var upaxis = [0, 0, 0];
                            upaxis[up] = 1;
                            upaxis = new THREE.Vector3(upaxis[0], upaxis[1], upaxis[2]);
                            var axis = this.kernel.getProperty(nodeID, 'lookAxis') || 2;

                            threeObject.matrix.lookAt(thisPosition, lookatPosition, upaxis, axis);

                            threeObject.updateMatrixWorld(true);
                        }

                    }
                    if (propertyName == 'visible') {
                        //need to walk the tree and hide all sub nodes as well
                        SetVisible(threeObject, propertyValue);
                    }
                    if (propertyName == 'castShadows') {
                        //debugger;
                        threeObject.castShadow = true;
                    }
                    if (propertyName == 'receiveShadows') {
                        //debugger;
                        threeObject.receiveShadow = true;
                    }
                    if (propertyName == 'isStatic') {
                        //debugger;


                        setMeshStatic(threeObject, propertyValue);

                    }
                    if (propertyName == 'isDynamic') {
                        //debugger;

                        vwf.setProperty(nodeID, 'isStatic', false);
                        setMeshDynamic(threeObject, propertyValue);
                    }
                    //This can be a bit confusing, as the node has a material property, and a material child node. 
                    //setting the property does this, but the code in the component is ambigious
                    if (propertyName == 'material') {
                        var material = GetMaterial(node.threeObject);
                        if (!material) {
                            material = new THREE.MeshPhongMaterial();
                            SetMaterial(node.threeObject, material);
                        }
                        if (propertyValue == 'red')
                            material.color.setRGB(1, 0, 0);
                        if (propertyValue == 'green')
                            material.color.setRGB(0, 1, 0);
                        if (propertyValue == 'blue')
                            material.color.setRGB(0, 0, 1);
                        if (propertyValue == 'purple')
                            material.color.setRGB(1, 0, 1);
                        if (propertyValue == 'orange')
                            material.color.setRGB(1, .5, 0);
                        if (propertyValue == 'yellow')
                            material.color.setRGB(1, 1, 0);
                        if (propertyValue == 'gray')
                            material.color.setRGB(.5, .5, .5);
                        if (propertyValue == 'white')
                            material.color.setRGB(1, 1, 1);
                        if (propertyValue == 'black')
                            material.color.setRGB(0, 0, 0);
                        material.ambient.setRGB(material.color.r, material.color.g, material.color.b);
                    }
                    if (propertyName == 'transparent') {
                        var list = [];
                        GetAllLeafMeshes(threeObject, list);
                        for (var i = 0; i < list.length; i++) {
                            if (list[i].material)
                                list[i].material.transparent = propertyValue;
                        }
                    }
                }
              
                if (threeObject instanceof THREE.Camera) {

                    if (propertyName == "fovy") {
                        if (propertyValue) {
                            threeObject.fov = parseFloat(propertyValue);
                            threeObject.updateProjectionMatrix(true);
                        }
                    }
                    if (propertyName == "near") {

                        if (propertyValue) {

                            threeObject.near = parseFloat(propertyValue);
                            threeObject.updateProjectionMatrix(true);
                        }
                    }
                    if (propertyName == "aspect") {
                        if (propertyValue) {
                            threeObject.aspect = parseFloat(propertyValue);
                            threeObject.updateProjectionMatrix(true);
                        }
                    }
                    if (propertyName == "far") {
                        if (propertyValue) {
                            threeObject.far = parseFloat(propertyValue);
                            threeObject.updateProjectionMatrix(true);
                        }
                    }
                    if (propertyName == "cameraType") {
                        if (propertyValue == 'perspective') {

                            var parent = threeObject.parent;
                            if (parent && threeObject && !(threeObject instanceof THREE.PerspectiveCamera)) {
                                var sceneNode = this.state.scenes[this.state.sceneRootID];
                                parent.remove(threeObject);
                                var cam = new THREE.PerspectiveCamera(35, $(document).width() / $(document).height(), .01, 10000);
                                //cam.matrix.elements = [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
                                //CopyProperties(threeObject,cam);
                                cam.far = threeObject.far;
                                cam.near = threeObject.near;
                                cam.matrix = threeObject.matrix;
                                cam.matrixAutoUpdate = false;
                                if (threeObject.fov)
                                    cam.fov = threeObject.fov;
                                if (threeObject.aspect)
                                    cam.aspect = threeObject.aspect;
                                if (this.state.cameraInUse == threeObject)
                                    this.state.cameraInUse = cam;
                                threeObject.updateProjectionMatrix(true);
                                node.threeObject = cam;
                                sceneNode.camera.threeJScameras[nodeID] = cam;
                                parent.add(node.threeObject);
                            }
                        }
                        if (propertyValue == 'orthographic') {

                            var parent = threeObject.parent;
                            if (parent && threeObject && !(threeObject instanceof THREE.OrthographicCamera)) {

                                var sceneNode = this.state.scenes[this.state.sceneRootID];
                                parent.remove(threeObject);
                                var offset = threeObject.far * Math.cos(threeObject.fov / 2 * 0.0174532925);
                                offset = offset / 2;
                                var aspect = threeObject.aspect;
                                var cam = new THREE.OrthographicCamera(-offset, offset, offset / aspect, -offset / aspect, threeObject.near, threeObject.far);
                                cam.far = threeObject.far;
                                cam.near = threeObject.near;
                                cam.matrix = threeObject.matrix;
                                cam.matrixAutoUpdate = false;
                                if (threeObject.fov)
                                    cam.fov = threeObject.fov;
                                if (threeObject.aspect)
                                    cam.aspect = threeObject.aspect;
                                if (this.state.cameraInUse == threeObject)
                                    this.state.cameraInUse = cam;
                                node.threeObject = cam;
                                sceneNode.camera.threeJScameras[nodeID] = cam;
                                parent.add(node.threeObject);
                            }
                        }
                    }
                }
                if (threeObject instanceof THREE.Material) {
                    if (propertyName == "texture") {

                        if (propertyValue !== "") {
                            var img = new Image();
                            img.src = propertyValue;
                            var newmap = THREE.ImageUtils.loadTexture(propertyValue);
                            threeObject.map = newmap;
                            threeObject.needsUpdate = true;
                        } else {
                            threeObject.map = null;
                            threeObject.needsUpdate = true;
                        }

                    }
                    if (propertyName == "color" || propertyName == "diffuse") {

                        // use utility to allow for colors, web colors....
                        //this breaks on array values for colors
                        var vwfColor = new utility.color(propertyValue);
                        if (!propertyValue.length) {
                            threeObject.color.setRGB(vwfColor.red() / 255, vwfColor.green() / 255, vwfColor.blue() / 255);
                        } else {
                            threeObject.color.setRGB(propertyValue[0] / 255, propertyValue[1] / 255, propertyValue[2] / 255);
                        }

                        threeObject.needsUpdate = true;
                        if (threeObject.ambient !== undefined) {
                            threeObject.ambient.setRGB(threeObject.color.r, threeObject.color.g, threeObject.color.b);
                        }
                    }
                }
                //note: move scene into subdriver
                if (threeObject instanceof THREE.Scene) {
                    if (propertyName == 'activeCamera') {
                        if (this.state.scenes[this.state.sceneRootID].camera.threeJScameras[propertyValue]) {
                            this.state.cameraInUse = this.state.scenes[this.state.sceneRootID].camera.threeJScameras[propertyValue];
                            this.state.scenes[this.state.sceneRootID].camera.ID = propertyValue;
                        }
                    }
                    if (propertyName == 'ambientColor') {
                        //handled in view
                    }
                    if (propertyName == 'octreeExtents') {
                        _SceneManager.setExtents(propertyValue);
                    }
                    if (propertyName == 'octreeDepth') {
                        _SceneManager.setMaxDepth(propertyValue);
                    }
                    if (propertyName == 'octreeObjects') {
                        _SceneManager.setMaxObjects(propertyValue);
                    }
                    if (propertyName == 'backgroundColor') {
                        if (node && node.renderer) {
                            if (propertyValue instanceof Array) {
                                switch (propertyValue.length) {
                                    case 3:
                                        node.renderer.setClearColor({
                                            r: propertyValue[0],
                                            g: propertyValue[1],
                                            b: propertyValue[2]
                                        });
                                        break;
                                    case 4:
                                        node.renderer.setClearColor({
                                            r: propertyValue[0],
                                            g: propertyValue[1],
                                            b: propertyValue[2]
                                        }, propertyValue[3]);
                                        break;
                                }
                            }
                        }
                    }
                }
                if (threeObject instanceof THREE.PointLight || threeObject instanceof THREE.DirectionalLight || threeObject instanceof THREE.SpotLight) {





                    if (propertyName == 'lightType') {
                        var newlight;
                        var parent = threeObject.parent;

                        var currProps = {
                            "distance": threeObject.distance,
                            "color": threeObject.color,
                            "intensity": threeObject.intensity,
                            "castShadows": threeObject.castShadow,
                            "matrix": threeObject.matrix,
                            "targetpos": threeObject.target ? threeObject.target.position.clone() : new THREE.Vector3(),
                            "clone": function(newObj) {
                                newObj.distance = this.distance;

                                newObj.color.setRGB(this.color.r, this.color.g, this.color.b);
                                newObj.intensity = this.intensity;
                                newObj.castShadows = this.castShadows;
                                newObj.matrix.elements = matCpy(this.matrix.elements);
                                if (newObj.target)
                                    newObj.target.position.copy(this.targetpos);
                            }
                        };

                        if (propertyValue == 'point' && !(threeObject instanceof THREE.PointLight)) {
                            newlight = new THREE.PointLight(0xFFFFFF, 1, 0);
                            currProps.clone(newlight);
                            newlight.matrixAutoUpdate = false;
                            parent.remove(node.threeObject);
                            parent.add(newlight);
                            node.threeObject = newlight;
                            rebuildAllMaterials.call(this);
                        }
                        if (propertyValue == 'directional' && !(threeObject instanceof THREE.DirectionalLight)) {
                            newlight = new THREE.DirectionalLight(0xFFFFFF, 1, 0);
                            currProps.clone(newlight);
                            newlight.matrixAutoUpdate = false;
                            parent.remove(node.threeObject);
                            parent.add(newlight);
                            node.threeObject = newlight;
                            rebuildAllMaterials.call(this);
                        }
                        if (propertyValue == 'spot' && !(threeObject instanceof THREE.SpotLight)) {
                            newlight = new THREE.SpotLight(0xFFFFFF, 1, 0);
                            currProps.clone(newlight);
                            newlight.matrixAutoUpdate = false;
                            parent.remove(node.threeObject);
                            parent.add(newlight);
                            node.threeObject = newlight;
                            rebuildAllMaterials.call(this);
                        }
                        node.threeObject.updateMatrixWorld(true);
                        if (node.threeObject.target) {
                            node.threeObject.add(node.threeObject.target);
                            node.threeObject.target.position.z = -1;
                            node.threeObject.target.updateMatrixWorld(true);
                        }
                    }
                    //if(propertyName == 'diffuse')
                    //{
                    //    threeObject.color.setRGB(propertyValue[0]/255,propertyValue[1]/255,propertyValue[2]/255);
                    //}

                    if (propertyName == 'distance') {
                        threeObject.distance = propertyValue;
                    }
                    if (propertyName == 'color') {

                        threeObject.color.setRGB(propertyValue[0], propertyValue[1], propertyValue[2]);
                    }
                    if (propertyName == 'intensity') {
                        threeObject.intensity = propertyValue;
                        //threeObject.updateMatrix();
                    }
                    if (propertyName == 'castShadows') {
                        threeObject.castShadows = propertyValue;
                        rebuildAllMaterials.call(this);
                        //threeObject.updateMatrix();
                    }
                    if (propertyName == "spotCosCutOff") {
                        threeObject.exponent = propertyValue;
                    }
                    if (propertyName == 'castShadows') {
                        threeObject.castShadow = propertyValue;
                    }

                }
            }
        },

        // -- gettingProperty ----------------------------------------------------------------------

        gettingProperty: function(nodeID, propertyName) {

            //console.log([nodeID,propertyName,propertyValue]);
            var node = this.state.nodes[nodeID]; // { name: childName, MATHObject: undefined }
            if (!node) node = this.state.scenes[nodeID]; // { name: childName, MATHObject: undefined }
            var value = undefined;

            //this driver has no representation of this node, so there is nothing to do.
            if (!node) return;

            if (node.gettingProperty)
                value = node.gettingProperty(propertyName);

            if (value !== undefined) return value;
            var threeObject = node.threeObject;
            if (!threeObject)
                threeObject = node.threeScene;

            //if it's a material node, we'll work with the threeMaterial
            //might be more elegant to simply make the node.threeObject the material, but keeping it seperate
            //in case we later need access to the object the material is on.
            if (node.threeMaterial)
                threeObject = node.threeMaterial;

            //There is not three object for this node, so there is nothing this driver can do. return
            if (!threeObject) return value;

            if (node && node.threeScene) {
                if (propertyName == 'cameraPosition') {

                    var mat = node.camera.threeJScameras[node.camera.defaultCamID].matrixWorld;
                    var x = mat.elements[12];
                    var y = mat.elements[13];
                    var z = mat.elements[14];
                    return [x, y, z];
                }
            }
            if (node && threeObject) {
                if (threeObject instanceof THREE.Object3D) {
                    if (propertyName == 'worldPosition') {
                        var x = threeObject.matrixWorld.elements[12];
                        var y = threeObject.matrixWorld.elements[13];
                        var z = threeObject.matrixWorld.elements[14];
                        return [x, y, z];
                    }
                    if (propertyName == 'transform') {

                        var value = matCpy(threeObject.matrix.elements);

                        if (threeObject instanceof THREE.Camera) {
                            var columny = goog.vec.Vec4.create();
                            goog.vec.Mat4.getColumn(value, 1, columny);
                            var columnz = goog.vec.Vec4.create();
                            goog.vec.Mat4.getColumn(value, 2, columnz);
                            goog.vec.Mat4.setColumn(value, 2, columny);
                            goog.vec.Mat4.setColumn(value, 1, goog.vec.Vec4.negate(columnz, columnz));
                        }

                        var ret = value;
                        return ret;


                    }
                    if (propertyName == 'worldtransform' || propertyName == 'worldTransform') {
                      //this is just not worth the cost. In fact, because of the scene glyph,
                      //it caused a full re-eval of the world transform stack.  
                      //  threeObject.updateMatrixWorld(true);
                        var value = matCpy(threeObject.matrixWorld.elements);

                        if (threeObject instanceof THREE.Camera) {
                            var columny = goog.vec.Vec4.create();
                            goog.vec.Mat4.getColumn(value, 1, columny);
                            var columnz = goog.vec.Vec4.create();
                            goog.vec.Mat4.getColumn(value, 2, columnz);
                            goog.vec.Mat4.setColumn(value, 2, columny);
                            goog.vec.Mat4.setColumn(value, 1, goog.vec.Vec4.negate(columnz, columnz));
                        }

                        var ret = value;
                        return ret;


                    }



                    if (propertyName == "boundingbox") {
                        value = getBoundingBox.call(this, threeObject, true);
                        return value;
                    }
                    if (propertyName == "centerOffset") {
                        value = getCenterOffset.call(this, threeObject);
                        return value;
                    }

                    if (propertyName == "meshData") {

                        var threeObject = node.threeObject;
                        value = [];
                        var scale = this.gettingProperty(nodeID, "scale", []);
                        scale = [1, 1, 1];
                        var meshList = findAllMeshes.call(this, threeObject);
                        for (var i = 0; i < meshList.length; i++) {
                            value.push({
                                "vertices": getMeshVertices.call(this, meshList[i], threeObject),
                                "vertexIndices": getMeshVertexIndices.call(this, meshList[i]),
                                "scale": scale
                            });
                        }
                        return value;
                    }

                }
                
                if (threeObject instanceof THREE.Material) {
                    if (propertyName == "texture") {
                        //debugger;
                        if (threeObject.map && threeObject.map.image)
                            return threeObject.map.image.src;

                    }
                    if (propertyName == "color") {


                    }
                }

                if (threeObject instanceof THREE.Light) {
                    if (propertyName == "intensity") {
                        return threeObject.intensity;
                    }
                    if (propertyName == "castShadows") {
                        return threeObject.castShadows;
                    }
                    if (propertyName == "spotCosCutOff") {
                        return threeObject.exponent;
                    }
                    if (propertyName == "distance") {
                        return threeObject.distance;
                    }
                    if (propertyName == "color") {
                        return [threeObject.color.r, threeObject.color.g, threeObject.color.b];

                    }
                    if (propertyName == "lightType") {
                        if (threeObject instanceof THREE.DirectionalLight)
                            return 'directional';
                        if (threeObject instanceof THREE.SpotLight)
                            return 'spot';
                        if (threeObject instanceof THREE.PointLight)
                            return 'point';

                    }
                }
            }
        },


        // TODO: deletingMethod

        // -- callingMethod --------------------------------------------------------------------------

        callingMethod: function(nodeID, methodName, args /* [, parameter1, parameter2, ... ] */ ) { // TODO: parameters
            var value = undefined;

            //console.log([nodeID,propertyName,propertyValue]);
            var node = this.state.nodes[nodeID]; // { name: childName, MATHObject: undefined }
            if (!node) node = this.state.scenes[nodeID]; // { name: childName, MATHObject: undefined }

            //this driver has no representation of this node, so there is nothing to do.
            if (!node) return value;

            if (node.callingMethod)
                value = node.callingMethod(methodName, args);

            return value;
        },


        // TODO: creatingEvent, deltetingEvent, firingEvent

        // -- executing ------------------------------------------------------------------------------

        executing: function(nodeID, scriptText, scriptType) {
            return undefined;
        },

        // == ticking =============================================================================

        ticking: function(vwfTime) {

            for (var i in this.state.nodes) {
                var node = this.state.nodes[i];
                var threeObject = node.threeObject;
                if (node.ticking)
                    node.ticking();
            }
        }

    });
    // == PRIVATE  ========================================================================================
    function getPrototypes(kernel, extendsID) {
        var prototypes = [];
        var id = extendsID;

        while (id !== undefined) {
            prototypes.push(id);
            id = kernel.prototype(id);
        }

        return prototypes;
    }

    function isSceneDefinition(prototypes) {
        var foundScene = false;
        if (prototypes) {
            for (var i = 0; i < prototypes.length && !foundScene; i++) {
                foundScene = (prototypes[i] == "http-vwf-example-com-navscene-vwf" || prototypes[i] == "http-vwf-example-com-scene-vwf");
            }
        }

        return foundScene;
    }

    function isMaterialDefinition(prototypes) {
        var foundMaterial = false;
        if (prototypes) {
            for (var i = 0; i < prototypes.length && !foundMaterial; i++) {
                foundMaterial = (prototypes[i] == "http-vwf-example-com-material-vwf");
            }
        }

        return foundMaterial;
    }

    function isCameraDefinition(prototypes) {
        var foundCamera = false;
        if (prototypes) {
            for (var i = 0; i < prototypes.length && !foundCamera; i++) {
                foundCamera = (prototypes[i] == "http-vwf-example-com-camera-vwf");
            }
        }

        return foundCamera;
    }

    function isParticleDefinition(prototypes) {
        var foundSystem = false;
        if (prototypes) {
            for (var i = 0; i < prototypes.length && !foundSystem; i++) {
                foundSystem = (prototypes[i] == "http-vwf-example-com-particlesystem-vwf");
            }
        }

        return foundSystem;
    }


    function isNodeDefinition(prototypes) {
        var foundNode = false;
        if (prototypes) {
            for (var i = 0; i < prototypes.length && !foundNode; i++) {
                foundNode = (prototypes[i] == "http-vwf-example-com-node3-vwf");
            }
        }

        return foundNode;
    }

    function CreateThreeJSSceneNode(parentID, thisID, extendsID) {
        var node = {};
        node.camera = {};
        node.camera.ID = undefined;
        node.camera.defaultCamID = "http-vwf-example-com-camera-vwf-camera";
        node.camera.threeJScameras = {};
        node.ID = thisID;
        node.parentID = parentID;
        node.type = extendsID;
        node.viewInited = false;
        node.modelInited = false;
        node.threeScene = new THREE.Scene();
        node.threeScene.autoUpdate = false;
        node.pendingLoads = 0;
        node.srcAssetObjects = [];
        node.delayedProperties = {};

        return node;
    }
    //changing this function significantly from the GLGE code. Will search heirarchy down until encountering a matching chile
    //will look into nodes that don't match.... this might not be desirable
    function FindChildByName(obj, childName, childType) {


        if (obj.name == childName || obj.id == childName || obj.vwfID == childName || obj.name == 'node-' + childName) {
            return obj;
        } else if (obj.children && obj.children.length > 0) {
            var ret = null;
            for (var i = 0; i < obj.children.length; i++) {
                ret = FindChildByName(obj.children[i], childName, childType);
                if (ret)
                    return ret;
            }
        }
        return null;

    }

    function findObject(objName, type) {

        //there is no global registry of threejs objects. return undefined;

        return undefined;

    }

    function CreateThreeCamera() {

        var cam = new THREE.PerspectiveCamera(35, $(document).width() / $(document).height(), .01, 10000);
        cam.matrixAutoUpdate = false;
        cam.up = new THREE.Vector3(0, 0, 1);
        //cam.matrix.elements = [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
        cam.updateMatrixWorld(true);
        return cam;
    }

    function createCamera(nodeID, childID, childName) {

        var sceneNode = this.state.scenes[nodeID];
        var parent = sceneNode ? sceneNode : this.state.nodes[nodeID];
        if (!sceneNode) sceneNode = this.state.scenes[parent.sceneID];
        if (sceneNode && parent) {
            var child = this.state.nodes[childID];
            if (child) {
                var cam;
                if (sceneNode.camera && sceneNode.camera.threeJScameras) {
                    if (!sceneNode.camera.threeJScameras[childID]) {
                        cam = CreateThreeCamera.call(this);
                        //camera.position.set(0, 0, 0);
                        //camera.lookAt( sceneNode.threeScene.position );


                        sceneNode.camera.threeJScameras[childID] = cam;
                    } else {
                        cam = sceneNode.camera.threeJScameras[childID];
                    }

                    var threeParent = parent.threeObject;
                    if (!threeParent) threeParent = parent.threeScene;
                    if (threeParent && (threeParent instanceof THREE.Scene || threeParent instanceof THREE.Object3D)) {
                        threeParent.add(cam);
                    }

                    child.name = childName;
                    child.threeObject = cam;
                    child.uid = child.threeObject.uid;
                    cam.name = childName;
                }
            }
        }

    }


    function findAllMeshes(threeObject, list) {

        if (!threeObject) return;
        if (!list) list = [];
        if (threeObject instanceof THREE.Mesh)
            list.push(threeObject);
        if (threeObject.children) {
            for (var i = 0; i < threeObject.children.length; i++) {
                findAllMeshes(threeObject.children[i], list);
            }
        }
        return list;
    }

    function getMeshVertexIndices(mesh) {

        var ret = [];
        for (var i = 0; i < mesh.geometry.faces.length; i++) {
            var face = mesh.geometry.faces[i];
            ret.push([face.a, face.b, face.c]);

        }
        return ret;
    }
    //Get all mesh verts. Transform via matrix stack up to threeObject. Thus, get all sub mesh verts relative to this object's transform
    function getMeshVertices(mesh, threeObject) {

        var matrix = new THREE.Matrix4();
        matrix.copy(mesh.matrix);
        var parent = mesh.parent;
        while (parent && parent != threeObject) {
            var mat = new THREE.Matrix4();
            mat.copy(parent.matrix);
            matrix = matrix.multiply(mat, matrix);
            parent = parent.parent;
        }
        var mat = new THREE.Matrix4();
        mat.copy(threeObject.matrix);
        matrix = matrix.multiply(mat, matrix);
        var ret = [];
        for (var i = 0; i < mesh.geometry.vertices.length; i++) {
            var vert = new THREE.Vector3();
            vert.copy(mesh.geometry.vertices[i]);
            vert.applyMatrix4(matrix);
            ret.push([vert.x, -vert.y, vert.z]);

        }
        return ret;
    }
    //do a depth first search of the children, return the first material
    function GetMaterial(threeObject) {
        //something must be pretty seriously wrong if no threeobject
        if (!threeObject)
            return null;

        if (threeObject && threeObject.material)
            return threeObject.material;
        if (threeObject.children) {
            var ret = null;
            for (var i = 0; i < threeObject.children.length; i++) {
                ret = GetMaterial(threeObject.children[i])
                if (ret) return ret;
            }
        }
        return null;
    }

    function GetAllLeafMeshes(threeObject, list) {
        if (threeObject instanceof THREE.Mesh) {
            list.push(threeObject);
        }
        if (threeObject.children) {
            for (var i = 0; i < threeObject.children.length; i++) {
                GetAllLeafMeshes(threeObject.children[i], list);
            }
        }
    }

    function fixMissingUVs(mesh) {

        if (!mesh.geometry.faceVertexUvs[0])
            mesh.geometry.faceVertexUvs[0] = [];
        if (mesh.geometry.faceVertexUvs[0].length == 0) {

            for (var i = 0; i < mesh.geometry.faces.length; i++) {
                var face = mesh.geometry.faces[i];
                if (face instanceof THREE.Face4)
                    mesh.geometry.faceVertexUvs[0].push([new THREE.Vector2(0, 1), new THREE.Vector2(0, 1), new THREE.Vector2(0, 1), new THREE.Vector2(0, 1)]);
                if (face instanceof THREE.Face3)
                    mesh.geometry.faceVertexUvs[0].push([new THREE.Vector2(0, 1), new THREE.Vector2(0, 1), new THREE.Vector2(0, 1)]);
            }
        }


        mesh.geometry.computeCentroids();



        mesh.geometry.uvsNeedUpdate = true;


    }
    //set the material on all the sub meshes of an object.
    //This could cause some strangeness in cases where an asset has multiple sub materials
    //best to only specify the material sub-node where an asset is a mesh leaf
    function SetMaterial(threeObject, material, materialname) {

        //something must be pretty seriously wrong if no threeobject
        if (!threeObject)
            return null;


        var meshes = [];
        GetAllLeafMeshes(threeObject, meshes);
        //apply to all sub meshes
        if (!materialname || materialname == 'material') {
            for (var i = 0; i < meshes.length; i++) {

                meshes[i].material = material;
                meshes.needsUpdate = true;
            }
        } else {
            var index = parseInt(materialname.substr(8));
            if (meshes[index]) {

                meshes[index].material = material;
                meshes.needsUpdate = true;
                window._dMesh = meshes[index];
            }
        }
    }

    function createMesh(node, meshDef) {
        if (node.threeObject && node.threeObject instanceof THREE.Object3D) {
            var i, face;
            var geo = new THREE.Geometry();
            var mat = new THREE.MeshPhongMaterial({
                color: meshDef.color ? meshDef.color : 0xffffff
            })

            for (i = 0; geo.vertices && meshDef.positions && i < meshDef.positions.length; i++) {
                geo.vertices.push(new THREE.Vector3(meshDef.positions[i * 3], meshDef.positions[i * 3 + 1], meshDef.positions[i * 3 + 2]));
            }
            for (i = 0; geo.faces && meshDef.faces && ((i * 3) < meshDef.faces.length); i++) {
                face = new THREE.Face3(meshDef.faces[i * 3], meshDef.faces[i * 3 + 1], meshDef.faces[i * 3 + 2]);
                geo.faces.push(face);
            }
            for (i = 0; geo.faces && meshDef.normals && i < geo.faces.length; i++) {
                face = geo.faces[i];
                face.vertexNormals.push(new THREE.Vector3(meshDef.normals[i * 3], meshDef.normals[i * 3 + 1], meshDef.normals[i * 3 + 2]));
            }
            for (i = 0; geo.faceVertexUvs && meshDef.uv1 && i < meshDef.uv1.length; i++) {
                geo.faceVertexUvs.push(new THREE.Vector2(meshDef.uv1[i * 2], meshDef.uv1[i * 2 + 1]));
            }
            node.threeObject.add(new THREE.Mesh(geo, mat));

            geo.computeCentroids();
        }
    }
    //This function actuall fetches the mesh, does the decode, and loads it
    function loadAsset(parentNode, node, childType, callback) {

        var nodeCopy = node;
        var nodeID = node.ID;
        var childName = node.name;
        var threeModel = this;
        var sceneNode = this.state.scenes[this.state.sceneRootID];

        //callback for failure of asset parse
        function assetFailed(data) {
            $(document).trigger('EndParse');
            //the collada loader uses the failed callback as progress. data means this is not really an error;
            if (!data && window._Notifier)
                _Notifier.alert('error loading asset ' + data);

            var id = nodeCopy.ID;
            if (!id) id = getObjectID.call(threeModel, asset, true, false);
            if (id && id != "") {

                if (threeModel.state.nodes[id]) {
                    var assetNode = threeModel.state.nodes[id];
                    //finally, here is the async callback
                    if (assetNode.loadingCallback) {

                        assetNode.loadingCallback(true);
                    }
                }
            }
        }

        //callback for sucess of asset parse
        function assetLoaded(asset) {
            if (node.parse)
                $(document).trigger('EndParse');
            sceneNode.pendingLoads--;

            //possibly deal with setting intial scale and rotation here, if threejs does something strange by default
            //collada.setRot( 0, 0, 0 ); // undo the default MATH rotation applied in MATH.Collada.initVisualScene that is adjusting for +Y up
            if (asset.scene)
                asset = asset.scene;
            var removed = false;

            nodeCopy.threeObject.add(asset);

            nodeCopy.threeObject.matrixAutoUpdate = false;


            //get the entry from the asset registry
            reg = threeModel.assetRegistry[nodeCopy.source];
            //it's not pending, and it is loaded
            reg.pending = false;
            reg.loaded = true;
            //store this asset in the registry
            reg.node = asset;

            //if any callbacks were waiting on the asset, call those callbacks
            for (var i = 0; i < reg.callbacks.length; i++)
                reg.callbacks[i](asset);
            //nothing should be waiting on callbacks now.	
            reg.callbacks = [];



            //no idea what this is doing here
            if (nodeCopy && nodeCopy.assetLoaded) {
                nodeCopy.assetLoaded(true);
            }
            for (var j = 0; j < sceneNode.srcAssetObjects.length; j++) {
                if (sceneNode.srcAssetObjects[j] == nodeCopy.threeObject) {
                    sceneNode.srcAssetObjects.splice(j, 1);
                    removed = true;
                }
            }
            if (removed) {
                if (sceneNode.srcAssetObjects.length == 0) {

                    loadComplete.call(threeModel);
                }

                var id = nodeCopy.vwfID;
                if (!id) id = getObjectID.call(threeModel, asset, true, false);
                if (id && id != "") {

                    if (threeModel.state.nodes[id]) {
                        var assetNode = threeModel.state.nodes[id];
                        //finally, here is the async callback
                        if (assetNode.loadingCallback) {

                            assetNode.loadingCallback(true);
                        }
                    }
                }
            }


        }
        node.name = childName;
        //create an Object3D to hold the asset
        if (!node.threeObject) {
            node.threeObject = new THREE.Object3D();
            node.threeObject.matrixAutoUpdate = false;
            node.threeObject.updateMatrixWorld(true);

        }

        //link up the Object3D into the scene graph
        if (parentNode && parentNode.threeObject) {
            parentNode.threeObject.add(node.threeObject);
        } else if (sceneNode) {
            if (sceneNode.threeScene) {
                sceneNode.threeScene.add(node.threeObject);
            }

        }

        //create an asset registry if one does not exist for this driver
        if (!this.assetRegistry) {
            this.assetRegistry = {};
        }
        // if there is no entry in the registry, create one
        if (!this.assetRegistry[node.source]) {
            //its new, so not waiting, and not loaded
            this.assetRegistry[node.source] = {};
            this.assetRegistry[node.source].loaded = false;
            this.assetRegistry[node.source].pending = false;
            this.assetRegistry[node.source].callbacks = [];
        }
        //grab the registry entry for this asset
        var reg = this.assetRegistry[node.source];

        this.currentCallback = callback;
        //if the asset entry is not loaded and not pending, you'll have to actaully go download and parse it
        if (reg.loaded == false && reg.pending == false) {
            callback(false);
            //thus, it becomes pending
            reg.pending = true;

            sceneNode.srcAssetObjects.push(node.threeObject);
            node.threeObject.vwfID = nodeID;
            sceneNode.pendingLoads++;

            //Do we need this when we have an async load? currently seems to break things
            //NOTE: yes, need to prevent the queue from advancing - I think
            //this pauses the queue. Resume by calling with true


            //call up the correct loader/parser
            if (childType == "model/vnd.collada+xml") {
                $(document).trigger('BeginParse', ['Loading...', node.source]);
                node.parse = true;
                node.loader = new THREE.ColladaLoader();

                node.loader.load(node.source, assetLoaded.bind(this), assetFailed.bind(this));
            }
            if (childType == "model/vnd.osgjs+json+compressed") {
                alertify.log('Downloading ' + node.source);
                node.loader = new UTF8JsonLoader(node, assetLoaded.bind(this), assetFailed.bind(this));
            }


        }
        //if the asset registry entry is not pending and it is loaded, then just grab a copy, no download or parse necessary
        else if (reg.loaded == true && reg.pending == false) {

            node.threeObject.add(reg.node.clone());
            node.threeObject.updateMatrixWorld(true);
            $(document).trigger('EndParse');

        }
        //if it's pending but not done, register a callback so that when it is done, it can be attached.
        else if (reg.loaded == false && reg.pending == true) {
            callback(false);

            sceneNode.srcAssetObjects.push(node.threeObject);
            node.threeObject.vwfID = nodeID;
            sceneNode.pendingLoads++;

            //so, not necessary to do all the other VWF node goo stuff, as that will be handled by the node that requseted
            //the asset in teh first place
            //

            reg.callbacks.push(function(node) {

                //just clone the node and attach it.
                //this should not clone the geometry, so much lower memory.
                //seems to take near nothing to duplicated animated avatar
                $(document).trigger('EndParse');
                nodeCopy.threeObject.add(node.clone());
                nodeCopy.threeObject.updateMatrixWorld(true);
                nodeCopy.threeObject.sceneManagerUpdate();
                this.tcal(true);
            }.bind({
                tcal: callback
            }));
        }
    }

    function loadComplete() {
        var itemsToDelete = [];
        for (var id in this.delayedProperties) {
            if (this.state.nodes[id]) {
                var props = this.delayedProperties[id];
                for (var propertyName in props) {
                    Object.getPrototypeOf(this).settingProperty.call(this, id, propertyName, props[propertyName]);
                }
                itemsToDelete.push(id);
            }
        }

        for (var i = 0; i < itemsToDelete.length; i++) {
            delete this.delayedProperties[itemsToDelete[i]];
        }
    }

    function getObjectID(objectToLookFor, bubbleUp, debug) {

        var objectIDFound = -1;

        while (objectIDFound == -1 && objectToLookFor) {
            if (debug) {
                this.logger.info("====>>>  vwf.model-MATH.mousePick: searching for: " + path(objectToLookFor));
            }
            jQuery.each(this.state.nodes, function(nodeID, node) {
                if (node.threeObject == objectToLookFor && !node.MATHMaterial) {
                    if (debug) {
                        this.logger.info("pick object name: " + name(objectToLookFor) + " with id = " + nodeID);
                    }
                    objectIDFound = nodeID;
                }
            });
            if (bubbleUp) {
                objectToLookFor = objectToLookFor.parent;
            } else {
                objectToLookFor = undefined;
            }
        }
        if (objectIDFound != -1)
            return objectIDFound;

        return undefined;
    }

    function isLightDefinition(prototypes) {
        var foundLight = false;
        if (prototypes) {
            for (var i = 0; i < prototypes.length && !foundLight; i++) {
                foundLight = (prototypes[i] == "http-vwf-example-com-light-vwf");
            }
        }

        return foundLight;
    }

    function createLight(nodeID, childID, childName) {

        //debugger;
        var child = this.state.nodes[childID];
        if (child) {
            child.threeObject = new THREE.PointLight(0xFFFFFF, 1, 0);
            //child.threeObject.shadowCameraRight     =  500;
            //child.threeObject.shadowCameraLeft      = -500;
            //child.threeObject.shadowCameraTop       =  500;
            //child.threeObject.shadowCameraBottom    = -500;

            // these properties are now exposed as properties
            //child.threeObject.distance = 100;
            //child.threeObject.color.setRGB(1,1,1);

            child.threeObject.matrixAutoUpdate = false;

            child.threeObject.name = childName;
            child.name = childName;

            addThreeChild.call(this, nodeID, childID);
            rebuildAllMaterials.call(this);
        }

    }

    

    function copyArray(arrNew, arrOld) {
        if (!arrNew)
            arrNew = [];
        arrNew.length = 0;
        for (var i = 0; i < arrOld.length; i++)
            arrNew.push(arrOld[i].clone());
        return arrNew;
    }

    function restoreObject(node) {
        if (!node)
            return;

        if (node.originalPositions)
            copyArray(node.vertices, node.originalPositions);
        if (node.originalNormals)
            copyArray(node.normals, node.originalNormals);
        if (node.originalFaces)
            copyArray(node.faces, node.originalFaces);
        if (node.originalMaterial)
            node.material = node.originalMaterial;
        if (node.backupMatrix)
            node.matrix.elements = node.backupMatrix;

        geometry.verticesNeedUpdate = true;
        geometry.normalsNeedUpdate = true;
        geometry.facesNeedUpdate = true;


        delete node.initializedFromAsset;
        delete node.vwfID;
        delete node.originalPositions;
        delete node.originalNormals;
        delete node.originalFaces;
        delete node.originalUV1;
        delete node.originalUV2;
        delete node.originalMaterial;
        delete node.backupMatrix;

        if (node.geometry)
            restoreObject(geometry);
        if (node.children) {
            for (var i = 0; i < node.children.length; i++)
                restoreObject(node.children[i]);
        }
    }

    function addThreeChild(parentID, childID) {

        var threeParent;
        var parent = this.state.nodes[parentID];
        if (!parent && this.state.scenes[parentID]) {
            parent = this.state.scenes[parentID];
            threeParent = parent.threeScene;
        } else {
            threeParent = parent.threeObject;
        }

        if (threeParent && this.state.nodes[childID]) {
            var child = this.state.nodes[childID];

            if (child.threeObject) {
                threeParent.add(child.threeObject);
            }
        }
    }

    function CopyProperties(from, to) {
        for (var i in from) {
            if (i != 'parent' && typeof from[i] != 'function') {
                to[i] = from[i];
            }
        }
    }
    //search the threeObject of the parent sim node for the threeChild with the name of the sim child node
    function findThreeObjectInParent(childID, parentID) {
        var parentThreeObject;
        if (this.state.nodes[parentID])
            parentThreeObject = this.state.nodes[parentID].threeObject;
        if (!parentThreeObject && this.state.scenes[parentID])
            parentThreeObject = this.state.scenes[parentID].threeScene;

        //If there is no parent object render node, then there does not need to be a child node
        if (!parentThreeObject) return null;

        var threeChild = findChildThreeObject(parentThreeObject, childID);
        return threeChild;
    }

    function findChildThreeObject(threeParent, childID) {
        var ret = null;
        if (threeParent.name == childID)
            ret = threeParent;
        else if (threeParent.children) {
            for (var i = 0; i < threeParent.children.length; i++)
                var child = findChildThreeObject(threeParent.children[i], childID);
            if (child)
                ret = child;
        }
        return ret;
    }
    //necessary when settign the amibent color to match MATH behavior
    //Three js mults scene ambient by material ambient
    function SetMaterialAmbients(start) {

        if (!start) {
            for (var i in this.state.scenes) {
                SetMaterialAmbients(this.state.scenes[i].threeScene);
            }
        } else {
            if (start && start.material) {

                //this will override any ambient colors set in materials.
                if (start.material.ambient)
                    start.material.ambient.setRGB(1, 1, 1);
                if (!start.material.ambient)
                    start.material.ambient = new THREE.Color('#FFFFFF');
            }
            if (start && start.children) {
                for (var i in start.children)
                    SetMaterialAmbients(start.children[i]);
            }
        }
    }

    function SetVisible(node, state) {
        if (node)
            node.visible = state;
        if (node && node.children) {
            for (var i in node.children)
                SetVisible(node.children[i], state);
        }
    }

    // -- getBoundingBox ------------------------------------------------------------------------------

    function getBoundingBox(object3, local) {

        //var objWorldTrans = getTransform.call( this, object3, false );
        var bBox = {
            min: {
                x: Number.MAX_VALUE,
                y: Number.MAX_VALUE,
                z: Number.MAX_VALUE
            },
            max: {
                x: -Number.MAX_VALUE,
                y: -Number.MAX_VALUE,
                z: -Number.MAX_VALUE
            }
        };
        var bObjBox;

        var objectList = [],
            obj, wldTrans, bx, foundBBox = 0;
        if (object3.getDescendants) {
            objectList = object3.getDescendants();
        }
        objectList.push(object3);

        for (var j = 0; j < objectList.length; j++) {

            bObjBox = {
                min: {
                    x: Number.MAX_VALUE,
                    y: Number.MAX_VALUE,
                    z: Number.MAX_VALUE
                },
                max: {
                    x: -Number.MAX_VALUE,
                    y: -Number.MAX_VALUE,
                    z: -Number.MAX_VALUE
                }
            };

            obj = objectList[j];
            if (obj) {

                //wldTrans = getTransform.call( this, obj, false );

                if (obj.geometry) {

                    if (obj.geometry.computeBoundingBox) {

                        obj.geometry.computeBoundingBox();
                        bx = obj.geometry.boundingBox;
                        foundBBox++;

                        if (foundBBox > 1) {
                            // TODO
                            // in this case we need to deal with the offsets of the origins
                            // each object is in it's on local space which may not have the same origin
                        } else {
                            bBox = {
                                min: {
                                    x: bx.min.x,
                                    y: bx.min.y,
                                    z: bx.min.z
                                },
                                max: {
                                    x: bx.max.x,
                                    y: bx.max.y,
                                    z: bx.max.z
                                }
                            };
                        }

                    }

                }
            }
        }

        return bBox;

    }

    function getCenterOffset(object3) {
        var offset = [0, 0, 0];
        if (object3) {
            var bBox = getBoundingBox.call(this, object3, true);
            offset[0] = (bBox.max.x + bBox.min.x) * 0.50;
            offset[1] = (bBox.max.y + bBox.min.y) * 0.50;
            offset[2] = (bBox.max.z + bBox.min.z) * 0.50;
        }
        return offset;
    }



    function SubDriverFactory() {
        this.factories = {};
        this.loadSubDriver = function(source) {

            var script = $.ajax({
                url: source,
                async: false
            }).responseText;
            if (!script) return null;
            var factory = eval(script);
            if (!factory) return null;
            if (factory.constructor != Function) return null;
            return factory;

        }
        this.createNode = function(childID, childSource, childName, sourceType, assetSource, asyncCallback) {

            var APINames = ['callingMethod', 'settingProperty', 'gettingProperty', 'initializingNode', 'addingChild', 'deletingNode', 'ticking'];
            var node = null;
            if (this.factories[childSource])
                node = this.factories[childSource](childID, childSource, childName, sourceType, assetSource, asyncCallback);
            else {
                this.factories[childSource] = this.loadSubDriver(childSource);
                node = this.factories[childSource](childID, childSource, childName, sourceType, assetSource, asyncCallback);
            }

            if (node.inherits)
                if (node.inherits.constructor == Array) {
                    for (var i = 0; i < node.inherits.length; i++) {
                        var proto = this.createNode('', node.inherits[i], '');

                        for (var j = 0; j < APINames.length; j++) {
                            var api = APINames[j];
                            if (!node[api + 'Internal']) {

                                var capi = api + "";
                                node[capi + 'Internal'] = [];
                                if (node[capi])
                                    node[capi + 'Internal'].push(node[capi]);
                                node[capi] = eval("var f = function(arg0,arg1,arg2,arg3,arg4,arg5)\n" +
                                    "{\n" +
                                    "var ret = undefined;\n" +
                                    "for(var i =0; i < this['" + capi + 'Internal' + "'].length; i++)\n" +
                                    "	ret = ret !== undefined ? ret : (this['" + capi + 'Internal' + "'][i] && this['" + capi + 'Internal' + "'][i].call(this,arg0,arg1,arg2,arg3,arg4,arg5));\n" +
                                    "return ret;\n" +
                                    "}; f;"
                                );
                                if (!proto[api + 'Internal']) {
                                    if (proto[capi])
                                        node[capi + 'Internal'].push(proto[capi]);
                                } else {
                                    for (var n = 0; n < proto[api + 'Internal'].length; n++) {
                                        node[api + 'Internal'].push(proto[api + 'Internal'][n]);
                                    }
                                }
                            } else {
                                node[api + 'Internal'].push(proto[api]);
                                //node[capi] = node[capi].bind(node);
                            }

                        }
                        var keys = Object.keys(proto);
                        for (var k = 0; k < keys.length; k++) {
                            var key = keys[k];
                            if (APINames.indexOf(key) == -1)
                                if (!node.hasOwnProperty(key)) {
                                    if (proto[key].constructor == Function)
                                        node[key] = proto[key];
                                    else
                                        node[key] = proto[key];
                                }
                        }
                    }
                }
            return node;

        }
        //preload common drivers

        this.factories['vwf/model/threejs/cylinder.js'] = this.loadSubDriver('vwf/model/threejs/cylinder.js');
        this.factories['vwf/model/threejs/box.js'] = this.loadSubDriver('vwf/model/threejs/box.js');
        this.factories['vwf/model/threejs/sphere.js'] = this.loadSubDriver('vwf/model/threejs/sphere.js');
        this.factories['vwf/model/threejs/cone.js'] = this.loadSubDriver('vwf/model/threejs/cone.js');
        this.factories['vwf/model/threejs/plane.js'] = this.loadSubDriver('vwf/model/threejs/plane.js');

        this.factories['vwf/model/threejs/prim.js'] = this.loadSubDriver('vwf/model/threejs/prim.js');
        this.factories['vwf/model/threejs/modifier.js'] = this.loadSubDriver('vwf/model/threejs/modifier.js');
        this.factories['vwf/model/threejs/materialDef.js'] = this.loadSubDriver('vwf/model/threejs/materialDef.js');
    }
});