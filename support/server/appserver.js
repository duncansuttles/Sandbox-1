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

function setDAL(dal)
{
    DAL = dal;
}
    //***node, uses REGEX, escape properly!
function strEndsWith(str, suffix) {
    return str.match(suffix+"$")==suffix;
}

//302 redirect
function _302(url,response)
{
  response.writeHead(302, {
    "Location": url 
  });
  response.end();
}

// pick the application name out of the URL by finding the index.vwf.yaml
// Cache - this means that adding applications to the server will requrie a restart
var  appNameCache = [];
function findAppName(uri)
{
        
    var current = "."+libpath.sep;
    var testcache = (current + uri);
    
    //cache and avoid some sync directory operations
    for(var i =0; i < appNameCache.length; i++)
    {
        if(testcache.indexOf(appNameCache[i]) ==0)
        {
            
            return appNameCache[i];
        }
    }
    while(!fs.existsSync(libpath.resolve(__dirname, current+"index.vwf.yaml")))
    {   
        
        var next = uri.substr(0,Math.max(uri.indexOf('/'),uri.indexOf('\\'))+1);
        current += next;
        if(!next)
            break;
        
        
        uri = uri.substr(next.length);
    }
    if(fs.existsSync(libpath.resolve(__dirname,current+"index.vwf.yaml")))
    {
        
        appNameCache.push(current);
        return current;
    }
    return null;    
}

//Generate a random ID for a instance
var ValidIDChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";


//Serve a JSON object
function ServeJSON(jsonobject,response,URL)
{
            
            response.writeHead(200, {
                "Content-Type": "text/json"
            });
            response.write(JSON.stringify(jsonobject), "utf8");
            response.end();
            
}

//amke a random VWF Instance id
function makeid()
{
    var text = "";
    

    for( var i=0; i < 16; i++ )
        text += ValidIDChars.charAt(Math.floor(Math.random() * ValidIDChars.length));

    return text;
}
var WaitingForConnection = 0;
var Active = 1;
var Dead = 2;

function instance(inid)
{
    this.id = inid;
    this.state = WaitingForConnection;
    this.clients = 0;
}

//Redirect the user to a new instance
function RedirectToInstance(request,response,appname,newid)
{
    if(newid === undefined)
        newid = makeid() + "/";
    
    var query = (url.parse(request.url).query) || "";
    if(query)
    {
        query = '?'+query;
        newid += query;
    }
    
    
    var path = url.parse(request.url).pathname;
    if(path[path-1] != '/')
        newid = path.substr(path.indexOf('/')) + '/' + newid;
    newid = newid.replace(/\/\//g,'/');
    newid = newid.replace(/\/\/\//g,'/');
    
    
    redirect(newid,response);           
}

//Redirect, just used on some invalid paths
function redirect(url,response)
{
    url = url.replace(/\\\\/g,'/');
    url = url.replace(/\\/g,'/');
    url = url.replace(/\/\//g,'/');
    
    url = url.replace(/\/\/\//g,'/');
    //url = url.replace('http://','');
    url = url.replace(/\/\/\//g,"/");
    url = url.replace(/\/\/\/\//g,"/");
    //url = 'http://' + url;
    response.writeHead(200, {
        "Content-Type": "text/html" 
    });
    response.write( "<html>" +
                    "<head>" +
                    "   <title>Virtual World Framework</title>" +
                    "   <meta http-equiv=\"REFRESH\" content=\"0;url="+url+"\">" +
                    "</head>" +
                    "<body>" +
                    "</body>" +
                    "</html>");
    response.end();
    return;
}
//Find the instance(instance) ID in a URL
function Findinstance(uri)
{
    //find the application name
    var app = findAppName(uri);
    
    if(!app)
        return null;
    //remove the application name   
    var minusapp = uri.substr(app.length-2);
    var parts = minusapp.split(libpath.sep);
    var testapp = parts[0];
    
    //Really, any slash delimited string after the app name should work
    //sticking with 16 characters for now 
    if(testapp.indexOf('example') == 0 && testapp.indexOf('.') == -1)
    {
        return testapp;
    }
    if(testapp.length == 16)
    {
        for(var i = 0; i < 16; i++)
        {
            if(ValidIDChars.indexOf(testapp[i]) == -1)
                return null;
        }

        return testapp;
    }
    return null;
}
//Remove the instance identifer from the URL
function filterinstance(uri,instance)
{
    return uri.replace(instance+libpath.sep,'').replace(instance,libpath.sep);
}

function hash(str)
{
    return require('crypto').createHash('md5').update(str).digest("hex");
}




//Just serve a simple file
function ServeFile(request,filename,response,URL)
{
    FileCache.ServeFile(request,filename,response,URL)
}
//Return a 404 not found coude
function _404(response)
{
            response.writeHead(404, {
                "Content-Type": "text/plain",
                "Access-Control-Allow-Origin": "*"
                });
                response.write("404 Not Found\n");
                response.end();
}
//Parse and serve a YAML file
function ServeYAML(filename,response, URL)
{
        var tf = filename;
        fs.readFile(filename, "utf8", function (err, file) {
            if (err) {
                response.writeHead(500, {
                    "Content-Type": "text/plain"
                });
                response.write(err + "\n");
                response.end();
                return;
            }
            //global.log(tf);
            try{
            var deYAML = JSON.stringify(YAML.load(file));
            }catch(e)
            {
                global.log("error parsing YAML " + filename );
                _404(response);
                return;
            }
            var type = "text/json";
            
            var callback = URL.query.callback;
            
            if(callback)
            {
                deYAML = callback+"(" + deYAML + ")";
                type = "application/javascript";
            }
            response.writeHead(200, {
                "Content-Type": type
            });
            response.write(deYAML, "utf8");
            response.end();
            
        });

}


    function handleRequest(request, response,next) 
    {
    
        try{
            var safePathRE = RegExp('/\//'+(libpath.sep=='/' ? '\/' : '\\')+'/g');
            var path = "../../public".replace(safePathRE);
            


            var URL = url.parse(request.url,true);
            URL.pathname = decodeURIComponent(URL.pathname);
            var uri = URL.pathname.replace(safePathRE);
            //global.log( URL.pathname );
            
            //lets try to move this into the main app.get om node_vwf
            if(URL.pathname.toLowerCase().indexOf('/vwfdatamanager.svc/') != -1)
            {
                //Route to DataServer
                SandboxAPI.serve(request,response);
                return;
            }
            if(URL.pathname == '/' || URL.pathname == '')
            {
                redirect(global.appPath+'/',response);
                return;
            }
            
            var filename = libpath.join(path, uri);
            var instance = Findinstance(filename);
            //global.log(instance);
            //remove the instance identifier from the request
            filename = filterinstance(filename,instance);
            
            
            //obey some old VWF URL formatting
            if(uri.indexOf('/admin/'.replace(safePathRE)) != -1)
            {
                
                //gets a list of all active sessions on the server, and all clients
                if(uri.indexOf('/admin/instances'.replace(safePathRE)) != -1)
                {   
                    
                    var data = {}, tempLoginData;
                    for(var i in global.instances)
                    {
                        data[i] = {clients:{}};
                        for(var j in global.instances[i].clients)
                        {
                            tempLoginData = global.instances[i].clients[j].loginData;
                            data[i].clients[j] = {UID: tempLoginData.UID, loginTime: tempLoginData.loginTime, lastUpdate: tempLoginData.lastUpdate};
                        }
                    }
                    ServeJSON(data,response,URL);
                    return;
                }
                
            }
            //file is not found - serve index or map to support files
            //file is also not a yaml document
            var c1;
            var c2;
            
            
            //global.log(filename);
            libpath.exists(libpath.resolve(__dirname,filename),function(c1){
                libpath.exists(libpath.resolve(__dirname,filename+".yaml"),function(c2){
                    if(!c1 && !c2)
                    {
                            
                         //try to find the correct support file 
                         var appname = findAppName(filename);
                         if(!appname)
                         {
                            
                                filename = filename.substr(19);
                                filename = "../".replace(safePathRE) + filename;
                                filename = filename.replace('vwf.example.com','proxy/vwf.example.com');
                                
                         }
                         else
                         {
                                
                             filename = filename.substr(appname.length-2);
                             if(appname == "")
                                filename = '../../support/client/lib/index.html'.replace(safePathRE);
                             else   
                                filename = '../../support/client/lib/'.replace(safePathRE) + filename;
                            
                         }

                    }
                      
                    //file does exist, serve normally 
                    libpath.exists( libpath.resolve(__dirname,filename),function(c3){
                        libpath.exists( libpath.resolve(__dirname,filename +".yaml"),function(c4){
                            if(c3)
                            {
                                //if requesting directory, setup instance
                                //also, redirect to current instnace name of does not end in slash
                                fs.stat(libpath.resolve(__dirname,filename),function(err,isDir)
                                {
                                    if (isDir.isDirectory()) 
                                    {
                                        
                                        var appname = findAppName(filename);
                                        if(!appname)
                                            appname = findAppName(filename+libpath.sep);
                                        
                                        //no instance id is given, new instance
                                        if(appname && instance == null)
                                        {           
                                            //GenerateNewInstance(request,response,appname);
                                            
                                            
                                            redirect(URL.pathname+"/index.html",response);
                                            //global.log('redirect ' + appname+"./index.html");
                                            return;
                                        }
                                        //instance needs to end in a slash, so redirect but keep instance id
                                        if(appname && strEndsWith(URL.pathname,instance))
                                        {
                                            RedirectToInstance(request,response,appname,"");
                                            return;
                                        }
                                        //no app name but is directory. Not listing directories, so try for index.html or 404
                                        if(!appname)
                                        {
                                            if(!strEndsWith(URL.pathname, '/'))
                                            {
                                                global.log(filename);
                                                _302(URL.pathname+'/',response);
                                            }
                                            else
                                            {
                                                fs.exists(libpath.join(filename , "index.html") ,function(indexexists){

                                                    if(indexexists)
                                                        ServeFile(request,filename + libpath.sep + "index.html",response,URL);
                                                    else
                                                        next();//_404(response);

                                                });
                                            }
                                            
                                            
                                            return;
                                        }
                                        
                                        //this is the bootstrap html. Must have instnace and appname
                                        filename = '../../support/client/lib/index.html'.replace(safePathRE);
                                        
                                        //when loading the bootstrap, you must have an instance that exists in the database
                                        global.log('Appname:', appname);
                                        var instanceName = appname.substr(14).replace(/\//g,'_').replace(/\\/g,'_') + instance + "_";
                                        DAL.getInstance(instanceName,function(data)
                                        {
                                            if(data)
                                                ServeFile(request,filename,response,URL);
                                            else {
                                                
                                                require('./examples.js').getExampleData(instanceName,function(data){
                                                    if(data)
                                                    {
                                                        ServeFile(request,filename,response,URL);
                                                    }else
                                                    {
                                                         redirect("/",response);         
                                                    }


                                                })
                                               
                                            }
                                        });
                                        return;
                                    }
                                    //just serve the file
                                    ServeFile(request,filename,response,URL);
                                });
                            }
                            else if(c4)
                            {
                                //was not found, but found if appending .yaml. Serve as yaml
                                ServeYAML(libpath.resolve(__dirname,filename) +".yaml",response,URL);

                            }
                            // is an admin call, currently only serving instances
                            else
                            {
                                global.log("404 : " + filename)
                                //_404(response);
                                next();
                                
                                return;
                            }
                        });
                    });
                }); 
            });
        }
        catch(e)
        {
                response.writeHead(500, {
                    "Content-Type": "text/plain"
                });
                response.write(e.toString(), "utf8");
                response.end();
        }
    } // close onRequest

exports.handleRequest = handleRequest;    
exports.setDAL = setDAL;
