define(["vwf/view/prediction/javascript", "vwf/view/prediction/object"], function() {

		var components; 
		var nodeTypeDescriptor = {
                extends: null
            };
		var loadComponent = function(nodeURI, callback_async /* ( nodeDescriptor ) */ ) { // TODO: turn this into a generic xhr loader exposed as a kernel function?

            if (nodeURI == nodeTypeURI) {

                callback_async(nodeTypeDescriptor);

            } else if (nodeURI.match(RegExp("^data:application/json;base64,"))) {

                // Primarly for testing, parse one specific form of data URIs. We need to parse
                // these ourselves since Chrome can't load data URIs due to cross origin
                // restrictions.

                callback_async(JSON.parse(atob(nodeURI.substring(29)))); // TODO: support all data URIs

            } else {

               
                jQuery.ajax({

                    url: remappedURI(nodeURI),
                    dataType: "jsonp",

                    success: function(nodeDescriptor) /* async */ {
                        callback_async(nodeDescriptor);
                       
                    },

                    // error: function() {  // TODO
                    // },

                });

            }

        };

		var nodeHasOwnProperty = function(nodeID, propertyName) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript
			var node = this.models.javascript.nodes[nodeID];
			if (!node) return;
			return node.properties.hasOwnProperty(propertyName); // TODO: this is peeking inside of vwf-model-javascript
		};
		var nodeHasProperty = function(nodeID, propertyName) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript
			var node = this.models.javascript.nodes[nodeID];
			if (!node) return;
			return propertyName in node.properties;
		};
		var remappedURI = function(uri) {

            var match = uri.match(RegExp("http://(vwf.example.com)/(.*)"));

            if (match) {
                uri = window.location.protocol + "//" + window.location.host +
                    "/proxy/" + match[1] + "/" + match[2];
            }

            return uri;
        };
		var nodeHasOwnProperty = function(nodeID, propertyName) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript
			var node = this.models.javascript.nodes[nodeID];
			if (!node) return;
			return node.properties.hasOwnProperty(propertyName); // TODO: this is peeking inside of vwf-model-javascript
		};

		var nodePropertyHasSetter = function(nodeID, propertyName) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript; need to delegate to all script drivers
			var node = this.models.javascript.nodes[nodeID];
			if (!node) return;
			var setter = node.private.setters && node.private.setters[propertyName];
			return typeof setter == "function" || setter instanceof Function;
		};

		var nodePropertyHasOwnSetter = function(nodeID, propertyName) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript; need to delegate to all script drivers
			var node = this.models.javascript.nodes[nodeID];
			if (!node) return;
			var setter = node.private.setters && node.private.setters.hasOwnProperty(propertyName) && node.private.setters[propertyName];
			return typeof setter == "function" || setter instanceof Function;
		};

		var nodeHasChild = function(nodeID, childName) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript
			var node = this.models.javascript.nodes[nodeID];
			if (!node) return;
			return childName in node.children;
		};

		var nodeHasOwnChild = function(nodeID, childName) { // invoke with the kernel as "this"  // TODO: this is peeking inside of vwf-model-javascript
			var node = this.models.javascript.nodes[nodeID];
			if (!node) return;
			return node.children.hasOwnProperty(childName); // TODO: this is peeking inside of vwf-model-javascript
		};

		var nodePrototypeID = function(nodeID) { // invoke with the kernel as "this"
			var node = this.models.javascript.nodes[nodeID];
			if (!node) return;
			return Object.getPrototypeOf(node).id; // TODO: need a formal way to follow prototype chain from vwf.js; this is peeking inside of vwf-model-javascript
		};

		// Is a component specifier a URI?

		var componentIsURI = function(candidate) {
			return (typeof candidate == "string" || candidate instanceof String) && !componentIsID(candidate);
		};

		// Is a component specifier a descriptor?

		var componentIsDescriptor = function(candidate) {
			return typeof candidate == "object" && candidate != null && !isPrimitive(candidate);
		};

		// Is a component specifier an ID?

		var componentIsID = function(candidate) {
			return isPrimitive(candidate) &&
				vwfPredict.models.javascript.nodes[candidate]; // TODO: move to vwf/model/object
		};

		var valueHasAccessors = function(candidate) {

			var accessorAttributes = [
				"get",
				"set",
				"value",
				"create",
				"undefined",
			];

			var hasAccessors = false;

			if (typeof candidate == "object" && candidate != null) {

				hasAccessors = accessorAttributes.some(function(attributeName) {
					return candidate.hasOwnProperty(attributeName);
				});

			}

			return hasAccessors;
		};
		var valueHasBody = function(candidate) { // TODO: refactor and share with valueHasAccessors and possibly objectIsComponent  // TODO: unlike a property initializer, we really only care if it's an object vs. text; text == use as body; object == presume o.parameters and o.body  // TODO: except that a script in the unnamed-list format would appear as an object but should be used as the body

			var bodyAttributes = [
				"parameters",
				"body",
			];

			var hasBody = false; // TODO: "body" term is confusing, but that's the current terminology used in vwf/model/javascript

			if (typeof candidate == "object" && candidate != null) {

				hasBody = bodyAttributes.some(function(attributeName) {
					return candidate.hasOwnProperty(attributeName);
				});

			}

			return hasBody;
		};

		/// Determine if a script initializer is a detailed initializer containing explicit text and
		/// type parameters (rather than being a simple text specification). Detect the type by
		/// searching for the script initializer keys in the candidate object.
		/// 
		/// @name module:vwf~valueHasType
		/// 
		/// @param {Object} candidate
		/// 
		/// @returns {Boolean}

		var valueHasType = function(candidate) { // TODO: refactor and share with valueHasBody, valueHasAccessors and possibly objectIsComponent

			var typeAttributes = [
				"source",
				"text",
				"type",
			];

			var hasType = false;

			if (typeof candidate == "object" && candidate != null) {

				hasType = typeAttributes.some(function(attributeName) {
					return candidate.hasOwnProperty(attributeName);
				});

			}

			return hasType;
		};
		var isPrimitive = function(candidate) {

			switch (typeof candidate) {

				case "string":
				case "number":
				case "boolean":
					return true;

				case "object":
					return candidate instanceof String || candidate instanceof Number ||
						candidate instanceof Boolean;

				default:
					return false;

			}

		};
		var nodeCollectionPrototype = {

			/// Record that a property, method or event has been created.
			/// 
			/// @param {String} name
			/// 
			/// @returns {Boolean}
			///   `true` if the member was successfully added. `false` if a member by that name
			///   already exists.

			create: function(name) {

				if (!this.hasOwn(name)) {

					// Add the member. We just record its existence. Everything else is managed by
					// the drivers.
					// 
					// `Object.defineProperty` is used instead of `this.existing[name] = ...` since
					// the prototype may be a behavior proxy, and the accessor properties would
					// prevent normal assignment.

					Object.defineProperty(this.existing, name, {
						value: undefined,
						configurable: true,
						enumerable: true,
						writable: true,
					});

					return true;

				} else {

					return false;

				}

			},

			/// Record that a member has been deleted. Remove it from any change lists that is in.
			/// 
			/// @param {String} name
			/// 
			/// @returns {Boolean}
			///   `true` if the member was successfully removed. `false` if a member by that name
			///   does not exist.

			delete: function(name) {

				if (this.hasOwn(name)) {

					// Remove the member.

					delete this.existing[name];

					// Remmove the member from any change lists it's in. Completely remove lists
					// that become empty.

					if (this.added) {
						delete this.added[name];
						Object.keys(this.added).length || delete this.added;
					}

					if (this.removed) {
						delete this.removed[name];
						Object.keys(this.removed).length || delete this.removed;
					}

					if (this.changed) {
						delete this.changed[name];
						Object.keys(this.changed).length || delete this.changed;
					}

					return true;

				} else {

					return false;

				}

			},

			/// Record that a member has changed. Create the change list if it does not exist.
			/// 
			/// @param {String} name
			/// 
			/// @returns {Boolean}
			///   `true` if the change was successfully recorded. `false` if a member by that name
			///   does not exist.

			change: function(name) {

				if (this.hasOwn(name)) {

					// Ensure that the change list exists and record the change.

					this.changed = this.changed || {};
					this.changed[name] = undefined;

					return true;

				} else {

					return false;

				}

			},

			/// Determine if a node has a member with the given name, either directly on the node or
			/// inherited from a prototype.
			/// 
			/// @param {String} name
			/// 
			/// @returns {Boolean}

			has: function(name) {
				return name in this.existing;
			},

			/// Determine if a node has a member with the given name. The node's prototypes are not
			/// considered.
			/// 
			/// @param {String} name
			/// 
			/// @returns {Boolean}

			// Since prototypes of the collection objects mirror the node's prototype chain,
			// collection objects for the proto-prototype `node.vwf` intentionally don't inherit
			// from `Object.prototype`. Otherwise the Object members `hasOwnProperty`,
			// `isPrototypeOf`, etc. would be mistaken as members of a VWF node.

			// Instead of using the simpler `this.existing.hasOwnProperty( name )`, we must reach
			// `hasOwnProperty through `Object.prototype`.

			hasOwn: function(name) {
				return Object.prototype.hasOwnProperty.call(this.existing, name);
			},

		};
		var nodes = {

			/// Register a node as it is created.
			/// 
			/// @param {ID} nodeID
			///   The ID assigned to the new node. The node will be indexed in `nodes` by this ID.
			/// @param {ID} prototypeID
			///   The ID of the node's prototype, or `undefined` if this is the proto-prototype,
			///   `node.vwf`.
			/// @param {ID[]} behaviorIDs
			///   An array of IDs of the node's behaviors. `behaviorIDs` should be an empty array if
			///   the node doesn't have any behaviors.
			/// @param {String} nodeURI
			///   The node's URI. `nodeURI` should be the component URI if this is the root node of
			///   a component loaded from a URI, and undefined in all other cases.
			/// @param {String} nodeName
			///   The node's name.
			/// @param {ID} parentID
			///   The ID of the node's parent, or `undefined` if this is the application root node
			///   or another global, top-level node.
			/// 
			/// @returns {Object} 
			///   The kernel `node` object if the node was successfully added. `undefined` if a node
			///   identified by `nodeID` already exists.

			create: function(nodeID, prototypeID, behaviorIDs, nodeURI, nodeName, parentID) {

				// if ( ! this.existing[nodeID] ) {

				var self = this;

				var prototypeNode = behaviorIDs.reduce(function(prototypeNode, behaviorID) {
					return self.proxy(prototypeNode, self.existing[behaviorID]);
				}, this.existing[prototypeID]);

				var parentNode = this.existing[parentID];

				return this.existing[nodeID] = {

					// id: ...,

					// Inheritance. -- not implemented here yet; still using vwf/model/object

					// prototype: ...,
					// behaviors: [],

					// Intrinsic state. -- not implemented here yet.

					// source: ...,
					// type: ...,

					uri: nodeURI,

					// name: ...,

					// Internal state. The change flags are omitted until needed. -- not implemented here yet; still using vwf/model/object

					// sequence: ...,
					// sequenceChanged: true / false,

					// prng: ...,
					// prngChanged: true / false,

					// Tree. -- not implemented here yet; still using vwf/model/object

					// parent: ...,
					// children: [],

					// Property, Method and Event members defined on the node.
					// 
					// The `existing`, `added`, `removed` and `changed` objects are sets: the
					// keys are the data, and only existence on the object is significant. As an
					// exception, the last known value for a delegating property is stored on
					// its `existing` entry.
					// 
					// For each collection, `existing` is the authoritative list the node's
					// members. Use `existing.hasOwnProperty( memberName )` to determine if the
					// node defines a property, method or event by that name.
					// 
					// The prototype of each `existing` object is the `existing` object of the
					// node's prototype (or a proxy to the top behavior for nodes with
					// behaviors). Use `memberName in existing` to determine if a property,
					// method or event is defined on the node or its prototypes.
					// 
					// For patchable nodes, `added`, `removed`, and `changed` record changes
					// that occurred after the node was first initialized. They are omitted
					// until needed. Only the change is recorded here. Values are retrieved from
					// the drivers when needed.

					properties: Object.create(nodeCollectionPrototype, {

						existing: {
							value: Object.create(prototypeNode ?
								prototypeNode.properties.existing : null),
						},

						// Created when needed.

						// added: {
						//     name: undefined
						// },

						// removed: {
						//     name: undefined
						// },

						// changed: {
						//     name: undefined
						// },

					}),

					// TODO: Store nodes' methods and events here in the kernel

					// methods: Object.create( nodeCollectionPrototype, {

					//     existing: {
					//         value: Object.create( prototypeNode ?
					//             prototypeNode.methods.existing : null ),
					//     },

					//     // Created when needed.

					//     // added: {
					//     //     name: undefined
					//     // },

					//     // removed: {
					//     //     name: undefined
					//     // },

					//     // changed: {
					//     //     name: undefined
					//     // },

					// } ),

					// events: Object.create( nodeCollectionPrototype, {

					//     existing: {
					//         value: Object.create( prototypeNode ?
					//             prototypeNode.events.existing : null ),
					//     },

					//     // Created when needed.

					//     // added: {
					//     //     name: undefined
					//     // },

					//     // removed: {
					//     //     name: undefined
					//     // },

					//     // changed: {
					//     //     name: undefined
					//     // },

					// } ),

					// END TODO

					// Is this node patchable? Nodes are patchable if they were loaded from a
					// component.

					patchable: !!(nodeURI ||
						parentNode && !parentNode.initialized && parentNode.patchable),

					// Has this node completed initialization? For applications, visibility to
					// ancestors from uninitialized nodes is blocked. Change tracking starts
					// after initialization.

					initialized: false,

				};

				// } else {

				//     return undefined;

				// }

			},

			/// Record that a node has initialized.

			initialize: function(nodeID) {

				if (this.existing[nodeID]) {

					this.existing[nodeID].initialized = true;

					return true;

				} else {

					return false;

				}

			},

			/// Unregister a node as it is deleted.

			delete: function(nodeID) {

				if (this.existing[nodeID]) {

					delete this.existing[nodeID];

					return true;

				} else {

					return false;

				}

			},

			/// Create a proxy node in the form of the nodes created by `nodes.create` to represent
			/// a behavior node in another node's prototype chain. The `existing` objects of the
			/// proxy's collections link to the prototype collection's `existing` objects, just as
			/// with a regular prototype. The proxy's members delegate to the corresponding members
			/// in the behavior.

			proxy: function(prototypeNode, behaviorNode) {

				return {

					properties: {
						existing: Object.create(
							prototypeNode ? prototypeNode.properties.existing : null,
							propertyDescriptorsFor(behaviorNode.properties.existing)
						),
					},

					// methods: {
					//     existing: Object.create(
					//         prototypeNode ? prototypeNode.methods.existing : null,
					//         propertyDescriptorsFor( behaviorNode.methods.existing )
					//     ),
					// },

					// events: {
					//     existing: Object.create(
					//         prototypeNode ? prototypeNode.events.existing : null,
					//         propertyDescriptorsFor( behaviorNode.events.existing )
					//     ),
					// },

				};

				/// Return an `Object.create` properties object for a proxy object for the provided
				/// collection's `existing` object.

				function propertyDescriptorsFor(collectionExisting) {

					return Object.keys(collectionExisting).reduce(

						function(propertiesObject, memberName) {

							propertiesObject[memberName] = {
								get: function() {
									return collectionExisting[memberName]
								},
								enumerable: true,
							};

							return propertiesObject;
						},

						{}

					);

				}

			},

			/// Registry of all nodes, indexed by ID. Each is an object created by `nodes.create`.

			existing: {

				// id: {
				//     id: ...,
				//     uri: ...,
				//     name: ...,
				//     ...
				// }

			},

		};
		var normalizedComponent = function(component) {

			// Convert a component URI to an instance of that type or an asset reference to an
			// untyped reference to that asset. Convert a component ID to an instance of that
			// prototype.

			if (componentIsURI(component)) {
				if (component.match(/\.vwf$/)) { // TODO: detect component from mime-type instead of extension?
					component = {
						extends: component
					};
				} else {
					component = {
						source: component
					};
				}
			} else if (componentIsID(component)) {
				component = {
					extends: component
				};
			}

			// Fill in the mime type from the source specification if not provided.

			if (component.source && !component.type) { // TODO: validate component

				var match = component.source.match(/\.([^.]*)$/); // TODO: get type from mime-type (from server if remote, from os if local, or (?) from this internal table otherwise)

				if (match) {

					switch (match[1]) {
						case "unity3d":
							component.type = "application/vnd.unity";
							break;
						case "dae":
							component.type = "model/vnd.collada+xml";
							break;
					}

				}

			}

			// Fill in the component type from the mime type if not provided.

			if (component.type && !component.extends) { // TODO: load from a server configuration file

				switch (component.type) {
					case "application/vnd.unity":
						component.extends = "http://vwf.example.com/scene.vwf";
						break;
					case "model/vnd.collada+xml":
						component.extends = "http://vwf.example.com/navscene.vwf";
						break;
				}

			}

			return component;
		};

		var nodeTypeURI = "http://vwf.example.com/node.vwf";

		return {
			setProperty: function(nodeID, propertyName, propertyValue) {
				var node = this.models.javascript.nodes[nodeID];
				if (!node) return;
				var initializing = !nodeHasOwnProperty.call(this, nodeID, propertyName);
				var entrants = this.setProperty.entrants;
				var entry = entrants[nodeID + '-' + propertyName] || {}; // the most recent call, if any  // TODO: need unique nodeID+propertyName hash
				var reentry = entrants[nodeID + '-' + propertyName] = {}; // this call
				for (var index = 0; index < this.models.length; index++) {
					// Skip models up through the one making the most recent call here (if any).
					var model = this.models[index];
					if (entry.index === undefined || index > entry.index) {

						reentry.index = index;
						if (initializing) {
							var value = model.initializingProperty &&
								model.initializingProperty(nodeID, propertyName, propertyValue);
						} else {
							var value = model.settingProperty &&
								model.settingProperty(nodeID, propertyName, propertyValue);
						}
						if (value === undefined) {
							value = reentry.value;
						}
						if (value !== undefined) {
							propertyValue = value;
						}
						if (!initializing && value !== undefined) // TODO: this stops after p: { set: "this.p = value" } or p: { set: "return value" }, but should it also stop on p: { set: "this.q = value" }?
							break;
					}
				}
				if (entry.index !== undefined) {
					entrants[nodeID + '-' + propertyName] = entry;
					entry.value = propertyValue;

				} else {
					delete entrants[nodeID + '-' + propertyName];
				}

				return propertyValue;
			},
			getProperty: function(nodeID, propertyName) {
				var node = this.models.javascript.nodes[nodeID];
				if (!node) return;
				var propertyValue = undefined;
				var entrants = this.getProperty.entrants;
				var entry = entrants[nodeID + '-' + propertyName] || {}; // the most recent call, if any  // TODO: need unique nodeID+propertyName hash
				var reentry = entrants[nodeID + '-' + propertyName] = {}; // this call

				for (var index = 0; index < this.models.length; index++) {
					var model = this.models[index];
					if (entry.index === undefined || index > entry.index) {

						reentry.index = index;
						var value = model.gettingProperty &&
							model.gettingProperty(nodeID, propertyName, propertyValue); // TODO: probably don't need propertyValue here

						if (value === undefined) {
							value = reentry.value;
						}
						if (value !== undefined) {
							propertyValue = value;
						}
						if (value !== undefined)
							break;
					}
				};
				if (entry.index !== undefined) {
					entrants[nodeID + '-' + propertyName] = entry;
					entry.value = propertyValue;

				} else {
					delete entrants[nodeID + '-' + propertyName];

					if (propertyValue === undefined) {
						var prototypeID = nodePrototypeID.call(this, nodeID);
						if (prototypeID && prototypeID != nodeTypeURI.replace(/[^0-9A-Za-z_]+/g, "-")) {
							propertyValue = this.getProperty(prototypeID, propertyName);
						}
					}
				}
				return propertyValue;
			},
			callMethod: function(nodeID, methodName, methodParameters) {
				var node = this.models.javascript.nodes[nodeID];
				if (!node) return;
				var methodValue = undefined;
				for (var i = 0; i < this.models.length; i++) {
					var value = this.models[i].callingMethod && this.models[i].callingMethod(nodeID, methodName, methodParameters);
					methodValue = value !== undefined ? value : methodValue;
				}
				return methodValue;
			},
			ticking: function() {
				for (var i = 0; i < this.models.length; i++) {
					if (this.models[i].ticking)
						this.models[i].ticking();
				}
			},
			fireEvent: function(nodeID, eventName, eventParameters) {
				var handled = this.models.reduce(function(handled, model) {
					return model.firingEvent && model.firingEvent(nodeID, eventName, eventParameters) || handled;
				}, false);

				return handled;
			},
 capturingAsyncs: function(task, callback, that) {
 	task.apply(that);
 	callback();

 },
		initialize: function() {
			this.models = [];
			this.models.kernel = this;
			var predictionJS = require("vwf/view/prediction/javascript");
			this.models[0] = predictionJS;
			this.models.javascript = predictionJS;
			predictionJS.kernel = this;
			var objectJS = require("vwf/view/prediction/object");
			this.models[1] = objectJS;
			this.models.object = objectJS;
			objectJS.kernel = this;

			var self = this;

			for (var i = 0; i < this.models.length; i++) {
				this.models[i].kernel = this;
			}
			for (var i = 0; i < this.models.length; i++) {
				this.models[i].initialize();
			}
			this.setProperty.entrants = {};
			this.getProperty.entrants = {};
			
    		this.private = {};
            components = this.private.components = {};
		},
		deletingNode: function(nodeID) {
			var node = this.models.javascript.nodes[nodeID];
			if (!node) return;
			for (var i = 0; i < this.models.length; i++) {
				this.models[i].deletingNode(nodeID);
			}
		},
		createNode: function(nodeComponent, nodeAnnotation, callback_async /* ( nodeID ) */ ) {

			// Interpret `createNode( nodeComponent, callback )` as
			// `createNode( nodeComponent, undefined, callback )`. (`nodeAnnotation` was added in
			// 0.6.12.)

			if (nodeComponent && nodeComponent.id == vwfPredict.application()) {
				$(document).trigger('setstatebegin');
			}

			if (typeof nodeAnnotation == "function" || nodeAnnotation instanceof Function) {
				callback_async = nodeAnnotation;
				nodeAnnotation = undefined;
			}



			var nodePatch;

			if (componentIsDescriptor(nodeComponent) && nodeComponent.patches) {
				nodePatch = nodeComponent;
				nodeComponent = nodeComponent.patches; // TODO: possible sync errors if the patched node is a URI component and the kernel state (time, random) is different from when the node was created on the originating client
			}

			// nodeComponent may be a URI, a descriptor, or an ID, and while being created will
			// transform from a URI to a descriptor to an ID (depending on its starting state).
			// nodeURI, nodeDescriptor, and nodeID capture the applicable intermediate states.

			var nodeURI, nodeDescriptor, nodeID;

			async.series([

				// If nodeComponent is a URI, load the descriptor.

				function(series_callback_async /* ( err, results ) */ ) { // nodeComponent is a URI, a descriptor, or an ID

					if (componentIsURI(nodeComponent)) { // URI  // TODO: allow non-vwf URIs (models, images, etc.) to pass through to stage 2 and pass directly to createChild()

						nodeURI = nodeComponent; // TODO: canonicalize uri

						// Load the document if we haven't seen this URI yet. Mark the components
						// list to indicate that this component is loading.

						if (!components[nodeURI]) { // uri is not loading (Array) or is loaded (id)

							components[nodeURI] = []; // [] => array of callbacks while loading => true

							loadComponent(nodeURI, function(nodeDescriptor) /* async */ {
								nodeComponent = nodeDescriptor;
								series_callback_async(undefined, undefined);
							});

							// If we've seen this URI, but it is still loading, just add our callback to
							// the list. The original load's completion will call our callback too.

						} else if (components[nodeURI] instanceof Array) { // uri is loading

							callback_async && components[nodeURI].push(callback_async); // TODO: is this leaving a series callback hanging if we don't call series_callback_async?

							// If this URI has already loaded, skip to the end and call the callback
							// with the ID.

						} else { // uri is loaded

							if (nodePatch) {
								vwfPredict.setNode(components[nodeURI], nodePatch, function(nodeID) /* async */ {
									callback_async && callback_async(components[nodeURI]); // TODO: is this leaving a series callback hanging if we don't call series_callback_async?
								});
							} else {
								callback_async && callback_async(components[nodeURI]); // TODO: is this leaving a series callback hanging if we don't call series_callback_async?
							}

						}

					} else { // descriptor, ID or error
						series_callback_async(undefined, undefined);
					}

				},

				// Rudimentary support for `{ includes: prototype }`, which absorbs a prototype
				// descriptor into the node descriptor before creating the node.

				// Notes:
				// 
				//   - Only supports one level, so `{ includes: prototype }` won't work if the
				//     prototype also contains a `includes` directive).
				//   - Only works with prototype URIs, so `{ includes: { ... descriptor ... } }`
				//     won't work.
				//   - Loads the prototype on each reference, so unlike real prototypes, multiple
				//     references to the same prototype cause multiple network loads.
				// 
				// Also see the `mergeDescriptors` limitations.

				function(series_callback_async /* ( err, results ) */ ) {

					if (componentIsDescriptor(nodeComponent) && nodeComponent.includes && componentIsURI(nodeComponent.includes)) { // TODO: for "includes:", accept an already-loaded component (which componentIsURI exludes) since the descriptor will be loaded again

						var prototypeURI = nodeComponent.includes;

						loadComponent(prototypeURI, function(prototypeDescriptor) /* async */ {
							nodeComponent = mergeDescriptors(nodeComponent, prototypeDescriptor); // modifies prototypeDescriptor
							series_callback_async(undefined, undefined);
						});

					} else {
						series_callback_async(undefined, undefined);
					}

				},

				// If nodeComponent is a descriptor, construct and get the ID.

				function(series_callback_async /* ( err, results ) */ ) { // nodeComponent is a descriptor or an ID

					if (componentIsDescriptor(nodeComponent)) { // descriptor  // TODO: allow non-vwf URIs (models, images, etc.) to pass through to stage 2 and pass directly to createChild()

						nodeDescriptor = nodeComponent;

						// Create the node as an unnamed child global object.

						vwfPredict.createChild(0, nodeAnnotation, nodeDescriptor, nodeURI, function(nodeID) /* async */ {
							nodeComponent = nodeID;
							series_callback_async(undefined, undefined);
						});

					} else { // ID or error
						series_callback_async(undefined, undefined);
					}

				},

				// nodeComponent is the ID.

				function(series_callback_async /* ( err, results ) */ ) { // nodeComponent is an ID

					if (componentIsID(nodeComponent)) { // ID

						nodeID = nodeComponent;

						if (nodePatch) {
							vwfPredict.setNode(nodeID, nodePatch, function(nodeID) /* async */ {
								series_callback_async(undefined, undefined);
							});
						} else {
							series_callback_async(undefined, undefined);
						}

					} else { // error
						series_callback_async(undefined, undefined); // TODO: error
					}

				},

			], function(err, results) /* async */ {

				// If this node derived from a URI, save the list of callbacks waiting for
				// completion and update the component list with the ID.

				if (nodeURI) {
					var callbacks_async = components[nodeURI];
					components[nodeURI] = nodeID;
				}

				// Pass the ID to our callback.

				callback_async && callback_async(nodeID); // TODO: handle error if invalid id

				// Call the other callbacks.

				if (nodeURI) {
					callbacks_async.forEach(function(callback_async) {
						callback_async && callback_async(nodeID);
					});
				}


				if (nodeComponent == "index-vwf") {
					$(document).trigger('setstatecomplete');
					$('#loadstatus').remove();
					_ProgressBar.hide();

					vwfPredict.decendants(vwfPredict.application()).forEach(function(i) {
						vwfPredict.callMethod(i, 'ready', []);
					});
					vwfPredict.callMethod(vwfPredict.application(), 'ready', []);

				}

			});


		},
		        intrinsics :function(nodeID, result) {
            return this.models.object.intrinsics(nodeID, result);
        },
         createProperty : function(nodeID, propertyName, propertyValue, propertyGet, propertySet) {

           

            var node = nodes.existing[nodeID];

            // Register the property.

            node.properties.create(propertyName);

            // Call creatingProperty() on each model. The property is considered created after all
            // models have run.

            this.models.forEach(function(model) {
                model.creatingProperty && model.creatingProperty(nodeID, propertyName, propertyValue, propertyGet, propertySet);
            });

            // Record the change.

            if (node.initialized && node.patchable) {
                node.properties.change(propertyName);
            }

            // Call createdProperty() on each view. The view is being notified that a property has
           
            

            return propertyValue;
        },
        createMethod : function(nodeID, methodName, methodParameters, methodBody) {


            // Call creatingMethod() on each model. The method is considered created after all
            // models have run.

            this.models.forEach(function(model) {
                model.creatingMethod && model.creatingMethod(nodeID, methodName, methodParameters, methodBody);
            });

            // Call createdMethod() on each view. The view is being notified that a method has been
           
           
          
        },

        // -- callMethod ---------------------------------------------------------------------------

        /// @name module:vwf.callMethod
        /// 
        /// @see {@link module:vwf/api/kernel.callMethod}

        callMethod : function(nodeID, methodName, methodParameters) {

      
            var methodValue = undefined;

            this.models.forEach(function(model) {
                var value = model.callingMethod && model.callingMethod(nodeID, methodName, methodParameters, methodValue);
                methodValue = value !== undefined ? value : methodValue;
            });

            // Call calledMethod() on each view.

           
           
            return methodValue;
        },

        // -- createEvent --------------------------------------------------------------------------

        /// @name module:vwf.creatEvent
        /// 
        /// @see {@link module:vwf/api/kernel.createEvent}

        createEvent :function(nodeID, eventName, eventParameters, eventBody) { // TODO: parameters (used? or just for annotation?)  // TODO: allow a handler body here and treat as this.*event* = function() {} (a self-targeted handler); will help with ui event handlers

            
            // Call creatingEvent() on each model. The event is considered created after all models
            // have run.

            this.models.forEach(function(model) {
                model.creatingEvent && model.creatingEvent(nodeID, eventName, eventParameters, eventBody);
            });

            // Call createdEvent() on each view. The view is being notified that a event has been
            // created.

          
        },
		dispatchEvent: function(nodeID, eventName, eventParameters, eventNodeParameters) {
			eventParameters = eventParameters || [];
			eventNodeParameters = eventNodeParameters || {};

			var ancestorIDs = this.ancestors(nodeID);
			var lastAncestorID = "";
			var cascadedEventNodeParameters = {
				"": eventNodeParameters[""] || [] // defaults come from the "" key in eventNodeParameters
			};
			var targetEventParameters = undefined;

			var phase = undefined;
			var handled = false;
			phase = "capture"; // only handlers tagged "capture" will be invoked

			handled = handled || ancestorIDs.reverse().some(function(ancestorID) { // TODO: reverse updates the array in place every time and we'd rather not

				cascadedEventNodeParameters[ancestorID] = eventNodeParameters[ancestorID] ||
					cascadedEventNodeParameters[lastAncestorID];

				lastAncestorID = ancestorID;

				targetEventParameters =
					eventParameters.concat(cascadedEventNodeParameters[ancestorID], phase);

				targetEventParameters.phase = phase; // smuggle the phase across on the parameters array  // TODO: add "phase" as a fireEvent() parameter? it isn't currently needed in the kernel public API (not queueable, not called by the drivers), so avoid if possible

				return this.fireEvent(ancestorID, eventName, targetEventParameters);

			}, this);
			phase = undefined; // invoke all handlers

			cascadedEventNodeParameters[nodeID] = eventNodeParameters[nodeID] ||
				cascadedEventNodeParameters[lastAncestorID];

			targetEventParameters =
				eventParameters.concat(cascadedEventNodeParameters[nodeID], phase);

			handled = handled || this.fireEvent(nodeID, eventName, targetEventParameters);
			handled = handled || ancestorIDs.reverse().some(function(ancestorID) { // TODO: reverse updates the array in place every time and we'd rather not

				targetEventParameters =
					eventParameters.concat(cascadedEventNodeParameters[ancestorID], phase);
				targetEventParameters.phase = phase;
				return this.fireEvent(ancestorID, eventName, targetEventParameters);

			}, this);
		},
		createChild: function(nodeID, childName, childComponent, childURI, callback_async /* ( childID ) */ ) {
			vwfPredict.createDepth++;


			childComponent = normalizedComponent(childComponent);

			var child, childID, childIndex, childPrototypeID, childBehaviorIDs = [],
				deferredInitializations = {};

			// Determine if we're replicating previously-saved state, or creating a fresh object.

			var replicating = !!childComponent.id;

			// Allocate an ID for the node. IDs must be unique and consistent across all clients
			// sharing the same instance regardless of the component load order. Each node maintains
			// a sequence counter, and we allocate the ID based on the parent's sequence counter and
			// ID. Top-level nodes take the ID from their origin URI when available or from a hash
			// of the descriptor. An existing ID is used when synchronizing to state drawn from
			// another client or to a previously-saved state.

			var useLegacyID = nodeID === 0 && childURI &&
				(childURI == "index.vwf" || childURI == "appscene.vwf" || childURI.indexOf("http://vwf.example.com/") == 0) &&
				childURI != "http://vwf.example.com/node.vwf";

			useLegacyID = true;
			useLegacyID = useLegacyID ||
				nodeID == applicationID && childName == "camera"; // TODO: fix static ID references and remove; model/glge still expects a static ID for the camera

			if (childComponent.id) { // incoming replication: pre-calculated id
				childID = childComponent.id;
				childIndex = this.children(nodeID).length;
			} else if (nodeID === 0) { // global: component's URI or hash of its descriptor
				childID = childURI ||
					Crypto.MD5(JSON.stringify(childComponent)).toString(); // TODO: MD5 may be too slow here
				if (useLegacyID) { // TODO: fix static ID references and remove
					childID = childID.replace(/[^0-9A-Za-z_]+/g, "-"); // TODO: fix static ID references and remove
				}
				childIndex = childURI;
			} else { // descendant: parent id + next from parent's sequence
				if (useLegacyID) { // TODO: fix static ID references and remove
					childID = (childComponent.extends || nodeTypeURI) + "." + childName; // TODO: fix static ID references and remove
					childID = childID.replace(/[^0-9A-Za-z_]+/g, "-"); // TODO: fix static ID references and remove
					childIndex = this.children(nodeID).length;
				} else {
					childID = nodeID + ":" + this.sequence(nodeID) +
						(this.configuration["randomize-ids"] ? "-" + ("0" + Math.floor(this.random(nodeID) * 100)).slice(-2) : "") +
						(this.configuration["humanize-ids"] ? "-" + childName.replace(/[^0-9A-Za-z_-]+/g, "-") : "");
					childIndex = this.children(nodeID).length;
				}
			}

			// Record the application root ID. The application is the first global node annotated as
			// "application".



			//       childID = childComponent.id || childComponent.uri || ( childComponent["extends"] || nodeTypeURI ) + "." + childName; 
			//     childID = childID.replace( /[^0-9A-Za-z_]+/g, "-" ); // stick to HTML id-safe characters  // TODO: hash uri => childID to shorten for faster lookups?  // TODO: canonicalize uri


			if (nodeID === 0 && childName == "application" && !applicationID) {
				applicationID = childID;
			}

			// Register the node.

			child = nodes.create(childID, childPrototypeID, childBehaviorIDs, childURI, childName, nodeID);

			// Register the node in vwf/model/object. Since the kernel delegates many node
			// information functions to vwf/model/object, this serves to register it with the
			// kernel. The node must be registered before any async operations occur to ensure that
			// the parent's child list is correct when following siblings calculate their index
			// numbers.

			vwfPredict.models.object.creatingNode(nodeID, childID, childPrototypeID, childBehaviorIDs,
				childComponent.source, childComponent.type, childIndex, childName); // TODO: move node metadata back to the kernel and only use vwf/model/object just as a property store?

			// Construct the node.

			async.series([

				function(series_callback_async /* ( err, results ) */ ) {

					// Rudimentary support for `{ includes: prototype }`, which absorbs a prototype
					// descriptor into the child descriptor before creating the child. See the notes
					// in `createNode` and the `mergeDescriptors` limitations.

					// This first task always completes asynchronously (even if it doesn't perform
					// an async operation) so that the stack doesn't grow from node to node while
					// createChild() recursively traverses a component. If this task is moved,
					// replace it with an async stub, or make the next task exclusively async.

					if (componentIsDescriptor(childComponent) && childComponent.includes && componentIsURI(childComponent.includes)) { // TODO: for "includes:", accept an already-loaded component (which componentIsURI exludes) since the descriptor will be loaded again

						var prototypeURI = childComponent.includes;

						var sync = true; // will loadComponent() complete synchronously?

						loadComponent(prototypeURI, function(prototypeDescriptor) /* async */ {

							childComponent = mergeDescriptors(childComponent, prototypeDescriptor); // modifies prototypeDescriptor

							if (sync) {



								async.nextTick(function() {
									series_callback_async(undefined, undefined);

								});

							} else {
								series_callback_async(undefined, undefined);
							}

						});

						sync = false; // not if we got here first

					} else {



						async.nextTick(function() {
							series_callback_async(undefined, undefined);

						});

					}

				},

				function(series_callback_async /* ( err, results ) */ ) {

					// Create the prototype and behavior nodes (or locate previously created
					// instances).

					async.parallel([

						function(parallel_callback_async /* ( err, results ) */ ) {

							// Create or find the prototype and save the ID in childPrototypeID.

							if (childComponent.extends !== null) { // TODO: any way to prevent node loading node as a prototype without having an explicit null prototype attribute in node?
								vwfPredict.createNode(childComponent.extends || nodeTypeURI, function(prototypeID) /* async */ {
									childPrototypeID = prototypeID;

									// TODO: the GLGE driver doesn't handle source/type or properties in prototypes properly; as a work-around pull those up into the component when not already defined
									if (!childComponent.source) {
										var prototype_intrinsics = vwfPredict.intrinsics(prototypeID);
										if (prototype_intrinsics.source) {
											var prototype_uri = vwfPredict.uri(prototypeID);
											var prototype_properties = vwfPredict.getProperties(prototypeID);
											childComponent.source = require("vwf/utility").resolveURI(prototype_intrinsics.source, prototype_uri);
											childComponent.type = prototype_intrinsics.type;
											childComponent.properties = childComponent.properties || {};
											Object.keys(prototype_properties).forEach(function(prototype_property_name) {
												if (childComponent.properties[prototype_property_name] === undefined && prototype_property_name != "transform") {
													childComponent.properties[prototype_property_name] = prototype_properties[prototype_property_name];
												}
											});
										}
									}
									parallel_callback_async(undefined, undefined);
								});
							} else {
								childPrototypeID = undefined;
								parallel_callback_async(undefined, undefined);
							}

						},

						function(parallel_callback_async /* ( err, results ) */ ) {

							// Create or find the behaviors and save the IDs in childBehaviorIDs.

							var behaviorComponents = childComponent.implements ?
								[].concat(childComponent.implements) : []; // accept either an array or a single item

							async.map(behaviorComponents, function(behaviorComponent, map_callback_async /* ( err, result ) */ ) {
								vwfPredict.createNode(behaviorComponent, function(behaviorID) /* async */ {
									map_callback_async(undefined, behaviorID);
								});
							}, function(err, behaviorIDs) /* async */ {
								childBehaviorIDs = behaviorIDs;
								parallel_callback_async(err, undefined);
							});

						},

					], function(err, results) /* async */ {
						series_callback_async(err, undefined);
					});

				},

				function(series_callback_async /* ( err, results ) */ ) {

					// Re-register the node now that we have the prototypes and behaviors.

					child = nodes.create(childID, childPrototypeID, childBehaviorIDs, childURI, childName, nodeID);

					// Re-register the node in vwf/model/object now that we have the prototypes and
					// behaviors. vwf/model/object knows that we call it more than once and only
					// updates the new information.

					vwfPredict.models.object.creatingNode(nodeID, childID, childPrototypeID, childBehaviorIDs,
						childComponent.source, childComponent.type, childIndex, childName); // TODO: move node metadata back to the kernel and only use vwf/model/object just as a property store?

					// Call creatingNode() on each model. The node is considered to be constructed
					// after all models have run.

					async.forEachSeries(vwfPredict.models, function(model, each_callback_async /* ( err ) */ ) {

						var driver_ready = true;

						// TODO: suppress kernel reentry here (just for childID?) with kernel/model showing a warning when breached; no actions are allowed until all drivers have seen creatingNode()

						model.creatingNode && model.creatingNode(nodeID, childID, childPrototypeID, childBehaviorIDs,
							childComponent.source, childComponent.type, childIndex, childName, function(ready) /* async */ {

								if (driver_ready && !ready) {

									driver_ready = false;
								} else if (!driver_ready && ready) {
									each_callback_async(undefined); // resume createChild()

									driver_ready = true;
								}

							});

						// TODO: restore kernel reentry here

						driver_ready && each_callback_async(undefined);

					}, function(err) /* async */ {
						series_callback_async(err, undefined);
					});

				},

				function(series_callback_async /* ( err, results ) */ ) {

					// Call createdNode() on each view. The view is being notified of a node that has
					// been constructed.

					async.forEach(vwfPredict.views || [], function(view, each_callback_async /* ( err ) */ ) {

						var driver_ready = true;

						view.createdNode && view.createdNode(nodeID, childID, childPrototypeID, childBehaviorIDs,
							childComponent.source, childComponent.type, childIndex, childName, function(ready) /* async */ {

								if (driver_ready && !ready) {

									driver_ready = false;
								} else if (!driver_ready && ready) {
									each_callback_async(undefined); // resume createChild()

									driver_ready = true;
								}

							});

						driver_ready && each_callback_async(undefined);

					}, function(err) /* async */ {
						series_callback_async(err, undefined);
					});

				},

				function(series_callback_async /* ( err, results ) */ ) {

					// Set the internal state.

					vwfPredict.models.object.internals(childID, childComponent);

					// Suppress kernel reentry so that we can read the state without coloring from
					// any scripts.

					replicating && vwfPredict.models.kernel.disable();

					// Create the properties, methods, and events. For each item in each set, invoke
					// createProperty(), createMethod(), or createEvent() to create the field. Each
					// delegates to the models and views as above.

					childComponent.properties && jQuery.each(childComponent.properties, function(propertyName, propertyValue) {

						var value = propertyValue,
							get, set, create;

						if (valueHasAccessors(propertyValue)) {
							value = propertyValue.value;
							get = propertyValue.get;
							set = propertyValue.set;
							create = propertyValue.create;
						}

						// Is the property specification directing us to create a new property, or
						// initialize a property already defined on a prototype?

						// Create a new property if an explicit getter or setter are provided or if
						// the property is not defined on a prototype. Initialize the property when
						// the property is already defined on a prototype and no explicit getter or
						// setter are provided.

						var creating = create || // explicit create directive, or
							get !== undefined || set !== undefined || // explicit accessor, or
							!child.properties.has(propertyName); // not defined on prototype

						// Are we assigning the value here, or deferring assignment until the node
						// is constructed because setters will run?

						var assigning = value === undefined || // no value, or
							set === undefined && (creating || !nodePropertyHasSetter.call(vwf, childID, propertyName)) || // no setter, or
							replicating; // replicating previously-saved state (setters never run during replication)

						if (!assigning) {
							deferredInitializations[propertyName] = value;
							value = undefined;
						}

						// Create or initialize the property.

						if (creating) {
							vwfPredict.createProperty(childID, propertyName, value, get, set);
						} else {
							vwfPredict.setProperty(childID, propertyName, value);
						}

					});

					childComponent.methods && jQuery.each(childComponent.methods, function(methodName, methodValue) {

						if (valueHasBody(methodValue)) {
							vwfPredict.createMethod(childID, methodName, methodValue.parameters, methodValue.body);
						} else {
							vwfPredict.createMethod(childID, methodName, undefined, methodValue);
						}

					});

					childComponent.events && jQuery.each(childComponent.events, function(eventName, eventValue) {


						if (valueHasBody(eventValue)) {
							vwfPredict.createEvent(childID, eventName, eventValue.parameters, eventValue.body);
						} else {
							vwfPredict.createEvent(childID, eventName, undefined);
						}

					});

					// Restore kernel reentry.

					replicating && vwfPredict.models.kernel.enable();

					// Create and attach the children. For each child, call createChild() with the
					// child's component specification. createChild() delegates to the models and
					// views as before.

					async.forEach(Object.keys(childComponent.children || {}), function(childName, each_callback_async /* ( err ) */ ) {
						var childValue = childComponent.children[childName];

						vwfPredict.createChild(childID, childName, childValue, undefined, function(childID) /* async */ { // TODO: add in original order from childComponent.children  // TODO: propagate childURI + fragment identifier to children of a URI component?
							each_callback_async(undefined);
						});

					}, function(err) /* async */ {
						series_callback_async(err, undefined);
					});

				},

				function(series_callback_async /* ( err, results ) */ ) {

					// Attach the scripts. For each script, load the network resource if the script is
					// specified as a URI, then once loaded, call execute() to direct any model that
					// manages scripts of this script's type to evaluate the script where it will
					// perform any immediate actions and retain any callbacks as appropriate for the
					// script type.

					var scripts = childComponent.scripts ?
						[].concat(childComponent.scripts) : []; // accept either an array or a single item

					async.map(scripts, function(script, map_callback_async /* ( err, result ) */ ) {

						if (valueHasType(script)) {
							if (script.source) {
								loadScript(script.source, function(scriptText) /* async */ { // TODO: this load would be better left to the driver, which may want to ignore it in certain cases, but that would require a completion callback from kernel.execute()
									map_callback_async(undefined, {
										text: scriptText,
										type: script.type
									});
								});
							} else {
								map_callback_async(undefined, {
									text: script.text,
									type: script.type
								});
							}
						} else {
							map_callback_async(undefined, {
								text: script,
								type: undefined
							});
						}

					}, function(err, scripts) /* async */ {

						// Watch for any async kernel calls generated as we run the scripts and wait
						// for them complete before completing the node.

						vwfPredict.models.kernel.capturingAsyncs(function() {

							// Suppress kernel reentry so that initialization functions don't make
							// any changes during replication.

							replicating && vwfPredict.models.kernel.disable();

							// Create each script.

							scripts.forEach(function(script) {
								vwfPredict.execute(childID, script.text, script.type); // TODO: callback
							});

							// Perform initializations for properties with setter functions. These
							// are assigned here so that the setters run on a fully-constructed node.

							Object.keys(deferredInitializations).forEach(function(propertyName) {
								vwfPredict.setProperty(childID, propertyName, deferredInitializations[propertyName]);
							});

							// TODO: Adding the node to the tickable list here if it contains a tick() function in JavaScript at initialization time. Replace with better control of ticks on/off and the interval by the node.

							
							// Restore kernel reentry.

							replicating && vwfPredict.models.kernel.enable();

						}, function() {

							// This function is called when all asynchronous calls from the previous
							// function have returned.

							// Call initializingNode() on each model and initializedNode() on each
							// view to indicate that the node is fully constructed.

							// Since nodes don't (currently) inherit their prototypes' children,
							// for each prototype also call initializingNodeFromPrototype() to allow
							// model drivers to apply the prototypes' initializers to the node.

							async.forEachSeries(vwfPredict.prototypes(childID, true).reverse().concat(childID),
								function(childInitializingNodeID, each_callback_async /* err */ ) {

									// Call initializingNode() on each model.

									vwfPredict.models.kernel.capturingAsyncs(function() {

										vwfPredict.models.forEach(function(model) {

											// Suppress kernel reentry so that initialization functions
											// don't make any changes during replication.
											replicating && vwfPredict.models.kernel.disable();

											// For a prototype, call `initializingNodeFromPrototype` to
											// run the prototype's initializer on the node. For the
											// node, call `initializingNode` to run its own initializer.
											// 
											// `initializingNodeFromPrototype` is separate from
											// `initializingNode` so that `initializingNode` remains a
											// single call that indicates that the node is fully
											// constructed. Existing drivers, and any drivers that don't
											// care about prototype initializers will by default ignore
											// the intermediate initializations.
											// (`initializingNodeFromPrototype` was added in 0.6.23.)

											if (childInitializingNodeID !== childID) {
												model.initializingNodeFromPrototype &&
													model.initializingNodeFromPrototype(nodeID, childID, childInitializingNodeID);
											} else {
												model.initializingNode &&
													model.initializingNode(nodeID, childID, childPrototypeID, childBehaviorIDs,
														childComponent.source, childComponent.type, childIndex, childName);
											}

											// Restore kernel reentry.
											replicating && vwfPredict.models.kernel.enable();

										});

									}, function() {
										each_callback_async(undefined);
									});

								}, function(err) /* async */ {

									// Call initializedNode() on each view.

									(vwfPredict.views || []).forEach(function(view) {
										view.initializedNode && view.initializedNode(nodeID, childID, childPrototypeID, childBehaviorIDs,
											childComponent.source, childComponent.type, childIndex, childName);
									});

									// Mark the node as initialized.
									nodes.initialize(childID);

									series_callback_async(err, undefined);
								});
						});
					});
				},

			], function(err, results) /* async */ {

				// The node is complete. Invoke the callback method and pass the new node ID and the
				// ID of its prototype. If this was the root node for the application, the
				// application is now fully initialized.

				// Always complete asynchronously so that the stack doesn't grow from node to node
				// while createChild() recursively traverses a component.


				if (callback_async) {



					async.nextTick(function() {
						callback_async(childID);

					});

				}

			});


		},
		application:function()

		{
			return vwf.application();
		},
		prototype : function(nodeID) {
            if (!nodeID) return undefined;
            return this.models.object.prototype(nodeID);
        },

        // -- prototypes ---------------------------------------------------------------------------

        /// @name module:vwf.prototypes
        /// 
        /// @see {@link module:vwf/api/kernel.prototypes}

        prototypes : function(nodeID, includeBehaviors) {

            var prototypes = [];

            do {

                // Add the current node's behaviors.
                if (includeBehaviors) {
                    var b = [].concat(this.behaviors(nodeID));
                    Array.prototype.push.apply(prototypes, b.reverse());
                }

                // Get the next prototype.
                nodeID = this.prototype(nodeID);

                // Add the prototype.
                if (nodeID) {
                    prototypes.push(nodeID);
                }

            } while (nodeID);

            return prototypes;
        },

        // -- behaviors ----------------------------------------------------------------------------

        /// @name module:vwf.behaviors
        /// 
        /// @see {@link module:vwf/api/kernel.behaviors}

        behaviors : function(nodeID) {
            return this.models.object.behaviors(nodeID);
        },

        children : function(nodeID) {

            if (nodeID === undefined) {
                
                return ;
            }

            return this.models.object.children(nodeID);
        },
		execute : function(nodeID, scriptText, scriptType, callback_async /* result */ ) {

          

            // Assume JavaScript if the type is not specified and the text is a string.

            if (!scriptType && (typeof scriptText == "string" || scriptText instanceof String)) {
                scriptType = "application/javascript";
            }

            // Call executing() on each model. The script is considered executed after all models
            // have run.

            var scriptValue = undefined;

            // Watch for any async kernel calls generated as we execute the scriptText and wait for
            // them to complete before calling the callback.

            vwfPredict.models.kernel.capturingAsyncs(function() {
                vwfPredict.models.some(function(model) {
                    scriptValue = model.executing &&
                        model.executing(nodeID, scriptText, scriptType);
                    return scriptValue !== undefined;
                });

                // Call executed() on each view to notify view that a script has been executed.

               

            }, function() {
                callback_async && callback_async(scriptValue);
            });

           

            return scriptValue;
        },
		ancestors: function(nodeID, initializedOnly) {

			var ancestors = [];

			nodeID = this.parent(nodeID, initializedOnly);

			while (nodeID && nodeID !== 0) {
				ancestors.push(nodeID);
				nodeID = this.parent(nodeID, initializedOnly);
			}

			return ancestors;
		},
		parent: function(nodeID, initializedOnly) {
			if (!nodeID) return undefined;
			return this.models.object.parent(nodeID, initializedOnly);
		},
		setState: function(applicationState, callback_async /* () */ ) {



			// Set the runtime configuration.

			if (applicationState.configuration) {
				require("vwf/configuration").instance = applicationState.configuration;
			}

			// Update the internal kernel state.

			if (applicationState.kernel) {
				if (applicationState.kernel.time !== undefined) vwfPredict.now = applicationState.kernel.time;
			}

			// Create or update global nodes and their descendants.

			var nodes = applicationState.nodes || [];
			var annotations = applicationState.annotations || {};

			var nodeIndex = 0;

			async.forEachSeries(nodes, function(nodeComponent, each_callback_async /* ( err ) */ ) {

				// Look up a possible annotation for this node. For backward compatibility, if the
				// state has exactly one node and doesn't contain an annotations object, assume the
				// node is the application.

				var nodeAnnotation = nodes.length > 1 || applicationState.annotations ?
					annotations[nodeIndex] : "application";

				vwfPredict.createNode(nodeComponent, nodeAnnotation, function(nodeID) /* async */ {
					each_callback_async(undefined);
				});

				nodeIndex++;

			}, function(err) /* async */ {

				// Clear the message queue, except for reflector messages that arrived after the
				// current action.



				// Set the queue time and add the incoming items to the queue.
				async.forEachSeries(this.views || [], function(view, cb) {
					if (view.satState)
						view.satState(applicationState, cb);
					else
						cb();
				}, function() {
					callback_async && callback_async();
				})


			});


		}
	};
})