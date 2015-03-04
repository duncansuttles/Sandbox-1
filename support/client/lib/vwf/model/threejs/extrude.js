(function() {
    function extrude(childID, childSource, childName) {
        this.amount = 1;
        this.steps = 1;
        this.mymesh = null;
        this.hideLine = false;
        this.axis = 'Z';
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
            extrusionSettings.extrudePath.points.push(new THREE.Vector3(0, 0, 0));
            if (geo.vertices.length === 0) return;

            if (this.axis === 'Z') {
                for (var i = 0; i < geo.vertices.length; i++) {
                    points.push(new THREE.Vector2(geo.vertices[i].x, geo.vertices[i].y));
                }
                extrusionSettings.extrudePath.points.push(new THREE.Vector3(0, 0, this.amount));
            }
            if (this.axis === 'Y') {
                for (var i = 0; i < geo.vertices.length; i++) {
                    if (this.amount > 0)
                        points.push(new THREE.Vector2(-geo.vertices[i].z, -geo.vertices[i].x));
                    else
                        points.push(new THREE.Vector2(-geo.vertices[i].z, geo.vertices[i].x));
                }
                extrusionSettings.extrudePath.points.push(new THREE.Vector3(0, this.amount, 0));
            }
            if (this.axis === 'X') {
                for (var i = 0; i < geo.vertices.length; i++) {
                    if (this.amount > 0)
                        points.push(new THREE.Vector2(-geo.vertices[i].z, geo.vertices[i].y));
                    else
                        points.push(new THREE.Vector2(-geo.vertices[i].z, -geo.vertices[i].y));
                }
                extrusionSettings.extrudePath.points.push(new THREE.Vector3(this.amount, 0, 0));
            }
            var center = new THREE.Vector3(0, 0, 0)

            center.add(geo.vertices[0]);

            if (this.axis === 'Y') {
                extrusionSettings.extrudePath.points[0].add(new THREE.Vector3(0, center.y, 0));
                extrusionSettings.extrudePath.points[1].add(new THREE.Vector3(0, center.y, 0));
            }
            if (this.axis === 'X') {
                extrusionSettings.extrudePath.points[0].add(new THREE.Vector3(center.x, 0, 0));
                extrusionSettings.extrudePath.points[1].add(new THREE.Vector3(center.x, 0, 0));
            }
            if (this.axis === 'Z') {
                delete extrusionSettings.extrudePath;
                extrusionSettings.amount = this.amount;
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
        this.settingProperty = function(prop, val) {
            if (prop == 'amount') {
                this.amount = val;
                this.dirtyStack();
            }
            if (prop == 'steps') {
                this.steps = parseInt(val);
                this.dirtyStack();
            }
            if (prop == 'axis') {
                this.axis = val;
                this.dirtyStack();
            }
            if(prop == 'hideLine')
            {
            	this.hideLine = val;
            	this.dirtyStack();
            }

        }
        this.GetMesh = function() {
            return this.mymesh;
        }
        this.gettingProperty = function(prop) {
            if (prop == 'amount') {
                return this.amount;
            }
            if (prop == 'steps') {
                return this.steps;
            }
            if (prop == 'axis') {
                return this.axis;
            }
            if (prop == 'type') {
                return 'modifier';
            }
            if (prop == 'EditorData') {
                return {

                    amount: {
                        displayname: 'Amount',
                        property: 'amount',
                        type: 'slider',
                        min: -1,
                        max: 1,
                        step: .01
                    },
                    steps: {
                        displayname: 'Steps',
                        property: 'steps',
                        type: 'slider',
                        min: 1,
                        max: 20,
                        step: 1
                    },
                    axis: {
                        displayname: 'Axis',
                        property: 'axis',
                        type: 'choice',
                        values: ['X', "Y", "Z"],
                        labels: ['X', "Y", "Z"]


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
        return new extrude(childID, childSource, childName);
    }
})();

//@ sourceURL=threejs.subdriver.extrude