
var nedbDB = require('./DB_nedb.js');
var async = require('async');

var oldDB;
var newDB;
nedbDB.new('c:\\vwfdata\\users.nedb',function(db)
{
	
		db.get('StateIndex',function(err,results){
			
			
			console.log(results);
			async.eachSeries(results,function(val,cb){
				
				db.get(val,function(err,value){
					
					if(!value || !val || val.length < 2) 
					{
						console.log('removing '+ val + value);
						//db.remove(val,function(){
						
						//	db.listDepend('StateIndex',val,function(){
								cb();
						//	});
							
						//});
					}else
					{
						cb();
					}
				});
				
			});
		});
	
});