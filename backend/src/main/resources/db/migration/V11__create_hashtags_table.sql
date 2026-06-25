CREATE TABLE hashtags (
    id         BIGSERIAL    PRIMARY KEY,
    tag        VARCHAR(100) NOT NULL UNIQUE,
    post_count BIGINT       NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE post_hashtags (
    post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id BIGINT NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    CONSTRAINT post_hashtags_pkey PRIMARY KEY (post_id, hashtag_id)
);

CREATE INDEX idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);
CREATE INDEX idx_hashtags_tag ON hashtags(tag);
