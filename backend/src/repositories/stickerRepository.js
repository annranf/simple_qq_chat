// src/repositories/stickerRepository.js
async function getAllPacksWithStickersDetails(db, userId = null) {
    return new Promise((resolve, reject) => {
        let sqlPacks;
        let params = [];
        
        if (userId !== null) {
            // 返回系统表情包和用户的表情包
            sqlPacks = `
                SELECT 
                    sp.id, sp.name, sp.sort_order, sp.uploader_id,
                    sp.thumbnail_media_id, 
                    thumb_ma.file_path as thumbnail_url 
                FROM sticker_packs sp
                LEFT JOIN media_attachments thumb_ma ON sp.thumbnail_media_id = thumb_ma.id
                WHERE sp.uploader_id IS NULL OR sp.uploader_id = ?
                ORDER BY sp.sort_order ASC, sp.name ASC
            `;
            params = [userId];
        } else {
            // 只返回系统表情包
            sqlPacks = `
                SELECT 
                    sp.id, sp.name, sp.sort_order, sp.uploader_id,
                    sp.thumbnail_media_id, 
                    thumb_ma.file_path as thumbnail_url 
                FROM sticker_packs sp
                LEFT JOIN media_attachments thumb_ma ON sp.thumbnail_media_id = thumb_ma.id
                WHERE sp.uploader_id IS NULL
                ORDER BY sp.sort_order ASC, sp.name ASC
            `;
        }
        
        db.all(sqlPacks, params, async (err, packs) => {
            if (err) return reject(err);
            if (!packs) return resolve([]);

            const resultPacks = [];
            for (const pack of packs) {
                const sqlStickers = `
                    SELECT 
                        s.id as sticker_id, s.media_id, s.emoji_keywords, s.description, s.sort_order,
                        ma.file_path as sticker_url, ma.mime_type as sticker_mime_type,
                        ma.metadata as sticker_media_metadata -- If you store width/height here
                    FROM stickers s
                    JOIN media_attachments ma ON s.media_id = ma.id
                    WHERE s.pack_id = ?
                    ORDER BY s.sort_order ASC, s.id ASC
                `;
                try {
                    const stickersData = await new Promise((res, rej) => {
                        db.all(sqlStickers, [pack.id], (sErr, sRows) => {
                            if (sErr) return rej(sErr);
                            res(sRows.map(sr => {
                                let mediaMetadata = null;
                                if (sr.sticker_media_metadata) {
                                    try { mediaMetadata = JSON.parse(sr.sticker_media_metadata); } catch (e) { /* ignore */ }
                                }
                                return {
                                    id: sr.sticker_id, // This is stickers.id
                                    mediaId: sr.media_id,
                                    keywords: sr.emoji_keywords,
                                    description: sr.description,
                                    url: sr.sticker_url, // Relative path from DB, e.g., "uploads/sticker.gif"
                                    mimeType: sr.sticker_mime_type,
                                    metadata: mediaMetadata // e.g., { width, height }
                                };
                            }));
                        });
                    });
                    resultPacks.push({ 
                        id: pack.id,
                        name: pack.name,
                        thumbnailUrl: pack.thumbnail_url, // Relative path or null
                        stickers: stickersData 
                    });
                } catch (stickerErr) {
                    console.error(`Error fetching stickers for pack ${pack.id}:`, stickerErr);
                    // Decide: skip pack or reject all
                }
            }
            resolve(resultPacks);
        });    
    });
}

async function getUserStickerPacks(db, userId) {
    return new Promise((resolve, reject) => {
        const sqlPacks = `
            SELECT 
                sp.id, sp.name, sp.sort_order, sp.uploader_id,
                sp.thumbnail_media_id, 
                thumb_ma.file_path as thumbnail_url 
            FROM sticker_packs sp
            LEFT JOIN media_attachments thumb_ma ON sp.thumbnail_media_id = thumb_ma.id
            WHERE sp.uploader_id = ?
            ORDER BY sp.sort_order ASC, sp.name ASC
        `;
        
        db.all(sqlPacks, [userId], async (err, packs) => {
            if (err) return reject(err);
            if (!packs) return resolve([]);

            const resultPacks = [];
            for (const pack of packs) {
                const sqlStickers = `
                    SELECT 
                        s.id as sticker_id, s.media_id, s.emoji_keywords, s.description, s.sort_order,
                        ma.file_path as sticker_url, ma.mime_type as sticker_mime_type,
                        ma.metadata as sticker_media_metadata
                    FROM stickers s
                    JOIN media_attachments ma ON s.media_id = ma.id
                    WHERE s.pack_id = ?
                    ORDER BY s.sort_order ASC, s.id ASC
                `;
                try {
                    const stickersData = await new Promise((res, rej) => {
                        db.all(sqlStickers, [pack.id], (sErr, sRows) => {
                            if (sErr) return rej(sErr);
                            res(sRows.map(sr => {
                                let mediaMetadata = null;
                                if (sr.sticker_media_metadata) {
                                    try { mediaMetadata = JSON.parse(sr.sticker_media_metadata); } catch (e) { /* ignore */ }
                                }
                                return {
                                    id: sr.sticker_id,
                                    mediaId: sr.media_id,
                                    keywords: sr.emoji_keywords,
                                    description: sr.description,
                                    url: sr.sticker_url,
                                    mimeType: sr.sticker_mime_type,
                                    metadata: mediaMetadata
                                };
                            }));
                        });
                    });
                    resultPacks.push({ 
                        id: pack.id,
                        name: pack.name,
                        thumbnailUrl: pack.thumbnail_url,
                        uploaderId: pack.uploader_id,
                        stickers: stickersData 
                    });
                } catch (stickerErr) {
                    console.error(`Error fetching stickers for pack ${pack.id}:`, stickerErr);
                }
            }
            resolve(resultPacks);
        });
    });
}

// 通过ID获取单个表情包详情
async function getStickerById(db, stickerId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                s.id as sticker_id, s.pack_id, s.media_id, s.emoji_keywords, s.description, s.sort_order,
                ma.file_path as sticker_url, ma.mime_type as sticker_mime_type,
                ma.metadata as sticker_media_metadata,
                sp.name as pack_name
            FROM stickers s
            JOIN media_attachments ma ON s.media_id = ma.id
            JOIN sticker_packs sp ON s.pack_id = sp.id
            WHERE s.id = ?
        `;
        db.get(sql, [stickerId], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(null);
            
            let mediaMetadata = null;
            if (row.sticker_media_metadata) {
                try { 
                    mediaMetadata = JSON.parse(row.sticker_media_metadata); 
                } catch (e) { 
                    console.warn(`Failed to parse sticker metadata for sticker ${stickerId}:`, e);
                }
            }
            
            resolve({
                id: row.sticker_id,
                packId: row.pack_id,
                packName: row.pack_name,
                mediaId: row.media_id,
                keywords: row.emoji_keywords,
                description: row.description,
                url: row.sticker_url,
                mimeType: row.sticker_mime_type,
                metadata: mediaMetadata
            });
        });
    });
}

// 创建新的表情包
async function createStickerPack(db, { name, thumbnailMediaId = null, sortOrder = 0, uploader_id = null }) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO sticker_packs (name, thumbnail_media_id, sort_order, uploader_id)
            VALUES (?, ?, ?, ?)
        `;
        db.run(sql, [name, thumbnailMediaId, sortOrder, uploader_id], function(err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, name, thumbnailMediaId, sortOrder, uploaderId: uploader_id });
        });
    });
}

// 创建新的表情
async function createSticker(db, { packId, mediaId, emojiKeywords = '', description = '', sortOrder = 0 }) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO stickers (pack_id, media_id, emoji_keywords, description, sort_order)
            VALUES (?, ?, ?, ?, ?)
        `;
        db.run(sql, [packId, mediaId, emojiKeywords, description, sortOrder], function(err) {
            if (err) return reject(err);
            resolve({ 
                id: this.lastID, 
                packId, 
                mediaId, 
                emojiKeywords, 
                description, 
                sortOrder 
            });
        });
    });
}

// 删除表情包（级联删除其中的表情）
async function deleteStickerPack(db, packId, userId = null) {
    return new Promise((resolve, reject) => {
        let sql;
        let params;
        
        if (userId !== null) {
            // 只能删除自己的表情包
            sql = `DELETE FROM sticker_packs WHERE id = ? AND uploader_id = ?`;
            params = [packId, userId];
        } else {
            // 管理员可以删除任何表情包
            sql = `DELETE FROM sticker_packs WHERE id = ?`;
            params = [packId];
        }
        
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve({ deletedCount: this.changes });
        });
    });
}

// 删除单个表情
async function deleteSticker(db, stickerId) {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM stickers WHERE id = ?`;
        db.run(sql, [stickerId], function(err) {
            if (err) return reject(err);
            resolve({ deletedCount: this.changes });
        });
    });
}

module.exports = { 
    getAllPacksWithStickersDetails, 
    getUserStickerPacks,
    getStickerById,
    createStickerPack,
    createSticker,
    deleteStickerPack,
    deleteSticker
};