-- 画像のみの投稿を許可するため content の NOT NULL / CHECK 制約を解除
ALTER TABLE posts ALTER COLUMN content DROP NOT NULL;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_not_empty;

-- 投稿画像の S3 URL を保存するカラムを追加
ALTER TABLE posts ADD COLUMN image_url VARCHAR(500);
