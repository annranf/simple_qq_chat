// src/services/stickerService.ts
// import axios from 'axios'; // <--- 修改
import apiClient from './axiosInstance'; // <--- 新增
import type { StickerPack } from '../types';

// const API_URL = '/api/stickers'; // <--- 修改
const API_BASE_PATH = '/stickers';

async function getAvailableStickerPacks(): Promise<StickerPack[]> {
    // const token = localStorage.getItem('authToken'); // <--- 修改
    // const response = await axios.get<StickerPack[]>(`${API_URL}/packs`, { // <--- 修改
    //      headers: { Authorization: `Bearer ${token}` }
    // });
    const response = await apiClient.get<StickerPack[]>(`${API_BASE_PATH}/packs`);
    return response.data;
}

async function getUserStickerPacks(): Promise<StickerPack[]> {
    const response = await apiClient.get<StickerPack[]>(`${API_BASE_PATH}/packs/user`);
    return response.data;
}

async function createStickerPack(name: string): Promise<StickerPack> {
    const response = await apiClient.post<StickerPack>(`${API_BASE_PATH}/packs`, { name });
    return response.data;
}

async function uploadStickerPack(name: string, files: File[]): Promise<any> {
    // 首先上传所有文件
    const mediaIds: number[] = [];
    for (const file of files) {
        const formData = new FormData();
        formData.append('mediaFile', file);
        formData.append('fileType', 'image');
        
        const uploadResponse = await apiClient.post('/uploads/media', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
        mediaIds.push(uploadResponse.data.media.id);
    }
    
    // 然后创建表情包
    const response = await apiClient.post(`${API_BASE_PATH}/upload-pack`, {
        name,
        files: mediaIds
    });
    
    return response.data;
}

async function deleteStickerPack(packId: number): Promise<void> {
    await apiClient.delete(`${API_BASE_PATH}/packs/${packId}`);
}

export default { 
    getAvailableStickerPacks,
    getUserStickerPacks,
    createStickerPack,
    uploadStickerPack,
    deleteStickerPack
};