<template>
  <el-scrollbar class="conversation-list-scrollbar" always>
    <div v-if="isLoading" class="loading-placeholder">加载中...</div>
    <div v-else-if="conversations.length === 0" class="empty-placeholder">没有会话</div>
    <ul v-else class="conversation-list">
      <ConversationItem
        v-for="convo in sortedConversations"
        :key="convo.id + '-' + convo.type"
        :conversation="convo"
        :is-active="isActiveConversation(convo)"
        @click="handleSelectConversation(convo)"
      />
    </ul>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '../../../store/chat' // 调整路径
import type { ChatSession } from '../../../types' // 调整路径
import ConversationItem from './ConversationItem.vue' // 下一步创建

const chatStore = useChatStore()

// 从 store 获取会话列表 (这里假设 chatStore.sessions 是响应式的)
const conversations = computed(() => chatStore.sortedSessions); // 使用排序后的会话
const isLoading = computed(() => chatStore.isLoadingSessions); 
// 按最新消息时间排序会话
const sortedConversations = computed(() => {
  return [...conversations.value].sort((a, b) => {
    const timeA = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
    const timeB = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
    return timeB - timeA; // 降序
  });
});

const isActiveConversation = (convo: ChatSession): boolean => {
  return chatStore.currentSessionId === convo.id && chatStore.currentSessionType === convo.type;
};

const handleSelectConversation = (convo: ChatSession) => {
  chatStore.setCurrentSession(convo.id, convo.type)
  // TODO: 如果有未读，发送 MARK_AS_READ
  // TODO: 获取该会话的历史消息 (如果需要，或在 currentSession 变化时自动获取)
  console.log('Selected conversation:', convo)
}
</script>

<style scoped>
.conversation-list-scrollbar {
  height: 100%; /* 使滚动条填满父容器 */
}
.conversation-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.loading-placeholder, .empty-placeholder {
  padding: 20px;
  text-align: center;
  color: #909399;
}
</style>