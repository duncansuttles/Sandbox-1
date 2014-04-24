var fs = require('fs');
var libpath = require('path');
exports.getExampleData = function(name,cb)
{
	name = name.split('_');
	name = name[name.length -2];

	var path = libpath.normalize('./public/adl/sandbox/examples/' + name +"/state");
        path = libpath.resolve(__dirname, path);

	fs.readFile(path ,'utf8',function(err,data)
	{
		try{
			cb(JSON.parse(data));
		}catch(e)
		{
			cb(null);
		}
	});
}

exports.getState = function(name,cb)
{
	name = name.split('_');
	name = name[name.length -2];

	var path = libpath.normalize('./public/adl/sandbox/examples/' + name +"/state");
        path = libpath.resolve(__dirname, path);
	//sync call
	if(!cb)
	{
		try{
		var data = fs.readFileSync(path ,'utf8');
		
			return JSON.parse(data);	
		}catch(e)
		{
			return null;
		}
	}
	//async call
	if(cb)
	{
		fs.readFile(path ,'utf8',function(err,data1){
			var data = null;
			try{
				var data = JSON.parse(data1)
			}catch(e)
			{
				data = null;
			}
			cb(data);
		});
	}
}

exports.getExampleMetadata = function(name,cb)
{	
	name = name.split('_');
	name = name[name.length -2];
	var path = libpath.normalize('./public/adl/sandbox/examples/' + name +"/metadata");
        path = libpath.resolve(__dirname, path);
	fs.readFile(path ,'utf8',function(err,data)
	{
		try{
			cb(JSON.parse(data));
		}catch(e)
		{
			cb({title:"",description:""});
		}
	});

}

exports.saveExampleData = function(URL,name,data,cb)
{
	name = name.split('_');
	name = name[name.length -2];
	var path = libpath.normalize('./public/adl/sandbox/examples/' + name +"/state");
        path = libpath.resolve(__dirname, path);
	if(URL.loginData && URL.loginData.UID == global.adminUID)
	{
		fs.writeFile(path ,data,"binary",function(err,data)
		{
			cb();
		});
	}
}