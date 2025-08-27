const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const DB_PATH = './database.db';

console.log('🗑️  Resetting database...');

// Удаляем старую БД
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('✅ Old database deleted');
}

// Создаем новую БД и запускаем миграции
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // Включаем внешние ключи
  db.run(`PRAGMA foreign_keys = ON`);

  // Создаем таблицы (миграции)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      avatar_url TEXT,
      bio TEXT,
      display_name TEXT,
      location TEXT,
      website TEXT,
      cover_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tweets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT,
      content TEXT,
      media_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT,
      source_user_id INTEGER,
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

  db.run(`
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_id INTEGER,
      blocked_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(blocker_id, blocked_id),
      FOREIGN KEY(blocker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(blocked_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS mutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      muter_id INTEGER,
      muted_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(muter_id, muted_id),
      FOREIGN KEY(muter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(muted_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER,
      reported_id INTEGER,
      reason TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(reported_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      email_notifications INTEGER DEFAULT 1,
      push_notifications INTEGER DEFAULT 1,
      private_profile INTEGER DEFAULT 0,
      language TEXT DEFAULT 'en',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      blocked_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, blocked_user_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(blocked_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_mutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      muted_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, muted_user_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(muted_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      token_hash TEXT UNIQUE,
      user_agent TEXT,
      ip TEXT,
      expires_at DATETIME,
      revoked_at DATETIME,
      replaced_by_token_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Database tables created');

  // Создаем тестового пользователя
  bcrypt.hash('test123', 12, (err, hash) => {
    if (err) {
      console.error('❌ Error hashing password:', err);
      db.close();
      return;
    }

    db.run(
      'INSERT INTO users (username, password, bio) VALUES (?, ?, ?)',
      ['testuser', hash, 'Test User'],
      function(err) {
        if (err) {
          console.error('❌ Error creating test user:', err);
        } else {
          console.log('✅ Test user created successfully');
          console.log('   Username: testuser');
          console.log('   Password: test123');
          console.log('   Display Name: Test User');
          console.log('   User ID:', this.lastID);
        }
        
        console.log('\n📊 Database reset complete!');
        console.log('   Database path:', path.resolve(DB_PATH));
        console.log('   Test user ID:', this.lastID);
        console.log('\n🚀 You can now start the server with: npm start');
        
        db.close();
      }
    );
  });
});
