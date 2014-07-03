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

/// vwf/model/object.js is a backstop property store.
/// 
/// @module vwf/model/object
/// @requires vwf/model
/// @requires vwf/configuration

var SCENE = 0;
var SPHERE = 1;
var BOX = 2;
var CYLINDER = 3;
var CONE = 3;
var PLANE = 4;
var MESH = 5;
var NONE = 6;
var ASSET = 7;

function collectChildCollisions(node, list) {
    if (!list) list = [];
    for (var i in node.children) {
        collectChildCollisions(node.children[i], list);
    }
    if (node.enabled === true) {
        var col = node.buildCollisionShape();
        if (col)
            list.push({
                matrix: vwf.getProperty(node.id, 'worldTransform'),
                collision: col,
                mass: node.mass
            });
    }
    return list;
}


function phyObject(id, world) {
    this.body = null;
    this.ready = false;
    this.mass = 1;
    this.collision = null;
    this.enabled = false;
    this.initialized = false;
    this.collisionDirty = false;
    this.sleeping = false;
    this.id = id;
    this.restitution = 0;
    this.friction = 1;
    this.damping = .01;
    this.world = world;
    this.children = {};
    this.localOffset = null;
    this.collisionBodyOffsetPos = [0, 0, 0];
    this.collisionBodyOffsetRot = [1, 0, 0, 1];
    this.angularVelocity = [0,0,0];
    this.linearVelocity = [0,0,0];
}
phyObject.prototype.setMass = function(mass) {
    this.mass = mass;
    if (this.initialized === true) {

        var localInertia = new Ammo.btVector3();
        this.collision.calculateLocalInertia(this.mass, localInertia);
        this.body.setMassProps(this.mass, localInertia);
        this.body.updateInertiaTensor();
        //todo: need to inform parents that mass has changed, might require recompute of center of mass for compound body
    }
}
phyObject.prototype.initialize = function() {

    this.ready = true;
    //currently, only objects which are children of the world can be bodies
    if (this.enabled && this.parent.id == vwf.application() && this.initialized === false) {
        this.initialized = true;

        var childCollisions = collectChildCollisions(this);
        this.localOffset = null;
        //this object has no child physics objects, so just use it's normal collision shape
        //  if(childCollisions.length == 1)
        //      this.collision = this.buildCollisionShape();
        //  else
        {
            //so, since we have child collision objects, we need to create a compound collision
            this.collision = new Ammo.btCompoundShape();
            var x = 0;
            var y = 0;
            var z = 0;
            for (var i = 0; i < childCollisions.length; i++) {
                //note!! at this point, this object must be a child of the scene, so transform === worldtransform
                var thisworldmatrix = vwf.getProperty(this.id, 'transform');
                var wmi = [];
                Mat4.invert(thisworldmatrix, wmi);
                var aslocal = Mat4.multMat(wmi, childCollisions[i].matrix, []);
                childCollisions[i].local = aslocal;
                //take into account that the collision body may be offset from the object center.
                //this is true with assets, but not with prims
                x += aslocal[12] + this.collisionBodyOffsetPos[0];
                y += aslocal[13] + this.collisionBodyOffsetPos[1];
                z += aslocal[14] + this.collisionBodyOffsetPos[2];
            }
            x /= childCollisions.length;
            y /= childCollisions.length;
            z /= childCollisions.length;

            //todo = using geometric center of collision body - should use weighted average considering mass of child
            for (var i = 0; i < childCollisions.length; i++) {
                var aslocal = childCollisions[i].local;
                var startTransform = new Ammo.btTransform();
                startTransform.getOrigin().setX(aslocal[12] - x);
                startTransform.getOrigin().setY(aslocal[13] - y);
                startTransform.getOrigin().setZ(aslocal[14] - z);

                var quat = [];
                Quaternion.fromRotationMatrix4(aslocal, quat);
                quat = Quaternion.normalize(quat, []);
                var q = new Ammo.btQuaternion(quat[0], quat[1], quat[2], quat[3]);
                startTransform.setRotation(q);

                this.collision.addChildShape(startTransform, childCollisions[i].collision);

            }
            //NANs can result from divide by zero. Be sure to use 0 instead of nan
            this.localOffset = [x || 0, y || 0, z || 0];

        }

        this.startTransform = new Ammo.btTransform();
        this.startTransform.setIdentity();

        var isDynamic = (this.mass != 0);

        var localInertia = new Ammo.btVector3(0, 0, 0);
        if (isDynamic)
            this.collision.calculateLocalInertia(this.mass, localInertia);

        //localoffset is used to offset the center of mass from the pivot point of the parent object
        if (this.localOffset)
            this.startTransform.setOrigin(new Ammo.btVector3(this.localOffset[0], this.localOffset[1], this.localOffset[2]));
        else
            this.startTransform.setOrigin(new Ammo.btVector3(0, 0, 0));

        var myMotionState = new Ammo.btDefaultMotionState(this.startTransform);
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(this.mass, myMotionState, this.collision, localInertia);
        this.body = new Ammo.btRigidBody(rbInfo);
        this.world.addRigidBody(this.body);

        this.body.setDamping(this.damping, this.damping);
        this.body.setFriction(this.friction);
        this.body.setRestitution(this.restitution);
        this.body.setLinearVelocity(new Ammo.btVector3(this.linearVelocity[0],this.linearVelocity[1],this.linearVelocity[2]));
        this.body.setAngularVelocity(new Ammo.btVector3(this.angularVelocity[0],this.angularVelocity[1],this.angularVelocity[2]));
        var mat = vwf.getProperty(this.id, 'transform');
        if (mat)
            this.setTransform(mat);
        //we must return through the kernel here so it knows that this is revelant to all instances of this node
        //not just the proto



        vwf.setProperty(this.id, '___physics_sleeping', this.sleeping);
        vwf.setProperty(this.id, '___physics_linear_velocity', this.linearVelocity);
        vwf.setProperty(this.id, '___physics_angular_velocity', this.angularVelocity);
    }
}
phyObject.prototype.deinitialize = function() {
    if (this.initialized === true) {
        this.initialized = false;
        this.world.removeRigidBody(this.body);
        Ammo.destroy(this.body);
        Ammo.destroy(this.collision);
        Ammo.destroy(this.startTransform);
        this.body = null;
        this.collision = null;
        this.startTransform = null;
    }
}
phyObject.prototype.getLinearVelocity = function() {
    if (this.initialized === true) {
        var vec = this.body.getLinearVelocity()
        return [vec.x(), vec.y(), vec.z()];
    } else
        return this.linearVelocity;
}
phyObject.prototype.setLinearVelocity = function(vel) {
    this.linearVelocity = vel;
    if (this.initialized === true) {
        this.body.setLinearVelocity(new Ammo.btVector3(vel[0], vel[1], vel[2]));
    }
}
phyObject.prototype.setAngularVelocity = function(vel) {
    this.angularVelocity = vel;
    if (this.initialized === true) {
        this.body.setAngularVelocity(new Ammo.btVector3(vel[0], vel[1], vel[2]));
    }
}
phyObject.prototype.getAngularVelocity = function() {
    //waiting for an ammo build that includes body.getAngularVelocity
    if (this.initialized === true && this.body.getAngularVelocity) {
        var vec = this.body.getAngularVelocity()
        return [vec.x(), vec.y(), vec.z()];
    } else
        return this.angularVelocity;
}
phyObject.prototype.setRestitution = function(bounce) {
    this.restitution = bounce;
    if (this.initialized === true) {
        this.body.setRestitution(this.restitution);
    }
}
phyObject.prototype.setDamping = function(damping) {
    this.damping = damping;
    if (this.initialized === true) {
        this.body.setDamping(this.damping, this.damping);
    }
}
phyObject.prototype.setFriction = function(friction) {
    this.friction = friction;
    if (this.initialized === true) {
        this.body.setFriction(this.friction);
    }
}
phyObject.prototype.enable = function() {
    this.enabled = true;
    if (this.parent.id !== vwf.application()) {
        this.markRootBodyCollisionDirty();
    }
    //must do this on next tick. Does that mean initialized is stateful and needs to be in a VWF property?
    if (this.initialized === false) {
        // this.initialize();
    }
}
phyObject.prototype.sleep = function() {
    this.sleeping = true;
    if (this.initialized === true) {
        this.body.setActivationState(2);
    }
}
//must be very careful with data the the physics engine changes during the sim
//can't return cached values if body is enabled because we'll refelct the data 
//from the JS engine and not the changed state of the physics
phyObject.prototype.isSleeping = function() {

    if (this.initialized === true) {
        return this.body.getActivationState() != 0;
    } else
        return this.sleeping;
}
phyObject.prototype.wake = function() {
    this.sleeping = false;
    if (this.initialized === true) {
        this.body.activate();
    }
}
phyObject.prototype.disable = function() {
    this.enabled = false;
    if (this.parent.id !== vwf.application()) {
        this.markRootBodyCollisionDirty();
    }
    if (this.initialized === true) {
        this.deinitialize();
    }
}
phyObject.prototype.getTransform = function() {

    var transform = this.body.getWorldTransform();
    var o = transform.getOrigin();
    var rot = transform.getRotation();
    var pos = [o.x(), o.y(), o.z()];
    var quat = [rot.x(), rot.y(), rot.z(), rot.w()];
    quat = Quaternion.normalize(quat, []);
    var mat = goog.vec.Quaternion.toRotationMatrix4(quat, []);
    var worldoffset = goog.vec.Mat4.multVec3(mat, this.localOffset, [])
    mat[12] = pos[0] - worldoffset[0];
    mat[13] = pos[1] - worldoffset[1];
    mat[14] = pos[2] - worldoffset[2];

    return mat;

}
phyObject.prototype.setTransform = function(matrix) {
    this.transform = matrix
    if (this.initialized === true) {
        var startTransform = new Ammo.btTransform();
        startTransform.getOrigin().setX(matrix[12]);
        startTransform.getOrigin().setY(matrix[13]);
        startTransform.getOrigin().setZ(matrix[14]);



        var quat = [];
        Quaternion.fromRotationMatrix4(matrix, quat);
        quat = Quaternion.normalize(quat, []);

        if (this.localOffset) {
            var worldoff = Mat4.multVec3(Quaternion.toRotationMatrix4(quat, []), this.localOffset, []);
            startTransform.getOrigin().setX(matrix[12] + worldoff[0]);
            startTransform.getOrigin().setY(matrix[13] + worldoff[1]);
            startTransform.getOrigin().setZ(matrix[14] + worldoff[2]);
        }

        var q = new Ammo.btQuaternion(quat[0], quat[1], quat[2], quat[3]);
        startTransform.setRotation(q);

        this.body.setCenterOfMassTransform(startTransform);
      
        
    }
    //todo: the compound collision of the parent does not need to be rebuild, just transforms updated
    //need new flag for this instead of full rebuild
    if (this.enabled === true && this.parent.id !== vwf.application())
        this.markRootBodyCollisionDirty();
}
phyObject.delete = function(world) {
    this.deinitialize();
}
phyObject.prototype.markRootBodyCollisionDirty = function() {
    var parent = this;
    while (parent && parent.parent instanceof phyObject) {
        parent = parent.parent;
    }
    if (parent && parent instanceof phyObject) {
        parent.collisionDirty = true;
    }
}
phyObject.prototype.update = function() {

    if (this.enabled === true && this.initialized === false)
        this.initialize();

    if (this.collisionDirty && this.initialized === true) {
        var backupTrans = this.getTransform();
        this.deinitialize();
        this.initialize();
        this.setTransform(backupTrans);
        this.collisionDirty = false;
    }
}

function phySphere(id, world) {

    this.radius = 1;
    this.world = world;
    this.id = id;
    this.type = SPHERE;
    this.children = {};
}
phySphere.prototype = new phyObject();
phySphere.prototype.buildCollisionShape = function() {
    return new Ammo.btSphereShape(this.radius);
}

phySphere.prototype.setRadius = function(radius) {
    this.radius = radius;
    if (this.enabled === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}

function phyBox(id, world) {

    this.length = .5;
    this.width = .5;
    this.height = .5;
    this.world = world;
    this.id = id;
    this.type = BOX;
    this.children = {};
}
phyBox.prototype = new phyObject();
phyBox.prototype.buildCollisionShape = function() {
    return new Ammo.btBoxShape(new Ammo.btVector3(this.length, this.width, this.height));
}

phyBox.prototype.setLength = function(length) {
    this.length = length / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}

phyBox.prototype.setWidth = function(width) {
    this.width = width / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}

phyBox.prototype.setHeight = function(height) {
    this.height = height / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}

function phyCylinder(id, world) {

    this.radius = 1;
    this.height = .5;
    this.world = world;
    this.id = id;
    this.type = CYLINDER;
    this.children = {};
}
phyCylinder.prototype = new phyObject();
phyCylinder.prototype.buildCollisionShape = function() {
    return new Ammo.btCylinderShapeZ(new Ammo.btVector3(this.radius, this.height, this.height));
}

phyCylinder.prototype.setRadius = function(radius) {
    this.radius = radius;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}

phyCylinder.prototype.setHeight = function(height) {
    this.height = height / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}

function phyCone(id, world) {

    this.radius = 1;
    this.height = 1;
    this.world = world;
    this.id = id;
    this.type = CONE;
    this.children = {};
}
phyCone.prototype = new phyObject();
phyCone.prototype.buildCollisionShape = function() {
    return new Ammo.btConeShapeZ(this.radius, this.height);
}

phyCone.prototype.setRadius = function(radius) {
    this.radius = radius;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}

phyCone.prototype.setHeight = function(height) {
    this.height = height;
    if (this.initialized === true) {
        this.collisionDirty = true;
    }
}

function phyPlane(id, world) {

    this.length = .5;
    this.width = .5;
    this.world = world;
    this.id = id;
    this.type = PLANE;
    this.children = {};
}
phyPlane.prototype = new phyObject();
phyPlane.prototype.buildCollisionShape = function() {
    return new Ammo.btBoxShape(new Ammo.btVector3(this.length, this.width, .001));
}

phyPlane.prototype.setLength = function(length) {
    this.length = length / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}

phyPlane.prototype.setWidth = function(width) {
    this.width = width / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}

//assets can be any type of collision, including trimesh
function phyAsset(id, world) {

    this.length = .5;
    this.width = .5;
    this.height = .5;
    this.radius = .5;
    this.type = ASSET;
    this.colType = NONE;
    this.world = world;
    this.id = id;
   
    this.children = {};
}
phyAsset.prototype = new phyObject();
phyAsset.prototype.setMass = function(mass) {
    if (!this.colType !== MESH)
        phyObject.prototype.setMass.call(this, mass);
    else
        phyObject.prototype.setMass.call(this, 0);
}

//because a mesh may have geometry offset from the center, we must build a compound shape with an offset
phyAsset.prototype.buildCollisionShape = function() {
    var compound = new Ammo.btCompoundShape();
    var transform = new Ammo.btTransform();
    transform.setIdentity();

    transform.getOrigin().setX(this.collisionBodyOffsetPos[0]);
    transform.getOrigin().setY(this.collisionBodyOffsetPos[1]);
    transform.getOrigin().setZ(this.collisionBodyOffsetPos[2]);

    var q = new Ammo.btQuaternion(this.collisionBodyOffsetRot[0], this.collisionBodyOffsetRot[1], this.collisionBodyOffsetRot[2], this.collisionBodyOffsetRot[3]);
    transform.setRotation(q);

    var col = this.buildCollisionShapeInner();
    if (col) {
        compound.addChildShape(transform, col);
        return compound;
    }
    return null;
}
phyAsset.prototype.buildCollisionShapeInner = function() {
    if (this.colType == PLANE)
        return new Ammo.btBoxShape(new Ammo.btVector3(this.length, this.width, .001));
    if (this.colType == CONE)
        return new Ammo.btConeShapeZ(this.radius, this.height);
    if (this.colType == CYLINDER)
        return new Ammo.btCylinderShapeZ(new Ammo.btVector3(this.radius, this.height, this.height));
    if (this.colType == SPHERE)
        return new Ammo.btSphereShape(this.radius);
    if (this.colType == BOX)
        return new Ammo.btBoxShape(new Ammo.btVector3(this.length, this.width, this.height));
    if (this.colType == MESH) {
        debugger;
        //here be dragons
    }
}

phyAsset.prototype.setLength = function(length) {
    this.length = length / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}

phyAsset.prototype.setWidth = function(width) {
    this.width = width / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}

phyAsset.prototype.setHeight = function(height) {
    this.height = height / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}
phyAsset.prototype.setRadius = function(radius) {
    this.radius = radius;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}
phyAsset.prototype.setType = function(type) {
    this.colType = type;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
    //meshes account for offsets
    //might have to think about how to center up center of mass
    if (this.colType == MESH) {
        //careful not to confuse VWF by modifying internal state but not informing kernel
        this.backup_collisionBodyOffsetPos = this.collisionBodyOffsetPos;
        this.collisionBodyOffsetPos = [0, 0, 0]
    } else {
        if (this.backup_collisionBodyOffsetPos) {
            this.collisionBodyOffsetPos = this.backup_collisionBodyOffsetPos;
            delete this.backup_collisionBodyOffsetPos;
        }
    }
}
//only assets have interface to move collision body away from mesh center point
//prims are centered properly or account for it themselves
phyAsset.prototype.setCollisionOffset = function(vec) {

    //meshes account for offsets
    //might have to think about how to center up center of mass
    if (this.type == MESH)
        return;

    this.collisionBodyOffsetPos = vec;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}

define(["module", "vwf/model", "vwf/configuration"], function(module, model, configuration) {


    return model.load(module, {

        // == Module Definition ====================================================================

        // -- initialize ---------------------------------------------------------------------------

        reEntry: false,
        initialize: function() {
            this.nodes = {};
            this.allNodes = {};
            var self = this;
            window.findphysicsnode = function(id) {
                return self.allNodes[id];
            };


            //patch ammo.js to include a get for activation state

            Ammo._emscripten_bind_btRigidBody_getActivationState_1 = function Ih(a) {
                return Ammo.HEAP32[a + 216 >> 2]
            };
            Ammo.btRigidBody.prototype.getActivationState =
                function() {
                    var self = this.ptr;
                    return Ammo._emscripten_bind_btRigidBody_getActivationState_1(self)
            }
            Ammo.btCompoundShape.prototype.addChildShapeInner = Ammo.btCompoundShape.prototype.addChildShape;

            Ammo.btCompoundShape.prototype.addChildShape = function(transform, shape) {
                if (!this.childShapes) {
                    this.childShapes = [];
                    this.childTransforms = [];
                }
                this.childShapes.push(shape);
                this.childTransforms.push(transform);
                this.addChildShapeInner(transform, shape);
            }
            Ammo.btCompoundShape.prototype.getChildShape = function(i) {
                if (!this.childShapes) {
                    this.childShapes = [];
                    this.childTransforms = [];
                }
                return this.childShapes[i];
            }
            Ammo.btCompoundShape.prototype.getChildTransforms = function(i) {
                if (!this.childShapes) {
                    this.childShapes = [];
                    this.childTransforms = [];
                }
                return this.childTransforms[i];
            }
            Ammo.btCompoundShape.prototype.getChildShapeCount = function() {
                if (!this.childShapes) {
                    this.childShapes = [];
                    this.childTransforms = [];
                }
                return this.childTransforms.length;
            }
        },

        // == Model API ============================================================================

        // -- creatingNode -------------------------------------------------------------------------

        creatingNode: function(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName, callback /* ( ready ) */ ) {
            if (childID === vwf.application()) {

                var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(); // every single |new| currently leaks...
                var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
                var overlappingPairCache = new Ammo.btDbvtBroadphase();
                var solver = new Ammo.btSequentialImpulseConstraintSolver();
                var dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
                dynamicsWorld.setGravity(new Ammo.btVector3(0, 0, -10));


                var groundShape = new Ammo.btBoxShape(new Ammo.btVector3(500, 500, .1));



                var groundTransform = new Ammo.btTransform();
                groundTransform.setIdentity();
                groundTransform.setOrigin(new Ammo.btVector3(0, 0, 0));

                var mass = 0;
                var isDynamic = mass !== 0;
                var localInertia = new Ammo.btVector3(0, 0, 0);



                if (isDynamic)
                    groundShape.calculateLocalInertia(mass, localInertia);

                var myMotionState = new Ammo.btDefaultMotionState(groundTransform);
                var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, groundShape, localInertia);
                var body = new Ammo.btRigidBody(rbInfo);
                body.setRestitution(1);
                body.setFriction(.3);


                dynamicsWorld.addRigidBody(body);

                this.nodes[vwf.application()] = {
                    world: dynamicsWorld,
                    type: SCENE,
                    initialized: false,
                    children: {},
                    id: childID
                }

                this.allNodes[vwf.application()] = this.nodes[vwf.application()];

            }

            //node ID 
            if (nodeID && hasPrototype(childID, 'sphere2-vwf')) {
                this.allNodes[nodeID].children[childID] = new phySphere(childID, this.allNodes[vwf.application()].world);
            }
            if (nodeID && hasPrototype(childID, 'box2-vwf')) {
                this.allNodes[nodeID].children[childID] = new phyBox(childID, this.allNodes[vwf.application()].world);
            }
            if (nodeID && hasPrototype(childID, 'cylinder2-vwf')) {
                this.allNodes[nodeID].children[childID] = new phyCylinder(childID, this.allNodes[vwf.application()].world);
            }
            if (nodeID && hasPrototype(childID, 'cone2-vwf')) {
                this.allNodes[nodeID].children[childID] = new phyCone(childID, this.allNodes[vwf.application()].world);
            }
            if (nodeID && hasPrototype(childID, 'plane2-vwf')) {
                this.allNodes[nodeID].children[childID] = new phyPlane(childID, this.allNodes[vwf.application()].world);
            }
            if (nodeID && hasPrototype(childID, 'asset-vwf')) {
                this.allNodes[nodeID].children[childID] = new phyAsset(childID, this.allNodes[vwf.application()].world);
            }
            //child was created
            if (this.allNodes[nodeID] && this.allNodes[nodeID].children[childID]) {
                this.allNodes[childID] = this.allNodes[nodeID].children[childID];
                this.allNodes[childID].parent = this.allNodes[nodeID];
            }

        },


        ticking: function() {
            if (this.nodes[vwf.application()]) {

                for (var i in this.allNodes) {
                    var node = this.allNodes[i];
                    if (node && node.update)
                        node.update();
                }
                //step 50ms per tick.
                //this is dictated by the input from the reflector
                this.nodes[vwf.application()].world.stepSimulation(1 / 20, 10);
                this.reEntry = true;
                for (var i in this.allNodes) {
                    var node = this.allNodes[i];
                    if (node.body && node.initialized === true) {
                        vwf.setProperty(node.id, 'transform', node.getTransform());
                        vwf.setProperty(node.id, '___physics_sleeping', node.isSleeping());
                        vwf.setProperty(node.id, '___physics_velocity_angular', node.getAngularVelocity());
                        vwf.setProperty(node.id, '___physics_velocity_linear', node.getLinearVelocity());
                    }
                }
                this.reEntry = false;
            }
        },
        // -- initializingNode ---------------------------------------------------------------------

        initializingNode: function(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName) {

            if (!this.allNodes[nodeID]) return;

            var node = this.allNodes[nodeID].children[childID];
            if (node)
                node.ready = true;
            if (node && node.initialized === false) {

                node.initialize(this.nodes[vwf.application()].world);
                for (var i in node.delayedProperties) {
                    this.settingProperty(node.id, i, node.delayedProperties[i]);
                }
                delete node.delayedProperties;

            }

        },

        // -- deletingNode -------------------------------------------------------------------------

        deletingNode: function(nodeID) {
            var node = this.allNodes[nodeID];
            if (node) {
                delete node.parent.children[nodeID];
                node.parent = null;
                node.deinitialize();
                delete this.allNodes[nodeID];
                node = null;
            }
        },

        // -- settingProperties --------------------------------------------------------------------

        settingProperties: function(nodeID, properties) {},

        // -- gettingProperties --------------------------------------------------------------------

        gettingProperties: function(nodeID, properties) {


        },

        // -- creatingProperty ---------------------------------------------------------------------

        creatingProperty: function(nodeID, propertyName, propertyValue) {
            return this.initializingProperty(nodeID, propertyName, propertyValue);
        },

        // -- initializingProperty -----------------------------------------------------------------

        initializingProperty: function(nodeID, propertyName, propertyValue) {
            return this.settingProperty(nodeID, propertyName, propertyValue);
        },

        // TODO: deletingProperty

        settingProperty: function(nodeID, propertyName, propertyValue) {

            //dont try to set the parent
            if (!this.allNodes[nodeID]) return;

            //don't allow reentry since this driver can both get and set transform
            if (this.reEntry === true) return;

            var node = this.allNodes[nodeID];
            if (node.ready === false) {
                if (!node.delayedProperties)
                    node.delayedProperties = {};
                node.delayedProperties[propertyName] = propertyValue;
            } else {
                if (propertyName == "transform") {
                    node.setTransform(propertyValue)
                }
                if (propertyName == 'radius' && node.type == SPHERE) {
                    node.setRadius(propertyValue);
                }
                if (propertyName == 'radius' && node.type == CYLINDER) {
                    node.setRadius(propertyValue);
                }
                if (propertyName == 'height' && node.type == CYLINDER) {
                    node.setHeight(propertyValue);
                }
                if (propertyName == 'radius' && node.type == CONE) {
                    node.setRadius(propertyValue);
                }
                if (propertyName == 'height' && node.type == CONE) {
                    node.setHeight(propertyValue);
                }
                if (propertyName == '_length' && node.type == BOX) {
                    node.setLength(propertyValue);
                }
                if (propertyName == 'width' && node.type == BOX) {
                    node.setWidth(propertyValue);
                }
                if (propertyName == 'height' && node.type == BOX) {
                    node.setHeight(propertyValue);
                }
                if (propertyName == '_length' && node.type == PLANE) {
                    node.setLength(propertyValue);
                }
                if (propertyName == 'width' && node.type == PLANE) {
                    node.setWidth(propertyValue);
                }
                if (propertyName === '___physics_enabled') {

                    if (propertyValue === true)
                        node.enable();
                    if (propertyValue === false)
                        node.disable();
                }
                if (propertyName === '___physics_mass') {
                    node.setMass(parseFloat(propertyValue));
                }
                if (propertyName === '___physics_restitution') {
                    node.setRestitution(parseFloat(propertyValue));
                }
                if (propertyName === '___physics_friction') {
                    node.setFriction(parseFloat(propertyValue));
                }
                if (propertyName === '___physics_damping') {
                    node.setDamping(parseFloat(propertyValue));
                }
                if (propertyName === '___physics_sleeping') {
                    if (propertyValue === true)
                        node.sleep();
                    if (propertyValue === false) {
                        node.wake();
                    }
                }
                if (propertyName === '___physics_velocity_angular') {
                    node.setAngularVelocity(propertyValue);
                }
                if (propertyName === '___physics_velocity_linear') {
                    node.setLinearVelocity(propertyValue);
                }
                if (propertyName === '___physics_force_angular') {
                    node.setTorque(propertyValue);
                }
                if (propertyName === '___physics_force_linear') {
                    node.setForce(propertyValue);
                }
                if (propertyName === '___physics_collision_width' && node.type == ASSET) {
                    node.setWidth(propertyValue);
                }
                if (propertyName === '___physics_collision_height' && node.type == ASSET) {
                    node.setHeight(propertyValue);
                }
                if (propertyName === '___physics_collision_length' && node.type == ASSET) {
                    node.setLength(propertyValue);
                }
                if (propertyName === '___physics_collision_radius' && node.type == ASSET) {
                    node.setRadius(propertyValue);
                }
                if (propertyName === '___physics_collision_type' && node.type == ASSET) {
                    node.setType(propertyValue);
                }
                if (propertyName === '___physics_collision_offset' && node.type == ASSET) {
                    node.setCollisionOffset(propertyValue);
                }

            }

        },

        // -- gettingProperty ----------------------------------------------------------------------

        gettingProperty: function(nodeID, propertyName, propertyValue) {

            //dont try to set the parent
            if (!this.allNodes[nodeID]) return;

            //don't allow reentry since this driver can both get and set transform
            if (this.reEntry === true) return;

            var node = this.allNodes[nodeID];

            if (node.ready === false) return;
           

        },
    });

    function hasPrototype(nodeID, prototype) {
        if (!nodeID) return false;
        if (nodeID == prototype)
            return true;
        else return hasPrototype(vwf.prototype(nodeID), prototype);
    }

});