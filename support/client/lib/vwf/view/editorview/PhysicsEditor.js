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

    function initialize() {

        $('#sidepanel').append("<div id='PhysicsEditor'>" + "<div id='PhysicsEditortitle' class='ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix' >Physics Editor</div>" + "</div>");
        //$('#PhysicsEditor').dialog({title:'Material Editor',autoOpen:false});
        $('#PhysicsEditor').css('border-bottom', '5px solid #444444')
        $('#PhysicsEditor').css('border-left', '2px solid #444444')

        this.show = function() {



            $('#PhysicsEditor').prependTo($('#PhysicsEditor').parent());
            $('#PhysicsEditor').show('blind', function() {
                if ($('#sidepanel').data('jsp')) $('#sidepanel').data('jsp').reinitialise();
            });
            showSidePanel();
            this.BuildGUI();
            $('#MenuPhysicsEditoricon').addClass('iconselected');

        }
        this.hide = function() {
            //$('#PhysicsEditor').dialog('close');
            if (this.isOpen()) {
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
        this.satProperty = function(nodeID, propName, propVal) {
            for (var i = 0; i < this.propertyEditorDialogs.length; i++) {

                var diag = this.propertyEditorDialogs[i];

                if (diag.propName == propName && diag.nodeid == nodeID) {
                    //typing into the textbox can be infuriating if it updates while you type!
                    //need to filter out sets from self
                    if (diag.type == 'text' && vwf.client() != vwf.moniker())
                        diag.element.val(propVal);
                    if (diag.type == 'slider')
                        diag.element.slider('value', propVal);
                    if (diag.type == 'check')
                        diag.element.attr('checked', propVal);
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
            if ($(this).attr('checked') == 'checked') _PrimitiveEditor.setProperty(id, prop, true);
            else _PrimitiveEditor.setProperty(id, prop, false);
        }
        this.primPropertyTypein = function(e, ui) {

            if (_PhysicsEditor.inSetup) return; 
            var id = $(this).attr('nodename');
            var prop = $(this).attr('propname');
            var amount = $(this).val();
            var slider = $(this).attr('slider');
            $(slider).slider('value', amount);
            _PrimitiveEditor.setProperty(id, prop, parseFloat(amount));
        }
        this.primSpinner = function(e, ui) {

            if (_PhysicsEditor.inSetup) return; 
            var id = $(this).attr('nodename');
            var prop = $(this).attr('propname');
            var amount = $(this).val();
            var slider = $(this).attr('slider');
            $(slider).slider('value', ui.value);
            _PrimitiveEditor.setProperty(id, prop, parseFloat(ui.value));
        }
        this.primPropertySlide = function(e, ui) {

            if (_PhysicsEditor.inSetup) return; 
            var id = $(this).attr('nodename');
            var prop = $(this).attr('propname');
            $('#' + id + prop + 'value').val(ui.value);
            var amount = ui.value;
            //be sure to skip undo - handled better in slidestart and slidestop
            _PrimitiveEditor.setProperty(id, prop, parseFloat(amount), true);

        }
        this.primPropertySlideStart = function(e, ui) {

            if (_PhysicsEditor.inSetup) return; 

            var id = $(this).attr('nodename');
            var prop = $(this).attr('propname');
            $('#' + id + prop + 'value').val(ui.value);
            var amount = ui.value;
            this.undoEvent = new _UndoManager.CompoundEvent();
            if (id == 'selection') {
                for (var i = 0; i < _Editor.getSelectionCount(); i++)
                    this.undoEvent.push(new _UndoManager.SetPropertyEvent(_Editor.GetSelectedVWFNode(i).id, prop, null))
            } else {
                this.undoEvent.push(new _UndoManager.SetPropertyEvent(id, prop, null))
            }
            _PrimitiveEditor.setProperty(id, prop, parseFloat(amount), true);
        }
        this.primPropertySlideStop = function(e, ui) {

            if (_PhysicsEditor.inSetup) return; 
            
            var id = $(this).attr('nodename');
            var prop = $(this).attr('propname');
            $('#' + id + prop + 'value').val(ui.value);
            var amount = ui.value;

            if (this.undoEvent)
                for (var i = 0; i < this.undoEvent.list.length; i++)
                    this.undoEvent.list[i].val = amount;
            _UndoManager.pushEvent(this.undoEvent);
            this.undoEvent = null;

            _PrimitiveEditor.setProperty(id, prop, parseFloat(amount), true);
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
        this.BuildGUI = function() {

            var lastTab = $("#physicsaccordion").accordion('option', 'active');
            $("#PhysicsEditor").empty();
            $("#PhysicsEditor").append("<div id='PhysicsEditortitle' style = 'padding:3px 4px 3px 4px;font:1.5em sans-serif;font-weight: bold;' class='ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix' ><span class='ui-dialog-title' id='ui-dialog-title-Players'>Material Editor</span></div>");
            $('#PhysicsEditortitle').append('<a href="#" id="PhysicsEditorclose" class="ui-dialog-titlebar-close ui-corner-all" role="button" style="display: inline-block;float: right;"><span class="ui-icon ui-icon-closethick">close</span></a>');
            $('#PhysicsEditortitle').prepend('<div class="headericon material" />');
            $("#PhysicsEditor").append('<div id="physicsaccordion" style="height:100%;overflow:hidden"><h3><a href="#">Physics Basics</a>	</h3>	<div id="PhysicsBasicSettings">	</div><h3><a href="#">Physics Material</a>	</h3>	<div id="PhysicsMaterialSettings">	</div></div>');
            $("#PhysicsEditorclose").click(function() {
                _PhysicsEditor.hide()
            });

            this.inSetup = true;
            this.createCheck($('#PhysicsBasicSettings'), this.selectedID, '___physics_enabled', 'Physics Enabled');
            this.createCheck($('#PhysicsBasicSettings'), this.selectedID, '___physics_sleeping', 'Body Sleeping');
            this.createSlider($('#PhysicsBasicSettings'), this.selectedID, '___physics_mass', 'Mass', .1, 0, 10000);

            this.createSlider($('#PhysicsMaterialSettings'), this.selectedID, '___physics_restitution', 'Bounciness', .1, 0, 1);
            this.createSlider($('#PhysicsMaterialSettings'), this.selectedID, '___physics_friction', 'Friction', .1, 0, 10);
            this.createSlider($('#PhysicsMaterialSettings'), this.selectedID, '___physics_damping', 'Damping', .1, 0, 10);

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
                if (node) {
                    this.propertyEditorDialogs = [];
                    this.selectedID = node.id;
                    this.BuildGUI();
                } else {
                    this.propertyEditorDialogs = [];
                    this.selectedID = null;
                    this.hide();
                }
            } catch (e) {
                console.log(e);
            }
        }
        $(document).bind('selectionChanged', this.SelectionChanged.bind(this));
    }
});