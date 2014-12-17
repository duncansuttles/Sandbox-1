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

    function initialize() {
        var FRAME_ROLLING_AVERAGE_LENGTH = 20;
        var TICK_ROLLING_AVERAGE_LENGTH = 20;
        var FPS_GOAL_NUMBER = 30;
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
        this.preFrame = function() {
            this.currentFrameStart = performance.now();

            var FPSTime = performance.now() - this.FPSStart;
            this.FPSTimes.unshift(FPSTime);
            if (this.FPSTimes.length > FRAME_ROLLING_AVERAGE_LENGTH)
                this.FPSTimes.pop();
            this.FPSTimeAverage = 0;
            for (var i = 0; i < this.FPSTimes.length; i++)
                this.FPSTimeAverage += this.FPSTimes[i];
            this.FPSTimeAverage /= this.FPSTimes.length;
            this.FPSStart = performance.now();
            this.FPS = 1000 / this.FPSTimeAverage;


            this.resizeCounter++;
            //if the fps is low, but the ticktime is fast enough, then we should be able to go faster
            if (this.resizeCounter > FRAME_ROLLING_AVERAGE_LENGTH) {
                this.resizeCounter = 0;
                var p = FPS_GOAL_NUMBER - this.FPS;
                this.FPSPID_I += p;

                p *= .05;
                p += this.FPSPID_I * .005;
                var newResScale = 1 + p;
                if (newResScale > 16)
                    newResScale = 16;
                if (newResScale < 1)
                    newResScale = 1;

                if (_SettingsManager.settings.resolutionScale != newResScale) {
                    _SettingsManager.settings.resolutionScale = newResScale;

                    if (_SettingsManager.settings.resolutionScale == 16)
                        alertify.error('Graphics performance problem detected!')
                    $(window).resize();
                }
            }

        }
        this.postFrame = function() {
            var frameTime = performance.now() - this.currentFrameStart;
            this.frameTimes.unshift(frameTime);
            if (this.frameTimes.length > FRAME_ROLLING_AVERAGE_LENGTH)
                this.frameTimes.pop();
            this.frameTimeAverage = 0;
            for (var i = 0; i < this.frameTimes.length; i++)
                this.frameTimeAverage += this.frameTimes[i];
            this.frameTimeAverage /= this.frameTimes.length;
        }
        this.ticked = function() {

            var tickTime = performance.now() - this.lastTickTime;
            this.lastTickTime = performance.now();
            this.tickTimes.unshift(tickTime);
            if (this.tickTimes.length > TICK_ROLLING_AVERAGE_LENGTH)
                this.tickTimes.pop();
            this.tickTimeAverage = 0;
            for (var i = 0; i < this.tickTimes.length; i++)
                this.tickTimeAverage += this.tickTimes[i];
            this.tickTimeAverage /= this.tickTimes.length;

        }
    }
});