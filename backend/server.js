// telegram-clone-backend/server.js
require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path'); // For serving static files

const { initDb, closeDb, getDb } = require('./src/db');
const { setupWebSocketServer } = require('./src/websocket'); // We'll create this next
const authRoutes = require('./src/api/authRoutes');
const { authenticateToken } = require('./src/middleware/authMiddleware');
const userRoutes = require('./src/api/userRoutes');
const friendshipRoutes = require('./src/api/friendshipRoutes');
const stickerRoutes = require('./src/api/stickerRoutes');
// const chatRoutes = require('./src/api/chatRoutes');
const groupRoutes = require('./src/api/groupRoutes');
const uploadRoutes = require('./src/api/uploadRoutes'); 
// const errorMiddleware = require('./src/middleware/errorMiddleware');

const PORT = process.env.PORT || 3000;
const app = express();

// --- Global Middleware ---
app.use(cors({ // Configure CORS more restrictively in production
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // Allow frontend origin
    credentials: true // If you plan to use cookies/sessions
}));

// Increase the payload size limits to handle large file uploads
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies with 50MB limit
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies with 50MB limit

// Static folder for uploads (ensure 'uploads' directory exists)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Database Initialization ---
initDb()
    .then(dbInstance => {
        console.log('Database initialized successfully.');

        // --- WebSocket Server Setup ---
        const server = http.createServer(app);
        const wss = setupWebSocketServer(server); // Pass the HTTP server to WebSocket setup
        
        // Store db instance and wss where services can access them, e.g., via app.locals or a dedicated context module
        // For simplicity now, services can import getDb() and we can pass wss if needed.
        app.locals.db = dbInstance; // Make db accessible in request handlers if needed (though repositories are preferred)
        app.locals.wss = wss;       // Make wss accessible

        // --- API Routes ---
        // app.use('/api/auth', authRoutes(dbInstance, wss)); // Pass db/wss to route handlers
        app.use('/api/users', userRoutes(dbInstance));
        app.use('/api/auth', authRoutes(dbInstance));
        app.use('/api/friendships', friendshipRoutes(dbInstance));
        // app.use('/api/chats', chatRoutes(dbInstance));
        app.use('/api/groups', groupRoutes(dbInstance, wss));
        app.use('/api/uploads', uploadRoutes(dbInstance));
        app.use('/api/stickers', stickerRoutes(dbInstance));
        // Placeholder route
        app.get('/api/health', (req, res) => {
            res.json({ status: 'UP', message: 'Server is healthy', timestamp: new Date().toISOString() });
        });


        // --- Error Handling Middleware (should be last) ---
        // app.use(errorMiddleware);

        // --- Start Server ---
        server.listen(PORT, () => {
            console.log(`HTTP Server is listening on http://localhost:${PORT}`);
            console.log(`WebSocket Server is listening on ws://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Failed to initialize the application:', err);
        process.exit(1); // Exit if DB init fails
    });


// --- Graceful Shutdown ---
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    // Close WebSocket connections if wss is available (wss.clients.forEach(ws => ws.close());)
    // Server might not be initialized if initDb fails.
    const serverInstance = app.locals.server; // Assume server is stored in app.locals
    if (serverInstance) {
        serverInstance.close(() => {
            console.log('HTTP server closed.');
            closeDb(); // Close database connection
            process.exit(0);
        });
    } else {
        closeDb();
        process.exit(0);
    }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // `kill` command

module.exports = app; // Export app for potential testing