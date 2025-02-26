const config = require('../config/config.js');
const log = config.getLog();
const fp = require("fastify-plugin");
const parseDuration = require('parse-duration')

const { Unauthorized } = require('http-errors');

const cookieName = process.env.COOKIE_NAME || "forwardAuth";
const cookieTTL = process.env.COOKIE_TTL || "5d";


module.exports = fp(async (fastify, opts)=> {
  fastify.register(require('@fastify/cookie'), {
    secret: config.jwtSecret, // for cookies signature
    hook: 'onRequest', // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
    parseOptions: {}  // options for parsing cookies
  });

  fastify.decorate("cookieAuth", cookieAuth);  
  fastify.decorate("setCookieAuth", setCookieAuth);  

  if(!fastify.hasRequestDecorator('userData'))
    fastify.decorateRequest('userData', null);

  function cookieAuth(request, reply, done) {
    const remoteIp = request.remoteIp;
    const jwtToken = request.cookies[cookieName];
    if(!jwtToken) {      
      done(new Unauthorized("No cookie token received, not checking"));
      return;
    }
    try {
      log.debug(`Checking cookie token from ${remoteIp}...`);
      const auth = fastify.jwt.verify(jwtToken);
      log.info(`User '${auth.username}' from ${remoteIp} was authenticated via cookie`);
      request.userData = { ...auth };
      done();
      return;
    } catch(err) {
      log.info(`No valid cookie token found`);
      done(new Unauthorized("Not authorized."));
    }
  }

  function setCookieAuth(request, reply, domain) {
    const remoteIp = request.remoteIp;
    const username = request?.userData?.username;
    const jwtToken = fastify.jwtBuildToken(username, remoteIp, cookieTTL);
    const maxAge = cookieTTL ? parseDuration(cookieTTL)/1000 : 86400; //seconds
    reply.setCookie(cookieName, jwtToken, {
      path: '/',
      maxAge, //seconds
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      domain
    });
  }
});