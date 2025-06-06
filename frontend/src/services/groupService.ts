// src/services/groupService.ts
import apiClient from './axiosInstance';

// 群组基础信息接口
export interface GroupForSession {
    id: number;
    name: string;
    avatar_url?: string;
    last_message_content?: string;
    last_message_timestamp?: string;
    unread_count?: number;
    active_member_count?: number;
    owner_id?: number;
    user_role_in_group?: string;
}

// 群组详细信息接口
export interface GroupDetail extends GroupForSession {
    description?: string;
    group_type?: string;
    created_at?: string;
    members?: GroupMember[];
}

// 群组成员接口
export interface GroupMember {
    user_id: number;
    user_username: string;
    user_nickname?: string;
    user_avatar?: string;
    user_online_status?: string;
    role: string;
    membership_status: string;
    nickname_in_group?: string;
    joined_at?: string;
}

// 创建群组参数接口
export interface CreateGroupParams {
    name: string;
    description?: string;
    avatar_url?: string;
    group_type?: 'private' | 'public_readonly' | 'public_joinable';
}

// 邀请用户参数接口
export interface InviteUserParams {
    username: string;
}

// 更新群组参数接口
export interface UpdateGroupParams {
    name?: string;
    description?: string;
    avatar_url?: string;
    group_type?: string;
}

// 获取我的群组列表
async function getMyGroups(): Promise<GroupForSession[]> {
    const response = await apiClient.get<GroupForSession[]>('/groups/mine');
    return response.data;
}

// 获取群组详细信息
async function getGroupDetails(groupId: number): Promise<GroupDetail> {
    const response = await apiClient.get<GroupDetail>(`/groups/${groupId}`);
    return response.data;
}

// 创建新群组
async function createGroup(params: CreateGroupParams): Promise<GroupDetail> {
    const response = await apiClient.post<GroupDetail>('/groups', params);
    return response.data;
}

// 邀请用户加入群组
async function inviteUser(groupId: number, params: InviteUserParams): Promise<void> {
    await apiClient.post(`/groups/${groupId}/invite`, params);
}

// 响应群组邀请 (接受/拒绝)
async function respondToInvitation(groupId: number, response: 'accepted' | 'declined'): Promise<void> {
    await apiClient.post(`/groups/${groupId}/respond`, { response });
}

// 退出群组
async function leaveGroup(groupId: number): Promise<void> {
    await apiClient.post(`/groups/${groupId}/leave`);
}

// 更新群组信息
async function updateGroup(groupId: number, params: UpdateGroupParams): Promise<GroupDetail> {
    const response = await apiClient.put<GroupDetail>(`/groups/${groupId}`, params);
    return response.data;
}

// 获取群组成员列表
async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
    const response = await apiClient.get<GroupMember[]>(`/groups/${groupId}/members`);
    return response.data;
}

// 移除群组成员
async function removeMember(groupId: number, userId: number): Promise<void> {
    await apiClient.delete(`/groups/${groupId}/members/${userId}`);
}

// 更新成员角色
async function updateMemberRole(groupId: number, userId: number, role: string): Promise<void> {
    await apiClient.put(`/groups/${groupId}/members/${userId}/role`, { role });
}

// 获取待处理的群组邀请
async function getPendingInvitations(): Promise<any[]> {
    const response = await apiClient.get('/groups/invitations/pending');
    return response.data;
}

// 搜索公开群组
async function searchPublicGroups(query: string): Promise<any[]> {
    const response = await apiClient.get('/groups/search/public', {
        params: { q: query }
    });
    return response.data;
}

export default {
    getMyGroups,
    getGroupDetails,
    createGroup,
    inviteUser,
    respondToInvitation,
    leaveGroup,
    updateGroup,
    getGroupMembers,
    removeMember,
    updateMemberRole,
    getPendingInvitations,
    searchPublicGroups
};