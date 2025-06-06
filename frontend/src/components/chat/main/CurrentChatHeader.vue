<template>
  <div class="current-chat-header" v-if="currentSession">
    <el-avatar :src="currentSession?.avatarUrl || defaultAvatar" :size="36" class="header-avatar"/>
    <div class="header-info">
      <span class="chat-name">{{ currentSession?.name }}</span>
      <span class="chat-status" v-if="currentSession?.type === 'user'">
        {{ currentSession?.peerUserStatus || '状态未知' }} <!-- 假设 session 对象中有 peerUserStatus -->
      </span>
      <span class="chat-status" v-else-if="currentSession?.type === 'group'">
        {{ currentSession?.memberCount ?? 'N' }} 位成员 <!-- 假设 session 对象中有 memberCount -->
      </span>
    </div>
    <!-- 更多操作按钮 -->
  </div>
  <div v-else class="no-chat-selected">
    <span>选择一个会话开始聊天</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '../../../store/chat' // 调整路径
import { useUserStore } from '../../../store/user'
import type { ChatSession } from '../../../types' // 调整路径

// 扩展 ChatSession 以允许 peerUserStatus 和 memberCount
type ExtendedChatSession = ChatSession & { 
  peerUserStatus?: "online" | "offline" | "away",
  memberCount?: number
};
import defaultAvatar from '../../../assets/default-avatar.png';

const chatStore = useChatStore();
const userStore = useUserStore();

const currentSession = computed<ExtendedChatSession | null>(() => {
  if (chatStore.currentSessionId && chatStore.currentSessionType) {
    // 查找当前会话
    const session = chatStore.sessions.find(
      (s: ChatSession) =>
        s.id === chatStore.currentSessionId && s.type === chatStore.currentSessionType
    );
    if (session) {
      // 如果是私聊，尝试从 userStore 获取对方的最新状态
      if (session.type === 'user') {
        const peerUser = userStore.usersMap.get(session.id); // usersMap 存所有已知用户
        return { ...session, peerUserStatus: peerUser?.status } as ExtendedChatSession;
      }
      // 如果是群聊，尝试获取成员数量
      if (session.type === 'group') {
        // 假设 chatStore.sessions 里的群聊 session 有 memberCount 字段
        return { ...session, memberCount: (session as any).memberCount } as ExtendedChatSession;
      }
      return session as ExtendedChatSession;
    }
    return null;
  }
  return null;
})
</script>

<style scoped>
.current-chat-header {
  display: flex;
  align-items: center;
  width: 100%;
}
.header-avatar {
  margin-right: 12px;
}
.header-info {
  display: flex;
  flex-direction: column;
}
.chat-name {
  font-weight: bold;
  font-size: 16px;
}
.chat-status {
  font-size: 12px;
  color: #909399;
}
.no-chat-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  font-size: 16px;
}
</style>