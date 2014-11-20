var path = require('path');
var fs = require('fs');

var fsCache = {};

function sum(array, start, end) {
    var ret = array[start];
    for (var i = start + 1; i < end; i++) {
        ret = path.join(ret, array[i]);
    }

    return ret;
}

function readdirSync(dir) {
    
    return fs.readdirSync(dir);
}

function resolveOneLevel(localpath, file) {
    //read twice, caching first time. Before bailing, read directory for real, in case contents have changed. note that continously 
    //looking for a file that is not there has a pretty big performacne cost, as we have to reload the dir contents synchronously each
    //time
    try {
        for (var j = 0; j < 2; j++) {
            var files = (j == 0 && fsCache[localpath + path.sep]) || readdirSync(localpath + path.sep);
            fsCache[localpath + path.sep] = files;
            var ret = null;
            for (var i = 0; i < files.length; i++) {
                if (file.toLowerCase() == files[i].toLowerCase()) {
                    return files[i];
                }
            }
        }
    } catch (e) {
        console.log(e);
    }
    return null;

}

function resolveName(localPath) {
    
    var parts = path.normalize(localPath).split(path.sep);

    parts[0] = parts[0] || '/';
    for (var i = 1; i < parts.length; i++) {

        parts[i] = resolveOneLevel(sum(parts, 0, i), parts[i]);
        if (parts[i] === null) {
            return null;
        }

    }
    return parts.join(path.sep);
}

function exists(localPath, cb) {
    localPath = resolveName(localPath);
    if (localPath !== null)
        cb(true)
    else
        cb(false);
}

function existsSync(localPath, cb) {
    localPath = resolveName(localPath);
    return localPath !== null;
}
exports.resolveName = resolveName;
exports.exists = exists;
exports.existsSync = existsSync;