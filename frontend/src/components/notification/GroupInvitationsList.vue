<!-- src/components/notification/GroupInvitationsList.vue -->
<template>
  <div class="group-invitations">
    <div class="invitations-header">
      <h3>群组邀请</h3>
      <el-badge :value="pendingInvitations.length" :hidden="pendingInvitations.length === 0" type="primary">
        <span class="badge-text">待处理</span>
      </el-badge>
    </div>
    
    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      加载中...
    </div>

    <div v-else-if="pendingInvitations.length === 0" class="no-invitations">
      <el-empty description="暂无群组邀请" :image-size="80" />
    </div>

    <div v-else class="invitations-list">
      <div 
        v-for="invitation in pendingInvitations" 
        :key="invitation.membershipId" 
        class="invitation-item"
      >        <el-avatar 
          :src="invitation.groupAvatarUrl || '/src/assets/default-avatar.png'" 
          :size="40"
        />
        <div class="invitation-info">
          <div class="group-name">{{ invitation.groupName }}</div>
          <div class="invitation-from">
            来自: {{ invitation.invitedBy.nickname || invitation.invitedBy.username }}
          </div>
          <div class="invitation-time">{{ formatTime(invitation.createdAt || '') }}</div>
        </div>
        <div class="invitation-actions">
          <el-button 
            type="primary" 
            size="small"
            :loading="processingInvitation === invitation.membershipId"
            @click="acceptInvitation(invitation)"
          >
            接受
          </el-button>
          <el-button 
            type="danger" 
            size="small" 
            plain
            :loading="processingInvitation === invitation.membershipId"
            @click="declineInvitation(invitation)"
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
import groupService from '../../services/groupService'
import { formatMessageTime } from '../../utils/timeUtils'
import { translateError } from '../../utils/errorUtils'

interface GroupInvitation {
  membershipId: number
  groupId: number
  groupName: string
  groupAvatarUrl?: string
  invitedBy: {
    id: number
    username: string
    nickname?: string
  }
  createdAt?: string
}

const pendingInvitations = ref<GroupInvitation[]>([])
const loading = ref(false)
const processingInvitation = ref<number | null>(null)

const loadPendingInvitations = async () => {
  try {
    loading.value = true
    const invitations = await groupService.getPendingInvitations()
    pendingInvitations.value = invitations
  } catch (error: any) {
    console.error('加载群组邀请失败:', error)
    ElMessage.error('加载群组邀请失败')
  } finally {
    loading.value = false
  }
}

const acceptInvitation = async (invitation: GroupInvitation) => {
  try {
    processingInvitation.value = invitation.membershipId
    await groupService.respondToInvitation(invitation.groupId, 'accepted')
    ElMessage.success(`已接受加入群组 "${invitation.groupName}"`)
    
    // 从列表中移除已处理的邀请
    pendingInvitations.value = pendingInvitations.value.filter(
      inv => inv.membershipId !== invitation.membershipId
    )
  } catch (error: any) {
    console.error('接受群组邀请失败:', error)
    const originalMessage = error.response?.data?.message || '接受群组邀请失败'
    const friendlyMessage = translateError(originalMessage, 'group')
    ElMessage.error(friendlyMessage)
  } finally {
    processingInvitation.value = null
  }
}

const declineInvitation = async (invitation: GroupInvitation) => {
  try {
    processingInvitation.value = invitation.membershipId
    await groupService.respondToInvitation(invitation.groupId, 'declined')
    ElMessage.success(`已拒绝加入群组 "${invitation.groupName}"`)
    
    // 从列表中移除已处理的邀请
    pendingInvitations.value = pendingInvitations.value.filter(
      inv => inv.membershipId !== invitation.membershipId
    )
  } catch (error: any) {
    console.error('拒绝群组邀请失败:', error)
    const originalMessage = error.response?.data?.message || '拒绝群组邀请失败'
    const friendlyMessage = translateError(originalMessage, 'group')
    ElMessage.error(friendlyMessage)
  } finally {
    processingInvitation.value = null
  }
}

const formatTime = (timestamp: string): string => {
  return formatMessageTime(timestamp)
}

onMounted(() => {
  loadPendingInvitations()
})

// 暴露刷新方法给父组件调用
defineExpose({
  refresh: loadPendingInvitations
})
</script>

<style scoped>
.group-invitations {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: white;
}

.invitations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.invitations-header h3 {
  margin: 0;
  font-size: 16px;
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
}

.no-invitations {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.invitations-list {
  flex: 1;
  overflow-y: auto;
}

.invitation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid #f0f0f0;
  background: #fafafa;
  transition: all 0.2s ease;
}

.invitation-item:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.invitation-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-weight: 500;
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.invitation-from {
  font-size: 12px;
  color: #909399;
  margin-bottom: 2px;
}

.invitation-time {
  font-size: 11px;
  color: #c0c4cc;
}

.invitation-actions {
  display: flex;
  gap: 8px;
}

.invitation-actions .el-button {
  min-width: 60px;
}
</style>
