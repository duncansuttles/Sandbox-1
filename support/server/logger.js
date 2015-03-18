var winston = require('winston');
winston.emitErrs = false;
var GUID = require('node-uuid')
    .v4;
var logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: 'info',
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
    logger.add(winston.transports.File, {
        level: 'warn',
        filename: require('path').join(path, '/Logs/all-logs.log'),
        handleExceptions: true,
        json: true,
        maxsize: 5242880, //5MB
        maxFiles: 5,
        colorize: false,
        timestamp: true
    });
}

module.exports.getWorldLogger = function(id) {

    var logger = new winston.Logger({
        transports: [
            new winston.transports.Console({
                level: 'info',
                handleExceptions: true,
                json: false,
                colorize: 'all',

            }),
            new winston.transports.File({
                    level: 'warn',
                    filename: require('path').join(require('./sandboxAPI').getDataPath(), 'Logs', id+GUID()),
                    handleExceptions: true,
                    json: true,
                    maxsize: 5242880, //5MB
                    maxFiles: 5,
                    colorize: false,
                    timestamp: true
                }
            )
        ],
        exitOnError: false
    });
    return logger;
}