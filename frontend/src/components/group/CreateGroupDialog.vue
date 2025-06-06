<!-- src/components/group/CreateGroupDialog.vue -->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="创建群组"
    width="500px"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
      label-position="left"
    >      <!-- 群组头像 -->
      <el-form-item label="群组头像">
        <div 
          class="avatar-upload-area"
          :class="{ 'dragging': isDragging }"
          @dragover.prevent="handleDragOver"
          @dragenter.prevent="handleDragEnter"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <div v-if="form.avatar_url" class="avatar-preview">
            <el-avatar :src="form.avatar_url" :size="80" />
            <div class="avatar-actions">
              <el-button size="small" @click="selectAvatar">
                <el-icon><Upload /></el-icon>
                更换
              </el-button>
              <el-button size="small" type="danger" plain @click="removeAvatar">
                <el-icon><Delete /></el-icon>
                移除
              </el-button>
            </div>
          </div>
          <div v-else class="avatar-placeholder" @click="selectAvatar">
            <el-icon size="32"><Plus /></el-icon>
            <div class="placeholder-text">
              <div>点击或拖拽上传群组头像</div>
              <div class="file-hint">支持 JPG、PNG 格式，建议尺寸 200x200</div>
            </div>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleAvatarChange"
          />
        </div>
        <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
          <el-progress :percentage="uploadProgress" :stroke-width="6" />
          <span class="progress-text">上传中... {{ uploadProgress }}%</span>
        </div>
      </el-form-item>

      <!-- 群组名称 -->
      <el-form-item label="群组名称" prop="name">
        <el-input
          v-model="form.name"
          placeholder="请输入群组名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <!-- 群组简介 -->
      <el-form-item label="群组简介">
        <el-input
          v-model="form.description"
          type="textarea"
          placeholder="请输入群组简介（可选）"
          :rows="3"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <!-- 群组类型 -->
      <el-form-item label="群组类型" prop="group_type">
        <el-radio-group v-model="form.group_type">
          <el-radio value="private">
            <div class="radio-option">
              <div class="option-title">私有群组</div>
              <div class="option-desc">只有受邀用户才能加入</div>
            </div>
          </el-radio>
          <el-radio value="public_readonly">
            <div class="radio-option">
              <div class="option-title">公开群组（只读）</div>
              <div class="option-desc">任何人都可以查看，但需要邀请才能发言</div>
            </div>
          </el-radio>
          <el-radio value="public_joinable">
            <div class="radio-option">
              <div class="option-title">公开群组（可加入）</div>
              <div class="option-desc">任何人都可以通过邀请链接加入</div>
            </div>
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="creating"
          @click="handleSubmit"
        >
          创建群组
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick, computed } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Upload, Plus, Delete } from '@element-plus/icons-vue'
import groupService, { type CreateGroupParams, type GroupDetail } from '../../services/groupService'
import uploadService from '../../services/uploadService'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'group-created', group: GroupDetail): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const maxAvatarSizeMB = computed(() => MAX_AVATAR_SIZE_BYTES / 1024 / 1024)

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const fileInputRef = ref<HTMLInputElement>()
const creating = ref(false)
const isDragging = ref(false)
const uploadProgress = ref(0)

// const defaultGroupAvatar = '/src/assets/default-avatar.png'

const form = reactive<CreateGroupParams>({
  name: '',
  description: '',
  avatar_url: '',
  group_type: 'private'
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入群组名称', trigger: 'blur' },
    { min: 1, max: 50, message: '群组名称长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  group_type: [
    { required: true, message: '请选择群组类型', trigger: 'change' }
  ]
}

// 监听 visible 变化
watch(
  () => props.visible,
  (newValue) => {
    dialogVisible.value = newValue
    if (newValue) {
      resetForm()
    }
  },
  { immediate: true }
)

// 监听 dialogVisible 变化，同步到父组件
watch(dialogVisible, (newValue) => {
  emit('update:visible', newValue)
})

const resetForm = () => {
  form.name = ''
  form.description = ''
  form.avatar_url = ''
  form.group_type = 'private'
  uploadProgress.value = 0 // 重置上传进度

  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const handleClose = () => {
  dialogVisible.value = false
}

const selectAvatar = () => {
  fileInputRef.value?.click()
}

const removeAvatar = () => {
  form.avatar_url = ''
  ElMessage.success('头像已移除')
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
}

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  // 只有当离开整个拖拽区域时才设置为false
  const currentTarget = e.currentTarget as HTMLElement
  const relatedTarget = e.relatedTarget as Node
  if (!currentTarget?.contains(relatedTarget)) {
    isDragging.value = false
  }
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    processAvatarFile(file)
  }
}

const processAvatarFile = async (file: File) => {
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }

  // 验证文件大小
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    ElMessage.error(`图片大小不能超过 ${maxAvatarSizeMB.value}MB`)
    return
  }

  try {
    uploadProgress.value = 0
    
    // 上传文件到服务器
    const formData = new FormData()
    formData.append('mediaFile', file)
    formData.append('fileType', 'image')
    
    const result = await uploadService.uploadMedia(formData, (progressEvent) => {
      if (progressEvent.total) {
        uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      }
    })
    
    // 构造完整的图片 URL
    form.avatar_url = `/uploads/${result.media.file_path.split('/').pop()}`
    
    uploadProgress.value = 100
    setTimeout(() => {
      uploadProgress.value = 0
    }, 1000)
    
    ElMessage.success('头像上传成功')
  } catch (error: any) {
    console.error('处理头像失败:', error)
    const message = error.response?.data?.message || '头像上传失败，请重试'
    ElMessage.error(message)
    uploadProgress.value = 0
  }
}

const handleAvatarChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  await processAvatarFile(file)
  
  // 清空 input 值，允许重复选择同一文件
  target.value = ''
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) return
    
    creating.value = true
    
    const newGroup = await groupService.createGroup(form)
    
    ElMessage.success(`群组 "${newGroup.name}" 创建成功`)
    emit('group-created', newGroup)
    
    dialogVisible.value = false
    
  } catch (error: any) {
    console.error('创建群组失败:', error)
    const message = error.response?.data?.message || '创建群组失败'
    ElMessage.error(message)
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.avatar-upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  background-color: #fafbfc;
}

.avatar-upload-area:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.avatar-upload-area.dragging {
  border-color: #409eff;
  background-color: #e6f7ff;
  transform: scale(1.02);
}

.avatar-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar-actions {
  display: flex;
  gap: 8px;
}

.avatar-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #909399;
  cursor: pointer;
}

.placeholder-text {
  text-align: center;
}

.file-hint {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 4px;
}

.upload-progress {
  margin-top: 12px;
  text-align: center;
}

.progress-text {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  display: block;
}

.radio-option {
  margin-left: 8px;
}

.option-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.option-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

:deep(.el-radio) {
  align-items: flex-start;
  margin-bottom: 16px;
}

:deep(.el-radio__input) {
  margin-top: 2px;
}

:deep(.el-radio__label) {
  padding-left: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .avatar-upload-area {
    padding: 16px;
  }
  
  .avatar-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
