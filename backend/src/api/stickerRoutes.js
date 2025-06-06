// src/api/stickerRoutes.js
const express = require('express');
const stickerService = require('../services/stickerService');
const { authenticateToken } = require('../middleware/authMiddleware'); // 保护路由

module.exports = function(db) {
    const router = express.Router();    // GET /api/stickers/packs - 获取所有可用的表情包（及其包含的表情）
    router.get('/packs', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id; // 从认证中间件获取用户ID
            const packs = await stickerService.getAvailableStickerPacks(db, userId);
            res.json(packs);
        } catch (error) {
            console.error("Error fetching sticker packs:", error);
            next(error);
        }
    });

    // GET /api/stickers/packs/user - 获取用户自己的表情包
    router.get('/packs/user', authenticateToken, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const packs = await stickerService.getUserStickerPacks(db, userId);
            res.json(packs);
        } catch (error) {
            console.error("Error fetching user sticker packs:", error);
            next(error);
        }
    });

    // GET /api/stickers/:id - 获取单个表情详情
    router.get('/:id', authenticateToken, async (req, res, next) => {
        try {
            const stickerId = parseInt(req.params.id, 10);
            if (isNaN(stickerId)) {
                return res.status(400).json({ error: 'Invalid sticker ID' });
            }

            const sticker = await stickerService.getStickerById(db, stickerId);
            if (!sticker) {
                return res.status(404).json({ error: 'Sticker not found' });
            }

            res.json(sticker);
        } catch (error) {
            console.error("Error fetching sticker:", error);
            next(error);
        }
    });    // POST /api/stickers/packs - 创建新的表情包
    router.post('/packs', authenticateToken, async (req, res, next) => {
        try {
            const { name, thumbnailMediaId, sortOrder } = req.body;
            const userId = req.user.id; // 获取当前用户ID
            
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({ error: 'Pack name is required' });
            }

            const pack = await stickerService.createUserStickerPack(db, {
                name: name.trim(),
                thumbnailMediaId: thumbnailMediaId || null,
                sortOrder: sortOrder || 0
            }, userId);

            res.status(201).json(pack);
        } catch (error) {
            console.error("Error creating sticker pack:", error);
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(409).json({ error: 'Pack name already exists for this user' });
            }
            next(error);
        }
    });

    // POST /api/stickers/packs/:packId/stickers - 向表情包添加新表情
    router.post('/packs/:packId/stickers', authenticateToken, async (req, res, next) => {
        try {
            const packId = parseInt(req.params.packId, 10);
            const { mediaId, emojiKeywords, description, sortOrder } = req.body;

            if (isNaN(packId)) {
                return res.status(400).json({ error: 'Invalid pack ID' });
            }

            if (!mediaId || isNaN(parseInt(mediaId, 10))) {
                return res.status(400).json({ error: 'Valid media ID is required' });
            }

            const sticker = await stickerService.createSticker(db, {
                packId,
                mediaId: parseInt(mediaId, 10),
                emojiKeywords: emojiKeywords || '',
                description: description || '',
                sortOrder: sortOrder || 0
            });

            res.status(201).json(sticker);
        } catch (error) {
            console.error("Error creating sticker:", error);
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(409).json({ error: 'Media already used for another sticker' });
            }
            next(error);
        }
    });    // POST /api/stickers/upload-pack - 上传表情包（同时上传多个文件并创建表情包）
    router.post('/upload-pack', authenticateToken, async (req, res, next) => {
        try {
            const { name, files } = req.body; // files 是上传后的媒体ID数组
            const userId = req.user.id;
            
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({ error: 'Pack name is required' });
            }

            if (!files || !Array.isArray(files) || files.length === 0) {
                return res.status(400).json({ error: 'At least one file is required' });
            }

            // 创建表情包
            const pack = await stickerService.createUserStickerPack(db, {
                name: name.trim(),
                thumbnailMediaId: files[0], // 使用第一个图片作为缩略图
                sortOrder: 0
            }, userId);

            // 添加所有表情到表情包
            const stickers = [];
            for (let i = 0; i < files.length; i++) {
                const mediaId = files[i];
                try {
                    const sticker = await stickerService.createSticker(db, {
                        packId: pack.id,
                        mediaId: parseInt(mediaId, 10),
                        emojiKeywords: '',
                        description: `表情 ${i + 1}`,
                        sortOrder: i
                    });
                    stickers.push(sticker);
                } catch (stickerError) {
                    console.error(`Error creating sticker for media ${mediaId}:`, stickerError);
                    // 继续处理其他贴纸，不中断整个过程
                }
            }

            res.status(201).json({
                pack,
                stickers,
                message: `Successfully created pack with ${stickers.length} stickers`
            });
        } catch (error) {
            console.error("Error uploading sticker pack:", error);
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(409).json({ error: 'Pack name already exists for this user' });
            }
            next(error);
        }
    });

    // DELETE /api/stickers/packs/:packId - 删除表情包
    router.delete('/packs/:packId', authenticateToken, async (req, res, next) => {
        try {
            const packId = parseInt(req.params.packId, 10);
            const userId = req.user.id;
            
            if (isNaN(packId)) {
                return res.status(400).json({ error: 'Invalid pack ID' });
            }

            const result = await stickerService.deleteStickerPack(db, packId, userId);
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Pack not found or you do not have permission to delete it' });
            }

            res.json({ message: 'Pack deleted successfully' });
        } catch (error) {
            console.error("Error deleting sticker pack:", error);
            next(error);
        }
    });

    // DELETE /api/stickers/:id - 删除单个表情
    router.delete('/:id', authenticateToken, async (req, res, next) => {
        try {
            const stickerId = parseInt(req.params.id, 10);
            if (isNaN(stickerId)) {
                return res.status(400).json({ error: 'Invalid sticker ID' });
            }

            const result = await stickerService.deleteSticker(db, stickerId);
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Sticker not found' });
            }

            res.json({ message: 'Sticker deleted successfully' });
        } catch (error) {
            console.error("Error deleting sticker:", error);
            next(error);
        }
    });

    return router;
};