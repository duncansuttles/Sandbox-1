define(["vwf/view/prediction/javascript","vwf/view/prediction/object"],function(){
	
	 var nodeHasOwnProperty = function( nodeID, propertyName ) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript
            var node = this.models.javascript.nodes[nodeID];
            return node.properties.hasOwnProperty( propertyName );  // TODO: this is peeking inside of vwf-model-javascript
        };
        var nodeHasProperty = function( nodeID, propertyName ) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript
            var node = this.models.javascript.nodes[nodeID];
            return propertyName in node.properties;
        };

        var nodeHasOwnProperty = function( nodeID, propertyName ) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript
            var node = this.models.javascript.nodes[nodeID];
            return node.properties.hasOwnProperty( propertyName );  // TODO: this is peeking inside of vwf-model-javascript
        };

        var nodePropertyHasSetter = function( nodeID, propertyName ) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript; need to delegate to all script drivers
            var node = this.models.javascript.nodes[nodeID];
            var setter = node.private.setters && node.private.setters[propertyName];
            return typeof setter == "function" || setter instanceof Function;
        };

        var nodePropertyHasOwnSetter = function( nodeID, propertyName ) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript; need to delegate to all script drivers
            var node = this.models.javascript.nodes[nodeID];
            var setter = node.private.setters && node.private.setters.hasOwnProperty( propertyName ) && node.private.setters[propertyName];
            return typeof setter == "function" || setter instanceof Function;
        };

        var nodeHasChild = function( nodeID, childName ) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript
            var node = this.models.javascript.nodes[nodeID];
            return childName in node.children;
        };

        var nodeHasOwnChild = function( nodeID, childName ) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript
            var node = this.models.javascript.nodes[nodeID];
            return node.children.hasOwnProperty( childName );  // TODO: this is peeking inside of vwf-model-javascript
        };

        var nodePrototypeID = function( nodeID ) { // invoke with the kernel as "this"
            var node = this.models.javascript.nodes[nodeID];
            return Object.getPrototypeOf( node ).id;  // TODO: need a formal way to follow prototype chain from vwf.js; this is peeking inside of vwf-model-javascript
        };

        // Is a component specifier a URI?

        var componentIsURI = function( candidate ) {
            return ( typeof candidate == "string" || candidate instanceof String ) && ! componentIsID( candidate );
        };

        // Is a component specifier a descriptor?

        var componentIsDescriptor = function( candidate ) {
            return typeof candidate == "object" && candidate != null && ! isPrimitive( candidate );
        };

        // Is a component specifier an ID?

        var componentIsID = function( candidate ) {
            return isPrimitive( candidate ) &&
vwf.models.javascript.nodes[candidate];  // TODO: move to vwf/model/object
        };

var nodeTypeURI = "http://vwf.example.com/node.vwf";

	return {
                setProperty : function(nodeID,propertyName,propertyValue)
                {
		           var initializing = ! nodeHasOwnProperty.call( this, nodeID, propertyName );
		           var entrants = this.setProperty.entrants;
		           var entry = entrants[nodeID+'-'+propertyName] || {}; // the most recent call, if any  // TODO: need unique nodeID+propertyName hash
		           var reentry = entrants[nodeID+'-'+propertyName] = {}; // this call
				   for(var index = 0; index < this.models.length; index++)
					{
		                // Skip models up through the one making the most recent call here (if any).
						var model = this.models[index];
		                if ( entry.index === undefined || index > entry.index ) {

		                    reentry.index = index;
		                    if ( initializing ) {
		                        var value = model.initializingProperty &&
		                            model.initializingProperty( nodeID, propertyName, propertyValue );
		                    } else {
		                        var value = model.settingProperty &&
		                            model.settingProperty( nodeID, propertyName, propertyValue );
		                    }
		                    if ( value === undefined ) {
		                        value = reentry.value;
		                    }
		                    if ( value !== undefined ) {
		                        propertyValue = value;
		                    }
		                    if( ! initializing && value !== undefined)  // TODO: this stops after p: { set: "this.p = value" } or p: { set: "return value" }, but should it also stop on p: { set: "this.q = value" }?
								break;
		                }
		            } 
		            if ( entry.index !== undefined ) {
		                entrants[nodeID+'-'+propertyName] = entry;
		                entry.value = propertyValue;

		            } else {
		                delete entrants[nodeID+'-'+propertyName];
		            }

        			return propertyValue;
                },
                getProperty : function(nodeID, propertyName)
                {
		            var propertyValue = undefined;
		            var entrants = this.getProperty.entrants;
		            var entry = entrants[nodeID+'-'+propertyName] || {}; // the most recent call, if any  // TODO: need unique nodeID+propertyName hash
		            var reentry = entrants[nodeID+'-'+propertyName] = {}; // this call

				    for(var index = 0; index < this.models.length; index++)
				    {
							var model = this.models[index];
			                if ( entry.index === undefined || index > entry.index ) {

			                    reentry.index = index;
			                    var value = model.gettingProperty &&
			                        model.gettingProperty( nodeID, propertyName, propertyValue );  // TODO: probably don't need propertyValue here

			                    if ( value === undefined ) {
			                        value = reentry.value;
			                    }
			                    if ( value !== undefined ) {
			                        propertyValue = value;
			                    }
			                    if( value !== undefined)
								break;
			                }
			        };
		            if ( entry.index !== undefined ) {
		                entrants[nodeID+'-'+propertyName] = entry;
		                entry.value = propertyValue;

		            } else {
		                delete entrants[nodeID+'-'+propertyName];

		                if ( propertyValue === undefined ) {
		                    var prototypeID = nodePrototypeID.call( this, nodeID );
		                    if (prototypeID&& prototypeID != nodeTypeURI.replace( /[^0-9A-Za-z_]+/g, "-" ) ) {
		                        propertyValue = this.getProperty( prototypeID, propertyName );
		                    }
		                }
		            }
		            return propertyValue;
                },
                callMethod : function(nodeID, methodName, methodParameters )
                {
					var methodValue = undefined;
				    for(var i =0; i < this.models.length; i ++)
				    {	
					  var value = this.models[i].callingMethod && this.models[i].callingMethod( nodeID, methodName, methodParameters );
					  methodValue = value !== undefined ? value : methodValue;
				    }	
				    return methodValue;
                },
                ticked : function()
                {
                   for(var i=0; i < this.models.length; i++)
		           {
		               this.models[i].ticking();
		           }
                },
                fireEvent : function()
                {
                   
                },
                initialize:function()
                {
                	this.models = [];
		            var predictionJS = require("vwf/view/prediction/javascript");
		            this.models[0] = predictionJS;
		            this.models.javascript = predictionJS;
		            var objectJS = require("vwf/view/prediction/object");
		            this.models[1] = objectJS;
		            this.models.object = objectJS;

		            var self = this;
		            
		            for(var i=0; i < this.models.length; i++)
		            {
		                this.models[i].kernel = this;
		            }
		            for(var i=0; i < this.models.length; i++)
		            {
		                this.models[i].initialize();
		            }
		            this.setProperty.entrants = {};
		            this.getProperty.entrants = {};
                },
                deletingNode:function(nodeID)
                {
					for(var i=0; i < this.models.length; i++)
		            {
		                this.models[i].deletingNode(nodeID);
		            }
                },
                creatingNode:function(nodeID, childID, childExtendsID, childImplementsIDs,childSource, childType, childURI, childName, callback /* ( ready ) */ )
                {
					for(var i=0; i < this.models.length; i++)
		            {
		                this.models[i].creatingNode(nodeID, childID, childExtendsID, childImplementsIDs,childSource, childType, childURI, childName, callback /* ( ready ) */);
		            }
                }
    };
})