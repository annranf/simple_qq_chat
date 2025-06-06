const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepository = require('../repositories/userRepository');

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    console.log("AuthMiddleware: Received auth header:", authHeader);
    const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];
    console.log("AuthMiddleware: Extracted token:", token);

    if (token == null) {
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        console.log("AuthMiddleware: Decoded token:", decoded);
        const db = req.app.locals.db;
        if (!db) {
            console.error("AuthMiddleware: DB instance not found in app.locals");
            return res.status(500).json({ message: "Server configuration error." });
        }
        
        const userFromDb = await userRepository.findById(db, decoded.userId);
        if (!userFromDb) {
            return res.status(401).json({ message: 'Unauthorized: User not found.' });
        }
        // Exclude password_hash if present (findById should already do this)
        delete userFromDb.password_hash; 
        req.user = userFromDb; // Attach the full, fresh user object (without sensitive data)
        console.log("AuthMiddleware: User attached to request:", req.user);
        next();
    } catch (err) {
        console.error("Token verification error:", err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Unauthorized: Token expired.' });
        }
        return res.status(403).json({ message: 'Forbidden: Invalid token.' });
    }
}

module.exports = {
    authenticateToken,
};