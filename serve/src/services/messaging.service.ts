/**
 * Messaging Service
 * 
 * Handles secure messaging, conversations, and real-time features.
 * Implements efficient message retrieval using cursor-based pagination.
 * 
 * @author Shiriki Team
 * @version 2.0.0
 */

import { db } from '../database/pool';
import { logger } from '../utils/logger';
import { Errors } from '../middleware/error-handler';
import { CreateConversationInput, SendMessageInput } from '../utils/validators';

/**
 * Message entity interface
 */
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    senderAvatarUrl?: string;
    content: string;
    messageType: 'text' | 'system' | 'notification';
    replyToId?: string;
    replyTo?: {
        id: string;
        content: string;
        senderName: string;
    };
    isEdited: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Conversation entity interface
 */
export interface Conversation {
    id: string;
    name?: string;
    description?: string;
    isGroup: boolean;
    createdBy: string;
    creatorName?: string;
    createdAt: Date;
    updatedAt: Date;
    adminOnlyMessages?: boolean;
    participants: ConversationParticipant[];
    lastMessage?: Message;
    unreadCount: number;
}

/**
 * Participant interface
 */
export interface ConversationParticipant {
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    joinedAt: Date;
    isAdmin: boolean;
    lastReadAt?: Date;
}

/**
 * User search result
 */
export interface UserSearchResult {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    location?: string;
}

/**
 * Unread count per conversation
 */
export interface UnreadCount {
    conversationId: string;
    count: number;
}

/**
 * LRU Cache for frequently accessed conversations
 */
class LRUCache<K, V> {
    private capacity: number;
    private cache: Map<K, V>;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key: K): V | undefined {
        if (!this.cache.has(key)) return undefined;
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    put(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }

    delete(key: K): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }
}

/**
 * MessagingService - Comprehensive messaging operations
 */
export class MessagingService {
    private participantCache = new LRUCache<string, Set<string>>(100);

    /**
     * Search users for starting conversations
     */
    async searchUsers(
        userId: string,
        query: string,
        limit: number = 10
    ): Promise<UserSearchResult[]> {
        const result = await db.query<UserSearchResult>(
            `SELECT id, first_name as "firstName", last_name as "lastName", 
                    email, avatar_url as "avatarUrl", location
             FROM users
             WHERE id != $1 
               AND deleted_at IS NULL 
               AND is_active = true
               AND (
                   first_name ILIKE $2 OR 
                   last_name ILIKE $2 OR 
                   email ILIKE $2 OR
                   CONCAT(first_name, ' ', last_name) ILIKE $2
               )
             ORDER BY first_name, last_name
             LIMIT $3`,
            { values: [userId, `%${query}%`, limit] }
        );

        return result.rows;
    }

    /**
     * Create a new conversation (DM or group)
     */
    async createConversation(
        creatorId: string,
        input: CreateConversationInput
    ): Promise<Conversation> {
        const { participantIds, name, isGroup } = input;
        const allParticipants = new Set([creatorId, ...participantIds]);

        // Validate all participants exist (at minimum, the creator)
        const validationResult = await db.query<{ id: string }>(
            `SELECT id FROM users 
             WHERE id = ANY($1) AND deleted_at IS NULL AND is_active = true`,
            { values: [Array.from(allParticipants)] }
        );

        if (validationResult.rowCount !== allParticipants.size) {
            throw Errors.badRequest('One or more participants do not exist or are inactive');
        }

        // For 1:1 conversations, check if one already exists
        if (!isGroup && allParticipants.size === 2) {
            const existingConversation = await this.findExisting1to1Conversation(
                Array.from(allParticipants)
            );
            if (existingConversation) {
                return existingConversation;
            }
        }

        // For groups, require a name
        if (isGroup && !name?.trim()) {
            throw Errors.badRequest('Group name is required');
        }

        // Create conversation in transaction
        const conversation = await db.transaction(async (client) => {
            const convResult = await client.query<{
                id: string;
                name: string | null;
                is_group: boolean;
                created_by: string;
                created_at: Date;
                updated_at: Date;
            }>(
                `INSERT INTO conversations (name, is_group, created_by)
                 VALUES ($1, $2, $3)
                 RETURNING id, name, is_group, created_by, created_at, updated_at`,
                [name || null, isGroup, creatorId]
            );

            const conv = convResult.rows[0];

            // Add all participants (creator is admin)
            for (const participantId of allParticipants) {
                await client.query(
                    `INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
                     VALUES ($1, $2, $3)`,
                    [conv.id, participantId, participantId === creatorId]
                );
            }

            // Add system message
            const systemMessage = isGroup 
                ? `Group "${name || 'New Group'}" created`
                : 'Conversation started';

            await client.query(
                `INSERT INTO messages (conversation_id, sender_id, content, message_type)
                 VALUES ($1, $2, $3, 'system')`,
                [conv.id, creatorId, systemMessage]
            );

            return conv;
        });

        // Invalidate cache
        for (const participantId of allParticipants) {
            this.participantCache.delete(participantId);
        }

        logger.info('Conversation created', { 
            conversationId: conversation.id, 
            creatorId,
            isGroup,
            participantCount: allParticipants.size 
        });

        return this.getConversation(conversation.id, creatorId);
    }

    /**
     * Update group conversation (name, etc.)
     */
    async updateConversation(
        conversationId: string,
        userId: string,
        updates: { name?: string; description?: string }
    ): Promise<Conversation> {
        // Verify user is admin
        await this.verifyAdmin(conversationId, userId);

        const setClauses: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (updates.name !== undefined) {
            setClauses.push(`name = $${paramIndex++}`);
            values.push(updates.name);
        }

        if (setClauses.length === 0) {
            return this.getConversation(conversationId, userId);
        }

        values.push(conversationId);

        await db.query(
            `UPDATE conversations 
             SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramIndex}`,
            { values }
        );

        // Add system message
        await db.query(
            `INSERT INTO messages (conversation_id, sender_id, content, message_type)
             VALUES ($1, $2, $3, 'system')`,
            { values: [conversationId, userId, 'Group settings updated'] }
        );

        logger.info('Conversation updated', { conversationId, userId });

        return this.getConversation(conversationId, userId);
    }

    /**
     * Add members to a group conversation
     */
    async addMembers(
        conversationId: string,
        userId: string,
        memberIds: string[]
    ): Promise<Conversation> {
        // Verify user is admin
        await this.verifyAdmin(conversationId, userId);

        // Verify conversation is a group
        const convResult = await db.query<{ is_group: boolean }>(
            `SELECT is_group FROM conversations WHERE id = $1`,
            { values: [conversationId] }
        );

        if (convResult.rowCount === 0 || !convResult.rows[0].is_group) {
            throw Errors.badRequest('Can only add members to group conversations');
        }

        // Validate new members exist
        const validationResult = await db.query<{ id: string; first_name: string; last_name: string }>(
            `SELECT id, first_name, last_name FROM users 
             WHERE id = ANY($1) AND deleted_at IS NULL AND is_active = true`,
            { values: [memberIds] }
        );

        if (validationResult.rowCount !== memberIds.length) {
            throw Errors.badRequest('One or more users do not exist or are inactive');
        }

        // Add members
        const addedNames: string[] = [];
        for (const memberId of memberIds) {
            try {
                await db.query(
                    `INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
                     VALUES ($1, $2, false)
                     ON CONFLICT (conversation_id, user_id) 
                     DO UPDATE SET left_at = NULL, joined_at = CURRENT_TIMESTAMP`,
                    { values: [conversationId, memberId] }
                );
                const member = validationResult.rows.find(m => m.id === memberId);
                if (member) {
                    addedNames.push(`${member.first_name} ${member.last_name}`);
                }
            } catch (error) {
                logger.error('Failed to add member', { conversationId, memberId, error });
            }
        }

        // Clear cache
        this.participantCache.delete(conversationId);

        // Add system message
        if (addedNames.length > 0) {
            await db.query(
                `INSERT INTO messages (conversation_id, sender_id, content, message_type)
                 VALUES ($1, $2, $3, 'system')`,
                { values: [conversationId, userId, `${addedNames.join(', ')} joined the group`] }
            );
        }

        logger.info('Members added to conversation', { conversationId, memberIds });

        return this.getConversation(conversationId, userId);
    }

    /**
     * Remove a member from group conversation
     */
    async removeMember(
        conversationId: string,
        userId: string,
        memberIdToRemove: string
    ): Promise<Conversation> {
        // Verify user is admin (or removing themselves)
        if (userId !== memberIdToRemove) {
            await this.verifyAdmin(conversationId, userId);
        }

        // Get member name for system message
        const memberResult = await db.query<{ first_name: string; last_name: string }>(
            `SELECT first_name, last_name FROM users WHERE id = $1`,
            { values: [memberIdToRemove] }
        );

        // Remove member (soft delete by setting left_at)
        await db.query(
            `UPDATE conversation_participants 
             SET left_at = CURRENT_TIMESTAMP
             WHERE conversation_id = $1 AND user_id = $2`,
            { values: [conversationId, memberIdToRemove] }
        );

        // Clear cache
        this.participantCache.delete(conversationId);

        // Add system message
        if (memberResult.rows[0]) {
            const memberName = `${memberResult.rows[0].first_name} ${memberResult.rows[0].last_name}`;
            const message = userId === memberIdToRemove 
                ? `${memberName} left the group`
                : `${memberName} was removed from the group`;

            await db.query(
                `INSERT INTO messages (conversation_id, sender_id, content, message_type)
                 VALUES ($1, $2, $3, 'system')`,
                { values: [conversationId, userId, message] }
            );
        }

        logger.info('Member removed from conversation', { conversationId, memberIdToRemove });

        return this.getConversation(conversationId, userId);
    }

    /**
     * Leave a conversation
     */
    async leaveConversation(conversationId: string, userId: string): Promise<void> {
        await this.removeMember(conversationId, userId, userId);
    }

    /**
     * Make a member admin
     */
    async makeAdmin(
        conversationId: string,
        userId: string,
        targetUserId: string
    ): Promise<Conversation> {
        await this.verifyAdmin(conversationId, userId);

        await db.query(
            `UPDATE conversation_participants 
             SET is_admin = true
             WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
            { values: [conversationId, targetUserId] }
        );

        // Clear cache
        this.participantCache.delete(conversationId);

        // Get target user name
        const userResult = await db.query<{ first_name: string; last_name: string }>(
            `SELECT first_name, last_name FROM users WHERE id = $1`,
            { values: [targetUserId] }
        );

        if (userResult.rows[0]) {
            await db.query(
                `INSERT INTO messages (conversation_id, sender_id, content, message_type)
                 VALUES ($1, $2, $3, 'system')`,
                { values: [conversationId, userId, `${userResult.rows[0].first_name} ${userResult.rows[0].last_name} is now an admin`] }
            );
        }

        return this.getConversation(conversationId, userId);
    }

    /**
     * Revoke admin rights from a member
     */
    async revokeAdmin(
        conversationId: string,
        userId: string,
        targetUserId: string
    ): Promise<Conversation> {
        await this.verifyAdmin(conversationId, userId);

        // Cannot revoke own admin rights (they should leave instead)
        if (userId === targetUserId) {
            throw Errors.badRequest('Cannot revoke your own admin rights');
        }

        // Check if target is currently an admin
        const targetResult = await db.query<{ is_admin: boolean }>(
            `SELECT is_admin FROM conversation_participants 
             WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
            { values: [conversationId, targetUserId] }
        );

        if (targetResult.rowCount === 0) {
            throw Errors.notFound('Member not found in conversation');
        }

        if (!targetResult.rows[0].is_admin) {
            throw Errors.badRequest('This member is not an admin');
        }

        // Revoke admin rights
        await db.query(
            `UPDATE conversation_participants 
             SET is_admin = false
             WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
            { values: [conversationId, targetUserId] }
        );

        // Clear cache
        this.participantCache.delete(conversationId);

        // Get target user name for system message
        const userResult = await db.query<{ first_name: string; last_name: string }>(
            `SELECT first_name, last_name FROM users WHERE id = $1`,
            { values: [targetUserId] }
        );

        if (userResult.rows[0]) {
            await db.query(
                `INSERT INTO messages (conversation_id, sender_id, content, message_type)
                 VALUES ($1, $2, $3, 'system')`,
                { values: [conversationId, userId, `${userResult.rows[0].first_name} ${userResult.rows[0].last_name} is no longer an admin`] }
            );
        }

        logger.info('Admin rights revoked', { conversationId, targetUserId, revokedBy: userId });

        return this.getConversation(conversationId, userId);
    }

    /**
     * Set admin-only messaging mode for a conversation
     */
    async setAdminOnlyMessaging(
        conversationId: string,
        userId: string,
        adminOnly: boolean
    ): Promise<Conversation> {
        await this.verifyAdmin(conversationId, userId);

        // Update the conversation setting (handle missing column)
        try {
            await db.query(
                `UPDATE conversations 
                 SET admin_only_messages = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                { values: [adminOnly, conversationId] }
            );
        } catch (error: any) {
            // If column doesn't exist, throw a user-friendly error
            if (error.message?.includes('column') || error.message?.includes('admin_only_messages')) {
                throw Errors.internal('Admin-only messaging feature is not available. Please run database migrations.');
            }
            throw error;
        }

        // Add system message
        const message = adminOnly
            ? 'Only admins can now send messages in this group'
            : 'All members can now send messages in this group';

        await db.query(
            `INSERT INTO messages (conversation_id, sender_id, content, message_type)
             VALUES ($1, $2, $3, 'system')`,
            { values: [conversationId, userId, message] }
        );

        logger.info('Admin-only messaging updated', { conversationId, adminOnly, updatedBy: userId });

        return this.getConversation(conversationId, userId);
    }

    /**
     * Find existing 1:1 conversation between two users
     */
    private async findExisting1to1Conversation(
        participantIds: string[]
    ): Promise<Conversation | null> {
        const result = await db.query<{ id: string }>(
            `SELECT c.id
             FROM conversations c
             WHERE c.is_group = false
               AND c.deleted_at IS NULL
               AND (
                   SELECT COUNT(DISTINCT cp.user_id)
                   FROM conversation_participants cp
                   WHERE cp.conversation_id = c.id
                     AND cp.left_at IS NULL
                     AND cp.user_id = ANY($1)
               ) = 2
               AND (
                   SELECT COUNT(*)
                   FROM conversation_participants cp
                   WHERE cp.conversation_id = c.id AND cp.left_at IS NULL
               ) = 2
             LIMIT 1`,
            { values: [participantIds] }
        );

        if (result.rowCount === 0) return null;

        return this.getConversation(result.rows[0].id, participantIds[0]);
    }

    /**
     * Get conversation details with participants
     */
    async getConversation(
        conversationId: string,
        userId: string
    ): Promise<Conversation> {
        await this.verifyParticipant(conversationId, userId);

        const convResult = await db.query<{
            id: string;
            name: string | null;
            is_group: boolean;
            created_by: string;
            creator_first_name: string;
            creator_last_name: string;
            created_at: Date;
            updated_at: Date;
            admin_only_messages?: boolean;
        }>(
            `SELECT c.id, c.name, c.is_group, c.created_by, c.created_at, c.updated_at,
                    u.first_name as creator_first_name, u.last_name as creator_last_name
             FROM conversations c
             LEFT JOIN users u ON u.id = c.created_by
             WHERE c.id = $1 AND c.deleted_at IS NULL`,
            { values: [conversationId] }
        );

        // Check for admin_only_messages column separately (may not exist in older schemas)
        let adminOnlyMessages = false;
        try {
            const adminOnlyResult = await db.query<{ admin_only_messages: boolean }>(
                `SELECT COALESCE(admin_only_messages, false) as admin_only_messages 
                 FROM conversations WHERE id = $1`,
                { values: [conversationId] }
            );
            if (adminOnlyResult.rows[0]) {
                adminOnlyMessages = adminOnlyResult.rows[0].admin_only_messages;
            }
        } catch {
            // Column doesn't exist yet, default to false
            adminOnlyMessages = false;
        }

        if (convResult.rowCount === 0) {
            throw Errors.notFound('Conversation');
        }

        const conv = convResult.rows[0];

        const participantsResult = await db.query<{
            user_id: string;
            first_name: string;
            last_name: string;
            avatar_url: string | null;
            joined_at: Date;
            is_admin: boolean;
            last_read_at: Date | null;
        }>(
            `SELECT cp.user_id, u.first_name, u.last_name, u.avatar_url,
                    cp.joined_at, cp.is_admin, cp.last_read_at
             FROM conversation_participants cp
             JOIN users u ON u.id = cp.user_id
             WHERE cp.conversation_id = $1 AND cp.left_at IS NULL`,
            { values: [conversationId] }
        );

        const lastMessageResult = await db.query<Message & { sender_avatar_url: string | null }>(
            `SELECT m.id, m.conversation_id as "conversationId", m.sender_id as "senderId",
                    u.first_name || ' ' || u.last_name as "senderName",
                    u.avatar_url as sender_avatar_url,
                    m.content, m.message_type as "messageType", m.reply_to_id as "replyToId",
                    m.is_edited as "isEdited", m.created_at as "createdAt"
             FROM messages m
             JOIN users u ON u.id = m.sender_id
             WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
             ORDER BY m.created_at DESC
             LIMIT 1`,
            { values: [conversationId] }
        );

        const unreadResult = await db.query<{ count: string }>(
            `SELECT COUNT(*) as count
             FROM messages m
             WHERE m.conversation_id = $1
               AND m.deleted_at IS NULL
               AND m.sender_id != $2
               AND NOT EXISTS (
                   SELECT 1 FROM message_read_receipts r
                   WHERE r.message_id = m.id AND r.user_id = $2
               )`,
            { values: [conversationId, userId] }
        );

        return {
            id: conv.id,
            name: conv.name || undefined,
            isGroup: conv.is_group,
            createdBy: conv.created_by,
            creatorName: conv.creator_first_name && conv.creator_last_name 
                ? `${conv.creator_first_name} ${conv.creator_last_name}` 
                : undefined,
            createdAt: conv.created_at,
            updatedAt: conv.updated_at,
            adminOnlyMessages: adminOnlyMessages,
            participants: participantsResult.rows.map(p => ({
                userId: p.user_id,
                firstName: p.first_name,
                lastName: p.last_name,
                avatarUrl: p.avatar_url || undefined,
                joinedAt: p.joined_at,
                isAdmin: p.is_admin,
                lastReadAt: p.last_read_at || undefined,
            })),
            lastMessage: lastMessageResult.rows[0] ? {
                ...lastMessageResult.rows[0],
                senderAvatarUrl: lastMessageResult.rows[0].sender_avatar_url || undefined,
            } : undefined,
            unreadCount: parseInt(unreadResult.rows[0].count, 10),
        };
    }

    /**
     * Get user's conversations with pagination
     */
    async getUserConversations(
        userId: string,
        limit: number = 20,
        cursor?: string
    ): Promise<{ conversations: Conversation[]; nextCursor?: string }> {
        let query = `
            SELECT DISTINCT c.id, c.updated_at
            FROM conversations c
            JOIN conversation_participants cp ON cp.conversation_id = c.id
            WHERE cp.user_id = $1 
              AND cp.left_at IS NULL 
              AND c.deleted_at IS NULL
        `;
        
        const values: unknown[] = [userId];
        
        if (cursor) {
            const cursorTime = Buffer.from(cursor, 'base64').toString('utf8');
            query += ` AND c.updated_at < $2`;
            values.push(new Date(cursorTime));
        }

        query += ` ORDER BY c.updated_at DESC LIMIT $${values.length + 1}`;
        values.push(limit + 1);

        const result = await db.query<{ id: string; updated_at: Date }>(query, { values });

        const hasMore = result.rows.length > limit;
        const conversationIds = result.rows.slice(0, limit).map(r => r.id);

        const conversations = await Promise.all(
            conversationIds.map(id => this.getConversation(id, userId))
        );

        const nextCursor = hasMore && conversations.length > 0
            ? Buffer.from(conversations[conversations.length - 1].updatedAt.toISOString()).toString('base64')
            : undefined;

        return { conversations, nextCursor };
    }

    /**
     * Send a message in a conversation
     */
    async sendMessage(userId: string, input: SendMessageInput): Promise<Message> {
        const { conversationId, content, replyToId } = input;

        await this.verifyParticipant(conversationId, userId);

        // Check if conversation is admin-only messaging (handle missing column gracefully)
        let isAdminOnlyGroup = false;
        try {
            const convResult = await db.query<{ is_group: boolean; admin_only_messages: boolean }>(
                `SELECT is_group, COALESCE(admin_only_messages, false) as admin_only_messages
                 FROM conversations WHERE id = $1`,
                { values: [conversationId] }
            );

            if (convResult.rows[0]?.admin_only_messages && convResult.rows[0]?.is_group) {
                // Check if user is admin
                const adminCheck = await db.query<{ is_admin: boolean }>(
                    `SELECT is_admin FROM conversation_participants
                     WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
                    { values: [conversationId, userId] }
                );

                if (!adminCheck.rows[0]?.is_admin) {
                    throw Errors.forbidden('Only admins can send messages in this group');
                }
            }
        } catch (error: any) {
            // If the column doesn't exist, just continue (not an admin-only group)
            if (!error.message?.includes('column') && !error.message?.includes('admin_only_messages')) {
                throw error; // Re-throw if it's not a column missing error
            }
        }

        // Validate reply_to if provided
        let replyToData: { id: string; content: string; senderName: string } | undefined;
        if (replyToId) {
            const replyResult = await db.query<{ id: string; content: string; first_name: string; last_name: string }>(
                `SELECT m.id, m.content, u.first_name, u.last_name
                 FROM messages m
                 JOIN users u ON u.id = m.sender_id
                 WHERE m.id = $1 AND m.conversation_id = $2 AND m.deleted_at IS NULL`,
                { values: [replyToId, conversationId] }
            );
            
            if (replyResult.rowCount === 0) {
                throw Errors.badRequest('Reply message not found');
            }

            replyToData = {
                id: replyResult.rows[0].id,
                content: replyResult.rows[0].content.substring(0, 100),
                senderName: `${replyResult.rows[0].first_name} ${replyResult.rows[0].last_name}`,
            };
        }

        const result = await db.query<Message & { avatar_url: string | null }>(
            `INSERT INTO messages (conversation_id, sender_id, content, reply_to_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id, conversation_id as "conversationId", sender_id as "senderId",
                       content, message_type as "messageType", reply_to_id as "replyToId",
                       is_edited as "isEdited", created_at as "createdAt", updated_at as "updatedAt"`,
            { values: [conversationId, userId, content, replyToId || null] }
        );

        const message = result.rows[0];

        // Get sender info
        const senderResult = await db.query<{ name: string; avatar_url: string | null }>(
            `SELECT first_name || ' ' || last_name as name, avatar_url FROM users WHERE id = $1`,
            { values: [userId] }
        );

        message.senderName = senderResult.rows[0].name;
        message.senderAvatarUrl = senderResult.rows[0].avatar_url || undefined;
        message.replyTo = replyToData;

        // Mark as read for sender
        await db.query(
            `INSERT INTO message_read_receipts (message_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (message_id, user_id) DO NOTHING`,
            { values: [message.id, userId] }
        );

        logger.debug('Message sent', { messageId: message.id, conversationId, senderId: userId });

        return message;
    }

    /**
     * Edit a message
     */
    async editMessage(
        messageId: string,
        userId: string,
        newContent: string
    ): Promise<Message> {
        // Verify user owns the message
        const messageResult = await db.query<{ sender_id: string; conversation_id: string }>(
            `SELECT sender_id, conversation_id FROM messages 
             WHERE id = $1 AND deleted_at IS NULL`,
            { values: [messageId] }
        );

        if (messageResult.rowCount === 0) {
            throw Errors.notFound('Message');
        }

        if (messageResult.rows[0].sender_id !== userId) {
            throw Errors.forbidden('You can only edit your own messages');
        }

        // Update message
        const result = await db.query<Message>(
            `UPDATE messages 
             SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, conversation_id as "conversationId", sender_id as "senderId",
                       content, message_type as "messageType", reply_to_id as "replyToId",
                       is_edited as "isEdited", created_at as "createdAt", updated_at as "updatedAt"`,
            { values: [newContent, messageId] }
        );

        const message = result.rows[0];

        // Get sender name
        const senderResult = await db.query<{ name: string; avatar_url: string | null }>(
            `SELECT first_name || ' ' || last_name as name, avatar_url FROM users WHERE id = $1`,
            { values: [userId] }
        );

        message.senderName = senderResult.rows[0].name;
        message.senderAvatarUrl = senderResult.rows[0].avatar_url || undefined;

        logger.debug('Message edited', { messageId, userId });

        return message;
    }

    /**
     * Delete a message
     */
    async deleteMessage(messageId: string, userId: string): Promise<void> {
        // Verify user owns the message
        const messageResult = await db.query<{ sender_id: string }>(
            `SELECT sender_id FROM messages WHERE id = $1 AND deleted_at IS NULL`,
            { values: [messageId] }
        );

        if (messageResult.rowCount === 0) {
            throw Errors.notFound('Message');
        }

        if (messageResult.rows[0].sender_id !== userId) {
            throw Errors.forbidden('You can only delete your own messages');
        }

        // Soft delete
        await db.query(
            `UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
            { values: [messageId] }
        );

        logger.debug('Message deleted', { messageId, userId });
    }

    /**
     * Get messages in a conversation with cursor-based pagination
     */
    async getMessages(
        conversationId: string,
        userId: string,
        limit: number = 50,
        cursor?: string,
        direction: 'older' | 'newer' = 'older'
    ): Promise<{ messages: Message[]; nextCursor?: string; prevCursor?: string }> {
        await this.verifyParticipant(conversationId, userId);

        let query = `
            SELECT m.id, m.conversation_id as "conversationId", m.sender_id as "senderId",
                   u.first_name || ' ' || u.last_name as "senderName",
                   u.avatar_url as "senderAvatarUrl",
                   m.content, m.message_type as "messageType", m.reply_to_id as "replyToId",
                   m.is_edited as "isEdited", m.created_at as "createdAt", m.updated_at as "updatedAt",
                   rm.content as reply_content,
                   ru.first_name || ' ' || ru.last_name as reply_sender_name
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            LEFT JOIN messages rm ON rm.id = m.reply_to_id
            LEFT JOIN users ru ON ru.id = rm.sender_id
            WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
        `;

        const values: unknown[] = [conversationId];

        if (cursor) {
            const cursorTime = Buffer.from(cursor, 'base64').toString('utf8');
            if (direction === 'older') {
                query += ` AND m.created_at < $2`;
            } else {
                query += ` AND m.created_at > $2`;
            }
            values.push(new Date(cursorTime));
        }

        query += direction === 'older'
            ? ` ORDER BY m.created_at DESC LIMIT $${values.length + 1}`
            : ` ORDER BY m.created_at ASC LIMIT $${values.length + 1}`;
        
        values.push(limit + 1);

        const result = await db.query<Message & { 
            reply_content: string | null; 
            reply_sender_name: string | null;
        }>(query, { values });

        const hasMore = result.rows.length > limit;
        let messages = result.rows.slice(0, limit).map(row => ({
            ...row,
            replyTo: row.replyToId && row.reply_content ? {
                id: row.replyToId,
                content: row.reply_content.substring(0, 100),
                senderName: row.reply_sender_name || 'Unknown',
            } : undefined,
        }));

        if (direction === 'newer') {
            messages = messages.reverse();
        }

        const nextCursor = hasMore && messages.length > 0
            ? Buffer.from(messages[messages.length - 1].createdAt.toISOString()).toString('base64')
            : undefined;

        return { messages, nextCursor };
    }

    /**
     * Mark messages as read
     */
    async markMessagesAsRead(
        conversationId: string,
        userId: string,
        messageIds?: string[]
    ): Promise<number> {
        await this.verifyParticipant(conversationId, userId);

        let query: string;
        let values: unknown[];

        if (messageIds && messageIds.length > 0) {
            query = `
                INSERT INTO message_read_receipts (message_id, user_id)
                SELECT m.id, $1
                FROM messages m
                WHERE m.id = ANY($2)
                  AND m.conversation_id = $3
                  AND m.sender_id != $1
                  AND m.deleted_at IS NULL
                ON CONFLICT (message_id, user_id) DO NOTHING
            `;
            values = [userId, messageIds, conversationId];
        } else {
            query = `
                INSERT INTO message_read_receipts (message_id, user_id)
                SELECT m.id, $1
                FROM messages m
                WHERE m.conversation_id = $2
                  AND m.sender_id != $1
                  AND m.deleted_at IS NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM message_read_receipts r
                      WHERE r.message_id = m.id AND r.user_id = $1
                  )
                ON CONFLICT (message_id, user_id) DO NOTHING
            `;
            values = [userId, conversationId];
        }

        const result = await db.query(query, { values });

        await db.query(
            `UPDATE conversation_participants 
             SET last_read_at = CURRENT_TIMESTAMP
             WHERE conversation_id = $1 AND user_id = $2`,
            { values: [conversationId, userId] }
        );

        return result.rowCount || 0;
    }

    /**
     * Get unread counts for all user's conversations
     */
    async getUnreadCounts(userId: string): Promise<{ counts: UnreadCount[]; total: number }> {
        const result = await db.query<{ conversation_id: string; count: string }>(
            `SELECT m.conversation_id, COUNT(*) as count
             FROM messages m
             JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
             WHERE cp.user_id = $1
               AND cp.left_at IS NULL
               AND m.sender_id != $1
               AND m.deleted_at IS NULL
               AND NOT EXISTS (
                   SELECT 1 FROM message_read_receipts r
                   WHERE r.message_id = m.id AND r.user_id = $1
               )
             GROUP BY m.conversation_id`,
            { values: [userId] }
        );

        const counts = result.rows.map(r => ({
            conversationId: r.conversation_id,
            count: parseInt(r.count, 10),
        }));

        const total = counts.reduce((sum, c) => sum + c.count, 0);

        return { counts, total };
    }

    /**
     * Verify user is a participant in conversation
     */
    private async verifyParticipant(
        conversationId: string,
        userId: string
    ): Promise<void> {
        const cacheKey = `${conversationId}`;
        let participants = this.participantCache.get(cacheKey);

        if (!participants) {
            const result = await db.query<{ user_id: string }>(
                `SELECT user_id FROM conversation_participants
                 WHERE conversation_id = $1 AND left_at IS NULL`,
                { values: [conversationId] }
            );

            participants = new Set(result.rows.map(r => r.user_id));
            this.participantCache.put(cacheKey, participants);
        }

        if (!participants.has(userId)) {
            throw Errors.forbidden('You are not a participant in this conversation');
        }
    }

    /**
     * Verify user is an admin in conversation
     */
    private async verifyAdmin(
        conversationId: string,
        userId: string
    ): Promise<void> {
        const result = await db.query<{ is_admin: boolean }>(
            `SELECT is_admin FROM conversation_participants
             WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
            { values: [conversationId, userId] }
        );

        if (result.rowCount === 0) {
            throw Errors.forbidden('You are not a participant in this conversation');
        }

        if (!result.rows[0].is_admin) {
            throw Errors.forbidden('Only admins can perform this action');
        }
    }
}

// Export singleton instance
export const messagingService = new MessagingService();
