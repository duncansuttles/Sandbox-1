var SandboxAPI = require('./sandboxAPI');

//we're going to allow the client to request a list of assets the system will need for this scene
//this allows the client to load and parse some stuff before connecting to the server, so it does not build up a load 
//of events to process while parsing assets

//note that the state could change between the time that the client gets the list of assets, and the time that the client requests the  state
// this is not really an issue, as the client will just have to load the new assets normally.
function ServeJSON(jsonobject,response,URL)
{    
	response.writeHead(200, {
		"Content-Type": "text/json"
	});
	if(jsonobject)
	{
		if (jsonobject.constructor != String)
			response.write(JSON.stringify(jsonobject), "utf8");
		else
			response.write(jsonobject, "utf8");
	}
	response.end();
}

//walk the whole data structure and pick out the url references
function walk(object, list)
{
	if(object && object.terrainType == "heightmapTerrainAlgorithm")
	{
		//so, we must be in the properties for a terrain object
		//todo - deal with img or bt switch
		var terraindata;
		if(object.terrainParams)
			terraindata = {name:"Terrain",type:"terrainBT",url:object.terrainParams.url};
		else if(object.url)
		{
			terraindata = {name:"Terrain",type:"terrainBT",url:object.url};
		}
		if(terraindata)
		{
			list.push(terraindata);
			return;
		}
	}
	for(var i in object)
	{		
		if(i == 'source')
		{

			if(object['type'] && object['type'] != 'link_existing/threejs')
			{
				list.push({type:object['type'],url:object[i]});
				if(object.properties && object.properties.DisplayName)
					list[list.length - 1].name = object.properties.DisplayName;
			}
			if(!object['type'])
				list.push({type:"unknown",url:object[i]});
		}
		if(i == 'src')
		{
			if(object['alpha'] !== undefined)
				list.push({type:'texture',url:object[i]});
			else
				list.push({type:"unknown",url:object[i]});
		}
		if(i == 'url' || i == 'uri')
		{
				list.push({type:"unknown",url:object[i]});
		}

		if(typeof object[i] != 'string')
		walk(object[i],list);
	}
}

//get all assets from the state data and make unique
function parseStateForAssets(state,cb)
{
	
	var list = [];
	walk(state,list);

	var unique = [];
	for(var i =0; i < list.length; i++)
	{
		var found = false;
		for(var j =0; j < unique.length; j++)
		{
			if(unique[j].url == list[i].url)
			{
				found = true;
				break;
			}
		}
		if(!found)
		{
			unique.push(list[i]);
		}
	}



	cb(unique);

}
//get either the last cached copy of the state, or load it from disk
function getState(id,cb)
{
	
	if(global.instances && global.instances[id] && global.instances[id].cachedState)
	{
		var state = global.instances[id].cachedState;
		parseStateForAssets(state,cb);
	}else
	{
		var state =  SandboxAPI.getState(id.replace(/\//g,"_"));
		parseStateForAssets(state,cb);
	}
}
function getAssets(request,response,URL)
{
	var id = request.query.SID;
	getState(id,function(assets)
	{
		ServeJSON(assets,response,URL);
	});
}

exports.getAssets = getAssets;
exports.setSandboxAPI = function(d)
{
	SandboxAPI = d;
}