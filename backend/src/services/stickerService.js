// src/services/stickerService.js
const stickerRepository = require('../repositories/stickerRepository');

async function getAvailableStickerPacks(db, userId = null) {
    // 如果指定了 userId，只返回系统表情包和该用户的表情包
    // 如果没有指定 userId，返回所有系统表情包
    return stickerRepository.getAllPacksWithStickersDetails(db, userId);
}

async function getUserStickerPacks(db, userId) {
    // 只获取用户自己上传的表情包
    return stickerRepository.getUserStickerPacks(db, userId);
}

async function getStickerById(db, stickerId) {
    return stickerRepository.getStickerById(db, stickerId);
}

async function createStickerPack(db, packData) {
    return stickerRepository.createStickerPack(db, packData);
}

async function createUserStickerPack(db, packData, userId) {
    // 创建用户表情包，添加 uploader_id
    return stickerRepository.createStickerPack(db, {
        ...packData,
        uploader_id: userId
    });
}

async function createSticker(db, stickerData) {
    return stickerRepository.createSticker(db, stickerData);
}

async function deleteStickerPack(db, packId, userId = null) {
    // 如果指定了 userId，只能删除自己的表情包
    return stickerRepository.deleteStickerPack(db, packId, userId);
}

async function deleteSticker(db, stickerId) {
    return stickerRepository.deleteSticker(db, stickerId);
}

module.exports = { 
    getAvailableStickerPacks,
    getUserStickerPacks,
    getStickerById,
    createStickerPack,
    createUserStickerPack,
    createSticker,
    deleteStickerPack,
    deleteSticker
};