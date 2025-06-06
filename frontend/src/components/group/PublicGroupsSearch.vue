<template>
  <div class="public-groups-search">
    <el-card header="搜索公开群组">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索群组名称或描述..."
          class="search-input"
          clearable
          @keyup.enter="searchGroups"
        >
          <template #append>
            <el-button 
              type="primary" 
              :icon="Search" 
              :loading="searching"
              @click="searchGroups"
            >
              搜索
            </el-button>
          </template>
        </el-input>
      </div>

      <div v-if="searching" class="loading-section">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在搜索群组...</span>
      </div>

      <div v-else-if="searchResults.length === 0 && hasSearched" class="no-results">
        <el-empty description="未找到匹配的公开群组" />
      </div>

      <div v-else class="search-results">
        <div 
          v-for="group in searchResults" 
          :key="group.id" 
          class="group-item"
        >          <el-avatar 
            :src="group.avatar_url || '/src/assets/default-avatar.png'" 
            :size="50"
          />
          <div class="group-info">
            <div class="group-name">{{ group.name }}</div>
            <div class="group-description">{{ group.description || '暂无描述' }}</div>
            <div class="group-meta">
              <span class="member-count">{{ group.member_count }} 成员</span>
              <span class="group-type">{{ getGroupTypeLabel(group.group_type) }}</span>
              <span class="owner">群主: {{ group.owner_nickname || group.owner_username }}</span>
            </div>
          </div>
          <div class="group-actions">
            <el-button
              v-if="group.userMembershipStatus === null"
              type="primary"
              size="small"
              :loading="joiningGroup === group.id"
              @click="joinGroup(group)"
            >
              {{ group.group_type === 'public_joinable' ? '加入群组' : '申请加入' }}
            </el-button>
            <el-tag
              v-else-if="group.userMembershipStatus === 'active'"
              type="success"
            >
              已加入
            </el-tag>
            <el-tag
              v-else-if="group.userMembershipStatus === 'invited'"
              type="warning"
            >
              待接受邀请
            </el-tag>
            <el-tag
              v-else-if="group.userMembershipStatus === 'pending'"
              type="info"
            >
              申请中
            </el-tag>
            <el-tag
              v-else
              type="info"
            >
              {{ group.userMembershipStatus }}
            </el-tag>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import groupService from '../../services/groupService'
import { translateError } from '../../utils/errorUtils'

interface PublicGroup {
  id: number
  name: string
  description?: string
  avatar_url?: string
  group_type: string
  owner_id: number
  owner_username: string
  owner_nickname?: string
  member_count: number
  userMembershipStatus?: string | null
  userRole?: string | null
  created_at: string
}

const searchQuery = ref('')
const searchResults = ref<PublicGroup[]>([])
const searching = ref(false)
const hasSearched = ref(false)
const joiningGroup = ref<number | null>(null)

const searchGroups = async () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  try {
    searching.value = true
    hasSearched.value = true
    const results = await groupService.searchPublicGroups(searchQuery.value.trim())
    searchResults.value = results
    
    if (results.length === 0) {
      ElMessage.info('未找到匹配的公开群组')
    }
  } catch (error: any) {
    console.error('搜索公开群组失败:', error)
    const originalMessage = error.response?.data?.message || '搜索公开群组失败'
    const friendlyMessage = translateError(originalMessage, 'group')
    ElMessage.error(friendlyMessage)
  } finally {
    searching.value = false
  }
}

const joinGroup = async (group: PublicGroup) => {
  try {
    joiningGroup.value = group.id
    
    if (group.group_type === 'public_joinable') {
      // 直接加入公开群组
      await groupService.respondToInvitation(group.id, 'accepted')
      ElMessage.success(`已成功加入群组 "${group.name}"`)
      group.userMembershipStatus = 'active'
      group.userRole = 'member'
    } else {
      // 申请加入只读公开群组（需要管理员批准）
      // 这里可能需要不同的API，暂时使用邀请API
      ElMessage.info(`已向群组 "${group.name}" 发送加入申请，等待管理员审核`)
      group.userMembershipStatus = 'pending'
    }
  } catch (error: any) {
    console.error('加入群组失败:', error)
    const originalMessage = error.response?.data?.message || '加入群组失败'
    const friendlyMessage = translateError(originalMessage, 'group')
    ElMessage.error(friendlyMessage)
  } finally {
    joiningGroup.value = null
  }
}

const getGroupTypeLabel = (groupType: string): string => {
  switch (groupType) {
    case 'public_joinable':
      return '公开群组'
    case 'public_readonly':
      return '只读群组'
    default:
      return '未知类型'
  }
}
</script>

<style scoped>
.public-groups-search {
  padding: 20px;
}

.search-section {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
}

.loading-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--el-text-color-secondary);
}

.loading-section .el-icon {
  margin-right: 8px;
  font-size: 18px;
}

.no-results {
  padding: 20px 0;
}

.search-results {
  max-height: 500px;
  overflow-y: auto;
}

.group-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  transition: background-color 0.3s;
}

.group-item:hover {
  background-color: var(--el-fill-color-light);
}

.group-item:last-child {
  border-bottom: none;
}

.group-info {
  flex: 1;
  margin-left: 12px;
  min-width: 0;
}

.group-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.group-description {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
  line-height: 1.4;  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.group-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.group-actions {
  margin-left: 12px;
}

.member-count {
  font-weight: 500;
}

.group-type {
  color: var(--el-color-primary);
}

.owner {
  color: var(--el-text-color-regular);
}
</style>
