// src/services/uploadService.ts
// import axios from 'axios'; // <--- 修改
import apiClient from './axiosInstance'; // <--- 新增
import type { MediaAttachment } from '../types';

// const API_URL = '/api/uploads'; // <--- 修改
const UPLOADS_BASE_PATH = '/uploads';

interface UploadResponse {
    message: string;
    media: MediaAttachment;
}

async function uploadMedia(formData: FormData, onUploadProgress?: (progressEvent: any) => void): Promise<UploadResponse> {
    // const token = localStorage.getItem('authToken'); // <--- 修改
    // const response = await axios.post<UploadResponse>(`${API_URL}/media`, formData, { // <--- 修改
    //     headers: {
    //         Authorization: `Bearer ${token}`, // <--- 修改：拦截器处理 Authorization
    //         'Content-Type': 'multipart/form-data' // 这个 Content-Type 需要保留
    //     },
    //     onUploadProgress
    // });

    // apiClient 的请求拦截器会自动添加 Authorization header。
    // 对于 'multipart/form-data'，axios 通常会自动设置正确的 Content-Type，
    // 但如果需要显式设置，可以在 apiClient.post 的 config 中指定。
    // 不过，当传递 FormData 对象时，浏览器（和 Axios）通常会正确设置 Content-Type 及其 boundary。
    // 所以这里的 headers 可以简化。
    const response = await apiClient.post<UploadResponse>(`${UPLOADS_BASE_PATH}/media`, formData, {
        // headers: { // 通常不需要显式设置 Content-Type，除非 axios 自动处理不符合预期
        //     'Content-Type': 'multipart/form-data' 
        // },
        onUploadProgress
    });
    return response.data;
}

export default { uploadMedia };