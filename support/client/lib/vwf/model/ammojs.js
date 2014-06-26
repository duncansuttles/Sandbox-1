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

define(["module", "vwf/model", "vwf/configuration"], function(module, model, configuration) {

    var SCENE = 0;
    var SPHERE = 1;
    return model.load(module, {

        // == Module Definition ====================================================================

        // -- initialize ---------------------------------------------------------------------------

        reEntry: false,
        initialize: function() {
            this.nodes = {};
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


                var groundShape = new Ammo.btBoxShape(new Ammo.btVector3(50, 50, .1));



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

                dynamicsWorld.addRigidBody(body);

                this.nodes[vwf.application()] = {
                    world: dynamicsWorld,
                    type: SCENE,
                    initialized: false,
                    children: [],
                    id: childID
                }



            }
            //node ID 
            if (nodeID && hasPrototype(childID, 'sphere2-vwf')) {

                this.nodes[nodeID].children[childID] = {
                    world: dynamicsWorld,
                    type: SPHERE,
                    children: [],
                    initialized: false,
                    id: childID,
                    mass: 1,
                    radius: 1
                };

            }

        },
        btTransformToVWF: function(transform) {
            var o = transform.getOrigin();
            var rot = transform.getRotation();
            var pos = [o.x(), o.y(), o.z()];
            var quat = [rot.x(), rot.y(), rot.z(), rot.w()];
            quat = Quaternion.normalize(quat, []);
            var mat = goog.vec.Quaternion.toRotationMatrix4(quat, []);
            mat[12] = pos[0];
            mat[13] = pos[1];
            mat[14] = pos[2];
            return mat;
        },
        walkAndUpdate: function(node) {
            if (node.body && node.initialized === true) {

                var transform = node.body.getWorldTransform();
                vwf.setProperty(node.id, 'transform', this.btTransformToVWF(transform));

            }
            for (var i in node.children)
                this.walkAndUpdate(node.children[i]);

        },
        ticking: function() {
            if (this.nodes[vwf.application()]) {
                //step 50ms per tick.
                //this is dictated by the input from the reflector
                this.nodes[vwf.application()].world.stepSimulation(1 / 20, 10);
                this.reEntry = true;
                this.walkAndUpdate(this.nodes[vwf.application()]);
                this.reEntry = false;
            }
        },
        // -- initializingNode ---------------------------------------------------------------------

        initializingNode: function(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName) {

            if (!this.nodes[nodeID]) return;

            var node = this.nodes[nodeID].children[childID];
            if (node && node.initialized === false && node.type === SPHERE) {
                node.initialized = true;

                var colShape = new Ammo.btSphereShape(1);

                var startTransform = new Ammo.btTransform();
                startTransform.setIdentity();

                var mass = 1;
                var isDynamic = (mass != 0);

                var localInertia = new Ammo.btVector3(0, 0, 0);
                if (isDynamic)
                    colShape.calculateLocalInertia(mass, localInertia);

                startTransform.setOrigin(new Ammo.btVector3(0, 0, 0));

                var myMotionState = new Ammo.btDefaultMotionState(startTransform);
                var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, colShape, localInertia);
                var body = new Ammo.btRigidBody(rbInfo);

                this.nodes[vwf.application()].world.addRigidBody(body);

                node.body = body;
                node.collision = colShape;
                for (var i in node.delayedProperties) {
                    this.settingProperty(node.id, i, node.delayedProperties[i]);
                }
                delete node.delayedProperties;

            }

        },

        // -- deletingNode -------------------------------------------------------------------------

        deletingNode: function(nodeID) {

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

        // -- settingProperty ----------------------------------------------------------------------
        setBodyTransform: function(body, matrix) {


            var startTransform = new Ammo.btTransform();
            startTransform.getOrigin().setX(matrix[12]);
            startTransform.getOrigin().setY(matrix[13]);
            startTransform.getOrigin().setZ(matrix[14]);

            var quat = [];
            Quaternion.fromRotationMatrix4(matrix, quat);
            quat = Quaternion.normalize(quat, []);
            startTransform.getRotation().setX(quat[0]);
            startTransform.getRotation().setY(quat[1]);
            startTransform.getRotation().setZ(quat[2]);
            startTransform.getRotation().setW(quat[3]);

            body.setCenterOfMassTransform(startTransform);
            body.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
            body.setAngularVelocity(new Ammo.btVector3(0, 0, 0))


        },
        settingProperty: function(nodeID, propertyName, propertyValue) {

            //dont try to set the parent
            if (!this.nodes[vwf.parent(nodeID)]) return;

            //don't allow reentry since this driver can both get and set transform
            if (this.reEntry === true) return;

            var node = this.nodes[vwf.parent(nodeID)].children[nodeID];
            if (node.initialized === false) {
                if (!node.delayedProperties)
                    node.delayedProperties = {};
                node.delayedProperties[propertyName] = propertyValue;
            } else {
                if (propertyName == "transform") {
                    this.setBodyTransform(node.body, propertyValue)
                }
                if (propertyName == "radius" && node.type === SPHERE) {

                    node.collision.setLocalScaling(new Ammo.btVector3(propertyValue, propertyValue, propertyValue));

                }
            }

        },

        // -- gettingProperty ----------------------------------------------------------------------

        gettingProperty: function(nodeID, propertyName, propertyValue) {

        },
    });

    function hasPrototype(nodeID, prototype) {
        if (!nodeID) return false;
        if (nodeID == prototype)
            return true;
        else return hasPrototype(vwf.prototype(nodeID), prototype);
    }

});