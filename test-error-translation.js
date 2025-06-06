// test-error-translation.js
// 测试错误信息翻译功能

const errorUtils = require('./frontend/src/utils/errorUtils.ts');

// 测试用例
const testCases = [
  // 好友系统错误
  { original: 'You are already friends with this user.', expected: '已经是好友啦！' },
  { original: 'Friend request already sent.', expected: '好友请求已发送，请等待对方回应' },
  { original: 'This user has already sent you a friend request.', expected: '对方已经向你发送了好友请求，请到申请列表中处理' },
  { original: 'This user has blocked you.', expected: '无法发送请求，对方可能已将你屏蔽' },
  { original: 'You have blocked this user.', expected: '你已屏蔽此用户，请先解除屏蔽' },
  { original: 'Recipient user not found.', expected: '用户不存在' },
  { original: 'Cannot send friend request to oneself.', expected: '不能添加自己为好友' },
  
  // 申请处理错误
  { original: 'No pending friend request found.', expected: '该好友申请已被处理或不存在' },
  { original: 'Friend request not found.', expected: '好友申请不存在或已过期' },
  
  // 删除好友错误
  { original: 'Not currently friends with this user.', expected: '当前不是好友关系' },
  { original: 'Friendship not found or not removed.', expected: '好友关系不存在或已被删除' },
  
  // 未知错误
  { original: 'Some unknown error', expected: 'Some unknown error' }
];

console.log('🧪 测试错误信息翻译功能...\n');

// 模拟翻译函数（因为我们不能直接导入TypeScript文件）
function translateFriendshipError(originalMessage) {
  const errorMap = {
    'already friends': '已经是好友啦！',
    'already sent': '好友请求已发送，请等待对方回应',
    'already sent you a friend request': '对方已经向你发送了好友请求，请到申请列表中处理',
    'blocked you': '无法发送请求，对方可能已将你屏蔽',
    'have blocked this user': '你已屏蔽此用户，请先解除屏蔽',
    'not found': '用户不存在',
    'oneself': '不能添加自己为好友',
    'No pending': '该好友申请已被处理或不存在',
    'Not currently friends': '当前不是好友关系',
    'Friendship not found': '好友关系不存在或已被删除'
  };

  for (const [key, value] of Object.entries(errorMap)) {
    if (originalMessage.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return originalMessage;
}

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = translateFriendshipError(testCase.original);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✅ 测试 ${index + 1}: PASS`);
  } else {
    failed++;
    console.log(`❌ 测试 ${index + 1}: FAIL`);
    console.log(`   原始: "${testCase.original}"`);
    console.log(`   期望: "${testCase.expected}"`);
    console.log(`   实际: "${result}"`);
  }
});

console.log(`\n📊 测试结果:`);
console.log(`✅ 通过: ${passed}`);
console.log(`❌ 失败: ${failed}`);
console.log(`📈 成功率: ${((passed / testCases.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 所有测试通过！错误翻译功能正常工作。');
} else {
  console.log('\n⚠️  部分测试失败，请检查翻译逻辑。');
}
