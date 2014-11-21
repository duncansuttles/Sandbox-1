var Datastore = require('nedb');
DB = new Datastore({
    filename: './users.nedb',
    autoload: false
});

DB.loadDatabase(function(err) { // Callback is optional
    loaded();
});

function loaded()
{

	
}

exports.DB = DB;