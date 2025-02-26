const fp = require("fastify-plugin");
const config = require('../config/config.js');
const log = config.getLog();
const URL = require('url');


const { Unauthorized } = require('http-errors');


module.exports = fp(async (fastify, opts) => {
  const allowLocalIpNoCredentials = opts.allowIpNoCredentials;
  const allowLocalIpNoCredentialsSubnets = opts.allowIpNoCredentialsSubnets;

  fastify.decorate('bypassAuth', bypassAuth);

  function bypassAuth (request, reply, done) {
    const remoteIp = request.remoteIp;
    log.debug(`Checking user bypass settings from ${remoteIp || request.socket.remoteAddress}...`);
    const bypass_pathprefix = request?.query?.bypass_pathprefix
    const forwardedUri = request?.headers['x-forwarded-uri'];
    const forwardedPath = URL.parse(forwardedUri || '', true)?.path
    if(bypass_pathprefix && forwardedPath.startsWith(bypass_pathprefix)) {
      try {
        log.info(`User logged in from ${remoteIp} as allowed with bypass auth path prefix ${bypass_pathprefix}.`);
        request.userData = { username: '***pathprefix-login***' };
        // done();
        return;
      } catch(err) {
        log.error(err);
      }
    }
    const msg = `Failed bypass auth check for remote ip ${remoteIp || request.socket.remoteAddress}.`;
    log.info(msg);
    done(new Unauthorized(msg));
  }
});
