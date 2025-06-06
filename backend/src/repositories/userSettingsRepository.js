// src/repositories/userSettingsRepository.js

async function findByUserId(db, userId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT user_id, notifications_enabled, theme, profile_visibility, 
                   last_seen_visibility, status_visibility, allow_friend_requests, updated_at 
            FROM user_settings WHERE user_id = ?
        `, [userId], (err, row) => {
            if (err) {
                console.error(`Error finding user settings for user ${userId}:`, err);
                return reject(err);
            }
            resolve(row);
        });
    });
}

async function createDefaultSettings(db, userId) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO user_settings (
                user_id, notifications_enabled, theme, profile_visibility,
                last_seen_visibility, status_visibility, allow_friend_requests
            ) VALUES (?, 1, 'light', 'public', 'everyone', 'everyone', 1)
        `;
        
        db.run(sql, [userId], function (err) {
            if (err) {
                console.error(`Error creating default settings for user ${userId}:`, err);
                return reject(err);
            }
            
            // 返回新创建的设置
            findByUserId(db, userId)
                .then(resolve)
                .catch(reject);
        });
    });
}

async function updateSettings(db, userId, updateData) {
    return new Promise((resolve, reject) => {
        const allowedFields = [
            'notifications_enabled', 'theme', 'profile_visibility',
            'last_seen_visibility', 'status_visibility', 'allow_friend_requests'
        ];
        
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
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(userId);
        
        const sql = `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`;
        
        db.run(sql, params, function (err) {
            if (err) {
                console.error(`Error updating settings for user ${userId}:`, err);
                return reject(err);
            }
            
            // 返回更新后的设置
            findByUserId(db, userId)
                .then(resolve)
                .catch(reject);
        });
    });
}

async function getOrCreateSettings(db, userId) {
    try {
        let settings = await findByUserId(db, userId);
        if (!settings) {
            settings = await createDefaultSettings(db, userId);
        }
        return settings;
    } catch (error) {
        console.error(`Error getting or creating settings for user ${userId}:`, error);
        throw error;
    }
}

module.exports = {
    findByUserId,
    createDefaultSettings,
    updateSettings,
    getOrCreateSettings
};
