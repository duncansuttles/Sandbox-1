//The service logic for the legacy VWF file pathing. 
//***this sucks, and is really complex. it's something like:
// if there is an instance ID in the url, remove it first
// if the url identifies a file under /public/ then just serve it
// else, if that file does not exist, but there is one just like it but ending in .yaml, serve that.
// else if , after stripping the instance, the url is a directory that contains an index.yaml, then this directoy is an application.
//      if the instanceID that you stripped is a valid instance of this application, send the bootstrap file
// if it appears to be a file, but can't be found, check that it's not looking for /vwf/....    all these files are under support/client/lib, not /public
// they might also be under support/proxy, so check there. (be sure to check each of these for the .yaml varient as well)
// if it's a directory that is not an applicaiton, then just serve the index.html if it exists, or 404


var libpath = require('path'),
    http = require("http"),
    fs = require('fs'),
    url = require("url"),
    mime = require('mime'),

    YAML = require('js-yaml');
var DAL = require('./DAL').DAL;

var resolveCase = require('./resolveCaseInsensitiveFilename').resolveName;
var existsCaseInsensitive = require('./resolveCaseInsensitiveFilename').exists;
var existsSyncCaseInsensitive = require('./resolveCaseInsensitiveFilename').existsSync;

function setDAL(dal) {
    DAL = dal;
}
//***node, uses REGEX, escape properly!
function strEndsWith(str, suffix) {
    return str.match(suffix + "$") == suffix;
}

//302 redirect
function _302(url, response) {
    response.writeHead(302, {
        "Location": url
    });
    response.end();
}

// pick the application name out of the URL by finding the index.vwf.yaml
// Cache - this means that adding applications to the server will requrie a restart
var appNameCache = [];

function findAppName(uri) {

    var current = "." + libpath.sep;
    var testcache = (current + uri);

    //cache and avoid some sync directory operations
    for (var i = 0; i < appNameCache.length; i++) {
        if (testcache.indexOf(appNameCache[i]) == 0) {

            return appNameCache[i];
        }
    }
    while (!existsSyncCaseInsensitive(libpath.resolve(__dirname, current + "index.vwf.yaml"))) {

        var next = uri.substr(0, Math.max(uri.indexOf('/'), uri.indexOf('\\')) + 1);
        current += next;
        if (!next)
            break;


        uri = uri.substr(next.length);
    }
    if (existsSyncCaseInsensitive(libpath.resolve(__dirname, current + "index.vwf.yaml"))) {

        appNameCache.push(current);
        return current;
    }
    return null;
}

//Generate a random ID for a instance
var ValidIDChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";


//Serve a JSON object
function ServeJSON(jsonobject, response, URL) {

    response.writeHead(200, {
        "Content-Type": "text/json"
    });
    response.write(JSON.stringify(jsonobject), "utf8");
    response.end();

}

//amke a random VWF Instance id
function makeid() {
    var text = "";


    for (var i = 0; i < 16; i++)
        text += ValidIDChars.charAt(Math.floor(require('./cryptoRandom.js').random() * ValidIDChars.length));

    return text;
}
var WaitingForConnection = 0;
var Active = 1;
var Dead = 2;

function instance(inid) {
    this.id = inid;
    this.state = WaitingForConnection;
    this.clients = 0;
}

//Redirect the user to a new instance
function RedirectToInstance(request, response, appname, newid) {
    if (newid === undefined)
        newid = makeid() + "/";

    var query = (url.parse(request.url).query) || "";
    if (query) {
        query = '?' + query;
        newid += query;
    }


    var path = url.parse(request.url).pathname;
    if (path[path - 1] != '/')
        newid = path.substr(path.indexOf('/')) + '/' + newid;
    newid = newid.replace(/\/\//g, '/');
    newid = newid.replace(/\/\/\//g, '/');


    redirect(newid, response);
}

//Redirect, just used on some invalid paths
function redirect(url, response) {
    url = url.replace(/\\\\/g, '/');
    url = url.replace(/\\/g, '/');
    url = url.replace(/\/\//g, '/');

    url = url.replace(/\/\/\//g, '/');
    //url = url.replace('http://','');
    url = url.replace(/\/\/\//g, "/");
    url = url.replace(/\/\/\/\//g, "/");
    //url = 'http://' + url;
    response.writeHead(200, {
        "Content-Type": "text/html"
    });
    response.write("<html>" +
        "<head>" +
        "   <title>Virtual World Framework</title>" +
        "   <meta http-equiv=\"REFRESH\" content=\"0;url=" + url + "\">" +
        "</head>" +
        "<body>" +
        "</body>" +
        "</html>");
    response.end();
    return;
}
//Find the instance(instance) ID in a URL
function Findinstance(uri) {
    //find the application name
    var app = findAppName(uri);

    if (!app)
        return null;
    //remove the application name   
    var minusapp = uri.substr(app.length - 2);
    var parts = minusapp.split(libpath.sep);
    var testapp = parts[0];

    //Really, any slash delimited string after the app name should work
    //sticking with 16 characters for now 
    if (testapp.indexOf('example_') == 0 && testapp.length > 7 && testapp.indexOf('.') == -1) {
        return testapp;
    }
    if (testapp.length == 16) {
        for (var i = 0; i < 16; i++) {
            if (ValidIDChars.indexOf(testapp[i]) == -1)
                return null;
        }

        return testapp;
    }
    return null;
}
//Remove the instance identifer from the URL
function filterinstance(uri, instance) {
    return uri.replace(instance + libpath.sep, '').replace(instance, libpath.sep);
}

function hash(str) {
    return require('crypto').createHash('md5').update(str).digest("hex");
}


//Just serve a simple file
function ServeFile(request, filename, response, URL) {
    FileCache.ServeFile(request, filename, response, URL)
}
//Return a 404 not found coude
function _404(response) {
    response.writeHead(404, {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*"
    });
    response.write("404 Not Found\n");
    response.end();
}
//Parse and serve a YAML file
function ServeYAML(filename, response, URL) {
    var tf = filename;
    fs.readFile(filename, "utf8", function(err, file) {
        if (err) {
            response.writeHead(500, {
                "Content-Type": "text/plain"
            });
            response.write(err + "\n");
            response.end();
            return;
        }
        //global.log(tf);
        try {
            var deYAML = JSON.stringify(YAML.load(file));
        } catch (e) {
            global.log("error parsing YAML " + filename, 2);
            _404(response);
            return;
        }
        var type = "text/json";

        var callback = URL.query.callback;

        if (callback) {
            deYAML = callback + "(" + deYAML + ")";
            type = "application/javascript";
        }
        response.writeHead(200, {
            "Content-Type": type
        });
        response.write(deYAML, "utf8");
        response.end();

    });

}

function admin_instances(request, response, next) {


    var safePathRE = RegExp('/\//' + (libpath.sep == '/' ? '\/' : '\\') + '/g');
    var path = "../../public".replace(safePathRE);
    var URL = url.parse(request.url, true);
    URL.pathname = decodeURIComponent(URL.pathname);
    var uri = URL.pathname.replace(safePathRE);
    //obey some old VWF URL formatting
    if (uri.indexOf('/admin/'.replace(safePathRE)) != -1) {

        //gets a list of all active sessions on the server, and all clients
        if (uri.indexOf('/admin/instances'.replace(safePathRE)) != -1) {

            var data = {},
                tempLoginData;
            for (var i in global.instances.instances) {
                data[i] = {
                    clients: {}
                };
                for (var j in global.instances.instances[i].clients) {
                    if (global.instances.instances[i].clients[j].loginData) {
                        tempLoginData = global.instances.instances[i].clients[j].loginData;
                        data[i].clients[j] = {
                            UID: tempLoginData.UID,
                            loginTime: tempLoginData.loginTime,
                            lastUpdate: tempLoginData.lastUpdate
                        };
                    } else {
                        data[i].clients[j] = {
                            UID: 'anonymous'
                        };
                    }
                }
            }
            ServeJSON(data, response, URL);
            return;
        }

    }
    next();
}

function routeToAPI(request, response, next) {

    var safePathRE = RegExp('/\//' + (libpath.sep == '/' ? '\/' : '\\') + '/g');
    var path = "../../public".replace(safePathRE);
    var URL = url.parse(request.url, true);
    URL.pathname = decodeURIComponent(URL.pathname);
    var uri = URL.pathname.replace(safePathRE);
    //global.log( URL.pathname );

    //lets try to move this into the main app.get om node_vwf
    if (URL.pathname.toLowerCase().indexOf('/vwfdatamanager.svc/') != -1) {
        //Route to DataServer
        SandboxAPI.serve(request, response);
        return;
    }else
      next();

}
function handleRequest(request, response, next) {


    var safePathRE = RegExp('/\//' + (libpath.sep == '/' ? '\/' : '\\') + '/g');
    var path = "../../public".replace(safePathRE);
     var URL = url.parse(request.url, true);
    URL.pathname = decodeURIComponent(URL.pathname);
    var uri = URL.pathname.replace(safePathRE);
    
    if (URL.pathname == '/' || URL.pathname == '') {
        redirect(global.appPath + '/', response);
        return;
    }

    var filename = libpath.join(path, uri);
    var instance = Findinstance(filename);
    //global.log(instance);
    //remove the instance identifier from the request
    filename = filterinstance(filename, instance);

    async.waterfall([

            function serve_file_directly(callback) {
                existsCaseInsensitive(libpath.resolve(__dirname, filename), function(c1) {
                    if (c1) {
                        callback(null, true);
                    } else
                        callback(null, false);
                });
            },
            function serve_file_directly_yaml(resolved, callback) {
                //bail out of the step, the previous was successful
                if (resolved) {
                    callback(null, resolved);
                    return;
                }

                existsCaseInsensitive(libpath.resolve(__dirname, filename + ".yaml"), function(c2) {
                    if (c2) {
                        ServeYAML(libpath.resolve(__dirname, filename + ".yaml"), response, URL);
                        callback(true, true); //stop processing, we're done;
                    } else
                        callback(null, false);
                });
            },
            function map_to_support_file(resolved, callback) {
                //bail out of the step, the previous was successful
                if (resolved) {
                    callback(null, resolved);
                    return;
                }
                //try to find the correct support file 
                var appname = findAppName(filename);
                if (!appname) {

                    filename = filename.substr(19);
                    filename = "../".replace(safePathRE) + filename;
                    filename = filename.replace('vwf.example.com', 'proxy/vwf.example.com');

                } else {

                    filename = filename.substr(appname.length - 2);
                    if (appname == "")
                        filename = '../../support/client/lib/index.html'.replace(safePathRE);
                    else
                        filename = '../../support/client/lib/'.replace(safePathRE) + filename;
                }
                //this step never resolves the request, just modifies the filename
                callback(null, false);
            },

            function serve_support_file_yaml(resolved, callback) {
                //bail out of the step, the previous was successful
                if (resolved) {
                    callback(null, resolved);
                    return;
                }
                existsCaseInsensitive(libpath.resolve(__dirname, filename + '.yaml'), function(c4) {
                    if (c4) {
                        ServeYAML( libpath.resolve(__dirname, filename + '.yaml'), response, URL);
                        callback(true, true); //exit, we're done
                    } else
                        callback(null, false);
                });
            },
            function serve_support_file(resolved, callback) {
                //bail out of the step, the previous was successful
                if (resolved) {
                    callback(null, resolved);
                    return;
                }
                existsCaseInsensitive(libpath.resolve(__dirname, filename), function(c3) {
                    if (c3) {
                        fs.stat(resolveCase(libpath.resolve(__dirname, filename)), function(err, isDir) {
                            //server started throwing these when added case logic
                            if (err) {
                                _404(response);
                                return;
                            }
                            if (isDir.isDirectory()) {
                                callback(null, false);
                            } else {
                                ServeFile(request, resolveCase(libpath.resolve(__dirname, filename)), response, URL);
                                callback(true, true);
                            }
                        })

                    } else
                        callback(null, false);
                });
            },
            function check_exists(resolved, callback) {
                existsCaseInsensitive(libpath.resolve(__dirname, filename), function(c3) {
                    if (c3) {
                        callback(null, true);
                    } else {
                        _404(response);
                        callback(true, true);
                    }
                });
            },
            function check_isDir(resolved, callback) {
                fs.stat(resolveCase(libpath.resolve(__dirname, filename)), function(err, isDir) {
                    //server started throwing these when added case logic
                    if (err) {
                        _404(response);
                        callback(true, true);
                        return;
                    }
                    if (isDir.isDirectory()) {
                        callback(null, true);
                    } else {
                        ServeFile(request, filename, response, URL);
                        callback(true, true);
                    }
                });
            },
            function serve_directory_world(resolved, callback) {
                //if we got this far, filename is should be an existing directory;


                //two chances to allow lazy eval
                var appname = findAppName(filename);
                if (!appname)
                    appname = findAppName(filename + libpath.sep);

                //do not generate IDs on the fly, if an app name is given but no instance ID, redirect home.
                if (appname && instance == null) {
                    redirect(URL.pathname + "/index.html", response);
                    callback(true, true);
                    return;
                }
                //instance needs to end in a slash, so redirect but keep instance id
                if (appname && strEndsWith(URL.pathname, instance)) {
                    RedirectToInstance(request, response, appname, "");
                    callback(true, true);
                    return;
                }
                
                if(appname){ //at this point, it is a directory that is a vwf application.

                    //this is the bootstrap html. Must have instnace and appname
                    filename = '../../support/client/lib/index.html'.replace(safePathRE);

                    //when loading the bootstrap, you must have an instance that exists in the database
                    var instanceName = appname.substr(14).replace(/\//g, '_').replace(/\\/g, '_') + instance + "_";
                    DAL.getInstance(instanceName, function(data) {
                        if (data) {
                            ServeFile(request, filename, response, URL);
                            callback(true, true);
                            return;
                        } else {

                            require('./examples.js').getExampleData(instanceName, function(data) {
                                if (data) {
                                    ServeFile(request, filename, response, URL);
                                    callback(true, true);
                                    return;
                                } else {
                                    redirect("/", response);
                                    callback(true, true);
                                    return;
                                }


                            })

                        }
                    });
                
                }else{ //exists, is a dir, is not a VWF application, not directly a file, yaml, or support file
                    callback(null,false)
                }
            },
            function serve_directory_index(resolved,callback)
            {
                //no app name but is directory. Not listing directories, so try for index.html or 404
                //so, this is not a VWF application directory.
                //in this case, we redirect to add the slash if necessary.
                if (!strEndsWith(URL.pathname, '/')) {

                    _302(URL.pathname + '/', response);
                    callback(true, true);
                    return;
                } else {
                    //if this is a directory, and it ends in a slash, if there is an index.html
                    existsCaseInsensitive(libpath.join(filename, "index.html"), function(indexexists) {

                        if (indexexists) {
                            ServeFile(request, filename + libpath.sep + "index.html", response, URL);
                            callback(true, true);
                            return;
                        } else {
                            callback(null, false);
                            return;
                        }

                    });
                }
                callback(null, false);
                return;
            },
            function final_404(resolved,callback)
            {
                next(); // give up, return to express route stack
                callback(null, false);
            }
        ],
        function appserver_waterfall_complete(err, results) {


        });
} // close onRequest

exports.handleRequest = handleRequest;
exports.admin_instances = admin_instances;
exports.routeToAPI = routeToAPI;
exports.setDAL = setDAL;