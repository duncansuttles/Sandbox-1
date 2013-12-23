var request = require('request');
var _3DRAPI = "https://3dr.adlnet.gov/api/_3DRAPI.svc";
var useAuth = false;
function proxy(string,response)
{
	if(useAuth)
	{
 		request['get'](string).auth(username, password, true).pipe(response);
	}
	else
	{	
	 	request['get'](string).pipe(response);
	}
}
function proxySearch(URL,response)
{

 var searchstring = _3DRAPI +"/Search/"+decodeURIComponent(URL.query.search)+"/json?ID=00-00-00";
 proxy(searchstring,response)
}

function proxyDownload(URL,response)
{
//https://3dr.adlnet.gov/api/_3DRAPI.svc/"+decodeURIComponent(URL.query.search)+"/Model/json/uncompressed?ID=00-00-00
 var downloadstring = _3DRAPI+ "/"+decodeURIComponent(URL.query.pid)+"/Model/json/uncompressed?ID=00-00-00";
 proxy(downloadstring,response)
}

function proxyMetadata(URL,response)
{
//https://3dr.adlnet.gov/api/_3DRAPI.svc/"+decodeURIComponent(URL.query.search)+"/Metadata/json?ID=00-00-00

 var searchstring = _3DRAPI +"/"+decodeURIComponent(URL.query.pid)+"/Metadata/json?ID=00-00-00";
 proxy(searchstring,response)
}

function proxyTexture(URL,response)
{
//https://3dr.adlnet.gov/api/_3DRAPI.svc/"+decodeURIComponent(URL.query.pid)+"/textures/"+decodeURIComponent(URL.query.pid)+"?ID=00-00-00
 var searchstring = _3DRAPI +"/"+decodeURIComponent(URL.query.pid)+"/textures/"+decodeURIComponent(URL.query.file)+"?ID=00-00-00";
 proxy(searchstring,response)

}

function proxyThumbnail(URL,response)
{
//https://3dr.adlnet.gov/api/_3DRAPI.svc/"+decodeURIComponent(URL.query.pid)+"/Thumbnail?ID=00-00-00
 var searchstring = _3DRAPI +"/"+decodeURIComponent(URL.query.pid)+"/Thumbnail?ID=00-00-00";
 proxy(searchstring,response)

}
exports.proxySearch = proxySearch;
exports.proxyDownload = proxyDownload;
exports.proxyMetadata = proxyMetadata;
exports.proxyTexture = proxyTexture;
exports.proxyThumbnail = proxyThumbnail;