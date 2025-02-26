const fp = require("fastify-plugin");
const config = require('../config/config.js');
const log = config.getLog();
const userService = require('../admin/user-service.js');
const URL = require('url');

const { Unauthorized } = require('http-errors');

const passphraseHash = process.env.PASSPHRASE_HASH;


module.exports = fp(async (fastify) => {
  fastify.decorate('queryAuth', queryAuth);

  async function queryAuth (request, reply, done) {
    const forwardedUri = request?.headers['x-forwarded-uri'];
    const passphrase = URL.parse(forwardedUri || '', true)?.query?.pf
    // const username = request.query?.u || (passphrase ? '**passphrase**' : null);
    const username = URL.parse(forwardedUri || '', true)?.query?.u || (passphrase ? '**passphrase**' : null);
    // const password = request.query?.p;
    const password = URL.parse(forwardedUri || '', true)?.query?.p;
    const remoteIp = request.remoteIp;

    if(!passphrase) {
      log.debug(`Checking user '${username}' from ${remoteIp}...`);
      try {
        userService.validateUsername(username);
      } catch(err) {
        log.info(`User '${username}' was invalid.`);
        done(new Unauthorized('Wrong username or password!'));
        return;
      }
      const user = await userService.getUserWithPasswordHash(username);
      const passwordHash = user?.passwordHash;
      try {
        userService.checkPassword(password, passwordHash);
      } catch(err) {
        log.info(`User '${username}' sent the wrong password.`);
        done(new Unauthorized('Wrong username or password!'));
        return;
      }
      if(!user?.enabled) {
        log.info(`User '${username}' is disabled and cannot continue.`);
        done(new Unauthorized('User is disabled!'));
        return;
      }
      delete user?.passwordHash;
      request.userData = { ...user, username };
    } else {
      log.debug(`Checking passphrase from ${remoteIp}...`);
      try {
          userService.checkPassword(passphrase, passphraseHash);
      } catch(err) {
        log.info('Invalid passphrase.');
        done(new Unauthorized('Invalid passphrase!'));
        return;
      }
      request.userData = { username };
    }
    const proto = request?.headers['x-forwarded-proto'];
    const host = request?.headers['x-forwarded-host'];
    if(proto && host && forwardedUri) {
      const strippedUri = forwardedUri.replace(/pf=[^&]*/g, '').replace(/u=[^&]*/g, '').replace(/p=[^&]*/g, '');
      reply.redirectStrippedUrl = `${proto}://${host}${strippedUri}`;
    }
    log.info(`'${username}' logged in from ${remoteIp} using password`);
    done();
  }
});
