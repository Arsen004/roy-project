// db.js — авто-миграции + блок/мьют + хэштеги + DM + refresh-токены
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  // Всегда включаем внешние ключи
  db.run(`PRAGMA foreign_keys = ON`);

  // ---------- Базовые таблицы ----------
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      avatar_url TEXT,
      bio TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tweets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT,
      content TEXT,
      media_url TEXT,
      media TEXT, -- JSON массив медиа файлов
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_edited INTEGER DEFAULT 0,
      parent_tweet_id INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tweet_id INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tweet_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tweet_id INTEGER,
      user_id INTEGER,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comment_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(comment_id, user_id),
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS followers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER,
      following_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS retweets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tweet_id INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tweet_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saved_tweets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tweet_id INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, tweet_id)
    )
  `);

  // ---------- Уведомления ----------
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,         -- получатель
      type TEXT,               -- like|comment|retweet|quote|mention
      source_user_id INTEGER,  -- инициатор
      tweet_id INTEGER,
      comment_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      user_id INTEGER PRIMARY KEY,
      allow_like INTEGER DEFAULT 1,
      allow_comment INTEGER DEFAULT 1,
      allow_retweet INTEGER DEFAULT 1,
      allow_quote INTEGER DEFAULT 1,
      allow_mention INTEGER DEFAULT 1,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // --- Блокировки и мьюты ---
  db.run(`
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_id INTEGER NOT NULL,
      blocked_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(blocker_id, blocked_id),
      FOREIGN KEY(blocker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(blocked_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS mutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      muter_id INTEGER NOT NULL,
      muted_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(muter_id, muted_id),
      FOREIGN KEY(muter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(muted_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_mutes_muter ON mutes(muter_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_mutes_muted ON mutes(muted_id)`);

  // --- Хэштеги ---
  db.run(`
    CREATE TABLE IF NOT EXISTS hashtags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT UNIQUE COLLATE NOCASE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS hashtag_tweets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag_id INTEGER NOT NULL,
      tweet_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tag_id, tweet_id),
      FOREIGN KEY(tag_id) REFERENCES hashtags(id) ON DELETE CASCADE,
      FOREIGN KEY(tweet_id) REFERENCES tweets(id) ON DELETE CASCADE
    )
  `);

  // ========== Refresh токены ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      user_agent TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME,
      replaced_by_token_hash TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_refresh_exp ON refresh_tokens(expires_at)`);

  // ========== DM (Direct Messages) ==========
  // 1:1 диалоги. Храним упорядоченную пару user1_id < user2_id
  db.run(`
    CREATE TABLE IF NOT EXISTS dm_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL,
      user2_id INTEGER NOT NULL,
      last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1_id, user2_id),
      FOREIGN KEY(user1_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(user2_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS dm_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(conversation_id) REFERENCES dm_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ---------- АВТО-МИГРАЦИИ СТОЛБЦОВ (на случай старых БД) ----------
  const checks = [
    { table: 'tweets', cols: [
      { name: 'media_url', sql: 'TEXT' },
      { name: 'parent_tweet_id', sql: 'INTEGER' },
      { name: 'created_at', sql: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'media', sql: 'TEXT' },
      { name: 'updated_at', sql: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'is_edited', sql: 'INTEGER DEFAULT 0' },
    ]},
    { table: 'likes', cols: [
      { name: 'created_at', sql: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ]},
    { table: 'comments', cols: [
      { name: 'created_at', sql: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ]},
    { table: 'followers', cols: [
      { name: 'created_at', sql: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ]},
    { table: 'retweets', cols: [
      { name: 'created_at', sql: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ]},
    { table: 'saved_tweets', cols: [
      { name: 'created_at', sql: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ]},
    { table: 'notifications', cols: [
      { name: 'comment_id', sql: 'INTEGER' },
      { name: 'created_at', sql: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ]},
    { table: 'hashtag_tweets', cols: [
      { name: 'created_at', sql: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ]},
  ];

  const alterSqls = [];
  let pending = checks.length;

  checks.forEach(({ table, cols }) => {
    db.all(`PRAGMA table_info(${table})`, (err, info) => {
      if (!err && Array.isArray(info)) {
        cols.forEach(({ name, sql }) => {
          const exists = info.some(c => c.name === name);
          if (!exists) alterSqls.push(`ALTER TABLE ${table} ADD COLUMN ${name} ${sql}`);
        });
      }
      if (--pending === 0) runAltersThenIndexes();
    });
  });

  function runAltersThenIndexes() {
    const runNext = (i) => {
      if (i < alterSqls.length) {
        db.run(alterSqls[i], [], () => runNext(i + 1));
      } else {
        // ---------- Индексы ----------
        db.run(`CREATE INDEX IF NOT EXISTS idx_users_username_nocase   ON users(username)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_tweets_user_created     ON tweets(user, created_at DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_tweets_parent           ON tweets(parent_tweet_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_likes_tweet             ON likes(tweet_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_likes_user              ON likes(user_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_retweets_tweet          ON retweets(tweet_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_retweets_user           ON retweets(user_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_comments_tweet_created  ON comments(tweet_id, created_at ASC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_followers_following     ON followers(following_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_followers_follower      ON followers(follower_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_saved_user_created      ON saved_tweets(user_id, created_at DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_notif_user_created      ON notifications(user_id, created_at DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_notif_user_unread       ON notifications(user_id, is_read)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_notif_tweet             ON notifications(tweet_id)`);

        // DM индексы
        db.run(`CREATE INDEX IF NOT EXISTS idx_dm_conv_pair      ON dm_conversations(user1_id, user2_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_dm_conv_last      ON dm_conversations(last_message_at DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_dm_msg_conv_time  ON dm_messages(conversation_id, created_at DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_dm_msg_unread     ON dm_messages(conversation_id, is_read)`);
      }
    };
    runNext(0);
  }
});

module.exports = db;
