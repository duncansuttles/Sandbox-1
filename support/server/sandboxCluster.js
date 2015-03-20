var http = require('http'),
    httpProxy = require('http-proxy'),
    async = require('async');
var fork = require('child_process').fork;
var request = require('request');
var fs = require('fs');
var libpath = require('path');
var url = require('url');
var port = 3000;
var count = 1;
var server = null;
var proxies = null;
var DB = null;
var datapath = null;
http.globalAgent.maxSockets = 100;
var states = {};

function GetProxyPort(request, cb) {

    var query = url.parse(request.url, true).query;
    var id = query.pathname.replace(/\//g, "_");
    console.log(id)
    var newport = port + parseInt(1 + Math.floor(Math.random() * count));
    if (states[id]) {
        console.log('have record for ' + id);
        newport = states[id].port;
    }else
    {
    	console.log("random port for " + id)
    }
    async.nextTick(function() {
        if(proxies[newport-port-1].ready)
            cb(newport);
        else
        {
            console.log("child " + newport + " not ready")
            setTimeout(function()
            {
                GetProxyPortRandom(request,cb);
            },300)
        }
    })
}

function GetProxyPortRandom(request, cb) {

    async.nextTick(function() {
        var newport = port + parseInt(1 + Math.floor(Math.random() * count));
        if(proxies[newport-port-1].ready)
            cb(newport);
        else
        {
            console.log("child " + newport + " not ready")
            setTimeout(function()
            {
                GetProxyPortRandom(request,cb);
            },300)
        }
    })
}

function HandleMessage(message, cb, client) {
    if (message.type == 'DB') {
        DB[message.action].apply(DB, (message.args || []).concat([

            function(err, key, data) {
                message.result = [err, key, data];
                async.nextTick(function() {
                    cb(message);
                });
            }
        ]));
    }
    if (message.type == 'console') {
        console.log(message.data);
        cb(message);
    }
    if (message.type == 'ready') {
        client.ready = true;
        console.log("client " + client.port + " is ready");
    }
    if (message.type == 'state') {
        if (message.action == 'add') {
            if (!states[message.args[0]]) {
                states[message.args[0]] = client;
                console.log("child " + client.port + " is handling " + message.args[0])
            } else {
                throw (new Error("State is already running!"));
            }
        }
        if (message.action == 'remove') {
            if (states[message.args[0]]) {
                delete states[message.args[0]];
                console.log('delisting ' + message.args[0]);
            } else {
                throw (new Error("State is not running!"));
            }
        }
    }

}

console.log('start');
var configSettings = {};
//startup
async.series([

    function readConfigFile(cb) {
        try {
            configSettings = JSON.parse(fs.readFileSync('./config.json').toString());


        } catch (e) {
            configSettings = {};
            console.log('config error');
        }
        //save configuration into global scope so other modules can use.
        global.configuration = configSettings;
        cb();

    },
    function readCommandLine(cb) {
        console.log('readCommandLine');


        var p = process.argv.indexOf('-p');
        port = p >= 0 ? parseInt(process.argv[p + 1]) : (configSettings.port ? configSettings.port : 3000);

        p = process.argv.indexOf('-c');
        count = p >= 0 ? parseInt(process.argv[p + 1]) : (configSettings.clusterCount ? configSettings.clusterCount : 1);

        p = process.argv.indexOf('-d');
        datapath = p >= 0 ? process.argv[p + 1] : (configSettings.datapath ? libpath.normalize(configSettings.datapath) : libpath.join(__dirname, "../../data"));
        cb();
    },

    function startupDB(cb) {
        console.log('startupDB');

        console.log(datapath + libpath.sep + 'users.nedb')
        require('./DB_nedb.js').new(datapath + libpath.sep + 'users.nedb', function(proxy) {
            DB = proxy;
            var message = {};
            cb();
        });
    },
    function forkChildren(cb) {
        console.log('forkChildren');
        proxies = [];
        for (var i = 1; i < count + 1; i++) {
            var p1 = fork('./app.js', ['-p', port + i, '-cluster', '-DB','./DB_cluster.js'], {
               
            });
            proxies.push(p1);
            p1.port = port + i;
        }

        cb();
    },
    function hookUpMessaging(cb) {
        console.log('hookUpMessaging');

        for (var i = 0; i < proxies.length; i++) {

            var child = proxies[i];

            function hookupChild(child) {
                child.on('message', function(message) {
                    message.result = null;
                    //console.log("message  from child" + child.port);
                    //console.log(message);
                    message = HandleMessage(message, function(message) {
                        if (message.result) {
                            //console.log("respond  to child" + child.port)
                            child.send(message);
                        }
                    }, child);
                });
                child.on('close',function()
                {

                    console.log('CRASH in child ' + child.port);
                    var p1 = fork('./app.js', ['-p', child.port, '-cluster', '-DB','./DB_cluster.js'], {
                     
                    });

                    proxies.splice(proxies.indexOf(child),1);
                    proxies.push(p1);
                    p1.port = child.port;
                    hookupChild(p1);
                    console.log("spawned new child for port "+ p1.port)
                    for(var i in states)
                    {
                        if(states[i] == child)
                        {
                            console.log('removing entries from crashed child ' + i + ' ' + child.port);
                            delete states[i];
                        }
                    }
                    
                })
            }

            hookupChild(child);
        }
        cb();
    },
    function startProxyServer(cb) {
        console.log('startProxyServer');


     //   var proxyServers = {};
     //   for (var i = 1; i < count + 1; i++) {
            var proxy = httpProxy.createProxyServer({
                ws: true
            });
            proxy.on('error', function(e) {
                console.log(JSON.stringify(e));
            })
      //      proxyServers[port + i] = proxy;
      //  }

        // Create your custom server and just call `proxy.web()` to proxy
        // a web request to the target passed in the options
        // also you can use `proxy.ws()` to proxy a websockets request
        //
        server = http.createServer(function(req, res) {
            // You can define here your custom logic to handle the request
            // and then proxy the request.
            GetProxyPortRandom(req, function(proxyPort) {

                console.log('proxy request to ' + 'http://localhost:' + proxyPort);
                proxy.web(req, res, {
                    target: 'http://localhost:' + proxyPort
                });
            });
        });

        server.on('upgrade', function(request, socket, head) {
            GetProxyPort(request, function(proxyPort) {
                console.log('proxy request to ' + 'http://localhost:' + proxyPort);
                proxy.ws(request, socket, head, {
                    target: 'http://localhost:' + proxyPort
                });
            });
        });

        console.log("listening on port " + port)
        server.listen(port);
        cb();


    }
], function(e) {
    console.log(e);
})