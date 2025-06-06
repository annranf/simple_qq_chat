<template>
  <el-scrollbar ref="scrollbarRef" class="message-list-scrollbar" @scroll="handleScroll">
    <div class="message-list-inner" ref="messageListInnerRef">
      <div v-if="isLoading" class="loading-placeholder">正在加载消息...</div>
      <!-- 加载更多历史消息的触发器/按钮 -->
      <div v-if="canLoadMore && !isLoadingMore" class="load-more-trigger" @click="loadMoreMessages">
        加载更早的消息
      </div>
       <div v-if="isLoadingMore" class="loading-placeholder small">正在加载...</div>

      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUpdated } from 'vue'
import { useChatStore } from '../../../store/chat' // 调整路径
import { useAuthStore } from '../../../store/auth'
// import type { Message } from '../../../types' // 调整路径
import MessageItem from './MessageItem.vue' // 下一步创建
import type { ElScrollbar } from 'element-plus'

const chatStore = useChatStore()
const authStore = useAuthStore()
const scrollbarRef = ref<InstanceType<typeof ElScrollbar>>()
const messageListInnerRef = ref<HTMLDivElement>()

const messages = computed(() => chatStore.currentMessages)
const isLoading = computed(() => chatStore.isLoadingMessages)
const isLoadingMore = ref(false) // 用于加载更多时的 loading 状态
const canLoadMore = computed(() => chatStore.canLoadMoreMessages) // Store 中需要有此状态

const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
  nextTick(() => { // 确保 DOM 更新完毕
    if (scrollbarRef.value) {
      // ElScrollbar 的 scrollTo 方法可以直接滚动到底部
      const innerEl = messageListInnerRef.value;
      if (innerEl) {
        scrollbarRef.value.scrollTo({ top: innerEl.scrollHeight, behavior });
      }
    }
  });
};

// 监听消息列表变化，新消息来时滚动到底部
watch(messages, (newMessages, oldMessages) => {
  // 仅当有新消息添加到末尾时才自动滚动（假设新消息是追加的）
  if (newMessages.length > oldMessages.length) {
    const lastNewMessage = newMessages[newMessages.length - 1];
    // 只有当不是自己发送的，或者滚动条接近底部时才自动滚动，避免打扰正在看历史记录的用户
    // 这是一个简化的判断，实际可能更复杂
    const scrollWrapper = scrollbarRef.value?.wrapRef;
    if (scrollWrapper) {
        const isScrolledToBottom = scrollWrapper.scrollHeight - scrollWrapper.scrollTop - scrollWrapper.clientHeight < 100; // 100px 阈值
        if (lastNewMessage.sender_id !== authStore.currentUser?.id || isScrolledToBottom) {
             scrollToBottom('smooth');
        }
    } else {
        scrollToBottom('smooth'); // 默认情况
    }
  }
}, { deep: true });

// 监听当前会话变化，切换会话时获取消息并滚动到底部
watch(() => chatStore.currentSessionId, (newSessionId) => {
  if (newSessionId) {
    // chatStore.fetchMessagesForCurrentSession(); // 已经在 setCurrentSession 中处理
    scrollToBottom(); // 切换会话时，自动滚动到底部
  }
}, { immediate: true }); // immediate: true 可以在初始加载时也执行一次

const handleScroll = ({ scrollTop }: { scrollTop: number }) => {
  if (scrollTop === 0 && canLoadMore.value && !isLoadingMore.value && chatStore.currentSessionId) {
    loadMoreMessages();
  }
};

const loadMoreMessages = async () => {
  if (!chatStore.currentSessionId || !chatStore.currentSessionType) return;
  isLoadingMore.value = true;
  const oldScrollHeight = messageListInnerRef.value?.scrollHeight || 0;
  try {
    await chatStore.fetchMoreMessagesForCurrentSession();
    // 加载完成后，尝试恢复滚动位置，使用户体验更好
    nextTick(() => {
      if (scrollbarRef.value && messageListInnerRef.value) {
        const newScrollHeight = messageListInnerRef.value.scrollHeight;
        scrollbarRef.value.setScrollTop(newScrollHeight - oldScrollHeight);
      }
    });
  } catch (error) {
    console.error("Failed to load more messages:", error);
  } finally {
    isLoadingMore.value = false;
  }
};

// 确保初次加载和更新后滚动条在正确位置
onUpdated(() => {
    // 这里的滚动逻辑比较复杂，要避免不必要的滚动
    // 初始加载时，watch currentSessionId 会处理滚动
    // 新消息来时，watch messages 会处理滚动
});

</script>

<style scoped>
.message-list-scrollbar {
  height: 100%;
  background-color: #f5f5f5; /* 消息列表背景 */
}
.message-list-inner {
  padding: 10px 15px; /* 消息列表的内边距 */
  display: flex;
  flex-direction: column;
}
.loading-placeholder {
  text-align: center;
  padding: 20px;
  color: #909399;
}
.loading-placeholder.small {
  padding: 10px;
  font-size: 0.9em;
}
.load-more-trigger {
  text-align: center;
  padding: 10px;
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: 0.9em;
}
.load-more-trigger:hover {
  text-decoration: underline;
}
</style>