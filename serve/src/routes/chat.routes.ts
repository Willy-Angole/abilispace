import { Router, Response } from 'express';
import { z } from 'zod';
import { askGemini } from '../services/gemini.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rate-limiter';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

/** Stricter limit for AI endpoints: 20 requests per 15 minutes per client */
const chatRateLimiter = createRateLimiter(20, 15 * 60 * 1000);

const chatSchema = z.object({
    message: z.string().min(1).max(2000),
    language: z.enum(['en', 'sw']).default('en'),
    history: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string().max(2000),
    })).max(10).default([]),
});

router.post(
    '/',
    authenticate,
    chatRateLimiter,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const parsed = chatSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: 'Invalid request' });
            return;
        }

        const { message, language, history } = parsed.data;
        const { reply, usedAI } = await askGemini(message, history, language);

        if (!usedAI || !reply) {
            res.json({ success: true, reply: null, fallback: true });
            return;
        }

        res.json({ success: true, reply, fallback: false });
    })
);

export default router;
