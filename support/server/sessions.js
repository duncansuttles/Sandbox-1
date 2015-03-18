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

            decode = require('client-sessions').util.decode;
            var sessionData = decode({
                    secret: global.configuration.sessionSecret ? global.configuration.sessionSecret : 'unsecure cookie secret',
                    cookie: {
                        maxAge: global.configuration.sessionTimeoutMs ? global.configuration.sessionTimeoutMs : 10000000
                    },
                     cookieName: 'session', // cookie name dictates the key name added to the request object
  
                     duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
                     activeDuration: 1000 * 60 * 5 //
                },request.cookieData).content;

            cb(sessionData.passport.user);
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