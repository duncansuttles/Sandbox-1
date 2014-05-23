define(function ()
{
	var HierarchyManager = {};
	var isInitialized = false;
	return {
		getSingleton: function ()
		{
			if (!isInitialized)
			{
				initialize.call(HierarchyManager);
				isInitialized = true;
			}
			return HierarchyManager;
		}
	}

	function initialize()
	{
		var self = this;
		$('#sidepanel').append("<div id='hierarchyManager' class='ui-accordion-content ui-helper-reset ui-widget-content ui-corner-bottom ui-accordion-content-active' style='padding-bottom:5px;overflow:hidden;height:auto'></div>");
		$('#hierarchyManager').append("<div id='hierarchyManagertitle' style = 'padding:3px 4px 3px 4px;font:1.5em sans-serif;font-weight: bold;' class='ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix' ><span id='hierarchyManagertitletext' class='ui-dialog-title' id='ui-dialog-title-Players'>Hierarchy</span></div>");
		//$('#hierarchyManager').append("<span>Filter: </span><input type='text' id='HeirarchyFilter' class=''></input>");
		$('#hierarchyManager').append("<div id='hierarchyDisplay' style=''></div>");
		$('#hierarchyManager').append("<div id='hierarchyManagerMakeNode'></div>");
		$('#hierarchyManager').append("<div id='hierarchyManagerSelect'></div>");
		$('#hierarchyManager').append("<div id='hierarchyManagerExplode'></div>");
		
		$('#HeirarchyFilter').keyup(function()
		{
			self.BuildGUI();
		});
		
		$('#hierarchyManagerMakeNode').button(
		{
			label: 'Make VWF Node'
		});
		$('#hierarchyManagerExplode').button(
		{
			label: 'Explode'
		});
		$('#hierarchyManagerSelect').button(
		{
			label: 'Select'
		});
		$('#hierarchyManagertitle').append('<a id="hierarchyclose" href="#" class="ui-dialog-titlebar-close ui-corner-all" role="button" style="display: inline-block;float: right;"><span class="ui-icon ui-icon-closethick">close</span></a>');
		$('#hierarchyManagertitle').prepend('<div class="headericon hierarchy" />');
		$('#hierarchyManager').css('border-bottom', '5px solid #444444')
		$('#hierarchyManager').css('border-left', '2px solid #444444')
		$('#hierarchyclose').click(function ()
		{
			HierarchyManager.hide()
		});
		$('#hierarchyManagerMakeNode').click(function ()
		{
			HierarchyManager.makeVWFNode()
		});
		$('#hierarchyManagerSelect').click(function ()
		{
			HierarchyManager.select()
		});
		$('#hierarchyManagerExplode').click(function ()
		{
			HierarchyManager.explode()
		});
		this.createChild = function (parent, name, proto, uri, callback)
		{
			if (document.PlayerNumber == null)
			{
				_Notifier.notify('You must log in to participate');
				return;
			}
			_UndoManager.recordCreate(parent, name, proto, uri);
			vwf_view.kernel.createChild(parent, name, proto, uri, callback);
		}
		this.show = function ()
		{
			//$('#hierarchyManager').dialog('open');
			$('#hierarchyManager').prependTo($('#hierarchyManager').parent());
			$('#hierarchyManager').show('blind', function ()
			{
				if ($('#sidepanel').data('jsp')) $('#sidepanel').data('jsp').reinitialise();
			});
			//$('#hierarchyManager').dialog('option','position',[1282,40]);
			if(!this.selectedID)
				this.selectedID = 'index-vwf';
			HierarchyManager.BuildGUI();
			showSidePanel();
			HierarchyManager.open = true;
		}
		this.hide = function ()
		{
			//$('#hierarchyManager').dialog('close');
			if (this.isOpen())
			{
				$('#hierarchyManager').hide('blind', function ()
				{
					if ($('#sidepanel').data('jsp')) $('#sidepanel').data('jsp').reinitialise();
					if (!$('#sidepanel').children('.jspContainer').children('.jspPane').children().is(':visible')) hideSidePanel();
				});
			}
		}
		this.isOpen = function ()
		{
			//return $("#hierarchyManager").dialog( "isOpen" );
			return $('#hierarchyManager').is(':visible');
		}
		this.offClicked = function ()
		{
			$('#InventoryRename').hide();
			if (HierarchyManager.inRename)
			{
				_DataManager.renamehierarchyItem(document.PlayerNumber, HierarchyManager.selectedName, $('#InventoryRename').val(), HierarchyManager.selectedType);
				HierarchyManager.BuildGUI();
				HierarchyManager.inRename = false;
			}
		}
		this.makeBounds = function (node, color)
		{
			if (node)
			{
				if (this.SelectionBounds != null)
				{
					this.SelectionBounds.parent.remove(this.SelectionBounds);
					this.SelectionBounds = null;
				}
				var box = node.GetBoundingBox(true);
				box.max[0] += .05;
				box.max[1] += .05;
				box.max[2] += .05;
				box.min[0] -= .05;
				box.min[1] -= .05;
				box.min[2] -= .05;
				var mat = matCpy(node.matrixWorld.elements);
				//mat = GLGE.inverseMat4(mat);
				//mat[3] = 0;
				//mat[7] = 0;
				//mat[11] = 0;
				this.SelectionBounds = _Editor.BuildBox([box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]], [box.min[0] + (box.max[0] - box.min[0]) / 2, box.min[1] + (box.max[1] - box.min[1]) / 2, box.min[2] + (box.max[2] - box.min[2]) / 2], color);
				//this.SelectionBounds = _Editor.BuildBox([box.max[0] - box.min[0],box.max[1] - box.min[1],box.max[2] - box.min[2]],[0,0,0],color);
				this.SelectionBounds.matrixAutoUpdate = false;
				this.SelectionBounds.matrix.elements = mat;
				this.SelectionBounds.updateMatrixWorld(true);
				this.SelectionBounds.material = new THREE.MeshBasicMaterial();
				this.SelectionBounds.material.color.r = color[0];
				this.SelectionBounds.material.color.g = color[1];
				this.SelectionBounds.material.color.b = color[2];
				this.SelectionBounds.material.wireframe = true;
				this.SelectionBounds.renderDepth = 10000 - 3;
				this.SelectionBounds.material.depthTest = false;
				this.SelectionBounds.material.depthWrite = false;
				this.SelectionBounds.PickPriority = -1;
				_Editor.findscene().add(this.SelectionBounds);
			}
		}
		$('#hierarchyDisplay').click(this.offClicked);
		this.makeVWFNode = function ()
		{
			if (HierarchyManager.selectedType == 'three')
			{
				
				var node = this.findTHREEChild(_Editor.findviewnode(this.selectedID),  this.selectedName);
				var parent = this.selectedID;
				var childname = HierarchyManager.selectedName;
				var proto = {
					extends: 'asset.vwf',
					type: "link_existing/threejs",
					source: childname,
					properties: {
						owner: document.PlayerNumber,
						type: '3DR Object',
						DisplayName: childname,
						transform: matCpy(node.matrix.elements)
					}
				};
				var newname = GUID();
				_UndoManager.recordCreate(parent, newname, proto);
				vwf_view.kernel.createChild(parent, newname, proto, null);
			}
		}
		this.explode = function()
		{
				
				var nodes = this.getTHREEChildren(this.findTHREEChild(_Editor.findviewnode(this.selectedID),  this.selectedName));

				for(var i in nodes.children)
				{
					var node = this.findTHREEChild(_Editor.findviewnode(this.selectedID),  nodes.children[i].name);
					var parent = this.selectedID;
					var childname = nodes.children[i].name;
					var proto = {
						extends: 'asset.vwf',
						type: "link_existing/threejs",
						source: childname,
						properties: {
							owner: document.PlayerNumber,
							type: '3DR Object',
							DisplayName: childname,
							transform: matCpy(node.matrix.elements)
						}
					};
					var newname = GUID();
					_UndoManager.recordCreate(parent, newname, proto);
					vwf_view.kernel.createChild(parent, newname, proto, null);
				}
		}
		this.select = function ()
		{
			if (HierarchyManager.selectedType == 'vwf')
			{
				_Editor.SelectObject(HierarchyManager.selectedName);
			}
		}
		this.itemClicked = function ()
		{
			var name = $(this).attr('name');
			var type = $(this).attr('type');
			HierarchyManager.selectItem(name, type);
		}
		this.itemDblClicked = function ()
		{
			var name = $(this).attr('name');
			var type = $(this).attr('type');
			_Editor.SelectObject(name);
		}
		this.selectItem = function (name, type)
		{
			HierarchyManager.selectedType = type;
			HierarchyManager.selectedName = name;
			var node;
			var color = [0, .5, 1, 1];
			if (type == 'vwf')
			{
				node = _Editor.findviewnode(name);
				color = [0, 1, .5, 1];
			}
			if (type == 'three') node = HierarchyManager.findTHREEChild(_Editor.findviewnode(HierarchyManager.selectedID), name);
			HierarchyManager.makeBounds(node, color);
			$(".hierarchyItem").removeClass('hierarchyItemSelected');
			$('#heirarchyParent').removeClass('hierarchyItemSelected');
			$('#hierarchyDisplay').find('[name="' + name + '"]').addClass('hierarchyItemSelected');
		}

		this.getVWFChildren = function (nodeID)
		{
			if (nodeID === undefined)
			{
				nodeID = this.selectedID;
			}
			var ret = {name:'',vwfID:'',children:[]};
			ret.vwfID = nodeID;

			var vwfnode = vwf.getNode(nodeID);
			ret.name = ret.vwfID;
			if(vwfnode.properties && vwfnode.properties.DisplayName)
				ret.name = vwfnode.properties.DisplayName;

			var children = vwf.children(nodeID);
			if (children)
				for (var i = 0; i < children.length; i++)
				{
					ret.children.push(this.getVWFChildren(children[i]));
				}
			
			return ret;

		}
		this.getVWFParent = function (node)
		{
			if (node === undefined)
			{
				node = this.selectedID;
			}
			if (!node) return null;
			var parent = vwf.parent(node);
			if (!parent) return null;
			parent = vwf.getNode(parent);
			if (!parent) return null;
			return parent.properties.DisplayName || parent.id;
		}
		this.findTHREEChild = function (node, name)
		{
			if (node.name == name) return node;
			if (node.children) for (var i = 0; i < node.children.length; i++)
				{
					var ret2 = this.findTHREEChild(node.children[i], name);
					if (ret2) return ret2;
			}
			return null;
		}
		this.getTHREEChildren = function (threenode)
		{
			var ret =  {name:"",children:[]};
			if (threenode === undefined)
			{
				threenode = _Editor.findviewnode(this.selectedID);
			}	
			if (!threenode)
			{
				return ret;
			}	

			ret.name = threenode.name || threenode.uid || threenode.VWFID || 'No Name';


				
			if (threenode.children)
				for (var i = 0; i < threenode.children.length; i++)
				{
					if(!threenode.children[i].vwfID)
						ret.children.push(this.getTHREEChildren(threenode.children[i]));
				}
			
			return ret;
			
		
		}
		this.BuildGUI = function ()
		{
		
			
			$('#hierarchyManagertitletext').text((vwf.getProperty(this.selectedID,'DisplayName')||"") + ' Hierarchy');
			$('#hierarchyDisplay').empty();
			$('#InventoryRename').hide();
			$('#InventoryRename').keypress(HierarchyManager.rename)
			$('#InventoryRename').keydown(function (e)
			{
				e.stopPropagation();
			})
			$('#InventoryRename').focus(function ()
			{
				$(this).select();
			});
			if (this.getVWFParent()) $('#hierarchyDisplay').append("<div id='heirarchyParent' style='font-weight:bold;white-space: nowrap;text-overflow: ellipsis;overflow:hidden'><div>&#x25B2 Parent (" + HierarchyManager.getVWFParent() + ")</div></div>");
			$('#hierarchyDisplay').append("<div id='VWFChildren' style='font-weight:bold'><div>VWF Object Children</div></div>");
			$('#hierarchyDisplay').append("<div id='THREEChildren' style='font-weight:bold'><div>SceneNode Children</div></div>");
			$('#heirarchyParent').dblclick(function ()
			{
				_Editor.SelectObject(vwf.parent(this.selectedID));
			}.bind(this));
			$('#heirarchyParent').click(this.itemClicked);
			$('#heirarchyParent').attr('name', vwf.parent(this.selectedID));
			$('#heirarchyParent').attr('type', 'vwf');
			var VWFChildren = HierarchyManager.getVWFChildren();
			for(var i=0; i < VWFChildren.children.length; i++ )
				this.appendThreeChildDOM(VWFChildren.children[i],'VWFChildren','vwf');

			var THREEChildren = HierarchyManager.getTHREEChildren();
			for(var i=0; i < THREEChildren.children.length; i++ )
				this.appendThreeChildDOM(THREEChildren.children[i],'THREEChildren','three');


			if ($('#sidepanel').data('jsp')) $('#sidepanel').data('jsp').reinitialise();
		}
		this.appendThreeChildDOM = function(node,parentDiv,type)
		{
			var thisid = 'THREEChild' + ToSafeID(node.name) + ToSafeID(GUID());
			$('#' + parentDiv).append('<div id="'+thisid+'container'+'" style="margin-left:1em; overflow:hidden; height:1em"><span id="'+thisid+'toggle'+'">+</span><span class="hierarchyItem" style="" id="' + thisid + '" /><span>');
			$('#' + thisid +'toggle').css('cursor','pointer');
			$('#' + thisid +'toggle').click(function()
			{
				
				if($(this).text() == '-')
				{
					$(this).parent().css('height','1em');
					$(this).text('+');
					window.updateSidepanelScrollbars()
				}else
				{
					$(this).parent().css('height','');
					$(this).text('-');
					window.updateSidepanelScrollbars()
				}

			});


			$('#' + thisid).text(node.name);
			$('#' + thisid).attr('name', node.vwfID || node.name);
			$('#' + thisid).attr('type', type);
			$('#' + thisid).click(HierarchyManager.itemClicked);
			if(type == 'vwf')
			$('#' + thisid).dblclick(HierarchyManager.itemDblClicked);
			for(var i = 0; i < node.children.length; i++)
			{
				this.appendThreeChildDOM(node.children[i],thisid+'container',type);
			}
		}
		this.SelectionChanged = function (e, node)
		{
			try
			{
				if (this.SelectionBounds != null)
				{
					this.SelectionBounds.parent.remove(this.SelectionBounds);
					this.SelectionBounds = null;
				}
				if (node )
				{
					this.selectedID = node.id
					if(this.isOpen())
						this.BuildGUI();
				}
				else
				{
					this.hide();
					this.selectedID = null;
				}
			}
			catch (e)
			{
				console.log(e);
			}
		}
		this.createdNode = function(id)
		{
			
			if(this.selectedID == id || vwf.decendants(this.selectedID ).indexOf(id) != -1)
			{
				window.setTimeout(function(){
					this.BuildGUI();	
				}.bind(this),500)
				
			}
		}
		$(document).bind('selectionChanged', this.SelectionChanged.bind(this));
		this.hide();
	}
});