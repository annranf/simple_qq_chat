<template>
  <div class="register-container">
    <div class="register-wrapper">
      <div class="register-header">
        <div class="logo">
          <el-icon :size="48" color="#409EFF">
            <ChatDotRound />
          </el-icon>
        </div>
        <h1 class="title">加入QQ聊天</h1>
        <p class="subtitle">创建您的账户，开始聊天之旅</p>
      </div>
      
      <el-card class="register-card" shadow="hover">        <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          size="large"
          @submit.prevent="handleRegister"
        >
          <el-form-item prop="username" class="form-item-spacing">
            <el-input
              v-model="registerForm.username"
              placeholder="用户名（3-20位字符）"
              clearable
              :prefix-icon="User"
              maxlength="20"
              show-word-limit
            />
          </el-form-item>
          
          <el-form-item prop="nickname" class="form-item-spacing">
            <el-input
              v-model="registerForm.nickname"
              placeholder="昵称（可选）"
              clearable
              :prefix-icon="Avatar"
              maxlength="30"
              show-word-limit
            />
          </el-form-item>
          
          <el-row :gutter="16" class="password-row">
            <el-col :xs="24" :sm="12">
              <el-form-item prop="password" class="form-item-spacing">
                <el-input
                  v-model="registerForm.password"
                  type="password"
                  placeholder="密码（至少6位）"
                  show-password
                  clearable
                  :prefix-icon="Lock"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item prop="confirmPassword" class="form-item-spacing">
                <el-input
                  v-model="registerForm.confirmPassword"
                  type="password"
                  placeholder="确认密码"
                  show-password
                  clearable
                  :prefix-icon="Lock"
                />
              </el-form-item>
            </el-col>
          </el-row>          
          <el-form-item prop="bio" class="form-item-spacing">
            <el-input
              v-model="registerForm.bio"
              type="textarea"
              placeholder="个人简介（可选，介绍一下自己）"
              :rows="3"
              maxlength="200"
              show-word-limit
              resize="none"
            />
          </el-form-item>

          <el-form-item v-if="registerError" class="error-message">
            <el-alert 
              type="error" 
              :title="registerError" 
              show-icon 
              :closable="false"
              effect="dark"
            />
          </el-form-item>
          
          <el-form-item class="terms-row">
            <el-checkbox v-model="agreeTerms" size="small">
              我已阅读并同意
              <el-link type="primary" class="terms-link">《用户协议》</el-link>
              和
              <el-link type="primary" class="terms-link">《隐私政策》</el-link>
            </el-checkbox>
          </el-form-item>

          <el-form-item class="register-button-wrapper">
            <el-button
              type="primary"
              native-type="submit"
              :loading="isLoading"
              :disabled="!agreeTerms"
              size="large"
              class="register-button"
            >
              <span v-if="!isLoading">立即注册</span>
              <span v-else>注册中...</span>
            </el-button>
          </el-form-item>
        </el-form>
        
        <div class="divider">
          <span>或</span>
        </div>
        
        <div class="login-link">
          已有账户？ 
          <router-link to="/login" class="login-btn">立即登录</router-link>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock, Avatar, ChatDotRound } from '@element-plus/icons-vue'
import authService from '../services/authService'

const router = useRouter()

const registerFormRef = ref<FormInstance>()
const registerError = ref<string | null>(null)
const isLoading = ref(false)
const agreeTerms = ref(false)

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  nickname: '',
  bio: '',
})

// 自定义验证函数
const validateUsername = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('请输入用户名'))
  } else if (value.length < 3) {
    callback(new Error('用户名长度不能少于3位'))
  } else if (value.length > 20) {
    callback(new Error('用户名长度不能超过20位'))
  } else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(value)) {
    callback(new Error('用户名只能包含字母、数字、下划线和中文'))
  } else {
    callback()
  }
}

const validatePassword = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('请输入密码'))
  } else if (value.length < 6) {
    callback(new Error('密码长度不能少于6位'))
  } else if (value.length > 50) {
    callback(new Error('密码长度不能超过50位'))
  } else {
    // 如果确认密码已填写，重新验证确认密码
    if (registerForm.confirmPassword) {
      registerFormRef.value?.validateField('confirmPassword')
    }
    callback()
  }
}

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const validateNickname = (_rule: any, value: string, callback: any) => {
  if (value && value.length > 30) {
    callback(new Error('昵称长度不能超过30位'))
  } else {
    callback()
  }
}

const validateBio = (_rule: any, value: string, callback: any) => {
  if (value && value.length > 200) {
    callback(new Error('个人简介长度不能超过200字'))
  } else {
    callback()
  }
}

const registerRules = reactive<FormRules>({
  username: [{ validator: validateUsername, trigger: 'blur' }],
  password: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }],
  nickname: [{ validator: validateNickname, trigger: 'blur' }],
  bio: [{ validator: validateBio, trigger: 'blur' }],
})

const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  if (!agreeTerms.value) {
    ElMessage.warning('请先同意用户协议和隐私政策')
    return
  }
  
  try {
    const valid = await registerFormRef.value.validate()
    if (valid) {
      isLoading.value = true
      registerError.value = null
      
      try {
        const response = await authService.register({
          username: registerForm.username,
          password: registerForm.password,
          nickname: registerForm.nickname || undefined,
          bio: registerForm.bio || undefined,
        })

        ElMessage.success(response.message || '注册成功！请登录。')
        router.push({ name: 'Login' })
      } catch (error: any) {
        console.error('Registration failed:', error)
        registerError.value = error.response?.data?.message || error.message || '注册失败，请重试。'
        ElMessage.error(registerError.value || '注册失败，请重试。')
      } finally {
        isLoading.value = false
      }
    }
  } catch (error) {
    ElMessage.error('请检查输入项！')
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.register-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
  opacity: 0.3;
}

.register-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 520px; /* 增加宽度以容纳更好的布局 */
}

.register-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  margin-bottom: 1rem;
}

.title {
  color: white;
  font-size: 2.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  margin: 0;
  font-weight: 300;
}

.register-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 2.5rem; /* 增加内边距 */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.error-message {
  margin-bottom: 1rem;
}

.error-message .el-alert {
  border-radius: 8px;
}

.terms-row {
  margin-bottom: 2rem; /* 增加与按钮的间距 */
}

.terms-row :deep(.el-checkbox__label) {
  font-size: 0.9rem;
  color: #606266;
  line-height: 1.4;
}

.terms-link {
  font-size: 0.9rem;
  margin: 0 2px;
}

.register-button-wrapper {
  margin-bottom: 1rem;
}

.register-button {
  width: 100%;
  height: 48px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  background: linear-gradient(135deg, #409EFF 0%, #3b82f6 100%);
  border: none;
  transition: all 0.3s ease;
}

.register-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
}

.register-button:active:not(:disabled) {
  transform: translateY(0);
}

.register-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.divider {
  text-align: center;
  margin: 1.5rem 0;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e4e7ed;
}

.divider span {
  background: white;
  padding: 0 1rem;
  color: #909399;
  font-size: 0.9rem;
}

.login-link {
  text-align: center;
  color: #606266;
  font-size: 0.9rem;
}

.login-btn {
  color: #409EFF;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

.login-btn:hover {
  color: #3b82f6;
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .register-wrapper {
    max-width: 100%;
  }
    .register-card {
    padding: 2rem; /* 中等屏幕减少内边距 */
  }
  
  .title {
    font-size: 2rem;
  }
  
  /* 在小屏幕上，密码字段堆叠显示 */
  .password-row :deep(.el-col-12) {
    width: 100% !important;
    margin-bottom: 0;
  }
  
  .password-row :deep(.el-col-12:first-child) {
    margin-bottom: 1rem;
  }
}

@media (max-width: 480px) {
  .register-container {
    padding: 10px;
  }
  
  .register-card {
    padding: 1rem;
  }
  
  .title {
    font-size: 1.8rem;
  }
  
  .subtitle {
    font-size: 0.9rem;
  }
}

/* 输入框样式优化 */
:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

:deep(.el-textarea__inner) {
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

:deep(.el-textarea__inner:hover) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

:deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

/* 表单项间距优化 */
.form-item-spacing {
  margin-bottom: 1.8rem;
}

.password-row {
  margin-bottom: 1.2rem;
}

.password-row .form-item-spacing {
  margin-bottom: 0;
}

:deep(.el-form-item) {
  margin-bottom: 1.5rem;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

/* 确保在桌面端密码字段有合适间距 */
@media (min-width: 769px) {
  .password-row :deep(.el-col) {
    padding-left: 8px;
    padding-right: 8px;
  }
  
  .password-row :deep(.el-col:first-child) {
    padding-left: 0;
  }
  
  .password-row :deep(.el-col:last-child) {
    padding-right: 0;
  }
}

/* 字数统计样式 */
:deep(.el-input__count) {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.8rem;
}
</style>