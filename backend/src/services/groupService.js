// src/services/groupService.js
const crypto = require('crypto'); // For invite link tokens
const groupRepository = require('../repositories/groupRepository');
const userRepository = require('../repositories/userRepository');
const { activeConnections } = require('../websocket/connectionManager');
const { sendWsMessageToUser } = require('../utils/notificationUtils');


async function createNewGroup(db, ownerId, { name, description, avatarUrl, groupType = 'private' }) {
    if (!name) throw new Error("Group name is required.");
    const owner = await userRepository.findById(db, ownerId);
    if (!owner) throw new Error("Owner user not found.");

    let inviteLinkToken = null;
    if (groupType === 'public_joinable') {
        inviteLinkToken = crypto.randomBytes(16).toString('hex');
    }

    const group = await groupRepository.createGroup(db, { name, description, avatarUrl, ownerId, groupType, inviteLinkToken });
    if (!group) throw new Error("Failed to create group.");

    // Add owner as the first member with 'owner' role
    const member = await groupRepository.addGroupMember(db, {
        groupId: group.id,
        userId: ownerId,
        role: 'owner',
        status: 'active'
    });

    // Notify owner (optional, as they initiated)
    sendWsMessageToUser(activeConnections, ownerId, {
        type: 'GROUP_CREATED',
        payload: { ...group, members: [member] } // Send initial group info
    });

    return { ...group, initialMember: member };
}

async function inviteUserToGroup(db, inviterId, groupId, inviteeUsername) {
    const inviterMembership = await groupRepository.getGroupMember(db, groupId, inviterId);
    // Basic permission check: only owner or admin can invite (can be more granular)
    if (!inviterMembership || !['owner', 'admin'].includes(inviterMembership.role) || inviterMembership.status !== 'active') {
        throw new Error("You do not have permission to invite users to this group or are not an active member.");
    }

    const group = await groupRepository.getGroupById(db, groupId);
    if (!group) throw new Error("Group not found.");

    const invitee = await userRepository.findByUsername(db, inviteeUsername);
    if (!invitee) throw new Error("User to invite not found.");

    const existingInviteeMembership = await groupRepository.getGroupMember(db, groupId, invitee.id);
    if (existingInviteeMembership) {
        if (existingInviteeMembership.status === 'active') throw new Error("User is already an active member of this group.");
        if (existingInviteeMembership.status === 'invited') throw new Error("User has already been invited to this group.");
        if (existingInviteeMembership.status === 'banned') throw new Error("User is banned from this group.");
        // If 'left' or 'kicked', allow re-invite by updating their status to 'invited'
    }

    // Add/update member record with 'invited' status
    const invitedMember = await groupRepository.addGroupMember(db, {
        groupId: group.id,
        userId: invitee.id,
        role: 'member', // Default role for invitees
        status: 'invited'
    });

    // Notify invitee
    sendWsMessageToUser(activeConnections, invitee.id, {
        type: 'GROUP_INVITATION_RECEIVED',
        payload: {
            groupId: group.id,
            groupName: group.name,
            groupAvatarUrl: group.avatar_url,
            invitedBy: { id: inviterId, username: inviterMembership.user_username, nickname: inviterMembership.user_nickname },
            membershipId: invitedMember.id
        }
    });

    // Notify inviter (confirmation)
    sendWsMessageToUser(activeConnections, inviterId, {
        type: 'GROUP_INVITATION_SENT',
        payload: {
            groupId: group.id,
            groupName: group.name,
            invitedUser: { id: invitee.id, username: invitee.username },
        }
    });

    return invitedMember;
}

async function respondToGroupInvitation(db, userId, groupId, response) { // response: 'accepted' or 'declined'
    if (response !== 'accepted' && response !== 'declined') {
        throw new Error("Invalid response. Must be 'accepted' or 'declined'.");
    }

    const membership = await groupRepository.getGroupMember(db, groupId, userId);
    if (!membership || membership.status !== 'invited') {
        throw new Error("No pending invitation found for this group or already actioned.");
    }

    const group = await groupRepository.getGroupById(db, groupId); // For notification details

    let updatedMembership;
    if (response === 'accepted') {
        updatedMembership = await groupRepository.updateGroupMember(db, groupId, userId, { status: 'active', role: membership.role }); // Keep role assigned during invite
        // Notify other group members (especially owner/admins)
        const groupOwnerId = group.owner_id;
        if (groupOwnerId && groupOwnerId !== userId) { // Don't notify self
             sendWsMessageToUser(activeConnections, groupOwnerId, {
                type: 'USER_JOINED_GROUP',
                payload: {
                    groupId: group.id,
                    groupName: group.name,
                    user: { id: userId, username: membership.user_username, nickname: membership.user_nickname },
                }
            });
        }
        // TODO: Notify all *active* members? Or just admins/owner?
    } else { // Declined
        // Option 1: Update status to 'declined' (keeps record)
        // updatedMembership = await groupRepository.updateGroupMember(db, groupId, userId, { status: 'declined' });
        // Option 2: Delete the 'invited' record (cleaner if no history needed for declined invites)
        await groupRepository.removeGroupMember(db, groupId, userId); // This hard deletes
        updatedMembership = { ...membership, status: 'declined', deleted: true }; // Mock for return
    }
    
    // Notify user who responded
    sendWsMessageToUser(activeConnections, userId, {
        type: 'GROUP_INVITATION_RESPONDED',
        payload: {
            groupId: group.id,
            groupName: group.name,
            response: response,
            ...(response === 'accepted' && updatedMembership) // include membership details if accepted
        }
    });

    return updatedMembership;
}

async function leaveGroup(db, userId, groupId) {
    const membership = await groupRepository.getGroupMember(db, groupId, userId);
    if (!membership || membership.status !== 'active') { // Only active members can leave
        throw new Error("You are not an active member of this group or membership not found.");
    }

    const group = await groupRepository.getGroupById(db, groupId);

    if (membership.role === 'owner' && group.owner_id === userId) {
        // Owner leaving is complex:
        // 1. Must transfer ownership first (if other members exist and are admins/members)
        // 2. Or, if last member, group might be deleted.
        // For now, prevent owner from leaving directly without transfer/delete logic.
        const activeMembers = await groupRepository.getGroupMembers(db, groupId, 'active');
        if(activeMembers.length > 1) {
            throw new Error("Owner cannot leave the group directly. Transfer ownership or delete the group.");
        }
        // If owner is the last member, deleting the group might be an option.
        // For now, we'll just update status to 'left'.
    }

    // Update status to 'left' instead of hard delete, to keep history.
    const updatedMembership = await groupRepository.updateGroupMember(db, groupId, userId, { status: 'left' });

    // Notify owner/admins or other members
    if (group.owner_id && group.owner_id !== userId) {
        sendWsMessageToUser(activeConnections, group.owner_id, {
            type: 'USER_LEFT_GROUP',
            payload: {
                groupId: group.id,
                groupName: group.name,
                user: { id: userId, username: membership.user_username },
            }
        });
    }
    // TODO: Notify all active members?

    return updatedMembership;
}

async function getGroupDetailsWithMembers(db, groupId, requestingUserId) {
    const group = await groupRepository.getGroupById(db, groupId);
    if (!group) throw new Error("Group not found.");

    // Check if requesting user is a member (for private groups) - can be enhanced for public groups
    const requesterMembership = await groupRepository.getGroupMember(db, groupId, requestingUserId);
    if (group.group_type === 'private' && (!requesterMembership || requesterMembership.status !== 'active')) {
        // For public_readonly or public_joinable, non-members might still see details
        // This check needs refinement based on group_type
        // throw new Error("You are not an active member of this private group.");
    }
    
    const members = await groupRepository.getGroupMembers(db, groupId, ['active', 'invited']); // Show active and invited members
    return { ...group, members };
}

async function listUserGroups(db, userId) {
    return groupRepository.getGroupsForUser(db, userId, 'active');
}

// Get pending group invitations for a user
async function getPendingInvitations(db, userId) {
    try {
        // Get all group memberships where user has 'invited' status
        const pendingMemberships = await groupRepository.getGroupMembersForUser(db, userId, 'invited');
        
        if (!pendingMemberships || pendingMemberships.length === 0) {
            return [];
        }

        // Transform the data to match the expected format for the frontend
        const invitations = pendingMemberships.map(membership => ({
            membershipId: membership.id,
            groupId: membership.group_id,
            groupName: membership.group_name,
            groupAvatarUrl: membership.group_avatar_url,
            invitedBy: {
                id: membership.inviter_id,
                username: membership.inviter_username,
                nickname: membership.inviter_nickname
            },
            createdAt: membership.membership_created_at
        }));

        return invitations;
    } catch (error) {
        console.error('Error fetching pending invitations:', error);
        throw new Error('Failed to fetch pending group invitations');
    }
}

// Search for public groups
async function searchPublicGroups(db, searchQuery, currentUserId = null) {
    try {
        // Search for public groups by name or description
        const publicGroups = await groupRepository.searchPublicGroups(db, searchQuery);
        
        if (!publicGroups || publicGroups.length === 0) {
            return [];
        }

        // Add membership status for current user if provided
        const enrichedGroups = [];
        for (const group of publicGroups) {
            let userMembership = null;
            if (currentUserId) {
                userMembership = await groupRepository.getGroupMember(db, group.id, currentUserId);
            }

            enrichedGroups.push({
                ...group,
                userMembershipStatus: userMembership ? userMembership.status : null,
                userRole: userMembership ? userMembership.role : null
            });
        }

        return enrichedGroups;
    } catch (error) {
        console.error('Error searching public groups:', error);
        throw new Error('Failed to search public groups');
    }
}

// Update group details (name, description, avatar, type) - admin/owner only
async function updateGroupDetails(db, requesterId, groupId, { name, description, avatarUrl, groupType }) {
    // Check if requester has permission (owner or admin)
    const requesterMembership = await groupRepository.getGroupMember(db, groupId, requesterId);
    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role) || requesterMembership.status !== 'active') {
        throw new Error("You do not have permission to update this group or are not an active member.");
    }

    const group = await groupRepository.getGroupById(db, groupId);
    if (!group) throw new Error("Group not found.");

    // Update group details
    const updatedGroup = await groupRepository.updateGroupDetails(db, groupId, { name, description, avatarUrl, groupType });
    
    // Notify group members about the update
    const members = await groupRepository.getGroupMembers(db, groupId, 'active');
    members.forEach(member => {
        if (member.user_id !== requesterId) { // Don't notify the person who made the change
            sendWsMessageToUser(activeConnections, member.user_id, {
                type: 'GROUP_UPDATED',
                payload: {
                    groupId: updatedGroup.id,
                    groupName: updatedGroup.name,
                    updatedBy: { id: requesterId, username: requesterMembership.user_username },
                    changes: { name, description, avatarUrl, groupType }
                }
            });
        }
    });

    return updatedGroup;
}

// Update member role - owner/admin only
async function updateMemberRole(db, requesterId, groupId, memberId, newRole) {
    if (!['member', 'admin', 'owner'].includes(newRole)) {
        throw new Error("Invalid role. Must be 'member', 'admin', or 'owner'.");
    }

    // Check if requester has permission
    const requesterMembership = await groupRepository.getGroupMember(db, groupId, requesterId);
    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role) || requesterMembership.status !== 'active') {
        throw new Error("You do not have permission to update member roles in this group.");
    }

    // Check target member exists
    const targetMembership = await groupRepository.getGroupMember(db, groupId, memberId);
    if (!targetMembership || targetMembership.status !== 'active') {
        throw new Error("Target member not found or not active in this group.");
    }

    // Prevent non-owners from promoting to owner or demoting owners
    if (requesterMembership.role !== 'owner' && (newRole === 'owner' || targetMembership.role === 'owner')) {
        throw new Error("Only the group owner can change ownership or modify owner permissions.");
    }

    // Prevent self-demotion if owner (must transfer ownership first)
    if (requesterId === memberId && requesterMembership.role === 'owner' && newRole !== 'owner') {
        throw new Error("Group owner cannot demote themselves. Transfer ownership first.");
    }

    // Update the role
    const updatedMembership = await groupRepository.updateGroupMember(db, groupId, memberId, { role: newRole });

    // Notify the affected user
    sendWsMessageToUser(activeConnections, memberId, {
        type: 'MEMBER_ROLE_UPDATED',
        payload: {
            groupId: groupId,
            newRole: newRole,
            updatedBy: { id: requesterId, username: requesterMembership.user_username }
        }
    });

    return updatedMembership;
}

// Remove member from group - owner/admin only
async function removeMember(db, requesterId, groupId, memberId) {
    // Check if requester has permission
    const requesterMembership = await groupRepository.getGroupMember(db, groupId, requesterId);
    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role) || requesterMembership.status !== 'active') {
        throw new Error("You do not have permission to remove members from this group.");
    }

    // Check target member exists
    const targetMembership = await groupRepository.getGroupMember(db, groupId, memberId);
    if (!targetMembership || targetMembership.status !== 'active') {
        throw new Error("Target member not found or not active in this group.");
    }

    // Prevent non-owners from removing owners or admins
    if (requesterMembership.role !== 'owner' && ['owner', 'admin'].includes(targetMembership.role)) {
        throw new Error("Only the group owner can remove admins or owners.");
    }

    // Prevent removing self (use leave group instead)
    if (requesterId === memberId) {
        throw new Error("Use leave group function to remove yourself from the group.");
    }

    // Update member status to 'kicked' instead of hard delete (keeps history)
    const updatedMembership = await groupRepository.updateGroupMember(db, groupId, memberId, { status: 'kicked' });

    // Notify the removed user
    sendWsMessageToUser(activeConnections, memberId, {
        type: 'REMOVED_FROM_GROUP',
        payload: {
            groupId: groupId,
            groupName: targetMembership.group_name,
            removedBy: { id: requesterId, username: requesterMembership.user_username }
        }
    });

    // Notify other group members
    const activeMembers = await groupRepository.getGroupMembers(db, groupId, 'active');
    activeMembers.forEach(member => {
        if (member.user_id !== requesterId && member.user_id !== memberId) {
            sendWsMessageToUser(activeConnections, member.user_id, {
                type: 'MEMBER_REMOVED_FROM_GROUP',
                payload: {
                    groupId: groupId,
                    removedUser: { id: memberId, username: targetMembership.user_username },
                    removedBy: { id: requesterId, username: requesterMembership.user_username }
                }
            });
        }
    });

    return updatedMembership;
}

// Transfer ownership - owner only
async function transferOwnership(db, currentOwnerId, groupId, newOwnerId) {
    // Check if requester is the current owner
    const currentOwnerMembership = await groupRepository.getGroupMember(db, groupId, currentOwnerId);
    if (!currentOwnerMembership || currentOwnerMembership.role !== 'owner' || currentOwnerMembership.status !== 'active') {
        throw new Error("You are not the owner of this group or not an active member.");
    }

    // Check if new owner is a member of the group
    const newOwnerMembership = await groupRepository.getGroupMember(db, groupId, newOwnerId);
    if (!newOwnerMembership || newOwnerMembership.status !== 'active') {
        throw new Error("New owner must be an active member of the group.");
    }

    // Update the group's owner_id
    const group = await groupRepository.getGroupById(db, groupId);
    const updatedGroup = await groupRepository.updateGroupDetails(db, groupId, { ownerId: newOwnerId });

    // Update member roles
    await groupRepository.updateGroupMember(db, groupId, currentOwnerId, { role: 'admin' }); // Demote current owner to admin
    await groupRepository.updateGroupMember(db, groupId, newOwnerId, { role: 'owner' }); // Promote new owner

    // Notify new owner
    sendWsMessageToUser(activeConnections, newOwnerId, {
        type: 'OWNERSHIP_TRANSFERRED',
        payload: {
            groupId: groupId,
            groupName: group.name,
            previousOwner: { id: currentOwnerId, username: currentOwnerMembership.user_username },
            newRole: 'owner'
        }
    });

    // Notify previous owner
    sendWsMessageToUser(activeConnections, currentOwnerId, {
        type: 'OWNERSHIP_TRANSFERRED',
        payload: {
            groupId: groupId,
            groupName: group.name,
            newOwner: { id: newOwnerId, username: newOwnerMembership.user_username },
            newRole: 'admin'
        }
    });

    // Notify other group members
    const activeMembers = await groupRepository.getGroupMembers(db, groupId, 'active');
    activeMembers.forEach(member => {
        if (member.user_id !== currentOwnerId && member.user_id !== newOwnerId) {
            sendWsMessageToUser(activeConnections, member.user_id, {
                type: 'GROUP_OWNERSHIP_CHANGED',
                payload: {
                    groupId: groupId,
                    groupName: group.name,
                    previousOwner: { id: currentOwnerId, username: currentOwnerMembership.user_username },
                    newOwner: { id: newOwnerId, username: newOwnerMembership.user_username }
                }
            });
        }
    });

    return updatedGroup;
}

module.exports = {
    createNewGroup,
    inviteUserToGroup,
    respondToGroupInvitation,
    leaveGroup,
    getGroupDetailsWithMembers,
    listUserGroups,
    updateGroupDetails,
    updateMemberRole,
    removeMember,
    transferOwnership,
    getPendingInvitations,
    searchPublicGroups
};