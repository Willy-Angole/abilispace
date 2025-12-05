export interface AdminUser {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'super_admin' | 'admin' | 'moderator' | 'support';
    phone?: string;
    avatar_url?: string;
    is_active: boolean;
    last_login_at?: Date;
    login_count: number;
    created_at: Date;
}
export interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    onlineUsers: number;
    newUsersToday: number;
    totalEvents: number;
    upcomingEvents: number;
    totalRegistrations: number;
    totalArticles: number;
    totalMessages: number;
    pendingReports: number;
}
export interface UserDetails {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    last_login_at?: Date;
    created_at: Date;
    events_registered: number;
    messages_sent: number;
}
export interface EventRegistration {
    user_id: string;
    user_email: string;
    first_name: string;
    last_name: string;
    registered_at: Date;
    attendance_status: string;
}
export interface DailyStatistic {
    stat_date: Date;
    total_users: number;
    new_users: number;
    active_users: number;
    total_events: number;
    new_events: number;
    event_registrations: number;
    total_articles: number;
    new_articles: number;
    total_messages: number;
    new_messages: number;
}
export declare function adminLogin(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<{
    admin: {
        id: any;
        email: any;
        first_name: any;
        last_name: any;
        role: any;
    };
    accessToken: string;
    refreshToken: string;
}>;
export declare function adminLogout(adminId: string, refreshToken: string): Promise<void>;
export declare function getDashboardStats(): Promise<DashboardStats>;
export declare function getAllUsers(page?: number, limit?: number, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{
    users: UserDetails[];
    total: number;
    page: number;
    totalPages: number;
}>;
export declare function getUserById(userId: string): Promise<UserDetails | null>;
export declare function toggleUserStatus(adminId: string, userId: string, isActive: boolean): Promise<any>;
export declare function deleteUser(adminId: string, userId: string): Promise<any>;
export declare function getAllEvents(page?: number, limit?: number, search?: string, status?: 'upcoming' | 'ongoing' | 'past' | 'all'): Promise<{
    events: import("pg").QueryResultRow[];
    total: number;
    page: number;
    totalPages: number;
}>;
export declare function getEventRegistrations(eventId: string, page?: number, limit?: number): Promise<{
    registrations: EventRegistration[];
    total: number;
    event: any;
}>;
export declare function toggleEventPublished(adminId: string, eventId: string, isPublished: boolean): Promise<any>;
export declare function toggleEventFeatured(adminId: string, eventId: string, isFeatured: boolean): Promise<any>;
export declare function getAllArticles(page?: number, limit?: number, search?: string, status?: 'published' | 'draft' | 'all'): Promise<{
    articles: import("pg").QueryResultRow[];
    total: number;
    page: number;
    totalPages: number;
}>;
export declare function toggleArticlePublished(adminId: string, articleId: string, isPublished: boolean): Promise<any>;
export declare function getDailyStatistics(days?: number): Promise<DailyStatistic[]>;
export declare function getUserGrowthData(days?: number): Promise<import("pg").QueryResultRow[]>;
export declare function getEventRegistrationTrends(days?: number): Promise<import("pg").QueryResultRow[]>;
export declare function getTopEvents(limit?: number): Promise<import("pg").QueryResultRow[]>;
export declare function getOnlineUsers(): Promise<import("pg").QueryResultRow[]>;
export declare function updateUserSession(userId: string, sessionToken: string): Promise<void>;
export declare function getAdminAuditLogs(page?: number, limit?: number, adminId?: string, action?: string): Promise<{
    logs: import("pg").QueryResultRow[];
    total: number;
    page: number;
    totalPages: number;
}>;
export declare function getPlatformSettings(publicOnly?: boolean): Promise<import("pg").QueryResultRow[]>;
export declare function updatePlatformSetting(adminId: string, key: string, value: string): Promise<any>;
export declare function getReports(page?: number, limit?: number, status?: string): Promise<{
    reports: never[] | import("pg").QueryResultRow[];
    total: number;
    page: number;
    totalPages: number;
}>;
export declare function updateReportStatus(adminId: string, reportId: string, status: string, resolutionNotes?: string): Promise<any>;
export declare function createAdminUser(creatorId: string, data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
}): Promise<any>;
export declare function getAdminUsers(): Promise<import("pg").QueryResultRow[]>;
export declare function updateAdminRole(adminId: string, targetAdminId: string, role: string): Promise<any>;
export declare function aggregateDailyStats(): Promise<void>;
export interface CreateEventData {
    title: string;
    description: string;
    eventDate: string;
    eventTime: string;
    endDate?: string;
    endTime?: string;
    location?: string;
    virtualLink?: string;
    eventType: 'virtual' | 'in_person' | 'hybrid';
    category: string;
    capacity: number;
    organizerName: string;
    imageUrl?: string;
    imageAlt?: string;
    isFeatured?: boolean;
    isPublished?: boolean;
    accessibilityFeatures?: string[];
    tags?: string[];
}
export declare function createEvent(adminId: string, data: CreateEventData): Promise<any>;
export declare function deleteEvent(adminId: string, eventId: string): Promise<any>;
export interface CreateArticleData {
    title: string;
    summary: string;
    content: string;
    category: string;
    source: string;
    sourceUrl?: string;
    author?: string;
    region?: 'national' | 'international' | 'local';
    priority?: 'high' | 'medium' | 'low';
    readTimeMinutes?: number;
    imageUrl?: string;
    imageAlt?: string;
    hasAudio?: boolean;
    audioUrl?: string;
    hasVideo?: boolean;
    videoUrl?: string;
    isPublished?: boolean;
    tags?: string[];
}
export declare function createArticle(adminId: string, data: CreateArticleData): Promise<any>;
export declare function deleteArticle(adminId: string, articleId: string): Promise<any>;
export declare function getAccessibilityFeatures(): Promise<import("pg").QueryResultRow[]>;
export declare function getEventCategories(): Promise<string[]>;
export declare function getArticleCategories(): Promise<string[]>;
//# sourceMappingURL=admin.service.d.ts.map