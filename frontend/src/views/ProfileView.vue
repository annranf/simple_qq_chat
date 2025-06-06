<!-- src/views/ProfileView.vue -->
<template>
  <div class="profile-view">
    <el-container>
      <!-- 侧边栏导航 -->
      <el-aside width="250px" class="profile-sidebar">
        <div class="profile-nav">
          <h3>设置</h3>
          <el-menu 
            default-active="basic" 
            mode="vertical"
            @select="handleMenuSelect"
          >
            <el-menu-item index="basic">
              <el-icon><User /></el-icon>
              <span>基本信息</span>
            </el-menu-item>
            <el-menu-item index="avatar">
              <el-icon><Avatar /></el-icon>
              <span>头像设置</span>
            </el-menu-item>
            <el-menu-item index="security">
              <el-icon><Lock /></el-icon>
              <span>账号安全</span>
            </el-menu-item>
            <el-menu-item index="privacy">
              <el-icon><Setting /></el-icon>
              <span>隐私设置</span>
            </el-menu-item>
          </el-menu>
        </div>
        
        <!-- 返回聊天按钮 -->
        <div class="back-to-chat">
          <el-button 
            type="primary" 
            @click="$router.push({ name: 'Chat' })"
            style="width: 100%"
          >
            <el-icon><ArrowLeft /></el-icon>
            返回聊天
          </el-button>
        </div>
      </el-aside>

      <!-- 主内容区域 -->
      <el-main class="profile-main">
        <div class="profile-content">
          <!-- 基本信息面板 -->
          <BasicInfoPanel 
            v-if="activePanel === 'basic'"
            :user="currentUser"
            @user-updated="handleUserUpdated"
          />
          
          <!-- 头像设置面板 -->
          <AvatarPanel 
            v-if="activePanel === 'avatar'"
            :user="currentUser"
            @avatar-updated="handleAvatarUpdated"
          />
          
          <!-- 账号安全面板 -->
          <SecurityPanel 
            v-if="activePanel === 'security'"
            :user="currentUser"
          />
          
          <!-- 隐私设置面板 -->
          <PrivacyPanel 
            v-if="activePanel === 'privacy'"
            :user="currentUser"
          />
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'
import { ElMessage } from 'element-plus'
import { User, Avatar, Lock, Setting, ArrowLeft } from '@element-plus/icons-vue'
import type { User as UserType } from '../types'
import userService from '../services/userService'

// 导入面板组件
import BasicInfoPanel from '../components/profile/BasicInfoPanel.vue'
import AvatarPanel from '../components/profile/AvatarPanel.vue'
import SecurityPanel from '../components/profile/SecurityPanel.vue'
import PrivacyPanel from '../components/profile/PrivacyPanel.vue'

const authStore = useAuthStore()
const activePanel = ref('basic')
const currentUser = ref<UserType | null>(null)

// 处理菜单选择
const handleMenuSelect = (index: string) => {
  activePanel.value = index
}

// 处理用户信息更新
const handleUserUpdated = (updatedUser: UserType) => {
  currentUser.value = updatedUser
  // 更新认证存储中的用户信息
  authStore.currentUser = updatedUser
  localStorage.setItem('currentUser', JSON.stringify(updatedUser))
  ElMessage.success('个人信息更新成功')
}

// 处理头像更新
const handleAvatarUpdated = (avatarUrl: string) => {
  if (currentUser.value) {
    currentUser.value.avatarUrl = avatarUrl
    handleUserUpdated(currentUser.value)
  }
}

// 初始化加载当前用户信息
onMounted(async () => {
  try {
    // 先使用缓存的用户信息
    currentUser.value = authStore.currentUser
    
    // 然后从服务器获取最新信息
    const latestUser = await userService.getCurrentUserProfile()
    currentUser.value = latestUser
    
    // 更新缓存
    authStore.currentUser = latestUser
    localStorage.setItem('currentUser', JSON.stringify(latestUser))
  } catch (error) {
    console.error('获取用户信息失败:', error)
    ElMessage.error('获取用户信息失败')
    // 如果获取失败，使用缓存的信息
    currentUser.value = authStore.currentUser
  }
})
</script>

<style scoped>
.profile-view {
  height: 100vh;
  background: var(--el-bg-color-page);
}

.profile-sidebar {
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
}

.profile-nav {
  flex: 1;
  padding: 20px 0;
}

.profile-nav h3 {
  margin: 0 0 20px 0;
  padding: 0 20px;
  color: var(--el-text-color-primary);
  font-size: 18px;
  font-weight: 600;
}

.el-menu {
  border: none;
}

.back-to-chat {
  padding: 20px;
  border-top: 1px solid var(--el-border-color);
}

.profile-main {
  padding: 0;
  overflow: hidden;
}

.profile-content {
  height: 100%;
  overflow-y: auto;
  padding: 20px 40px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-sidebar {
    width: 200px !important;
  }
  
  .profile-content {
    padding: 20px;
  }
}
</style>
