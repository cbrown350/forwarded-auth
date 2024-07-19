const fp = require("fastify-plugin");

const config = require('../config/config.js');
const log = config.getLog();
const userService = require('../admin/user-service.js');

const { Unauthorized } = require('http-errors');
 

module.exports = fp(async (fastify, opts)=> {
    fastify.register(require("@fastify/basic-auth"), { validate, authenticate: { realm: `${config.appName} Server` } });
    if(!fastify.hasRequestDecorator('userData'))
      fastify.decorateRequest('userData', null);

    async function validate(username, password, request, reply, done) {
        const remoteIp = request.remoteIp;
        log.debug(`Checking user '${username}' from ${remoteIp}...`);
        try {
            userService.validateUsername(username);
        } catch(err) {
            log.info(`User '${username}' was invalid.`);
            // done(new Unauthorized('Wrong username or password!'));
            // return;
            throw new Unauthorized('Wrong username or password!');
        }
        const user = await userService.getUserWithPasswordHash(username);
        const passwordHash = user?.passwordHash;
        try {
            userService.checkPassword(password, passwordHash);
        } catch(err) {
            log.info(`User '${username}' sent the wrong password.`);
            // done(new Unauthorized('Wrong username or password!'));
            // return;
            throw new Unauthorized('Wrong username or password!');
        }
        if(!user?.enabled) {
            log.info(`User '${username}' is disabled and cannot continue.`);
            // done(new Unauthorized('User is disabled!'));
            // return;
            throw new Unauthorized('User is disabled!');
        }

        log.info(`User '${username}' logged in from ${remoteIp} using basic auth`);
        delete user?.passwordHash;
        request.userData = { ...user, username };
        // done();
    }
});
