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

define( [ "module", "vwf/view","vwf/view/prediction/javascript","vwf/view/prediction/object","vwf/view/prediction/kernel"  ], function( module, view ) {

    // vwf/model/object.js is a backstop property store.

    return view.load( module, {

        // == Module Definition ====================================================================

        // -- initialize ---------------------------------------------------------------------------
        initialize: function() {
            
            
            var kernel = require("vwf/view/prediction/kernel");
            this.predictKernel = kernel;
            this.predictKernel.initialize();
            this.predictions = {};
            this.time = 0;
        },
        getProperty:function(nodeID, name)
        {
            return this.predictKernel.getProperty(nodeID,name);
        },
        calledMethod:function(nodeID,method,args)
        {
            this.predictKernel.callMethod(nodeID,method,args);
        },
        callMethod:function(nodeID,method,args)
        {
            this.predictKernel.callMethod(nodeID,method,args);
        },
        createdNode: function( nodeID, childID, childExtendsID, childImplementsIDs,childSource, childType, childURI, childName, callback /* ( ready ) */ ) {

            this.predictions[childID] = {};

            this.predictKernel.creatingNode(nodeID, childID, childExtendsID, childImplementsIDs,childSource, childType, childURI, childName, callback /* ( ready ) */);
        },

        // -- initializingNode ---------------------------------------------------------------------

        initializedNode: function( nodeID, childID ) {

        },

        // -- deletingNode -------------------------------------------------------------------------

        deletedNode: function( nodeID ) {
            delete this.predictions[nodeID];
           this.predictKernel.deletingNode(nodeID);
        },

         addedChild: function( nodeID, childID, childName ) { 

         },

  
         removedChild: function( nodeID, childID ) {

         },

  
        satProperties: function( nodeID, properties ) {

        },

        // -- gettingProperties --------------------------------------------------------------------

        gotProperties: function( nodeID, properties ) {

        },

        // -- creatingProperty ---------------------------------------------------------------------

        createdProperty: function( nodeID, propertyName, propertyValue ) {
            return this.initializedProperty( nodeID, propertyName, propertyValue );
        },

        // -- initializingProperty -----------------------------------------------------------------

        initializedProperty: function( nodeID, propertyName, propertyValue ) {
            return this.satProperty( nodeID, propertyName, propertyValue );
        },

        // TODO: deletingProperty

        // -- settingProperty ----------------------------------------------------------------------

        satProperty: function( nodeID, propertyName, propertyValue ) {


            
            if(this.predictions[nodeID] && this.predictions[nodeID][propertyName])
            {
                if(this.predictions[nodeID][propertyName].time >= vwf.message.time || vwf.message.client == vwf.moniker())
                    {
                        
                        return;
                    }
                
            }

        
           this.predictKernel.setProperty( nodeID, propertyName, propertyValue);
        },
        setProperty: function( nodeID, propertyName, propertyValue ) {

            this.predictions[nodeID][propertyName] = {
                time : vwf.now,
                value : propertyValue 
            }
            
           this.predictKernel.setProperty( nodeID, propertyName, propertyValue);
        },

        // -- gettingProperty ----------------------------------------------------------------------

        gotProperty: function( nodeID, propertyName, propertyValue ) {
            return this.predictKernel.getProperty( nodeID, propertyName, propertyValue );
        },
        ticked:function()
        {
            if(this.time <= vwf.time())
            {
                this.predictKernel.ticking();
                this.time = vwf.time();
            }else
            {
                //already predicted this tick
            }
        },
        predictTick:function()
        {
            this.time += .05;
            this.predictKernel.ticking();
        }

        // -- name_source_type --------------------------------------------------------------------

    } );

} );
