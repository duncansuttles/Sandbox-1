var page = require('webpage').create();
page.open('http://localhost:3000/adl/sandbox/QFqfesODJi4Fk6i0?notools=true&norender=true&nologin=true#', function() {
  
});

page.onConsoleMessage = function(msg, lineNum, sourceId) {
  logger.info(  msg );
};