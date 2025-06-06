// src/types/index.ts
export interface User {
  id: number;
  username: string;
  nickname?: string;
  avatarUrl?: string;
  status?: 'online' | 'offline' | 'away' | 'busy'; // 根据后端实际状态
  lastSeenAt?: string;
  bio?: string; // 个人描述
  createdAt?: string; // 注册时间
  // ... 其他字段
}

export interface MessageContentMedia {
  type: 'image' | 'video' | 'audio' | 'file';
  id: number; // media_id
  fileName?: string;
  url: string; // file_path
  mimeType?: string;
  sizeBytes?: number;
  uploaderId?: number;
  metadata?: any;
}

export interface MessageContentSticker {
  type: 'sticker';
  stickerId: number; // stickers.id
  mediaId: number;   // media_attachments.id of sticker image
  url: string;       // file_path to sticker image
  mimeType?: string;
  metadata?: any;    // e.g., width, height
}

export type MessageContent = string | MessageContentMedia | MessageContentSticker; // 文本是 string

export interface Message {
  id: number;
  sender_id: number | null; // null for system messages
  sender_username?: string;
  sender_nickname?: string;
  sender_avatar_url?: string;
  sender_display_name?: string; // 处理后的显示名
  receiver_type: 'user' | 'group';
  receiver_id: number;
  content_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'system_notification';
  content: MessageContent; // 可能是字符串，也可能是对象 (媒体/表情)
  message_metadata?: any; // 消息本身的元数据
  reply_to_message_id?: number | null;
  client_message_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
  // 前端可能还会添加一些本地状态，如 isSending, sendError
}

export interface ChatSession {
    id: number; // peerUserId or groupId
    type: 'user' | 'group';
    name: string;
    avatarUrl?: string;
    lastMessage?: Message; // 最新消息对象
    unreadCount: number;
    // 对于私聊，可能还包含对方用户的状态
    peerUserStatus?: 'online' | 'offline' | 'away' | 'busy';
    // ...其他需要的信息
}

export interface Friendship {
  id: number;
  user1_id?: number;
  user2_id?: number;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  action_user_id?: number;
  peer: User;
  created_at?: string;
  updated_at?: string;
}
// ... 更多类型定义 (Group, StickerPack, Sticker, etc.)
export interface MediaAttachment {
  id: number;
  uploader_id?: number | null;
  file_name: string;
  file_path: string; // relative path
  mime_type: string;
  size_bytes: number;
  checksum?: string | null;
  metadata?: any; // e.g., { width, height, duration, type: 'image'/'video' }
  created_at: string;
}

export interface Sticker {
  id: number; // stickers.id
  mediaId: number; // media_attachments.id of sticker image
  keywords?: string | null;
  description?: string | null;
  url: string; // file_path to sticker image
  mimeType: string;
  metadata?: any; // e.g., { width, height }
}

export interface StickerPack {
  id: number; // sticker_packs.id
  name: string;
  thumbnailUrl?: string | null; // file_path to pack thumbnail
  stickers: Sticker[];
  // sort_order?: number;
}