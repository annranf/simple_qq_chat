<!-- src/components/group/EditGroupDialog.vue -->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="编辑群组信息"
    width="500px"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
      label-position="left"
    >
      <!-- 群组头像 -->
      <el-form-item label="群组头像">
        <div class="avatar-upload">
          <el-avatar
            :src="form.avatar_url || defaultGroupAvatar"
            :size="80"
            class="group-avatar-preview"
          >
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="upload-actions">
            <el-button size="small" @click="selectAvatar">
              <el-icon><Upload /></el-icon>
              更换头像
            </el-button>
            <el-button
              v-if="form.avatar_url"
              size="small"
              type="danger"
              plain
              @click="removeAvatar"
            >
              <el-icon><Delete /></el-icon>
              移除头像
            </el-button>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleAvatarChange"
            />
          </div>
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
          :loading="updating"
          @click="handleSubmit"
        >
          保存更改
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Upload, Delete } from '@element-plus/icons-vue'
import groupService, { 
  type UpdateGroupParams, 
  type GroupDetail 
} from '../../services/groupService'
import uploadService from '../../services/uploadService'

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

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const fileInputRef = ref<HTMLInputElement>()
const updating = ref(false)

const defaultGroupAvatar = '/src/assets/default-avatar.png'

const form = reactive<UpdateGroupParams>({
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
    if (newValue && props.group) {
      initForm()
    }
  },
  { immediate: true }
)

// 监听 dialogVisible 变化
watch(dialogVisible, (newValue) => {
  emit('update:visible', newValue)
})

const initForm = () => {
  if (!props.group) return
  
  form.name = props.group.name || ''
  form.description = props.group.description || ''
  form.avatar_url = props.group.avatar_url || ''
  form.group_type = props.group.group_type || 'private'
  
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

const handleAvatarChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    target.value = ''
    return
  }
  
  // 验证文件大小 (5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('图片大小不能超过 5MB')
    target.value = ''
    return
  }
  
  try {
    const loadingMessage = ElMessage.info({
      message: '正在上传头像...',
      duration: 0,
      showClose: false
    })
    
    // 上传文件到服务器
    const formData = new FormData()
    formData.append('mediaFile', file)
    formData.append('fileType', 'image')
    
    const result = await uploadService.uploadMedia(formData)
    
    // 构造完整的图片 URL
    form.avatar_url = `/uploads/${result.media.file_path.split('/').pop()}`
    
    loadingMessage.close()
    ElMessage.success('头像上传成功')
  } catch (error: any) {
    console.error('处理头像失败:', error)
    const message = error.response?.data?.message || '头像上传失败，请重试'
    ElMessage.error(message)
  } finally {
    // 清空 input 值，允许重复选择同一文件
    target.value = ''
  }
}

const handleSubmit = async () => {
  if (!formRef.value || !props.group?.id) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) return
    
    updating.value = true
    
    const updatedGroup = await groupService.updateGroup(props.group.id, form)
    
    ElMessage.success('群组信息更新成功')
    emit('group-updated', updatedGroup)
    
    dialogVisible.value = false
    
  } catch (error: any) {
    console.error('更新群组信息失败:', error)
    const message = error.response?.data?.message || '更新群组信息失败'
    ElMessage.error(message)
  } finally {
    updating.value = false
  }
}
</script>

<style scoped>
.avatar-upload {
  display: flex;
  align-items: center;
  gap: 16px;
}

.group-avatar-preview {
  flex-shrink: 0;
}

.upload-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  .avatar-upload {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .upload-actions {
    align-items: center;
  }
}
</style>
