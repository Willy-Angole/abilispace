/**
 * Authentication Library
 * 
 * Handles all authentication operations including credential-based
 * and Google OAuth authentication.
 */

// API base URL - configure based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Auth response from backend
 */
export interface AuthResponse {
    success: boolean;
    message: string;
    accessToken?: string;
    refreshToken?: string;
    user?: User;
}

/**
 * User type from backend
 */
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
    disabilityType?: string;
    accessibilityNeeds?: string;
    communicationPreference?: string;
    emergencyContact?: string;
    avatarUrl?: string;
    emailVerified: boolean;
    isActive: boolean;
    createdAt: string;
}

/**
 * Registration input
 */
export interface RegisterInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
    disabilityType?: string;
    accessibilityNeeds?: string;
    communicationPreference?: string;
    emergencyContact?: string;
}

/**
 * Login input
 */
export interface LoginInput {
    email: string;
    password: string;
}

/**
 * Google auth additional info
 */
export interface GoogleAuthAdditionalInfo {
    phone?: string;
    location?: string;
    disabilityType?: string;
    accessibilityNeeds?: string;
    communicationPreference?: string;
    emergencyContact?: string;
}

// Token storage keys
const ACCESS_TOKEN_KEY = 'shiriki_access_token';
const REFRESH_TOKEN_KEY = 'shiriki_refresh_token';
const USER_KEY = 'shiriki_user';

/**
 * Store auth tokens securely
 */
export function storeTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
}

/**
 * Store user data
 */
export function storeUser(user: User): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
}

/**
 * Get stored user
 */
export function getStoredUser(): User | null {
    if (typeof window !== 'undefined') {
        const userData = localStorage.getItem(USER_KEY);
        return userData ? JSON.parse(userData) : null;
    }
    return null;
}

/**
 * Clear all auth data
 */
export function clearAuth(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    return !!getAccessToken();
}

/**
 * API request helper with auth headers
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const accessToken = getAccessToken();
    
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    
    if (accessToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }
    
    return data;
}

/**
 * Register new user with credentials
 */
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

/**
 * Login with credentials
 */
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

/**
 * Authenticate with Google
 * Tries backend first, falls back to client-side JWT decode for demo
 */
export async function googleAuth(
    idToken: string,
    additionalInfo?: GoogleAuthAdditionalInfo
): Promise<AuthResponse> {
    try {
        // Try backend API first
        const response = await apiRequest<AuthResponse>('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify({ idToken, additionalInfo }),
        });
        
        if (response.success && response.accessToken && response.refreshToken && response.user) {
            storeTokens(response.accessToken, response.refreshToken);
            storeUser(response.user);
        }
        
        return response;
    } catch (error) {
        // Fallback: Decode Google ID token client-side for demo/offline mode
        // In production, always validate tokens server-side
        console.warn('Backend unavailable, using client-side Google auth fallback');
        
        try {
            // Decode the JWT payload (base64)
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            
            const user: User = {
                id: payload.sub || Date.now().toString(),
                email: payload.email,
                firstName: payload.given_name || payload.name?.split(' ')[0] || 'User',
                lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
                phone: additionalInfo?.phone,
                location: additionalInfo?.location,
                disabilityType: additionalInfo?.disabilityType,
                accessibilityNeeds: additionalInfo?.accessibilityNeeds,
                communicationPreference: additionalInfo?.communicationPreference || 'email',
                emailVerified: payload.email_verified || true,
                isActive: true,
                createdAt: new Date().toISOString(),
            };
            
            // Store user in localStorage for demo
            storeUser(user);
            
            // Also store in the legacy format for compatibility with page.tsx
            if (typeof window !== 'undefined') {
                localStorage.setItem('accessibleApp_user', JSON.stringify(user));
                
                // Add to users list
                const users = JSON.parse(localStorage.getItem('accessibleApp_users') || '[]');
                const existingUserIndex = users.findIndex((u: User) => u.email === user.email);
                if (existingUserIndex >= 0) {
                    users[existingUserIndex] = user;
                } else {
                    users.push(user);
                }
                localStorage.setItem('accessibleApp_users', JSON.stringify(users));
            }
            
            return {
                success: true,
                message: 'Signed in with Google successfully',
                user,
            };
        } catch (decodeError) {
            console.error('Failed to decode Google token:', decodeError);
            throw new Error('Failed to process Google sign-in');
        }
    }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
        return false;
    }
    
    try {
        const response = await apiRequest<{
            success: boolean;
            accessToken: string;
            refreshToken: string;
        }>('/api/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        });
        
        if (response.success) {
            storeTokens(response.accessToken, response.refreshToken);
            return true;
        }
    } catch {
        clearAuth();
    }
    
    return false;
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    
    try {
        if (refreshToken) {
            await apiRequest('/api/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refreshToken }),
            });
        }
    } catch {
        // Ignore errors during logout
    } finally {
        clearAuth();
    }
}

/**
 * Request password reset code
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>('/api/auth/request-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

/**
 * Verify reset code (without resetting password)
 */
export async function verifyResetCode(
    email: string,
    code: string
): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>('/api/auth/verify-reset-code', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
    });
}

/**
 * Reset password with verification code
 */
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

/**
 * Profile update input
 */
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

/**
 * Profile response
 */
export interface ProfileResponse {
    success: boolean;
    message?: string;
    profile?: User;
}

/**
 * Get current user's profile
 */
export async function getProfile(): Promise<ProfileResponse> {
    const response = await apiRequest<ProfileResponse>('/api/profile', {
        method: 'GET',
    });
    
    if (response.success && response.profile) {
        storeUser(response.profile);
    }
    
    return response;
}

/**
 * Update user profile
 */
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

/**
 * Upload avatar response
 */
export interface AvatarUploadResponse {
    success: boolean;
    message?: string;
    avatarUrl?: string;
}

/**
 * Upload user avatar
 */
export async function uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const accessToken = getAccessToken();
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch(`${API_BASE_URL}/api/profile/avatar`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Failed to upload avatar');
    }
    
    // Update stored user with new avatar URL
    if (data.success && data.avatarUrl) {
        const user = getStoredUser();
        if (user) {
            user.avatarUrl = data.avatarUrl;
            storeUser(user);
        }
    }
    
    return data;
}

/**
 * Delete user avatar
 */
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
