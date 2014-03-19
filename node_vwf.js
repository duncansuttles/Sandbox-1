global.version = 1;
var libpath = require('path'),
http = require("http"),
fs = require('fs'),
url = require("url"),
mime = require('mime'),
YAML = require('js-yaml'),
SandboxAPI = require('./sandboxAPI'),
Shell = require('./ShellInterface'),
DAL = require('./DAL').DAL,
express = require('express'),
app = express(),
Landing = require('./landingRoutes');
var zlib = require('zlib');
var requirejs = require('requirejs');
var compressor = require('node-minify');
var async = require('async');
var exec=require('child_process').exec;

var FileCache = new (require("./filecache.js")._FileCache)();
global.FileCache = FileCache;

var reflector = require("./reflector.js");
var appserver = require("./appserver.js");
var ServerFeatures = require("./serverFeatures.js");


//localization
var i18n = require("i18next");
var option = {
        //lng: 'en',
        resGetPath: (__dirname+'/locales/__lng__/__ns__.json'),
        //debug: true
      };
i18n.init(option);


var errorlog = null;
global.error = function()
{
    var red, brown, reset;
                    red   = '\u001b[31m';
                    brown  = '\u001b[33m';
                    reset = '\u001b[0m';
                    
    var args = Array.prototype.slice.call(arguments);
    if(errorlog)
    errorlog.write(args[0]+'\n');
    args[0] = red + args[0] + reset;
    var level = args.splice(args.length-1)[0];
    
    if(!isNaN(parseInt(level)))
    {
        level = parseInt(level);
    }
    else
    {
        args.push(level)
        level = 1;
    };
    
    
    if(level <= global.logLevel){
        //console.log.apply(this,args);
		var clear = '\u001b[2K', reset = '\u001b[1G'
		var testLine = clear+reset+ args.join(' ') +'\n> ' + global.inbuffer;
		process.stdout.write(testLine);
	}
}

global.log = function()
{
    var args = Array.prototype.slice.call(arguments);
    var level = args.splice(args.length-1)[0];
    
    if(!isNaN(parseInt(level)))
    {
        level = parseInt(level);
    }
    else
    {
        args.push(level)
        level = 1;
    };
    
    if(level <= global.logLevel){
        //console.log.apply(this,args);
		var clear = '\u001b[2K', reset = '\u001b[1G'
		var testLine = clear+reset+ args.join(' ') +'\n> ' + global.inbuffer;
		process.stdout.write(testLine);
	}
}

		
//Start the VWF HTTP server
function startVWF(){
	
	global.activeinstances = [];

	
	var red, brown, reset;
					red   = '\u001b[31m';
					brown  = '\u001b[33m';
					reset = '\u001b[0m';
					
	var configSettings;
	
	//start the DAL, load configuration file
	try{
		configSettings = JSON.parse(fs.readFileSync('./config.json').toString());
		SandboxAPI.setAnalytics(configSettings.analytics);
	}
	
	catch(e){
		configSettings = {};
		global.log("Error: Unable to load config file");
		global.log(e.message);
	}
	
	//save configuration into global scope so other modules can use.
	global.configuration = configSettings;
	var p = process.argv.indexOf('-p'), port = 0, datapath = "";
	
	//This is a bit ugly, but it does beat putting a ton of if/else statements everywhere
	port = p >= 0 ? parseInt(process.argv[p+1]) : (configSettings.port ? configSettings.port : 3000);
	
	p = process.argv.indexOf('-d');
	datapath = p >= 0 ? process.argv[p+1] : (configSettings.datapath ? libpath.normalize(configSettings.datapath) : libpath.join(__dirname, "data"));
	global.datapath = datapath;	


	p = process.argv.indexOf('-ls');
	global.latencySim = p >= 0 ? parseInt(process.argv[p+1]) : (configSettings.latencySim ? configSettings.latencySim : 0);
	
	if(global.latencySim > 0) 
		global.log(red+'Latency Sim = ' +  global.latencySim+reset);	
	
	p = process.argv.indexOf('-l');
	global.logLevel = p >= 0 ? process.argv[p+1] : (configSettings.logLevel ? configSettings.logLevel : 1);
	global.log(brown+'LogLevel = ' +  global.logLevel+reset,0);	
	
	var adminUID = 'admin';
	
	p = process.argv.indexOf('-a');
	adminUID = p >= 0 ? process.argv[p+1] : (configSettings.admin ? configSettings.admin : adminUID);	
	
	FileCache.enabled = process.argv.indexOf('-nocache') >= 0 ? false : !configSettings.noCache;
	if(!FileCache.enabled)
	{
	   global.log('server cache disabled');
	}
	
	FileCache.minify = process.argv.indexOf('-min') >= 0 ? true : !!configSettings.minify;
	var compile = process.argv.indexOf('-compile') >= 0 ? true  : !!configSettings.compile;
	if(compile)
	{
		global.log('Starting compilation process...');
	}
	
	var versioning = process.argv.indexOf('-cc') >= 0 ? true : !!configSettings.useVersioning;
	if(versioning)
	{
		global.version = configSettings.version ? configSettings.version : global.version;
		global.log(brown + 'Versioning is on. Version is ' + global.version + reset);
	}else
	{
		global.log(brown+'Versioning is off.'+reset);
		delete global.version;
	}	
	

	//global error handler
	process.on('uncaughtException', function(err) {
    // handle the error safely
    	global.error(err);
	});
	
    //***node, uses REGEX, escape properly!
	function strEndsWith(str, suffix) {
	    return str.match(suffix+"$")==suffix;
	}


	//Boot up sequence. May call immediately, or after build step	
	function StartUp()
	{
		
		SandboxAPI.setDataPath(datapath);
		errorlog = fs.createWriteStream(SandboxAPI.getDataPath()+'//Logs/errors_'+(((new Date()).toString())).replace(/[^0-9A-Za-z]/g,'_'), {'flags': 'a'});
		
		
		Landing.setDocumentation(configSettings);
		


		DAL.startup(function(){
			
			
			global.adminUID = adminUID;
			
			//var srv = http.createServer(OnRequest).listen(port);
			
			app.set('layout', 'layout');
			app.set('views', __dirname + '/public/adl/sandbox/views');
			app.set('view engine', 'html');
			app.engine('.html', require('hogan-express'));
			
			
			app.use(
			    function(req,res,next){
					if(strEndsWith(req.url,'/adl/sandbox'))
						res.redirect('/adl/sandbox/');
					else next();	
				}
			);

			//This first handler in the pipeline deal with the version numbers
			// we append a version to the front if every request to keep the clients fresh
			// otherwise, a user would have to know to refresh the cache every time we release
			app.use(ServerFeatures.versioning);
			
			

			//find pretty world URL's, and redirect to the non-pretty url for the world
			app.use(ServerFeatures.prettyWorldURL);
			
			app.use(express.methodOverride());
			
			//Wait until all data is loaded before continuing
			app.use (ServerFeatures.waitForAllBody);
			//CORS support
			app.use(ServerFeatures.CORSSupport);

			//i18n support
			app.use(express.cookieParser());
    		app.use(i18n.handle);

			app.use(app.router);

			
			app.get('/adl/sandbox/:page([a-zA-Z\\0-9\?/]*)', Landing.redirectPasswordEmail);
			app.get('/adl/sandbox', Landing.redirectPasswordEmail);
			
			app.get('/adl/sandbox/help', Landing.help);
			app.get('/adl/sandbox/help/:page([a-zA-Z]+)', Landing.help);
			app.get('/adl/sandbox/world/:page([a-zA-Z0-9]+)', Landing.world);
			app.get('/adl/sandbox/searchResults/:term([a-zA-Z0-9%]+)/:page([0-9]+)', Landing.searchResults);
			app.get('/adl/sandbox/newWorlds', Landing.newWorlds);
			app.get('/adl/sandbox/allWorlds/:page([0-9]+)', Landing.allWorlds);
			app.get('/adl/sandbox/myWorlds/:page([0-9]+)', Landing.myWorlds);
			app.get('/adl/sandbox/featuredWorlds/:page([0-9]+)', Landing.featuredWorlds);
			app.get('/adl/sandbox', Landing.generalHandler);
			app.get('/adl/sandbox/:page([a-zA-Z/]+)', Landing.generalHandler);
			app.get('/adl/sandbox/stats', Landing.statsHandler);
			app.get('/adl/sandbox/createNew/:page([0-9/]+)', Landing.createNew);		
			app.get('/adl/sandbox/createNew2/:template([a-zA-Z0-9/]+)', Landing.createNew2);		
			
			app.post('/adl/sandbox/admin/:page([a-zA-Z]+)', Landing.handlePostRequest);
			app.post('/adl/sandbox/data/:action([a-zA-Z_]+)', Landing.handlePostRequest);
			
			//The file handleing logic for vwf engine files
			app.use(appserver.handleRequest); 
			var listen = app.listen(port);
			
			global.log(brown+'Admin is "' + global.adminUID+"\""+reset,0);
			global.log(brown+'Serving on port ' + port+reset,0);
			global.log(brown+'minify is ' + FileCache.minify+reset,0);


			//if we got this far, then it's 404
			app.use(
			   Landing._404
			);

			Shell.StartShellInterface();  
			reflector.startup(listen);
			
		});
	} //end StartUp
	//Use Require JS to optimize and the main application file.
	if(compile)
	{
		var config = {
		    baseUrl: './support/client/lib',
		    name:'load',
		    out:'./build/load.js'
		};
		
		//This will concatenate almost 50 of the project JS files, and serve one file in it's place
		requirejs.optimize(config, function (buildResponse) {
		
			global.log('RequrieJS Build complete');
			global.log(buildResponse);
			async.series([
			function(cb3)
			{
				
				global.log('Closure Build start');
				//lets do the most agressive compile possible here!
				if(false && fs.existsSync("./build/compiler.jar"))
				{

					var c1 = exec('java -jar compiler.jar --js boot.js --compilation_level ADVANCED_OPTIMIZATIONS --js_output_file boot-c.js',{cwd:"./build/",maxBuffer:1024*1024},
					function (error, stdout, stderr) {
					  
					 	//global.log('stdout: ' + stdout);
					    //global.log('stderr: ' + stderr);
					    if (error !== null) {
					      global.log('exec error: ' + error);
					    }
						if(fs.existsSync("./build/boot-c.js"))
						{
							config.out = './build/boot-c.js';
						}
						cb3();

					});



				}else
				{
					global.log('compiler.jar not found');
					cb3();
				}
			},
			function(cb3)
			{
				global.log('loading '+ config.out);
				var contents = fs.readFileSync(config.out, 'utf8');
				//here, we read the contents of the built boot.js file
				var path = libpath.normalize('./support/client/lib/load.js');
				path = libpath.resolve(__dirname, path);			
				//we zip it, then load it into the file cache so that it can be served in place of the noraml boot.js 
				zlib.gzip(contents,function(_,zippeddata)
				{		   
					    var newentry = {};				
					    newentry.path = path;
					    newentry.data = contents;
					    newentry.stats = fs.statSync(config.out);
					    newentry.zippeddata = zippeddata;
					    newentry.datatype = "utf8";
					    newentry.hash = require("./filecache.js").hash(contents);
					    FileCache.files.push(newentry); 
					    //now that it's loaded into the filecache, we can delete it
					    //fs.unlinkSync(config.out);
					   cb3();
				});
			}],function(err)
			{
				global.log(err);
 				StartUp();
			});
		}, function(err) {
			//there was a requireJS build error. Not a prob, keep going.
			global.log(err);
			StartUp();
		});
	
	}else
	{
		//boot up the rest of the server
		StartUp();
	}
	
}

exports.startVWF = startVWF;
