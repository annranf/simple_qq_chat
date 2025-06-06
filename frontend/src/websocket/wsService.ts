// src/websocket/wsService.ts
import { useAuthStore } from '../store/auth' // 调整路径
import { useChatStore } from '../store/chat' // 调整路径
import { useUserStore } from '../store/user' // 调整路径
import { useWsStore } from '../store/ws'    // 调整路径
import type { Message as BackendMessage } from '../types' // 后端消息类型
import { ElNotification } from 'element-plus'

// 从 .env (通过 Vite 的 import.meta.env) 或默认值配置 WebSocket URL
const WS_PROTOCOL = import.meta.env.VITE_WS_PROTOCOL || (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
const WS_HOST = import.meta.env.VITE_WS_HOST || window.location.hostname;
const WS_PORT = import.meta.env.VITE_WS_PORT || '3000'; // 后端 WebSocket 端口
const WS_URL = `${WS_PROTOCOL}//${WS_HOST}:${WS_PORT}`;

let socket: WebSocket | null = null;
let reconnectIntervalTimer: number | null = null;
const RECONNECT_INTERVAL_BASE: number = 5000; // 基础重连间隔 5s
const MAX_RECONNECT_ATTEMPTS: number = 5;
let reconnectAttempts: number = 0;
let explicitlyClosed: boolean = false; // 标记是否是用户主动断开或认证失败等情况

interface WebSocketMessage {
  type: string;
  payload: any;
}

function connectWebSocket(token: string) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    console.log('WebSocket is already connected or connecting.');
    return;
  }

  // 清理之前的重连定时器 (如果有)
  if (reconnectIntervalTimer) {
    clearTimeout(reconnectIntervalTimer);
    reconnectIntervalTimer = null;
  }

  console.log(`Attempting to connect to WebSocket at ${WS_URL}`);
  explicitlyClosed = false;
  socket = new WebSocket(WS_URL); // Token 通过 IDENTIFY 消息发送

  const wsStore = useWsStore(); // 获取 wsStore 实例

  socket.onopen = () => {
    console.log('WebSocket connection established.');
    reconnectAttempts = 0; // 重置重连尝试次数
    wsStore._setConnectedStatus(true); // 更新 Pinia store 状态
    wsStore._setConnectionError(null);

    if (socket && token) {
      console.log('Sending IDENTIFY message with token...');
      socket.send(JSON.stringify({
        type: 'IDENTIFY',
        payload: { token: token }
      }));
    }
    // startHeartbeat(); // (可选) 连接成功后启动心跳
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data as string) as WebSocketMessage;
      // console.log('WebSocket message received:', message.type, message.payload);

      const chatStore = useChatStore();
      const userStore = useUserStore();
      const authStore = useAuthStore(); // 用于处理认证相关的错误

      switch (message.type) {
        case 'IDENTIFIED_SUCCESS':
          console.log('WebSocket identified successfully:', message.payload);
          // 后端 IDENTIFIED_SUCCESS payload 应包含用户信息
          if (message.payload && message.payload.userId) {
            // authStore.setCurrentUser(message.payload); // 假设 authStore 有此方法或直接更新
          }
          // 可以在这里触发一个全局事件或 action 表示 WebSocket 已认证并准备就绪
          break;
        case 'IDENTIFIED_ERROR':
        case 'AUTH_TIMEOUT':
          console.error('WebSocket identification error:', message.payload.message);
          explicitlyClosed = true; // 认证失败，不再尝试重连
          authStore.logout(null); // 触发登出逻辑 (router 实例问题，可考虑事件或状态驱动)
                                  // 或者 authStore.clearAuthData(); 然后UI监听变化
          disconnectWebSocket();
          wsStore._setConnectionError(message.payload.message || 'Authentication failed');
          wsStore._setConnectedStatus(false);
          break;
        case 'SESSION_TERMINATED':
          console.warn('WebSocket session terminated:', message.payload.message);
          alert('您的会话已在其他地方登录，当前会话已终止。'); // 简单提示
          explicitlyClosed = true;
          authStore.logout(null); // 登出
          disconnectWebSocket();
          wsStore._setConnectedStatus(false);
          break;
        case 'NEW_MESSAGE':
          chatStore._addMessageFromWs(message.payload as BackendMessage);
          break;
        case 'MESSAGE_HISTORY':
          chatStore._setMessagesFromWs(
            `${message.payload.chatType}-${message.payload.chatId}`,
            message.payload.messages as BackendMessage[],
            true // fromHistoryFetch = true
          );
          break;
        case 'USER_STATUS_UPDATE':
          userStore.updateUserStatus(message.payload.userId, message.payload.status, message.payload.lastSeenAt);
          break;
        case 'MESSAGES_MARKED_READ': // 自己发送的已读被服务器确认
          // console.log('Server confirmed messages marked as read:', message.payload);
          // chatStore._confirmMessagesReadBySelf(message.payload.chatType, message.payload.chatId, message.payload.lastMessageId);
          break;
        case 'MESSAGE_READ_RECEIPT': // 对方已读你的消息
          // console.log('Peer read receipt received:', message.payload);
          // chatStore._updateMessageReadByPeer(message.payload.chatType, message.payload.chatId, message.payload.readerUserId, message.payload.lastMessageId);
          break;
        case 'FRIEND_REQUEST_ACCEPTED': // 例如：好友请求被接受
        case 'FRIEND_REMOVED':
          console.log('Friendship change notification:', message.type);
          userStore.handleFriendshipChange(); // 通知 userStore 更新好友列表
          break;        // 好友申请相关通知
        case 'FRIEND_REQUEST_RECEIVED':
          console.log('收到好友申请:', message.payload);
          userStore.handleFriendshipChange(); // 刷新好友申请列表
          // 显示通知
          ElNotification({
            title: '新的好友申请',
            message: `${message.payload.fromUser.nickname || message.payload.fromUser.username} 想要添加您为好友`,
            type: 'info',
            duration: 5000
          });
          break;
        case 'FRIEND_REQUEST_DECLINED':
          console.log('好友申请被拒绝:', message.payload);
          userStore.handleFriendshipChange();
          ElNotification({
            title: '好友申请',
            message: `${message.payload.byUser.nickname || message.payload.byUser.username} 拒绝了您的好友申请`,
            type: 'warning',
            duration: 3000
          });
          break;
        // 群组邀请相关通知
        case 'GROUP_INVITATION_RECEIVED':
          console.log('收到群组邀请:', message.payload);
          // 显示群组邀请通知
          ElNotification({
            title: '群组邀请',
            message: `${message.payload.invitedBy.nickname || message.payload.invitedBy.username} 邀请您加入群组 "${message.payload.groupName}"`,
            type: 'info',
            duration: 0, // 不自动关闭
            customClass: 'group-invitation-notification'
          });
          break;
        case 'GROUP_INVITATION_SENT':
          console.log('群组邀请已发送:', message.payload);
          break;
        case 'USER_JOINED_GROUP':
          console.log('用户加入群组:', message.payload);
          ElNotification({
            title: '群组通知',
            message: `${message.payload.user.nickname || message.payload.user.username} 加入了群组 "${message.payload.groupName}"`,
            type: 'success',
            duration: 3000
          });
          break;
        case 'USER_LEFT_GROUP':
          console.log('用户离开群组:', message.payload);
          ElNotification({
            title: '群组通知',
            message: `${message.payload.user.nickname || message.payload.user.username} 离开了群组 "${message.payload.groupName}"`,
            type: 'info',
            duration: 3000
          });
          break;
        case 'GROUP_CREATED':
          console.log('群组已创建:', message.payload);
          break;
        case 'ERROR':
          console.error('WebSocket server error message:', message.payload.message, 'Original action:', message.payload.originalAction);
          // wsStore._setConnectionError(`Server error: ${message.payload.message}`);
          // 根据错误类型决定是否需要提示用户或断开连接
          break;
        case 'PONG':
          // console.log('PONG received from server');
          // 可以用于重置心跳计时器等
          break;
        default:
          console.warn('Unhandled WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };

  socket.onclose = (event) => {
    console.log(`WebSocket connection closed. Code: ${event.code}, Reason: "${event.reason}", WasClean: ${event.wasClean}`);
    // stopHeartbeat(); // (可选) 关闭时停止心跳
    wsStore._setConnectedStatus(false);
    socket = null;

    if (!explicitlyClosed) { // 如果不是主动断开或认证失败等明确不再重连的情况
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const reconnectDelay = RECONNECT_INTERVAL_BASE * Math.pow(2, reconnectAttempts -1); // 指数退避
        console.log(`Attempting to reconnect WebSocket in ${reconnectDelay / 1000}s... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        wsStore._setConnectionError(`Connection lost. Reconnecting... (Attempt ${reconnectAttempts})`);
        
        if (reconnectIntervalTimer) clearTimeout(reconnectIntervalTimer);
        reconnectIntervalTimer = setTimeout(() => {
          const authStore = useAuthStore();
          if (authStore.token) {
            connectWebSocket(authStore.token);
          } else {
            console.log('No token available, cannot attempt WebSocket reconnect.');
            explicitlyClosed = true; // 没有token，标记为不再重连
            wsStore._setConnectionError('Connection lost. Please login again to connect.');
          }
        }, reconnectDelay);
      } else {
        console.error('WebSocket max reconnect attempts reached. Giving up.');
        wsStore._setConnectionError('Failed to connect to server after multiple attempts. Please check your connection or try again later.');
        // 这里可以触发一个全局事件通知UI，连接彻底断开
      }
    } else {
        console.log('WebSocket closed explicitly, no further reconnect attempts.');
        if (!wsStore.error) { // 如果没有特定错误，设置一个通用断开消息
            wsStore._setConnectionError('Disconnected from server.');
        }
    }
  };

  socket.onerror = (errorEvent) => {
    // onerror 事件对象通常比较简单，更详细的关闭原因在 onclose 事件的 event.code 和 event.reason 中
    console.error('WebSocket error event:', errorEvent);
    // wsStore._setConnectionError('WebSocket connection error occurred.');
    // onerror 几乎总是会触发 onclose，所以主要的状态更新和重连逻辑放在 onclose 中处理
  };
}

function disconnectWebSocket() {
  // stopHeartbeat(); // (可选)
  if (reconnectIntervalTimer) {
    clearTimeout(reconnectIntervalTimer);
    reconnectIntervalTimer = null;
  }
  if (socket) {
    console.log('Explicitly disconnecting WebSocket...');
    explicitlyClosed = true; // 标记为主动断开
    socket.close(1000, "User initiated disconnect"); // 1000 表示正常关闭
    socket = null;
  }
  const wsStore = useWsStore();
  wsStore._setConnectedStatus(false);
  // wsStore._setConnectionError(null); // 主动断开时可以清除错误
  reconnectAttempts = 0; // 重置尝试次数
}

function sendMessage(message: WebSocketMessage) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    // console.log('Sending WebSocket message:', message.type, message.payload);
    socket.send(JSON.stringify(message));
  } else {
    console.error('WebSocket is not connected or not open. Cannot send message:', message);
    const wsStore = useWsStore();
    wsStore._setConnectionError('Cannot send message: Connection unavailable.');
    // 可以考虑实现消息队列或提示用户
    // alert('Connection to server lost. Message not sent.');
  }
}

// --- (可选) 心跳机制 ---
// let heartBeatTimer: number | null = null;
// const HEARTBEAT_INTERVAL = 30000; // 30秒

// function startHeartbeat() {
//   if (heartBeatTimer) clearInterval(heartBeatTimer);
//   heartBeatTimer = setInterval(() => {
//     if (socket && socket.readyState === WebSocket.OPEN) {
//       sendMessage({ type: 'PING', payload: { timestamp: Date.now() } });
//     } else {
//       // 如果socket不是OPEN状态，可能连接正在建立或已断开，此时不应发送PING
//       // 可以在onopen中启动心跳，在onclose中停止心跳
//       // console.log('Heartbeat: WebSocket not open, skipping PING.');
//     }
//   }, HEARTBEAT_INTERVAL);
//   console.log('WebSocket heartbeat started.');
// }

// function stopHeartbeat() {
//   if (heartBeatTimer) {
//     clearInterval(heartBeatTimer);
//     heartBeatTimer = null;
//     console.log('WebSocket heartbeat stopped.');
//   }
// }

export default {
  connect: connectWebSocket,
  disconnect: disconnectWebSocket,
  send: sendMessage,
  getSocket: () => socket, // 谨慎暴露，主要用于 wsStore 判断连接状态
};