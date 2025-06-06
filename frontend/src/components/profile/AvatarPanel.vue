<!-- src/components/profile/AvatarPanel.vue -->
<template>
  <div class="avatar-panel">
    <div class="panel-header">
      <h2>头像设置</h2>
      <p>上传或更改您的个人头像</p>
    </div>

    <el-card class="current-avatar-card">
      <div class="current-avatar">
        <h3>当前头像</h3>
        <div class="avatar-display">
          <el-avatar 
            :size="120" 
            :src="getFullAvatarUrl(user?.avatarUrl)" 
            :icon="UserFilled"
            fit="cover"
          />
        </div>
      </div>
    </el-card>    <el-card class="upload-card">
      <div class="upload-section">
        <h3>上传新头像</h3>
        <p class="upload-tips">
          支持 JPG、PNG 格式，文件大小不超过 5MB，推荐尺寸 200x200 像素
        </p>
          <!-- 统一的上传区域 -->
        <div 
          class="avatar-uploader"
          @dragover.prevent="handleDragOver"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
          :class="{ 'drag-over': isDragOver }"
        >
          <input 
            type="file" 
            @change="handleFileSelect" 
            accept="image/*"
            ref="fileInput"
            style="display: none;"
          />
          
          <div class="upload-area" @click="triggerFileSelect">
            <!-- 默认状态：显示上传提示 -->
            <div v-if="!uploading && !previewUrl" class="upload-placeholder">
              <el-icon class="upload-icon"><Plus /></el-icon>
              <div class="upload-text">点击选择图片</div>
              <div class="upload-hint">或拖拽图片到此处</div>
            </div>
            
            <!-- 预览状态：显示选中的图片 -->
            <div v-else-if="previewUrl && !uploading" class="preview-container">
              <img :src="previewUrl" alt="预览" class="preview-image" />
              <div class="preview-overlay">
                <el-icon class="change-icon"><Edit /></el-icon>
                <span>点击更换</span>
              </div>
            </div>
            
            <!-- 上传状态：显示进度 -->
            <div v-else class="uploading-container">
              <el-progress 
                type="circle" 
                :percentage="uploadProgress"
                :width="80"
                :stroke-width="6"
              />
              <div class="uploading-text">上传中 {{ uploadProgress }}%</div>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div v-if="previewUrl && !uploading" class="upload-actions">
          <el-button 
            type="primary" 
            size="large"
            @click="confirmUpload"
            :loading="uploading"
            :disabled="uploading"
          >
            确认上传
          </el-button>
          <el-button 
            size="large"
            @click="cancelUpload" 
            :disabled="uploading"
          >
            取消
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 预设头像选择 -->
    <el-card class="preset-avatar-card">
      <div class="preset-section">
        <h3>选择预设头像</h3>
        <div class="preset-avatars">
          <div 
            v-for="(avatar, index) in presetAvatars" 
            :key="index"
            class="preset-avatar-item"
            :class="{ active: selectedPreset === avatar }"
            @click="selectPresetAvatar(avatar)"
          >
            <el-avatar :size="60" :src="avatar" fit="cover" />
          </div>
        </div>
        <div v-if="selectedPreset" class="preset-actions">
          <el-button 
            type="primary" 
            @click="usePresetAvatar"
            :loading="updatingPreset"
          >
            使用此头像
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled, Plus, Edit } from '@element-plus/icons-vue'
import type { User } from '../../types'
import userService from '../../services/userService'

interface Props {
  user: User | null
}

interface Emits {
  (e: 'avatar-updated', avatarUrl: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const uploading = ref(false)
const uploadProgress = ref(0)
const previewUrl = ref('')
const selectedFile = ref<File | null>(null)
const selectedPreset = ref('')
const updatingPreset = ref(false)
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)

// 当前用户
const user = computed(() => props.user)

// 预设头像列表
const presetAvatars = [
  '/src/assets/default-avatar.png',
  // 可以添加更多预设头像
]

// 获取完整的头像URL
const getFullAvatarUrl = (avatarUrl?: string) => {
  if (!avatarUrl) return ''
  if (avatarUrl.startsWith('http')) return avatarUrl
  return `${window.location.origin}/${avatarUrl.replace(/^\/+/, '')}`
}

// 触发文件选择
const triggerFileSelect = () => {
  fileInput.value?.click()
}

// 文件选择处理
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    processSelectedFile(file)
  }
}

// 拖拽处理
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    processSelectedFile(file)
  }
}

// 处理选中的文件（统一逻辑）
const processSelectedFile = (file: File) => {
  // 验证文件
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return
  }

  // 预览图片
  const reader = new FileReader()
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
  
  selectedFile.value = file
}

// 确认上传
const confirmUpload = async () => {
  if (!selectedFile.value) {
    return
  }
  
  try {
    uploading.value = true
    uploadProgress.value = 0

    const result = await userService.uploadAvatar(
      selectedFile.value,
      (progressEvent: any) => {
        if (progressEvent.total) {
          uploadProgress.value = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
        }
      }
    )

    // 更新用户头像
    await userService.updateCurrentUserProfile({
      avatarUrl: result.avatarUrl
    })

    emit('avatar-updated', result.avatarUrl)
    ElMessage.success('头像更新成功')
    
    // 清理状态
    previewUrl.value = ''
    selectedFile.value = null
    
  } catch (error) {
    console.error('头像上传失败:', error)
    ElMessage.error('头像上传失败，请重试')
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

// 取消上传
const cancelUpload = () => {
  previewUrl.value = ''
  selectedFile.value = null
  uploadProgress.value = 0
  // 清空文件输入
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 选择预设头像
const selectPresetAvatar = (avatar: string) => {
  selectedPreset.value = avatar
}

// 使用预设头像
const usePresetAvatar = async () => {
  if (!selectedPreset.value) return

  try {
    updatingPreset.value = true
    
    await userService.updateCurrentUserProfile({
      avatarUrl: selectedPreset.value
    })

    emit('avatar-updated', selectedPreset.value)
    ElMessage.success('头像更新成功')
    selectedPreset.value = ''
    
  } catch (error) {
    console.error('更新头像失败:', error)
    ElMessage.error('更新头像失败，请重试')
  } finally {
    updatingPreset.value = false
  }
}
</script>

<style scoped>
.avatar-panel {
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

.current-avatar-card,
.upload-card,
.preset-avatar-card {
  margin-bottom: 24px;
}

.current-avatar h3,
.upload-section h3,
.preset-section h3 {
  margin: 0 0 16px 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
  font-weight: 600;
}

.avatar-display {
  display: flex;
  justify-content: center;
}

.upload-tips {
  margin: 0 0 20px 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.avatar-uploader {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.upload-area {
  width: 150px;
  height: 150px;
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.upload-area:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.upload-placeholder {
  text-align: center;
  color: var(--el-text-color-regular);
}

.upload-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
}

.preview-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 6px;
}

.preview-container:hover .preview-overlay {
  opacity: 1;
}

.change-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.uploading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.uploading-text {
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.upload-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.preset-avatars {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.preset-avatar-item {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.preset-avatar-item:hover {
  border-color: var(--el-color-primary-light-5);
  background-color: var(--el-color-primary-light-9);
}

.preset-avatar-item.active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-8);
}

.preset-actions {
  display: flex;
  justify-content: center;
}

/* 拖拽相关样式 */
.avatar-uploader.drag-over .upload-area {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  transform: scale(1.02);
}

.upload-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .preset-avatars {
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 12px;
  }
  
  .upload-area {
    width: 120px;
    height: 120px;
  }
  
  .upload-actions {
    flex-direction: column;
  }
}
</style>
