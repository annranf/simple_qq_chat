<template>
  <div class="user-avatar-icon">
    <el-avatar 
      :src="currentUser?.avatarUrl || defaultAvatar" 
      :size="36"
      @click="handleAvatarClick"
    >
      <template #default>
        <el-icon><User /></el-icon>
      </template>
    </el-avatar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { User } from '@element-plus/icons-vue'
import { useAuthStore } from '../../../store/auth'
import defaultAvatar from '../../../assets/default-avatar.png'

const authStore = useAuthStore()
const currentUser = computed(() => authStore.currentUser)

const handleAvatarClick = () => {
  // 点击头像导航到个人资料页面
  const router = useRouter()
  router.push({ name: 'Profile' })
}
</script>

<style scoped>
.user-avatar-icon {
  cursor: pointer;
  transition: opacity 0.2s;
}

.user-avatar-icon:hover {
  opacity: 0.8;
}
</style>
