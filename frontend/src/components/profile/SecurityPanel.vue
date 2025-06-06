<!-- src/components/profile/SecurityPanel.vue -->
<template>
  <div class="security-panel">
    <div class="panel-header">
      <h2>账号安全</h2>
      <p>管理您的密码和账号安全设置</p>
    </div>

    <!-- 密码修改 -->
    <el-card class="password-card">
      <div class="password-section">
        <h3>修改密码</h3>
        <p class="section-description">
          定期更换密码有助于保护您的账号安全
        </p>

        <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-width="120px"
          @submit.prevent="handlePasswordChange"
        >
          <el-form-item label="当前密码" prop="currentPassword">
            <el-input
              v-model="passwordForm.currentPassword"
              type="password"
              placeholder="请输入当前密码"
              show-password
              clearable
            />
          </el-form-item>

          <el-form-item label="新密码" prop="newPassword">
            <el-input
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="请输入新密码"
              show-password
              clearable
            />
            <div class="password-strength">
              <div class="strength-label">密码强度：</div>
              <div class="strength-bar">
                <div 
                  class="strength-fill" 
                  :class="passwordStrengthClass"
                  :style="{ width: passwordStrengthWidth }"
                ></div>
              </div>
              <span class="strength-text">{{ passwordStrengthText }}</span>
            </div>
          </el-form-item>

          <el-form-item label="确认新密码" prop="confirmPassword">
            <el-input
              v-model="passwordForm.confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              show-password
              clearable
            />
          </el-form-item>

          <el-form-item>
            <el-button 
              type="primary" 
              @click="handlePasswordChange"
              :loading="changingPassword"
            >
              修改密码
            </el-button>
            <el-button @click="resetPasswordForm">
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 账号信息 -->
    <el-card class="account-info-card">
      <div class="account-info">
        <h3>账号信息</h3>
        <div class="info-list">
          <div class="info-item">
            <div class="info-label">用户名</div>
            <div class="info-value">{{ user?.username }}</div>
            <div class="info-action">
              <el-tag type="info" size="small">不可修改</el-tag>
            </div>
          </div>
          
          <div class="info-item">
            <div class="info-label">注册时间</div>
            <div class="info-value">{{ formatDate(user?.createdAt) }}</div>
            <div class="info-action"></div>
          </div>
          
          <div class="info-item">
            <div class="info-label">最后登录</div>
            <div class="info-value">{{ formatDate(user?.lastSeenAt) || '从未登录' }}</div>
            <div class="info-action"></div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 安全操作 -->
    <el-card class="security-actions-card">
      <div class="security-actions">
        <h3>安全操作</h3>
        <div class="action-list">
          <div class="action-item">
            <div class="action-info">
              <div class="action-title">强制下线所有设备</div>
              <div class="action-description">
                如果您怀疑账号被盗用，可以强制下线所有已登录的设备
              </div>
            </div>
            <el-button 
              type="warning" 
              @click="handleLogoutAllDevices"
              :loading="loggingOutAll"
            >
              强制下线
            </el-button>
          </div>
          
          <div class="action-item danger-item">
            <div class="action-info">
              <div class="action-title">删除账号</div>
              <div class="action-description">
                永久删除您的账号和所有相关数据，此操作不可恢复
              </div>
            </div>
            <el-button 
              type="danger" 
              @click="handleDeleteAccount"
              :loading="deletingAccount"
            >
              删除账号
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import type { User } from '../../types'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../store/auth'

interface Props {
  user: User | null
}

const props = defineProps<Props>()
const router = useRouter()
const authStore = useAuthStore()

const passwordFormRef = ref<FormInstance>()
const changingPassword = ref(false)
const loggingOutAll = ref(false)
const deletingAccount = ref(false)

// 密码表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 密码验证规则
const passwordRules: FormRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度应为 6-20 个字符', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value === passwordForm.currentPassword) {
          callback(new Error('新密码不能与当前密码相同'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 密码强度计算
const passwordStrength = computed(() => {
  const password = passwordForm.newPassword
  if (!password) return 0
  
  let score = 0
  
  // 长度检查
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  
  // 字符类型检查
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  
  return Math.min(score, 4)
})

const passwordStrengthClass = computed(() => {
  switch (passwordStrength.value) {
    case 0:
    case 1: return 'weak'
    case 2: return 'fair'
    case 3: return 'good'
    case 4: return 'strong'
    default: return 'weak'
  }
})

const passwordStrengthWidth = computed(() => {
  return `${(passwordStrength.value / 4) * 100}%`
})

const passwordStrengthText = computed(() => {
  switch (passwordStrength.value) {
    case 0:
    case 1: return '弱'
    case 2: return '一般'
    case 3: return '好'
    case 4: return '强'
    default: return '弱'
  }
})

// 格式化日期
const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 修改密码
const handlePasswordChange = async () => {
  if (!passwordFormRef.value) return
  
  try {
    const valid = await passwordFormRef.value.validate()
    if (!valid) return

    changingPassword.value = true
    
    // 这里应该调用修改密码的API
    // 由于后端还没有实现，暂时模拟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('密码修改成功，请重新登录')
    
    // 清空表单
    resetPasswordForm()
    
    // 可以选择强制用户重新登录
    // authStore.logout(router)
    
  } catch (error) {
    console.error('修改密码失败:', error)
    ElMessage.error('修改密码失败，请重试')
  } finally {
    changingPassword.value = false
  }
}

// 重置密码表单
const resetPasswordForm = () => {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  nextTick(() => {
    passwordFormRef.value?.clearValidate()
  })
}

// 强制下线所有设备
const handleLogoutAllDevices = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将强制下线所有已登录的设备，您需要重新登录。确认继续吗？',
      '确认操作',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loggingOutAll.value = true
    
    // 这里应该调用强制下线的API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('已强制下线所有设备')
    
    // 退出登录
    authStore.logout(router)
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('强制下线失败:', error)
      ElMessage.error('操作失败，请重试')
    }
  } finally {
    loggingOutAll.value = false
  }
}

// 删除账号
const handleDeleteAccount = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除您的账号和所有相关数据，且无法恢复。请确认您真的要删除账号吗？',
      '危险操作',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger'
      }
    )    // 二次确认
    await ElMessageBox.prompt(
      '请输入您的用户名以确认删除操作',
      '确认删除账号',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        inputValidator: (value) => {
          if (value !== props.user?.username) {
            return '用户名不匹配'
          }
          return true
        }
      }
    )

    deletingAccount.value = true
    
    // 这里应该调用删除账号的API
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('账号已删除')
    
    // 退出登录并跳转到登录页
    authStore.logout(router)
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除账号失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  } finally {
    deletingAccount.value = false
  }
}
</script>

<style scoped>
.security-panel {
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

.password-card,
.account-info-card,
.security-actions-card {
  margin-bottom: 24px;
}

.password-section h3,
.account-info h3,
.security-actions h3 {
  margin: 0 0 16px 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
  font-weight: 600;
}

.section-description {
  margin: 0 0 24px 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.password-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
}

.strength-label {
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background-color: var(--el-fill-color-light);
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 2px;
}

.strength-fill.weak {
  background-color: var(--el-color-danger);
}

.strength-fill.fair {
  background-color: var(--el-color-warning);
}

.strength-fill.good {
  background-color: var(--el-color-primary);
}

.strength-fill.strong {
  background-color: var(--el-color-success);
}

.strength-text {
  color: var(--el-text-color-regular);
  white-space: nowrap;
  min-width: 20px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  flex: 0 0 100px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.info-value {
  flex: 1;
  color: var(--el-text-color-primary);
}

.info-action {
  flex: 0 0 auto;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.action-item:hover {
  border-color: var(--el-border-color-hover);
  background-color: var(--el-fill-color-light);
}

.danger-item {
  border-color: var(--el-color-danger-light-5);
  background-color: var(--el-color-danger-light-9);
}

.danger-item:hover {
  border-color: var(--el-color-danger-light-3);
  background-color: var(--el-color-danger-light-8);
}

.action-info {
  flex: 1;
  margin-right: 20px;
}

.action-title {
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.action-description {
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.4;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .action-item {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .action-info {
    margin-right: 0;
  }
  
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .info-label {
    flex: none;
  }
}
</style>
