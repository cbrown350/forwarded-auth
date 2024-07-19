const pino = require('pino');
if(process.env.NODE_ENV !== 'production')
    require('dotenv').config();

if (!('toJSON' in Error.prototype))
    Object.defineProperty(Error.prototype, 'toJSON', {
        value: function () {
            var alt = {};

            Object.getOwnPropertyNames(this).forEach(function (key) {
                alt[key] = this[key];
            }, this);

            return alt;
        },
        configurable: true,
        writable: true
    });    

const crypto = require("crypto");
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(20).toString('base64');
const appName = process.env.APP_NAME || 'forward-auth';

module.exports = { getLog, getLogOptions, jwtSecret, convertEnvVarName, appName };

function convertEnvVarName(name) {
    name = name.toUpperCase();
    name = name.replace(/[a-z-\.]/g, '_');
    return name;
}

function getLogOptions(stackLevel = 2) {
    const currentModule = _getCallerFile(stackLevel);
    return {
        name: currentModule,
        stream: process.stdout,
        level: process.env[`LOG_LEVEL.${currentModule}`] || process.env.LOG_LEVEL || 'info',
        customLevels: { test: 99 },
        serializers: {
            req: pino.name.req,
            res: pino.stdSerializers.res
        },
        colorize: process.env.NODE_ENV !== 'production',
        prettyPrint: (process.env.NODE_ENV !== 'production' ? {            
            99: {
                name: 'test',
                label: 'TEST',
                color: 'green'
            }
        } : false)
    };
};

function getLog() {
    return pino(getLogOptions(3));
}

function _getCallerFile(stackLevel){
    const err = new Error();

    Error.prepareStackTrace = (_, s) => s;

    const stack = err.stack;

    Error.prepareStackTrace = undefined;

    return require('path').basename(stack[stackLevel].getFileName()).split('.')[0];
}
