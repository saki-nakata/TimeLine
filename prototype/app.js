'use strict';

// ─── 1. Constants ─────────────────────────────────────────────────────────────
const KEYS = {
  USERS:    'tl_users',
  POSTS:    'tl_posts',
  COMMENTS: 'tl_comments',
  LIKES:    'tl_likes',
  FOLLOWS:  'tl_follows',
  SESSION:  'tl_session',
  SEEDED:   'tl_seeded',
};
const PAGE_SIZE = 20;

// ─── 2. DB Module ─────────────────────────────────────────────────────────────
const DB = {
  _load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  _save(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr)); }
    catch (e) {
      if (e.name === 'QuotaExceededError') {
        alert('ストレージが満杯です。画像を削除してから再試行してください。');
      }
    }
  },
  _nextId(arr) {
    return arr.length ? Math.max(...arr.map(o => o.id)) + 1 : 1;
  },
  _now() { return new Date().toISOString(); },

  Users: {
    getAll() { return DB._load(KEYS.USERS); },
    getById(id) { return DB._load(KEYS.USERS).find(u => u.id === id) || null; },
    getByEmail(email) {
      return DB._load(KEYS.USERS).find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    },
    getByUsername(username) {
      return DB._load(KEYS.USERS).find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
    },
    search(q) {
      if (!q) return [];
      const lq = q.toLowerCase();
      const currentId = DB.Session.get();
      return DB._load(KEYS.USERS).filter(u => u.id !== currentId && u.username.toLowerCase().includes(lq));
    },
    create({ username, email, passwordHash }) {
      const users = DB._load(KEYS.USERS);
      const user = {
        id: DB._nextId(users),
        username, displayName: username, email, passwordHash,
        avatarDataUrl: null, bio: null,
        followerCount: 0, followingCount: 0,
        createdAt: DB._now(), updatedAt: DB._now(),
      };
      users.push(user);
      DB._save(KEYS.USERS, users);
      return user;
    },
    update(id, patch) {
      const users = DB._load(KEYS.USERS);
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      users[idx] = { ...users[idx], ...patch, updatedAt: DB._now() };
      DB._save(KEYS.USERS, users);
      return users[idx];
    },
  },

  Posts: {
    getAll() {
      return DB._load(KEYS.POSTS).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    getById(id) { return DB._load(KEYS.POSTS).find(p => p.id === id) || null; },
    getByUserId(userId) {
      return DB._load(KEYS.POSTS)
        .filter(p => p.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    getFollowingFeed(userId) {
      const ids = DB.Follows.getFollowingIds(userId);
      return DB._load(KEYS.POSTS)
        .filter(p => ids.includes(p.userId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    create({ userId, content, imageDataUrl }) {
      const posts = DB._load(KEYS.POSTS);
      const post = {
        id: DB._nextId(posts),
        userId, content,
        imageDataUrl: imageDataUrl || null,
        likeCount: 0, commentCount: 0,
        createdAt: DB._now(), updatedAt: DB._now(),
      };
      posts.push(post);
      DB._save(KEYS.POSTS, posts);
      return post;
    },
    update(id, patch) {
      const posts = DB._load(KEYS.POSTS);
      const idx = posts.findIndex(p => p.id === id);
      if (idx === -1) return null;
      posts[idx] = { ...posts[idx], ...patch, updatedAt: DB._now() };
      DB._save(KEYS.POSTS, posts);
      return posts[idx];
    },
    delete(id) {
      DB._save(KEYS.POSTS, DB._load(KEYS.POSTS).filter(p => p.id !== id));
      DB._save(KEYS.COMMENTS, DB._load(KEYS.COMMENTS).filter(c => c.postId !== id));
      DB._save(KEYS.LIKES, DB._load(KEYS.LIKES).filter(l => l.postId !== id));
    },
  },

  Comments: {
    getByPostId(postId) {
      return DB._load(KEYS.COMMENTS)
        .filter(c => c.postId === postId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    create({ postId, userId, content }) {
      const comments = DB._load(KEYS.COMMENTS);
      const comment = { id: DB._nextId(comments), postId, userId, content, createdAt: DB._now() };
      comments.push(comment);
      DB._save(KEYS.COMMENTS, comments);
      const post = DB.Posts.getById(postId);
      if (post) DB.Posts.update(postId, { commentCount: post.commentCount + 1 });
      return comment;
    },
    delete(id) {
      const comments = DB._load(KEYS.COMMENTS);
      const comment = comments.find(c => c.id === id);
      if (!comment) return;
      DB._save(KEYS.COMMENTS, comments.filter(c => c.id !== id));
      const post = DB.Posts.getById(comment.postId);
      if (post) DB.Posts.update(comment.postId, { commentCount: Math.max(0, post.commentCount - 1) });
    },
  },

  Likes: {
    existsByPostAndUser(postId, userId) {
      return DB._load(KEYS.LIKES).some(l => l.postId === postId && l.userId === userId);
    },
    create({ postId, userId }) {
      if (DB.Likes.existsByPostAndUser(postId, userId)) return;
      const likes = DB._load(KEYS.LIKES);
      likes.push({ id: DB._nextId(likes), postId, userId, createdAt: DB._now() });
      DB._save(KEYS.LIKES, likes);
      const post = DB.Posts.getById(postId);
      if (post) DB.Posts.update(postId, { likeCount: post.likeCount + 1 });
    },
    deleteByPostAndUser(postId, userId) {
      const likes = DB._load(KEYS.LIKES);
      if (!likes.some(l => l.postId === postId && l.userId === userId)) return;
      DB._save(KEYS.LIKES, likes.filter(l => !(l.postId === postId && l.userId === userId)));
      const post = DB.Posts.getById(postId);
      if (post) DB.Posts.update(postId, { likeCount: Math.max(0, post.likeCount - 1) });
    },
  },

  Follows: {
    isFollowing(followerId, followingId) {
      return DB._load(KEYS.FOLLOWS).some(f => f.followerId === followerId && f.followingId === followingId);
    },
    getFollowingIds(followerId) {
      return DB._load(KEYS.FOLLOWS).filter(f => f.followerId === followerId).map(f => f.followingId);
    },
    create({ followerId, followingId }) {
      if (followerId === followingId || DB.Follows.isFollowing(followerId, followingId)) return;
      const follows = DB._load(KEYS.FOLLOWS);
      follows.push({ id: DB._nextId(follows), followerId, followingId, createdAt: DB._now() });
      DB._save(KEYS.FOLLOWS, follows);
      const follower = DB.Users.getById(followerId);
      const following = DB.Users.getById(followingId);
      if (follower) DB.Users.update(followerId, { followingCount: follower.followingCount + 1 });
      if (following) DB.Users.update(followingId, { followerCount: following.followerCount + 1 });
    },
    delete({ followerId, followingId }) {
      const follows = DB._load(KEYS.FOLLOWS);
      if (!follows.some(f => f.followerId === followerId && f.followingId === followingId)) return;
      DB._save(KEYS.FOLLOWS, follows.filter(f => !(f.followerId === followerId && f.followingId === followingId)));
      const follower = DB.Users.getById(followerId);
      const following = DB.Users.getById(followingId);
      if (follower) DB.Users.update(followerId, { followingCount: Math.max(0, follower.followingCount - 1) });
      if (following) DB.Users.update(followingId, { followerCount: Math.max(0, following.followerCount - 1) });
    },
  },

  Session: {
    get() {
      const id = localStorage.getItem(KEYS.SESSION);
      return id ? parseInt(id, 10) : null;
    },
    set(userId) { localStorage.setItem(KEYS.SESSION, String(userId)); },
    clear() { localStorage.removeItem(KEYS.SESSION); },
    currentUser() { const id = DB.Session.get(); return id ? DB.Users.getById(id) : null; },
  },
};

// ─── 3. Seed Data & Migration ─────────────────────────────────────────────────
function migrateData() {
  const users = DB._load(KEYS.USERS);
  let changed = false;
  users.forEach(u => {
    if (!u.displayName) { u.displayName = u.username; changed = true; }
  });
  if (changed) DB._save(KEYS.USERS, users);
}

function seedData() {
  if (localStorage.getItem(KEYS.SEEDED)) return;

  const users = [
    { id: 1, username: 'alice', displayName: 'Alice 🌸', email: 'alice@example.com', passwordHash: btoa('password123'),
      avatarDataUrl: null, bio: 'Webフロントエンドエンジニア。React大好き 🎨', followerCount: 2, followingCount: 1,
      createdAt: '2026-05-01T08:00:00.000Z', updatedAt: '2026-05-01T08:00:00.000Z' },
    { id: 2, username: 'bob', displayName: 'Bob Smith', email: 'bob@example.com', passwordHash: btoa('password123'),
      avatarDataUrl: null, bio: 'Javaが好きなバックエンドエンジニア ☕', followerCount: 1, followingCount: 2,
      createdAt: '2026-05-02T09:00:00.000Z', updatedAt: '2026-05-02T09:00:00.000Z' },
    { id: 3, username: 'carol', displayName: 'Carol ✨', email: 'carol@example.com', passwordHash: btoa('password123'),
      avatarDataUrl: null, bio: 'UIデザイナー。使いやすいものを作るのが好き ✨', followerCount: 1, followingCount: 1,
      createdAt: '2026-05-03T10:00:00.000Z', updatedAt: '2026-05-03T10:00:00.000Z' },
    { id: 4, username: 'dave', displayName: 'Dave', email: 'dave@example.com', passwordHash: btoa('password123'),
      avatarDataUrl: null, bio: null, followerCount: 0, followingCount: 1,
      createdAt: '2026-05-04T11:00:00.000Z', updatedAt: '2026-05-04T11:00:00.000Z' },
  ];

  const posts = [
    { id: 1, userId: 1, content: 'はじめての投稿です！よろしくお願いします 🎉\nこれからよろしくお願いします。', imageDataUrl: null, likeCount: 3, commentCount: 2, createdAt: '2026-05-10T08:00:00.000Z', updatedAt: '2026-05-10T08:00:00.000Z' },
    { id: 2, userId: 2, content: 'Spring Boot 4.0 と Java 25 の新機能が楽しみすぎる！\nRecord Patternsが特に面白そう。', imageDataUrl: null, likeCount: 5, commentCount: 1, createdAt: '2026-05-11T09:30:00.000Z', updatedAt: '2026-05-11T09:30:00.000Z' },
    { id: 3, userId: 3, content: 'Figmaで新しいデザインシステムを作り始めました。コンポーネントの粒度をどう決めるか悩み中…', imageDataUrl: null, likeCount: 2, commentCount: 0, createdAt: '2026-05-12T14:00:00.000Z', updatedAt: '2026-05-12T14:00:00.000Z' },
    { id: 4, userId: 1, content: 'React 19 の Server Components、やっと使い方がわかってきた！\nデータフェッチが本当に楽になりますね。', imageDataUrl: null, likeCount: 4, commentCount: 1, createdAt: '2026-05-13T10:00:00.000Z', updatedAt: '2026-05-13T10:00:00.000Z' },
    { id: 5, userId: 2, content: 'DockerでPostgreSQLを立ち上げる設定、やっとまとめられた。compose.ymlって書き方が変わってたのか…', imageDataUrl: null, likeCount: 1, commentCount: 0, createdAt: '2026-05-14T16:00:00.000Z', updatedAt: '2026-05-14T16:00:00.000Z' },
    { id: 6, userId: 4, content: 'こんにちは！今日からこのアプリ使い始めました。よろしくお願いします！', imageDataUrl: null, likeCount: 2, commentCount: 1, createdAt: '2026-05-15T12:00:00.000Z', updatedAt: '2026-05-15T12:00:00.000Z' },
  ];

  const comments = [
    { id: 1, postId: 1, userId: 2, content: 'ようこそ！よろしくお願いします！', createdAt: '2026-05-10T08:30:00.000Z' },
    { id: 2, postId: 1, userId: 3, content: '一緒に盛り上げていきましょう！', createdAt: '2026-05-10T09:00:00.000Z' },
    { id: 3, postId: 2, userId: 1, content: 'Java 25 楽しみですよね！Record Patterns早く使いたい', createdAt: '2026-05-11T10:00:00.000Z' },
    { id: 4, postId: 4, userId: 3, content: 'Server Components 難しかったけど慣れると快適ですよね', createdAt: '2026-05-13T11:00:00.000Z' },
    { id: 5, postId: 6, userId: 1, content: 'ようこそ！よろしくお願いします！', createdAt: '2026-05-15T12:30:00.000Z' },
  ];

  const likes = [
    { id: 1, postId: 1, userId: 2, createdAt: '2026-05-10T10:00:00.000Z' },
    { id: 2, postId: 1, userId: 3, createdAt: '2026-05-10T11:00:00.000Z' },
    { id: 3, postId: 1, userId: 4, createdAt: '2026-05-10T12:00:00.000Z' },
    { id: 4, postId: 2, userId: 1, createdAt: '2026-05-11T10:00:00.000Z' },
    { id: 5, postId: 2, userId: 3, createdAt: '2026-05-11T11:00:00.000Z' },
    { id: 6, postId: 2, userId: 4, createdAt: '2026-05-11T12:00:00.000Z' },
    { id: 7, postId: 2, userId: 2, createdAt: '2026-05-11T13:00:00.000Z' }, // from themselves (allowed for seed)
    { id: 8, postId: 4, userId: 2, createdAt: '2026-05-13T12:00:00.000Z' },
    { id: 9, postId: 6, userId: 1, createdAt: '2026-05-15T13:00:00.000Z' },
    { id: 10, postId: 6, userId: 2, createdAt: '2026-05-15T14:00:00.000Z' },
    { id: 11, postId: 3, userId: 1, createdAt: '2026-05-12T15:00:00.000Z' },
    { id: 12, postId: 3, userId: 2, createdAt: '2026-05-12T16:00:00.000Z' },
    { id: 13, postId: 4, userId: 3, createdAt: '2026-05-13T13:00:00.000Z' },
    { id: 14, postId: 4, userId: 4, createdAt: '2026-05-13T14:00:00.000Z' },
    { id: 15, postId: 5, userId: 3, createdAt: '2026-05-14T17:00:00.000Z' },
  ];

  const follows = [
    { id: 1, followerId: 1, followingId: 2, createdAt: '2026-05-05T10:00:00.000Z' },
    { id: 2, followerId: 2, followingId: 1, createdAt: '2026-05-05T11:00:00.000Z' },
    { id: 3, followerId: 2, followingId: 3, createdAt: '2026-05-06T10:00:00.000Z' },
    { id: 4, followerId: 3, followingId: 1, createdAt: '2026-05-06T11:00:00.000Z' },
    { id: 5, followerId: 4, followingId: 2, createdAt: '2026-05-07T10:00:00.000Z' },
  ];

  DB._save(KEYS.USERS, users);
  DB._save(KEYS.POSTS, posts);
  DB._save(KEYS.COMMENTS, comments);
  DB._save(KEYS.LIKES, likes);
  DB._save(KEYS.FOLLOWS, follows);
  localStorage.setItem(KEYS.SEEDED, '1');
}

// ─── 4. Utility Functions ──────────────────────────────────────────────────────
function displayName(user) {
  return (user && user.displayName) ? user.displayName : (user ? user.username : '');
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'たった今';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}日前`;
  return new Date(isoString).toLocaleDateString('ja-JP');
}

function avatarColor(userId) {
  return `hsl(${(userId * 53) % 360}, 55%, 50%)`;
}

function buildAvatar(user, sizeClass = '') {
  if (!user) return `<div class="avatar avatar--initials ${sizeClass}" style="background:#ccc">?</div>`;
  if (user.avatarDataUrl) {
    return `<img class="avatar ${sizeClass}" src="${user.avatarDataUrl}" alt="@${escapeHtml(user.username)}">`;
  }
  const initial = user.username.charAt(0).toUpperCase();
  const color = avatarColor(user.id);
  return `<div class="avatar avatar--initials ${sizeClass}" style="background:${color}">${initial}</div>`;
}

// ─── 5. Shared Component Builders ─────────────────────────────────────────────
function buildSidebar(activePage) {
  const currentUser = DB.Session.currentUser();
  if (!currentUser) return '';

  return `
    <aside class="sidebar">
      <div class="sidebar__logo">TimeLine</div>
      <nav class="sidebar__nav">
        <a class="sidebar__nav-item ${activePage === 'timeline' ? 'active' : ''}" href="#timeline">
          <span class="sidebar__nav-icon">🏠</span>
          <span>タイムライン</span>
        </a>
        <a class="sidebar__nav-item ${activePage === 'search' ? 'active' : ''}" href="#search">
          <span class="sidebar__nav-icon">🔍</span>
          <span>ユーザー検索</span>
        </a>
        <a class="sidebar__nav-item ${activePage === 'profile' ? 'active' : ''}" href="#profile-${currentUser.id}">
          <span class="sidebar__nav-icon">👤</span>
          <span>プロフィール</span>
        </a>
      </nav>
    </aside>
  `;
}

function buildContentHeader(title) {
  const currentUser = DB.Session.currentUser();
  if (!currentUser) return `<div class="content-header"><span>${escapeHtml(title)}</span></div>`;
  return `
    <div class="content-header">
      <span>${escapeHtml(title)}</span>
      <div class="content-header__user">
        <a href="#profile-${currentUser.id}" class="username-link" data-user-id="${currentUser.id}" style="display:flex;align-items:center;gap:8px;text-decoration:none">
          ${buildAvatar(currentUser)}
          <span class="content-header__username">${escapeHtml(displayName(currentUser))}</span>
        </a>
        <button class="content-header__logout logout-btn">ログアウト</button>
      </div>
    </div>
  `;
}

function buildPostCard(post, currentUserId) {
  const author = DB.Users.getById(post.userId);
  if (!author) return '';
  const isLiked = DB.Likes.existsByPostAndUser(post.id, currentUserId);
  const isOwn = post.userId === currentUserId;

  return `
    <article class="post-card" data-post-id="${post.id}">
      <a href="#profile-${author.id}" class="username-link" data-user-id="${author.id}" title="@${escapeHtml(author.username)}">
        ${buildAvatar(author)}
      </a>
      <div class="post-card__body">
        <div class="post-card__header">
          <a class="post-card__username username-link" href="#profile-${author.id}" data-user-id="${author.id}">
            <span class="post-card__display-name">${escapeHtml(displayName(author))}</span>
            <span class="post-card__handle">@${escapeHtml(author.username)}</span>
          </a>
          <span class="post-card__time">${relativeTime(post.createdAt)}</span>
          ${isOwn ? `<button class="post-card__menu-btn post-menu-btn" data-post-id="${post.id}" title="メニュー">•••</button>` : ''}
        </div>
        <p class="post-card__text">${escapeHtml(post.content)}</p>
        ${post.imageDataUrl ? `<img class="post-card__image" src="${post.imageDataUrl}" alt="投稿画像">` : ''}
        <div class="post-card__actions">
          <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
            <span class="like-icon">${isLiked ? '♥' : '♡'}</span>
            <span class="like-count">${post.likeCount}</span>
          </button>
          <button class="action-btn comment-btn" data-post-id="${post.id}">
            <span>💬</span>
            <span>${post.commentCount}</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function buildCommentItem(comment, author, currentUserId) {
  const isOwn = comment.userId === currentUserId;
  return `
    <div class="comment-item" data-comment-id="${comment.id}">
      <a href="#profile-${author.id}" class="username-link" data-user-id="${author.id}">
        ${buildAvatar(author)}
      </a>
      <div class="comment-item__body">
        <div class="comment-item__header">
          <a class="comment-item__username username-link" href="#profile-${author.id}" data-user-id="${author.id}">@${escapeHtml(author.username)}</a>
          <span class="comment-item__time">${relativeTime(comment.createdAt)}</span>
          ${isOwn ? `<button class="comment-item__delete delete-comment-btn" data-comment-id="${comment.id}">🗑 削除</button>` : ''}
        </div>
        <p class="comment-item__text">${escapeHtml(comment.content)}</p>
      </div>
    </div>
  `;
}

function buildUserCard(user, isFollowing) {
  return `
    <div class="user-card">
      <a href="#profile-${user.id}" class="username-link" data-user-id="${user.id}">
        ${buildAvatar(user)}
      </a>
      <div class="user-card__info">
        <a class="user-card__username username-link" href="#profile-${user.id}" data-user-id="${user.id}">
          <span style="font-weight:700">${escapeHtml(displayName(user))}</span>
          <span style="font-weight:400;color:var(--color-text-secondary);margin-left:4px">@${escapeHtml(user.username)}</span>
        </a>
        <div class="user-card__stats">フォロワー <strong>${user.followerCount}</strong>　フォロー中 <strong>${user.followingCount}</strong></div>
        ${user.bio ? `<div class="user-card__stats" style="margin-top:2px">${escapeHtml(user.bio)}</div>` : ''}
      </div>
      <button
        class="follow-btn ${isFollowing ? 'follow-btn--following' : 'follow-btn--follow'} toggle-follow-btn"
        data-user-id="${user.id}"
        data-following="${isFollowing ? '1' : '0'}">
        ${isFollowing ? 'フォロー中' : 'フォローする'}
      </button>
    </div>
  `;
}

function buildEmptyState(message, icon = '🕊️') {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${icon}</div>
      <p class="empty-state__text">${escapeHtml(message)}</p>
    </div>
  `;
}

// ─── 6. Module State ──────────────────────────────────────────────────────────
const feedState = { tab: 'all', page: 0 };
const profileFeedState = { userId: null, page: 0 };
const composeState = { text: '', imageDataUrl: null };
const editState = { imageDataUrl: null };

// ─── 7. Event Handlers ────────────────────────────────────────────────────────
function handleLogout() {
  DB.Session.clear();
  composeState.text = '';
  composeState.imageDataUrl = null;
  Router.navigate('#login');
}

function toggleLike(postId, _btn) {
  const currentUserId = DB.Session.get();
  const isLiked = DB.Likes.existsByPostAndUser(postId, currentUserId);

  if (isLiked) {
    DB.Likes.deleteByPostAndUser(postId, currentUserId);
  } else {
    DB.Likes.create({ postId, userId: currentUserId });
  }

  const post = DB.Posts.getById(postId);
  if (!post) return;

  // Optimistic UI update
  const allLikeBtns = document.querySelectorAll(`.like-btn[data-post-id="${postId}"]`);
  allLikeBtns.forEach(b => {
    b.classList.toggle('liked', !isLiked);
    b.querySelector('.like-icon').textContent = !isLiked ? '♥' : '♡';
    b.querySelector('.like-count').textContent = post.likeCount;
  });
}

function toggleFollow(targetUserId, btn) {
  const currentUserId = DB.Session.get();
  const isFollowing = DB.Follows.isFollowing(currentUserId, targetUserId);

  if (isFollowing) {
    DB.Follows.delete({ followerId: currentUserId, followingId: targetUserId });
  } else {
    DB.Follows.create({ followerId: currentUserId, followingId: targetUserId });
  }

  const targetUser = DB.Users.getById(targetUserId);
  if (!targetUser) return;

  const nowFollowing = !isFollowing;

  // Update the clicked button
  btn.classList.toggle('follow-btn--follow', !nowFollowing);
  btn.classList.toggle('follow-btn--following', nowFollowing);
  btn.dataset.following = nowFollowing ? '1' : '0';
  btn.textContent = nowFollowing ? 'フォロー中' : 'フォローする';

  // Update follower count display on profile page if visible
  const followerEl = document.getElementById('profile-follower-count');
  if (followerEl) followerEl.textContent = targetUser.followerCount;
}

function handleTabSwitch(tab) {
  const textarea = document.getElementById('compose-text');
  if (textarea) composeState.text = textarea.value;
  feedState.tab = tab;
  feedState.page = 0;
  renderTimeline();
}

function loadMorePosts() {
  feedState.page++;
  const currentUserId = DB.Session.get();
  const allPosts = feedState.tab === 'all'
    ? DB.Posts.getAll()
    : DB.Posts.getFollowingFeed(currentUserId);

  const start = feedState.page * PAGE_SIZE;
  const slice = allPosts.slice(start, start + PAGE_SIZE);
  const list = document.getElementById('post-list');
  if (!list) return;

  slice.forEach(post => {
    list.insertAdjacentHTML('beforeend', buildPostCard(post, currentUserId));
  });

  if (start + PAGE_SIZE >= allPosts.length) {
    document.getElementById('load-more-btn')?.remove();
  }
}

function loadMoreProfilePosts() {
  profileFeedState.page++;
  const currentUserId = DB.Session.get();
  const allPosts = DB.Posts.getByUserId(profileFeedState.userId);
  const start = profileFeedState.page * PAGE_SIZE;
  const slice = allPosts.slice(start, start + PAGE_SIZE);
  const list = document.getElementById('profile-post-list');
  if (!list) return;

  slice.forEach(post => {
    list.insertAdjacentHTML('beforeend', buildPostCard(post, currentUserId));
  });

  if (start + PAGE_SIZE >= allPosts.length) {
    document.getElementById('profile-load-more-btn')?.remove();
  }
}

function handleDeleteComment(commentId) {
  if (!confirm('このコメントを削除しますか？')) return;
  DB.Comments.delete(commentId);
  // Remove from DOM
  const item = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
  if (item) item.remove();
  // Update comment count display
  const post = document.querySelector('.post-detail-card');
  if (post) {
    const postId = parseInt(post.dataset.postId, 10);
    const p = DB.Posts.getById(postId);
    if (p) document.querySelectorAll('.comment-count').forEach(el => { el.textContent = p.commentCount; });
  }
}

function handleDeletePost(postId) {
  if (!confirm('この投稿を削除しますか？')) return;
  DB.Posts.delete(postId);
  Router.navigate('#timeline');
}

function closeContextMenu() {
  document.querySelector('.post-context-menu')?.remove();
}

function showPostMenu(postId, anchorEl) {
  closeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'post-context-menu';
  menu.innerHTML = `
    <button class="post-context-menu__item" data-menu-action="edit">✏️ 編集</button>
    <button class="post-context-menu__item post-context-menu__item--danger" data-menu-action="delete">🗑️ 削除</button>
  `;

  const rect = anchorEl.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 180)}px`;
  document.body.appendChild(menu);

  menu.addEventListener('click', e => {
    const action = e.target.closest('[data-menu-action]')?.dataset.menuAction;
    closeContextMenu();
    if (action === 'edit') openEditModal(postId);
    if (action === 'delete') handleDeletePost(postId);
  });

  setTimeout(() => {
    document.addEventListener('click', closeContextMenu, { once: true });
  }, 0);
}

function openEditModal(postId) {
  const post = DB.Posts.getById(postId);
  if (!post) return;
  editState.imageDataUrl = post.imageDataUrl;

  document.querySelector('.modal-overlay')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3>投稿を編集</h3>
        <button class="modal-close-btn">×</button>
      </div>
      <div class="modal-body">
        <textarea class="modal-textarea" id="edit-textarea" maxlength="280"></textarea>
        <div class="modal-char-counter"><span id="edit-char-count">0</span> / 280</div>
        <div id="edit-image-preview-wrap" style="${post.imageDataUrl ? '' : 'display:none'}">
          <div class="modal-image-preview">
            <img id="edit-image-preview" src="${post.imageDataUrl || ''}" alt="">
            <button class="remove-image-btn" id="edit-remove-image">×</button>
          </div>
        </div>
        <label class="image-attach-label" for="edit-image-input" style="display:inline-flex;margin-bottom:10px">📎 画像を変更</label>
        <input type="file" id="edit-image-input" accept="image/jpeg,image/png,image/gif" style="display:none">
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
        <button class="btn btn-primary" id="modal-save">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const textarea = modal.querySelector('#edit-textarea');
  const charCount = modal.querySelector('#edit-char-count');
  const saveBtn = modal.querySelector('#modal-save');
  textarea.value = post.content;
  charCount.textContent = post.content.length;

  textarea.addEventListener('input', () => {
    charCount.textContent = textarea.value.length;
    saveBtn.disabled = textarea.value.trim().length === 0 || textarea.value.length > 280;
  });

  modal.querySelector('.modal-close-btn').addEventListener('click', () => modal.remove());
  modal.querySelector('#modal-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  modal.querySelector('#edit-remove-image').addEventListener('click', () => {
    editState.imageDataUrl = null;
    modal.querySelector('#edit-image-preview-wrap').style.display = 'none';
  });

  modal.querySelector('#edit-image-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      alert('JPEG / PNG / GIF のみ対応しています');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert('4MB 以下の画像を選択してください');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      editState.imageDataUrl = ev.target.result;
      const wrap = modal.querySelector('#edit-image-preview-wrap');
      modal.querySelector('#edit-image-preview').src = ev.target.result;
      wrap.style.display = '';
    };
    reader.readAsDataURL(file);
  });

  saveBtn.addEventListener('click', () => {
    const content = textarea.value.trim();
    if (!content || content.length > 280) return;
    DB.Posts.update(postId, { content, imageDataUrl: editState.imageDataUrl });
    modal.remove();
    Router.dispatch();
  });
}

// Delegated click handler on #app
function handleAppClick(e) {
  // Like button
  const likeBtn = e.target.closest('.like-btn');
  if (likeBtn) {
    e.stopPropagation();
    toggleLike(parseInt(likeBtn.dataset.postId, 10), likeBtn);
    return;
  }

  // Post menu button
  const menuBtn = e.target.closest('.post-menu-btn');
  if (menuBtn) {
    e.stopPropagation();
    showPostMenu(parseInt(menuBtn.dataset.postId, 10), menuBtn);
    return;
  }

  // Username / profile link
  const usernameLink = e.target.closest('.username-link');
  if (usernameLink) {
    e.preventDefault();
    e.stopPropagation();
    Router.navigate(`#profile-${usernameLink.dataset.userId}`);
    return;
  }

  // Logout button
  if (e.target.closest('.logout-btn')) {
    handleLogout();
    return;
  }

  // Tab button
  const tabBtn = e.target.closest('.tab-btn');
  if (tabBtn) {
    handleTabSwitch(tabBtn.dataset.tab);
    return;
  }

  // Load more (timeline)
  if (e.target.closest('#load-more-btn')) {
    loadMorePosts();
    return;
  }

  // Load more (profile)
  if (e.target.closest('#profile-load-more-btn')) {
    loadMoreProfilePosts();
    return;
  }

  // Follow toggle button
  const followBtn = e.target.closest('.toggle-follow-btn');
  if (followBtn) {
    e.stopPropagation();
    toggleFollow(parseInt(followBtn.dataset.userId, 10), followBtn);
    return;
  }

  // Delete comment button
  const deleteCommentBtn = e.target.closest('.delete-comment-btn');
  if (deleteCommentBtn) {
    e.stopPropagation();
    handleDeleteComment(parseInt(deleteCommentBtn.dataset.commentId, 10));
    return;
  }

  // Comment button → navigate to post detail
  const commentBtn = e.target.closest('.comment-btn');
  if (commentBtn) {
    e.stopPropagation();
    Router.navigate(`#post-${commentBtn.dataset.postId}`);
    return;
  }

  // Remove compose image
  if (e.target.closest('#compose-remove-image')) {
    composeState.imageDataUrl = null;
    document.getElementById('compose-image-preview-wrap').style.display = 'none';
    return;
  }

  // Post card click → navigate to post detail (not when clicking buttons/links)
  const postCard = e.target.closest('.post-card');
  if (postCard && !e.target.closest('button, a')) {
    Router.navigate(`#post-${postCard.dataset.postId}`);
    return;
  }
}

// Delegated submit handler on #app
function handleAppSubmit(e) {
  e.preventDefault();
  const form = e.target;

  if (form.id === 'login-form') { handleLoginSubmit(form); return; }
  if (form.id === 'register-form') { handleRegisterSubmit(form); return; }
  if (form.id === 'compose-form') { handleComposeSubmit(form); return; }
  if (form.id === 'comment-form') { handleCommentSubmit(form); return; }
  if (form.id === 'search-form') { handleSearchSubmit(form); return; }
  if (form.id === 'profile-edit-form') { handleProfileEditSubmit(form); return; }
}

// Delegated input handler on #app
function handleAppInput(e) {
  if (e.target.id === 'compose-text') {
    composeState.text = e.target.value;
    const len = e.target.value.length;
    const counter = document.getElementById('compose-counter');
    if (counter) {
      counter.textContent = `${len} / 280`;
      counter.classList.toggle('over-limit', len > 280);
    }
    const submitBtn = document.getElementById('compose-submit');
    if (submitBtn) submitBtn.disabled = e.target.value.trim().length === 0 || len > 280;
  }
}

// Delegated change handler on #app (file inputs)
function handleAppChange(e) {
  if (e.target.id === 'compose-image') {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      alert('JPEG / PNG / GIF のみ対応しています');
      e.target.value = '';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert('4MB 以下の画像を選択してください');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      composeState.imageDataUrl = ev.target.result;
      const wrap = document.getElementById('compose-image-preview-wrap');
      const img = document.getElementById('compose-image-preview');
      if (wrap && img) {
        img.src = ev.target.result;
        wrap.style.display = '';
      }
    };
    reader.readAsDataURL(file);
  }

  if (e.target.id === 'avatar-image-input') {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      alert('JPEG / PNG / GIF のみ対応しています');
      e.target.value = '';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert('4MB 以下の画像を選択してください');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      editState.imageDataUrl = ev.target.result;
      const preview = document.getElementById('avatar-preview');
      if (preview) {
        // Replace with img element
        preview.outerHTML = `<img id="avatar-preview" class="avatar avatar--xl" src="${ev.target.result}" alt="アバタープレビュー" style="flex-shrink:0">`;
      }
    };
    reader.readAsDataURL(file);
  }
}

// Form action handlers
function handleLoginSubmit(form) {
  const email = form.querySelector('#login-email').value.trim();
  const password = form.querySelector('#login-password').value;
  const errEl = form.querySelector('.form-error');

  if (!email || !password) {
    errEl.textContent = 'メールアドレスとパスワードを入力してください';
    errEl.classList.add('visible');
    return;
  }

  const user = DB.Users.getByEmail(email);
  if (!user || user.passwordHash !== btoa(password)) {
    errEl.textContent = 'メールアドレスまたはパスワードが正しくありません';
    errEl.classList.add('visible');
    return;
  }

  DB.Session.set(user.id);
  composeState.text = '';
  composeState.imageDataUrl = null;
  Router.navigate('#timeline');
}

function handleRegisterSubmit(form) {
  const username = form.querySelector('#reg-username').value.trim();
  const email = form.querySelector('#reg-email').value.trim();
  const password = form.querySelector('#reg-password').value;
  const confirm = form.querySelector('#reg-confirm').value;
  const errEl = form.querySelector('.form-error');

  const showError = msg => { errEl.textContent = msg; errEl.classList.add('visible'); };

  if (!username || !email || !password || !confirm) { showError('すべての項目を入力してください'); return; }
  if (!/^[a-zA-Z0-9_]{1,50}$/.test(username)) { showError('ユーザー名は半角英数字・アンダースコアのみ、50文字以内で入力してください'); return; }
  if (password.length < 8) { showError('パスワードは8文字以上で入力してください'); return; }
  if (password !== confirm) { showError('パスワードが一致しません'); return; }
  if (DB.Users.getByEmail(email)) { showError('このメールアドレスはすでに使用されています'); return; }
  if (DB.Users.getByUsername(username)) { showError('このユーザー名はすでに使用されています'); return; }

  const user = DB.Users.create({ username, email, passwordHash: btoa(password) });
  DB.Session.set(user.id);
  composeState.text = '';
  composeState.imageDataUrl = null;
  Router.navigate('#timeline');
}

function handleComposeSubmit(_form) {
  const text = composeState.text.trim();
  if (!text || text.length > 280) return;

  const post = DB.Posts.create({
    userId: DB.Session.get(),
    content: text,
    imageDataUrl: composeState.imageDataUrl,
  });

  composeState.text = '';
  composeState.imageDataUrl = null;

  // Prepend new post card to list
  const list = document.getElementById('post-list');
  if (list) {
    list.insertAdjacentHTML('afterbegin', buildPostCard(post, DB.Session.get()));
    // Reset compose UI
    const textarea = document.getElementById('compose-text');
    if (textarea) { textarea.value = ''; }
    const counter = document.getElementById('compose-counter');
    if (counter) { counter.textContent = '0 / 280'; counter.classList.remove('over-limit'); }
    const submitBtn = document.getElementById('compose-submit');
    if (submitBtn) submitBtn.disabled = true;
    const previewWrap = document.getElementById('compose-image-preview-wrap');
    if (previewWrap) previewWrap.style.display = 'none';
    const fileInput = document.getElementById('compose-image');
    if (fileInput) fileInput.value = '';
    // Remove empty state if present
    list.querySelector('.empty-state')?.remove();
  }
}

function handleCommentSubmit(form) {
  const textarea = form.querySelector('#comment-text');
  const content = textarea.value.trim();
  if (!content) return;

  const postId = parseInt(form.dataset.postId, 10);
  const comment = DB.Comments.create({ postId, userId: DB.Session.get(), content });
  const author = DB.Session.currentUser();

  const list = document.getElementById('comments-list');
  if (list) {
    list.querySelector('.empty-state')?.remove();
    list.insertAdjacentHTML('beforeend', buildCommentItem(comment, author, DB.Session.get()));
  }
  textarea.value = '';

  const post = DB.Posts.getById(postId);
  if (post) {
    document.querySelectorAll('.comment-count').forEach(el => { el.textContent = post.commentCount; });
  }
}

function handleSearchSubmit(form) {
  const q = form.querySelector('#search-input').value.trim();
  updateSearchResults(q);
}

function updateSearchResults(q) {
  const currentUser = DB.Session.currentUser();
  const resultsEl = document.getElementById('search-results');
  const metaEl = document.getElementById('search-meta');
  if (!resultsEl) return;

  if (!q) {
    resultsEl.innerHTML = '';
    if (metaEl) metaEl.textContent = '';
    return;
  }

  const results = DB.Users.search(q);
  if (metaEl) {
    metaEl.textContent = results.length > 0
      ? `「${q}」の検索結果（${results.length}件）`
      : '';
  }
  resultsEl.innerHTML = results.length > 0
    ? results.map(u => buildUserCard(u, DB.Follows.isFollowing(currentUser.id, u.id))).join('')
    : buildEmptyState(`"${q}" に一致するユーザーが見つかりません`, '🔍');
}

function handleProfileEditSubmit(form) {
  const newDisplayName = form.querySelector('#edit-display-name').value.trim();
  const newUsername    = form.querySelector('#edit-username').value.trim();
  const bio            = form.querySelector('#edit-bio').value.trim();
  const currentUser    = DB.Session.currentUser();
  const errEl          = document.getElementById('profile-edit-error');

  const showError = msg => { errEl.textContent = msg; errEl.classList.add('visible'); errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };

  if (!newDisplayName) { showError('表示名を入力してください'); return; }
  if (!newUsername)     { showError('ユーザー名を入力してください'); return; }
  if (!/^[a-zA-Z0-9_]{1,50}$/.test(newUsername)) {
    showError('ユーザー名は半角英数字・アンダースコアのみ、50文字以内で入力してください');
    return;
  }

  const existing = DB.Users.getByUsername(newUsername);
  if (existing && existing.id !== currentUser.id) {
    showError('このユーザー名はすでに使用されています');
    return;
  }

  DB.Users.update(currentUser.id, {
    displayName: newDisplayName,
    username: newUsername,
    bio: bio || null,
    avatarDataUrl: editState.imageDataUrl,
  });
  Router.navigate(`#profile-${currentUser.id}`);
}

// ─── 8. Screen Renderers ──────────────────────────────────────────────────────
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-card__logo">TimeLine</div>
        <div class="auth-card__title">ログイン</div>
        <form id="login-form" novalidate>
          <div class="form-error"></div>
          <div class="form-group">
            <label class="form-label" for="login-email">メールアドレス</label>
            <input class="form-input" type="email" id="login-email" placeholder="you@example.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">パスワード</label>
            <input class="form-input" type="password" id="login-password" placeholder="パスワード" autocomplete="current-password">
          </div>
          <button class="btn btn-primary btn-block" type="submit">ログイン</button>
        </form>
        <div class="auth-card__link">
          アカウントをお持ちでない方は <a href="#register">新規登録</a>
        </div>
        <div style="margin-top:20px;padding:12px;background:#f0f9ff;border-radius:8px;font-size:13px;color:#536471">
          <strong>デモ用アカウント：</strong><br>
          alice@example.com / password123<br>
          bob@example.com / password123
        </div>
      </div>
    </div>
  `;
}

function renderRegister() {
  document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-card__logo">TimeLine</div>
        <div class="auth-card__title">新規登録</div>
        <form id="register-form" novalidate>
          <div class="form-error"></div>
          <div class="form-group">
            <label class="form-label" for="reg-username">ユーザー名（@username）</label>
            <input class="form-input" type="text" id="reg-username" placeholder="半角英数字・アンダースコア" autocomplete="username" maxlength="50">
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-email">メールアドレス</label>
            <input class="form-input" type="email" id="reg-email" placeholder="you@example.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-password">パスワード（8文字以上）</label>
            <input class="form-input" type="password" id="reg-password" placeholder="パスワード" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-confirm">パスワード（確認）</label>
            <input class="form-input" type="password" id="reg-confirm" placeholder="もう一度入力" autocomplete="new-password">
          </div>
          <button class="btn btn-primary btn-block" type="submit">登録</button>
        </form>
        <div class="auth-card__link">
          すでにアカウントをお持ちの方は <a href="#login">ログイン</a>
        </div>
      </div>
    </div>
  `;
}

function renderTimeline() {
  const currentUser = DB.Session.currentUser();
  const allPosts = feedState.tab === 'all'
    ? DB.Posts.getAll()
    : DB.Posts.getFollowingFeed(currentUser.id);

  const pagePosts = allPosts.slice(0, PAGE_SIZE);
  const hasMore = allPosts.length > PAGE_SIZE;

  const postListHtml = pagePosts.length > 0
    ? pagePosts.map(p => buildPostCard(p, currentUser.id)).join('')
    : buildEmptyState(
        feedState.tab === 'following'
          ? 'フォロー中のユーザーの投稿がありません'
          : '投稿がありません',
        feedState.tab === 'following' ? '👤' : '🕊️'
      );

  document.getElementById('app').innerHTML = `
    <div class="layout">
      ${buildSidebar('timeline')}
      <main class="content">
        ${buildContentHeader('ホーム')}
        <form class="compose-box" id="compose-form">
          ${buildAvatar(currentUser)}
          <div class="compose-box__right">
            <textarea
              class="compose-textarea"
              id="compose-text"
              placeholder="いまどうしてる？"
              maxlength="280"
            ></textarea>
            <div id="compose-image-preview-wrap" class="compose-image-preview" style="display:none">
              <img id="compose-image-preview" src="" alt="">
              <button type="button" class="remove-image-btn" id="compose-remove-image">×</button>
            </div>
            <div class="compose-box__footer">
              <label class="image-attach-label" for="compose-image" title="画像を添付">📎 画像</label>
              <input type="file" id="compose-image" accept="image/jpeg,image/png,image/gif" style="display:none">
              <span class="char-counter" id="compose-counter">0 / 280</span>
              <button class="btn btn-primary" type="submit" id="compose-submit" disabled>投稿</button>
            </div>
          </div>
        </form>

        <div class="tabs">
          <button class="tab-btn ${feedState.tab === 'all' ? 'active' : ''}" data-tab="all">全て</button>
          <button class="tab-btn ${feedState.tab === 'following' ? 'active' : ''}" data-tab="following">フォロー中</button>
        </div>

        <div id="post-list">${postListHtml}</div>

        ${hasMore ? `<div class="load-more-container"><button class="btn btn-secondary" id="load-more-btn">もっと読み込む</button></div>` : ''}
      </main>
    </div>
  `;

  // Restore compose state
  const textarea = document.getElementById('compose-text');
  if (textarea && composeState.text) {
    textarea.value = composeState.text;
    const len = composeState.text.length;
    const counter = document.getElementById('compose-counter');
    if (counter) { counter.textContent = `${len} / 280`; counter.classList.toggle('over-limit', len > 280); }
    const submitBtn = document.getElementById('compose-submit');
    if (submitBtn) submitBtn.disabled = composeState.text.trim().length === 0 || len > 280;
  }
  if (composeState.imageDataUrl) {
    const wrap = document.getElementById('compose-image-preview-wrap');
    const img = document.getElementById('compose-image-preview');
    if (wrap && img) { img.src = composeState.imageDataUrl; wrap.style.display = ''; }
  }
}

function renderPostDetail(postId) {
  const post = DB.Posts.getById(postId);
  if (!post) { Router.navigate('#timeline'); return; }

  const currentUser = DB.Session.currentUser();
  const author = DB.Users.getById(post.userId);
  const isOwn = post.userId === currentUser.id;
  const isLiked = DB.Likes.existsByPostAndUser(post.id, currentUser.id);
  const comments = DB.Comments.getByPostId(post.id);

  const commentsHtml = comments.length > 0
    ? comments.map(c => {
        const a = DB.Users.getById(c.userId);
        return a ? buildCommentItem(c, a, currentUser.id) : '';
      }).join('')
    : buildEmptyState('まだコメントがありません', '💬');

  document.getElementById('app').innerHTML = `
    <div class="layout">
      ${buildSidebar('timeline')}
      <main class="content">
        ${buildContentHeader('投稿詳細')}
        <a class="back-link" href="#timeline">← タイムラインに戻る</a>

        <div class="post-detail-card" data-post-id="${post.id}">
          <div class="post-detail-card__header">
            <a href="#profile-${author.id}" class="username-link" data-user-id="${author.id}">
              ${buildAvatar(author, 'avatar--lg')}
            </a>
            <div class="post-detail-card__user">
              <a class="post-detail-card__username username-link" href="#profile-${author.id}" data-user-id="${author.id}">@${escapeHtml(author.username)}</a>
              <span style="font-size:13px;color:var(--color-text-secondary)">${new Date(post.createdAt).toLocaleString('ja-JP')}</span>
            </div>
            ${isOwn ? `<button class="post-card__menu-btn post-menu-btn" data-post-id="${post.id}" title="メニュー">•••</button>` : ''}
          </div>
          <p class="post-detail-card__text">${escapeHtml(post.content)}</p>
          ${post.imageDataUrl ? `<img class="post-detail-card__image" src="${post.imageDataUrl}" alt="投稿画像">` : ''}
          <div class="post-detail-card__actions">
            <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
              <span class="like-icon">${isLiked ? '♥' : '♡'}</span>
              <span class="like-count">${post.likeCount}</span> いいね
            </button>
            <span style="color:var(--color-text-secondary);font-size:14px;align-self:center">
              💬 <span class="comment-count">${post.commentCount}</span> 件のコメント
            </span>
          </div>
        </div>

        <div class="comments-section">
          <div class="comments-header">コメント（<span class="comment-count">${post.commentCount}</span>件）</div>
          <div id="comments-list">${commentsHtml}</div>
          <form class="comment-form" id="comment-form" data-post-id="${post.id}">
            <textarea class="comment-textarea" id="comment-text" placeholder="コメントを入力..." rows="3"></textarea>
            <div class="comment-form__footer">
              <button class="btn btn-primary" type="submit">コメントする</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  `;

}

function renderProfile(userId) {
  const targetUser = DB.Users.getById(userId);
  if (!targetUser) { Router.navigate('#timeline'); return; }

  const currentUser = DB.Session.currentUser();
  const isOwnProfile = userId === currentUser.id;
  const isFollowing = DB.Follows.isFollowing(currentUser.id, userId);
  const posts = DB.Posts.getByUserId(userId);
  const pagePosts = posts.slice(0, PAGE_SIZE);
  const hasMore = posts.length > PAGE_SIZE;

  profileFeedState.userId = userId;
  profileFeedState.page = 0;

  const postListHtml = pagePosts.length > 0
    ? pagePosts.map(p => buildPostCard(p, currentUser.id)).join('')
    : buildEmptyState('まだ投稿がありません', '🕊️');

  document.getElementById('app').innerHTML = `
    <div class="layout">
      ${buildSidebar(isOwnProfile ? 'profile' : '')}
      <main class="content">
        ${buildContentHeader('プロフィール')}
        <div class="profile-header">
          <div class="profile-header__top">
            ${buildAvatar(targetUser, 'avatar--xl')}
            <div style="margin-left:12px;flex:1">
              <p class="profile-display-name">${escapeHtml(displayName(targetUser))}</p>
              <p class="profile-username">@${escapeHtml(targetUser.username)}</p>
              ${targetUser.bio ? `<p class="profile-bio">${escapeHtml(targetUser.bio)}</p>` : ''}
              <div class="profile-stats">
                <span>フォロワー <strong id="profile-follower-count">${targetUser.followerCount}</strong></span>
                <span>フォロー中 <strong id="profile-following-count">${targetUser.followingCount}</strong></span>
              </div>
            </div>
            <div style="margin-left:auto;flex-shrink:0">
              ${isOwnProfile
                ? `<a class="btn btn-secondary" href="#profile-edit" style="text-decoration:none">プロフィールを編集</a>`
                : `<button
                    class="follow-btn ${isFollowing ? 'follow-btn--following' : 'follow-btn--follow'} toggle-follow-btn"
                    data-user-id="${targetUser.id}"
                    data-following="${isFollowing ? '1' : '0'}">
                    ${isFollowing ? 'フォロー中' : 'フォローする'}
                  </button>`
              }
            </div>
          </div>
        </div>

        <div class="profile-posts-header">@${escapeHtml(targetUser.username)} の投稿（${posts.length}件）</div>
        <div id="profile-post-list">${postListHtml}</div>
        ${hasMore ? `<div class="load-more-container"><button class="btn btn-secondary" id="profile-load-more-btn">もっと読み込む</button></div>` : ''}
      </main>
    </div>
  `;
}

function renderSearch() {
  const hash = window.location.hash;
  const qMatch = hash.match(/[?&]q=([^&]*)/);
  const q = qMatch ? decodeURIComponent(qMatch[1]) : '';

  document.getElementById('app').innerHTML = `
    <div class="layout">
      ${buildSidebar('search')}
      <main class="content">
        ${buildContentHeader('ユーザー検索')}
        <div class="search-page">
          <form class="search-form" id="search-form">
            <input class="search-input" type="text" id="search-input" placeholder="ユーザー名を入力..." value="${escapeHtml(q)}" autocomplete="off">
          </form>
          <div class="search-result-meta" id="search-meta"></div>
          <div id="search-results"></div>
        </div>
      </main>
    </div>
  `;

  // 初期クエリがあれば結果を表示
  if (q) updateSearchResults(q);

  // リアルタイム検索
  const searchInput = document.getElementById('search-input');
  searchInput?.focus();
  searchInput?.addEventListener('input', () => updateSearchResults(searchInput.value.trim()));
}

function renderProfileEdit() {
  const currentUser = DB.Session.currentUser();
  editState.imageDataUrl = currentUser.avatarDataUrl;

  document.getElementById('app').innerHTML = `
    <div class="layout">
      ${buildSidebar('profile')}
      <main class="content">
        <a class="back-link" href="#profile-${currentUser.id}">← プロフィールに戻る</a>
        <form class="profile-edit" id="profile-edit-form" novalidate>
          <h2>プロフィールを編集</h2>
          <div class="form-error" id="profile-edit-error"></div>

          <div class="profile-edit__section">
            <span class="profile-edit__label">アイコン画像</span>
            <div class="profile-edit__avatar-wrap">
              ${buildAvatar(currentUser, 'avatar--xl')}
              <div>
                <label class="btn btn-secondary" for="avatar-image-input" style="cursor:pointer">画像を変更</label>
                <input type="file" id="avatar-image-input" accept="image/jpeg,image/png,image/gif" style="display:none">
                <div style="font-size:12px;color:var(--color-text-secondary);margin-top:6px">JPEG / PNG / GIF、最大 4MB</div>
              </div>
            </div>
          </div>

          <div class="profile-edit__section">
            <label class="profile-edit__label" for="edit-display-name">表示名</label>
            <input class="form-input" type="text" id="edit-display-name" maxlength="50"
              placeholder="表示名（絵文字・スペース可）" value="${escapeHtml(displayName(currentUser))}">
          </div>

          <div class="profile-edit__section">
            <label class="profile-edit__label" for="edit-username">ユーザー名（@）</label>
            <input class="form-input" type="text" id="edit-username" maxlength="50"
              placeholder="半角英数字・アンダースコア" value="${escapeHtml(currentUser.username)}">
            <span style="font-size:12px;color:var(--color-text-secondary);margin-top:4px;display:block">半角英数字・アンダースコアのみ、50文字以内</span>
          </div>

          <div class="profile-edit__section">
            <label class="profile-edit__label" for="edit-bio">自己紹介</label>
            <textarea class="profile-edit__bio" id="edit-bio" placeholder="自己紹介を入力..." rows="4">${escapeHtml(currentUser.bio || '')}</textarea>
          </div>

          <div class="profile-edit__actions">
            <a class="btn btn-secondary" href="#profile-${currentUser.id}" style="text-decoration:none">キャンセル</a>
            <button class="btn btn-primary" type="submit">保存</button>
          </div>
        </form>
      </main>
    </div>
  `;

  // Set avatar preview ID for the change handler
  const avatarEl = document.querySelector('.profile-edit__avatar-wrap .avatar');
  if (avatarEl) avatarEl.id = 'avatar-preview';
}

// ─── 9. Router ────────────────────────────────────────────────────────────────
const Router = {
  navigate(hash) { window.location.hash = hash; },

  dispatch() {
    const hash = window.location.hash || '';
    const currentUserId = DB.Session.get();

    // Auth guard
    const publicRoutes = ['#login', '#register'];
    if (!currentUserId && !publicRoutes.includes(hash.split('?')[0])) {
      this.navigate('#login');
      return;
    }
    if (currentUserId && (hash === '#login' || hash === '#register' || hash === '')) {
      this.navigate('#timeline');
      return;
    }

    // Update mobile bottom nav
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) {
      bottomNav.hidden = !currentUserId;
      if (currentUserId) {
        const profileLink = document.getElementById('bottom-profile-link');
        if (profileLink) profileLink.href = `#profile-${currentUserId}`;
      }
    }

    // Match route
    if (hash === '#login') { renderLogin(); return; }
    if (hash === '#register') { renderRegister(); return; }
    if (hash === '#timeline') { renderTimeline(); return; }
    if (hash === '#profile-edit') { renderProfileEdit(); return; }
    if (hash.startsWith('#search')) { renderSearch(); return; }

    let m;
    m = hash.match(/^#post-(\d+)$/);
    if (m) { renderPostDetail(parseInt(m[1], 10)); return; }

    m = hash.match(/^#profile-(\d+)$/);
    if (m) { renderProfile(parseInt(m[1], 10)); return; }

    // Fallback
    this.navigate('#timeline');
  },
};

// ─── 10. Bootstrap ────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  seedData();
  migrateData();

  const app = document.getElementById('app');
  app.addEventListener('click', handleAppClick);
  app.addEventListener('submit', handleAppSubmit);
  app.addEventListener('input', handleAppInput);
  app.addEventListener('change', handleAppChange);

  // Mobile bottom nav logout
  document.getElementById('bottom-logout')?.addEventListener('click', handleLogout);

  Router.dispatch();
});

window.addEventListener('hashchange', () => Router.dispatch());
