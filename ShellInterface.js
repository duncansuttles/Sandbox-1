var libpath = require('path'),
    http = require("http"),
    fs = require('fs'),
    url = require("url"),
    mime = require('mime'),
	sio = require('socket.io'),
	YAML = require('js-yaml');
	SandboxAPI = require('./sandboxAPI'),
	readline = require('readline');
var passwordUtils = require('./passwordUtils');
var DAL = require('./DAL').DAL;

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

function ParseLine(str)
{
	// new parse function splits on white space except between quotes
	var ret = [];

	// make sure quotes are in pairs
	var quotelist = str.split('"');
	if( quotelist.length%2 !== 1 ){
		throw 'Error: cannot parse unmatched quotes';
	}

	for(var i=0; i<quotelist.length; i++)
	{
		// not quoted
		if( i%2 === 0 ){
			var tokens = quotelist[i].split(/\s+/);
			for(var j=0; j<tokens.length; j++){
				if(tokens[j] !== '')
					ret.push(tokens[j]);
			}
		}
		// quoted
		else
			ret.push(quotelist[i]);
	}

	return ret;
}

function CheckMatch(test, input)
{
	var pattern = test.split(' ');
	for(var i=0; i<pattern.length; i++)
	{
		if( /^<.*>$/.test(pattern[i]) ) continue;

		var re = new RegExp('^'+pattern[i]+'$','i');
		if( !input[i] || !re.test(input[i]) )
			return false;
	}
	return true;
}

function StartShellInterface()
{
	//shell interface defaults
	global.log('Starting shell interface',0);
	rl = readline.createInterface(process.stdin, process.stdout);
	rl.setPrompt('> ');

	// the list of available commands
	var commands = [
		{
			'command': 'show instances',
			'description': '',
			'callback': function(commands){
				var keys = Object.keys(global.instances);
				for(var i in keys)
					console.log(keys[i]);
			}
		},
		{
			'command': 'show users',
			'description': '',
			'callback': function(commands){
				DAL.getUsers(function(users)
				{
					console.log(users);
				});
			}
		},
		{
			'command': 'show user <username>',
			'description': '',
			'callback': function(commands){
				
				DAL.getUser( commands[2], function(users)
				{
					console.log(users);
				});
			}
		},
		{
			'command': 'show inventory <username>',
			'description': '',
			'callback': function(commands){
				
				DAL.getInventoryForUser(commands[2],function(inventory,key)
				{
					console.log('Inventory Database key is ' + key);
					console.log(JSON.stringify(inventory));
				});
			}
		},
		{
			'command': 'show inventorydisplay <arg>',
			'description': '',
			'callback': function(commands){
				DAL.getInventoryDisplayData(commands[2],function(data)
				{
					console.log(data);
				});
				
			}
		},
		{
			'command': 'show inventoryitem metadata <arg1> <arg2>',
			'description': '',
			'callback': function(commands){
				DAL.getInventoryItemMetaData(commands[3],commands[4],function(data)
				{
					console.log(data);
				});
			}
		},
		{
			'command': 'show inventoryitem assetdata <arg1> <arg2>',
			'description': '',
			'callback': function(commands){
				DAL.getInventoryItemAssetData(commands[3],commands[4],function(data)
				{
					console.log(data);
				});
			}
		},
		{
			'command': 'show sessions',
			'description': '',
			'callback': function(commands){
				for(var i =0; i < global.sessions.length; i++)
					console.log(global.sessions[i]);	
				
			}
		},
		{
			'command': 'show states',
			'description': '',
			'callback': function(commands){
				DAL.getInstances(function(data)
				{
					console.log(data);
				});	
				
			}
		},
		{
			'command': 'show state <state_id>',
			'description': '',
			'callback': function(commands){
				DAL.getInstance(commands[2],function(data)
				{
					console.log(data);
				});	
			}
		},
		{
			'command': 'show clients',
			'description': '',
			'callback': function(commands){
				for(var i in global.instances)
				{
					var keys = Object.keys(global.instances[i].clients);
					for(var j in keys)
					   console.log(keys[j]);
				}
				
			}
		},
		{
			'command': 'show users',
			'description': '',
			'callback': function(commands){
				for(var i in global.instances)
				{
					var keys = Object.keys(global.instances[i].clients);
					for(var j in keys)
					{
					   var client = global.instances[i].clients[keys[j]];
					   if(client && client.loginData)
					   {
						  console.log(client.loginData.UID);
					   }
					}
				}

			}
		},
		{
			'command': 'compact',
			'description': '',
			'callback': function(commands){
				DAL.compactDatabase();
				
			}
		},
		{
			'command': 'exec <command>',
			'description': '',
			'callback': function(commands){
				eval(commands[1]);
			}
		},
		{
			'command': 'import users',
			'description': '',
			'callback': function(commands){
				DAL.importUsers();
			}
		},
		{
			'command': 'import states',
			'description': '',
			'callback': function(commands){
				DAL.importStates();
			}
		},
		{
			'command': 'purge states',
			'description': '',
			'callback': function(commands){
				DAL.purgeInstances();
			}
		},
		{
			'command': 'find state <arg1> <arg2>',
			'description': '',
			'callback': function(commands){
				var search = {}
				search[commands[2]] = commands[3];
				DAL.findState(search,function(results)
				{
					console.log(results);
				});
			}
		},
		{
			'command': 'update inventoryitem metadata <arg1> <arg2> <newdata>',
			'description': '',
			'callback': function(commands){
				DAL.updateInventoryItemMetadata(commands[3],commands[4],JSON.parse(commands[5].replace(/'/g,'"')),function()
				{
				
				});
			}
		},
		{
			'command': 'update user <username> <newdata>',
			'description': '',
			'callback': function(commands){
				DAL.updateUser(commands[2],JSON.parse(commands[3].replace(/'/g,'"')),function()
				{
				
				});
			}
		},
		{
			'command': 'update state <state_id> <newdata>',
			'description': '',
			'callback': function(commands){
				DAL.updateInstance(commands[2],JSON.parse(commands[3].replace(/'/g,'"')),function()
				{
				
				});
			}
		},
		{
			'command': 'feature state <state_id>',
			'description': '',
			'callback': function(commands){
				DAL.updateInstance(commands[2],{featured:true},function()
				{
				
				});
				
			}
		},
		{
			'command': 'resetPassword <newpass>',
			'description': '',
			'callback': function(commands){
				console.log(commands[1]);
				passwordUtils.ResetPassword(commands[1]);			
			}
		},
		{
			'command': 'unfeature state <state_id>',
			'description': '',
			'callback': function(commands){
				DAL.updateInstance(commands[2],{featured:false},function()
				{
				
				});
			}
		},
		{
			'command': 'search inventory <arg1> <arg2>',
			'description': '',
			'callback': function(commands){
				DAL.searchInventory(commands[2],commands[3].split(','),function(results)
				{
					console.log(results);
				});
			}
		},
		{
			'command': 'search states <arg1>',
			'description': '',
			'callback': function(commands){
				DAL.findState(JSON.parse(commands[2].replace(/'/g,'"')),function(results)
				{
					console.log(results);
				});
				
			}
		},
		{
			'command': 'boot <username_or_state>',
			'description': '',
			'callback': function(commands){
				var name = commands[1];
			
				for(var i in global.instances)
				{
					//shuting down whole instance
					if(i == name)
					{
						var keys = Object.keys(global.instances[i].clients);
						for(var j in keys)
						{
						   var client = global.instances[i].clients[keys[j]];
						   client.disconnect();
						}
					}
					else
					{
						//find either the client or the user and boot them from all instances
						var keys = Object.keys(global.instances[i].clients);
						for(var j in keys)
						{
						   var client = global.instances[i].clients[keys[j]];
						   if(keys[j] == name)
						   {
							   client.disconnect();
						   }
						   if(client && client.loginData)
						   {
							  if(client.loginData.UID == name)
								   client.disconnect();
						   }
						}
					}
				}

			}
		},
		{
			'command': 'message <username> <message>',
			'description': '',
			'callback': function(commands){
				var name = commands[1];
			
				for(var i in global.instances)
				{
					{
						for(var j in global.instances[i].clients)
						{
						   var client = global.instances[i].clients[j];
						  
						   if(client && client.loginData)
						   {
							  if(client.loginData.UID == name)
								client.emit('message',{"time":global.instances[i].time,"node":"index-vwf","action":"callMethod","member":'PM',"parameters":[[JSON.stringify({receiver:name,sender:"*System*",text:commands[2]})]]});
						   }
						}
					}
				}
			}
		},
		{
			'command': 'broadcast <message>',
			'description': '',
			'callback': function(commands){
				var name = commands[1];
			
				for(var i in global.instances)
				{
					for(var j in global.instances[i].clients)
					{
					   var client = global.instances[i].clients[j];   
					   if(client && client.emit)
						client.emit('message',{"time":global.instances[i].time,"node":"index-vwf","action":"callMethod","member":'receiveChat',"parameters":[[JSON.stringify({sender:"*System*",text:commands[1]})]]});
					   
					}
					
				}

			}
		},
		{
			'command': 'delete user <username>',
			'description': '',
			'callback': function(commands){
				DAL.deleteUser(commands[2],function(res){
					
					console.log(res);
				
				});
			}
		},
		{
			'command': 'delete inventoryitem <arg1> <arg2>',
			'description': '',
			'callback': function(commands){
				DAL.deleteInventoryItem(commands[2],commands[3],function()
				{
				
				});
			}
		},
		{
			'command': 'clear users',
			'description': '',
			'callback': function(commands){
				DAL.clearUsers();
			}
		},
		{
			'command': 'clear inventoryitem',
			'description': '',
			'callback': function(commands){
				DAL.clearStates();
			}
		},
		{
			'command': 'clear cache',
			'description': '',
			'callback': function(commands){
				global.FileCache.clear();
			}
		},
		{
			'command': 'create user <username>',
			'description': '',
			'callback': function(commands){
				DAL.createUser(commands[2],{username:commands[2],loginCount:0},function(res){
					
					console.log(res);
				
				});
				
			}
		},
		{
			'command': 'create inventoryitem <arg1> <arg2>',
			'description': '',
			'callback': function(commands){
				DAL.addToInventory(commands[2],{title:commands[3],created:new Date()},{data:'test asset binary data'},function()
				{
				
				});
				
			}
		},
		{
			'command': 'loglevel',
			'description': '',
			'callback': function(commands){
				console.log(global.logLevel);
			}
		},
		{
			'command': 'setloglevel <level>',
			'description': '',
			'callback': function(commands){
				global.logLevel = parseInt(commands[1]);
			}
		},
		/*{
			'command': 'hash',
			'description': '',
			'callback': function(commands){
				console.log(require('./passwordUtils.js').EncryptPassword('Rob','Rob','Salt'));
			}
		},*/
		{
			'command': 'test login <state_id> <num_bots>',
			'description': '',
			'callback': function(commands){
				var name = commands[2];
			
				for(var i in global.instances)
				{
					//shuting down whole instance
					if(i == name)
					{
						var keys = Object.keys(global.instances[i].clients);
						for(var k =0; k < parseInt(commands[3]); k++)
						{
							for(var j in keys)
							{
								var client = global.instances[i].clients[keys[j]];
								client.emit('message',{"time":global.instances[i].time,"node":"index-vwf","action":"createChild","member":GUID(),"parameters":[{"extends":"NPCcharacter.vwf","source":"usmale.dae","type":"model/vnd.collada+xml","properties":{"activeCycle":"","motionStack":[],"rotZ":Math.random() * 180,"PlayerNumber":GUID(),"owner":GUID(),"ownerClientID":GUID(),"profile":{"Username":GUID(),"Name":"Robert Chadwick","Age":"32","Birthday":"","Password":"","Relationship":"Married","City":"Mclean","State":"VA","Homepage":"","Employer":"ADL","Title":"","Height":"","Weight":"","Nationality":"","Avatar":"usmale.dae"},"translation":[Math.random() * 100-50,Math.random()*100 -50,0.01]},"events":{"ShowProfile":null,"Message":null},"scripts":[
								"this.ShowProfile = "+
								"function(){ "+
								"	if(vwf.client() != vwf.moniker()) return; "+
								"   _UserManager.showProfile(_DataManager.GetProfileForUser(this.PlayerNumber))     "+
								" }; \n"+
								"this.Message = function(){"+
								"	if(vwf.client() != vwf.moniker()) return; "+
								"	setupPmWindow(this.PlayerNumber)     "+
								"}"
								]}],"client":GUID()});
							}
						}
					}
				}

			}
		},
	];

	rl.prompt();

	rl.on('line', function(line)
	{
		// parse input
		var cmd;
		try {
			cmd = ParseLine(line);
		}
		catch(e){
			console.log(e);
			rl.prompt();
			return;
		}
		//console.log(cmd);

		// start going through the options
		
		// help
		if( CheckMatch('help', cmd) ){
			console.log('Available commands:');
			console.log('help - Show this message');
			console.log('exit - Shut down the server');
			for(var i=0; i<commands.length; i++)
				console.log(commands[i].command,'-',commands[i].description);
		}

		// exit
		else if( CheckMatch('exit', cmd) ){
			rl.close();
		}

		// all other commands
		else {
			for(var i=0; i<commands.length; i++)
			{
				if(CheckMatch(commands[i].command,cmd)){
					if( commands[i].command.split(' ').length === cmd.length )
						commands[i].callback(cmd);
					else {
						console.log('Improper invocation, see usage.');
						console.log(commands[i].command,'-',commands[i].description);
					}
				}
			}
		}
		
		rl.prompt();

	}).on('close', function()
	{
		global.log('Terminating server');
		process.exit(0);
	});

}
exports.setDAL = function(p)
{
	DAL = p;
}	
exports.StartShellInterface = StartShellInterface;
