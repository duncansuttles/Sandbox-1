define([], function ()
{
	var Publisher = {};
	var isInitialized = false;
	return {
		getSingleton: function ()
		{
			if (!isInitialized)
			{
				initialize.call(Publisher);
				isInitialized = true;
			}
			return Publisher;
		}
	}

	function initialize()
	{
		this.setup = function()
		{
			$(document.body).append('<div id="publishSettings"></div>');
			$('#publishSettings').dialog({
				title:"Test Publish",
				buttons:{
					ok:function(){
						_Publisher.savePublishSettings();
						$(this).dialog('close');
					},
					cancel:function(){
						$(this).dialog('close');
					}
				},
				position:'center',
				width:'auto',
				height:'auto',
				resizable:'false',
				moveable:'false',
				modal:'true',
				autoOpen:false
			});
			$('#publishSettings').append('<div><input type="checkbox" id="singlePlayer" /><span>Single Player</span></div>');
			$('#publishSettings').append('<div><input type="checkbox" id="allowAnonymous" /><span>Allow Anonymous</span></div>');
			$('#publishSettings').append('<div><input type="checkbox" id="createAvatar" /><span>Create Avatars</span></div>');
			$('#publishSettings').append('<div><input type="checkbox" id="allowTools" /><span>Allow Tools</span></div>');
			$('#publishSettings').append('<div id="chooseCamera" >Choose Camera</div>');

			$('#chooseCamera').button();
			$('#chooseCamera').click(function(){

				var list = _dView.getCameraList();

				var camList = list[0];
				var idList = list[1];

				alertify.choice("Choose the camera to use in the Published Scene",function(ok,val)
				{
					$('#chooseCamera').button('option','label',val);
					$('#chooseCamera').attr('cameraID', idList[camList.indexOf(val)]);
				},camList)
			})
		}

		this.setup();

		this.show = function()
		{
			this.loadPublishSettings();
			$('#publishSettings').dialog('open');
		}
		this.savePublishSettings = function()
		{
			var statedata = {};
			statedata.SinglePlayer = $('#singlePlayer').is(':checked');
			statedata.camera  = $('#chooseCamera').attr('cameraID');
			statedata.allowAnonymous  = $('#allowAnonymous').is(':checked');
			statedata.createAvatar =  $('#createAvatar').is(':checked');
			statedata.allowTools  = $('#allowTools').is(':checked');
			vwf.setProperty(vwf.application(),'publishSettings',statedata);
		}
		this.loadPublishSettings = function()
		{
			var statedata = vwf.getProperty(vwf.application(),'publishSettings') || {};

			if(statedata.SinglePlayer) 
			 	$('#singlePlayer').attr('checked','checked');
			else 
				$('#singlePlayer').removeAttr('checked');

			if(statedata.allowAnonymous) 
			 	$('#allowAnonymous').attr('checked','checked');
			else 
				$('#allowAnonymous').removeAttr('checked');

			if(statedata.createAvatar) 
			 	$('#createAvatar').attr('checked','checked');
			else 
				$('#createAvatar').removeAttr('checked');

			if(statedata.allowTools) 
			 	$('#allowTools').attr('checked','checked');
			else 
				$('#allowTools').removeAttr('checked');

			if(statedata.camera) 
			 {
				$('#chooseCamera').button('option','label',vwf.getProperty(statedata.camera,'DisplayName'));
				$('#chooseCamera').attr('cameraID', statedata.camera);
			 }
			else 
			{
				$('#chooseCamera').button('option','label',"Choose Camera");
				$('#chooseCamera').attr('cameraID', null);
			}
		
		}

		this.stateBackup = null;
		this.backupState = function()
		{
			var s = _Editor.getNode(vwf.application());
			vwf_view.kernel.setProperty(vwf.application(),'playBackup',s);

		}
		this.satProperty = function(id,prop,val)
		{
			if(id == vwf.application())
			{
				if(prop == 'playMode' && val == 'play')
				{
					$('#playButton').css('background','lightblue');
					$('#pauseButton').css('background','');
					$('#stopButton').css('background','');
				}

				if(prop == 'playMode' && val == 'paused')
				{
					$('#playButton').css('background','lightblue');
					$('#pauseButton').css('background','lightblue');
					$('#stopButton').css('background','');
				}
				if(prop == 'playMode' && val == 'stop')
				{
					
					$('#playButton').css('background','');
					$('#pauseButton').css('background','');
					$('#stopButton').css('background','lightblue');
					
				}


			}

		}
		this.restoreState = function()
		{
			
			var s = vwf.getProperty(vwf.application(),'playBackup');
			vwf_view.kernel.setProperty(vwf.application(),'playBackup',null);
			var walk = function(node)
			{


				for(var i in node.children)
				{
					try
					{
					var exists = vwf.getNode(node.children[i].id);
					}catch(e)
					{
						vwf_view.kernel.createChild(node.id,i,node.children[i]);
					}
					if(exists)
					{
						for(var j in node.children[i].properties)
						{
							vwf_view.kernel.setProperty(node.children[i].id,j,node.children[i].properties[j]);
						}

					}else
					{

						
					}

				}

			}
			walk(s);
			

		}
		this.playWorld = function()
		{
			var currentState = vwf.getProperty(vwf.application(),'playMode');
			if(currentState === 'play' ) return;
			if(currentState === 'stop')
				this.backupState();
			vwf_view.kernel.setProperty(vwf.application(),'playMode','play')	

		}
		this.stopWorld = function()
		{
			var currentState = vwf.getProperty(vwf.application(),'playMode');
			if(currentState === 'stop') return;
				this.restoreState();
			this.stateBackup = null;
			vwf_view.kernel.setProperty(vwf.application(),'playMode','stop')

		}
		this.togglePauseWorld = function()
		{
			var currentState = vwf.getProperty(vwf.application(),'playMode');
			if(currentState === 'stop') return;
			vwf_view.kernel.setProperty(vwf.application(),'playMode','paused')
		}
		//quickly clone a world, publish it and open it. When that world closes, delete it.
		this.testPublish = function()
		{

			var testSettings = vwf.getProperty(vwf.application(),'publishSettings') || {
				SinglePlayer:true,
				camera:null,
				allowAnonymous:false,
				createAvatar:false,
				allowTools:false
			};
			var instance = _DataManager.getCurrentSession();
			var instanceSettings = _DataManager.getInstanceData();
			var user = _UserManager.GetCurrentUserName();
			if(user != instanceSettings.owner)
			{
				alertify('You must be the world owner to complete this action');
				return;
			}
			_DataManager.saveToServer(true);
			$.get('./vwfdatamanager.svc/copyinstance?SID=' + instance,function(o)
			{
				var newID = $.trim(o);
				var statedata = testSettings;

				
				
				jQuery.ajax(
				{
					type: 'POST',
					url: './vwfDataManager.svc/publish?SID='+newID,
					data: JSON.stringify(statedata),
					contentType: statedata ? "application/json; charset=utf-8" : "application/text; charset=utf-8",
					dataType: "text",
					success:function(data,status,xhr)
					{
						var windowObjectReference;
						var strWindowFeatures = "menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes";
						windowObjectReference = window.open("../../.."+newID.replace(/_/g,"/"), "TESTPUBLISH", strWindowFeatures);
						var thisconsole = console;
						if(windowObjectReference)
						{
							$(document.body).append("<div id='publishblocker' style='position:absolute;top:0px;bottom:0px;left:0px;right:0px;background-color:black;opacity:.8;z-index:10000000' ></div>");
							_dView.paused = true;
							windowObjectReference.onbeforeunload = function()
							{
								
								jQuery.ajax(
								{
									type: 'DELETE',
									url: './vwfDataManager.svc/state?SID='+newID,
									dataType: "text",
									success:function(data,status,xhr)
									{
										$('#publishblocker').remove();
										_dView.paused = false;
									},
									error:function(xhr,status,err)
									{
										
									}
									
								});

							};
						}
					},
					error:function(xhr,status,err)
					{
						
					}
				});	
			});
		}
	}
});


			

