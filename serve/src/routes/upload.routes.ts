import { Router, Response, IRouter } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { uploadFileToCloudinary } from '../config/cloudinary';
import { logger } from '../utils/logger';
import { createRateLimiter } from '../middleware/rate-limiter';

const router: IRouter = Router();

/** Allowed MIME types for messaging attachments */
const ALLOWED_MIME_TYPES = new Set([
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Audio / voice notes
    'audio/mpeg',
    'audio/mp4',
    'audio/webm',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/webm;codecs=opus',
    // Video
    'video/mp4',
    'video/webm',
    'video/quicktime',
    // Documents
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.mp3', '.m4a', '.webm', '.ogg', '.wav',
    '.mp4', '.mov',
    '.pdf', '.txt', '.doc', '.docx',
]);

const uploadRateLimiter = createRateLimiter(30, 15 * 60 * 1000);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const mime = (file.mimetype || '').toLowerCase().split(';')[0].trim();

        // Allow common voice recording mime variants
        const mimeOk =
            ALLOWED_MIME_TYPES.has(file.mimetype) ||
            ALLOWED_MIME_TYPES.has(mime) ||
            mime.startsWith('image/') ||
            mime.startsWith('audio/') ||
            mime === 'application/pdf';

        const extOk = !ext || ALLOWED_EXTENSIONS.has(ext);

        if (mimeOk && extOk) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed: ${file.mimetype || ext || 'unknown'}`));
        }
    },
});

router.post(
    '/',
    authenticate,
    uploadRateLimiter,
    (req, res, next) => {
        upload.single('file')(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        error: 'File too large (max 15MB)',
                    });
                }
                return res.status(400).json({ success: false, error: err.message });
            }
            if (err) {
                return res.status(400).json({ success: false, error: err.message });
            }
            next();
        });
    },
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file provided' });
            }

            // Reject empty buffers
            if (!req.file.buffer || req.file.buffer.length === 0) {
                return res.status(400).json({ success: false, error: 'Empty file' });
            }

            // Basic magic-byte checks for common types
            if (!looksLikeAllowedFile(req.file.buffer, req.file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    error: 'File content does not match declared type',
                });
            }

            const safeName = path
                .basename(req.file.originalname || 'upload')
                .replace(/[^a-zA-Z0-9._-]/g, '_')
                .slice(0, 100);

            const result = await uploadFileToCloudinary(
                req.file.buffer,
                safeName,
                req.file.mimetype
            );

            if (!result.success) {
                return res.status(500).json({ success: false, error: result.error });
            }

            logger.info('File uploaded', { userId: req.userId, url: result.url });

            return res.json({ success: true, url: result.url });
        } catch (error) {
            logger.error('Upload route error', { error });
            return res.status(500).json({ success: false, error: 'Upload failed' });
        }
    }
);

/**
 * Lightweight content sniffing — not a full antivirus, but blocks obvious spoofs.
 */
function looksLikeAllowedFile(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 4) return false;
    const mime = mimeType.toLowerCase().split(';')[0].trim();

    // PDF
    if (mime === 'application/pdf') {
        return buffer.slice(0, 5).toString('ascii') === '%PDF-';
    }

    // PNG
    if (mime === 'image/png') {
        return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    }

    // JPEG
    if (mime === 'image/jpeg') {
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    // GIF
    if (mime === 'image/gif') {
        const sig = buffer.slice(0, 6).toString('ascii');
        return sig === 'GIF87a' || sig === 'GIF89a';
    }

    // WEBP (RIFF....WEBP)
    if (mime === 'image/webp') {
        return (
            buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
            buffer.slice(8, 12).toString('ascii') === 'WEBP'
        );
    }

    // For audio/video/docs without stable magic, accept after extension/MIME filter
    if (
        mime.startsWith('audio/') ||
        mime.startsWith('video/') ||
        mime === 'text/plain' ||
        mime.includes('word') ||
        mime.includes('document')
    ) {
        return true;
    }

    return true;
}

export default router;
