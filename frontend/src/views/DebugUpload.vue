<template>
  <div class="debug-upload">
    <h2>头像上传调试页面</h2>
    
    <div class="upload-section">
      <h3>简单上传测试</h3>
      <input 
        type="file" 
        @change="handleFileSelect" 
        accept="image/*"
        ref="fileInput"
      />
      <button @click="testUpload" :disabled="!selectedFile || uploading">
        {{ uploading ? '上传中...' : '测试上传' }}
      </button>
      <div v-if="uploadProgress > 0">
        进度: {{ uploadProgress }}%
      </div>
    </div>

    <div class="api-test-section">
      <h3>API 连接测试</h3>
      <button @click="testApiConnection">测试 API 连接</button>
      <button @click="testAuth">测试认证</button>
    </div>

    <div class="logs-section">
      <h3>调试日志</h3>
      <div class="logs" ref="logsContainer">
        <div v-for="(log, index) in logs" :key="index" :class="log.type">
          {{ log.timestamp }} - {{ log.message }}
        </div>
      </div>
      <button @click="clearLogs">清除日志</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import userService from '../services/userService'
import apiClient from '../services/axiosInstance'

const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const logs = ref<Array<{ timestamp: string, message: string, type: string }>>([])
const fileInput = ref<HTMLInputElement>()
const logsContainer = ref<HTMLElement>()

const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
  logs.value.push({
    timestamp: new Date().toLocaleTimeString(),
    message,
    type
  })
  nextTick(() => {
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight
    }
  })
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
    addLog(`文件已选择: ${selectedFile.value.name} (${selectedFile.value.type}, ${(selectedFile.value.size / 1024 / 1024).toFixed(2)}MB)`, 'info')
  }
}

const testUpload = async () => {
  if (!selectedFile.value) {
    addLog('没有选择文件', 'error')
    return
  }

  addLog('开始上传测试...', 'info')
  uploading.value = true
  uploadProgress.value = 0

  try {
    const result = await userService.uploadAvatar(
      selectedFile.value,
      (progressEvent: any) => {
        if (progressEvent.total) {
          uploadProgress.value = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          addLog(`上传进度: ${uploadProgress.value}%`, 'info')
        }
      }
    )

    addLog(`上传成功! 头像URL: ${result.avatarUrl}`, 'success')
    
    // 测试更新用户资料
    addLog('测试更新用户资料...', 'info')
    await userService.updateCurrentUserProfile({
      avatarUrl: result.avatarUrl
    })
    addLog('用户资料更新成功!', 'success')

  } catch (error: any) {
    addLog(`上传失败: ${error.message}`, 'error')
    if (error.response) {
      addLog(`错误响应: ${JSON.stringify(error.response.data)}`, 'error')
    }
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

const testApiConnection = async () => {
  addLog('测试 API 连接...', 'info')
  try {
    const response = await apiClient.get('/users/me')
    addLog('API 连接成功!', 'success')
    addLog(`用户信息: ${JSON.stringify(response.data)}`, 'info')
  } catch (error: any) {
    addLog(`API 连接失败: ${error.message}`, 'error')
    if (error.response) {
      addLog(`状态码: ${error.response.status}`, 'error')
      addLog(`错误响应: ${JSON.stringify(error.response.data)}`, 'error')
    }
  }
}

const testAuth = () => {
  const token = localStorage.getItem('authToken')
  if (token) {
    addLog(`认证令牌存在: ${token.substring(0, 20)}...`, 'success')
  } else {
    addLog('没有找到认证令牌', 'error')
  }
}

const clearLogs = () => {
  logs.value = []
}

// 初始化时添加一些基本信息
addLog('调试页面已加载', 'info')
addLog(`当前地址: ${window.location.origin}`, 'info')
testAuth()
</script>

<style scoped>
.debug-upload {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.upload-section,
.api-test-section,
.logs-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.upload-section input[type="file"] {
  margin-right: 10px;
}

.upload-section button,
.api-test-section button {
  margin: 5px;
  padding: 8px 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.upload-section button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.logs {
  height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  padding: 10px;
  background: #f9f9f9;
  font-family: monospace;
  font-size: 12px;
}

.logs .info {
  color: #333;
}

.logs .error {
  color: #f56c6c;
}

.logs .success {
  color: #67c23a;
}

.logs-section button {
  margin-top: 10px;
  padding: 6px 12px;
  background: #909399;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
