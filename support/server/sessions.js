//not much left of this now - completely offloaded onto passport
var GUID = require('node-uuid')
    .v4;
var logger = require('./logger');
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
exports.createSession = function()
    {
        return new SessionData();
    }
    //find the session data for a request
exports.GetSessionData = function(request, cb)
{
    if (request.session && request.session.passport && request.session.passport.user && request.session.passport.user.sessionId)
    {
        cb(request.session.passport.user);
        return;
    }
    else if (request.cookieData)
    {
        try
        {

            var session = JSON.parse(request.cookieData.substr(2))
                .passport.user;
            console.log(session);    
            cb(session);
            return;
        }
        catch (e)
        {
            logger.error(e);
            cb(null);
            return;
        }
    }
    else
        cb(null);
}
exports.sessionStartup = function(cb)
{
    cb();
}