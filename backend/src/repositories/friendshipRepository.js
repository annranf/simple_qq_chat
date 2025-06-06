// src/repositories/friendshipRepository.js
const { getOrderedUserIds } = require('../utils/friendshipUtils');
const messageRepository = require('./messageRepository');
async function getFriendshipsForUser(db, userId, statusFilter = null) {
    return new Promise(async (resolve, reject) => { // <--- Make outer promise async
        // ... (existing SQL and params setup) ...
        let sql = `...`; // Your existing SQL
        const baseParams = Array(8).fill(userId);
        const finalParams = [...baseParams];
        // ... (status filter logic) ...

        db.all(sql, finalParams, async (err, rows) => { // <--- make callback async
            if (err) {
                // ...
                return reject(err);
            }
            if (!rows) return resolve([]);

            const enrichedRows = [];
            for (const row of rows) {
                const peer = {
                    id: row.peer_id,
                    username: row.peer_username,
                    nickname: row.peer_nickname,
                    avatarUrl: row.peer_avatar_url,
                    status: row.peer_status,
                    lastSeenAt: row.peer_last_seen_at,
                };
                const { peer_id, peer_username, peer_nickname, peer_avatar_url, peer_status, peer_last_seen_at, ...mainRow } = row;
                
                const lastReadId = await messageRepository.getLastReadMessageIdForChat(db, userId, 'user', peer.id);
                const unreadCount = await messageRepository.countUnreadMessagesInChat(db, userId, 'user', peer.id, lastReadId);
                
                enrichedRows.push({ ...mainRow, peer, unread_count: unreadCount });
            }
            resolve(enrichedRows);
        });
    });
}
async function createFriendship(db, requesterId, recipientId, initialStatus = 'pending') {
    return new Promise((resolve, reject) => {
        if (requesterId === recipientId) {
            return reject(new Error("Cannot create friendship with oneself."));
        }
        const { user1_id, user2_id } = getOrderedUserIds(requesterId, recipientId);
        const action_user_id = requesterId; // The one initiating the action

        const sql = `
            INSERT INTO friendships (user1_id, user2_id, status, action_user_id)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user1_id, user2_id) DO UPDATE SET
                status = excluded.status,
                action_user_id = excluded.action_user_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE 
                (status = 'declined' AND excluded.status = 'pending') OR -- Allow re-request if previously declined
                (status = 'pending' AND excluded.status = 'pending' AND action_user_id != excluded.action_user_id) -- Allow other user to send request if one already exists
        `;
        // The ON CONFLICT logic is a bit tricky. A simpler approach might be to query first.
        // For now, a basic insert or ignore/update might be:
        // INSERT OR REPLACE (but this always replaces, not ideal for status transitions)
        // Let's simplify for now: attempt insert, handle specific conflicts in service layer or by querying first.

        const simplerSql = `
            INSERT INTO friendships (user1_id, user2_id, status, action_user_id)
            VALUES (?, ?, ?, ?)
        `;

        db.run(simplerSql, [user1_id, user2_id, initialStatus, action_user_id], function (err) {
            if (err) {
                // SQLITE_CONSTRAINT_UNIQUE error means a record already exists
                if (err.message && err.message.includes('UNIQUE constraint failed: friendships.user1_id, friendships.user2_id')) {
                    // We might want to check existing status here and decide if an update is allowed
                    // For example, if existing is 'declined', allow 'pending' by the other user.
                    // Or if 'blocked', don't allow 'pending'.
                    // This logic is better handled in a service layer by fetching first.
                    return reject(new Error('Friendship record already exists or conflicts.'));
                }
                console.error('Error creating friendship:', err);
                return reject(err);
            }
            // Fetch the created/updated record to return full details
            findFriendshipByIds(db, user1_id, user2_id)
                .then(resolve)
                .catch(reject);
        });
    });
}

async function updateFriendshipStatus(db, uId1, uId2, newStatus, actionUserId) {
    return new Promise((resolve, reject) => {
        const { user1_id, user2_id } = getOrderedUserIds(uId1, uId2);

        const sql = `
            UPDATE friendships
            SET status = ?, action_user_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user1_id = ? AND user2_id = ?
        `;
        // Add conditions to WHERE clause if needed, e.g., "AND status = 'pending'" for an accept/decline action.
        // For example, to accept a request:
        // WHERE user1_id = ? AND user2_id = ? AND status = 'pending' AND action_user_id != ? (action_user_id is the original requester)
        // The actionUserId in the SET clause is the one performing the current update.

        db.run(sql, [newStatus, actionUserId, user1_id, user2_id], function (err) {
            if (err) {
                console.error('Error updating friendship status:', err);
                return reject(err);
            }
            if (this.changes === 0) {
                return reject(new Error('Friendship not found or no change made (e.g., status already set or conditions not met).'));
            }
            findFriendshipByIds(db, user1_id, user2_id)
                .then(resolve)
                .catch(reject);
        });
    });
}

async function findFriendshipByIds(db, uId1, uId2) {
    return new Promise((resolve, reject) => {
        if (!uId1 || !uId2) return resolve(null); // Or reject
        const { user1_id, user2_id } = getOrderedUserIds(uId1, uId2);
        // Join with users table to get nicknames/usernames for both users in the friendship
        const sql = `
            SELECT
                f.id, f.user1_id, u1.username as user1_username, u1.nickname as user1_nickname, u1.avatar_url as user1_avatar,
                f.user2_id, u2.username as user2_username, u2.nickname as user2_nickname, u2.avatar_url as user2_avatar,
                f.status, f.action_user_id, au.username as action_user_username,
                f.created_at, f.updated_at
            FROM friendships f
            JOIN users u1 ON f.user1_id = u1.id
            JOIN users u2 ON f.user2_id = u2.id
            JOIN users au ON f.action_user_id = au.id
            WHERE f.user1_id = ? AND f.user2_id = ?
        `;
        db.get(sql, [user1_id, user2_id], (err, row) => {
            if (err) {
                console.error('Error finding friendship by IDs:', err);
                return reject(err);
            }
            resolve(row); // row can be undefined if not found
        });
    });
}

// Get all friendships for a specific user, optionally filtered by status
async function getFriendshipsForUser(db, userId, statusFilter = null) {
    return new Promise((resolve, reject) => {
        let sql = `
            SELECT
                f.id, f.user1_id, u1.username as user1_username, u1.nickname as user1_nickname, u1.avatar_url as user1_avatar,
                f.user2_id, u2.username as user2_username, u2.nickname as user2_nickname, u2.avatar_url as user2_avatar,
                f.status, f.action_user_id, au.username as action_user_username,
                f.created_at, f.updated_at,
                CASE
                    WHEN f.user1_id = ? THEN f.user2_id
                    ELSE f.user1_id
                END as peer_id,
                CASE
                    WHEN f.user1_id = ? THEN u2.username
                    ELSE u1.username
                END as peer_username,
                CASE
                    WHEN f.user1_id = ? THEN u2.nickname
                    ELSE u1.nickname
                END as peer_nickname,
                CASE
                    WHEN f.user1_id = ? THEN u2.avatar_url
                    ELSE u1.avatar_url
                END as peer_avatar_url,
                CASE
                    WHEN f.user1_id = ? THEN u2.status
                    ELSE u1.status
                END as peer_status,
                CASE
                    WHEN f.user1_id = ? THEN u2.last_seen_at
                    ELSE u1.last_seen_at
                END as peer_last_seen_at
            FROM friendships f
            JOIN users u1 ON f.user1_id = u1.id
            JOIN users u2 ON f.user2_id = u2.id
            JOIN users au ON f.action_user_id = au.id
            WHERE (f.user1_id = ? OR f.user2_id = ?)
        `;
        // Parameters for all placeholders related to userId
        const baseParams = Array(8).fill(userId); // 6 for CASE statements, 2 for WHERE clause
        const finalParams = [...baseParams];

        if (statusFilter) {
            if (Array.isArray(statusFilter)) {
                sql += ` AND f.status IN (${statusFilter.map(() => '?').join(',')})`;
                finalParams.push(...statusFilter);
            } else {
                sql += ` AND f.status = ?`;
                finalParams.push(statusFilter);
            }
        }
        sql += ` ORDER BY f.updated_at DESC`;

        db.all(sql, finalParams, (err, rows) => {
            if (err) {
                console.error('Error fetching friendships for user:', err);
                return reject(err);
            }
            // Enrich rows with a 'peer' object for easier frontend consumption
            const enrichedRows = rows.map(row => {
                const peer = {
                    id: row.peer_id,
                    username: row.peer_username,
                    nickname: row.peer_nickname,
                    avatarUrl: row.peer_avatar_url,
                    status: row.peer_status,
                    lastSeenAt: row.peer_last_seen_at,
                };
                // Remove redundant peer_ fields
                const { peer_id, peer_username, peer_nickname, peer_avatar_url, peer_status, peer_last_seen_at, ...mainRow } = row;
                return { ...mainRow, peer };
            });
            resolve(enrichedRows);
        });
    });
}


async function deleteFriendship(db, uId1, uId2) {
    return new Promise((resolve, reject) => {
        const { user1_id, user2_id } = getOrderedUserIds(uId1, uId2);
        const sql = 'DELETE FROM friendships WHERE user1_id = ? AND user2_id = ?';
        db.run(sql, [user1_id, user2_id], function (err) {
            if (err) {
                console.error('Error deleting friendship:', err);
                return reject(err);
            }
            resolve({ deleted: this.changes > 0 }); // Returns true if a row was deleted
        });
    });
}

module.exports = {
    createFriendship,
    updateFriendshipStatus,
    findFriendshipByIds,
    getFriendshipsForUser,
    deleteFriendship,
};