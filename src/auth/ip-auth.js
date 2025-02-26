const fp = require("fastify-plugin");
const config = require('../config/config.js');
const log = config.getLog();
const checkIp = require('check-ip');
const ipRangeCheck = require("ip-range-check");
const ifaces = require('os').networkInterfaces();

const { Unauthorized } = require('http-errors');


module.exports = fp(async (fastify, opts) => {
  const allowLocalIpNoCredentials = opts.allowIpNoCredentials;
  const allowLocalIpNoCredentialsSubnets = opts.allowIpNoCredentialsSubnets;

  fastify.decorate('ipAuth', ipAuth);
  fastify.decorate('isAllowedIp', '');

  function ipAuth (request, reply, done) {
    const remoteIp = request.remoteIp;
    if(allowLocalIpNoCredentials)
      log.debug(`Checking user for local network access from ${remoteIp || request.socket.remoteAddress}...`);
    try {
      if(allowLocalIpNoCredentials && 
        (remoteIp === 'localhost' || (checkIp(remoteIp).isValid &&          
            (Object.keys(ifaces).some(k=>ifaces[k].some(i=>ipRangeCheck(remoteIp, i.cidr))) ||
              allowLocalIpNoCredentialsSubnets?.split(',').some(s=>ipRangeCheck(remoteIp, s)))))) {

        log.info(`User logged in from ${remoteIp} as allowed on local network`);
        request.userData = { username: '***local-ip-login***' };
        request.isAllowedIp = true;
        // done();
        return;
      } 
    } catch(err) {
      log.error(err);
    }
    const msg = `Failed local network auth check for remote ip ${remoteIp || request.socket.remoteAddress}.`;
    if(allowLocalIpNoCredentials)
      log.info(msg);
    done(new Unauthorized(msg));
  }
});
