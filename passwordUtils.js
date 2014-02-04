var hash = require('./hash');
var  CryptoJS = require('cryptojs');
var DAL = require('./dal');


var GenerateTempPassword = function ()
{
	return Math.floor(
			Math.random() * 0x10000 /* 65536 */
		).toString(16);
};


//this is the same algo used on the client side. 
//Note: the client of course never sends the server the plain text password, instead runs this algo and sends the resutls.
//The results are hashed once and stored in the db.		
var EncryptPassword = function (password, username,salt)
{
	var unencrpytedpassword = password + username + salt;
	for (var i = 0; i < 1000; i++)
	{
		unencrpytedpassword = CryptoJS.Crypto.SHA256(unencrpytedpassword) + '';
	}
	
	return unencrpytedpassword;
}

exports.encryptPassword = EncryptPassword
exports.hash = hash.hash;

var ResetPassword = function(username)
{
	DAL.getUser(username,function(user){

		var newPassword = GenerateTempPassword();
		var clientHash = EncryptPassword(newPassword,username,user.Salt);
		var serverHash = hash.Hash(clientHash);
		user.TempPassword = {
			Password:serverHash,
			Time: new Date();
		}
		console.log('User '+username+' reset password to ' + newPassword);
		DAL.updateUser(username,user,function()
		{


		});
	});
}