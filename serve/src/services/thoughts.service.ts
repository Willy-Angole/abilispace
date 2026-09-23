import { db } from '../database/pool';
import { Errors } from '../middleware/error-handler';

export interface ThoughtAuthor {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
}

export interface ThoughtOriginal {
    id: string;
    body: string;
    createdAt: string;
    author: ThoughtAuthor;
}

export interface Thought {
    id: string;
    body: string;
    createdAt: string;
    author: ThoughtAuthor;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    likedByMe: boolean;
    sharedByMe: boolean;
    followingAuthor: boolean;
    original?: ThoughtOriginal;
}

export interface ThoughtComment {
    id: string;
    thoughtId: string;
    body: string;
    createdAt: string;
    author: ThoughtAuthor;
    mine: boolean;
}

interface ThoughtRow {
    id: string;
    body: string;
    createdAt: string;
    authorId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    likeCount: string;
    commentCount: string;
    shareCount: string;
    likedByMe: boolean;
    sharedByMe: boolean;
    followingAuthor: boolean;
    originalId: string | null;
    originalBody: string | null;
    originalCreatedAt: string | null;
    originalAuthorId: string | null;
    originalFirstName: string | null;
    originalLastName: string | null;
    originalAvatarUrl: string | null;
}

function mapThought(row: ThoughtRow): Thought {
    const thought: Thought = {
        id: row.id,
        body: row.body,
        createdAt: new Date(row.createdAt).toISOString(),
        author: {
            id: row.authorId,
            firstName: row.firstName,
            lastName: row.lastName,
            avatarUrl: row.avatarUrl || undefined,
        },
        likeCount: Number(row.likeCount),
        commentCount: Number(row.commentCount),
        shareCount: Number(row.shareCount),
        likedByMe: row.likedByMe,
        sharedByMe: row.sharedByMe,
        followingAuthor: row.followingAuthor,
    };
    if (row.originalId && row.originalBody && row.originalAuthorId) {
        thought.original = {
            id: row.originalId,
            body: row.originalBody,
            createdAt: new Date(row.originalCreatedAt || row.createdAt).toISOString(),
            author: {
                id: row.originalAuthorId,
                firstName: row.originalFirstName || '',
                lastName: row.originalLastName || '',
                avatarUrl: row.originalAvatarUrl || undefined,
            },
        };
    }
    return thought;
}

const THOUGHT_SELECT = `
    SELECT t.id, t.body, t.created_at AS "createdAt",
           u.id AS "authorId", u.first_name AS "firstName", u.last_name AS "lastName", u.avatar_url AS "avatarUrl",
           (SELECT COUNT(*) FROM thought_likes tl WHERE tl.thought_id = t.id) AS "likeCount",
           (SELECT COUNT(*) FROM thought_comments tc WHERE tc.thought_id = t.id AND tc.deleted_at IS NULL) AS "commentCount",
           (SELECT COUNT(*) FROM thoughts sh WHERE sh.shared_thought_id = COALESCE(t.shared_thought_id, t.id) AND sh.deleted_at IS NULL) AS "shareCount",
           EXISTS(SELECT 1 FROM thought_likes tl WHERE tl.thought_id = t.id AND tl.user_id = $1) AS "likedByMe",
           EXISTS(SELECT 1 FROM thoughts sh WHERE sh.author_id = $1 AND sh.shared_thought_id = COALESCE(t.shared_thought_id, t.id) AND sh.deleted_at IS NULL) AS "sharedByMe",
           EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = u.id) AS "followingAuthor",
           o.id AS "originalId", o.body AS "originalBody", o.created_at AS "originalCreatedAt",
           ou.id AS "originalAuthorId", ou.first_name AS "originalFirstName",
           ou.last_name AS "originalLastName", ou.avatar_url AS "originalAvatarUrl"
    FROM thoughts t
    JOIN users u ON u.id = t.author_id
    LEFT JOIN thoughts o ON o.id = t.shared_thought_id AND o.deleted_at IS NULL
    LEFT JOIN users ou ON ou.id = o.author_id
`;

export async function listThoughts(
    userId: string,
    feed: 'community' | 'following',
    limit: number,
    before?: string
): Promise<Thought[]> {
    const params: unknown[] = [userId];
    let where = 't.deleted_at IS NULL AND u.deleted_at IS NULL AND u.is_active = TRUE';
    if (feed === 'following') {
        params.push(userId);
        where += ` AND (t.author_id = $${params.length} OR t.author_id IN (SELECT following_id FROM follows WHERE follower_id = $${params.length}))`;
    }
    if (before) {
        params.push(before);
        where += ` AND t.created_at < $${params.length}`;
    }
    params.push(limit);
    const result = await db.query<ThoughtRow>(
        `${THOUGHT_SELECT} WHERE ${where} ORDER BY t.created_at DESC LIMIT $${params.length}`,
        { values: params }
    );
    return result.rows.map(mapThought);
}

async function getThought(userId: string, thoughtId: string): Promise<Thought> {
    const result = await db.query<ThoughtRow>(
        `${THOUGHT_SELECT} WHERE t.id = $2 AND t.deleted_at IS NULL`,
        { values: [userId, thoughtId] }
    );
    if (!result.rows[0]) throw Errors.notFound('Thought');
    return mapThought(result.rows[0]);
}

export async function createThought(userId: string, body: string): Promise<Thought> {
    const inserted = await db.query<{ id: string }>(
        `INSERT INTO thoughts (author_id, body) VALUES ($1, $2) RETURNING id`,
        { values: [userId, body] }
    );
    return getThought(userId, inserted.rows[0].id);
}

export async function deleteThought(userId: string, thoughtId: string): Promise<void> {
    const result = await db.query(
        `UPDATE thoughts SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND author_id = $2 AND deleted_at IS NULL`,
        { values: [thoughtId, userId] }
    );
    if (!result.rowCount) throw Errors.notFound('Thought');
}

export async function listComments(userId: string, thoughtId: string): Promise<ThoughtComment[]> {
    await getThought(userId, thoughtId);
    const result = await db.query<{
        id: string;
        thoughtId: string;
        body: string;
        createdAt: string;
        authorId: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
    }>(
        `SELECT c.id, c.thought_id AS "thoughtId", c.body, c.created_at AS "createdAt",
                u.id AS "authorId", u.first_name AS "firstName", u.last_name AS "lastName", u.avatar_url AS "avatarUrl"
         FROM thought_comments c
         JOIN users u ON u.id = c.author_id
         WHERE c.thought_id = $1 AND c.deleted_at IS NULL
         ORDER BY c.created_at ASC`,
        { values: [thoughtId] }
    );
    return result.rows.map((row) => ({
        id: row.id,
        thoughtId: row.thoughtId,
        body: row.body,
        createdAt: new Date(row.createdAt).toISOString(),
        author: {
            id: row.authorId,
            firstName: row.firstName,
            lastName: row.lastName,
            avatarUrl: row.avatarUrl || undefined,
        },
        mine: row.authorId === userId,
    }));
}

export async function addComment(userId: string, thoughtId: string, body: string): Promise<ThoughtComment> {
    await getThought(userId, thoughtId);
    const inserted = await db.query<{ id: string }>(
        `INSERT INTO thought_comments (thought_id, author_id, body) VALUES ($1, $2, $3) RETURNING id`,
        { values: [thoughtId, userId, body] }
    );
    const comments = await listComments(userId, thoughtId);
    const created = comments.find((comment) => comment.id === inserted.rows[0].id);
    if (!created) throw Errors.internal();
    return created;
}

export async function deleteComment(userId: string, thoughtId: string, commentId: string): Promise<void> {
    const result = await db.query(
        `UPDATE thought_comments SET deleted_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND thought_id = $2 AND author_id = $3 AND deleted_at IS NULL`,
        { values: [commentId, thoughtId, userId] }
    );
    if (!result.rowCount) throw Errors.notFound('Comment');
}

export async function likeThought(userId: string, thoughtId: string): Promise<Thought> {
    await getThought(userId, thoughtId);
    await db.query(
        `INSERT INTO thought_likes (thought_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        { values: [thoughtId, userId] }
    );
    return getThought(userId, thoughtId);
}

export async function unlikeThought(userId: string, thoughtId: string): Promise<Thought> {
    await db.query(
        `DELETE FROM thought_likes WHERE thought_id = $1 AND user_id = $2`,
        { values: [thoughtId, userId] }
    );
    return getThought(userId, thoughtId);
}

export async function shareThought(userId: string, thoughtId: string): Promise<Thought> {
    const source = await getThought(userId, thoughtId);
    const originalId = source.original?.id || source.id;
    if (source.author.id === userId && !source.original) {
        throw Errors.badRequest('Share someone else\'s thought');
    }
    try {
        const inserted = await db.query<{ id: string }>(
            `INSERT INTO thoughts (author_id, body, shared_thought_id)
             SELECT $1, 'Shared a thought', o.id FROM thoughts o
             WHERE o.id = $2 AND o.deleted_at IS NULL
             RETURNING id`,
            { values: [userId, originalId] }
        );
        if (!inserted.rows[0]) throw Errors.notFound('Thought');
        return getThought(userId, inserted.rows[0].id);
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === '23505') {
            const existing = await db.query<{ id: string }>(
                `SELECT id FROM thoughts WHERE author_id = $1 AND shared_thought_id = $2 AND deleted_at IS NULL`,
                { values: [userId, originalId] }
            );
            if (existing.rows[0]) return getThought(userId, existing.rows[0].id);
        }
        throw error;
    }
}

export async function unshareThought(userId: string, thoughtId: string): Promise<void> {
    const source = await getThought(userId, thoughtId);
    const originalId = source.original?.id || source.id;
    await db.query(
        `UPDATE thoughts SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE author_id = $1 AND shared_thought_id = $2 AND deleted_at IS NULL`,
        { values: [userId, originalId] }
    );
}

export async function followUser(userId: string, targetId: string): Promise<void> {
    if (userId === targetId) throw Errors.badRequest('You cannot follow yourself');
    const user = await db.query(
        `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL AND is_active = TRUE`,
        { values: [targetId] }
    );
    if (!user.rowCount) throw Errors.notFound('User');
    await db.query(
        `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        { values: [userId, targetId] }
    );
}

export async function unfollowUser(userId: string, targetId: string): Promise<void> {
    await db.query(
        `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
        { values: [userId, targetId] }
    );
}
