//Get the instance ID from the handshake headers for a socket
var DAL = require('./DAL').DAL;
var sio = require('socket.io');
var fs = require('fs');
var url = require("url");
var mime = require('mime');
var sessions = require('./sessions.js');
var messageCompress = require('../client/lib/messageCompress').messageCompress;
var connect = require('connect'),
    parseSignedCookie = connect.utils.parseSignedCookie,
    cookie = require('express/node_modules/cookie');

YAML = require('js-yaml');

function startup(listen) {
    //create socket server
    global.log('startup refector', 2);
    sio = sio.listen(listen, {
        log: false
    });
    sio.configure(function() {
        //VWF requries websocket. We will not allow socket.io to fallback on flash or long polling
        sio.set('transports', ['websocket']);
        //Somehow, we still need to get the timeouts lower. This does tot seem to do it.
        sio.set('heartbeat interval', 20);
        sio.set('heartbeat timeout', 30);
        sio.set('authorization', function(data, callback) {
            if (data.headers.cookie) {
                // save parsedSessionId to handshakeData
                data.cookieData = parseSignedCookie(cookie.parse(data.headers.cookie)[global.configuration.sessionKey ? global.configuration.sessionKey : 'virtual'],
                    global.configuration.sessionSecret ? global.configuration.sessionSecret : 'unsecure cookie secret');
            }
            callback(null, true);
        });

    });
    sio.set('heartbeat interval', 20);
    sio.set('heartbeat timeout', 30);
    //When there is a new connection, goto WebSocketConnection.
    sio.sockets.on('connection', WebSocketConnection);
}

function setDAL(dal) {
    DAL = dal;
}

function getNamespace(socket) {

    try {
        var referer = require('url').parse(socket.handshake.headers.referer).pathname;

        var index = referer.indexOf(global.appPath);
        var namespace = referer.substring(index);



        if (namespace[namespace.length - 1] != "/")
            namespace += "/";

        return namespace;
    } catch (e) {
        return null;
    }

}
//Check that a user has permission on a node
function checkOwner(node, name) {
    var level = 0;
    if (!node.properties) node.properties = {};
    if (!node.properties.permission) node.properties.permission = {}
    var permission = node.properties['permission'];
    var owner = node.properties['owner'];
    if (owner == name) {
        level = Infinity;
        return level;
    }
    if (permission) {
        level = Math.max(level ? level : 0, permission[name] ? permission[name] : 0, permission['Everyone'] ? permission['Everyone'] : 0);
    }
    var parent = node.parent;
    if (parent)
        level = Math.max(level ? level : 0, checkOwner(parent, name));
    return level ? level : 0;

}

//***node, uses REGEX, escape properly!
function strEndsWith(str, suffix) {
    return str.match(suffix + "$") == suffix;
}

//Is an event in the websocket stream a mouse event?
function isPointerEvent(message) {
    if (!message) return false;
    if (!message.member) return false;

    return (message.member == 'pointerMove' ||
        message.member == 'pointerHover' ||
        message.member == 'pointerEnter' ||
        message.member == 'pointerLeave' ||
        message.member == 'pointerOver' ||
        message.member == 'pointerOut' ||
        message.member == 'pointerUp' ||
        message.member == 'pointerDown' ||
        message.member == 'pointerWheel'
    )

}
//change up the ID of the loaded scene so that they match what the client will have
var fixIDs = function(node) {
    if (node.children)
        var childnames = {};
    for (var i in node.children) {
        childnames[i] = null;
    }
    for (var i in childnames) {
        var childComponent = node.children[i];
        var childName = childComponent.name || i;
        var childID = childComponent.id || childComponent.uri || (childComponent["extends"]) + "." + childName.replace(/ /g, '-');
        childID = childID.replace(/[^0-9A-Za-z_]+/g, "-");
        childComponent.id = childID;
        node.children[childID] = childComponent;
        node.children[childID].parent = node;
        delete node.children[i];
        fixIDs(childComponent);
    }
}

function getBlankScene(state, instanceData, cb) {
    var state2 = JSON.parse(JSON.stringify(state));
    fs.readFile("./public" + global.appPath + "/index.vwf.yaml", 'utf8', function(err, blankscene) {

        var err = null;
        try {
            blankscene = YAML.load(blankscene);

            blankscene.id = 'index-vwf';
            blankscene.patches = "index.vwf";
            if (!blankscene.children)
                blankscene.children = {};
            //only really doing this to keep track of the ownership
            for (var i = 0; i < state.length - 1; i++) {

                var childComponent = state[i];
                var childName = (state[i].name || state[i].properties.DisplayName) || i;
                var childID = childComponent.id || childComponent.uri || (childComponent["extends"]) + "." + childName.replace(/ /g, '-');
                childID = childID.replace(/[^0-9A-Za-z_]+/g, "-");
                //state[i].id = childID;
                //state2[i].id = childID;
                blankscene.children[childName] = state2[i];
                state[i].id = childID;

                fixIDs(state[i]);
            }
            var props = state[state.length - 1];
            if (props) {
                if (!blankscene.properties)
                    blankscene.properties = {};
                for (var i in props) {
                    blankscene.properties[i] = props[i];
                }
                for (var i in blankscene.properties) {
                    if (blankscene.properties[i] && blankscene.properties[i].value)
                        blankscene.properties[i] = blankscene.properties[i].value;
                    else if (blankscene.properties[i] && (blankscene.properties[i].get || blankscene.properties[i].set))
                        delete blankscene.properties[i];
                }
                //don't allow the clients to persist between a save/load cycle
                blankscene.properties['clients'] = null;
                if (instanceData && instanceData.publishSettings) {
                    blankscene.properties['playMode'] = 'play';
                } else
                    blankscene.properties['playMode'] = 'stop';
            }
        } catch (e) {
            err = e;
        }
        if (err)
            cb(null);
        else
            cb(blankscene);
    });
}

function ServeSinglePlayer(socket, namespace, instancedata) {
    global.log('single player', 2);
    var instance = namespace;
    var state = SandboxAPI.getState(instance, function(state) {
        if (!state) state = [{
            owner: undefined
        }];

        getBlankScene(state, instancedata, function(blankscene) {
            socket.emit('message', {
                "action": "createNode",
                "parameters": [blankscene],
                "time": 0
            });
            var joinMessage = messageCompress.pack(JSON.stringify({
                "action": "fireEvent",
               
                "parameters": ["clientConnected", [socket.id, socket.loginData.Username, socket.loginData.UID]],
                node: "index-vwf",
                "time": 0
            }));
            socket.emit('message', joinMessage);

            socket.emit('message', {
                "action": "goOffline",
                "parameters": [blankscene],
                "time": 0
            });
            socket.pending = false;
        });
    });
}


function SaveInstanceState(namespace, data, socket) {


    if(!socket.loginData) return;

    var id = namespace.replace(/[\\\/]/g, '_');
    console.log(id);
    DAL.getInstance(id, function(state) {

        //state not found
        if (!state) {
            require('./examples.js').getExampleMetadata(id, function(metadata) {

                if (!metadata) {
                    
                    return;
                } else {
                    if (socket.loginData.UID == global.adminUID) {
                        require('./examples.js').saveExampleData(URL, id, data, function() {
                            
                        })

                    } else {
                        
                        return;
                    }

                }

            });
            return;
        }

        //not allowed to update a published world
        if (state.publishSettings) {
            return;
        }

        //not currently checking who saves the state, so long as they are logged in
        DAL.saveInstanceState(id, data, function() {
            return;
        });

    });
    console.log('saved');
}

function WebSocketConnection(socket, _namespace) {

    //get the session information for the socket
    sessions.GetSessionData(socket.handshake, function(loginData) {



          
        //fill out some defaults if we did not get credentials
        //note that the client list for an anonymous connection may only contain that once connection
        socket.loginData = loginData || {

            Username: "Anonymous",
            UID: "Anonymous",
            clients: [socket.id]
        };
        if(!socket.loginData.UID && socket.loginData.Username)
            socket.loginData.UID = socket.loginData.Username;


        var namespace = _namespace || getNamespace(socket);

        if (!namespace) {
            socket.on('setNamespace', function(msg) {
                global.log(msg.space, 2);
                WebSocketConnection(socket, msg.space);
                socket.emit('namespaceSet', {});
            });
            socket.on('connectionTest', function(msg) {
                socket.emit('connectionTest', msg);
            })
            return;
        }


        DAL.getInstance(namespace.replace(/\//g, "_"), function(instancedata) {

            if (!instancedata) {
                require('./examples.js').getExampleMetadata(namespace.replace(/\//g, "_"), function(instancedata) {
                    if (instancedata) {
                        //if this is a single player published world, there is no need for the server to get involved. Server the world state and tell the client to disconnect
                        if (instancedata && instancedata.publishSettings && instancedata.publishSettings.singlePlayer) {
                            ServeSinglePlayer(socket, namespace, instancedata)
                        } else
                            ClientConnected(socket, namespace, instancedata);

                    } else {
                        socket.disconnect();
                        return;
                    }
                });
                return;
            }
            //if this is a single player published world, there is no need for the server to get involved. Server the world state and tell the client to disconnect
            if (instancedata && instancedata.publishSettings && instancedata.publishSettings.singlePlayer) {
                ServeSinglePlayer(socket, namespace, instancedata)
            } else
                ClientConnected(socket, namespace, instancedata);
        });
    });
};

function runningInstance(id) {
    this.id = id;
    this.clients = {};
    this.time = 0.0;
    this.state = {};

    var log = null;
    try {
        var log = fs.createWriteStream(SandboxAPI.getDataPath() + '//Logs/' + id.replace(/[\\\/]/g, '_'), {
            'flags': 'a'
        });
    } catch (e) {
        global.error(e.message + ' when opening ' + SandboxAPI.getDataPath() + '//Logs/' + id.replace(/[\\\/]/g, '_'));
    }
    this.Log = function(message, level) {
        if (global.logLevel >= level) {
            if (log)
                log.write(message + '\n');
            global.log(message + '\n');
        }
    }
    this.clientCount = function() {
        return Object.keys(this.clients).length;
    }
    this.getLoadClient = function() {
        var loadClient = null;
        for (var i in this.clients) {
            var testClient = this.clients[i];
            if (!testClient.pending) { //&& testClient.loginData remove check - better to get untrusted data than a sync error
                loadClient = testClient;
                break;
            }
        }
        return loadClient;
    }
    this.Error = function(message, level) {
        var red, brown, reset;
        red = '\u001b[31m';
        brown = '\u001b[33m';
        reset = '\u001b[0m';
        if (global.logLevel >= level) {
            if (log)
                log.write(message + '\n');
            global.log(red + message + reset + '\n');
        }
    }
    this.messageClients = function(message) {
        //message to each user the join of the new client. Queue it up for the new guy, since he should not send it until after getstate
        var Message = messageCompress.pack(message);
        for (var i in this.clients) {

            if (!this.clients[i].pending)
                this.clients[i].emit('message', Message);
            else {
                this.clients[i].pendingList.push(Message)
            }
        }
    }
    this.messageConnection = function(id, name, UID) {
        var joinMessage = messageCompress.pack(JSON.stringify({
            "action": "fireEvent",
            "parameters": ["clientConnected", [id, name, UID]],
            node: "index-vwf",
            "time": this.time
        }));
        this.messageClients(joinMessage);
    }
    this.messageDisconnection = function(id, name, UID) {
        var joinMessage = messageCompress.pack(JSON.stringify({
            "action": "fireEvent",
            "parameters": ["clientDisconnected", [id, name, UID]],
            node: "index-vwf",
            "time": this.time
        }));
        this.messageClients(joinMessage);
    }
    this.GetNextAnonName = function() {

        var clients = this.clients;
        var _int = 0;
        if (!clients)
            return "Anonymous" + _int;

        while (true) {
            var test = "Anonymous" + _int;
            var found = false;
            _int++;
            for (var i in clients) {
                if (clients[i].loginData.Username == test) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return test;
            }
            if (_int > 10000) {
                throw (new Error('error finding anonymous name'))
            }
        }

    }
    this.totalerr = 0;
    //keep track of the timer for this instance
    var self = this;
    self.accum = 0;
    var timer = function() {

        var now = process.hrtime();
        now = now[0] * 1e9 + now[1];
        now = now / 1e9;

        if (!self.lasttime) self.lasttime = now;

        var timedelta = (now - self.lasttime) || 0;

        self.accum += timedelta;

        while (self.accum > .05) {
            self.accum -= .05;
            self.time += .05;

            var tickmessage = messageCompress.pack(JSON.stringify({
                "action": "tick",
                "parameters": [],
                "time": self.time
            }));
            for (var i in self.clients) {
                var client = self.clients[i];
                if (!client.pending)
                    client.emit('message', tickmessage);
                else {
                    client.pendingList.push(tickmessage);
                    global.log('pending tick', 2);
                }
            }
        }
        self.lasttime = now;
        self.timerID = setTimeout(timer, 5);
    }.bind(self);
    self.timerID = setTimeout(timer, 5);

}

function runningInstanceList() {
    this.instances = {};
    this.add = function(id) {
        this.instances[id] = new runningInstance(id);
    }
    this.remove = function(id) {
        delete this.instances[id];
    }
    this.get = function(id) {
        return this.instances[id];
    }
    this.has = function(id) {
        return this.instances[id] ? true : false;
    }
}

var RunningInstances = new runningInstanceList();
global.instances = RunningInstances;

function ClientConnected(socket, namespace, instancedata) {



    var allowAnonymous = false;
    if (instancedata.publishSettings && instancedata.publishSettings.allowAnonymous)
        allowAnonymous = true;
    //if it's a new instance, setup record 
    if (!RunningInstances.has(namespace)) {
        RunningInstances.add(namespace);
    }

    var thisInstance = RunningInstances.get(namespace);



    var loadClient = null;

    if (thisInstance.clientCount() != 0) {
        loadClient = thisInstance.getLoadClient();
    }

    for (var i in thisInstance.clients) {
        thisInstance.clients[i].emit('message', messageCompress.pack(JSON.stringify({
            "action": "status",
            "parameters": ["Peer Connected"],
            "time": thisInstance.time
        })));
    }

    //add the new client to the instance data
    thisInstance.clients[socket.id] = socket;

    //count anonymous users, try to align with the value used for hte displayname of the avatar
    if (socket.loginData.UID == "Anonymous") {

        var anonName = thisInstance.GetNextAnonName();
        socket.loginData.UID = anonName;
        socket.loginData.Username = anonName;
    }

    socket.pending = true;
    socket.pendingList = [];
    //The client is the first, is can just load the index.vwf, and mark it not pending
    if (!loadClient) {
        global.log('load from db', 2);

        socket.emit('message', messageCompress.pack(JSON.stringify({
            "action": "status",
            "parameters": ["Loading state from database"],
            "time": thisInstance.time
        })));
        var instance = namespace;
        //Get the state and load it.
        //Now the server has a rough idea of what the simulation is
        SandboxAPI.getState(namespace, function(state) {

            if (!state) state = [{
                owner: instancedata.owner
            }];


            thisInstance.state = {
                nodes: {}
            };
            thisInstance.state.nodes['index-vwf'] = {
                id: "index-vwf",
                properties: state[state.length - 1],
                children: {}
            };

            thisInstance.state.findNode = function(id, parent) {
                var ret = null;
                if (!parent) parent = this.nodes['index-vwf'];
                if (parent.id == id)
                    ret = parent;
                else if (parent.children) {
                    for (var i in parent.children) {
                        ret = this.findNode(id, parent.children[i]);
                        if (ret) return ret;
                    }
                }
                return ret;
            }
            thisInstance.state.deleteNode = function(id, parent) {
                if (!parent) parent = this.nodes['index-vwf'];
                if (parent.children) {
                    for (var i in parent.children) {
                        if (i == id) {
                            delete parent.children[i];
                            return
                        }
                    }
                }
            }
            thisInstance.state.reattachParents = function(node) {
                if (node && node.children) {
                    for (var i in node.children) {
                        node.children[i].parent = node;
                        this.reattachParents(node.children[i]);
                    }
                }
            }
            // so, the player has hit pause after hitting play. They are going to reset the entire state with the state backup. 
            //The statebackup travels over the wire (though technically I guess we should have a copy of that data in our state already)
            //when it does, we can receive it here. Because the server is doing some tracking of state, we need to restore the server
            //side state.
            thisInstance.state.callMethod = function(id, name, args) {
                if (id == 'index-vwf' && name == 'restoreState') {
                    console.log('Restore State from Play Backup', 2);
                    //args[0][0] should be a vwf root node definition
                    if (args[0][0]) {
                        //note we have to JSON parse and stringify here to avoid creating a circular structure that cannot be reserialized 
                        this.nodes['index-vwf'] = JSON.parse(JSON.stringify(args[0][0]));
                        //here, we need to hook back up the .parent property, so we can walk the graph for other operations.
                        this.reattachParents(this.nodes['index-vwf']);
                    }
                }
            }
            socket.emit('message', messageCompress.pack(JSON.stringify({
                "action": "status",
                "parameters": ["State loaded, sending..."],
                "time": thisInstance.time
            })));
            getBlankScene(state, instancedata, function(blankscene) {


                //only really doing this to keep track of the ownership
                for (var i = 0; i < state.length - 1; i++) {
                    var childID = state[i].id;

                    thisInstance.state.nodes['index-vwf'].children[childID] = state[i];
                    thisInstance.state.nodes['index-vwf'].children[childID].parent = thisInstance.state.nodes['index-vwf'];

                }



                thisInstance.cachedState = blankscene;
                socket.emit('message', messageCompress.pack(JSON.stringify({
                    "action": "createNode",
                    "parameters": [blankscene],
                    "time": thisInstance.time
                })));
                socket.emit('message', messageCompress.pack(JSON.stringify({
                    "action": "fireEvent",
                    "parameters": ["loaded", []],
                    node: "index-vwf",
                    "time": thisInstance.time
                })));

                socket.pending = false;
                //this must come after the client is added. Here, there is only one client
                thisInstance.messageConnection(socket.id, socket.loginData.Username, socket.loginData.UID);


            });
        });
    }
    //this client is not the first, we need to get the state and mark it pending
    else {
        global.log('load from client', 2);
        var firstclient = loadClient; //Object.keys(global.instances[namespace].clients)[0];
        //firstclient = global.instances[namespace].clients[firstclient];
        socket.pending = true;
        thisInstance.getStateTime = thisInstance.time;
        firstclient.emit('message', messageCompress.pack(JSON.stringify({
            "action": "status",
            "parameters": ["Server requested state. Sending..."],
            "time": thisInstance.getStateTime
        })));
        //here, we must reset all the physics worlds, right before who ever firstclient is responds to getState. 
        //important that nothing is between



        var resetMessage = JSON.stringify({
            "action": "callMethod",
            "parameters": ["___physics_world_reset", []],
            node: "index-vwf",
            "time": thisInstance.time
        });

        thisInstance.messageClients(resetMessage);

        firstclient.emit('message', messageCompress.pack(JSON.stringify({
            "action": "getState",
            "respond": true,
            "time": thisInstance.time
        })));
        socket.emit('message', messageCompress.pack(JSON.stringify({
            "action": "status",
            "parameters": ["Requesting state from clients"],
            "time": thisInstance.getStateTime
        })));

        thisInstance.messageConnection(socket.id, socket.loginData.Username, socket.loginData.UID);

        var timeout = function(namespace) {

            this.namespace = namespace;
            this.count = 0;
            this.time = function() {
                try {

                    var loadClients = [];

                    if (Object.keys(this.namespace.clients).length != 0) {
                        for (var i in this.namespace.clients) {
                            var testClient = this.namespace.clients[i];
                            if (!testClient.pending && testClient.loginData)
                                loadClients.push(testClient);
                        }
                    }
                    var loadClient = loadClients[Math.floor((Math.max(0, require('./cryptoRandom.js').random() - .001)) * loadClients.length)];
                    if (loadClient) {
                        this.count++;
                        if (this.count < 5) {
                            global.log('did not get state, resending request', 2);
                            this.namespace.getStateTime = this.namespace.time;
                            loadClient.emit('message', messageCompress.pack(JSON.stringify({
                                "action": "getState",
                                "respond": true,
                                "time": this.namespace.time
                            })));
                            socket.emit('message', messageCompress.pack(JSON.stringify({
                                "action": "status",
                                "parameters": ["Did not get state, resending request."],
                                "time": this.namespace.time
                            })));
                            this.handle = global.setTimeout(this.time.bind(this), 2000);
                        } else {
                            global.log('sending default state', 2);
                            var state = this.namespace.cachedState;
                            for (var i in this.namespace.clients) {
                                var client = this.namespace.clients[i];

                                if (loadClient != client && client.pending === true) {
                                    global.log('sending default state 2', 2);
                                    client.emit('message', messageCompress.pack(JSON.stringify({
                                        "action": "status",
                                        "parameters": ["State Not Received, Transmitting default"],
                                        "time": this.namespace.getStateTime
                                    })));
                                    socket.emit('message', messageCompress.pack(JSON.stringify({
                                        "action": "createNode",
                                        "parameters": [state],
                                        "time": this.namespace.getStateTime
                                    })));
                                    client.pending = false;
                                    for (var j = 0; j < client.pendingList.length; j++) {

                                        client.emit('message', client.pendingList[j]);


                                    }
                                    client.pendingList = [];
                                }
                            }
                        }

                    } else {
                        global.log('need to load from db', 2);
                    }
                } catch (e) {}
            }
            this.deleteMe = function() {
                global.clearTimeout(this.handle);
                this.namespace.requestTimer = null;
            }
            this.namespace.requestTimer = this;
            this.handle = global.setTimeout(this.time.bind(this), 3000);
        }
        thisInstance.Log('GetState from Client', 2);
        if (!thisInstance.requestTimer)
            (new timeout(thisInstance));

    }

    socket.on('message', function(msg) {

        try {

            //need to add the client identifier to all outgoing messages
            try {
                var message = JSON.parse(messageCompress.unpack(msg));
            } catch (e) {
                return;
            }
            //global.log(message);
            message.client = socket.id;


            if (message.action == "saveStateResponse") {
                console.log(message.data);
                SaveInstanceState(namespace, message.data, socket);
                return;
            }

            //Log all message if level is high enough
            if (isPointerEvent(message)) {
                thisInstance.Log(JSON.stringify(message), 4);
            } else {
                thisInstance.Log(JSON.stringify(message), 3);
            }



            var sendingclient = thisInstance.clients[socket.id];


            //do not accept messages from clients that have not been claimed by a user
            //currently, allow getstate from anonymous clients
            if (!allowAnonymous && !sendingclient.loginData && message.action != "getState" && message.member != "latencyTest") {
                if (isPointerEvent(message))
                    thisInstance.Error('DENIED ' + JSON.stringify(message), 4);
                else
                    thisInstance.Error('DENIED ' + JSON.stringify(message), 2);
                return;
            }

            //route callmessage to the state to it can respond to manip the server side copy
            if (message.action == 'callMethod')
                thisInstance.state.callMethod(message.node, message.member, message.parameters);
            if (message.action == 'callMethod' && message.node == 'index-vwf' && message.member == 'PM') {
                var textmessage = JSON.parse(message.parameters[0]);
                if (textmessage.receiver == '*System*') {
                    var red, blue, reset;
                    red = '\u001b[31m';
                    blue = '\u001b[33m';
                    reset = '\u001b[0m';
                    global.log(blue + textmessage.sender + ": " + textmessage.text + reset, 0);

                }
                //send the message to the sender and to the receiver
                if(textmessage.receiver)
                    thisInstance.clients[textmessage.receiver].emit('message', messageCompress.pack(JSON.stringify(message)));
                if(textmessage.sender)
                    thisInstance.clients[textmessage.sender].emit('message', messageCompress.pack(JSON.stringify(message)));


                return;
            }

            // only allow users to hang up their own RTC calls
            var rtcMessages = ['rtcCall', 'rtcVideoCall', 'rtcData', 'rtcDisconnect'];
            if (message.action == 'callMethod' && message.node == 'index-vwf' && rtcMessages.indexOf(message.member) != -1) {
                var params = message.parameters[0];

                // allow no transmitting of the 'rtc*Call' messages; purely client-side
                if (rtcMessages.slice(0, 2).indexOf(message.member) != -1)
                    return;

                console.log('socketid',socket.id);
                console.log('sender',params.sender);
                console.log('target',params.target);
                // route messages by the 'target' param, verifying 'sender' param
                if (rtcMessages.slice(2).indexOf(message.member) != -1 &&
                    params.sender == socket.id
                ) {
                    var client = thisInstance.clients[params.target];
                    if (client)
                        client.emit('message', messageCompress.pack(JSON.stringify(message)));

                }
                return;
            }


            //We'll only accept a setProperty if the user has ownership of the object
            if (message.action == "setProperty") {

                var node = thisInstance.state.findNode(message.node);
                if (!node) {
                    thisInstance.Log('server has no record of ' + message.node, 1);
                    return;
                }
                if (allowAnonymous || checkOwner(node, sendingclient.loginData.UID)) {
                    //We need to keep track internally of the properties
                    //mostly just to check that the user has not messed with the ownership manually
                    if (!node.properties)
                        node.properties = {};
                    node.properties[message.member] = message.parameters[0];
                    thisInstance.Log("Set " + message.member + " of " + node.id + " to " + message.parameters[0], 2);
                } else {
                    thisInstance.Error('permission denied for modifying ' + node.id, 1);

                    return;
                }
            }
            //We'll only accept a any of these if the user has ownership of the object
            if (message.action == "createMethod" || message.action == "createProperty" || message.action == "createEvent" ||
                message.action == "deleteMethod" || message.action == "deleteProperty" || message.action == "deleteEvent") {
                var node = thisInstance.state.findNode(message.node);
                if (!node) {
                    thisInstance.Error('server has no record of ' + message.node, 1);
                    return;
                }
                if (allowAnonymous || checkOwner(node, sendingclient.loginData.UID)) {
                    thisInstance.Log("Do " + message.action + " of " + node.id, 2);
                } else {
                    thisInstance.Error('permission denied for ' + message.action + ' on ' + node.id, 1);
                    return;
                }
            }
            //We'll only accept a deleteNode if the user has ownership of the object
            if (message.action == "deleteNode") {
                var node = thisInstance.state.findNode(message.node);
                if (!node) {
                    thisInstance.Error('server has no record of ' + message.node, 1);
                    return;
                }
                if (allowAnonymous || checkOwner(node, sendingclient.loginData.UID)) {
                    //we do need to keep some state data, and note that the node is gone
                    thisInstance.state.deleteNode(message.node)
                    thisInstance.Log("deleted " + node.id, 2);
                } else {
                    thisInstance.Error('permission denied for deleting ' + node.id, 1);
                    return;
                }
            }
            //We'll only accept a createChild if the user has ownership of the object
            //Note that you now must share a scene with a user!!!!
            if (message.action == "createChild") {
                thisInstance.Log(message, 2);
                var node = thisInstance.state.findNode(message.node);
                if (!node) {
                    thisInstance.Error('server has no record of ' + message.node, 1);
                    return;
                }
                //Keep a record of the new node
                //remove allow for user to create new node on index-vwf. Must have permission!
                var childComponent = JSON.parse(JSON.stringify(message.parameters[0]));
                if (allowAnonymous || checkOwner(node, sendingclient.loginData.UID) || childComponent.extends == 'character.vwf') {

                    if (!childComponent) return;
                    var childName = message.member;
                    if (!childName) return;
                    var childID = childComponent.id || childComponent.uri || (childComponent["extends"]) + "." + childName.replace(/ /g, '-');
                    childID = childID.replace(/[^0-9A-Za-z_]+/g, "-");
                    childComponent.id = childID;
                    if (!node.children) node.children = {};
                    node.children[childID] = childComponent;
                    node.children[childID].parent = node;
                    if (!childComponent.properties)
                        childComponent.properties = {};
                    fixIDs(node.children[childID]);
                    thisInstance.Log("created " + childID, 2);
                } else {
                    thisInstance.Error('permission denied for creating child ' + node.id, 1);
                    return;
                }
            }

            var compressedMessage = messageCompress.pack(JSON.stringify(message))
                //distribute message to all clients on given instance
            for (var i in thisInstance.clients) {
                var client = thisInstance.clients[i];

                //if the message was get state, then fire all the pending messages after firing the setState
                if (message.action == "getState") {
                    thisInstance.Log('Got State', 2);
                    if (thisInstance.requestTimer)
                        thisInstance.requestTimer.deleteMe();
                    var state = message.result;
                    thisInstance.cachedState = JSON.parse(JSON.stringify(state));



                    if (message.client != i && client.pending === true) {
                        client.emit('message', messageCompress.pack(JSON.stringify({
                            "action": "status",
                            "parameters": ["State Received, Transmitting"],
                            "time": thisInstance.getStateTime
                        })));
                        client.emit('message', messageCompress.pack(JSON.stringify({
                            "action": "setState",
                            "parameters": [state],
                            "time": thisInstance.getStateTime
                        })));
                    }
                    client.pending = false;
                    for (var j = 0; j < client.pendingList.length; j++) {

                        client.emit('message', client.pendingList[j]);


                    }
                    client.pendingList = [];
                } else {
                    //just a regular message, so push if the client is pending a load, otherwise just send it.
                    if (client.pending == true) {
                        client.pendingList.push(compressedMessage);
                        global.log('PENDING', 2);

                    } else {
                        //simulate latency
                        if (global.latencySim > 0) {
                            (function(__client, __message) {
                                global.setTimeout(function() {
                                    __client.emit('message', __message);
                                }, 150)
                            })(client, compressedMessage);
                        } else {
                            client.emit('message', compressedMessage);
                        }


                    }
                }
            }
        } catch (e) {
            //safe to catch and continue here
            global.error('Error in reflector: onMessage');
            global.error(e);
            global.error(e.stack);
        }

    });

    //When a client disconnects, go ahead and remove the instance data
    socket.on('disconnect', function() {

        try {
            var loginData = socket.loginData;
            global.log(socket.id, loginData, 2)
            thisInstance.clients[socket.id] = null;
            console.log(Object.keys(thisInstance.clients));
            console.log(socket.id);
            delete thisInstance.clients[socket.id];
            console.log('clientCount', thisInstance.clientCount());
            console.log(Object.keys(thisInstance.clients));
            //if it's the last client, delete the data and the timer

            //message to each user the join of the new client. Queue it up for the new guy, since he should not send it until after getstate
            thisInstance.messageDisconnection(socket.id, socket.loginData ? socket.loginData.Username : null);

            if (loginData && loginData.clients) {
                delete loginData.clients[socket.id];
                global.error("Disconnect. Deleting node for user avatar " + loginData.UID);
                var avatarID = 'character-vwf-' + loginData.UID;
                for (var i in thisInstance.clients) {
                    var cl = thisInstance.clients[i];
                    cl.emit('message', messageCompress.pack(JSON.stringify({
                        "action": "deleteNode",
                        "node": avatarID,
                        "time": thisInstance.time
                    })));
                    cl.emit('message', messageCompress.pack(JSON.stringify({
                        "action": "callMethod",
                        "node": 'index-vwf',
                        member: 'cameraBroadcastEnd',
                        "time": thisInstance.time,
                        client: socket.id
                    })));
                    cl.emit('message', messageCompress.pack(JSON.stringify({
                        "action": "callMethod",
                        "node": 'index-vwf',
                        member: 'PeerSelection',
                        parameters: [
                            []
                        ],
                        "time": thisInstance.time,
                        client: socket.id
                    })));
                }
                thisInstance.state.deleteNode(avatarID);
            }
            for (var i in thisInstance.clients) {
                thisInstance.clients[i].emit('message', messageCompress.pack(JSON.stringify({
                    "action": "status",
                    "parameters": ["Peer disconnected: " + (loginData ? loginData.UID : "Unknown")],
                    "time": thisInstance.getStateTime
                })));
            }
            if (thisInstance.clientCount() == 0) {
                clearInterval(thisInstance.timerID);
                RunningInstances.remove(thisInstance.id);
                global.log('Shutting down ' + namespace, 2)
            }
        } catch (e) {
            global.error('error in reflector disconnect')
            global.error(e);
        }

    });

} // end WebSocketConnection

exports.WebSocketConnection = WebSocketConnection;
exports.setDAL = setDAL;
exports.startup = startup;