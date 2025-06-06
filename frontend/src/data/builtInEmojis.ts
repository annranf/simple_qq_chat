// 内置表情包数据
export interface BuiltInEmoji {
  id: string;
  name: string;
  unicode: string;
  keywords: string[];
  category: string;
}

export const BUILTIN_EMOJIS: BuiltInEmoji[] = [
  // 笑脸类
  { id: 'smile', name: '微笑', unicode: '😊', keywords: ['smile', '微笑', 'happy'], category: '表情' },
  { id: 'laugh', name: '大笑', unicode: '😂', keywords: ['laugh', '大笑', 'haha', 'funny'], category: '表情' },
  { id: 'wink', name: '眨眼', unicode: '😉', keywords: ['wink', '眨眼', 'flirt'], category: '表情' },
  { id: 'grin', name: '咧嘴笑', unicode: '😁', keywords: ['grin', '咧嘴笑', 'happy'], category: '表情' },
  { id: 'joy', name: '开心', unicode: '😄', keywords: ['joy', '开心', 'happy'], category: '表情' },
  
  // 爱心类
  { id: 'heart', name: '红心', unicode: '❤️', keywords: ['heart', '爱心', 'love'], category: '心情' },
  { id: 'blue_heart', name: '蓝心', unicode: '💙', keywords: ['blue', 'heart', '蓝心'], category: '心情' },
  { id: 'green_heart', name: '绿心', unicode: '💚', keywords: ['green', 'heart', '绿心'], category: '心情' },
  { id: 'yellow_heart', name: '黄心', unicode: '💛', keywords: ['yellow', 'heart', '黄心'], category: '心情' },
  { id: 'purple_heart', name: '紫心', unicode: '💜', keywords: ['purple', 'heart', '紫心'], category: '心情' },
  
  // 表情类
  { id: 'sad', name: '难过', unicode: '😢', keywords: ['sad', '难过', 'cry'], category: '表情' },
  { id: 'angry', name: '生气', unicode: '😠', keywords: ['angry', '生气', 'mad'], category: '表情' },
  { id: 'surprise', name: '惊讶', unicode: '😮', keywords: ['surprise', '惊讶', 'wow'], category: '表情' },
  { id: 'thinking', name: '思考', unicode: '🤔', keywords: ['thinking', '思考', 'hmm'], category: '表情' },
  { id: 'cool', name: '酷', unicode: '😎', keywords: ['cool', '酷', 'sunglasses'], category: '表情' },
  
  // 手势类
  { id: 'thumbs_up', name: '点赞', unicode: '👍', keywords: ['thumbs', 'up', '点赞', 'good'], category: '手势' },
  { id: 'thumbs_down', name: '差评', unicode: '👎', keywords: ['thumbs', 'down', '差评', 'bad'], category: '手势' },
  { id: 'ok_hand', name: '好的', unicode: '👌', keywords: ['ok', 'hand', '好的'], category: '手势' },
  { id: 'victory', name: '胜利', unicode: '✌️', keywords: ['victory', '胜利', 'peace'], category: '手势' },
  { id: 'pray', name: '祈祷', unicode: '🙏', keywords: ['pray', '祈祷', 'please'], category: '手势' },
  
  // 动物类
  { id: 'cat', name: '猫', unicode: '🐱', keywords: ['cat', '猫', 'kitten'], category: '动物' },
  { id: 'dog', name: '狗', unicode: '🐶', keywords: ['dog', '狗', 'puppy'], category: '动物' },
  { id: 'panda', name: '熊猫', unicode: '🐼', keywords: ['panda', '熊猫'], category: '动物' },
  { id: 'bear', name: '熊', unicode: '🐻', keywords: ['bear', '熊'], category: '动物' },
  { id: 'rabbit', name: '兔子', unicode: '🐰', keywords: ['rabbit', '兔子'], category: '动物' },
];

export const EMOJI_CATEGORIES = [
  '表情',
  '心情', 
  '手势',
  '动物'
];

// 通过ID获取表情
export function getEmojiById(id: string): BuiltInEmoji | undefined {
  return BUILTIN_EMOJIS.find(emoji => emoji.id === id);
}

// 通过关键词搜索表情
export function searchEmojis(keyword: string): BuiltInEmoji[] {
  const lowercaseKeyword = keyword.toLowerCase();
  return BUILTIN_EMOJIS.filter(emoji => 
    emoji.keywords.some(k => k.toLowerCase().includes(lowercaseKeyword)) ||
    emoji.name.includes(keyword)
  );
}

// 按分类获取表情
export function getEmojisByCategory(category: string): BuiltInEmoji[] {
  return BUILTIN_EMOJIS.filter(emoji => emoji.category === category);
}
