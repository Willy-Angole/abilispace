"use strict";
/**
 * Messaging Routes
 *
 * Handles conversations, messages, groups, and user search.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messaging_service_1 = require("../services/messaging.service");
const error_handler_1 = require("../middleware/error-handler");
const auth_1 = require("../middleware/auth");
const validators_1 = require("../utils/validators");
const router = (0, express_1.Router)();
// All messaging routes require authentication
router.use(auth_1.authenticate);
// =============================================================================
// User Search
// =============================================================================
/**
 * GET /api/messaging/users/search
 * Search for users to start conversations with
 */
router.get('/users/search', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { q, limit } = validators_1.userSearchQuerySchema.parse(req.query);
    const users = await messaging_service_1.messagingService.searchUsers(req.userId, q, limit);
    res.json({
        success: true,
        data: users,
    });
}));
// =============================================================================
// Conversations
// =============================================================================
/**
 * POST /api/messaging/conversations
 * Create a new conversation (DM or group)
 */
router.post('/conversations', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const input = validators_1.createConversationSchema.parse(req.body);
    const conversation = await messaging_service_1.messagingService.createConversation(req.userId, input);
    res.status(201).json({
        success: true,
        data: conversation,
    });
}));
/**
 * GET /api/messaging/conversations
 * Get user's conversations
 */
router.get('/conversations', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor;
    const result = await messaging_service_1.messagingService.getUserConversations(req.userId, limit, cursor);
    res.json({
        success: true,
        data: result.conversations,
        nextCursor: result.nextCursor,
    });
}));
/**
 * GET /api/messaging/conversations/:id
 * Get a specific conversation
 */
router.get('/conversations/:id', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const conversationId = validators_1.uuidSchema.parse(req.params.id);
    const conversation = await messaging_service_1.messagingService.getConversation(conversationId, req.userId);
    res.json({
        success: true,
        data: conversation,
    });
}));
/**
 * PATCH /api/messaging/conversations/:id
 * Update conversation settings (name, etc.) - Admin only
 */
router.patch('/conversations/:id', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const conversationId = validators_1.uuidSchema.parse(req.params.id);
    const updates = validators_1.updateConversationSchema.parse(req.body);
    const conversation = await messaging_service_1.messagingService.updateConversation(conversationId, req.userId, updates);
    res.json({
        success: true,
        data: conversation,
    });
}));
// =============================================================================
// Group Member Management
// =============================================================================
/**
 * POST /api/messaging/conversations/:id/members
 * Add members to a group conversation - Admin only
 */
router.post('/conversations/:id/members', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const conversationId = validators_1.uuidSchema.parse(req.params.id);
    const { memberIds } = validators_1.addMembersSchema.parse(req.body);
    const conversation = await messaging_service_1.messagingService.addMembers(conversationId, req.userId, memberIds);
    res.json({
        success: true,
        data: conversation,
    });
}));
/**
 * DELETE /api/messaging/conversations/:id/members/:memberId
 * Remove a member from group conversation - Admin only (or self)
 */
router.delete('/conversations/:id/members/:memberId', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const conversationId = validators_1.uuidSchema.parse(req.params.id);
    const memberId = validators_1.uuidSchema.parse(req.params.memberId);
    const conversation = await messaging_service_1.messagingService.removeMember(conversationId, req.userId, memberId);
    res.json({
        success: true,
        data: conversation,
    });
}));
/**
 * POST /api/messaging/conversations/:id/leave
 * Leave a conversation
 */
router.post('/conversations/:id/leave', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const conversationId = validators_1.uuidSchema.parse(req.params.id);
    await messaging_service_1.messagingService.leaveConversation(conversationId, req.userId);
    res.json({
        success: true,
        message: 'Successfully left the conversation',
    });
}));
/**
 * POST /api/messaging/conversations/:id/admin/:memberId
 * Make a member an admin - Admin only
 */
router.post('/conversations/:id/admin/:memberId', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const conversationId = validators_1.uuidSchema.parse(req.params.id);
    const memberId = validators_1.uuidSchema.parse(req.params.memberId);
    const conversation = await messaging_service_1.messagingService.makeAdmin(conversationId, req.userId, memberId);
    res.json({
        success: true,
        data: conversation,
    });
}));
// =============================================================================
// Messages
// =============================================================================
/**
 * POST /api/messaging/messages
 * Send a message
 */
router.post('/messages', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const input = validators_1.sendMessageSchema.parse(req.body);
    const message = await messaging_service_1.messagingService.sendMessage(req.userId, input);
    res.status(201).json({
        success: true,
        data: message,
    });
}));
/**
 * GET /api/messaging/conversations/:id/messages
 * Get messages in a conversation with pagination
 */
router.get('/conversations/:id/messages', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const conversationId = validators_1.uuidSchema.parse(req.params.id);
    const limit = parseInt(req.query.limit) || 50;
    const cursor = req.query.cursor;
    const direction = req.query.direction || 'older';
    const result = await messaging_service_1.messagingService.getMessages(conversationId, req.userId, limit, cursor, direction);
    res.json({
        success: true,
        data: result.messages,
        nextCursor: result.nextCursor,
    });
}));
/**
 * PATCH /api/messaging/messages/:id
 * Edit a message - Owner only
 */
router.patch('/messages/:id', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const messageId = validators_1.uuidSchema.parse(req.params.id);
    const { content } = validators_1.editMessageSchema.parse(req.body);
    const message = await messaging_service_1.messagingService.editMessage(messageId, req.userId, content);
    res.json({
        success: true,
        data: message,
    });
}));
/**
 * DELETE /api/messaging/messages/:id
 * Delete a message - Owner only
 */
router.delete('/messages/:id', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const messageId = validators_1.uuidSchema.parse(req.params.id);
    await messaging_service_1.messagingService.deleteMessage(messageId, req.userId);
    res.json({
        success: true,
        message: 'Message deleted',
    });
}));
// =============================================================================
// Read Receipts
// =============================================================================
/**
 * POST /api/messaging/conversations/:id/read
 * Mark messages as read
 */
router.post('/conversations/:id/read', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const conversationId = validators_1.uuidSchema.parse(req.params.id);
    const messageIds = req.body.messageIds;
    const count = await messaging_service_1.messagingService.markMessagesAsRead(conversationId, req.userId, messageIds);
    res.json({
        success: true,
        markedCount: count,
    });
}));
/**
 * GET /api/messaging/unread-counts
 * Get unread message counts for all conversations
 */
router.get('/unread-counts', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const result = await messaging_service_1.messagingService.getUnreadCounts(req.userId);
    res.json({
        success: true,
        data: result,
    });
}));
exports.default = router;
//# sourceMappingURL=messaging.routes.js.map