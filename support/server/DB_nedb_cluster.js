//database abstraction layer
//this little layer exists just to let up swap the DB totally painlessly in the future

var libpath = require('path');
var DB;
var GUID = require('node-uuid').v4;

var logger = require('./logger');
exports.new = function(DBTablePath, cb) {

    return (function() {
        var DB = null;
        var proxy = {
            DBTablePath: DBTablePath,
            cbs: {},
            init: function() {
                var self = this;
                process.on('message', function(message) {
                    if (message && message.type == 'DB' && self.cbs[message.id]) {
                        self.cbs[message.id].apply(self,message.result)
                        delete self.cbs[message.id];
                    }
                })
            },
            post: function(method, args, cb) {
                var message = {};
                message.type = 'DB';
                message.action = method;
                message.args = args;
                message.id = GUID();
                this.cbs[message.id] = cb;
                process.send(message);
            },
            get: function(key, cb) {
                this.post('get', [key], cb);
            },
            save: function(key, data, cb) {
                this.post('save', [key, data], cb);
            },
            update: function(key, data, cb) {
                this.post('update', [key, data], cb);
            },
            find: function(key, data, cb) {
                this.post('find', [key, data], cb);
            },
            find_raw: function(key, cb) {
                this.post('find_raw', [key], cb);
            },
            find_advanced: function(query, start, sort, limit, cb) {
                this.post('find_advanced', [query, start, sort, limit], cb);
            },
            remove: function(key, cb) {
                this.post('remove', [key], cb);
            },
            listAppend: function(listKey, value, cb) {
                this.post('listAppend', [listKey, value], cb);
            },
            listDepend: function(listKey, value, cb) {
                this.post('listDepend', [listKey, value], cb);
            },

        };
        proxy.init();

        cb(proxy);

        return proxy;
    })()
}