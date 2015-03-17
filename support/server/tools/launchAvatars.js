var fork = require('child_process').fork;
var http = require("http");
var processes = [];
var user;
var server;
var port;
var world;
var password;
var count;

function randomtick() {
    return;
    var rnd = Math.floor(require('../cryptoRandom.js').random() * 5);
    if (rnd == 4) {
        var rnd = Math.floor(require('../cryptoRandom.js').random() * count);
        console.log('killing ' + rnd);
        var p = processes[rnd]
        p.send('kill');

        var tworld = world;
        if (world == 'random') {
            tworld = states[Math.floor(require('../cryptoRandom.js').random() * states.length)];
        }
        var c1 = fork('vwf_client_sim.js', [, '-u', user + (rnd + 1), '-p', password, '-s', server, '-t', port, '-w', tworld]);
        c1.on('close', function(code) {
            console.log('child process exited with code ' + code);
        });

        processes.splice(rnd, 1, c1);

    }
    global.setTimeout(function() {
        randomtick()
    }, 1000);
}
global.setTimeout(function() {
    randomtick()
}, 1000);


// -u is the username of the account to use
var p = process.argv.indexOf('-u');
user = p >= 0 ? process.argv[p + 1] : "test";

// -p is the pass
p = process.argv.indexOf('-p');
password = p >= 0 ? process.argv[p + 1] : "1111";

// -s the name of the server to connect to
p = process.argv.indexOf('-s');
server = p >= 0 ? process.argv[p + 1] : "localhost";

// -t is the port to use on the server
p = process.argv.indexOf('-t');
port = p >= 0 ? process.argv[p + 1] : "3000";

// -w is the UID of the world to attach to 
p = process.argv.indexOf('-w');
world = p >= 0 ? process.argv[p + 1] : "random";

// -c is the count of bots
p = process.argv.indexOf('-c');
count = p >= 0 ? parseInt(process.argv[p + 1]) : 1;

var stdin = process.openStdin();
stdin.on('data', function(chunk) {
    if (!chunk) return;

    chunk = chunk + '';
    chunk = chunk.replace(/\r\n/g, '');

    if (chunk == 'quit') {
        for (var i = 0; i < processes.length; i++) {
            var p = processes[i];
            p.send('kill');
        }
        process.exit();
    }

});

var states = {};

function launchAvatars() {

    for (var i = 0; i < count; i++) {
        var tworld = world;
        if (world == 'random') {
            tworld = states[Math.floor(require('../cryptoRandom.js').random() * states.length)];
        }
        var c1 = fork('vwf_client_sim.js', ['-u', user + i, '-p', password, '-s', server, '-t', port, '-w', tworld]);
        c1.on('close', function(code) {
            console.log('child process exited with code ' + code);
        });

        processes.push(c1);
    }
}

function getStatesComplete(response) {
    var str = '';

    //another chunk of data has been recieved, so append it to `str`
    response.on('data', function(chunk) {
        str += chunk;
    });

    //the whole response has been recieved, so we just print it out here
    response.on('end', function() {


        states = Object.keys(JSON.parse(str));
        for (var i = 0; i < states.length; i++)
            states[i] = states[i].substring(13, 29);
        console.log(states);
        launchAvatars();


    });
}

if (world == 'random') {
    http.request('http://' + server + ':' + port + '/vwfDataManager.svc/states', getStatesComplete).end();
} else {
    launchAvatars();
}