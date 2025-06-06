// src/config/index.js
require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    databasePath: process.env.DATABASE_PATH || './chat.db',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },
    uploadsDir: process.env.UPLOADS_DIR || 'uploads', // If you want to make this configurable
};