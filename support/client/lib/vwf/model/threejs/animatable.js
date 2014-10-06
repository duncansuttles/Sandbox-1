"use strict";
(function() {



    function getSkin(node, list) {

        if (!list) list = [];
        if (node instanceof THREE.SkinnedMesh) {
            list.push(node);
        }
        for (var i = 0; i < node.children.length; i++)
            getSkin(node.children[i], list);
        return list;
    }

    function getAllDrawables(threeObject, list) {

        if (!threeObject) return;
        if (!list) list = [];
        if (threeObject instanceof THREE.Mesh || threeObject instanceof THREE.Line)
            list.push(threeObject);
        if (threeObject.children) {
            for (var i = 0; i < threeObject.children.length; i++) {
                findAllMeshes(threeObject.children[i], list);
            }
        }
        return list;


    }

    function animatable(childID, childSource, childName) {
        this.animationFrame = 0;
        this.animationSpeed = 1;
        //this my be called by the view driver during interpolation
        //in which case, there is no point in dirtying the scenemanager, as you may not 
        //reason over the interpolated values anyway
        this.setAnimationFrameInternal = function(propertyValue, updateSceneManager) {

            if (this.animationFrame === propertyValue) return;
            this.animationFrame = propertyValue;
            var skins = getSkin(this.getRoot());
            for (var i = 0; i < skins.length; i++) {

                var frame = parseInt(propertyValue);
                var mod = propertyValue - frame;
                if (frame < 0) return;

                if (frame === null) return;

                if (skins[i].morphTargetInfluences) {
                    for (var j = 0; j < skins[i].morphTargetInfluences.length; j++) {

                        skins[i].morphTargetInfluences[j] = 0;


                    }

                    if (frame == this.animationEnd)
                        mod = 0;

                    skins[i].morphTargetInfluences[frame] = 1.0 - mod;
                    if (frame < (this.animationEnd || this.gettingProperty('animationLength')) - 1)
                        skins[i].morphTargetInfluences[frame + 1] = mod;

                }
                if (skins[i].animationHandle) {
                   
                    skins[i].animationHandle.setKey(this.animationFrame);
                    skins[i].updateMatrixWorld(true);
                    
                    //odd, does not seem to update matrix on first child bone. 
                    //how does the bone relate to the skeleton?

                    //this is no longer necessary in threejs r68
                    //for (var j = 0; j < skins[i].children.length; j++) {
                    //  skins[i].children[j].updateMatrixWorld(true);
                    //}
                   
                    if (updateSceneManager) {
                        var allMeshes = getAllDrawables(skins[i]);
                        for (var k = 0; k < allMeshes.length; k++)
                            _SceneManager.setDirty(allMeshes[k]);
                    }

                }
            }

        }
        this.settingProperty = function(propertyName, propertyValue) {
            if (propertyName == 'animationFrame') {
                return this.setAnimationFrameInternal(propertyValue, true);
            }
            if (propertyName == 'animationState') {
                this.animationState = parseInt(propertyValue);
            }
            if (propertyName == 'animationStart') {
                this.animationStart = parseInt(propertyValue);
            }
            if (propertyName == 'animationEnd') {
                this.animationEnd = parseInt(propertyValue);
            }
            if (propertyName == 'animationSpeed') {
                this.animationSpeed = propertyValue;
            }
        }
        this.gettingProperty = function(propertyName) {
            if (propertyName == 'animationFrame') {
                return this.animationFrame;
            }
            if (propertyName == 'animationStart') {
                return this.animationStart || 0;
            }
            if (propertyName == 'animationEnd') {
                return this.animationEnd || this.gettingProperty('animationLength');
            }
            if (propertyName == 'animationLength') {

                var skins = getSkin(this.getRoot());
                if (skins[0] && skins[0].morphTargetInfluences) return skins[0].morphTargetInfluences.length;
                if (skins[0] && skins[0].animationHandle)
                    return skins[0].animationHandle.data.length * skins[0].animationHandle.data.fps;
                return 0;
            }
            if (propertyName == 'animationState') {
                return this.animationState;
            }
            if (propertyName == 'animationSpeed') {
                return this.animationSpeed;
            }
        }
        this.ticking = function() {

            if (this.animationState == 1) {

                var nextframe = this.animationFrame + this.animationSpeed;
                if (nextframe > this.animationEnd - 1) {
                    nextframe = this.animationStart || 0;

                }

                vwf.setProperty(this.ID, 'animationFrame', nextframe);
            }

        }
    }
    //default factory code
    return function(childID, childSource, childName) {
        //name of the node constructor
        return new animatable(childID, childSource, childName);
    }
})();