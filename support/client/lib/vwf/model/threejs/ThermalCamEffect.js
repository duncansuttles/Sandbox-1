define(["module", "vwf/view", "vwf/view/threejs/postprocessing/EffectComposer",
    "vwf/view/threejs/postprocessing/RenderPass",
    "vwf/view/threejs/postprocessing/MaskPass",
    "vwf/view/threejs/postprocessing/ShaderPass",
    "vwf/view/threejs/postprocessing/BloomPass",
    "vwf/view/threejs/postprocessing/FilmPass",
    "vwf/view/threejs/shaders/CopyShader",
    "vwf/view/threejs/shaders/FilmShader",
    "vwf/view/threejs/shaders/ConvolutionShader",
    "vwf/view/threejs/shaders/VignetteShader",


], function() {

    var THREE = window.THREE || {};
    THREE.ThermalCamEffect = function(renderer, scene, camera) {
        var composer = new THREE.EffectComposer(renderer);
         var renderScene = new THREE.RenderPass(scene, camera);

        composer.setSize(window.innerWidth / 2, window.innerHeight / 2);
        composer.addPass(renderScene);
        var effectBloom = new THREE.BloomPass(1);
        
        composer.addPass(effectBloom);
        var filma = new THREE.FilmPass(0.35, 0.5, 512, true);
        var filmb = new THREE.FilmPass(0.35, 0.5, 2048, true);
        var shaderVignette = THREE.VignetteShader;
        var effectVignette = new THREE.ShaderPass(shaderVignette);
        effectVignette.uniforms["offset"].value = 0.95;
        effectVignette.uniforms["darkness"].value = 1.6;
        composer.addPass(filma);
        composer.addPass(filmb);
        composer.addPass(effectVignette);
        effectVignette.renderToScreen = true;
        this.matBackup = {};
        this.updateMats = function() {
            for (var i in _MaterialCache.materials) {
                if (this.matBackup[i]) continue;
                var def = JSON.parse(i);
                var mat = _MaterialCache.materials[i];
                var rest = {};
                rest.mat = mat;
                this.matBackup[i] = rest;
                mat.alphaMap = mat.map;
                mat.map = null;
                if (mat.diffuse) {
                    mat.diffuse.r = def.IR || .5;
                    mat.diffuse.g = def.IR || .5;
                    mat.diffuse.b = def.IR || .5;
                }
                if (mat.emissive) {
                    mat.emissive.r = def.IR || .2;
                    mat.emissive.g = def.IR || .2;
                    mat.emissive.b = def.IR || .2;
                }
               
                mat.needsUpdate = true;
                for(var i in _dScene.__lights)
            {
                _dScene.__lights[i].color.r = .1;
                _dScene.__lights[i].color.g = .1;
                _dScene.__lights[i].color.b = .1;
            }
            }
            
        }
        this.render = function(scene, camera) {

        	
            this.updateMats();
            composer.render();
            effectBloom.materialConvolution.uniforms.uImageIncrement.value.x = .001;
       	    effectBloom.materialCopy.uniforms.opacity.value = 1.2;
        }
        this.setSize = function(x, y) {
            composer.setSize(x / 2, y / 2);

        }



    }
});