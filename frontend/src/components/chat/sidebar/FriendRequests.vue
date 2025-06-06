<template>
  <div class="friend-requests">
    <div class="requests-header">
      <h3>好友申请</h3>
      <el-badge :value="pendingRequests.length" :hidden="pendingRequests.length === 0" type="primary">
        <span class="badge-text">待处理</span>
      </el-badge>
    </div>
    
    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      加载中...
    </div>

    <div v-else-if="pendingRequests.length === 0" class="no-requests">
      <el-empty description="暂无好友申请" :image-size="80" />
    </div>

    <div v-else class="requests-list">
      <div 
        v-for="request in pendingRequests" 
        :key="request.id" 
        class="request-item"
      >
        <el-avatar 
          :src="request.peer.avatarUrl || defaultAvatar" 
          :size="40"
        />
        <div class="request-info">
          <div class="user-nickname">{{ request.peer.nickname || request.peer.username }}</div>
          <div class="user-username">@{{ request.peer.username }}</div>
          <div class="request-time">{{ formatTime(request.created_at || '') }}</div>
        </div>
        <div class="request-actions">
          <el-button 
            type="primary" 
            size="small"
            :loading="processingRequest === request.id"
            @click="acceptRequest(request)"
          >
            接受
          </el-button>
          <el-button 
            type="danger" 
            size="small" 
            plain
            :loading="processingRequest === request.id"
            @click="declineRequest(request)"
          >
            拒绝
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import friendshipService from '../../../services/friendshipService'
import { useAuthStore } from '../../../store/auth'
import type { Friendship } from '../../../types'
import defaultAvatar from '../../../assets/default-avatar.png'
import { formatMessageTime } from '../../../utils/timeUtils'
import { translateError } from '../../../utils/errorUtils'

const pendingRequests = ref<Friendship[]>([])
const loading = ref(false)
const processingRequest = ref<number | null>(null)

const loadPendingRequests = async () => {
  try {
    loading.value = true
    const requests = await friendshipService.getFriendships('pending')
    
    // 过滤出发给我的申请（action_user_id不是我，但我在friendship中）
    const authStore = useAuthStore()
    const currentUserId = authStore.currentUser?.id
    
    if (currentUserId) {
      pendingRequests.value = requests.filter((req) => 
        req.action_user_id !== currentUserId && // 不是我发起的申请
        req.status === 'pending' // 状态为pending
      ) as Friendship[]
    } else {
      pendingRequests.value = []
    }
  } catch (error) {
    console.error('加载好友申请失败:', error)
    ElMessage.error('加载好友申请失败')
  } finally {
    loading.value = false
  }
}

const acceptRequest = async (request: Friendship) => {
  try {    processingRequest.value = request.id
    await friendshipService.acceptFriendRequest(request.peer.username)
    ElMessage.success(`已接受 ${request.peer.nickname || request.peer.username} 的好友申请`)
    
    // 从列表中移除已处理的申请
    pendingRequests.value = pendingRequests.value.filter(req => req.id !== request.id)
  } catch (error: any) {
    console.error('接受好友申请失败:', error)
    const originalMessage = error.response?.data?.message || '接受好友申请失败'
    const friendlyMessage = translateError(originalMessage, 'friendship')
    ElMessage.error(friendlyMessage)
  } finally {
    processingRequest.value = null
  }
}

const declineRequest = async (request: Friendship) => {
  try {    processingRequest.value = request.id
    await friendshipService.declineFriendRequest(request.peer.username)
    ElMessage.success(`已拒绝 ${request.peer.nickname || request.peer.username} 的好友申请`)
    
    // 从列表中移除已处理的申请
    pendingRequests.value = pendingRequests.value.filter(req => req.id !== request.id)
  } catch (error: any) {
    console.error('拒绝好友申请失败:', error)
    const originalMessage = error.response?.data?.message || '拒绝好友申请失败'
    const friendlyMessage = translateError(originalMessage, 'friendship')
    ElMessage.error(friendlyMessage)
  } finally {
    processingRequest.value = null
  }
}

const formatTime = (timestamp: string): string => {
  return formatMessageTime(timestamp)
}

onMounted(() => {
  loadPendingRequests()
})

// 暴露刷新方法给父组件调用
defineExpose({
  refresh: loadPendingRequests
})
</script>

<style scoped>
.friend-requests {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.requests-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.requests-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.badge-text {
  font-size: 12px;
  color: #666;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #666;
  gap: 8px;
}

.no-requests {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.requests-list {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.request-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  gap: 12px;
}

.request-item:hover {
  background-color: #f8f9fa;
}

.request-info {
  flex: 1;
  min-width: 0;
}

.user-nickname {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-username {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.request-time {
  font-size: 11px;
  color: #999;
}

.request-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.request-actions .el-button {
  padding: 4px 12px;
  font-size: 12px;
}
</style>
