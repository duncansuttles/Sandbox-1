var request = require('request');

//config keys
// _3DRAPI                 //the endpoint to use to access the service
// _3DRAPIKey              //the api key to use for all requests
// _3DRUser                //username server identifies itself as
// _3DRPassword            //pass for the server user
// _3DRUseAuth             //use anonymous access or not
//


//use this feature for development, when loading scenes that pull a lot of data from the 3DR
//this probably should not be used in production, let the client side cache and 3DR deal with this.
//however, useful for deveopers who disable client side cache

var cache = {};


var stream = require('stream');
var util = require('util');
// use Node.js Writable, otherwise load polyfill
var Writable = stream.Writable ||
    require('readable-stream').Writable;

var memStore = {};

/* Writable memory stream */
function WMStrm(key, options) {
    // allow use without new operator
    if (!(this instanceof WMStrm)) {
        return new WMStrm(key, options);
    }
    Writable.call(this, options); // init super
    this.key = key; // save key
    memStore[key] = new Buffer(''); // empty
}
util.inherits(WMStrm, Writable);

WMStrm.prototype._write = function(chunk, enc, cb) {
    // our memory store stores things in buffers
    var buffer = (Buffer.isBuffer(chunk)) ?
        chunk : // already is Buffer use it
        new Buffer(chunk, enc); // string, convert

    // concat to the buffer already there
    memStore[this.key] = Buffer.concat([memStore[this.key], buffer]);
    cb();
};





function Get3DRAPI() {
    return global.configuration._3DRAPI || "https://3dr.adlnet.gov/api/_3DRAPI.svc";
}

function Get3DRAPIKey() {
    return global.configuration._3DRAPIKey || "00-00-00";
}

function Get3DRUser() {
    return global.configuration._3DRUser || "AnonymousUser";
}

function Get3DRPassword() {
    return global.configuration._3DRPassword || "";
}

function GetUseAuth() {
    return global.configuration._3DRUseAuth || false;
}

function proxy(string, response) {

	var CACHE_3DR_DATA_IN_MEMORY = global.configuration.cache3DRData;
	
    if (CACHE_3DR_DATA_IN_MEMORY) {
        if (cache[string]) {
        	console.log('sending from 3DR cache');
            response.send(memStore[string]);
            return;
        }
    }

    if (CACHE_3DR_DATA_IN_MEMORY) {

        var cached = cache[string] = {};
        cached.status = response.statusCode;
        cached.headers = response.headers;
        cached.data = new WMStrm(string);

        //seems like you can't pipe twice, so load it twice and keep a copy
        request['get'](string).auth(Get3DRUser(), Get3DRPassword(), true).on('error', function(e) {

            console.log(e);
            response.writeHead(500);
            response.end();

        }).pipe(response);
        console.log('caching 3DR data')
        request['get'](string).auth(Get3DRUser(), Get3DRPassword(), true).on('error', function(e) {

            console.log(e);
            response.writeHead(500);
            response.end();

        }).pipe(cached.data);

        
    } else {

        request['get'](string).auth(Get3DRUser(), Get3DRPassword(), true).on('error', function(e) {

            console.log(e);
            response.writeHead(500);
            response.end();

        }).pipe(response)
    }

}

function proxyPermissions(URL, response) {

    var downloadstring = Get3DRAPI() + "/" + decodeURIComponent(URL.query.pid) + "/permissions/users/" + Get3DRUser() + "/json?ID=" + Get3DRAPIKey();
    proxy(downloadstring, response)
    //"https://3dr.adlnet.gov/api/rest/adl:667/permissions/users/psadmin@problemSolutions.net/json?ID=00-00-00"

}

function proxySearch(URL, response) {

    var searchstring = Get3DRAPI() + "/Search/" + decodeURIComponent(URL.query.search) + "/json?ID=" + Get3DRAPIKey();
    proxy(searchstring, response)
}

function proxyDownload(URL, response) {
    //https://3dr.adlnet.gov/api/_3DRAPI.svc/"+decodeURIComponent(URL.query.search)+"/Model/json/uncompressed?ID=00-00-00
    var downloadstring = Get3DRAPI() + "/" + decodeURIComponent(URL.query.pid) + "/Model/json/uncompressed?ID=" + Get3DRAPIKey();
    proxy(downloadstring, response)
}

function proxyMetadata(URL, response) {
    //https://3dr.adlnet.gov/api/_3DRAPI.svc/"+decodeURIComponent(URL.query.search)+"/Metadata/json?ID=00-00-00

    var searchstring = Get3DRAPI() + "/" + decodeURIComponent(URL.query.pid) + "/Metadata/json?ID=" + Get3DRAPIKey();
    proxy(searchstring, response)
}

function proxyTexture(URL, response) {
    //https://3dr.adlnet.gov/api/_3DRAPI.svc/"+decodeURIComponent(URL.query.pid)+"/textures/"+decodeURIComponent(URL.query.pid)+"?ID=00-00-00
    var searchstring = Get3DRAPI() + "/" + decodeURIComponent(URL.query.pid) + "/Textures/" + decodeURIComponent(URL.query.file) + "?ID=" + Get3DRAPIKey();
    proxy(searchstring, response)

}

function proxyThumbnail(URL, response) {
    //https://3dr.adlnet.gov/api/_3DRAPI.svc/"+decodeURIComponent(URL.query.pid)+"/Thumbnail?ID=00-00-00
    var searchstring = Get3DRAPI() + "/" + decodeURIComponent(URL.query.pid) + "/Thumbnail?ID=" + Get3DRAPIKey();
    proxy(searchstring, response)
}


function proxyUpload(req, response, URL) {

    //anonymous may not upload models
    if (!URL.loginData) {
        response.writeHead(500);
        response.end();
        return;
    }

    var error = function() {
        response.writeHead(500);
        response.end();
    };

    var searchstring = Get3DRAPI() + "/UploadModel?ID=" + Get3DRAPIKey();
    //did they upload a file?
    if (!req.files && !req.files.model) {
        response.writeHead(500);
        response.end();
        return;
    }
    //read the file
    fs.readFile(req.files.model.path, function(err, data) {
        //post to 3DR
        request['post']({
            uri: searchstring,
            body: data
        }, function(err, xhr, body) {

            //looks like post worked, lets get metadata
            var PID = eval(body);
            var searchstring = Get3DRAPI() + "/" + PID + "/Metadata/json?ID=" + Get3DRAPIKey();
            request['get'](searchstring, function(err2, xhr2, metadata) {

                metadata = JSON.parse(metadata);

                //set the metadata
                metadata.Title = decodeURIComponent(req.query.title);
                metadata.Description = decodeURIComponent(req.query.description);
                metadata.ArtistName = URL.loginData.UID;

                //save metadata to server
                request['post']({
                    uri: searchstring,
                    body: JSON.stringify(metadata)
                }, function(err3, xhr3, body3) {
                    response.writeHead(200);
                    //return the PID of the new model to the client
                    response.write(body);
                    response.end();
                }).auth(Get3DRUser(), Get3DRPassword(), true).on('error', error);
            }).auth(Get3DRUser(), Get3DRPassword(), true).on('error', error);
        }).auth(Get3DRUser(), Get3DRPassword(), true).on('error', error);
    });
}


exports.proxySearch = proxySearch;
exports.proxyDownload = proxyDownload;
exports.proxyMetadata = proxyMetadata;
exports.proxyTexture = proxyTexture;
exports.proxyThumbnail = proxyThumbnail;
exports.proxyPermissions = proxyPermissions;
exports.proxyUpload = proxyUpload;