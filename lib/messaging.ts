/**
 * Messaging API Library
 * 
 * Frontend client for secure messaging operations.
 * Handles DM and group conversations with real-time support.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// =============================================================================
// Types
// =============================================================================

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    location?: string;
}

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
    createdAt: string;
    updatedAt: string;
}

export interface Participant {
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    joinedAt: string;
    isAdmin: boolean;
    lastReadAt?: string;
}

export interface Conversation {
    id: string;
    name?: string;
    description?: string;
    isGroup: boolean;
    createdBy: string;
    creatorName?: string;
    createdAt: string;
    updatedAt: string;
    participants: Participant[];
    lastMessage?: Message;
    unreadCount: number;
}

export interface UnreadCount {
    conversationId: string;
    count: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getAuthHeaders(): HeadersInit {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint}`;
    
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.message || data.error || 'Request failed',
            };
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}

// =============================================================================
// User Search
// =============================================================================

/**
 * Search for users to start conversations with
 */
export async function searchUsers(
    query: string,
    limit: number = 10
): Promise<ApiResponse<User[]>> {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    return fetchApi<User[]>(`/messaging/users/search?${params}`);
}

// =============================================================================
// Conversations
// =============================================================================

/**
 * Create a new conversation (DM or group)
 */
export async function createConversation(data: {
    participantIds: string[];
    name?: string;
    isGroup?: boolean;
}): Promise<ApiResponse<Conversation>> {
    return fetchApi<Conversation>('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Get user's conversations
 */
export async function getConversations(
    limit: number = 20,
    cursor?: string
): Promise<ApiResponse<Conversation[]> & { nextCursor?: string }> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    
    const response = await fetchApi<Conversation[]>(`/messaging/conversations?${params}`);
    return response as ApiResponse<Conversation[]> & { nextCursor?: string };
}

/**
 * Get a specific conversation
 */
export async function getConversation(
    conversationId: string
): Promise<ApiResponse<Conversation>> {
    return fetchApi<Conversation>(`/messaging/conversations/${conversationId}`);
}

/**
 * Update conversation settings (name, etc.)
 */
export async function updateConversation(
    conversationId: string,
    updates: { name?: string; description?: string }
): Promise<ApiResponse<Conversation>> {
    return fetchApi<Conversation>(`/messaging/conversations/${conversationId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
}

// =============================================================================
// Group Member Management
// =============================================================================

/**
 * Add members to a group conversation
 */
export async function addMembers(
    conversationId: string,
    memberIds: string[]
): Promise<ApiResponse<Conversation>> {
    return fetchApi<Conversation>(`/messaging/conversations/${conversationId}/members`, {
        method: 'POST',
        body: JSON.stringify({ memberIds }),
    });
}

/**
 * Remove a member from a group conversation
 */
export async function removeMember(
    conversationId: string,
    memberId: string
): Promise<ApiResponse<Conversation>> {
    return fetchApi<Conversation>(
        `/messaging/conversations/${conversationId}/members/${memberId}`,
        { method: 'DELETE' }
    );
}

/**
 * Leave a conversation
 */
export async function leaveConversation(
    conversationId: string
): Promise<ApiResponse<void>> {
    return fetchApi<void>(`/messaging/conversations/${conversationId}/leave`, {
        method: 'POST',
    });
}

/**
 * Make a member an admin
 */
export async function makeAdmin(
    conversationId: string,
    memberId: string
): Promise<ApiResponse<Conversation>> {
    return fetchApi<Conversation>(
        `/messaging/conversations/${conversationId}/admin/${memberId}`,
        { method: 'POST' }
    );
}

// =============================================================================
// Messages
// =============================================================================

/**
 * Send a message
 */
export async function sendMessage(data: {
    conversationId: string;
    content: string;
    replyToId?: string;
}): Promise<ApiResponse<Message>> {
    return fetchApi<Message>('/messaging/messages', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Get messages in a conversation
 */
export async function getMessages(
    conversationId: string,
    limit: number = 50,
    cursor?: string,
    direction: 'older' | 'newer' = 'older'
): Promise<ApiResponse<Message[]> & { nextCursor?: string }> {
    const params = new URLSearchParams({
        limit: limit.toString(),
        direction,
    });
    if (cursor) params.append('cursor', cursor);
    
    const response = await fetchApi<Message[]>(
        `/messaging/conversations/${conversationId}/messages?${params}`
    );
    return response as ApiResponse<Message[]> & { nextCursor?: string };
}

/**
 * Edit a message
 */
export async function editMessage(
    messageId: string,
    content: string
): Promise<ApiResponse<Message>> {
    return fetchApi<Message>(`/messaging/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
    });
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    return fetchApi<void>(`/messaging/messages/${messageId}`, {
        method: 'DELETE',
    });
}

// =============================================================================
// Read Receipts
// =============================================================================

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
    conversationId: string,
    messageIds?: string[]
): Promise<ApiResponse<{ markedCount: number }>> {
    return fetchApi<{ markedCount: number }>(
        `/messaging/conversations/${conversationId}/read`,
        {
            method: 'POST',
            body: JSON.stringify({ messageIds }),
        }
    );
}

/**
 * Get unread message counts for all conversations
 */
export async function getUnreadCounts(): Promise<
    ApiResponse<{ counts: UnreadCount[]; total: number }>
> {
    return fetchApi<{ counts: UnreadCount[]; total: number }>('/messaging/unread-counts');
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get display name for a conversation
 */
export function getConversationDisplayName(
    conversation: Conversation,
    currentUserId: string
): string {
    if (conversation.name) {
        return conversation.name;
    }
    
    // For DMs, show the other participant's name
    const otherParticipant = conversation.participants.find(
        p => p.userId !== currentUserId
    );
    
    if (otherParticipant) {
        return `${otherParticipant.firstName} ${otherParticipant.lastName}`;
    }
    
    return 'Unknown Conversation';
}

/**
 * Format message timestamp
 */
export function formatMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Get initials from a name
 */
export function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Check if user is admin in conversation
 */
export function isConversationAdmin(
    conversation: Conversation,
    userId: string
): boolean {
    const participant = conversation.participants.find(p => p.userId === userId);
    return participant?.isAdmin ?? false;
}
