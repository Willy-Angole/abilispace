/**
 * Data Validation Schemas
 * 
 * Zod schemas for validating request data.
 * Provides type-safe validation with detailed error messages.
 */

import { z } from 'zod';

// =============================================================================
// Common Schemas
// =============================================================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character');

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// =============================================================================
// Auth Schemas
// =============================================================================

export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    phone: z.string().max(20).optional(),
    location: z.string().max(255).optional(),
    disabilityType: z.enum([
        'visual',
        'hearing',
        'mobility',
        'cognitive',
        'multiple',
        'other',
        'prefer_not_to_say'
    ]).optional(),
    accessibilityNeeds: z.string().max(1000).optional(),
    communicationPreference: z.enum([
        'text',
        'voice',
        'video',
        'sign_language',
        'email'
    ]).optional(),
    emergencyContact: z.string().max(255).optional(),
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
}).refine(data => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
});

export const requestPasswordResetSchema = z.object({
    email: emailSchema,
});

export const verifyResetCodeSchema = z.object({
    email: emailSchema,
    code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});

export const resetPasswordSchema = z.object({
    email: emailSchema,
    code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Verification code must contain only numbers'),
    newPassword: passwordSchema,
});

// =============================================================================
// User Schemas
// =============================================================================

export const updateUserSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().max(20).nullable().optional(),
    location: z.string().max(255).nullable().optional(),
    disabilityType: z.enum([
        'visual',
        'hearing',
        'mobility',
        'cognitive',
        'multiple',
        'other',
        'prefer_not_to_say'
    ]).nullable().optional(),
    accessibilityNeeds: z.string().max(1000).nullable().optional(),
    communicationPreference: z.enum([
        'text',
        'voice',
        'video',
        'sign_language',
        'email'
    ]).optional(),
    emergencyContact: z.string().max(255).nullable().optional(),
});

export const updateAccessibilitySettingsSchema = z.object({
    highContrast: z.boolean().optional(),
    fontSize: z.enum(['small', 'medium', 'large', 'extra-large']).optional(),
    reducedMotion: z.boolean().optional(),
    screenReaderOptimized: z.boolean().optional(),
    keyboardNavigation: z.boolean().optional(),
    voiceCommandEnabled: z.boolean().optional(),
});

export const searchUsersSchema = z.object({
    query: z.string().min(2, 'Search query must be at least 2 characters'),
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

// =============================================================================
// Messaging Schemas
// =============================================================================

export const createConversationSchema = z.object({
    participantIds: z.array(uuidSchema).default([]),
    name: z.string().max(255).optional(),
    isGroup: z.boolean().default(false),
}).refine(
    (data) => {
        // For groups, name is required but participants are optional
        if (data.isGroup) {
            return true; // Groups can start with no participants
        }
        // For DMs, at least one participant is required
        return data.participantIds.length >= 1;
    },
    {
        message: 'Direct messages require at least one participant',
        path: ['participantIds'],
    }
);

export const updateConversationSchema = z.object({
    name: z.string().max(255).optional(),
    description: z.string().max(1000).optional(),
});

export const addMembersSchema = z.object({
    memberIds: z.array(uuidSchema).min(1, 'At least one member is required'),
});

export const sendMessageSchema = z.object({
    conversationId: uuidSchema,
    content: z.string().min(1, 'Message content is required').max(10000),
    replyToId: uuidSchema.optional(),
});

export const editMessageSchema = z.object({
    content: z.string().min(1, 'Message content is required').max(10000),
});

export const markMessagesReadSchema = z.object({
    conversationId: uuidSchema,
    messageIds: z.array(uuidSchema).optional(),
});

export const userSearchQuerySchema = z.object({
    q: z.string().min(2, 'Search query must be at least 2 characters'),
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

// =============================================================================
// Event Schemas
// =============================================================================

export const eventFilterSchema = z.object({
    category: z.enum([
        'technology',
        'advocacy',
        'sports',
        'health',
        'arts',
        'education',
        'social',
        'employment',
        'legal'
    ]).optional(),
    type: z.enum(['virtual', 'in_person', 'hybrid']).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    accessibilityFeatures: z.array(z.string()).optional(),
    search: z.string().optional(),
}).merge(paginationSchema);

export const eventRegistrationSchema = z.object({
    eventId: uuidSchema,
    accommodationNotes: z.string().max(1000).optional(),
});

// =============================================================================
// Article Schemas
// =============================================================================

export const articleFilterSchema = z.object({
    category: z.enum([
        'policy',
        'technology',
        'legal',
        'medical',
        'housing',
        'digital_rights',
        'education',
        'employment'
    ]).optional(),
    region: z.enum(['national', 'international', 'local']).optional(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    accessibilityFeatures: z.array(z.string()).optional(),
    search: z.string().optional(),
}).merge(paginationSchema);

export const bookmarkArticleSchema = z.object({
    articleId: uuidSchema,
});

// =============================================================================
// Type Exports
// =============================================================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateAccessibilitySettingsInput = z.infer<typeof updateAccessibilitySettingsSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type AddMembersInput = z.infer<typeof addMembersSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type UserSearchQueryInput = z.infer<typeof userSearchQuerySchema>;
export type EventFilterInput = z.infer<typeof eventFilterSchema>;
export type EventRegistrationInput = z.infer<typeof eventRegistrationSchema>;
export type ArticleFilterInput = z.infer<typeof articleFilterSchema>;
