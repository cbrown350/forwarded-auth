const config = require('../config/config.js');
const log = config.getLog();
const fp = require("fastify-plugin");
const URL = require('url');

const { Unauthorized } = require('http-errors');


module.exports = fp(async (fastify, opts)=> {
  fastify.register(require("@fastify/jwt"), { secret: config.jwtSecret });
  fastify.decorate("jwtAuth", jwtAuth);    
  fastify.decorate("jwtBuildToken", jwtBuildToken);
  if(!fastify.hasRequestDecorator('userData'))
    fastify.decorateRequest('userData', null);

  function jwtAuth(request, reply, done) {
    const remoteIp = request.remoteIp;
    const forwardedUri = request?.headers['x-forwarded-uri'];
    const jwtToken = URL.parse(forwardedUri, true)?.query?.t || request.query?.t;
    if(!jwtToken) {      
      done(new Unauthorized("No jwt received, not checking"));
      return;
    }
    try {
      log.debug(`Checking jwt token from ${remoteIp}...`);
      const auth = fastify.jwt.verify(jwtToken);
      log.info(`User '${auth.username}' from ${remoteIp} was authenticated via jwt`);
      request.userData = { ...auth };
      // done();
      return;
    } catch(err) {
      log.info(`No valid jwt token found`);
      done(new Unauthorized("Not authorized."));
    }
  }

  function jwtBuildToken(username, remoteIp, ttl) {
    return fastify.jwt.sign({ username, remoteIp }, { expiresIn: ttl });
  }
});