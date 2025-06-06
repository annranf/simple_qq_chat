// src/api/friendshipRoutes.js
const express = require('express');
const friendshipService = require('../services/friendshipService');
// const { authenticateToken } = require('../middleware/authMiddleware'); // Placeholder
const { authenticateToken } = require('../middleware/authMiddleware');

// // Mock auth middleware for now
// const authenticateToken = (req, res, next) => {
//     // In a real app, this would validate a JWT and set req.user
//     // For testing, we can set req.user based on a header or query param
//     const userId = parseInt(req.headers['x-user-id'] || req.query.userId);
//     if (!userId) {
//         // return res.status(401).json({ message: "Unauthorized: Missing x-user-id header or userId query param for testing." });
//         // For simpler initial testing, let's allow some unauthed access to list functions or hardcode a user
//         // For actions, it's better to enforce.
//         // Let's assume for actions, it must be present.
//     }
//     req.user = { id: userId }; // Example: { id: 1, username: 'testuser' }
//     next();
// };


module.exports = function(db) {
    const router = express.Router();

    // Send a friend request
    // POST /api/friendships/request
    // Body: { recipientUsername: "someuser" }
    router.post('/request', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const requesterId = req.user.id;
        const { recipientUsername } = req.body;
        if (!recipientUsername) {
            return res.status(400).json({ message: "Recipient username is required." });
        }
        try {
            const friendship = await friendshipService.sendFriendRequest(db, requesterId, recipientUsername);
            res.status(201).json({ message: "Friend request sent.", friendship });
        } catch (error) {
            console.error("Error sending friend request:", error.message);
            // Distinguish client errors from server errors
            if (error.message.includes("not found") || error.message.includes("already friends") || error.message.includes("already sent") || error.message.includes("oneself") || error.message.includes("blocked")) {
                return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    });    // Respond to a friend request
    // POST /api/friendships/respond
    // Body: { requesterId: 123, response: "accepted" | "declined" }
    router.post('/respond', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const responderId = req.user.id;
        const { requesterId, response } = req.body; // response is 'accepted' or 'declined'
        if (typeof requesterId !== 'number' || !response) {
            return res.status(400).json({ message: "Requester ID and response are required." });
        }
        try {
            const friendship = await friendshipService.respondToFriendRequest(db, responderId, requesterId, response);
            res.status(200).json({ message: `Friend request ${response}.`, friendship });
        } catch (error) {
             console.error("Error responding to friend request:", error.message);
            if (error.message.includes("not found") || error.message.includes("Invalid response") || error.message.includes("No pending")) {
                return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    });

    // Accept a friend request by username
    // POST /api/friendships/accept
    // Body: { requesterUsername: "someuser" }
    router.post('/accept', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const responderId = req.user.id;
        const { requesterUsername } = req.body;
        if (!requesterUsername) {
            return res.status(400).json({ message: "Requester username is required." });
        }
        try {
            const friendship = await friendshipService.acceptFriendRequestByUsername(db, responderId, requesterUsername);
            res.status(200).json({ message: "Friend request accepted.", friendship });
        } catch (error) {
            console.error("Error accepting friend request:", error.message);
            if (error.message.includes("not found") || error.message.includes("No pending")) {
                return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    });

    // Decline a friend request by username
    // POST /api/friendships/decline
    // Body: { requesterUsername: "someuser" }
    router.post('/decline', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const responderId = req.user.id;
        const { requesterUsername } = req.body;
        if (!requesterUsername) {
            return res.status(400).json({ message: "Requester username is required." });
        }
        try {
            const friendship = await friendshipService.declineFriendRequestByUsername(db, responderId, requesterUsername);
            res.status(200).json({ message: "Friend request declined.", friendship });
        } catch (error) {
            console.error("Error declining friend request:", error.message);
            if (error.message.includes("not found") || error.message.includes("No pending")) {
                return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    });

    // Remove a friend (unfriend)
    // DELETE /api/friendships/remove/:friendId
    router.delete('/remove/:friendId', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const removerId = req.user.id;
        const friendToRemoveId = parseInt(req.params.friendId);
        if (isNaN(friendToRemoveId)) {
            return res.status(400).json({ message: "Valid friend ID is required." });
        }
        try {
            const result = await friendshipService.removeFriend(db, removerId, friendToRemoveId);
            if (result.deleted) {
                res.status(200).json({ message: "Friend removed successfully." });
            } else {
                res.status(404).json({ message: "Friendship not found or not removed." });
            }
        } catch (error) {
            console.error("Error removing friend:", error.message);
            if (error.message.includes("Not currently friends")) {
                 return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    });

    // Block a user
    // POST /api/friendships/block
    // Body: { userIdToBlock: 123 }
    router.post('/block', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const blockerId = req.user.id;
        const { userIdToBlock } = req.body;
        if (typeof userIdToBlock !== 'number') {
            return res.status(400).json({ message: "User ID to block is required." });
        }
        try {
            const friendship = await friendshipService.blockUser(db, blockerId, userIdToBlock);
            res.status(200).json({ message: "User blocked successfully.", friendship });
        } catch (error)
         {
            console.error("Error blocking user:", error.message);
            if (error.message.includes("not found") || error.message.includes("oneself") || error.message.includes("already blocked")) {
                 return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    });

    // Unblock a user
    // POST /api/friendships/unblock
    // Body: { userIdToUnblock: 123 }
    router.post('/unblock', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const unblockerId = req.user.id;
        const { userIdToUnblock } = req.body;
         if (typeof userIdToUnblock !== 'number') {
            return res.status(400).json({ message: "User ID to unblock is required." });
        }
        try {
            const result = await friendshipService.unblockUser(db, unblockerId, userIdToUnblock);
            if (result.deleted) {
                res.status(200).json({ message: "User unblocked successfully." });
            } else {
                res.status(404).json({ message: "Blocked record not found or not removed." });
            }
        } catch (error) {
            console.error("Error unblocking user:", error.message);
             if (error.message.includes("not blocked") || error.message.includes("did not initiate")) {
                 return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    });    // List friends or friendships for the current user
    // GET /api/friendships - accepted friends (default)
    // GET /api/friendships?status=pending - pending requests
    // GET /api/friendships?status=accepted - accepted friends
    router.get('/', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const userId = req.user.id;
        const status = req.query.status || 'accepted'; // 默认获取已接受的好友
        try {
            const friendships = await friendshipService.listFriends(db, userId, status);
            res.status(200).json(friendships);
        } catch (error) {
            next(error);
        }
    });

    // List pending friend requests received by the current user
    // GET /api/friendships/requests/pending
    router.get('/requests/pending', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const userId = req.user.id;
        try {
            const requests = await friendshipService.listPendingRequests(db, userId);
            res.status(200).json(requests);
        } catch (error) {
            next(error);
        }
    });
    
    // List pending friend requests sent by the current user
    // GET /api/friendships/requests/sent
    router.get('/requests/sent', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const userId = req.user.id;
        try {
            const requests = await friendshipService.listSentRequests(db, userId);
            res.status(200).json(requests);
        } catch (error) {
            next(error);
        }
    });
    
    // GET /api/friendships/blocked - List users blocked by current user
    router.get('/blocked', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID missing." });
        const userId = req.user.id;
        try {
            const blockedUsersList = await friendshipRepository.getFriendshipsForUser(db, userId, 'blocked');
            // Filter to show only those where the current user was the action_user_id for the 'blocked' status
            const usersBlockedByMe = blockedUsersList.filter(f => f.action_user_id === userId);
            res.status(200).json(usersBlockedByMe);
        } catch (error) {
            next(error);
        }
    });


    return router;
};