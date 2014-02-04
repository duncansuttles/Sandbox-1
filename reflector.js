//Get the instance ID from the handshake headers for a socket
var DAL = require('./DAL').DAL;
var sio = require('socket.io');
var fs = require('fs');
var url = require("url");
var mime = require('mime');
var messageCompress = require('./support/client/lib/messageCompress').messageCompress;

YAML = require('js-yaml');
function startup(listen)
{
    //create socket server
    console.log('startup refector');
            sio = sio.listen(listen,{log:false});
            sio.configure(function()
            {
                //VWF requries websocket. We will not allow socket.io to fallback on flash or long polling
                sio.set('transports', ['websocket']);
                //Somehow, we still need to get the timeouts lower. This does tot seem to do it.
                sio.set('heartbeat interval', 20);
                sio.set('heartbeat timeout', 30);
            
            });
            sio.set('heartbeat interval', 20);
            sio.set('heartbeat timeout', 30);
            //When there is a new connection, goto WebSocketConnection.
            sio.sockets.on('connection', WebSocketConnection);
}
function setDAL(dal)
{
    DAL = dal;
}
function getNamespace(socket)
{

        try{
        var referer = (socket.handshake.headers.referer);
        
        var index = referer.indexOf('/adl/sandbox');
        var namespace = referer.substring(index);
        
      if(namespace[namespace.length-1] != "/")
        namespace += "/";
     
      return namespace;
      }catch(e)
      {
        return null;
      }

}
//Check that a user has permission on a node
function checkOwner(node,name)
{
    var level = 0;
    if(!node.properties) node.properties = {};
    if(!node.properties.permission) node.properties.permission = {}
    var permission = node.properties['permission'];
    var owner = node.properties['owner'];
    if(owner == name)
    {
        level = Infinity;
        return level;
    }
    if(permission)
    {
        level = Math.max(level?level:0,permission[name]?permission[name]:0,permission['Everyone']?permission['Everyone']:0);
    }
    var parent = node.parent;
    if(parent)
        level = Math.max(level?level:0,checkOwner(parent,name));
    return level?level:0;   
    
}

//***node, uses REGEX, escape properly!
function strEndsWith(str, suffix) {
    return str.match(suffix+"$")==suffix;
}

//Is an event in the websocket stream a mouse event?
function isPointerEvent(message)
{
    if(!message) return false;
    if(!message.member) return false;
    
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
var fixIDs = function(node)
{
    if(node.children)
    var childnames = {};
    for(var i in node.children)
    {
        childnames[i] = null;
    }
    for(var i in childnames)
    {
        var childComponent = node.children[i];
        var childName = childComponent.name || i;
        var childID = childComponent.id || childComponent.uri || ( childComponent["extends"] ) + "." + childName.replace(/ /g,'-'); 
        childID = childID.replace( /[^0-9A-Za-z_]+/g, "-" ); 
        childComponent.id = childID;
        node.children[childID] = childComponent;
        node.children[childID].parent = node;
        delete node.children[i];
        fixIDs(childComponent);
    }
}

    function ServeSinglePlayer(socket, namespace,instancedata)
    {
        console.log('single player');
        var instance = namespace;
        var state = SandboxAPI.getState(instance) || [{owner:undefined}];
        var state2 = SandboxAPI.getState(instance) || [{owner:undefined}];
        
        fs.readFile("./public/adl/sandbox/index.vwf.yaml", 'utf8',function(err,blankscene)
        {
            blankscene= YAML.load(blankscene);
            
            blankscene.id = 'index-vwf';
            blankscene.patches= "index.vwf";
            if(!blankscene.children)
                blankscene.children = {};
            //only really doing this to keep track of the ownership
            for(var i =0; i < state.length-1; i++)
            {
                
                var childComponent = state[i];
                var childName = state[i].name || state[i].properties.DisplayName + i;
                var childID = childComponent.id || childComponent.uri || ( childComponent["extends"] ) + "." + childName.replace(/ /g,'-'); 
                childID = childID.replace( /[^0-9A-Za-z_]+/g, "-" ); 
                //state[i].id = childID;
                //state2[i].id = childID;
                blankscene.children[childName] = state2[i];
                state[i].id = childID;
                
                fixIDs(state[i]);
            }
            var props = state[state.length-1];
            if(props)
            {
                if(!blankscene.properties)
                    blankscene.properties = {};
                for(var i in props)
                {
                    blankscene.properties[i] = props[i];
                }
                for(var i in blankscene.properties)
                {
                    if( blankscene.properties[i] && blankscene.properties[i].value)
                        blankscene.properties[i] = blankscene.properties[i].value;
                    else if(blankscene.properties[i] && (blankscene.properties[i].get || blankscene.properties[i].set))
                        delete blankscene.properties[i];
                }
            }
            //global.log(Object.keys(global.instances[namespace].state.nodes['index-vwf'].children));
            
            //this is a blank world, go ahead and load the default
            
            
            
            
            socket.emit('message',{"action":"createNode","parameters":[blankscene],"time":0});
            socket.emit('message',{"action":"goOffline","parameters":[blankscene],"time":0});
            socket.pending = false;
        });
        
    }
    
    function WebSocketConnection(socket, _namespace) {
    
        var namespace = _namespace || getNamespace(socket);
        
         if(!namespace)
          {
              socket.on('setNamespace',function(msg)
              {
                console.log(msg.space);
                WebSocketConnection(socket,msg.space);
                socket.emit('namespaceSet',{});
              });
              socket.on('connectionTest',function(msg)
              {
                    socket.emit('connectionTest',msg);
              })
              return;
          }


      
        DAL.getInstance(namespace.replace(/\//g,"_"),function(instancedata)
        {
            
            if(!instancedata)
            {
                socket.disconnect();
                return;
            }
            //if this is a single player published world, there is no need for the server to get involved. Server the world state and tell the client to disconnect
            if(instancedata && instancedata.publishSettings && instancedata.publishSettings.singlePlayer)
            {
                ServeSinglePlayer(socket, namespace,instancedata)
            }else
                ClientConnected(socket, namespace,instancedata);
        });
    };
    
    function ClientConnected(socket, namespace, instancedata) {
      
      

      //create or setup instance data
      if(!global.instances)
        global.instances = {};
       
      socket.loginData = {};
      var allowAnonymous = false;
      if(instancedata.publishSettings && instancedata.publishSettings.allowAnonymous)
               allowAnonymous = true;
      //if it's a new instance, setup record 
      if(!global.instances[namespace])
      {
        global.instances[namespace] = {};
        global.instances[namespace].clients = {};
        global.instances[namespace].time = 0.0;
        global.instances[namespace].state = {};
        
        //create or open the log for this instance
        var log = fs.createWriteStream(SandboxAPI.getDataPath()+'//Logs/'+namespace.replace(/[\\\/]/g,'_'), {'flags': 'a'});
        global.instances[namespace].Log = function(message,level)
        {
            if(global.logLevel >= level)
            {
                log.write(message +'\n');
                global.log(message +'\n');
            }
        }
        global.instances[namespace].Error = function(message,level)
        {
            var red, brown, reset;
            red   = '\u001b[31m';
            brown  = '\u001b[33m';
            reset = '\u001b[0m';
            if(global.logLevel >= level)
            {
                log.write(message +'\n');
                global.log(red + message + reset + '\n');
            }
        }
        
        
        
        
        global.instances[namespace].totalerr = 0;
        
        
        //keep track of the timer for this instance
        global.instances[namespace].timerID = setInterval(function(){
        
            var now = process.hrtime();
            now = now[0] * 1e9 + now[1];
            now = now/1e9;
            
            
            var timedelta = (now - global.instances[namespace].lasttime) || 0;
            var timeerr = (timedelta - .050)*1000;
            global.instances[namespace].lasttime = now;
            global.instances[namespace].totalerr += timeerr;
            
            
            global.instances[namespace].time += .05;
            
            var tickmessage = messageCompress.pack(JSON.stringify({"action":"tick","parameters":[],"time":global.instances[namespace].time}));
            for(var i in global.instances[namespace].clients)
            {
                var client = global.instances[namespace].clients[i];
                if(!client.pending)
                    client.emit('message',tickmessage);
                else
                {
                    client.pendingList.push(tickmessage);
                    console.log('pending tick');
                }
            }
        
        },50);
        
      }
     
      
      
      
      var loadClient = null;
      
      if(Object.keys(global.instances[namespace].clients).length != 0)
      {
        for(var i in global.instances[namespace].clients)
        {
           var testClient = global.instances[namespace].clients[i];
           if(!testClient.pending && testClient.loginData)
           {
                loadClient = testClient;
                break;
            }
        }
      }
      
      for(var i in global.instances[namespace].clients)
      {
                global.instances[namespace].clients[i].emit('message',messageCompress.pack(JSON.stringify({"action":"status","parameters":["Peer Connected"],"time":global.instances[namespace].time})));   
      }

      //add the new client to the instance data
      global.instances[namespace].clients[socket.id] = socket;   
      
      socket.pending = true;
      socket.pendingList = [];
      //The client is the first, is can just load the index.vwf, and mark it not pending
      if(!loadClient)
      {
        console.log('load from db');
        
        socket.emit('message',messageCompress.pack(JSON.stringify({"action":"status","parameters":["Loading state from database"],"time":global.instances[namespace].time})));  
        var instance = namespace;
        //Get the state and load it.
        //Now the server has a rough idea of what the simulation is
        var state = SandboxAPI.getState(instance) || [{owner:undefined}];
        
        var state2 = SandboxAPI.getState(instance) || [{owner:undefined}];
        global.instances[namespace].state = {nodes:{}};
        global.instances[namespace].state.nodes['index-vwf'] = {id:"index-vwf",properties:state[state.length-1],children:{}};
        
        global.instances[namespace].state.findNode = function(id,parent)
        {
            var ret = null;
            if(!parent) parent = this.nodes['index-vwf'];
            if(parent.id == id)
                ret = parent;
            else if(parent.children)
            {
                for(var i in parent.children)
                {
                    ret = this.findNode(id, parent.children[i]);
                    if(ret) return ret;
                }
            }
            return ret;
        }
        global.instances[namespace].state.deleteNode = function(id,parent)
        {
            if(!parent) parent = this.nodes['index-vwf'];
            if(parent.children)
            {
                for(var i in parent.children)
                {
                    if( i == id)
                    {
                        delete parent.children[i];
                        return
                    }
                }
            }
        }
        
        fs.readFile("./public/adl/sandbox/index.vwf.yaml", 'utf8',function(err,blankscene)
        {
            socket.emit('message',messageCompress.pack(JSON.stringify({"action":"status","parameters":["State loaded, sending..."],"time":global.instances[namespace].time}))); 
            blankscene= YAML.load(blankscene);
            
            blankscene.id = 'index-vwf';
            blankscene.patches= "index.vwf";
            if(!blankscene.children)
                blankscene.children = {};
            //only really doing this to keep track of the ownership
            for(var i =0; i < state.length-1; i++)
            {
                
                var childComponent = state[i];
                var childName = state[i].name || state[i].properties.DisplayName + i;
                var childID = childComponent.id || childComponent.uri || ( childComponent["extends"] ) + "." + childName.replace(/ /g,'-'); 
                childID = childID.replace( /[^0-9A-Za-z_]+/g, "-" ); 
                //state[i].id = childID;
                //state2[i].id = childID;
                blankscene.children[childName] = state2[i];
                state[i].id = childID;
                global.instances[namespace].state.nodes['index-vwf'].children[childID] = state[i];
                global.instances[namespace].state.nodes['index-vwf'].children[childID].parent = global.instances[namespace].state.nodes['index-vwf'];
                fixIDs(state[i]);
            }
            var props = state[state.length-1];
            if(props)
            {
                if(!blankscene.properties)
                    blankscene.properties = {};
                for(var i in props)
                {
                    blankscene.properties[i] = props[i];
                }
                for(var i in blankscene.properties)
                {
                    if( blankscene.properties[i] && blankscene.properties[i].value)
                        blankscene.properties[i] = blankscene.properties[i].value;
                    else if(blankscene.properties[i] && (blankscene.properties[i].get || blankscene.properties[i].set))
                        delete blankscene.properties[i];
                }
            }
            //global.log(Object.keys(global.instances[namespace].state.nodes['index-vwf'].children));
            
            //this is a blank world, go ahead and load the default

            global.instances[namespace].cachedState = blankscene;
            socket.emit('message',messageCompress.pack(JSON.stringify({"action":"createNode","parameters":[blankscene],"time":global.instances[namespace].time})));
            socket.pending = false;
        });
      }
      //this client is not the first, we need to get the state and mark it pending
      else
      {
        console.log('load from client');
        var firstclient = loadClient;//Object.keys(global.instances[namespace].clients)[0];
        //firstclient = global.instances[namespace].clients[firstclient];
        socket.pending = true;
        global.instances[namespace].getStateTime = global.instances[namespace].time;
        firstclient.emit('message',messageCompress.pack(JSON.stringify({"action":"status","parameters":["Server requested state. Sending..."],"time":global.instances[namespace].getStateTime})));  
        firstclient.emit('message',messageCompress.pack(JSON.stringify({"action":"getState","respond":true,"time":global.instances[namespace].time})));
        socket.emit('message',messageCompress.pack(JSON.stringify({"action":"status","parameters":["Requesting state from clients"],"time":global.instances[namespace].getStateTime})));    
        var timeout = function(namespace){
            
            this.namespace = namespace;
            this.count = 0;
            this.time = function()
            {
                try{
                
                    var loadClients = [];
          
                      if(Object.keys(this.namespace.clients).length != 0)
                      {
                        for(var i in this.namespace.clients)
                        {
                           var testClient = this.namespace.clients[i];
                           if(!testClient.pending && testClient.loginData)
                            loadClients.push(testClient);
                        }
                      }
                    var loadClient = loadClients[Math.floor((Math.max(0,Math.random() -.001)) * loadClients.length)];
                    if(loadClient)
                    {
                        this.count++;
                        if(this.count < 5)
                        {
                            console.log('did not get state, resending request');    
                            this.namespace.getStateTime = this.namespace.time;
                            loadClient.emit('message',messageCompress.pack(JSON.stringify({"action":"getState","respond":true,"time":this.namespace.time})));
                            socket.emit('message',messageCompress.pack(JSON.stringify({"action":"status","parameters":["Did not get state, resending request."],"time":this.namespace.time}))); 
                            this.handle = global.setTimeout(this.time.bind(this),2000); 
                        }else
                        {
                            console.log('sending default state');
                            var state =  this.namespace.cachedState;
                            for(var i in  this.namespace.clients)
                            {
                                var client =  this.namespace.clients[i];
                                console.log(state);
                                if(loadClient != client && client.pending===true)
                                {
                                    console.log('sending default state 2');
                                    client.emit('message',messageCompress.pack(JSON.stringify({"action":"status","parameters":["State Not Received, Transmitting default"],"time": this.namespace.getStateTime}))); 
                                    socket.emit('message',messageCompress.pack(JSON.stringify({"action":"createNode","parameters":[state],"time":this.namespace.getStateTime})));
                                    client.pending = false;
                                    for(var j = 0; j < client.pendingList.length; j++)
                                    {
                                        
                                        client.emit('message',client.pendingList[j]);
                                        
                                        
                                    }
                                    client.pendingList = [];    
                                }
                            }
                        }

                    }else
                    {
                        console.log('need to load from db');    
                    }
                }catch(e){}
            }
            this.deleteMe = function()
            {
                global.clearTimeout(this.handle);
                this.namespace.requestTimer = null;
            }
            this.namespace.requestTimer = this;
            this.handle = global.setTimeout(this.time.bind(this),1000);
        }
        global.instances[namespace].Log('GetState from Client',2);
        if(!global.instances[namespace].requestTimer)
            (new timeout(global.instances[namespace]));
        
      }
     
      socket.on('message', function (msg) {
        
          
            //need to add the client identifier to all outgoing messages
            try{
                var message = JSON.parse(messageCompress.unpack(msg));
            }catch(e)
            {
                return;
            }
            //global.log(message);
            message.client = socket.id;
            
            
            //Log all message if level is high enough
           if(isPointerEvent(message))
           {
                global.instances[namespace].Log(JSON.stringify(message), 4);
           }
           else
           {
                global.instances[namespace].Log(JSON.stringify(message), 3);
           }
            
                
                
            var sendingclient = global.instances[namespace].clients[socket.id];
            
            //do not accept messages from clients that have not been claimed by a user
            //currently, allow getstate from anonymous clients
            if(!allowAnonymous && !sendingclient.loginData && message.action != "getState" && message.member != "latencyTest")
            {
                if(isPointerEvent(message))
                    global.instances[namespace].Error('DENIED ' + JSON.stringify(message), 4);
                else
                    global.instances[namespace].Error('DENIED ' + JSON.stringify(message), 2);              
                return;
            }
            if(message.action == 'callMethod' && message.node =='index-vwf' && message.member=='PM')
            {
                var textmessage = JSON.parse(message.parameters[0]);
                if(textmessage.receiver == '*System*')
                {
                    var red, blue, reset;
                    red   = '\u001b[31m';
                    blue  = '\u001b[33m';
                    reset = '\u001b[0m';
                    global.log(blue + textmessage.sender + ": " + textmessage.text + reset,0);
                    
                }
                for(var i in global.instances[namespace].clients)
                {
                    var client = global.instances[namespace].clients[i];
                    if(client && client.loginData && (client.loginData.UID == textmessage.receiver || client.loginData.UID == textmessage.sender))
                    {   
                        client.emit('message',messageCompress.pack(JSON.stringify(message)));
                        
                    }
                        
                }
                
                
                return;
            }

            // only allow users to hang up their own RTC calls
            var rtcMessages = ['rtcCall', 'rtcVideoCall', 'rtcData', 'rtcDisconnect'];
            if( message.action == 'callMethod' && message.node == 'index-vwf' && rtcMessages.indexOf(message.member) != -1 )
            {
                var params = message.parameters[0];

                // allow no transmitting of the 'rtc*Call' messages; purely client-side
                if( rtcMessages.slice(0,2).indexOf(message.member) != -1 )
                    return;

                // route messages by the 'target' param, verifying 'sender' param
                if( rtcMessages.slice(2).indexOf(message.member) != -1 &&
                    sendingclient.loginData && 
                    params.sender == sendingclient.loginData.UID
                ){
                    for( var i in global.instances[namespace].clients ){
                        var client = global.instances[namespace].clients[i];
                        if( client && client.loginData && client.loginData.UID == params.target )
                            client.emit('message', messageCompress.pack(JSON.stringify(message)));
                    }
                }
                return;
            }


            //We'll only accept a setProperty if the user has ownership of the object
            if(message.action == "setProperty")
            {
                  var node = global.instances[namespace].state.findNode(message.node);
                  if(!node)
                  {
                    global.instances[namespace].Log('server has no record of ' + message.node,1);
                    return;
                  }
                  if(allowAnonymous || checkOwner(node,sendingclient.loginData.UID))
                  { 
                        //We need to keep track internally of the properties
                        //mostly just to check that the user has not messed with the ownership manually
                        if(!node.properties)
                            node.properties = {};
                        node.properties[message.member] = message.parameters[0];
                        global.instances[namespace].Log("Set " +message.member +" of " +node.id+" to " + message.parameters[0],2);
                  }
                  else
                  {
                    global.instances[namespace].Error('permission denied for modifying ' + node.id,1);
                    return;
                  }
            }
            //We'll only accept a any of these if the user has ownership of the object
            if(message.action == "createMethod" || message.action == "createProperty" || message.action == "createEvent" || 
                message.action == "deleteMethod" || message.action == "deleteProperty" || message.action == "deleteEvent")
            {
                  var node = global.instances[namespace].state.findNode(message.node);
                  if(!node)
                  {
                    global.instances[namespace].Error('server has no record of ' + message.node,1);
                    return;
                  }
                  if(allowAnonymous || checkOwner(node,sendingclient.loginData.UID))
                  { 
                        global.instances[namespace].Log("Do " +message.action +" of " +node.id,2);
                  }
                  else
                  {
                    global.instances[namespace].Error('permission denied for '+message.action+' on ' + node.id,1);
                    return;
                  }
            }
            //We'll only accept a deleteNode if the user has ownership of the object
            if(message.action == "deleteNode")
            {
                  var node = global.instances[namespace].state.findNode(message.node);
                  if(!node)
                  {
                    global.instances[namespace].Error('server has no record of ' + message.node,1);
                    return;
                  }
                  if(allowAnonymous || checkOwner(node,sendingclient.loginData.UID))
                  { 
                        //we do need to keep some state data, and note that the node is gone
                        global.instances[namespace].state.deleteNode(message.node)
                        global.instances[namespace].Log("deleted " +node.id,1);
                  }
                  else
                  {
                    global.instances[namespace].Error('permission denied for deleting ' + node.id,1);
                    return;
                  }
            }
            //We'll only accept a createChild if the user has ownership of the object
            //Note that you now must share a scene with a user!!!!
            if(message.action == "createChild")
            {
                  global.instances[namespace].Log(message,1);
                  var node = global.instances[namespace].state.findNode(message.node);
                  if(!node)
                  {
                    global.instances[namespace].Error('server has no record of ' + message.node,1);
                    return;
                  }
                  //Keep a record of the new node
                  if(allowAnonymous || checkOwner(node,sendingclient.loginData.UID) || message.node == 'index-vwf')
                  { 
                        var childComponent = JSON.parse(JSON.stringify(message.parameters[0]));
                        if(!childComponent) return;
                        var childName = message.member;
                        if(!childName) return;
                        var childID = childComponent.id || childComponent.uri || ( childComponent["extends"] ) + "." + childName.replace(/ /g,'-'); 
                        childID = childID.replace( /[^0-9A-Za-z_]+/g, "-" ); 
                        childComponent.id = childID;
                        if(!node.children) node.children = {};
                        node.children[childID] = childComponent;
                        node.children[childID].parent = node;
                        if(!childComponent.properties)
                            childComponent.properties = {};
                        fixIDs(node.children[childID]);
                        global.instances[namespace].Log("created " + childID,1);
                  }
                  else
                  {
                    global.instances[namespace].Error('permission denied for creating child ' + node.id,1);
                    return;
                  }
            }
            
            var compressedMessage = messageCompress.pack(JSON.stringify(message))
            //distribute message to all clients on given instance
            for(var i in global.instances[namespace].clients)
            {
                var client = global.instances[namespace].clients[i];
                
                //if the message was get state, then fire all the pending messages after firing the setState
                if(message.action == "getState")
                {
                    global.instances[namespace].Log('Got State',1);
                    if(global.instances[namespace].requestTimer)
                        global.instances[namespace].requestTimer.deleteMe();
                    var state = message.result;
                    global.instances[namespace].cachedState  = JSON.parse(JSON.stringify(state));
                    
                    
                    
                    
                    
                    if(message.client != i && client.pending===true)
                    {
                        client.emit('message',messageCompress.pack(JSON.stringify({"action":"status","parameters":["State Received, Transmitting"],"time":global.instances[namespace].getStateTime}))); 
                        client.emit('message',messageCompress.pack(JSON.stringify({"action":"setState","parameters":[state],"time":global.instances[namespace].getStateTime})));
                    }
                    client.pending = false;
                    for(var j = 0; j < client.pendingList.length; j++)
                    {
                        
                        client.emit('message',client.pendingList[j]);
                        
                        
                    }
                    client.pendingList = [];    
                }
                else
                {
                    //just a regular message, so push if the client is pending a load, otherwise just send it.
                    if(client.pending == true)
                    {
                        client.pendingList.push(compressedMessage);
                        console.log('PENDING');
                        
                    }else
                    {
                        //simulate latency
                        if(global.latencySim > 0)
                        {
                            (function(__client,__message){
                            global.setTimeout(function(){
                                __client.emit('message',__message);
                            },150)
                            })(client,compressedMessage);
                        }else
                        {
                            client.emit('message',compressedMessage);
                        }
                        
                        
                    }
                }
            }
            
      });
      
      //When a client disconnects, go ahead and remove the instance data
      socket.on('disconnect', function () {
          
          var loginData = global.instances[namespace].clients[socket.id].loginData;
          global.log(socket.id,loginData )
          global.instances[namespace].clients[socket.id] = null;    
          delete global.instances[namespace].clients[socket.id];
          //if it's the last client, delete the data and the timer
          
          if(loginData && loginData.clients)
          {
              delete loginData.clients[socket.id];
              global.error("Unexpected disconnect. Deleting node for user avatar " + loginData.UID);
             var avatarID = 'character-vwf-'+loginData.UID;
             for(var i in global.instances[namespace].clients)
              {
                    var cl = global.instances[namespace].clients[i];
                    cl.emit('message',messageCompress.pack(JSON.stringify({"action":"deleteNode","node":avatarID,"time":global.instances[namespace].time})));                   
              }
              global.instances[namespace].state.deleteNode(avatarID);   
          }
          for(var i in global.instances[namespace].clients)
          {
                global.instances[namespace].clients[i].emit('message',messageCompress.pack(JSON.stringify({"action":"status","parameters":["Peer disconnected: " + (loginData?loginData.UID:"Unknown")],"time":global.instances[namespace].getStateTime})));    
          }
          if(Object.keys(global.instances[namespace].clients).length == 0)
          {
            clearInterval(global.instances[namespace].timerID);
            delete global.instances[namespace];
            console.log('Shutting down ' + namespace )
          }

        });
          
    }  // end WebSocketConnection

exports.WebSocketConnection = WebSocketConnection;
exports.setDAL = setDAL;
exports.startup = startup;