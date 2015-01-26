var winston = require('winston');
winston.emitErrs = false;

var logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: 'warn',
            handleExceptions: true,
            json: false,
            colorize: 'all',
            
        })
    ],
    exitOnError: false
});

module.exports = logger;
var inside = 0;


module.exports.initFileOutput = function(path) {
    logger.add(winston.transports.File,{
        level: 'info',
        filename:  require('path').join(path,'/Logs/all-logs.log'),
        handleExceptions: true,
        json: true,
        maxsize: 5242880, //5MB
        maxFiles: 500,
        colorize: false,
        timestamp: true
    });
}