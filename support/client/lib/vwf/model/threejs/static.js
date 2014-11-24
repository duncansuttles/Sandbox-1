(function() {
    function isStatic(childID, childSource, childName) {
        this.isStatic = false;
        this.dynamic = false;

        function setMeshStatic(node, val) {
            if (node instanceof THREE.Mesh)
                node.setStatic(val);
            for (var i = 0; i < node.children.length; i++)
                setMeshStatic(node.children[i], val);
        }
        function setMeshDynamic(node, val) {
            if (node instanceof THREE.Mesh)
                node.setDynamic(val);
            for (var i = 0; i < node.children.length; i++)
                setMeshDynamic(node.children[i], val);
        }
        this.settingProperty = function(propname, propval) {
            if (propname == 'isStatic') {

                if (this.sourceType == 'subDriver/threejs/asset/vnd.collada+xml+optimized') {
                    console.warn('Optimized assets cannot currently be marked static.');
                    return propval;
                }
                
                this.isStatic = propval;
                if (!this.dynamic)
                    setMeshStatic(this.getRoot(), this.isStatic);
                if (this.isStatic)
                    this.settingProperty('visible', true);
                return propval;
            }
            if (propname == 'isDynamic') {

                if (this.sourceType == 'subDriver/threejs/asset/vnd.collada+xml+optimized') {
                    console.warn('Optimized assets cannot currently be marked dynamic.');
                    return propval;
                }

                this.settingProperty('isStatic', false);
                this.dynamic = propval;
                setMeshDynamic(this.getRoot(),propval);
                return propval;
            }
        }
        this.gettingProperty = function(propname, propval) {
            if (propname == 'isStatic') {
                return this.isStatic;
            }
            if (propname == 'isDynamic') {
                return this.dynamic;
            }
        }
    }


    //default factory code
    return function(childID, childSource, childName) {
        //name of the node constructor
        return new isStatic(childID, childSource, childName);
    }
})();