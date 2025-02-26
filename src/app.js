const config = require('./config/config.js');
const log = config.getLog();
const fs = require('fs');
const resolvePath = require('resolve-path');
const authProcess = require('./auth/auth-process.js');
const path = require('path');
const externalWebpages = require('./external-webpages.js');
const adminWebpages = require('./admin/admin-webpages.js');

const serverHealth = require('server-health');


const logOptions = config.getLogOptions();
logOptions.name = "fastify";
logOptions.level = process.env['LOG_LEVEL.fastify'] || logOptions.level;

const fastify = require('fastify')(logOptions);

fastify.register(require('@fastify/auth'));
fastify.register(require('./auth/basic-auth.js'));
fastify.register(require('./auth/jwt-auth.js'));
fastify.register(require('./auth/ip-auth.js'), { 
  allowIpNoCredentials: process.env.ALLOW_IP_NO_CREDENTIALS !== 'false',
  allowIpNoCredentialsSubnets: process.env.ALLOW_IP_NO_CREDENTIALS_SUBNETS
});
fastify.register(require('./auth/query-auth.js'));
fastify.register(require('./auth/cookie-auth.js'));
fastify.register(require('./auth/bypass-auth.js'));

fastify.register(require('fastify-favicon'), { path: resolvePath('./src/static'), name: 'favicon.ico' })

fastify.register(require('@fastify/view'), {
  engine: {
    ejs: require('ejs')
  },  
  includeViewExtension: true,
  root: path.join(__dirname, 'views'), 
  layout: 'layout',
  templates: 'views',
  options: {
    filename: path.resolve('views')
  },
});

fastify.register(require('@fastify/compress'), { threshold: 2048 }); 

fastify.register(adminWebpages, { prefix: '/settings' });
fastify.register(authProcess, { prefix: '/auth' });
fastify.register(externalWebpages);
const excludedAuthRoutes = [ '/favicon.ico' ].concat(externalWebpages.routes);


serverHealth.exposeHealthEndpoint(fastify, '/health', 'fastify');

fastify.setErrorHandler(function (error, request, reply) {
  const statusCode = error.statusCode
  const onAuthFail = reply.onAuthFail;
  if (statusCode >= 500) {
    log.error(error);
    reply.type('text/html').code(statusCode).send(fs.createReadStream(resolvePath('src/static/502.html')));
  } else if (statusCode === 401) {
    if (onAuthFail) {
      onAuthFail(request, reply, error);
      return;
    }
    reply.type('text/html')
      .code(statusCode).send(fs.createReadStream(resolvePath('src/static/redirect-to-login.html')));
  } else if (statusCode >= 400) {
    log.info(error);    
    if (onAuthFail) {
      onAuthFail(request, reply, error);
      return;
    }
    reply.type('text/html').code(statusCode).send(fs.createReadStream(resolvePath('src/static/404.html')));
  } else {
    log.error(error);
    reply.statusCode = statusCode ? statusCode: 500;
    reply.type('text/html').send(fs.createReadStream(resolvePath('src/static/502.html')));
  }
});

fastify.listen({ port : process.env.SERVER_PORT || (function(){ throw 'SERVER_PORT environment variable must be set.' }()), 
                host: process.env.SERVER_IP}, (err, address) => {
    if (err) throw err
    log.info(`Server started: ${address}`);
});
