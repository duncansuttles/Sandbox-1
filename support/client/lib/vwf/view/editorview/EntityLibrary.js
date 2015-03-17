 function getLeft(id,_default)
    {
        if(!_default) _default = 0;
        if($('#' + id).is(':visible'))
            return parseInt($('#' + id).css('left'));
        else return _default;    
    }
define(function() {
    var EntityLibrary = {};
    var isInitialized = false;
    var currentDrag;
    return {
        getSingleton: function() {
            if (!isInitialized) {
                initialize.call(EntityLibrary);
                isInitialized = true;
            }
            return EntityLibrary;
        }
    }
    var isOpen = true;

    function matcpy(mat) {
        var newmat = [];
        for (var i = 0; i < 16; i++) newmat[i] = mat[i];
        return newmat;
    }

    function toGMat(threemat) {
        var mat = [];
        mat = matcpy(threemat.elements);
        mat = (MATH.transposeMat4(mat));
        return mat;
    }

    function sizeWindowTimer() {
        if (!_Editor.findcamera()) return;
        _Editor.findcamera().aspect = ($('#index-vwf').width() / $('#index-vwf').height());

        _Editor.findcamera().updateProjectionMatrix();

        _ScriptEditor.resize();

        if ($('#index-vwf').offset()) {
            $('#glyphOverlay').css('position', 'absolute');
            $('#glyphOverlay').css('left', $('#index-vwf').offset().left);
            $('#glyphOverlay').css('top', $('#index-vwf').offset().top);
        }
    }

    function ToSafeID(value) {
        return value.replace(/[^A-Za-z0-9]/g, "");
    }

    function initialize() {
        $(document.body).append("<div id='EntityLibrary'></div>")
        $('#EntityLibrary').append("<div id='EntityLibrarySideTab'>Library</div>");
        $('#EntityLibrary').append("<div id='EntityLibraryMain'></div>");
        $('#EntityLibraryMain').append("<div id='entitylibrarytitle' style = 'padding:3px 4px 3px 4px;font:1.5em sans-serif;font-weight: bold;' class='ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix' ><span id='entitylibrarytitletext' class='ui-dialog-title' id='ui-dialog-title-Players'>Content Libraries</span></div>");

        $('#entitylibrarytitle').append('<div id="entitylibrarytray" class="glyphicon glyphicon-align-justify" />');
        $('#entitylibrarytitle').append('<a id="entitylibraryclose" href="#" class="ui-dialog-titlebar-close ui-corner-all" role="button" style="display: inline-block;float: right;"><span class="ui-icon ui-icon-closethick">close</span></a>');
        $('#entitylibrarytitle').prepend('<div class="headericon properties" />');
   
        $('#EntityLibraryMain').append("<div id='EntityLibraryAccordion'></div>");

        $('entitylibraryclose').click(function(){
            _EntityLibrary.hide();
        })
        this.buildGUI = function()
        {
            try{
            $("#EntityLibraryAccordion").accordion('destroy');
            }catch(E)
            {

            }
            $('#EntityLibraryAccordion').empty();
            var libs = this.libraries;
            for (var i in libs) {
                        var section = '<h3 class="modifiersection" ><a href="#"><div style="font-weight:bold;display:inline">' + i + "</div>" + '</a></h3>' + '<div class="modifiersection" id="library' + ToSafeID(i) + '">' + '</div>';
                        $('#EntityLibraryAccordion').append(section);

                        //for every asset in every library, setup the gui
                        for (var j in libs[i].library) {
                            $('#library' + ToSafeID(i)).append('<div  class = "libraryAsset">' +
                                '<img id = "asset' + ToSafeID(i) + ToSafeID(j) + '" src="' + libs[i].library[j].preview + '" draggable=true></img>' +
                                '<div>' + j + '</div>' +
                                '</div>'
                            );
                            (function(i1, j1) {

                                $("#asset" + ToSafeID(i1) + ToSafeID(j1)).on('dragstart', function(evt) {


                                    var dragIcon = document.createElement('img');
                                    dragIcon.src = '../vwf/view/editorview/images/icons/paste.png';
                                    dragIcon.width = 100;
                                    if(evt.originalEvent.dataTransfer.setDragImage)
                                        evt.originalEvent.dataTransfer.setDragImage(dragIcon, 10, 10);

                                    currentDrag = libs[i1].library[j1];
                                    if(evt.originalEvent.dataTransfer.setData)
                                        evt.originalEvent.dataTransfer.setData('text', JSON.stringify(libs[i1].library[j1]));
                                    $(this).css('opacity', .5);
                                });
                                $("#asset" + ToSafeID(i1) + ToSafeID(j1)).on('dragend', function() {

                                    $(this).css('opacity', 1);
                                     currentDrag = null;
                                });

                            })(i, j)

                        }
                    }
            $("#EntityLibraryAccordion").accordion({
                       
                        activate: function() {

                        }
                    });        
        }
        this.addLibrary = function(name,url)
        {
                var self = this;
             $.getJSON(url, function(lib) {
                        self.libraries[name] = {};
                        self.libraries[name].url = url;
                        self.libraries[name].library = lib;
                        self.buildGUI();
                })
        }
        this.removeLibrary = function(name)
        {
            delete this.libraries[name];
            this.buildGUI();
        }
        //fetch the list if libraries, and fetch the content of each library
        this.setup = function() {
            $.getJSON("./contentlibraries/libraries.json", function(libs) {
                var keys = Object.keys(libs);
                async.eachSeries(keys, function(i, cb) {
                    var url = libs[i].url;
                    $.getJSON(url, function(lib) {
                        libs[i].library = lib;
                        cb()
                    })
                }, function(err) {

                    EntityLibrary.libraries = libs;
                    
                    EntityLibrary.buildGUI();

                    //when dragging over the 3d view, update the preview positoin    
                    $("#vwf-root").on('dragover',"#index-vwf",function(evt) {

                        evt.preventDefault();
                        if(!currentDrag) return;
                        
                        if (currentDrag.type == 'asset') {
                            var pos = _Editor.GetInsertPoint(evt.originalEvent);
                            if(currentDrag.snap)
                            {
                               pos[0] = _Editor.SnapTo(pos[0],currentDrag.snap); 
                               pos[1] = _Editor.SnapTo(pos[1],currentDrag.snap); 
                               pos[2] = _Editor.SnapTo(pos[2],currentDrag.snap); 
                            }
                            EntityLibrary.dropPreview.position.copy( new THREE.Vector3(pos[0], pos[1], pos[2]));
                            EntityLibrary.dropPreview.updateMatrixWorld();
                        }
                        if (currentDrag.type == 'material' || currentDrag.type == 'child') {
                            var ID = EntityLibrary.GetPick(evt);
                            if (ID) {

                                var bound = _Editor.findviewnode(ID).GetBoundingBox(true);
                                _RenderManager.flashHilight(_Editor.findviewnode(ID));
                                bound = bound.transformBy(toGMat(_Editor.findviewnode(ID).matrixWorld));
                                var x = ((bound.max[0] - bound.min[0]) / 2) + bound.min[0];
                                var y = ((bound.max[1] - bound.min[1]) / 2) + bound.min[1];
                                var z = ((bound.max[2] - bound.min[2]) / 2) + bound.min[2];

                                var ss = MATH.distanceVec3(bound.max, bound.min) / 1.9;
                                EntityLibrary.dropPreview.position.set(x, y, z);
                                EntityLibrary.dropPreview.scale.set(ss, ss, ss);
                                EntityLibrary.dropPreview.updateMatrixWorld();
                            }
                        }
                        if (currentDrag.type == 'environment') {
                            EntityLibrary.dropPreview.position.set(0, 0, 0);
                            EntityLibrary.dropPreview.scale.set(10, 10, 10);
                            EntityLibrary.dropPreview.updateMatrixWorld();
                        }
                    })
                    //when dragging into the 3d view, create a preview sphere, then try to attach the preview model
                    $("#vwf-root").on('dragenter',"#index-vwf", function(evt) {

                    
                        if(!currentDrag) return;
                        var data = currentDrag;
                        if (currentDrag.type == 'asset') {
                            if (!EntityLibrary.dropPreview) {
                                EntityLibrary.dropPreview = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 30), EntityLibrary.createPreviewMaterial());
                                _dScene.add(EntityLibrary.dropPreview, true);
                                
                                if (data.dropPreview) {
                                    console.log(data.dropPreview.url);
                                    
                                    //the asset must have a 'drop preview' key
                                    _assetLoader.getOrLoadAsset(data.dropPreview.url, data.dropPreview.type, function(asset) {
                                        if (asset && asset.scene && EntityLibrary.dropPreview) {
                                            var transformNode = new THREE.Object3D();
                                            _RenderManager.addHilightObject(EntityLibrary.dropPreview)
                                            transformNode.matrixAutoUpdate = false;
                                            if (data.dropPreview.transform)
                                                transformNode.matrix.fromArray(data.dropPreview.transform)
                                            //EntityLibrary.dropPreview.visible = false;
                                            transformNode.add(asset.scene, true);
                                            EntityLibrary.dropPreview.add(transformNode, true);
                                        }
                                    });
                                }
                            }
                        }
                        if (currentDrag.type == 'material' || currentDrag.type == 'child' || currentDrag.type == 'environment') {

                            if (!EntityLibrary.dropPreview) {
                                EntityLibrary.dropPreview = new  THREE.Object3D();//new THREE.Mesh(new THREE.SphereGeometry(1, 30, 30), EntityLibrary.createPreviewMaterial());
                                _dScene.add(EntityLibrary.dropPreview, true);
                            }
                        }
                    });
                    //remove the preview,
                    $("#vwf-root").on('dragleave', "#index-vwf",function(evt) {
                        if (EntityLibrary.dropPreview) {
                            _dScene.remove(EntityLibrary.dropPreview, true);
                            _RenderManager.removeHilightObject(EntityLibrary.dropPreview);
                            delete EntityLibrary.dropPreview;
                            
                        }
                    })
                    //remove the preview and do the creation
                    $("#vwf-root").on('drop',"#index-vwf", function(evt) {
                        evt.preventDefault();
                        if(!currentDrag) return;
                        data = JSON.parse(evt.originalEvent.dataTransfer.getData('text'));
                        
                        if (EntityLibrary.dropPreview) {
                            _dScene.remove(EntityLibrary.dropPreview, true);
                             _RenderManager.removeHilightObject(EntityLibrary.dropPreview);
                            delete EntityLibrary.dropPreview;
                            EntityLibrary.create(data, evt);
                           
                        }
                    })

                    
                    $(".ui-accordion-content").css('height', 'auto');

                });
            })
        }
        this.setup();
        this.GetPick = function(evt) {
            var ray = _Editor.GetWorldPickRay(evt.originalEvent);
            var o = _Editor.getCameraPosition();
            var hit = _SceneManager.CPUPick(o, ray, {
                ignore: [_Editor.GetMoveGizmo()]
            });
            if (hit) {
                var object = hit.object;
                while (!object.vwfID && object.parent)
                    object = object.parent;
                return object.vwfID;
            }
            return null;
        }
        this.isOpen = function() {
            return isOpen;
        }
        this.show = function() {


            $('#EntityLibrary').animate({
                'left': 0
            });
            var w = $(window).width() - 250 - ($(window).width() - getLeft('sidepanel',$(window).width()));
            $('#ScriptEditor').animate({
                'left': $('#EntityLibrary').width(),
                width: w
            }, {
                step: _ScriptEditor.resize
            });
            $('#index-vwf').animate({
                'left': $('#EntityLibrary').width(),
                width: w
            }, {
                step: sizeWindowTimer
            });

            $('#EntityLibraryAccordion').css('height', $('#index-vwf').css('height') - $('#entitylibrarytitle').height());
            $('#EntityLibrary').css('height', $('#index-vwf').css('height'));
            $('#EntityLibraryAccordion').css('overflow', 'auto');
            isOpen = true;
        }
        this.hide = function() {


            $('#EntityLibrary').animate({
                'left': -$('#EntityLibrary').width()
            });
            var w = $(window).width() - ($(window).width() - getLeft('sidepanel',$(window).width()));
            $('#ScriptEditor').animate({
                'left': 0,
                width: w
            }, {
                step: _ScriptEditor.resize
            });
            $('#index-vwf').animate({
                'left': 0,
                width: w
            }, {
                step: sizeWindowTimer
            });
            isOpen = false;
        }
        this.create = function(data, evt) {
            //if its a 3d file or a node prototype
            if (data.type == 'asset') {
                var pos = _Editor.GetInsertPoint(evt.originalEvent);
                if(data.snap)
                {
                   pos[0] = _Editor.SnapTo(pos[0],data.snap); 
                   pos[1] = _Editor.SnapTo(pos[1],data.snap); 
                   pos[2] = _Editor.SnapTo(pos[2],data.snap); 
                }

                
                $.getJSON(data.url, function(proto) {

                    //very important to clean the node! Might have accidently left a name or id in the libarary
                    proto = _DataManager.getCleanNodePrototype(proto);
                    if (!proto.properties)
                        proto.properties = {};
                    proto.properties.owner = _UserManager.GetCurrentUserName()
                    if (!proto.properties.transform)
                        proto.properties.transform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
                    proto.properties.transform[12] = pos[0];
                    proto.properties.transform[13] = pos[1];
                    proto.properties.transform[14] = pos[2];
                    
                    if(data.dropOffset)
                    {

                        var dropOffset = new THREE.Matrix4();
                        dropOffset.fromArray(data.dropOffset);
                        var transform = new THREE.Matrix4();
                        transform.fromArray(proto.properties.transform);
                        transform = transform.multiply(dropOffset);
                        proto.properties.transform = transform.elements;
                    }

                    var newname = GUID();
                    _Editor.createChild('index-vwf', newname, proto);
                    _Editor.SelectOnNextCreate([newname]);

                })
            }
            if (data.type == 'child') {



                var ID = EntityLibrary.GetPick(evt);
                if (ID) {
                    $.getJSON(data.url, function(proto) {
                        //very important to clean the node! Might have accidently left a name or id in the libarary
                        proto = _DataManager.getCleanNodePrototype(proto);
                        if (!proto.properties)
                            proto.properties = {};
                        proto.properties.owner = _UserManager.GetCurrentUserName()
                        if (!proto.properties.transform)
                            proto.properties.transform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
                        var newname = GUID();
                        _Editor.createChild(ID, newname, proto);
                        _Editor.SelectOnNextCreate([newname]);

                    })
                }

            }
            if (data.type == 'material') {

                var ID = EntityLibrary.GetPick(evt);
                if (ID) {
                    $.getJSON(data.url, function(proto) {
                        _PrimitiveEditor.setProperty(ID, 'materialDef', proto);
                    })
                }

            }
            if (data.type == 'environment') {
                $.getJSON(data.url, function(proto) {
                    _UndoManager.startCompoundEvent();
                    for (var i in proto.properties)
                        _PrimitiveEditor.setProperty(vwf.application(), i, proto.properties[i]);
                    for (var i in proto.children)
                        _Editor.createChild(vwf.application(), GUID(), proto.children[i]);
                    _UndoManager.stopCompoundEvent();
                })
            }
        }
        this.createPreviewMaterial = function() {
            if (!this.material) {
                this.material = new THREE.ShaderMaterial({
                    uniforms: {},
                    vertexShader: [
                        "varying vec2 vUv;",
                        "varying vec3 norm;",
                        "varying vec3 tocam;",
                        "void main()",
                        "{",
                        "vec4 mvPosition = modelViewMatrix * vec4(position, 1.0 );",
                        "norm = (viewMatrix * vec4(normal,0.0)).xyz;",

                        "vec3 vecPos = (modelMatrix * vec4(position, 1.0 )).xyz;",
                        "norm = (modelMatrix * vec4(normal, 0.0)).xyz;",
                        "tocam = vecPos.xyz - cameraPosition;",
                        "gl_Position = projectionMatrix * mvPosition;",
                        "}"
                    ].join('\n'),
                    fragmentShader: [
                        "varying vec3 norm;",
                        "varying vec3 tocam;",
                        "void main()",
                        "{",
                        "float d = 1.0-dot(normalize(norm),normalize(-tocam));",
                        "d = pow(d,3.0);",
                        "gl_FragColor = vec4(0.0,0.0,d,d);",
                        "}"
                    ].join('\n'),

                });
                this.material.transparent = true;
                this.material.alphaTest = .8;
                this.material.depthWrite = false;
            }
            return this.material;
        }
        $('#EntityLibrarySideTab').click(function() {
            if (EntityLibrary.isOpen())
                EntityLibrary.hide();
            else
                EntityLibrary.show();
        })
    }
});