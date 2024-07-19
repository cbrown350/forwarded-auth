const config = require('../config/config.js');
const log = config.getLog();
const generator = require('generate-password');
const { passwordStrength } = require('check-password-strength');

const dbFilePath = process.env.DB_FILE_PATH || './json.sqlite';
log.info(`DB file path: ${dbFilePath}`);
const authTable = new (require("quick.db")).QuickDB({ filePath: dbFilePath, tableName: 'authTable' });

const bcrypt = require('bcrypt');
const saltRounds = 10;

if(!(authTable.get('admin'))?.passwordHash || !(getAllUsers().some(u=>u.enabled))) {
    const envAdminPassword = process.env.ADMIN_PASSWORD
    let newAdminPassword;
    if(envAdminPassword) {
        newAdminPassword = envAdminPassword;
        log.info("The new admin password will be set using the ADMIN_PASSWORD env variable.");
    } else {
        newAdminPassword = generator.generate({
            length: 12,
            numbers: true,
            excludeSimilarCharacters: true,
            strict: true
        });
        log.info(`The admin password was not set so it was randomly generated to be: '${newAdminPassword}'.`);
    }
    saveUser('admin', { password: newAdminPassword, enabled: true });
} else {
    log.info("The admin password was previously set and saved in the auth database.");
}

module.exports = { saveUser, updateUser, deleteUser, getUser, getUserWithPasswordHash, getAllUsers, validatePassword, validateUsername, checkPassword };

function encryptPassword(password) {
    return bcrypt.hashSync(password, saltRounds);
}

function saveUser(username, userData) {
    validateUsername(username);
    validatePassword(userData);
    if(userData.password)
        userData = { ...userData, passwordHash: encryptPassword(userData.password) };
    delete userData.password;    
    delete userData.username;
    authTable.set(username, userData);
    log.debug(`Saved user '${username}'.`);
}

async function updateUser(username, newUserData) {
    let userData = await authTable.get(username) || {};
    const changingKeys = Object.keys(newUserData);
    if(changingKeys.includes('password') && newUserData.password)
        delete userData.passwordHash;
    changingKeys.forEach(k=>userData[k] = newUserData[k]);
    if(newUserData.username === 'admin') // prevent updating non admin to admin
        delete newUserData.username;
    const newUsername = newUserData.username || username;
    if(newUsername === 'admin')
        userData.enabled = true;
    validateUsername(newUsername);
    validatePassword(userData);
    if(userData.password)
        userData = { ...userData, passwordHash: encryptPassword(userData.password) };
    delete userData.password;    
    delete userData.username;
    authTable.set(newUsername, userData);
    if(changingKeys.includes('username') && newUserData.username && newUserData.username !== newUsername)
        deleteUser(username);
    log.debug(`Updated user '${newUsername}'.`);
}

function validateUsername(username) {
    if(!username || username.length < 3 || username.length > 15 || !username.match("^[A-Za-z0-9]+$"))
        throw new Error("Username is an invalid, it must be only letters and numbers and be 4 to 15 characters long!");
}

function validatePassword(userData) {
    if(userData.passwordHash) {
        return { id: 1, value: "unknown" };
    }
    const password = userData.password;
    if(!password)
        throw new Error("Password is invalid!");
    const passwordTest = passwordStrength(password);
    log.debug(`Password validation result was '${passwordTest.value}'.`);
    if(passwordTest.id < 1)
        throw new Error(`Password is ${passwordTest.value}, must contain 2 of lowercase, uppercase, symbols and numbers and be at least 6 characters long!`);
    return passwordTest;
}

function checkPassword(password, passwordHash) {
    if(!passwordHash || !bcrypt.compareSync(password, passwordHash)) {
        log.info(`Password invalid.`);
        throw new Error('Wrong username or password!');
    }
}

async function getUser(username) {
    const user = await getUserWithPasswordHash(username);
    delete user?.passwordHash;
    return user;
}

async function getUserWithPasswordHash(username) {
    const user = await authTable.get(username);
    if(!user)
        return user;
    return { ...user, username };
}

async function deleteUser(username) {
    return authTable.delete(username);
}

async function getAllUsers() {
    return ((await authTable.all()) || []).map(u=>{
        const newVal = { ...u, ...u.value }
        newVal.username = u.id;
        delete newVal.passwordHash;
        delete newVal.value;
        return newVal;
    });
}