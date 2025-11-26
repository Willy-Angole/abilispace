/**
 * Messaging Routes
 * 
 * Handles conversations, messages, groups, and user search.
 */

import { Router, Response, IRouter } from 'express';
import { messagingService } from '../services/messaging.service';
import { asyncHandler } from '../middleware/error-handler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import {
    createConversationSchema,
    updateConversationSchema,
    addMembersSchema,
    sendMessageSchema,
    editMessageSchema,
    userSearchQuerySchema,
    uuidSchema,
} from '../utils/validators';

const router: IRouter = Router();

// All messaging routes require authentication
router.use(authenticate);

// =============================================================================
// User Search
// =============================================================================

/**
 * GET /api/messaging/users/search
 * Search for users to start conversations with
 */
router.get(
    '/users/search',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { q, limit } = userSearchQuerySchema.parse(req.query);
        const users = await messagingService.searchUsers(req.userId!, q, limit);

        res.json({
            success: true,
            data: users,
        });
    })
);

// =============================================================================
// Conversations
// =============================================================================

/**
 * POST /api/messaging/conversations
 * Create a new conversation (DM or group)
 */
router.post(
    '/conversations',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const input = createConversationSchema.parse(req.body);
        const conversation = await messagingService.createConversation(req.userId!, input);

        res.status(201).json({
            success: true,
            data: conversation,
        });
    })
);

/**
 * GET /api/messaging/conversations
 * Get user's conversations
 */
router.get(
    '/conversations',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const limit = parseInt(req.query.limit as string) || 20;
        const cursor = req.query.cursor as string | undefined;

        const result = await messagingService.getUserConversations(
            req.userId!,
            limit,
            cursor
        );

        res.json({
            success: true,
            data: result.conversations,
            nextCursor: result.nextCursor,
        });
    })
);

/**
 * GET /api/messaging/conversations/:id
 * Get a specific conversation
 */
router.get(
    '/conversations/:id',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const conversationId = uuidSchema.parse(req.params.id);
        const conversation = await messagingService.getConversation(
            conversationId,
            req.userId!
        );

        res.json({
            success: true,
            data: conversation,
        });
    })
);

/**
 * PATCH /api/messaging/conversations/:id
 * Update conversation settings (name, etc.) - Admin only
 */
router.patch(
    '/conversations/:id',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const conversationId = uuidSchema.parse(req.params.id);
        const updates = updateConversationSchema.parse(req.body);
        const conversation = await messagingService.updateConversation(
            conversationId,
            req.userId!,
            updates
        );

        res.json({
            success: true,
            data: conversation,
        });
    })
);

// =============================================================================
// Group Member Management
// =============================================================================

/**
 * POST /api/messaging/conversations/:id/members
 * Add members to a group conversation - Admin only
 */
router.post(
    '/conversations/:id/members',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const conversationId = uuidSchema.parse(req.params.id);
        const { memberIds } = addMembersSchema.parse(req.body);
        const conversation = await messagingService.addMembers(
            conversationId,
            req.userId!,
            memberIds
        );

        res.json({
            success: true,
            data: conversation,
        });
    })
);

/**
 * DELETE /api/messaging/conversations/:id/members/:memberId
 * Remove a member from group conversation - Admin only (or self)
 */
router.delete(
    '/conversations/:id/members/:memberId',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const conversationId = uuidSchema.parse(req.params.id);
        const memberId = uuidSchema.parse(req.params.memberId);
        const conversation = await messagingService.removeMember(
            conversationId,
            req.userId!,
            memberId
        );

        res.json({
            success: true,
            data: conversation,
        });
    })
);

/**
 * POST /api/messaging/conversations/:id/leave
 * Leave a conversation
 */
router.post(
    '/conversations/:id/leave',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const conversationId = uuidSchema.parse(req.params.id);
        await messagingService.leaveConversation(conversationId, req.userId!);

        res.json({
            success: true,
            message: 'Successfully left the conversation',
        });
    })
);

/**
 * POST /api/messaging/conversations/:id/admin/:memberId
 * Make a member an admin - Admin only
 */
router.post(
    '/conversations/:id/admin/:memberId',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const conversationId = uuidSchema.parse(req.params.id);
        const memberId = uuidSchema.parse(req.params.memberId);
        const conversation = await messagingService.makeAdmin(
            conversationId,
            req.userId!,
            memberId
        );

        res.json({
            success: true,
            data: conversation,
        });
    })
);

// =============================================================================
// Messages
// =============================================================================

/**
 * POST /api/messaging/messages
 * Send a message
 */
router.post(
    '/messages',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const input = sendMessageSchema.parse(req.body);
        const message = await messagingService.sendMessage(req.userId!, input);

        res.status(201).json({
            success: true,
            data: message,
        });
    })
);

/**
 * GET /api/messaging/conversations/:id/messages
 * Get messages in a conversation with pagination
 */
router.get(
    '/conversations/:id/messages',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const conversationId = uuidSchema.parse(req.params.id);
        const limit = parseInt(req.query.limit as string) || 50;
        const cursor = req.query.cursor as string | undefined;
        const direction = (req.query.direction as 'older' | 'newer') || 'older';

        const result = await messagingService.getMessages(
            conversationId,
            req.userId!,
            limit,
            cursor,
            direction
        );

        res.json({
            success: true,
            data: result.messages,
            nextCursor: result.nextCursor,
        });
    })
);

/**
 * PATCH /api/messaging/messages/:id
 * Edit a message - Owner only
 */
router.patch(
    '/messages/:id',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const messageId = uuidSchema.parse(req.params.id);
        const { content } = editMessageSchema.parse(req.body);
        const message = await messagingService.editMessage(messageId, req.userId!, content);

        res.json({
            success: true,
            data: message,
        });
    })
);

/**
 * DELETE /api/messaging/messages/:id
 * Delete a message - Owner only
 */
router.delete(
    '/messages/:id',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const messageId = uuidSchema.parse(req.params.id);
        await messagingService.deleteMessage(messageId, req.userId!);

        res.json({
            success: true,
            message: 'Message deleted',
        });
    })
);

// =============================================================================
// Read Receipts
// =============================================================================

/**
 * POST /api/messaging/conversations/:id/read
 * Mark messages as read
 */
router.post(
    '/conversations/:id/read',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const conversationId = uuidSchema.parse(req.params.id);
        const messageIds = req.body.messageIds as string[] | undefined;

        const count = await messagingService.markMessagesAsRead(
            conversationId,
            req.userId!,
            messageIds
        );

        res.json({
            success: true,
            markedCount: count,
        });
    })
);

/**
 * GET /api/messaging/unread-counts
 * Get unread message counts for all conversations
 */
router.get(
    '/unread-counts',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const result = await messagingService.getUnreadCounts(req.userId!);

        res.json({
            success: true,
            data: result,
        });
    })
);

export default router;
