// create-test-user.js
// 创建测试用户的脚本

const baseUrl = 'http://localhost:3000/api';

async function createTestUser() {
    console.log('=== 创建测试用户 ===');
    try {
        const response = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'testuser',
                password: 'password123',
                nickname: '测试用户',
                bio: '这是一个测试用户账号'
            })
        });

        const result = await response.json();
        if (response.ok) {
            console.log('✅ 测试用户创建成功');
            console.log('用户信息:', result.user);
            return result.user;
        } else {
            console.log('❌ 创建用户失败:', result.message);
            return null;
        }
    } catch (error) {
        console.error('❌ 创建用户错误:', error.message);
        return null;
    }
}

// 执行创建
createTestUser().catch(console.error);
