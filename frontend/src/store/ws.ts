// src/store/ws.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import wsService from '../websocket/wsService'

export const useWsStore = defineStore('websocket', () => {
  const isConnected = ref(false) // 可以通过 socket.readyState 判断，但 store 里有个状态方便些
  const error = ref<string | null>(null)

//   function connect(token: string) {
//     if (wsService.getSocket() && wsService.getSocket()?.readyState === WebSocket.OPEN) {
//         isConnected.value = true;
//         return;
//     }
//     try {
//       wsService.connect(token)
//       // isConnected 和 error 的状态应由 wsService 内部的 onopen, onclose, onerror 回调来更新
//       // 这里可以监听 wsService 的状态变化或事件（如果 wsService 实现了事件发射器）
//       // 简单起见，我们暂时不在这里直接设置 isConnected，依赖 wsService 的回调
//     } catch (e: any) {
//       error.value = e.message || 'Failed to initiate WebSocket connection.'
//       isConnected.value = false
//     }
//   }

  function connect(token: string) {
    // 移除这里的 isConnected.value = true/false;
    wsService.connect(token); // wsService 内部会通过回调更新本 store 状态
    }

    function disconnect() {
    wsService.disconnect();
    // isConnected.value = false; // wsService 内部会通过回调更新
    }

  function sendMessage(type: string, payload: any) {
    wsService.send({ type, payload })
  }

  // 这部分逻辑可以移到 wsService.ts 的回调中直接更新相关 store
  // 例如，在 wsService.ts 的 onopen 中：
  // const wsStore = useWsStore(); wsStore.setConnected(true);
  // 在 onclose/onerror 中：
  // const wsStore = useWsStore(); wsStore.setConnected(false); wsStore.setError('some error');
  function setConnected(status: boolean) {
    isConnected.value = status;
    if (!status) error.value = null; // Clear error on disconnect if reconnected
  }
  function setError(errorMessage: string | null) {
    error.value = errorMessage;
  }


  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
    // 用于 wsService 回调更新状态
    _setConnectedStatus: setConnected,
    _setConnectionError: setError,
  }
})