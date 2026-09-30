/**
 * Admin routes catch their own errors. Return a generic message unless the
 * error is one we raised on purpose.
 */

import { Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../middleware/error-handler';
import { logger } from './logger';

const SQL_LEAK = /select\s|insert\s|update\s|delete\s|syntax|relation |column |violates|secret|token|password|\/|\\|\.sql|pg_|sqlstate/i;

export function isSafeAdminMessage(message: string): boolean {
    if (!message || message.length > 180) return false;
    if (SQL_LEAK.test(message)) return false;
    return /not found|required|invalid|no fields|already|locked|disabled|credentials|unauthorized|must be|boolean|only image files/i.test(message);
}

export function safeZodMessage(error: ZodError): string {
    const message = error.issues[0]?.message ?? 'Invalid input';
    if (message.length > 160 || SQL_LEAK.test(message)) return 'Invalid input';
    return message;
}

export function adminCatch(
    res: Response,
    error: unknown,
    fallback: string,
    status = 500
): void {
    if (error instanceof ZodError) {
        res.status(400).json({ error: safeZodMessage(error) });
        return;
    }

    const message = error instanceof Error ? error.message : '';

    if (error instanceof AppError) {
        logger.warn(fallback, { code: error.code, message: error.message });
        res.status(error.statusCode).json({ error: error.message });
        return;
    }

    logger.error(fallback, {
        name: error instanceof Error ? error.name : 'Error',
        message: message.slice(0, 300),
    });

    if (isSafeAdminMessage(message)) {
        res.status(/not found/i.test(message) ? 404 : status).json({ error: message });
        return;
    }

    res.status(status).json({ error: fallback });
}
