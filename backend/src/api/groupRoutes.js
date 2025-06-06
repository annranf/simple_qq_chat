// src/api/groupRoutes.js
const express = require('express');
const groupService = require('../services/groupService');
// const { authenticateToken } = require('../middleware/authMiddleware'); // Placeholder
const { authenticateToken } = require('../middleware/authMiddleware');
// Mock auth middleware for now
// const authenticateToken = (req, res, next) => {
//     const userId = parseInt(req.headers['x-user-id'] || req.query.userId);
//     req.user = userId ? { id: userId } : null;
//     next();
// };

module.exports = function(db) {
    const router = express.Router();    // Create a new group
    // POST /api/groups
    // Body: { name: "My Awesome Group", description: "...", group_type: "private" }
    router.post('/', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const ownerId = req.user.id;
        const { name, description, avatar_url, group_type } = req.body;
        console.log('Creating group with data:', { name, description, avatar_url, group_type, ownerId });
        try {
            const group = await groupService.createNewGroup(db, ownerId, { name, description, avatarUrl: avatar_url, groupType: group_type });
            res.status(201).json(group);
        } catch (error) {
            console.error("Error creating group:", error.message);
            if (error.message.includes("required") || error.message.includes("not found")) {
                return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    });

    // Get groups for the current user
    // GET /api/groups/mine
    router.get('/mine', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const userId = req.user.id;
        try {
            const groups = await groupService.listUserGroups(db, userId);
            res.status(200).json(groups);
        } catch (error) {
            next(error);
        }
    });
    
    // Get details for a specific group (including members)
    // GET /api/groups/:groupId
    router.get('/:groupId', authenticateToken, async (req, res, next) => {
        // req.user.id might be null if accessing a public group anonymously (TODO: handle based on groupType)
        const requestingUserId = req.user ? req.user.id : null; 
        const groupId = parseInt(req.params.groupId);
        if (isNaN(groupId)) return res.status(400).json({ message: "Invalid group ID." });

        try {
            // Pass requestingUserId for permission checks within the service
            const groupDetails = await groupService.getGroupDetailsWithMembers(db, groupId, requestingUserId);
            res.status(200).json(groupDetails);
        } catch (error) {
            console.error(`Error fetching group ${groupId} details:`, error.message);
            if (error.message.includes("not found") || error.message.includes("not an active member")) { // Example client errors
                return res.status(error.message.includes("not found") ? 404 : 403).json({ message: error.message });
            }
            next(error);
        }
    });

    // Invite a user to a group
    // POST /api/groups/:groupId/invite
    // Body: { username: "userToInvite" }
    router.post('/:groupId/invite', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const inviterId = req.user.id;
        const groupId = parseInt(req.params.groupId);
        const { username: inviteeUsername } = req.body;

        if (isNaN(groupId) || !inviteeUsername) {
            return res.status(400).json({ message: "Group ID and invitee username are required." });
        }
        try {
            const invitation = await groupService.inviteUserToGroup(db, inviterId, groupId, inviteeUsername);
            res.status(200).json({ message: "Invitation sent.", invitation });
        } catch (error) {
            console.error("Error inviting user to group:", error.message);
            if (error.message.includes("permission") || error.message.includes("not found") || error.message.includes("already")) {
                return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    });

    // Respond to a group invitation
    // POST /api/groups/:groupId/respond
    // Body: { response: "accepted" | "declined" }
    router.post('/:groupId/respond', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const userId = req.user.id; // The one responding
        const groupId = parseInt(req.params.groupId);
        const { response } = req.body;

        if (isNaN(groupId) || !response) {
            return res.status(400).json({ message: "Group ID and response are required." });
        }
        try {
            const result = await groupService.respondToGroupInvitation(db, userId, groupId, response);
            res.status(200).json({ message: `Invitation ${response}.`, result });
        } catch (error) {
            console.error("Error responding to group invitation:", error.message);
             if (error.message.includes("Invalid response") || error.message.includes("No pending invitation")) {
                return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    });

    // Leave a group
    // POST /api/groups/:groupId/leave
    router.post('/:groupId/leave', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const userId = req.user.id;
        const groupId = parseInt(req.params.groupId);
        if (isNaN(groupId)) return res.status(400).json({ message: "Invalid group ID." });

        try {
            const result = await groupService.leaveGroup(db, userId, groupId);
            res.status(200).json({ message: "Successfully left the group.", result });
        } catch (error) {
            console.error("Error leaving group:", error.message);
            if (error.message.includes("not an active member") || error.message.includes("Owner cannot leave")) {
                return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    });    // Get group members
    // GET /api/groups/:groupId/members
    router.get('/:groupId/members', authenticateToken, async (req, res, next) => {
        const requestingUserId = req.user ? req.user.id : null;
        const groupId = parseInt(req.params.groupId);
        if (isNaN(groupId)) return res.status(400).json({ message: "Invalid group ID." });

        try {
            // Check if requesting user is a member
            const group = await groupService.getGroupDetailsWithMembers(db, groupId, requestingUserId);
            if (!group) {
                return res.status(404).json({ message: "Group not found or access denied." });
            }
            
            // Return only the members array
            res.status(200).json(group.members || []);
        } catch (error) {
            console.error(`Error fetching members for group ${groupId}:`, error.message);
            if (error.message.includes("not found") || error.message.includes("not an active member")) {
                return res.status(error.message.includes("not found") ? 404 : 403).json({ message: error.message });
            }
            next(error);
        }
    });

    // Update group details (name, desc, avatar) (requires admin/owner)    // Update group details (name, desc, avatar) (requires admin/owner)
    // PUT /api/groups/:groupId
    router.put('/:groupId', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const userId = req.user.id;
        const groupId = parseInt(req.params.groupId);
        const { name, description, avatar_url, group_type } = req.body;

        if (isNaN(groupId)) return res.status(400).json({ message: "Invalid group ID." });

        try {
            const updatedGroup = await groupService.updateGroupDetails(db, userId, groupId, { name, description, avatarUrl: avatar_url, groupType: group_type });
            res.status(200).json(updatedGroup);
        } catch (error) {
            console.error(`Error updating group ${groupId}:`, error.message);
            if (error.message.includes("permission") || error.message.includes("not found")) {
                return res.status(error.message.includes("not found") ? 404 : 403).json({ message: error.message });
            }
            next(error);
        }
    });

    // Change member role (owner/admin)
    // PUT /api/groups/:groupId/members/:memberId/role
    router.put('/:groupId/members/:memberId/role', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const requesterId = req.user.id;
        const groupId = parseInt(req.params.groupId);
        const memberId = parseInt(req.params.memberId);
        const { role } = req.body;

        if (isNaN(groupId) || isNaN(memberId) || !role) {
            return res.status(400).json({ message: "Group ID, member ID, and role are required." });
        }

        try {
            const result = await groupService.updateMemberRole(db, requesterId, groupId, memberId, role);
            res.status(200).json({ message: "Member role updated successfully.", result });
        } catch (error) {
            console.error(`Error updating member role in group ${groupId}:`, error.message);
            if (error.message.includes("permission") || error.message.includes("not found")) {
                return res.status(error.message.includes("not found") ? 404 : 403).json({ message: error.message });
            }
            next(error);
        }
    });

    // Kick member (owner/admin)
    // DELETE /api/groups/:groupId/members/:memberId
    router.delete('/:groupId/members/:memberId', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const requesterId = req.user.id;
        const groupId = parseInt(req.params.groupId);
        const memberId = parseInt(req.params.memberId);

        if (isNaN(groupId) || isNaN(memberId)) {
            return res.status(400).json({ message: "Group ID and member ID are required." });
        }

        try {
            const result = await groupService.removeMember(db, requesterId, groupId, memberId);
            res.status(200).json({ message: "Member removed successfully.", result });
        } catch (error) {
            console.error(`Error removing member from group ${groupId}:`, error.message);
            if (error.message.includes("permission") || error.message.includes("not found")) {
                return res.status(error.message.includes("not found") ? 404 : 403).json({ message: error.message });
            }
            next(error);
        }
    });

    // Transfer ownership (owner only)
    // POST /api/groups/:groupId/transfer-ownership
    router.post('/:groupId/transfer-ownership', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const currentOwnerId = req.user.id;
        const groupId = parseInt(req.params.groupId);
        const { newOwnerId } = req.body;

        if (isNaN(groupId) || !newOwnerId) {
            return res.status(400).json({ message: "Group ID and new owner ID are required." });
        }

        try {
            const result = await groupService.transferOwnership(db, currentOwnerId, groupId, newOwnerId);
            res.status(200).json({ message: "Ownership transferred successfully.", result });
        } catch (error) {
            console.error(`Error transferring ownership of group ${groupId}:`, error.message);
            if (error.message.includes("permission") || error.message.includes("not found")) {
                return res.status(error.message.includes("not found") ? 404 : 403).json({ message: error.message });
            }
            next(error);
        }    });

    // Get pending group invitations for current user
    // GET /api/groups/invitations/pending
    router.get('/invitations/pending', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const userId = req.user.id;

        try {
            const invitations = await groupService.getPendingInvitations(db, userId);
            res.status(200).json(invitations);
        } catch (error) {
            console.error("Error fetching pending group invitations:", error.message);
            next(error);
        }
    });

    // Search public groups
    // GET /api/groups/search/public?q=searchQuery
    router.get('/search/public', authenticateToken, async (req, res, next) => {
        const { q: searchQuery } = req.query;
        const currentUserId = req.user ? req.user.id : null;

        if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length < 2) {
            return res.status(400).json({ message: "Search query must be at least 2 characters long." });
        }

        try {
            const publicGroups = await groupService.searchPublicGroups(db, searchQuery.trim(), currentUserId);
            res.status(200).json(publicGroups);
        } catch (error) {
            console.error("Error searching public groups:", error.message);
            next(error);
        }
    });

    return router;
};