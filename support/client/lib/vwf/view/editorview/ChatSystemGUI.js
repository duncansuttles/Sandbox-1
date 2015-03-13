define({
	initialize: function() {
		$(document.body).append('<div id="ChatWindow" >' + '<div id="ChatBodyInner" class="text ui-widget-content ui-corner-all" >' + '	<div id="ChatLog" >' + '	</div>' + '</div>' + '<input type="text" name="ChatInput" id="ChatInput" class="text ui-widget-content ui-corner-all"/>		' + '</div>');

		$('#ChatBodyInner').on('mousewheel', function(e) {
			if (e.deltaY > 0)
				$('#ChatBodyInner').scrollTop($('#ChatBodyInner').scrollTop() - 20)
			if (e.deltaY < 0)
				$('#ChatBodyInner').scrollTop($('#ChatBodyInner').scrollTop() + 20)
		});

		function SendChatMessage() {
			if (document.PlayerNumber == null) {
				_Notifier.notify('You must log in to participate');
				return;
			}
			var parms = new Array();
			parms.push(JSON.stringify({
				sender: vwf.moniker(),
				text: $('#ChatInput').val()
			}));
			vwf_view.kernel.callMethod('index-vwf', 'receiveChat', parms);
			$('#ChatInput').val('');
		}

		function SendPM(text, receiver) {
			if (document.PlayerNumber == null) {
				_Notifier.notify('You must log in to participate');
				return;
			}
			var parms = new Array();
			parms.push(JSON.stringify({
				sender: vwf.moniker(),
				text: text,
				receiver: receiver
			}));
			vwf_view.kernel.callMethod('index-vwf', 'PM', parms);
		}


		function setupPmWindow(e) {
			if (!e) {
				alertify.log('Chat with anonymous users is not currently supported')
				return;
			}
			var s = e;
			e = ToSafeID(e);
			var displayName = vwf.getProperty(vwf.application(), 'clients')[s].name;
			if ($('#PM' + e).length == 1) {
				$('#PM' + e).dialog("open");
			} else {
				$(document.body).prepend("<div id='" + 'PM' + e + "' class='PrivateMessageWindow'/>");
				$('#PM' + e).dialog({
					show: {
						effect: "fade",
						duration: 300
					},
					hide: {
						effect: "fade",
						duration: 300
					},
					title: "Chat with " + displayName,
					autoOpen: true,
					height: 180
				});
				$('#PM' + e).attr('receiver', s);
				var setup =
					'<div class="text ui-widget-content ui-corner-all PrivateMessageWindowText">' +
					'	<div class="PrivateMessageTable" id="ChatLog' + e + '">' +
					'	</div>' +
					'</div>' +
					'<input type="text" name="ChatInput" id="ChatInput' + e + '" class="text ui-widget-content ui-corner-all" ' +
					'/>';



				$('#PM' + e).append(setup);

				$('#PM' + e + ' .PrivateMessageWindowText').on('mousewheel', function(je) {
					if (je.deltaY > 0)
						$(this).scrollTop($(this).scrollTop() - 20)
					if (je.deltaY < 0)
						$(this).scrollTop($(this).scrollTop() + 20)
				});

				$('#ChatInput' + e).attr('receiver', s);
				$('#ChatInput' + e).keypress(function(e) {
					var text = $(this).val();
					var rec = $(this).attr('receiver');
					var key;
					if (window.event) key = window.event.keyCode; //IE
					else key = e.which; //firefox
					if (key == 13) {
						SendPM(text, rec);
						$(this).val('');
					}
					//e.preventDefault();
					e.stopImmediatePropagation();
				});
				$('#ChatInput' + e).keydown(function(e) {
					e.stopImmediatePropagation();
				});
				$('#ChatInput' + e).keyup(function(e) {
					e.stopImmediatePropagation();
				});
				$('#ChatInput' + e).change(function(e) {
					e.stopImmediatePropagation();
				});

				// set up the dialog buttons
				$('#PM' + e).dialog('option', 'buttons', {
					'Close': function(evt, ui) {
						$(this).dialog('close');
					},
					'Video Call': function(evt, ui) {
						vwf.callMethod('index-vwf', 'rtcVideoCall', {
							'target': $('#ChatInput' + e).attr('receiver')
						});
					},
					'Call': function(evt, ui) {
						vwf.callMethod('index-vwf', 'rtcCall', {
							'target': $('#ChatInput' + e).attr('receiver')
						});
					},
					'Send': function(evt, ui) {
						var input = $('#ChatInput' + e);
						var text = input.val();
						var rec = input.attr('receiver');
						SendPM(text, rec);
						input.val('');
					}
				});
			}
		}

		function replaceURLWithHTMLLinks(text) {
			var exp = /((\b(https?|ftp|file):\/\/)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
			return text.replace(exp, "<a href='$1' target='_blank'>$1</a>");
		}

		function PMReceived(e) {
			//vwf.callMethod('index-vwf', 'playSound', ['./sounds/ChatDing.wav'])
			e = JSON.parse(e);
			var displayNameSender = vwf.getProperty(vwf.application(), 'clients')[e.sender].name;;
			var displayNameReceiver = vwf.getProperty(vwf.application(), 'clients')[e.receiver].name;;
			if (e.sender != vwf.moniker() && e.receiver != vwf.moniker()) return;
			if (e.sender != vwf.moniker() && e.receiver == vwf.moniker()) setupPmWindow(e.sender);
			var color = 'darkred';
			if (e.sender == vwf.moniker()) color = 'darkblue';

			var text = replaceURLWithHTMLLinks(e.text);

			if (e.sender != vwf.moniker()) $('#ChatLog' + ToSafeID(e.sender)).append('<div class="ChatFromOther"><div class="ChatFromOtherLabel">' + displayNameSender + '</div><div class="ChatFromOtherText">' + text + '</div></div>');
			else $('#ChatLog' + ToSafeID(e.receiver)).append('<div class="ChatFromMe"><div class="ChatFromMeLabel">' + displayNameSender + '</div><div class="ChatFromMeText">' + text + '</div></div>');

			$('#ChatLog' + ToSafeID(e.receiver)).parent().animate({
				scrollTop: $('#ChatLog' + ToSafeID(e.receiver)).height()
			}, "slow");
			$('#ChatLog' + ToSafeID(e.sender)).parent().animate({
				scrollTop: $('#ChatLog' + ToSafeID(e.sender)).height()
			}, "slow");

			if (e.sender == vwf.moniker())
				$('#ChatLog' + ToSafeID(e.receiver)).children().last().hide().show('fade', {
					direction: 'right'
				});
			else
				$('#ChatLog' + ToSafeID(e.sender)).children().last().hide().show('fade', {
					direction: 'left'
				});

		}

		function ChatMessageReceived(e) {
			vwf.callMethod('index-vwf', 'playSound', ['./sounds/ChatDing.wav'])
			var message = JSON.parse(e);
			var color = 'darkred';
			var displayNameSender = vwf.getProperty(vwf.application(), 'clients')[message.sender].name;;
			var text = replaceURLWithHTMLLinks(message.text);

			if (message.sender == vwf.moniker())
				$('#ChatLog').append('<div class="ChatFromMe"><div class="ChatFromMeLabel">' + displayNameSender + '</div><div class="ChatFromMeText">' + text + '</div></div>');
			else
				$('#ChatLog').append('<div class="ChatFromOther"><div class="ChatFromOtherLabel">' + displayNameSender + '</div><div class="ChatFromOtherText">' + text + '</div></div>');
			_Notifier.notify(displayNameSender + ": " + message.text);
			$('#ChatLog').parent().animate({
				scrollTop: $('#ChatLog').height()
			}, "slow");

			if (message.sender == vwf.moniker())
				$('#ChatLog').children().last().hide().show('fade', {
					direction: 'right'
				});
			else
				$('#ChatLog').children().last().hide().show('fade', {
					direction: 'left'
				});
		}

		function disableEnterKey(e) {
			var key;
			if (window.event) key = window.event.keyCode; //IE
			else key = e.which; //firefox
			if (key == 13) return false;
			else return true;
		}
		$('#ChatInput').keyup(ChatKeypress);

		function ChatKeypress(e) {
			var key;
			if (window.event) key = window.event.keyCode; //IE
			else key = e.which; //firefox
			if (key == 13) {
				SendChatMessage();
				return false;
			}
			return true;
		}

		function PMKeypress(event, to) {
			var key;
			if (window.event) key = window.event.keyCode; //IE
			else key = e.which; //firefox
			if (key == 13) {
				SendPMMessage('test', to);
				return false;
			}
			return true;
		}
		$('#ChatWindow').dialog({
			position: ['left', 'top'],
			width: 300,
			height: 400,
			title: "Chat Window",
			buttons: {
				"Close": function() {
					$(this).dialog("close");
				},
				"Send": function() {
					SendChatMessage();
				}
			},
			show: {
				effect: "fade",
				duration: 300
			},
			hide: {
				effect: "fade",
				duration: 300
			},
			autoOpen: false
		});

		window.SendChatMessage = SendChatMessage;
		window.ChatMessageReceived = ChatMessageReceived;
		window.PMReceived = PMReceived;
		window.SendPM = SendPM;
		window.ToSafeID = ToSafeID;
		window.setupPmWindow = setupPmWindow;
	}
});