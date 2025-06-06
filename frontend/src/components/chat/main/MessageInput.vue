<template>
  <div class="message-input-area">
    <div class="input-toolbar">
      <el-tooltip content="表情" placement="top">
        <el-button :icon="ChatDotSquare" circle @click="toggleEmojiPicker" />
      </el-tooltip>
      <el-tooltip content="发送文件" placement="top">
         <el-upload
            action="#" 
            :show-file-list="false"
            :before-upload="handleBeforeUpload"
            :http-request="handleCustomUpload"
            style="display: inline-block; margin: 0 5px;"
        >
             <el-button :icon="Paperclip" circle />
        </el-upload>
      </el-tooltip>
      <!-- 更多工具按钮 -->
    </div>    <el-popover
      ref="emojiPopoverRef"
      placement="top-start"
      :width="400"
      trigger="click"
      virtual-triggering
      :visible="showEmojiPicker"
      @hide="showEmojiPicker = false"
    >
      <div class="emoji-picker-content">
        <el-tabs v-model="activeEmojiTab" class="emoji-tabs">
          <!-- 内置表情选项卡 -->
          <el-tab-pane label="😊 表情" name="builtin">
            <div class="builtin-emoji-section">
              <!-- 最近使用 -->
              <div v-if="recentEmojis.length > 0" class="emoji-category">
                <div class="category-title">最近使用</div>
                <div class="emoji-grid">
                  <button
                    v-for="emoji in recentEmojis"
                    :key="emoji.id"
                    class="emoji-btn"
                    :title="emoji.name"
                    @click="insertBuiltinEmoji(emoji.id)"
                  >
                    {{ emoji.unicode }}
                  </button>
                </div>
              </div>
              
              <!-- 按分类显示 -->
              <div 
                v-for="category in emojiCategories" 
                :key="category"
                class="emoji-category"
              >
                <div class="category-title">{{ category }}</div>
                <div class="emoji-grid">
                  <button
                    v-for="emoji in getEmojisByCategory(category)"
                    :key="emoji.id"
                    class="emoji-btn"
                    :title="emoji.name"
                    @click="insertBuiltinEmoji(emoji.id)"
                  >
                    {{ emoji.unicode }}
                  </button>
                </div>
              </div>
            </div>
          </el-tab-pane>          <!-- 图片表情包选项卡 -->
          <el-tab-pane label="🖼️ 贴图" name="stickers">
            <div v-if="isLoadingStickers">正在加载表情...</div>
            <div v-else-if="stickerPacks.length === 0">没有可用的表情包</div>
            <el-tabs v-else v-model="activeStickerPackId" class="sticker-pack-tabs">
              <el-tab-pane 
                v-for="pack in stickerPacks" 
                :key="pack.id" 
                :label="pack.name" 
                :name="pack.id.toString()"
              >
                <div class="sticker-grid">
                  <el-image 
                    v-for="sticker in pack.stickers" 
                    :key="sticker.id" 
                    :src="getFullUrl(sticker.url)"
                    class="sticker-in-picker"
                    fit="contain" 
                    @click="handleSendSticker(sticker.id)"
                  />
                </div>
              </el-tab-pane>
            </el-tabs>
          </el-tab-pane>

          <!-- 我的表情包选项卡 -->
          <el-tab-pane label="📁 我的表情包" name="mystickers">
            <div class="my-stickers-content">
              <div class="my-stickers-toolbar">
                <el-button type="primary" size="small" @click="showUploadDialog = true">
                  上传表情包
                </el-button>
              </div>
              
              <div v-if="isLoadingMyStickers">正在加载我的表情包...</div>
              <div v-else-if="myStickerPacks.length === 0" class="empty-state">
                <p>您还没有上传任何表情包</p>
                <el-button type="primary" @click="showUploadDialog = true">
                  上传第一个表情包
                </el-button>
              </div>
              <el-tabs v-else v-model="activeMyPackId" class="sticker-pack-tabs">
                <el-tab-pane 
                  v-for="pack in myStickerPacks" 
                  :key="pack.id" 
                  :label="pack.name" 
                  :name="pack.id.toString()"
                >
                  <div class="my-pack-header">
                    <span class="pack-name">{{ pack.name }}</span>
                    <el-button 
                      type="danger" 
                      size="small" 
                      @click="handleDeletePack(pack.id)"
                    >
                      删除
                    </el-button>
                  </div>
                  <div class="sticker-grid">
                    <el-image 
                      v-for="sticker in pack.stickers" 
                      :key="sticker.id" 
                      :src="getFullUrl(sticker.url)"
                      class="sticker-in-picker"
                      fit="contain" 
                      @click="handleSendSticker(sticker.id)"
                    />
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>    </el-popover>

    <!-- 上传表情包对话框 -->
    <el-dialog 
      v-model="showUploadDialog" 
      title="上传表情包" 
      width="500px"
      @close="resetUploadForm"
    >
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="表情包名称" required>
          <el-input 
            v-model="uploadForm.name" 
            placeholder="请输入表情包名称"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="选择图片" required>
          <el-upload
            ref="uploadRef"
            :file-list="uploadForm.fileList"
            :before-upload="handleBeforeUploadSticker"
            multiple
            accept="image/*"
            :auto-upload="false"
            :limit="20"
            :on-exceed="handleExceed"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            list-type="picture-card"
            action="#"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="upload-tip">
            支持 jpg、png、gif 格式，最多 20 张图片，每张不超过 5MB
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showUploadDialog = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleUploadStickerPack"
            :loading="isUploading"
            :disabled="!uploadForm.name || uploadForm.fileList.length === 0"
          >
            上传
          </el-button>
        </span>
      </template>
    </el-dialog>

    <el-input
      ref="inputRef"
      v-model="inputText"
      type="textarea"
      :autosize="{ minRows: 1, maxRows: 4 }"
      placeholder="输入消息..."
      class="text-input"
      @keydown.enter.prevent="handleKeydownEnter"
    />
    <el-button type="primary" :icon="Promotion" @click="handleSendMessage" class="send-button" :disabled="!canSend">
      发送
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useChatStore } from '../../../store/chat'
import { useWsStore } from '../../../store/ws'
import { ElMessage, ElMessageBox, type UploadProps, type UploadRequestHandler, type UploadFile } from 'element-plus'
import { ChatDotSquare, Paperclip, Promotion, Plus } from '@element-plus/icons-vue'
import type { StickerPack } from '../../../types'
import stickerService from '../../../services/stickerService'
import uploadService from '../../../services/uploadService'

// 内置表情包相关导入
import { EMOJI_CATEGORIES, getEmojisByCategory, type BuiltInEmoji } from '../../../data/builtInEmojis'
import { 
  insertEmojiIntoText, 
  getRecentEmojis, 
  addToRecentEmojis
} from '../../../utils/emojiUtils'

const chatStore = useChatStore()
const wsStore = useWsStore()

const inputText = ref('')
const inputRef = ref() // Element Plus Input 组件的 ref
const showEmojiPicker = ref(false)
const emojiPopoverRef = ref() // For popover instance

// 图片表情包相关
const stickerPacks = ref<StickerPack[]>([])
const isLoadingStickers = ref(false)
const activeStickerPackId = ref<string | null>(null)

// 我的表情包相关
const myStickerPacks = ref<StickerPack[]>([])
const isLoadingMyStickers = ref(false)
const activeMyPackId = ref<string | null>(null)

// 上传表情包相关
const showUploadDialog = ref(false)
const isUploading = ref(false)
const uploadRef = ref()
const uploadForm = ref({
  name: '',
  fileList: [] as UploadFile[]
})

// 内置表情包相关
const activeEmojiTab = ref('builtin') // 'builtin' | 'stickers' | 'mystickers'
const emojiCategories = EMOJI_CATEGORIES
const recentEmojis = ref<BuiltInEmoji[]>([])

// 初始化最近使用的表情
onMounted(() => {
  recentEmojis.value = getRecentEmojis()
})

const canSend = computed(() => inputText.value.trim() !== '' || /* other conditions like file selected */ false )

const handleSendMessage = () => {
  if (inputText.value.trim() === '') return
  if (!chatStore.currentSessionId || !chatStore.currentSessionType) {
    ElMessage.warning('请先选择一个聊天对象')
    return
  }

  wsStore.sendMessage('SEND_TEXT_MESSAGE', {
    receiverType: chatStore.currentSessionType,
    receiverId: chatStore.currentSessionId,
    content: inputText.value.trim(),
    // clientMessageId: generateClientMsgId() // 可选
  })
  inputText.value = ''
  // 关闭表情选择器（如果打开）
  if (showEmojiPicker.value) showEmojiPicker.value = false;
}

const handleKeydownEnter = (event: KeyboardEvent) => {
  // 根据用户偏好决定是直接发送还是换行
  // 示例：直接发送，Ctrl/Cmd+Enter 换行
  if (event.ctrlKey || event.metaKey) {
    // 插入换行符
    const textarea = event.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = value.substring(0, start) + "\n" + value.substring(end);
    // 更新 model (如果 Vue 没有自动同步)
    inputText.value = textarea.value; 
    // 将光标移到换行符之后
    textarea.selectionStart = textarea.selectionEnd = start + 1;

  } else {
    handleSendMessage()
  }
}

const toggleEmojiPicker = () => {
    showEmojiPicker.value = !showEmojiPicker.value;
    if (showEmojiPicker.value && stickerPacks.value.length === 0 && !isLoadingStickers.value) {
        fetchStickers();
    }
}

// 监听表情选项卡切换
watch(activeEmojiTab, (newTab) => {
    if (newTab === 'mystickers' && myStickerPacks.value.length === 0 && !isLoadingMyStickers.value) {
        fetchMyStickers();
    }
});

const fetchStickers = async () => {
    isLoadingStickers.value = true;
    try {
        const packs = await stickerService.getAvailableStickerPacks(); // 假设后端返回 StickerPack[]
        stickerPacks.value = packs;
        if (packs.length > 0) {
            activeStickerPackId.value = packs[0].id.toString();
        }
    } catch (error) {
        console.error("Failed to fetch sticker packs:", error);
        ElMessage.error("加载表情失败");
    } finally {
        isLoadingStickers.value = false;
    }
}

const fetchMyStickers = async () => {
    isLoadingMyStickers.value = true;
    try {
        const packs = await stickerService.getUserStickerPacks();
        myStickerPacks.value = packs;
        if (packs.length > 0) {
            activeMyPackId.value = packs[0].id.toString();
        }
    } catch (error) {
        console.error("Failed to fetch my sticker packs:", error);
        ElMessage.error("加载我的表情包失败");
    } finally {
        isLoadingMyStickers.value = false;
    }
}

// 上传表情包相关函数
const resetUploadForm = () => {
    uploadForm.value = {
        name: '',
        fileList: []
    };
}

const handleBeforeUploadSticker = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isLt5M = file.size / 1024 / 1024 < 5;

    if (!isImage) {
        ElMessage.error('只能上传图片文件!');
        return false;
    }
    if (!isLt5M) {
        ElMessage.error('图片大小不能超过 5MB!');
        return false;
    }
    return false; // 阻止自动上传，手动处理
}

const handleExceed = () => {
    ElMessage.warning('最多只能选择 20 张图片');
}

const handleFileChange = (_file: UploadFile, fileList: UploadFile[]) => {
    // 更新表单中的文件列表
    uploadForm.value.fileList = fileList;
}

const handleFileRemove = (_file: UploadFile, fileList: UploadFile[]) => {
    // 更新表单中的文件列表
    uploadForm.value.fileList = fileList;
}

const handleUploadStickerPack = async () => {
    if (!uploadForm.value.name.trim()) {
        ElMessage.error('请输入表情包名称');
        return;
    }
    
    if (uploadForm.value.fileList.length === 0) {
        ElMessage.error('请选择至少一张图片');
        return;
    }

    isUploading.value = true;
    try {
        const files = uploadForm.value.fileList
            .map(fileItem => fileItem.raw)
            .filter(file => file instanceof File) as File[];
        
        await stickerService.uploadStickerPack(uploadForm.value.name, files);
        ElMessage.success('表情包上传成功');
        showUploadDialog.value = false;
        resetUploadForm();
        
        // 刷新我的表情包列表
        await fetchMyStickers();
    } catch (error) {
        console.error('Upload failed:', error);
        ElMessage.error('上传失败，请重试');
    } finally {
        isUploading.value = false;
    }
}

const handleDeletePack = async (packId: number) => {
    try {
        await ElMessageBox.confirm('确定要删除这个表情包吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        });
        
        await stickerService.deleteStickerPack(packId);
        ElMessage.success('删除成功');
        
        // 刷新我的表情包列表
        await fetchMyStickers();
    } catch (error) {
        if (error !== 'cancel') {
            console.error('Delete failed:', error);
            ElMessage.error('删除失败，请重试');
        }
    }
}

const handleSendSticker = (stickerId: number) => {
  if (!chatStore.currentSessionId || !chatStore.currentSessionType) {
    ElMessage.warning('请先选择一个聊天对象')
    return
  }
   wsStore.sendMessage('SEND_STICKER_MESSAGE', {
    receiverType: chatStore.currentSessionType,
    receiverId: chatStore.currentSessionId,
    stickerId: stickerId,
  });
  showEmojiPicker.value = false; // 发送后关闭选择器
}

// 插入内置表情到文本
const insertBuiltinEmoji = (emojiId: string) => {
  // 获取当前光标位置 - Element Plus Input 组件的正确访问方式
  const textareaElement = inputRef.value?.$refs?.textarea || inputRef.value?.textarea;
  const cursorPos = textareaElement?.selectionStart || inputText.value.length;
  const result = insertEmojiIntoText(inputText.value, cursorPos, emojiId);
  
  inputText.value = result.newText;
  
  // 设置新的光标位置
  nextTick(() => {
    if (textareaElement) {
      textareaElement.selectionStart = textareaElement.selectionEnd = result.newCursorPos;
      inputRef.value?.focus();
    }
  });
    // 添加到最近使用
  addToRecentEmojis(emojiId);
  recentEmojis.value = getRecentEmojis();
}

const getFullUrl = (relativePath?: string): string => {
  if (!relativePath) return '';
  
  // 如果已经是完整URL，直接返回
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // 统一使用正斜杠（将Windows路径分隔符转换为Web路径分隔符）
  const normalizedPath = relativePath.replace(/\\/g, '/');
  
  // 如果已经以/uploads/开头，直接返回
  if (normalizedPath.startsWith('/uploads/')) {
    return normalizedPath;
  }
  
  // 如果是uploads/开头（数据库中的标准格式），添加前导斜杠
  if (normalizedPath.startsWith('uploads/')) {
    return `/${normalizedPath}`;
  }
  
  // 否则假设是文件名，添加/uploads/前缀
  return `/uploads/${normalizedPath}`;
}

// 文件上传相关
const handleBeforeUpload: UploadProps['beforeUpload'] = () => {
    return true;
}

interface CustomUploadError extends Error {
    status?: number;
    method?: string;
    url?: string;
}

const handleCustomUpload: UploadRequestHandler = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;

    if (!chatStore.currentSessionId || !chatStore.currentSessionType) {
        ElMessage.warning('请先选择一个聊天对象');
        if (onError) {
            const err: CustomUploadError = new Error('No active chat session');
            err.name = 'UploadError_NoSession';
            err.status = 0; // 确保 status 是 number 类型
            onError(err as any); // 只传递错误对象
        }
        return;
    }

    const formData = new FormData();
    formData.append('mediaFile', file);
    let fileType = 'file';
    if (file.type.startsWith('image/')) fileType = 'image';
    else if (file.type.startsWith('video/')) fileType = 'video';
    formData.append('fileType', fileType);

    try {
        const response = await uploadService.uploadMedia(formData, (axiosProgressEvent) => {
            if (onProgress && axiosProgressEvent.total && axiosProgressEvent.total > 0) {
                const percent = Math.round((axiosProgressEvent.loaded * 100) / axiosProgressEvent.total);
                onProgress({ percent, ...axiosProgressEvent } as any); // 传递 percent 和 ProgressEvent 属性
            } else if (onProgress) {
                onProgress({
                    percent: 0,
                    lengthComputable: false,
                    loaded: 0,
                    total: 0,
                    target: null,
                    type: 'progress',
                    timeStamp: Date.now(),
                    bubbles: false,
                    cancelable: false,
                    composed: false,
                    currentTarget: null,
                    defaultPrevented: false,
                    eventPhase: 0,
                    isTrusted: false,
                    returnValue: true,
                    srcElement: null,
                    cancelBubble: false,
                    composedPath: () => [],
                    initEvent: () => {},
                    preventDefault: () => {},
                    stopImmediatePropagation: () => {},
                    stopPropagation: () => {}
                } as any);
            }
        });        if (response && response.media && response.media.id) {
            // 确保有选中的聊天对象
            if (!chatStore.currentSessionId || !chatStore.currentSessionType) {
                ElMessage.warning('请先选择一个聊天对象');
                return;
            }            // 根据文件类型确定contentType
            let contentType = 'file'; // 默认类型
            if (file.type.startsWith('image/')) {
                contentType = 'image';
            } else if (file.type.startsWith('video/')) {
                contentType = 'video';
            } else if (file.type.startsWith('audio/')) {
                contentType = 'audio';
            }

            // 发送WebSocket消息
            wsStore.sendMessage('SEND_MEDIA_MESSAGE', {
                receiverType: chatStore.currentSessionType,
                receiverId: chatStore.currentSessionId,
                mediaId: response.media.id,
                contentType: contentType,
                clientMessageId: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });
            
            if (onSuccess) onSuccess(response); // 只传递 response
        } else {
            if (onError) {
                const err: CustomUploadError = new Error('Upload failed: No media ID received');
                err.name = 'UploadError_NoMediaId';
                err.status = 0; // Ensure status is always a number
                onError(err as any);
            }
        }
    } catch (error: any) {
        console.error('Upload failed:', error);
        const errorMessage = error.response?.data?.message || error.message || '文件上传失败';
        ElMessage.error(errorMessage);
        if (onError) {
            const err: CustomUploadError = new Error(errorMessage);
            err.name = error.name || 'UploadError_Catch';
            if (error.response && typeof error.response.status === 'number') {
                err.status = error.response.status;
            } else {
                // Ensure status is always a number for UploadAjaxError compatibility
                err.status = 0;
            }
            if (error.isAxiosError && error.config) {
                err.method = error.config.method?.toUpperCase();
                err.url = error.config.url;
            }
            // Ensure status is always a number (never undefined)
            if (typeof err.status !== 'number') {
                err.status = 0;
            }            onError(err as any); // Type assertion to satisfy UploadAjaxError
        }
    }
}

// 监听当前聊天会话变化，自动聚焦输入框
watch(() => chatStore.currentSessionId, (newVal) => {
    if (newVal) {
        nextTick(() => {
             inputRef.value?.focus();
        });
    }
}, { immediate: true });


onMounted(() => {
  // 可选：预加载表情包，或者在点击表情按钮时加载
  // fetchStickers();
})

</script>

<style scoped>
.message-input-area {
  display: flex;
  align-items: flex-end; /* 使按钮和输入框底部对齐 */
  padding: 8px;
  background-color: #f7f7f7;
}
.input-toolbar {
  display: flex;
  align-items: center;
  margin-right: 8px;
  margin-bottom: 5px; /* 调整与输入框底部的对齐 */
}
.text-input {
  flex-grow: 1;
  margin-right: 8px;
}
.text-input :deep(textarea) {
    padding: 6px 10px; /* 调整输入框内边距 */
    border-radius: 18px; /* 圆角输入框 */
    /* box-shadow: 0 1px 2px rgba(0,0,0,0.1); */
    border: 1px solid #e0e0e0;
    resize: none; /* 禁止拖拽调整大小 */
}
.send-button {
  flex-shrink: 0;
  height: 36px; /* 与输入框高度匹配或略大 */
  /* border-radius: 18px; */
}

.emoji-picker-content {
  max-height: 350px;
  overflow-y: auto;
}

/* 内置表情相关样式 */
.builtin-emoji-section {
  padding: 8px;
}

.emoji-category {
  margin-bottom: 16px;
}

.category-title {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
  gap: 4px;
}

.emoji-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.emoji-btn:hover {
  background-color: #f0f0f0;
}

.emoji-tabs {
  margin-bottom: 8px;
}

.sticker-pack-tabs {
  margin-top: 8px;
}

/* 图片表情包样式 */
.sticker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 8px;
  padding: 8px;
}

.sticker-in-picker {
  width: 60px;
  height: 60px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 4px;
  transition: border-color 0.2s;
}

.sticker-in-picker:hover {
  border-color: #409eff;
}

/* 我的表情包样式 */
.my-stickers-content {
  padding: 8px;
}

.my-stickers-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.my-pack-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.pack-name {
  font-weight: 500;
  color: #303133;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-state p {
  margin-bottom: 16px;
}

/* 上传对话框样式 */
.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>