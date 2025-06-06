// src/utils/timeUtils.ts

/**
 * 解析数据库时间戳并转换为本地时间
 * SQLite CURRENT_TIMESTAMP 返回 UTC 时间格式：YYYY-MM-DD HH:MM:SS
 * 需要添加 'Z' 后缀以正确处理为 UTC 时间，然后转换为本地时间
 */
export function parseDbTimestamp(timestamp: string): Date {
  if (!timestamp) return new Date(0);
  
  // 如果已经是 ISO 格式（包含 T），直接解析
  // 否则添加 'Z' 后缀表示这是 UTC 时间
  const isoString = timestamp.includes('T') ? timestamp : timestamp + 'Z';
  return new Date(isoString);
}

/**
 * 格式化时间戳为时间显示（HH:MM）
 */
export function formatMessageTime(timestamp: string): string {
  if (!timestamp) return '';
  const date = parseDbTimestamp(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * 格式化时间戳为会话列表显示（今天显示时间，昨天显示"昨天"，更早显示日期）
 */
export function formatConversationTime(timestamp: string): string {
  if (!timestamp) return '';
  const date = parseDbTimestamp(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  } else {
    // 更早的日期，显示 月/日
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}

/**
 * 获取时间戳的毫秒数，用于排序比较
 */
export function getTimestamp(timestamp: string): number {
  if (!timestamp) return 0;
  return parseDbTimestamp(timestamp).getTime();
}
