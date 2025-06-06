// src/services/userService.ts
import apiClient from './axiosInstance';
import type { User } from '../types';

const USER_BASE_PATH = '/users';

// 获取指定用户信息
async function getUserById(userId: number): Promise<User> {
    const response = await apiClient.get<User>(`${USER_BASE_PATH}/${userId}`);
    return response.data;
}

// 搜索用户
async function searchUsers(query: string): Promise<User[]> {
    const response = await apiClient.get<User[]>(`${USER_BASE_PATH}/search?q=${encodeURIComponent(query)}`);
    return response.data;
}

// 获取当前用户个人资料
async function getCurrentUserProfile(): Promise<User> {
    const response = await apiClient.get<User>(`${USER_BASE_PATH}/me`);
    return response.data;
}

// 更新当前用户个人资料
interface UpdateProfileData {
    nickname?: string;
    status?: 'online' | 'away' | 'busy' | 'offline';
    avatarUrl?: string;
}

async function updateCurrentUserProfile(updateData: UpdateProfileData): Promise<User> {
    console.log('userService.updateCurrentUserProfile called with data:', updateData);
    
    try {
        const response = await apiClient.put<User>(`${USER_BASE_PATH}/me`, updateData);
        console.log('Profile update response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('Profile update failed:', error);
        if (error.response) {
            console.error('Error response:', error.response.data);
            console.error('Error status:', error.response.status);
        }
        throw error;
    }
}

// 上传头像
async function uploadAvatar(file: File, onUploadProgress?: (progressEvent: any) => void): Promise<{ avatarUrl: string }> {
    console.log('userService.uploadAvatar called with file:', file.name, file.type, file.size);
    
    const formData = new FormData();
    formData.append('mediaFile', file); // 修改字段名为后端期待的 'mediaFile'
    formData.append('fileType', 'image'); // 添加文件类型
    
    console.log('FormData created, sending request to /uploads/media');
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
        console.log(key, value);
    }
    
    try {
        const response = await apiClient.post<{ message: string; media: { id: number; file_path: string; file_name: string } }>('/uploads/media', formData, {
            onUploadProgress: (progressEvent) => {
                console.log('API upload progress:', progressEvent);
                if (onUploadProgress) onUploadProgress(progressEvent);
            },
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });        console.log('Upload response received:', response.data);
        console.log('Media object keys:', Object.keys(response.data.media));
        console.log('Full media object:', response.data.media);
        
        // 根据后端返回的格式构造头像URL
        // 后端返回的字段名是 file_path (下划线格式)
        const avatarUrl = response.data.media.file_path;
        console.log('Extracted avatar URL:', avatarUrl);
          return { avatarUrl };
    } catch (error: any) {
        console.error('Upload request failed:', error);
        if (error.response) {
            console.error('Error response:', error.response.data);
            console.error('Error status:', error.response.status);
        }
        throw error;
    }
}

export default { 
    getUserById, 
    searchUsers,
    getCurrentUserProfile,
    updateCurrentUserProfile,
    uploadAvatar
};