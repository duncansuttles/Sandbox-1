var root = '/adl/sandbox',
fileList = [],
routesMap = {},
DAL = {},
avatarsList,
fs = require('fs'),
async = require('async'),
URL = require('url'),
avatar = false,
blog = false,
doc = false;

fs.readdir(__dirname + '/public' + root + '/views/help', function(err, files){
	var tempArr = [];
	
	for(var i = 0; i < files.length; i++){
		tempArr = files[i].split('.');
		if(tempArr[1] == 'js'){
			fileList.push(tempArr[0].toLowerCase());
		}
	}
});

exports.setDAL = function(d){
	DAL = d;
};
exports.setDocumentation = function(cs){
	if(cs.blog)
		blog = cs.blog;
		
	if(cs.documentation)
		doc = cs.documentation;
};

exports.setAvatarsList = function(a){
	console.log("Landing: ", a);
	avatarsList = a;
};

exports.acceptedRoutes = ['test','avatar','sandbox','index','create', 'signup', 'login','logout','edit','remove','history','user', 'worlds', 'admin', 'admin/users', 'admin/worlds', 'admin/edit','admin/avatars','publish'];
routesMap = {
	'sandbox': {template:'index'},
	'home': {template:'index'},
	'edit': {sid: true},
	'publish': {sid: true},
	'history': {sid: true},
	'remove': {sid:true, title: 'Warning!'},
	'user': {sid:true, title: 'Account'},
	'admin': {sid:true, title:'Admin', fileList: fileList, template: 'admin/admin'},
	'admin/edit': {fileList: fileList},
	'admin/avatars': {avatarsList: true},
	'index': {home:true},
	'avatar': {avatar:true, avatarsList: true}
};

exports.generalHandler = function(req, res, next){
	
	var sessionData = global.SandboxAPI.getSessionData(req);
	
	if(!req.params.page)
		req.params.page = 'index';

	/*if(req.params.page.indexOf('admin') > -1 && (!sessionData || sessionData.UID != global.adminUID)){
		next();
		return;
	}*/
		
	var routeIndex = exports.acceptedRoutes.indexOf(req.params.page);

	if(routeIndex >= 0){
		
		var currentAcceptedRoute = exports.acceptedRoutes[routeIndex], title = '', sid = '', template = currentAcceptedRoute, fileList = [], home = false, showAvatarList;
		if(routesMap[currentAcceptedRoute]){
			
			title = routesMap[currentAcceptedRoute].title ? routesMap[currentAcceptedRoute].title : '';
			sid = routesMap[currentAcceptedRoute].sid ?  root + '/' + (req.query.id?req.query.id:'') + '/' : '';
			template = routesMap[currentAcceptedRoute].template ? routesMap[currentAcceptedRoute].template : currentAcceptedRoute;
			fileList = routesMap[currentAcceptedRoute].fileList ? routesMap[currentAcceptedRoute].fileList : [];	
			home = routesMap[currentAcceptedRoute].home ? routesMap[currentAcceptedRoute].home : false;	
			avatar = routesMap[currentAcceptedRoute].avatar ? routesMap[currentAcceptedRoute].avatar : false;	
			showAvatarList = routesMap[currentAcceptedRoute].avatarsList ? JSON.stringify(avatarsList) : false;	
		}
		
		res.locals = {sid: sid, root: getFrontEndRoot(req), title: title, fileList:fileList, home: home, avatar:avatar, blog:blog, doc:doc, avatarsList: showAvatarList};
		res.render(template);
	}
	
	else{
		console.log("Not found");
		//res.status(404).end('Error');
		
		next();
	}
};

exports.help = function(req, res){
	
	var currentIndex = fileList.indexOf(req.params.page);
	var displayPage = currentIndex >= 0 ? fileList[currentIndex] : 'index';

	
	res.locals = { sid: root + '/' + (req.query.id?req.query.id:'') + '/', root: getFrontEndRoot(req), script: displayPage + ".js"};
	res.render('help/template');
};
exports.world = function(req, res, next){
	DAL.getInstance("_adl_sandbox_"+req.params.page+"_",function(doc){
		res.locals = { sid: root + '/' + (req.query.id?req.query.id:'') + '/', root: getFrontEndRoot(req), world: doc, id: req.params.page?req.params.page:''};
		res.render('worldTemplate');
	});

};

exports.handlePostRequest = function(req, res, next){
	var data, tempAction = req.params.action ? req.params.action : req.params.page;
	try{
		data = JSON.parse(req.body);
	}
	catch(e){
		data = '';
	}
	var sessionData = global.SandboxAPI.getSessionData(req);
	
	//Temporarily commenting out authorization
	/*if(!sessionData || sessionData.UID != global.adminUID){
		next();
		return;
	}*/
	
	switch(tempAction){	
		case "delete_users":			
			DAL.deleteUsers(data, function(){
				res.end("done");
			});
			break;	
			
		case "delete_worlds":			
			DAL.deleteInstances(data, function(){
				res.end("done");
			});
			break;	
		
		case "get_users":
			DAL.getAllUsersInfo(function(docs){

				for(var i in docs){
					if(docs[i] && docs[i].Username == '__Global__'){
						docs.splice(i);
					}
				}
				
				res.end(JSON.stringify(docs));
			});
			break;
		
		case "get_user_info":
			
			async.series([

				function(cb){
					DAL.find({owner: data.Username}, function(err, results){
						cb(null, results);
					});
				
				},
				
				function(cb){
					DAL.getInstances(function(state)
					{
						cb(null, state);

					});
				},
				
				function(cb){
					DAL.getInventoryDisplayData(data.Username, function(inventoryInfo){
						cb(null, inventoryInfo);
					});
				}
			], 
			
			function(err, results){
			
				var serveObj = [{},{}];
				console.log(results);
				for(var key in results[0]){
					if(results[1][key]){
						serveObj[0][key] = results[1][key];
					}
				}
				serveObj[1] = results[2];
				res.end(JSON.stringify(serveObj));
			});
			

		
		break;
		
		case "update_user":
			var userId = data.Username;
			console.log(data);	
			delete data.Salt;	
			delete data.Username;				
			break;			
			
		case "update_world":
			var worldId = "_adl_sandbox_" + data.id + "_";
			delete data.id;	
			delete data.hotState;	
			delete data.editVisible;	
			delete data.isVisible;	
			
			DAL.updateInstance(worldId, data, function(e){
				res.end(e ? "done" : "error");
			});
			break;
		
		default: 
			next();
			break;
	}
};

function getFrontEndRoot(req){
	var pathname = URL.parse(req.url).pathname, 
	currentIndex = pathname.indexOf("sandbox/"), 
	frontEndRoot = '', 
	numSlashes = 0;
	
	if(currentIndex >= 0){

		numSlashes = (pathname.substr(pathname.indexOf("sandbox/") + 8).match(/\//g) || []).length;
		if(numSlashes == 0){
			frontEndRoot = '.';
		}
		
		else{
			for(var i = 0; i < numSlashes; i++){
				frontEndRoot += i > 0 ? "/.." : "..";
			}
		}
	}
	
	else{
		frontEndRoot = './sandbox';
	}

	return frontEndRoot;
}

