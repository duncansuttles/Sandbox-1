/*
 * WebRTC.js : Behaves as a wrapper for vwf/rtcObject
 * Maps simple 1:1 signal model to a broadcast model using target and sender ids
 */

define( [ "module", "vwf/view", "vwf/rtcObject" ], function( module, view, RTCObject ) {

	return view.load( module, {

		initialize : function()
		{
			// create the video window
			var width = 320, height = 240;
			this.vidFrame = document.createElement('div');
			$(this.vidFrame).append( '<video id="remote" poster="/adl/sandbox/vwf/view/webrtc/avatar.png"/>' );
			$(this.vidFrame).append( '<video id="self" poster="/adl/sandbox/vwf/view/webrtc/avatar.png" muted/>' );

			// style the video window
			//$(this.vidFrame).css('padding', '30px');
			$(this.vidFrame).find('video').css('position', 'absolute');
			$(this.vidFrame).find('video').css('border', 'solid black 1px');
			$(this.vidFrame).find('#remote').attr('width', width+'px');
			$(this.vidFrame).find('#remote').attr('height', height+'px');
			$(this.vidFrame).find('#self').attr('width', (width/4)+'px');
			$(this.vidFrame).find('#self').attr('height', (height/4)+'px');

			// create the accept/reject window
			$(this.vidFrame).append( '<div id="messagePanel"/>' );
			$(this.vidFrame).find('#messagePanel').append( '<p id="message">Incoming video call from Herpderp!</p>' );
			$(this.vidFrame).find('#messagePanel').append( '<input type="button" id="accept" value="Accept"/>' );
			$(this.vidFrame).find('#messagePanel').append( '<input type="button" id="reject" value="Reject"/>' );
			
			// style the accept/reject window
			$(this.vidFrame).find( '#messagePanel' ).css({
				'position': 'absolute',
				'width': width+2+'px',
				'height': height+2+'px',
				'background-color': '#fff',
			});

			// create the dialog box
			$(this.vidFrame).dialog({width: width+40, height: height+40, autoOpen: false});

			// create a new rtc object on view initialization
			this.rtc = new RTCObject(
				$(this.vidFrame).find('#self')[0],
				$(this.vidFrame).find('#remote')[0],
				this.send.bind(this),null
			);

			// hook the close to rtc.disconnect
			$(this.vidFrame).on('dialogclose', function(event,ui){
				this.rtc.disconnect();
				$(this.vidFrame).find('video').attr('src', '/adl/sandbox/vwf/view/webrtc/avatar.png');
				var payload = {target: this.rtcTarget, sender: _UserManager.GetCurrentUserName()};
				vwf_view.kernel.callMethod('index-vwf', 'rtcDisconnect', payload);
				this.rtcTarget = null;
			}.bind(this));

			$(this.vidFrame).find( '#messagePanel input#accept' ).button().click(function(evt)
			{
				$(this.vidFrame).find('#messagePanel').css('z-index', -1);
				this.rtc.initialize(this.mode);
			}.bind(this));

			$(this.vidFrame).find( '#messagePanel input#reject' ).button().click(function(evt)
			{
				// send rejection notice
				vwf_view.kernel.callMethod('index-vwf', 'rtcDisconnect',
					{target: this.rtcTarget, sender: _UserManager.GetCurrentUserName()}
				);
				$(this.vidFrame).dialog('close');
				this.rtcTarget = null;
			}.bind(this));
		},


		/*
		 * Receives incoming messages
		 */
		calledMethod : function(id,name,params)
		{
			if( id != 'index-vwf' )
				return;

			if( name == 'rtcCall' || name == 'rtcVideoCall' )
			{
				this.rtcTarget = params.target;
				this.mode = {'audio':true, 'video':name=='rtcVideoCall'};
				var typeWord = this.mode.video ? 'Video' : 'Voice';
				$(this.vidFrame).dialog('option', 'title', typeWord+' chat with '+this.rtcTarget);
				$(this.vidFrame).find('#messagePanel').css('z-index', -1);
				$(this.vidFrame).dialog('open');
				this.rtc.initialize(this.mode);
			}

			else if( name == 'rtcData' )
			{
				if(_UserManager.GetCurrentUserName() == params.target)
				{
					if(this.rtcTarget == null)
						this.rtcTarget = params.sender;

					if( !this.rtc.initialized )
					{
						this.mode = params.rtcData.mediaDescription;
						var typeWord = params.rtcData.mediaDescription.video ? 'Video' : 'Voice';
						$(this.vidFrame).dialog('option', 'title', typeWord+' chat with '+this.rtcTarget);
						$(this.vidFrame).find('#messagePanel').css('z-index', 1);
						$(this.vidFrame).find('#message').html('Incoming '+typeWord.toLowerCase()+' call from '+this.rtcTarget);
						$(this.vidFrame).dialog('open');
						//this.rtc.initialize( params.rtcData.mediaDescription );
					}
					else {
						this.rtc.receiveMessage(params.rtcData);
					}
				}
			}
			else if( name == 'rtcDisconnect' )
			{
				if( _UserManager.GetCurrentUserName() == params.target )
				{
					this.rtc.disconnect();
					$(this.vidFrame).dialog("close");
					$(this.vidFrame).find('video').attr('src', '/adl/sandbox/vwf/view/webrtc/avatar.png');
					this.rtcTarget = null;
				}
			}
		},
		

		// send a signal to the other clients
		send : function(data) 
		{
			var payload = {};
			payload.rtcData = data;
			payload.target = this.rtcTarget;
			payload.sender = _UserManager.GetCurrentUserName();
			vwf_view.kernel.callMethod('index-vwf', 'rtcData', payload); //send
		}
	
	})
});
