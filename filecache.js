
var libpath = require('path'),
fs = require('fs'),
url = require("url"),
mime = require('mime'),
YAML = require('js-yaml');
var zlib = require('zlib');
var compressor = require('node-minify');
var async = require('async');

    //***node, uses REGEX, escape properly!
function strEndsWith(str, suffix) {
    return str.match(suffix+"$")==suffix;
}

function hash(str)
{
    return require('crypto').createHash('md5').update(str).digest("hex");
}

function _FileCache() 
{
    this.files = [];
    this.enabled = true;
    this.clear = function()
    {
        this.files.length = 0;
    }
    this.getDataType = function(file)
    {
        var type = file.substr(file.lastIndexOf('.')+1).toLowerCase();
        if(type === 'js' || type === 'html' || type === 'xml' || type === 'txt' || type === 'xhtml' || type === 'css')
        {
            return "utf8";
        }
        else return "binary";
    }
    //Get the file entry, or load it
    this.getFile = function(path,callback)
    {
        path = libpath.normalize(path);
        path = libpath.resolve(__dirname, path);
        
        //Cannot escape above the application paths!!!!
        if(path.toLowerCase().indexOf(__dirname.toLowerCase()) != 0 && path.toLowerCase().indexOf(global.datapath.toLowerCase()) != 0)
        {
            global.error(path + " is illegal");
            callback(null);
            return;
        }
        //Cannot have the users.db!
        if(path.toLowerCase().indexOf('users.db') != -1)
        {
            global.error(path + " is illegal");
            callback(null);
            return;
        }
        
        //Find the record
        for(var i =0; i < this.files.length; i++)
        {
            if(this.files[i].path == path)
            {   
                global.log('serving from cache: ' + path,2);
                //Callback with the record
                callback(this.files[i]);
                return;
            }
        }
        // if got here, have no record;
        var datatype = this.getDataType(path);
        //Read the raw file
        fs.readFile(path,function(err,file){
            fs.stat(path,function(err,stats)
            {
                var self = this;
                //Call this after minify, or right away if not js or minify disabled
                var preMin = function(file)
                {
                    if(file)
                    {
                        //gzip the data
                        zlib.gzip(file,function(_,zippeddata)
                        {
                            //record the data
                            var newentry = {};
                            
                            //global.log(file.length);
                            newentry.path = path;
                            newentry.data = file;
                            newentry.stats = stats;
                            newentry.zippeddata = zippeddata;
                            newentry.contentlength = file.length;
                            newentry.datatype = datatype;
                            newentry.hash = hash(file);
                            
                            global.log(newentry.hash,2);
                            global.log('loading into cache: ' + path,2);
                            
                            // if enabled, cache in memory
                            if(FileCache.enabled == true)
                            {
                                global.log('cache ' + path,2); 
                                FileCache.files.push(newentry);
                                
                                //minify is currently not compatable with auto-watch of files
                                if(!FileCache.minify)
                                {
                                    //reload files that change on disk
                                    var watcher = fs.watch(path,{},function(event,filename){
                                    
                                    
                                    
                                        global.log(newentry.path + ' has changed on disk',2);
                                        FileCache.files.splice(FileCache.files.indexOf(newentry),1);
                                    
                                    });
                                    watcher.on('error',function(e)
                                    {
                                        this.close();
                                    })
                                }
                            }
                            //send the record to the caller . Usually FileCache.serveFile
                            callback(newentry);
                            return;
                        });
                        return;
                    }
                    callback(null);
                }
                //Send right away if not minifying
                if(!FileCache.minify)
                {
                    
                    preMin(file);
                }
                else
                {
                    //if minifying and ends with js
                    if(strEndsWith(path,'js'))
                    {
                        //compress the JS then gzip and save the results
                        global.log('minify ' + path);
                        new compressor.minify({
                            type: 'uglifyjs',
                            fileIn: path,
                            fileOut: path+'_min.js',
                            callback: function(err, min){
                            
                            if(err)
                                preMin(file)
                            else
                            {   
                            //remove the file on disk - cached in memory
                            fs.unlinkSync(path+'_min.js');
                            //completed minify, go ahead and cache and serve
                            preMin(min);
                            }
                            }
                        });
                    }
                    // likewise, try to minify the css
                    else if(strEndsWith(path,'css'))
                    {
                        //compress the css then gzip and save the results
                        global.log('minify ' + path);
                        new compressor.minify({
                            type: 'yui-css',
                            fileIn: path,
                            fileOut: path+'_min.css',
                            callback: function(err, min){
                            
                            if(err)
                                preMin(file)
                            else
                            {   
                            //remove the file on disk - cached in memory
                            fs.unlinkSync(path+'_min.css');
                            //completed minify, go ahead and cache and serve
                            preMin(min);
                            }
                            }
                        });
                    }else
                    {
                        //minifying, but not a file that can minify
                        preMin(file);
                    }

                }               
            });
        });
    } // end getFile
    //Serve a file, takes absolute path
    //TODO, handle streaming of audio and video
    this.ServeFile = function(request,filename,response,URL)
    {
        //check if already loaded
        FileCache.getFile(filename,function(file)
        {
            //error if not found
            if (!file) {
                response.writeHead(500, {
                    "Content-Type": "text/plain"
                });
                response.write('file load error' + "\n");
                response.end();
                return;
            }
            //get the type
            var type = mime.lookup(filename);
            
            //deal with the ETAG
            if(request.headers['if-none-match'] === file.hash)
            {
                response.writeHead(304, {
                "Content-Type": type,
                "Last-Modified": file.stats.mtime,
                "ETag": file.hash,
                "Cache-Control":"public; max-age=31536000" ,
                
                });
                response.end();
                return;
            }
            
            //If the clinet can take the gzipped encoding, send that
            if(request.headers['accept-encoding'] && request.headers['accept-encoding'].indexOf('gzip') >= 0)
            {
                response.writeHead(200, {
                    "Content-Type": type,
                    "Last-Modified": file.stats.mtime,
                    "ETag": file.hash,
                    "Cache-Control":"public; max-age=31536000" ,
                    'Content-Encoding': 'gzip',
                    "x-vwf-length": (file.contentlength + ''),
                });
                response.write(file.zippeddata, file.datatype);
            
            
            }
            //if the client cannot accept the gzip, send raw
            else
            {
                response.writeHead(200, {
                    "Content-Type": type,
                    "x-vwf-length":(file.contentlength + ''),
                    "Last-Modified": file.stats.mtime,
                    "ETag": file.hash,
                    "Cache-Control":"public; max-age=31536000"
                    
                });
                response.write(file.data, file.datatype);
            }
            
            
            response.end();
            
        
        }); 
    }
}  //end FileCache

exports._FileCache = _FileCache;
exports.hash = hash;
