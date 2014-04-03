//This page exists to test a specific problem I noticed yesterday during a bltiz.io test. Somewhere in the pipeline (possibly the DB) we get a stack overflow
//when there are about 40 or 50 concurent clients loading the featured worlds pages as fast as possible. This is my attempt to replicate what blitz.io is doing. 
//does not seem to reproduce the problem. 

var request = require('request');
var URL = require('url');
var url = 'http://wordpress-549209816.us-east-1.elb.amazonaws.com/wordpress/';
var fork=require('child_process').fork;
var async = require('async');
function hitURL()
{
	var time = new Date()
	request(url,function(err,res,body)
	{
		console.log(( new Date())- time,'BODY',res.statusCode);
		if(err) console.error(err);
		else
		{
			var exp = /src=['"]([^'"]*)['"]/ig;
			var links = (body.match(exp));
			var rlinks = [];
			for(var i = 0; i< links.length; i++)
			{
				var link = links[i].substr(5);
				link = link.substring(0,link.length -1);
				link = URL.resolve(url,link);
				if(link.indexOf("amazonaws") == -1)
				rlinks.push(link);
				
			}
			async.each(rlinks,function(val,cb){
				
				var time = new Date()
				request(val,function(err,res,body)
				{
					if(err) console.error(( new Date())- time,err + ": " +val);
					else console.log(( new Date()) - time,res.statusCode + ": " +val);
					cb();
				})


			},function(){

				hitURL();
			})
				
		}

		
	})
}



// -u is the username of the account to use
var p = process.argv.indexOf('-c');
var child = false;
if(p != -1)
child = true;

if(child)
	hitURL();
else
{
	for(var i =0; i < 10; i++)
		fork('page_performance_test.js',[ '-c']);

}


