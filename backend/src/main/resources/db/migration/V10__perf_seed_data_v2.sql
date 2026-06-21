-- パフォーマンステスト用シードデータ v2
-- スクール方針に合わせた件数に更新
-- ユーザー100名 / 投稿10,000件（50ユーザー） / フォロー10〜30 / いいね20,000件 / コメント5,000件

DO $$
DECLARE
  v_i            INTEGER;
  v_user_id      BIGINT;
  v_follow_count INTEGER;
BEGIN

  -- 既存シードデータを削除（カスケード削除）
  DELETE FROM users WHERE username LIKE 'perf_user_%';

  -- 100名のテストユーザーを作成
  FOR v_i IN 1..100 LOOP
    INSERT INTO users (username, display_name, email, password_hash, created_at, updated_at)
    VALUES (
      'perf_user_' || LPAD(v_i::TEXT, 3, '0'),
      'Perf User ' || v_i,
      'perf_user_' || LPAD(v_i::TEXT, 3, '0') || '@example.com',
      '$2a$10$rukUDjn6ioUCMqQlTGwDSOKLMJ9BsN8iqXLRbZ6gEZFB7o.JNPR.q',
      NOW() - (random() * INTERVAL '30 days'),
      NOW()
    );
  END LOOP;

  -- 50ユーザー（001〜050）に各200件の投稿（計10,000件）、過去30日間のタイムスタンプ
  INSERT INTO posts (user_id, content, created_at, updated_at)
  SELECT
    u.id,
    'パフォーマンステスト投稿 ' || u.username || ' #' || gs.n,
    NOW() - (random() * INTERVAL '30 days'),
    NOW()
  FROM users u
  CROSS JOIN generate_series(1, 200) AS gs(n)
  WHERE u.username BETWEEN 'perf_user_001' AND 'perf_user_050';

  -- フォロー関係（各ユーザー10〜30名をフォロー）
  FOR v_i IN 1..100 LOOP
    SELECT id INTO v_user_id FROM users WHERE username = 'perf_user_' || LPAD(v_i::TEXT, 3, '0');
    v_follow_count := 10 + floor(random() * 21)::INT;

    INSERT INTO user_follows (follower_id, following_id, created_at)
    SELECT v_user_id, u.id, NOW()
    FROM users u
    WHERE u.username LIKE 'perf_user_%' AND u.id != v_user_id
    ORDER BY random()
    LIMIT v_follow_count
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- follower_count / following_count を更新
  UPDATE users u
  SET
    follower_count  = (SELECT COUNT(*) FROM user_follows uf WHERE uf.following_id = u.id),
    following_count = (SELECT COUNT(*) FROM user_follows uf WHERE uf.follower_id  = u.id)
  WHERE u.username LIKE 'perf_user_%';

  -- いいね 20,000件（各投稿に2ユーザー分）
  INSERT INTO post_likes (post_id, user_id, created_at)
  SELECT p.id, u.id, NOW() - (random() * INTERVAL '30 days')
  FROM posts p
  CROSS JOIN LATERAL (
    SELECT id FROM users
    WHERE username LIKE 'perf_user_%' AND id != p.user_id
    ORDER BY random()
    LIMIT 2
  ) u
  WHERE p.user_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%')
  ON CONFLICT DO NOTHING;

  -- like_count を更新
  UPDATE posts p
  SET like_count = (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id)
  WHERE p.user_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%');

  -- コメント 5,000件（ランダムな5,000投稿に1件ずつ）
  INSERT INTO comments (post_id, user_id, content, created_at, updated_at)
  SELECT
    p.id,
    u.id,
    'パフォーマンステストコメント',
    NOW() - (random() * INTERVAL '30 days'),
    NOW()
  FROM (
    SELECT id FROM posts
    WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%')
    ORDER BY random()
    LIMIT 5000
  ) p
  CROSS JOIN LATERAL (
    SELECT id FROM users
    WHERE username LIKE 'perf_user_%'
    ORDER BY random()
    LIMIT 1
  ) u;

  -- comment_count を更新
  UPDATE posts p
  SET comment_count = (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)
  WHERE p.user_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%');

END $$;
