import { Router, Response, IRouter } from 'express';
import multer from 'multer';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { uploadFileToCloudinary } from '../config/cloudinary';
import { logger } from '../utils/logger';

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

router.post('/', authenticate, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const result = await uploadFileToCloudinary(
      req.file.buffer,
      req.file.originalname,
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
});

export default router;
