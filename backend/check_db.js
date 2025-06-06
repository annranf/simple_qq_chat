const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chat.db');

console.log('Connected to database');

// 查看所有表
db.all('SELECT name FROM sqlite_master WHERE type="table"', [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('Tables:', rows.map(r => r.name));
    
    // 查看表情包相关表的数据
    if (rows.some(r => r.name === 'sticker_packs')) {
        console.log('\n--- Sticker Packs ---');
        db.all('SELECT * FROM sticker_packs', [], (err, packs) => {
            if (err) console.error('Sticker packs error:', err);
            else console.log('Sticker packs:', packs);
            
            if (rows.some(r => r.name === 'stickers')) {
                console.log('\n--- Stickers ---');
                db.all('SELECT * FROM stickers', [], (err, stickers) => {
                    if (err) console.error('Stickers error:', err);
                    else console.log('Stickers:', stickers);
                    db.close();
                });
            } else {
                db.close();
            }
        });
    } else {
        console.log('No sticker_packs table found');
        db.close();
    }
});
