
const config = require('../config/config.js');
const log = config.getLog();
const fs = require('fs');
const resolvePath = require('resolve-path');

const defaultRedirectOnAuthFail = process.env.DEFAULT_REDIRECT_ON_AUTH_FAIL_URL;
const allowIpNoCredentialsTrustedHeaders = process.env.ALLOW_IP_NO_CREDENTIALS_TRUSTED_HEADERS?.split(',');


module.exports = (fastify, opts, done) => {
    fastify.addHook('preHandler', (request, reply, done) => {        
        const remoteIp = request.headers[allowIpNoCredentialsTrustedHeaders.map(h => h.toLowerCase()).find(h=>request.headers[h])] 
                            || request.socket.remoteAddress;
        request.remoteIp = remoteIp;
        reply.redirectUrl = request.query['X-Redirect-On-Auth-Fail-URL'];  
        reply.onAuthFail = onAuthFail;  
        done();
      });  
    fastify.addHook('preHandler', fastify.auth([
        fastify.ipAuth,
        fastify.jwtAuth,
        fastify.basicAuth,
        fastify.queryAuth,
        fastify.cookieAuth
      ]));

    fastify.get('*', async (request, reply) => {

        try {
            fastify.setCookieAuth(request, reply, request?.query['cookie_domain'] );
            reply.send('authorized');
            return;
        } catch(err) {
            log.error(err);
            log.error(err && err.response ?
                { status: err.response.status, text: err.response.statusText, data: err.response.data ? err.response.data.substr(0,100) : undefined, stack: err.stack, message: err.message }
                : undefined, 'Processing error');
            if(err.response && err.response.status && err.response.headers['content-type'] && err.response.data) {
                reply.type(err.response.headers['content-type']).code(err.response.status).send(err.response.data);
                return;
            } else if(err.response && err.response.status == 502) {
                reply.type('text/html').code(502).send(fs.createReadStream(resolvePath('src/static/502.html')));
                return;
            }
        }
        sendNotFoundError();
    });

    done();
};

function onAuthFail(request, reply, error) {    
    log.info(`Auth failed from ${request.remoteIp}, redirecting to ${reply.redirectUrl }`);
    reply.statusCode = 307;
    reply.redirect(reply.redirectUrl || defaultRedirectOnAuthFail || 'https://google.com').send();
}


function sendNotFoundError(reply) {    
    const err = new Error("Invalid processing request, not found!");
    err.statusCode = 404;
    throw err;
}