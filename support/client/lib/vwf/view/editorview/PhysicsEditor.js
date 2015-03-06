define([], function() {
    var PhysicsEditor = {};
    var isInitialized = false;
    return {
        getSingleton: function() {
            if (!isInitialized) {
                initialize.call(PhysicsEditor);
                isInitialized = true;
            }
            return PhysicsEditor;
        }
    }

    function hasPrototype(nodeID, prototype) {
        if (!nodeID) return false;
        if (nodeID == prototype) return true;
        else return hasPrototype(vwf.prototype(nodeID), prototype);
    }

    function isSphere(id) {
        return hasPrototype(id, 'sphere2-vwf');
    }

    function isBox(id) {
        return hasPrototype(id, 'box2-vwf');
    }

    function isCone(id) {
        return hasPrototype(id, 'cone2-vwf');
    }

    function isCylinder(id) {
        return hasPrototype(id, 'cylinder2-vwf');
    }

    function isPlane(id) {
        return hasPrototype(id, 'plane2-vwf');
    }

    function isConstraint(id) {
        return hasPrototype(id, 'constraint-vwf');
    }

    function isHinge(id) {
        return hasPrototype(id, 'hingeConstraint-vwf');
    }

    function isSlider(id) {
        return hasPrototype(id, 'sliderConstraint-vwf');
    }

    function isPoint(id) {
        return hasPrototype(id, 'pointConstraint-vwf');
    }

    function isAsset(id) {
        return hasPrototype(id, 'asset-vwf');
    }

    function initialize() {
        $('#sidepanel').append("<div id='PhysicsEditor'>" + "<div id='PhysicsEditortitle' class='ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix' >Physics Editor</div>" + "</div>");
        //$('#PhysicsEditor').dialog({title:'Material Editor',autoOpen:false});
        $('#PhysicsEditor').css('border-bottom', '5px solid #444444')
        $('#PhysicsEditor').css('border-left', '2px solid #444444')
        this.physicsPreviewRoot = new THREE.Object3D();
        this.rebuildPropertyNames = ["___physics_enabled","___physics_gravity","___physics_accuracy","___physics_active",
        "___physics_mass","___physics_restitution","___physics_friction","___physics_damping",
        "transform", "___physics_collision_length", "___physics_collision_width", "___physics_collision_height", "___physics_collision_radius",
         "___physics_collision_type", "___physics_collision_offset", "_length", "width", "height", "radius"]
        this.show = function() {
            $('#PhysicsEditor').prependTo($('#PhysicsEditor').parent());
            $('#PhysicsEditor').show('blind', function() {
                if ($('#sidepanel').data('jsp')) $('#sidepanel').data('jsp').reinitialise();
            });
            this.selectedID = _Editor.GetSelectedVWFID();
            showSidePanel();
            this.BuildGUI();
            $('#MenuPhysicsEditoricon').addClass('iconselected');
        }
        this.setProperty = function(id,propertyName,propertyValue)
        {
            //the prim editor will always set properties for all selected objects
            id = 'selection';
            _PrimitiveEditor.setProperty(id,propertyName,propertyValue);
        }
        this.hide = function() {
            //$('#PhysicsEditor').dialog('close');
            if (this.isOpen()) {
                this.clearPreview();
                $('#PhysicsEditor').hide('blind', function() {
                    if ($('#sidepanel').data('jsp')) $('#sidepanel').data('jsp').reinitialise();
                    if (!$('#sidepanel').children('.jspContainer').children('.jspPane').children().is(':visible')) hideSidePanel();
                });
                $('#MenuPhysicsEditoricon').removeClass('iconselected');
            }
        }
        this.isOpen = function() {
            //$("#PhysicsEditor").dialog( "isOpen" )
            return $('#PhysicsEditor').is(':visible');
        }
        this.createdProperty = function(nodeID, propertyName, propertyValue) {
            this.satProperty(nodeID, propertyName, propertyValue);
        }
        this.initializedProperty = function(nodeID, propertyName, propertyValue) {
            this.satProperty(nodeID, propertyName, propertyValue);
        }
        this.createdNode = function(nodeID) {
            //note taht we dont have to upate the physics preive here,  because all the sets on the new node's props will do it
        }
        this.deletedNode = function(nodeID) {
            if (this.worldPreviewRoot) {
                this.BuildWorldPreview();
            }
        }
        this.satProperty = function(nodeID, propName, propVal) {
            for (var i = 0; i < this.propertyEditorDialogs.length; i++) {
                var diag = this.propertyEditorDialogs[i];
                if (diag.propName == propName && diag.nodeid == nodeID) {
                    //typing into the textbox can be infuriating if it updates while you type!
                    //need to filter out sets from self
                    if (diag.type == 'text' && vwf.client() != vwf.moniker()) diag.element.val(propVal);
                    if (diag.type == 'slider') diag.element.slider('value', propVal);
                    if (diag.type == 'check') diag.element.attr('checked', propVal);
                }
            }
            //basically, any property change on a selected node might require a redraw
            //we could be smarter about this, but probably not worth the effort
            if (_Editor.isSelected(nodeID) && this.isOpen()) {
                //optimization for only movement of roots
                if (this.physicsPreviewRoot && propName == "transform") {
                        var previewChild = null;
                        for(var i =0; i < this.physicsPreviewRoot.children.length; i++)
                        {
                            if( this.physicsPreviewRoot.children[i].vwfID == nodeID)
                                previewChild = this.physicsPreviewRoot.children[i];
                        }
                        if(previewChild) {
                            previewChild.matrix.fromArray(propVal);
                            previewChild.updateMatrixWorld(true);
                        }
                } else {
                    if(this.rebuildPropertyNames.indexOf(propName) > -1) //we rebuild the preview only on certain property sets
                        this.BuildPreview();
                }
            }
            //here, if we are displaying all of the physics world, we need to update transforms
            //note that the above function rebuilds all objects each time a property is set
            //this is inteneded to show the world in motion, so the above is inefficient
            //instead, we will set transforms for physics body roots, but not update geometries for now
            if (this.worldPreviewRoot  && propName == 'transform') {

                var previewChild = null;
                for(var i =0; i < this.worldPreviewRoot.children.length; i++)
                {
                    if( this.worldPreviewRoot.children[i].vwfID == nodeID)
                        previewChild = this.worldPreviewRoot.children[i];
                }

                if (previewChild) {
                   previewChild.matrix.fromArray(propVal);
                    previewChild.updateMatrixWorld(true);
                }
                //here, we pick up some other properties and just rebuild
                //not that since we sort of expect this to run fairly fast, we need to be a bit more careful then we were above
                else if (["transform", "___physics_enabled", "___physics_collision_length", "___physics_collision_width", "___physics_collision_height", "___physics_collision_radius", "___physics_collision_type", "___physics_collision_offset", "_length", "width", "height", "radius"].indexOf(propName) > -1) {
                    this.BuildWorldPreview();
                }
            }
        }
        this.propertyEditorDialogs = [];
        this.addPropertyEditorDialog = function(nodeid, propname, element, type) {
            this.propertyEditorDialogs.push({
                propName: propname,
                type: type,
                element: element,
                nodeid: nodeid
            });
        }
        this.primPropertyChecked = function(e, ui) {
            if (_PhysicsEditor.inSetup) return;
            var id = $(this).attr('nodename');
            var prop = $(this).attr('propname');
            if ($(this).is(':checked') ) _PhysicsEditor.setProperty(id, prop, true);
            else _PhysicsEditor.setProperty(id, prop, false);
        }
        this.primPropertyTypein = function(e, ui) {
            if (_PhysicsEditor.inSetup) return;
            var id = $(this).attr('nodename');
            var prop = $(this).attr('propname');
            var amount = $(this).val();
            var slider = $(this).attr('slider');
            $(slider).slider('value', amount);
            _PhysicsEditor.setProperty(id, prop, parseFloat(amount));
        }
        this.primSpinner = function(e, ui) {
            if (_PhysicsEditor.inSetup) return;
            var id = $(this).attr('nodename');
            var prop = $(this).attr('propname');
            var amount = $(this).val();
            var slider = $(this).attr('slider');
            $(slider).slider('value', ui.value);
            _PhysicsEditor.setProperty(id, prop, parseFloat(ui.value));
        }
        this.primPropertySlide = function(e, ui) {
            if (_PhysicsEditor.inSetup) return;
            var id = $(this).attr('nodename');
            var prop = $(this).attr('propname');
            $('#' + id + prop + 'value').val(ui.value);
            var amount = ui.value;
            //be sure to skip undo - handled better in slidestart and slidestop
            _PhysicsEditor.setProperty(id, prop, parseFloat(amount), true);
        }
        this.primPropertySlideStart = function(e, ui) {
            if (_PhysicsEditor.inSetup) return;
            var id = $(this).attr('nodename');
            var prop = $(this).attr('propname');
            $('#' + id + prop + 'value').val(ui.value);
            var amount = ui.value;
            this.undoEvent = new _UndoManager.CompoundEvent();
            if (id == 'selection') {
                for (var i = 0; i < _Editor.getSelectionCount(); i++) this.undoEvent.push(new _UndoManager.SetPropertyEvent(_Editor.GetSelectedVWFNode(i).id, prop, null))
            } else {
                this.undoEvent.push(new _UndoManager.SetPropertyEvent(id, prop, null))
            }
            _PhysicsEditor.setProperty(id, prop, parseFloat(amount), true);
        }
        this.primPropertySlideStop = function(e, ui) {
            if (_PhysicsEditor.inSetup) return;
            var id = $(this).attr('nodename');
            var prop = $(this).attr('propname');
            $('#' + id + prop + 'value').val(ui.value);
            var amount = ui.value;
            if (this.undoEvent)
                for (var i = 0; i < this.undoEvent.list.length; i++) this.undoEvent.list[i].val = amount;
            _UndoManager.pushEvent(this.undoEvent);
            this.undoEvent = null;
            _PhysicsEditor.setProperty(id, prop, parseFloat(amount), true);
        }
        this.createCheck = function(parentdiv, nodeid, propertyName, displayName) {
            $(parentdiv).append('<div><input style="vertical-align: middle" type="checkbox" id="' + propertyName + nodeid + '" nodename="' + nodeid + '" propname="' + propertyName + '"/><div style="display:inline-block;margin-bottom: 3px;margin-top: 3px;">' + displayName + ' </div></div>');
            var val = vwf.getProperty(nodeid, propertyName);
            $('#' + propertyName + nodeid).click(this.primPropertyChecked);
            if (val == true) {
                $('#' + propertyName + nodeid).attr('checked', 'checked');
            }
            this.addPropertyEditorDialog(nodeid, propertyName, $('#' + propertyName + nodeid), 'check');
        }
        this.createNodeID = function(parentdiv, nodeid, propertyName, displayName) {
                $(parentdiv).append('<div style="margin-top: 5px;margin-bottom: 5px;"><div >' + displayName + '</div><input type="text" style="display: inline;width: 50%;padding: 2px;border-radius: 5px;font-weight: bold;" id="' + nodeid + propertyName + '" nodename="' + nodeid + '" propname="' + propertyName + '"/><div  style="float:right;width:45%;height:2em" id="' + nodeid + propertyName + 'button" nodename="' + nodeid + '" propname="' + propertyName + '"/></div><div style="clear:both" />');
                $('#' + nodeid + propertyName).attr('disabled', 'disabled');
                $('#' + nodeid + propertyName + 'button').button({
                    label: 'Choose Node'
                });
                var label = $('#' + nodeid + propertyName);
                $('#' + nodeid + propertyName + 'button').click(function() {
                    var propname = $(this).attr('propname');
                    var nodename = $(this).attr('nodename');
                    _Editor.TempPickCallback = function(node) {
                        if (!node) return;
                        $('#' + nodename + propname).val(node.id);
                        _Editor.TempPickCallback = null;
                        _Editor.SetSelectMode('Pick');
                        _PhysicsEditor.setProperty(nodename, propname, node.id);
                    };
                    _Editor.SetSelectMode('TempPick');
                });
                this.addPropertyEditorDialog(nodeid, propertyName, $('#' + nodeid + propertyName), 'text');
                $('#' + nodeid + propertyName).val(vwf.getProperty(nodeid, propertyName));
            },
            this.createVector = function(parentdiv, nodeid, propertyName, displayName) {
                var vecvalchanged = function(e) {
                        if (_PhysicsEditor.inSetup) return;
                        var propname = $(this).attr('propname');
                        var component = $(this).attr('component');
                        var nodeid = $(this).attr('nodename');
                        var thisid = $(this).attr('id');
                        thisid = thisid.substr(0, thisid.length - 1);
                        var x = $('#' + thisid + 'X').val();
                        var y = $('#' + thisid + 'Y').val();
                        var z = $('#' + thisid + 'Z').val();
                        _PhysicsEditor.setProperty(nodeid, propname, [parseFloat(x), parseFloat(y), parseFloat(z)]);
                    }
                    //$('#basicSettings'+nodeid).append('<div style="display:inline-block;margin-bottom: 3px;margin-top: 3px;">'+editordata[i].displayname+': </div>');
                var baseid = 'basicSettings' + nodeid + propertyName + 'min';
                $(parentdiv).append('<div class="editorSliderLabel"  style="width:100%;text-align: left;margin-top: 4px;" ><div style="display:inline" >' + displayName + ':</div> <div style="display:inline-block;float:right">' + '<input id="' + baseid + 'X' + '" component="X" nodename="' + nodeid + '" propname="' + propertyName + '" type="number" step="' + .01 + '" class="vectorinputfront"/>' + '<input id="' + baseid + 'Y' + '" component="Y" nodename="' + nodeid + '" propname="' + propertyName + '" type="number" step="' + .01 + '" class="vectorinput"/>' + '<input id="' + baseid + 'Z' + '" component="Z" nodename="' + nodeid + '" propname="' + propertyName + '" type="number" step="' + .01 + '" class="vectorinput"/>' + '</div><div style="clear:both"/></div>');
                var propmin = vwf.getProperty(nodeid, propertyName);
                if (propmin) {
                    $('#' + baseid + 'X').val(propmin[0]);
                    $('#' + baseid + 'Y').val(propmin[1]);
                    $('#' + baseid + 'Z').val(propmin[2]);
                } else {
                    $('#' + baseid + 'X').val(0);
                    $('#' + baseid + 'Y').val(0);
                    $('#' + baseid + 'Z').val(0);
                }
                $('#' + baseid + 'X').change(vecvalchanged);
                $('#' + baseid + 'Y').change(vecvalchanged);
                $('#' + baseid + 'Z').change(vecvalchanged);
            }
        this.createSlider = function(parentdiv, nodeid, propertyName, displayName, step, min, max) {
            var inputstyle = "";
            $(parentdiv).append('<div class="editorSliderLabel">' + displayName + ': </div>');
            $(parentdiv).append('<input class="primeditorinputbox" style="' + inputstyle + '" type="" id="' + nodeid + propertyName + 'value"></input>');
            //	$('#' + nodeid + editordata[i].property + 'value').val(vwf.getProperty(node.id, editordata[i].property));
            //	$('#' + nodeid + editordata[i].property + 'value').change(this.primPropertyTypein);
            $('#' + nodeid + propertyName + 'value').attr("nodename", nodeid);
            $('#' + nodeid + propertyName + 'value').attr("propname", propertyName);
            $('#' + nodeid + propertyName + 'value').attr("slider", '#' + nodeid + propertyName);
            $('#' + nodeid + propertyName + 'value').spinner({
                step: parseFloat(step) || 1,
                change: this.primPropertyTypein,
                spin: this.primSpinner
            })
            $('#' + nodeid + propertyName + 'value').spinner('value', vwf.getProperty(nodeid, propertyName));
            $('#' + nodeid + propertyName + 'value').parent().css('float', 'right');
            $(parentdiv).append('<div id="' + nodeid + propertyName + '" nodename="' + nodeid + '" propname="' + propertyName + '"/>');
            var val = vwf.getProperty(nodeid, propertyName);
            if (val == undefined) val = 0;
            $('#' + nodeid + propertyName).slider({
                step: parseFloat(step),
                min: parseFloat(min),
                max: parseFloat(max),
                slide: this.primPropertySlide,
                stop: this.primPropertySlideStop,
                start: this.primPropertySlideStart,
                value: val
            });
            this.addPropertyEditorDialog(nodeid, propertyName, $('#' + nodeid + i), 'slider');
            this.addPropertyEditorDialog(nodeid, propertyName, $('#' + nodeid + propertyName + 'value'), 'text');
        }
        this.createChoice = function(parentdiv, nodeid, propertyName, displayName, labels, values) {
                //  $('#basicSettings' + nodeid).append('<input type="button" style="width: 100%;font-weight: bold;" id="' + nodeid + i + '" nodename="' + nodeid + '" propname="' +  editordata[i].property + '"/>');
                $(parentdiv).append('<div><div class="editorSliderLabel">' + displayName + ': </div>' + '<select id="' + nodeid + propertyName + '" style="float:right;clear:right" ' + ' nodename="' + nodeid + '" propname="' + propertyName + '"" ></select></div>');
                $('#' + nodeid + propertyName).val(displayName + ": " + labels[vwf.getProperty(nodeid, propertyName)]);
                $('#' + nodeid + propertyName).attr('index', propertyName);
                for (var k = 0; k < labels.length; k++) {
                    $('#' + nodeid + propertyName).append("<option value='" + values[k] + "'>  " + labels[k] + "  </option>")
                }
                //$('#' + nodeid + i).button();
                //find and select the current value in the dropdown
                var selectedindex = values.indexOf(vwf.getProperty(nodeid, propertyName));
                var selectedLabel = labels[selectedindex];
                $("select option").filter(function() {
                    //may want to use $.trim in here
                    return $.trim($(this).text()) == $.trim(selectedLabel);
                }).prop('selected', true);
                $('#' + nodeid + propertyName).change(function() {
                    var propname = $(this).attr('propname');
                    var nodename = $(this).attr('nodename');
                    var value = $(this).val();
                    var div = this;
                    _PhysicsEditor.setProperty(nodename, propname, value);
                });
                this.addPropertyEditorDialog(nodeid, propertyName, $('#' + nodeid + i), 'text');
            }
            //walk a threejs node and dispose of the geometry and materials
        this.dispose = function(threeNode) {
            if (threeNode && threeNode.dispose) threeNode.dispose();
            if (threeNode && threeNode.geometry) this.dispose(threeNode.geometry)
            if (threeNode && threeNode.material) this.dispose(threeNode.material)
            if (threeNode && threeNode.children)
                for (var i = 0; i < threeNode.children.length; i++) this.dispose(threeNode.children[i]);
        }
        this.clearPreview = function() {
            //release all held memory
            this.dispose(this.physicsPreviewRoot);
            for (var i in this.physicsPreviewRoot.children) {
                this.physicsPreviewRoot.remove(this.physicsPreviewRoot.children[i]);
            }
        }
        this.clearWorldPreview = function() {
            //release all held memory
            this.dispose(this.worldPreviewRoot);
            for (var i in this.worldPreviewRoot.children) {
                this.worldPreviewRoot.remove(this.worldPreviewRoot.children[i]);
            }
        }
        this.disableWorldPreview = function() {
            if (this.worldPreviewRoot) {
                this.clearWorldPreview();
                this.worldPreviewRoot.parent.remove(this.worldPreviewRoot);
                delete this.worldPreviewRoot;
            }
        }
        this.toggleWorldPreview = function() {
            if (this.worldPreviewRoot) this.disableWorldPreview();
            else this.BuildWorldPreview();
        }
        this.BuildPreviewInner = function(i, root, scale) {

            if (!findphysicsnode(i)) return;
            var transform = findphysicsnode(i).transform;
            var worldScale = findphysicsnode(i).getWorldScale();
            var geo = null;
            //we actually create all cylinder and cone prims with the Zaxis as up, but three.js builds them with y up. We need to add a rotation in this case.
            // This is handled in prim.js for the visual nodes.
            var needRotate = false;
            if (!vwf.getProperty(i, '___physics_enabled') && !isConstraint(i)) return;
            if (isSphere(i)) //sphere
            {
                geo = new THREE.SphereGeometry(vwf.getProperty(i, 'radius') * worldScale[0], 10, 10);
            }
            if (isBox(i)) //sphere
            {
                geo = new THREE.BoxGeometry(vwf.getProperty(i, '_length') * worldScale[0], vwf.getProperty(i, 'width') * worldScale[1], vwf.getProperty(i, 'height') * worldScale[2], 5, 5, 5);
            }
            if (isCylinder(i)) //sphere
            {
                needRotate = true;
                geo = new THREE.CylinderGeometry(vwf.getProperty(i, 'radius') * worldScale[0], vwf.getProperty(i, 'radius') * worldScale[0], vwf.getProperty(i, 'height') * worldScale[1], 10, 10);
            }
            if (isCone(i)) //sphere
            {
                needRotate = true;
                geo = new THREE.CylinderGeometry(0, vwf.getProperty(i, 'radius') * worldScale[0], vwf.getProperty(i, 'height') * worldScale[1], 10, 10);
            }
            if (isPlane(i)) //sphere
            {
                geo = new THREE.PlaneGeometry(vwf.getProperty(i, '_length') * worldScale[0], vwf.getProperty(i, 'width') * worldScale[1], 5, 5);
            }
            if (isConstraint(i)) {
                if (isHinge(i)) {
                    geo = new THREE.CylinderGeometry(.03, .03, 1, 10, 2);
                    var lowerOff = vwf.getProperty(i, '___physics_joint_hinge_lower_ang_limit') * 0.0174532925;
                    var upperOff = vwf.getProperty(i, '___physics_joint_hinge_upper_ang_limit') * 0.0174532925;

                    var t = new THREE.Matrix4()

                    t.makeRotationZ(Math.PI / 2);
                    geo.applyMatrix(t);

                    if (lowerOff < upperOff) {
                        var min = new THREE.PlaneGeometry(1, .25, 5, 2);
                        t.makeTranslation(0, .125, 0);
                        min.applyMatrix(t);
                        t.makeRotationX(lowerOff);
                        min.applyMatrix(t);
                        geo.merge(min);
                        var min = new THREE.PlaneGeometry(1, .25, 5, 2);
                        t.makeTranslation(0, -.125, 0);
                        min.applyMatrix(t);
                        t.makeRotationX(upperOff);
                        min.applyMatrix(t);
                        geo.merge(min);
                    }
                } else if (isSlider(i)) {
                    geo = new THREE.CylinderGeometry(.03, .03, 1, 10, 2);

                    var min = new THREE.CylinderGeometry(.06, .06, .03, 10, 2);
                    var lowerOff = vwf.getProperty(i, '___physics_joint_slider_lower_lin_limit');
                    var upperOff = vwf.getProperty(i, '___physics_joint_slider_upper_lin_limit');
                    var t = new THREE.Matrix4();
                    if (lowerOff < upperOff) {

                        t.makeTranslation(0, upperOff, 0);
                        min.applyMatrix(t);
                        geo.merge(min);
                        var min = new THREE.CylinderGeometry(.06, .06, .03, 10, 2);
                        t.makeTranslation(0, lowerOff, 0);
                        min.applyMatrix(t);
                        geo.merge(min);
                    }
                    t.makeRotationZ(Math.PI / 2);
                    geo.applyMatrix(t);
                } else if (isPoint(i)) {
                    needRotate = true;
                    geo = new THREE.CylinderGeometry(.0, .3, .6, 10, 2);
                    var geo2 = new THREE.CylinderGeometry(.0, .3, -.6, 10, 2);
                    geo.merge(geo2)


                } else {
                    geo = new THREE.SphereGeometry(1., 10, 10);
                }

            }
            if (isAsset(i)) //asset
            {
                switch (parseInt(vwf.getProperty(i, "___physics_collision_type"))) {
                    case 1:
                        {
                            geo = new THREE.SphereGeometry(vwf.getProperty(i, '___physics_collision_radius') * worldScale[0], 10, 10);
                        }
                        break;
                    case 2:
                        {
                            geo = new THREE.BoxGeometry(vwf.getProperty(i, '___physics_collision_length') * worldScale[0], vwf.getProperty(i, '___physics_collision_width') * worldScale[1], vwf.getProperty(i, '___physics_collision_height') * worldScale[2], 5, 5, 5);
                        }
                        break;
                    case 3:
                        {
                            needRotate = true;
                            geo = new THREE.CylinderGeometry(vwf.getProperty(i, '___physics_collision_radius') * worldScale[0], vwf.getProperty(i, '___physics_collision_radius') * worldScale[0], vwf.getProperty(i, '___physics_collision_height') * worldScale[1], 10, 10, 10);
                        }
                        break;
                    case 4:
                        {
                            needRotate = true;
                            geo = new THREE.CylinderGeometry(0, vwf.getProperty(i, '___physics_collision_radius') * worldScale[0], vwf.getProperty(i, '___physics_collision_height') * worldScale[1], 10, 5);
                        }
                        break;
                    case 5:
                        {
                            geo = new THREE.PlaneGeometry(vwf.getProperty(i, '___physics_collision_length') * worldScale[0], vwf.getProperty(i, '___physics_collision_width') * worldScale[1], 5, 5);
                        }
                        break;
                    case 6:
                        {
                            //none
                        }
                        break;
                    case 7:
                        {
                            //mesh
                        }
                        break;
                    default:
                }
            }
            var mesh = null;
            if (geo) {
                mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
                mesh.material.color.b = 1;
                mesh.material.color.g = .3;
                mesh.material.color.r = 1;
                if (vwf.parent(i) != vwf.application()) {
                    mesh.material.color.g = .0;
                    mesh.material.color.r = .5;
                }
                mesh.material.transparent = true;
                mesh.material.depthTest = false;
                mesh.material.depthWrite = false;
                mesh.material.wireframe = true;
                mesh.InvisibleToCPUPick = true;
            }
            var children = vwf.children(i);
            //the current node does not have a mesh, so we use a blank object3
            if (!mesh) mesh = new THREE.Object3D();
            //apply a premultiplied rotation matrix
            //hold it in a seperate node, so the rotation will not effect other children
            if (needRotate) {
                mesh.matrix.makeRotationX(Math.PI / 2);
                mesh.matrixAutoUpdate = false;
                mesh.updateMatrixWorld(true);
                var rotNode = new THREE.Object3D();
                rotNode.add(mesh);
                mesh = rotNode;
            }
            root.add(mesh);
            mesh.vwfID = i;
            if (transform) mesh.matrix.fromArray(transform);
            mesh.matrixAutoUpdate = false;
            mesh.matrix.elements[12] *= scale[0];
            mesh.matrix.elements[13] *= scale[1];
            mesh.matrix.elements[14] *= scale[2];
            mesh.updateMatrixWorld(true);
            var thisWorldScale = [1, 1, 1];
            thisWorldScale[0] = scale[0] * findphysicsnode(i).localScale[0];
            thisWorldScale[1] = scale[1] * findphysicsnode(i).localScale[1];
            thisWorldScale[2] = scale[2] * findphysicsnode(i).localScale[2];
            for (var ik = 0; ik < children.length; ik++) {
                this.BuildPreviewInner(children[ik], mesh, thisWorldScale);
            }
        }
        this.BuildPreview = function() {
                if (!this.physicsPreviewRoot.parent) _dScene.add(this.physicsPreviewRoot);
                this.clearPreview();
                var roots = [];
                for (var i = 0; i < _Editor.getSelectionCount(); i++) {
                    var id = _Editor.GetSelectedVWFID(i);
                    while (id && vwf.parent(id) !== vwf.application()) id = vwf.parent(id);
                    roots[id] = true;
                }

                for (var i in roots) {
                    if (roots[i] && (vwf.getProperty(i, '___physics_enabled') || isConstraint(i))) {
                        this.BuildPreviewInner(i, this.physicsPreviewRoot, [1, 1, 1]);
                    }
                }
            }
            //this is used not for previewing the selected item, but for displaying all physics bodies
            //note that it won't update for collision shapes that change during runtime, IE, a compound
            //collision body is updated during execution. This should not be happening anyway.
        this.BuildWorldPreview = function() {
            if (this.worldPreviewRoot) {
                this.clearWorldPreview();
                _dScene.remove(this.worldPreviewRoot);
            }
            this.worldPreviewRoot = new THREE.Object3D();
            var roots = vwf.children(vwf.application());
            for (var i in roots) {
                if (roots[i] && vwf.getProperty(roots[i], '___physics_enabled')) {
                    this.BuildPreviewInner(roots[i], this.worldPreviewRoot, [1, 1, 1]);
                }
            }
            _dScene.add(this.worldPreviewRoot, true);
        }
        this.BuildGUI = function() {

            this.BuildPreview();
            //does this object have it's own body, or is it just a compound collision?
            var hasOwnBody = vwf.parent(_Editor.GetSelectedVWFID()) == vwf.application();
            var lastTab = 0;
            //depending on ordering, this might not work
            try {
                lastTab = $("#physicsaccordion").accordion('option', 'active');
            } catch (e) {}
            $("#PhysicsEditor").empty();
            $("#PhysicsEditor").append("<div id='PhysicsEditortitle' style = 'padding:3px 4px 3px 4px;font:1.5em sans-serif;font-weight: bold;' class='ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix' ><span class='ui-dialog-title' id='ui-dialog-title-Players'>Physics Editor</span></div>");
            $('#PhysicsEditortitle').append('<a href="#" id="PhysicsEditorclose" class="ui-dialog-titlebar-close ui-corner-all" role="button" style="display: inline-block;float: right;"><span class="ui-icon ui-icon-closethick">close</span></a>');
            $('#PhysicsEditortitle').prepend('<div class="headericon material" />');
            $("#PhysicsEditor").append('<div id="physicsaccordion" style="height:100%;overflow:hidden"><h3><a href="#">Physics Basics</a>	</h3>	<div id="PhysicsBasicSettings">	</div></div>');
            $("#PhysicsEditorclose").click(function() {
                _PhysicsEditor.hide()
            });
            this.inSetup = true;
            if (this.selectedID === vwf.application()) {
                this.createVector($('#PhysicsBasicSettings'), this.selectedID, '___physics_gravity', 'Gravity');
                this.createSlider($('#PhysicsBasicSettings'), this.selectedID, '___physics_accuracy', 'Physics Accuracy', 1, 1, 10);
                this.createCheck($('#PhysicsBasicSettings'), this.selectedID, '___physics_active', 'Enable Physics');
            } else if (hasOwnBody) {
                var phyNode = findphysicsnode(_Editor.GetSelectedVWFID());
                if (!phyNode) {
                    $('#PhysicsBasicSettings').append('Physics are currently not supported for this object type');
                } else {
                    if (phyNode instanceof phyObject) {
                        this.createCheck($('#PhysicsBasicSettings'), this.selectedID, '___physics_enabled', hasOwnBody ? 'Physics Enabled' : 'Collision Enabled');
                        this.createSlider($('#PhysicsBasicSettings'), this.selectedID, '___physics_mass', 'Mass', .1, 0, 10000);
                        this.createChoice($('#PhysicsBasicSettings'), this.selectedID, '___physics_activation_state', 'Activation State', ["Awake", "Sleeping", "Wants Sleep", "Stay Awake", "Stay Asleep"], ["1", "2", "3", "4", "5"]);
                        $('#physicsaccordion').append('<h3><a href="#">Collision Material</a>    </h3>   <div id="PhysicsMaterialSettings">  </div>');
                        this.createSlider($('#PhysicsMaterialSettings'), this.selectedID, '___physics_restitution', 'Bounciness', .1, 0, 1);
                        this.createSlider($('#PhysicsMaterialSettings'), this.selectedID, '___physics_friction', 'Friction', .1, 0, 10);
                        this.createSlider($('#PhysicsMaterialSettings'), this.selectedID, '___physics_damping', 'Damping', .1, 0, 10);
                        if (phyNode.type == 7) {
                            $('#physicsaccordion').append('<h3><a href="#">Collision Shape</a>    </h3>   <div id="PhysicsCollisionSettings">  </div>');
                            this.createSlider($('#PhysicsCollisionSettings'), this.selectedID, '___physics_collision_length', 'Collision Length', .1, 0, 50);
                            this.createSlider($('#PhysicsCollisionSettings'), this.selectedID, '___physics_collision_width', 'Collision Width', .1, 0, 50);
                            this.createSlider($('#PhysicsCollisionSettings'), this.selectedID, '___physics_collision_height', 'Collision Height', .1, 0, 50);
                            this.createSlider($('#PhysicsCollisionSettings'), this.selectedID, '___physics_collision_radius', 'Collision Radius', .1, 0, 50);
                            this.createChoice($('#PhysicsCollisionSettings'), this.selectedID, '___physics_collision_type', 'Collision Type', ["None", "Box", "Sphere", "Cylinder", "Cone", "Mesh"], ["0", "2", "1", "3", "4", "5"]);
                        }
                        $('#physicsaccordion').append('<h3><a href="#">Forces</a>    </h3>   <div id="PhysicsForceSettings">  </div>');
                        this.createVector($('#PhysicsForceSettings'), this.selectedID, '___physics_constant_torque', 'Constant Torque');
                        this.createVector($('#PhysicsForceSettings'), this.selectedID, '___physics_constant_force', 'Contant Force');
                        this.createVector($('#PhysicsForceSettings'), this.selectedID, '___physics_velocity_angular', 'Angular Velocity');
                        this.createVector($('#PhysicsForceSettings'), this.selectedID, '___physics_velocity_linear', 'Linear Velocity');
                        $('#physicsaccordion').append('<h3><a href="#">Motion Locks</a>    </h3>   <div id="PhysicsLockSettings">  </div>');
                        $('#PhysicsLockSettings').append('<div><input id="lockXMotion" type="checkbox" />X<input id="lockYMotion" type="checkbox" />Y<input id="lockZMotion" type="checkbox" />Z Motion Enabled</div>')
                        $('#PhysicsLockSettings').append('<div><input id="lockXRotation" type="checkbox" />X<input id="lockYRotation" type="checkbox" />Y<input id="lockZRotation" type="checkbox" />Z Rotation Enabled</div>')
                        var linearFactor = vwf.getProperty(this.selectedID, '___physics_factor_linear');
                        var angularFactor = vwf.getProperty(this.selectedID, '___physics_factor_angular');
                        if (linearFactor) {
                            if (linearFactor[0] == 1) $('#lockXMotion').attr('checked', 'checked');
                            if (linearFactor[1] == 1) $('#lockYMotion').attr('checked', 'checked');
                            if (linearFactor[2] == 1) $('#lockZMotion').attr('checked', 'checked');
                            if (angularFactor[0] == 1) $('#lockXRotation').attr('checked', 'checked');
                            if (angularFactor[1] == 1) $('#lockYRotation').attr('checked', 'checked');
                            if (angularFactor[2] == 1) $('#lockZRotation').attr('checked', 'checked');
                        }
                        $('#lockXMotion, #lockYMotion, #lockZMotion').click(function() {
                            var linearFactor = [0, 0, 0];
                            linearFactor[0] = $('#lockXMotion').is(':checked')  ? 1 : 0;
                            linearFactor[1] = $('#lockYMotion').is(':checked')  ? 1 : 0;
                            linearFactor[2] = $('#lockZMotion').is(':checked')  ? 1 : 0;
                            _PhysicsEditor.setProperty(PhysicsEditor.selectedID, '___physics_factor_linear', linearFactor);
                        });
                        $('#lockXRotation, #lockYRotation, #lockZRotation').click(function() {
                            var angularFactor = [0, 0, 0];
                            angularFactor[0] = $('#lockXRotation').is(':checked')  ? 1 : 0;
                            angularFactor[1] = $('#lockYRotation').is(':checked')  ? 1 : 0;
                            angularFactor[2] = $('#lockZRotation').is(':checked')  ? 1 : 0;
                            _PhysicsEditor.setProperty(PhysicsEditor.selectedID, '___physics_factor_angular', angularFactor);
                        });

                    }
                    if (phyNode instanceof phyJoint) {
                        this.createNodeID($('#PhysicsBasicSettings'), this.selectedID, '___physics_joint_body_A', "Object A");
                        this.createNodeID($('#PhysicsBasicSettings'), this.selectedID, '___physics_joint_body_B', "Object B");
                        if (isSlider(this.selectedID)) {
                            this.createSlider($('#PhysicsBasicSettings'), this.selectedID, '___physics_joint_slider_lower_lin_limit', 'Lower Linear Stop', .1, -5, 0);
                            this.createSlider($('#PhysicsBasicSettings'), this.selectedID, '___physics_joint_slider_upper_lin_limit', 'Upper Linear Stop', .1, 0, 5);
                        }
                        if (isHinge(this.selectedID)) {
                            this.createSlider($('#PhysicsBasicSettings'), this.selectedID, '___physics_joint_hinge_lower_ang_limit', 'Lower Angular Stop', .01, 0, 360);
                            this.createSlider($('#PhysicsBasicSettings'), this.selectedID, '___physics_joint_hinge_upper_ang_limit', 'Upper Angular Stop', .01, -.01, 360);
                        }
                    }
                }
            } else {
                $('#PhysicsBasicSettings').append('This object can have collision but no forces, because it is a child of another object');
                this.createCheck($('#PhysicsBasicSettings'), this.selectedID, '___physics_enabled', hasOwnBody ? 'Physics Enabled' : 'Collision Enabled');
            }
            this.inSetup = false;
            $("#physicsaccordion").accordion({
                fillSpace: true,
                heightStyle: "content",
                change: function() {
                    if ($('#sidepanel').data('jsp')) $('#sidepanel').data('jsp').reinitialise();
                }
            });
            $("#physicsaccordion").accordion({
                'active': lastTab
            });
            $(".ui-accordion-content").css('height', 'auto');
        }
        this.SelectionChanged = function(e, node) {
            try {
                if (this.isOpen()) {
                    if (node) {
                        this.propertyEditorDialogs = [];
                        this.selectedID = _Editor.getSelectionCount() == 1 ? node.id : "selection";
                        this.BuildGUI();
                    } else {
                        this.propertyEditorDialogs = [];
                        this.selectedID = null;
                        this.hide();
                    }
                } else {
                    this.clearPreview();
                }
            } catch (e) {
                console.log(e);
            }
        }
        $(document).bind('selectionChanged', this.SelectionChanged.bind(this));
    }
});