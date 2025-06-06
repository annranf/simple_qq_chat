<!-- src/components/group/GroupInfoDialog.vue -->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="群组信息"
    width="600px"
    :before-close="handleClose"
  >    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      加载中...
    </div>
    
    <div v-else-if="error" class="error-container">
      <el-icon><WarningFilled /></el-icon>
      <div class="error-message">{{ error }}</div>
      <el-button @click="loadGroupDetail">重新加载</el-button>
    </div>
    
    <div v-else-if="groupDetail" class="group-info">
      <!-- 群组基本信息 -->
      <div class="group-basic-info">
        <div class="group-header">
          <el-avatar
            :src="groupDetail.avatar_url || defaultGroupAvatar"
            :size="80"
            class="group-avatar"
          >
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="group-meta">
            <h3 class="group-name">{{ groupDetail.name }}</h3>
            <div class="group-stats">
              <span class="member-count">{{ groupDetail.active_member_count || 0 }} 位成员</span>
              <el-divider direction="vertical" />
              <span class="group-type">{{ getGroupTypeLabel(groupDetail.group_type) }}</span>
            </div>
            <div v-if="groupDetail.description" class="group-description">
              {{ groupDetail.description }}
            </div>
          </div>
        </div>

        <!-- 群组操作按钮 -->        <div class="group-actions">
          <el-button type="primary" @click="startGroupChat">
            <el-icon><ChatDotSquare /></el-icon>
            发送消息
          </el-button>
          <el-button v-if="canManageGroup" @click="showEditDialog = true">
            <el-icon><Edit /></el-icon>
            编辑信息
          </el-button>          <el-button v-if="canInviteMembers" @click="showInviteDialog = true">
            <el-icon><Plus /></el-icon>
            邀请成员
          </el-button>
          <el-button @click="refreshGroupInfo" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>

      <!-- 群组成员列表 -->
      <el-divider>群组成员</el-divider>
      <div class="members-section">
        <div v-if="loadingMembers" class="loading-members">
          <el-icon class="is-loading"><Loading /></el-icon>
          加载成员中...
        </div>
          <div v-else class="members-list">
          <div
            v-for="member in members"
            :key="member.user_id"
            class="member-item"
          >
            <el-avatar
              :src="member.user_avatar"
              :size="36"
              class="member-avatar"
            >
              <el-icon><User /></el-icon>
            </el-avatar>
            <div class="member-info">
              <div class="member-name">
                {{ member.nickname_in_group || member.user_nickname || member.user_username }}
              </div>
              <div class="member-role">{{ getRoleLabel(member.role) }}</div>
            </div>            <div class="member-actions">
              <el-tag
                :type="member.membership_status === 'active' ? 'success' : 'info'"
                size="small"
              >
                {{ member.membership_status === 'active' ? '活跃' : '邀请中' }}
              </el-tag>
              <el-dropdown
                v-if="canManageMember(member)"
                @command="handleMemberAction"
                trigger="click"
              >
                <el-button type="text" size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-if="member.role !== 'owner'"
                      :command="{ action: 'promote', member }"
                    >
                      设为管理员
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="member.role === 'admin'"
                      :command="{ action: 'demote', member }"
                    >
                      取消管理员
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="member.role !== 'owner'"
                      :command="{ action: 'remove', member }"
                      divided
                      style="color: #f56c6c;"
                    >
                      移出群组
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑群组信息对话框 -->
    <EditGroupDialog
      v-model:visible="showEditDialog"
      :group="groupDetail"
      @group-updated="handleGroupUpdated"
    />

    <!-- 邀请成员对话框 -->
    <InviteUserDialog
      v-model:visible="showInviteDialog"
      :group-id="groupDetail?.id"
      @user-invited="handleUserInvited"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  User, 
  Loading, 
  ChatDotSquare, 
  Edit, 
  Plus, 
  MoreFilled,
  WarningFilled,
  Refresh
} from '@element-plus/icons-vue'
import { useAuthStore } from '../../store/auth'
import { useChatStore } from '../../store/chat'
import groupService, { 
  type GroupDetail, 
  type GroupMember 
} from '../../services/groupService'
import EditGroupDialog from './EditGroupDialog.vue'
import InviteUserDialog from './InviteUserDialog.vue'

interface Props {
  visible: boolean
  group: GroupDetail | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'group-updated', group: GroupDetail): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const authStore = useAuthStore()
const chatStore = useChatStore()
const dialogVisible = ref(false)
const loading = ref(false)
const loadingMembers = ref(false)
const error = ref('')
const groupDetail = ref<GroupDetail | null>(null)
const members = ref<GroupMember[]>([])
const showEditDialog = ref(false)
const showInviteDialog = ref(false)

const defaultGroupAvatar = '/src/assets/default-avatar.png'

// 监听 visible 变化
watch(
  () => props.visible,
  (newValue) => {
    dialogVisible.value = newValue
    if (newValue && props.group) {
      loadGroupDetail()
    }
  },
  { immediate: true }
)

// 监听 dialogVisible 变化
watch(dialogVisible, (newValue) => {
  emit('update:visible', newValue)
})

// 计算属性
const canManageGroup = computed(() => {
  return groupDetail.value?.user_role_in_group === 'owner' || 
         groupDetail.value?.user_role_in_group === 'admin'
})

const canInviteMembers = computed(() => {
  return canManageGroup.value || groupDetail.value?.group_type !== 'private'
})

const loadGroupDetail = async () => {
  if (!props.group?.id) return
  
  try {
    loading.value = true
    error.value = ''
    
    // 加载群组详细信息
    groupDetail.value = await groupService.getGroupDetails(props.group.id)
    
    // 加载成员列表
    await loadMembers()
    
  } catch (err: any) {
    console.error('加载群组信息失败:', err)
    error.value = err.response?.data?.message || '加载群组信息失败，请重试'
  } finally {
    loading.value = false
  }
}

const loadMembers = async () => {
  if (!groupDetail.value?.id) return
  
  try {
    loadingMembers.value = true
    members.value = await groupService.getGroupMembers(groupDetail.value.id)
  } catch (error) {
    console.error('加载成员列表失败:', error)
    ElMessage.error('加载成员列表失败')
  } finally {
    loadingMembers.value = false
  }
}

const handleClose = () => {
  dialogVisible.value = false
}

const refreshGroupInfo = async () => {
  await loadGroupDetail()
  ElMessage.success('信息已刷新')
}

const startGroupChat = async () => {
  if (!groupDetail.value) return
  
  try {
    // 关闭对话框
    handleClose()
    
    // 启动群聊
    await chatStore.startGroupChat(groupDetail.value.id)
    
    ElMessage.success('已切换到群聊')
  } catch (error) {
    console.error('开始群聊失败:', error)
    ElMessage.error('开始群聊失败，请重试')
  }
}

const getGroupTypeLabel = (type?: string): string => {
  const typeMap: Record<string, string> = {
    'private': '私有群组',
    'public_readonly': '公开群组（只读）',
    'public_joinable': '公开群组（可加入）'
  }
  return typeMap[type || ''] || '未知类型'
}

const getRoleLabel = (role: string): string => {
  const roleMap: Record<string, string> = {
    'owner': '群主',
    'admin': '管理员',
    'member': '成员'
  }
  return roleMap[role] || '未知角色'
}

const canManageMember = (member: GroupMember): boolean => {
  const currentUserId = authStore.currentUser?.id
  const userRole = groupDetail.value?.user_role_in_group
  
  // 不能管理自己
  if (member.user_id === currentUserId) return false
  
  // 只有群主和管理员可以管理成员
  if (userRole !== 'owner' && userRole !== 'admin') return false
  
  // 群主可以管理所有人，管理员只能管理普通成员
  if (userRole === 'owner') return true
  if (userRole === 'admin' && member.role === 'member') return true
  
  return false
}

const handleMemberAction = async (command: { action: string; member: GroupMember }) => {
  const { action, member } = command
  
  try {
    switch (action) {
      case 'promote':
        await handlePromoteMember(member)
        break
      case 'demote':
        await handleDemoteMember(member)
        break
      case 'remove':
        await handleRemoveMember(member)
        break
    }
  } catch (error) {
    console.error(`执行操作 ${action} 失败:`, error)
    ElMessage.error('操作失败，请重试')
  }
}

const handlePromoteMember = async (member: GroupMember) => {
  await ElMessageBox.confirm(
    `确定要将 "${member.user_nickname || member.user_username}" 设为管理员吗？`,
    '设为管理员',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  )
  
  if (!groupDetail.value) return
  
  await groupService.updateMemberRole(groupDetail.value.id, member.user_id, 'admin')
  ElMessage.success('设置成功')
  await loadMembers()
}

const handleDemoteMember = async (member: GroupMember) => {
  await ElMessageBox.confirm(
    `确定要取消 "${member.user_nickname || member.user_username}" 的管理员权限吗？`,
    '取消管理员',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
  
  if (!groupDetail.value) return
  
  await groupService.updateMemberRole(groupDetail.value.id, member.user_id, 'member')
  ElMessage.success('取消成功')
  await loadMembers()
}

const handleRemoveMember = async (member: GroupMember) => {
  await ElMessageBox.confirm(
    `确定要将 "${member.user_nickname || member.user_username}" 移出群组吗？此操作无法撤销。`,
    '移出群组',
    {
      confirmButtonText: '确定移出',
      cancelButtonText: '取消',
      type: 'error',
      confirmButtonClass: 'el-button--danger'
    }
  )
    if (!groupDetail.value) return
  
  await groupService.removeMember(groupDetail.value.id, member.user_id)
  ElMessage.success('移出成功')
  await loadMembers()
}

const handleGroupUpdated = (updatedGroup: GroupDetail) => {
  groupDetail.value = { ...groupDetail.value, ...updatedGroup }
  emit('group-updated', updatedGroup)
}

const handleUserInvited = () => {
  ElMessage.success('邀请发送成功')
  loadMembers()
}
</script>

<style scoped>
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #909399;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #f56c6c;
  text-align: center;
}

.error-container .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-message {
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.5;
}

.group-info {
  max-height: 70vh;
  overflow-y: auto;
}

.group-basic-info {
  margin-bottom: 24px;
}

.group-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.group-avatar {
  flex-shrink: 0;
}

.group-meta {
  flex: 1;
  min-width: 0;
}

.group-name {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.group-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
}

.group-description {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.group-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.members-section {
  max-height: 400px;
  overflow-y: auto;
}

.loading-members {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #909399;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: #f8f9fa;
  transition: background-color 0.2s;
}

.member-item:hover {
  background: #e9ecef;
}

.member-avatar {
  margin-right: 12px;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role {
  font-size: 12px;
  color: #666;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .group-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .group-actions {
    justify-content: center;
  }
  
  .member-item {
    padding: 8px;
  }
  
  .member-name {
    font-size: 14px;
  }
}
</style>
