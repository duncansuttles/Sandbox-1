(function() {
    

    function materialDef(childID, childSource, childName) {

       
        
        this.initializingNode = function() {

            this.settingProperty('materialDef', this.materialDef);
            if (this.dirtyStack)
                this.dirtyStack(true);
        }
        this.GetAllLeafMeshes = function(threeObject, list) {

            if (threeObject.vwfID) return;
            if (threeObject instanceof THREE.Mesh && threeObject.name !== 'BoneSelectionHandle') {
                list.push(threeObject);
            }
            if (threeObject.children) {
                for (var i = 0; i < threeObject.children.length; i++) {

                    this.GetAllLeafMeshesMat(threeObject.children[i], list);
                }
            }
        }
        this.GetAllLeafMeshesMat = function(threeObject, list) {

            if (threeObject.vwfID) return;
            if (threeObject instanceof THREE.Mesh && threeObject.name !== 'BoneSelectionHandle') {
                list.push(threeObject);
            }
            if (threeObject.children) {
                for (var i = 0; i < threeObject.children.length; i++) {

                    this.GetAllLeafMeshesMat(threeObject.children[i], list);
                }
            }
        }
        this.compareLayers = function(olddef,newdef)
        {		
        	if(!(olddef instanceof Array))
        		olddef = [olddef];
        	if(!(newdef instanceof Array))
        		newdef = [newdef];

        	var newdeflayers = [];
        	for(var i =0; i <newdef.length; i ++)
        		newdeflayers = newdeflayers.concat(newdef.layers)

        	var olddeflayers = [];
        	for(var i =0; i <olddef.length; i ++)
        		olddeflayers = olddeflayers.concat(olddef.layers)
        	if(olddeflayers.length !== newdeflayers.length) return false;
        	for(var i =0; i < newdeflayers.length; i++)
        	{
        		if(!newdeflayers[i] && olddeflayers[i]) return false;
        		if(newdeflayers[i] && !olddeflayers[i]) return false;
        		if(!newdeflayers[i] && !olddeflayers[i]) continue;
        		if(newdeflayers[i].src != olddeflayers[i].src) return false;
        		if(newdeflayers[i].mapTo != olddeflayers[i].mapTo) return false;
        	}
        	return true;
        }
        this.settingProperty = function(propname, propval) {

            //if it's a prim, this.build will be true. Prims must be able to reset the material, and won't pass this check
            if (!Object.deepEquals(propval, this.materialDef) || this.Build)
            if (propname == 'materialDef' && propval ) {

                var needRebuild = false;

                if (!this.compareLayers(this.materialDef,propval)) {
                        needRebuild = true;
                }
                this.materialDef = propval;
                var list = [];

                for (var i = 0; i < this.getRoot().children.length; i++) {
                    this.GetAllLeafMeshesMat(this.getRoot().children[i], list);
                }
                if (this.getRoot() instanceof THREE.Mesh)
                    list.push(this.getRoot());

                for (var i = 0; i < list.length; i++) {

                    if (list[i].morphTargetInfluences)
                        propval.morphTargets = true;
                    else
                        propval.morphTargets = false;
                    if (list[i].animationHandle)
                        propval.skinning = true;
                    else
                        propval.skinning = false;
                    if(list[i].receiveShadow)
                        propval.shadows = true;
                    else
                        propval.shadows = false;
                    
                    if(!(propval instanceof Array))
                    	_MaterialCache.setMaterial(list[i], propval);
                    else if(list.length == 1)
                    	_MaterialCache.setMaterial(list[i], propval);
                    else
                    {
                    	_MaterialCache.setMaterial(list[i], propval[Math.min(i,propval.length-1)]);
                    }


                        list[i].materialUpdated();
                }

                if (this.dirtyStack && needRebuild) {

                    this.dirtyStack(true);
                }
            }
        }
        //get the material cache a chance to decrement the ref counter for the materails used by this object
        this.deletingNode = function() {
            //dont remove the materials, as the actual view node might still exist
            if (this.initializedFromAsset) return;

            //else, this object is deleting for real, and we can remvoe the materials from the cache.
            var list = [];

            this.GetAllLeafMeshesMat(this.getRoot(), list);
            for (var i = 0; i < list.length; i++) {
                _MaterialCache.setMaterial(list[i], null);
            }
        }
        this.gettingProperty = function(propname, propval) {

            if (propname == 'materialDef') {

                return this.materialDef || this.defaultmaterialDef;
            }
        }
        
    }
    //default factory code
    return function(childID, childSource, childName) {
        //name of the node constructor
        return new materialDef(childID, childSource, childName);
    }
})();

//@ sourceURL=threejs.subdriver.materialDef