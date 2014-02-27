var request = require('request'),
	XAPIStatement = require('./xapistatement');

var creds = new Buffer(global.config.lrsUsername + ':' + global.config.lrsPassword);
var auth = 'Basic ' + creds.toString('base64');

function sendStatement(stmt)
{
	request.post({'url': liburl.resolve(global.config.lrsEndpoint, 'statements'),
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

function AccountAgent(username)
{
	XAPIStatement.Agent.call({'homePage': 'http://vwf.adlnet.gov', 'name': username}, username);
}
AccountAgent.prototype = new XAPIStatement.Agent;

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
