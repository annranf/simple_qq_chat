<template>
  <el-container class="chat-view-container">
    <!-- 左侧边栏：导航和内容切换 -->
    <el-aside width="300px" class="sidebar-container">
      <SidebarNavigation />
    </el-aside>

    <!-- 右侧主区域：当前聊天窗口 -->
    <el-container class="main-chat-area">
      <el-header class="chat-header-container" height="60px">
        <CurrentChatHeader />
      </el-header>
      <el-main class="message-display-container">
        <MessageList />
      </el-main>
      <el-footer class="message-input-container" height="auto">
        <MessageInput />
      </el-footer>
    </el-container>

    <!-- (可选) 最右侧信息面板 -->
    <!--
    <el-aside width="280px" class="info-panel-container" v-if="showInfoPanel">
      <ChatInfoPanel />
    </el-aside>
    -->
  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '../store/auth' // 使用相对路径
import { useChatStore } from '../store/chat' // 使用相对路径
import { useWsStore } from '../store/ws' // 使用相对路径

// 导入子组件 (稍后创建)
import SidebarNavigation from '../components/chat/sidebar/SidebarNavigation.vue'
import CurrentChatHeader from '../components/chat/main/CurrentChatHeader.vue'
import MessageList from '../components/chat/main/MessageList.vue'
import MessageInput from '../components/chat/main/MessageInput.vue'
// import ChatInfoPanel from '../components/chat/info/ChatInfoPanel.vue'; // 可选

const authStore = useAuthStore()
const chatStore = useChatStore()
const wsStore = useWsStore()

// const showInfoPanel = ref(false); // 控制可选信息面板的显示

onMounted(async () => {
  if (!authStore.currentUser) return;
  try {
    await chatStore.fetchInitialData(); // 调用统一的初始数据加载 action

    if (!wsStore.isConnected && authStore.token) {
      wsStore.connect(authStore.token);
    }
  } catch (error) {
    console.error("Error fetching initial data for ChatView:", error);
  }
});

// 用于登出的逻辑可以保留在 UserProfileHeader 组件内部或通过 authStore 调用
// const handleLogout = () => {
//   authStore.logout(router); // router 实例需要传递
// };
</script>

<style scoped>
.chat-view-container {
  height: 100vh;
  overflow: hidden;
  background-color: #f5f5f5; /* 淡灰色背景，类似Telegram桌面版 */
}

.sidebar-container {
  border-right: 1px solid #e0e0e0;
  background-color: #f5f5f5;
  overflow: hidden; /* 防止子组件的滚动影响整体布局 */
}

.main-chat-area {
  display: flex;
  flex-direction: column;
}

.chat-header-container {
  display: flex;
  align-items: center;
  padding: 0 15px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #ffffff;
  /* background-color: #f8f9fa; */
}

.message-display-container {
  flex-grow: 1;
  padding: 0; /* MessageList 内部处理 padding */
  overflow-y: auto; /* 允许消息列表滚动 */
  background-color: #e5ddd5; /* 类似 WhatsApp/Telegram 的聊天背景纹理色 */
  /* 如果要用图片背景:
  background-image: url('../assets/chat-bg.png');
  background-repeat: repeat;
  */
}

.message-input-container {
  padding: 10px 15px;
  border-top: 1px solid #e0e0e0;
  background-color: #f0f0f0; /* 输入区域背景色 */
  /* background-color: #f8f9fa; */
  /* height: auto 会根据 MessageInput 内容自适应，但 el-footer 默认有最小高度 */
}

/* 如果使用可选信息面板 */
/*
.info-panel-container {
  border-left: 1px solid #e0e0e0;
  background-color: #ffffff;
  padding: 15px;
  overflow-y: auto;
}
*/
</style>