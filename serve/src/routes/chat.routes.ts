import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { askGemini } from '../services/gemini.service';
import { rateLimiter } from '../middleware/rate-limiter';

const router = Router();

const chatSchema = z.object({
    message: z.string().min(1).max(2000),
    language: z.enum(['en', 'sw']).default('en'),
    history: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string().max(2000),
    })).max(20).default([]),
});

router.post('/', async (req: Request, res: Response) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Invalid request' });
    }

    const { message, language, history } = parsed.data;
    const { reply, usedAI } = await askGemini(message, history, language);

    if (!usedAI || !reply) {
        // Signal to the frontend to use keyword fallback
        return res.json({ success: true, reply: null, fallback: true });
    }

    return res.json({ success: true, reply, fallback: false });
});

export default router;
