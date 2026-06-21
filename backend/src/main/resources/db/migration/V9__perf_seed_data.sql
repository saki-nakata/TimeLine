-- パフォーマンステスト用シードデータ
-- 開発環境専用。本番環境では適用しないこと。
-- クリーンアップ: DELETE FROM users WHERE username LIKE 'perf_user_%';

DO $$
DECLARE
  v_i            INTEGER;
  v_user_id      BIGINT;
  v_other_id     BIGINT;
  v_post_id      BIGINT;
  v_comment_id   BIGINT;
  v_j            INTEGER;
  v_k            INTEGER;
BEGIN
  -- 100名のテストユーザーを作成
  FOR v_i IN 1..100 LOOP
    INSERT INTO users (username, display_name, email, password_hash, created_at, updated_at)
    VALUES (
      'perf_user_' || LPAD(v_i::TEXT, 3, '0'),
      'Perf User ' || v_i,
      'perf_user_' || LPAD(v_i::TEXT, 3, '0') || '@example.com',
      '$2a$10$rukUDjn6ioUCMqQlTGwDSOKLMJ9BsN8iqXLRbZ6gEZFB7o.JNPR.q',
      NOW(),
      NOW()
    )
    ON CONFLICT (username) DO NOTHING;
  END LOOP;

  -- 各ユーザーに10件の投稿を作成（計1,000件）
  FOR v_i IN 1..100 LOOP
    SELECT id INTO v_user_id FROM users WHERE username = 'perf_user_' || LPAD(v_i::TEXT, 3, '0');
    IF v_user_id IS NULL THEN CONTINUE; END IF;

    FOR v_j IN 1..10 LOOP
      INSERT INTO posts (user_id, content, created_at, updated_at)
      VALUES (
        v_user_id,
        'パフォーマンステスト投稿 user=' || v_i || ' post=' || v_j,
        NOW() - (random() * INTERVAL '30 days'),
        NOW()
      );
    END LOOP;
  END LOOP;

  -- 各ユーザーがランダムに10名をフォロー（計約1,000件）
  FOR v_i IN 1..100 LOOP
    SELECT id INTO v_user_id FROM users WHERE username = 'perf_user_' || LPAD(v_i::TEXT, 3, '0');
    IF v_user_id IS NULL THEN CONTINUE; END IF;

    FOR v_k IN 1..10 LOOP
      SELECT id INTO v_other_id
      FROM users
      WHERE username LIKE 'perf_user_%'
        AND id != v_user_id
      ORDER BY random()
      LIMIT 1;

      IF v_other_id IS NOT NULL THEN
        INSERT INTO user_follows (follower_id, following_id, created_at)
        VALUES (v_user_id, v_other_id, NOW())
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  -- follower_count / following_count を更新
  UPDATE users u
  SET
    follower_count  = (SELECT COUNT(*) FROM user_follows uf WHERE uf.following_id = u.id),
    following_count = (SELECT COUNT(*) FROM user_follows uf WHERE uf.follower_id  = u.id)
  WHERE u.username LIKE 'perf_user_%';

  -- 各投稿にランダムで5〜10件のいいね（計約7,500件）
  FOR v_post_id IN
    SELECT p.id FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE u.username LIKE 'perf_user_%'
  LOOP
    FOR v_k IN 1..(5 + floor(random() * 6)::INT) LOOP
      SELECT id INTO v_user_id
      FROM users
      WHERE username LIKE 'perf_user_%'
      ORDER BY random()
      LIMIT 1;

      INSERT INTO post_likes (post_id, user_id, created_at)
      VALUES (v_post_id, v_user_id, NOW())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- like_count を更新
  UPDATE posts p
  SET like_count = (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id)
  WHERE p.user_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%');

  -- 各投稿にランダムで2〜5件のコメント（計約3,500件）
  FOR v_post_id IN
    SELECT p.id FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE u.username LIKE 'perf_user_%'
  LOOP
    FOR v_k IN 1..(2 + floor(random() * 4)::INT) LOOP
      SELECT id INTO v_user_id
      FROM users
      WHERE username LIKE 'perf_user_%'
      ORDER BY random()
      LIMIT 1;

      INSERT INTO comments (post_id, user_id, content, created_at, updated_at)
      VALUES (
        v_post_id,
        v_user_id,
        'パフォーマンステストコメント ' || v_k,
        NOW(),
        NOW()
      );
    END LOOP;
  END LOOP;

  -- comment_count を更新
  UPDATE posts p
  SET comment_count = (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)
  WHERE p.user_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%');

END $$;
