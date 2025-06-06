// src/utils/passwordUtils.js
const bcrypt = require('bcrypt');
const saltRounds = 10; // Cost factor for hashing

async function hashPassword(plainTextPassword) {
    if (!plainTextPassword) { // Handle cases where password might be optional for some users initially
        return null;
    }
    return bcrypt.hash(plainTextPassword, saltRounds);
}

async function comparePassword(plainTextPassword, hashedPassword) {
    if (!plainTextPassword || !hashedPassword) {
        return false;
    }
    return bcrypt.compare(plainTextPassword, hashedPassword);
}

module.exports = {
    hashPassword,
    comparePassword,
};