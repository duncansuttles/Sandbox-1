global.version = 1;
var libpath = require('path'),
http = require("http"),
fs = require('fs'),
url = require("url"),
mime = require('mime'),
YAML = require('js-yaml'),
SandboxAPI = require('./sandboxAPI'),
Shell = require('./ShellInterface'),
DAL = require('./DAL'),
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
    
    
    if(level <= global.logLevel)
        console.log.apply(this,args);
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
    
    if(level <= global.logLevel)
        console.log.apply(this,args);
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
		console.log("Error: Unable to load config file");
		console.log(e.message);
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
		console.log(red+'Latency Sim = ' +  global.latencySim+reset);	
	
	p = process.argv.indexOf('-l');
	global.logLevel = p >= 0 ? process.argv[p+1] : (configSettings.logLevel ? configSettings.logLevel : 1);
	global.log(brown+'LogLevel = ' +  global.logLevel+reset,0);	
	
	var adminUID = 'admin';
	
	p = process.argv.indexOf('-a');
	adminUID = p >= 0 ? process.argv[p+1] : (configSettings.admin ? configSettings.admin : adminUID);	
	
	FileCache.enabled = process.argv.indexOf('-nocache') >= 0 ? false : !configSettings.noCache;
	if(!FileCache.enabled)
	{
	   console.log('server cache disabled');
	}
	
	FileCache.minify = process.argv.indexOf('-min') >= 0 ? true : !!configSettings.minify;
	var compile = process.argv.indexOf('-compile') >= 0 ? true  : !!configSettings.compile;
	if(compile)
	{
		console.log('Starting compilation process...');
	}
	
	var versioning = process.argv.indexOf('-cc') >= 0 ? true : !!configSettings.useVersioning;
	if(versioning)
	{
		global.version = configSettings.version ? configSettings.version : global.version;
		console.log(brown + 'Versioning is on. Version is ' + global.version + reset);
	}else
	{
		console.log(brown+'Versioning is off.'+reset);
		delete global.version;
	}	
	

	//global error handler
	process.on('uncaughtException', function(err) {
    // handle the error safely
    	global.error(err.message);
	});
	
	//Boot up sequence. May call immediately, or after build step	
	function StartUp()
	{
		SandboxAPI.setDAL(DAL);
		SandboxAPI.setDataPath(datapath);
		errorlog = fs.createWriteStream(SandboxAPI.getDataPath()+'//Logs/errors_'+(((new Date()).toString())).replace(/[^0-9A-Za-z]/g,'_'), {'flags': 'a'});
		Shell.setDAL(DAL);
		Landing.setDAL(DAL);
		Landing.setDocumentation(configSettings);
		reflector.setDAL(DAL);
		appserver.setDAL(DAL);
		ServerFeatures.setDAL(DAL);
		

		

		DAL.startup(function(){
			
			global.sessions = [];
			global.adminUID = adminUID;
			
			//var srv = http.createServer(OnRequest).listen(port);
			
			app.set('layout', 'layout');
			app.set('views', __dirname + '/public/adl/sandbox/views');
			app.set('view engine', 'html');
			app.engine('.html', require('hogan-express'));
			
			
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
			app.use(app.router);
			app.get('/adl/sandbox/help', Landing.help);
			app.get('/adl/sandbox/help/:page([a-zA-Z]+)', Landing.help);
			app.get('/adl/sandbox/world/:page([a-zA-Z0-9]+)', Landing.world);
			app.get('/adl/sandbox', Landing.generalHandler);
			app.get('/adl/sandbox/:page([a-zA-Z/]+)', Landing.generalHandler);		
			
			app.post('/adl/sandbox/admin/:page([a-zA-Z]+)', Landing.handlePostRequest);
			app.post('/adl/sandbox/data/:action([a-zA-Z_]+)', Landing.handlePostRequest);
			
			//The file handleing logic for vwf engine files
			app.use(appserver.handleRequest); 
			var listen = app.listen(port);
			
			global.log(brown+'Admin is "' + global.adminUID+"\""+reset,0);
			global.log(brown+'Serving on port ' + port+reset,0);
			global.log(brown+'minify is ' + FileCache.minify+reset,0);
			Shell.StartShellInterface();  
			reflector.startup(listen);
			
		});
	} //end StartUp
	//Use Require JS to optimize and the main application file.
	if(compile)
	{
		var config = {
		    baseUrl: './support/client/lib',
		    name:'boot',
		    out:'./build/boot.js'
		};
		
		//This will concatenate almost 50 of the project JS files, and serve one file in it's place
		requirejs.optimize(config, function (buildResponse) {
		
			console.log('RequrieJS Build complete');
			async.series([
			function(cb3)
			{
				
				console.log('Closure Build start');
				//lets do the most agressive compile possible here!
				if(false && fs.existsSync("./build/compiler.jar"))
				{

					var c1 = exec('java -jar compiler.jar --js boot.js --compilation_level ADVANCED_OPTIMIZATIONS --js_output_file boot-c.js',{cwd:"./build/",maxBuffer:1024*1024},
					function (error, stdout, stderr) {
					  
					 	//console.log('stdout: ' + stdout);
					    //console.log('stderr: ' + stderr);
					    if (error !== null) {
					      console.log('exec error: ' + error);
					    }
						if(fs.existsSync("./build/boot-c.js"))
						{
							config.out = './build/boot-c.js';
						}
						cb3();

					});



				}else
				{
					console.log('compiler.jar not found');
					cb3();
				}
			},
			function(cb3)
			{
				console.log('loading '+ config.out);
				var contents = fs.readFileSync(config.out, 'utf8');
				//here, we read the contents of the built boot.js file
				var path = libpath.normalize('./support/client/lib/boot.js');
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
				console.log(err);
 				StartUp();
			});
		}, function(err) {
			//there was a requireJS build error. Not a prob, keep going.
			console.log(err);
			StartUp();
		});
	
	}else
	{
		//boot up the rest of the server
		StartUp();
	}
	
}

exports.startVWF = startVWF;
