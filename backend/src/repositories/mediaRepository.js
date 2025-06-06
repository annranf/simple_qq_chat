// src/repositories/mediaRepository.js

async function createMediaAttachment(db, { uploaderId, fileName, filePath, mimeType, sizeBytes, checksum, metadata = null }) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO media_attachments (uploader_id, file_name, file_path, mime_type, size_bytes, checksum, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [uploaderId, fileName, filePath, mimeType, sizeBytes, checksum, metadata ? JSON.stringify(metadata) : null];
        db.run(sql, params, function (err) {
            if (err) {
                console.error('Error creating media attachment record:', err);
                return reject(err);
            }
            // Fetch the created record to return full details
            getMediaAttachmentById(db, this.lastID)
                .then(resolve)
                .catch(reject);
        });
    });
}

async function getMediaAttachmentById(db, mediaId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id, uploader_id, file_name, file_path, mime_type, size_bytes, checksum, metadata, created_at
            FROM media_attachments
            WHERE id = ?
        `;
        db.get(sql, [mediaId], (err, row) => {
            if (err) {
                console.error(`Error fetching media attachment by id ${mediaId}:`, err);
                return reject(err);
            }
            if (row && row.metadata) {
                try {
                    row.metadata = JSON.parse(row.metadata);
                } catch (e) {
                    console.warn(`Failed to parse metadata for media ${row.id}:`, e);
                    row.metadata = null;
                }
            }
            resolve(row); // row can be undefined
        });
    });
}

async function findMediaByChecksum(db, checksum) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id, uploader_id, file_name, file_path, mime_type, size_bytes, checksum, metadata, created_at
            FROM media_attachments
            WHERE checksum = ?
        `;
        db.get(sql, [checksum], (err, row) => {
            if (err) {
                console.error(`Error fetching media attachment by checksum ${checksum}:`, err);
                return reject(err);
            }
             if (row && row.metadata) {
                try {
                    row.metadata = JSON.parse(row.metadata);
                } catch (e) {
                    console.warn(`Failed to parse metadata for media ${row.id}:`, e);
                    row.metadata = null;
                }
            }
            resolve(row);
        });
    });
}


module.exports = {
    createMediaAttachment,
    getMediaAttachmentById,
    findMediaByChecksum,
};