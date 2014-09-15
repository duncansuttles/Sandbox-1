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

define(["module", "vwf/model", "vwf/model/edx/jschannel.js"], function(module, model) {

    // vwf/model/object.js is a backstop property store.

    return model.load(module, {

        // == Module Definition ====================================================================

        // -- initialize ---------------------------------------------------------------------------

        initialize: function() {

            if (window.parent !== window) {
                var channel = Channel.build({
                    window: window.parent,
                    origin: "*",
                    scope: "JSInput"
                });

                channel.bind("getGrade", this.getGrade);
                channel.bind("getState", this.getState);
                channel.bind("setState", this.setState);
            }


        },
        getGrade:function()
        {
            return JSON.stringify(vwf.callMethod(vwf.application(),'getEdXGrade'));
        },
        getState:function()
        {
            return JSON.stringify(vwf.callMethod(vwf.application(),'getEdXState'));
        },
        setState:function(state)
        {
            return vwf.callMethod(vwf.application(),'setEdXState',[JSON.parse(state)]);
        },
        callingMethod: function(nodeID, method, args) {

        },

        // == Model API ============================================================================

        // -- creatingNode -------------------------------------------------------------------------

        creatingNode: function(nodeID, childID, childExtendsID, childImplementsIDs,
            childSource, childType, childURI, childName, callback /* ( ready ) */ ) {



        },

        // -- initializingNode ---------------------------------------------------------------------

        initializingNode: function(nodeID, childID) {



        },

        // -- deletingNode -------------------------------------------------------------------------

        deletingNode: function(nodeID) {

        },



       

        settingProperties: function(nodeID, properties) {


        },

        // -- gettingProperties --------------------------------------------------------------------

        gettingProperties: function(nodeID, properties) {

        },

        // -- creatingProperty ---------------------------------------------------------------------

        creatingProperty: function(nodeID, propertyName, propertyValue) {

        },

        // -- initializingProperty -----------------------------------------------------------------

        initializingProperty: function(nodeID, propertyName, propertyValue) {

        },

        // TODO: deletingProperty

        // -- settingProperty ----------------------------------------------------------------------

        settingProperty: function(nodeID, propertyName, propertyValue) {


        },

        // -- gettingProperty ----------------------------------------------------------------------

        gettingProperty: function(nodeID, propertyName, propertyValue) {

        },

        // -- name_source_type --------------------------------------------------------------------

    });

});