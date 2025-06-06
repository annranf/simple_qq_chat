// src/repositories/messageRepository.js

// Base SELECT clause and JOINs for message fetching, to be reused and extended
const MESSAGE_SELECT_FIELDS = `
    m.id, m.sender_id, COALESCE(u.username, 'System') as sender_username, u.nickname as sender_nickname, u.avatar_url as sender_avatar_url,
    gm_sender.nickname_in_group as sender_group_nickname,
    m.receiver_type, m.receiver_id, 
    m.content_type, 
    m.content as original_content, -- This will be sticker_id for stickers, media_id for other media, text for text

    m.metadata as message_metadata_raw,
    m.reply_to_message_id, m.client_message_id,
    m.created_at, m.updated_at, m.deleted_at,

    -- Fields for generic media (image, video, file, audio)
    ma_generic.id as generic_media_id,
    ma_generic.file_name as generic_media_file_name,
    ma_generic.file_path as generic_media_file_path,
    ma_generic.mime_type as generic_media_mime_type,
    ma_generic.size_bytes as generic_media_size_bytes,
    ma_generic.metadata as generic_media_metadata_raw,
    ma_generic.uploader_id as generic_media_uploader_id,

    -- Fields for sticker (s: stickers table, ma_sticker: media_attachments for sticker)
    s.id as sticker_table_id, 
    s.media_id as sticker_actual_media_id, 
    ma_sticker.file_path as sticker_file_path,
    ma_sticker.mime_type as sticker_mime_type,
    ma_sticker.metadata as sticker_media_metadata_raw
`;

const MESSAGE_JOINS = `
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    LEFT JOIN group_members gm_sender ON m.sender_id = gm_sender.user_id AND m.receiver_type = 'group' AND m.receiver_id = gm_sender.group_id

    LEFT JOIN media_attachments ma_generic ON 
        m.content_type IN ('image', 'video', 'audio', 'file') AND 
        (CASE WHEN m.content GLOB '[0-9]*' THEN CAST(m.content AS INTEGER) ELSE NULL END) = ma_generic.id

    LEFT JOIN stickers s ON 
        m.content_type = 'sticker' AND 
        (CASE WHEN m.content GLOB '[0-9]*' THEN CAST(m.content AS INTEGER) ELSE NULL END) = s.id
    LEFT JOIN media_attachments ma_sticker ON s.media_id = ma_sticker.id
`;


function processMessageRow(row) {
    if (!row) return null;

    if (row.message_metadata_raw) {
        try { row.message_metadata = JSON.parse(row.message_metadata_raw); } 
        catch (e) { console.warn(`Failed to parse message_metadata for msg ${row.id}: ${e.message}`); row.message_metadata = null; }
    }
    delete row.message_metadata_raw;

    if (row.content_type === 'sticker') {
        if (row.sticker_table_id && row.sticker_file_path) {
            let stickerMediaMetadata = null;
            if (row.sticker_media_metadata_raw) {
                try { stickerMediaMetadata = JSON.parse(row.sticker_media_metadata_raw); } catch (e) { /* ignore */ }
            }
            row.content = {
                type: 'sticker',
                stickerId: row.sticker_table_id,
                mediaId: row.sticker_actual_media_id,
                url: row.sticker_file_path,
                mimeType: row.sticker_mime_type,
                metadata: stickerMediaMetadata
            };
        } else {
            row.content = { type: 'sticker', error: "Sticker data not found", id: parseInt(row.original_content, 10) };
        }
    } else if (['image', 'video', 'audio', 'file'].includes(row.content_type)) {
        if (row.generic_media_id && row.generic_media_file_path) {
            let genericMediaMetadata = null;
            if (row.generic_media_metadata_raw) {
                try { genericMediaMetadata = JSON.parse(row.generic_media_metadata_raw); } catch (e) { /* ignore */ }
            }
            row.content = {
                type: row.content_type,
                id: row.generic_media_id, // This is media_attachments.id
                fileName: row.generic_media_file_name,
                url: row.generic_media_file_path,
                mimeType: row.generic_media_mime_type,
                sizeBytes: row.generic_media_size_bytes,
                uploaderId: row.generic_media_uploader_id,
                metadata: genericMediaMetadata
            };
        } else {
            // If original_content is an ID for a missing media
            const originalId = parseInt(row.original_content, 10);
            row.content = { type: row.content_type, error: "Media not found", id: isNaN(originalId) ? row.original_content : originalId };
        }
    } else { // 'text' or other simple content types
        row.content = row.original_content;
    }

    // Clean up raw and intermediate fields to keep the final object clean
    delete row.original_content;
    delete row.generic_media_id; delete row.generic_media_file_name; delete row.generic_media_file_path;
    delete row.generic_media_mime_type; delete row.generic_media_size_bytes; delete row.generic_media_metadata_raw;
    delete row.generic_media_uploader_id;
    delete row.sticker_table_id; delete row.sticker_actual_media_id; delete row.sticker_file_path;
    delete row.sticker_mime_type; delete row.sticker_media_metadata_raw;

    if (row.sender_id) { // If not a system message without a sender
        if (row.receiver_type === 'group') {
            row.sender_display_name = row.sender_group_nickname || row.sender_nickname || row.sender_username;
        } else {
            row.sender_display_name = row.sender_nickname || row.sender_username;
        }
    } else {
         row.sender_display_name = 'System';
    }
    // delete row.sender_group_nickname; // Can be kept if frontend needs it separately

    return row;
}


async function createMessage(db, { senderId, receiverType, receiverId, contentType, content, metadata, replyToMessageId, clientMessageId }) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO messages (sender_id, receiver_type, receiver_id, content_type, content, metadata, reply_to_message_id, client_message_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        const params = [senderId, receiverType, receiverId, contentType, content, metadata ? JSON.stringify(metadata) : null, replyToMessageId, clientMessageId];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('Error creating message:', err);
                return reject(err);
            }
            const messageId = this.lastID;
            getMessageById(db, messageId)
                .then(resolve)
                .catch(reject);
        });
    });
}

async function getMessageById(db, messageId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT ${MESSAGE_SELECT_FIELDS} ${MESSAGE_JOINS} WHERE m.id = ? AND m.deleted_at IS NULL`;
        db.get(sql, [messageId], (err, row) => {
            if (err) {
                console.error(`Error fetching message by id ${messageId}:`, err);
                return reject(err);
            }
            resolve(processMessageRow(row));
        });
    });
}

async function getDirectMessages(db, userId1, userId2, { beforeId = null, limit = 50 } = {}) {
    return new Promise((resolve, reject) => {
        let whereClause = `
            WHERE m.receiver_type = 'user' 
              AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
              AND m.deleted_at IS NULL
        `;
        const params = [userId1, userId2, userId2, userId1];

        if (beforeId) {
            // For robust cursor-based pagination, we need created_at of the beforeId message
            // This subquery adds one more lookup but ensures correctness if IDs are not strictly time-ordered or have gaps.
            // sql += ` AND (m.created_at < (SELECT created_at FROM messages WHERE id = ?) OR (m.created_at = (SELECT created_at FROM messages WHERE id = ?) AND m.id < ?))`;
            // For simplicity with SQLite and assuming IDs are a good proxy for order:
            whereClause += ` AND m.id < ?`;
            params.push(beforeId);
        }

        const sql = `
            SELECT ${MESSAGE_SELECT_FIELDS} 
            ${MESSAGE_JOINS} 
            ${whereClause}
            ORDER BY m.created_at DESC, m.id DESC 
            LIMIT ?
        `;
        params.push(limit);

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error fetching direct messages:', err);
                return reject(err);
            }
            const processedRows = rows.map(processMessageRow).filter(Boolean).reverse();
            resolve(processedRows);
        });
    });
}

async function getGroupMessages(db, groupId, { beforeId = null, limit = 50 } = {}) {
    return new Promise((resolve, reject) => {
        let whereClause = `
            WHERE m.receiver_type = 'group' 
              AND m.receiver_id = ?
              AND m.deleted_at IS NULL
        `;
        const params = [groupId];

        if (beforeId) {
            whereClause += ` AND m.id < ?`;
            params.push(beforeId);
        }

        const sql = `
            SELECT ${MESSAGE_SELECT_FIELDS} 
            ${MESSAGE_JOINS} 
            ${whereClause}
            ORDER BY m.created_at DESC, m.id DESC 
            LIMIT ?
        `;
        params.push(limit);

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error fetching group messages:', err);
                return reject(err);
            }
            const processedRows = rows.map(processMessageRow).filter(Boolean).reverse();
            resolve(processedRows);
        });
    });
}

async function markMessagesAsRead(db, userId, chatId, chatType, lastMessageId) {
    // This function assumes 'lastMessageId' is the ID of the latest message the user has seen in that specific chat.
    // The `message_read_receipts` table stores individual message read statuses.
    // For updating a user's "last read pointer" for a chat, a different table or mechanism might be better,
    // as discussed (e.g., user_chat_pointers).
    // For now, this just records that `lastMessageId` was read by `userId`.
    return new Promise((resolve, reject) => {
        // This query marks a *specific message* as read by a user.
        // It doesn't inherently mean all messages *before* it in that chat are read by this user through this action.
        const sql = `INSERT OR IGNORE INTO message_read_receipts (message_id, user_id, read_at) VALUES (?, ?, CURRENT_TIMESTAMP)`;
        db.run(sql, [lastMessageId, userId], function(err) {
            if (err) {
                console.error(`Error marking message ${lastMessageId} as read for user ${userId}:`, err);
                return reject(err);
            }
            resolve({ messageId: lastMessageId, userId, markedAsRead: this.changes > 0 });
        });
    });
}

// --- Functions for Unread Count (as discussed, these need a robust "last read pointer") ---
// These are placeholders and depend on how you store `lastReadMessageId` for a chat.
// Option 1: Use `message_read_receipts` and try to find the max message_id for a user in a chat. (Complex SQL)
// Option 2: Have a dedicated table `user_chat_pointers(user_id, chat_id, chat_type, last_read_message_id)`
//           which is updated by `MARK_AS_READ`. The functions below assume Option 2.

async function getLastReadMessageIdForChat(db, userId, chatType, targetId) {
    // This is a MOCK. Replace with query to your user_chat_pointers or similar table.
    // For now, let's try to infer from message_read_receipts (this is NOT ideal or fully accurate for "chat last read")
    return new Promise((resolve, reject) => {
        let sql;
        let params = [userId, targetId];
        if (chatType === 'user') {
            sql = `
                SELECT MAX(mrr.message_id) as last_read_id
                FROM message_read_receipts mrr
                JOIN messages m ON mrr.message_id = m.id
                WHERE mrr.user_id = ? 
                  AND m.receiver_type = 'user'
                  AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
            `;
            params = [userId, userId, targetId, targetId, userId]; // user_id, user_id, peer_id, peer_id, user_id
        } else if (chatType === 'group') {
            sql = `
                SELECT MAX(mrr.message_id) as last_read_id
                FROM message_read_receipts mrr
                JOIN messages m ON mrr.message_id = m.id
                WHERE mrr.user_id = ? 
                  AND m.receiver_type = 'group'
                  AND m.receiver_id = ?
            `;
        } else {
            return resolve(0);
        }
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row ? row.last_read_id : 0);
        });
    });
}

async function countUnreadMessagesInChat(db, userId, chatType, targetId, lastReadMessageId = 0) {
    return new Promise((resolve, reject) => {
        let sql;
        let params;
        if (chatType === 'user') {
            sql = `
                SELECT COUNT(*) as unread_count
                FROM messages
                WHERE receiver_type = 'user'
                  AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
                  AND sender_id != ?  -- Only count messages from the other user
                  AND id > ?
                  AND deleted_at IS NULL
            `;
            params = [targetId, userId, userId, targetId, userId, lastReadMessageId];
        } else if (chatType === 'group') {
            sql = `
                SELECT COUNT(*) as unread_count
                FROM messages
                WHERE receiver_type = 'group'
                  AND receiver_id = ?
                  AND sender_id != ? -- Don't count own messages as unread for self
                  AND id > ?
                  AND deleted_at IS NULL
            `;
            params = [targetId, userId, lastReadMessageId];
        } else {
            return resolve(0);
        }

        db.get(sql, params, (err, row) => {
            if (err) {
                console.error(`Error counting unread messages for ${chatType}:${targetId}, user:${userId}:`, err);
                return reject(err);
            }
            resolve(row ? row.unread_count : 0);
        });
    });
}


module.exports = {
    createMessage,
    getMessageById,
    getDirectMessages,
    getGroupMessages,
    markMessagesAsRead,
    // For unread counts (use with caution or implement a robust pointer system)
    getLastReadMessageIdForChat,
    countUnreadMessagesInChat,
};