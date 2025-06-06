// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../store/auth' // 引入 auth store

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'), // 懒加载
    meta: { requiresGuest: true } // 标记此路由只允许未登录用户访问
  },
  {
    path: '/',
    name: 'Chat', // 主聊天界面
    component: () => import('../views/ChatView.vue'),
    meta: { requiresAuth: true } // 标记此路由需要认证
  },  {
    path: '/profile',
    name: 'Profile', // 个人资料界面
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true } // 标记此路由需要认证
  },
  {
    path: '/debug-upload',
    name: 'DebugUpload', // 调试上传页面
    component: () => import('../views/DebugUpload.vue'),
    meta: { requiresAuth: true } // 标记此路由需要认证
  },
  // 可以添加一个 404 页面
  { // 新增注册页路由
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue'), // 使用相对路径
    meta: { requiresGuest: true } // 通常注册页也只允许未登录用户访问
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore(); // 在回调函数内部获取实例
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' });
  } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'Chat' });
  } else {
    next();
  }
});

export default router