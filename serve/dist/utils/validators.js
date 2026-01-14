"use strict";
/**
 * Data Validation Schemas
 *
 * Zod schemas for validating request data.
 * Provides type-safe validation with detailed error messages.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookmarkArticleSchema = exports.articleFilterSchema = exports.eventRegistrationSchema = exports.eventFilterSchema = exports.userSearchQuerySchema = exports.markMessagesReadSchema = exports.editMessageSchema = exports.sendMessageSchema = exports.addMembersSchema = exports.updateConversationSchema = exports.createConversationSchema = exports.searchUsersSchema = exports.updateAccessibilitySettingsSchema = exports.updateUserSchema = exports.resetPasswordSchema = exports.verifyResetCodeSchema = exports.requestPasswordResetSchema = exports.updatePasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = exports.paginationSchema = exports.passwordSchema = exports.emailSchema = exports.uuidSchema = void 0;
const zod_1 = require("zod");
// =============================================================================
// Common Schemas
// =============================================================================
exports.uuidSchema = zod_1.z.string().uuid('Invalid UUID format');
exports.emailSchema = zod_1.z.string().email('Invalid email address');
exports.passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character');
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
// =============================================================================
// Auth Schemas
// =============================================================================
exports.registerSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: exports.passwordSchema,
    firstName: zod_1.z.string().min(1, 'First name is required').max(100),
    lastName: zod_1.z.string().min(1, 'Last name is required').max(100),
    phone: zod_1.z.string().max(20).optional(),
    location: zod_1.z.string().max(255).optional(),
    disabilityType: zod_1.z.enum([
        'visual',
        'hearing',
        'mobility',
        'cognitive',
        'multiple',
        'other',
        'prefer_not_to_say'
    ]).optional(),
    accessibilityNeeds: zod_1.z.string().max(1000).optional(),
    communicationPreference: zod_1.z.enum([
        'text',
        'voice',
        'video',
        'sign_language',
        'email'
    ]).optional(),
    emergencyContact: zod_1.z.string().max(255).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.updatePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: exports.passwordSchema,
}).refine(data => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
});
exports.requestPasswordResetSchema = zod_1.z.object({
    email: exports.emailSchema,
});
exports.verifyResetCodeSchema = zod_1.z.object({
    email: exports.emailSchema,
    code: zod_1.z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});
exports.resetPasswordSchema = zod_1.z.object({
    email: exports.emailSchema,
    code: zod_1.z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Verification code must contain only numbers'),
    newPassword: exports.passwordSchema,
});
// =============================================================================
// User Schemas
// =============================================================================
exports.updateUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(100).optional(),
    lastName: zod_1.z.string().min(1).max(100).optional(),
    phone: zod_1.z.string().max(20).nullable().optional(),
    location: zod_1.z.string().max(255).nullable().optional(),
    disabilityType: zod_1.z.enum([
        'visual',
        'hearing',
        'mobility',
        'cognitive',
        'multiple',
        'other',
        'prefer_not_to_say'
    ]).nullable().optional(),
    accessibilityNeeds: zod_1.z.string().max(1000).nullable().optional(),
    communicationPreference: zod_1.z.enum([
        'text',
        'voice',
        'video',
        'sign_language',
        'email'
    ]).optional(),
    emergencyContact: zod_1.z.string().max(255).nullable().optional(),
});
exports.updateAccessibilitySettingsSchema = zod_1.z.object({
    highContrast: zod_1.z.boolean().optional(),
    fontSize: zod_1.z.enum(['small', 'medium', 'large', 'extra-large']).optional(),
    reducedMotion: zod_1.z.boolean().optional(),
    screenReaderOptimized: zod_1.z.boolean().optional(),
    keyboardNavigation: zod_1.z.boolean().optional(),
    voiceCommandEnabled: zod_1.z.boolean().optional(),
});
exports.searchUsersSchema = zod_1.z.object({
    query: zod_1.z.string().min(2, 'Search query must be at least 2 characters'),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(10),
});
// =============================================================================
// Messaging Schemas
// =============================================================================
exports.createConversationSchema = zod_1.z.object({
    participantIds: zod_1.z.array(exports.uuidSchema).default([]),
    name: zod_1.z.string().max(255).optional(),
    isGroup: zod_1.z.boolean().default(false),
}).refine((data) => {
    // For groups, name is required but participants are optional
    if (data.isGroup) {
        return true; // Groups can start with no participants
    }
    // For DMs, at least one participant is required
    return data.participantIds.length >= 1;
}, {
    message: 'Direct messages require at least one participant',
    path: ['participantIds'],
});
exports.updateConversationSchema = zod_1.z.object({
    name: zod_1.z.string().max(255).optional(),
    description: zod_1.z.string().max(1000).optional(),
});
exports.addMembersSchema = zod_1.z.object({
    memberIds: zod_1.z.array(exports.uuidSchema).min(1, 'At least one member is required'),
});
exports.sendMessageSchema = zod_1.z.object({
    conversationId: exports.uuidSchema,
    content: zod_1.z.string().min(1, 'Message content is required').max(10000),
    replyToId: exports.uuidSchema.optional(),
});
exports.editMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Message content is required').max(10000),
});
exports.markMessagesReadSchema = zod_1.z.object({
    conversationId: exports.uuidSchema,
    messageIds: zod_1.z.array(exports.uuidSchema).optional(),
});
exports.userSearchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().min(2, 'Search query must be at least 2 characters'),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(10),
});
// =============================================================================
// Event Schemas
// =============================================================================
exports.eventFilterSchema = zod_1.z.object({
    category: zod_1.z.enum([
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
    type: zod_1.z.enum(['virtual', 'in_person', 'hybrid']).optional(),
    startDate: zod_1.z.coerce.date().optional(),
    endDate: zod_1.z.coerce.date().optional(),
    accessibilityFeatures: zod_1.z.array(zod_1.z.string()).optional(),
    search: zod_1.z.string().optional(),
}).merge(exports.paginationSchema);
exports.eventRegistrationSchema = zod_1.z.object({
    eventId: exports.uuidSchema,
    accommodationNotes: zod_1.z.string().max(1000).optional(),
});
// =============================================================================
// Article Schemas
// =============================================================================
exports.articleFilterSchema = zod_1.z.object({
    category: zod_1.z.enum([
        'policy',
        'technology',
        'legal',
        'medical',
        'housing',
        'digital_rights',
        'education',
        'employment'
    ]).optional(),
    region: zod_1.z.enum(['national', 'international', 'local']).optional(),
    priority: zod_1.z.enum(['high', 'medium', 'low']).optional(),
    accessibilityFeatures: zod_1.z.array(zod_1.z.string()).optional(),
    search: zod_1.z.string().optional(),
}).merge(exports.paginationSchema);
exports.bookmarkArticleSchema = zod_1.z.object({
    articleId: exports.uuidSchema,
});
//# sourceMappingURL=validators.js.map