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
		$("#WireEditor").append("<div><div id='WireEditorSelectedName'></div><div id='WireEditorSourceName'></div>");
		$("#WireEditor").append("<div><div id='WireEditorSelectedProps'></div><div id='WireEditorSourceProps'></div></div>");
		this.selectedProp = null;
		this.selectedNodeID = null;
		this.pickSourceID = null;
		this.pickSourceProp = null;
		this.currentWires = null;
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
			this.currentWires = vwf.getProperty(this.selectedNodeID,'wires');
			this.buildGUI();
		}
		this.Hide = function()
		{
			$('#WireEditor').dialog('close');
		}
		this.isOpen = function()
		{
			return $('#WireEditor').is(":visible");
		}
		this.getProperties = function(id)
		{
			var properties = {};
			var node = vwf.getNode(id);
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
		this.setSource = function(e)
		{


		}
		this.setSource = function(e)
		{
			this.pickSourceID = e;
			$('#WireEditorSourceProps').empty();
			var props = this.getProperties(this.pickSourceID);
			for(var i in props)
			{
				$('#WireEditorSourceProps').append("<div class='sourcepropchoice' id='targetprop"+i+"'>"+i+"</div>");
				var self = this;

				$('#targetprop'+i).click(function(e)
				{
					self.selectProp($(this).text());
					$(".sourcepropchoice").removeClass('wirepropselected');
					$(this).addClass('wirepropselected');
				})
			}
		}
		this.selectProp = function(e)
		{
			this.selectedProp = e;
			var wiredToID = null;
			var wiredToProp = null;
			var wireSubTarget = null;
			var wireSubSource = null;
			var wireFunc = null;
			for(var i =0; i < this.currentWires.length; i++)
			{
				var wire = this.currentWires[i];
				if(wire[1]==e)
				{
					wiredToID = wire[0];
					wiredToProp = wire[2];
					wireSubSource = wire[3];
					wireSubTarget = wire[4];
					wireFunc = wire[5];
				}
			}
			if(wiredToID)
			{
				this.setSource(wiredToID)
				this.setSourceProp(wiredToProp);
			}

		}
		this.buildGUI = function()
		{
			$('#WireEditorSelectedProps').empty();
			$('#WireEditorSourceProps').empty();
			var props = this.getProperties(this.selectedNodeID);
			for(var i in props)
			{
				$('#WireEditorSelectedProps').append("<div class='targetpropchoice' id='targetprop"+i+"'>"+i+"</div>");
				var self = this;

				$('#targetprop'+i).click(function(e)
				{
					debugger;
					self.selectProp($(this).text());
					$(".targetpropchoice").removeClass('wirepropselected');
					$(this).addClass('wirepropselected');
				})
			}
		}
	}
});