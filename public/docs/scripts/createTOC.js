$(document).ready(function(){


var headings = $("h2");
$('h1').after('<div id="TOC" />');
for(var i =0; i < headings.length; i++)
{
    var heading = headings[i];
    $(heading).attr('id','toclink'+i);
    $(heading).append('<a class="toplink" href="#top">(top)</a>');
    $('#TOC').append('<a class="toclink" href="#'+'toclink'+i+'"/>')
    $('#TOC').children().last().text($(heading).text());
}



})
