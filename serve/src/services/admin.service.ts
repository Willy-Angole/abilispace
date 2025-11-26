import { db } from '../database/pool';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import crypto from 'crypto';

// Environment shorthand
const JWT_SECRET = config.jwt.secret;

// Types
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

// Admin Authentication
export async function adminLogin(email: string, password: string, ipAddress?: string, userAgent?: string) {
  return db.transaction(async (client) => {
    // Find admin user
    const adminResult = await client.query(
      `SELECT id, email, password_hash, first_name, last_name, role, is_active, 
              failed_login_attempts, locked_until
       FROM admin_users 
       WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );

    if (adminResult.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const admin = adminResult.rows[0];

    // Check if account is locked
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      throw new Error('Account is temporarily locked. Please try again later.');
    }

    // Check if account is active
    if (!admin.is_active) {
      throw new Error('Account is disabled. Please contact a super admin.');
    }

    // Verify password
    const isValidPassword = await argon2.verify(admin.password_hash, password);
    
    if (!isValidPassword) {
      // Increment failed attempts
      await client.query(
        `UPDATE admin_users 
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = CASE WHEN failed_login_attempts >= 4 
                           THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' 
                           ELSE NULL END
         WHERE id = $1`,
        [admin.id]
      );
      throw new Error('Invalid credentials');
    }

    // Reset failed attempts and update login info
    await client.query(
      `UPDATE admin_users 
       SET failed_login_attempts = 0, 
           locked_until = NULL,
           last_login_at = CURRENT_TIMESTAMP,
           login_count = login_count + 1
       WHERE id = $1`,
      [admin.id]
    );

    // Generate tokens
    const accessToken = jwt.sign(
      { 
        sub: admin.id, 
        email: admin.email, 
        role: admin.role,
        type: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Store refresh token
    await client.query(
      `INSERT INTO admin_refresh_tokens (admin_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '7 days', $3, $4)`,
      [admin.id, refreshTokenHash, ipAddress, userAgent]
    );

    // Log the login
    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [admin.id, 'LOGIN', 'admin_users', admin.id, 'Admin login successful', ipAddress, userAgent]
    );

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role
      },
      accessToken,
      refreshToken
    };
  });
}

export async function adminLogout(adminId: string, refreshToken: string) {
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  
  await db.query(
    `UPDATE admin_refresh_tokens 
     SET revoked_at = CURRENT_TIMESTAMP 
     WHERE admin_id = $1 AND token_hash = $2`,
    { values: [adminId, refreshTokenHash] }
  );
}

// Dashboard Statistics
export async function getDashboardStats(): Promise<DashboardStats> {
  // Get all stats in parallel using db.batchQuery or separate queries
  const [
    usersResult,
    activeUsersResult,
    onlineUsersResult,
    newUsersTodayResult,
    eventsResult,
    upcomingEventsResult,
    registrationsResult,
    articlesResult,
    messagesResult,
    reportsResult
  ] = await Promise.all([
    // Total users
    db.query(`SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`),
    
    // Active users (logged in within last 30 days)
    db.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE deleted_at IS NULL 
      AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
    `),
    
    // Online users (active session in last 15 minutes)
    db.query(`
      SELECT COUNT(DISTINCT user_id) as count FROM user_sessions 
      WHERE is_active = TRUE 
      AND last_activity_at > CURRENT_TIMESTAMP - INTERVAL '15 minutes'
    `).catch(() => ({ rows: [{ count: 0 }] })),
    
    // New users today
    db.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE deleted_at IS NULL 
      AND DATE(created_at) = CURRENT_DATE
    `),
    
    // Total events
    db.query(`SELECT COUNT(*) as count FROM events WHERE deleted_at IS NULL`),
    
    // Upcoming events
    db.query(`
      SELECT COUNT(*) as count FROM events 
      WHERE deleted_at IS NULL 
      AND event_date > CURRENT_DATE
    `),
    
    // Total registrations
    db.query(`SELECT COUNT(*) as count FROM event_registrations WHERE cancelled_at IS NULL`),
    
    // Total articles
    db.query(`SELECT COUNT(*) as count FROM articles WHERE deleted_at IS NULL`),
    
    // Total messages
    db.query(`SELECT COUNT(*) as count FROM messages WHERE deleted_at IS NULL`),
    
    // Pending reports (if table exists, otherwise return 0)
    db.query(`
      SELECT COUNT(*) as count FROM reports 
      WHERE status = 'pending'
    `).catch(() => ({ rows: [{ count: 0 }] }))
  ]);

  return {
    totalUsers: parseInt(usersResult.rows[0].count),
    activeUsers: parseInt(activeUsersResult.rows[0].count),
    onlineUsers: parseInt(onlineUsersResult.rows[0].count),
    newUsersToday: parseInt(newUsersTodayResult.rows[0].count),
    totalEvents: parseInt(eventsResult.rows[0].count),
    upcomingEvents: parseInt(upcomingEventsResult.rows[0].count),
    totalRegistrations: parseInt(registrationsResult.rows[0].count),
    totalArticles: parseInt(articlesResult.rows[0].count),
    totalMessages: parseInt(messagesResult.rows[0].count),
    pendingReports: parseInt(reportsResult.rows[0].count)
  };
}

// User Management
export async function getAllUsers(
  page: number = 1,
  limit: number = 20,
  search?: string,
  sortBy: string = 'created_at',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ users: UserDetails[]; total: number; page: number; totalPages: number }> {
  const offset = (page - 1) * limit;
  
  let whereClause = 'deleted_at IS NULL';
  const params: unknown[] = [];
  
  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`;
  }

  // Validate sort column
  const validSortColumns = ['created_at', 'email', 'first_name', 'last_name', 'last_login_at'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
    { values: params }
  );
  const total = parseInt(countResult.rows[0].total);

  // Get users with related stats
  const usersParams = [...params, limit, offset];
  const usersResult = await db.query<UserDetails>(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, 
            u.last_login_at, u.created_at,
            (SELECT COUNT(*) FROM event_registrations er WHERE er.user_id = u.id AND er.cancelled_at IS NULL)::int as events_registered,
            (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id AND m.deleted_at IS NULL)::int as messages_sent
     FROM users u
     WHERE ${whereClause}
     ORDER BY ${sortColumn} ${order}
     LIMIT $${usersParams.length - 1} OFFSET $${usersParams.length}`,
    { values: usersParams }
  );

  return {
    users: usersResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

export async function getUserById(userId: string): Promise<UserDetails | null> {
  const result = await db.query<UserDetails>(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, 
            u.last_login_at, u.created_at,
            (SELECT COUNT(*) FROM event_registrations er WHERE er.user_id = u.id AND er.cancelled_at IS NULL)::int as events_registered,
            (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id AND m.deleted_at IS NULL)::int as messages_sent
     FROM users u
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    { values: [userId] }
  );

  return result.rows[0] || null;
}

export async function toggleUserStatus(adminId: string, userId: string, isActive: boolean) {
  return db.transaction(async (client) => {
    const result = await client.query(
      `UPDATE users SET is_active = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *`,
      [isActive, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', 'users', userId, `User ${isActive ? 'activated' : 'deactivated'}`]
    );

    return result.rows[0];
  });
}

export async function deleteUser(adminId: string, userId: string) {
  return db.transaction(async (client) => {
    const result = await client.query(
      `UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'DELETE_USER', 'users', userId, 'User soft deleted']
    );

    return result.rows[0];
  });
}

// Event Management
export async function getAllEvents(
  page: number = 1,
  limit: number = 20,
  search?: string,
  status?: 'upcoming' | 'ongoing' | 'past' | 'all'
) {
  const offset = (page - 1) * limit;
  
  let whereClause = 'e.deleted_at IS NULL';
  const params: unknown[] = [];
  
  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (e.title ILIKE $${params.length} OR e.description ILIKE $${params.length})`;
  }

  if (status && status !== 'all') {
    if (status === 'upcoming') {
      whereClause += ` AND e.event_date > CURRENT_DATE`;
    } else if (status === 'ongoing') {
      whereClause += ` AND e.event_date <= CURRENT_DATE AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE)`;
    } else if (status === 'past') {
      whereClause += ` AND (e.end_date < CURRENT_DATE OR (e.end_date IS NULL AND e.event_date < CURRENT_DATE))`;
    }
  }

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM events e WHERE ${whereClause}`,
    { values: params }
  );
  const total = parseInt(countResult.rows[0].total);

  // Get events with registration count
  const eventsParams = [...params, limit, offset];
  const eventsResult = await db.query(
    `SELECT e.*, 
            (SELECT COUNT(*) FROM event_registrations er 
             WHERE er.event_id = e.id AND er.cancelled_at IS NULL)::int as registration_count,
            u.first_name || ' ' || u.last_name as organizer_name
     FROM events e
     LEFT JOIN users u ON e.organizer_id = u.id
     WHERE ${whereClause}
     ORDER BY e.event_date DESC
     LIMIT $${eventsParams.length - 1} OFFSET $${eventsParams.length}`,
    { values: eventsParams }
  );

  return {
    events: eventsResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

export async function getEventRegistrations(
  eventId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ registrations: EventRegistration[]; total: number; event: any }> {
  const offset = (page - 1) * limit;
  
  // Get event details
  const eventResult = await db.query(
    `SELECT id, title, event_date, end_date, capacity, registered_count 
     FROM events WHERE id = $1 AND deleted_at IS NULL`,
    { values: [eventId] }
  );

  if (eventResult.rows.length === 0) {
    throw new Error('Event not found');
  }

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM event_registrations WHERE event_id = $1 AND cancelled_at IS NULL`,
    { values: [eventId] }
  );
  const total = parseInt(countResult.rows[0].total);

  // Get registrations
  const registrationsResult = await db.query<EventRegistration>(
    `SELECT er.user_id, u.email as user_email, u.first_name, u.last_name, 
            er.registered_at, er.attendance_status
     FROM event_registrations er
     JOIN users u ON er.user_id = u.id
     WHERE er.event_id = $1 AND er.cancelled_at IS NULL
     ORDER BY er.registered_at DESC
     LIMIT $2 OFFSET $3`,
    { values: [eventId, limit, offset] }
  );

  return {
    event: eventResult.rows[0],
    registrations: registrationsResult.rows,
    total
  };
}

export async function toggleEventPublished(adminId: string, eventId: string, isPublished: boolean) {
  return db.transaction(async (client) => {
    const result = await client.query(
      `UPDATE events SET is_published = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *`,
      [isPublished, eventId]
    );

    if (result.rows.length === 0) {
      throw new Error('Event not found');
    }

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, isPublished ? 'PUBLISH_EVENT' : 'UNPUBLISH_EVENT', 'events', eventId, `Event ${isPublished ? 'published' : 'unpublished'}`]
    );

    return result.rows[0];
  });
}

export async function toggleEventFeatured(adminId: string, eventId: string, isFeatured: boolean) {
  return db.transaction(async (client) => {
    const result = await client.query(
      `UPDATE events SET is_featured = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *`,
      [isFeatured, eventId]
    );

    if (result.rows.length === 0) {
      throw new Error('Event not found');
    }

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, isFeatured ? 'FEATURE_EVENT' : 'UNFEATURE_EVENT', 'events', eventId, `Event ${isFeatured ? 'featured' : 'unfeatured'}`]
    );

    return result.rows[0];
  });
}

// Article Management
export async function getAllArticles(
  page: number = 1,
  limit: number = 20,
  search?: string,
  status?: 'published' | 'draft' | 'all'
) {
  const offset = (page - 1) * limit;
  
  let whereClause = 'a.deleted_at IS NULL';
  const params: unknown[] = [];
  
  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (a.title ILIKE $${params.length} OR a.content ILIKE $${params.length})`;
  }

  if (status && status !== 'all') {
    whereClause += ` AND a.is_published = ${status === 'published'}`;
  }

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM articles a WHERE ${whereClause}`,
    { values: params }
  );
  const total = parseInt(countResult.rows[0].total);

  // Get articles
  const articlesParams = [...params, limit, offset];
  const articlesResult = await db.query(
    `SELECT a.*, u.first_name || ' ' || u.last_name as author_name
     FROM articles a
     LEFT JOIN users u ON a.author_id = u.id
     WHERE ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $${articlesParams.length - 1} OFFSET $${articlesParams.length}`,
    { values: articlesParams }
  );

  return {
    articles: articlesResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

export async function toggleArticlePublished(adminId: string, articleId: string, isPublished: boolean) {
  return db.transaction(async (client) => {
    const result = await client.query(
      `UPDATE articles SET is_published = $1, published_at = $2 
       WHERE id = $3 AND deleted_at IS NULL RETURNING *`,
      [isPublished, isPublished ? new Date() : null, articleId]
    );

    if (result.rows.length === 0) {
      throw new Error('Article not found');
    }

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, isPublished ? 'PUBLISH_ARTICLE' : 'UNPUBLISH_ARTICLE', 'articles', articleId, `Article ${isPublished ? 'published' : 'unpublished'}`]
    );

    return result.rows[0];
  });
}

// Analytics & Metrics
export async function getDailyStatistics(days: number = 30): Promise<DailyStatistic[]> {
  const result = await db.query<DailyStatistic>(
    `SELECT * FROM daily_statistics 
     WHERE stat_date >= CURRENT_DATE - INTERVAL '1 day' * $1 
     ORDER BY stat_date DESC`,
    { values: [days] }
  );

  return result.rows;
}

export async function getUserGrowthData(days: number = 30) {
  const result = await db.query(
    `SELECT DATE(created_at) as date, COUNT(*) as new_users
     FROM users
     WHERE deleted_at IS NULL
     AND created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
     GROUP BY DATE(created_at)
     ORDER BY date`,
    { values: [days] }
  );

  return result.rows;
}

export async function getEventRegistrationTrends(days: number = 30) {
  const result = await db.query(
    `SELECT DATE(registered_at) as date, COUNT(*) as registrations
     FROM event_registrations
     WHERE cancelled_at IS NULL
     AND registered_at >= CURRENT_DATE - INTERVAL '1 day' * $1
     GROUP BY DATE(registered_at)
     ORDER BY date`,
    { values: [days] }
  );

  return result.rows;
}

export async function getTopEvents(limit: number = 10) {
  const result = await db.query(
    `SELECT e.id, e.title, e.event_date, e.capacity, e.registered_count,
            ROUND((e.registered_count::decimal / NULLIF(e.capacity, 0)) * 100, 2) as fill_rate
     FROM events e
     WHERE e.deleted_at IS NULL
     ORDER BY e.registered_count DESC
     LIMIT $1`,
    { values: [limit] }
  );

  return result.rows;
}

// Online Users
export async function getOnlineUsers() {
  const result = await db.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, 
            us.last_activity_at, us.device_type, us.ip_address
     FROM user_sessions us
     JOIN users u ON us.user_id = u.id
     WHERE us.is_active = TRUE
     AND us.last_activity_at > CURRENT_TIMESTAMP - INTERVAL '15 minutes'
     ORDER BY us.last_activity_at DESC`
  );

  return result.rows;
}

export async function updateUserSession(userId: string, sessionToken: string) {
  await db.query(
    `UPDATE user_sessions 
     SET last_activity_at = CURRENT_TIMESTAMP 
     WHERE user_id = $1 AND session_token = $2`,
    { values: [userId, sessionToken] }
  );
}

// Audit Logs
export async function getAdminAuditLogs(
  page: number = 1,
  limit: number = 50,
  adminId?: string,
  action?: string
) {
  const offset = (page - 1) * limit;
  let whereClause = '1=1';
  const params: unknown[] = [];
  
  if (adminId) {
    params.push(adminId);
    whereClause += ` AND aal.admin_id = $${params.length}`;
  }
  
  if (action) {
    params.push(action);
    whereClause += ` AND aal.action = $${params.length}`;
  }

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM admin_audit_logs aal WHERE ${whereClause}`,
    { values: params }
  );
  const total = parseInt(countResult.rows[0].total);

  const logsParams = [...params, limit, offset];
  const logsResult = await db.query(
    `SELECT aal.*, au.email as admin_email, au.first_name || ' ' || au.last_name as admin_name
     FROM admin_audit_logs aal
     LEFT JOIN admin_users au ON aal.admin_id = au.id
     WHERE ${whereClause}
     ORDER BY aal.created_at DESC
     LIMIT $${logsParams.length - 1} OFFSET $${logsParams.length}`,
    { values: logsParams }
  );

  return {
    logs: logsResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

// Platform Settings
export async function getPlatformSettings(publicOnly: boolean = false) {
  const result = await db.query(
    `SELECT setting_key, setting_value, setting_type, description, is_public
     FROM platform_settings
     ${publicOnly ? 'WHERE is_public = TRUE' : ''}
     ORDER BY setting_key`
  );

  return result.rows;
}

export async function updatePlatformSetting(adminId: string, key: string, value: string) {
  return db.transaction(async (client) => {
    const result = await client.query(
      `UPDATE platform_settings 
       SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE setting_key = $3
       RETURNING *`,
      [value, adminId, key]
    );

    if (result.rows.length === 0) {
      throw new Error('Setting not found');
    }

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'UPDATE_SETTING', 'platform_settings', result.rows[0].id, `Updated ${key} to ${value}`]
    );

    return result.rows[0];
  });
}

// Reports Management
export async function getReports(
  page: number = 1,
  limit: number = 20,
  status?: string
) {
  const offset = (page - 1) * limit;
  let whereClause = '1=1';
  const params: unknown[] = [];
  
  if (status) {
    params.push(status);
    whereClause += ` AND r.status = $${params.length}`;
  }

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM reports r WHERE ${whereClause}`,
    { values: params }
  ).catch(() => ({ rows: [{ total: 0 }] }));
  const total = parseInt(countResult.rows[0].total);

  const reportsParams = [...params, limit, offset];
  const reportsResult = await db.query(
    `SELECT r.*, 
            u.email as reporter_email,
            au.first_name || ' ' || au.last_name as assigned_to_name
     FROM reports r
     LEFT JOIN users u ON r.reporter_id = u.id
     LEFT JOIN admin_users au ON r.assigned_to = au.id
     WHERE ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $${reportsParams.length - 1} OFFSET $${reportsParams.length}`,
    { values: reportsParams }
  ).catch(() => ({ rows: [] }));

  return {
    reports: reportsResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

export async function updateReportStatus(
  adminId: string,
  reportId: string,
  status: string,
  resolutionNotes?: string
) {
  return db.transaction(async (client) => {
    const result = await client.query(
      `UPDATE reports 
       SET status = $1, 
           resolution_notes = $2,
           resolved_by = CASE WHEN $1 IN ('resolved', 'dismissed') THEN $3 ELSE resolved_by END,
           resolved_at = CASE WHEN $1 IN ('resolved', 'dismissed') THEN CURRENT_TIMESTAMP ELSE resolved_at END
       WHERE id = $4
       RETURNING *`,
      [status, resolutionNotes, adminId, reportId]
    );

    if (result.rows.length === 0) {
      throw new Error('Report not found');
    }

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'UPDATE_REPORT', 'reports', reportId, `Updated report status to ${status}`]
    );

    return result.rows[0];
  });
}

// Admin User Management (for super admins)
export async function createAdminUser(
  creatorId: string,
  data: { email: string; password: string; first_name: string; last_name: string; role: string }
) {
  return db.transaction(async (client) => {
    // Hash password
    const passwordHash = await argon2.hash(data.password);

    const result = await client.query(
      `INSERT INTO admin_users (email, password_hash, first_name, last_name, role, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [data.email, passwordHash, data.first_name, data.last_name, data.role, creatorId]
    );

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [creatorId, 'CREATE_ADMIN', 'admin_users', result.rows[0].id, `Created admin user: ${data.email}`]
    );

    return result.rows[0];
  });
}

export async function getAdminUsers() {
  const result = await db.query(
    `SELECT id, email, first_name, last_name, role, is_active, last_login_at, login_count, created_at
     FROM admin_users
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );

  return result.rows;
}

export async function updateAdminRole(adminId: string, targetAdminId: string, role: string) {
  return db.transaction(async (client) => {
    const result = await client.query(
      `UPDATE admin_users SET role = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *`,
      [role, targetAdminId]
    );

    if (result.rows.length === 0) {
      throw new Error('Admin user not found');
    }

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'UPDATE_ADMIN_ROLE', 'admin_users', targetAdminId, `Updated role to ${role}`]
    );

    return result.rows[0];
  });
}

// Aggregate stats function (call daily via cron)
export async function aggregateDailyStats() {
  await db.query(`SELECT aggregate_daily_statistics(CURRENT_DATE)`);
}
