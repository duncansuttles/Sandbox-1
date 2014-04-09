define(function ()
{
    var SettingsManager = {};
    var isInitialized = false;
    return {
        getSingleton: function ()
        {
            if (!isInitialized)
            {
                initialize.call(SettingsManager);
                isInitialized = true;
                window._SettingsManager = SettingsManager;
            }
            return SettingsManager;
        }
    }
    function initialize()
    {
       
        this.defaults = {
            shadows:true,
            useSimpleMaterials:false,
            resolutionScale: 1,
            filtering:true
        }
        this.getKey = function(key)
        {
            if(this.settings[key] === undefined)
                return this.defaults[key];
            return this.settings[key];
        }
        this.setKey = function(key,value)
        {
            this.settings[key] = value;
            this.save();
        }
        this.save = function()
        {
            window.localStorage['sandboxPreferences'] = JSON.stringify(this.settings);
        }
        this.load = function()
        {
            if(window.localStorage['sandboxPreferences'])
                this.settings = JSON.parse(window.localStorage['sandboxPreferences']);
            else
                this.settings = JSON.parse(JSON.stringify(this.defaults));
        }
        this.load();
    }
});
