// 测试好友系统API的脚本
// 在浏览器控制台中运行

// 1. 测试搜索用户
async function testSearchUsers() {
  try {
    const response = await fetch('/api/users/search?q=123', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    const users = await response.json();
    console.log('搜索用户结果:', users);
    return users;
  } catch (error) {
    console.error('搜索用户失败:', error);
  }
}

// 2. 测试发送好友申请
async function testSendFriendRequest(username) {
  try {
    const response = await fetch('/api/friendships/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ recipientUsername: username })
    });
    const result = await response.json();
    console.log('发送好友申请结果:', result);
    return result;
  } catch (error) {
    console.error('发送好友申请失败:', error);
  }
}

// 3. 测试获取好友申请列表
async function testGetFriendRequests() {
  try {
    const response = await fetch('/api/friendships?status=pending', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    const requests = await response.json();
    console.log('好友申请列表:', requests);
    return requests;
  } catch (error) {
    console.error('获取好友申请失败:', error);
  }
}

// 4. 测试接受好友申请
async function testAcceptFriendRequest(username) {
  try {
    const response = await fetch('/api/friendships/accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ requesterUsername: username })
    });
    const result = await response.json();
    console.log('接受好友申请结果:', result);
    return result;
  } catch (error) {
    console.error('接受好友申请失败:', error);
  }
}

// 5. 测试获取好友列表
async function testGetFriends() {
  try {
    const response = await fetch('/api/friendships', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    const friends = await response.json();
    console.log('好友列表:', friends);
    return friends;
  } catch (error) {
    console.error('获取好友列表失败:', error);
  }
}

// 6. 测试删除好友
async function testRemoveFriend(friendId) {
  try {
    const response = await fetch(`/api/friendships/remove/${friendId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    const result = await response.json();
    console.log('删除好友结果:', result);
    return result;
  } catch (error) {
    console.error('删除好友失败:', error);
  }
}

// 运行完整测试
async function runFullTest() {
  console.log('=== 开始测试好友系统 ===');
  
  // 1. 搜索用户
  console.log('\n1. 测试搜索用户...');
  const users = await testSearchUsers();
  
  // 2. 发送好友申请（如果有搜索结果）
  if (users && users.length > 0) {
    console.log('\n2. 测试发送好友申请...');
    await testSendFriendRequest(users[0].username);
  }
  
  // 3. 获取好友申请
  console.log('\n3. 测试获取好友申请...');
  const requests = await testGetFriendRequests();
  
  // 4. 获取好友列表
  console.log('\n4. 测试获取好友列表...');
  await testGetFriends();
  
  console.log('\n=== 测试完成 ===');
}

// 使用说明
console.log('好友系统测试脚本已加载！');
console.log('可用的测试函数:');
console.log('- testSearchUsers() - 搜索用户');
console.log('- testSendFriendRequest(username) - 发送好友申请');
console.log('- testGetFriendRequests() - 获取好友申请');
console.log('- testAcceptFriendRequest(username) - 接受好友申请');
console.log('- testGetFriends() - 获取好友列表');
console.log('- testRemoveFriend(friendId) - 删除好友');
console.log('- runFullTest() - 运行完整测试');
