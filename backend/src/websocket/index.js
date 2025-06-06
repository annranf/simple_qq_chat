const WebSocket = require('ws');
const { getDb } = require('../db');
const { handleConnection } = require('./connectionManager');

function setupWebSocketServer(httpServer) {
    const wss = new WebSocket.Server({ server: httpServer });

    console.log('WebSocket server setup initiated.');

    wss.on('connection', (ws, req) => {
        // req can be used to get headers, origin, etc. if needed for initial checks
        // For example: const ip = req.socket.remoteAddress;
        console.log('Client attempting to connect via WebSocket...');
        handleConnection(ws, getDb()); // Pass ws connection and db instance to the connection manager
    });

    wss.on('error', (error) => {
        console.error('WebSocket Server Error:', error);
    });

    console.log('WebSocket server event listeners attached.');
    return wss;
}

module.exports = { setupWebSocketServer };