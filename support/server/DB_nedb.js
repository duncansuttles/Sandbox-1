//database abstraction layer
//this little layer exists just to let up swap the DB totally painlessly in the future

var libpath = require('path');
var DB;
var GUID = require('node-uuid').v4;

var logger = require('./logger');
exports.new = function(DBTablePath, cb) {

   // if we're clustering, then load the cluster driver, otherwise load the local driver
    if(global.configuration.cluster)
        return require('./DB_nedb_cluster.js').new(DBTablePath,cb);
    else 
        return (function() {
        var DB = null;
        var proxy = {
            DBTablePath: DBTablePath,
            get: function(key, cb) {
                DB.find({
                    _key: key
                }, function(err, docs) {



                    if (docs[0]) {
                        delete docs[0]._id;
                        cb(err, JSON.parse(JSON.stringify(docs[0].val)), docs[0]._key);
                    } else
                        cb(err, null, key);
                });
            },
            save: function(key, data, cb) {
                data = JSON.parse(JSON.stringify(data));
                data = {
                    val: data
                };
                key = key || GUID();

                data._key = key;
                delete data._id;

                DB.remove({
                    _key: key
                }, {
                    multi: true
                }, function(err, numRemoved) {


                    DB.insert(data, function(err, newDoc) {

                        cb(err, data, newDoc._key);
                    })
                });
            },
            update: function(key, data, cb) {
                data = JSON.parse(JSON.stringify(data));
                data = {
                    val: data
                };
                key = key || GUID();

                data._key = key;
                delete data._id;

                DB.update({
                    _key: key
                }, data, {}, function(err, numReplaced, newdoc) {

                    cb();
                })
            },
            find: function(key, data, cb) {
                DB.find(key, data, cb);
            },
            find_raw: function(key, cb) {
                return DB.find(key, cb);
            },
            find_advanced:function(query,start,sort,limit,cb)
            {
                DB.find(query).sort(sort).skip(start).limit(limit).exec(function(err,data)
                    {
                        cb(err,data);
                    });
            },
            remove: function(key, cb) {
                this.get(key, function(err, doc, key) {
                    DB.remove({
                        _key: key
                    }, {
                        multi: true
                    }, function(err, numRemoved) {
                        cb(err, doc, key);
                    });

                });
            },
            listAppend: function(listKey, value, cb) {
                DB.update({
                    _key: listKey
                }, {
                    $push: {
                        val: value
                    }
                }, function(err, num, newDoc) {
                    cb(err, newDoc, listKey);
                })
            },
            listDepend: function(listKey, value, cb) {
                DB.update({
                    _key: listKey
                }, {
                    $pull: {
                        val: value
                    }
                }, function(err, num, newDoc) {
                    cb(err, newDoc, listKey);
                })
            },

        };
        var Datastore = require('nedb');
        DB = new Datastore({
            filename: DBTablePath,
            autoload: false
        });

        DB.loadDatabase(function(err) { // Callback is optional

            DB.ensureIndex({
                fieldName: '_key',
                unique: true
            }, function(err) {
                cb(proxy);
            });

        });

        return proxy;
    })()
}