define([], function() {
    var Performance = {};
    var isInitialized = false;
    return {
        getSingleton: function() {
            if (!isInitialized) {
                initialize.call(Performance);
                isInitialized = true;
            }
            return Performance;
        }
    }
    function TimeCounter(maxSamples)
    {
    	this.samples = [];
    	this.startTime = 0;
    	this.averageTime = 0;
    	this.maxSamples = maxSamples;
    	this.startSample = function()
    	{
    		this.startTime = performance.now();

    	}
    	this.endSample = function()
    	{

    		var sampleTime = performance.now() - this.startTime;
            this.samples.unshift(sampleTime);
            if (this.samples.length > this.maxSamples)
                this.samples.pop();
            this.averageTime = 0;
            for (var i = 0; i < this.samples.length; i++)
                this.averageTime += this.samples[i];
            this.averageTime /= this.samples.length;
    	}
    }
    function QuantityCounter(maxSamples)
    {
    	this.samples = [];
    	this.currentVal = 0;
    	this.average = 0;
    	this.maxSamples = maxSamples;
    	this.startSample = function()
    	{
    		this.currentVal = 0;
    	}
    	this.addQuantity = function(val)
    	{
    		this.currentVal += val;
    	}
    	this.endSample = function()
    	{

    		var sampleTime = this.currentVal;

            this.samples.unshift(sampleTime);
            if (this.samples.length > this.maxSamples)
                this.samples.pop();
            this.average = 0;
            for (var i = 0; i < this.samples.length; i++)
                this.average += this.samples[i];
            this.average /= this.samples.length;
    	}
    }
    function initialize() {
        var FRAME_ROLLING_AVERAGE_LENGTH = 20;
        var TICK_ROLLING_AVERAGE_LENGTH = 20;
        var FPS_GOAL_NUMBER = 20;
        var TICK_TIME_THRESHOLD = 60;

        this.currentFrameStart = 0;
        this.lastTickTime = 0;
        this.frameTimes = [];
        this.frameTimeAverage = 0;
        this.tickTimes = [];
        this.tickTimeAverage = 0;
        this.FPSStart = 0;
        this.FPSTimes = [];
        this.FPSTimeAverage = 0;
        this.FPS = 0;
        this.FPSPID_I = 0;
        this.resizeCounter = 0;
        this.counters = {};

        this.counters.RenderTime = new TimeCounter(FRAME_ROLLING_AVERAGE_LENGTH);
        this.counters.FPS = new TimeCounter(FRAME_ROLLING_AVERAGE_LENGTH);
        this.counters.TickTime = new TimeCounter(TICK_ROLLING_AVERAGE_LENGTH);

        this.preFrame = function() {
            
            this.counters.RenderTime.startSample();

            //loop back around, for total time between frames
            this.counters.FPS.endSample();
            this.counters.FPS.startSample();

            this.FPS = 1000/this.counters.FPS.averageTime;
            this.resizeCounter++;
            //if the fps is low, but the ticktime is fast enough, then we should be able to go faster
            if ((this.resizeCounter > FRAME_ROLLING_AVERAGE_LENGTH && vwf.getProperty(vwf.application(),'playMode') != 'playing') ||
            	(this.resizeCounter > FRAME_ROLLING_AVERAGE_LENGTH && vwf.getProperty(vwf.application(),'playMode') == 'playing' && this.FPSTimeAverage < TICK_TIME_THRESHOLD )) {
                this.resizeCounter = 0;
                var p = FPS_GOAL_NUMBER - this.FPS;
                this.FPSPID_I += p;
                if(this.FPSPID_I < 0)
                    this.FPSPID_I = 0;
                p *= .05;
                p += this.FPSPID_I * .005;
                var newResScale = 1 + p*Math.abs(p);
                if (newResScale > 16)
                    newResScale = 16;
                if (newResScale < 1)
                    newResScale = 1;

                newResScale = (Math.floor(newResScale * 1000))/1000;
                if (_SettingsManager.settings.resolutionScale != newResScale) {
                    _SettingsManager.settings.resolutionScale = newResScale;

                    if (_SettingsManager.settings.resolutionScale == 16)
                        alertify.error('Graphics performance problem detected!')
                    this.scaleDisplayResolution();
                }
            }

        }
        this.scaleDisplayResolution = function()
        {
        	var resolutionScale = _SettingsManager.getKey('resolutionScale');


                var oldwidth = parseInt($('#index-vwf').css('width'));
                var oldheight = parseInt($('#index-vwf').css('height'));

                //if ((origWidth != self.width) || (origHeight != self.height)) {
                $('#index-vwf')[0].height = self.height / resolutionScale;
                $('#index-vwf')[0].width = self.width / resolutionScale;
                if(window._dRenderer)
                    _dRenderer.setViewport(0, 0, window.innerWidth / resolutionScale, window.innerHeight / resolutionScale)

                //note, this changes some renderer internals that need to be set, but also resizes the canvas which we don't want.
                //much of the resize code is in WindowResize.js
                if(window._dRenderer)
                    _dRenderer.setSize(parseInt($('#index-vwf').css('width')) / resolutionScale, parseInt($('#index-vwf').css('height')) / resolutionScale);
                _dView.getCamera().aspect = $('#index-vwf')[0].width / $('#index-vwf')[0].height;
                $('#index-vwf').css('height', oldheight);
                $('#index-vwf').css('width', oldwidth);
                _dView.getCamera().updateProjectionMatrix()
                _dView.windowResized();

        }
        this.postFrame = function() {
            this.counters.RenderTime.endSample();
        }
        this.ticked = function() {

        	//wrap around for full 
            this.counters.TickTime.endSample();
            this.counters.TickTime.startSample();

        }
    }
});