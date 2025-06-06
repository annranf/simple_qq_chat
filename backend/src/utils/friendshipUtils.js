// src/utils/friendshipUtils.js

/**
 * Orders two user IDs to ensure user1_id < user2_id.
 * @param {number} uId1 - First user ID.
 * @param {number} uId2 - Second user ID.
 * @returns {{user1_id: number, user2_id: number}}
 */
function getOrderedUserIds(uId1, uId2) {
    if (uId1 === uId2) {
        throw new Error("User IDs cannot be the same for a friendship.");
    }
    return {
        user1_id: Math.min(uId1, uId2),
        user2_id: Math.max(uId1, uId2),
    };
}

module.exports = {
    getOrderedUserIds,
};