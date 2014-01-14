//this is a very async bit of code, that loads all assets and parses them before continuing to boot up the VWF
//over time, we might expand this to include sounds and other assets, now only works on 3D models and textures.
//Note that the sim can go forward before the textures are loaded - the scene manager just fills them with blue 
//textures and replaces them when loaded. So, we don't have to cache texture here, but we do let the scenemanager know to fire up
//and start loading, just to give the textures a head start.

define(["vwf/model/threejs/backgroundLoader","vwf/view/editorview/alertify.js-0.3.9/src/alertify"],
function ()
{
    var assetLoader = {};
    var isInitialized = false;
    return {
        getSingleton: function ()
        {
            if (!isInitialized)
            {
                initialize.call(assetLoader);
                isInitialized = true;
                window._assetLoader = assetLoader;
            }
            return assetLoader;
        }
    }

    function initialize()
    {
        this.load = function(cb)
        {

            $.ajax({url:'../vwfdatamanager.svc/getAssets?SID=' +((/\/adl\/sandbox\/.*\//).exec(window.location.toString()).toString()),
                success:function(data,status,xhr)
                {
                     
                    if(xhr.status == 200)
                    {
                        
                         $.ajax({url:'../vwfdatamanager.svc/profile',
                            success:function(data2,status2,xhr2)
                            {
                                 
                                if(xhr.status == 200)
                                {

                                    var assets = JSON.parse(xhr.responseText);
                                    var profile = JSON.parse(xhr2.responseText);
                                    assets.push({type:"subDriver/threejs/asset/vnd.collada+xml",url:profile.avatarModel});
                                    assets.push({type:"texture",url:profile.avatarTexture});
                                    assetLoader.loadAssets(assets,cb);
                                }else
                                {
                                    
                                    assetLoader.loadAssets(JSON.parse(xhr.responseText),cb);
                                }
                            },
                            error:function()
                            {
                                
                                assetLoader.loadAssets(JSON.parse(xhr.responseText),cb);
                            }
                        })

                    }else
                    {
                        cb();
                    }
                },
                error:function()
                {
                    cb();
                }
            })
        

        }
        this.collada = {},
        this.utf8Json = {},
        this.subDriver = {},

        this.getCollada = function(url)
        {
            return this.collada[url];
        },
        this.getUtf8Json = function(url)
        {
            return this.utf8Json[url];
        },
        this.getSubDriver = function(url)
        {
            return this.subDriver[url];
        },
        this.loadCollada = function(url,cb2)
        {
            var loader = new THREE.ColladaLoader();
            loader.load(url,function(asset)
                {
                    
                    assetLoader.collada[url] = asset;
                    cb2();
                },function(progress)
                {
                    //it's really failed
                    if(!progress)
                        cb2();
                });
        },
        this.loadUTf8Json = function(url,cb2)
        {
            this.loader = new UTF8JsonLoader({source:url},function(asset)
                {
                    
                    assetLoader.utf8Json[url] = asset;
                    cb2();
                },function(err)
                {
                    cb2();
                });
        },
        this.loadSubDriver = function(url,cb2)
        {
            cb2();
        },
        this.startProgressGui = function(total)
        {
                $(document.body).append('<div id = "preloadGUIBack" class=""><div id = "preloadGUI" class=""><div class="preloadCenter"><div id="preloadprogress"><p class="progress-label">Loading...</p></div></div><div class=""><div class="" id="preloadguiText">Loading...</div></div></div></div>');
                $('#preloadprogress').progressbar();
                $('#preloadprogress').progressbar( "value", 0 );
                $('#preloadprogress .progress-label').text("0%");
        },
        this.updateProgressGui = function(count,data)
        {
             $('#preloadprogress').progressbar( "value", count*100 );
             $('#preloadguiText').text((data.name? data.name + ": " : "") + data.url);
             $('#preloadprogress .progress-label').text("Loading Assets: " + parseInt(count*100)+"%");
        },

        this.closeProgressGui = function()
        {
            window.setTimeout(function(){
            $('#preloadGUIBack').fadeOut();
            },1000);
        }
        this.loadAssets = function(assets,cb)
        {

            var total = assets.length;
            assetLoader.startProgressGui(total);
            var count = 0;
            async.forEachSeries(assets,function(i,cb2)
            {
                count++;
                assetLoader.updateProgressGui(count/total,i);
                var type = i.type;
                var url = i.url;
                if(type == 'texture')
                {
                    //because of the way texture loads are handled in the scenemanager, we can actually go ahead and continue immediately here
                    //though we might as well let the scenemanager know to set started
                    _SceneManager.getTexture(url);
                    cb2();
                }
                else if(type == 'subDriver/threejs')
                {
                    assetLoader.loadSubDriver(url,cb2);
                }
                else if(type == 'subDriver/threejs/asset/vnd.collada+xml')
                {
                    assetLoader.loadCollada(url,cb2);
                }
                else if(type == 'subDriver/threejs/asset/vnd.osgjs+json+compressed')
                {
                    assetLoader.loadUTf8Json(url,cb2);
                }else if(type == 'unknown')
                {
                    cb2();
                }else
                {
                    cb2();
                }
                

            },function(err)
            {
                assetLoader.closeProgressGui();
                cb();
            })
            
        }
    }
} );

