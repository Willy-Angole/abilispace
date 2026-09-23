-- Community thoughts: posts, comments, likes, shares, and follows.

CREATE TABLE IF NOT EXISTS thoughts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    shared_thought_id UUID REFERENCES thoughts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS thoughts_one_share_per_user
    ON thoughts (author_id, shared_thought_id)
    WHERE shared_thought_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS thoughts_created_idx
    ON thoughts (created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS thoughts_author_idx
    ON thoughts (author_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS thought_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thought_id UUID NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS thought_comments_thought_idx
    ON thought_comments (thought_id, created_at)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS thought_likes (
    thought_id UUID NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (thought_id, user_id)
);

CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS follows_following_idx ON follows (following_id);
