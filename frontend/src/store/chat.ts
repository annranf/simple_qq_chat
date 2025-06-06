// src/store/chat.ts
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { ChatSession, Message, StickerPack, User } from '../types'
import { useAuthStore } from './auth'
import { useWsStore } from './ws'
import { useUserStore } from './user' // 引入 userStore
import groupService from '../services/groupService' // 假设用于获取群组
import stickerService from '../services/stickerService'
import { getTimestamp } from '../utils/timeUtils'

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<ChatSession[]>([])
  const currentSessionId = ref<number | null>(null)
  const currentSessionType = ref<'user' | 'group' | null>(null)
  const messagesMap = reactive<Map<string, Message[]>>(new Map())
  const isLoadingSessions = ref(false)
  const isLoadingMessages = ref(false)
  const canLoadMoreMessagesMap = reactive<Map<string, boolean>>(new Map())

  const stickerPacks = ref<StickerPack[]>([])
  const isLoadingStickerPacks = ref(false)

  const authStore = useAuthStore()
  const wsStore = useWsStore()
  // const userStore = useUserStore(); // 在 action 内部获取，避免初始化时的循环依赖问题

  const currentSessionKey = computed(() => {
    if (currentSessionId.value && currentSessionType.value) {
      return `${currentSessionType.value}-${currentSessionId.value}`
    }
    return null
  })

  const currentMessages = computed((): Message[] => {
    return currentSessionKey.value ? messagesMap.get(currentSessionKey.value) || [] : []
  })
  
  const canLoadMoreMessages = computed((): boolean => {
    return currentSessionKey.value ? canLoadMoreMessagesMap.get(currentSessionKey.value) ?? true : false;
  });  const sortedSessions = computed(() => {
    return [...sessions.value].sort((a, b) => {
        // 使用时间工具函数处理 UTC 时间戳
        const timeA = a.lastMessage?.created_at ? getTimestamp(a.lastMessage.created_at) : (a.type === 'user' ? 1 : 0); // 新建无消息的会话排在后面一点
        const timeB = b.lastMessage?.created_at ? getTimestamp(b.lastMessage.created_at) : (b.type === 'user' ? 1 : 0);
        return timeB - timeA;
      });
  });

  // 由 userStore 调用，添加或更新用户会话
  function addOrUpdateUserSessions(userSessions: ChatSession[]) {
    userSessions.forEach(newSession => {
      const existingIndex = sessions.value.findIndex(s => s.type === 'user' && s.id === newSession.id);
      if (existingIndex !== -1) {
        // 更新现有会话 (例如在线状态)，保留 lastMessage 和 unreadCount
        sessions.value[existingIndex] = { 
            ...sessions.value[existingIndex], // 保留旧的 lastMessage, unreadCount
            name: newSession.name, 
            avatarUrl: newSession.avatarUrl,
            peerUserStatus: newSession.peerUserStatus,
        };
      } else {
        sessions.value.push(newSession);
      }
    });
  }

  // 由 userStore 调用，更新用户会话的在线状态
  function updateUserSessionStatus(userId: number, status: User['status']) {
    const session = sessions.value.find(s => s.type === 'user' && s.id === userId);
    if (session) {
      session.peerUserStatus = status === 'online' || status === 'offline' ? status : undefined;
    }
  }

  async function fetchGroupSessions() {
    if (!authStore.currentUser) return;
    isLoadingSessions.value = true; // 可以用一个更细分的 loading 状态
    try {
      const groups = await groupService.getMyGroups(); // 假设返回 Group[] (包含id, name, avatar_url, last_message, unread_count)
      const groupSessions: ChatSession[] = groups.map(g => ({
        id: g.id,
        type: 'group',
        name: g.name,
        avatarUrl: g.avatar_url,
        lastMessage: g.last_message_content && g.last_message_timestamp ? { 
            id: 0, // lastMessage 可能没有完整ID，或者后端会提供
            sender_id: null, // 未知或不重要
            content: g.last_message_content, 
            content_type: 'text', // 假设预览是文本
            created_at: g.last_message_timestamp as string,
            receiver_type: 'group',
            receiver_id: g.id,
        } : undefined,
        unreadCount: g.unread_count || 0, // 假设后端会返回未读数
        // memberCount: g.active_member_count // 假设后端返回成员数
      }));
      
      // 合并到 sessions.value，避免重复
      const existingGroupSessionIds = new Set(sessions.value.filter(s => s.type === 'group').map(s => s.id));
      const newGroupSessions = groupSessions.filter(gs => !existingGroupSessionIds.has(gs.id));
      sessions.value.push(...newGroupSessions);
      // 更新已存在的群组会话
      groupSessions.filter(gs => existingGroupSessionIds.has(gs.id)).forEach(updatedGs => {
        const index = sessions.value.findIndex(s => s.type === 'group' && s.id === updatedGs.id);
        if (index !== -1) {
            sessions.value[index] = { ...sessions.value[index], ...updatedGs };
        }
      });

    } catch (error) {
      console.error("Failed to fetch user groups:", error);
    } finally {
      isLoadingSessions.value = false;
    }
  }

  async function fetchInitialData() {
    // 这个 action 在 ChatView.vue onMounted 时调用
    isLoadingSessions.value = true;
    const userStore = useUserStore();
    await Promise.all([
        userStore.fetchFriendsAndPopulateSessions(),
        fetchGroupSessions(),
        fetchStickerPacks() // 获取表情包
    ]).catch(err => {
        console.error("Error fetching initial chat data:", err);
    }).finally(() => {
        isLoadingSessions.value = false;
    });
  }


  function setCurrentSession(sessionId: number, sessionType: 'user' | 'group') {
    if (currentSessionId.value === sessionId && currentSessionType.value === sessionType) {
        return; // 已经是当前会话，无需操作
    }
    currentSessionId.value = sessionId;
    currentSessionType.value = sessionType;
    
    const session = sessions.value.find(s => s.id === sessionId && s.type === sessionType);
    if (session) {
        if (session.unreadCount > 0) {
            const lastMsg = session.lastMessage || (messagesMap.get(`${sessionType}-${sessionId}`)?.slice(-1)[0]);
            if (lastMsg) {
                 wsStore.sendMessage('MARK_AS_READ', {
                    chatType: sessionType,
                    chatId: sessionId,
                    lastMessageId: lastMsg.id
                 });
            }
            session.unreadCount = 0; 
        }
    }
    fetchMessagesForCurrentSession(true);
  }

  async function fetchMessagesForCurrentSession(isInitialLoad = false) {
    if (!currentSessionId.value || !currentSessionType.value) return;
    isLoadingMessages.value = true;
    const key = currentSessionKey.value!;

    try {
      if (isInitialLoad) {
         messagesMap.set(key, []); 
         canLoadMoreMessagesMap.set(key, true);
      }
      wsStore.sendMessage('FETCH_HISTORY', {
        chatType: currentSessionType.value,
        chatId: currentSessionId.value,
        beforeId: isInitialLoad ? null : (messagesMap.get(key)?.[0]?.id || null),
        limit: 20 
      });
    } catch (error) {
      console.error('Failed to send FETCH_HISTORY request:', error);
      isLoadingMessages.value = false; // 出错时也应该重置
    }
  }
  
  async function fetchMoreMessagesForCurrentSession() {
    if (!currentSessionId.value || !currentSessionType.value || !canLoadMoreMessages.value) return;
    const key = currentSessionKey.value!;
    const currentMsgs = messagesMap.get(key) || [];
    const beforeId = currentMsgs.length > 0 ? currentMsgs[0].id : null;

    if (beforeId === null && currentMsgs.length > 0) { 
        canLoadMoreMessagesMap.set(key, false);
        return;
    }
    // isLoadingMessages.value = true; // 使用 MessageList 内部的 isLoadingMore
    try {
         wsStore.sendMessage('FETCH_HISTORY', {
            chatType: currentSessionType.value,
            chatId: currentSessionId.value,
            beforeId: beforeId,
            limit: 20
        });
    } catch (error) {
        console.error('Failed to send fetch more messages request:', error);
    }
  }
  function setMessages(chatKey: string, newMessages: Message[], fromHistoryFetch: boolean) {
    const existingMessages = messagesMap.get(chatKey) || [];
    if (fromHistoryFetch) { 
        // 后端已经返回正序排列的历史消息（旧->新），直接加到现有消息数组的前面
        // 不需要再次 reverse，因为后端 messageRepository 已经处理了排序
        messagesMap.set(chatKey, [...newMessages, ...existingMessages]); 
        if (newMessages.length === 0 || newMessages.length < 20) { // 如果返回的条数少于请求的条数或为空，说明没有更多了
            canLoadMoreMessagesMap.set(chatKey, false);
        } else {
            canLoadMoreMessagesMap.set(chatKey, true);
        }
    } else { // 新来的单条消息，加到末尾
        messagesMap.set(chatKey, [...existingMessages, ...newMessages]); // newMessages 此时应该是 [singleNewMessage]
    }
    isLoadingMessages.value = false;
  }
  
  function addMessage(message: Message) {
    // 确定这条消息属于哪个会话 (key)
    let targetSessionId: number;
    let targetSessionType: 'user' | 'group' = message.receiver_type;
    const currentUser = authStore.currentUser;
    if (!currentUser) return;

    if (targetSessionType === 'user') {
      targetSessionId = message.sender_id === currentUser.id ? message.receiver_id : message.sender_id!;
    } else { // group
      targetSessionId = message.receiver_id;
    }
    const key = `${targetSessionType}-${targetSessionId}`;

    const currentList = messagesMap.get(key) || [];
    if (!currentList.find(m => m.id === message.id || (m.client_message_id && message.client_message_id && m.client_message_id === message.client_message_id))) {
         messagesMap.set(key, [...currentList, message]);
    }

    updateSessionWithMessage(message, targetSessionId, targetSessionType); // 调用更新会话列表的函数
  }

  async function updateSessionWithMessage(message: Message, sessionId: number, sessionType: 'user' | 'group') {
    const userStore = useUserStore(); // 获取 userStore 实例
    let session = sessions.value.find(s => s.id === sessionId && s.type === sessionType);
    
    if (session) {
      session.lastMessage = message;
      if (sessionType === currentSessionType.value && sessionId === currentSessionId.value) {
        // 如果是当前会话，且用户正在查看，不增加未读数，并发送已读回执
        // （这里可以做得更智能，比如检查浏览器窗口是否激活）
        // 实际的已读回执发送由 setCurrentSession 或其他用户操作触发
      } else if (message.sender_id !== authStore.currentUser?.id) {
        session.unreadCount = (session.unreadCount || 0) + 1;
      }
      // 将此会话移到列表顶部
      const sessionIndex = sessions.value.indexOf(session);
      if (sessionIndex > -1) {
        sessions.value.splice(sessionIndex, 1);
        sessions.value.unshift(session);
      }
    } else {
      // 会话不存在，需要创建它
      isLoadingSessions.value = true; // 防止重复创建
      let newSession: ChatSession | undefined;
      if (sessionType === 'user') {
        const peerUser = await userStore.findOrFetchUserById(sessionId);
        if (peerUser) {
          newSession = {
            id: peerUser.id, type: 'user', name: peerUser.nickname || peerUser.username,
            avatarUrl: peerUser.avatarUrl, lastMessage: message, unreadCount: 1, peerUserStatus: (peerUser.status === 'online' || peerUser.status === 'offline' ? peerUser.status : undefined)
          };
        }
      } else { // group
        const groupInfo = await groupService.getGroupDetails(sessionId); // 假设有此接口
        if (groupInfo) {
          newSession = {
            id: groupInfo.id, type: 'group', name: groupInfo.name,
            avatarUrl: groupInfo.avatar_url, lastMessage: message, unreadCount: 1,
            // memberCount: groupInfo.member_count
          };
        }
      }
      if (newSession) {
        sessions.value.unshift(newSession);
      }
      isLoadingSessions.value = false;
    }
  }
  async function fetchStickerPacks() {
    if (stickerPacks.value.length > 0) return; // 已经加载过了
    isLoadingStickerPacks.value = true;
    try {
        const packs = await stickerService.getAvailableStickerPacks();
        stickerPacks.value = packs;
    } catch (error) {
        console.error("Failed to fetch sticker packs:", error);
    } finally {
        isLoadingStickerPacks.value = false;
    }
  }  async function startPrivateChat(userId: number) {
    // 查找是否已存在与该用户的会话
    const existingSession = sessions.value.find(
      session => session.type === 'user' && session.id === userId
    );
    
    if (existingSession) {
      // 如果已存在，直接切换到该会话
      setCurrentSession(userId, 'user');
    } else {
      // 如果不存在，创建新会话并切换
      const userStore = useUserStore();
      const user = await userStore.findOrFetchUserById(userId);
      
      if (user) {        const newSession: ChatSession = {
          id: userId,
          type: 'user',
          name: user.nickname || user.username,
          avatarUrl: user.avatarUrl,
          lastMessage: undefined,
          unreadCount: 0,
          peerUserStatus: user.status === 'online' || user.status === 'offline' ? user.status : undefined
        };
        
        sessions.value.push(newSession);
        setCurrentSession(userId, 'user');
      }
    }
  }

  async function startGroupChat(groupId: number) {
    // 查找是否已存在该群组的会话
    const existingSession = sessions.value.find(
      session => session.type === 'group' && session.id === groupId
    );
    
    if (existingSession) {
      // 如果已存在，直接切换到该会话
      setCurrentSession(groupId, 'group');
    } else {
      // 如果不存在，创建新会话并切换
      try {
        const groupDetail = await groupService.getGroupDetails(groupId);
        
        if (groupDetail) {
          const newSession: ChatSession = {
            id: groupId,
            type: 'group',
            name: groupDetail.name,
            avatarUrl: groupDetail.avatar_url,
            lastMessage: undefined,
            unreadCount: 0,
            // memberCount: groupDetail.active_member_count
          };
          
          sessions.value.push(newSession);
          setCurrentSession(groupId, 'group');
        }
      } catch (error) {
        console.error('Failed to start group chat:', error);
        throw error;
      }
    }
  }  return {
    sessions, // 直接使用 sortedSessions 在模板中
    sortedSessions, // 用于模板循环
    currentSessionId,
    currentSessionType,
    // messagesMap, // 不直接暴露 Map
    currentMessages,
    isLoadingSessions,
    isLoadingMessages,
    canLoadMoreMessages,
    stickerPacks,
    isLoadingStickerPacks,
    fetchInitialData, // 改为调用这个统一的 action
    // fetchUserGroups, // 由 fetchInitialData 内部调用
    addOrUpdateUserSessions, // 由 userStore 调用
    updateUserSessionStatus, // 由 userStore 调用
    setCurrentSession,
    // fetchMessagesForCurrentSession, // 由 setCurrentSession 内部调用
    fetchMoreMessagesForCurrentSession,
    _setMessagesFromWs: setMessages,  // 由 wsService 的 onmessage 调用 (改名以示内部)
    _addMessageFromWs: addMessage,  // 由 wsService 的 onmessage 调用 (改名以示内部)
    // updateSessionWithMessage, // 由 _addMessageFromWs 内部调用
    fetchStickerPacks,
    startPrivateChat, // 私聊方法
    startGroupChat, // 群聊方法
  }
})