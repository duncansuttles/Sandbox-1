/*
 * WebRTC.js : Behaves as a wrapper for vwf/view/rtcObject
 * Maps simple 1:1 signal model to a broadcast model using target and sender ids
 */

define( [ "module", "vwf/view"], function( module, view ) {


	//the driver
	return view.load( module, {

		initialize : function()
		{
			this.guiNodes = {};
			window._GUIView = this;
			$('#vwf-root').append('<div id="guioverlay_index-vwf"/>');
			$('#guioverlay_index-vwf').css('position','fixed');
			$('#guioverlay_index-vwf').css('top','0%');
			$('#guioverlay_index-vwf').css('left','0%');
			$('#guioverlay_index-vwf').css('bottom','0%');
			$('#guioverlay_index-vwf').css('right','0%');
			$('#guioverlay_index-vwf').css('z-index','100000');
			$('#guioverlay_index-vwf').css('pointer-events','none');

		},
		createDialog : function(title)
		{
			debugger;
			var parent = _Editor.GetSelectedVWFID();
			if(!this.isGUINode(parent)) parent = "index-vwf";

			vwf_view.kernel.createChild(parent,GUID(),{
				extends: "http://vwf.example.com/dialog.vwf",
				properties:{
					title:title
				}
			});
		},
		createSlider : function(title)
		{
			var parent = _Editor.GetSelectedVWFID();
			if(!this.isGUINode(parent)) parent = "index-vwf";

			vwf_view.kernel.createChild(parent,GUID(),{
				extends: "http://vwf.example.com/slider.vwf",
				properties:{
					value:0,
					min:0,
					max:1,
					step:0,
					left:0,
					top:0
				}
			});
		},
		isGUINode:function(childExtendsID)
		{
			if(!childExtendsID) return false;
			if(childExtendsID == 'http-vwf-example-com-uielement-vwf') return true;
			return this.isGUINode(vwf.prototype(childExtendsID));
		},
		isDialog:function(childExtendsID)
		{
			if(!childExtendsID) return false;
			if(childExtendsID == 'http-vwf-example-com-dialog-vwf') return true;
			return this.isDialog(vwf.prototype(childExtendsID));
		},
		isSlider:function(childExtendsID)
		{
			if(!childExtendsID) return false;
			if(childExtendsID == 'http-vwf-example-com-slider-vwf') return true;
			return this.isSlider(vwf.prototype(childExtendsID));
		},
		isButton:function(childExtendsID)
		{
			if(!childExtendsID) return false;
			if(childExtendsID == 'http-vwf-example-com-button-vwf') return true;
			return this.isButton(vwf.prototype(childExtendsID));
		},
		isCheckbox:function(childExtendsID)
		{
			if(!childExtendsID) return false;
			if(childExtendsID == 'http-vwf-example-com-checkbox-vwf') return true;
			return this.isCheckbox(vwf.prototype(childExtendsID));
		},
		createdNode: function (nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childURI, childName, callback /* ( ready ) */ )
		{
			
			if(this.isGUINode(childExtendsID))
			{
				var node = this.guiNodes[childID] = {};
				node.id = childID;
				node.parentid = nodeID;
				node.type = childExtendsID;
				node.name = childName;
				node.parentnode = this.guiNodes[nodeID];
				node.parentdiv = $('#guioverlay_' + node.parentid)[0];
				if(this.isDialog(node.type))
				{
					$(node.parentdiv).append('<div id="guioverlay_'+node.id+'"/>' )
					node.div = $('#guioverlay_' + node.id)[0];
					$(node.div).dialog();
					$(node.div).dialog('open');

					$(node.div).on( "dialogclose", function( event, ui ) {

						if(this.inSetter) return;
						vwf_view.kernel.setProperty(this.vwfID,'visible',false);
					} );
					$(node.div).on( "dialogopen", function( event, ui ) {

						if(this.inSetter) return;
						vwf_view.kernel.setProperty(this.vwfID,'visible',true);
					} );
					$(node.div).on( "dialogdragstop", function( event, ui ) {
						
						if(this.inSetter) return;
						
						var pos = goog.vec.Mat4.createIdentity();
						pos[12] = ui.position.left;
						pos[13] = ui.position.top;
						vwf_view.kernel.setProperty(this.vwfID,'transform',matCpy(pos));
					} );
					$(node.div).on( "dialogresizestop", function( event, ui ) {
						
						if(this.inSetter) return;
						
						vwf_view.kernel.setProperty(this.vwfID,'width',ui.size.width);
						vwf_view.kernel.setProperty(this.vwfID,'height',ui.size.height);
					} );
				}
				if(this.isSlider(node.type))
				{
					$(node.parentdiv).append('<div id="guioverlay_'+node.id+'"/>' )
					node.div = $('#guioverlay_' + node.id)[0];
					$(node.div).slider();

					$(node.div).on( "slidechange", function( event, ui ) {
						
						if(this.inSetter) return;
						if($(this).hasClass('guiselected')) return false;
						vwf_view.kernel.setProperty(this.vwfID,'value',ui.value);

					} );
					$(node.div).on( "slide", function( event, ui ) {
						
						if(this.inSetter) return;
						if($(this).hasClass('guiselected')) return false;
						vwf_view.kernel.setProperty(this.vwfID,'value',ui.value);

					} );
					$(node.div).on( "slidestart", function( event, ui ) {
						if($(this).hasClass('guiselected')) return false;
						if(_Editor.GetSelectMode() == 'Pick' || _Editor.GetSelectMode() == 'TempPick') return false;
					});
					

				}
				if(this.isButton(node.type))
				{

					
				}
				if(this.isCheckbox(node.type))
				{

					
				}
				if(node.div)
				{
					node.div.vwfID = childID;
					$(node.div).addClass('guinode');
					$(node.div).css('pointer-events','all');
				}
			}
		},
		deletedNode:function(childID)
		{
			
			var node = this.guiNodes[childID];
			if(!node) return;
			$(node.div).remove();
			delete this.guiNodes[childID];

		},
		createdProperty:function(childID,propertyName,propertyValue)
		{
			this.satProperty(childID,propertyName,propertyValue);
		},
		initializedProperty:function(childID,propertyName,propertyValue)
		{
			this.satProperty(childID,propertyName,propertyValue);
		},
		satProperty: function(childID,propertyName,propertyValue)
		{
			
			var node = this.guiNodes[childID];
			if(!node) return;
			if(this.isDialog(node.type))
			{
				if(propertyName == 'transform')
				{
					var x = propertyValue[12];
					var y = propertyValue[13];
					var z = propertyValue[14];
					node.div.inSetter = true;
					$(node.div).dialog('option','position',[x,y]);
					node.div.inSetter = false;
				}
				if(propertyName == 'title')
				{
					node.div.inSetter = true;
					$(node.div).dialog('option','title',propertyValue);
					node.div.inSetter = false;
				}
				if(propertyName == 'visible')
				{
					node.div.inSetter = true;
					if(propertyValue)
						$(node.div).dialog('open');
					else
						$(node.div).dialog('close');
					node.div.inSetter = false;
				}
				if(propertyName == 'width')
				{
					node.div.inSetter = true;
					$(node.div).dialog('option','width',propertyValue);
					node.div.inSetter = false;
				}
				if(propertyName == 'height')
				{
					node.div.inSetter = true;
					$(node.div).dialog('option','height',propertyValue);
					node.div.inSetter = false;
				}
			}
			if(this.isSlider(node.type))
			{
				if(propertyName == 'min')
				{
					node.div.inSetter = true;
					$(node.div).slider('option','min',propertyValue);
					node.div.inSetter = false;
				}
				if(propertyName == 'max')
				{
					node.div.inSetter = true;
					$(node.div).slider('option','max',propertyValue);
					node.div.inSetter = false;
				}
				if(propertyName == 'step')
				{
					node.div.inSetter = true;
					$(node.div).slider('option','step',propertyValue);
					node.div.inSetter = false;
				}
				if(propertyName == 'value')
				{
					node.div.inSetter = true;
					$(node.div).slider('option','value',propertyValue);
					node.div.inSetter = false;
				}
				if(propertyName == 'width')
				{
					node.div.inSetter = true;
					$(node.div).css('width',propertyValue);
					node.div.inSetter = false;
				}
				if(propertyName == 'height')
				{
					node.div.inSetter = true;
					$(node.div).css('height',propertyValue);
					node.div.inSetter = false;
				}
				if(propertyName == 'transform')
				{
					var x = propertyValue[12];
					var y = propertyValue[13];
					var z = propertyValue[14];
					node.div.inSetter = true;
					$(node.div).css('left',x);
					$(node.div).css('top',y);
					$(node.div).css('z-index',z);
					node.div.inSetter = false;
				}
			}
		},
		calledMethod : function(id,name,params)
		{
			
		},	
		//Update the sound volume based on the position of the camera and the position of the object
		ticked : function()
		{
			
		
		},
		
		
	})
});
