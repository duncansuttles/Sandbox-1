
var logger = require('./logger');
var DAL = require('./DAL').DAL;;
//302 redirect
function _302(url,response)
{
  response.writeHead(302, {
    "Location": url,
    "Cache-Control":"private, max-age=0, no-cache"
  });
  response.end();
}

//wait until the entire body is posted before proceding
function waitForAllBody(req, res, next) {
                
               var data='';
               req.setEncoding('utf8');
               req.on('data', function(chunk) { 
                  data += chunk;
               });

               req.on('end', function() {
                req.body = data;
                next();
               });
            }
//set the headers so we can support cross origin resource requests
function CORSSupport(req, res, next) {
        
        
        if(req.headers['access-control-request-headers']) {
          res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
        }else
        {
          res.header('Access-Control-Allow-Headers', 'Content-Type');
        }
        
        if(req.headers['Access-Control-Allow-Origin']) {
          res.header('Access-Control-Allow-Origin', req.headers.origin);
        }else
        {
          res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        }
        
        if(req.headers['access-control-request-method']) {
          res.header('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
        }else
        {
          res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        }
        
        res.header('Access-Control-Max-Age', 60 * 60 * 24 * 365);
        
        if (req.method == 'OPTIONS') {
          res.send(200);
        }
        else
          next();
      }            
//allow the user to get to a world by the url vwf.adlnet.gov/worlds/{title}
function prettyWorldURL(req, res, next)
      {
        var url = req.url
        // only do this at all of the url contians /worlds/
        var index = url.toLowerCase().indexOf('/worlds/');
        if(index != -1)
        {
          //find the name to search for
          var worldName = url.substring(index+8);
          
          //decode from URL encoding, which will happen if there are spaces
          worldName = decodeURIComponent(worldName);
          
          //search the DB for worlds that have that title
          DAL.find({"val.title":worldName},function(err,worlds)
          {
            //if there is one , just forward to it
            if(worlds && Object.keys(worlds).length == 1)
            {
               var worldURL = worlds[0]._key;
               worldURL = worldURL.replace(/_/g,'/');
               _302(worldURL,res);
               return;
            }
            //If there are more than one, create a page with links to each
            if(worlds && Object.keys(worlds).length > 1)
            {
              worlds = Object.keys(worlds);
              
              res.writeHead(200, {
                "Content-Type": "text/html",
                "Cache-Control":"private, max-age=0, no-cache" 
              });
              res.write( "<html>" +
                      "<head>" +
                      " <title>Virtual World Framework</title>" +
                      
                      "</head>" +
                      "<body>" );
            
              
               //create a link for each world
               for(var i = 0; i < worlds.length; i++)
               {
                var worldURL = worlds[i];
                worldURL = worldURL.replace(/_/g,'/');
                
                res.write(  "<a href='"+worldURL+"'>"+worldURL+"</a><br/>" );
                
               }
               
               res.write(  "</body> </html>" );
               res.end();
               return;
            }
            
            //if we did not find any results, just continue - which will 404
            next();
          
          
          });
        }
        //does not contain /worlds/, so continue
        else
          next();
      }

//check the URL for the version string. IF the version string is found and we are using versioning and the url contains the current version string, then
//serve. Otherwise, redirect to the proper version
//this is to defeat client caches
function versioning(req, res, next)
      {
        
       
        //find the version number
        var version = req.url.match(/^\/[0-9]+\//);
        
        //if there was a match
        if(version)
        {
           //parse the version as an integer
           var versionInt = version.toString().match(/[0-9]+/);
           versionInt = parseInt(versionInt);
           
           
           
           //remove the version number from the request
           req.url =  req.url.substr(version.toString().length -1);
           
           //if the version number from the request was not the current version number
           //301 redirect to he proper version
           if(versionInt != global.version)
           { 
            if(global.version)
              _302('/'+global.version+''+req.url,res);
            else
              _302(req.url,res);
            return;
           
           }
        }
        //if there is no version number, redirect to the current version
        if(!version && global.version && req.method == 'GET')
        {
          
          _302('/'+global.version+''+req.url,res);
          return;
        }
        
        //if we got here, then there is a good version number
        //and, we have stripped it out, so we can continue processing as if the version was not in the url
        
        next();
      
      }      
exports.versioning = versioning;
exports.prettyWorldURL = prettyWorldURL;
exports.waitForAllBody = waitForAllBody;
exports.CORSSupport = CORSSupport;
exports.setDAL = function(d)
{
DAL = d;
}
