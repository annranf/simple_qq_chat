<!-- src/components/group/GroupList.vue -->
<template>  <div class="group-list">
    <div class="group-header">
      <h3>我的群组</h3>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          创建群组
        </el-button>
        <el-button type="text" @click="refreshGroups">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 搜索和过滤区域 -->
    <div class="search-filter-section">
      <el-input
        v-model="searchQuery"
        placeholder="搜索群组..."
        size="small"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select 
        v-model="filterType" 
        placeholder="过滤" 
        size="small" 
        style="width: 100px; margin-left: 8px;"
        @change="handleFilter"
      >
        <el-option label="全部" value="all" />
        <el-option label="我管理的" value="managed" />
        <el-option label="有未读" value="unread" />
        <el-option label="最近活跃" value="active" />
      </el-select>
    </div>

    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      加载中...
    </div>    <div v-else-if="filteredGroups.length === 0 && groups.length > 0" class="no-groups">
      <div class="empty-icon">
        <el-icon><Search /></el-icon>
      </div>
      <p>未找到匹配的群组</p>
      <el-button type="text" @click="clearSearch">
        清除搜索条件
      </el-button>
    </div>

    <div v-else-if="groups.length === 0" class="no-groups">
      <div class="empty-icon">
        <el-icon><User /></el-icon>
      </div>
      <p>暂无群组</p>
      <el-button type="primary" @click="showCreateDialog = true">
        创建第一个群组
      </el-button>
    </div>

    <div v-else class="groups-container">
      <div 
        v-for="group in filteredGroups" 
        :key="group.id"
        class="group-item"
        @click="handleGroupClick(group)"
      >
        <el-avatar 
          :src="group.avatar_url || defaultGroupAvatar" 
          :size="40"
          class="group-avatar"
        >
          <el-icon><User /></el-icon>
        </el-avatar>
        <div class="group-info">
          <div class="group-name">{{ group.name }}</div>
          <div class="group-members">{{ group.active_member_count || 0 }} 位成员</div>
          <div v-if="group.last_message_content" class="group-last-message">
            {{ group.last_message_content }}
          </div>
        </div>
        <div class="group-actions">
          <el-badge 
            v-if="group.unread_count && group.unread_count > 0" 
            :value="group.unread_count" 
            :max="99"
            class="unread-badge"
          />
          <el-dropdown @command="handleGroupAction" trigger="click" @click.stop>
            <el-button type="text" size="small">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :command="{ action: 'info', group }">
                  群组信息
                </el-dropdown-item>
                <el-dropdown-item :command="{ action: 'chat', group }">
                  发送消息
                </el-dropdown-item>
                <el-dropdown-item 
                  v-if="canManageGroup(group)"
                  :command="{ action: 'manage', group }" 
                  divided
                >
                  管理群组
                </el-dropdown-item>
                <el-dropdown-item 
                  :command="{ action: 'leave', group }" 
                  divided
                  style="color: #f56c6c;"
                >
                  退出群组
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 创建群组对话框 -->
    <CreateGroupDialog 
      v-model:visible="showCreateDialog"
      @group-created="handleGroupCreated"
    />

    <!-- 群组信息对话框 -->
    <GroupInfoDialog 
      v-model:visible="showGroupInfo"
      :group="selectedGroup"
      @group-updated="handleGroupUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Loading, User, MoreFilled, Search } from '@element-plus/icons-vue'
import groupService from '../../services/groupService'
import { useChatStore } from '../../store/chat'
import CreateGroupDialog from './CreateGroupDialog.vue'
import GroupInfoDialog from './GroupInfoDialog.vue'

interface Group {
  id: number
  name: string
  avatar_url?: string
  last_message_content?: string
  last_message_timestamp?: string
  unread_count?: number
  active_member_count?: number
  owner_id?: number
  user_role_in_group?: string
}

const loading = ref(false)
const groups = ref<Group[]>([])
const filteredGroups = ref<Group[]>([])
const showCreateDialog = ref(false)
const showGroupInfo = ref(false)
const selectedGroup = ref<Group | null>(null)
const searchQuery = ref('')
const filterType = ref('all')
const chatStore = useChatStore()

const defaultGroupAvatar = '/src/assets/default-avatar.png'

onMounted(() => {
  loadGroups()
})

const loadGroups = async () => {
  try {
    loading.value = true
    groups.value = await groupService.getMyGroups()
    applyFilter()
  } catch (error) {
    console.error('加载群组列表失败:', error)
    ElMessage.error('加载群组列表失败')
  } finally {
    loading.value = false
  }
}

const applyFilter = () => {
  let filtered = [...groups.value]

  // 应用搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(group => 
      group.name.toLowerCase().includes(query) ||
      (group.last_message_content && group.last_message_content.toLowerCase().includes(query))
    )
  }

  // 应用类型过滤
  switch (filterType.value) {
    case 'managed':
      filtered = filtered.filter(group => 
        group.user_role_in_group === 'owner' || group.user_role_in_group === 'admin'
      )
      break
    case 'unread':
      filtered = filtered.filter(group => 
        group.unread_count && group.unread_count > 0
      )
      break
    case 'active':
      filtered = filtered.filter(group => 
        group.last_message_timestamp
      ).sort((a, b) => {
        const timeA = new Date(a.last_message_timestamp || 0).getTime()
        const timeB = new Date(b.last_message_timestamp || 0).getTime()
        return timeB - timeA
      })
      break
  }

  filteredGroups.value = filtered
}

const handleSearch = () => {
  applyFilter()
}

const handleFilter = () => {
  applyFilter()
}

const clearSearch = () => {
  searchQuery.value = ''
  filterType.value = 'all'
  applyFilter()
}

const refreshGroups = () => {
  loadGroups()
}

const handleGroupClick = (group: Group) => {
  // 开始群聊
  startGroupChat(group)
}

const handleGroupAction = (command: { action: string; group: Group }) => {
  const { action, group } = command
  
  switch (action) {
    case 'info':
      showGroupInfoDialog(group)
      break
    case 'chat':
      startGroupChat(group)
      break
    case 'manage':
      // TODO: 打开群组管理界面
      break
    case 'leave':
      handleLeaveGroup(group)
      break
  }
}

const startGroupChat = async (group: Group) => {
  try {
    await chatStore.startGroupChat(group.id)
    ElMessage.success(`已打开与群组 "${group.name}" 的聊天`)
  } catch (error) {
    console.error('启动群聊失败:', error)
    ElMessage.error('启动群聊失败，请重试')
  }
}

const showGroupInfoDialog = (group: Group) => {
  selectedGroup.value = group
  showGroupInfo.value = true
}

const canManageGroup = (group: Group): boolean => {
  return group.user_role_in_group === 'owner' || group.user_role_in_group === 'admin'
}

const handleLeaveGroup = async (group: Group) => {
  try {
    await ElMessageBox.confirm(
      `确定要退出群组 "${group.name}" 吗？退出后将无法接收群组消息。`,
      '退出群组',
      {
        confirmButtonText: '确定退出',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    await groupService.leaveGroup(group.id)
    
    ElMessage.success(`已退出群组 "${group.name}"`)
    await loadGroups() // 刷新列表
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('退出群组失败:', error)
      const message = (error as any).response?.data?.message || '退出群组失败，请重试'
      ElMessage.error(message)
    }
  }
}

const handleGroupCreated = (newGroup: Group) => {
  // 添加新群组到列表
  groups.value.unshift(newGroup)
  ElMessage.success(`群组 "${newGroup.name}" 创建成功`)
}

const handleGroupUpdated = (updatedGroup: Group) => {
  // 更新群组信息
  const index = groups.value.findIndex(g => g.id === updatedGroup.id)
  if (index !== -1) {
    groups.value[index] = { ...groups.value[index], ...updatedGroup }
  }
}
</script>

<style scoped>
.group-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.group-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-filter-section {
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
}

.loading, .no-groups {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #909399;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.groups-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.group-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin: 2px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  background: white;
}

.group-item:hover {
  background-color: #f0f2f5;
}

.group-avatar {
  margin-right: 12px;
  flex-shrink: 0;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-weight: 500;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-members {
  font-size: 12px;
  color: #909399;
  margin-bottom: 2px;
}

.group-last-message {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.unread-badge {
  margin-right: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .group-header {
    padding: 12px;
  }
  
  .group-item {
    padding: 10px 12px;
    margin: 1px 4px;
  }
  
  .group-name {
    font-size: 13px;
  }
  
  .group-members,
  .group-last-message {
    font-size: 11px;
  }
}
</style>
