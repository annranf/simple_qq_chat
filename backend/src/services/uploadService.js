// src/services/uploadService.js
const fs = require('fs').promises; // Use promises for async file operations
const path = require('path');
const crypto = require('crypto');
const mediaRepository = require('../repositories/mediaRepository');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads'); //  telegram-clone-backend/uploads/

// Ensure uploads directory exists
async function ensureUploadsDir() {
    try {
        await fs.access(UPLOADS_DIR);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(UPLOADS_DIR, { recursive: true });
            console.log(`Created uploads directory: ${UPLOADS_DIR}`);
        } else {
            throw error;
        }
    }
}
ensureUploadsDir(); // Call on module load

function calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = require('fs').createReadStream(filePath); // Use non-promise fs for stream
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

async function handleFileUpload(db, file, uploaderId, fileType = 'generic') { // fileType can be 'image', 'video', 'document'
    console.log('handleFileUpload called with:', { uploaderId, fileType });
    console.log('File details:', file);
    
    if (!file) {
        console.log('Error: No file provided');
        throw new Error('No file uploaded.');
    }

    // File object from multer contains: originalname, mimetype, path (temp path), size
    const tempFilePath = file.path;
    const originalFileName = file.originalname;
    const mimeType = file.mimetype;
    const sizeBytes = file.size;

    console.log('Processing file:', { originalFileName, mimeType, sizeBytes, tempFilePath });

    // 1. Calculate checksum of the uploaded file
    console.log('Calculating checksum...');
    const checksum = await calculateChecksum(tempFilePath);
    console.log('Checksum calculated:', checksum);

    // 2. Check if a file with this checksum already exists (deduplication)
    console.log('Checking for existing media with checksum...');
    let existingMedia = await mediaRepository.findMediaByChecksum(db, checksum);

    if (existingMedia) {        console.log(`File with checksum ${checksum} already exists (ID: ${existingMedia.id}). Using existing file.`);
        // If found, we don't need to save the new file, just remove the temporary one.
        await fs.unlink(tempFilePath).catch(err => console.error("Error deleting temp file (duplicate):", err));
        
        // Optionally, update metadata or create a new record if the uploader/context is different,
        // but still pointing to the same physical file. For simplicity, we'll use the existing record.
        // If a new record is desired even for duplicates (e.g., track each upload instance):
        // existingMedia = await mediaRepository.createMediaAttachment(db, {
        //     uploaderId,
        //     fileName: originalFileName, // Use new original name
        //     filePath: existingMedia.filePath, // Point to existing physical file
        //     mimeType,
        //     sizeBytes,
        //     checksum,
        //     metadata: { type: fileType /* add more metadata like dimensions, duration */ }
        // });
        console.log('Returning existing media record:', existingMedia);
        return existingMedia; // Return the existing media record
    }

    console.log('No existing media found, creating new file...');    // 3. If not a duplicate, generate a new unique filename for storage
    // Example: <timestamp>-<random_hex>.<original_extension>
    const extension = path.extname(originalFileName) || ''; // .jpg, .png
    const uniqueFileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
    const permanentFilePath = path.join(UPLOADS_DIR, uniqueFileName);
    const relativeFilePath = `uploads/${uniqueFileName}`; // 始终使用正斜杠格式存储到数据库

    console.log('Generated file paths:', { uniqueFileName, permanentFilePath, relativeFilePath });

    // 4. Move the file from temp location to permanent storage
    console.log('Moving file from temp to permanent location...');
    try {
        await fs.rename(tempFilePath, permanentFilePath);
        console.log(`File moved successfully to: ${permanentFilePath}`);
    } catch (error) {
        console.error('Failed to move file:', error);
        // If rename fails, try to delete the temp file
        await fs.unlink(tempFilePath).catch(err => console.error("Error deleting temp file after failed rename:", err));
        throw new Error(`Failed to move uploaded file: ${error.message}`);
    }    
    console.log(`File moved to: ${permanentFilePath}`);

    // 5. Save media metadata to database
    console.log('Preparing metadata for database...');
    // Placeholder for actual metadata (e.g., image dimensions, video duration)
    // This would typically be extracted using libraries like 'sharp' for images or 'ffprobe' for videos.
    let fileSpecificMetadata = { type: fileType };
    if (mimeType.startsWith('image/')) {
        // e.g., use 'sharp' to get dimensions
        // fileSpecificMetadata.width = ...; fileSpecificMetadata.height = ...;
    } else if (mimeType.startsWith('video/')) {
        // e.g., use 'fluent-ffmpeg' (with ffprobe) to get duration, dimensions
        // fileSpecificMetadata.duration = ...; fileSpecificMetadata.width = ...; fileSpecificMetadata.height = ...;
    }

    const mediaData = {
        uploaderId,
        fileName: originalFileName,
        filePath: relativeFilePath, // Store relative path
        mimeType,
        sizeBytes,
        checksum,
        metadata: fileSpecificMetadata
    };
    
    console.log('Saving media to database with data:', mediaData);
    const newMedia = await mediaRepository.createMediaAttachment(db, mediaData);
    console.log('Media saved to database:', newMedia);

    return newMedia;
}

module.exports = {
    handleFileUpload,
    UPLOADS_DIR // Export for multer config
};