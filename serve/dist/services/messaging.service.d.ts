/**
 * Messaging Service
 *
 * Handles secure messaging, conversations, and real-time features.
 * Implements efficient message retrieval using cursor-based pagination.
 *
 * @author Shiriki Team
 * @version 2.0.0
 */
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
 * MessagingService - Comprehensive messaging operations
 */
export declare class MessagingService {
    private participantCache;
    /**
     * Search users for starting conversations
     */
    searchUsers(userId: string, query: string, limit?: number): Promise<UserSearchResult[]>;
    /**
     * Create a new conversation (DM or group)
     */
    createConversation(creatorId: string, input: CreateConversationInput): Promise<Conversation>;
    /**
     * Update group conversation (name, etc.)
     */
    updateConversation(conversationId: string, userId: string, updates: {
        name?: string;
        description?: string;
    }): Promise<Conversation>;
    /**
     * Add members to a group conversation
     */
    addMembers(conversationId: string, userId: string, memberIds: string[]): Promise<Conversation>;
    /**
     * Remove a member from group conversation
     */
    removeMember(conversationId: string, userId: string, memberIdToRemove: string): Promise<Conversation>;
    /**
     * Leave a conversation
     */
    leaveConversation(conversationId: string, userId: string): Promise<void>;
    /**
     * Make a member admin
     */
    makeAdmin(conversationId: string, userId: string, targetUserId: string): Promise<Conversation>;
    /**
     * Find existing 1:1 conversation between two users
     */
    private findExisting1to1Conversation;
    /**
     * Get conversation details with participants
     */
    getConversation(conversationId: string, userId: string): Promise<Conversation>;
    /**
     * Get user's conversations with pagination
     */
    getUserConversations(userId: string, limit?: number, cursor?: string): Promise<{
        conversations: Conversation[];
        nextCursor?: string;
    }>;
    /**
     * Send a message in a conversation
     */
    sendMessage(userId: string, input: SendMessageInput): Promise<Message>;
    /**
     * Edit a message
     */
    editMessage(messageId: string, userId: string, newContent: string): Promise<Message>;
    /**
     * Delete a message
     */
    deleteMessage(messageId: string, userId: string): Promise<void>;
    /**
     * Get messages in a conversation with cursor-based pagination
     */
    getMessages(conversationId: string, userId: string, limit?: number, cursor?: string, direction?: 'older' | 'newer'): Promise<{
        messages: Message[];
        nextCursor?: string;
        prevCursor?: string;
    }>;
    /**
     * Mark messages as read
     */
    markMessagesAsRead(conversationId: string, userId: string, messageIds?: string[]): Promise<number>;
    /**
     * Get unread counts for all user's conversations
     */
    getUnreadCounts(userId: string): Promise<{
        counts: UnreadCount[];
        total: number;
    }>;
    /**
     * Verify user is a participant in conversation
     */
    private verifyParticipant;
    /**
     * Verify user is an admin in conversation
     */
    private verifyAdmin;
}
export declare const messagingService: MessagingService;
//# sourceMappingURL=messaging.service.d.ts.map