<template>
  <div class="friend-search">
    <div class="search-header">
      <h3>添加好友</h3>
    </div>
    
    <div class="search-input">
      <el-input
        v-model="searchQuery"
        placeholder="输入用户名或昵称搜索用户"
        :prefix-icon="Search"
        clearable
        @input="handleSearch"
        @keyup.enter="handleSearch"
      />
    </div>

    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      搜索中...
    </div>

    <div v-if="searchResults.length > 0" class="search-results">
      <div class="results-header">搜索结果</div>
      <div 
        v-for="user in searchResults" 
        :key="user.id" 
        class="user-item"
      >
        <el-avatar 
          :src="user.avatarUrl || defaultAvatar" 
          :size="40"
        />
        <div class="user-info">
          <div class="user-nickname">{{ user.nickname || user.username }}</div>
          <div class="user-username">@{{ user.username }}</div>
          <div class="user-status" :class="user.status">
            {{ user.status === 'online' ? '在线' : '离线' }}
          </div>
        </div>
        <el-button 
          type="primary" 
          size="small"
          :loading="sendingRequest === user.id"
          @click="sendFriendRequest(user)"
        >
          添加好友
        </el-button>
      </div>
    </div>

    <div v-else-if="searchQuery && !loading" class="no-results">
      未找到相关用户
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import userService from '../../../services/userService'
import friendshipService from '../../../services/friendshipService'
import type { User } from '../../../types'
import defaultAvatar from '../../../assets/default-avatar.png'
import { translateError } from '../../../utils/errorUtils'

const searchQuery = ref('')
const searchResults = ref<User[]>([])
const loading = ref(false)
const sendingRequest = ref<number | null>(null)

let searchTimeout: number | null = null

const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(async () => {
    if (!searchQuery.value.trim()) {
      searchResults.value = []
      return
    }
    
    try {
      loading.value = true
      const results = await userService.searchUsers(searchQuery.value.trim())
      searchResults.value = results
    } catch (error) {
      console.error('搜索用户失败:', error)
      ElMessage.error('搜索失败，请重试')
    } finally {
      loading.value = false
    }
  }, 300) // 防抖 300ms
}

const sendFriendRequest = async (user: User) => {
  try {
    sendingRequest.value = user.id
    await friendshipService.sendFriendRequest(user.username)
    ElMessage.success(`已向 ${user.nickname || user.username} 发送好友请求`)
      // 从搜索结果中移除已发送请求的用户
    searchResults.value = searchResults.value.filter(u => u.id !== user.id)
  } catch (error: any) {
    console.error('发送好友请求失败:', error)
    const originalMessage = error.response?.data?.message || '发送好友请求失败'
    const friendlyMessage = translateError(originalMessage, 'friendship')
    ElMessage.error(friendlyMessage)
  } finally {
    sendingRequest.value = null
  }
}
</script>

<style scoped>
.friend-search {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.search-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.search-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.search-input {
  padding: 16px;
  background: white;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #666;
  gap: 8px;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.results-header {
  padding: 12px 16px;
  font-size: 14px;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.user-item:hover {
  background-color: #f8f9fa;
}

.user-info {
  flex: 1;
  margin-left: 12px;
  min-width: 0;
}

.user-nickname {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.user-username {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.user-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  display: inline-block;
}

.user-status.online {
  background-color: #e8f5e8;
  color: #52c41a;
}

.user-status.offline {
  background-color: #f0f0f0;
  color: #999;
}

.no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
}
</style>
