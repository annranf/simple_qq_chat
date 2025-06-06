<template>
  <div class="message-item" :class="messageClasses">
    <!-- 群聊中显示对方头像和昵称 -->
    <el-avatar
      v-if="!isSelf && chatStore.currentSessionType === 'group'"
      :src="message.sender_avatar_url || defaultAvatar"
      :size="32"
      class="sender-avatar"
    />
    <div class="message-content-wrapper">
      <div v-if="!isSelf && chatStore.currentSessionType === 'group'" class="sender-name">
        {{ message.sender_display_name || message.sender_username }}
      </div>
      <div class="message-bubble">
        <!-- 文本消息 -->
        <div v-if="message.content_type === 'text'" class="text-content" v-html="formatTextContent(message.content as string)"></div>

        <!-- 图片消息 -->
        <div v-else-if="message.content_type === 'image' && typeof message.content === 'object'" class="image-content">
          <el-image
            :src="getFullUrl((message.content as MessageContentMedia).url)"
            :preview-src-list="[getFullUrl((message.content as MessageContentMedia).url)]"
            fit="contain"
            lazy
            hide-on-click-modal
            preview-teleported
            style="max-width: 250px; max-height: 250px; border-radius: 4px; cursor: pointer;"
          />
        </div>

        <!-- 表情消息 -->
        <div v-else-if="message.content_type === 'sticker' && typeof message.content === 'object'" class="sticker-content">
           <el-image
            :src="getFullUrl((message.content as MessageContentSticker).url)"
            fit="contain"
            style="width: 100px; height: 100px;" 
          />
        </div>
        
        <!-- 视频消息 (简单实现) -->
        <div v-else-if="message.content_type === 'video' && typeof message.content === 'object'" class="video-content">
          <video controls width="250" style="border-radius: 4px;">
            <source :src="getFullUrl((message.content as MessageContentMedia).url)" :type="(message.content as MessageContentMedia).mimeType">
            您的浏览器不支持 video 标签。
          </video>
        </div>

        <!-- 文件消息 -->
         <div v-else-if="message.content_type === 'file' && typeof message.content === 'object'" class="file-content">
          <el-link :href="getFullUrl((message.content as MessageContentMedia).url)" target="_blank" type="primary" :underline="false">
            <el-icon><Document /></el-icon>
            {{ (message.content as MessageContentMedia).fileName || '附件' }}
            <span class="file-size" v-if="(message.content as MessageContentMedia).sizeBytes">
              ({{ formatFileSize((message.content as MessageContentMedia).sizeBytes!) }})
            </span>
          </el-link>
        </div>

        <!-- 系统通知 -->
        <div v-else-if="message.content_type === 'system_notification'" class="system-notification-content">
          {{ message.content }}
        </div>
        
        <!-- 未知或其他类型 -->
        <div v-else class="unknown-content">
          [暂不支持显示此类型的消息: {{ message.content_type }}]
        </div>

        <div class="message-timestamp">
          {{ formatTimestamp(message.created_at) }}
          <!-- TODO: 已读状态 (v-if="isSelf") -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { useAuthStore } from '../../../store/auth' // 调整路径
import { useChatStore } from '../../../store/chat'
import type { Message, MessageContentMedia, MessageContentSticker } from '../../../types' // 调整路径
import defaultAvatar from '../../../assets/default-avatar.png';
import { Document } from '@element-plus/icons-vue'
import { formatMessageTime } from '../../../utils/timeUtils';
import { parseEmojisToHtml } from '../../../utils/emojiUtils';


const props = defineProps({
  message: {
    type: Object as PropType<Message>,
    required: true,
  },
})

const authStore = useAuthStore()
const chatStore = useChatStore()

const isSelf = computed(() => props.message.sender_id === authStore.currentUser?.id)

const messageClasses = computed(() => ({
  'self-message': isSelf.value,
  'other-message': !isSelf.value,
  'system-message': props.message.content_type === 'system_notification' || !props.message.sender_id
}))

const getFullUrl = (relativePath?: string): string => {
  if (!relativePath) return '';
  // 如果已经是完整URL，直接返回
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // 统一使用正斜杠（将Windows路径分隔符转换为Web路径分隔符）
  const normalizedPath = relativePath.replace(/\\/g, '/');
  
  // 如果已经以/uploads开头，直接返回
  if (normalizedPath.startsWith('/uploads/')) {
    return normalizedPath;
  }
  // 如果是uploads/开头，添加斜杠
  if (normalizedPath.startsWith('uploads/')) {
    return `/${normalizedPath}`;
  }
  // 否则假设是相对路径，添加/uploads/前缀
  return `/uploads/${normalizedPath}`;
}

const formatTextContent = (text: string): string => {
  // 处理内置表情包代码 (如 :smile: -> 😊)
  let formatted = parseEmojisToHtml(text);
  // 处理换行符
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

const formatTimestamp = (timestamp: string): string => {
    return formatMessageTime(timestamp);
};

const formatFileSize = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
</script>

<style scoped>
.message-item {
  display: flex;
  margin-bottom: 12px;
  max-width: 75%; /* 消息最大宽度 */
}

.message-item.self-message {
  margin-left: auto; /* 自己发送的消息靠右 */
  flex-direction: row-reverse; /* 头像和内容反向，如果自己也显示头像的话 */
}
.message-item.other-message {
  margin-right: auto; /* 对方消息靠左 */
}
 .message-item.system-message {
  max-width: 100%;
  justify-content: center;
  margin-top: 10px;
  margin-bottom: 10px;
}
.message-item.system-message .message-bubble {
  background-color: #dadada;
  color: #fff;
  font-size: 0.8em;
  padding: 5px 10px;
  border-radius: 12px;
  text-align: center;
}


.sender-avatar {
  margin-right: 8px;
  margin-top: 2px; /* 对齐昵称 */
  flex-shrink: 0;
}
/* 如果自己也显示头像 */
/* .message-item.self-message .sender-avatar {
  margin-left: 8px;
  margin-right: 0;
} */

.message-content-wrapper {
  display: flex;
  flex-direction: column;
}

.sender-name {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
  /* text-align: left; in .other-message */
}

.message-bubble {
  padding: 8px 12px;
  border-radius: 18px; /* 更圆润的聊天气泡 */
  word-wrap: break-word; /* 允许长单词换行 */
  overflow-wrap: break-word; /* 同上 */
  position: relative;
  max-width: 100%; /* 气泡本身不要超出父容器 */
}

.message-item.self-message .message-bubble {
  background-color: #c9e7ff; /* 自己消息的背景色 (淡蓝色) */
  /* border-top-right-radius: 6px; */ /* 调整特定角的圆角可以做出尖角效果 */
}
.message-item.other-message .message-bubble {
  background-color: #ffffff; /* 对方消息的背景色 (白色) */
  /* border-top-left-radius: 6px; */
  box-shadow: 0 1px 1px rgba(0,0,0,0.05);
}
.text-content {
  white-space: pre-wrap; /* 保留换行和空格 */
  font-size: 14px;
  line-height: 1.5;
}

/* 内置表情样式 */
.text-content :deep(.builtin-emoji) {
  font-size: 1.2em;
  vertical-align: middle;
  margin: 0 1px;
}
.file-content .el-icon {
    margin-right: 5px;
    vertical-align: middle;
}
.file-content .file-size {
    font-size: 0.85em;
    color: #909399;
    margin-left: 5px;
}

.message-timestamp {
  font-size: 11px;
  color: #aaa;
  margin-top: 5px;
  text-align: right; /* 时间戳在气泡内右下角 */
}
</style>