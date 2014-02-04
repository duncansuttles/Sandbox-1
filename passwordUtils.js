var hash = require('./hash');
var CryptoJS = require('cryptojs');
var DAL = require('./DAL').DAL;
var mailTools = require('./mailTools');
function SessionData()
{
	this.sessionId = GUID();
	this.UID = '';
	this.Password = '';
	this.loginTime = new Date();
	this.clients = {};
	this.lastUpdate = new Date();
}

//simple functio to write a response
function respond(response,status,message)
{
	response.writeHead(status, {
					"Content-Type": "text/plain"
				});
	response.write(message + "\n");
	global.log(message,2);
	response.end();
}

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

var GenerateTempPassword = function ()
{
	return Math.floor(
			Math.random() * 0x10000 /* 65536 */
		).toString(16);
};


//this is the same algo used on the client side. 
//Note: the client of course never sends the server the plain text password, instead runs this algo and sends the resutls.
//The results are hashed once and stored in the db.		
exports.EncryptPassword = function (password, username,salt)
{
	var unencrpytedpassword = password + username + salt;
	for (var i = 0; i < 1000; i++)
	{
		unencrpytedpassword = CryptoJS.Crypto.SHA256(unencrpytedpassword) + '';
	}
	
	return unencrpytedpassword;
}

exports.hash = hash.hash;

exports.ResetPassword = function(username,response)
{
	DAL.getUser(username,function(user1){

		if(!user1 && response)
		{
			respond(response,500,"User not found");
			return;
		}
		console.log(user1);
		var newPassword = GenerateTempPassword();
		var clientHash = self.EncryptPassword(newPassword,username,user1.Salt);
		console.log(clientHash);
		var serverHash = hash.Hash(clientHash);
		console.log(serverHash);
		var data = {};
		
		data.TempPassword = {
			Password:serverHash,
			Time: new Date()
		}
		console.log('User '+username+' reset password to ' + newPassword);
		DAL.updateUser(username,data,function()
		{
			mailTools.sendMail(user1.Email,"Password Reset Notice","Your password for the Sandbox has been reset. Your new password is '" +newPassword+ "'. You must reset your password next time you log in. This temporary password is valid for 1 day, after which you may log in with your normal password, or request a new temporary password. If you did not request that your password be reset, you can still log in with your old password. In this case, we recommend you change your password as a precaution. ","",function()
			{}
			);
			if(response)
			{
				respond(response,200,"");
				return;
			}
		});
	});
}

//Read the password from the profile for the UID user, and callback with the match
exports.CheckPassword = function(UID,Password, callback)
{
	DAL.getUser(UID,function(user)
	{
		if(!user)
		{
			callback(false);
			return;
		}
		//the users regualar password
		var normalpass = user.Password == Hash(Password);	
		var temppass = false;

		if(user.TempPassword)
		{
			if((new Date()) - Date.parse(user.TempPassword.Time) < 60 * 60 * 24)
			{
				if(user.TempPassword.Password ==  Hash(Password))
					temppass = true;
			}
		}
		callback(normalpass || temppass,temppass);
		return;
	});
}

//dont check the password - it's a big hash, so complexity rules are meaningless
exports.UpdatePassword = function (URL,response)
{
	if(!URL.loginData)
	{
		respond(response,401,'no login data saving profile');
		return;
	}
	var data = {};
	//someone could try to hit the api and create a user with a blank password. Don't allow
	if(!URL.query.P || URL.query.P.length < 8)
	{
		respond(response,401,'bad password');
		return;
	}
	log(URL.query.P);
	data.Password = Hash(URL.query.P);
	//remove the temp password from the database
	data.TempPassword = null;
	DAL.updateUser(URL.loginData.UID,data,function()
	{
		//make the password as not temp, so the user can use the site normally.
		URL.loginData.PasswordIsTemp = false;
		respond(response,200,'');
		return;
	});
}

var self = exports;

//login to the site
exports.SiteLogin = function (response,URL)
{
			var UID = URL.query.UID;
			var password = URL.query.P;
			
			
			if(!UID || !password)
			{
				respond(response,401,'Login Format incorrect');
				return;
			}
			if(URL.loginData)
			{
				respond(response,401,'Already Logged in');
				return;
			}
			
			self.CheckPassword(UID,password,function(ok,isTemp)
			{
				global.log("Login "+ ok,2);
				if(ok)
				{
					var session = new SessionData();
					session.UID = UID;
					session.Password = password;
					session.PasswordIsTemp = isTemp;
					global.sessions.push(session);
					
					response.writeHead(200, {
							"Content-Type":  "text/plain",
							"Set-Cookie": "session="+session.sessionId+"; Path=/; HttpOnly;"
					});
					response.write("Login Successful", "utf8");
					global.log('Client Logged in',1);
					response.end();
				}else
				{
					respond(response,401,'Password incorrect');
					return;
				}
			});		
}

//login to the site
exports.SiteLogout = function (response,URL)
{
			
			if(!URL.loginData)
			{
				respond(response,401,"Client Not Logged In");
				return;
			}
			if(global.sessions.indexOf(URL.loginData) != -1)
			{
				global.sessions.splice(global.sessions.indexOf(URL.loginData),1);
				response.writeHead(200, {
							"Content-Type":  "text/plain",
							"Set-Cookie": "session=; HttpOnly;"
					});
				response.end();	
			}else
			{
				respond(response,401,"Client Not Logged In");
				return;
			}
			return;
			
}