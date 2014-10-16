/*
 * WebRTC.js : Behaves as a wrapper for vwf/view/rtcObject
 * Maps simple 1:1 signal model to a broadcast model using target and sender ids
 */

define(["module", "vwf/view", "vwf/view/rtcObject"], function(module, view, RTCObject) {

	return view.load(module, {

		initialize: function() {
			this.rtc = {};
		},

		createVidFrame: function(otherClientID) {
			var originalID = otherClientID;
			otherClientID = ToSafeID(otherClientID);
			var html =
				'<div id="vidFrame' + otherClientID + '">' +
				'   <style>@font-face {font-family: "Glyphicons"; src: url(' + window.appPath + 'fonts/glyphicons-halflings-regular.ttf) format("truetype");}</style>' +
				'	<div id="vidPanel" style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;">' +
				'		<video id="remote" width="320" height="240" ' +
				'			style="position: absolute;width:100%;height:100%" ' +
				'			poster="' + window.appPath + 'vwf/view/webrtc/avatar.png"/>' +
				'		<video id="self" width="80" height="60" ' +
				'			style="position: absolute;" ' +
				'			poster="' + window.appPath + 'vwf/view/webrtc/avatar.png" muted/>' +
				'		<input id="chatButton" type="button" value="Send Message" ' +
				'			style="position: absolute; right: 0px;"/>' +
				'		<span id="videoClose" class="ui-button-icon-primary ui-icon ui-icon-closethick" type="button" value="X" ' +
				'			style="position: absolute; left: 0px; bottom:0px"/>' +
				'		<span id="connectionStatus" style="font-family: \'Glyphicons\', arial; font-size: 18pt; position: absolute; right: 5px; bottom: 5px;">\uE182\uE091</span>' +
				'	</div>' +
				//'	<div id="buttonPanel">'+
				//'	</div>'+
				'	<img id="permission-reminder" src="../vwf/view/editorview/images/up-arrow.png"' +
				'		style="width: 60px; height: 180px; position: fixed; top: 0px; left: 150px; display: none;"/>' +
				'</div>';
			$(document.body).prepend(html);

			// create the dialog box
			//	$('#vidFrame').dialog({width: 360, height: 280, autoOpen: false, resizable: true, dialogClass: 'visible-overflow'});
			$('.visible-overflow').css('overflow', 'visible');



			// hook the close to rtc.disconnect
			$('#vidFrame' + otherClientID + ' #videoClose').on('click', function(event, ui) {

				$('#vidFrame' + otherClientID).hide();
				this.rtc[originalID].disconnect();
				$('#vidFrame' + otherClientID + ' video').attr('src', window.appPath + 'vwf/view/webrtc/avatar.png');
				var payload = {
					target: this.rtc[originalID].rtcTarget,
					sender: vwf.moniker()
				};
				vwf_view.kernel.callMethod('index-vwf', 'rtcDisconnect', payload);
				this.rtc[originalID].rtcTarget = null;
				
				console.log('Panel closed, initialized =', this.rtc[originalID].initialized);
				$('#vidFrame' + otherClientID).remove();
				delete this.rtc[originalID];
			}.bind(this));

			// hook up the accept and reject buttons
			$('#vidFrame' + otherClientID + ' #messagePanel input#accept').button().click(function(evt) {

			}.bind(this));

			$('#vidFrame' + otherClientID + ' #messagePanel input#reject').button().click(function(evt) {
				console.log('Call rejected');
				//$('#vidFrame').dialog('close');
			}.bind(this));

			// hook up the PM button
			$('#vidFrame' + otherClientID + ' #chatButton').button().click(function(evt) {
				setupPmWindow(this.rtc[originalID].rtcTarget);
			}.bind(this));

			// hook up the resize handler
			$('#vidFrame' + otherClientID).on('resize', function(evt, ui) {
				// calc new dimensions
				/*		var ratio = 4/3;
				var ratioSize = {};
				if( (ui.size.width-40)*(1+1/ratio) < (ui.size.height-40)*(1+ratio) ){
					ratioSize.width = ui.size.width-40;
					ratioSize.height = (ui.size.width-40)*(1/ratio);
				}
				else {
					ratioSize.width = (ui.size.height-40)*ratio;
					ratioSize.height = ui.size.height-40;
				}

				// set the dimensions of window frames
				//$('#vidFrame > div').css(ratioSize)
				$('#vidFrame > #vidPanel > video#remote').css(ratioSize);
				$('#vidFrame > #vidPanel > video#self').css({width: ratioSize.width/4, height: ratioSize.height/4});
				//$('#vidFrame > #vidPanel > input#chatButton').css({left: ratioSize.width - $('#vidFrame #chatButton').width() - 30});
				*/
			});

			$('#vidFrame' + otherClientID).css('width', 341);
			$('#vidFrame' + otherClientID).css('height', 260);
			$('#vidFrame' + otherClientID).css('z-index', 1000000000);
			$('#vidFrame' + otherClientID).css('position', "absolute");
			$('#vidFrame' + otherClientID).css('background-color', "white");
			$('#vidFrame' + otherClientID).css('border', "1px solid grey");
			$('#vidFrame' + otherClientID).resizable({
				aspectRatio: 4 / 3,
				maxHeight: 800,
				maxWidth: 600,
				minHeight: 120,
				minWidth: 90
			});
			$('#vidFrame' + otherClientID).draggable();
			$('#vidFrame' + otherClientID).hide();

		},
		/*
		 * Receives incoming messages
		 */
		calledMethod: function(id, name, params) {

			if (id != 'index-vwf')
				return;

			if (name == 'rtcCall' || name == 'rtcVideoCall') {

				if(this.rtc[params.target])
				{
					console.log("RTC: already connected to this client");
					return;
				}
				this.createVidFrame(params.target);
				$('#vidFrame' + ToSafeID(params.target)).show();
				// create a new rtc object on view initialization
				this.rtc[params.target] = new RTCObject(
					$('#vidFrame'+ToSafeID(params.target)+' video#self')[0],
					$('#vidFrame'+ToSafeID(params.target)+' video#remote')[0],
					this.send, null
				);

				this.rtc[params.target].rtcTarget = params.target;
				this.rtc[params.target].mode = {
					'audio': true,
					'video': name == 'rtcVideoCall'
				};
				var typeWord = this.rtc[params.target].mode.video ? 'Video' : 'Voice';
				//	$('#vidFrame').dialog('option', 'title', typeWord+' chat with '+this.rtcTarget);
				$('#vidFrame #messagePanel').css('z-index', -1);
				//	$('#vidFrame').dialog('open');
				

				this.rtc[params.target].initialize(this.rtc[params.target].mode);
			} else if (name == 'rtcData') {

				if (vwf.moniker() == params.target) {
					//if (this.rtcTarget == null)
					//	this.rtcTarget = params.sender;

					if (!this.rtc[params.sender]) {

						console.log('Unexpected RTC call, prompting to accept');
						var clients = vwf.getProperty(vwf.application(), 'clients');
						alertify.confirm(clients[params.sender].name + ' would like to call you. Accept?', function(ok) {

							if (ok) {

								
								console.log('Call accepted');
								$('#vidFrame #messagePanel').css('z-index', -1);
								this.createVidFrame(params.sender);
								this.rtc[params.sender] = new RTCObject(
									$('#vidFrame'+ToSafeID(params.sender)+' video#self')[0],
									$('#vidFrame'+ToSafeID(params.sender)+' video#remote')[0],
									this.send, null
								);
								this.rtc[params.sender].rtcTarget = params.sender;

								
								this.rtc[params.sender].mode = params.rtcData.mediaDescription;
								var typeWord = params.rtcData.mediaDescription.video ? 'Video' : 'Voice';
								//	$('#vidFrame').dialog('option', 'title', typeWord+' chat with '+this.rtcTarget);
								$('#vidFrame #messagePanel').css('z-index', 1);
								//	$('#vidFrame #message').html('Incoming '+typeWord.toLowerCase()+' call from '+this.rtcTarget);
								//	$('#vidFrame').dialog('open');

								
								this.rtc[params.sender].initialize(this.rtc[params.sender].mode);
								
								$('#vidFrame' + ToSafeID(params.sender)).show();
							} else {
								console.log('Call rejected');
								$('#videoClose').click();
							}

						}.bind(this));

						//this.rtc.initialize( params.rtcData.mediaDescription );
					} else {
						this.rtc[params.sender].receiveMessage(params.rtcData);
					}
				}
			} else if (name == 'rtcDisconnect') {
				if (vwf.moniker() == params.target) {
					console.log('Remote disconnect, clean up');
					//	$('#vidFrame').dialog("close");
					$('#vidFrame' + ToSafeID(params.sender)).hide();
					$('#vidFrame'+ ToSafeID(params.sender)+' video').attr('src', window.appPath + 'vwf/view/webrtc/avatar.png');
					$('#vidFrame' + ToSafeID(params.sender)).remove();
					delete this.rtc[params.sender];
				}
			}
		},


		// send a signal to the other clients
		send: function(data) {
			var payload = {};
			payload.rtcData = data;
			payload.target = this.rtcTarget;
			payload.sender = vwf.moniker();
			vwf_view.kernel.callMethod('index-vwf', 'rtcData', payload); //send
		}

	})
});