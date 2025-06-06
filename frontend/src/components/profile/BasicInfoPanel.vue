<!-- src/components/profile/BasicInfoPanel.vue -->
<template>
  <div class="basic-info-panel">
    <div class="panel-header">
      <h2>基本信息</h2>
      <p>管理您的个人资料信息</p>
    </div>

    <el-card class="profile-card">
      <div class="current-info">
        <h3>当前信息</h3>
        <div class="info-display">
          <div class="avatar-display">
            <el-avatar 
              :size="80" 
              :src="user?.avatarUrl" 
              :icon="UserFilled"
            />
          </div>
          <div class="user-details">
            <div class="detail-item">
              <label>用户名：</label>
              <span>{{ user?.username }}</span>
            </div>
            <div class="detail-item">
              <label>昵称：</label>
              <span>{{ user?.nickname || '未设置' }}</span>
            </div>
            <div class="detail-item">
              <label>状态：</label>
              <el-tag :type="getStatusTagType(user?.status)">
                {{ getStatusText(user?.status) }}
              </el-tag>
            </div>
            <div class="detail-item">
              <label>注册时间：</label>
              <span>{{ formatDate(user?.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <el-card class="edit-card">
      <div class="edit-form">
        <h3>编辑信息</h3>
        <el-form 
          ref="formRef"
          :model="form" 
          :rules="rules" 
          label-width="80px"
          @submit.prevent="handleSubmit"
        >
          <el-form-item label="昵称" prop="nickname">
            <el-input
              v-model="form.nickname"
              placeholder="请输入昵称"
              maxlength="20"
              show-word-limit
              clearable
            />
          </el-form-item>

          <el-form-item label="状态" prop="status">
            <el-select v-model="form.status" placeholder="选择状态">
              <el-option label="在线" value="online" />
              <el-option label="离开" value="away" />
              <el-option label="忙碌" value="busy" />
              <el-option label="离线" value="offline" />
            </el-select>
          </el-form-item>

          <el-form-item label="个人描述" prop="bio">
            <el-input
              v-model="form.bio"
              type="textarea"
              :rows="4"
              placeholder="请输入个人描述"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <el-form-item>
            <el-button 
              type="primary" 
              @click="handleSubmit"
              :loading="updating"
            >
              保存更改
            </el-button>
            <el-button @click="resetForm">
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'
import type { User } from '../../types'
import userService from '../../services/userService'

interface Props {
  user: User | null
}

interface Emits {
  (e: 'user-updated', user: User): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref<FormInstance>()
const updating = ref(false)

// 表单数据
const form = reactive({
  nickname: '',
  status: 'online' as 'online' | 'away' | 'busy' | 'offline',
  bio: ''
})

// 表单验证规则
const rules: FormRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 1, max: 20, message: '昵称长度应为 1-20 个字符', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 监听用户数据变化，更新表单
watch(() => props.user, (newUser) => {
  if (newUser) {
    form.nickname = newUser.nickname || ''
    form.status = newUser.status || 'online'
    form.bio = newUser.bio || ''
  }
}, { immediate: true })

// 获取状态标签类型
const getStatusTagType = (status?: string) => {
  switch (status) {
    case 'online': return 'success'
    case 'away': return 'warning'
    case 'busy': return 'danger'
    case 'offline': return 'info'
    default: return 'info'
  }
}

// 获取状态文本
const getStatusText = (status?: string) => {
  switch (status) {
    case 'online': return '在线'
    case 'away': return '离开'
    case 'busy': return '忙碌'
    case 'offline': return '离线'
    default: return '未知'
  }
}

// 格式化日期
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '未知'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) return

    updating.value = true
    
    const updateData = {
      nickname: form.nickname.trim(),
      status: form.status
    }

    const updatedUser = await userService.updateCurrentUserProfile(updateData)
    emit('user-updated', updatedUser)
    
  } catch (error) {
    console.error('更新用户信息失败:', error)
    ElMessage.error('更新失败，请重试')
  } finally {
    updating.value = false
  }
}

// 重置表单
const resetForm = () => {
  if (props.user) {
    form.nickname = props.user.nickname || ''
    form.status = props.user.status || 'online'
    form.bio = props.user.bio || ''
  }
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}
</script>

<style scoped>
.basic-info-panel {
  max-width: 800px;
}

.panel-header {
  margin-bottom: 24px;
}

.panel-header h2 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
  font-size: 24px;
  font-weight: 600;
}

.panel-header p {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.profile-card, .edit-card {
  margin-bottom: 24px;
}

.current-info h3 {
  margin: 0 0 16px 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
  font-weight: 600;
}

.info-display {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.avatar-display {
  flex-shrink: 0;
}

.user-details {
  flex: 1;
}

.detail-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
}

.detail-item label {
  font-weight: 500;
  color: var(--el-text-color-regular);
  min-width: 80px;
}

.detail-item span {
  color: var(--el-text-color-primary);
}

.edit-form h3 {
  margin: 0 0 24px 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .info-display {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .user-details {
    width: 100%;
  }
  
  .detail-item {
    justify-content: center;
  }
}
</style>
