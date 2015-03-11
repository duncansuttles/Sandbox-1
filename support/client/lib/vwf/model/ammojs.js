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
var CONE = 4;
var PLANE = 5;
var MESH = 6;
var NONE = 7;
var ASSET = 8;

function collectChildCollisions(node, list) {
    if (!list) list = [];
    var keys = Object.keys(node.children);
    for (var i = 0; i  < keys.length; i++) {
        collectChildCollisions(node.children[keys[i]], list);
    }
    if (node.enabled === true && node instanceof phyObject) {
        var col = node.buildCollisionShape();
        if (col) {
            list.push({
                matrix: vwf.getProperty(node.id, 'orthoWorldTransform'), //don't use normal world transform. In non uniform spaces, the rotations are senseless. 
                collision: col,
                mass: node.mass,
                localScale: node.localScale,
                node: node
            });
            //careful to orthonormalize the worldmatrix. Previous divide by localscale would always orthonormilize properly
            //when world matrix !== localmatrix
            var xlen = MATH.lengthVec3([list[list.length - 1].matrix[0], list[list.length - 1].matrix[1], list[list.length - 1].matrix[2]]);
            var ylen = MATH.lengthVec3([list[list.length - 1].matrix[4], list[list.length - 1].matrix[5], list[list.length - 1].matrix[6]]);
            var zlen = MATH.lengthVec3([list[list.length - 1].matrix[8], list[list.length - 1].matrix[9], list[list.length - 1].matrix[10]]);
            list[list.length - 1].matrix[0] /= xlen;
            list[list.length - 1].matrix[1] /= xlen;
            list[list.length - 1].matrix[2] /= xlen;
            //list[list.length - 1].matrix[12] /= xlen;
            list[list.length - 1].matrix[4] /= ylen;
            list[list.length - 1].matrix[5] /= ylen;
            list[list.length - 1].matrix[6] /= ylen;
            //list[list.length - 1].matrix[13] /= ylen;
            list[list.length - 1].matrix[8] /= zlen;
            list[list.length - 1].matrix[9] /= zlen;
            list[list.length - 1].matrix[10] /= zlen;
            //list[list.length - 1].matrix[13] /= zlen;
        }
    }
    return list;
}

function phyJoint(id, world, driver) {
    this.id = id;
    this.world = world;
    this.bID = null;
    this.aID = null;
    this.bodyA = null;
    this.bodyB = null;
    this.initialized = false;
    this.ready = true;
    this.driver = driver;
    this.localScale = [1,1,1];
    this.transform = [];
    this.enabled = true;
    if (this.driver) this.driver.jointBodyMap[id] = [];
}
phyJoint.prototype.getWorldScale = function()
{
    return Mat4.createIdentity();
}
phyJoint.prototype.enable = function()
{
    this.enabled = true;
}
phyJoint.prototype.disable = function()
{
    this.enabled = false;
}
phyJoint.prototype.destroy = function() {
    if (this.initialized) {
        this.world.removeConstraint(this.joint)
        if (this.joint) Ammo.destroy(this.joint);
        this.joint = null;
        this.initialized = false;
        this.bodyA = null;
        this.bodyB = null;
    }
}
phyJoint.prototype.deinitialize = function() {
    this.destroy();
}
phyJoint.prototype.getTransform = function(temp)
{
    //this is important and tricky!!! 
    //since the joint orientation is relative to the bodies, and the bodies are moving,
    //recreating the joint without updating it's position will result in very different results
    //it's probably  good pratice to make the joint object a  child of the bodyA, so that the 
    //joint location never changes relative to body a. However, we can also make this work by 
    //updating the stored location of each joint to be relative to the body A position after each tick

    //NOTE:: the this.transform value should be storing the location RELATIVE to BODYA in the reference frame of the joint parent!!!
    //NOTE:: updates from the physics tick should not actually change and rebind these joints, this information is useful only to 
    //late joiners and DB saves
    
    if(this.bodyA)
    {
        if(!temp) temp = [];
        
        if(!this.transRelBodyA) throw new Error('Body not initialized before tick');
        var bodyWorldTx = vwf.getProperty(this.aID, 'worldtransform');
        var bodyRelMat = Mat4.multMat(bodyWorldTx,this.transRelBodyA, temp);

        
        return bodyRelMat;
    }
    else
        return this.transform;

}
phyJoint.prototype.setTransform = function(propertyValue) {
    this.transform = vecset(this.transform, propertyValue);
    if(this.aID)
    {
        this.transRelBodyA = this.getMatrixRelBody(this.aID,this.transform);
    }
    //this.destroy();
}
phyJoint.prototype.setDirty = function() {
    this.destroy();
}
phyJoint.prototype.setBodyAID = function(nodeID) {
    var idx = this.driver.jointBodyMap[this.id].indexOf(this.aID)
    if (idx > -1) var idx = this.driver.jointBodyMap[this.id].splice(idx, 1);
    this.aID = nodeID;
    this.destroy();
    this.driver.jointBodyMap[this.id].push(this.aID);
    this.transRelBodyA = this.getMatrixRelBody(this.aID,this.transform);
}
phyJoint.prototype.setBodyBID = function(nodeID) {
    var idx = this.driver.jointBodyMap[this.id].indexOf(this.bID)
    if (idx > -1) var idx = this.driver.jointBodyMap[this.id].splice(idx, 1);
    this.bID = nodeID;
    this.destroy();
    this.driver.jointBodyMap[this.id].push(this.bID);
}
phyJoint.prototype.setBodyA = function(body) {
    this.bodyA = body;

    var bodyWorldTx = vwf.getProperty(this.aID, 'worldtransform');
    this.transRelBodyA = this.getMatrixRelBody(this.aID,this.transform);
}
phyJoint.prototype.setBodyB = function(body) {
    this.bodyB = body;
}
phyJoint.prototype.update = function() {
    if (!this.initialized) {
        this.initialize();
    }
}
phyJoint.prototype.initialize = function() {
    if (this.driver) {
        //find your body in the driver
        if (this.aID) {
            if (this.driver.allNodes[this.aID] && this.driver.allNodes[this.aID].body) {
                this.setBodyA(this.driver.allNodes[this.aID].body);
            }
        }
        //find your body in the driver
        if (this.bID) {
            if (this.driver.allNodes[this.bID] && this.driver.allNodes[this.bID].body) {
                this.setBodyB(this.driver.allNodes[this.bID].body);
            }
        }
        if (this.bodyA && this.bodyB) {
            this.joint = this.buildJoint();
            this.world.addConstraint(this.joint);
            this.initialized = true;
        }
    }
}
phyJoint.prototype.getPointRelBody = function(bodyID, worldpoint) {
    var bodyWorldTx = vwf.getProperty(bodyID, 'worldtransform');
    var bodyWorldTxI = [];
    Mat4.invert(bodyWorldTx, bodyWorldTxI);
    var bodyRelPos = Mat4.multVec3(bodyWorldTxI, worldpoint, []);
    return bodyRelPos;
}
phyJoint.prototype.getAxisRelBody = function(bodyID, worldAxis) {
    var bodyWorldTx = vwf.getProperty(bodyID, 'worldtransform');
    var bodyWorldTxI = [];
    Mat4.invert(bodyWorldTx, bodyWorldTxI);
    var bodyRelAxis = Mat4.multVec3NoTranslate(bodyWorldTxI, worldAxis, []);
    return bodyRelAxis;
}
phyJoint.prototype.getMatrixRelBody = function(bodyID, worldMatrix) {
    var bodyWorldTx = vwf.getProperty(bodyID, 'worldtransform');
    if(!bodyWorldTx) return null;
    var bodyWorldTxI = [];
    Mat4.invert(bodyWorldTx, bodyWorldTxI);
    var bodyRelMat = Mat4.multMat(bodyWorldTxI, worldMatrix, []);
    return bodyRelMat;
}

function phyPointToPointJoint(id, world, driver) {
    this.pointA = null;
    this.pointB = null;
    phyJoint.call(this, id, world, driver);
}
phyPointToPointJoint.prototype = new phyJoint();
phyPointToPointJoint.prototype.buildJoint = function() {
    var worldTx = vwf.getProperty(this.id, 'worldtransform');
    var worldTrans = [worldTx[12], worldTx[13], worldTx[14]];
    this.pointA = this.getPointRelBody(this.aID, worldTrans);
    this.pointB = this.getPointRelBody(this.bID, worldTrans);
    var pa = new Ammo.btVector3(this.pointA[0], this.pointA[1], this.pointA[2]);
    var pb = new Ammo.btVector3(this.pointB[0], this.pointB[1], this.pointB[2]);
    return new Ammo.btPoint2PointConstraint(this.bodyA, this.bodyB, pa, pb);
}

function phyHingeJoint(id, world, driver) {
    this.pointA = null;
    this.pointB = null;
    this.lowerAngLimit = 0;     //defaults are upper lower than lower, so no limit
    this.upperAngLimit = -.01;
    phyJoint.call(this, id, world, driver);
}
phyHingeJoint.prototype = new phyJoint();
phyHingeJoint.prototype.buildJoint = function() {
    var worldTx = vwf.getProperty(this.id, 'worldtransform');
    var worldTrans = [worldTx[12], worldTx[13], worldTx[14]];
    this.pointA = this.getPointRelBody(this.aID, worldTrans);
    this.pointB = this.getPointRelBody(this.bID, worldTrans);
    var worldX = [worldTx[0], worldTx[1], worldTx[2]];
    var BodyAX = this.getAxisRelBody(this.aID, worldX);
    var BodyBX = this.getAxisRelBody(this.bID, worldX);
    var pa = new Ammo.btVector3(this.pointA[0], this.pointA[1], this.pointA[2]);
    var pb = new Ammo.btVector3(this.pointB[0], this.pointB[1], this.pointB[2]);
    var axisInA = new Ammo.btVector3(BodyAX[0], BodyAX[1], BodyAX[2]);
    var axisInB = new Ammo.btVector3(BodyBX[0], BodyBX[1], BodyBX[2]);
    var joint = new Ammo.btHingeConstraint(this.bodyA, this.bodyB, pa, pb, axisInA, axisInB, true);
    joint.setLimit(this.lowerAngLimit * 0.0174532925, this.upperAngLimit * 0.0174532925, .9, .3,1.0);
    return joint;
}
//NOTE: todo: limits need to be transformed from joint space to bodyA space
//makes more sense GUI side to display in joint space, but bullet used bodyA reference frame
//I think - make y axis vec. rotate around joint space x by limit. move this vec into bodya space. use arctan2 to find new rotation around joint x 
phyHingeJoint.prototype.setLowerAngLimit = function(limit)
{
    this.lowerAngLimit = limit;
    if(this.joint)
    {
        //the constants .9, .3,1.0 come from the bullet source. These are the default values,but the params are not marked optional in the IDL
        this.joint.setLimit(this.lowerAngLimit * 0.0174532925 , this.upperAngLimit * 0.0174532925 , .9, .3,1.0);
    }
}
phyHingeJoint.prototype.setUpperAngLimit = function(limit)
{
    this.upperAngLimit = limit;
    if(this.joint)
    {
        //the constants .9, .3,1.0 come from the bullet source. These are the default values,but the params are not marked optional in the IDL
          this.joint.setLimit(this.lowerAngLimit*0.0174532925 , this.upperAngLimit*0.0174532925 , .9, .3,1.0);
    }
}
function btTransformFromMat(mat) {
    var tx = new Ammo.btTransform();
    tx.getOrigin().setX(mat[12]);
    tx.getOrigin().setY(mat[13]);
    tx.getOrigin().setZ(mat[14]);
    var quat = [];
    Quaternion.fromRotationMatrix4(mat, quat);
    quat = Quaternion.normalize(quat, []);
    var q = new Ammo.btQuaternion(quat[0], quat[1], quat[2], quat[3]);
    tx.setRotation(q);
    return tx;
}
function phySliderJoint(id, world, driver) {
    this.pointA = null;
    this.pointB = null;
    this.lowerLinLimit = 0;
    this.upperLinLimit = 0;
    phyJoint.call(this, id, world, driver);
}
phySliderJoint.prototype = new phyJoint();

phySliderJoint.prototype.setLowerLinLimit = function(limit)
{
    this.lowerLinLimit = limit;
    if(this.joint)
    {
        this.joint.setLowerLinLimit(this.lowerLinLimit);
    }
}
phySliderJoint.prototype.setUpperLinLimit = function(limit)
{
    this.upperLinLimit = limit;
    if(this.joint)
    {
        this.joint.setUpperLinLimit(this.upperLinLimit);
    }
}
phySliderJoint.prototype.getLowerLinLimit = function()
{
   return this.lowerLinLimit ;
    
}
phySliderJoint.prototype.getUpperLinLimit = function()
{
    return this.upperLinLimit ;
    
}
phySliderJoint.prototype.buildJoint = function() {
    
    var worldTx = vwf.getProperty(this.id, 'worldtransform');
    this.pointA = this.getMatrixRelBody(this.aID, worldTx);
    this.pointB = this.getMatrixRelBody(this.bID, worldTx);
    var pa = btTransformFromMat(this.pointA);
    var pb = btTransformFromMat(this.pointB);
    var joint = new Ammo.btSliderConstraint(this.bodyA, this.bodyB, pa, pb, true);
    joint.setLowerLinLimit(this.lowerLinLimit);
    joint.setUpperLinLimit(this.upperLinLimit);
    return joint;
}

function phyFixedJoint(id, world, driver) {
    this.pointA = null;
    this.pointB = null;
    phyJoint.call(this, id, world, driver);
}
phyFixedJoint.prototype = new phyJoint();


phyFixedJoint.prototype.buildJoint = function() {
    var worldTx = vwf.getProperty(this.id, 'worldtransform');
    this.pointA = this.getMatrixRelBody(this.aID, worldTx);
    this.pointB = this.getMatrixRelBody(this.bID, worldTx);
    var pa = btTransformFromMat(this.pointA);
    var pb = btTransformFromMat(this.pointB);
    var joint = new Ammo.btGeneric6DofConstraint(this.bodyA, this.bodyB, pa, pb, true);
    joint.setLinearLowerLimit(new Ammo.btVector3(0,0,0));
    joint.setLinearUpperLimit(new Ammo.btVector3(0,0,0));
    joint.setAngularLowerLimit(new Ammo.btVector3(0,0,0));
    joint.setAngularUpperLimit(new Ammo.btVector3(0,0,0));
    return joint;  
}
function setupPhyObject(node, id, world) {
    node.body = null;
    node.ready = false;
    node.mass = 1;
    node.collision = null;
    node.enabled = false;
    node.initialized = false;
    node.collisionDirty = false;
    node.id = id;
    node.restitution = .1;
    node.friction = .5;
    node.damping = .05;
    node.world = world;
    node.children = {};
    node.localOffset = null;
    node.collisionBodyOffsetPos = [0, 0, 0];
    node.collisionBodyOffsetRot = [1, 0, 0, 1];
    node.angularVelocity = [0, 0, 0];
    node.linearVelocity = [0, 0, 0];
    node.localScale = [1, 1, 1];
    node.activationState = 1;
    node.deactivationTime = 0;
    node.linearFactor = [1, 1, 1];
    node.angularFactor = [1, 1, 1];
    node.constantForce = null;
    node.constantTorque = null;
    node.transform = [];
}

function phyObject(id, world) {
    setupPhyObject(this, id, world);
}
phyObject.prototype.getWorldScale = function() {
    var parent = this;
    var localScale = [1, 1, 1];
    while (parent) {
        localScale[0] *= parent.localScale[0];
        localScale[1] *= parent.localScale[1];
        localScale[2] *= parent.localScale[2];
        parent = parent.parent;
    }
    return localScale;
}
phyObject.prototype.addForce = function(vec, offset) {
    if (vec.length !== 3) return;
    if (this.initialized === true) {
        var f = new Ammo.btVector3(vec[0], vec[1], vec[2]);
        if (!offset) this.body.applyForce(f);
        else {
            var o = new Ammo.btVector3(offset[0], offset[1], offset[2]);
            this.body.applyForce(f, o);
        }
        Ammo.destroy(f);
    }
}
//this is a global space force that is applied at every tick. Sort of a motor. Could be 
//used to do custom per object gravity.
phyObject.prototype.setConstantForce = function(vec) {
    if (vec) this.constantForce = new Ammo.btVector3(vec[0], vec[1], vec[2]);
    else this.constantForce = null;
}
//a constant torque applied at every tick
phyObject.prototype.setConstantTorque = function(vec) {
    if (vec) this.constantTorque = new Ammo.btVector3(vec[0], vec[1], vec[2]);
    else this.constantTorque = null;
}
phyObject.prototype.addTorque = function(vec) {
    if (vec.length !== 3) return;
    if (this.initialized === true) {
        var f = new Ammo.btVector3(vec[0], vec[1], vec[2]);
        this.body.applyTorque(f);
        //Ammo.destroy(f);
    }
}
phyObject.prototype.addForceImpulse = function(vec) {
    if (vec.length !== 3) return;
    if (this.initialized === true) {
        var f = new Ammo.btVector3(vec[0], vec[1], vec[2]);
        this.body.applyImpulse(f);
        Ammo.destroy(f);
    }
}
phyObject.prototype.addTorqueImpulse = function(vec) {
    if (vec.length !== 3) return;
    if (this.initialized === true) {
        var f = new Ammo.btVector3(vec[0], vec[1], vec[2])
        this.body.applyTorqueImpulse(f);
        Ammo.destroy(f);
    }
}
phyObject.prototype.addForceOffset = function(vec, pos) {
    if (vec.length !== 3) return;
    if (pos.length !== 3) return;
    if (this.initialized === true) {
        var f = new Ammo.btVector3(vec[0], vec[1], vec[2]);
        var g = new Ammo.btVector3(vec[0], vec[1], vec[2]);
        this.body.applyForce(f, g);
        Ammo.destroy(f);
        Ammo.destroy(g);
    }
}
phyObject.prototype.setLinearFactor = function(vec) {
    if (vec.length !== 3) return;
    this.linearFactor = vec;
    if (this.initialized === true) {
        var f = new Ammo.btVector3(vec[0], vec[1], vec[2]);
        this.body.setLinearFactor(f);
        Ammo.destroy(f);
    }
}
phyObject.prototype.getLinearFactor = function(vec) {
    return this.linearFactor;
}
phyObject.prototype.getAngularFactor = function(vec) {
    return this.linearFactor;
}
phyObject.prototype.setAngularFactor = function(vec) {
    if (vec.length !== 3) return;
    this.angularFactor = vec;
    if (this.initialized === true) {
        var f = new Ammo.btVector3(vec[0], vec[1], vec[2]);
        this.body.setAngularFactor(f);
        Ammo.destroy(f);
    }
}
phyObject.prototype.setMass = function(mass) {
    if (this.mass == mass) return;
    this.mass = mass;
    if (this.initialized === true) {
        var localInertia = new Ammo.btVector3();
        this.collision.calculateLocalInertia(this.mass, localInertia);
        this.body.setMassProps(this.mass, localInertia);
        this.body.updateInertiaTensor();
        Ammo.destroy(localInertia);
        //todo: need to inform parents that mass has changed, might require recompute of center of mass for compound body
    }
}
phyObject.prototype.initialize = function() {
    this.ready = true;
    //currently, only objects which are children of the world can be bodies
    if (this.enabled && this.parent.id == vwf.application() && this.initialized === false) {
        var mat = vwf.getProperty(this.id, 'transform');
        if (mat) this.setTransform(mat);
        this.initialized = true;
        console.log('init', this.id);
        var childCollisions = collectChildCollisions(this);
        this.localOffset = null;
        //this object has no child physics objects, so just use it's normal collision shape
        //  if(childCollisions.length == 1)
        //      this.collision = this.buildCollisionShape();
        //  else
        {
            //so, since we have child collision objects, we need to create a compound collision
            this.collision = new Ammo.btCompoundShape();
            this.collision.vwfID = this.id;
            var x = 0;
            var y = 0;
            var z = 0;
            for (var i = 0; i < childCollisions.length; i++) {
                //note!! at this point, this object must be a child of the scene, so transform === worldtransform
                var thisworldmatrix = vecset([], this.transform);
                var wmi = [];
                Mat4.invert(thisworldmatrix, wmi);
                var aslocal = Mat4.multMat(wmi, childCollisions[i].matrix, []);
                childCollisions[i].local = aslocal;
                //take into account that the collision body may be offset from the object center.
                //this is true with assets, but not with prims
                //crazy as it may seem, there is no need to take into account here the local scale
                //this is because we find the worldspace matrix between the child and this, thus flattening
                //any complex hierarchy of transforms under this node in the graph. This flattening starts with the
                //worldspace values, which already account for the scale.
                //aslocal[12] *= childCollisions[i].localScale[0];
                //aslocal[13] *= childCollisions[i].localScale[1];
                //aslocal[14] *= childCollisions[i].localScale[2];
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
                //careful not to set the childcollision scale when the child is actually this - otherwise we'd be setting it twice, once on the 
                //collision body and once on the compound body
                //if(childCollisions[i].node !== this)
                //    childCollisions[i].collision.setLocalScaling(new Ammo.btVector3(childCollisions[i].localScale[0], childCollisions[i].localScale[1], childCollisions[i].localScale[2]));
                this.collision.addChildShape(startTransform, childCollisions[i].collision);
            }
            //NANs can result from divide by zero. Be sure to use 0 instead of nan
            this.localOffset = [x || 0, y || 0, z || 0];
        }
        this.startTransform = new Ammo.btTransform();
        this.startTransform.setIdentity();
        var isDynamic = (this.mass != 0);
        var localInertia = new Ammo.btVector3(0, 0, 0);
        if (isDynamic) this.collision.calculateLocalInertia(this.mass, localInertia);
        // Ammo.destroy(localInertia);
        //localoffset is used to offset the center of mass from the pivot point of the parent object
        if (this.localOffset) {
            var f = new Ammo.btVector3(this.localOffset[0] * this.localScale[0], this.localOffset[1] * this.localScale[1], this.localOffset[2] * this.localScale[2]);
            this.startTransform.setOrigin(f);
            // Ammo.destroy(f);
        } else {
            var f = new Ammo.btVector3(0, 0, 0);
            this.startTransform.setOrigin(f);
            // Ammo.destroy(f);
        }
        var myMotionState = new Ammo.btDefaultMotionState(this.startTransform);
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(this.mass, myMotionState, this.collision, localInertia);
        this.body = new Ammo.btRigidBody(rbInfo);
        var damp = this.damping;
        this.body.setDamping(damp, damp);
        var fric = this.friction;
        this.body.setFriction(fric);
        var rest = this.restitution;
        this.body.setRestitution(rest);
        var f = new Ammo.btVector3(this.linearVelocity[0], this.linearVelocity[1], this.linearVelocity[2]);
        this.body.setLinearVelocity(f);
        // Ammo.destroy(f);
        var f = new Ammo.btVector3(this.angularVelocity[0], this.angularVelocity[1], this.angularVelocity[2]);
        this.body.setAngularVelocity(f);
        // Ammo.destroy(f);
        var f = new Ammo.btVector3(this.angularFactor[0], this.angularFactor[1], this.angularFactor[2])
        this.body.setAngularFactor(f);
        // Ammo.destroy(f);
        var f = new Ammo.btVector3(this.linearFactor[0], this.linearFactor[1], this.linearFactor[2]);
        this.body.setLinearFactor(f);
        // Ammo.destroy(f);
        this.body.forceActivationState(this.activationState);
        this.body.setDeactivationTime(this.deactivationTime);
        var mat = vwf.getProperty(this.id, 'transform');
        if (mat) this.setTransform(mat);
        //we must return through the kernel here so it knows that this is revelant to all instances of this node
        //not just the proto
        _PhysicsDriver.dirtyAssociatedJoints(this.id);
        this.world.addRigidBody(this.body);
        //so....... is this not handled by the cache and then set of properties that come in before initialize?
        var av = this.activationState;
        this.activationState = -1;
        vwf.setProperty(this.id, '___physics_activation_state', av);
        var dvt = this.deactivationTime;
        this.deactivationTime = -1;
        vwf.setProperty(this.id, '___physics_deactivation_time', dvt);
        var lin = this.linearVelocity;
        this.linearVelocity = null;
        vwf.setProperty(this.id, '___physics_linear_velocity', lin);
        this.linearVelocity = lin;
        var ang = this.angularVelocity;
        this.angularVelocity = null;
        vwf.setProperty(this.id, '___physics_angular_velocity', ang);
        this.angularVelocity = ang;
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
        this.linearVelocity = [vec.x(), vec.y(), vec.z()];
        return [vec.x(), vec.y(), vec.z()];
    } else return this.linearVelocity;
}
phyObject.prototype.setLinearVelocity = function(vel) {
    this.linearVelocity = vel;
    if (this.initialized === true) {
        var f = new Ammo.btVector3(vel[0], vel[1], vel[2]);
        this.body.setLinearVelocity(f);
        //Ammo.destroy(f);
    }
}
phyObject.prototype.setAngularVelocity = function(vel) {
    this.angularVelocity = vel;
    if (this.initialized === true) {
        var f = new Ammo.btVector3(vel[0], vel[1], vel[2]);
        this.body.setAngularVelocity(f);
        // Ammo.destroy(f);
    }
}
//note - we don't store up forces when the body is not initialized, so AddTorque called before init does nothing
//maybe we should? Not sure that forces are stateful
phyObject.prototype.getForce = function() {
    if (this.initialized === true) {
        var force = this.body.getTotalForce();
        return [force.x(), force.y(), force.z()];
    }
}
//this is probably not what you're looking for. Force is an instantanious value, it
//only has meaning within a tick cycle. This is only for replication. Use either addForce, addForceLocal
//or setConstantForce
phyObject.prototype.setForce = function(force) {
    if (this.initialized === true) {
        var f = new btVector3(force[0], force[1], force[2]);
        this.body.setTotalForce(f);
        //Ammo.destroy(f);
    }
}
phyObject.prototype.getTorque = function() {
    if (this.initialized === true) {
        var torque = this.body.getTotalTorque();
        return [torque.x(), torque.y(), torque.z()];
    }
}
//this is probably not what you're looking for. Torque is an instantanious value, it
//only has meaning within a tick cycle. This is only for replication. Use either addTorque 
//or setConstantTorque
phyObject.prototype.setTorque = function(torque) {
    if (this.initialized === true) {
        var f = new btVector3(torque[0], torque[1], torque[2]);
        this.body.setTotalTorque(f);
        //Ammo.destroy(f);
    }
}
phyObject.prototype.getAngularVelocity = function() {
    //waiting for an ammo build that includes body.getAngularVelocity
    if (this.initialized === true) {
        var vec = this.body.getAngularVelocity()
        this.angularVelocity = [vec.x(), vec.y(), vec.z()];
        return [vec.x(), vec.y(), vec.z()];
    } else return this.angularVelocity;
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
    if (this.enabled == true) return;
    this.enabled = true;
    if (this.parent.id !== vwf.application()) {
        this.markRootBodyCollisionDirty();
    }
    //must do this on next tick. Does that mean initialized is stateful and needs to be in a VWF property?
    if (this.initialized === false) {
        // this.initialize();
    }
}
//must be very careful with data the the physics engine changes during the sim
//can't return cached values if body is enabled because we'll refelct the data 
//from the JS engine and not the changed state of the physics
phyObject.prototype.getActivationState = function() {
    if (this.initialized === true) {
        this.activationState = this.body.getActivationState();
        return this.body.getActivationState();
    } else return this.activationState;
}
phyObject.prototype.setActivationState = function(state) {
    if (this.activationState == Number(state)) return;
    state = Number(state);
    if (this.initialized === true) {
        this.body.setActivationState(state);
        this.body.forceActivationState(state);
        this.activationState = state
    } else this.activationState = state;
}
phyObject.prototype.getDeactivationTime = function() {
    if (this.initialized === true) {
        this.deactivationTime = this.body.getDeactivationTime();
        return this.body.getDeactivationTime();
    } else return this.deactivationTime;
}
phyObject.prototype.setDeactivationTime = function(time) {
    if (this.initialized === true) {
        this.body.setDeactivationTime(time);
        this.deactivationTime = time;
    } else this.deactivationTime = time;
}
phyObject.prototype.disable = function() {
    if (this.enabled == false) return;
    this.enabled = false;
    if (this.parent.id !== vwf.application()) {
        this.markRootBodyCollisionDirty();
    }
    //can't do this! causes the kernel to sense ___physics_enabled as a delegated property
    //vwf.setProperty(this.id, 'transform', this.getTransform());
    if (this.initialized === true) {
        this.deinitialize();
    }
}
var tempvec1 = [0, 0, 0];
var tempvec2 = [0, 0, 0];
var tempvec3 = [0, 0, 0];
var tempquat1 = [0, 0, 0, 0];
var tempquat2 = [0, 0, 0, 0];
var tempquat3 = [0, 0, 0, 0];
var tempmat1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var tempmat2 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var tempmat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function vecset(newv, old) {
    for (var i = 0; i < old.length; i++) newv[i] = old[i];
    return newv;
}
phyObject.prototype.getTransform = function(outmat) {
    if (!outmat) outmat = [];
    if(!this.body)
    {
        outmat = vecset(outmat,this.transform);
        return outmat;
    }
    var transform = this.body.getWorldTransform();
    var o = transform.getOrigin();
    var rot = transform.getRotation();
    var pos = tempvec1;
    pos[0] = o.x();
    pos[1] = o.y();
    pos[2] = o.z();
    var quat = tempquat1;
    quat[0] = rot.x();
    quat[1] = rot.y();
    quat[2] = rot.z();
    quat[3] = rot.w();
    quat = Quaternion.normalize(quat, tempquat2);
    var mat = goog.vec.Quaternion.toRotationMatrix4(quat, tempmat1);
    mat[0] *= this.localScale[0];
    mat[1] *= this.localScale[0];
    mat[2] *= this.localScale[0];
    mat[4] *= this.localScale[1];
    mat[5] *= this.localScale[1];
    mat[6] *= this.localScale[1];
    mat[8] *= this.localScale[2];
    mat[9] *= this.localScale[2];
    mat[10] *= this.localScale[2];
    var worldoffset = goog.vec.Mat4.multVec3(mat, this.localOffset, tempmat2)
    mat[12] = pos[0] - worldoffset[0] / this.localScale[0];
    mat[13] = pos[1] - worldoffset[1] / this.localScale[1];
    mat[14] = pos[2] - worldoffset[2] / this.localScale[2];
    //since the value is orthonormal, scaling is easy.
    if (this.parent.id == vwf.application()) this.transform = vecset(this.transform, mat);
    outmat = vecset(outmat, mat);
    return outmat;
}

function ScaleFromMatrix(mat) {
    var x = [mat[0], mat[1], mat[2]];
    var y = [mat[4], mat[5], mat[6]];
    var z = [mat[8], mat[9], mat[10]];
    var scale = [MATH.lengthVec3(x), MATH.lengthVec3(y), MATH.lengthVec3(z)];
    scale[0] = Math.round(scale[0] * 10000000) / 10000000;
    scale[1] = Math.round(scale[1] * 10000000) / 10000000;
    scale[2] = Math.round(scale[2] * 10000000) / 10000000;
    return scale;
}
phyObject.prototype.setTransform = function(matrix) {
    matrix = Mat4.clone(matrix);
    var oldScale = vecset([], this.localScale);
    this.localScale = ScaleFromMatrix(matrix);
    matrix[0] /= this.localScale[0];
    matrix[1] /= this.localScale[0];
    matrix[2] /= this.localScale[0];
    matrix[4] /= this.localScale[1];
    matrix[5] /= this.localScale[1];
    matrix[6] /= this.localScale[1];
    matrix[8] /= this.localScale[2];
    matrix[9] /= this.localScale[2];
    matrix[10] /= this.localScale[2];
    //if(this.initialized === true && matComp(matrix,this.transform || [])) return;
    //todo: the compound collision of the parent does not need to be rebuild, just transforms updated
    //need new flag for this instead of full rebuild
    if (this.parent.id !== vwf.application() && this.enabled === true && !matComp(this.transform, matrix)) //if I'm part of a compound collsion
        this.markRootBodyCollisionDirty();
    else if (this.enabled === true && MATH.distanceVec3(this.localScale, oldScale) > .0001) //if I'm not part of a compound collision but my scale has changedd
    {
        this.markRootBodyCollisionDirty();
    } else if (this.initialized === true) { //if I'm not part of a compound collision but I've moved but not scaled
        this.transform = vecset(this.transform, matrix);
        if (this.parent.id !== vwf.application()) this.markRootBodyCollisionDirty();
        this.lastTickRotation = null;
        this.thisTickRotation = null;
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
        Ammo.destroy(q);
        this.body.setCenterOfMassTransform(startTransform);
        if (this.collision) {
            //update the localscaling
        }
        if (this.mass == 0) {}
    }
    this.transform = vecset(this.transform, matrix);;
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
    if (this.enabled === true && this.initialized === false) {
        //ahhhhhhhh almost missed this. we were loosing some state in the cached properties! They were never re-set after a re-initialize
        this.initialize();
    }
    if (this.initialized === true) {
        //these are applied in global space. You can cancel gravity for a specify object with a contant force of negative gravity
        if (this.constantForce) {
            this.body.activate();
            this.body.applyForce(this.constantForce);
        }
        if (this.constantTorque) {
            this.body.activate();
            this.body.applyTorque(this.constantTorque);
        }
    }
    if (this.collisionDirty && this.initialized === true) {
        var backupTrans = this.getTransform();
        this.deinitialize();
        this.initialize();
        //this.setLocalScaling(backupTrans);
        this.collisionDirty = false;
    }
}

function phySphere(id, world) {
    this.radius = 1;
    this.world = world;
    this.id = id;
    this.type = SPHERE;
    this.children = {};
    setupPhyObject(this, id, world);
}
phySphere.prototype = new phyObject();
phySphere.prototype.buildCollisionShape = function() {
    return new Ammo.btSphereShape(this.radius * this.getWorldScale()[0]);
}
phySphere.prototype.setRadius = function(radius) {
    if (this.radius == radius) return;
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
    setupPhyObject(this, id, world);
}
phyBox.prototype = new phyObject();
phyBox.prototype.buildCollisionShape = function() {
    var f = new Ammo.btVector3(this.length * this.getWorldScale()[0], this.width * this.getWorldScale()[1], this.height * this.getWorldScale()[2]);
    return new Ammo.btBoxShape(f);
}
phyBox.prototype.setLength = function(length) {
    if (this.length == length / 2) return;
    this.length = length / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}
phyBox.prototype.setWidth = function(width) {
    if (this.width == width / 2) return;
    this.width = width / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}
phyBox.prototype.setHeight = function(height) {
    if (this.height == height / 2) return;
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
    setupPhyObject(this, id, world);
}
phyCylinder.prototype = new phyObject();
phyCylinder.prototype.buildCollisionShape = function() {
    return new Ammo.btCylinderShapeZ(new Ammo.btVector3(this.radius * this.getWorldScale()[0], this.radius * this.getWorldScale()[1], this.height * this.getWorldScale()[2]));
}
phyCylinder.prototype.setRadius = function(radius) {
    if (this.radius == radius) return;
    this.radius = radius;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}
phyCylinder.prototype.setHeight = function(height) {
    if (this.height == height / 2) return;
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
    setupPhyObject(this, id, world);
}
phyCone.prototype = new phyObject();
phyCone.prototype.buildCollisionShape = function() {
    return new Ammo.btConeShapeZ(this.radius * this.getWorldScale()[0], this.height * this.getWorldScale()[1]);
}
phyCone.prototype.setRadius = function(radius) {
    if (this.radius == radius) return;
    this.radius = radius;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}
phyCone.prototype.setHeight = function(height) {
    if (this.height == height) return;
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
    setupPhyObject(this, id, world);
}
phyPlane.prototype = new phyObject();
phyPlane.prototype.buildCollisionShape = function() {
    return new Ammo.btBoxShape(new Ammo.btVector3(this.length * this.getWorldScale()[0], this.width * this.getWorldScale()[1], .001));
}
phyPlane.prototype.setLength = function(length) {
    if (this.length == length / 2) return;
    this.length = length / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}
phyPlane.prototype.setWidth = function(width) {
    if (this.width == width / 2) return;
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
    setupPhyObject(this, id, world);
}
phyAsset.prototype = new phyObject();
phyAsset.prototype.setMass = function(mass) {
    if (!this.colType !== MESH) phyObject.prototype.setMass.call(this, mass);
    else phyObject.prototype.setMass.call(this, 0);
}
//because a mesh may have geometry offset from the center, we must build a compound shape with an offset
phyAsset.prototype.buildCollisionShape = function() {
    var compound = new Ammo.btCompoundShape();
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.getOrigin().setX(this.collisionBodyOffsetPos[0]);
    transform.getOrigin().setY(this.collisionBodyOffsetPos[1]);
    transform.getOrigin().setZ(this.collisionBodyOffsetPos[2]);
    //var q = new Ammo.btQuaternion(this.collisionBodyOffsetRot[0], this.collisionBodyOffsetRot[1], this.collisionBodyOffsetRot[2], this.collisionBodyOffsetRot[3]);
    //transform.setRotation(q);
    var col = this.buildCollisionShapeInner();
    if (col) {
        compound.addChildShape(transform, col);
        compound.setLocalScaling(new Ammo.btVector3(this.getWorldScale()[0], this.getWorldScale()[1], this.getWorldScale()[2]));
        return compound;
    }
    return null;
}
phyAsset.prototype.buildCollisionShapeInner = function() {
    if (this.colType == PLANE) return new Ammo.btBoxShape(new Ammo.btVector3(this.length * this.getWorldScale()[0], this.width * this.getWorldScale()[1], .001));
    if (this.colType == CONE) return new Ammo.btConeShapeZ(this.radius * this.getWorldScale()[0], this.height * this.getWorldScale()[1]);
    if (this.colType == CYLINDER) return new Ammo.btCylinderShapeZ(new Ammo.btVector3(this.radius * this.getWorldScale()[0], this.height * this.getWorldScale()[1], this.height * this.getWorldScale()[1]));
    if (this.colType == SPHERE) return new Ammo.btSphereShape(this.radius * this.getWorldScale()[0]);
    if (this.colType == BOX) return new Ammo.btBoxShape(new Ammo.btVector3(this.length * this.getWorldScale()[0], this.width * this.getWorldScale()[1], this.height * this.getWorldScale()[2]));
    if (this.colType == MESH) {
        return this.buildMeshCollision();
        //here be dragons
    }
}
phyAsset.prototype.setLength = function(length) {
    if (this.length == length / 2) return;
    this.length = length / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}
phyAsset.prototype.setWidth = function(width) {
    if (this.width == width / 2) return;
    this.width = width / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}
phyAsset.prototype.setHeight = function(height) {
    if (this.height == height / 2) return;
    this.height = height / 2;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}
phyAsset.prototype.setRadius = function(radius) {
    if (this.radius == radius) return;
    this.radius = radius;
    if (this.initialized === true) {
        this.collisionDirty = true;
        this.markRootBodyCollisionDirty();
    }
}
phyAsset.prototype.buildMeshCollision = function() {
    var threejsNode = _Editor.findviewnode(this.id);
    //so, we are going to find all child meshes, and find the matrix that puts their geometry into the coordspace of this node
    //NOTE: deal here with children? Might not want to collect children that are part of different VWF node?
    var list = [];
    threejsNode.updateMatrixWorld(true)
    var selfmat = threejsNode.matrixWorld.clone();
    var selfI = new THREE.Matrix4();
    selfI.getInverse(selfmat);
    var walk = function(tn) {
        for (var i = 0; i < tn.children.length; i++) walk(tn.children[i]);
        if (tn instanceof THREE.Mesh) {
            var lmat = tn.matrixWorld.clone();
            lmat = (new THREE.Matrix4()).multiplyMatrices(selfI, lmat);
            list.push({
                mat: lmat,
                mesh: tn
            })
        }
    }
    walk(threejsNode);
    var triangle_mesh = new Ammo.btTriangleMesh();
    // well, this seems right, but I can't find where the collision body actually ended up
    for (var i in list) {
        if (list[i].mesh.geometry && list[i].mesh.geometry instanceof THREE.Geometry) {
            for (var j = 0; j < list[i].mesh.geometry.faces.length; j++) {
                var face = list[i].mesh.geometry.faces[j];
                var v1 = list[i].mesh.geometry.vertices[face.a];
                var v2 = list[i].mesh.geometry.vertices[face.b];
                var v3 = list[i].mesh.geometry.vertices[face.c];
                v1 = v1.clone().applyMatrix4(list[i].mat);
                v2 = v2.clone().applyMatrix4(list[i].mat);
                v3 = v3.clone().applyMatrix4(list[i].mat);
                triangle_mesh.addTriangle(new Ammo.btVector3(v1.x, v1.y, v1.z), new Ammo.btVector3(v2.x, v2.y, v2.z), new Ammo.btVector3(v3.x, v3.y, v3.z), false);
            }
        }
    }
    var shape = new Ammo.btBvhTriangleMeshShape(triangle_mesh, true, true);
    //Cool, not list contains all the meshes
    return shape;
}
phyAsset.prototype.setType = function(type) {
    if (this.colType == type) return;
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
        this.collisionBodyOffsetPos = [0, 0, 0];
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
    if (this.type == MESH) return;
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
            this.bodiesToID = {};
            this.jointBodyMap = {};
            var self = this;
            window.findphysicsnode = function(id) {
                return self.allNodes[id];
            };
            window._PhysicsDriver = this;
            //patch ammo.js to include a get for activation state
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
        testConstraint: function(id, id1, id2) {
            this.allNodes[id] = new phyPointToPointJoint(id, this.allNodes[vwf.application()].world, this);
            this.allNodes[id].setBodyAID(id1);
            this.allNodes[id].setBodyBID(id2);
        },
        // == Model API ============================================================================
        // -- creatingNode -------------------------------------------------------------------------
        dirtyAssociatedJoints: function(nodeID) {
            for (var i in this.jointBodyMap)
                for (var j in this.jointBodyMap[i])
                    if (this.jointBodyMap[i][j] == nodeID) this.allNodes[i].setDirty();
        },
        creatingNode: function(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName, callback /* ( ready ) */ ) {
            if (childID === vwf.application()) {
                this.nodes[vwf.application()] = {
                    world: null,
                    type: SCENE,
                    initialized: false,
                    children: {},
                    id: childID,
                    simulationSteps: 10,
                    active: true,
                    ground: null,
                    localScale: [1, 1, 1]
                }
                this.allNodes[vwf.application()] = this.nodes[vwf.application()];
                this.resetWorld();
            }
            //node ID 
            //the parent does not exist, so.....
            if (!this.allNodes[nodeID]) return;
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
            if (nodeID && hasPrototype(childID, 'pointConstraint-vwf')) {
                this.allNodes[nodeID].children[childID] = new phyPointToPointJoint(childID, this.allNodes[vwf.application()].world, this);
            }
            if (nodeID && hasPrototype(childID, 'hingeConstraint-vwf')) {
                this.allNodes[nodeID].children[childID] = new phyHingeJoint(childID, this.allNodes[vwf.application()].world, this);
            }
            if (nodeID && hasPrototype(childID, 'sliderConstraint-vwf')) {
                this.allNodes[nodeID].children[childID] = new phySliderJoint(childID, this.allNodes[vwf.application()].world, this);
            }
            if (nodeID && hasPrototype(childID, 'fixedConstraint-vwf')) {
                this.allNodes[nodeID].children[childID] = new phyFixedJoint(childID, this.allNodes[vwf.application()].world, this);
            }
            if (nodeID && (hasPrototype(childID, 'asset-vwf') || hasPrototype(childID, 'sandboxGroup-vwf'))) {
                this.allNodes[nodeID].children[childID] = new phyAsset(childID, this.allNodes[vwf.application()].world);
            }
            //child was created
            if (this.allNodes[nodeID] && this.allNodes[nodeID].children[childID]) {
                this.allNodes[childID] = this.allNodes[nodeID].children[childID];
                this.allNodes[childID].parent = this.allNodes[nodeID];
                //mark some initial properties
                if (this.allNodes[nodeID].children[childID] instanceof phyObject) {
                    vwf.setProperty(childID, '___physics_activation_state', 1);
                    vwf.setProperty(childID, '___physics_deactivation_time', 0);
                    vwf.setProperty(childID, '___physics_velocity_linear', [0, 0, 0]);
                    vwf.setProperty(childID, '___physics_velocity_angular', [0, 0, 0]);
                }
            }
        },
        oldCollisions: {},
        triggerCollisions: function() {
            var i, offset,
                dp = this.nodes[vwf.application()].world.getDispatcher(),
                num = dp.getNumManifolds(),
                manifold, num_contacts, j, pt,
                _collided = false;
            var newCollisions = {}
            for (i = 0; i < num; i++) {
                manifold = dp.getManifoldByIndexInternal(i);
                num_contacts = manifold.getNumContacts();
                if (num_contacts === 0) {
                    continue;
                }
                for (j = 0; j < num_contacts; j++) {
                    pt = manifold.getContactPoint(j);
                    //if ( pt.getDistance() < 0 ) {
                    var body0 = manifold.getBody0();
                    var body1 = manifold.getBody1();
                    var vwfIDA = this.bodiesToID[body0.ptr];
                    var vwfIDB = this.bodiesToID[body1.ptr];
                    var _vector0 = pt.get_m_normalWorldOnB();
                    var pt2a = pt.getPositionWorldOnA();
                    var pt2b = pt.getPositionWorldOnB();
                    var collisionPointA = [pt2a.x(), pt2a.y(), pt2a.y()];
                    var collisionPointB = [pt2b.x(), pt2b.z(), pt2b.z()];
                    var collisionNormal = [_vector0.x(), _vector0.y(), _vector0.z()]
                    var collision = {
                        collisionPointA: collisionPointA,
                        collisionPointB: collisionPointB,
                        collisionNormal: collisionNormal
                    };
                    if (!this.oldCollisions[vwfIDA] || this.oldCollisions[vwfIDA].indexOf(vwfIDB) === -1) vwf.callMethod(vwfIDA, 'collision', [vwfIDB, collision]);
                    if (!this.oldCollisions[vwfIDB] || this.oldCollisions[vwfIDB].indexOf(vwfIDA) === -1) vwf.callMethod(vwfIDB, 'collision', [vwfIDA, collision]);
                    if (!newCollisions[vwfIDA]) newCollisions[vwfIDA] = [];
                    if (!newCollisions[vwfIDB]) newCollisions[vwfIDB] = [];
                    newCollisions[vwfIDA].push(vwfIDB);
                    newCollisions[vwfIDB].push(vwfIDA);
                    break;
                }
            }
            this.oldCollisions = newCollisions;
        },
        ticking: function() {
            delete this.pendingReset;
            if (this.nodes[vwf.application()] && this.nodes[vwf.application()].active === true) {
                var nodekeys = Object.keys(this.allNodes).sort();
                for (var g =0; g < nodekeys.length; g++) {
                    var node = this.allNodes[nodekeys[g]];
                    if (node && node.update) {
                        node.update();
                        var propkeys = Object.keys(node.delayedProperties || {});
                        for (var i =0; i < propkeys.length; i++) {
                            this.settingProperty(node.id, propkeys[i], node.delayedProperties[propkeys[i]]);
                        }
                        delete node.delayedProperties;
                        if (node.body) this.bodiesToID[node.body.ptr] = node.id;
                    }
                }
                //step 50ms per tick.
                //this is dictated by the input from the reflector
                this.nodes[vwf.application()].world.stepSimulation(1 / 20, 1, 1 / 20);
                this.reEntry = true;
                var tempmat = [];
                var nodekeys = Object.keys(this.allNodes).sort();
                 for (var i =0; i < nodekeys.length; i++) {
                    var node = this.allNodes[nodekeys[i]];
                    if (node.body && node.initialized === true && node.mass > 0 && node.getActivationState() != 2) {
                        vwf.setProperty(node.id, 'transform', node.getTransform(tempmat));
                        //so, we were setting these here in order to inform the kernel that the property changed. Can we not do this, and 
                        //rely on the getter? that would be great....
                        vwf.setProperty(node.id, '___physics_activation_state', node.getActivationState());
                        vwf.setProperty(node.id, '___physics_velocity_angular', node.getAngularVelocity());
                        vwf.setProperty(node.id, '___physics_velocity_linear', node.getLinearVelocity());
                        vwf.setProperty(node.id, '___physics_deactivation_time', node.getDeactivationTime());
                    }if(node.joint)
                    {
                         vwf.setProperty(node.id, 'transform', node.getTransform(tempmat));
                    }

                }
                this.triggerCollisions();
                this.reEntry = false;
            } else {}
        },
        // -- initializingNode ---------------------------------------------------------------------
        initializingNode: function(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName) {
            if (!this.allNodes[nodeID]) return;
            var node = this.allNodes[nodeID].children[childID];
            if (node) node.ready = true;
            if (node && node.initialized === false) {
                node.initialize(this.nodes[vwf.application()].world);
                for (var i in node.delayedProperties) {
                    this.settingProperty(node.id, i, node.delayedProperties[i]);
                }
                delete node.delayedProperties;
                if (node.body) this.bodiesToID[node.body.ptr] = childID;
            }
        },
        // -- deletingNode -------------------------------------------------------------------------
        deletingNode: function(nodeID) {
            var node = this.allNodes[nodeID];
            if (node) {
                if (node instanceof phyObject) this.dirtyAssociatedJoints(nodeID);
                if (node instanceof phyJoint) delete this.jointBodyMap[nodeID]
                delete node.parent.children[nodeID];
                node.parent = null;
                node.deinitialize();
                delete this.allNodes[nodeID];
                node = null;
            }
        },
        // -- creatingProperty ---------------------------------------------------------------------
        creatingProperty: function(nodeID, propertyName, propertyValue) {
            return this.initializingProperty(nodeID, propertyName, propertyValue);
        },
        // -- initializingProperty -----------------------------------------------------------------
        initializingProperty: function(nodeID, propertyName, propertyValue) {
            return this.settingProperty(nodeID, propertyName, propertyValue);
        },
        resetWorld: function() {
            
            this.pendingReset = true;
            //here, we must reset the world whenever a new client joins. This is because the new client must be aligned. They will be 
            //initializing the world in a given state. There is stateful information internal to the physics engine that can only be reset on the other clients
            //by rebuilding the whole sim on each.
            var world = this.allNodes[vwf.application()].world;
            var IDs_to_enable = [];
            if (world) {

                var nodekeys = Object.keys(this.allNodes).sort();
                for (var i in nodekeys) {

                    var node = this.allNodes[nodekeys[i]];
                    if (vwf.getProperty(nodekeys[i], "___physics_enabled")) {
                        //call the getters, because they will cache the values to survive the reset
                        //var backupTrans = node.getTransform();
                        //node.backupTrans = backupTrans;
                        this.settingProperty(nodekeys[i], "___physics_enabled", false);
                        IDs_to_enable.push(nodekeys[i]);
                    }
                }
                world.removeRigidBody(this.allNodes[vwf.application()].ground);
                for (var i in nodekeys) {
                    var node = this.allNodes[nodekeys[i]];
                    if (node.deinitialize) node.deinitialize();
                    node.world = null;
                }
                delete this.allNodes[vwf.application()].world;
                Ammo.destroy(world);
            }
            var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(); // every single |new| currently leaks...
            var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
            var overlappingPairCache = new Ammo.btDbvtBroadphase();
            var solver = new Ammo.btSequentialImpulseConstraintSolver();
            var dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
            dynamicsWorld.setGravity(new Ammo.btVector3(0, 0, -9.8));
            this.allNodes[vwf.application()].world = dynamicsWorld;
            world = dynamicsWorld;
            var groundShape = new Ammo.btBoxShape(new Ammo.btVector3(500, 500, .1));
            var groundTransform = new Ammo.btTransform();
            groundTransform.setIdentity();
            groundTransform.setOrigin(new Ammo.btVector3(0, 0, 0));
            var mass = 0;
            var isDynamic = mass !== 0;
            var localInertia = new Ammo.btVector3(0, 0, 0);
            var myMotionState = new Ammo.btDefaultMotionState(groundTransform);
            var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, groundShape, localInertia);
            var body = new Ammo.btRigidBody(rbInfo);
            body.setDamping(1, 1);
            body.setFriction(.7);
            body.setRestitution(.4);
            this.allNodes[vwf.application()].ground = body;
            world.addRigidBody(this.allNodes[vwf.application()].ground);
            //we need to see if adding the node back to the world is enough, or if we really have to kill and rebuild
            //research seems to indicate that you could just recreate the world but not all the bodies
            //but that did not work here, it needs to delay to next tick.
            for (var j = 0; j < IDs_to_enable.length; j++) {
                var i = IDs_to_enable[j];
                var node = this.allNodes[i];
                node.world = world;
                if (node.world && i != vwf.application()) {
                    node.world = world;
                    node.initialized = false;
                    node.ready = true;
                    vwf.setProperty(i, "___physics_enabled", true);
                }
            }
            //this.reinit();
        },
        firingEvent: function(nodeID, eventName, params) {
            if (nodeID == vwf.application() && eventName == 'clientConnected') {}
        },
        // TODO: deletingProperty
        callingMethod: function(nodeID, methodName, args) {
            //dont try to set the parent
            if (!this.allNodes[nodeID]) return;
            //don't allow reentry since this driver can both get and set transform
            if (this.reEntry === true) return;
            var node = this.allNodes[nodeID];
            if (methodName === '___physics_addForce') {
                node.addForce(args[0]);
            }
            if (methodName === '___physics_addForceOffset') {
                node.addForce(args[0], args[1]);
            }
            if (methodName === '___physics_addTorque') {
                node.addTorque(args[0]);
            }
            if (methodName == '___physics_world_reset') {
                //if a client joins (who is not myself), I need to reset.
                //note that the timing of this call has been carefully examined. There can be no model changes (especially in the physics)
                //between the GetState being sent to the load client, and this event occuring. 
                // if(vwf.moniker() != args[0])
                {
                    console.log('reset world to sync late joining cleent at', vwf.getProperty(vwf.application(),'simTime'));
                    if (!this.pendingReset) this.resetWorld();
                }
            }
        },
        settingProperty: function(nodeID, propertyName, propertyValue) {
            //dont try to set the parent
            if (!this.allNodes[nodeID]) return;
            //don't allow reentry since this driver can both get and set transform
            if (this.reEntry === true) return;
            var node = this.allNodes[nodeID];
            if (node.ready === false) {
                if (!node.delayedProperties) node.delayedProperties = {};
                node.delayedProperties[propertyName] = propertyValue;
            } else {
                if (node.body) delete this.bodiesToID[node.body.ptr];
                if (propertyName === '___physics_gravity' && node.id === vwf.application()) {
                    var g = new Ammo.btVector3(propertyValue[0], propertyValue[1], propertyValue[2]);
                    node.world.setGravity(g);
                    Ammo.destroy(g);
                }
                if (propertyName === '___physics_active' && node.id === vwf.application()) {
                    node.active = propertyValue;
                }
                if (propertyName === '___physics_accuracy' && node.id === vwf.application()) {
                    node.simulationSteps = propertyValue;
                }
                if (propertyName == "transform") {
                    node.setTransform(propertyValue);
                    if (node instanceof phyObject) this.dirtyAssociatedJoints(nodeID);
                    else if (node instanceof phyJoint) node.setDirty();
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

                    if (propertyValue === true) node.enable();
                    if (propertyValue === false) node.disable();
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
                if (propertyName === '___physics_activation_state') {
                    node.setActivationState(propertyValue);
                }
                if (propertyName === '___physics_deactivation_time') {
                    node.setDeactivationTime(propertyValue);
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
                if (propertyName === '___physics_factor_angular') {
                    node.setAngularFactor(propertyValue);
                }
                if (propertyName === '___physics_factor_linear') {
                    node.setLinearFactor(propertyValue);
                }
                if (propertyName === '___physics_constant_force') {
                    node.setConstantForce(propertyValue);
                }
                if (propertyName === '___physics_constant_torque') {
                    node.setConstantTorque(propertyValue);
                }
                if (propertyName === '___physics_joint_body_A') {
                    node.setBodyAID(propertyValue);
                }
                if (propertyName === '___physics_joint_body_B') {
                    node.setBodyBID(propertyValue);
                }
                if(propertyName === '___physics_joint_slider_lower_lin_limit')
                {
                    node.setLowerLinLimit(propertyValue);
                }
                if(propertyName === '___physics_joint_slider_upper_lin_limit')
                {
                    node.setUpperLinLimit(propertyValue);
                }
                if(propertyName === '___physics_joint_hinge_lower_ang_limit')
                {
                    node.setLowerAngLimit(propertyValue);
                }
                if(propertyName === '___physics_joint_hinge_upper_ang_limit')
                {
                    node.setUpperAngLimit(propertyValue);
                }

                
                //this is a hack
                //find a better way. Maybe delete the old key from the map above
                if (node.body) this.bodiesToID[node.body.ptr] = nodeID;


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
            if (node instanceof phyObject) {
                if (propertyName === '___physics_activation_state') {
                    return node.getActivationState();
                }
                if (propertyName === '___physics_deactivation_time') {
                    return node.getDeactivationTime();
                }
                if (propertyName === '___physics_velocity_linear') {
                    return node.getLinearVelocity();
                }
                if (propertyName === '___physics_velocity_angular') {
                    return node.getAngularVelocity();
                }
            }
            if (node instanceof phyJoint) {}
        },
    });

    function hasPrototype(nodeID, prototype) {
        if (!nodeID) return false;
        if (nodeID == prototype) return true;
        else return hasPrototype(vwf.prototype(nodeID), prototype);
    }
});