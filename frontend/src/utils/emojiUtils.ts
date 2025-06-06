// 表情包处理工具类
import { getEmojiById, type BuiltInEmoji } from '../data/builtInEmojis';

// 表情文本格式：:emoji_id: (如 :smile:, :heart:)
const EMOJI_PATTERN = /:([a-z_]+):/g;

/**
 * 将包含表情代码的文本转换为HTML显示
 * 例：":smile: 你好 :heart:" => "😊 你好 ❤️"
 */
export function parseEmojisToHtml(text: string): string {
  return text.replace(EMOJI_PATTERN, (match, emojiId) => {
    const emoji = getEmojiById(emojiId);
    if (emoji) {
      return `<span class="builtin-emoji" title="${emoji.name}">${emoji.unicode}</span>`;
    }
    return match; // 如果找不到对应表情，保持原文
  });
}

/**
 * 将包含表情代码的文本转换为纯文本显示（用于消息预览等）
 * 例：":smile: 你好 :heart:" => "😊 你好 ❤️"
 */
export function parseEmojisToText(text: string): string {
  return text.replace(EMOJI_PATTERN, (match, emojiId) => {
    const emoji = getEmojiById(emojiId);
    if (emoji) {
      return emoji.unicode;
    }
    return match;
  });
}

/**
 * 在光标位置插入表情代码
 */
export function insertEmojiIntoText(text: string, cursorPos: number, emojiId: string): { newText: string, newCursorPos: number } {
  const emojiCode = `:${emojiId}:`;
  const before = text.substring(0, cursorPos);
  const after = text.substring(cursorPos);
  const newText = before + emojiCode + after;
  const newCursorPos = cursorPos + emojiCode.length;
  
  return { newText, newCursorPos };
}

/**
 * 检查文本中是否包含表情代码
 */
export function hasEmojiCodes(text: string): boolean {
  return EMOJI_PATTERN.test(text);
}

/**
 * 提取文本中的所有表情代码
 */
export function extractEmojiCodes(text: string): string[] {
  const matches = text.match(EMOJI_PATTERN);
  if (!matches) return [];
  
  return matches.map(match => match.slice(1, -1)); // 去掉冒号
}

/**
 * 获取最近使用的表情（可以从localStorage读取）
 */
export function getRecentEmojis(): BuiltInEmoji[] {
  try {
    const recent = localStorage.getItem('recent-emojis');
    if (!recent) return [];
    
    const recentIds: string[] = JSON.parse(recent);
    return recentIds.map(id => getEmojiById(id)).filter(Boolean) as BuiltInEmoji[];
  } catch {
    return [];
  }
}

/**
 * 添加到最近使用的表情
 */
export function addToRecentEmojis(emojiId: string): void {
  try {
    const recent = getRecentEmojis();
    const existingIndex = recent.findIndex(emoji => emoji.id === emojiId);
    
    // 如果已存在，移到最前面
    if (existingIndex !== -1) {
      recent.splice(existingIndex, 1);
    }
    
    const emoji = getEmojiById(emojiId);
    if (emoji) {
      recent.unshift(emoji);
      
      // 只保留最近15个
      const recentIds = recent.slice(0, 15).map(e => e.id);
      localStorage.setItem('recent-emojis', JSON.stringify(recentIds));
    }
  } catch (error) {
    console.error('Failed to save recent emoji:', error);
  }
}
