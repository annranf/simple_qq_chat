const messageRepository = require('../repositories/messageRepository');
const mediaRepository = require('../repositories/mediaRepository');
const groupRepository = require('../repositories/groupRepository');
const stickerRepository = require('../repositories/stickerRepository');

async function handleSendMediaMessage(db, ws, currentUserId, currentUsername, payload, activeConnections) {    const { receiverType, receiverId, mediaId, clientMessageId, contentType } = payload; // contentType: 'image', 'video', 'audio', or 'file'

    if (!receiverType || !receiverId || !mediaId || !contentType) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Missing parameters for media message.' } }));
        return;
    }
    if (!['image', 'video', 'audio', 'file'].includes(contentType)) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid contentType for media. Must be "image", "video", "audio", or "file".' } }));
        return;
    }

    try {
        // Verify mediaId exists and belongs to user? (Optional, client got it from upload)
        const media = await mediaRepository.getMediaAttachmentById(db, mediaId);
        if (!media) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: `Media with ID ${mediaId} not found.` } }));
            return;
        }
        // Optional: Check if media.uploader_id === currentUserId for security if needed

        const messageData = {
            senderId: currentUserId,
            receiverType,
            receiverId: parseInt(receiverId, 10),
            contentType: contentType, // 'image' or 'video'
            content: String(mediaId), // Store media_id as content
            clientMessageId: clientMessageId || null,
            metadata: { // Store original filename, dimensions, etc. from media object if needed for quick display
                originalFilename: media.file_name,
                mimeType: media.mime_type,
                sizeBytes: media.size_bytes,
                ...(media.metadata || {}) // Include width, height, duration if extracted during upload
            }
        };

        const savedMessage = await messageRepository.createMessage(db, messageData);
        
        const outgoingMessage = {
            type: 'NEW_MESSAGE', // Use the same type as text messages, client can differentiate by contentType
            payload: { ...savedMessage, senderUsername: savedMessage.sender_username || currentUsername }
        };

        if (receiverType === 'user') {
            sendMessageToUser(activeConnections, savedMessage.receiver_id, outgoingMessage);
            sendMessageToUser(activeConnections, currentUserId, outgoingMessage);
        } else if (receiverType === 'group') {
            const activeMembers = await groupRepository.getGroupMembers(db, savedMessage.receiver_id, 'active');
            activeMembers.forEach(member => {
                sendMessageToUser(activeConnections, member.user_id, outgoingMessage);
            });
            console.log(`Group media message (ID: ${savedMessage.id}) for media ${mediaId} to group ${savedMessage.receiver_id} broadcasted.`);
        }
        console.log(`Media message from ${currentUserId} to ${receiverType}:${savedMessage.receiver_id} (Media ID: ${mediaId}) saved with ID ${savedMessage.id}`);

    } catch (error) {
        console.error('Error processing SEND_MEDIA_MESSAGE:', error);
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: `Failed to send media message: ${error.message}` } }));
    }
}
function sendMessageToUser(activeConnections, userId, messageObject) {
    const recipientWs = activeConnections.get(userId);
    if (recipientWs && recipientWs.readyState === require('ws').OPEN) {
        try {
            recipientWs.send(JSON.stringify(messageObject));
            return true;
        } catch (error) {
            console.error(`Error sending WebSocket message to user ${userId}:`, error, messageObject);
            return false;
        }
    }
    return false; // User not online or connection issue
}


async function handleSendTextMessage(db, ws, currentUserId, currentUsername, payload, activeConnections) {
    const { receiverType, receiverId, content, clientMessageId } = payload;

    if (!receiverType || !receiverId || !content) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Missing receiverType, receiverId, or content for text message.' } }));
        return;
    }
    if (receiverType !== 'user' && receiverType !== 'group') {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid receiverType. Must be "user" or "group".' } }));
        return;
    }

    try {
        const messageData = {
            senderId: currentUserId,
            receiverType,
            receiverId: parseInt(receiverId, 10),
            contentType: 'text',
            content: content.trim(),
            clientMessageId: clientMessageId || null,
        };

        const savedMessage = await messageRepository.createMessage(db, messageData);
        
        const outgoingMessage = {
            type: 'NEW_MESSAGE',
            payload: {
                ...savedMessage,
                senderUsername: savedMessage.sender_username || currentUsername, 
            }
        };

        // Send to recipient(s)
        if (receiverType === 'user') {
            sendMessageToUser(activeConnections, savedMessage.receiver_id, outgoingMessage);
            sendMessageToUser(activeConnections, currentUserId, outgoingMessage);
        } else if (receiverType === 'group') {
            // Broadcast to all active group members
            const activeMembers = await groupRepository.getGroupMembers(db, savedMessage.receiver_id, 'active');
            activeMembers.forEach(member => {
                // Send to everyone in the group, including the sender for UI sync
                // The client can differentiate or ignore if it's from itself based on sender_id
                sendMessageToUser(activeConnections, member.user_id, outgoingMessage);
            });
            console.log(`Group message (ID: ${savedMessage.id}) to group ${savedMessage.receiver_id} broadcasted to ${activeMembers.length} members.`);
        }

        console.log(`Message from ${currentUserId} to ${receiverType}:${savedMessage.receiver_id} saved with ID ${savedMessage.id}`);

    } catch (error) {
        console.error('Error processing SEND_TEXT_MESSAGE:', error);
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: `Failed to send message: ${error.message}` } }));
    }
}

async function handleFetchHistory(db, ws, currentUserId, payload) {
    const { chatType, chatId, beforeId, limit = 50 } = payload; // chatId is peerUserId or groupId

    if (!chatType || typeof chatId === 'undefined') {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Missing chatType or chatId for fetching history.' } }));
        return;
    }
    
    const parsedChatId = parseInt(chatId, 10);
    if (isNaN(parsedChatId)) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid chatId. Must be a number.' } }));
        return;
    }


    try {
        let messages;
        if (chatType === 'user') {
            messages = await messageRepository.getDirectMessages(db, currentUserId, parsedChatId, { beforeId, limit });
        } else if (chatType === 'group') {
            messages = await messageRepository.getGroupMessages(db, parsedChatId, { beforeId, limit });
        } else {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid chatType for history. Must be "user" or "group".' } }));
            return;
        }

        ws.send(JSON.stringify({
            type: 'MESSAGE_HISTORY',
            payload: {
                chatType,
                chatId: parsedChatId,
                messages
            }
        }));
    } catch (error) {
        console.error('Error processing FETCH_HISTORY:', error);
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: `Failed to fetch history: ${error.message}` } }));
    }
}

async function handleMarkAsRead(db, ws, currentUserId, payload, activeConnections) {
    const { chatType, chatId, lastMessageId } = payload;

    if (!chatType || typeof chatId === 'undefined' || typeof lastMessageId === 'undefined') {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Missing parameters for mark_as_read.' } }));
        return;
    }
    const parsedChatId = parseInt(chatId, 10);
    const parsedLastMessageId = parseInt(lastMessageId, 10);

    try {
        // Simplified: mark only the single lastMessageId as read by currentUserId
        await messageRepository.markMessagesAsRead(db, currentUserId, parsedChatId, chatType, parsedLastMessageId);

        const confirmation = {
            type: 'MESSAGES_MARKED_READ',
            payload: {
                chatType,
                chatId: parsedChatId,
                readerUserId: currentUserId,
                lastMessageId: parsedLastMessageId,
            }
        };
        // Send confirmation back to the user who marked as read
        sendMessageToUser(activeConnections, currentUserId, confirmation);

        // If it's a direct message, notify the other user as well
        if (chatType === 'user') {
            const peerUserId = parsedChatId;
            // Check if the peer is not the current user (should always be true for direct messages)
            if (peerUserId !== currentUserId) {
                 sendMessageToUser(activeConnections, peerUserId, {
                    type: 'MESSAGE_READ_RECEIPT', // Different type for the other user
                    payload: {
                        chatType,
                        chatId: currentUserId, // For the peer, the chatId is the currentUserId
                        readerUserId: currentUserId,
                        lastMessageId: parsedLastMessageId,
                    }
                });
            }
        } else if (chatType === 'group') {
            // For group, we could broadcast to other group members that this user read up to this message.
            // This can get noisy. Often, clients just refetch message details which include read counts/statuses.
            // Or, the server sends an aggregate "X users have read message Y".
            // For now, no broadcast for group read receipts to other members.
        }

        console.log(`User ${currentUserId} marked messages in ${chatType}:${parsedChatId} up to ${parsedLastMessageId} as read.`);

    } catch (error) {
        console.error('Error processing MARK_AS_READ:', error);
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: `Failed to mark messages as read: ${error.message}` } }));
    }
}
async function handleSendStickerMessage(db, ws, currentUserId, currentUsername, payload, activeConnections) {
    const { receiverType, receiverId, stickerId, clientMessageId } = payload;

    if (!receiverType || !receiverId || typeof stickerId !== 'number') { // Ensure stickerId is a number
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Missing or invalid parameters for sticker message.' } }));
        return;
    }    // 验证stickerId是否存在
    try {
        const sticker = await stickerRepository.getStickerById(db, stickerId);
        if (!sticker) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: `Sticker with ID ${stickerId} not found.` } }));
            return;
        }
    } catch (validationError) {
        console.error('Error validating sticker:', validationError);
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Failed to validate sticker.' } }));
        return;
    }

    try {
        const messageData = {
            senderId: currentUserId,
            receiverType,
            receiverId: parseInt(receiverId, 10),
            contentType: 'sticker',
            content: String(stickerId), // Store stickers.id as string content
            clientMessageId: clientMessageId || null,
            metadata: null // Could store sticker.media_id here if getMessageById doesn't join it.
        };

        const savedMessage = await messageRepository.createMessage(db, messageData);
        // createMessage internally calls getMessageById, which should now handle 'sticker' type
        
        const outgoingMessage = {
            type: 'NEW_MESSAGE',
            payload: { ...savedMessage } // senderUsername should be on savedMessage from getMessageById
        };

        // Broadcast logic (same as text/media messages)
        if (receiverType === 'user') {
            sendMessageToUser(activeConnections, savedMessage.receiver_id, outgoingMessage);
            if (currentUserId !== savedMessage.receiver_id) { // Don't send to self if chatting with self
                sendMessageToUser(activeConnections, currentUserId, outgoingMessage);
            }
        } else if (receiverType === 'group') {
            const activeMembers = await groupRepository.getGroupMembers(db, savedMessage.receiver_id, 'active');
            activeMembers.forEach(member => {
                sendMessageToUser(activeConnections, member.user_id, outgoingMessage);
            });
        }
        console.log(`Sticker message (ID: ${savedMessage.id}) from ${currentUserId} to ${receiverType}:${savedMessage.receiver_id} (Sticker ID: ${stickerId})`);

    } catch (error) {
        console.error('Error processing SEND_STICKER_MESSAGE:', error);
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: `Failed to send sticker message: ${error.message}` } }));
    }
}

module.exports = {
    handleSendTextMessage,
    handleFetchHistory,
    handleMarkAsRead,
    handleSendMediaMessage,
    handleSendStickerMessage,
};