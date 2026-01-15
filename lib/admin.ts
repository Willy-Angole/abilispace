/**
 * Admin API Client
 * 
 * Provides typed functions for interacting with the admin backend API.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface AdminTokens {
  accessToken: string;
  refreshToken: string;
}

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'support';
}

interface DashboardStats {
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

interface PaginatedResponse<T> {
  users?: T[];
  events?: T[];
  articles?: T[];
  reports?: T[];
  logs?: T[];
  total: number;
  page: number;
  totalPages: number;
}

interface UserDetails {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  events_registered: number;
  messages_sent: number;
}

interface EventDetails {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  capacity: number;
  registered_count: number;
  is_published: boolean;
  is_featured: boolean;
  organizer_name: string;
  registration_count: number;
}

interface EventRegistration {
  user_id: string;
  user_email: string;
  first_name: string;
  last_name: string;
  registered_at: string;
  attendance_status: string;
}

interface OnlineUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  last_activity_at: string;
  device_type?: string;
  ip_address?: string;
}

interface DailyStatistic {
  stat_date: string;
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

// Token storage
const ADMIN_TOKEN_KEY = 'shiriki_admin_token';
const ADMIN_REFRESH_KEY = 'shiriki_admin_refresh';

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function setAdminTokens(tokens: AdminTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(ADMIN_REFRESH_KEY, tokens.refreshToken);
}

function clearAdminTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_KEY);
}

// HTTP helper
async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/admin${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data as T;
}

// =============================================================================
// AUTH
// =============================================================================

export async function adminLogin(email: string, password: string): Promise<{ admin: AdminUser; accessToken: string }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  setAdminTokens({
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
  });
  
  return data.data;
}

export async function adminLogout(): Promise<void> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_REFRESH_KEY) : null;
  
  try {
    await adminFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  } finally {
    clearAdminTokens();
  }
}

export async function getAdminProfile(): Promise<AdminUser> {
  return adminFetch<AdminUser>('/auth/me');
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}

// =============================================================================
// DASHBOARD
// =============================================================================

export async function getDashboardStats(): Promise<DashboardStats> {
  return adminFetch<DashboardStats>('/dashboard/stats');
}

export async function getOnlineUsers(): Promise<OnlineUser[]> {
  return adminFetch<OnlineUser[]>('/dashboard/online-users');
}

export async function getDailyStats(days: number = 30): Promise<DailyStatistic[]> {
  return adminFetch<DailyStatistic[]>(`/dashboard/daily-stats?days=${days}`);
}

export async function getUserGrowthData(days: number = 30): Promise<Array<{ date: string; new_users: number }>> {
  return adminFetch<Array<{ date: string; new_users: number }>>(`/dashboard/user-growth?days=${days}`);
}

export async function getRegistrationTrends(days: number = 30): Promise<Array<{ date: string; registrations: number }>> {
  return adminFetch<Array<{ date: string; registrations: number }>>(`/dashboard/registration-trends?days=${days}`);
}

export async function getTopEvents(limit: number = 10): Promise<EventDetails[]> {
  return adminFetch<EventDetails[]>(`/dashboard/top-events?limit=${limit}`);
}

// =============================================================================
// USERS
// =============================================================================

export async function getUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<PaginatedResponse<UserDetails> & { users: UserDetails[] }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  
  return adminFetch<PaginatedResponse<UserDetails> & { users: UserDetails[] }>(`/users?${query.toString()}`);
}

export async function getUserById(userId: string): Promise<UserDetails> {
  return adminFetch<UserDetails>(`/users/${userId}`);
}

export async function toggleUserStatus(userId: string, isActive: boolean): Promise<UserDetails> {
  return adminFetch<UserDetails>(`/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await adminFetch(`/users/${userId}`, { method: 'DELETE' });
}

// =============================================================================
// EVENTS
// =============================================================================

export async function getEvents(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'upcoming' | 'ongoing' | 'past' | 'all';
} = {}): Promise<PaginatedResponse<EventDetails> & { events: EventDetails[] }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  
  return adminFetch<PaginatedResponse<EventDetails> & { events: EventDetails[] }>(`/events?${query.toString()}`);
}

export async function getEventRegistrations(eventId: string, page: number = 1, limit: number = 50): Promise<{
  event: EventDetails;
  registrations: EventRegistration[];
  total: number;
}> {
  return adminFetch(`/events/${eventId}/registrations?page=${page}&limit=${limit}`);
}

export async function toggleEventPublished(eventId: string, isPublished: boolean): Promise<EventDetails> {
  return adminFetch<EventDetails>(`/events/${eventId}/publish`, {
    method: 'PATCH',
    body: JSON.stringify({ isPublished }),
  });
}

export async function toggleEventFeatured(eventId: string, isFeatured: boolean): Promise<EventDetails> {
  return adminFetch<EventDetails>(`/events/${eventId}/feature`, {
    method: 'PATCH',
    body: JSON.stringify({ isFeatured }),
  });
}

// Create new event
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

export async function createEvent(data: CreateEventData): Promise<EventDetails> {
  return adminFetch<EventDetails>('/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await adminFetch(`/events/${eventId}`, { method: 'DELETE' });
}

// Update event data
export interface UpdateEventData {
  title?: string;
  description?: string;
  eventDate?: string;
  eventTime?: string;
  endDate?: string;
  endTime?: string;
  location?: string;
  virtualLink?: string;
  eventType?: 'virtual' | 'in_person' | 'hybrid';
  category?: string;
  capacity?: number;
  organizerName?: string;
  imageUrl?: string;
  imageAlt?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
}

export async function updateEvent(eventId: string, data: UpdateEventData): Promise<EventDetails> {
  return adminFetch<EventDetails>(`/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Upload event poster image
export async function uploadEventPoster(eventId: string, file: File, imageAlt?: string): Promise<{ event: EventDetails; imageUrl: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('shiriki_admin_token') : null;
  
  const formData = new FormData();
  formData.append('poster', file);
  if (imageAlt) {
    formData.append('imageAlt', imageAlt);
  }
  
  const response = await fetch(`${API_BASE_URL}/api/admin/events/${eventId}/poster`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Failed to upload poster');
  }

  const data = await response.json();
  return { event: data.data, imageUrl: data.imageUrl };
}

export async function getEventCategories(): Promise<string[]> {
  return adminFetch<string[]>('/events/categories');
}

export async function getAdminAccessibilityFeatures(): Promise<Array<{ id: string; name: string; description?: string; icon?: string }>> {
  return adminFetch('/events/accessibility-features');
}

// =============================================================================
// ARTICLES
// =============================================================================

export async function getArticles(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'published' | 'draft' | 'all';
} = {}): Promise<PaginatedResponse<any> & { articles: any[] }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  
  return adminFetch(`/articles?${query.toString()}`);
}

export async function toggleArticlePublished(articleId: string, isPublished: boolean): Promise<any> {
  return adminFetch(`/articles/${articleId}/publish`, {
    method: 'PATCH',
    body: JSON.stringify({ isPublished }),
  });
}

// Create new article
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

export async function createArticle(data: CreateArticleData): Promise<any> {
  return adminFetch('/articles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteArticle(articleId: string): Promise<void> {
  await adminFetch(`/articles/${articleId}`, { method: 'DELETE' });
}

export async function getArticleCategories(): Promise<string[]> {
  return adminFetch<string[]>('/articles/categories');
}

// =============================================================================
// REPORTS
// =============================================================================

export async function getReports(params: {
  page?: number;
  limit?: number;
  status?: string;
} = {}): Promise<PaginatedResponse<any> & { reports: any[] }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  
  return adminFetch(`/reports?${query.toString()}`);
}

export async function updateReportStatus(reportId: string, status: string, resolutionNotes?: string): Promise<any> {
  return adminFetch(`/reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, resolutionNotes }),
  });
}

// =============================================================================
// AUDIT LOGS
// =============================================================================

export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
} = {}): Promise<PaginatedResponse<any> & { logs: any[] }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.adminId) query.set('adminId', params.adminId);
  if (params.action) query.set('action', params.action);
  
  return adminFetch(`/audit-logs?${query.toString()}`);
}

// =============================================================================
// SETTINGS
// =============================================================================

export async function getPlatformSettings(): Promise<Array<{
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string;
  is_public: boolean;
}>> {
  return adminFetch('/settings');
}

export async function updatePlatformSetting(key: string, value: string): Promise<any> {
  return adminFetch(`/settings/${key}`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  });
}

// =============================================================================
// ADMIN USERS
// =============================================================================

export async function getAdminUsers(): Promise<AdminUser[]> {
  return adminFetch<AdminUser[]>('/admins');
}

export async function createAdminUser(data: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
}): Promise<AdminUser> {
  return adminFetch<AdminUser>('/admins', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminRole(adminId: string, role: string): Promise<AdminUser> {
  return adminFetch<AdminUser>(`/admins/${adminId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}
