var request = require('request');

//config keys
// _3DRAPI                 //the endpoint to use to access the service
// _3DRAPIKey              //the api key to use for all requests
// _3DRUser                //username server identifies itself as
// _3DRPassword            //password for the server user
// _3DRUseAuth             //use anonymous access or not
//


function Get3DRAPI()
{
    return global.configuration._3DRAPI || "https://3dr.adlnet.gov/api/_3DRAPI.svc";
}
function Get3DRAPIKey()
{
    return global.configuration._3DRAPIKey || "00-00-00";
}
function Get3DRUser()
{
    return global.configuration._3DRUser || "AnonymousUser";
}
function Get3DRPassword()
{
    return global.configuration._3DRPassword || "";
}
function GetUseAuth()
{
    return global.configuration._3DRUseAuth || false;
}
function proxy(string,response)
{
	
 		request['get'](string).auth(Get3DRUser(),Get3DRPassword(), true).on('error',function(e){

 			console.log(e);
 			response.writeHead(500);
 			response.end();

 		}).pipe(response);
	
}
function proxyPermissions(URL,response)
{

 var downloadstring = Get3DRAPI()+ "/"+decodeURIComponent(URL.query.pid)+"/permissions/users/"+Get3DRUser()+"/json?ID="+Get3DRAPIKey();
 proxy(downloadstring,response)
//"https://3dr.adlnet.gov/api/rest/adl:667/permissions/users/psadmin@problemSolutions.net/json?ID=00-00-00"

}
function proxySearch(URL,response)
{

 var searchstring = Get3DRAPI() +"/Search/"+decodeURIComponent(URL.query.search)+"/json?ID="+Get3DRAPIKey();
 proxy(searchstring,response)
}

function proxyDownload(URL,response)
{
//https://3dr.adlnet.gov/api/_3DRAPI.svc/"+decodeURIComponent(URL.query.search)+"/Model/json/uncompressed?ID=00-00-00
 var downloadstring = Get3DRAPI()+ "/"+decodeURIComponent(URL.query.pid)+"/Model/json/uncompressed?ID="+Get3DRAPIKey();
 proxy(downloadstring,response)
}

function proxyMetadata(URL,response)
{
//https://3dr.adlnet.gov/api/_3DRAPI.svc/"+decodeURIComponent(URL.query.search)+"/Metadata/json?ID=00-00-00

 var searchstring = Get3DRAPI() +"/"+decodeURIComponent(URL.query.pid)+"/Metadata/json?ID="+Get3DRAPIKey();
 proxy(searchstring,response)
}

function proxyTexture(URL,response)
{
//https://3dr.adlnet.gov/api/_3DRAPI.svc/"+decodeURIComponent(URL.query.pid)+"/textures/"+decodeURIComponent(URL.query.pid)+"?ID=00-00-00
 var searchstring = Get3DRAPI() +"/"+decodeURIComponent(URL.query.pid)+"/Textures/"+decodeURIComponent(URL.query.file)+"?ID="+Get3DRAPIKey();
 proxy(searchstring,response)

}

function proxyThumbnail(URL,response)
{
//https://3dr.adlnet.gov/api/_3DRAPI.svc/"+decodeURIComponent(URL.query.pid)+"/Thumbnail?ID=00-00-00
 var searchstring = Get3DRAPI() +"/"+decodeURIComponent(URL.query.pid)+"/Thumbnail?ID="+Get3DRAPIKey();
 proxy(searchstring,response)
}

function proxyUpload(req,response)
{

var searchstring = Get3DRAPI() +"/UploadModel?ID="+Get3DRAPIKey();
console.log(searchstring);
console.log(Get3DRPassword(),Get3DRUser());

if(!req.files && !req.files.model)
{
	response.writeHead(500);
 	response.end();
 	return;
}

fs.readFile(req.files.model.path, function (err, data) {
		request['post']({uri:searchstring,body:data}).auth(Get3DRUser(),Get3DRPassword(), true).on('error',function(e){
 			console.log(e);
 			response.writeHead(500);
 			response.end();
	 	}).pipe(response);
	});
}


exports.proxySearch = proxySearch;
exports.proxyDownload = proxyDownload;
exports.proxyMetadata = proxyMetadata;
exports.proxyTexture = proxyTexture;
exports.proxyThumbnail = proxyThumbnail;
exports.proxyPermissions = proxyPermissions;
exports.proxyUpload = proxyUpload;