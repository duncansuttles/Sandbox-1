function Event(name, cb) {
    this.name = name;
    this.cb = cb;
    this.check = null;
    this.unexpectedEvent = null;
    this.timeout = null;
    this.timer = null;
    this.time = null;
}

window._Tutorial = new(function() {

    this.satProperty = function(id, prop, val) {
        this.event('satProperty', [id, prop, val]);
    }
    this.createdNode = function(parent, child) {
        this.event('createdNode', [parent, child]);
    }
    this.deletedNode = function(nodeid) {
        this.event('deletedNode', nodeid);
    }
    this.createdFire = function() {
        this.event('createdTrap');
        this.event('createdFire');
    }
    this.createdDoor = function() {
        this.event('createdTrap');
        this.event('createdDoor');
    }
    this.createdLaser = function() {
        this.event('createdTrap');
        this.event('createdLaser');
    }
    this.createdWaypoint = function() {
        this.event('createdTrap');
        this.event('createdWaypoint');
    }
    this.createdEnemy = function() {
        this.event('createdTrap');
        this.event('createdEnemy');
    }
    this.played = function() {
        this.event('played');
    }
    this.paused = function() {
        this.event('paused');
    }
    this.cleared = function() {
        this.event('cleared');
    }
    this.undid = function() {
        this.event('undid');
    }
    this.nextClicked = function() {
        this.event('next');
    }
    this.died = function()
    {
    	this.event('died');
    }
    this.won = function()
    {
        this.event('won');
    }
    this.event = function(eventname, param) {
        if (this.nextEvent && this.nextEvent.name == eventname) {
            //if the event has a check function
            if (this.nextEvent.check) {
                //run the check function. if it return true, clear the current event and go to the next
                if (this.nextEvent.check()); {
                    var e = this.nextEvent;
                    this.nextEvent = null;
                    if (e.timer) {
                        window.clearTimeout(e.timer);
                        e.timer = null;
                    }
                    e.cb();
                }
            } else {
                //if the event has no check funciton, just clear this.nextevent and call the callback
                var e = this.nextEvent;
                this.nextEvent = null;
                if (e.timer) {
                    window.clearTimeout(e.timer);
                    e.timer = null;
                }
                e.cb();
            }
        } else {
            if (this.nextEvent && this.nextEvent.unexpectedEvent)
                this.nextEvent.unexpectedEvent();
        }
    }
    //set the next condition the system is waiting for in order
    this.setNextEvent = function(event) {
        this.nextEvent = event;
        if (this.nextEvent && this.nextEvent.timeout) {
            this.nextEvent.timer = window.setTimeout(function() {
                _Tutorial.nextEvent.timeout();
                this.nextEvent.timer = null;
            }, this.nextEvent.time)
        }
    }
    this.prompt = function(title, text, img, cb) {
      
        if (img.constructor == Function){
            cb = img;
            $('.tutorialprompt img').hide();
	}
	else {
	    $('.tutorialprompt img').attr('src',img);
            $('.tutorialprompt img').show();
        }

        $('.tutorialprompt').animate({
            top: '30%',
            left: '30%'
        });
        $('.tutorialprompt').fadeIn();
        $('.tutorialprompt .header').text(title);
        $('.tutorialprompt .text').text(text);
        $('#tutorialNext').unbind('click');
        $('#tutorialNext').click(cb);
        $('.tutorialbackground').fadeIn();

    }
    this.hint = function(title, text, cb) {
        $('.tutorialprompt').animate({
            top: '80%',
            left: '59%'
        });
        $('.tutorialprompt').hide();
        $('.tutorialprompt').fadeIn();
        $('.tutorialprompt .header').text(title);
        $('.tutorialprompt .text').text(text);
        $('.tutorialprompt img').hide();
        $('#tutorialNext').unbind('click');
        $('#tutorialNext').click(cb);
        $('.tutorialbackground').fadeOut();
    }
    this.runTutorial = function() {
        $('#tutorialRoot').empty();
        $('#tutorialRoot').remove();
        $(document.body).append('<div id="tutorialRoot" />');
        $('#tutorialRoot').load('/vwfdatamanager.svc/datafile/XAPIGame/prompts.html', function() {

		var pathRoot = '/vwfdatamanager.svc/datafile/XAPIGame/';

        	$('#tutorialCancel').click(_Tutorial.cancelTutorial);
            async.series([

                function(cb) {
                	 $('#tutorialNext').text('Next');
                    _Tutorial.prompt('Welcome!', "This brief tutorial will show you how to use the game editor. When you're done, you can build you own games! If you've seen this before, or you already know what to do, click 'cancel tutorial' at any time to exit.", pathRoot+'Tutorial1.png', function(ok) {
                        _Tutorial.nextClicked();
                    });
                    _Tutorial.setNextEvent(new Event("next", cb));
                },
                function(cb) {
                    _Tutorial.hint("The Game Board", "This game board is where you'll lay out your level.", function(ok) {
                        _Tutorial.nextClicked();
                    });
                    _Tutorial.setNextEvent(new Event("next", cb));
                    $(".tutorialbackground").fadeOut();
                    $("#gameEditGUI").parent().hide();
                    
                },
                function(cb) {
                    $(".tutorialbackground").fadeIn();
                    $("#gameEditGUI").parent().show();
                     _Tutorial.hint("The Palette", "This is the palette. Each item in this palette can be dragged and dropped onto the game board.", function(ok) {
                        _Tutorial.nextClicked();
                    });
                    _Tutorial.setNextEvent(new Event("next", cb));
                    $(".tutorialbackground").fadeOut();
                    $("#gameEditGUI").parent().animate({left:"70%"},7000,function()
                        {
                            _Tutorial.nextClicked();
                        });
                    
                },
                function(cb) {
                	//possibly wait for 'trymove' VWF event here to see they actually were able to move
                	$('#gameEditGUI').parent().stop().css('left','70%');
                	$('#tutorialNext').text('Next');
                    _Tutorial.prompt("Playing the Game", "While the board is clear of obstacles, let's try out the game. Use the WASD keys to move around. Drive to the goal.", pathRoot+'Tutorial2.png', function(ok) {
                        _Tutorial.nextClicked();
                    });
                    _Tutorial.setNextEvent(new Event("next", cb));
                },
                function(cb) {
                	//maybe use the event timeout function here. Note that canceling tutorial at this point will leave this timeout 
                	_Tutorial.setNextEvent(null);
                	$("#gamePlayButton").click();
                	//$(".tutorialbackground").fadeOut();
                    //$(".tutorialprompt").fadeOut();
                    $("#gamePlayButton").click();
                    $("#tutorialNext").text("Skip");
                    _Tutorial.hint("Playing the Game", "Use the WASD keys to move around. Drive to the goal.", function(ok) {
                        vwf_view.kernel.callMethod("sphere2-vwf-d7ab6422-9b04-f46f-9247-620e3217770e","playWinSound")
                    });
                     _Tutorial.setNextEvent(new Event("won", cb));
                },
                function(cb) {
                	
                	$("#gamePlayButton").click();
                	//$(".tutorialbackground").fadeIn();
                    //$(".tutorialprompt").fadeIn();
                	$("#tutorialNext").text("Do it for me!");
                    _Tutorial.hint("Create any kind of trap", "Ok, that was too easy! Drag a trap from your palette onto the game board.", function(ok) {
                       
                       var x = 547/1920 * $(window).width();
                       var y = 834/1017 * $(window).height();
                       dropLaser({clientX:x,clientY:y})
                        //make trap for them here
                    });
                    _Tutorial.setNextEvent(new Event("createdTrap", cb));
                },
               
                function(cb) {
                	
                	$('#tutorialNext').text('Next');
                    _Tutorial.prompt('Good Job!', 'Now you see how that works? Drive your truck up to the trap and see if you can get caught.', pathRoot+'Tutorial3.png', function(ok) {
                        _Tutorial.nextClicked();
                    });
                    _Tutorial.setNextEvent(new Event("next", cb));
                },
                function(cb) {
                	
                	$("#tutorialNext").text("Skip");
                	$("#gamePlayButton").click();
                    _Tutorial.hint("Drive until you are caught!", "Use the WASD keys do drive until you're caught. Click Next below to skip.", function(ok) {
                        vwf_view.kernel.callMethod("sphere2-vwf-d7ab6422-9b04-f46f-9247-620e3217770e","Die")
                    });
                    _Tutorial.setNextEvent(new Event("died", cb));
                },
                function(cb) {
                	$('#tutorialNext').text('Next');
                    $('#gamePlayButton').click();
                    _Tutorial.prompt('Clear the board', 'You can clear the board with the clear button. This returns all the traps to the palette so you can use them again. Since you only have a limited number of traps, you must use them carefully!', function(ok) {
                        _Tutorial.nextClicked();
                    });
                    _Tutorial.setNextEvent(new Event("next", cb));
                },
                function(cb) {
                	$("#tutorialNext").text("Skip");
                    _Tutorial.hint("Clear the board", "You can clear the board with the clear button.", function(ok) {
                        $("#clearButton").click();
                    });
                    _Tutorial.setNextEvent(new Event("cleared", cb));
                },
                function(cb) {
                	$("#tutorialNext").text("Next");
                    _Tutorial.prompt("Play/Pause", "Up until this point, we've been starting the game for you. Now that you know how to play, and how to set traps yourself, you can do it on your own.", function(ok) {
                        _Tutorial.nextClicked();
                    });
                    _Tutorial.setNextEvent(new Event("next", cb));
                },
                function(cb) {
                	$("#tutorialNext").text("Skip");
                    _Tutorial.hint("Click Play", "On the palette, find the 'Play/Pause' button and click it. The game should start playing.", function(ok) {
                         $("#gamePlayButton").click();
                    });
                    _Tutorial.setNextEvent(new Event("played", cb));
                },
                function(cb) {
                    _Tutorial.hint("Click Pause", "On the palette, find the 'Play/Pause' button and click it. The game should pause.", function(ok) {
                        $("#gamePlayButton").click();
                    });
                    _Tutorial.setNextEvent(new Event("paused", cb));
                },
                function(cb) {
                	$("#tutorialNext").text("Finish");
                    _Tutorial.prompt("Build your level", "That's it! You now know how to build your game level. When you're happy with your design, just leave the page. The instructor or reference card will help you publish your world.", pathRoot+'Tutorial4.png', function(ok) {
                        _Tutorial.nextClicked();
                    });
                    _Tutorial.setNextEvent(new Event("next", cb));
                },
            ], function(err) {
                _Tutorial.cancelTutorial();
            })
        })
    }
    this.cancelTutorial = function() {
    	$('#tutorialRoot').empty();
        $('#tutorialRoot').remove();
    }


});
