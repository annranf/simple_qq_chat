<template>
  <div class="friend-list">
    <div class="friend-header">
      <h3>好友列表</h3>
      <el-button type="text" @click="refreshFriends">
        <el-icon><Refresh /></el-icon>
      </el-button>
    </div>

    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      加载中...
    </div>

    <div v-else-if="friends.length === 0" class="no-friends">
      暂无好友
    </div>

    <div v-else class="friends-container">
      <div 
        v-for="friendship in friends" 
        :key="friendship.id"
        class="friend-item"
      >
        <el-avatar 
          :src="friendship.peer.avatarUrl || defaultAvatar" 
          :size="40"
        />
        <div class="friend-info">
          <div class="friend-nickname">{{ friendship.peer.nickname || friendship.peer.username }}</div>
          <div class="friend-username">@{{ friendship.peer.username }}</div>
          <div class="friend-status" :class="friendship.peer.status">
            {{ friendship.peer.status === 'online' ? '在线' : '离线' }}
          </div>
        </div>
        <el-dropdown @command="handleCommand">
          <el-button type="text" size="small">
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :command="{ action: 'chat', friend: friendship.peer }">
                发送消息
              </el-dropdown-item>
              <el-dropdown-item 
                :command="{ action: 'remove', friend: friendship.peer }" 
                divided
              >
                删除好友
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 确认删除对话框 -->
    <el-dialog
      v-model="showRemoveDialog"
      title="删除好友"
      width="400px"
      center
    >
      <p>确定要删除好友 <strong>{{ friendToRemove?.nickname || friendToRemove?.username }}</strong> 吗？</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showRemoveDialog = false">取消</el-button>
          <el-button type="danger" @click="confirmRemoveFriend" :loading="removing">
            删除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh, Loading, MoreFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import friendshipService from '../../../services/friendshipService'
import type { User } from '../../../types'
import defaultAvatar from '../../../assets/default-avatar.png'
import { translateError } from '../../../utils/errorUtils'

interface FriendshipWithPeer {
  id: number
  status: string
  peer: User
}

const friends = ref<FriendshipWithPeer[]>([])
const loading = ref(false)
const showRemoveDialog = ref(false)
const friendToRemove = ref<User | null>(null)
const removing = ref(false)

const emit = defineEmits(['start-chat'])

onMounted(() => {
  loadFriends()
})

const loadFriends = async () => {
  try {
    loading.value = true
    friends.value = await friendshipService.listFriends()
  } catch (error) {
    console.error('加载好友列表失败:', error)
    ElMessage.error('加载好友列表失败')
  } finally {
    loading.value = false
  }
}

const refreshFriends = () => {
  loadFriends()
}

const handleCommand = (command: { action: string; friend: User }) => {
  if (command.action === 'chat') {
    startChat(command.friend)
  } else if (command.action === 'remove') {
    showRemoveFriendDialog(command.friend)
  }
}

const startChat = (friend: User) => {
  // 创建或切换到与该好友的私聊
  emit('start-chat', friend)
}

const showRemoveFriendDialog = (friend: User) => {
  friendToRemove.value = friend
  showRemoveDialog.value = true
}

const confirmRemoveFriend = async () => {
  if (!friendToRemove.value) return
  
  try {
    removing.value = true
    await friendshipService.removeFriend(friendToRemove.value.id)
    
    ElMessage.success(`已删除好友 ${friendToRemove.value.nickname || friendToRemove.value.username}`)
    
    // 从列表中移除
    friends.value = friends.value.filter(f => f.peer.id !== friendToRemove.value!.id)
    
    showRemoveDialog.value = false
    friendToRemove.value = null  } catch (error: any) {
    console.error('删除好友失败:', error)
    const originalMessage = error.response?.data?.message || '删除好友失败'
    const friendlyMessage = translateError(originalMessage, 'friendship')
    ElMessage.error(friendlyMessage)
  } finally {
    removing.value = false
  }
}
</script>

<style scoped>
.friend-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.friend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.friend-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #666;
  gap: 8px;
}

.no-friends {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
}

.friends-container {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.friend-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.friend-item:hover {
  background-color: #f8f9fa;
}

.friend-info {
  flex: 1;
  margin-left: 12px;
  min-width: 0;
}

.friend-nickname {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.friend-username {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.friend-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  display: inline-block;
}

.friend-status.online {
  background-color: #e8f5e8;
  color: #52c41a;
}

.friend-status.offline {
  background-color: #f0f0f0;
  color: #999;
}
</style>
