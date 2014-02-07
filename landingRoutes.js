var root = '/adl/sandbox',
fileList = [],
routesMap = {},
DAL = require('./DAL').DAL;
fs = require('fs'),
async = require('async'),
URL = require('url'),
avatar = false,
blog = false,
doc = false;
var sessions = require('./sessions');
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

exports.acceptedRoutes = ['createNew','welcome','search','forgotPassword','editProfile','updatepassword','test','avatar','sandbox','index','create', 'signup', 'login','logout','edit','remove','history','user', 'worlds', 'admin', 'admin/users', 'admin/worlds', 'admin/edit','publish'];
routesMap = {
	'sandbox': {template:'index'},
	'home': {template:'index'},
	'edit': {sid: true,requiresLogin:true},
	'publish': {sid: true,requiresLogin:true},
	'history': {sid: true},
	'remove': {sid:true, title: 'Warning!',requiresLogin:true,layout:'plain'},
	'user': {sid:true, title: 'Account',requiresLogin:true},
	'admin': {sid:true, title:'Admin', fileList: fileList, template: 'admin/admin',requiresLogin:true},
	'admin/edit': {fileList: fileList,requiresLogin:true},
	'index': {home:true},
	'avatar': {avatar:true,requiresLogin:true},
	'create': {requiresLogin:true},
	'logout': {layout:'plain',requiresLogin:true},
	'login': {layout:'plain'},
	'signup': {layout:'plain'},
	'updatepassword': {layout:'plain',requiresLogin:true},
	'editProfile': {layout:'plain',requiresLogin:true},
	'forgotPassword': {layout:'plain'},
	'search': {layout:'plain'},
	'welcome': {layout:'plain'},

};

exports.generalHandler = function(req, res, next){
	
	sessions.GetSessionData(req,function(sessionData)
	{
	    var postGetUser = function(user)
	    {
			if(!req.params.page)
				req.params.page = 'index';

			if(req.params.page.indexOf('admin') > -1 && (!sessionData || sessionData.UID != global.adminUID)){
				next();
				return;
			}
				
			var routeIndex = exports.acceptedRoutes.indexOf(req.params.page);

			if(routeIndex >= 0){
				
				var currentAcceptedRoute = exports.acceptedRoutes[routeIndex], title = '', sid = '', template = currentAcceptedRoute, fileList = [], home = false;
				
				//if someone has a temp password, they must reset it
				if(sessionData && sessionData.PasswordIsTemp)
				{
					currentAcceptedRoute = 'updatepassword';
				}
				if(user && !user.Email)
				{
					currentAcceptedRoute = 'editProfile';
				}

				if(routesMap[currentAcceptedRoute]){
					
					title = routesMap[currentAcceptedRoute].title ? routesMap[currentAcceptedRoute].title : '';
					sid = routesMap[currentAcceptedRoute].sid ?  root + '/' + (req.query.id?req.query.id:'') + '/' : '';
					template = routesMap[currentAcceptedRoute].template ? routesMap[currentAcceptedRoute].template : currentAcceptedRoute;
					fileList = routesMap[currentAcceptedRoute].fileList ? routesMap[currentAcceptedRoute].fileList : [];	
					home = routesMap[currentAcceptedRoute].home ? routesMap[currentAcceptedRoute].home : false;	
					avatar = routesMap[currentAcceptedRoute].avatar ? routesMap[currentAcceptedRoute].avatar : false;	

				}

				var layout = (routesMap[currentAcceptedRoute] && routesMap[currentAcceptedRoute].layout) || 'layout';

				//if the page requires login, force a redirect to the login page
				if(!sessionData && routesMap[currentAcceptedRoute] && routesMap[currentAcceptedRoute].requiresLogin)
				{
					res.redirect(root + '/login?return=' + currentAcceptedRoute);
					return;
				}

				if(currentAcceptedRoute == 'editProfile')
				{

					res.locals = {user:user,sessionData:sessionData, sid: sid, root: getFrontEndRoot(req), title: title, fileList:fileList, home: home, avatar:avatar, blog:blog, doc:doc};
					if(user && !user.Email)
					{
						res.locals.message = "We've updated our database, and now require email address for users. Please update your email address below.";
					}
					res.render(template,{layout:layout});
				}else
				{
					res.locals = {sessionData:sessionData, sid: sid, root: getFrontEndRoot(req), title: title, fileList:fileList, home: home, avatar:avatar, blog:blog, doc:doc};
					res.render(template,{layout:layout});
				}
			}
			
			else{
				console.log("Not found");
				//res.status(404).end('Error');
				
				next();
			}
		};

		if(sessionData)
		{
			DAL.getUser(sessionData.UID,postGetUser);
		}else
		{
			postGetUser(null);
		}
	});
};

exports._404 = function(req, res){
	
	sessions.GetSessionData(req,function(sessionData)
	{
		res.locals = {sessionData:sessionData,url:req.url,root:root};
		res.status(404).render('_404');
	})
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

function ShowSearchPage(mode, req, res, next)
{

var search = decodeURIComponent( req.params.term).toLowerCase();
	var perpage = req.params.perpage;
	var page = parseInt(req.params.page);

	sessions.GetSessionData(req,function(sessionData)
		{
	DAL.getInstances(function(allinstances)
	{
		console.log(search);
		var results = [];
		
		if(mode == 'search')
		{
			for(var i in allinstances)
			{
				var inst = allinstances[i];
				if(!inst) continue;
				inst.id = i;
				inst.shortid = i.substr(13,16)
				if(inst.title.toLowerCase().indexOf(search) != -1 || inst.description.toLowerCase().indexOf(search) != -1 || inst.owner.toLowerCase().indexOf(search) != -1 || inst.shortid.toLowerCase().indexOf(search) != -1)
					results.push(inst);
			}
			results.sort(function(a,b)
			{
				return Date.parse(b.created|| b.lastUpdate) - Date.parse(a.created || a.lastUpdate);
			});
		}
		
		if(mode == 'my'&& sessionData)
		{
			for(var i in allinstances)
			{
				var inst = allinstances[i];
				if(!inst) continue;
				inst.id = i;
				inst.shortid = i.substr(13,16)
				if(inst.owner == sessionData.UID)
					results.push(inst);
			}
			results.sort(function(a,b)
			{
				return Date.parse(b.created|| b.lastUpdate) - Date.parse(a.created || a.lastUpdate);
			});
		}
		if(mode == 'featured')
		{
			for(var i in allinstances)
			{
				var inst = allinstances[i];
				if(!inst) continue;
				inst.id = i;
				inst.shortid = i.substr(13,16)
				if(inst.featured)
					results.push(inst);
			}
			results.sort(function(a,b)
			{
				return Date.parse(b.created|| b.lastUpdate) - Date.parse(a.created || a.lastUpdate);
			});
		}

		if(mode == 'all')
		{
			for(var i in allinstances)
			{
				var inst = allinstances[i];
				if(!inst) continue;
				inst.id = i;
				inst.shortid = i.substr(13,16)				
				results.push(inst);
			}
			results.sort(function(a,b)
			{
				return Date.parse(b.created|| b.lastUpdate) - Date.parse(a.created || a.lastUpdate);
			});
		}
		if(mode == 'new')
		{
			for(var i in allinstances)
			{
				var inst = allinstances[i];
				if(!inst) continue;
				inst.id = i;
				inst.shortid = i.substr(13,16)				
				results.push(inst);
			}
			results.sort(function(a,b)
			{
				return Date.parse(b.created|| b.lastUpdate) - Date.parse(a.created || a.lastUpdate);
			});
			results.splice(10);
		} 
		
		var total = results.length;
		var next = page + 1;
	
		if(Math.ceil(results.length/10) == next || results.length == 0)
			next = false;
		var previous = page -1;
		

		for(var i =0; i < 10 * page; i++)	
			results.shift();

		if(results.length > 10)
		{
			results.splice(10);
		}
		var start = 10 * page;
		var end = start+results.length;
		res.locals = {start:start,end:end,total:total,sessionData:sessionData,perpage:perpage,page:page,root:root,searchterm:search,results:results,next:next,previous:previous,hadprev:(previous >= 0)};
		res.locals[mode] = true;
		res.render('searchResults',{layout:'plain'});

	})
	})

}

exports.searchResults = function(req, res, next){
	ShowSearchPage('search', req, res, next);
};

exports.newWorlds = function(req, res, next){
	ShowSearchPage('new', req, res, next);
};

exports.allWorlds = function(req, res, next){
	ShowSearchPage('all', req, res, next);
};
exports.myWorlds = function(req, res, next){
	ShowSearchPage('my', req, res, next);
};
exports.featuredWorlds = function(req, res, next){
	ShowSearchPage('featured', req, res, next);
}

exports.createNew2 = function(req, res, next){

	sessions.GetSessionData(req,function(sessionData)
	{

			if(!sessionData) 
			{
				res.redirect(root+'/login?return=createNew/0')
			}
			var template = req.params.template;
			DAL.getInstance("_adl_sandbox_"+template+"_",function(worlddata)
			{
				
				
				res.locals = {worlddata:worlddata,template:(template == 'noTemplate'?false:template),root:root};
				res.render('createNew2',{layout:'plain'});
			});
			
	});
}

exports.createNew = function(req, res, next){
	var search = decodeURIComponent( req.params.term).toLowerCase();
	var perpage = req.params.perpage;
	var page = parseInt(req.params.page);

	sessions.GetSessionData(req,function(sessionData)
		{

			if(!sessionData) 
			{
				res.redirect(root+'/login?return=createNew/0')
			}

	DAL.getInstances(function(allinstances)
	{
		
		var results = [];
		
		
			for(var i in allinstances)
			{
				var inst = allinstances[i];
				if(!inst) continue;
				inst.id = i;
				inst.shortid = i.substr(13,16)
				if(inst.featured)
					results.push(inst);
			}
			results.sort(function(a,b)
			{
				return Date.parse(b.created|| b.lastUpdate) - Date.parse(a.created || a.lastUpdate);
			});
		

		
		var total = results.length;
		var next = page + 1;
		
		if(Math.ceil(results.length/10) == next || results.length == 0)
			next = false;
		var previous = page -1;
		

		for(var i =0; i < 10 * page; i++)	
			results.shift();

		if(results.length > 10)
		{
			results.splice(10);
		}
		var start = 10 * page;
		var end = start+results.length;
		res.locals = {start:start,end:end,total:total,sessionData:sessionData,perpage:perpage,page:page,root:root,searchterm:search,results:results,next:next,previous:previous,hadprev:(previous >= 0)};
		
		res.render('createNew',{layout:'plain'});

	})
	})
}

exports.handlePostRequest = function(req, res, next){

	var data = req.body ? JSON.parse(req.body) : '';
	sessions.GetSessionData(req,function(sessionData)
		{




		
	
	//Temporarily commenting out authorization
	if(!sessionData || sessionData.UID != global.adminUID){
		next();
		return;
	}
	
	switch(req.params.action){
	
		case "dal_test":			
			break;
	
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
			//delete data.inventoryKey;				
			
			//delete data.inventoryKey;	
			//DAL.updateUser(userId, data, function(e){
			
						
			//});
			

			//res.end();
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
	});
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

