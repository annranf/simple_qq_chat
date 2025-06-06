// src/store/user.ts
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { User, ChatSession } from '../types'
import friendshipService from '../services/friendshipService'
import userService from '../services/userService' // 用于根据ID获取用户（如果需要）
import { useChatStore } from './chat' // 导入 chatStore
import { useAuthStore } from './auth'

export const useUserStore = defineStore('user', () => {
  const usersMap = reactive<Map<number, User>>(new Map())
  const isLoadingFriends = ref(false)

  const authStore = useAuthStore()

  async function fetchFriendsAndPopulateSessions() {
    if (!authStore.currentUser) return;
    isLoadingFriends.value = true;
    const chatStore = useChatStore(); // 在 action 内部获取，避免循环依赖问题
    try {
      const friendships = await friendshipService.listFriends(); // 后端应返回 FriendshipWithPeer[]
      
      const friendUsers: User[] = [];
      const friendSessions: ChatSession[] = friendships.map(friendship => {
        const peerUser = friendship.peer; // 从 friendship 对象中获取好友信息
        friendUsers.push(peerUser);
        usersMap.set(peerUser.id, peerUser); // 缓存用户信息

        return {
          id: peerUser.id, // 会话ID是对方用户ID
          type: 'user',
          name: peerUser.nickname || peerUser.username,
          avatarUrl: peerUser.avatarUrl,
          lastMessage: undefined, // 将由 chatStore 或后端会话接口填充
          unreadCount: 0,         // 将由 chatStore 或后端会话接口填充
          peerUserStatus: peerUser.status, // 好友的在线状态
        };
      });

      chatStore.addOrUpdateUserSessions(friendSessions); // 调用 chatStore action 更新会话

    } catch (error) {
      console.error('Failed to fetch friends:', error);
    } finally {
      isLoadingFriends.value = false;
    }
  }

  function updateUserStatus(userId: number, status: User['status'], lastSeenAt?: string) {
    const user = usersMap.get(userId);
    if (user) {
      user.status = status;
      if (status === 'offline' && lastSeenAt) {
        user.lastSeenAt = lastSeenAt;
      }
      usersMap.set(userId, { ...user }); // 确保响应式更新
    }
    
    // 通知 chatStore 更新对应会话的状态
    const chatStore = useChatStore();
    chatStore.updateUserSessionStatus(userId, status);
  }

  async function findOrFetchUserById(userId: number): Promise<User | undefined> {
    if (usersMap.has(userId)) {
      return usersMap.get(userId);
    }
    try {
      const user = await userService.getUserById(userId);
      if (user) {
        usersMap.set(userId, user);
        return user;
      }
    } catch (error) {
      console.error(`Failed to fetch user ${userId}:`, error);
    }
    return undefined;
  }

  // 当收到好友相关 WebSocket 通知时调用
  function handleFriendshipChange() {
    // 例如，好友被移除或新好友请求被接受，重新拉取好友列表
    fetchFriendsAndPopulateSessions();
  }


  return {
    usersMap,
    isLoadingFriends,
    fetchFriendsAndPopulateSessions,
    updateUserStatus,
    findOrFetchUserById,
    handleFriendshipChange,
  }
})