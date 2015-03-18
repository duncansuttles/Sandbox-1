function MorphRawJSONLoader()
{
    this.load = function(url, callback)
    {
        $.get(url, function(data)
        {
            var dummyNode = new THREE.Object3D();
            dummyNode.morphTarget = JSON.parse(data);
            callback(
            {
                scene: dummyNode
            });
        });
    }
}

function MorphBinaryLoader()
{
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function(url, callback)
    {
        var arrayBuffer = xhr.response;
        if (arrayBuffer)
        {
            var byteArray = new Float32Array(arrayBuffer);
            for (var i = 0; i < byteArray.byteLength; i++)
            {
                var dummyNode = new THREE.Object3D();
                dummyNode.morphTarget = JSON.parse(byteArray.byteLength[i]);
                callback(
                {
                    scene: dummyNode
                });
            }
        }
    };
}

 var NOT_STARTED = 0;
    var PENDING = 1;
    var FAILED = 2;
    var SUCCEDED = 3;
    var LOAD_FAIL_TIME = 20 * 1000;

var assetRegistry = function() {
    this.assets = {};
    this.initFromPreloader = function(childType, assetSource)
    {
        this.assets[assetSource] = {};
        this.assets[assetSource].refcount = 0;
        this.assets[assetSource].loaded = false;
        this.assets[assetSource].pending = false;
        this.assets[assetSource].callbacks = [];
        this.assets[assetSource].failcallbacks = [];
        //see if it was preloaded
        if (childType == 'subDriver/threejs/asset/vnd.raw-morphttarget' && _assetLoader.getMorphs(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getMorphs(assetSource).scene;
        }
        if (childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed' && _assetLoader.getUtf8Json(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getUtf8Json(assetSource).scene;
        }
        if (childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed+optimized' && _assetLoader.getUtf8JsonOptimized(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getUtf8JsonOptimized(assetSource).scene;
        }
        if (childType == 'subDriver/threejs/asset/vnd.collada+xml' && _assetLoader.getCollada(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getCollada(assetSource).scene;
        }
        if (childType == 'subDriver/threejs/asset/vnd.collada+xml+optimized' && _assetLoader.getColladaOptimized(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getColladaOptimized(assetSource).scene;
        }
        if ((childType == 'subDriver/threejs/asset/vnd.gltf+json' || childType == 'subDriver/threejs/asset/vnd.raw-animation') && _assetLoader.getglTF(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getglTF(assetSource).scene;
            this.assets[assetSource].animations = _assetLoader.getglTF(assetSource).animations;
            this.assets[assetSource].rawAnimationChannels = _assetLoader.getglTF(assetSource).rawAnimationChannels;
        }
    }
    this.newLoad = function(childType, assetSource, success, failure)
    {
        //thus, it becomes pending
        var reg = this.assets[assetSource];
        reg.refcount++;
        reg.loadState = NOT_STARTED;
        reg.failTimeout = null;
        reg.loadSucceded = function()
        {
            console.log('load SUCCEDED');
            this.loadState = SUCCEDED;
            window.clearTimeout(this.failTimeout);
            this.failTimeout = null;
        }
        reg.loadStarted = function()
        {
            console.log('load started');
            this.loadState = PENDING;
            this.failTimeout = window.setTimeout(function()
                {
                    this.assetFailed();
                    this.loadState = FAILED;
                    console.log('load failed due to timeout');
                }.bind(this),
                LOAD_FAIL_TIME);
        }

        reg.pending = true;
        reg.callbacks.push(success);
        reg.failcallbacks.push(failure);
        var assetLoaded = function(asset)
        {

            //store this asset in the registry
            //get the entry from the asset registry
            reg = assetRegistry.assets[assetSource];
            if (reg.loadState !== PENDING) return; // in this case, the callback from the load either came too late, and we have decided it failed, or came twice, which really it never should
            //it's not pending, and it is loaded
            if(!asset)
            {
                _ProgressBar.hide();
                this.assetFailed();
                return;
            }
            reg.loadSucceded();
            reg.pending = false;
            reg.loaded = true;
            //actually, is this necessary? can we just store the raw loaded asset in the cache? 
            if (childType !== 'subDriver/threejs/asset/vnd.gltf+json' && childType !== 'subDriver/threejs/asset/vnd.raw-animation')
                reg.node = asset.scene; //dont clone into the cache, since we clone on the way out
            else
            {
                glTFCloner.clone(asset.scene, asset.rawAnimationChannels, function(clone)
                {
                    reg.node = clone;
                    reg.rawAnimationChannels = asset.rawAnimationChannels
                });
            }
            for (var i = 0; i < reg.callbacks.length; i++)
                reg.callbacks[i](asset.scene, asset.rawAnimationChannels);
            //nothing should be waiting on callbacks now.
            reg.callbacks = [];
            reg.failcallbacks = [];
            _ProgressBar.hide();
        }
        reg.assetLoaded = assetLoaded;
        var assetFailed = function(id)
        {
            //the collada loader uses the failed callback as progress. data means this is not really an error;
            if (!id)
            {
                if (window._Notifier)
                {
                    _Notifier.alert('error loading asset ' + this.assetSource);
                }
                //get the entry from the asset registry
                reg = assetRegistry.assets[assetSource];
                $(document).trigger('EndParse');
                //it's not pending, and it is loaded
                reg.pending = false;
                reg.loaded = false;
                reg.loadState = NOT_STARTED;
                //store this asset in the registry
                reg.node = null;
                //if any callbacks were waiting on the asset, call those callbacks
                for (var i = 0; i < reg.failcallbacks.length; i++)
                    reg.failcallbacks[i](null);
                //nothing should be waiting on callbacks now.
                reg.callbacks = [];
                reg.failcallbacks = [];
                _ProgressBar.hide();
                window.clearTimeout(reg.failTimeout);
               
            }
            else
            {
              
                //this is actuall a progress event!
                _ProgressBar.setProgress(id.loaded / (id.total || 1000000)); //total is usually 0 due to contentLength header never working
                _ProgressBar.setMessage(assetSource);
                _ProgressBar.show();
            }
        }
        reg.assetFailed = assetFailed;
        if (childType == 'subDriver/threejs/asset/vnd.collada+xml')
        {
            reg.loadStarted();
            this.loader = new THREE.ColladaLoader();
            this.loader.load(assetSource, assetLoaded, assetFailed);
        }
        if (childType == 'subDriver/threejs/asset/vnd.collada+xml+optimized')
        {
            reg.loadStarted();
            this.loader = new ColladaLoaderOptimized();
            this.loader.load(assetSource, assetLoaded, assetFailed);
        }
        if (childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed+optimized')
        {
            reg.loadStarted();
            this.loader = new UTF8JsonLoader_Optimized(
            {
                source: assetSource
            }, assetLoaded, assetFailed);
        }
        if (childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed')
        {
            reg.loadStarted();
            this.loader = new UTF8JsonLoader(
            {
                source: assetSource
            }, assetLoaded, assetFailed);
        }
        if (childType == 'subDriver/threejs/asset/vnd.gltf+json' || childType == 'subDriver/threejs/asset/vnd.raw-animation')
        {
            var loader = new THREE.glTFLoader()
            loader.useBufferGeometry = true;
            var source = assetSource;
            var animOnly = childType === 'subDriver/threejs/asset/vnd.raw-animation'
                //create a queue to hold requests to the loader, since the loader cannot be re-entered for parallel loads
            if (!THREE.glTFLoader.queue)
            {
                //task is an object that olds the info about what to load
                //nexttask is supplied by async to trigger the next in the queue;

                //note the timeout does not account for the fact that the load has not really started because of the queue
                reg.loadStarted();

                THREE.glTFLoader.queue = new async.queue(function(task, nextTask)
                {
                    var node = task.node;
                    var cb = task.cb;
                    //call the actual load function
                    //signature of callback dictated by loader
                    node.loader.load(node.source, function(geometry, materials)
                    {
                        //ok, this model loaded, we can start the next load
                        nextTask();
                        //do whatever it was (asset loaded) that this load was going to do when complete
                        cb(geometry, materials);
                    }, animOnly);
                }, 1);
            }
            //we need to queue up our entry to this module, since it cannot handle re-entry. This means that while it 
            //is an async function, it cannot be entered again before it completes
            THREE.glTFLoader.queue.push(
            {
                node:
                {
                    source: source,
                    loader: loader
                },
                cb: assetLoaded
            })
        }
        //load as a normal gltf file TODO:add this to the preloader, since it should work normally
        if (childType == 'subDriver/threejs/asset/vnd.raw-morphttarget')
        {
            reg.loadStarted();
            this.loader = new MorphRawJSONLoader();
            this.loader.load(assetSource, assetLoaded);
        }
    }
    this.get = function(childType, assetSource, success, failure)
    {   
      
        //try to load from the preloader
        if (!this.assets[assetSource])
        {
            this.initFromPreloader(childType, assetSource);
        }
        //grab the registry entry for this asset
        var reg = this.assets[assetSource];
        //if the asset entry is not loaded and not pending, you'll have to actaully go download and parse it
        if (reg.loaded == false && reg.pending == false)
        {
            this.newLoad(childType, assetSource, success, failure);
            reg.refcount++;
        }
        else if (reg.loaded == true && reg.pending == false)
        {

            reg.refcount++;
            //must return async
            async.nextTick(function(){
                success(reg.node, reg.rawAnimationChannels);    
            })
            
        }
        else if (reg.loaded == false && reg.pending == true)
        {
            reg.refcount++;
            _ProgressBar.show();
            reg.callbacks.push(success)
            reg.failcallbacks.push(failure);
        }
    }
    this.cancel = function(assetSource, success, failure)
    {
        var reg = this.assets[assetSource];
        if(!reg) return;
        var successIndex = reg.callbacks.indexOf(success);
        var failureCallback = reg.failcallbacks.indexOf(failure);
        if(successIndex > -1)
        {
            reg.refcount--;
            reg.callbacks.splice(successIndex,1);
        }
        if(failureCallback > -1)
            reg.callbacks.splice(failure,1);
    }
};

window.assetRegistry = new assetRegistry();

define([],window.assetRegistry);