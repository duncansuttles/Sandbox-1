//database abstraction layer
//this little layer exists just to let up swap the DB totally painlessly in the future
var nStore = require('nstore');
var libpath = require('path');
nStore = nStore.extend(require('nstore/query')());

var DB;
exports.new = function(DBTablePath,cb)
{
    
    
        var DB = null;
        var proxy = {
            get : function(key,cb)
            {
                DB.get(key,cb);
            },
            save : function(key,data,cb)
            {
                DB.save(key,data,cb);
            },
            find : function(key,data,cb)
            {
                DB.find(key,data,cb);
            },
            remove : function(key,cb)
            {
                DB.remove(key,cb);
            }
            
        };
        DB = nStore.new(DBTablePath,function(){
            cb(proxy);
        });
        return proxy;
}
