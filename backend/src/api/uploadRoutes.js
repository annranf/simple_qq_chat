// src/api/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const uploadService = require('../services/uploadService');
const { authenticateToken } = require('../middleware/authMiddleware'); // Placeholder

// // Mock auth middleware
// const authenticateToken = (req, res, next) => {
//     const userId = parseInt(req.headers['x-user-id'] || req.query.userId);
//     if (!userId) return res.status(401).json({ message: "Unauthorized: User ID missing for upload." });
//     req.user = { id: userId };
//     next();
// };

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Temp destination for multer before our service moves it
        // This could be a dedicated temp folder or UPLOADS_DIR if checksum is done after move.
        // For simplicity, let's use a temp subfolder within uploads or system temp.
        // For now, let's use a 'temp' subfolder in UPLOADS_DIR
        const tempDir = path.join(uploadService.UPLOADS_DIR, 'temp');
        require('fs').mkdirSync(tempDir, { recursive: true }); // Ensure temp dir exists
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        // Multer uses this to name the temp file. It doesn't really matter as we rename it.
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images and videos (extend as needed)
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 50 // 50MB limit for example
    },
    fileFilter: fileFilter
});


module.exports = function(db) {
    const router = express.Router();    // POST /api/uploads/media - Endpoint for uploading image or video files
    // Expects a single file in a field named 'mediaFile'
    router.post('/media', authenticateToken, upload.single('mediaFile'), async (req, res, next) => {
        console.log('Upload endpoint called');
        console.log('Request headers:', req.headers);
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);
        
        if (!req.file) {
            console.log('No file in request');
            return res.status(400).json({ message: 'No file was uploaded or file was rejected.' });
        }
        
        const uploaderId = req.user.id;
        const fileType = req.body.fileType || (req.file.mimetype.startsWith('image/') ? 'image' : (req.file.mimetype.startsWith('video/') ? 'video' : 'generic'));

        console.log('Uploader ID:', uploaderId);
        console.log('File type:', fileType);
        console.log('File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });

        try {
            console.log('Calling uploadService.handleFileUpload');
            const mediaAttachment = await uploadService.handleFileUpload(db, req.file, uploaderId, fileType);
            console.log('Upload service completed, media attachment:', mediaAttachment);
            
            res.status(201).json({
                message: 'File uploaded successfully.',
                media: mediaAttachment
            });
        } catch (error) {
            console.error('Error handling file upload:', error);
            // If multer generated an error (e.g., fileSize limit)
            if (error instanceof multer.MulterError) {
                return res.status(400).json({ message: `Multer error: ${error.message}` });
            }
            // Custom errors from service or file system
            if (error.message.includes('Invalid file type')) {
                 return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: `Server error during upload: ${error.message}` });
            // No next(error) here if we want to send specific JSON response
        }
    });

    return router;
};