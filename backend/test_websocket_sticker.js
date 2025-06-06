// 测试WebSocket表情包消息功能
const WebSocket = require('ws');

class StickerMessageTester {
    constructor() {
        this.ws = null;
        this.token = null;
        this.userId = null;
        this.receiverId = 2; // 假设发送给用户ID 2
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('ws://localhost:3000');
            
            this.ws.on('open', () => {
                console.log('📡 WebSocket连接已建立');
                resolve();
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket连接错误:', error.message);
                reject(error);
            });

            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });
        });
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            console.log('📨 收到消息:', message.type);
            
            switch (message.type) {
                case 'AUTH_SUCCESS':
                    console.log('✅ 认证成功');
                    this.userId = message.payload.user.id;
                    break;
                case 'NEW_MESSAGE':
                    console.log('💬 新消息:', {
                        id: message.payload.id,
                        contentType: message.payload.content_type,
                        content: message.payload.content,
                        sender: message.payload.sender_username
                    });
                    break;
                case 'ERROR':
                    console.log('❌ 错误:', message.payload.message);
                    break;
                default:
                    console.log('📋 其他消息:', message.type);
            }
        } catch (error) {
            console.error('解析消息失败:', error);
        }
    }

    async authenticate() {
        return new Promise((resolve, reject) => {
            // 使用测试用户的token（需要先通过登录获取）
            const identifyMessage = {
                type: 'IDENTIFY',
                payload: {
                    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoidGVzdF91c2VyIiwiaWF0IjoxNzMzMDM1MzQ4LCJleHAiOjE3MzMxMjE3NDh9.token_here' // 这里需要真实的token
                }
            };

            this.ws.send(JSON.stringify(identifyMessage));
            
            // 简单等待认证完成
            setTimeout(() => {
                if (this.userId) {
                    resolve();
                } else {
                    reject(new Error('认证失败'));
                }
            }, 1000);
        });
    }

    async sendStickerMessage(stickerId) {
        const message = {
            type: 'SEND_STICKER_MESSAGE',
            payload: {
                receiverType: 'user',
                receiverId: this.receiverId,
                stickerId: stickerId,
                clientMessageId: `test_sticker_${Date.now()}`
            }
        };

        console.log(`📤 发送表情包消息 (Sticker ID: ${stickerId})...`);
        this.ws.send(JSON.stringify(message));
    }

    async sendTextMessage(text) {
        const message = {
            type: 'SEND_TEXT_MESSAGE',
            payload: {
                receiverType: 'user',
                receiverId: this.receiverId,
                content: text,
                clientMessageId: `test_text_${Date.now()}`
            }
        };

        console.log(`📤 发送文本消息: "${text}"`);
        this.ws.send(JSON.stringify(message));
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            console.log('📡 WebSocket连接已关闭');
        }
    }
}

async function testStickerMessages() {
    console.log('🧪 开始测试WebSocket表情包消息功能...\n');

    try {
        // 1. 表情包消息格式示例
        console.log('1️⃣ 表情包消息格式示例:');
        const stickerMessage = {
            type: 'SEND_STICKER_MESSAGE',
            payload: {
                receiverType: 'user',
                receiverId: 2,
                stickerId: 1, // 微笑表情的ID
                clientMessageId: 'test_sticker_123'
            }
        };
        console.log(JSON.stringify(stickerMessage, null, 2));

        // 2. 显示预期的响应格式
        console.log('\n2️⃣ 预期的NEW_MESSAGE响应格式:');
        const expectedResponse = {
            type: 'NEW_MESSAGE',
            payload: {
                id: 123,
                sender_id: 1,
                sender_username: 'test_user',
                receiver_type: 'user',
                receiver_id: 2,
                content_type: 'sticker',
                content: {
                    type: 'sticker',
                    stickerId: 1,
                    mediaId: 8,
                    url: 'stickers/emoji/smile_1.png',
                    mimeType: 'image/png',
                    metadata: null
                },
                created_at: '2025-06-01T08:30:00.000Z'
            }
        };
        console.log(JSON.stringify(expectedResponse, null, 2));

        // 3. 测试表情包验证逻辑
        console.log('\n3️⃣ 测试表情包验证逻辑...');
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database('./chat.db');
        const stickerRepository = require('./src/repositories/stickerRepository');
        
        // 测试有效表情包ID
        const validSticker = await stickerRepository.getStickerById(db, 1);
        console.log(`✅ 有效表情包 (ID: 1):`, {
            description: validSticker?.description,
            packName: validSticker?.packName,
            url: validSticker?.url
        });

        // 测试无效表情包ID
        const invalidSticker = await stickerRepository.getStickerById(db, 999);
        console.log(`❌ 无效表情包 (ID: 999):`, invalidSticker);

        db.close();

        console.log('\n✅ 表情包消息格式测试完成');
        console.log('💡 提示：要完整测试消息发送，需要：');
        console.log('   1. 启动后端服务器 (node server.js)');
        console.log('   2. 获取有效的认证token');
        console.log('   3. 确保接收者用户存在');
        console.log('   4. 使用WebSocket客户端发送SEND_STICKER_MESSAGE消息');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 运行测试
testStickerMessages();
