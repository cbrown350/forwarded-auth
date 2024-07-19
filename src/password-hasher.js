// const userService = require('./admin/user-service.js');
const { passwordStrength } = require('check-password-strength');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const args = require('minimist')(process.argv.slice(2), {
    alias: {
        h: 'help',
        v: 'version'
    }
});

if(args.v) {
    console.log(require('../package.json').version);
    process.exit(0);
    return;
}

if(args.h || !args.p) {
    console.log('Usage: password-hasher -p <password>');
    process.exit(0);
    return;
}

function encryptPassword(password) {
    return bcrypt.hashSync(password, saltRounds);
}

const password = args.p;

console.log('password hash: ' + encryptPassword(password));

const passwordTest = passwordStrength(password);
console.log(`Password validation result was '${passwordTest.value}'`);
if(passwordTest.id < 1)
    console.error(`Password should contain 2 of lowercase, uppercase, symbols and numbers and be at least 6 characters long!`);