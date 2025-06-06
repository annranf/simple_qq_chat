// src/websocket/connectionManager.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepository = require('../repositories/userRepository');
const friendshipRepository = require('../repositories/friendshipRepository');
const { handleSendTextMessage, handleFetchHistory, handleMarkAsRead, handleSendMediaMessage,handleSendStickerMessage } = require('./messageHandlers');
const { sendWsMessageToUser } = require('../utils/notificationUtils'); // 确保这个路径是你的实际路径

// Store active connections. Key: userId, Value: WebSocket instance
const activeConnections = new Map(); // userId -> ws

async function broadcastUserStatusUpdate(db, userId, status, connectionsMap) {
    console.log(`Broadcasting status update for user ${userId}: ${status}`);
    try {
        const friends = await friendshipRepository.getFriendshipsForUser(db, userId, 'accepted');
        if (!friends || friends.length === 0) {
            // console.log(`User ${userId} has no accepted friends to notify for status update.`);
            return;
        }

        const notificationPayload = {
            type: 'USER_STATUS_UPDATE',
            payload: {
                userId: Number(userId), //确保是数字
                status: status,
                // lastSeenAt 仅在 offline 时有意义，并由 userRepository.updateUserStatus 处理数据库更新
                // payload 中可以只包含 userId 和 status，客户端收到 offline 时可以自己更新 lastSeenAt (如果需要显示)
                // 或者服务器在广播 offline 时，可以从数据库获取最新的 user.last_seen_at 并包含在 payload 中
                // 为简单起见，我们先只发送 userId 和 status。
                // 如果需要 lastSeenAt，可以这样做：
                ...(status === 'offline' && { lastSeenAt: new Date().toISOString() })
            }
        };

        for (const friendship of friends) {
            const friendId = friendship.peer.id;
            if (friendId !== userId) {
                const sent = sendWsMessageToUser(connectionsMap, friendId, notificationPayload);
                if (sent) {
                    // console.log(`Sent status update of user ${userId} to friend ${friendId}`);
                }
            }
        }
    } catch (error) {
        console.error(`Error broadcasting user status update for user ${userId}:`, error);
    }
}

async function handleConnection(ws, db) {
    let currentUserId = null;
    let currentUsername = null;
    let isAuthenticated = false;

    // console.log('WebSocket client connected. Waiting for IDENTIFY with token.');

    const authTimeout = setTimeout(() => {
        if (!isAuthenticated) {
            console.log('WebSocket client did not authenticate in time. Closing connection.');
            ws.send(JSON.stringify({ type: 'AUTH_TIMEOUT', payload: { message: 'Authentication timed out.' } }));
            ws.close(1008, "Authentication timed out");
        }
    }, 10000); // 10 seconds timeout

    ws.on('message', async (messageBuffer) => {
        const messageString = messageBuffer.toString();
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(messageString);
        } catch (error) {
            console.error('Failed to parse WebSocket message:', messageString, error);
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid JSON message format.' } }));
            return;
        }

        const { type, payload } = parsedMessage;

        if (!isAuthenticated && type !== 'IDENTIFY') {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Connection not authenticated. Please send IDENTIFY message first.' } }));
            return;
        }

        // console.log(`Received WS message from ${currentUsername || 'unidentified client'}:`, type, payload ? JSON.stringify(payload).substring(0,100) : '');


        try {
            switch (type) {
                case 'IDENTIFY':
                    if (payload && payload.token) {
                        try {
                            const decoded = jwt.verify(payload.token, config.jwt.secret);
                            const user = await userRepository.findById(db, decoded.userId);

                            if (!user) {
                                ws.send(JSON.stringify({ type: 'IDENTIFIED_ERROR', payload: { message: 'User from token not found.' } }));
                                ws.close(1008, "Identification failed: User not found");
                                return;
                            }

                            clearTimeout(authTimeout);
                            isAuthenticated = true;

                            // 检查用户是否已通过其他连接上线
                            if (activeConnections.has(user.id)) {
                                const existingWs = activeConnections.get(user.id);
                                console.log(`User ${user.username} (ID: ${user.id}) already connected. Terminating previous session.`);
                                existingWs.send(JSON.stringify({ type: 'SESSION_TERMINATED', payload: { message: 'New connection established from another location.'}}));
                                existingWs.close(1008, 'Session terminated due to new login');
                                activeConnections.delete(user.id); // 确保旧连接被移除
                            }
                            
                            await userRepository.updateUserStatus(db, user.id, 'online');
                            console.log(`User identified via token and online: ${user.username} (ID: ${user.id})`);

                            currentUserId = user.id;
                            currentUsername = user.username;
                            activeConnections.set(currentUserId, ws);

                            ws.send(JSON.stringify({
                                type: 'IDENTIFIED_SUCCESS',
                                payload: { userId: currentUserId, username: currentUsername, nickname: user.nickname, avatarUrl: user.avatar_url, message: `Welcome ${currentUsername}!` }
                            }));
                            await broadcastUserStatusUpdate(db, currentUserId, 'online', activeConnections);

                        } catch (jwtError) {
                            console.error('IDENTIFY token verification failed:', jwtError.message);
                            ws.send(JSON.stringify({ type: 'IDENTIFIED_ERROR', payload: { message: `Invalid token: ${jwtError.message}` } }));
                            ws.close(1008, "Identification failed: Invalid token");
                        }
                    } else {
                        ws.send(JSON.stringify({ type: 'IDENTIFIED_ERROR', payload: { message: 'Token missing in IDENTIFY payload.' } }));
                        ws.close(1008, "Identification failed: Token missing");
                    }
                    break;

                case 'SEND_TEXT_MESSAGE':
                    if (!isAuthenticated) {
                         ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Not identified. Cannot send message.' }}));
                         return;
                    }
                    await handleSendTextMessage(db, ws, currentUserId, currentUsername, payload, activeConnections);
                    break;

                case 'FETCH_HISTORY':
                    if (!isAuthenticated) {
                        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Not identified. Cannot fetch history.' }}));
                        return;
                    }
                    await handleFetchHistory(db, ws, currentUserId, payload);
                    break;
                    
                case 'SEND_STICKER_MESSAGE':
                if (!isAuthenticated) {
                    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Not identified. Cannot send sticker.' }}));
                    return;
                }
                await handleSendStickerMessage(db, ws, currentUserId, currentUsername, payload, activeConnections);
                break;

                case 'MARK_AS_READ':
                     if (!isAuthenticated) {
                        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Not identified. Cannot mark messages as read.' }}));
                        return;
                    }
                    await handleMarkAsRead(db, ws, currentUserId, payload, activeConnections);
                    break;

                 case 'SEND_MEDIA_MESSAGE':
                    if (!isAuthenticated) {
                        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Not identified. Cannot send media message.' }}));
                        return;
                    }
                    await handleSendMediaMessage(db, ws, currentUserId, currentUsername, payload, activeConnections);
                    break;
                // 可以在这里添加 PING/PONG 保持连接活跃的逻辑
                case 'PING':
                    if (!isAuthenticated && type) { // 允许未认证的ping吗？通常不允许
                         ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Not identified. Cannot PING.' }}));
                         return;
                    }
                    ws.send(JSON.stringify({ type: 'PONG' }));
                    break;
                default:
                    if (!isAuthenticated && type) {
                        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Connection not authenticated.' } }));
                        return;
                    }
                    console.warn(`Unknown WebSocket message type received from ${currentUsername || 'client'}: ${type}`);
                    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: `Unknown message type: ${type}` } }));
            }
        } catch (error) {
            console.error(`Error processing WebSocket message type ${type} for user ${currentUsername} (ID: ${currentUserId}):`, error);
            ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: `Error processing your request: ${error.message}`, originalAction: type }
            }));
        }
    });

    ws.on('close', async (code, reason) => {
        clearTimeout(authTimeout);
        const reasonString = reason ? reason.toString() : 'No reason provided';
        console.log(`WebSocket client disconnected (User: ${currentUsername || 'N/A'}, ID: ${currentUserId || 'N/A'}). Code: ${code}, Reason: ${reasonString}`);
        if (currentUserId) { // 只有认证过的用户才需要处理下线
            const wasActive = activeConnections.get(currentUserId) === ws; // 确保是当前这个 ws 连接
            if (wasActive) {
                activeConnections.delete(currentUserId);
                try {
                    // 获取最新的用户状态，如果已经是 offline (例如被新连接踢下线)，则不再重复更新和广播
                    const user = await userRepository.findById(db, currentUserId);
                    if (user && user.status === 'online') { // 只有当数据库状态还是 online 时才更新并广播
                        const offlineTimestamp = new Date().toISOString();
                        await userRepository.updateUserStatus(db, currentUserId, 'offline', offlineTimestamp);
                        console.log(`User ${currentUsername} (ID: ${currentUserId}) status set to offline at ${offlineTimestamp}.`);
                        await broadcastUserStatusUpdate(db, currentUserId, 'offline', activeConnections);
                    } else {
                        console.log(`User ${currentUsername} (ID: ${currentUserId}) was already marked offline or not found. No further action on close.`);
                    }
                } catch (dbError) {
                    console.error(`Error during disconnect operations for user ID ${currentUserId}:`, dbError);
                }
            } else {
                 // console.log(`Disconnected ws was not the primary active connection for user ${currentUserId}. No status change broadcasted.`);
            }
        }
    });

    ws.on('error', (error) => {
        clearTimeout(authTimeout);
        console.error(`WebSocket error for client (User: ${currentUsername || 'N/A'}, ID: ${currentUserId || 'N/A'}):`, error);
        // 错误事件通常也会触发 close 事件，所以重复的清理逻辑可能不需要在这里。
        // 但如果 currentUserId 已设置，主动从 activeConnections 中移除可能是个好主意，以防 close 未正确触发。
        if (currentUserId && activeConnections.get(currentUserId) === ws) {
            activeConnections.delete(currentUserId);
             // 这里可以考虑是否也需要调用 userRepository.updateUserStatus 和 broadcastUserStatusUpdate
             // 但通常 'error' 之后会紧跟 'close'
        }
    });
}

module.exports = { handleConnection, activeConnections };