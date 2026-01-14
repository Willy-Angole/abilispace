"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLogin = adminLogin;
exports.adminLogout = adminLogout;
exports.getDashboardStats = getDashboardStats;
exports.getAllUsers = getAllUsers;
exports.getUserById = getUserById;
exports.toggleUserStatus = toggleUserStatus;
exports.deleteUser = deleteUser;
exports.getAllEvents = getAllEvents;
exports.getEventRegistrations = getEventRegistrations;
exports.toggleEventPublished = toggleEventPublished;
exports.toggleEventFeatured = toggleEventFeatured;
exports.getAllArticles = getAllArticles;
exports.toggleArticlePublished = toggleArticlePublished;
exports.getDailyStatistics = getDailyStatistics;
exports.getUserGrowthData = getUserGrowthData;
exports.getEventRegistrationTrends = getEventRegistrationTrends;
exports.getTopEvents = getTopEvents;
exports.getOnlineUsers = getOnlineUsers;
exports.updateUserSession = updateUserSession;
exports.getAdminAuditLogs = getAdminAuditLogs;
exports.getPlatformSettings = getPlatformSettings;
exports.updatePlatformSetting = updatePlatformSetting;
exports.getReports = getReports;
exports.updateReportStatus = updateReportStatus;
exports.createAdminUser = createAdminUser;
exports.getAdminUsers = getAdminUsers;
exports.updateAdminRole = updateAdminRole;
exports.aggregateDailyStats = aggregateDailyStats;
exports.createEvent = createEvent;
exports.deleteEvent = deleteEvent;
exports.createArticle = createArticle;
exports.deleteArticle = deleteArticle;
exports.getAccessibilityFeatures = getAccessibilityFeatures;
exports.getEventCategories = getEventCategories;
exports.getArticleCategories = getArticleCategories;
const pool_1 = require("../database/pool");
const argon2_1 = __importDefault(require("argon2"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
const crypto_1 = __importDefault(require("crypto"));
// Environment shorthand
const JWT_SECRET = environment_1.config.jwt.secret;
// Admin Authentication
async function adminLogin(email, password, ipAddress, userAgent) {
    return pool_1.db.transaction(async (client) => {
        // Find admin user
        const adminResult = await client.query(`SELECT id, email, password_hash, first_name, last_name, role, is_active, 
              failed_login_attempts, locked_until
       FROM admin_users 
       WHERE email = $1 AND deleted_at IS NULL`, [email]);
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
        const isValidPassword = await argon2_1.default.verify(admin.password_hash, password);
        if (!isValidPassword) {
            // Increment failed attempts
            await client.query(`UPDATE admin_users 
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = CASE WHEN failed_login_attempts >= 4 
                           THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' 
                           ELSE NULL END
         WHERE id = $1`, [admin.id]);
            throw new Error('Invalid credentials');
        }
        // Reset failed attempts and update login info
        await client.query(`UPDATE admin_users 
       SET failed_login_attempts = 0, 
           locked_until = NULL,
           last_login_at = CURRENT_TIMESTAMP,
           login_count = login_count + 1
       WHERE id = $1`, [admin.id]);
        // Generate tokens
        const accessToken = jsonwebtoken_1.default.sign({
            sub: admin.id,
            email: admin.email,
            role: admin.role,
            type: 'admin'
        }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = crypto_1.default.randomBytes(64).toString('hex');
        const refreshTokenHash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
        // Store refresh token
        await client.query(`INSERT INTO admin_refresh_tokens (admin_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '7 days', $3, $4)`, [admin.id, refreshTokenHash, ipAddress, userAgent]);
        // Log the login
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [admin.id, 'LOGIN', 'admin_users', admin.id, 'Admin login successful', ipAddress, userAgent]);
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
async function adminLogout(adminId, refreshToken) {
    const refreshTokenHash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
    await pool_1.db.query(`UPDATE admin_refresh_tokens 
     SET revoked_at = CURRENT_TIMESTAMP 
     WHERE admin_id = $1 AND token_hash = $2`, { values: [adminId, refreshTokenHash] });
}
// Dashboard Statistics
async function getDashboardStats() {
    // Get all stats in parallel using db.batchQuery or separate queries
    const [usersResult, activeUsersResult, onlineUsersResult, newUsersTodayResult, eventsResult, upcomingEventsResult, registrationsResult, articlesResult, messagesResult, reportsResult] = await Promise.all([
        // Total users
        pool_1.db.query(`SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`),
        // Active users (logged in within last 30 days)
        pool_1.db.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE deleted_at IS NULL 
      AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
    `),
        // Online users (active session in last 15 minutes)
        pool_1.db.query(`
      SELECT COUNT(DISTINCT user_id) as count FROM user_sessions 
      WHERE is_active = TRUE 
      AND last_activity_at > CURRENT_TIMESTAMP - INTERVAL '15 minutes'
    `).catch(() => ({ rows: [{ count: 0 }] })),
        // New users today
        pool_1.db.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE deleted_at IS NULL 
      AND DATE(created_at) = CURRENT_DATE
    `),
        // Total events
        pool_1.db.query(`SELECT COUNT(*) as count FROM events WHERE deleted_at IS NULL`),
        // Upcoming events
        pool_1.db.query(`
      SELECT COUNT(*) as count FROM events 
      WHERE deleted_at IS NULL 
      AND event_date > CURRENT_DATE
    `),
        // Total registrations
        pool_1.db.query(`SELECT COUNT(*) as count FROM event_registrations WHERE cancelled_at IS NULL`),
        // Total articles
        pool_1.db.query(`SELECT COUNT(*) as count FROM articles WHERE deleted_at IS NULL`),
        // Total messages
        pool_1.db.query(`SELECT COUNT(*) as count FROM messages WHERE deleted_at IS NULL`),
        // Pending reports (if table exists, otherwise return 0)
        pool_1.db.query(`
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
async function getAllUsers(page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'desc') {
    const offset = (page - 1) * limit;
    let whereClause = 'deleted_at IS NULL';
    const params = [];
    if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`;
    }
    // Validate sort column
    const validSortColumns = ['created_at', 'email', 'first_name', 'last_name', 'last_login_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    // Get total count
    const countResult = await pool_1.db.query(`SELECT COUNT(*) as total FROM users WHERE ${whereClause}`, { values: params });
    const total = parseInt(countResult.rows[0].total);
    // Get users with related stats
    const usersParams = [...params, limit, offset];
    const usersResult = await pool_1.db.query(`SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, 
            u.last_login_at, u.created_at,
            (SELECT COUNT(*) FROM event_registrations er WHERE er.user_id = u.id AND er.cancelled_at IS NULL)::int as events_registered,
            (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id AND m.deleted_at IS NULL)::int as messages_sent
     FROM users u
     WHERE ${whereClause}
     ORDER BY ${sortColumn} ${order}
     LIMIT $${usersParams.length - 1} OFFSET $${usersParams.length}`, { values: usersParams });
    return {
        users: usersResult.rows,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
}
async function getUserById(userId) {
    const result = await pool_1.db.query(`SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, 
            u.last_login_at, u.created_at,
            (SELECT COUNT(*) FROM event_registrations er WHERE er.user_id = u.id AND er.cancelled_at IS NULL)::int as events_registered,
            (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id AND m.deleted_at IS NULL)::int as messages_sent
     FROM users u
     WHERE u.id = $1 AND u.deleted_at IS NULL`, { values: [userId] });
    return result.rows[0] || null;
}
async function toggleUserStatus(adminId, userId, isActive) {
    return pool_1.db.transaction(async (client) => {
        const result = await client.query(`UPDATE users SET is_active = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *`, [isActive, userId]);
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [adminId, isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', 'users', userId, `User ${isActive ? 'activated' : 'deactivated'}`]);
        return result.rows[0];
    });
}
async function deleteUser(adminId, userId) {
    return pool_1.db.transaction(async (client) => {
        const result = await client.query(`UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`, [userId]);
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [adminId, 'DELETE_USER', 'users', userId, 'User soft deleted']);
        return result.rows[0];
    });
}
// Event Management
async function getAllEvents(page = 1, limit = 20, search, status) {
    const offset = (page - 1) * limit;
    let whereClause = 'e.deleted_at IS NULL';
    const params = [];
    if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (e.title ILIKE $${params.length} OR e.description ILIKE $${params.length})`;
    }
    if (status && status !== 'all') {
        if (status === 'upcoming') {
            whereClause += ` AND e.event_date > CURRENT_DATE`;
        }
        else if (status === 'ongoing') {
            whereClause += ` AND e.event_date <= CURRENT_DATE AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE)`;
        }
        else if (status === 'past') {
            whereClause += ` AND (e.end_date < CURRENT_DATE OR (e.end_date IS NULL AND e.event_date < CURRENT_DATE))`;
        }
    }
    // Get total count
    const countResult = await pool_1.db.query(`SELECT COUNT(*) as total FROM events e WHERE ${whereClause}`, { values: params });
    const total = parseInt(countResult.rows[0].total);
    // Get events with registration count
    const eventsParams = [...params, limit, offset];
    const eventsResult = await pool_1.db.query(`SELECT e.*, 
            (SELECT COUNT(*) FROM event_registrations er 
             WHERE er.event_id = e.id AND er.cancelled_at IS NULL)::int as registration_count,
            u.first_name || ' ' || u.last_name as organizer_name
     FROM events e
     LEFT JOIN users u ON e.organizer_id = u.id
     WHERE ${whereClause}
     ORDER BY e.event_date DESC
     LIMIT $${eventsParams.length - 1} OFFSET $${eventsParams.length}`, { values: eventsParams });
    return {
        events: eventsResult.rows,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
}
async function getEventRegistrations(eventId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    // Get event details
    const eventResult = await pool_1.db.query(`SELECT id, title, event_date, end_date, capacity, registered_count 
     FROM events WHERE id = $1 AND deleted_at IS NULL`, { values: [eventId] });
    if (eventResult.rows.length === 0) {
        throw new Error('Event not found');
    }
    // Get total count
    const countResult = await pool_1.db.query(`SELECT COUNT(*) as total FROM event_registrations WHERE event_id = $1 AND cancelled_at IS NULL`, { values: [eventId] });
    const total = parseInt(countResult.rows[0].total);
    // Get registrations with full user details
    const registrationsResult = await pool_1.db.query(`SELECT er.id as registration_id, er.user_id, u.email as user_email, 
            u.first_name, u.last_name, u.phone, u.location,
            u.disability_type, u.accessibility_needs, u.communication_preference,
            u.emergency_contact, er.accommodation_notes,
            er.registered_at, er.attendance_status, er.attended
     FROM event_registrations er
     JOIN users u ON er.user_id = u.id
     WHERE er.event_id = $1 AND er.cancelled_at IS NULL
     ORDER BY er.registered_at DESC
     LIMIT $2 OFFSET $3`, { values: [eventId, limit, offset] });
    return {
        event: eventResult.rows[0],
        registrations: registrationsResult.rows,
        total
    };
}
async function toggleEventPublished(adminId, eventId, isPublished) {
    return pool_1.db.transaction(async (client) => {
        const result = await client.query(`UPDATE events SET is_published = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *`, [isPublished, eventId]);
        if (result.rows.length === 0) {
            throw new Error('Event not found');
        }
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [adminId, isPublished ? 'PUBLISH_EVENT' : 'UNPUBLISH_EVENT', 'events', eventId, `Event ${isPublished ? 'published' : 'unpublished'}`]);
        return result.rows[0];
    });
}
async function toggleEventFeatured(adminId, eventId, isFeatured) {
    return pool_1.db.transaction(async (client) => {
        const result = await client.query(`UPDATE events SET is_featured = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *`, [isFeatured, eventId]);
        if (result.rows.length === 0) {
            throw new Error('Event not found');
        }
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [adminId, isFeatured ? 'FEATURE_EVENT' : 'UNFEATURE_EVENT', 'events', eventId, `Event ${isFeatured ? 'featured' : 'unfeatured'}`]);
        return result.rows[0];
    });
}
// Article Management
async function getAllArticles(page = 1, limit = 20, search, status) {
    const offset = (page - 1) * limit;
    let whereClause = 'a.deleted_at IS NULL';
    const params = [];
    if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (a.title ILIKE $${params.length} OR a.content ILIKE $${params.length})`;
    }
    if (status && status !== 'all') {
        whereClause += ` AND a.is_published = ${status === 'published'}`;
    }
    // Get total count
    const countResult = await pool_1.db.query(`SELECT COUNT(*) as total FROM articles a WHERE ${whereClause}`, { values: params });
    const total = parseInt(countResult.rows[0].total);
    // Get articles
    const articlesParams = [...params, limit, offset];
    const articlesResult = await pool_1.db.query(`SELECT a.*, u.first_name || ' ' || u.last_name as author_name
     FROM articles a
     LEFT JOIN users u ON a.author_id = u.id
     WHERE ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $${articlesParams.length - 1} OFFSET $${articlesParams.length}`, { values: articlesParams });
    return {
        articles: articlesResult.rows,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
}
async function toggleArticlePublished(adminId, articleId, isPublished) {
    return pool_1.db.transaction(async (client) => {
        const result = await client.query(`UPDATE articles SET is_published = $1, published_at = $2 
       WHERE id = $3 AND deleted_at IS NULL RETURNING *`, [isPublished, isPublished ? new Date() : null, articleId]);
        if (result.rows.length === 0) {
            throw new Error('Article not found');
        }
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [adminId, isPublished ? 'PUBLISH_ARTICLE' : 'UNPUBLISH_ARTICLE', 'articles', articleId, `Article ${isPublished ? 'published' : 'unpublished'}`]);
        return result.rows[0];
    });
}
// Analytics & Metrics
async function getDailyStatistics(days = 30) {
    const result = await pool_1.db.query(`SELECT * FROM daily_statistics 
     WHERE stat_date >= CURRENT_DATE - INTERVAL '1 day' * $1 
     ORDER BY stat_date DESC`, { values: [days] });
    return result.rows;
}
async function getUserGrowthData(days = 30) {
    const result = await pool_1.db.query(`SELECT DATE(created_at) as date, COUNT(*) as new_users
     FROM users
     WHERE deleted_at IS NULL
     AND created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
     GROUP BY DATE(created_at)
     ORDER BY date`, { values: [days] });
    return result.rows;
}
async function getEventRegistrationTrends(days = 30) {
    const result = await pool_1.db.query(`SELECT DATE(registered_at) as date, COUNT(*) as registrations
     FROM event_registrations
     WHERE cancelled_at IS NULL
     AND registered_at >= CURRENT_DATE - INTERVAL '1 day' * $1
     GROUP BY DATE(registered_at)
     ORDER BY date`, { values: [days] });
    return result.rows;
}
async function getTopEvents(limit = 10) {
    const result = await pool_1.db.query(`SELECT e.id, e.title, e.event_date, e.capacity, e.registered_count,
            ROUND((e.registered_count::decimal / NULLIF(e.capacity, 0)) * 100, 2) as fill_rate
     FROM events e
     WHERE e.deleted_at IS NULL
     ORDER BY e.registered_count DESC
     LIMIT $1`, { values: [limit] });
    return result.rows;
}
// Online Users
async function getOnlineUsers() {
    const result = await pool_1.db.query(`SELECT u.id, u.email, u.first_name, u.last_name, 
            us.last_activity_at, us.device_type, us.ip_address
     FROM user_sessions us
     JOIN users u ON us.user_id = u.id
     WHERE us.is_active = TRUE
     AND us.last_activity_at > CURRENT_TIMESTAMP - INTERVAL '15 minutes'
     ORDER BY us.last_activity_at DESC`);
    return result.rows;
}
async function updateUserSession(userId, sessionToken) {
    await pool_1.db.query(`UPDATE user_sessions 
     SET last_activity_at = CURRENT_TIMESTAMP 
     WHERE user_id = $1 AND session_token = $2`, { values: [userId, sessionToken] });
}
// Audit Logs
async function getAdminAuditLogs(page = 1, limit = 50, adminId, action) {
    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params = [];
    if (adminId) {
        params.push(adminId);
        whereClause += ` AND aal.admin_id = $${params.length}`;
    }
    if (action) {
        params.push(action);
        whereClause += ` AND aal.action = $${params.length}`;
    }
    const countResult = await pool_1.db.query(`SELECT COUNT(*) as total FROM admin_audit_logs aal WHERE ${whereClause}`, { values: params });
    const total = parseInt(countResult.rows[0].total);
    const logsParams = [...params, limit, offset];
    const logsResult = await pool_1.db.query(`SELECT aal.*, au.email as admin_email, au.first_name || ' ' || au.last_name as admin_name
     FROM admin_audit_logs aal
     LEFT JOIN admin_users au ON aal.admin_id = au.id
     WHERE ${whereClause}
     ORDER BY aal.created_at DESC
     LIMIT $${logsParams.length - 1} OFFSET $${logsParams.length}`, { values: logsParams });
    return {
        logs: logsResult.rows,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
}
// Platform Settings
async function getPlatformSettings(publicOnly = false) {
    const result = await pool_1.db.query(`SELECT setting_key, setting_value, setting_type, description, is_public
     FROM platform_settings
     ${publicOnly ? 'WHERE is_public = TRUE' : ''}
     ORDER BY setting_key`);
    return result.rows;
}
async function updatePlatformSetting(adminId, key, value) {
    return pool_1.db.transaction(async (client) => {
        const result = await client.query(`UPDATE platform_settings 
       SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE setting_key = $3
       RETURNING *`, [value, adminId, key]);
        if (result.rows.length === 0) {
            throw new Error('Setting not found');
        }
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [adminId, 'UPDATE_SETTING', 'platform_settings', result.rows[0].id, `Updated ${key} to ${value}`]);
        return result.rows[0];
    });
}
// Reports Management
async function getReports(page = 1, limit = 20, status) {
    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params = [];
    if (status) {
        params.push(status);
        whereClause += ` AND r.status = $${params.length}`;
    }
    const countResult = await pool_1.db.query(`SELECT COUNT(*) as total FROM reports r WHERE ${whereClause}`, { values: params }).catch(() => ({ rows: [{ total: 0 }] }));
    const total = parseInt(countResult.rows[0].total);
    const reportsParams = [...params, limit, offset];
    const reportsResult = await pool_1.db.query(`SELECT r.*, 
            u.email as reporter_email,
            au.first_name || ' ' || au.last_name as assigned_to_name
     FROM reports r
     LEFT JOIN users u ON r.reporter_id = u.id
     LEFT JOIN admin_users au ON r.assigned_to = au.id
     WHERE ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $${reportsParams.length - 1} OFFSET $${reportsParams.length}`, { values: reportsParams }).catch(() => ({ rows: [] }));
    return {
        reports: reportsResult.rows,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
}
async function updateReportStatus(adminId, reportId, status, resolutionNotes) {
    return pool_1.db.transaction(async (client) => {
        const result = await client.query(`UPDATE reports 
       SET status = $1, 
           resolution_notes = $2,
           resolved_by = CASE WHEN $1 IN ('resolved', 'dismissed') THEN $3 ELSE resolved_by END,
           resolved_at = CASE WHEN $1 IN ('resolved', 'dismissed') THEN CURRENT_TIMESTAMP ELSE resolved_at END
       WHERE id = $4
       RETURNING *`, [status, resolutionNotes, adminId, reportId]);
        if (result.rows.length === 0) {
            throw new Error('Report not found');
        }
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [adminId, 'UPDATE_REPORT', 'reports', reportId, `Updated report status to ${status}`]);
        return result.rows[0];
    });
}
// Admin User Management (for super admins)
async function createAdminUser(creatorId, data) {
    return pool_1.db.transaction(async (client) => {
        // Hash password
        const passwordHash = await argon2_1.default.hash(data.password);
        const result = await client.query(`INSERT INTO admin_users (email, password_hash, first_name, last_name, role, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, role, created_at`, [data.email, passwordHash, data.first_name, data.last_name, data.role, creatorId]);
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [creatorId, 'CREATE_ADMIN', 'admin_users', result.rows[0].id, `Created admin user: ${data.email}`]);
        return result.rows[0];
    });
}
async function getAdminUsers() {
    const result = await pool_1.db.query(`SELECT id, email, first_name, last_name, role, is_active, last_login_at, login_count, created_at
     FROM admin_users
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`);
    return result.rows;
}
async function updateAdminRole(adminId, targetAdminId, role) {
    return pool_1.db.transaction(async (client) => {
        const result = await client.query(`UPDATE admin_users SET role = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *`, [role, targetAdminId]);
        if (result.rows.length === 0) {
            throw new Error('Admin user not found');
        }
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [adminId, 'UPDATE_ADMIN_ROLE', 'admin_users', targetAdminId, `Updated role to ${role}`]);
        return result.rows[0];
    });
}
// Aggregate stats function (call daily via cron)
async function aggregateDailyStats() {
    await pool_1.db.query(`SELECT aggregate_daily_statistics(CURRENT_DATE)`);
}
async function createEvent(adminId, data) {
    return pool_1.db.transaction(async (client) => {
        // Insert the event
        const result = await client.query(`INSERT INTO events (
        title, description, event_date, event_time, end_date, end_time,
        location, virtual_link, event_type, category, capacity,
        organizer_name, image_url, image_alt, is_featured, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`, [
            data.title,
            data.description,
            data.eventDate,
            data.eventTime,
            data.endDate || null,
            data.endTime || null,
            data.location || null,
            data.virtualLink || null,
            data.eventType,
            data.category,
            data.capacity,
            data.organizerName,
            data.imageUrl || null,
            data.imageAlt || null,
            data.isFeatured || false,
            data.isPublished !== false
        ]);
        const event = result.rows[0];
        // Handle accessibility features
        if (data.accessibilityFeatures && data.accessibilityFeatures.length > 0) {
            for (const featureName of data.accessibilityFeatures) {
                // Get or create the accessibility feature
                const featureResult = await client.query(`INSERT INTO accessibility_features (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`, [featureName]);
                const featureId = featureResult.rows[0].id;
                // Link to event
                await client.query(`INSERT INTO event_accessibility_features (event_id, feature_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`, [event.id, featureId]);
            }
        }
        // Handle tags
        if (data.tags && data.tags.length > 0) {
            for (const tagName of data.tags) {
                // Get or create the tag
                const tagResult = await client.query(`INSERT INTO event_tags (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`, [tagName]);
                const tagId = tagResult.rows[0].id;
                // Link to event
                await client.query(`INSERT INTO event_tag_relations (event_id, tag_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`, [event.id, tagId]);
            }
        }
        // Log the action
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [adminId, 'CREATE_EVENT', 'events', event.id, `Created event: ${data.title}`]);
        return event;
    });
}
async function deleteEvent(adminId, eventId) {
    return pool_1.db.transaction(async (client) => {
        const result = await client.query(`UPDATE events SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *`, [eventId]);
        if (result.rows.length === 0) {
            throw new Error('Event not found');
        }
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [adminId, 'DELETE_EVENT', 'events', eventId, `Deleted event: ${result.rows[0].title}`]);
        return result.rows[0];
    });
}
async function createArticle(adminId, data) {
    return pool_1.db.transaction(async (client) => {
        // Insert the article
        const result = await client.query(`INSERT INTO articles (
        title, summary, content, category, source, source_url, author,
        region, priority, read_time_minutes, image_url, image_alt,
        has_audio, audio_url, has_video, video_url, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`, [
            data.title,
            data.summary,
            data.content,
            data.category,
            data.source,
            data.sourceUrl || null,
            data.author || null,
            data.region || 'national',
            data.priority || 'medium',
            data.readTimeMinutes || 5,
            data.imageUrl || null,
            data.imageAlt || null,
            data.hasAudio || false,
            data.audioUrl || null,
            data.hasVideo || false,
            data.videoUrl || null,
            data.isPublished !== false
        ]);
        const article = result.rows[0];
        // Handle tags
        if (data.tags && data.tags.length > 0) {
            for (const tagName of data.tags) {
                // Get or create the tag
                const tagResult = await client.query(`INSERT INTO article_tags (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`, [tagName]);
                const tagId = tagResult.rows[0].id;
                // Link to article
                await client.query(`INSERT INTO article_tag_relations (article_id, tag_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`, [article.id, tagId]);
            }
        }
        // Log the action
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [adminId, 'CREATE_ARTICLE', 'articles', article.id, `Created article: ${data.title}`]);
        return article;
    });
}
async function deleteArticle(adminId, articleId) {
    return pool_1.db.transaction(async (client) => {
        const result = await client.query(`UPDATE articles SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *`, [articleId]);
        if (result.rows.length === 0) {
            throw new Error('Article not found');
        }
        await client.query(`INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`, [adminId, 'DELETE_ARTICLE', 'articles', articleId, `Deleted article: ${result.rows[0].title}`]);
        return result.rows[0];
    });
}
// Get accessibility features list
async function getAccessibilityFeatures() {
    const result = await pool_1.db.query(`SELECT id, name, description, icon FROM accessibility_features ORDER BY name`);
    return result.rows;
}
// Get event categories
async function getEventCategories() {
    return [
        'technology', 'advocacy', 'sports', 'health', 'arts',
        'education', 'social', 'employment', 'legal'
    ];
}
// Get article categories
async function getArticleCategories() {
    return [
        'policy', 'technology', 'legal', 'medical', 'housing',
        'digital_rights', 'education', 'employment'
    ];
}
//# sourceMappingURL=admin.service.js.map