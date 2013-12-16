define(function ()
{
	var WireEditor = {};
	var isInitialized = false;
	return {
		getSingleton: function ()
		{
			if (!isInitialized)
			{
				initialize.call(WireEditor);
				isInitialized = true;
			}
			return WireEditor;
		}
	}

	function initialize()
	{
		$(document.body).append("<div id='WireEditor'></div>");
		this.selectedNodeID;
		$('#WireEditor').dialog(
		{
			modal: true,
			autoOpen: false,
			resizable: true
		});
		this.Show = function()
		{
			$('#WireEditor').dialog('open');
			this.selectedNodeID = _Editor.GetSelectedVWFID();
			this.buildGUI()
		}
		this.Hide = function()
		{
			$('#WireEditor').dialog('close');
		}
		this.isOpen = function()
		{
				return $('#WireEditor').is(":visible");
		}
		this.getProperties = function()
		{
			var properties = {};
			var node = vwf.getNode(this.selectedNodeID);
			while(node)
			{
				for ( var i in node.properties)
				{
					if(properties[i] === undefined)
					properties[i] = node.properties[i];
				
				}
				node = vwf.getNode(vwf.prototype(node.id),true);
			}
			return properties;
		}
		this.buildGUI = function()
		{
				$('#WireEditor').empty();
		}
	}
});