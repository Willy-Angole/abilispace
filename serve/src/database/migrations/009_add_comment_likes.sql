-- Likes on individual comments.

CREATE TABLE IF NOT EXISTS thought_comment_likes (
    comment_id UUID NOT NULL REFERENCES thought_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id, user_id)
);
