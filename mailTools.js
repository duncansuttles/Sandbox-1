var nodemailer = require("nodemailer");

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = null;
exports.sendMail = function(to,subject,text,html,cb)
{

    if(!global.configuration.sendEmails || !global.configuration.emailFrom || !global.configuration.emailService || !global.configuration.emailPassword || !global.configuration.emailUsername)
    {
        console.log('email system not configured');
        cb(false);
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
            console.log(error);
            cb(false);
        }else{
            console.log("Message sent: " + response.message);
            cb(true);
        }
    });
}