global.version = 1;

var libpath = require('path'),
    http = require("http"),
    spdy = require("spdy"),
    fs = require('fs-extra'),
    url = require("url"),
    mime = require('mime'),
    YAML = require('js-yaml');
var logger = require('./logger');




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
var exec = require('child_process').exec;

var FileCache = new(require("./filecache.js")._FileCache)();
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
var compile = false;
var adminUID = null;
var port = 0;
var datapath = "";
var listen = null;
var clean = false;
i18n.init(option);

logger.info("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n");
logger.info('Welcome to Sandbox.\nType "create application" to create your first app.');
logger.info('Type "help" for a list of commands.\n');


var handleRedirectAfterLogin = function(req, res) {
    var redirectUrl = global.appPath + '/';
    // If we have previously stored a redirectUrl, use that,
    // otherwise, use the default.
    if (req.session && req.session.redirectUrl) {
        redirectUrl = global.appPath + '/' + req.session.redirectUrl;
        req.session.redirectUrl = null;
    }
    //this seems to be pretty  tricky to get to work properly
    //res.redirect(redirectUrl);
    res.redirect('/');
};

var mailtools = require('./mailTools.js');


//***node, uses REGEX, escape properly!
function strEndsWith(str, suffix) {
    return str.match(suffix + "$") == suffix;
}

//send to the load balancer to let it know that this server is available
function RegisterWithLoadBalancer() {
    require('request').get({
            url: global.configuration.loadBalancer + '/register',
            json: {
                host: global.configuration.host,
                key: global.configuration.loadBalancerKey
            }
        },
        function(error, response, body) {
            if (!error && response.statusCode == 200) {
                logger.info("LoadBalancer registration complete", 0);
                logger.info(body, 0);
            } else {
                logger.error("LoadBalancer registration failed!", 0);
                logger.error(body, 0);
                delete global.configuration.loadBalancer;
            }
        });
}

//Start the VWF HTTP server
function startVWF() {
    global.activeinstances = [];

    async.series([

            function readconfig(cb) {
                var configSettings;
                //start the DAL, load configuration file
                try {
                    configSettings = JSON.parse(fs.readFileSync('./config.json').toString());
                    SandboxAPI.setAnalytics(configSettings.analytics);
                    logger.info('Configuration read.')
                } catch (e) {
                    configSettings = {};
                    logger.error('Could not read config file. Loading defaults.')
                }
                //save configuration into global scope so other modules can use.
                global.configuration = configSettings;
                cb();
            },
            function readCommandLine(cb) {
                var p = process.argv.indexOf('-p');


                //This is a bit ugly, but it does beat putting a ton of if/else statements everywhere
                port = p >= 0 ? parseInt(process.argv[p + 1]) : (global.configuration.port ? global.configuration.port : 3000);
                global.configuration.port = port;

                var p = process.argv.indexOf('-DB');
                var DB_driver = p >= 0 ? (process.argv[p + 1]) : (global.configuration.DB_driver ? global.configuration.DB_driver : './DB_nedb.js');
                global.configuration.DB_driver = DB_driver;
                

                p = process.argv.indexOf('-sp');
                sslPort = p >= 0 ? parseInt(process.argv[p + 1]) : (global.configuration.sslPort ? global.configuration.sslPort : 443);
                global.configuration.sslPort = sslPort;

                p = process.argv.indexOf('-d');
                datapath = p >= 0 ? process.argv[p + 1] : (global.configuration.datapath ? libpath.normalize(global.configuration.datapath) : libpath.join(__dirname, "../../data"));
                global.datapath = datapath;
                global.configuration.datapath = datapath;

                logger.initFileOutput(datapath);

                p = process.argv.indexOf('-ls');
                global.latencySim = p >= 0 ? parseInt(process.argv[p + 1]) : (global.configuration.latencySim ? global.configuration.latencySim : 0);

                if (global.latencySim > 0)
                    logger.info('Latency Sim = ' + global.latencySim);
                global.configuration.latencySim = global.latencySim;

                p = process.argv.indexOf('-l');
                logger.logLevel = p >= 0 ? process.argv[p + 1] : (global.configuration.logLevel ? global.configuration.logLevel : 1);
                logger.info('LogLevel = ' + logger.logLevel, 0);
                global.configuration.logLevel = logger.logLevel;

                adminUID = 'admin';

                p = process.argv.indexOf('-a');
                adminUID = p >= 0 ? process.argv[p + 1] : (global.configuration.admin ? global.configuration.admin : adminUID);
                global.configuration.adminUID = adminUID;

                p = process.argv.indexOf('-cluster');
                var cluster = p >= 0 ? true : false;
                global.configuration.cluster = cluster;

                FileCache.enabled = process.argv.indexOf('-nocache') >= 0 ? false : !global.configuration.noCache;
                if (!FileCache.enabled) {
                    logger.info('server cache disabled');
                }
                global.configuration.FileCache = FileCache.enabled;

                FileCache.minify = process.argv.indexOf('-min') >= 0 ? true : !!global.configuration.minify;
                compile = process.argv.indexOf('-compile') >= 0 ? true : !!global.configuration.compile;
                if (compile) {
                    logger.info('Starting compilation process...');
                }
                global.configuration.minify = FileCache.minify;
                global.configuration.compile = FileCache.compile;

                var versioning = process.argv.indexOf('-cc') >= 0 ? true : !!global.configuration.useVersioning;
                if (versioning) {
                    global.version = global.configuration.version ? global.configuration.version : global.version;
                    logger.info('Versioning is on. Version is ' + global.version);
                } else {
                    logger.info('Versioning is off.');
                    delete global.version;
                }
                global.configuration.versioning = versioning;
                global.configuration.version = global.version;

                appPath = global.configuration.appPath ? global.configuration.appPath : '/adl/sandbox';
                global.appPath = appPath;
                global.configuration.appPath = appPath;
                logger.info('Set appPath to ' + global.appPath);


                var clean = process.argv.indexOf('-clean') > 0 ? true : false;
                global.configuration.clean = clean;
                if (clean) {
                    var path = libpath.normalize('../../build/'); //trick the filecache
                    path = libpath.resolve(__dirname, path);
                    fs.remove(path, cb);
                } else
                    cb();
            },

            function initLandingRoutes(cb)
            {
                    Landing.init();
                    cb();
            },
            function registerErrorHandler(cb) {
                //global error handler
                process.on('uncaughtException', function(err) {
                    // handle the error safely
                    //note: we absolutly must restart the server here. Yeah, maybe some particular error might be ok to read over, but lets stop that
                    //and even send an email to the admin

                    global.setTimeout(function() {
                        process.exit()
                    }, 5000);
                    logger.error(err);
                    logger.error(err.stack);
                    mailtools.serverError(err, function(sent) {
                        process.exit(1);
                    });

                });
                cb();
            },
            function registerWithLB(cb) {
                //do this before trying to compile, otherwise the vwfbuild.js file will be created with the call to the load balancer, which may not be online
                //NOTE: If this fails, then the build will have the loadbalancer address hardcoded in. Make sure that the balancer info is right if using loadbalancer and
                // - compile together
                if (global.configuration.loadBalancer && global.configuration.host && global.configuration.loadBalancerKey)
                    RegisterWithLoadBalancer();
                cb();
            },
            function compileCSSIfDefined(cb) {
                if (!compile) {
                    cb();
                    return;
                } else {

                    function loadCssIntoCache() {

                        //trick the file cache
                        //note we have to add the /build/ now, because the filenames are resolved to the build folder
                        //if the script exists. Because load.js will normally be minified, we must register this in 2 places
                        //with /build/ and without, so we never accidently load the uncompiled one

                        var path = libpath.normalize('../../build/support/client/lib/index.css'); //trick the filecache
                        path = libpath.resolve(__dirname, path);
                        logger.info(path);
                        //we zip it, then load it into the file cache so that it can be served in place of the noraml boot.js 
                        var buildname = libpath.resolve(libpath.join(__dirname, '..', '..', 'build', 'index.css'));
                        var contents = fs.readFileSync(buildname);

                        var path2 = libpath.normalize('../../support/client/lib/index.css'); //trick the filecache
                        path2 = libpath.resolve(__dirname, path2);

                        FileCache.insertFile([path, path2], contents, fs.statSync(buildname), "utf8", cb);


                    }
                    //first, check if the build file already exists. if so, skip this step
                    if (fs.existsSync(libpath.resolve(libpath.join(__dirname, '..', '..', 'build', 'index.css')))) {
                        logger.warn('Build already exists. Use --clean to rebuild');
                        loadCssIntoCache();
                        return;
                    } else {
                        //logger.info(libpath.resolve(__dirname, './../client/lib/load'));
                        var config = {
                            baseUrl: './support/',
                            cssIn: './support/client/lib/index.css',
                            out: './build/index.css',
                            optimizeCss: "none",
                            onBuildWrite: function(name, path, contents) {
                                logger.info('Writing: ' + name);
                                return contents
                            },
                            // findNestedDependencies: true
                        };
                        requirejs.optimize(config, function(buildResponse) {

                            logger.info('RequrieJS CSS Build complete');
                            loadCssIntoCache();
                        });

                    }


                }
            },
            function compileIfDefined(cb) {
                if (!compile) {
                    cb();
                    return;
                }
                if (compile) {

                    fs.writeFileSync('./support/client/lib/vwfbuild.js', Landing.getVWFCore());

                    function loadIntoCache() {
                        var path = libpath.normalize('../../build/support/client/lib/load.js'); //trick the filecache
                        path = libpath.resolve(__dirname, path);
                        logger.info(path);
                        //we zip it, then load it into the file cache so that it can be served in place of the noraml boot.js 
                        var buildname = libpath.resolve(libpath.join(__dirname, '..', '..', 'build', 'load.js'));
                        var contents = fs.readFileSync(buildname);

                        var path2 = libpath.normalize('../../support/client/lib/load.js'); //trick the filecache
                        path2 = libpath.resolve(__dirname, path2);

                        FileCache.insertFile([path, path2], contents, fs.statSync(buildname), "utf8", cb);
                    }
                    //first, check if the build file already exists. if so, skip this step
                    if (fs.existsSync(libpath.resolve(libpath.join(__dirname, '..', '..', 'build', 'load.js')))) {
                        //trick the file cache
                        //note we have to add the /build/ now, because the filenames are resolved to the build folder
                        //if the script exists. Because load.js will normally be minified, we must register this in 2 places
                        //with /build/ and without, so we never accidently load the uncompiled one
                        logger.warn('Build already exists. Use --clean to rebuild');
                        loadIntoCache();
                        return;
                    }


                    //logger.info(libpath.resolve(__dirname, './../client/lib/load'));
                    var config = {
                        baseUrl: './support/client/lib/',
                        name: './load',
                        out: './build/load.js',
                        optimize: "uglify",
                        onBuildWrite: function(name, path, contents) {
                            logger.info('Writing: ' + name);
                            return contents
                        },
                        // findNestedDependencies: true
                    };


                    logger.info('RequrieJS Build start');
                    //This will concatenate almost 50 of the project JS files, and serve one file in it's place
                    requirejs.optimize(config, function(buildResponse) {

                        logger.info('RequrieJS Build complete');
                        loadIntoCache();
                    });

                }
            },
            function setupPassport(cb) {
                // used to serialize the user for the session
                passport.serializeUser(function(user, done) {

                    if (!user) {
                        done(null, null);
                        return;
                    }

                    DAL.getUser(user.id, function(user) {
                        if (!user) {
                            done(null, null)
                            return;;
                        }

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
                passport.deserializeUser(function(userStorage, done) {
                    DAL.getUser(userStorage.id, function(user) {
                        done(null, user);
                    });
                });

                passport.use(new LocalStrategy(
                    function(username, password, done) {
                        DAL.getUser(username, function(user) {
                            if (user) {
                                require('./passwordUtils.js').CheckPassword(username, password, function(ok, isTemp) {
                                    if (ok === true) {
                                        xapi.sendStatement(username, xapi.verbs.logged_in);
                                        if (isTemp)
                                            user.isTemp = true;
                                        done(null, user);
                                    } else
                                        done(null, null);
                                })

                            } else {
                                done(null, null);
                            }
                        })
                    }));

                if (global.configuration.facebook_app_id) {
                    passport.use(new FacebookStrategy({
                            clientID: global.configuration.facebook_app_id,
                            clientSecret: global.configuration.facebook_app_secret,
                            callbackURL: global.configuration.facebook_callback_url
                        },
                        function(accessToken, refreshToken, profile, done) {
                            process.nextTick(function() {
                                profile.id = "facebook_" + profile.id;

                                DAL.getUser(profile.id, function(user) {
                                    if (user) {
                                        xapi.sendStatement(user.Username, xapi.verbs.logged_in);
                                        done(null, user);
                                    } else {
                                        user = DAL.createProfileFromFacebook(profile, function(results) {
                                            if (results === "ok") {
                                                DAL.getUser(profile.id, function(user) {
                                                    xapi.sendStatement(user.Username, xapi.verbs.logged_in);
                                                    done(null, user);
                                                });
                                            } else {
                                                done("Error creating user from facebook " + results, null);
                                            }
                                        });
                                    }
                                });
                            });
                        }
                    ));
                }
                if (global.configuration.twitter_consumer_key) {
                    passport.use(new TwitterStrategy({
                            consumerKey: global.configuration.twitter_consumer_key,
                            consumerSecret: global.configuration.twitter_consumer_secret,
                            callbackURL: global.configuration.twitter_callback_url
                        },
                        function(accessToken, refreshToken, profile, done) {
                            process.nextTick(function() {
                                profile.id = "twitter_" + profile.id;
                                DAL.getUser(profile.id, function(user) {
                                    if (user) {
                                        xapi.sendStatement(user.Username, xapi.verbs.logged_in);
                                        done(null, user);
                                    } else {
                                        user = DAL.createProfileFromTwitter(profile, function(results) {
                                            if (results === "ok") {
                                                DAL.getUser(profile.id, function(user) {
                                                    xapi.sendStatement(user.Username, xapi.verbs.logged_in);
                                                    done(null, user);
                                                });
                                            } else {
                                                done("Error creating user from twitter " + results, null);
                                            }
                                        });
                                    }
                                });
                            });
                        }
                    ));
                }

                if (global.configuration.google_client_id) {
                    passport.use(new GoogleStrategy({
                            clientID: global.configuration.google_client_id,
                            clientSecret: global.configuration.google_client_secret,
                            callbackURL: global.configuration.google_callback_url
                        },
                        function(token, tokenSecret, profile, done) {
                            // asynchronous verification, for effect...
                            process.nextTick(function() {
                                profile.id = "google_" + profile.id;
                                DAL.getUser(profile.id, function(user) {
                                    if (user) {
                                        xapi.sendStatement(user.Username, xapi.verbs.logged_in);
                                        done(null, user);
                                    } else {
                                        user = DAL.createProfileFromGoogle(profile, function(results) {
                                            if (results === "ok") {
                                                DAL.getUser(profile.id, function(user) {
                                                    xapi.sendStatement(user.Username, xapi.verbs.logged_in);
                                                    done(null, user);
                                                    return;
                                                });
                                            } else {
                                                done("Error creating user from google " + results, null);
                                                return;
                                            }
                                        });
                                    }
                                });

                            });
                        }
                    ));
                }

                cb();
            },
            function minScripts(cb) {
                if (FileCache.minify)
                    FileCache.minAllSupportScripts(cb);
                else
                    cb();
            },
            function startupDAL(cb) {
                DAL.setDataPath(datapath);
                SandboxAPI.setDataPath(datapath);
                Landing.setDocumentation(global.configuration);
                logger.info('DAL Startup');
                DAL.startup(cb);
            },
            function setSession(cb) {
                logger.info('Session Startup');
                require('./sessions.js').sessionStartup(cb);
            },
            function startup(cb) {
                //Boot up sequence. May call immediately, or after build step  
                logger.info('Server Startup');

                //make sure that we can connect to the 3DR. Why is the cert untrusted?

                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
                //start the session database


               

                global.adminUID = adminUID;


                //check for express 4.x
                if (!app.locals) {
                    logger.error('Please update NPM modules. Run NPM install again.');
                    return;
                }
                app.set('layout', 'layout');
                app.set('views', __dirname + '/../../public' + global.appPath + '/views');
                app.set('view engine', 'html');
                app.engine('.html', require('hogan-express'));


                app.use(
                    function(req, res, next) {
                        if (strEndsWith(req.url, global.appPath))
                            res.redirect(global.appPath + "/");
                        else next();
                    }
                );


                //This first handler in the pipeline deal with the version numbers
                // we append a version to the front if every request to keep the clients fresh
                // otherwise, a user would have to know to refresh the cache every time we release
                app.use(ServerFeatures.versioning);

                //find pretty world URL's, and redirect to the non-pretty url for the world
                app.use(ServerFeatures.prettyWorldURL);


                app.use(require('method-override')());

                //Wait until all data is loaded before continuing
                //app.use (ServerFeatures.waitForAllBody);
                app.use(require('body-parser').json({
                    maxFieldsSize: 16 * 1024 * 1024 * 1024,
                    limit: '50mb'
                }));
                app.use(require('body-parser').urlencoded({
                    extended: true
                }));
                app.use(require('multer')());
                //CORS support
                app.use(ServerFeatures.CORSSupport);

                //i18n support
                app.use(require('cookie-parser')());

                app.use(i18n.handle);
                app.use(require('connect').cookieSession({
                    key: global.configuration.sessionKey ? global.configuration.sessionKey : 'virtual',
                    secret: global.configuration.sessionSecret ? global.configuration.sessionSecret : 'unsecure cookie secret',
                    cookie: {
                        maxAge: global.configuration.sessionTimeoutMs ? global.configuration.sessionTimeoutMs : 10000000
                    }
                }));

                app.use(passport.initialize());
                app.use(passport.session());


                //var listen = app.listen(port);


                app.use('/auth/local',
                    passport.authenticate('local', {
                        failureRedirect: '/login'
                    }),
                    function(req, res) {

                        handleRedirectAfterLogin(req, res);

                    });

                if (global.configuration.facebook_app_id) {
                    app.get(global.appPath + '/auth/facebook',
                        passport.authenticate('facebook', {
                            scope: 'email'
                        }));

                    app.get(global.appPath + '/auth/facebook/callback',
                        passport.authenticate('facebook', {
                            failureRedirect: global.appPath + '/login'
                        }),
                        function(req, res) {
                            handleRedirectAfterLogin(req, res);
                        });
                }

                if (global.configuration.twitter_consumer_key) {
                    // Twitter authentication routing
                    app.get(global.appPath + '/auth/twitter', passport.authenticate('twitter'));

                    app.get(global.appPath + '/auth/twitter/callback',
                        passport.authenticate('twitter', {
                            failureRedirect: global.appPath + '/login'
                        }),
                        function(req, res) {
                            handleRedirectAfterLogin(req, res);
                        });
                }
                if (global.configuration.google_client_id) {
                    // Google authentication routing
                    app.get(global.appPath + '/auth/google',
                        passport.authenticate('google', {
                            scope: ['profile', 'email']
                        }));

                    app.get(global.appPath + '/auth/google/callback',
                        passport.authenticate('google', {
                            failureRedirect: global.appPath + '/login'
                        }),
                        function(req, res) {
                            handleRedirectAfterLogin(req, res);
                        });
                }

                // route for logging out
                app.get('/fb_logout', function(req, res) {
                    req.logout();
                    res.redirect('/');
                });

                app.get(global.appPath + '/:page([a-zA-Z\\0-9\?/]*)', Landing.redirectPasswordEmail);
                app.get(global.appPath, Landing.redirectPasswordEmail);

                app.get(global.appPath + '/help', Landing.help);
                app.get(global.appPath + '/help/:page([a-zA-Z]+)', Landing.help);
                app.get(global.appPath + '/world/:page([_a-zA-Z0-9]+)', Landing.world);
                app.get(global.appPath + '/searchResults/:term([^/]+)/:page([0-9]+)', Landing.searchResults);
                app.get(global.appPath + '/newWorlds', Landing.newWorlds);
                app.get(global.appPath + '/allWorlds/:page([0-9]+)', Landing.allWorlds);
                app.get(global.appPath + '/myWorlds/:page([0-9]+)', Landing.myWorlds);
                app.get(global.appPath + '/featuredWorlds/:page([0-9]+)', Landing.featuredWorlds);
                app.get(global.appPath + '/activeWorlds/:page([0-9]+)', Landing.activeWorlds);
                app.get(global.appPath, Landing.generalHandler);
                app.get(global.appPath + '/:page([a-zA-Z/]+)', Landing.generalHandler);
                app.get(global.appPath + '/stats', Landing.statsHandler);
                app.get(global.appPath + '/createNew/:page([0-9/]+)', Landing.createNew);
                app.get(global.appPath + '/createNew2/:template([_a-zA-Z0-9/]+)', Landing.createNew2);

                app.get(global.appPath + '/vwf.js', Landing.serveVWFcore);

                app.post(global.appPath + '/admin/:page([a-zA-Z]+)', Landing.handlePostRequest);
                app.post(global.appPath + '/data/:action([a-zA-Z_]+)', Landing.handlePostRequest);

                app.use(appserver.admin_instances);
                app.use(appserver.routeToAPI);
                //The file handleing logic for vwf engine files
                app.use(appserver.handleRequest);

                if (global.configuration.pfx) {
                    listen = spdy.createServer({
                        pfx: fs.readFileSync(global.configuration.pfx),
                        passphrase: global.configuration.pfxPassphrase,
                        ca: [fs.readFileSync(global.configuration.sslCA[0]), fs.readFileSync(global.configuration.sslCA[1])],


                    }, app).listen(sslPort);

                    //setup a simple server to redirct all requests to the SSL port
                    var redirect = http.createServer(function(req, res) {
                        var requrl = 'http://' + req.headers.host + req.url;
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
                } else {

                    listen = app.listen(port);
                }

                logger.info('Admin is "' + global.adminUID + "\"", 0);
                logger.info('Serving on port ' + port, 0);
                logger.info('minify is ' + FileCache.minify, 0);


                cb();
            },
            function startReflector(cb) {
                Shell.StartShellInterface();
                reflector.startup(listen);
                cb();
            }
        ],
        function(err) {
            logger.info('Startup complete');
        })

}


exports.startVWF = startVWF;