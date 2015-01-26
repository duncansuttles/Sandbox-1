var fs = require('fs');
var path = require('path');
var statesDir = process.argv[2];
var flag = process.argv[3];


if(!statesDir)
{	
	logger.info("Use: node remove_state_backups.js path [-S]");
	logger.info("Use -S to actually do the delete, otherwise just a preview");

	return;
}
var files = fs.readdirSync(statesDir);

var filesToDelete = [];
for(var i in files)
{
	var state = path.join(statesDir,files[i]);
	var stateStat = fs.statSync(state);
	if(stateStat.isDirectory())
	{
		var backups = fs.readdirSync(state);
		for(var j in backups)
			if(backups[j].indexOf('statebackup') === 0)
			filesToDelete.push(path.join(state,backups[j]));

	}


}

logger.info(filesToDelete)
if(flag == '-S')
{
	for(var i in filesToDelete)
	{
		fs.unlinkSync(filesToDelete[i]);
	}
}else
{
	logger.info("use -S to actually do the delete")
}
