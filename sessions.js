function SessionData()
{
	this.sessionId = GUID();
	this.UID = '';
	this.Password = '';
	this.loginTime = new Date();
	this.clients = {};
	this.lastUpdate = new Date();
}

var __Sessions = [];
function GUID()
{
	var S4 = function ()
	{
		return Math.floor(
				Math.random() * 0x10000 /* 65536 */
			).toString(16);
	};

	return (
			S4() + S4() + "-" +
			S4() + "-" +
			S4() + "-" +
			S4() + "-" +
			S4() + S4() + S4()
		);
}
exports.getAllSessions = function()
{
	return __Sessions;
}
//find the session data for a request
exports.GetSessionData = function(request,cb)
{
  //request should contain the session ID in the cookie header
  if(!request.headers['cookie'])
  {
	cb();
  return null;
}
	
  //extract our session ID from the header	
  cookies = {};
  var cookielist = request.headers.cookie.split(';');
  
  for(var i = 0; i < cookielist.length; i++)
  {
	var parts = cookielist[i].split('=');
    cookies[parts[0].trim()] = (parts[1] || '').trim();
  }

  var SessionID = cookies.session;
  
  //if there is no session ID, return ull
  if(!SessionID){
  cb(); return null}
  global.log(SessionID,3);
 	
	var thissession = this.getSessionByID(SessionID);
	if(thissession)
	{
		var now = (new Date()) ;
		//if it's been more than 1 hour, and the user has no open socket connections, log out
		if(now- thissession.lastUpdate > 3600 * 1000 && Object.keys(thissession.clients).length == 0)
		{
			global.log('session expired for ' + thissession.UID,3);
			this.deleteSession(thissession);
			cb(null);
			return;

		}else   //reset the clock
		{
			global.log('Reset session for ' + thissession.UID,3);
			this.resetSession(thissession);
		}
		cb(thissession);
		return;
  	}	
 	 cb(null);
 	 return;
}

exports.getSessionByID = function(SessionID)
{
 for(var i in __Sessions)
  {	
	//find the session record for this ID
	if(__Sessions[i].sessionId == SessionID)
	{
		return __Sessions[i]
	}
   }
   return null;
}
exports.createSession = function(UID,Password,isTemp)
{

	var session = new SessionData();
	session.UID = UID;
	session.Password = Password;
	session.PasswordIsTemp = isTemp;
	__Sessions.push(session);
	return session;

}

exports.deleteSession = function(session)
{
	__Sessions.splice(__Sessions.indexOf(session),1);
}

exports.resetSession = function(sessions)
{
	var now = (new Date()) ;
	sessions.lastUpdate = now;
}