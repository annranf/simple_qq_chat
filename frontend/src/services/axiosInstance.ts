// src/services/axiosInstance.ts
import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosError } from 'axios';
import { useAuthStore } from '../store/auth'; // 使用相对路径
// import router from '../router'; // 如果需要在拦截器中直接使用 router (不推荐，见下文)

const apiClient: AxiosInstance = axios.create({
  baseURL: '/api', // Vite proxy 将会把 /api 代理到你的后端服务地址，例如 http://localhost:3000/api
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：在每个请求发送前附加 Authorization header (如果 token 存在)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore(); // 必须在拦截器函数内部获取 store 实例
    const token = authStore.token;
    console.log('AxiosInterceptor: Token from authStore:', token); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('AxiosInterceptor: Authorization header set'); 
    }
    else{
        console.warn('AxiosInterceptor: No token found in authStore');
    }
    
    // 如果请求数据是 FormData，不要设置 Content-Type，让浏览器自动设置
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('Axios request error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器：处理全局响应错误，例如 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => {
    // 对响应数据做点什么
    return response;
  },
  (error: AxiosError) => {
    console.error('Axios response error:', error.response?.status, error.message);
    const authStore = useAuthStore(); // 获取 store 实例

    if (error.response) {
      const { status, data } = error.response;
      const errorMessage = (data as any)?.message || error.message;

      if (status === 401) {
        // Token 无效或过期
        console.warn('Unauthorized (401) response. Logging out.');
        authStore.logout(null); 
        return Promise.reject(new Error(`Unauthorized: ${errorMessage}`));
      } else if (status === 403) {
        // Forbidden
        console.warn('Forbidden (403) response.');
        // 可能提示用户权限不足
        return Promise.reject(new Error(`Forbidden: ${errorMessage}`));
      }
      // 其他错误状态码，可以根据需要处理
      // return Promise.reject(error); // 原始错误对象
      return Promise.reject(new Error(errorMessage)); // 包装一下错误消息
    } else if (error.request) {
      // 请求已发出，但没有收到响应 (例如网络错误)
      console.error('No response received:', error.request);
      return Promise.reject(new Error('Network error or no response from server.'));
    } else {
      // 发送请求时出了点问题
      console.error('Error setting up request:', error.message);
      return Promise.reject(new Error(`Request setup error: ${error.message}`));
    }
  }
);

export default apiClient;