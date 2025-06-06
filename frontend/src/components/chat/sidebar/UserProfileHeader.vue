<template>  <div class="user-profile-header">
    <el-avatar 
      :src="authStore.currentUser?.avatarUrl || defaultAvatar" 
      :size="40" 
      class="user-avatar-clickable"
      @click="handleAvatarClick"
    />
    <span class="username">{{ authStore.currentUser?.nickname || authStore.currentUser?.username }}</span>
    <!-- 更多菜单，例如登出按钮 -->
    <el-dropdown @command="handleCommand">
      <el-icon class="menu-icon"><MoreFilled /></el-icon>      <template #dropdown>        <el-dropdown-menu>
          <el-dropdown-item command="profile">个人资料</el-dropdown-item>
          <el-dropdown-item command="settings">设置</el-dropdown-item>
          <el-dropdown-item command="logout" divided>登出</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../../store/auth' // 调整路径
import { MoreFilled } from '@element-plus/icons-vue' // 引入图标
import defaultAvatar from '../../../assets/default-avatar.png'; // 准备一个默认头像图片
import { ElAvatar, ElDropdown, ElDropdownMenu, ElDropdownItem, ElIcon } from 'element-plus'
const authStore = useAuthStore()
const router = useRouter()

const handleCommand = (command: string) => {
  if (command === 'logout') {
    authStore.logout(router)
  } else if (command === 'settings') {
    router.push({ name: 'Profile' })
  } else if (command === 'profile') {
    router.push({ name: 'Profile' })
  }
}

const handleAvatarClick = () => {
  router.push({ name: 'Profile' })
}
</script>

<style scoped>
.user-profile-header {  display: flex;
  align-items: center;
  padding: 10px 0; /* 调整内边距 */
}

.user-avatar-clickable {
  cursor: pointer;
  transition: opacity 0.2s;
}

.user-avatar-clickable:hover {
  opacity: 0.8;
}

.username {
  margin-left: 10px;
  font-weight: bold;
  flex-grow: 1;
}
.menu-icon {
  cursor: pointer;
  font-size: 20px;
  color: #606266;
}
</style>