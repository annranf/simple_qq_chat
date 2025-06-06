// test-profile-api.js
// 测试个人资料管理API的脚本

import fetch from 'node-fetch';

const baseUrl = 'http://localhost:3000/api';
let authToken = '';

// 测试用户登录
async function testLogin() {
    console.log('=== 测试用户登录 ===');
    try {
        const response = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'testuser',
                password: 'password123'
            })
        });

        const result = await response.json();
        if (response.ok) {
            authToken = result.token;
            console.log('✅ 登录成功');
            console.log('用户信息:', result.user);
            console.log('Token:', authToken.substring(0, 20) + '...');
            return result.user;
        } else {
            console.log('❌ 登录失败:', result.message);
            return null;
        }
    } catch (error) {
        console.error('❌ 登录错误:', error.message);
        return null;
    }
}

// 测试获取当前用户资料
async function testGetCurrentProfile() {
    console.log('\n=== 测试获取当前用户资料 ===');
    try {
        const response = await fetch(`${baseUrl}/users/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const result = await response.json();
        if (response.ok) {
            console.log('✅ 获取资料成功');
            console.log('用户资料:', result);
            return result;
        } else {
            console.log('❌ 获取资料失败:', result.message);
            return null;
        }
    } catch (error) {
        console.error('❌ 获取资料错误:', error.message);
        return null;
    }
}

// 测试更新用户资料
async function testUpdateProfile() {
    console.log('\n=== 测试更新用户资料 ===');
    try {
        const updateData = {
            nickname: '测试用户昵称_' + Date.now(),
            status: 'busy'
        };

        const response = await fetch(`${baseUrl}/users/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        if (response.ok) {
            console.log('✅ 更新资料成功');
            console.log('更新后的资料:', result);
            return result;
        } else {
            console.log('❌ 更新资料失败:', result.message);
            return null;
        }
    } catch (error) {
        console.error('❌ 更新资料错误:', error.message);
        return null;
    }
}

// 测试获取用户设置
async function testGetUserSettings() {
    console.log('\n=== 测试获取用户设置 ===');
    try {
        const response = await fetch(`${baseUrl}/users/settings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const result = await response.json();
        if (response.ok) {
            console.log('✅ 获取设置成功');
            console.log('用户设置:', result);
            return result;
        } else {
            console.log('❌ 获取设置失败:', result.message);
            return null;
        }
    } catch (error) {
        console.error('❌ 获取设置错误:', error.message);
        return null;
    }
}

// 测试更新用户设置
async function testUpdateUserSettings() {
    console.log('\n=== 测试更新用户设置 ===');
    try {
        const updateData = {
            theme: 'dark',
            profile_visibility: 'friends',
            allow_friend_requests: false
        };

        const response = await fetch(`${baseUrl}/users/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        if (response.ok) {
            console.log('✅ 更新设置成功');
            console.log('更新后的设置:', result);
            return result;
        } else {
            console.log('❌ 更新设置失败:', result.message);
            return null;
        }
    } catch (error) {
        console.error('❌ 更新设置错误:', error.message);
        return null;
    }
}

// 测试修改密码
async function testChangePassword() {
    console.log('\n=== 测试修改密码 ===');
    try {
        const changeData = {
            currentPassword: 'password123',
            newPassword: 'newpassword123'
        };

        const response = await fetch(`${baseUrl}/users/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(changeData)
        });

        const result = await response.json();
        if (response.ok) {
            console.log('✅ 修改密码成功');
            console.log('结果:', result.message);
            
            // 改回原密码以便后续测试
            const revertData = {
                currentPassword: 'newpassword123',
                newPassword: 'password123'
            };
            
            const revertResponse = await fetch(`${baseUrl}/users/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(revertData)
            });
            
            if (revertResponse.ok) {
                console.log('✅ 密码已恢复原值');
            }
            
            return result;
        } else {
            console.log('❌ 修改密码失败:', result.message);
            return null;
        }
    } catch (error) {
        console.error('❌ 修改密码错误:', error.message);
        return null;
    }
}

// 运行所有测试
async function runAllTests() {
    console.log('🚀 开始测试个人资料管理API\n');

    const user = await testLogin();
    if (!user) {
        console.log('⚠️ 登录失败，无法继续测试');
        return;
    }

    await testGetCurrentProfile();
    await testUpdateProfile();
    await testGetUserSettings();
    await testUpdateUserSettings();
    await testChangePassword();

    console.log('\n✨ 个人资料管理API测试完成');
}

// 执行测试
runAllTests().catch(console.error);
