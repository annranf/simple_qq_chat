<template>
  <li class="conversation-item" :class="{ active: isActive }">
    <el-avatar :src="conversation.avatarUrl || defaultAvatar" :size="45" class="convo-avatar" />
    <div class="convo-details">
      <div class="convo-header">
        <span class="convo-name">{{ conversation.name }}</span>
        <span class="convo-time" v-if="conversation.lastMessage">
          {{ formatTimestamp(conversation.lastMessage.created_at) }}
        </span>
      </div>
      <div class="convo-message-preview">
        <span v-if="conversation.lastMessage" class="last-message-content">
          {{ getMessagePreview(conversation.lastMessage) }}
        </span>
        <el-badge 
          v-if="conversation.unreadCount > 0" 
          :value="conversation.unreadCount" 
          :max="99" 
          class="unread-badge" 
        />
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { ChatSession, Message, MessageContentMedia } from '../../../types'
import defaultAvatar from '../../../assets/default-avatar.png'; // 默认头像
import { formatConversationTime } from '../../../utils/timeUtils';
import { parseEmojisToText } from '../../../utils/emojiUtils';

const props = defineProps({
  conversation: {
    type: Object as PropType<ChatSession>,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
})

const formatTimestamp = (timestamp: string): string => {
  return formatConversationTime(timestamp);
};

const getMessagePreview = (message: Message): string => {
  if (!message) return '...';
  switch (message.content_type) {
    case 'text':
      // 处理内置表情包代码，将 :smile: 转换为 😊
      return parseEmojisToText(message.content as string);
    case 'image':
      return '[图片]';
    case 'video':
      return '[视频]';
    case 'audio':
      return '[语音]';
    case 'file':
      return `[文件] ${(message.content as MessageContentMedia).fileName || ''}`;
    case 'sticker':
      return '[表情]';
    case 'system_notification':
      return message.content as string; // 系统通知通常是文本
    default:
      return '[未知消息]';
  }
};

// 使用props避免未使用警告
const { conversation, isActive } = props;
</script>

<style scoped>
.conversation-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0; /* 更细的分割线 */
  transition: background-color 0.2s;
}
.conversation-item:hover {
  background-color: #f5f7fa;
}
.conversation-item.active {
  background-color: #e4e6e9; /* 选中时的背景色，类似Telegram */
}
.convo-avatar {
  margin-right: 12px;
  flex-shrink: 0;
}
.convo-details {
  flex-grow: 1;
  overflow: hidden; /* 防止文本溢出 */
}
.convo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.convo-name {
  font-weight: 500; /* 稍粗的字体 */
  font-size: 15px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.convo-time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  flex-shrink: 0; /* 防止时间被压缩 */
  margin-left: 8px;
}
.convo-message-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #666;
}
.last-message-content {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 30px); /* 减去徽章的宽度 */
}
.unread-badge {
  margin-left: auto;
}
.el-badge :deep(.el-badge__content) { /* 调整未读角标样式 */
    font-size: 10px;
    padding: 0 5px;
    height: 16px;
    line-height: 16px;
    min-width: 16px;
    transform: translateY(-2px) translateX(50%); /* 微调位置 */
}
</style>