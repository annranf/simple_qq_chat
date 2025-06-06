// src/services/friendshipService.ts
import apiClient from './axiosInstance'; // 使用封装的 apiClient
import type { User } from '../types';

interface FriendshipWithPeer { // 确保这个类型与后端返回一致
    id: number; 
    status: 'pending' | 'accepted' | 'declined' | 'blocked';
    peer: User; 
    // ...其他 friendship 表字段
    user1_id?: number; // 后端 getFriendshipsForUser 返回的可能包含这些
    user2_id?: number;
    action_user_id?: number;
    created_at?: string;
    updated_at?: string;
}

async function listFriends(): Promise<FriendshipWithPeer[]> {
    // apiClient 已经处理了 token
    const response = await apiClient.get<FriendshipWithPeer[]>(`/friendships/`); // baseURL 是 /api
    return response.data;
}

async function sendFriendRequest(recipientUsername: string): Promise<any> {
    const response = await apiClient.post('/friendships/request', {
        recipientUsername
    });
    return response.data;
}

async function respondToFriendRequest(requesterId: number, response: 'accepted' | 'declined'): Promise<any> {
    const responseData = await apiClient.post('/friendships/respond', {
        requesterId,
        response
    });
    return responseData.data;
}

async function acceptFriendRequest(requesterUsername: string): Promise<any> {
    const response = await apiClient.post('/friendships/accept', {
        requesterUsername
    });
    return response.data;
}

async function declineFriendRequest(requesterUsername: string): Promise<any> {
    const response = await apiClient.post('/friendships/decline', {
        requesterUsername
    });
    return response.data;
}

async function getFriendships(status?: string): Promise<FriendshipWithPeer[]> {
    const url = status ? `/friendships?status=${status}` : '/friendships';
    const response = await apiClient.get<FriendshipWithPeer[]>(url);
    return response.data;
}

async function listPendingRequests(): Promise<FriendshipWithPeer[]> {
    const response = await apiClient.get<FriendshipWithPeer[]>('/friendships/requests/pending');
    return response.data;
}

async function removeFriend(friendId: number): Promise<any> {
    const response = await apiClient.delete(`/friendships/remove/${friendId}`);
    return response.data;
}

// ... 其他好友相关 API 调用 (sendRequest, respondRequest etc.)
export default { 
    listFriends, 
    sendFriendRequest, 
    respondToFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    getFriendships,
    listPendingRequests,
    removeFriend 
};