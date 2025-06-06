// src/repositories/userRepository.js

// We'll use these functions to interact with the 'users' table.
// Each function will take the 'db' instance as its first argument.

async function findById(db, id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT id, username, nickname, avatar_url, bio, status, last_seen_at, created_at, updated_at FROM users WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error(`Error finding user by id ${id}:`, err);
                return reject(err);
            }
            resolve(row); // Returns the user object or undefined if not found
        });
    });
}

async function findByUsername(db, username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT id, username, nickname, avatar_url, bio, status, last_seen_at FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                console.error(`Error finding user by username ${username}:`, err);
                return reject(err);
            }
            resolve(row);
        });
    });
}

// Modified create function
async function create(db, { username, passwordHash, nickname, avatarUrl, bio }) { // Added passwordHash
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO users (username, password_hash, nickname, avatar_url, bio, status, last_seen_at)
            VALUES (?, ?, ?, ?, ?, 'offline', NULL) 
        `; // New users are 'offline' until they connect
        const params = [username, passwordHash, nickname || username, avatarUrl, bio];
        db.run(sql, params, function (err) {
            if (err) {
                console.error('Error creating user:', err);
                return reject(err);
            }
            // Return more complete user object, exclude passwordHash
            findById(db, this.lastID)
                .then(createdUser => {
                    if (createdUser && createdUser.password_hash) {
                        delete createdUser.password_hash; // Ensure hash is not returned
                    }
                    resolve(createdUser);
                })
                .catch(reject);
        });
    });
}

// New function to fetch user with password hash (only for login)
async function findByUsernameWithPassword(db, username) {
    return new Promise((resolve, reject) => {
        // Select all necessary fields including password_hash
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                console.error(`Error finding user by username ${username} (with pwd):`, err);
                return reject(err);
            }
            resolve(row); // Returns full user object or undefined
        });
    });
}


// src/repositories/userRepository.js
// updateUserStatus 函数已正确接收 lastSeenAt，无需修改
async function updateUserStatus(db, userId, status, lastSeenAt = new Date().toISOString()) { // lastSeenAt 已经有默认值
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE users SET status = ?, last_seen_at = ? WHERE id = ?';
        // 如果status是'online'，last_seen_at 可以设为 NULL 或当前时间，看你的业务逻辑。
        // Telegram 通常是用户下线时才记录 last_seen_at。
        // 对于 'online' 状态，前端可以直接判断 status='online'，last_seen_at 不是主要关注点。
        // 如果是 'offline'，则 lastSeenAt 很重要。
        const finalLastSeenAt = (status === 'offline') ? lastSeenAt : null; // 或者 (status === 'offline') ? lastSeenAt : new Date().toISOString();

        db.run(sql, [status, finalLastSeenAt, userId], function (err) { // <--- 使用 finalLastSeenAt
            if (err) {
                console.error(`Error updating status for user ${userId}:`, err);
                return reject(err);
            }
            resolve({ changes: this.changes });
        });
    });
}

async function getAllUsers(db, currentUserIdToExclude = null) {
    return new Promise((resolve, reject) => {
        let sql = 'SELECT id, username, nickname, avatar_url, status, last_seen_at FROM users';
        const params = [];
        if (currentUserIdToExclude) {
            sql += ' WHERE id != ?';
            params.push(currentUserIdToExclude);
        }
        sql += ' ORDER BY username ASC';

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error fetching all users:', err);
                return reject(err);
            }
            resolve(rows);
        });
    });
}

async function searchUsers(db, query, currentUserIdToExclude = null) {
    return new Promise((resolve, reject) => {
        let sql = `
            SELECT id, username, nickname, avatar_url, status, last_seen_at 
            FROM users 
            WHERE (username LIKE ? OR nickname LIKE ?)
        `;
        const params = [`%${query}%`, `%${query}%`];
        
        if (currentUserIdToExclude) {
            sql += ' AND id != ?';
            params.push(currentUserIdToExclude);
        }
        
        sql += ' ORDER BY username ASC LIMIT 20'; // 限制搜索结果数量

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error searching users:', err);
                return reject(err);
            }
            resolve(rows);
        });
    });
}

async function updateUser(db, userId, updateData) {
    return new Promise((resolve, reject) => {
        const allowedFields = ['nickname', 'avatar_url', 'bio', 'status'];
        const updates = [];
        const params = [];
        
        // 只允许更新指定的字段
        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                params.push(value);
            }
        }
        
        if (updates.length === 0) {
            return resolve({ changes: 0 });
        }
        
        // 添加更新时间和用户ID
        updates.push('updated_at = datetime("now")');
        params.push(userId);
        
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        
        db.run(sql, params, function (err) {
            if (err) {
                console.error(`Error updating user ${userId}:`, err);
                return reject(err);
            }
            
            // 返回更新后的用户信息
            findById(db, userId)
                .then(updatedUser => {
                    if (updatedUser && updatedUser.password_hash) {
                        delete updatedUser.password_hash; // 确保不返回密码哈希
                    }
                    resolve(updatedUser);
                })
                .catch(reject);
        });
    });
}

async function updatePassword(db, userId, newPasswordHash) {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?';
        
        db.run(sql, [newPasswordHash, userId], function (err) {
            if (err) {
                console.error(`Error updating password for user ${userId}:`, err);
                return reject(err);
            }
            
            resolve({ changes: this.changes });
        });
    });
}

// Change user password
async function changePassword(db, userId, newPasswordHash) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        
        db.run(sql, [newPasswordHash, userId], function (err) {
            if (err) {
                console.error('Error changing password for user:', userId, err);
                return reject(err);
            }
            
            if (this.changes === 0) {
                return reject(new Error('User not found'));
            }
            
            resolve({ success: true, message: 'Password changed successfully' });
        });
    });
}

// Get user privacy settings
async function getUserPrivacySettings(db, userId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                online_status_visible,
                allow_friend_requests,
                allow_group_invites,
                allow_direct_messages,
                searchable_by_username,
                searchable_by_nickname
            FROM user_settings 
            WHERE user_id = ?
        `;
        
        db.get(sql, [userId], (err, row) => {
            if (err) {
                console.error('Error getting privacy settings for user:', userId, err);
                return reject(err);
            }
            
            // If no settings exist, return defaults
            if (!row) {
                const defaults = {
                    online_status_visible: true,
                    allow_friend_requests: true,
                    allow_group_invites: true,
                    allow_direct_messages: true,
                    searchable_by_username: true,
                    searchable_by_nickname: true
                };
                resolve(defaults);
            } else {
                resolve({
                    online_status_visible: Boolean(row.online_status_visible),
                    allow_friend_requests: Boolean(row.allow_friend_requests),
                    allow_group_invites: Boolean(row.allow_group_invites),
                    allow_direct_messages: Boolean(row.allow_direct_messages),
                    searchable_by_username: Boolean(row.searchable_by_username),
                    searchable_by_nickname: Boolean(row.searchable_by_nickname)
                });
            }
        });
    });
}

// Update user privacy settings
async function updateUserPrivacySettings(db, userId, privacySettings) {
    return new Promise((resolve, reject) => {
        // First check if user settings record exists
        const checkSql = `SELECT user_id FROM user_settings WHERE user_id = ?`;
        
        db.get(checkSql, [userId], (err, row) => {
            if (err) {
                console.error('Error checking user settings existence:', err);
                return reject(err);
            }
            
            let sql, params;
            
            if (row) {
                // Update existing record
                sql = `
                    UPDATE user_settings 
                    SET 
                        online_status_visible = COALESCE(?, online_status_visible),
                        allow_friend_requests = COALESCE(?, allow_friend_requests),
                        allow_group_invites = COALESCE(?, allow_group_invites),
                        allow_direct_messages = COALESCE(?, allow_direct_messages),
                        searchable_by_username = COALESCE(?, searchable_by_username),
                        searchable_by_nickname = COALESCE(?, searchable_by_nickname),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                `;
                params = [
                    privacySettings.online_status_visible,
                    privacySettings.allow_friend_requests,
                    privacySettings.allow_group_invites,
                    privacySettings.allow_direct_messages,
                    privacySettings.searchable_by_username,
                    privacySettings.searchable_by_nickname,
                    userId
                ];
            } else {
                // Insert new record with defaults and provided values
                sql = `
                    INSERT INTO user_settings (
                        user_id, 
                        notifications_enabled, 
                        theme,
                        online_status_visible,
                        allow_friend_requests,
                        allow_group_invites,
                        allow_direct_messages,
                        searchable_by_username,
                        searchable_by_nickname,
                        updated_at
                    ) VALUES (?, 1, 'light', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `;
                params = [
                    userId,
                    privacySettings.online_status_visible ?? true,
                    privacySettings.allow_friend_requests ?? true,
                    privacySettings.allow_group_invites ?? true,
                    privacySettings.allow_direct_messages ?? true,
                    privacySettings.searchable_by_username ?? true,
                    privacySettings.searchable_by_nickname ?? true
                ];
            }
            
            db.run(sql, params, function (err) {
                if (err) {
                    console.error('Error updating privacy settings for user:', userId, err);
                    return reject(err);
                }
                
                // Return updated settings
                getUserPrivacySettings(db, userId)
                    .then(resolve)
                    .catch(reject);
            });
        });
    });
}

// Get all user settings (including privacy)
async function getUserSettings(db, userId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                notifications_enabled,
                theme,
                online_status_visible,
                allow_friend_requests,
                allow_group_invites,
                allow_direct_messages,
                searchable_by_username,
                searchable_by_nickname
            FROM user_settings 
            WHERE user_id = ?
        `;
        
        db.get(sql, [userId], (err, row) => {
            if (err) {
                console.error('Error getting user settings:', userId, err);
                return reject(err);
            }
            
            // If no settings exist, return defaults
            if (!row) {
                const defaults = {
                    notifications_enabled: true,
                    theme: 'light',
                    online_status_visible: true,
                    allow_friend_requests: true,
                    allow_group_invites: true,
                    allow_direct_messages: true,
                    searchable_by_username: true,
                    searchable_by_nickname: true
                };
                resolve(defaults);
            } else {
                resolve({
                    notifications_enabled: Boolean(row.notifications_enabled),
                    theme: row.theme || 'light',
                    online_status_visible: Boolean(row.online_status_visible),
                    allow_friend_requests: Boolean(row.allow_friend_requests),
                    allow_group_invites: Boolean(row.allow_group_invites),
                    allow_direct_messages: Boolean(row.allow_direct_messages),
                    searchable_by_username: Boolean(row.searchable_by_username),
                    searchable_by_nickname: Boolean(row.searchable_by_nickname)
                });
            }
        });
    });
}

module.exports = {
    findById,
    findByUsername,
    create,
    updateUserStatus,
    getAllUsers,
    findByUsernameWithPassword,
    searchUsers,
    updateUser,
    updatePassword,
    changePassword,
    getUserPrivacySettings,
    updateUserPrivacySettings,
    getUserSettings,
};