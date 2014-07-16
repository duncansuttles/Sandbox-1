define({

	initialize: function() {
		var toolsHidden = false;
		var toolsLoaded = true;
		if (_DataManager.getInstanceData().publishSettings)
			toolsLoaded = _DataManager.getInstanceData().publishSettings.allowTools;
		$(window).resize(function() {


			if (!toolsHidden && toolsLoaded) {
				$('#smoothmenu1').css('top', '0px');
				$('#smoothmenu1').css('left', '0px');
				$('#toolbar').css('top', $('#smoothmenu1').height());
				//$('#toolbar').css('height','35px');
				$('#toolbar').css('left', '0px');
				$('#statusbar').css('left', '0px');

				$('#index-vwf').css('top', ($('#smoothmenu1').height() + $('#toolbar').height()));

				if ($('#sidepanel').offset().left + 5 < window.innerWidth)
					$('#index-vwf').css('width', window.innerWidth - $('#sidepanel').width() - ($('#EntityLibrary').offset().left + $('#EntityLibrary').width()));
				else
					$('#index-vwf').css('width', window.innerWidth - ($('#EntityLibrary').offset().left + $('#EntityLibrary').width()));

				$('#ScriptEditor').css('top', $(window).height() - $('#ScriptEditor').height() - $('#statusbar').height());


				//$('#ScriptEditor').css('height',	$(window).height() - $('#ScriptEditor').offset().top - $('#statusbar').height() + 'px');


				if ($('#ScriptEditor').attr('maximized')) {
					$('#ScriptEditor').css('top', $('#toolbar').offset().top + $('#toolbar').height());
					$('#ScriptEditor').css('height', $(window).height() - $('#toolbar').height() - $('#smoothmenu1').height() - $('#statusbar').height());
				} else {

					//$('#ScriptEditor').css('top',$('#ScriptEditor').attr('originaltop')+'px');
					//$('#ScriptEditor').css('height',$(window).height() - $('#ScriptEditor').offset().top- $('#statusbar').height()+'px');

				}


				$('#index-vwf').css('height', window.innerHeight - $('#ScriptEditor').offset().top);

				$('#index-vwf').css('top', $('#toolbar').offset().top + $('#toolbar').height());
				$('#index-vwf').css('position', 'absolute');
				$('#vwf-root').css('overflow', 'visible');
				$('#vwf-root').css('left', '0px');
				$('#vwf-root').css('top', '0px');
				var scripteditorheight = $('#ScriptEditor').offset().top;
				if (scripteditorheight != 0)
					scripteditorheight = $(window).height() - scripteditorheight;
				$('#index-vwf').css('height', window.innerHeight - $('#smoothmenu1').height() - $('#statusbar').height() - $('#toolbar').height() - (scripteditorheight - 25));

				if ($('#index-vwf').length)
					$('#sidepanel').css('left', $('#index-vwf').width() + $('#index-vwf').offset().left);
				//$('#sidepanel').css('width',320);
				$('#sidepanel').css('top', $('#toolbar').offset().top + $('#toolbar').height());

				$('#EntityLibrary').css('top', $('#toolbar').offset().top + $('#toolbar').height());
				$('#EntityLibrary').css('height', $(window).height());

				$('#sidepanel').css('height', $(window).height());
				$('#statusbar').css('top', ($(window).height() - 25) + 'px');


				$('#sidepanel').css('height', $(window).height() - ($('#statusbar').height() + $('#toolbar').height() + $('#smoothmenu1').height()));
				$('#ScriptEditor').css('width', $(window).width() - ($(window).width() - $('#sidepanel').offset().left) - ($('#EntityLibrary').offset().left + $('#EntityLibrary').width()));
				_ScriptEditor.resize();

				if ($('#index-vwf').offset()) {
					$('#glyphOverlay').css('position', 'absolute');
					$('#glyphOverlay').css('left', $('#index-vwf').offset().left);
					$('#glyphOverlay').css('top', $('#index-vwf').offset().top);
				}
			} else {
				$('#vwf-root').css('overflow', 'visible');
				$('#vwf-root').css('left', '0px');
				$('#vwf-root').css('top', '0px');
				$('#index-vwf').css('height', $(window).height());
				$('#index-vwf').css('width', $(window).width());
				$('#index-vwf').css('top', 0 + 'px');
				$('#index-vwf').css('left', 0 + 'px');
			}
			if (_Editor.findcamera()) {
				_Editor.findcamera().aspect = ($('#index-vwf').width() / $('#index-vwf').height());
				_Editor.findcamera().updateProjectionMatrix();
			}
		});
		$(window).resize();

		window.setTimeout(function() {
			$(window).resize();
			if (toolsLoaded) hideSidePanel();
		}, 500);
		window.hideTools = function() {
			if (!toolsLoaded) return;
			toolsHidden = true;
			$('#smoothmenu1').hide();
			$('#toolbar').hide();
			$('#statusbar').hide();
			$('#sidepanel').hide();
			$('#EntityLibrary').hide();
			$('#ScriptEditor').hide();
			$('#index-vwf').css('height', $(window).height() + 'px');
			$('#index-vwf').css('width', $(window).width() + 'px');
			$('#index-vwf').css('top', 0 + 'px');
			$('#index-vwf').css('left', 0 + 'px');
			_Editor.findcamera().aspect = ($('#index-vwf').width() / $('#index-vwf').height());
			$('#index-vwf').focus()
			_Editor.findcamera().updateProjectionMatrix();
			_Editor.SelectObject(null);
			_Editor.SetSelectMode('none');
			_Editor.hidePeerSelections();
		}
		window.showTools = function() {
			if (!toolsLoaded) return;
			toolsHidden = false;
			$('#smoothmenu1').show();
			$('#toolbar').show();
			$('#sidepanel').show();
			$('#statusbar').show();
			$('#index-vwf').focus();
			$('#EntityLibrary').show();
			$('#index-vwf').css('height', $(window).height() + 'px');
			$('#index-vwf').css('width', $(window).width() + 'px');
			$('#index-vwf').css('top', $('#smoothmenu1').height() + $('#toolbar').height() + 'px');
			$('#index-vwf').css('height', $(window).height() - ($('#smoothmenu1').height() + $('#toolbar').height() + $('#statusbar').height()) + 'px');
			$('#index-vwf').css('left', $('#EntityLibrary').offset().left + $('#EntityLibrary').width());
			_Editor.findcamera().aspect = ($('#index-vwf').width() / $('#index-vwf').height());
			_Editor.findcamera().updateProjectionMatrix();
			_Editor.SetSelectMode('Pick');
			

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