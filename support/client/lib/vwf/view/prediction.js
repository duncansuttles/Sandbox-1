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

define(["module", "vwf/view", "vwf/view/prediction/javascript", "vwf/view/prediction/object", "vwf/view/prediction/kernel"], function(module, view) {

    // vwf/model/object.js is a backstop property store.


    return view.load(module, {

        // == Module Definition ====================================================================

        // -- initialize ---------------------------------------------------------------------------
        initialize: function() {


            var kernel = require("vwf/view/prediction/kernel");
            window.vwfPredict = kernel;
            this.predictKernel = kernel;
            this.predictKernel.initialize();
            this.predictions = {};
            this.time = 0;
            window._dPrediction = this;

        },
        getProperty: function(nodeID, name) {
            return this.predictKernel.getProperty(nodeID, name);
        },
        calledMethod: function(nodeID, method, args) {
            this.predictKernel.callMethod(nodeID, method, args);
        },
        callMethod: function(nodeID, method, args) {
            this.predictKernel.callMethod(nodeID, method, args);
        },
        createdChild:function(nodeID,childName,childComponent,childURI,callback_async)
        {    
            callback_async();
            return;
            try{
            console.log(nodeID,childName,childComponent,childURI);
            window.inPrediction = true;
            this.predictKernel.createChild(nodeID,childName,childComponent,childURI,function(){
                window.inPrediction = false;
                callback_async();
            });
            }catch(e)
            {
                callback_async();
            }
        },
        createdNode: function(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childURI, childName, callback /* ( ready ) */ ) {
            //this.predictions[childID] = {};
            //this.predictKernel.createNode(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childURI, childName, callback /* ( ready ) */ );
        },
        

        // -- initializingNode ---------------------------------------------------------------------

        initializedNode: function(nodeID, childID) {

        },

        // -- deletingNode -------------------------------------------------------------------------

        deletedNode: function(nodeID) {
            delete this.predictions[nodeID];
            this.predictKernel.deletingNode(nodeID);
        },

        addedChild: function(nodeID, childID, childName) {

        },


        removedChild: function(nodeID, childID) {

        },


        satProperties: function(nodeID, properties) {

        },

        // -- gettingProperties --------------------------------------------------------------------

        gotProperties: function(nodeID, properties) {

        },

        // -- creatingProperty ---------------------------------------------------------------------

        createdProperty: function(nodeID, propertyName, propertyValue) {
            return this.initializedProperty(nodeID, propertyName, propertyValue);
        },

        // -- initializingProperty -----------------------------------------------------------------

        initializedProperty: function(nodeID, propertyName, propertyValue) {
            return this.satProperty(nodeID, propertyName, propertyValue);
        },

        // TODO: deletingProperty

        // -- settingProperty ----------------------------------------------------------------------

        satProperty: function(nodeID, propertyName, propertyValue) {



            //update the prediction model with inputs from other users
            //don't input my own, since the prediction kernel gets them instantly
            if (vwf.client() != vwf.moniker()) {
                this.predictKernel.setProperty(nodeID, propertyName, propertyValue);
            }



        },
        setProperty: function(nodeID, propertyName, propertyValue) {

            

            this.predictKernel.setProperty(nodeID, propertyName, propertyValue);
        },

        // -- gettingProperty ----------------------------------------------------------------------

        gotProperty: function(nodeID, propertyName) {
            return this.predictKernel.getProperty(nodeID, propertyName);
        },
        ticked: function() {
            if (this.time <= vwf.time()) {
                this.predictKernel.ticking();
                this.time = vwf.time();
            } else {
                //already predicted this tick
            }
        },
        predictTick: function() {
            this.time += .05;
            this.predictKernel.ticking();
        },
        dispatchEvent: function(nodeID, eventName, eventParameters, eventNodeParameters) {
           // this.predictKernel.dispatchEvent(nodeID, eventName, eventParameters, eventNodeParameters);
        },
        dispatchedEvent: function(nodeID, eventName, eventParameters, eventNodeParameters) {
          //  if (vwf.client() != vwf.moniker()) {
          //      this.predictKernel.dispatchEvent(nodeID, eventName, eventParameters, eventNodeParameters);
          //  }
        },
        satState:function(state,cb)
        {
            debugger;
            this.predictKernel.setState(state,cb);
        }
        // -- name_source_type --------------------------------------------------------------------
    });

});