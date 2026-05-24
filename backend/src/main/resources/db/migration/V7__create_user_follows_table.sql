CREATE TABLE user_follows (
    follower_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_follows_pkey PRIMARY KEY (follower_id, following_id),
    CONSTRAINT user_follows_no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_user_follows_follower_id  ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following_id ON user_follows(following_id);
