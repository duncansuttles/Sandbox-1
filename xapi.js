var request = require('request'),
	XAPIStatement = require('./xapistatement');


/*
 * build a log statement and submit it
 */
function sendStatement(userId, verb, worldId, worldName, worldDescription)
{
	var creds = new Buffer(global.configuration.lrsUsername + ':' + global.configuration.lrsPassword);
	var auth = 'Basic ' + creds.toString('base64');

	// build statement
	var stmt = new Statement( new AccountAgent(userId), verb);
	if(world)
		stmt.object = new World(world, worldName, worldDescription);
	else
		stmt.object = new XAPIStatement.Activity('http://vwf.adlnet.gov/xapi/virtual_world_sandbox', 'Virtual World Sandbox');
	stmt.context = {'platform': 'virtual world'};

	request.post({'url': liburl.resolve(global.configuration.lrsEndpoint, 'statements'),
		'headers': {'X-Experience-API-Version': '1.0.1', 'Authorization': auth},
		'json': stmt
	},
	function(err,res,body)
	{
		if(err){
			global.error(err);
		}
		else {
			global.log('Action posted', body);
		}
	});
}


/*
 * Agent subclass that truncates account info
 */
function AccountAgent(username)
{
	XAPIStatement.Agent.call({'homePage': 'http://vwf.adlnet.gov', 'name': username}, username);
}
AccountAgent.prototype = new XAPIStatement.Agent;


/*
 * Activity subclass that self-populates from a world id
 */
function World(id, name, description)
{
	var match = /_adl_sandbox_([A-Za-z0-9]{16})_/.exec(id);
	id = match[1];
	var worldActivityId = 'http://vwf.adlnet.gov/xapi/'+id;

	XAPIStatement.Activity.call(this,worldActivityId,name,description);

	this.definition.type = 'http://vwf.adlnet.gov/xapi/world';
	this.definition.moreInfo = 'http://vwf.adlnet.gov/adl/sandbox/world/'+id;
}
World.prototype = new XAPIStatement.Activity;


/*
 * Export everything
 */
exports.sendStatement = sendStatement;

exports.Statement = XAPIStatement;
exports.Statement.World = World;

exports.verbs = {
	'logged_in': {
		'id': 'http://vwf.adlnet.gov/xapi/verbs/logged_in',
		'display': {'en-US': 'logged into'}},
	'logged_out': {
		'id': 'http://vwf.adlnet.gov/xapi/verbs/logged_out',
		'display': {'en-US': 'logged out of'}},
};
