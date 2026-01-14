/**
 * Data Validation Schemas
 *
 * Zod schemas for validating request data.
 * Provides type-safe validation with detailed error messages.
 */
import { z } from 'zod';
export declare const uuidSchema: z.ZodString;
export declare const emailSchema: z.ZodString;
export declare const passwordSchema: z.ZodString;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    disabilityType: z.ZodOptional<z.ZodEnum<["visual", "hearing", "mobility", "cognitive", "multiple", "other", "prefer_not_to_say"]>>;
    accessibilityNeeds: z.ZodOptional<z.ZodString>;
    communicationPreference: z.ZodOptional<z.ZodEnum<["text", "voice", "video", "sign_language", "email"]>>;
    emergencyContact: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string | undefined;
    location?: string | undefined;
    disabilityType?: "visual" | "hearing" | "mobility" | "cognitive" | "multiple" | "other" | "prefer_not_to_say" | undefined;
    accessibilityNeeds?: string | undefined;
    communicationPreference?: "email" | "text" | "voice" | "video" | "sign_language" | undefined;
    emergencyContact?: string | undefined;
}, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string | undefined;
    location?: string | undefined;
    disabilityType?: "visual" | "hearing" | "mobility" | "cognitive" | "multiple" | "other" | "prefer_not_to_say" | undefined;
    accessibilityNeeds?: string | undefined;
    communicationPreference?: "email" | "text" | "voice" | "video" | "sign_language" | undefined;
    emergencyContact?: string | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const updatePasswordSchema: z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
}>, {
    currentPassword: string;
    newPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
}>;
export declare const requestPasswordResetSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const verifyResetCodeSchema: z.ZodObject<{
    email: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    email: string;
}, {
    code: string;
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    email: z.ZodString;
    code: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    email: string;
    newPassword: string;
}, {
    code: string;
    email: string;
    newPassword: string;
}>;
export declare const updateUserSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    disabilityType: z.ZodOptional<z.ZodNullable<z.ZodEnum<["visual", "hearing", "mobility", "cognitive", "multiple", "other", "prefer_not_to_say"]>>>;
    accessibilityNeeds: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    communicationPreference: z.ZodOptional<z.ZodEnum<["text", "voice", "video", "sign_language", "email"]>>;
    emergencyContact: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | null | undefined;
    location?: string | null | undefined;
    disabilityType?: "visual" | "hearing" | "mobility" | "cognitive" | "multiple" | "other" | "prefer_not_to_say" | null | undefined;
    accessibilityNeeds?: string | null | undefined;
    communicationPreference?: "email" | "text" | "voice" | "video" | "sign_language" | undefined;
    emergencyContact?: string | null | undefined;
}, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | null | undefined;
    location?: string | null | undefined;
    disabilityType?: "visual" | "hearing" | "mobility" | "cognitive" | "multiple" | "other" | "prefer_not_to_say" | null | undefined;
    accessibilityNeeds?: string | null | undefined;
    communicationPreference?: "email" | "text" | "voice" | "video" | "sign_language" | undefined;
    emergencyContact?: string | null | undefined;
}>;
export declare const updateAccessibilitySettingsSchema: z.ZodObject<{
    highContrast: z.ZodOptional<z.ZodBoolean>;
    fontSize: z.ZodOptional<z.ZodEnum<["small", "medium", "large", "extra-large"]>>;
    reducedMotion: z.ZodOptional<z.ZodBoolean>;
    screenReaderOptimized: z.ZodOptional<z.ZodBoolean>;
    keyboardNavigation: z.ZodOptional<z.ZodBoolean>;
    voiceCommandEnabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    highContrast?: boolean | undefined;
    fontSize?: "small" | "medium" | "large" | "extra-large" | undefined;
    reducedMotion?: boolean | undefined;
    screenReaderOptimized?: boolean | undefined;
    keyboardNavigation?: boolean | undefined;
    voiceCommandEnabled?: boolean | undefined;
}, {
    highContrast?: boolean | undefined;
    fontSize?: "small" | "medium" | "large" | "extra-large" | undefined;
    reducedMotion?: boolean | undefined;
    screenReaderOptimized?: boolean | undefined;
    keyboardNavigation?: boolean | undefined;
    voiceCommandEnabled?: boolean | undefined;
}>;
export declare const searchUsersSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    query: string;
}, {
    query: string;
    limit?: number | undefined;
}>;
export declare const createConversationSchema: z.ZodEffects<z.ZodObject<{
    participantIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    name: z.ZodOptional<z.ZodString>;
    isGroup: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    participantIds: string[];
    isGroup: boolean;
    name?: string | undefined;
}, {
    participantIds?: string[] | undefined;
    name?: string | undefined;
    isGroup?: boolean | undefined;
}>, {
    participantIds: string[];
    isGroup: boolean;
    name?: string | undefined;
}, {
    participantIds?: string[] | undefined;
    name?: string | undefined;
    isGroup?: boolean | undefined;
}>;
export declare const updateConversationSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
}>;
export declare const addMembersSchema: z.ZodObject<{
    memberIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    memberIds: string[];
}, {
    memberIds: string[];
}>;
export declare const sendMessageSchema: z.ZodObject<{
    conversationId: z.ZodString;
    content: z.ZodString;
    replyToId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    conversationId: string;
    content: string;
    replyToId?: string | undefined;
}, {
    conversationId: string;
    content: string;
    replyToId?: string | undefined;
}>;
export declare const editMessageSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export declare const markMessagesReadSchema: z.ZodObject<{
    conversationId: z.ZodString;
    messageIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    conversationId: string;
    messageIds?: string[] | undefined;
}, {
    conversationId: string;
    messageIds?: string[] | undefined;
}>;
export declare const userSearchQuerySchema: z.ZodObject<{
    q: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    q: string;
}, {
    q: string;
    limit?: number | undefined;
}>;
export declare const eventFilterSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodEnum<["technology", "advocacy", "sports", "health", "arts", "education", "social", "employment", "legal"]>>;
    type: z.ZodOptional<z.ZodEnum<["virtual", "in_person", "hybrid"]>>;
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodDate>;
    accessibilityFeatures: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    search: z.ZodOptional<z.ZodString>;
} & {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    type?: "virtual" | "in_person" | "hybrid" | undefined;
    category?: "technology" | "advocacy" | "sports" | "health" | "arts" | "education" | "social" | "employment" | "legal" | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    accessibilityFeatures?: string[] | undefined;
    search?: string | undefined;
}, {
    type?: "virtual" | "in_person" | "hybrid" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    category?: "technology" | "advocacy" | "sports" | "health" | "arts" | "education" | "social" | "employment" | "legal" | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    accessibilityFeatures?: string[] | undefined;
    search?: string | undefined;
}>;
export declare const eventRegistrationSchema: z.ZodObject<{
    eventId: z.ZodString;
    accommodationNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    eventId: string;
    accommodationNotes?: string | undefined;
}, {
    eventId: string;
    accommodationNotes?: string | undefined;
}>;
export declare const articleFilterSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodEnum<["policy", "technology", "legal", "medical", "housing", "digital_rights", "education", "employment"]>>;
    region: z.ZodOptional<z.ZodEnum<["national", "international", "local"]>>;
    priority: z.ZodOptional<z.ZodEnum<["high", "medium", "low"]>>;
    accessibilityFeatures: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    search: z.ZodOptional<z.ZodString>;
} & {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    category?: "technology" | "education" | "employment" | "legal" | "policy" | "medical" | "housing" | "digital_rights" | undefined;
    accessibilityFeatures?: string[] | undefined;
    search?: string | undefined;
    region?: "national" | "international" | "local" | undefined;
    priority?: "medium" | "high" | "low" | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    category?: "technology" | "education" | "employment" | "legal" | "policy" | "medical" | "housing" | "digital_rights" | undefined;
    accessibilityFeatures?: string[] | undefined;
    search?: string | undefined;
    region?: "national" | "international" | "local" | undefined;
    priority?: "medium" | "high" | "low" | undefined;
}>;
export declare const bookmarkArticleSchema: z.ZodObject<{
    articleId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    articleId: string;
}, {
    articleId: string;
}>;
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
//# sourceMappingURL=validators.d.ts.map