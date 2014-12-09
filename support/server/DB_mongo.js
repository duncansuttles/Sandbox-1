//database abstraction layer
//this little layer exists just to let up swap the DB totally painlessly in the future

var libpath = require('path');
var DB;
var GUID = require('node-uuid').v4;
var MongoClient = require('mongodb').MongoClient;
var collection = "SandboxData";

exports.new = function(DBTablePath, cb) {

    return (function() {
        var DB = null;
        var proxy = {
            DBTablePath: DBTablePath,
            get: function(key, cb) {
                DB.collection(collection).find({
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

                DB.collection(collection).remove({
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

                DB.collection(collection).update({
                    _key: key
                }, data, {}, function(err, numReplaced, newdoc) {

                    cb();
                })
            },
            find: function(key, data, cb) {
                DB.collection(collection).find(key, data, cb);
            },
            find_raw: function(key, cb) {
                return DB.collection(collection).find(key, cb);
            },
            remove: function(key, cb) {
                this.get(key, function(err, doc, key) {
                    DB.collection(collection).remove({
                        _key: key
                    }, {
                        multi: true
                    }, function(err, numRemoved) {
                        cb(err, doc, key);
                    });

                });
            },
            listAppend: function(listKey, value, cb) {
                DB.collection(collection).update({
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
                DB.collection(collection).update({
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
        MongoClient.connect(/*global.configuration.mongoDB_host*/ "mongodb://root:password@localhost:12027/Sandbox", function(err, db) { // Callback is optional
            DB = db;
            if(!err)
                console.log('connected to mongo')
            else(console.log(err));
            cb(proxy);
        });

        return proxy;
    })()
}





//database abstraction layer
//this little layer exists just to let up swap the DB totally painlessly in the future


  /*
exports.new = function(collection,cb)
{
    
    return (function(){
        
        
        MongoClient.connect(global.configuration.mongoDB_host, function(err, db) {

            if(err) throw err;
            
            DB = db;
            
            var proxy = {
                collection: collection,
                get : function(key,cb)
                {
                   DB.collection(collection).find({ _key: key}).toArray(function (err, docs) {
                          if(docs[0])   
                          {
                            delete docs[0]._id;
                            cb(err,JSON.parse(JSON.stringify(docs[0].val)),docs[0]._id);
                          }
                          else
                            cb(err,null,key);
                    });
                },
                save : function(key,data,cb)
                {
                    data = JSON.parse(JSON.stringify(data));
                    data = {val:data};
                    key = key || GUID();
                   
                    data._key = key;
                    delete data._id;
                   
                    DB.collection(collection).remove({ _key: key }, { multi: true }, function (err, numRemoved) {
                        
                       
                         DB.collection(collection).insert(data,function(err,newDoc){
                            
                            cb(err,data,newDoc[0]._key);
                        })
                    });
                },
                update: function(key,data,cb)
                {
                    data = JSON.parse(JSON.stringify(data));
                    data = {val:data};
                    key = key || GUID();
                   
                    data._key = key;
                    delete data._id;
                    
                    DB.collection(collection).update({ _key: key },data,{},function(err,numReplaced,newdoc){
                        cb();
                    })
                },
                find : function(key,cb)
                {
                    DB.collection(collection).find(key).toArray(cb);
                },
                remove:function(key,cb)
                {
                    this.get(key,function(err,doc,id)
                    {
                        DB.collection(collection).remove({ _key: key }, { multi: true }, function (err, numRemoved) {
                            cb(err,doc,key);
                        });
    
                    });
                },
                listAppend:function(listKey,value,cb)
                {
                    DB.collection(collection).update({_key:listKey},{$push:{val:value}},function(err,num,newDoc)
                    {
                        cb(err,newDoc,listKey);
                    })         
                },
                listDepend:function(listKey,value,cb)
                {
                    DB.collection(collection).update({_key:listKey},{$pull:{val:value}},function(err,num,newDoc)
                    {
                        cb(err,newDoc,listKey);
                    }) 
                },
                
            };
            cb(proxy);
            return proxy;
        });

    })();
}*/