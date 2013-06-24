define(function ()
{
	var UserManager = {};
	var isInitialized = false;
	return {
		getSingleton: function ()
		{
			if (!isInitialized)
			{
				initialize.call(UserManager);
				isInitialized = true;
			}
			return UserManager;
		}
	}

	function initialize()
	{
		this.currentUsername = null;
		$('#sidepanel').append("<div id='UserProfileWindow' class='ui-accordion-content ui-helper-reset ui-widget-content ui-corner-bottom ui-accordion-content-active' style='padding-bottom:5px;overflow:hidden;height:auto'></div>");
		$('#UserProfileWindow').append("<div id='userprofiletitle' style = 'padding:3px 4px 3px 4px;font:1.5em sans-serif;font-weight: bold;' class='ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix' ><span class='ui-dialog-title' id='ui-dialog-title-Players'>User Profile</span></div>");
		$('#userprofiletitle').append('<a id="userprofileclose" href="#" class="ui-dialog-titlebar-close ui-corner-all" role="button" style="display: inline-block;float: right;"><span class="ui-icon ui-icon-closethick">close</span></a>');
		$("#UserProfileWindow").append("<table id='UserProfiletable' class='usertable'></table>");
		$("#UserProfiletable").append("<tr><td><div>Username</div></td><td><div id='ProfileUsername'></div></td></tr>");
		$("#UserProfiletable").append("<tr><td><div>Name</div></td><td><div id='ProfileName'></div></td></tr>");
		$("#UserProfiletable").append("<tr><td><div>Age</div></td><td><div id='ProfileAge'></div></td></tr>");
		$("#UserProfiletable").append("<tr><td><div>Birthday</div></td><td><div id='ProfileBirthday'></div></td></tr>");
		$("#UserProfiletable").append("<tr><td><div>Relationship</div></td><td><div id='ProfileRelationship'></div></td></tr>");
		$("#UserProfiletable").append("<tr><td><div>City</div></td><td><div id='ProfileCity'></div></td></tr>");
		$("#UserProfiletable").append("<tr><td><div>State</div></td><td><div id='ProfileState'></div></td></tr>");
		$("#UserProfiletable").append("<tr><td><div>Homepage</div></td><td><div id='ProfileHomepage'></div></td></tr>");
		$("#UserProfiletable").append("<tr><td><div>Employer</div></td><td><div id='ProfileEmployer'></div></td></tr>");
		$("#UserProfiletable").append("<tr><td><div>Title</div></td><td><div id='ProfileTitle'></div></td></tr>");
		$("#UserProfiletable").append("<tr><td><div>Height</div></td><td><div id='ProfileHeight'></div></td></tr>");
		$("#UserProfiletable").append("<tr><td><div>Weight</div></td><td><div id='ProfileWeight'></div></td></tr>");
		$("#UserProfiletable").append("<tr><td><div>Nationality</div></td><td><div id='ProfileNationality'></div></td></tr>");
		//$('#UserProfileWindow').dialog({title:'Profile',autoOpen:false});
		$('#UserProfileWindow').css('border-bottom', '5px solid #444444')
		$('#UserProfileWindow').css('border-left', '2px solid #444444')
		$('#userprofiletitle').prepend('<img class="headericon" src="../vwf/view/editorview/images/icons/user.png" />');
		$("#UserProfileWindow").append("<div id='FollowUser'></div>");
		$("#UserProfileWindow").append("<div id='PrivateMessage'></div>");
		$("#UserProfileWindow").append("<div id='CallUser'></div>");
		$("#UserProfileWindow").append("<div id='VideoCallUser'></div>");


		$("#userprofileclose").click(function ()
		{
			$("#UserProfileWindow").hide('blind', function ()
			{
				if ($('#sidepanel').data('jsp')) $('#sidepanel').data('jsp').reinitialise();
				if (!$('#sidepanel').children().is(':visible')) hideSidePanel();
			});
		});
		$('#sidepanel').append('<div id="Players"  class="ui-accordion-content ui-helper-reset ui-widget-content ui-corner-bottom ui-accordion-content-active" style="width: 100%;margin:0px;padding:0px">' + "<div id='playerstitle' style = 'padding:3px 4px 3px 4px;font:1.5em sans-serif;font-weight: bold;' class='ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix' ><span class='ui-dialog-title' id='ui-dialog-title-Players'>Players</span></div>" + '	 <div id="PlayerList"></div>' + '</div>');
		$('#playerstitle').append('<a id="playersclose" href="#" class="ui-dialog-titlebar-close ui-corner-all" role="button" style="display: inline-block;float: right;"><span class="ui-icon ui-icon-closethick">close</span></a>');
		$('#playersclose').click(function ()
		{
			$('#Players').hide('blind', function ()
			{
				if ($('#sidepanel').data('jsp')) $('#sidepanel').data('jsp').reinitialise();
				if (!$('#sidepanel').children('.jspContainer').children('.jspPane').children().is(':visible')) hideSidePanel();
			});
		});
		$('#playerstitle').prepend('<img class="headericon" src="../vwf/view/editorview/images/icons/users.png" />');
		$('#Players').css('border-bottom', '5px solid #444444')
		$('#Players').css('border-left', '2px solid #444444')
		$(document.body).append('<div id="CreateProfileDialog"/>');
		
		$("#FollowUser").button(
		{
			label: 'Follow This User'
		});
		$("#FollowUser").click(function ()
		{
			var id = '-object-Object-player-' + _UserManager.SelectedProfile.Username;
			vwf.models[0].model.nodes['index-vwf'].setCameraMode('Orbit');
			vwf.models[0].model.nodes['index-vwf'].followObject(vwf.models[0].model.nodes[id]);
		});
		$("#PrivateMessage").button(
		{
			label: 'Private Message'
		});
		$("#PrivateMessage").click(function ()
		{
			setupPmWindow(_UserManager.SelectedProfile.Username);
		});

		$("#CallUser").button({
			label: 'Voice Call'
		});
		$("#CallUser").click(function (){
			vwf.callMethod('index-vwf', 'rtcCall', {target: _UserManager.SelectedProfile.Username});
		});

		$("#VideoCallUser").button({
			label: 'Video Call'
		});
		$("#VideoCallUser").click(function (){
			vwf.callMethod('index-vwf', 'rtcVideoCall', {target: _UserManager.SelectedProfile.Username});
		});

		$(document).on('setstatecomplete',function()
		{
			
				if(this.GetCurrentUserName()) return;
				$.ajax('/vwfDataManager.svc/logindata',
				{
					cache:false,
					success:function(data,status,xhr)
					{
						var logindata = JSON.parse(xhr.responseText);
						var username = logindata.username;
						
						if(logindata.instances.indexOf(window.location.pathname) != -1)
						{
							_Notifier.alert('You are already logged into this space from another tab, browser or computer. This session will be a guest.');
						}
						else
						{
							this.Login(username);
						}
						
					}.bind(this),
					error:function(xhr,status,err)
					{
						
						hideTools();
						//$('#NotifierAlertMessage').dialog('open');
						//$('#NotifierAlertMessage').html('You are viewing this world as a guest. Please <a style="color:blue" href="'+_DataManager.getCurrentApplication() + "/login?return=" + _DataManager.getCurrentSession().substr(13)+'">sign in</a> to participate');
						alertify.set({ labels: {
						    ok     : "Login",
						    cancel : "Continue As Guest"
						} });
						alertify.confirm("You are viewing this world as a guest. You will be able to view the world, but not interact with it. Would you like to go back and log in?",
						function(e)
						{
							if(e)
								window.location = _DataManager.getCurrentApplication() + "/login?return=" + _DataManager.getCurrentSession().substr(13);
							else
							{
								
								$(document.body).append('<a href="#" id="GuestLogin" style="font-family: sans-serif;z-index:99;position:fixed;font-size: 2em;" class="alertify-button alertify-button-ok" id="alertify-ok">Login</a>');
								$('#GuestLogin').click(function()
								{
									window.location = _DataManager.getCurrentApplication() + "/login?return=" + _DataManager.getCurrentSession().substr(13);
								});
							}
						}
						);
					}.bind(this)
				});
			
			
			
		}.bind(this)
		);
		this.SelectedProfile = null;
		this.showProfile = function (profile)
		{
			if (!profile) return;
			$('#UserProfileWindow').prependTo($('#UserProfileWindow').parent());
			$('#UserProfileWindow').show('blind', function ()
			{});
			showSidePanel();
			this.SelectedProfile = profile;
			//$('#UserProfileWindow').dialog('open');
			//$('#UserProfileWindow').dialog('option','position',[1282,40]);
			//_Editor.SelectObject(null);
			for (i in profile)
			{
				$('#Profile' + i).text(profile[i]);
			}
			$('#EditProfile').hide();
			$('#PrivateMessage').show();
			$('#CallUser').show();
			if (this.SelectedProfile.Username == this.GetCurrentUserName())
			{
				$('#EditProfile').show();
				$('#PrivateMessage').hide();
				$('#CallUser').hide();
			}
		}
		this.GetCurrentUserName = function ()
		{
			return this.currentUsername;
		}
		this.GetCurrentUserID = function ()
		{
			return 'character-vwf-' + this.currentUsername;
		}
		this.PlayerProto = {
			extends: 'character.vwf',
			source: $("#AvatarChoice :radio:checked").attr('value'),
			type: 'model/vnd.collada+xml',
			properties: {
				PlayerNumber: 1,
			},
			events: {
				ShowProfile: null,
				Message: null
			},
			scripts: ["this.ShowProfile = function(){if(vwf.client() != vwf.moniker()) return; _UserManager.showProfile(_DataManager.GetProfileForUser(this.PlayerNumber))     }; \n" +
					          "this.Message = function(){if(vwf.client() != vwf.moniker()) return; setupPmWindow(this.PlayerNumber)     }"]
		};
		this.Login = function (username)
		{
		
			if(this.GetCurrentUserName()) return;
			//clear this. No reason to have it saved in the dom
			
			
			//take ownership of the client connection
			var S = window.location.pathname;
			var data = jQuery.ajax(
			{
				type: 'GET',
				url: PersistanceServer + "/vwfDataManager.svc/login?S=" + S + "&CID=" + vwf.moniker(),
				data: null,
				success: null,
				async: false,
				dataType: "json"
			});
			
			var profile = _DataManager.GetProfileForUser(username, true);
			if (!profile)
			{
				alert('There is no account with that username');
				return;
			}
			if (profile.constructor == String)
			{
				alert(profile);
				return;
			}
			if (data.status != 200)
			{
				alert(data.responseText);
				return;
			}
			$('#MenuLogInicon').css('background', "#555555");
			$('#MenuLogOuticon').css('background', "");
			$('#MenuLogIn').attr('disabled', 'disabled');
			$('#MenuLogOut').removeAttr('disabled');
			//disabled until 
			this.PlayerProto.source = 'usmale.dae'; //profile['Avatar'];
			if (document.Players && document.Players.indexOf(username) != -1)
			{
				alert('User is already logged into this space');
				return;
			}
			var newintersectxy = _Editor.GetInsertPoint();
			
			this.PlayerProto.properties.PlayerNumber = username;
			this.PlayerProto.properties.owner = username;
			this.PlayerProto.properties.ownerClientID = vwf.moniker();
			this.PlayerProto.properties.profile = profile;
			this.PlayerProto.properties.translation = newintersectxy;
			document[username + 'link'] = null;
			//this.PlayerProto.id = "player"+username;
			document["PlayerNumber"] = username;
			var parms = new Array();
			parms.push(JSON.stringify(this.PlayerProto));
			this.currentUsername = profile.Username;
			//vwf_view.kernel.callMethod('index-vwf','newplayer',parms);
			vwf_view.kernel.createChild('index-vwf', this.currentUsername, this.PlayerProto);
			if (vwf.getProperty('index-vwf', 'owner') == null) vwf.setProperty('index-vwf', 'owner', this.currentUsername);
			var parms = new Array();
			parms.push(JSON.stringify(
			{
				sender: '*System*',
				text: (document.PlayerNumber + " logging on")
			}));
			vwf_view.kernel.callMethod('index-vwf', 'receiveChat', parms);
		}
		this.CreateNPC = function (filename)
		{
			this.PlayerProto.source = filename;
			var name = 'NPC' + Math.floor(Math.random() * 1000);
			this.PlayerProto.properties.PlayerNumber = name;
			this.PlayerProto.properties.owner = this.currentUsername;
			this.PlayerProto.properties.ownerClientID = null;
			this.PlayerProto.properties.profile = null;
			this.PlayerProto.id = "player" + name;
			var parms = new Array();
			parms.push(JSON.stringify(this.PlayerProto));
			vwf_view.kernel.callMethod('index-vwf', 'newplayer', parms);
		}
		this.PlayerDeleted = function (e)
		{
			$("#" + e + "label").remove();
		}
		this.PlayerCreated = function (e, id)
		{
			$("#PlayerList").append("<div id='" + (e + "label") + "'  class='playerlabel'>" + e + "</div>");
			$("#" + e + "label").attr("playerid", id);
			$("#" + e + "label").click(function ()
			{
				$(".playerlabel").css("background-image", ""); // -webkit-linear-gradient(right, white 0%, #D9EEEF 100%)
				$(this).css("background-image", "-webkit-linear-gradient(right, white 0%, #D9EEEF 100%)");
				var profile = vwf.getProperty($(this).attr("playerid"), 'profile');
				_UserManager.showProfile(profile);
			});
			if (e == document.PlayerNumber)
			{
				$("#" + e + "label").attr("self", "true");
				$("#" + e + "label").append(" (me)");
			}
		}
		this.Logout = function ()
		{
			//if (!_UserManager.GetCurrentUserName()) return;
			
			window.location = _DataManager.getCurrentApplication();
			return;
			
			$('#MenuLogOuticon').css('background', "#555555");
			$('#MenuLogInicon').css('background', "");
			$('#MenuLogIn').removeAttr('disabled');
			$('#MenuLogOut').attr('disabled', 'disabled');
			//var parms = new Array();
			//parms.push(document[document.PlayerNumber +'link'].id);
			//alert(JSON.stringify(parms));
			//vwf_view.kernel.callMethod('index-vwf','deleteplayer',parms);
			var parms = new Array();
			parms.push(JSON.stringify(
			{
				sender: '*System*',
				text: (document.PlayerNumber + " logging off")
			}));
			//
			//vwf_view.kernel.callMethod('index-vwf','receiveChat',parms);
			if (document[document.PlayerNumber + 'link']) vwf_view.kernel.deleteNode(document[document.PlayerNumber + 'link'].id);
			//take ownership of the client connection
			var profile = _DataManager.GetProfileForUser(_UserManager.GetCurrentUserName());
			var S = window.location.pathname;
			var data = jQuery.ajax(
			{
				type: 'GET',
				url: PersistanceServer + "/vwfDataManager.svc/logout?S=" + S + "&CID=" + vwf.moniker(),
				data: null,
				success: null,
				async: false,
				dataType: "json"
			});
			if (data.status != 200)
			{
				alert(data.responseText);
				return;
			}
			document[document.PlayerNumber + 'link'] = null;
			document.PlayerNumber = null;
			_UserManager.currentUsername = null;
		}
		this.showLogin = function ()
		{
			//new system does not do logins!
			
			
			$.ajax('/vwfDataManager.svc/logindata',
				{
					cache:false,
					success:function(data,status,xhr)
					{
						var logindata = JSON.parse(xhr.responseText);
						var username = logindata.username;
						
						if(logindata.instances.indexOf(window.location.pathname) != -1)
						{
							_Notifier.alert('You are already logged into this space from another tab, browser or computer. This session will be a guest.');
						}
						else
						{
							this.Login(username);
						}
						
					}.bind(this),
					error:function(xhr,status,err)
					{
						
						window.onbeforeunload = '';
						$(window).unbind();
						window.location = _DataManager.getCurrentApplication() + "/login?return=" + _DataManager.getCurrentSession().substr(13);
					}.bind(this)
				});
			
		}
		$(window).unload(function ()
		{
			this.Logout();
		}.bind(this));
		//$('#Players').dialog({ position:['left','bottom'],width:300,height:200,title: "Players",autoOpen:false});
		
		
		this.GetPlayernameForClientID = function(id)
		{
			for(var i in vwf.models[0].model.nodes)
			{
				var node = vwf.models[0].model.nodes[i];
				if(node.ownerClientID == id)
					return node.name;
			}
		}
		this.GetAvatarForClientID = function(id)
		{
			for(var i in vwf.models[0].model.nodes)
			{
				var node = vwf.models[0].model.nodes[i];
				if(node.ownerClientID == id)
					return node;
			}
		}
		this.GetClientIDForPlayername = function(id)
		{
			for(var i in vwf.models[0].model.nodes)
			{
				var node = vwf.models[0].model.nodes[i];
				if(node.PlayerNumber == id)
					return node.ownerClientID;
			}
		}
		
		$('#UserProfileWindow').hide();
		$('#Players').hide();
	}
});
