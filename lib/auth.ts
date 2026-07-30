/**
 * Authentication Library
 *
 * Tokens: access token kept in memory only (XSS-resistant vs localStorage).
 * Server also sets httpOnly cookies for same-origin / proxy deploys.
 * User profile may be cached in localStorage for UI (non-secret).
 */

// Resolve API base URL at call time (import-time window is undefined in SSR)
function getApiBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return 'http://localhost:4000';
}

export interface AuthResponse {
    success: boolean;
    message: string;
    accessToken?: string;
    refreshToken?: string;
    user?: User;
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    gender?: string;
    phone?: string;
    location?: string;
    accountType?: string;
    disabilityType?: string;
    accessibilityNeeds?: string;
    communicationPreference?: string;
    emergencyContact?: string;
    avatarUrl?: string;
    emailVerified: boolean;
    isActive: boolean;
    createdAt: string;
}

export interface CareRecipientInput {
    firstName: string;
    lastName: string;
    gender: string;
    relationship: string;
    disabilityType: string;
    accessibilityNeeds?: string;
    dateOfBirth?: string;
}

export interface RegisterInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    gender: string;
    phone: string;
    location?: string;
    accountType: string;
    sectorRole?: string;
    disabilityType?: string;
    accessibilityNeeds?: string;
    communicationPreference?: string;
    emergencyContact: string;
    careRecipient?: CareRecipientInput;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface GoogleAuthAdditionalInfo {
    phone?: string;
    location?: string;
    disabilityType?: string;
    accessibilityNeeds?: string;
    communicationPreference?: string;
    emergencyContact?: string;
}

const USER_KEY = 'shiriki_user';
const AUTH_FLAG_KEY = 'shiriki_session';

/** In-memory access token — never written to localStorage */
let memoryAccessToken: string | null = null;
/** In-memory refresh token for cross-origin dev (cookie may not be shared) */
let memoryRefreshToken: string | null = null;

let csrfToken: string | null = null;

/**
 * Store auth tokens in memory only (not localStorage).
 * Server also sets httpOnly cookies when SameSite allows.
 */
export function storeTokens(accessToken: string, refreshToken: string): void {
    memoryAccessToken = accessToken;
    memoryRefreshToken = refreshToken;
    if (typeof window !== 'undefined') {
        // Non-secret flag for soft session restore UX
        sessionStorage.setItem(AUTH_FLAG_KEY, '1');
        // Clear any legacy localStorage tokens
        localStorage.removeItem('shiriki_access_token');
        localStorage.removeItem('shiriki_refresh_token');
    }
}

export function storeUser(user: User): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
}

export function getAccessToken(): string | null {
    return memoryAccessToken;
}

export function getRefreshToken(): string | null {
    return memoryRefreshToken;
}

export function getStoredUser(): User | null {
    if (typeof window !== 'undefined') {
        const userData = localStorage.getItem(USER_KEY);
        return userData ? JSON.parse(userData) : null;
    }
    return null;
}

export function clearAuth(): void {
    memoryAccessToken = null;
    memoryRefreshToken = null;
    csrfToken = null;
    if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem('shiriki_access_token');
        localStorage.removeItem('shiriki_refresh_token');
        sessionStorage.removeItem(AUTH_FLAG_KEY);
    }
}

export function isAuthenticated(): boolean {
    if (memoryAccessToken) return true;
    if (typeof window !== 'undefined') {
        return sessionStorage.getItem(AUTH_FLAG_KEY) === '1' || !!getStoredUser();
    }
    return false;
}

async function ensureCsrfToken(): Promise<string | null> {
    if (csrfToken) return csrfToken;
    try {
        const response = await fetch(`${getApiBaseUrl()}/api/csrf-token`, {
            credentials: 'include',
        });
        if (!response.ok) return null;
        const data = await response.json();
        csrfToken = data.csrfToken || null;
        return csrfToken;
    } catch {
        return null;
    }
}

/**
 * Shared fetch options: always send cookies + Bearer when available.
 */
export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const accessToken = getAccessToken();
    const method = (options.method || 'GET').toUpperCase();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // CSRF for cookie-session mutating requests when no bearer yet
    if (!accessToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const csrf = await ensureCsrfToken();
        if (csrf) headers['X-CSRF-Token'] = csrf;
    }

    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    // Auto-refresh once on 401
    if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            const retryHeaders = { ...headers };
            const newToken = getAccessToken();
            if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`;
            const retry = await fetch(`${getApiBaseUrl()}${endpoint}`, {
                ...options,
                headers: retryHeaders,
                credentials: 'include',
            });
            const retryData = await retry.json();
            if (!retry.ok) {
                throwApiError(retry, retryData);
            }
            return retryData;
        }
    }

    const data = await response.json();

    if (!response.ok) {
        throwApiError(response, data);
    }

    return data;
}

function throwApiError(response: Response, data: {
    message?: string;
    errors?: Record<string, string[]>;
}): never {
    if (response.status === 422 && data.errors) {
        const errorMessages: string[] = [];
        for (const field in data.errors) {
            const fieldErrors = data.errors[field];
            if (Array.isArray(fieldErrors)) {
                errorMessages.push(...fieldErrors);
            }
        }
        throw new Error(errorMessages.join('. ') || data.message || 'Validation failed');
    }
    throw new Error(data.message || 'Request failed');
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
    });

    if (response.success && response.accessToken && response.refreshToken && response.user) {
        storeTokens(response.accessToken, response.refreshToken);
        storeUser(response.user);
    }

    return response;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
    });

    if (response.success && response.accessToken && response.refreshToken && response.user) {
        storeTokens(response.accessToken, response.refreshToken);
        storeUser(response.user);
    }

    return response;
}

export async function googleAuth(
    idToken: string,
    additionalInfo?: GoogleAuthAdditionalInfo
): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken, additionalInfo }),
    });

    if (response.success && response.accessToken && response.refreshToken && response.user) {
        storeTokens(response.accessToken, response.refreshToken);
        storeUser(response.user);
    }

    return response;
}

export async function refreshAccessToken(): Promise<boolean> {
    const refreshToken = getRefreshToken();

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        const body = refreshToken ? JSON.stringify({ refreshToken }) : JSON.stringify({});

        const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
            method: 'POST',
            headers,
            body,
            credentials: 'include',
        });

        if (!response.ok) {
            clearAuth();
            return false;
        }

        const data = await response.json();
        if (data.success && data.accessToken) {
            storeTokens(data.accessToken, data.refreshToken || refreshToken || '');
            return true;
        }
    } catch {
        clearAuth();
    }

    return false;
}

/**
 * Attempt to restore session after full page reload (memory token lost).
 * Uses httpOnly refresh cookie when available, else fails soft.
 */
export async function restoreSession(): Promise<boolean> {
    if (memoryAccessToken) return true;
    if (typeof window === 'undefined') return false;
    if (sessionStorage.getItem(AUTH_FLAG_KEY) !== '1' && !getStoredUser()) {
        return false;
    }
    return refreshAccessToken();
}

export async function logout(): Promise<void> {
    const refreshToken = getRefreshToken();

    try {
        await apiRequest('/api/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        });
    } catch {
        // Ignore errors during logout
    } finally {
        clearAuth();
    }
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>('/api/auth/request-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export async function verifyResetCode(
    email: string,
    code: string
): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>('/api/auth/verify-reset-code', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
    });
}

export async function resetPassword(
    email: string,
    code: string,
    newPassword: string
): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
    });
}

export interface ProfileUpdateInput {
    firstName?: string;
    lastName?: string;
    phone?: string;
    location?: string;
    disabilityType?: string;
    accessibilityNeeds?: string;
    communicationPreference?: string;
    emergencyContact?: string;
}

export interface ProfileResponse {
    success: boolean;
    message?: string;
    profile?: User;
}

export async function getProfile(): Promise<ProfileResponse> {
    const response = await apiRequest<ProfileResponse>('/api/profile', {
        method: 'GET',
    });

    if (response.success && response.profile) {
        storeUser(response.profile);
    }

    return response;
}

export async function updateProfile(input: ProfileUpdateInput): Promise<ProfileResponse> {
    const response = await apiRequest<ProfileResponse>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(input),
    });

    if (response.success && response.profile) {
        storeUser(response.profile);
    }

    return response;
}

export interface AvatarUploadResponse {
    success: boolean;
    message?: string;
    avatarUrl?: string;
}

export async function uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const accessToken = getAccessToken();

    const formData = new FormData();
    formData.append('avatar', file);

    const headers: Record<string, string> = {};
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${getApiBaseUrl()}/api/profile/avatar`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Failed to upload avatar');
    }

    if (data.success && data.avatarUrl) {
        const user = getStoredUser();
        if (user) {
            user.avatarUrl = data.avatarUrl;
            storeUser(user);
        }
    }

    return data;
}

export async function deleteAvatar(): Promise<{ success: boolean; message?: string }> {
    const response = await apiRequest<{ success: boolean; message?: string }>('/api/profile/avatar', {
        method: 'DELETE',
    });

    if (response.success) {
        const user = getStoredUser();
        if (user) {
            user.avatarUrl = undefined;
            storeUser(user);
        }
    }

    return response;
}
