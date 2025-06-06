<template>
  <div class="sidebar-navigation">
    <div class="sidebar-left">
      <!-- 用户头像 -->
      <div class="user-avatar-section">
        <UserAvatarIcon />
      </div>
      
      <!-- 导航按钮 -->
      <div class="nav-tabs">
        <div 
          class="nav-tab" 
          :class="{ active: activeTab === 'chat' }"
          @click="setActiveTab('chat')"
          title="聊天"
        >
          <el-icon><ChatDotSquare /></el-icon>
        </div>
        <div 
          class="nav-tab" 
          :class="{ active: activeTab === 'add-friend' }"
          @click="setActiveTab('add-friend')"
          title="添加好友"
        >
          <el-icon><Plus /></el-icon>
        </div>        <div 
          class="nav-tab" 
          :class="{ active: activeTab === 'groups' }"
          @click="setActiveTab('groups')"
          title="群组"
        >
          <el-icon><Postcard /></el-icon>
        </div>
        <div 
          class="nav-tab" 
          :class="{ active: activeTab === 'group-invitations' }"
          @click="setActiveTab('group-invitations')"
          title="群组邀请"
        >
          <el-icon><Message /></el-icon>
          <el-badge v-if="invitationCount > 0" :value="invitationCount" class="request-badge" />
        </div>
        <div 
          class="nav-tab" 
          :class="{ active: activeTab === 'find-groups' }"
          @click="setActiveTab('find-groups')"
          title="查找群组"
        >
          <el-icon><Search /></el-icon>
        </div>
        <div 
          class="nav-tab" 
          :class="{ active: activeTab === 'friends' }"
          @click="setActiveTab('friends')"
          title="好友"
        >
          <el-icon><User /></el-icon>
        </div>
        <div 
          class="nav-tab" 
          :class="{ active: activeTab === 'friend-requests' }"
          @click="setActiveTab('friend-requests')"
          title="申请"
        >
          <el-icon><Bell /></el-icon>
          <el-badge v-if="requestCount > 0" :value="requestCount" class="request-badge" />
        </div>
      </div>
    </div>
    
    <div class="nav-content">
      <!-- 聊天界面 -->
      <div v-if="activeTab === 'chat'" class="tab-content">
        <div class="sidebar-header">
          <UserProfileHeader />
          <ConversationSearch />
        </div>
        <div class="conversation-list-wrapper">
          <ConversationList />
        </div>
      </div>
      
      <!-- 添加好友界面 -->
      <div v-else-if="activeTab === 'add-friend'" class="tab-content">
        <FriendSearch />
      </div>      <!-- 群组界面 -->
      <div v-else-if="activeTab === 'groups'" class="tab-content">
        <GroupList @start-chat="handleStartGroupChat" />
      </div>
      
      <!-- 好友列表界面 -->
      <div v-else-if="activeTab === 'friends'" class="tab-content">
        <FriendList @start-chat="handleStartChat" />
      </div>
        <!-- 好友申请界面 -->
      <div v-else-if="activeTab === 'friend-requests'" class="tab-content">
        <FriendRequests ref="friendRequestsRef" />
      </div>
      
      <!-- 群组邀请界面 -->
      <div v-else-if="activeTab === 'group-invitations'" class="tab-content">
        <GroupInvitationsList />
      </div>
      
      <!-- 查找群组界面 -->
      <div v-else-if="activeTab === 'find-groups'" class="tab-content">
        <PublicGroupsSearch />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ChatDotSquare, Plus, User, Bell, Postcard, Message, Search } from '@element-plus/icons-vue'
import { useChatStore } from '../../../store/chat'
import { useAuthStore } from '../../../store/auth'
import friendshipService from '../../../services/friendshipService'
import groupService from '../../../services/groupService'
import type { User as UserType } from '../../../types'

// 导入子组件
import UserProfileHeader from './UserProfileHeader.vue'
import ConversationSearch from './ConversationSearch.vue'
import ConversationList from './ConversationList.vue'
import FriendSearch from './FriendSearch.vue'
import FriendList from './FriendList.vue'
import FriendRequests from './FriendRequests.vue'
import GroupList from '../../group/GroupList.vue'
import GroupInvitationsList from '../../notification/GroupInvitationsList.vue'
import PublicGroupsSearch from '../../group/PublicGroupsSearch.vue'
import UserAvatarIcon from './UserAvatarIcon.vue'

const chatStore = useChatStore()
const friendRequestsRef = ref<InstanceType<typeof FriendRequests> | null>(null)
const requestCount = ref(0)
const invitationCount = ref(0)

const activeTab = ref<'chat' | 'add-friend' | 'groups' | 'friends' | 'friend-requests' | 'group-invitations' | 'find-groups'>('chat')

const setActiveTab = (tab: 'chat' | 'add-friend' | 'groups' | 'friends' | 'friend-requests' | 'group-invitations' | 'find-groups') => {
  activeTab.value = tab
  
  // 当切换到好友申请页面时，刷新数据
  if (tab === 'friend-requests' && friendRequestsRef.value) {
    friendRequestsRef.value.refresh()
  }
}

const handleStartChat = async (friend: UserType) => {
  try {
    // 切换到聊天标签
    activeTab.value = 'chat'
    
    // 创建或获取与好友的会话
    await chatStore.startPrivateChat(friend.id)
  } catch (error) {
    console.error('开始聊天失败:', error)
  }
}

const handleStartGroupChat = async (groupInfo: any) => {
  try {
    // 切换到聊天标签
    activeTab.value = 'chat'
    
    // 开始群聊
    await chatStore.startGroupChat(groupInfo.id)
  } catch (error) {
    console.error('开始群聊失败:', error)
  }
}

const loadRequestCount = async () => {
  try {
    const requests = await friendshipService.getFriendships('pending')
    // 计算发给我的申请数量（不是我发出的）
    const authStore = useAuthStore()
    const currentUserId = authStore.currentUser?.id
    
    if (currentUserId) {
      requestCount.value = requests.filter((req: any) => 
        req.action_user_id !== currentUserId && 
        req.status === 'pending'
      ).length
    } else {
      requestCount.value = 0
    }
  } catch (error) {
    console.error('加载好友申请数量失败:', error)
    requestCount.value = 0
  }
}

const loadInvitationCount = async () => {
  try {
    const invitations = await groupService.getPendingInvitations()
    invitationCount.value = invitations.length
  } catch (error) {
    console.error('加载群组邀请数量失败:', error)
    invitationCount.value = 0
  }
}

onMounted(() => {
  loadRequestCount()
  loadInvitationCount()
  
  // 每30秒刷新一次申请数量
  setInterval(() => {
    loadRequestCount()
    loadInvitationCount()
  }, 30000)
})
</script>

<style scoped>
.sidebar-navigation {
  height: 100%;
  display: flex;
  background: #f5f5f5;
}

.sidebar-left {
  width: 60px;
  background: #2c3e50;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
}

.user-avatar-section {
  padding: 8px;
  margin-bottom: 16px;
}

.nav-tabs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.nav-tab {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  margin: 0 8px;
  transition: all 0.2s;
  position: relative;
  color: #bdc3c7;
}

.nav-tab:hover {
  background-color: #34495e;
  color: #ecf0f1;
}

.nav-tab.active {
  background-color: #3498db;
  color: white;
}

.nav-tab .el-icon {
  font-size: 20px;
}

.request-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  z-index: 1;
}

.request-badge :deep(.el-badge__content) {
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
}

.nav-content {
  flex: 1;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  background: white;
}

.conversation-list-wrapper {
  flex: 1;
  overflow: hidden;
}
</style>
