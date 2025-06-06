// src/api/userRoutes.js
const express = require('express');
const userRepository = require('../repositories/userRepository');
const { authenticateToken } = require('../middleware/authMiddleware'); // For later when we have JWT auth

module.exports = function(db) { // Pass the db instance
    const router = express.Router();

    // GET /api/users - Get list of all users (excluding self if authenticated)
    // For now, no auth, just get all users
    router.get('/', authenticateToken,  async (req, res, next) => {
        try {
            // const currentUserId = req.user ? req.user.id : null; // If auth is implemented
            const users = await userRepository.getAllUsers(db /*, currentUserId */);
            res.json(users.map(u => ({ // Send only necessary fields
                id: u.id,
                username: u.username,
                nickname: u.nickname,
                avatarUrl: u.avatar_url, // Ensure field name matches frontend expectation
                status: u.status,
                lastSeenAt: u.last_seen_at
            })));        } catch (error) {
            console.error("Error in GET /api/users:", error);
            next(error); // Pass to error handling middleware
        }
    });
    
    // GET /api/users/search - Search users by username or nickname
    router.get('/search', authenticateToken, async (req, res, next) => {
        try {
            const { q } = req.query; // search query
            const currentUserId = req.user ? req.user.id : null;
            
            if (!q || q.trim().length === 0) {
                return res.status(400).json({ message: "Search query is required" });
            }
            
            const users = await userRepository.searchUsers(db, q.trim(), currentUserId);
            res.json(users.map(u => ({
                id: u.id,
                username: u.username,
                nickname: u.nickname,
                avatarUrl: u.avatar_url,
                status: u.status,
                lastSeenAt: u.last_seen_at
            })));
        } catch (error) {
            console.error("Error in GET /api/users/search:", error);
            next(error);
        }
    });
    
    // GET /api/users/me - Get current user's profile
    router.get('/me', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const user = await userRepository.findById(db, userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            
            res.json({
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                avatarUrl: user.avatar_url,
                status: user.status,
                lastSeenAt: user.last_seen_at,
                createdAt: user.created_at
            });
        } catch (error) {
            console.error("Error in GET /api/users/me:", error);
            next(error);
        }
    });
    
    // PUT /api/users/me - Update current user's profile
    router.put('/me', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { nickname, status, avatarUrl } = req.body;
            
            // 验证输入
            if (nickname && typeof nickname !== 'string') {
                return res.status(400).json({ message: "Nickname must be a string" });
            }
            if (status && !['online', 'away', 'busy', 'offline'].includes(status)) {
                return res.status(400).json({ message: "Invalid status value" });
            }
            if (avatarUrl && typeof avatarUrl !== 'string') {
                return res.status(400).json({ message: "Avatar URL must be a string" });
            }
            
            const updateData = {};
            if (nickname !== undefined) updateData.nickname = nickname;
            if (status !== undefined) updateData.status = status;
            if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;
            
            const updatedUser = await userRepository.updateUser(db, userId, updateData);
            
            res.json({
                id: updatedUser.id,
                username: updatedUser.username,
                nickname: updatedUser.nickname,
                avatarUrl: updatedUser.avatar_url,
                status: updatedUser.status,
                lastSeenAt: updatedUser.last_seen_at,
                createdAt: updatedUser.created_at
            });
        } catch (error) {
            console.error("Error in PUT /api/users/me:", error);
            next(error);
        }
    });
    
    // GET /api/users/:id - Get specific user profile (public info only)
    router.get('/:id', authenticateToken, async (req, res, next) => {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({ message: "Invalid user ID" });
            }
            
            const user = await userRepository.findById(db, userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            
            // 返回公开信息
            res.json({
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                avatarUrl: user.avatar_url,
                status: user.status,
                lastSeenAt: user.last_seen_at
            });
        } catch (error) {
            console.error("Error in GET /api/users/:id:", error);
            next(error);
        }
    });
    
    // POST /api/users/change-password - Change user password
    router.post('/change-password', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;
            
            // 验证输入
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ message: "Current password and new password are required" });
            }
            
            if (newPassword.length < 6) {
                return res.status(400).json({ message: "New password must be at least 6 characters long" });
            }
            
            // 验证当前密码
            const user = await userRepository.findByUsernameWithPassword(db, req.user.username);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            
            const passwordUtils = require('../utils/passwordUtils');
            const isCurrentPasswordValid = await passwordUtils.comparePassword(currentPassword, user.password_hash);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }
            
            // 哈希新密码
            const newPasswordHash = await passwordUtils.hashPassword(newPassword);
            
            // 更新密码
            await userRepository.changePassword(db, userId, newPasswordHash);
            
            res.json({ message: "Password changed successfully" });
        } catch (error) {
            console.error("Error in POST /api/users/change-password:", error);
            next(error);
        }
    });
    
    // GET /api/users/privacy-settings - Get user privacy settings
    router.get('/privacy-settings', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const privacySettings = await userRepository.getUserPrivacySettings(db, userId);
            res.json(privacySettings);
        } catch (error) {
            console.error("Error in GET /api/users/privacy-settings:", error);
            next(error);
        }
    });
    
    // PUT /api/users/privacy-settings - Update user privacy settings
    router.put('/privacy-settings', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const {
                online_status_visible,
                allow_friend_requests,
                allow_group_invites,
                allow_direct_messages,
                searchable_by_username,
                searchable_by_nickname
            } = req.body;
            
            // 验证输入（所有值都应该是boolean类型或undefined）
            const booleanFields = {
                online_status_visible,
                allow_friend_requests,
                allow_group_invites,
                allow_direct_messages,
                searchable_by_username,
                searchable_by_nickname
            };
            
            for (const [key, value] of Object.entries(booleanFields)) {
                if (value !== undefined && typeof value !== 'boolean') {
                    return res.status(400).json({ 
                        message: `${key} must be a boolean value` 
                    });
                }
            }
            
            const updatedSettings = await userRepository.updateUserPrivacySettings(db, userId, booleanFields);
            res.json(updatedSettings);
        } catch (error) {
            console.error("Error in PUT /api/users/privacy-settings:", error);
            next(error);
        }
    });
    
    // GET /api/users/settings - Get all user settings (general + privacy)
    router.get('/settings', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const settings = await userRepository.getUserSettings(db, userId);
            res.json(settings);
        } catch (error) {
            console.error("Error in GET /api/users/settings:", error);
            next(error);
        }
    });
    
    // POST /api/users/force-logout-all - Force logout from all devices (security feature)
    router.post('/force-logout-all', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id;
            
            // In a real application, you would invalidate all JWT tokens for this user
            // This could be done by:
            // 1. Maintaining a blacklist of tokens
            // 2. Changing the user's JWT secret
            // 3. Using token versioning
            // For now, we'll just return a success message
            
            // You could also update user's last_logout_at timestamp or similar
            // to invalidate tokens issued before this time
            
            res.json({ 
                message: "All sessions have been terminated. Please log in again.",
                action_required: "re_login"
            });
        } catch (error) {
            console.error("Error in POST /api/users/force-logout-all:", error);
            next(error);
        }
    });
    
    // DELETE /api/users/account - Delete user account (dangerous operation)
    router.delete('/account', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { confirmPassword } = req.body;
            
            if (!confirmPassword) {
                return res.status(400).json({ message: "Password confirmation is required" });
            }
            
            // 验证密码
            const user = await userRepository.findByUsernameWithPassword(db, req.user.username);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            
            const passwordUtils = require('../utils/passwordUtils');
            const isPasswordValid = await passwordUtils.comparePassword(confirmPassword, user.password_hash);
            if (!isPasswordValid) {
                return res.status(400).json({ message: "Password is incorrect" });
            }
            
            // In a real application, you would:
            // 1. Soft delete the user (set deleted_at timestamp)
            // 2. Anonymize user data
            // 3. Remove from groups
            // 4. Delete messages or mark as from "deleted user"
            // For now, we'll implement a simple soft delete
            
            await userRepository.updateUser(db, userId, {
                status: 'offline',
                deleted_at: new Date().toISOString()
            });
            
            res.json({ 
                message: "Account has been scheduled for deletion",
                action_required: "logout"
            });
        } catch (error) {
            console.error("Error in DELETE /api/users/account:", error);
            next(error);
        }    });

    // POST /api/users/change-password - Change user password
    router.post('/change-password', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;
            
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ message: "Current password and new password are required" });
            }
            
            if (newPassword.length < 6) {
                return res.status(400).json({ message: "New password must be at least 6 characters long" });
            }
            
            // 验证当前密码
            const userWithPassword = await userRepository.findByUsernameWithPassword(db, req.user.username);
            if (!userWithPassword) {
                return res.status(404).json({ message: "User not found" });
            }
            
            const { comparePassword } = require('../utils/passwordUtils');
            const isCurrentPasswordValid = await comparePassword(currentPassword, userWithPassword.password_hash);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }
            
            // 哈希新密码
            const { hashPassword } = require('../utils/passwordUtils');
            const newPasswordHash = await hashPassword(newPassword);
            
            // 更新密码
            await userRepository.updatePassword(db, userId, newPasswordHash);
            
            res.json({ message: "Password changed successfully" });
        } catch (error) {
            console.error("Error in POST /api/users/change-password:", error);
            next(error);
        }
    });

    // GET /api/users/settings - Get user settings including privacy settings
    router.get('/settings', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const userSettingsRepository = require('../repositories/userSettingsRepository');
            
            const settings = await userSettingsRepository.getOrCreateSettings(db, userId);
            
            res.json({
                notifications_enabled: Boolean(settings.notifications_enabled),
                theme: settings.theme || 'light',
                profile_visibility: settings.profile_visibility || 'public',
                last_seen_visibility: settings.last_seen_visibility || 'everyone',
                status_visibility: settings.status_visibility || 'everyone',
                allow_friend_requests: Boolean(settings.allow_friend_requests)
            });
        } catch (error) {
            console.error("Error in GET /api/users/settings:", error);
            next(error);
        }
    });

    // PUT /api/users/settings - Update user settings including privacy settings
    router.put('/settings', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { 
                notifications_enabled, 
                theme, 
                profile_visibility, 
                last_seen_visibility, 
                status_visibility, 
                allow_friend_requests 
            } = req.body;
            
            // 验证输入
            if (theme && !['light', 'dark'].includes(theme)) {
                return res.status(400).json({ message: "Invalid theme value" });
            }
            if (profile_visibility && !['public', 'friends', 'private'].includes(profile_visibility)) {
                return res.status(400).json({ message: "Invalid profile visibility value" });
            }
            if (last_seen_visibility && !['everyone', 'friends', 'nobody'].includes(last_seen_visibility)) {
                return res.status(400).json({ message: "Invalid last seen visibility value" });
            }
            if (status_visibility && !['everyone', 'friends', 'nobody'].includes(status_visibility)) {
                return res.status(400).json({ message: "Invalid status visibility value" });
            }
            
            const userSettingsRepository = require('../repositories/userSettingsRepository');
            
            const updateData = {};
            if (notifications_enabled !== undefined) updateData.notifications_enabled = notifications_enabled;
            if (theme !== undefined) updateData.theme = theme;
            if (profile_visibility !== undefined) updateData.profile_visibility = profile_visibility;
            if (last_seen_visibility !== undefined) updateData.last_seen_visibility = last_seen_visibility;
            if (status_visibility !== undefined) updateData.status_visibility = status_visibility;
            if (allow_friend_requests !== undefined) updateData.allow_friend_requests = allow_friend_requests;
            
            const updatedSettings = await userSettingsRepository.updateSettings(db, userId, updateData);
            
            res.json({
                notifications_enabled: Boolean(updatedSettings.notifications_enabled),
                theme: updatedSettings.theme || 'light',
                profile_visibility: updatedSettings.profile_visibility || 'public',
                last_seen_visibility: updatedSettings.last_seen_visibility || 'everyone',
                status_visibility: updatedSettings.status_visibility || 'everyone',
                allow_friend_requests: Boolean(updatedSettings.allow_friend_requests)
            });
        } catch (error) {
            console.error("Error in PUT /api/users/settings:", error);
            next(error);
        }
    });

    return router;
};