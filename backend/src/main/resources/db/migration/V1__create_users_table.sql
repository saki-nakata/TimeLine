CREATE TABLE users (
    id             BIGSERIAL PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL,
    display_name   VARCHAR(100),
    email          VARCHAR(255) NOT NULL,
    password_hash  VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_id       VARCHAR(255),
    avatar_url     VARCHAR(500),
    bio            TEXT,
    follower_count  BIGINT NOT NULL DEFAULT 0,
    following_count BIGINT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_username_key     UNIQUE (username),
    CONSTRAINT users_email_key        UNIQUE (email),
    CONSTRAINT users_oauth_key        UNIQUE (oauth_provider, oauth_id)
);
