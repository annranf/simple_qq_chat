// src/utils/errorUtils.ts
// 将后端英文错误信息转换为用户友好的中文提示

export function translateFriendshipError(originalMessage: string): string {
  const errorMap: Record<string, string> = {
    // 好友申请相关
    'already friends': '已经是好友啦！',
    'already sent': '好友请求已发送，请等待对方回应',
    'already sent you a friend request': '对方已经向你发送了好友请求，请到申请列表中处理',
    'blocked you': '无法发送请求，对方可能已将你屏蔽',
    'have blocked this user': '你已屏蔽此用户，请先解除屏蔽',
    'oneself': '不能添加自己为好友',
    
    // 好友申请处理相关
    'No pending': '该好友申请已被处理或不存在',
    'request not found': '好友申请不存在或已过期',
    'user not found': '用户不存在',
    
    // 删除好友相关
    'Not currently friends': '当前不是好友关系',
    'Friendship not found': '好友关系不存在或已被删除',
    
    // 通用错误
    'Unauthorized': '未授权，请重新登录',
    'Server error': '服务器错误，请稍后重试',
    'Network error': '网络错误，请检查网络连接'
  }

  // 查找匹配的错误信息
  for (const [key, value] of Object.entries(errorMap)) {
    if (originalMessage.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  // 如果没有匹配的翻译，返回原始信息
  return originalMessage
}

export function translateUserError(originalMessage: string): string {
  const errorMap: Record<string, string> = {
    'User not found': '用户不存在',
    'Username already exists': '用户名已存在',
    'Email already exists': '邮箱已存在',
    'Invalid credentials': '用户名或密码错误',
    'Password too weak': '密码强度不够',
    'Invalid email format': '邮箱格式不正确'
  }

  for (const [key, value] of Object.entries(errorMap)) {
    if (originalMessage.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  return originalMessage
}

export function translateAuthError(originalMessage: string): string {
  const errorMap: Record<string, string> = {
    'Token expired': '登录已过期，请重新登录',
    'Invalid token': '登录信息无效，请重新登录',
    'Access denied': '访问被拒绝',
    'Permission denied': '权限不足'
  }

  for (const [key, value] of Object.entries(errorMap)) {
    if (originalMessage.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  return originalMessage
}

export function translateGroupError(originalMessage: string): string {
  const errorMap: Record<string, string> = {
    // 群组创建相关
    'Group name already exists': '群组名称已存在',
    'Invalid group name': '群组名称不合法',
    'Group creation failed': '创建群组失败',
    
    // 群组加入相关
    'Group not found': '群组不存在',
    'Already a member': '您已经是该群组成员',
    'Group is full': '群组人数已满',
    'Permission denied': '权限不足',
    'Not authorized': '未授权操作',
    
    // 群组邀请相关
    'Invitation not found': '邀请不存在或已过期',
    'Already responded': '您已经回应过该邀请',
    'Cannot invite yourself': '不能邀请自己',
    'User already invited': '用户已被邀请',
    'User already in group': '用户已经在群组中',
    
    // 群组操作相关
    'Only owner can delete': '只有群主可以删除群组',
    'Cannot leave as owner': '群主不能退出群组，请先转让群主',
    'Member not found': '成员不存在',
    'Invalid role': '无效的角色',
    
    // 通用错误
    'Unauthorized': '未授权，请重新登录',
    'Server error': '服务器错误，请稍后重试',
    'Network error': '网络错误，请检查网络连接'
  }

  for (const [key, value] of Object.entries(errorMap)) {
    if (originalMessage.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  return originalMessage
}

// 通用错误翻译函数
export function translateError(originalMessage: string, category?: 'friendship' | 'user' | 'auth' | 'group'): string {
  switch (category) {
    case 'friendship':
      return translateFriendshipError(originalMessage)
    case 'user':
      return translateUserError(originalMessage)
    case 'auth':
      return translateAuthError(originalMessage)
    case 'group':
      return translateGroupError(originalMessage)
    default:
      // 尝试所有类别
      let translated = translateFriendshipError(originalMessage)
      if (translated === originalMessage) {
        translated = translateUserError(originalMessage)
      }
      if (translated === originalMessage) {
        translated = translateAuthError(originalMessage)
      }
      if (translated === originalMessage) {
        translated = translateGroupError(originalMessage)
      }
      return translated
  }
}
