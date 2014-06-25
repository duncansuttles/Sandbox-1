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

global.version = 1;

var libpath = require('path'),
http = require("http"),
spdy = require("spdy"),
fs = require('fs'),
url = require("url"),
mime = require('mime'),
YAML = require('js-yaml');

// Read configuration settings early so we can use appPath
var configSettings;

try{
    configSettings = JSON.parse(fs.readFileSync('./config.json').toString());
}

catch(e){
    configSettings = {};
    global.log("Error: Unable to load config file");
    global.log(e.message);
}

appPath = configSettings.appPath ? configSettings.appPath : '/adl/sandbox';
global.appPath = appPath;
global.log('Set appPath to '+global.appPath);

//save configuration into global scope so other modules can use.
global.configuration = configSettings;

var SandboxAPI = require('./sandboxAPI'),
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

var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var sessions = require('./sessions');
var xapi = require('./xapi');

//localization
var i18n = require("i18next");
var option = {
        //lng: 'en',
        resGetPath: (libpath.resolve("./locales/__lng__/__ns__.json"))
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

 var handleRedirectAfterLogin = function(req,res) {
    var redirectUrl = global.appPath+'/';
    // If we have previously stored a redirectUrl, use that,
    // otherwise, use the default.
    if (req.session && req.session.redirectUrl) {
        redirectUrl = global.appPath+'/'+req.session.redirectUrl;
        req.session.redirectUrl = null;
    }
    //this seems to be pretty  tricky to get to work properly
    //res.redirect(redirectUrl);
    res.redirect('/');
};

//Start the VWF HTTP server
function startVWF(){
	global.activeinstances = [];

	
	var red, brown, reset;
					red   = '\u001b[31m';
					brown  = '\u001b[33m';
					reset = '\u001b[0m';
					

	
	//start the DAL, load configuration file
	try{
		configSettings = JSON.parse(fs.readFileSync('./config.json').toString());
		console.log(configSettings);
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
	
	p = process.argv.indexOf('-sp');
	sslPort =  p >= 0 ? parseInt(process.argv[p+1]) : (configSettings.sslPort ? configSettings.sslPort : 443);

	p = process.argv.indexOf('-d');
	datapath = p >= 0 ? process.argv[p+1] : (configSettings.datapath ? libpath.normalize(configSettings.datapath) : libpath.join(__dirname, "../../data"));
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
	

	var mailtools = require('./mailTools.js');
	//global error handler
	process.on('uncaughtException', function(err) {
    	// handle the error safely
    	//note: we absolutly must restart the server here. Yeah, maybe some particular error might be ok to read over, but lets stop that
    	//and even send an email to the admin

    	global.setTimeout(function(){process.exit()},5000);
    	global.error(err);
    	global.error(err.stack);
    	mailtools.serverError(err,function(sent){
    		process.exit(1);
    	});
    	
	});
	
    //***node, uses REGEX, escape properly!
	function strEndsWith(str, suffix) {
	    return str.match(suffix+"$")==suffix;
	}

	//send to the load balancer to let it know that this server is available
	function RegisterWithLoadBalancer()
	{
		require('request').get({url:global.configuration.loadBalancer+'/register',json:{host:global.configuration.host,key:global.configuration.loadBalancerKey}},
			 function (error, response, body) {
			  if (!error && response.statusCode == 200) {
			     global.log(brown+"LoadBalancer registration complete"+reset,0);
			     global.log(brown+body+reset,0);
			  }else
			  {
			  	 global.log(red+"LoadBalancer registration failed!"+reset,0);
			  	 global.log(brown+body+reset,0);
			  	 delete global.configuration.loadBalancer;
			  }
		});
	}

	//Boot up sequence. May call immediately, or after build step	
	function StartUp()
	{
		
		
		DAL.setDataPath(datapath);
		SandboxAPI.setDataPath(datapath);
		
		
		
		
		Landing.setDocumentation(configSettings);
		


		DAL.startup(function(){
			
			//make sure that we can connect to the 3DR. Why is the cert untrusted?

			process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
			//start the session database
			require('./sessions.js').sessionStartup(function(){

			errorlog = fs.createWriteStream(SandboxAPI.getDataPath()+'//Logs/errors_'+(((new Date()).toString())).replace(/[^0-9A-Za-z]/g,'_'), {'flags': 'a'});
			
			global.adminUID = adminUID;
			
			//var srv = http.createServer(OnRequest).listen(port);
			
			app.set('layout', 'layout');
			app.set('views', __dirname + '/../../public'+global.appPath+'/views');
			app.set('view engine', 'html');
			app.engine('.html', require('hogan-express'));
			
			
			app.use(
			    function(req,res,next){
					if(strEndsWith(req.url,global.appPath))
						res.redirect(global.appPath+"/");
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
			//app.use (ServerFeatures.waitForAllBody);
			app.use(express.bodyParser());
			//CORS support
			app.use(ServerFeatures.CORSSupport);

			//i18n support
			app.use(express.cookieParser());
    		app.use(i18n.handle);
            app.use(express.cookieSession({
                key    : global.configuration.sessionKey ? global.configuration.sessionKey : 'virtual',
                secret : global.configuration.sessionSecret ? global.configuration.sessionSecret : 'unsecure cookie secret',
                cookie : {
                    maxAge: global.configuration.sessionTimeoutMs ? global.configuration.sessionTimeoutMs : 10000000
                }
            }));
            app.use(passport.initialize());
            app.use(passport.session());

            app.use(app.router);

			app.get(global.appPath+'/:page([a-zA-Z\\0-9\?/]*)', Landing.redirectPasswordEmail);
			app.get(global.appPath, Landing.redirectPasswordEmail);
			
			app.get(global.appPath+'/help', Landing.help);
			app.get(global.appPath+'/help/:page([a-zA-Z]+)', Landing.help);
			app.get(global.appPath+'/world/:page([_a-zA-Z0-9]+)', Landing.world);
			app.get(global.appPath+'/searchResults/:term([a-zA-Z0-9%]+)/:page([0-9]+)', Landing.searchResults);
			app.get(global.appPath+'/newWorlds', Landing.newWorlds);
			app.get(global.appPath+'/allWorlds/:page([0-9]+)', Landing.allWorlds);
			app.get(global.appPath+'/myWorlds/:page([0-9]+)', Landing.myWorlds);
			app.get(global.appPath+'/featuredWorlds/:page([0-9]+)', Landing.featuredWorlds);
			app.get(global.appPath+'/activeWorlds/:page([0-9]+)', Landing.activeWorlds);
			app.get(global.appPath, Landing.generalHandler);
			app.get(global.appPath+'/:page([a-zA-Z/]+)', Landing.generalHandler);
			app.get(global.appPath+'/stats', Landing.statsHandler);
			app.get(global.appPath+'/createNew/:page([0-9/]+)', Landing.createNew);
			app.get(global.appPath+'/createNew2/:template([a-zA-Z0-9/]+)', Landing.createNew2);
			
			app.get(global.appPath+'/vwf.js', Landing.serveVWFcore);

            app.post(global.appPath+'/admin/:page([a-zA-Z]+)', Landing.handlePostRequest);
			app.post(global.appPath+'/data/:action([a-zA-Z_]+)', Landing.handlePostRequest);

                //The file handleing logic for vwf engine files
			app.use(appserver.handleRequest); 
			//var listen = app.listen(port);
			var listen = null;

			app.post('/auth/local', 
			  passport.authenticate('local', { failureRedirect: '/login' }),
			  function(req, res) {
			    
			    	handleRedirectAfterLogin(req,res);

				});

			if(global.configuration.facebook_app_id)
			{
	            app.get(global.appPath+'/auth/facebook',
	                passport.authenticate('facebook', { scope : 'email' }));

	            app.get(global.appPath+'/auth/facebook/callback',
	                passport.authenticate('facebook', { failureRedirect: global.appPath+'/login' }),
	                function(req, res) {
	                    handleRedirectAfterLogin(req,res);
	                });
        	}

        	if(global.configuration.twitter_consumer_key)
			{
	            // Twitter authentication routing
	            app.get(global.appPath+'/auth/twitter', passport.authenticate('twitter'));

	            app.get(global.appPath+'/auth/twitter/callback',
	                passport.authenticate('twitter', { failureRedirect: global.appPath+'/login' }),
	                function(req, res) {
	                    handleRedirectAfterLogin(req,res);
	                });
        	}
        	if(global.configuration.google_client_id)
			{
	             // Google authentication routing
	            app.get(global.appPath+'/auth/google',
	                passport.authenticate('google', { scope: ['profile','email'] }));

	            app.get(global.appPath+'/auth/google/callback',
	                passport.authenticate('google', { failureRedirect: global.appPath+'/login' }),
	                function(req, res) {
	                    handleRedirectAfterLogin(req,res);
	                });
        	}

            // route for logging out
            app.get('/fb_logout', function(req, res) {
                req.logout();
                res.redirect('/');
            });

            if(global.configuration.pfx)
			{
				listen= spdy.createServer({
					pfx: fs.readFileSync(global.configuration.pfx),
					passphrase:global.configuration.pfxPassphrase,
					ca:[fs.readFileSync(global.configuration.sslCA[0]),fs.readFileSync(global.configuration.sslCA[1])],

					
				},app).listen(sslPort);

				//setup a simple server to redirct all requests to the SSL port
				var redirect = http.createServer(function(req,res){
					var requrl = 'http://' +  req.headers.host + req.url;
					requrl = url.parse(requrl);
					
					delete requrl.host;
					requrl.port = sslPort;
					requrl.protocol = "https:";
					requrl = url.format(requrl);
					res.writeHead(302, {
					    "Location": requrl 
					});
					res.end();
				}).listen(port);
			}
			else
			{
				listen= http.createServer(app).listen(port);
			}
			
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
	  }); // end session startup
	} //end StartUp

	//do this before trying to compile, otherwise the vwfbuild.js file will be created with the call to the load balancer, which may not be online
	//NOTE: If this fails, then the build will have the loadbalancer address hardcoded in. Make sure that the balancer info is right if using loadbalancer and
	// - compile together
	if(global.configuration.loadBalancer && global.configuration.host && global.configuration.loadBalancerKey)
			RegisterWithLoadBalancer();

	//Use Require JS to optimize and the main application file.
	if(compile)
	{
		console.log(libpath.resolve(__dirname, './../client/lib/load') );
		var config = {
		    baseUrl: './support/client/lib/',
		    name:'./load' ,
		    out:'./build/load.js'
		};
		
		fs.writeFileSync('./support/client/lib/vwfbuild.js',Landing.getVWFCore());
		global.log('RequrieJS Build start');
		//This will concatenate almost 50 of the project JS files, and serve one file in it's place
		requirejs.optimize(config, function (buildResponse) {
		
			global.log('RequrieJS Build complete');
			global.log(buildResponse);
			async.series([
			function(cb3)
			{
				
				global.log('Closure Build start');
				//lets do the most agressive compile possible here!
				//not looking good on ever getting this through the compiler
			cb3();
	


			},
			function(cb3)
			{
				global.log('loading '+ config.out);
				var contents = fs.readFileSync(config.out, 'utf8');
				//here, we read the contents of the built load.js file
				var path = libpath.normalize('../../support/client/lib/load.js');
				path = libpath.resolve(__dirname, path);			
				console.log(path);
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
// used to serialize the user for the session
passport.serializeUser(function (user, done) {
 
 DAL.getUser(user.id, function (user) {
        xapi.sendStatement(user.id,xapi.verbs.logged_in);
        var userStorage = require('./sessions.js').createSession();
        userStorage.id = user.id;
        userStorage.UID = user.id;
        userStorage.Username = user.Username || user.id;
        userStorage.PasswordIsTemp = user.isTemp;
		userStorage.Password = user.Password;
		
        done(null, userStorage);
    });
});

// used to deserialize the user
passport.deserializeUser(function (userStorage, done) {
    DAL.getUser(userStorage.id, function (user) {
        done(null, user);
    });
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    DAL.getUser(username, function (user) {
        if (user) {
        	require('./passwordUtils.js').CheckPassword(username,password,function(ok,isTemp)
        	{
				if(ok === true)
				{
					xapi.sendStatement(username,xapi.verbs.logged_in); 
					if(isTemp)
						user.isTemp = true;
					done(null, user);
				}else
						done(null,null);
        	})
            
        }else
        {
        	done(null,null);
        } 
    })
    })
);

if(global.configuration.facebook_app_id)
{
	passport.use(new FacebookStrategy({
	        clientID: global.configuration.facebook_app_id,
	        clientSecret: global.configuration.facebook_app_secret,
	        callbackURL: global.configuration.facebook_callback_url
	    },
	    function (accessToken, refreshToken, profile, done) {
	        process.nextTick(function () {
	                profile.id = "facebook_"+profile.id;
	                DAL.getUser(profile.id, function (user) {
	                    if (user) {
	                        done(null, user);
	                    } else {
	                        user = DAL.createProfileFromFacebook(profile, function (results) {
	                            if (results === "ok") {
	                                DAL.getUser(profile.id, function (user) {
	                                    done(null, user);
	                                });
	                            } else {
	                                done("Error creating user from facebook " + results, null);
	                            }
	                        });
	                    }
	                });
	            }
	        );
	    }
	));
}
if(global.configuration.twitter_consumer_key)
{
	passport.use(new TwitterStrategy({
	        consumerKey: global.configuration.twitter_consumer_key,
	        consumerSecret: global.configuration.twitter_consumer_secret,
	        callbackURL: global.configuration.twitter_callback_url
	    },
	    function (accessToken, refreshToken, profile, done) {
	        process.nextTick(function () {
	                profile.id = "twitter_"+profile.id;
	                DAL.getUser(profile.id, function (user) {
	                    if (user) {
	                        done(null, user);
	                    } else {
	                        user = DAL.createProfileFromTwitter(profile, function (results) {
	                            if (results === "ok") {
	                                DAL.getUser(profile.id, function (user) {
	                                    done(null, user);
	                                });
	                            } else {
	                                done("Error creating user from twitter " + results, null);
	                            }
	                        });
	                    }
	                });
	            }
	        );
	    }
	));
}

if(global.configuration.google_client_id)
{
	passport.use(new GoogleStrategy({
	        clientID: global.configuration.google_client_id,
	        clientSecret: global.configuration.google_client_secret,
	        callbackURL: global.configuration.google_callback_url
	    },
	    function(token, tokenSecret, profile, done) {
	        // asynchronous verification, for effect...
	        process.nextTick(function () {
	            profile.id = "google_"+profile.id;
	            DAL.getUser(profile.id, function (user) {
	                if (user) {
	                    done(null, user);
	                } else {
	                    user = DAL.createProfileFromGoogle(profile, function (results) {
	                        if (results === "ok") {
	                            DAL.getUser(profile.id, function (user) {
	                                done(null, user);
	                            });
	                        } else {
	                            done("Error creating user from google " + results, null);
	                        }
	                    });
	                }
	            });
	            return done(null, profile);
	        });
	    }
	));
}

exports.startVWF = startVWF;
