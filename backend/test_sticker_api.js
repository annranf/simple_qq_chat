// 测试表情包API功能
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chat.db');
const stickerRepository = require('./src/repositories/stickerRepository');

async function testStickerAPIs() {
    console.log('🧪 开始测试表情包API功能...\n');

    try {
        // 1. 测试获取所有表情包
        console.log('1️⃣ 测试获取所有表情包...');
        const allPacks = await stickerRepository.getAllPacksWithStickersDetails(db);
        console.log(`获取到 ${allPacks.length} 个表情包:`);
        allPacks.forEach(pack => {
            console.log(`  📦 ${pack.name}: ${pack.stickers.length} 个表情`);
            pack.stickers.forEach(sticker => {
                console.log(`    - ${sticker.description} (ID: ${sticker.id})`);
            });
        });
        console.log('');

        // 2. 测试获取单个表情
        if (allPacks.length > 0 && allPacks[0].stickers.length > 0) {
            const testStickerId = allPacks[0].stickers[0].id;
            console.log(`2️⃣ 测试获取单个表情 (ID: ${testStickerId})...`);
            const singleSticker = await stickerRepository.getStickerById(db, testStickerId);
            if (singleSticker) {
                console.log(`✅ 获取表情成功:`);
                console.log(`   名称: ${singleSticker.description}`);
                console.log(`   表情包: ${singleSticker.packName}`);
                console.log(`   URL: ${singleSticker.url}`);
                console.log(`   关键词: ${singleSticker.keywords}`);
            } else {
                console.log('❌ 未找到表情');
            }
        } else {
            console.log('2️⃣ 跳过单个表情测试 - 没有可用表情');
        }
        console.log('');        // 3. 测试创建新表情包
        console.log('3️⃣ 测试创建新表情包...');
        const timestamp = Date.now();
        const newPack = await stickerRepository.createStickerPack(db, {
            name: `测试表情包_${timestamp}`,
            thumbnailMediaId: null,
            sortOrder: 99
        });
        console.log(`✅ 创建表情包成功: ID ${newPack.id}, 名称: ${newPack.name}`);
        console.log('');

        // 4. 测试创建新表情（需要先创建媒体文件）        console.log('4️⃣ 测试创建新表情...');
          // 先创建一个测试媒体文件记录，使用时间戳避免重复
        const createMediaPromise = new Promise((resolve, reject) => {
            db.run(`INSERT INTO media_attachments 
                    (file_name, file_path, mime_type, size_bytes, checksum) 
                    VALUES (?, ?, ?, ?, ?)`, 
                   [`test_sticker_${timestamp}.png`, `stickers/test/test_sticker_${timestamp}.png`, 'image/png', 2048, `test_checksum_${timestamp}`], 
                   function(err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });

        const mediaId = await createMediaPromise;
        console.log(`📁 创建测试媒体文件: ID ${mediaId}`);

        const newSticker = await stickerRepository.createSticker(db, {
            packId: newPack.id,
            mediaId: mediaId,
            emojiKeywords: 'test,测试,🧪',
            description: '测试表情',
            sortOrder: 1
        });
        console.log(`✅ 创建表情成功: ID ${newSticker.id}, 描述: ${newSticker.description}`);
        console.log('');

        // 5. 测试删除表情
        console.log('5️⃣ 测试删除表情...');
        const deleteResult = await stickerRepository.deleteSticker(db, newSticker.id);
        console.log(`✅ 删除表情成功: 影响行数 ${deleteResult.deletedCount}`);
        console.log('');

        // 6. 测试删除表情包
        console.log('6️⃣ 测试删除表情包...');
        const deletePackResult = await stickerRepository.deleteStickerPack(db, newPack.id);
        console.log(`✅ 删除表情包成功: 影响行数 ${deletePackResult.deletedCount}`);
        console.log('');

        // 7. 最终验证
        console.log('7️⃣ 最终验证 - 重新获取所有表情包...');
        const finalPacks = await stickerRepository.getAllPacksWithStickersDetails(db);
        console.log(`✅ 最终表情包数量: ${finalPacks.length}`);
        finalPacks.forEach(pack => {
            console.log(`  📦 ${pack.name}: ${pack.stickers.length} 个表情`);
        });

        console.log('\n🎉 所有表情包API测试完成！');

    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error);
    } finally {
        db.close();
    }
}

// 运行测试
testStickerAPIs();
