(function() {
    function pathextrude(childID, childSource, childName) {
        this.amount = 1;
        this.steps = 1;
        this.mymesh = null;
        this.hideLine = false;
        this.axis = 'Z';
        this.pathPoints = [];
        this.updateSelf = function() {

            if (this.mymesh && this.mymesh.parent)
                this.mymesh.parent.remove(this.mymesh);


            var mesh = this.parentNode.GetMesh();
            if(this.hideLine)
            	mesh.visible = false;
            if (!mesh) return;
            var geo = mesh.geometry;
            if (!geo) return;
            var points = [];

            var extrusionSettings = {

                steps: this.steps + 2,

                bevelEnabled: false,
                material: 0, extrudeMaterial: 1
            };
            extrusionSettings.extrudePath = new THREE.SplineCurve3([]);
            
            if(this.pathPoints.length == 0) return;
            for(var i in this.pathPoints)
            {
            	extrusionSettings.extrudePath.points.push(new THREE.Vector3(this.pathPoints[i][0],0,this.pathPoints[i][1]));
            }
            
            var center = new THREE.Vector3(0, 0, 0)

            center.add(geo.vertices[0]);

             for (var i = 0; i < geo.vertices.length; i++) {
                    points.push(new THREE.Vector2(geo.vertices[i].x, geo.vertices[i].y));
              }
            
           
            var shape = new THREE.Shape(points);
            var geometry = new THREE.ExtrudeGeometry(shape, extrusionSettings);
            var p = mesh.parent;
            //	mesh.parent.remove(mesh);
            this.mymesh = new THREE.Mesh(geometry, mesh.material)

           
            this.mymesh.castShadow = this.parentNode.castShadows;
            this.mymesh.receiveShadow = this.parentNode.receiveShadows;
            _MaterialCache.setMaterial(this.mymesh, this.parentNode.materialDef);
            p.add(this.mymesh);

        }
        this.deletingNode = function() {
            this.dirtyStack();
            if (this.mymesh)
                this.mymesh.parent.remove(this.mymesh);
        }
        this.initializingNode = function() {
           	try{
            this.updateSelf();
            this.dirtyStack();
        	}catch(e)
        	{
        		console.error(e);
        	}
        }
        this.setPathPoints = function(id)
        {
        	try{
        		this.pathPoints = vwf.callMethod(id,'getPoints');
        	}catch(e)
        	{
        		return;
        	}
        }
        this.settingProperty = function(prop, val) {
            if (prop == 'steps') {
                this.steps = parseInt(val);
                this.dirtyStack();
            }
            if(prop == 'hideLine')
            {
            	this.hideLine = val;
            	this.dirtyStack();
            }
            if(prop == 'pathID')
            {
            	this.setPathPoints(val);
            	this.dirtyStack();
            	return null;
            }
            if(prop == 'pathPoints')
            	this.pathPoints = val;
        }
        this.GetMesh = function() {
            return this.mymesh;
        }
        this.gettingProperty = function(prop) {
            if (prop == 'steps') {
                return this.steps;
            }
            if (prop == 'type') {
                return 'modifier';
            }
            if (prop == 'pathID') {
                return null;
            }
            if (prop == 'EditorData') {
                return {
                    steps: {
                        displayname: 'Steps',
                        property: 'steps',
                        type: 'slider',
                        min: 1,
                        max: 20,
                        step: 1
                    },
            		pathID:{
            			displayname : "Choose Path",
            			property: 'pathID',
                        type: 'nodeid',
            		},
                    hideLine: {
                        displayname: 'Hide Parent Line ',
                        property: 'hideLine',
                        type: 'check',
                    }
                }
            }
        }
        this.inherits = ['vwf/model/threejs/modifier.js', ];
    }

    //default factory code
    return function(childID, childSource, childName) {
        //name of the node constructor
        return new pathextrude(childID, childSource, childName);
    }
})();

//@ sourceURL=threejs.subdriver.pathextrude