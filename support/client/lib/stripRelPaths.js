 define({
            load: function(name, req, onload, config) {
                //req has the same API as require().
                //when loading from the client side, add a ../ to some modules
                //the VWF directory structure loads some content from the base url, including the 
                //world id. Strip this to improve caching.
                //however, during a requirejs build, do nothing, in order to preserve the careful build code

                req([config.isBuild ? name : '/adl/sandbox/'+name + '.js'], function(value) {
                    onload(value);
                });
            }
        });