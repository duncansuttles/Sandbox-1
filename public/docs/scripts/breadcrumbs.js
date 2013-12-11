function depthsearch(object,prop,test)
{
    if(object)
    {
        if(object[prop].toString().toLowerCase() == test)
            return object;
        else
        {
            if(object.children)
            {
                for(var i = 0; i < object.children.length; i++)
                {
                    var ret = depthsearch(object.children[i],prop,test);
                    if(ret) return ret;
                }
            }
        }
    }
}

function depthsearchparent(object,prop,test)
{
    if(object)
    {
        if(object[prop].toString().toLowerCase() == test)
            return true;
        else
        {
            if(object.children)
            {
                for(var i = 0; i < object.children.length; i++)
                {
                    var ret = depthsearchparent(object.children[i],prop,test);
                    if(ret === true) return object;
                    else if(ret) return ret;
                }
            }
        }
    }
}

$(document).ready(function(){
    $.getJSON("/vwfdatamanager.svc/docdir",function(rawdata)
    {
       
        var path = window.location.pathname.split('/');
        while(path.indexOf("") > -1)
        {
            path.splice( path.indexOf( "" ), 1 );
        }
        var title = decodeURIComponent(path[path.length -1]);
        
        $(".article").prepend('<a class="breadcrumb" href="../'+title+'">'+title+' ></a>');
        var data = depthsearch(rawdata,'name',title.toLowerCase());
       
        var parent = depthsearchparent(rawdata,'name',title.toLowerCase());
        //var parentsparent = depthsearchparent(rawdata,'name',parent.name.toLowerCase());
        var dotdot = '../';
        if(parent == true)  parent = null;
        while(parent)
        {
            $(".article").prepend('<a class="breadcrumb" href="'+dotdot+'">'+parent.name+' ></a>');
            dotdot += '../';
            parent = depthsearchparent(rawdata,'name',parent.name.toLowerCase());
            if(parent == true)  parent = null;
        }
        
        
    })
})
