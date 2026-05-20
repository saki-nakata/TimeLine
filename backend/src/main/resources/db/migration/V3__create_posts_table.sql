CREATE TABLE posts (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    VARCHAR(280) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT posts_content_not_empty CHECK (char_length(content) >= 1)
);

CREATE INDEX idx_posts_id_desc ON posts(id DESC);
CREATE INDEX idx_posts_user_id ON posts(user_id);
