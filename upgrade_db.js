var nstoreDB = require('./DB.js');
var nedbDB = require('./DB_nedb.js');
var async = require('async');

var oldDB;
var newDB;
nstoreDB.new('c:\\vwfdata\\users.db',function(db)
{
	oldDB = db;
	nedbDB.new('c:\\vwfdata\\users.nedb',function(db)
	{
		newDB = db;
		oldDB.all(function(err,results){
			
			var keys = Object.keys(results);
			console.log(keys);
			async.eachSeries(keys,function(val,cb){
				newDB.save(val,results[val],function(err){
					cb();

				});
			});
		});
	});
});