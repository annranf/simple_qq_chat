// src/services/authService.ts
// import axios from 'axios' // <--- 修改：不再直接使用全局 axios
import apiClient from './axiosInstance'; // <--- 新增：导入配置好的 apiClient
import type { User } from '../types'

// const API_URL = '/api/auth' // <--- 修改：baseURL 在 apiClient 中配置，这里用相对路径
const AUTH_BASE_PATH = '/auth'; // 定义特定于此服务的路径部分

interface LoginResponse {
  message: string
  user: User
  token: string
}

interface RegisterPayload { // 定义注册时发送给后端的数据结构
    username: string;
    password: string;
    nickname?: string;
    bio?: string;
}

interface RegisterResponse { // 定义后端注册成功后返回的数据结构
  message: string;
  user: Omit<User, 'password_hash'>; // 后端不应返回 password_hash
}

async function login(credentials: { username: string; password: string }): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(`${AUTH_BASE_PATH}/login`, credentials);
  return response.data;
}

async function register(payload: RegisterPayload): Promise<RegisterResponse> { // 添加 register 方法
  const response = await apiClient.post<RegisterResponse>(`${AUTH_BASE_PATH}/register`, payload);
  return response.data;
}


export default {
  login,
  register,
  // getMe,
}