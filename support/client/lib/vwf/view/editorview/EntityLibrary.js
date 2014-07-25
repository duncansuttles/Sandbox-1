define(function() {
    var EntityLibrary = {};
    var isInitialized = false;
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

        $('#entitylibrarytitle').append('<a id="entitylibraryclose" href="#" class="ui-dialog-titlebar-close ui-corner-all" role="button" style="display: inline-block;float: right;"><span class="ui-icon ui-icon-closethick">close</span></a>');
        $('#entitylibrarytitle').prepend('<div class="headericon properties" />');
        $('#EntityLibraryMain').append("<div id='EntityLibraryAccordion'></div>");
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
                    for (var i in libs) {
                        var section = '<h3 class="modifiersection" ><a href="#"><div style="font-weight:bold;display:inline">' + i + "</div>" + '</a></h3>' + '<div class="modifiersection" id="library' + ToSafeID(i) + '">' + '</div>';
                        $('#EntityLibraryAccordion').append(section);
                        for (var j in libs[i].library) {
                            $('#library' + ToSafeID(i)).append('<div class = "libraryAsset">' +
                                '<img src="' + libs[i].library[j].preview + '"></img>' +
                                '<div>' + j + '</div>' +
                                '</div>'
                            );


                        }
                    }
                    $("#EntityLibraryAccordion").accordion({
                        heightStyle: 'fill',
                        activate: function() {

                        }
                    });
                    $(".ui-accordion-content").css('height', 'auto');

                });
            })
        }
        this.setup();
        this.isOpen = function() {
            return isOpen;
        }
        this.show = function() {

            $('#EntityLibrary').animate({
                'left': 0
            });
            var w = $(window).width() - 250 - ($(window).width() - $('#sidepanel').offset().left);
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

            $('#EntityLibraryAccordion').css('height', $('#index-vwf').css('height') - $('#entitylibrarytitle').height() );
            $('#EntityLibrary').css('height', $('#index-vwf').css('height'));
            $('#EntityLibraryAccordion').css('overflow', 'auto');
            isOpen = true;
        }
        this.hide = function() {

            $('#EntityLibrary').animate({
                'left': -$('#EntityLibrary').width()
            });
            var w = $(window).width() - ($(window).width() - $('#sidepanel').offset().left);
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

        $('#EntityLibrarySideTab').click(function() {


            if (EntityLibrary.isOpen())
                EntityLibrary.hide();
            else
                EntityLibrary.show();
        })
    }
});