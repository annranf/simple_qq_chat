// 表情包完整集成测试脚本
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');

// 模拟用户认证和表情包功能测试
async function testCompleteIntegration() {
    console.log('🧪 开始表情包完整集成测试...\n');

    try {
        // 1. 测试后端服务器健康状态
        console.log('1️⃣ 测试后端服务器健康状态...');
        const healthResponse = await fetch('http://localhost:3000/api/health');
        const healthData = await healthResponse.json();
        console.log(`✅ 服务器状态: ${healthData.status} - ${healthData.message}`);
        console.log('');

        // 2. 测试登录获取认证token（使用已有用户）
        console.log('2️⃣ 测试用户登录...');
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: '456',  // 使用已存在的用户
                password: '456'
            })
        });

        if (!loginResponse.ok) {
            console.log('❌ 登录失败，尝试注册新用户...');
            // 如果登录失败，尝试注册
            const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: 'test_sticker_user',
                    password: 'test123',
                    nickname: '表情包测试用户'
                })
            });
            const registerData = await registerResponse.json();
            console.log(`✅ 注册成功: ${registerData.user.username}`);
            
            // 重新登录
            const retryLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: 'test_sticker_user',
                    password: 'test123'
                })
            });
            const retryLoginData = await retryLoginResponse.json();
            var authToken = retryLoginData.token;
        } else {
            const loginData = await loginResponse.json();
            var authToken = loginData.token;
            console.log(`✅ 登录成功: ${loginData.user.username}`);
        }
        console.log('');

        // 3. 测试获取表情包
        console.log('3️⃣ 测试获取表情包...');
        const stickersResponse = await fetch('http://localhost:3000/api/stickers/packs', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const stickersData = await stickersResponse.json();
        console.log(`✅ 获取到 ${stickersData.length} 个表情包:`);
        stickersData.forEach((pack, index) => {
            console.log(`  📦 ${pack.name}: ${pack.stickers.length} 个表情`);
            if (index === 0) {
                pack.stickers.slice(0, 3).forEach(sticker => {
                    console.log(`    - ${sticker.description} (ID: ${sticker.id})`);
                });
            }
        });
        console.log('');

        // 4. 测试WebSocket连接和表情包消息
        console.log('4️⃣ 测试WebSocket表情包消息...');
        const ws = new WebSocket('ws://localhost:3000');
        
        return new Promise((resolve) => {
            ws.on('open', () => {
                console.log('✅ WebSocket连接成功');
                
                // 发送认证消息
                ws.send(JSON.stringify({
                    type: 'AUTHENTICATE',
                    payload: { token: authToken }
                }));
                
                // 等待认证完成后发送表情包消息
                setTimeout(() => {
                    if (stickersData.length > 0 && stickersData[0].stickers.length > 0) {
                        const testSticker = stickersData[0].stickers[0];
                        const stickerMessage = {
                            type: 'SEND_STICKER_MESSAGE',
                            payload: {
                                receiverType: 'user',
                                receiverId: 2, // 假设发送给用户ID 2
                                stickerId: testSticker.id,
                                clientMessageId: `test_${Date.now()}`
                            }
                        };
                        console.log(`📤 发送表情包消息: ${testSticker.description}`);
                        ws.send(JSON.stringify(stickerMessage));
                    }
                }, 1000);
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log(`📨 收到消息: ${message.type}`);
                    
                    if (message.type === 'NEW_MESSAGE' && message.payload.content_type === 'sticker') {
                        console.log('✅ 表情包消息发送成功！');
                        console.log(`   表情包ID: ${message.payload.content.stickerId}`);
                        console.log(`   图片URL: ${message.payload.content.url}`);
                        ws.close();
                        resolve();
                    }
                } catch (e) {
                    console.log('📨 收到消息:', data.toString());
                }
            });

            ws.on('error', (error) => {
                console.error('❌ WebSocket错误:', error.message);
                resolve();
            });

            // 超时处理
            setTimeout(() => {
                console.log('⏰ WebSocket测试超时');
                ws.close();
                resolve();
            }, 10000);
        });

    } catch (error) {
        console.error('❌ 集成测试失败:', error.message);
    }
}

// 运行测试
testCompleteIntegration().then(() => {
    console.log('\n🎉 表情包完整集成测试完成！');
    process.exit(0);
});
