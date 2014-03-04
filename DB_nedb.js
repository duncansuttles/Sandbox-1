//database abstraction layer
//this little layer exists just to let up swap the DB totally painlessly in the future

var libpath = require('path');
var DB;

//generate a random id.
function GUID()
    {
        var S4 = function ()
        {
            return Math.floor(
                    Math.random() * 0x10000 /* 65536 */
                ).toString(16);
        };

        return (
                S4() + S4() + "-" +
                S4() + "-" +
                S4() + "-" +
                S4() + "-" +
                S4() + S4() + S4()
            );
    }

exports.new = function(DBTablePath,cb)
{
    
    
        var DB = null;
        var proxy = {
            get : function(key,cb)
            {
               DB.find({ _key: key }, function (err, docs) {

                   

                      if(docs[0])   
                      {
                        delete docs[0]._id;
                        cb(err,JSON.parse(JSON.stringify(docs[0].val)),docs[0]._key);
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
               
                data._key =  key;
                delete data._id;
               
                DB.remove({ _key: key }, { multi: true }, function (err, numRemoved) {
                    
                   
                     DB.insert(data,function(err,newDoc){
                        
                        cb(err,data,newDoc._key);
                    })
                });
            },
            find : function(key,data,cb)
            {
                DB.find(key,data,cb);
            },
            remove:function(key,cb)
            {
                this.get(key,function(err,doc,key)
                {
                    DB.remove({ _key: key }, { multi: true }, function (err, numRemoved) {
                        cb(err,doc,key);
                    });

                });
            },
            listAppend:function(listKey,value,cb)
            {
                DB.update({_key:listKey},{$push:{val:value}},function(err,num,newDoc)
                {
                    cb(err,newDoc,listKey);
                })         
            },
            listDepend:function(listKey,value,cb)
            {
                DB.update({_key:listKey},{$pull:{val:value}},function(err,num,newDoc)
                {
                    cb(err,newDoc,listKey);
                }) 
            },
            
        };
        var Datastore = require('nedb');
        DB = new Datastore({ filename: DBTablePath, autoload: false });
        
        DB.loadDatabase(function (err) {    // Callback is optional
             cb(proxy);
        });
        
        return proxy;
}
