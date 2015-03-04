(function() {
    function modifier(childID, childSource, childName) {
        this.active = true;
        this.callingMethod = function(methodName, args) {
            args = args || [];
            if (methodName == 'GetMesh') {
                return this.GetMesh();
            }
            if (methodName == 'dirtyStack') {
                return this.dirtyStack(args[0],args[1],args[2]);
            }
            if (methodName == 'updateStack') {
                return this.updateStack(args[0],args[1],args[2]);
            }
            if (methodName == 'updateSelf') {
                return this.updateSelf(args[0],args[1],args[2]);
            }
        }
        this.gettingProperty = function(prop) {
            if (prop == 'isModifier') return true;
            if (prop == 'active') return this.active;
        }
        this.settingProperty = function(prop, val) {
            if (prop == 'isModifier') return true;
            if (prop == 'active') {
                this.active = val;
                this.dirtyStack();
            }
        }
        this.initializingNode = function() {

            this.dirtyStack();
        }
        this.updateStack = function() {
            try {
                if (this.active)
                    this.updateSelf();
                var children = vwf.children(this.ID);
                for (var i in children) {
                    return vwf.callMethod(children[i], 'updateStack');
                }
            } catch (e) {
                console.log(e);
            }
        }
        this.GetMesh = function() {
            if (this.parentNode)
                if (this.parentNode.GetMesh)
                    return this.parentNode.GetMesh();
            return vwf.callMethod(vwf.parent(this.ID), 'GetMesh');
        }
        this.GetBounds = function() {

            return vwf.callMethod(vwf.parent(this.ID), 'GetBounds');
        }
        this.dirtyStack = function() {
            //modifiers parents are assumed to be either a modifier or a prim. modifiers never trigger a stack update
            vwf.callMethod(vwf.parent(this.ID), 'dirtyStack');
            return false;
        }
        //must be defined by the object
        this.getRoot = function() {
            return this.rootnode;
        }
        this.rootnode = new THREE.Object3D();
        //this.Build();
    }
    //default factory code
    return function(childID, childSource, childName) {
        //name of the node constructor
        return new modifier(childID, childSource, childName);
    }
})();

//@ sourceURL=threejs.subdriver.modifier