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

exports.getState = function(name)
{
	name = name.split('_');
	name = name[name.length -2];

	var path = libpath.normalize('./public/adl/sandbox/examples/' + name +"/state");
        path = libpath.resolve(__dirname, path);
try{
	var data = fs.readFileSync(path ,'utf8');
	
		return JSON.parse(data);	
	}catch(e)
	{
		return null;
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
			cb(null);
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