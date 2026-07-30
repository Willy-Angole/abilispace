/**
 * Cookie helpers for httpOnly auth tokens.
 * Prefer cookies over localStorage for XSS resistance.
 * Works best when frontend and API share a parent origin (nginx proxy).
 */

import { Request, Response } from 'express';
import { config } from '../config/environment';

export const COOKIE_NAMES = {
    access: 'abilispace_access',
    refresh: 'abilispace_refresh',
    adminAccess: 'abilispace_admin_access',
    adminRefresh: 'abilispace_admin_refresh',
    csrf: 'abilispace_csrf',
} as const;

function cookieBaseOptions() {
    const isProd = config.isProduction;
    // Prefer SameSite=Lax for same-origin nginx deploys (recommended).
    // Set COOKIE_SAMESITE=none for cross-site SPA+API on different domains (requires Secure).
    const sameSiteEnv = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
    const sameSite =
        sameSiteEnv === 'none' || sameSiteEnv === 'strict' || sameSiteEnv === 'lax'
            ? (sameSiteEnv as 'none' | 'lax' | 'strict')
            : 'lax';
    return {
        httpOnly: true,
        secure: isProd || sameSite === 'none',
        sameSite,
        path: '/',
    };
}

export function parseCookies(req: Request): Record<string, string> {
    const header = req.headers.cookie;
    if (!header) return {};

    const out: Record<string, string> = {};
    for (const part of header.split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (key) {
            try {
                out[key] = decodeURIComponent(value);
            } catch {
                out[key] = value;
            }
        }
    }
    return out;
}

export function getCookie(req: Request, name: string): string | undefined {
    return parseCookies(req)[name];
}

/** Parse duration like 15m, 7d into milliseconds */
export function durationToMs(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([dhms])$/);
    if (!match) return 15 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
        d: 86400000,
        h: 3600000,
        m: 60000,
        s: 1000,
    };
    return value * (multipliers[unit] || 60000);
}

export function setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string }
): void {
    const base = cookieBaseOptions();
    res.cookie(COOKIE_NAMES.access, tokens.accessToken, {
        ...base,
        maxAge: durationToMs(config.jwt.expiresIn),
    });
    res.cookie(COOKIE_NAMES.refresh, tokens.refreshToken, {
        ...base,
        maxAge: durationToMs(config.jwt.refreshExpiresIn),
    });
}

export function clearAuthCookies(res: Response): void {
    const base = cookieBaseOptions();
    res.clearCookie(COOKIE_NAMES.access, base);
    res.clearCookie(COOKIE_NAMES.refresh, base);
}

export function setAdminAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string }
): void {
    const base = cookieBaseOptions();
    res.cookie(COOKIE_NAMES.adminAccess, tokens.accessToken, {
        ...base,
        maxAge: durationToMs(config.jwt.expiresIn),
    });
    res.cookie(COOKIE_NAMES.adminRefresh, tokens.refreshToken, {
        ...base,
        maxAge: durationToMs(config.jwt.refreshExpiresIn),
    });
}

export function clearAdminAuthCookies(res: Response): void {
    const base = cookieBaseOptions();
    res.clearCookie(COOKIE_NAMES.adminAccess, base);
    res.clearCookie(COOKIE_NAMES.adminRefresh, base);
}

/**
 * Extract bearer token from Authorization header or auth cookie.
 */
export function extractAccessToken(
    req: Request,
    cookieName: string = COOKIE_NAMES.access
): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer' && parts[1]) {
            return parts[1];
        }
    }
    return getCookie(req, cookieName) || null;
}
