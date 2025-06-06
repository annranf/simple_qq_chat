const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chat.db');

console.log('开始创建示例表情包数据...');

// 先创建一些表情包的媒体文件记录
const sampleStickers = [
    // 表情包1：笑脸表情
    { fileName: 'smile_1.png', filePath: 'stickers/emoji/smile_1.png', mimeType: 'image/png', pack: 'Emoji表情', emoji: 'smile,happy,😊', desc: '微笑' },
    { fileName: 'laugh_1.png', filePath: 'stickers/emoji/laugh_1.png', mimeType: 'image/png', pack: 'Emoji表情', emoji: 'laugh,haha,😂', desc: '大笑' },
    { fileName: 'wink_1.png', filePath: 'stickers/emoji/wink_1.png', mimeType: 'image/png', pack: 'Emoji表情', emoji: 'wink,😉', desc: '眨眼' },
    { fileName: 'love_1.png', filePath: 'stickers/emoji/love_1.png', mimeType: 'image/png', pack: 'Emoji表情', emoji: 'love,heart,❤️', desc: '爱心' },
    
    // 表情包2：动物表情
    { fileName: 'cat_1.png', filePath: 'stickers/animals/cat_1.png', mimeType: 'image/png', pack: '可爱动物', emoji: 'cat,cute,🐱', desc: '小猫' },
    { fileName: 'dog_1.png', filePath: 'stickers/animals/dog_1.png', mimeType: 'image/png', pack: '可爱动物', emoji: 'dog,puppy,🐶', desc: '小狗' },
    { fileName: 'panda_1.png', filePath: 'stickers/animals/panda_1.png', mimeType: 'image/png', pack: '可爱动物', emoji: 'panda,cute,🐼', desc: '熊猫' },
];

let processedCount = 0;
const packNames = [...new Set(sampleStickers.map(s => s.pack))];

// 创建表情包
packNames.forEach((packName, index) => {
    db.run(`INSERT OR IGNORE INTO sticker_packs (name, sort_order) VALUES (?, ?)`, 
           [packName, index], function(err) {
        if (err) {
            console.error('创建表情包失败:', err);
            return;
        }
        console.log(`创建表情包: ${packName}`);
    });
});

// 等待表情包创建完成后，创建媒体文件和表情
setTimeout(() => {
    sampleStickers.forEach((sticker, index) => {
        // 创建媒体文件记录
        db.run(`INSERT OR IGNORE INTO media_attachments 
                (file_name, file_path, mime_type, size_bytes, checksum) 
                VALUES (?, ?, ?, ?, ?)`, 
               [sticker.fileName, sticker.filePath, sticker.mimeType, 1024, `checksum_${index}`], 
               function(err) {
            if (err) {
                console.error('创建媒体文件失败:', err);
                return;
            }
            
            const mediaId = this.lastID;
            
            // 获取表情包ID
            db.get(`SELECT id FROM sticker_packs WHERE name = ?`, [sticker.pack], (err, pack) => {
                if (err || !pack) {
                    console.error('获取表情包ID失败:', err);
                    return;
                }
                
                // 创建表情记录
                db.run(`INSERT OR IGNORE INTO stickers 
                        (pack_id, media_id, emoji_keywords, description, sort_order) 
                        VALUES (?, ?, ?, ?, ?)`,
                       [pack.id, mediaId, sticker.emoji, sticker.desc, index % 10],
                       function(err) {
                    if (err) {
                        console.error('创建表情失败:', err);
                        return;
                    }
                    
                    processedCount++;
                    console.log(`创建表情: ${sticker.desc} (${processedCount}/${sampleStickers.length})`);
                    
                    if (processedCount === sampleStickers.length) {
                        console.log('所有示例表情包数据创建完成！');
                        
                        // 验证创建结果
                        db.all(`SELECT sp.name, COUNT(s.id) as sticker_count 
                               FROM sticker_packs sp 
                               LEFT JOIN stickers s ON sp.id = s.pack_id 
                               GROUP BY sp.id, sp.name`, [], (err, result) => {
                            if (err) {
                                console.error('验证失败:', err);
                            } else {
                                console.log('创建结果验证:');
                                result.forEach(pack => {
                                    console.log(`  ${pack.name}: ${pack.sticker_count} 个表情`);
                                });
                            }
                            db.close();
                        });
                    }
                });
            });
        });
    });
}, 1000);
