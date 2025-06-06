// src/websocket/notificationUtils.js
const WebSocket = require('ws'); // Import WebSocket to check WebSocket.OPEN

/**
 * Sends a JSON stringified message to a specific user if they are online.
 * @param {Map<number, WebSocket>} activeConnections - Map of userId to WebSocket connection.
 * @param {number} userId - The ID of the user to send the message to.
 * @param {object} messageObject - The message object to send.
 * @returns {boolean} True if sent, false otherwise.
 */
function sendWsMessageToUser(activeConnections, userId, messageObject) {
    const recipientWs = activeConnections.get(Number(userId)); // Ensure userId is a number
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        try {
            recipientWs.send(JSON.stringify(messageObject));
            console.log(`WS Notif sent to user ${userId}: ${messageObject.type}`);
            return true;
        } catch (error) {
            console.error(`Error sending WS Notif to user ${userId}:`, error, messageObject);
            return false;
        }
    } else {
        // console.log(`WS Notif: User ${userId} not online or connection not open for type ${messageObject.type}`);
    }
    return false;
}

module.exports = {
    sendWsMessageToUser,
};