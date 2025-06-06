// src/repositories/groupRepository.js
const messageRepository = require('./messageRepository');
// --- Group Operations ---
async function getGroupsForUser(db, userId, statusFilter = 'active') {
    return new Promise(async (resolve, reject) => { // <--- Make outer promise async
        const sql = `
            SELECT 
                g.id, g.name, g.description, g.avatar_url, g.group_type,
                g.owner_id, ou.username as owner_username,
                gm.role as user_role_in_group, gm.status as user_status_in_group, gm.nickname_in_group,
                (SELECT COUNT(*) FROM group_members active_m WHERE active_m.group_id = g.id AND active_m.status = 'active') as active_member_count,
                (SELECT content FROM messages m WHERE m.receiver_type = 'group' AND m.receiver_id = g.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) as last_message_content,
                (SELECT created_at FROM messages m WHERE m.receiver_type = 'group' AND m.receiver_id = g.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) as last_message_timestamp
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            LEFT JOIN users ou ON g.owner_id = ou.id
            WHERE gm.user_id = ? AND g.deleted_at IS NULL
              AND gm.status = ? 
            ORDER BY (SELECT MAX(m.created_at) FROM messages m WHERE m.receiver_type = 'group' AND m.receiver_id = g.id AND m.deleted_at IS NULL) DESC, g.updated_at DESC
        `;
        db.all(sql, [userId, statusFilter], async (err, rows) => { // <--- make callback async
            if (err) {
                console.error(`Error fetching groups for user ${userId}:`, err);
                return reject(err);
            }
            if (!rows) return resolve([]);

            // Enrich with unread count
            const enrichedRows = [];
            for (const row of rows) {
                const lastReadId = await messageRepository.getLastReadMessageIdForChat(db, userId, 'group', row.id);
                const unreadCount = await messageRepository.countUnreadMessagesInChat(db, userId, 'group', row.id, lastReadId);
                enrichedRows.push({ ...row, unread_count: unreadCount });
            }
            resolve(enrichedRows);
        });
    });
}
async function createGroup(db, { name, description, avatarUrl, ownerId, groupType = 'private', inviteLinkToken = null }) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO groups (name, description, avatar_url, owner_id, group_type, invite_link_token)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const params = [name, description, avatarUrl, ownerId, groupType, inviteLinkToken];
        db.run(sql, params, function (err) {
            if (err) {
                console.error('Error creating group:', err);
                return reject(err);
            }
            // Fetch the newly created group to return complete data
            getGroupById(db, this.lastID)
                .then(resolve)
                .catch(reject);
        });
    });
}

async function getGroupById(db, groupId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                g.id, g.name, g.description, g.avatar_url, 
                g.owner_id, u.username as owner_username, u.nickname as owner_nickname,
                g.group_type, g.invite_link_token,
                g.created_at, g.updated_at, g.deleted_at
            FROM groups g
            LEFT JOIN users u ON g.owner_id = u.id
            WHERE g.id = ? AND g.deleted_at IS NULL
        `;
        db.get(sql, [groupId], (err, row) => {
            if (err) {
                console.error(`Error fetching group by id ${groupId}:`, err);
                return reject(err);
            }
            resolve(row); // row can be undefined
        });
    });
}

async function updateGroupDetails(db, groupId, { name, description, avatarUrl, groupType, inviteLinkToken, ownerId }) {
    // Build SET clause dynamically
    const fieldsToUpdate = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (description !== undefined) fieldsToUpdate.description = description;
    if (avatarUrl !== undefined) fieldsToUpdate.avatar_url = avatarUrl;
    if (groupType !== undefined) fieldsToUpdate.group_type = groupType;
    if (inviteLinkToken !== undefined) fieldsToUpdate.invite_link_token = inviteLinkToken; // Can be set to NULL
    if (ownerId !== undefined) fieldsToUpdate.owner_id = ownerId;

    if (Object.keys(fieldsToUpdate).length === 0) {
        return getGroupById(db, groupId); // No changes, return current state
    }

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
    const params = [...Object.values(fieldsToUpdate), groupId];

    return new Promise((resolve, reject) => {
        const sql = `UPDATE groups SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`;
        db.run(sql, params, function (err) {
            if (err) {
                console.error(`Error updating group ${groupId}:`, err);
                return reject(err);
            }
            if (this.changes === 0) {
                // Could be because group not found or no actual change in values
                return reject(new Error('Group not found or no update made.'));
            }
            getGroupById(db, groupId)
                .then(resolve)
                .catch(reject);
        });
    });
}

async function softDeleteGroup(db, groupId) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE groups SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`;
        db.run(sql, [groupId], function(err) {
            if (err) {
                console.error(`Error soft deleting group ${groupId}:`, err);
                return reject(err);
            }
            resolve({ deleted: this.changes > 0 });
        });
    });
}

// --- Group Member Operations ---

async function addGroupMember(db, { groupId, userId, role = 'member', status = 'active', nicknameInGroup = null }) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO group_members (group_id, user_id, role, status, nickname_in_group)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(group_id, user_id) DO UPDATE SET
                role = excluded.role,
                status = excluded.status,
                nickname_in_group = excluded.nickname_in_group,
                joined_at = CASE WHEN status = 'left' OR status = 'kicked' THEN CURRENT_TIMESTAMP ELSE joined_at END, -- Reset joined_at if rejoining
                updated_at = CURRENT_TIMESTAMP
            WHERE status != 'banned' -- Cannot rejoin/update if banned by this conflict update
        `;
        // Simpler:
        // INSERT INTO group_members (group_id, user_id, role, status, nickname_in_group) VALUES (?, ?, ?, ?, ?)
        db.run(sql, [groupId, userId, role, status, nicknameInGroup], function (err) {
            if (err) {
                console.error('Error adding/updating group member:', err);
                return reject(err);
            }
             // Fetch the member record to return complete details
            getGroupMember(db, groupId, userId)
                .then(resolve)
                .catch(reject);
        });
    });
}

async function getGroupMember(db, groupId, userId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                gm.id, gm.group_id, g.name as group_name,
                gm.user_id, u.username as user_username, u.nickname as user_nickname, u.avatar_url as user_avatar,
                gm.role, gm.status, gm.nickname_in_group, gm.joined_at, gm.muted_until,
                gm.created_at as membership_created_at, gm.updated_at as membership_updated_at
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            JOIN groups g ON gm.group_id = g.id
            WHERE gm.group_id = ? AND gm.user_id = ? AND g.deleted_at IS NULL
        `;
        db.get(sql, [groupId, userId], (err, row) => {
            if (err) {
                console.error(`Error fetching group member (${userId}) for group ${groupId}:`, err);
                return reject(err);
            }
            resolve(row); // row can be undefined
        });
    });
}

async function updateGroupMember(db, groupId, userId, { role, status, nicknameInGroup, mutedUntil }) {
    const fieldsToUpdate = {};
    if (role !== undefined) fieldsToUpdate.role = role;
    if (status !== undefined) fieldsToUpdate.status = status;
    if (nicknameInGroup !== undefined) fieldsToUpdate.nickname_in_group = nicknameInGroup; // Can be null
    if (mutedUntil !== undefined) fieldsToUpdate.muted_until = mutedUntil; // Can be null

    if (Object.keys(fieldsToUpdate).length === 0) {
        return getGroupMember(db, groupId, userId);
    }

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
    const params = [...Object.values(fieldsToUpdate), groupId, userId];

    return new Promise((resolve, reject) => {
        const sql = `UPDATE group_members SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE group_id = ? AND user_id = ?`;
        db.run(sql, params, function (err) {
            if (err) {
                console.error(`Error updating member ${userId} in group ${groupId}:`, err);
                return reject(err);
            }
            if (this.changes === 0) {
                 return reject(new Error('Group member not found or no update made.'));
            }
            getGroupMember(db, groupId, userId)
                .then(resolve)
                .catch(reject);
        });
    });
}

async function removeGroupMember(db, groupId, userId) {
    // This is a hard delete. For 'leave' or 'kick', you'd update status.
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM group_members WHERE group_id = ? AND user_id = ?';
        db.run(sql, [groupId, userId], function (err) {
            if (err) {
                console.error(`Error removing member ${userId} from group ${groupId}:`, err);
                return reject(err);
            }
            resolve({ deleted: this.changes > 0 });
        });
    });
}

async function getGroupMembers(db, groupId, statusFilter = 'active') { // Default to active members
    return new Promise((resolve, reject) => {
        let sql = `
            SELECT 
                gm.user_id, u.username as user_username, u.nickname as user_nickname, u.avatar_url as user_avatar, u.status as user_online_status,
                gm.role, gm.status as membership_status, gm.nickname_in_group, gm.joined_at
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            JOIN groups g ON gm.group_id = g.id
            WHERE gm.group_id = ? AND g.deleted_at IS NULL
        `;
        const params = [groupId];
        if (statusFilter) {
            if (Array.isArray(statusFilter)) {
                sql += ` AND gm.status IN (${statusFilter.map(() => '?').join(',')})`;
                params.push(...statusFilter);
            } else {
                sql += ` AND gm.status = ?`;
                params.push(statusFilter);
            }
        }
        sql += ` ORDER BY gm.role ASC, u.username ASC`; // Owners, then admins, then members

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error(`Error fetching members for group ${groupId}:`, err);
                return reject(err);
            }
            resolve(rows);
        });
    });
}

// Get group memberships for a user with specific status
async function getGroupMembersForUser(db, userId, statusFilter = 'active') {
    return new Promise((resolve, reject) => {
        let sql = `
            SELECT 
                gm.id, gm.group_id, g.name as group_name, g.avatar_url as group_avatar_url,
                gm.user_id, u.username as user_username, u.nickname as user_nickname,
                gm.role, gm.status, gm.nickname_in_group, 
                gm.joined_at, gm.created_at as membership_created_at, gm.updated_at as membership_updated_at,
                g.owner_id as group_owner_id, 
                owner.username as group_owner_username, owner.nickname as group_owner_nickname,
                inviter.id as inviter_id, inviter.username as inviter_username, inviter.nickname as inviter_nickname
            FROM group_members gm
            JOIN groups g ON gm.group_id = g.id
            JOIN users u ON gm.user_id = u.id
            LEFT JOIN users owner ON g.owner_id = owner.id
            LEFT JOIN users inviter ON gm.invited_by = inviter.id
            WHERE gm.user_id = ? AND g.deleted_at IS NULL
        `;
        const params = [userId];
        
        if (statusFilter) {
            if (Array.isArray(statusFilter)) {
                sql += ` AND gm.status IN (${statusFilter.map(() => '?').join(',')})`;
                params.push(...statusFilter);
            } else {
                sql += ` AND gm.status = ?`;
                params.push(statusFilter);
            }
        }
        
        sql += ` ORDER BY gm.created_at DESC`;

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error(`Error fetching group memberships for user ${userId}:`, err);
                return reject(err);
            }
            resolve(rows);
        });
    });
}

// Search for public groups by name or description
async function searchPublicGroups(db, searchQuery) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                g.id, g.name, g.description, g.avatar_url, g.group_type,
                g.owner_id, owner.username as owner_username, owner.nickname as owner_nickname,
                g.created_at, g.updated_at,
                (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id AND gm.status = 'active') as member_count
            FROM groups g
            LEFT JOIN users owner ON g.owner_id = owner.id
            WHERE g.deleted_at IS NULL 
              AND g.group_type IN ('public_readonly', 'public_joinable')
              AND (g.name LIKE ? OR g.description LIKE ?)
            ORDER BY 
                CASE 
                    WHEN g.name LIKE ? THEN 1 
                    WHEN g.description LIKE ? THEN 2 
                    ELSE 3 
                END,
                member_count DESC,
                g.name ASC
            LIMIT 50
        `;
        
        const searchPattern = `%${searchQuery}%`;
        const exactPattern = `%${searchQuery}%`;
        const params = [searchPattern, searchPattern, exactPattern, exactPattern];

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error searching public groups:', err);
                return reject(err);
            }
            resolve(rows);
        });
    });
}

module.exports = {
    createGroup,
    getGroupById,
    updateGroupDetails,
    softDeleteGroup,
    addGroupMember,
    getGroupMember,
    updateGroupMember,
    removeGroupMember,
    getGroupMembers,
    getGroupsForUser,
    getGroupMembersForUser,
    searchPublicGroups,
};