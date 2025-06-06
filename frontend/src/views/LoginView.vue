<template>
  <div class="login-container">
    <div class="login-wrapper">
      <div class="login-header">
        <div class="logo">
          <el-icon :size="48" color="#409EFF">
            <ChatDotRound />
          </el-icon>
        </div>
        <h1 class="title">QQ聊天</h1>
        <p class="subtitle">欢迎回来，请登录您的账户</p>
      </div>
      
      <el-card class="login-card" shadow="hover">
        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          size="large"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              clearable
              :prefix-icon="User"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              show-password
              clearable
              :prefix-icon="Lock"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          
          <el-form-item v-if="authStore.loginError" class="error-message">
            <el-alert 
              type="error" 
              :title="authStore.loginError" 
              show-icon 
              :closable="false"
              effect="dark"
            />
          </el-form-item>
          
          <el-form-item class="remember-row">
            <el-checkbox v-model="rememberMe">记住我</el-checkbox>
            <el-link type="primary" class="forgot-password">忘记密码？</el-link>
          </el-form-item>
          
          <el-form-item class="login-button-wrapper">
            <el-button
              type="primary"
              native-type="submit"
              :loading="authStore.isLoading"
              size="large"
              class="login-button"
            >
              <span v-if="!authStore.isLoading">登录</span>
              <span v-else>登录中...</span>
            </el-button>
          </el-form-item>
        </el-form>
        
        <div class="divider">
          <span>或</span>
        </div>
        
        <div class="register-link">
          还没有账户？ 
          <router-link to="/register" class="register-btn">立即注册</router-link>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock, ChatDotRound } from '@element-plus/icons-vue'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const authStore = useAuthStore()

const loginFormRef = ref<FormInstance>()
const rememberMe = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
})

const loginRules = reactive<FormRules>({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名长度不能少于3位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
})

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    const valid = await loginFormRef.value.validate()
    if (valid) {
      // 清除之前的错误信息
      authStore.loginError = null
      
      await authStore.login(loginForm, router)
      
      if (!authStore.loginError && authStore.isAuthenticated) {
        ElMessage.success('登录成功！')
        // 如果选择了记住我，可以在这里处理
        if (rememberMe.value) {
          localStorage.setItem('rememberMe', 'true')
        }
      }
    }
  } catch (error) {
    ElMessage.error('请检查输入项！')
  }
}

// 检查是否之前选择了记住我
if (localStorage.getItem('rememberMe') === 'true') {
  rememberMe.value = true
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
  opacity: 0.3;
}

.login-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
}

.login-header {
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

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.error-message {
  margin-bottom: 1rem;
}

.error-message .el-alert {
  border-radius: 8px;
}

.remember-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.forgot-password {
  font-size: 0.9rem;
}

.login-button-wrapper {
  margin-bottom: 1rem;
}

.login-button {
  width: 100%;
  height: 48px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  background: linear-gradient(135deg, #409EFF 0%, #3b82f6 100%);
  border: none;
  transition: all 0.3s ease;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
}

.login-button:active {
  transform: translateY(0);
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

.register-link {
  text-align: center;
  color: #606266;
  font-size: 0.9rem;
}

.register-btn {
  color: #409EFF;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

.register-btn:hover {
  color: #3b82f6;
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-container {
    padding: 10px;
  }
  
  .login-card {
    padding: 1.5rem;
  }
  
  .title {
    font-size: 2rem;
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

/* 表单项间距优化 */
:deep(.el-form-item) {
  margin-bottom: 1.5rem;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}
</style>