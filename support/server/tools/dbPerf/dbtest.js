var Datastore = require('nedb');
var async = require('async');
DB = new Datastore({
    filename: './users.nedb',
    autoload: false
});

DB.loadDatabase(function(err) { // Callback is optional
    loaded();
});
var time = -1;

function startTimer() {

    time = process.hrtime();
    time = time[0] + time[1] / 1e9;

}

function stopTimer() {
    var ntime = process.hrtime();
    var ntime = ntime[0] + ntime[1] / 1e9;
    return ntime - time;
}

function oldFindFeatured(gotfeatured) {
    var index = DB.find({
        _key: 'StateIndex'
    }, function(err, data) {
        var states = data[0].val;

        async.eachSeries(states, function(dat, cb) {

                DB.find({
                    _key: dat
                }, function(err, state) {

                    if (err || state.length == 0) {
                        cb();
                        return;
                    }
                    state = state[0].val;
                    state = JSON.parse(JSON.stringify(state));

                    cb();
                });
            },
            function(err) {
                gotfeatured();
            });
    });

}

function newFindFeatured(gotfeatured) {
    var index = DB.find({
        _key: 'StateIndex'
    }, function(err, data) {
        var states = data[0].val;
        DB.find({
            "val.featured": true
        }, function(err, data) {
            //logger.info(data);
            ret = [];
            for (var i in data) {
                if (states.indexOf(data[i]._key) != -1)
                    ret.push(JSON.parse(JSON.stringify(data[i].val)));
            }
            gotfeatured(ret);
        });
    });
}

function searchStates(cb,start,count) {
    var search =  {
        $or: [{
            "val.owner": search
        }, {
            "val.title": search
        }, {
            "val.description": search
        }, {
            "_key": search
        }]
    }
    searchStatesInner(search,cb,start,count)
}

function searchStatesByUser(user,cb,start,count) {
    var search =  {
            "val.owner": user
    }
    searchStatesInner(search,cb,start,count)
}

function searchStatesByFeatured(cb,start,count) {
    var search =  {
            "val.featured": true
    }
    searchStatesInner(search,cb,start,count)
}

function getStates(cb,start,count) {
    var search =  {
            "val": {$exists:true}
    }
    searchStatesInner(search,cb,start,count)
}
function searchStatesInner(query,found,start,count) {
	if(!start) start = 0;
	if(!count) count = 10000000;
    var index = DB.find({
        _key: 'StateIndex'
    }, function(err, data) {
        var states = data[0].val;
        
        DB.find({
                $and: [{
                        _key: {
                            $in: states
                        }
                    },
                    query

                ]
            }).sort({lastUpdate:1}).skip(start).limit(count).exec(
            function(err, data) {


                var ret = [];
                for (var i in data) {
                    if (states.indexOf(data[i]._key) != -1)
                        ret.push(JSON.parse(JSON.stringify(data[i].val)));
                }
                found(ret);

            });
    });
}
/*
function loaded() {
    startTimer();
    oldFindFeatured(function() {
        logger.info(stopTimer());
        startTimer();
        newFindFeatured(function(featured) {
            logger.info(stopTimer());

        })
    });
}
*/
function loaded() {
    startTimer();
    searchStatesByUser('Rob',function(results) {
        logger.info(stopTimer());
        logger.info(results);
    },20,10);
}
exports.DB = DB;

//well hey, let's table to philosophical / strategy talk? I've got my head pretty deep in the db logic.