const userService = require('./user-service.js');

module.exports = (fastify, opts, done) => {
    fastify.addHook('preHandler', fastify.auth([
        fastify.basicAuth
      ]));

    fastify.get('*', async (request, reply) => {
        const replyData = { 
            isAdmin: request?.userData?.username === 'admin',
            loggedInUserData: request.userData
        };

        if(!replyData.isAdmin) {
            return reply.viewAsync('/no-access', replyData);
        }
        reply.redirect(302, '/settings/users');
    });

    fastify.get('/users', async (request, reply) => {
        const replyData = { 
            isAdmin: request?.userData?.username === 'admin',
            loggedInUserData: request.userData
        };

        if(!replyData.isAdmin) {
            return reply.viewAsync('/no-access', replyData);
        }
        
        const username = request?.query?.user;
        const action = request?.query?.action;
        if(username && action && action !== 'edit')
            await handleAction(action, replyData, username);

        if(username && action && action === 'edit') {
            reply.redirect(302, '/settings/edit-user?user='+username);
            return;
        }

        replyData.allUsers = await userService.getAllUsers();
        return reply.viewAsync('/users', replyData);
    });

    fastify.get('/edit-user/:username?', async (request, reply) => {
        const replyData = { 
            isAdmin: request?.userData?.username === 'admin',
            loggedInUserData: request.userData
        };

        if(!replyData.isAdmin) {
            return reply.viewAsync('/no-access', replyData);
        }

        const username = request?.params?.username;
        if(username)
            replyData.editedUserData = await userService.getUser(username);
        return reply.viewAsync('/edit-user', replyData);
    });


    fastify.get('/user/:username', async (request, reply) => {
        const replyData = { 
            isAdmin: request?.userData?.username === 'admin',
            loggedInUserData: request.userData
        };

        if(!replyData.isAdmin) {
            return reply.viewAsync('/no-access', replyData);
        }

        const username = request?.params?.username;

        replyData.selectedUser = await userService.getUser(username);
        return reply.viewAsync('/user', replyData);
    });

    fastify.post('/users/:action', async (request, reply) => {  
        const replyData = { 
            isAdmin: request?.userData?.username === 'admin',
            loggedInUserData: request.userData
        };

        if(!replyData.isAdmin) {
            replyData.message = "Unable to update, not admin.";
            reply.send(replyData);
            return;
        }
        const username = request?.body?.username;
        const userData = request?.body;
        delete userData.redirect;
        const action = request?.params?.action;
        await handleAction(action, replyData, username, userData);
        replyData.allUsers = await userService.getAllUsers();
        reply.send(replyData);
    });
    
    done();
}

async function handleAction(action, replyData, username, userData) {
    if(action === 'delete' && username) {
        if(username === 'admin') {
            replyData.error = `Cannot delete the admin user`;
            return;
        }
        if(!(await userService.deleteUser(username)))
            replyData.error = `Couldn't delete user '${username}'`;
        else
            replyData.message = `User '${username}' deleted.`
    } else if (action === 'add' && username && userData) { 
        if(await userService.getUser(username)) {
            replyData.error = `Couldn't add user '${username}', already exists.`;
            return;
        }
        try {
            await userService.saveUser(username, userData);
            replyData.message = `User '${username}' saved.`;
        } catch(err) {
            replyData.error = `Couldn't save user '${username}': ${err}`;
        }
    } else if (action === 'update' && username && userData) { 
        try {
            await userService.updateUser(username, userData);
            replyData.message = `User '${username}' saved.`;
        } catch(err) {
            replyData.error = `Couldn't update user '${username}': ${err}`;
        }
    } else if (action === 'enable' && username) { 
        try {
            await userService.updateUser(username, { enabled: true });
            replyData.message = `User '${username}' enabled.`;
        } catch(err) {
            replyData.error = `Couldn't save user '${username}': ${err}`;
        }
    } else if (action === 'disable' && username) { 
        if(username === 'admin') {
            replyData.error = `Cannot disable the admin user`;
            return;
        }
        try {
            await userService.updateUser(username, { enabled: false });
            replyData.message = `User '${username}' disabled.`;
        } catch(err) {
            replyData.error = `Couldn't save user '${username}': ${err}`;
        }
    } else {
        replyData.message = "No action found.";
    }      
}