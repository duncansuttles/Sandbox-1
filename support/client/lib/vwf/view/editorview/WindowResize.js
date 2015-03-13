 function getHeight(id,_default)
    {
        if(!_default) _default = 0;
        if($('#' + id).is(':visible'))
            return parseInt($('#' + id).height());
        else return _default;    
    }
    function getLeft(id,_default)
    {
        if(!_default) _default = 0;
        if($('#' + id).is(':visible'))
            return parseInt($('#' + id).css('left'));
        else return _default;    
    }
    function getTop(id,_default)
    {
        if(!_default) _default = 0;
        if($('#' + id).is(':visible'))
            return parseInt($('#' + id).css('top'));
        else return _default;    
    }
    function getWidth(id,_default)
    {
        if(!_default) _default = 0;
        if($('#' + id).is(':visible'))
            return parseInt($('#' + id).width());
        else return _default;    
    }

    var statusbarEnabled = true;
    var toolbarEnabled = true;
    var menubarEnabled = true;
    var libraryEnabled = true;
    var sidepanelEnabled = true;
    function hideStatusbar()
    {
        statusbarEnabled = false;
        $('#statusbar').hide();
        $(window).resize();
    }
    function hideSidepanel()
    {
        sidepanelEnabled = false;
        $('#sidepanel').hide();
        $(window).resize();
    }
    function hideLibrary()
    {
        libraryEnabled = false;
        $('#EntityLibrary').hide();
        $(window).resize();
    }
    function hideMenubar()
    {
        menubarEnabled = false;
        $('#smoothmenu1').hide();
        $(window).resize();
    }
    function hideToolbar()
    {
        toolbarEnabled = false;
        $('#toolbar').hide();
        $(window).resize();
    }
    function showStatusbar()
    {
        statusbarEnabled = true;
        $('#statusbar').show();
        $(window).resize();
    }
    function showMenubar()
    {
        menubarEnabled = true;
        $('#smoothmenu1').show();
        $(window).resize();
    }
    function showToolbar()
    {
        toolbarEnabled = true;
        $('#toolbar').show();
        $(window).resize();
    }
    function showSidepanel()
    {
        sidepanelEnabled = true;
        $('#sidepanel').show();
        $(window).resize();
    }
    function showLibrary()
    {
        libraryEnabled = true;
        $('#EntityLibrary').show();
        $(window).resize();
    }

define({
   
    showToolbar:showToolbar,
    showMenubar:showMenubar,
    showStatusbar:showStatusbar,
    hideMenubar:hideMenubar,
    hideToolbar:hideToolbar,
    hideStatusbar:hideStatusbar,
    hideSidepanel:hideSidepanel,
    hideLibrary:hideLibrary,
    showSidepanel:showSidepanel,
    showLibrary:showLibrary, 
    initialize: function() {
        var toolsHidden = false;
        var toolsLoaded = true;
        toolsLoaded = _EditorView.needTools();
        $(window).resize(function(event) {

            //prevent resize events from dialogs from bubbling up here and causing a full gui refresh
            if (event.target !== window) {
                return;
            }

            var canvasheight;
            var canvaswidth;
            if (!toolsHidden && toolsLoaded) {
                $('#smoothmenu1').css('top', '0px');
                $('#smoothmenu1').css('left', '0px');
                $('#toolbar').css('top', getHeight('smoothmenu1'));
                //$('#toolbar').css('height','35px');
                $('#toolbar').css('left', '0px');
                $('#statusbar').css('left', '0px');

                $('#index-vwf').css('top', getHeight('smoothmenu1') + getHeight('toolbar'));

                $('#index-vwf').css('width', window.innerWidth  - (getLeft('EntityLibrary') + getWidth('EntityLibrary')));

                $('#ScriptEditor').css('top', $(window).height() - $('#ScriptEditor').height() - getHeight('statusbar'));


                //$('#ScriptEditor').css('height',  $(window).height() - $('#ScriptEditor').offset().top - $('#statusbar').height() + 'px');


                if ($('#ScriptEditor').attr('maximized')) {
                    $('#ScriptEditor').css('top', getTop('toolbar') + getHeight('toolbar') + getHeight('statusbar'));
                    $('#ScriptEditor').css('height', $(window).height() - getTop('ScriptEditor') - getHeight('statusbar'));
                } else {

                    //if(_ScriptEditor.isOpen())
                    //    $('#ScriptEditor').css('height', $(window).height() - $('#ScriptEditor').offset().top);
                }


                //$('#index-vwf').css('height', window.innerHeight - $('#ScriptEditor').offset().top - $('#statusbar').height());

                
                $('#index-vwf').css('position', 'absolute');
                $('#vwf-root').css('overflow', 'visible');
                $('#vwf-root').css('left', '0px');
                $('#vwf-root').css('top', '0px');
                var scripteditorheight = $('#ScriptEditor').offset().top;
                if (scripteditorheight != 0) {
                    $('#index-vwf').css('height', scripteditorheight - $('#index-vwf').offset().top);
                    canvasheight = scripteditorheight - $('#index-vwf').offset().top
                } else {

                    $('#index-vwf').css('height', window.innerHeight - (getTop('toolbar') + getHeight('toolbar') + getHeight('statusbar')));
                    canvasheight = window.innerHeight - (getTop('toolbar') + getHeight('toolbar') + getHeight('statusbar'));
                }

                $('#index-vwf').css('left',getWidth('EntityLibrary') + getLeft('EntityLibrary'));


                if ($('#index-vwf').length)
                    $('#sidepanel').css('left', parseInt($('#index-vwf').css('width')) + $('#index-vwf').offset().left);
                //$('#sidepanel').css('width',320);
                $('#sidepanel').css('top', getTop('toolbar') + getHeight('toolbar'));

                $('#EntityLibrary').css('top', getHeight('smoothmenu1') + getHeight('toolbar'));
                $('#EntityLibrary').css('height', $(window).height());

                $('#sidepanel').css('height', $(window).height());
                $('#statusbar').css('top', ($(window).height() - 25) + 'px');


                $('#sidepanel').css('height', $(window).height() - (getHeight('toolbar') + getHeight('statusbar') + getHeight('smoothmenu1')));
                $('#ScriptEditor').css('width', $(window).width() - ($(window).width() - getLeft('sidepanel',$(window).width())) - (getLeft('EntityLibrary') + getWidth('EntityLibrary')));
                $('#EntityLibrary').css('height', $('#index-vwf').css('height'));
                $('#EntityLibraryAccordion').css('height', $(window).height() - $('#EntityLibraryAccordion').offset().top -$('#statusbar').height());
               // $('#EntityLibraryMain').css('height', $('#statusbar').height() + parseInt($('#index-vwf').css('height')) + parseInt($('#ScriptEditor').css('height')) - $('#entitylibrarytitle').height());
                _ScriptEditor.resize();
                //hideSidePanel();
                if ($('#index-vwf').offset()) {
                    $('#glyphOverlay').css('position', 'absolute');
                    $('#glyphOverlay').css('left', $('#index-vwf').offset().left);
                    $('#glyphOverlay').css('top', parseInt($('#index-vwf').css('top')));
                }
            } else {

                $('#vwf-root').css('overflow', 'visible');
                $('#vwf-root').css('left', '0px');
                $('#vwf-root').css('top', '0px');
                $('#index-vwf').css('height', $(window).height());
                $('#index-vwf').css('width', $(window).width());
                $('#index-vwf').attr('height', $(window).height());
                $('#index-vwf').attr('width', $(window).width());
                $('#index-vwf').css('top', 0 + 'px');
                $('#index-vwf').css('left', 0 + 'px');
            }
            if (_Editor.findcamera()) {

                if(!$('#index-vwf')[0]) return;
                var resolutionScale = _SettingsManager.getKey('resolutionScale');


                var oldwidth = parseInt($('#index-vwf').css('width'));
                var oldheight = parseInt($('#index-vwf').css('height'));

                //if ((origWidth != self.width) || (origHeight != self.height)) {
                    
                $('#index-vwf')[0].height = self.height / resolutionScale;
                $('#index-vwf')[0].width = self.width / resolutionScale;
                if(window._dRenderer)
                    _dRenderer.setViewport(0, 0, window.innerWidth / resolutionScale, window.innerHeight / resolutionScale)

                //note, this changes some renderer internals that need to be set, but also resizes the canvas which we don't want.
                //much of the resize code is in WindowResize.js
                if(window._dRenderer)
                    _dRenderer.setSize(parseInt($('#index-vwf').css('width')) / resolutionScale, parseInt($('#index-vwf').css('height')) / resolutionScale);
                _dView.getCamera().aspect = $('#index-vwf')[0].width / $('#index-vwf')[0].height;
                $('#index-vwf').css('height', oldheight);
                $('#index-vwf').css('width', oldwidth);
                _dView.getCamera().updateProjectionMatrix()
                _dView.windowResized();
            }
        });
        
        window.hideTools = function() {
            if (!toolsLoaded) return;
            toolsHidden = true;
            $('#smoothmenu1').hide();
            $('#toolbar').hide();
            $('#statusbar').hide();
            $('#sidepanel').hide();
            $('#EntityLibrary').hide();
            $('#ScriptEditor').hide();
            $('#index-vwf').css('height', $(window).height());
            $('#index-vwf').css('width', $(window).width());
            $('#index-vwf').attr('height', $(window).height());
            $('#index-vwf').attr('width', $(window).width());
            $('#index-vwf').css('top', 0 + 'px');
            $('#index-vwf').css('left', 0 + 'px');
             $('#index-vwf').css('border','none');
            _Editor.findcamera().aspect = (parseInt($('#index-vwf').css('width')) / parseInt($('#index-vwf').css('height')));
            $('#index-vwf').focus()
            _Editor.findcamera().updateProjectionMatrix();
            _Editor.SelectObject(null);
            _Editor.SetSelectMode('none');
            _Editor.hidePeerSelections();
            $(window).resize();
        }
        window.showTools = function() {
            if (!toolsLoaded) return;
            toolsHidden = false;
            if(menubarEnabled)
                $('#smoothmenu1').show();
            if(toolbarEnabled)
                $('#toolbar').show();
            if(sidepanelEnabled)
                $('#sidepanel').show();
            if(statusbarEnabled)
                $('#statusbar').show();
            $('#index-vwf').focus();
            if(libraryEnabled)
                $('#EntityLibrary').show();
            $('#index-vwf').css('height', $(window).height() + 'px');
            $('#index-vwf').css('width', $(window).width() + 'px');
            $('#index-vwf').css('top', $('#smoothmenu1').height() + $('#toolbar').height() + 'px');
            $('#index-vwf').css('height', $(window).height() - ($('#smoothmenu1').height() + $('#toolbar').height() + $('#statusbar').height()) + 'px');
            $('#index-vwf').css('left', parseInt($('#EntityLibrary').css('left')) + $('#EntityLibrary').width());
            _Editor.findcamera().aspect = (parseInt($('#index-vwf').css('width')) / parseInt($('#index-vwf').css('height')));
            _Editor.findcamera().updateProjectionMatrix();
            _Editor.SetSelectMode('Pick');
            $('#index-vwf').css('border','');
            $(window).resize();


        }
        window.toolsOpen = function() {
            if (!toolsLoaded) return false;
            return !toolsHidden;
        }
        $('#vwf-root').keypress(function(e) {
            if (e.charCode == 92) {
                if (!toolsLoaded) return;
                if (!toolsHidden)
                    hideTools();
                else
                    showTools();
            }
        });

    }
   

});