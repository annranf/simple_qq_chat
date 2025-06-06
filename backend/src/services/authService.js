// src/services/authService.js
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const config = require('../config'); // Use centralized config

async function registerUser(db, { username, password, nickname, bio }) {
    if (!username || !password) {
        throw new Error('Username and password are required.');
    }
    const existingUser = await userRepository.findByUsername(db, username);
    if (existingUser) {
        throw new Error('Username already exists.');
    }

    const passwordHash = await hashPassword(password);
    const newUser = await userRepository.create(db, {
        username,
        passwordHash,
        nickname: nickname || username,
        bio,
        // avatarUrl can be added later
    });
    // Don't return passwordHash
    const { passwordHash: _, ...userToReturn } = newUser;
    return userToReturn;
}

async function loginUser(db, { username, password }) {
    if (!username || !password) {
        throw new Error('Username and password are required.');
    }
    const user = await userRepository.findByUsernameWithPassword(db, username); // Need to add this method to repo
    
    if (!user) {
        throw new Error('Invalid username or password.'); // Generic message
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
        throw new Error('Invalid username or password.'); // Generic message
    }

    const payload = {
        userId: user.id,
        username: user.username,
        // Add other non-sensitive info if needed, e.g., roles
    };

    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    // Don't return passwordHash
    const { password_hash, ...userToReturn } = user;
    return { user: userToReturn, token };
}

module.exports = {
    registerUser,
    loginUser,
};