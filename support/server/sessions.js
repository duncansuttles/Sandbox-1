


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
  var SessionID;
  if (global.userStorageSessionId!=undefined) {
    SessionID = global.userStorageSessionId;
  } else {
    SessionID = cookies.session;
  }

  //if there is no session ID, return ull
  if(!SessionID){
  cb(); return null}
  global.log(SessionID,3);
  var self = this;
	this.getSessionByID(SessionID,function(thissession)
		{
			if(thissession)
			{
					
					var now = (new Date()) ;
					//if it's been more than 1 hour, and the user has no open socket connections, log out
					if(now- thissession.lastUpdate > 3600 * 1000 && Object.keys(thissession.clients).length == 0)
					{
						global.log('session expired for ' + thissession.UID,3);
						self.deleteSession(thissession,function(){cb(null);});
						
						return;

					}else   //reset the clock
					{
						global.log('Reset session for ' + thissession.UID,3);
						self.resetSession(thissession,function(){
							cb(thissession);
						});
					}
					
			}else
			{	
				
			 	 cb(null);
			 	 return;
			}
		});
}

exports.getSessionByID = function(SessionID,cb)
{

DB.get(SessionID,function(err,val,key)
{
	if(!val) {cb(null); return;}
	val.updated  = function(cb2)
	{
		DB.update(this.sessionId,this,function(){cb2();});
	}
	cb(val);
})

/*	
 for(var i in __Sessions)
  {	
	//find the session record for this ID
	if(__Sessions[i].sessionId == SessionID)
	{
		return __Sessions[i]
	}
   }
   return null;*/
}
exports.createSession = function(UID,Password,isTemp,cb)
{

	var session = new SessionData();
	session.UID = UID;
	session.Password = Password;
	session.PasswordIsTemp = isTemp;
	session.updated = function(cb2)
	{
		DB.update(this.sessionId,this,function(){cb2(session)});
	}
	//__Sessions.push(session);
	DB.save(session.sessionId,session,function(){cb(session)});

}

exports.deleteSession = function(session,cb)
{
	//__Sessions.splice(__Sessions.indexOf(session),1);
	DB.remove(session.sessionId,function(){cb()});
}

exports.resetSession = function(session,cb)
{
	var now = (new Date()) ;
	session.lastUpdate = now;
	session.updated(cb);
}

var DB = null;

exports.sessionStartup= function(cb) 
{
	require('./DB_nedb.js').new(global.datapath + "/sessions.db", function (_DB) {
		DB = _DB;		
		cb();
	});
}
