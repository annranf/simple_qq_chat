// src/services/friendshipService.js
const friendshipRepository = require('../repositories/friendshipRepository');
const userRepository = require('../repositories/userRepository'); // To check if users exist
const { getOrderedUserIds } = require('../utils/friendshipUtils');
// We'll need a way to send WebSocket notifications from here.
// This could be done by passing 'activeConnections' and a 'sendMessageToUser' helper,
// or by emitting events that a WebSocket notification module listens to.
// For now, let's assume we have access to a simplified 'notificationManager'.

// Placeholder for notification logic (would be more robust)
const { activeConnections } = require('../websocket/connectionManager'); // Direct import for simplicity
const { sendWsMessageToUser } = require('../utils/notificationUtils'); // We'll create this small utility

async function sendFriendRequest(db, requesterId, recipientUsername) {
    const requester = await userRepository.findById(db, requesterId);
    if (!requester) throw new Error('Requester not found.');

    const recipient = await userRepository.findByUsername(db, recipientUsername);
    if (!recipient) throw new Error('Recipient user not found.');
    if (requesterId === recipient.id) throw new Error('Cannot send friend request to oneself.');

    const { user1_id, user2_id } = getOrderedUserIds(requesterId, recipient.id);

    const existingFriendship = await friendshipRepository.findFriendshipByIds(db, user1_id, user2_id);

    if (existingFriendship) {
        if (existingFriendship.status === 'accepted') {
            throw new Error('You are already friends with this user.');
        }
        if (existingFriendship.status === 'pending' && existingFriendship.action_user_id === requesterId) {
            throw new Error('Friend request already sent.');
        }
        if (existingFriendship.status === 'pending' && existingFriendship.action_user_id === recipient.id) {
            throw new Error('This user has already sent you a friend request. Please respond to it.');
        }
        if (existingFriendship.status === 'blocked') {
            if (existingFriendship.action_user_id === requesterId) {
                throw new Error('You have blocked this user. Unblock them to send a request.');
            } else {
                throw new Error('This user has blocked you.');
            }
        }
        // If status is 'declined', we might allow a new request.
        // The repository's createFriendship might need to handle this or we delete and recreate.
        // For simplicity now, if 'declined', let's allow overwriting with a new 'pending'
        if (existingFriendship.status === 'declined') {
             // We can update status or delete and recreate. Update is cleaner if record exists.
            const updated = await friendshipRepository.updateFriendshipStatus(db, user1_id, user2_id, 'pending', requesterId);
            // Notify recipient
            sendWsMessageToUser(activeConnections, recipient.id, {
                type: 'FRIEND_REQUEST_RECEIVED',
                payload: {
                    id: updated.id, // Friendship ID
                    fromUser: { id: requester.id, username: requester.username, nickname: requester.nickname, avatarUrl: requester.avatar_url },
                    status: 'pending',
                    createdAt: updated.created_at,
                }
            });
            return updated;
        }
    }

    // If no conflicting existing friendship, create a new one
    const newFriendship = await friendshipRepository.createFriendship(db, requesterId, recipient.id, 'pending');

    // Notify recipient
    sendWsMessageToUser(activeConnections, recipient.id, {
        type: 'FRIEND_REQUEST_RECEIVED',
        payload: {
            id: newFriendship.id, // Friendship ID
            fromUser: { id: requester.id, username: requester.username, nickname: requester.nickname, avatarUrl: requester.avatar_url },
            status: 'pending',
            createdAt: newFriendship.created_at,
        }
    });
    return newFriendship;
}

async function respondToFriendRequest(db, responderId, requesterId, responseStatus) { // responseStatus: 'accepted' or 'declined'
    if (responseStatus !== 'accepted' && responseStatus !== 'declined') {
        throw new Error("Invalid response status. Must be 'accepted' or 'declined'.");
    }

    const responder = await userRepository.findById(db, responderId);
    if (!responder) throw new Error('Responder not found.');
    const requester = await userRepository.findById(db, requesterId);
    if (!requester) throw new Error('Requester not found.');


    const { user1_id, user2_id } = getOrderedUserIds(responderId, requesterId);
    const friendship = await friendshipRepository.findFriendshipByIds(db, user1_id, user2_id);

    if (!friendship || friendship.status !== 'pending') {
        throw new Error('No pending friend request found from this user or request already actioned.');
    }
    // Ensure the action_user_id (original sender of 'pending' request) is the 'requesterId' argument.
    if (friendship.action_user_id !== requesterId) {
        throw new Error('This request was not initiated by the specified requester, or you are not the recipient.');
    }


    const updatedFriendship = await friendshipRepository.updateFriendshipStatus(db, user1_id, user2_id, responseStatus, responderId);

    // Notify the original requester about the response
    const notificationType = responseStatus === 'accepted' ? 'FRIEND_REQUEST_ACCEPTED' : 'FRIEND_REQUEST_DECLINED';
    sendWsMessageToUser(activeConnections, requesterId, {
        type: notificationType,
        payload: {
            id: updatedFriendship.id,
            byUser: { id: responder.id, username: responder.username, nickname: responder.nickname, avatarUrl: responder.avatar_url },
            status: responseStatus,
            updatedAt: updatedFriendship.updated_at,
        }
    });
    return updatedFriendship;
}

async function removeFriend(db, removerId, friendToRemoveId) {
    const { user1_id, user2_id } = getOrderedUserIds(removerId, friendToRemoveId);
    const friendship = await friendshipRepository.findFriendshipByIds(db, user1_id, user2_id);

    if (!friendship || friendship.status !== 'accepted') {
        // Or allow removing 'pending' or 'declined' records too if desired.
        // For now, only allow removing 'accepted' friends.
        throw new Error('Not currently friends with this user or no friendship record exists.');
    }

    const result = await friendshipRepository.deleteFriendship(db, user1_id, user2_id);
    if (result.deleted) {
        // Notify the (now ex-)friend
        sendWsMessageToUser(activeConnections, friendToRemoveId, {
            type: 'FRIEND_REMOVED',
            payload: {
                byUser: { id: removerId }, // Send minimal info
            }
        });
    }
    return result;
}

async function blockUser(db, blockerId, userToBlockId) {
    const blocker = await userRepository.findById(db, blockerId);
    if(!blocker) throw new Error("Blocker not found.");
    const userToBlock = await userRepository.findById(db, userToBlockId);
    if(!userToBlock) throw new Error("User to block not found.");
    if(blockerId === userToBlockId) throw new Error("Cannot block oneself.");

    const { user1_id, user2_id } = getOrderedUserIds(blockerId, userToBlockId);
    const existingFriendship = await friendshipRepository.findFriendshipByIds(db, user1_id, user2_id);

    let blockedFriendship;
    if (existingFriendship) {
        // If userToBlockId already blocked blockerId, blockerId cannot override that block.
        if (existingFriendship.status === 'blocked' && existingFriendship.action_user_id === userToBlockId) {
            throw new Error("You are already blocked by this user.");
        }
        blockedFriendship = await friendshipRepository.updateFriendshipStatus(db, user1_id, user2_id, 'blocked', blockerId);
    } else {
        blockedFriendship = await friendshipRepository.createFriendship(db, blockerId, userToBlockId, 'blocked');
    }
    // Note: Typically, no notification is sent to the user who was blocked for privacy reasons.
    return blockedFriendship;
}

async function unblockUser(db, unblockerId, userToUnblockId) {
    const { user1_id, user2_id } = getOrderedUserIds(unblockerId, userToUnblockId);
    const friendship = await friendshipRepository.findFriendshipByIds(db, user1_id, user2_id);

    if (!friendship || friendship.status !== 'blocked') {
        throw new Error('User is not blocked or no record exists.');
    }
    // Only the user who initiated the block can unblock.
    if (friendship.action_user_id !== unblockerId) {
        throw new Error('You did not initiate this block and cannot remove it.');
    }

    // Unblocking deletes the record. They are no longer friends (if they were).
    const result = await friendshipRepository.deleteFriendship(db, user1_id, user2_id);
    return result;
}

async function listFriends(db, userId, status = 'accepted') { // Default to listing accepted friends
    return friendshipRepository.getFriendshipsForUser(db, userId, status);
}

async function listPendingRequests(db, userId) {
    // Pending requests where the action_user_id is NOT the current userId (i.e., requests sent TO current userId)
    const friendships = await friendshipRepository.getFriendshipsForUser(db, userId, 'pending');
    return friendships.filter(f => f.action_user_id !== userId);
}

async function listSentRequests(db, userId) {
    // Pending requests where the action_user_id IS the current userId (i.e., requests sent BY current userId)
    const friendships = await friendshipRepository.getFriendshipsForUser(db, userId, 'pending');
    return friendships.filter(f => f.action_user_id === userId);
}

async function acceptFriendRequestByUsername(db, responderId, requesterUsername) {
    const requester = await userRepository.findByUsername(db, requesterUsername);
    if (!requester) throw new Error('Requester user not found.');
    
    return await respondToFriendRequest(db, responderId, requester.id, 'accepted');
}

async function declineFriendRequestByUsername(db, responderId, requesterUsername) {
    const requester = await userRepository.findByUsername(db, requesterUsername);
    if (!requester) throw new Error('Requester user not found.');
    
    return await respondToFriendRequest(db, responderId, requester.id, 'declined');
}

module.exports = {
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    listFriends,
    listPendingRequests,
    listSentRequests,
    acceptFriendRequestByUsername,
    declineFriendRequestByUsername,
};