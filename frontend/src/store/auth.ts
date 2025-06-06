// src/store/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
// import { useRouter } from 'vue-router' // 如果在 store 外部使用，需要传递 router 实例
import authService from '../services/authService' // 我们将创建这个 service
import type { User } from '../types' // 引入 User 类型
import { useWsStore } from './ws' // 引入 WebSocket store

// interface AuthState {
//   token: string | null
//   currentUser: User | null
//   isAuthenticated: boolean
//   loginError: string | null
//   isLoading: boolean
// }

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('authToken') || null)
  const currentUser = ref<User | null>(JSON.parse(localStorage.getItem('currentUser') || 'null'))
  const loginError = ref<string | null>(null)
  const isLoading = ref<boolean>(false)

  const isAuthenticated = computed(() => !!token.value && !!currentUser.value)

  // 获取 router 实例的方式，如果需要在 store action 中使用
  // const router = useRouter(); // 这种方式在 setup store 中直接用会报错
  // 正确方式是在组件中获取 router 实例，然后传递给 action，或者在 action 中 import router 实例（如果 router 是单独文件导出）

  async function login(credentials: { username: string; password: string }, routerInstance: any) {
    isLoading.value = true
    loginError.value = null
    try {
      const response = await authService.login(credentials)
      if (response && response.token && response.user) {
        token.value = response.token
        currentUser.value = response.user
        localStorage.setItem('authToken', response.token)
        localStorage.setItem('currentUser', JSON.stringify(response.user))
        console.log('AuthStore: Token set after login:', token.value);
        // 登录成功后，初始化 WebSocket 连接
        const wsStore = useWsStore()
        wsStore.connect(response.token) // 传递 token 给 WebSocket 连接

        routerInstance.push({ name: 'Chat' }) // 假设主聊天页路由名为 'Chat'
      } else {
        throw new Error('Login response missing token or user.')
      }
    } catch (error: any) {
      console.error('Login failed:', error)
      loginError.value = error.response?.data?.message || error.message || 'Login failed. Please try again.'
      // 清理可能存在的无效 token 和用户信息
      localStorage.removeItem('authToken')
      localStorage.removeItem('currentUser')
      token.value = null
      currentUser.value = null
    } finally {
      isLoading.value = false
    }
  }

  function logout(routerInstance: any | null) { // 允许 routerInstance 为 null
    const wsStore = useWsStore();
    wsStore.disconnect(); // 确保 WebSocket 断开

    token.value = null;
    currentUser.value = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    loginError.value = null;

    if (routerInstance) { // 只有当 routerInstance 存在时才执行导航
        routerInstance.push({ name: 'Login' });
    } else {
        // 如果没有 routerInstance (例如从 wsService 调用)，
        // UI 层应该监听 isAuthenticated 的变化，并在变为 false 时自动导航到登录页。
        // 这通常在 App.vue 或路由守卫中处理。
        console.warn('Logout called without router instance. UI should react to auth state change.');
    }
    }

  // 在应用加载时检查本地存储的 token 是否有效 (可选的高级功能)
  // async function checkAuthStatus() {
  //   if (token.value) {
  //     try {
  //       // 可以尝试调用一个受保护的 "me" 接口来验证 token
  //       // const user = await authService.getMe();
  //       // currentUser.value = user;
  //       // 如果token无效，getMe会失败，然后可以执行登出逻辑
  //     } catch (error) {
  //       console.log('Token check failed, logging out');
  //       // logout(router); // 这里需要 router 实例
  //     }
  //   }
  // }

  return {
    token,
    currentUser,
    isAuthenticated,
    loginError,
    isLoading,
    login,
    logout,
    // checkAuthStatus,
  }
})