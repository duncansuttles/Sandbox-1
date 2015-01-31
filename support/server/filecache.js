var libpath = require('path'),
    fs = require('fs-extra'),
    url = require("url"),
    mime = require('mime'),
    YAML = require('js-yaml');
var zlib = require('zlib');
var compressor = require('node-minify');
var async = require('async');
var resolveCase = require('./resolveCaseInsensitiveFilename').resolveName;
var logger = require('./logger');
//***node, uses REGEX, escape properly!
function strEndsWith(str, suffix) {
    return str.match(suffix + "$") == suffix;
}

function hash(str) {
    return require('crypto').createHash('md5').update(str).digest("hex");
}

function _FileCache() {
    this.files = [];
    this.enabled = true;
    this.clear = function() {
        this.files.length = 0;
    }
    this.dirCache = {};
    //return true if the file on disk is the same caps as the request
    this.proofFileCaps = function(d) {
        try {
            var dir = d.substr(0, d.replace(/\\/g, '/').lastIndexOf('/'));
            var name = d.substr(1 + d.replace(/\\/g, '/').lastIndexOf('/'));
            if (!this.dirCache[d])
                this.dirCache[d] = fs.readdirSync(dir);

            //just in case the file was added or renames, reload the cache entry for this file when the 
            //test is bad
            if (this.dirCache[d].indexOf(name) == -1)
                this.dirCache[d] = fs.readdirSync(dir);

            //well, if the raw string compare does not show the dir contains the same file
            //***string case sensitive compare***
            //return false;
            return this.dirCache[d].indexOf(name) > -1
        } catch (e) {
            //in case of errors (where the dir does not exist) just do whatever the system did before
            //why do we even attempt to serve in this case? is the check for actual file existance later?
            logger.error(e);
            return true;
        }

    }
    this.minAllSupportScripts = function(cb)
    {
        
        var files = []
        var self = this;
        function recurseFindJs(dir,nextdir)
        {
            if(!nextdir)nextdir = function(){logger.warn('build complete')};
            var files = fs.readdirSync(dir);
            async.eachSeries(files,function(filename,nextfile)
            {
                var file = libpath.join(dir,filename);
                logger.info(file);
                if(file === 'build')
                {
                    nextfile();
                }
                else if(strEndsWith(file,".js_min.js"))
                {
                    nextfile();
                }
                else if (fs.statSync(file).isDirectory())
                {
                    recurseFindJs(file,nextfile);
                }
                else if(strEndsWith(file,".js") || strEndsWith(file,".css"))
                {
                    //if there is already a file in the build dir for this file skip
                    if(self.resolveBuildFilename(file))
                    {
                        logger.warn('skipping build for file ' + file);
                        nextfile();
                    }
                    else //we need to build and save the file
                    {
                        var dirout = libpath.dirname(file);
                        var _dirname = libpath.resolve(libpath.join(__dirname,'..','..'));
                        dirout = dirout.replace(_dirname,libpath.join(_dirname,'build'));
                        fs.mkdirsSync(dirout);

                        //if the file is not served from /build, and min is enabled, it will be minned
                        self.getFile(file,function(fileentry){
                            if(fileentry)
                                fs.writeFileSync(libpath.join(dirout,filename),fileentry.data);
                            nextfile();
                        });
                    }
                }else
                {
                    nextfile();
                }
            },function dircomplete()
            {
                nextdir();
            });
        }
        recurseFindJs(libpath.resolve('./support'),cb);
    }
    this.insertFile = function(path,contents,stats,datatype,cb)
    {
        if(!(path instanceof Array))
            path = [path];
        zlib.gzip(contents, function(_, zippeddata) {

            for(var i = 0; i < path.length; i ++)
            {
                var newentry = {};
                newentry.path = path[i];
                newentry.data = contents;
                newentry.stats = stats;
                newentry.zippeddata = zippeddata;
                newentry.datatype = "utf8";
                newentry.hash = require("./filecache.js").hash(contents);
                FileCache.files.push(newentry);
            }
            cb();
        });

    }
    this.resolveBuildFilename = function(file)
    {
        var dirout = libpath.dirname(file);
        var fileout = libpath.basename(file);
        var _dirname = libpath.resolve(libpath.join(__dirname,'..','..'));
        dirout = dirout.replace(_dirname,libpath.join(_dirname,'build'));
        var tocheck = libpath.join(dirout,fileout);
        if(fs.existsSync(tocheck))
        {
            console.info('serve from build: ' + tocheck);
            return tocheck;
        }
        return null;
    }
    this.getDataType = function(file) {
        var type = file.substr(file.lastIndexOf('.') + 1).toLowerCase();
        if (type === 'js' || type === 'html' || type === 'xml' || type === 'txt' || type === 'xhtml' || type === 'css') {
            return "utf8";
        } else return "binary";
    }
    //Get the file entry, or load it
    this.getFile = function(path, callback) {
        path = libpath.normalize(path);
        path = libpath.resolve(__dirname, path);
        //force file capitalization to be correct, even on windows

        /*   if (!FileCache.proofFileCaps(path)) {
                    callback(null);
                    return;
                }
                */
        //ok, the above code forces correct capitalizaion even when the file system does not
        //this broke a lot of old content
        //the below code fixes the caps to be correct for the file on the drive, basically makeing
        //the whole process insensitive, even if the filesystem is. Note: probably doing a lot of 
        //unnecessary work if we could know that the filesystem is not sensitive, maybe from a config value
        path = resolveCase(path);

        path = libpath.normalize(path);

        //here, we see if there is a build file that matches, but is under the build directory
        var buildName = this.resolveBuildFilename(path);
        if(buildName && this.minify)
            path = buildName;

        var self = this;
        //Cannot escape above the application paths!!!!
        if (path.toLowerCase().indexOf(libpath.resolve(__dirname, '../../').toLowerCase()) != 0 && path.toLowerCase().indexOf(global.datapath.toLowerCase()) != 0) {
            logger.error(path + " is illegal",3);
            callback(null);
            return;
        }
        //Cannot have the users.db!
        if (path.toLowerCase().indexOf('users.db') != -1) {
            logger.error(path + " is illegal",3);
            callback(null);
            return;
        }

        //Find the record
        for (var i = 0; i < this.files.length; i++) {
            if (this.files[i].path == path) {
                logger.info('serving from cache: ' + path, 2);
                //Callback with the record
                callback(this.files[i]);
                return;
            }
        }
        // if got here, have no record;
        var datatype = this.getDataType(path);
        //Read the raw file
        fs.readFile(path, function(err, file) {
            fs.stat(path, function(err, stats) {



                if (!path) {
                    callback(null);
                    return;
                }
                var self = this;
                //Call this after minify, or right away if not js or minify disabled
                var preMin = function(file) {
                        if (file) {
                            //gzip the data
                            zlib.gzip(file, function(_, zippeddata) {
                                //record the data
                                var newentry = {};

                                //logger.info(file.length);
                                newentry.path = path;
                                newentry.data = file;
                                newentry.stats = stats;
                                newentry.zippeddata = zippeddata;
                                newentry.contentlength = file.length;
                                newentry.datatype = datatype;
                                newentry.hash = hash(file);

                                logger.debug(newentry.hash, 2);
                                logger.info('loading into cache: ' + path, 2);

                                // if enabled, cache in memory
                                if (FileCache.enabled == true) {
                                    logger.info('cache ' + path, 2);
                                    FileCache.files.push(newentry);

                                    //minify is currently not compatable with auto-watch of files
                                    if (!FileCache.minify) {
                                        //reload files that change on disk
                                        var watcher = fs.watch(path, {}, function(event, filename) {



                                            logger.info(newentry.path + ' has changed on disk', 2);
                                            FileCache.files.splice(FileCache.files.indexOf(newentry), 1);

                                        });
                                        watcher.on('error', function(e) {
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
                    //or if loaded from build dir
                if (!FileCache.minify || buildName) {
                    preMin(file);
                } else {
                    //if minifying and ends with js
                    if (strEndsWith(path, 'js')) {
                        //compress the JS then gzip and save the results
                        logger.info('minify ' + path);
                        var fileOut = path+'_min.js';
                        console.log(fileOut);
                        new compressor.minify({
                            type: 'uglifyjs',
                            fileIn: path,
                            fileOut: fileOut,
                            callback: function(err, min) {

                                if (err)
                                {
                                    logger.error("minify: " + err);
                                    preMin(file)
                                }
                                else {
                                    //remove the file on disk - cached in memory
                                    fs.unlinkSync(fileOut);
                                    //completed minify, go ahead and cache and serve
                                    preMin(min);
                                }
                            }
                        });
                    }
                    // likewise, try to minify the css
                    else if (strEndsWith(path, 'css')) {
                        //compress the css then gzip and save the results
                        logger.error('minify ' + path);
                        new compressor.minify({
                            type: 'sqwish',
                            fileIn: path,
                            fileOut: path + '_min.css',
                            callback: function(err, min) {

                                if (err)
                                {
                                    logger.error(err);
                                    preMin(file)
                                }
                                else {
                                    //remove the file on disk - cached in memory
                                    fs.unlinkSync(path + '_min.css');
                                    //completed minify, go ahead and cache and serve
                                    preMin(min);
                                }
                            }
                        });
                    } else {
                        //minifying, but not a file that can minify
                        preMin(file);
                    }

                }
            });
        });
    } // end getFile
    //Serve a file, takes absolute path
    //TODO, handle streaming of audio and video
    this.ServeFile = function(request, filename, response, URL) {
        //check if already loaded
        FileCache.getFile(filename, function(file) {
            //error if not found
            if (!file) {
                response.writeHead(404, {
                    "Content-Type": "text/plain"
                });
                response.write('file not found' + "\n");
                response.end();
                return;
            }
            //get the type
            var type = mime.lookup(filename);

            //deal with the ETAG
            if (request.headers['if-none-match'] === file.hash) {
                response.writeHead(304, {
                    "Content-Type": type,
                    "Last-Modified": file.stats.mtime,
                    "ETag": file.hash,
                    "Cache-Control": "public; max-age=31536000",

                });
                response.end();
                return;
            }

            //If the clinet can take the gzipped encoding, send that
            if (request.headers['accept-encoding'] && request.headers['accept-encoding'].indexOf('gzip') >= 0 && !global.configuration.disableGZip) {
                response.writeHead(200, {
                    "Content-Type": type,
                    "Last-Modified": file.stats.mtime,
                    "ETag": file.hash,
                    "Cache-Control": "public; max-age=31536000",
                    'Content-Encoding': 'gzip',
                    "x-vwf-length": (file.contentlength + ''),
                });
                response.write(file.zippeddata, file.datatype);


            }
            //if the client cannot accept the gzip, send raw
            else {
                if (!request.headers['range']) {
                    response.writeHead(200, {
                        "Content-Type": type,
                        "x-vwf-length": (file.contentlength + ''),
                        "Last-Modified": file.stats.mtime,
                        "ETag": file.hash,
                        "Cache-Control": "public; max-age=31536000"

                    });
                    response.write(file.data, file.datatype);
                } else {

                    var range = request.headers['range'];
                    range = range.split('=')[1];
                    var ranges = range.split('-');
                    var start = parseInt(ranges[0]);
                    var end = parseInt(ranges[1]) || (file.contentlength - 1);


                    var bytesheader = 'bytes ' + start + '-' + end + '/' + file.contentlength;

                    response.writeHead(206, {
                        "Content-Type": type,
                        "Content-Length": (end - start) + 1,
                        "Last-Modified": file.stats.mtime,
                        "ETag": file.hash,
                        "Cache-Control": "public; max-age=31536000",
                        "Accept-Ranges": "bytes",
                        "Content-Range": bytesheader
                    });
                    var newdata = file.data.slice(start, end + 1);
                    response.write(newdata, file.datatype);
                }
            }


            response.end();


        });
    }
} //end FileCache

exports._FileCache = _FileCache;
exports.hash = hash;