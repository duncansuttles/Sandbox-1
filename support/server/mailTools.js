var nodemailer = require("nodemailer");
var logger = require('./logger');
// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = null;
exports.sendMail = function(to,subject,text,html,cb)
{

    if(!global.configuration.sendEmails || !global.configuration.emailFrom || !global.configuration.emailService || !global.configuration.emailPassword || !global.configuration.emailUsername)
    {
        logger.warn('email system not configured');
        if(cb) cb(false);
        return;
    }

    if(!smtpTransport)
    {
        smtpTransport = nodemailer.createTransport("SMTP",{
        service: global.configuration.emailService,
        auth: {
            user: global.configuration.emailUsername,
            pass: global.configuration.emailPassword
        }
        });
    }

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: global.configuration.emailFrom, // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        text: text, // plaintext body
        html: html // html body
    }

    // send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            logger.error(error);
            if(cb) cb(false);
        }else{
            logger.warn("Message sent: " + response.message);
            if(cb) cb(true);
        }
    });
}
exports.newUser = function(name,email)
{
    this.sendMail(global.configuration.emailFrom,'A new user has signed up for the Sandbox!',"A new user has signed up. The username is " + name + " and email is " + email);
}
exports.newWorld = function(owner,name,id)
{
    this.sendMail(global.configuration.emailFrom,'A new world was created',owner + ' created ' + name + ' at ' + id);
}
exports.serverError = function(err,cb)
{
    this.sendMail(global.configuration.emailFrom,'The server had a panic restart:' + err.message,err.stack,null,cb);
}
exports.resetPasswordMail = function(to,pass)
{
    this.sendMail(to,"Password Reset Notice","Your password for the Sandbox has been reset. Your new password is '" +pass+ "'. You must reset your password next time you log in. This temporary password is valid for 1 day, after which you may log in with your normal password, or request a new temporary password. If you did not request that your password be reset, you can still log in with your old password. In this case, we recommend you change your password as a precaution. ","",function(){});
}
