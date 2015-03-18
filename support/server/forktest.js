var cp = require('child_process');

if (!process.send) {
  var p = cp.fork(__dirname + '/forktest');
  p.send({
    count: 10
  });
  p.on('message', function(data) {
    process.exit(0);
  });
} else {
  process.on('message', function(data) {
    console.log(data);
    data.count--;
    if (data.count === 0) {
      process.send({});
      process.exit(0);
    }
    var p = cp.fork(__dirname + '/forktest');
    p.send(data);
    p.on('message', function(data) {
      process.send(data);
      process.exit(0);
    });
  });
}