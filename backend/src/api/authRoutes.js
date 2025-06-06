// src/api/authRoutes.js
const express = require('express');
const authService = require('../services/authService');

module.exports = function(db) { // Pass db instance
    const router = express.Router();

    // POST /api/auth/register
    router.post('/register', async (req, res, next) => {
        try {
            // In a real app, add validation (e.g., using express-validator)
            const { username, password, nickname, bio } = req.body;
            const user = await authService.registerUser(db, { username, password, nickname, bio });
            res.status(201).json({ message: 'User registered successfully.', user });
        } catch (error) {
            console.error("Registration error:", error.message);
            if (error.message.includes("required") || error.message.includes("already exists")) {
                return res.status(400).json({ message: error.message });
            }
            next(error); // For server errors
        }
    });

    // POST /api/auth/login
    router.post('/login', async (req, res, next) => {
        try {
            const { username, password } = req.body;
            const result = await authService.loginUser(db, { username, password }); // result contains { user, token }
            res.status(200).json({ message: 'Login successful.', ...result });
        } catch (error) {
            console.error("Login error:", error.message);
            if (error.message.includes("required") || error.message.includes("Invalid username or password")) {
                return res.status(401).json({ message: error.message }); // 401 for auth failures
            }
            next(error);
        }
    });
    
    // (Optional) GET /api/auth/me - Example protected route to get current user
    // const { authenticateToken } = require('../middleware/authMiddleware'); // We'll create this next
    // router.get('/me', authenticateToken, (req, res) => {
    //     // req.user is populated by authenticateToken middleware
    //     res.json(req.user); 
    // });


    return router;
};