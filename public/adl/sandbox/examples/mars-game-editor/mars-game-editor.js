function marsGameEditor()
{
	this.initialize = function()
	{
		var toolbar = require('vwf/view/editorview/Toolbar');
		var meunbar = require('vwf/view/editorview/Menubar');
		var windowResize = require('vwf/view/editorview/WindowResize');
		var Editor = require('vwf/view/editorview/Editor');
		windowResize.hideSidepanel();
		windowResize.hideStatusbar();
		windowResize.hideMenubar();
		var allowedButtons = ["MenuDelete","MenuDuplicate","MenuRedo","MenuUndo","MenuCameraFree","MenuCameraNavigate","MenuCameraOrbit"];
		var toolbarButtons = toolbar.getButtons();
		for(var i in toolbarButtons)
		{
			if(allowedButtons.indexOf(i) == -1)
				toolbarButtons[i].hide();
		}
		var lib = require('vwf/view/editorview/EntityLibrary');
		lib = lib.getSingleton();
		lib.libraries = [];
		lib.buildGui();
	}
}
window.marsGameEditor = new marsGameEditor();
window.marsGameEditor.initialize();