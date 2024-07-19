

module.exports = (fastify, opts, done) => {
    fastify.get('/logged-out', (request, reply) => {
        const replyData = { 
            loggedOut: true
        };
        reply.view('/logged-out', replyData);
    });
    
    done();
}   