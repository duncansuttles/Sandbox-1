var request = require('request'),
	XAPIStatement = require('./xapistatement'),
	liburl = require('url'),
	DAL = require('./DAL').DAL;


/*
 * build a log statement and submit it
 */
function sendStatement(userId, verb, worldId, worldName, worldDescription)
{
	if( !global.configuration.lrsEndpoint )
		return;
	
	var creds = new Buffer(global.configuration.lrsUsername + ':' + global.configuration.lrsPassword);
	var auth = 'Basic ' + creds.toString('base64');
	
	// build statement
	var stmt = new XAPIStatement( new AccountAgent(userId), verb);
	if(worldId){
		if( verb.id !== exports.verbs.published_item.id ){
			if(worldName === undefined || worldDescription === undefined){
				var dalId = worldId.replace(/\//g,'_');
				DAL.getInstance(dalId, function(state){
					sendStatement(userId, verb, worldId, state.title, state.description);
				});
				return;
			}
			else
				stmt.object = new World(worldId, worldName, worldDescription);
		}
		else {
			stmt.object = new Item(worldId, worldName);
		}
	}
	else
		stmt.object = new XAPIStatement.Activity('http://vwf.adlnet.gov/xapi/virtual_world_sandbox', 'Virtual World Sandbox');

	stmt.addParentActivity('http://vwf.adlnet.gov/xapi/virtual_world_sandbox');
	stmt.context.platform = 'virtual world';

	request.post({'url': liburl.resolve(global.configuration.lrsEndpoint, 'statements'),
		'headers': {'X-Experience-API-Version': '1.0.1', 'Authorization': auth},
		'json': stmt
	},
	function(err,res,body)
	{
		if(err){
			global.error(err);
		}
		else if(res.statusCode === 200){
			global.log('Action posted:', stmt.toString());
		}
		else {
			global.log('Statement problem:', body);
		}
	});
}


/*
 * Agent subclass that truncates account info
 */
function AccountAgent(username)
{
	XAPIStatement.Agent.call(this,{'homePage': 'http://vwf.adlnet.gov', 'name': username}, username);
}
AccountAgent.prototype = new XAPIStatement.Agent;


/*
 * Activity subclass that self-populates from a world id
 */
function World(id, name, description)
{
	var match = /[_\/]adl[_\/]sandbox[_\/]([A-Za-z0-9]{16})[_\/]/.exec(id);
	id = match[1];
	var worldActivityId = 'http://vwf.adlnet.gov/xapi/'+id;

	XAPIStatement.Activity.call(this,worldActivityId,name,description);

	this.definition.type = 'http://vwf.adlnet.gov/xapi/world';
	this.definition.moreInfo = 'http://vwf.adlnet.gov/adl/sandbox/world/'+id;

}
World.prototype = new XAPIStatement.Activity;


/*
 * Activity subclass that describes an inventory item
 */
function Item(id, name)
{
	var xapiId = 'http://vwf.adlnet.gov/xapi/items/'+id;
	XAPIStatement.Activity.call(this, xapiId, name);

	this.definition.type = 'http://vwf.adlnet.gov/xapi/item';
}
Item.prototype = new XAPIStatement.Activity;

/*
 * Export everything
 */
exports.sendStatement = sendStatement;

exports.verbs = {
	'logged_in': {
		'id': 'http://vwf.adlnet.gov/xapi/verbs/logged_in',
		'display': {'en-US': 'logged into'}},
	'logged_out': {
		'id': 'http://vwf.adlnet.gov/xapi/verbs/logged_out',
		'display': {'en-US': 'logged out of'}},
	'created': {
		'id': 'http://vwf.adlnet.gov/xapi/verbs/created',
		'display': {'en-US': 'created'}},
	'destroyed': {
		'id': 'http://vwf.adlnet.gov/xapi/verbs/destroyed',
		'display': {'en-US': 'destroyed'}},
	'published': {
		'id': 'http://vwf.adlnet.gov/xapi/verbs/published',
		'display': {'en-US': 'published'}},
	'unpublished': {
		'id': 'http://vwf.adlnet.gov/xapi/verbs/unpublished',
		'display': {'en-US': 'unpublished'}},
	'published_item': {
		'id': 'http://vwf.adlnet.gov/xapi/verbs/published_(item)',
		'display': {'en-US': 'published to global inventory'}},
	'registered': {
		'id': 'http://adlnet.gov/expapi/verbs/registered',
		'display': {'en-US': 'registered with'}}
};
