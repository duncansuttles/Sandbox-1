//not much left of this now - completely offloaded onto passport

function GUID() {
	var S4 = function() {
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

function SessionData() {
	this.sessionId = GUID();
	this.UID = '';
	this.Password = '';
	this.loginTime = new Date();
	this.clients = {};
	this.lastUpdate = new Date();
}

exports.createSession = function() {
	return new SessionData();

}


//find the session data for a request
exports.GetSessionData = function(request, cb) {
	if (request.session && request.session.passport && request.session.passport.user && request.session.passport.user.sessionId)
		cb(request.session.passport.user);
	else if (request.cookieData) {

		try{
			var session = JSON.parse(request.cookieData.substr(2)).passport.user;
			cb(session);
		}catch(e)
		{
			global.error(e);
			cb(null);
		}
	} else
		cb(null);
}

exports.sessionStartup = function(cb) {
	cb();
}