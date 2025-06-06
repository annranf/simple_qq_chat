<!-- src/components/group/InviteUserDialog.vue -->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="邀请好友加入群组"
    width="500px"
    :before-close="handleClose"
  >
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>
    
    <div v-else-if="error" class="error-container">
      <el-alert
        :title="error"
        type="error"
        :closable="false"
        show-icon
      />
      <el-button @click="loadFriends" type="primary" style="margin-top: 12px;">
        重新加载
      </el-button>
    </div>

    <div v-else class="friend-selection">
      <div class="search-box">
        <el-input
          v-model="searchQuery"
          placeholder="搜索好友..."
          clearable
          prefix-icon="Search"
        />
      </div>

      <div class="friend-list">
        <div v-if="filteredFriends.length === 0" class="empty-state">
          <el-empty description="没有可邀请的好友" :image-size="80" />
        </div>
        
        <div v-else class="friend-items">
          <div
            v-for="friend in filteredFriends"
            :key="friend.peer.id"
            class="friend-item"
            :class="{ selected: selectedFriends.has(friend.peer.id) }"
            @click="toggleFriendSelection(friend.peer)"
          >
            <el-checkbox
              :model-value="selectedFriends.has(friend.peer.id)"
              @change="toggleFriendSelection(friend.peer)"
              @click.stop
            />            <el-avatar 
              :src="friend.peer.avatarUrl" 
              :size="40"
              class="friend-avatar"
            >
              <el-icon><User /></el-icon>
            </el-avatar>
            <div class="friend-info">
              <div class="friend-name">{{ friend.peer.nickname || friend.peer.username }}</div>
              <div class="friend-username">@{{ friend.peer.username }}</div>
            </div>
            <div v-if="friend.peer.status === 'online'" class="online-indicator" />
          </div>
        </div>
      </div>
      
      <div class="invite-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>选择要邀请的好友，系统将向他们发送群组邀请</span>
      </div>
    </div>    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleSubmit"
          :loading="inviting"
          :disabled="selectedFriends.size === 0"
        >
          邀请选中的好友 ({{ selectedFriends.size }})
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElDialog, ElButton, ElInput, ElCheckbox, ElAvatar, ElIcon, ElEmpty, ElAlert, ElSkeleton } from 'element-plus'
import { User, InfoFilled } from '@element-plus/icons-vue'
import groupService from '../../services/groupService'
import friendshipService from '../../services/friendshipService'
import type { User as UserType } from '../../types'

interface FriendshipWithPeer {
  id: number
  status: 'pending' | 'accepted' | 'declined' | 'blocked'
  peer: UserType
}

interface Props {
  visible: boolean
  groupId?: number
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'user-invited'): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false
})

const emit = defineEmits<Emits>()

// 响应式状态
const dialogVisible = ref(false)
const loading = ref(false)
const inviting = ref(false)
const error = ref('')
const searchQuery = ref('')
const friends = ref<FriendshipWithPeer[]>([])
const selectedFriends = ref<Set<number>>(new Set())

// 计算属性
const filteredFriends = computed(() => {
  if (!searchQuery.value.trim()) {
    return friends.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return friends.value.filter(friend => 
    friend.peer.username.toLowerCase().includes(query) ||
    friend.peer.nickname?.toLowerCase().includes(query)
  )
})

// 监听 visible 变化
watch(
  () => props.visible,
  (newValue) => {
    dialogVisible.value = newValue
    if (newValue) {
      resetForm()
      loadFriends()
    }
  },
  { immediate: true }
)

// 监听 dialogVisible 变化
watch(dialogVisible, (newValue) => {
  emit('update:visible', newValue)
})

const resetForm = () => {
  searchQuery.value = ''
  selectedFriends.value.clear()
  error.value = ''
}

const loadFriends = async () => {
  try {
    loading.value = true
    error.value = ''
    
    // 获取已接受的好友列表
    const friendships = await friendshipService.getFriendships('accepted')
    friends.value = friendships
    
  } catch (err: any) {
    console.error('加载好友列表失败:', err)
    error.value = '加载好友列表失败，请重试'
  } finally {
    loading.value = false
  }
}

const toggleFriendSelection = (friend: UserType) => {
  if (selectedFriends.value.has(friend.id)) {
    selectedFriends.value.delete(friend.id)
  } else {
    selectedFriends.value.add(friend.id)
  }
}

const handleClose = () => {
  dialogVisible.value = false
}

const handleSubmit = async () => {
  if (!props.groupId || selectedFriends.value.size === 0) return
  
  try {
    inviting.value = true
    
    // 获取选中好友的用户名
    const selectedUsernames = friends.value
      .filter(friend => selectedFriends.value.has(friend.peer.id))
      .map(friend => friend.peer.username)
    
    // 批量发送邀请
    const invitePromises = selectedUsernames.map(username => 
      groupService.inviteUser(props.groupId!, { username })
    )
    
    await Promise.all(invitePromises)
    
    ElMessage.success(`已向 ${selectedUsernames.length} 位好友发送邀请`)
    emit('user-invited')
    
    dialogVisible.value = false
    
  } catch (error: any) {
    console.error('发送邀请失败:', error)
    
    // 处理常见的错误信息
    let message = '发送邀请失败'
    const errorMsg = error.response?.data?.message || ''
    
    if (errorMsg.includes('not found')) {
      message = '部分用户不存在'
    } else if (errorMsg.includes('already')) {
      message = '部分用户已在群组中或已被邀请'
    } else if (errorMsg.includes('permission')) {
      message = '您没有邀请用户的权限'
    } else if (errorMsg) {
      message = errorMsg
    }
    
    ElMessage.error(message)
  } finally {
    inviting.value = false
  }
}
</script>

<style scoped>
.loading-container {
  padding: 20px;
}

.error-container {
  padding: 20px;
  text-align: center;
}

.friend-selection {
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

.search-box {
  margin-bottom: 16px;
}

.friend-list {
  flex: 1;
  min-height: 200px;
  max-height: 350px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.friend-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.friend-item:hover {
  background-color: #f5f7fa;
}

.friend-item.selected {
  background-color: #e8f4fd;
  border-color: #409eff;
}

.friend-avatar {
  flex-shrink: 0;
}

.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  font-weight: 500;
  font-size: 14px;
  color: #303133;
  margin-bottom: 2px;
}

.friend-username {
  font-size: 12px;
  color: #909399;
}

.online-indicator {
  width: 8px;
  height: 8px;
  background-color: #67c23a;
  border-radius: 50%;
  flex-shrink: 0;
}

.invite-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  color: #1e40af;
  font-size: 13px;
  line-height: 1.5;
  margin-top: 16px;
}

.invite-tip .el-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .friend-item {
    padding: 10px;
  }
  
  .invite-tip {
    font-size: 12px;
  }
}

/* 滚动条样式 */
.friend-list::-webkit-scrollbar {
  width: 6px;
}

.friend-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.friend-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.friend-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
