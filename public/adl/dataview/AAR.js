define(['../sandbox/messageCompress', '../sandbox/vwf/view/editorview/lib/alertify.js-0.3.9/src/alertify', "/socket.io/socket.io.js"], function(messageCompress, alertify, socket) {


	function propertyRecord(nodeid, property, value, time) {
		this.nodeid = nodeid;
		this.property = property;
		this.value = value;
		this.time = time;
	}

	function createRecord(nodeid, extendsid, name, time) {
		this.nodeid = nodeid;
		this.extendsid = extendsid;
		this.property = 'exist';
		this.time = time;
	}

	function deleteRecord(nodeid, time) {
		this.nodeid = nodeid;
		this.property = 'exist';
		this.time = time;
	}

	function drawRecord(type, id, name, val, time) {
			$('#recordlist').prepend('<div class="record ' + type + '"id="recordlist' + recordedProperties.length + '"></div>');
			time *= 1000;
			time = Math.floor(time) / 1000;
			$('#recordlist' + recordedProperties.length).append('<div class="messagefield fieldaction">' + type + '</div>')
			$('#recordlist' + recordedProperties.length).append('<div class="messagefield fieldnode">' + getNodeName(id) + '</div>')
			$('#recordlist' + recordedProperties.length).append('<div class="messagefield fieldtime">' + time + '</div>')
			$('#recordlist' + recordedProperties.length).append('<div class="messagefield fieldfield">' + name + '</div>')
			$('#recordlist' + recordedProperties.length).append('<div class="messagefield fieldparam">' + val + '</div>')

			$('#recordlist' + recordedProperties.length).click(function() {
				alertify.alert($(this).attr('wholeMessage'));
			});
			$('#recordlist' + recordedProperties.length).attr('wholeMessage', JSON.stringify(val));

			if ($('.record').length > 1000)
				$('.record').last().remove();

		}
		//set the last property in each track for each ID
		//TODO:create or delete as required

	function findRecordingStart() {
		var min = Infinity;
		for (var i in recordedProperties) {
			for (var k in recordedProperties[i]) {

				var track = recordedProperties[i][k];
				if (track[0].time < min) min = track[0].time;
			}
		}
		return min;
	}

	function findRecordingEnd() {
		var max = -Infinity;
		for (var i in recordedProperties) {
			for (var k in recordedProperties[i]) {

				var track = recordedProperties[i][k];
				if (track[track.length - 1].time > max) max = track[track.length - 1].time;
			}
		}
		return max;
	}

	function setupPlaybackGUI() {


		
			
		var start = findRecordingStart();
		var end = findRecordingEnd();
		$('#playslider').slider('option', 'max', end);
		$('#playslider').slider('option', 'min', start);
		$('#playslider').slider('option', 'step', .05);
		$('#timelinestart').text(parseInt(start) + 's');
		$('#timelineend').text(parseInt(end) + 's');


		var canvas = document.getElementById('dataviz');
		canvas.width = $('#dataviz').width();
		var ctx = canvas.getContext('2d');

		ctx.fillStyle = "rgba(0,0,255,.01)";

		for (var i in recordedProperties) {
				for (var k in recordedProperties[i]) {
					if (k == 'exist') continue;
					var track = recordedProperties[i][k];
					//TODO: swap for a binary search instead of linear
					for (var j = 0; j < track.length; j++) {
						var pix = (track[j].time/(end-start)) * canvas.width;
						ctx.fillRect(pix,0,1,50)
					}
				}
			}
		ctx.fillStyle = "rgba(255,0,0,1)";	
		for(var i in stateShots)
		{
			var pix = (stateShots[i].kernel.time/(end-start)) * canvas.width;
			ctx.fillRect(pix,0,3,50)
		}
		ctx.fillStyle = "rgba(0,255,0,.05)";	
		for(var i in messageQueue)
		{
			if(messageQueue[i].action == 'tick') continue;
			var pix = (messageQueue[i].time/(end-start)) * canvas.width;
			ctx.fillRect(pix,0,1,50)
		}		

	}

	function seekToTime(time) {
		var frame = $('iframe')[0];

		var w = $('#dataviz').width();
		var start = findRecordingStart();
		var end = findRecordingEnd();
		$('#playhead').css('left','calc( ' + (((time-start)/(end-start))*w) + 'px + 1.4em )');
		

		if (recordmode == REVIEW && frame && frame.contentWindow.vwf && frame.contentWindow.vwf.moniker_) {
			for (var i in recordedProperties) {
				for (var k in recordedProperties[i]) {
					if (k == 'exist') continue;
					var track = recordedProperties[i][k];
					//TODO: swap for a binary search instead of linear
					for (var j = 1; j < track.length; j++) {
						if (track[j - 1].time <= time && track[j].time > time) {
							if (track[j - 1] instanceof propertyRecord) {
								frame.contentWindow.vwf.setProperty(track[j - 1].nodeid, track[j - 1].property, track[j - 1].value);
							}
						}
						if (track[j - 1].time > time && track[j].time > time)
							continue;
					}
				}
			}
		}
	}

	function recordEvent(event) {
		if (!recordedProperties[event.nodeid])
			recordedProperties[event.nodeid] = {};
		if (!recordedProperties[event.nodeid][event.property])
			recordedProperties[event.nodeid][event.property] = [];
		recordedProperties[event.nodeid][event.property].push(event);
	}

	function hookUpRecording() {
		if (recordmode == RECORD) {
			var frame = $('iframe')[0];
			if (frame && frame.contentWindow.vwf && frame.contentWindow.vwf_view) {

				frame.contentWindow.vwf_view.satProperty = function(id, propname, propval) {
					propval = JSON.parse(JSON.stringify(propval));
					var frame = $('iframe')[0];
					recordEvent(new propertyRecord(id, propname, propval, frame.contentWindow.vwf.time()));
					//drawRecord('satProperty', id, propname, propval, frame.contentWindow.vwf.time());
				}

				frame.contentWindow.vwf_view.createdNode = function(id, extendsid, name) {
					var frame = $('iframe')[0];
					recordEvent(new createRecord(id, extendsid, name, frame.contentWindow.vwf.time()));
					drawRecord('createdNode', id, null, null, frame.contentWindow.vwf.time());
				}

				frame.contentWindow.vwf_view.deletedNode = function(id) {
					var frame = $('iframe')[0];
					recordEvent(new deleteRecord(id, frame.contentWindow.vwf.time()));
					drawRecord('deletedNode', id, null, null, frame.contentWindow.vwf.time());
				}

			} else {
				window.setTimeout(hookUpRecording, 300);
			}
		}
	}

	var RECORD = 1;
	var REVIEW = 2;

	var allStates = null;
	var runningWorlds = null;
	var currentWorld = null;

	var nameMapping = {};
	var clientData = null;
	var socket = null;
	var stateShots = [];
	var messageQueue = [];
	var recordedProperties = [];
	var showTicks = false;
	var showPointer = false;
	var recordmode = RECORD;
	var playtimer = null;
	function getNodeName(id) {
		if (nameMapping[id]) return nameMapping[id];
		return id;
	}

	function download(filename, text) {
		var a = window.document.createElement('a');
		a.href = window.URL.createObjectURL(new Blob([text], {
			type: 'application/json'
		}));
		a.download = filename;

		// Append anchor to body.
		document.body.appendChild(a)
		a.click();

		// Remove anchor from body
		document.body.removeChild(a)
	}

	function downloadData() {
			download('run.json', JSON.stringify(messageQueue));
		}
		//ok, we are going to set the state on the blank world, now that the blank world is loaded
	function blankSceneLoaded() {
			var frame = $('iframe')[0];
			if (frame && frame.contentWindow.vwf) {
				if (frame.contentWindow.hideTools)
					frame.contentWindow.hideTools();
				frame.contentWindow.vwf.setState(stateShots[0]);
			}
		}
		//toggle between recording the world data, and playing it back
	function toggleRecordMode() {
		//toggle
		if (recordmode == RECORD) recordmode = REVIEW;
		else
			recordmode = RECORD;

		//we just reconnect if the we swtich from review to record. This will loose the current data!
		if (recordmode == RECORD) {
			loadState(currentWorld);
			hookUpRecording();
			$('#recordmodelabel span').text('Recording...')
		} else {
			//disconnect from the current world
			socket.disconnect();
			setupPlaybackGUI();
			$('#recordmodelabel span').text('Review')
				//if we want to review, we can load the blank world and populate it with out saved data.
			$('#currentWorld').remove();
			$('#previewpane').append("<iframe src='../sandbox/example_blank?nologin=true' id='currentWorld' seamless/>");

			//we have to loop to wait for the world to be loaded
			function waitForLoad() {
				var frame = $('iframe')[0];
				if (frame && frame.contentWindow.vwf && frame.contentWindow.vwf.moniker_) {
					//ok, the world is loaded, lets set the state data
					blankSceneLoaded();
				} else {
					window.setTimeout(waitForLoad, 1000);
				}
			}
			window.setTimeout(waitForLoad, 1000);


		}

	}

	function captureState(retry) {
		if (recordmode == RECORD) {
			var frame = $('iframe')[0];
			if (frame && frame.contentWindow.vwf) {
				try {
					var state = frame.contentWindow.vwf.getState();
					if (frame.contentWindow.hideTools)
						frame.contentWindow.hideTools();
					stateShots.push(state);

					$('#snapshotlist').prepend('<div class="stateshot" id="stateshot' + stateShots.length + '">State Snapshot ' + stateShots.length + '</div>');
					var i = stateShots.length;
					$('#stateshot' + i).click(function() {
						alertify.confirm("Restore State " + i, function(ok) {
							if (ok) {
								var frame = $('iframe')[0];
								if (recordmode == RECORD)
									frame.contentWindow.vwf.respond('index-vwf', 'getState', null, null, stateShots[i - 1]);
								else
									frame.contentWindow.vwf.setState(stateShots[i - 1]);
							}
						});
					});
				} catch (e) {
					if (retry)
						window.setTimeout(captureState, 1000);
				}
			} else {
				//if vwf is not loaded, try again in 1 second
				if (retry)
					window.setTimeout(captureState, 1000);
			}
		}
	}
	window.downloadData = downloadData;


	function loadState(id) {
		currentWorld = id;
		messageQueue = [];
		recordedProperties = {};
		stateShots = [];
		nameMapping = {};
		clientData = null;

		async.series([function(cb) {

				if (socket && socket.socket.connected) {
					socket.on('disconnect', function() {
						socket = null;
						window.setTimeout(function() {
							cb();
						}, 100)


					});
					socket.disconnect();

				} else {
					cb();
				}


			},
			function(cb) {

				$('#datalist').empty();
				$('#recordlist').empty();
				$('#snapshotlist').empty();
				$('#currentWorld').remove();
				$('#previewpane').append("<iframe src='../sandbox/" + id + "?nologin=true' id='currentWorld' seamless/>");
				captureState(true);
				hookUpRecording();

				socket = io.connect(window.location.protocol + window.location.host, {
					'force new connection': true
				});
				socket.on('connect', function() {
					loadStates();
					socket.emit('setNamespace', messageCompress.pack({
						space: '/adl/sandbox/' + id + '/'
					}));
				});
				socket.on('connect_failed', function() {

				});
				socket.on('message', function(message) {
					var message = message.constructor == String ? JSON.parse(messageCompress.unpack(message)) : message;
					messageQueue.push(message);
					if (message.member == 'DisplayName' && message.action == 'setProperty') {
						nameMapping[message.node] = message.parameters[0];
					}
					if (showTicks === true || message.action !== 'tick') {
						if (message.action !== 'activeResync') {
							if (!message.member || showPointer || message.member.indexOf('pointer') !== 0) {
								$('#datalist').prepend('<div class="message ' + message.action + ' ' + message.member + '"id="datalist' + messageQueue.length + '"></div>');
								message.time *= 1000;
								message.time = Math.floor(message.time) / 1000;
								$('#datalist' + messageQueue.length).append('<div class="messagefield fieldaction">' + message.action + '</div>')
								$('#datalist' + messageQueue.length).append('<div class="messagefield fieldclient">' + message.client + '</div>')
								$('#datalist' + messageQueue.length).append('<div class="messagefield fieldnode">' + getNodeName(message.node) + '</div>')
								$('#datalist' + messageQueue.length).append('<div class="messagefield fieldtime">' + message.time + '</div>')
								$('#datalist' + messageQueue.length).append('<div class="messagefield fieldfield">' + message.member + '</div>')
								if (message && message.parameters && message.parameters[0]) {
									$('#datalist' + messageQueue.length).append('<div class="messagefield fieldparam0">' + message.parameters[0] + '</div>')
								}
								$('#datalist' + messageQueue.length).click(function() {
									alertify.alert($(this).attr('wholeMessage'));
								});
								$('#datalist' + messageQueue.length).attr('wholeMessage', JSON.stringify(message));
							}
							if ($('.message').length > 1000)
								$('.message').last().remove();
						}
					}

				});
			}
		]);
	}

	function drawStateLists() {
		$('#allworlds').empty();
		$('#runningworlds').empty();
		if (allStates) {
			var allKeys = Object.keys(allStates);

			for (var i = 0; i < allKeys.length; i++) {
				if (allStates[allKeys[i]]) {
					var worldID = allKeys[i].substr(13, 16);
					$('#allworlds').append('<div class="state allstate" id="' + ToSafeID(allKeys[i]) + '_allstate"></div>')
					$('#' + ToSafeID(allKeys[i]) + '_allstate').text(allStates[allKeys[i]].title || worldID);
					$('#' + ToSafeID(allKeys[i]) + '_allstate').attr('worldID', worldID);
				}
			}
		}
		if (runningWorlds && allStates) {
			var allKeys = Object.keys(runningWorlds);
			for (var i = 0; i < allKeys.length; i++) {
				var key = allKeys[i].replace(/\//g, '_');
				if (allStates[key]) {
					var worldID = key.substr(13, 16);
					$('#runningworlds').append('<div class="state runningstate" id="' + ToSafeID(key) + '_runningstate"></div>')
					$('#' + ToSafeID(key) + '_runningstate').text(allStates[key].title || worldID);
					$('#' + ToSafeID(key) + '_runningstate').attr('worldID', worldID);
					if (worldID == currentWorld) {
						$('#' + ToSafeID(key) + '_runningstate').css('background', 'red');
					}
				}
			}
		}
		$('.state').each(function(i, elem) {
			$(elem).click(function() {
				var worldID = $(this).attr('worldID');

				alertify.confirm('Load or join world ' + worldID + "?", function(ok) {
					if (ok) {
						loadState(worldID);
					}
				})
			})
		});
	}

	function loadStates() {
		$.getJSON('./vwfdatamanager.svc/states', function(data) {
			allStates = data;
			drawStateLists();
		});

		$.getJSON('./admin/instances', function(data) {

			runningWorlds = data;
			drawStateLists();
		});
	}

	function init() {
		RECORD = 1;
		REVIEW = 2;

		allStates = null;
		runningWorlds = null;
		currentWorld = null;

		nameMapping = {};
		clientData = null;
		socket = null;
		stateShots = [];
		messageQueue = [];
		recordedProperties = [];
		showTicks = false;
		showPointer = false;
		recordmode = RECORD;


		loadStates();
		$("#showticks").toggles();

		$("#tabs").tabs();

		$( "#tabs" ).on( "tabsactivate", function( event, ui ) {
			if(ui.newPanel[0].id == 'tabs4')
			{
				setupPlaybackGUI();
			}

		} );

		$("#showinput").toggles();

		$("#recordmode").toggles({
			on: false,
			text: {
				on: 'Record',
				off: 'Review'
			},
			type: 'select'
		});
		$("#recordmode").data('toggles').toggle();

		$("#exportdata").click(downloadData);
		$("#recordmode").on('toggle', toggleRecordMode);
		$("#showinput").on('toggle', function(e, active) {
			showPointer = active;
		});
		$("#showticks").on('toggle', function(e, active) {
			showTicks = active;
		});
		$("#capturestate").click(function() {
			captureState(true);
		});
		$("#playslider").slider();
		$("#playslider").on('slide', function(e, ui) {
			seekToTime(ui.value);


		});
		$("#playbutton").button();
		$("#pausebutton").button();

		$("#playbutton").click(function() {
			playtimer = window.setInterval(function()
			{
				
				var currentTime = $("#playslider").slider('option','value');
				currentTime += .05;
				$("#playslider").slider('option','value',currentTime);
				seekToTime(currentTime);
			},50)
		});
		$("#pausebutton").click(function() {
				window.clearInterval(playtimer);
		});
		window.setInterval(loadStates, 10000);
		window.setInterval(captureState, 10000);
	}

	//return this as the module to require.js
	return {
		init: init,
		seekToTime: seekToTime,
		getRecording: function() {
			return recordedProperties;
		}
	}

})