// routes.js — helmet + rate limits + celebrate + блок/мьют + хэштеги + SSE realtime
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { celebrate, Joi, Segments, errors: celebrateErrors } = require('celebrate');
const jwt = require('jsonwebtoken');

try { require('dotenv').config(); } catch (_) {}
const SECRET_KEY = process.env.JWT_SECRET || 'supersecretkey';
const ALLOW_DECODE = String(process.env.JWT_ALLOW_DECODE || '0') === '1';

const db = require('./db');
const authenticateToken = require('./authMiddleware');

/* =========================
   Security headers
========================= */
router.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

/* =========================
   Rate limiting
========================= */
const createTweetLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Слишком много твитов. Попробуй чуть позже.' } });
const commentLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Слишком много комментариев. Попробуй позже.' } });
const actionLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Слишком много действий. Попробуй позже.' } });
const searchLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Слишком много поисковых запросов. Подожди минутку.' } });
const mediaLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Слишком много загрузок. Подожди немного.' } });

/* =========================
   Загрузка медиа
========================= */
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = path
      .basename(file.originalname || `file${Date.now()}`, ext)
      .replace(/\s+/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.mimetype);
    if (!ok) return cb(new Error('Только изображения (png, jpg, webp, gif)'));
    cb(null, true);
  },
});

function mediaUrl(filename, req) {
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/media/${filename}`;
}

/* =======================
   SSE realtime (per-user)
======================= */
// userId -> Set<res>
const sseClients = new Map();

function sseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // для Nginx
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function sseSend(res, event, data) {
  try {
    if (event) res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (_) {}
}

function sseAddClient(userId, res) {
  let set = sseClients.get(userId);
  if (!set) { set = new Set(); sseClients.set(userId, set); }
  set.add(res);
}

function sseRemoveClient(userId, res) {
  const set = sseClients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) {
    sseClients.delete(userId);
}
}

function sendToUser(userId, event, data) {
  const set = sseClients.get(userId);
  if (!set) return;
  
  set.forEach(res => {
    try {
      sseSend(res, event, data);
    } catch (e) {
      console.error('SSE send error:', e);
      sseRemoveClient(userId, res);
    }
  });
}

// SSE stream для уведомлений
router.get('/notifications/stream', (req, res) => {
  // Поддержка токена в URL для EventSource
  let userId = null;
  
  if (req.user && req.user.id) {
    userId = req.user.id;
  } else if (req.query.token) {
    try {
      const payload = jwt.verify(req.query.token, SECRET_KEY);
      userId = payload.id;
  } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log('SSE connection from user:', userId);
  
  // Устанавливаем заголовки SSE
  sseHeaders(res);
  
  // Отправляем приветственное событие
  sseSend(res, 'ready', { ok: true, now: Date.now() });
  
  // Добавляем клиента в список
  sseAddClient(userId, res);
  
  // Heartbeat каждые 25 секунд
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: ping\ndata: ${Date.now()}\n\n`);
    } catch (e) {
      console.error('SSE heartbeat error:', e);
      clearInterval(heartbeat);
      sseRemoveClient(userId, res);
    }
  }, 25000);
  
  // Обработка закрытия соединения
  req.on('close', () => {
    console.log('SSE connection closed for user:', userId);
    clearInterval(heartbeat);
    sseRemoveClient(userId, res);
  });
  
  req.on('error', (err) => {
    console.error('SSE connection error:', err);
    clearInterval(heartbeat);
    sseRemoveClient(userId, res);
  });
});

/* =======================
   Helpers: блок/мьют
====================== */
function isBlockedBetween(aId, bId, cb) {
  if (!aId || !bId) return cb(false);
  db.get(
    `SELECT 1 FROM blocks 
     WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
     LIMIT 1`,
    [aId, bId, bId, aId],
    (err, row) => cb(!err && !!row)
  );
}
function getTweetAuthorId(tweetId, cb) {
  db.get(`SELECT u.id AS uid 
          FROM tweets t JOIN users u ON u.username = t.user
          WHERE t.id = ?`, [tweetId], (err, row) => cb(err, row?.uid || null));
}

/* =======================
   Helpers: хэштеги
====================== */
function extractHashtags(text) {
  if (!text) return [];
  const set = new Set();
  const re = /#([^\s#]{1,50})/gu;
  let m;
  while ((m = re.exec(text)) !== null) set.add(m[1].toLowerCase());
  return Array.from(set);
}
function indexHashtagsForTweet(tweetId, content) {
  const tags = extractHashtags(content);
  if (!tags.length) return;
  tags.forEach((tag) => {
    db.run(`INSERT OR IGNORE INTO hashtags (tag) VALUES (?)`, [tag], function () {
      db.get(`SELECT id FROM hashtags WHERE tag = ?`, [tag], (e2, row) => {
        if (e2 || !row) return;
        db.run(`INSERT OR IGNORE INTO hashtag_tweets (tag_id, tweet_id) VALUES (?, ?)`, [row.id, tweetId], () => {});
      });
    });
  });
}

/* =======================
   Helpers: уведомления + SSE
====================== */
function notifyUnreadCount(userId) {
  db.get(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`, [userId], (err, row) => {
    if (!err) publishTo(userId, 'notifications:unread_count', { count: row.c });
  });
}

function createNotification(userId, type, sourceUserId, tweetId, commentId = null) {
  if (!userId || userId === sourceUserId) return;

  isBlockedBetween(userId, sourceUserId, (blocked) => {
    if (blocked) return;
    db.get(`SELECT 1 FROM mutes WHERE muter_id = ? AND muted_id = ? LIMIT 1`,
      [userId, sourceUserId],
      (mErr, mRow) => {
        if (mErr || mRow) return;

        db.get(`SELECT * FROM notification_settings WHERE user_id = ?`, [userId], (sErr, st) => {
          const allowed = !st || (
            (type === 'like' && st.allow_like) ||
            (type === 'comment' && st.allow_comment) ||
            (type === 'retweet' && st.allow_retweet) ||
            (type === 'quote' && st.allow_quote) ||
            (type === 'mention' && st.allow_mention)
          );
          if (!allowed) return actuallyCreate(false);
          actuallyCreate(true);
        });
      });
  });

  function actuallyCreate(push) {
    db.run(
      `INSERT INTO notifications (user_id, type, source_user_id, tweet_id, comment_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, type, sourceUserId, tweetId || null, commentId],
      function (err) {
        if (err) { console.error('Ошибка при создании уведомления:', err.message); return; }
        const id = this.lastID;
        if (push) {
          publishTo(userId, 'notification:new', { id, type, source_user_id: sourceUserId, tweet_id: tweetId, comment_id: commentId });
          notifyUnreadCount(userId);
        }
      }
    );
  }
}

function existsRecent({ type, sourceUserId, userId, tweetId = null, commentId = null, withinSec = 5 }) {
  return new Promise((resolve) => {
    const sinceStr = `-${withinSec} seconds`;
    db.get(
      `
      SELECT id
      FROM notifications
      WHERE type = ?
        AND source_user_id = ?
        AND user_id = ?
        AND IFNULL(tweet_id, -1) = IFNULL(?, -1)
        AND IFNULL(comment_id, -1) = IFNULL(?, -1)
        AND created_at >= DATETIME('now', ?)
      LIMIT 1
      `,
      [type, sourceUserId, userId, tweetId, commentId, sinceStr],
      (err, row) => resolve(!err && !!row)
    );
  });
}

async function createNotificationNoSpam({ userId, type, sourceUserId, tweetId = null, commentId = null, withinSec = 5 }) {
  if (!userId || userId === sourceUserId) return;
  const dup = await existsRecent({ type, sourceUserId, userId, tweetId, commentId, withinSec });
  if (dup) return;
  createNotification(userId, type, sourceUserId, tweetId, commentId);
}

function extractMentions(text) {
  const set = new Set();
  if (!text) return [];
  const re = /@([a-zA-Z0-9_]{2,30})/g;
  let m;
  while ((m = re.exec(text)) !== null) set.add(m[1].toLowerCase());
  return Array.from(set);
}
function notifyMentions({ authorId, text, tweetId = null, commentId = null }) {
  const names = extractMentions(text);
  if (!names.length) return;
  names.forEach((name) => {
    db.get(`SELECT id FROM users WHERE LOWER(username) = ?`, [name], async (err, u) => {
      if (err) return;
      if (!u || u.id === authorId) return;
      isBlockedBetween(u.id, authorId, async (blocked) => {
        if (blocked) return;
        db.get(`SELECT 1 FROM mutes WHERE muter_id = ? AND muted_id = ? LIMIT 1`,
          [u.id, authorId],
          async (mErr, mRow) => {
            if (mErr || mRow) return;
            await createNotificationNoSpam({
              userId: u.id, type: 'mention', sourceUserId: authorId, tweetId, commentId,
            });
          });
      });
    });
  });
}

/* =======================
   Общие helper'ы API
======================= */
function clampLimit(raw, def = 20, min = 1, max = 100) {
  const n = parseInt(raw || def, 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(n, max));
}

/* ========= Схемы валидации ========= */
const idParamSchema = celebrate({ [Segments.PARAMS]: Joi.object({ id: Joi.number().integer().min(1).required() }) });
const commentParamSchema = celebrate({
  [Segments.PARAMS]: Joi.object({ tweetId: Joi.number().integer().min(1).required(), commentId: Joi.number().integer().min(1).required() }),
});
const createTweetSchema = celebrate({
  [Segments.BODY]: Joi.object({
    content: Joi.string().allow('').max(280),
    media_url: Joi.string().uri().allow(null, ''),
  }).custom((val) => { if (!val.content && !val.media_url) throw new Error('Нужен текст или медиа'); return val; }),
});

const updateTweetSchema = celebrate({
  [Segments.BODY]: Joi.object({
    content: Joi.string().allow('').max(280),
    media_url: Joi.string().uri().allow(null, ''),
  }),
});
const quoteSchema = celebrate({ [Segments.BODY]: Joi.object({ content: Joi.string().min(1).max(280).required() }) });
const commentSchema = celebrate({ [Segments.BODY]: Joi.object({ content: Joi.string().min(1).max(500).required() }) });
const followSchema = celebrate({ [Segments.BODY]: Joi.object({ following_id: Joi.number().integer().min(1).required() }) });
const searchSchema = celebrate({ [Segments.QUERY]: Joi.object({ q: Joi.string().min(1).max(100).required() }) });
const listSchema = celebrate({ [Segments.QUERY]: Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  cursor: Joi.string().isoDate().optional(),
})});
const notifListSchema = celebrate({ [Segments.QUERY]: Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  cursor: Joi.string().isoDate().optional(),
  only_unread: Joi.string().valid('0', '1').optional(),
  types: Joi.string().pattern(/^(like|comment|retweet|quote|mention)(,(like|comment|retweet|quote|mention))*$/).optional(),
})});
const notifSettingsSchema = celebrate({ [Segments.BODY]: Joi.object({
  allow_like: Joi.boolean().optional(),
  allow_comment: Joi.boolean().optional(),
  allow_retweet: Joi.boolean().optional(),
  allow_quote: Joi.boolean().optional(),
  allow_mention: Joi.boolean().optional(),
})});

// теги
const tagParamSchema = celebrate({
  [Segments.PARAMS]: Joi.object({
    tag: Joi.string().trim().min(1).max(50).pattern(/^[^\s#]+$/).required(),
  }),
});
const trendingSchema = celebrate({
  [Segments.QUERY]: Joi.object({
    window: Joi.string().valid('1h','6h','24h','7d','30d','all').optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
  }),
});

/* ========= Медиа ========= */
router.post('/media/upload', authenticateToken, mediaLimiter, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.log('Multer error:', err);
      return res.status(400).json({ error: err.message });
    }
    
    console.log('=== MEDIA UPLOAD REQUEST ===');
    console.log('Headers:', req.headers);
    console.log('User:', req.user?.username);
    console.log('User ID:', req.user?.id);
    console.log('File:', req.file);
    console.log('Body:', req.body);
    
    if (!req.file) {
      console.log('No file received');
      return res.status(400).json({ error: 'Файл не получен' });
    }
    
    const url = mediaUrl(req.file.filename, req);
    console.log('Generated URL:', url);
    console.log('=== END MEDIA UPLOAD ===');
    
    res.status(201).json({ filename: req.file.filename, url, size: req.file.size, mimetype: req.file.mimetype });
  });
});

router.get('/media/:filename', (req, res) => {
  const fp = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Файл не найден' });
  res.sendFile(fp);
});

/* ========= Твиты ========= */
router.get('/tweets', listSchema, (req, res) => {
  const limit = clampLimit(req.query.limit);
  const cursor = req.query.cursor || null;

  const where = [];
  const params = [];

  if (cursor) { where.push('t.created_at < ?'); params.push(cursor); }

  let join = 'JOIN users u ON u.username = t.user';
  if (req.user && req.user.id) {
    where.push(`u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)`);
    where.push(`u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)`);
    where.push(`u.id NOT IN (SELECT muted_id FROM mutes WHERE muter_id = ?)`);
    params.push(req.user.id, req.user.id, req.user.id);
  }

  const sql = `
    SELECT t.*
    FROM tweets t
    ${join}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY t.created_at DESC
    LIMIT ?
  `;
  params.push(limit);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const nextCursor = rows.length ? rows[rows.length - 1].created_at : null;
    res.json({ items: rows, nextCursor });
  });
});

router.get('/tweets/:id', idParamSchema, (req, res) => {
  const tweetId = parseInt(req.params.id, 10);

  const sql = `
    SELECT t.*
    FROM tweets t
    WHERE t.id = ?
  `;

  db.get(sql, [tweetId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Tweet not found' });
    res.json(row);
  });
});

router.post('/tweets', authenticateToken, createTweetLimiter, createTweetSchema, (req, res) => {
  const { content = '', media_url = null } = req.body;
  const user = req.user.username;
  const authorId = req.user.id;

  db.run('INSERT INTO tweets (user, content, media_url) VALUES (?, ?, ?)', [user, content, media_url], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const newTweetId = this.lastID;

    indexHashtagsForTweet(newTweetId, content);
    notifyMentions({ authorId, text: content, tweetId: newTweetId, commentId: null });

    res.status(201).json({ id: newTweetId, user, content, media_url });
  });
});

router.delete('/tweets/:id', authenticateToken, idParamSchema, (req, res) => {
  const tweetId = parseInt(req.params.id, 10);
  const username = req.user.username;

  db.get('SELECT * FROM tweets WHERE id = ?', [tweetId], (err, tweet) => {
    if (err || !tweet) return res.status(404).json({ error: 'Твит не найден' });
    if (tweet.user !== username) return res.status(403).json({ error: 'Вы не автор твита' });

    db.serialize(() => {
      db.run('DELETE FROM comments WHERE tweet_id = ?', [tweetId]);
      db.run('DELETE FROM likes WHERE tweet_id = ?', [tweetId]);
      db.run('DELETE FROM retweets WHERE tweet_id = ?', [tweetId]);
      db.run('DELETE FROM tweets WHERE parent_tweet_id = ?', [tweetId]);
      db.run('DELETE FROM notifications WHERE tweet_id = ?', [tweetId]);
      db.run('DELETE FROM hashtag_tweets WHERE tweet_id = ?', [tweetId]);
      db.run('DELETE FROM tweets WHERE id = ?', [tweetId], function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: 'Твит и связанные данные удалены' });
      });
    });
  });
});



/* ===== Ретвиты и цитаты ===== */
router.post('/tweets/:id/retweet', authenticateToken, actionLimiter, idParamSchema, (req, res) => {
  const tweetId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  getTweetAuthorId(tweetId, (e1, authorId) => {
    if (e1 || !authorId) return res.status(404).json({ error: 'Твит не найден' });
    isBlockedBetween(userId, authorId, (blocked) => {
      if (blocked) return res.status(403).json({ error: 'Действие запрещено (блок)' });

      db.run(`INSERT OR IGNORE INTO retweets (tweet_id, user_id) VALUES (?, ?)`, [tweetId, userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        db.get('SELECT id FROM users WHERE id = ?', [authorId], async (_e2, target) => {
          if (target) {
            await createNotificationNoSpam({ userId: target.id, type: 'retweet', sourceUserId: userId, tweetId });
          }
        });

        res.status(201).json({ message: 'Ретвит выполнен' });
      });
    });
  });
});

router.delete('/tweets/:id/retweet', authenticateToken, idParamSchema, (req, res) => {
  const tweetId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  db.run('DELETE FROM retweets WHERE tweet_id = ? AND user_id = ?', [tweetId, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Ретвит удалён' });
  });
});

router.post('/tweets/:id/quote', authenticateToken, actionLimiter, idParamSchema, quoteSchema, (req, res) => {
  const parentTweetId = parseInt(req.params.id, 10);
  const user = req.user.username;
  const userId = req.user.id;
  const { content } = req.body;

  getTweetAuthorId(parentTweetId, (e1, authorId) => {
    if (e1 || !authorId) return res.status(404).json({ error: 'Оригинальный твит не найден' });
    isBlockedBetween(userId, authorId, (blocked) => {
      if (blocked) return res.status(403).json({ error: 'Действие запрещено (блок)' });

      db.run(`INSERT INTO tweets (user, content, parent_tweet_id) VALUES (?, ?, ?)`, [user, content, parentTweetId], function (insErr) {
        if (insErr) return res.status(500).json({ error: insErr.message });

        indexHashtagsForTweet(this.lastID, content);
        createNotificationNoSpam({ userId: authorId, type: 'quote', sourceUserId: userId, tweetId: parentTweetId });
        notifyMentions({ authorId: userId, text: content, tweetId: this.lastID, commentId: null });

        res.status(201).json({ message: 'Цитата создана', id: this.lastID });
      });
    });
  });
});

/* ========= Лайки ========= */
function pushTweetLikeCount(tweetId, userIds = []) {
  db.get('SELECT COUNT(*) AS count FROM likes WHERE tweet_id = ?', [tweetId], (err, row) => {
    const count = err ? null : row.count;
    if (count === null) return;
    publishMany(userIds, 'tweet:like_count', { tweet_id: tweetId, count });
  });
}









/* ========= Комментарии ========= */




router.get('/tweets/:id/comments', idParamSchema, listSchema, (req, res) => {
  const tweetId = req.params.id;
  const limit = clampLimit(req.query.limit);
  const cursor = req.query.cursor || null;

  const where = ['comments.tweet_id = ?'];
  const params = [tweetId];

  if (cursor) { where.push('comments.created_at < ?'); params.push(cursor); }

  let join = 'JOIN users ON users.id = comments.user_id';
  if (req.user && req.user.id) {
    where.push(`users.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)`);
    where.push(`users.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)`);
    where.push(`users.id NOT IN (SELECT muted_id FROM mutes WHERE muter_id = ?)`);
    params.push(req.user.id, req.user.id, req.user.id);
  }

  const sql = `
    SELECT comments.*, users.username
    FROM comments
    ${join}
    WHERE ${where.join(' AND ')}
    ORDER BY comments.created_at ASC
    LIMIT ?
  `;
  params.push(limit);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const nextCursor = rows.length ? rows[rows.length - 1].created_at : null;
    res.json({ items: rows, nextCursor });
  });
});

router.put('/tweets/:tweetId/comments/:commentId', authenticateToken, commentParamSchema, commentSchema, (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;
  const commentId = parseInt(req.params.commentId, 10);

  db.get('SELECT * FROM comments WHERE id = ?', [commentId], (err, comment) => {
    if (err || !comment) return res.status(404).json({ error: 'Комментарий не найден' });
    if (comment.user_id !== userId) return res.status(403).json({ error: 'Вы не автор' });

    db.run('UPDATE comments SET content = ? WHERE id = ?', [content, commentId], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: 'Комментарий обновлён' });
    });
  });
});

router.delete('/tweets/:tweetId/comments/:commentId', authenticateToken, commentParamSchema, (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);
  const userId = req.user.id;

  db.get('SELECT * FROM comments WHERE id = ?', [commentId], (err, comment) => {
    if (err || !comment) return res.status(404).json({ error: 'Комментарий не найден' });
    if (comment.user_id !== userId) return res.status(403).json({ error: 'Вы не автор' });

    db.run('DELETE FROM comments WHERE id = ?', [commentId], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: 'Комментарий удалён' });
    });
  });
});

/* ========= Профиль ========= */

router.get('/users/:id(\\d+)', idParamSchema, (req, res) => {
  const userId = parseInt(req.params.id, 10);

  db.get('SELECT username, avatar_url, bio FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    db.get(
      `SELECT 
         (SELECT COUNT(*) FROM followers WHERE following_id = ?) AS followers,
         (SELECT COUNT(*) FROM followers WHERE follower_id = ?) AS following`,
      [userId, userId],
      (err2, counts) => {
        if (err2) return res.status(500).json({ error: err2.message });

        db.all('SELECT * FROM tweets WHERE user = ? ORDER BY created_at DESC', [user.username], (err3, tweets) => {
          if (err3) return res.status(500).json({ error: err3.message });

          res.json({
            id: userId,
            username: user.username,
            displayName: user.username,
            avatarUrl: user.avatar_url || '',
            bio: user.bio,
            followers: counts.followers,
            following: counts.following,
            tweets,
          });
        });
      }
    );
  });
});

router.get('/users/:id(\\d+)/tweets', idParamSchema, listSchema, (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const limit = clampLimit(req.query.limit);
  const cursor = req.query.cursor || null;

  db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    const where = ['t.user = ?'];
    const params = [user.username];

    if (cursor) { where.push('t.created_at < ?'); params.push(cursor); }

    let join = 'tweets t';
    if (req.user && req.user.id) {
      where.push(`t.user NOT IN (
        SELECT u.username FROM users u 
        WHERE u.id IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
        OR u.id IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
        OR u.id IN (SELECT muted_id FROM mutes WHERE muter_id = ?)
      )`);
      params.push(req.user.id, req.user.id, req.user.id);
    }

    const sql = `
      SELECT t.*
      FROM ${join}
      WHERE ${where.join(' AND ')}
      ORDER BY t.created_at DESC
      LIMIT ?
    `;
    params.push(limit);

    db.all(sql, params, (e2, rows) => {
      if (e2) return res.status(500).json({ error: e2.message });
      const nextCursor = rows.length ? rows[rows.length - 1].created_at : null;
      res.json({ items: rows, nextCursor });
    });
  });
});

router.put('/users/me', authenticateToken, celebrate({
  [Segments.BODY]: Joi.object({ avatar_url: Joi.string().uri().allow(null, ''), bio: Joi.string().max(160).allow(null, '') })
}), (req, res) => {
  const { avatar_url = null, bio = null } = req.body;
  const userId = req.user.id;

  db.run('UPDATE users SET avatar_url = ?, bio = ? WHERE id = ?', [avatar_url || null, bio || null, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Профиль обновлён' });
  });
});

router.delete('/users/me', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Пользователь удалён' });
  });
});

/* ========= Дополнительные API пользователей ========= */

// Получить ответы пользователя
router.get('/users/:id(\\d+)/replies', idParamSchema, listSchema, (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const limit = clampLimit(req.query.limit);
  const cursor = req.query.cursor || null;

  db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    const where = ['t.user = ? AND t.parent_tweet_id IS NOT NULL'];
    const params = [user.username];

  if (cursor) { where.push('t.created_at < ?'); params.push(cursor); }

  const sql = `
      SELECT t.*
    FROM tweets t
    WHERE ${where.join(' AND ')}
    ORDER BY t.created_at DESC
    LIMIT ?
  `;
    params.push(limit);

    db.all(sql, params, (e2, rows) => {
      if (e2) return res.status(500).json({ error: e2.message });
      const nextCursor = rows.length ? rows[rows.length - 1].created_at : null;
      res.json({ items: rows, nextCursor });
    });
  });
});

// Получить медиа посты пользователя
router.get('/users/:id(\\d+)/media', idParamSchema, listSchema, (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const limit = clampLimit(req.query.limit);
  const cursor = req.query.cursor || null;

  db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    const where = ['t.user = ? AND t.media_url IS NOT NULL AND t.media_url != ""'];
    const params = [user.username];

    if (cursor) { where.push('t.created_at < ?'); params.push(cursor); }

    const sql = `
      SELECT t.*
      FROM tweets t
      WHERE ${where.join(' AND ')}
      ORDER BY t.created_at DESC
      LIMIT ?
    `;
    params.push(limit);

    db.all(sql, params, (e2, rows) => {
      if (e2) return res.status(500).json({ error: e2.message });
      const nextCursor = rows.length ? rows[rows.length - 1].created_at : null;
      res.json({ items: rows, nextCursor });
    });
  });
});

// Получить лайки пользователя
router.get('/users/:id(\\d+)/likes', idParamSchema, listSchema, (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const limit = clampLimit(req.query.limit);
  const cursor = req.query.cursor || null;

  db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    const where = ['l.user_id = ?'];
    const params = [userId];

  if (cursor) { where.push('t.created_at < ?'); params.push(cursor); }

  const sql = `
    SELECT t.*
      FROM likes l
      JOIN tweets t ON t.id = l.tweet_id
    WHERE ${where.join(' AND ')}
    ORDER BY t.created_at DESC
    LIMIT ?
  `;
  params.push(limit);

    db.all(sql, params, (e2, rows) => {
      if (e2) return res.status(500).json({ error: e2.message });
    const nextCursor = rows.length ? rows[rows.length - 1].created_at : null;
    res.json({ items: rows, nextCursor });
    });
  });
});

// Обновить профиль пользователя
router.put('/users/profile', authenticateToken, celebrate({
  [Segments.BODY]: Joi.object({ 
    display_name: Joi.string().max(50).allow(null, ''),
    bio: Joi.string().max(160).allow(null, ''),
    location: Joi.string().max(100).allow(null, ''),
    website: Joi.string().uri().allow(null, '')
  })
}), (req, res) => {
  const userId = req.user.id;
  const { display_name, bio, location, website } = req.body;

  db.run('UPDATE users SET display_name = ?, bio = ?, location = ?, website = ? WHERE id = ?', 
    [display_name || null, bio || null, location || null, website || null, userId], 
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Профиль обновлён' });
    }
  );
});

// Загрузить аватар
router.post('/users/avatar', authenticateToken, mediaLimiter, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    
    const userId = req.user.id;
    const avatarUrl = req.file ? mediaUrl(req.file.filename, req) : null;

    db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Аватар обновлён', avatar_url: avatarUrl });
    });
  });
});

// Загрузить обложку
router.post('/users/cover', authenticateToken, mediaLimiter, (req, res, next) => {
  upload.single('cover')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    
  const userId = req.user.id;
    const coverUrl = req.file ? mediaUrl(req.file.filename, req) : null;

    db.run('UPDATE users SET cover_url = ? WHERE id = ?', [coverUrl, userId], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Обложка обновлена', cover_url: coverUrl });
    });
  });
});

// Удалить обложку
router.delete('/users/cover', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.run('UPDATE users SET cover_url = NULL WHERE id = ?', [userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Обложка удалена' });
  });
});

// Получить статистику профиля
router.get('/users/:id(\\d+)/stats', idParamSchema, (req, res) => {
  const userId = parseInt(req.params.id, 10);

  db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    db.get(`
      SELECT 
        (SELECT COUNT(*) FROM tweets WHERE user = ?) AS tweets_count,
        (SELECT COUNT(*) FROM followers WHERE following_id = ?) AS followers_count,
        (SELECT COUNT(*) FROM followers WHERE follower_id = ?) AS following_count,
        (SELECT COUNT(*) FROM likes WHERE user_id = ?) AS likes_count
    `, [user.username, userId, userId, userId], (err2, stats) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(stats);
    });
  });
});

// Пожаловаться на пользователя
router.post('/users/:id(\\d+)/report', authenticateToken, idParamSchema, celebrate({
  [Segments.BODY]: Joi.object({ 
    reason: Joi.string().min(1).max(500).required(),
    details: Joi.string().max(1000).allow(null, '')
  })
}), (req, res) => {
  const reporterId = req.user.id;
  const reportedId = parseInt(req.params.id, 10);
  const { reason, details } = req.body;

  if (reporterId === reportedId) return res.status(400).json({ error: 'Нельзя пожаловаться на себя' });

  db.run('INSERT INTO user_reports (reporter_id, reported_id, reason, details) VALUES (?, ?, ?, ?)', 
    [reporterId, reportedId, reason, details || null], 
    function (err) {
    if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Жалоба отправлена' });
    }
  );
});

// Заблокировать пользователя
router.post('/users/:id(\\d+)/block', authenticateToken, idParamSchema, (req, res) => {
  const blockerId = req.user.id;
  const blockedId = parseInt(req.params.id, 10);

  if (blockerId === blockedId) return res.status(400).json({ error: 'Нельзя заблокировать себя' });

  db.run('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)', [blockerId, blockedId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Пользователь заблокирован' });
  });
});

// Разблокировать пользователя
router.delete('/users/:id(\\d+)/block', authenticateToken, idParamSchema, (req, res) => {
  const blockerId = req.user.id;
  const blockedId = parseInt(req.params.id, 10);

  db.run('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [blockerId, blockedId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Пользователь разблокирован' });
  });
});

// Замутить пользователя
router.post('/users/:id(\\d+)/mute', authenticateToken, idParamSchema, (req, res) => {
  const muterId = req.user.id;
  const mutedId = parseInt(req.params.id, 10);

  if (muterId === mutedId) return res.status(400).json({ error: 'Нельзя замутить себя' });

  db.run('INSERT OR IGNORE INTO mutes (muter_id, muted_id) VALUES (?, ?)', [muterId, mutedId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Пользователь замучен' });
  });
});

// Размутить пользователя
router.delete('/users/:id(\\d+)/mute', authenticateToken, idParamSchema, (req, res) => {
  const muterId = req.user.id;
  const mutedId = parseInt(req.params.id, 10);

  db.run('DELETE FROM mutes WHERE muter_id = ? AND muted_id = ?', [muterId, mutedId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Пользователь размучен' });
  });
});

/* ========= Settings API ========= */

// Получить настройки пользователя
router.get('/users/settings', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get('SELECT * FROM user_settings WHERE user_id = ?', [userId], (err, settings) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!settings) {
      // Создаем дефолтные настройки
      db.run('INSERT INTO user_settings (user_id) VALUES (?)', [userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({
          emailNotifications: true,
          pushNotifications: true,
          privateProfile: false,
          language: 'en'
        });
      });
    } else {
      res.json({
        emailNotifications: !!settings.email_notifications,
        pushNotifications: !!settings.push_notifications,
        privateProfile: !!settings.private_profile,
        language: settings.language || 'en'
      });
    }
  });
});

// Обновить настройки пользователя
router.put('/users/settings', authenticateToken, celebrate({
  [Segments.BODY]: Joi.object({
    emailNotifications: Joi.boolean().optional(),
    pushNotifications: Joi.boolean().optional(),
    privateProfile: Joi.boolean().optional(),
    language: Joi.string().valid('en', 'ru', 'es', 'fr').optional()
  })
}), (req, res) => {
  const userId = req.user.id;
  const { emailNotifications, pushNotifications, privateProfile, language } = req.body;

  const updates = [];
  const params = [];

  if (emailNotifications !== undefined) {
    updates.push('email_notifications = ?');
    params.push(emailNotifications ? 1 : 0);
  }
  if (pushNotifications !== undefined) {
    updates.push('push_notifications = ?');
    params.push(pushNotifications ? 1 : 0);
  }
  if (privateProfile !== undefined) {
    updates.push('private_profile = ?');
    params.push(privateProfile ? 1 : 0);
  }
  if (language !== undefined) {
    updates.push('language = ?');
    params.push(language);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Нет полей для обновления' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId);

  db.run(`UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });

    // Возвращаем обновленные настройки
    db.get('SELECT * FROM user_settings WHERE user_id = ?', [userId], (err2, settings) => {
      if (err2) return res.status(500).json({ error: err2.message });

      res.json({
        emailNotifications: !!settings.email_notifications,
        pushNotifications: !!settings.push_notifications,
        privateProfile: !!settings.private_profile,
        language: settings.language || 'en'
      });
    });
  });
});

// Получить заблокированных пользователей
router.get('/users/blocked', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(`
    SELECT u.id, u.username, u.display_name AS displayName, u.avatar_url AS avatarUrl
    FROM user_blocks ub
    JOIN users u ON u.id = ub.blocked_user_id
    WHERE ub.user_id = ?
    ORDER BY ub.created_at DESC
  `, [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Заблокировать пользователя
router.post('/users/blocked', authenticateToken, celebrate({
  [Segments.BODY]: Joi.object({
    userId: Joi.number().integer().min(1).required()
  })
}), (req, res) => {
  const blockerId = req.user.id;
  const blockedId = req.body.userId;

  if (blockerId === blockedId) {
    return res.status(400).json({ error: 'Нельзя заблокировать себя' });
  }

  db.run('INSERT OR IGNORE INTO user_blocks (user_id, blocked_user_id) VALUES (?, ?)', 
    [blockerId, blockedId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
      res.status(204).send();
    }
  );
});

// Разблокировать пользователя
router.delete('/users/blocked/:id', authenticateToken, idParamSchema, (req, res) => {
  const blockerId = req.user.id;
  const blockedId = parseInt(req.params.id, 10);

  db.run('DELETE FROM user_blocks WHERE user_id = ? AND blocked_user_id = ?', 
    [blockerId, blockedId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
      res.status(204).send();
    }
  );
});

// Получить замученных пользователей
router.get('/users/muted', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(`
    SELECT u.id, u.username, u.display_name AS displayName, u.avatar_url AS avatarUrl
    FROM user_mutes um
    JOIN users u ON u.id = um.muted_user_id
    WHERE um.user_id = ?
    ORDER BY um.created_at DESC
  `, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Замутить пользователя
router.post('/users/muted', authenticateToken, celebrate({
  [Segments.BODY]: Joi.object({
    userId: Joi.number().integer().min(1).required()
  })
}), (req, res) => {
  const muterId = req.user.id;
  const mutedId = req.body.userId;

  if (muterId === mutedId) {
    return res.status(400).json({ error: 'Нельзя замутить себя' });
  }

  db.run('INSERT OR IGNORE INTO user_mutes (user_id, muted_user_id) VALUES (?, ?)', 
    [muterId, mutedId], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(204).send();
    }
  );
});

// Размутить пользователя
router.delete('/users/muted/:id', authenticateToken, idParamSchema, (req, res) => {
  const muterId = req.user.id;
  const mutedId = parseInt(req.params.id, 10);

  db.run('DELETE FROM user_mutes WHERE user_id = ? AND muted_user_id = ?', 
    [muterId, mutedId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
      res.status(204).send();
    }
  );
});

// Получить активные сессии
router.get('/users/sessions', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(`
    SELECT 
      id,
      user_agent AS device,
      ip,
      created_at AS createdAt,
      created_at AS lastSeen,
      1 AS current
    FROM refresh_tokens
    WHERE user_id = ? AND revoked_at IS NULL
    ORDER BY created_at DESC
  `, [userId], (err, rows) => {
    if (err) {
      console.error('Error fetching sessions:', err);
      // Возвращаем пустой массив вместо ошибки
      return res.json([]);
    }
    res.json(rows || []);
  });
});

/* ========= FOLLOW API ========= */
// Добавить в друзья
router.post('/users/:id(\\d+)/follow', authenticateToken, actionLimiter, (req, res) => {
  const followerId = req.user.id;
  const followingId = parseInt(req.params.id, 10);
  
  console.log('Follow action:', { followerId, followingId });
  
  if (followingId === followerId) return res.status(400).json({ error: 'Нельзя подписаться на себя' });

  // Проверяем блокировки
  db.get('SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)', 
    [followerId, followingId, followingId, followerId], (err, blocked) => {
    if (err) return res.status(500).json({ error: err.message });
    if (blocked) return res.status(403).json({ error: 'Действие запрещено (блок)' });

      db.run(`INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)`, [followerId, followingId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Отправляем уведомление тому, на кого подписались
    sendToUser(followingId, 'notification', {
      type: 'follow',
      sourceUserId: followerId,
      timestamp: Date.now()
    });
    
    console.log('Follow success:', { followerId, followingId });
    res.status(204).send();
  });
  });
});

// Убрать из друзей
router.delete('/users/:id(\\d+)/follow', authenticateToken, actionLimiter, (req, res) => {
  const followerId = req.user.id;
  const followingId = parseInt(req.params.id, 10);
  
  console.log('Unfollow action:', { followerId, followingId });

  db.run('DELETE FROM followers WHERE follower_id = ? AND following_id = ?', [followerId, followingId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    console.log('Unfollow success:', { followerId, followingId });
    res.status(204).send();
  });
});

// Мои друзья (кого я подписан)
router.get('/users/me/friends', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.all(
    `SELECT 
      u.id, 
      u.username, 
      u.username AS displayName,
      COALESCE(u.avatar_url, '') AS avatarUrl,
      u.bio,
      f.created_at AS followedAt
     FROM followers f
     JOIN users u ON u.id = f.following_id
     WHERE f.follower_id = ?
     ORDER BY f.created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Профиль пользователя с флагом isFollowing
router.get('/users/:id(\\d+)/profile', authenticateToken, (req, res) => {
  const currentUserId = req.user.id;
  const targetUserId = parseInt(req.params.id, 10);

  db.get('SELECT username, avatar_url, bio, created_at FROM users WHERE id = ?', [targetUserId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    // Проверяем подписку
    db.get('SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?', [currentUserId, targetUserId], (err2, isFollowing) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // Считаем подписчиков и подписки
      db.get(
        `SELECT
           (SELECT COUNT(*) FROM followers WHERE following_id = ?) AS followers,
           (SELECT COUNT(*) FROM followers WHERE follower_id = ?) AS following`,
        [targetUserId, targetUserId],
        (err3, counts) => {
          if (err3) return res.status(500).json({ error: err3.message });

          res.json({
            id: targetUserId,
            username: user.username,
            displayName: user.username,
            avatarUrl: user.avatar_url || '',
            bio: user.bio,
            createdAt: user.created_at,
            followers: counts.followers,
            following: counts.following,
            isFollowing: !!isFollowing
          });
        }
      );
    });
  });
});

/* =========================
   Celebrate errors + Error handler
========================= */
router.use(celebrateErrors());

router.use((err, req, res, _next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Файл слишком большой (макс 8MB).' });
  }
  if (err && err.status === 429) {
    return res.status(429).json({ error: 'Слишком много запросов. Попробуй позже.' });
  }
  const status = err.status || err.statusCode || 500;
  const msg = err.expose ? err.message : 'Внутренняя ошибка сервера';
  console.error('Unhandled error:', err);
  res.status(status).json({ error: msg });
});

/* =======================
   DM (Direct Messages)
======================= */

// Helpers
function sortPair(a, b) { return a < b ? [a, b] : [b, a]; }

function ensureConversation(aId, bId, cb) {
  const [u1, u2] = sortPair(aId, bId);
  db.get(`SELECT * FROM dm_conversations WHERE user1_id = ? AND user2_id = ?`, [u1, u2], (e, row) => {
    if (e) return cb(e);
    if (row) return cb(null, row);
    db.run(`INSERT INTO dm_conversations (user1_id, user2_id) VALUES (?, ?)`, [u1, u2], function (insErr) {
      if (insErr) return cb(insErr);
      db.get(`SELECT * FROM dm_conversations WHERE id = ?`, [this.lastID], cb);
    });
  });
}

function isParticipant(conv, uid) {
  return conv && (conv.user1_id === uid || conv.user2_id === uid);
}
function other(conv, uid) {
  return conv.user1_id === uid ? conv.user2_id : conv.user1_id;
}

// Создать/получить диалог с пользователем
router.post('/dm/conversations', authenticateToken, (req, res) => {
  const me = req.user.id;
  const { user_id } = req.body || {};
  if (!user_id || user_id === me) return res.status(400).json({ error: 'bad user_id' });

  ensureConversation(me, Number(user_id), (err, conv) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(conv);
  });
});

// Список моих диалогов
router.get('/dm/conversations', authenticateToken, (req, res) => {
  const me = req.user.id;
  db.all(
    `SELECT * FROM dm_conversations
     WHERE user1_id = ? OR user2_id = ?
     ORDER BY last_message_at DESC`,
    [me, me],
    (err, convs) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!convs?.length) return res.json([]);

      const tasks = convs.map(c => new Promise(resolve => {
        const otherId = other(c, me);
        db.get(`SELECT id, username, avatar_url FROM users WHERE id = ?`, [otherId], (e1, u) => {
          db.get(
            `SELECT id, content, sender_id, is_read, created_at
             FROM dm_messages WHERE conversation_id = ?
             ORDER BY id DESC LIMIT 1`, [c.id],
            (e2, last) => {
              db.get(
                `SELECT COUNT(*) AS cnt FROM dm_messages
                 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0`,
                [c.id, me],
                (e3, un) => resolve({
                  id: c.id,
                  other_user: u || { id: otherId, username: 'user#'+otherId },
                  last_message: last || null,
                  unread: un?.cnt || 0,
                  updated_at: c.last_message_at
                })
              );
            }
          );
        });
      }));
      Promise.all(tasks).then(list => res.json(list));
    }
  );
});

// История сообщений
router.get('/dm/conversations/:id/messages', authenticateToken, (req, res) => {
  const me = req.user.id;
  const convId = Number(req.params.id);
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const cursor = req.query.cursor ? Number(req.query.cursor) : null;

  db.get(`SELECT * FROM dm_conversations WHERE id = ?`, [convId], (e, c) => {
    if (e || !c) return res.status(404).json({ error: 'not found' });
    if (!isParticipant(c, me)) return res.status(403).json({ error: 'forbidden' });

    const where = [`conversation_id = ?`];
    const params = [convId];
    if (cursor) { where.push('id < ?'); params.push(cursor); }

    db.all(
      `SELECT id, conversation_id, sender_id, content, is_read, created_at
       FROM dm_messages
       WHERE ${where.join(' AND ')}
       ORDER BY id DESC
       LIMIT ?`,
      [...params, limit],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ items: rows.slice().reverse(), nextCursor: rows.length ? rows[rows.length-1].id : null });
      }
    );
  });
});

// Отправить сообщение
router.post('/dm/conversations/:id/messages', authenticateToken, (req, res) => {
  const me = req.user.id;
  const convId = Number(req.params.id);
  const { content } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: 'empty' });

  db.get(`SELECT * FROM dm_conversations WHERE id = ?`, [convId], (e, c) => {
    if (e || !c) return res.status(404).json({ error: 'not found' });
    if (!isParticipant(c, me)) return res.status(403).json({ error: 'forbidden' });

    const recipient = other(c, me);

    db.run(
      `INSERT INTO dm_messages (conversation_id, sender_id, content) VALUES (?, ?, ?)`,
      [convId, me, content],
      function (insErr) {
        if (insErr) return res.status(500).json({ error: insErr.message });

        db.run(`UPDATE dm_conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?`, [convId]);

        const msg = { id: this.lastID, conversation_id: convId, sender_id: me, content, is_read: 0, created_at: new Date().toISOString() };
        // пуш получателю
        publishTo(recipient, 'dm:new', msg);
        res.status(201).json(msg);
      }
    );
  });
});

// Прочитать сообщение
router.put('/dm/messages/:id/read', authenticateToken, (req, res) => {
  const me = req.user.id;
  const msgId = Number(req.params.id);

  db.get(`
    SELECT m.*, c.user1_id, c.user2_id
    FROM dm_messages m
    JOIN dm_conversations c ON c.id = m.conversation_id
    WHERE m.id = ?`, [msgId],
    (e, row) => {
      if (e || !row) return res.status(404).json({ error: 'not found' });
      const amRecipient = row.sender_id !== me && (row.user1_id === me || row.user2_id === me);
      if (!amRecipient) return res.status(403).json({ error: 'forbidden' });
      if (row.is_read) return res.json({ message: 'ok' });

      db.run(`UPDATE dm_messages SET is_read = 1 WHERE id = ?`, [msgId], function (uErr) {
        if (uErr) return res.status(500).json({ error: uErr.message });
        // оповестим отправителя
        publishTo(row.sender_id, 'dm:read', { id: msgId, conversation_id: row.conversation_id });
        res.json({ message: 'ok' });
      });
    }
  );
});

/* ========= Поиск ========= */
router.get('/users/search', searchLimiter, (req, res) => {
  try {
    const query = (req.query.q || '').trim();

    // Валидация: если длина < 2, возвращаем пустой массив
    if (query.length < 2) {
      return res.status(200).json([]);
    }

    if (req.user && req.user.id) {
      const me = req.user.id;
      db.all(
        `
        SELECT
          u.id,
          u.username,
          u.username AS displayName,
          COALESCE(u.avatar_url, '') AS avatarUrl
        FROM users u
        WHERE (u.username LIKE ? OR u.username LIKE ?)
          AND u.id != ?
          AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
          AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
          AND u.id NOT IN (SELECT muted_id FROM mutes WHERE muter_id = ?)
        ORDER BY u.created_at DESC
        LIMIT 10
        `,
        [`%${query}%`, `${query}%`, me, me, me, me],
        (err, rows) => {
          if (err) {
            console.error('Search users DB error:', err);
            return res.status(200).json([]);
          }
          res.status(200).json(rows);
        }
      );
    } else {
      db.all(
        `
        SELECT
          id,
          username,
          username AS displayName,
          COALESCE(avatar_url, '') AS avatarUrl
        FROM users
        WHERE username LIKE ? OR username LIKE ?
        ORDER BY created_at DESC
        LIMIT 10
        `,
        [`%${query}%`, `${query}%`],
        (err, rows) => {
          if (err) {
            console.error('Search users DB error:', err);
            return res.status(200).json([]);
          }
          res.status(200).json(rows);
        }
      );
    }
  } catch (error) {
    console.error('Search users error:', error);
    res.status(200).json([]);
  }
});

/* ========= УНИФИЦИРОВАННЫЕ ДЕЙСТВИЯ С ТВИТАМИ ========= */
// Лайк твита
router.post('/tweets/:id(\\d+)/like', authenticateToken, actionLimiter, (req, res) => {
  const userId = req.user.id;
  const tweetId = parseInt(req.params.id, 10);
  
  console.log('Like tweet action:', { userId, tweetId });

  db.run(`INSERT OR IGNORE INTO likes (tweet_id, user_id) VALUES (?, ?)`, [tweetId, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Отправляем уведомление автору твита
    db.get('SELECT user FROM tweets WHERE id = ?', [tweetId], (err2, tweet) => {
      if (!err2 && tweet) {
        db.get('SELECT id FROM users WHERE username = ?', [tweet.user], (err3, author) => {
          if (!err3 && author && author.id !== userId) {
            sendToUser(author.id, 'notification', {
              type: 'like',
              tweetId,
              sourceUserId: userId,
              timestamp: Date.now()
            });
          }
        });
      }
    });
    
    // Возвращаем обновленные счетчики
    getTweetStats(tweetId, userId, (err2, stats) => {
      if (err2) return res.status(500).json({ error: err2.message });
      console.log('Like success:', { userId, tweetId, stats });
      res.json(stats);
    });
  });
});

// Убрать лайк
router.delete('/tweets/:id(\\d+)/like', authenticateToken, actionLimiter, (req, res) => {
  const userId = req.user.id;
  const tweetId = parseInt(req.params.id, 10);
  
  console.log('Unlike tweet action:', { userId, tweetId });

  db.run('DELETE FROM likes WHERE tweet_id = ? AND user_id = ?', [tweetId, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Возвращаем обновленные счетчики
    getTweetStats(tweetId, userId, (err2, stats) => {
      if (err2) return res.status(500).json({ error: err2.message });
      console.log('Unlike success:', { userId, tweetId, stats });
      res.json(stats);
    });
  });
});

// Ретвит
router.post('/tweets/:id(\\d+)/retweet', authenticateToken, actionLimiter, (req, res) => {
  const userId = req.user.id;
  const tweetId = parseInt(req.params.id, 10);
  
  console.log('Retweet action:', { userId, tweetId });

  db.run(`INSERT OR IGNORE INTO retweets (tweet_id, user_id) VALUES (?, ?)`, [tweetId, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Отправляем уведомление автору твита
    db.get('SELECT user FROM tweets WHERE id = ?', [tweetId], (err2, tweet) => {
      if (!err2 && tweet) {
        db.get('SELECT id FROM users WHERE username = ?', [tweet.user], (err3, author) => {
          if (!err3 && author && author.id !== userId) {
            sendToUser(author.id, 'notification', {
              type: 'retweet',
              tweetId,
              sourceUserId: userId,
              timestamp: Date.now()
            });
          }
        });
      }
    });
    
    // Возвращаем обновленные счетчики
    getTweetStats(tweetId, userId, (err2, stats) => {
      if (err2) return res.status(500).json({ error: err2.message });
      console.log('Retweet success:', { userId, tweetId, stats });
      res.json(stats);
    });
  });
});

// Убрать ретвит
router.delete('/tweets/:id(\\d+)/retweet', authenticateToken, actionLimiter, (req, res) => {
  const userId = req.user.id;
  const tweetId = parseInt(req.params.id, 10);
  
  console.log('Unretweet action:', { userId, tweetId });

  db.run('DELETE FROM retweets WHERE tweet_id = ? AND user_id = ?', [tweetId, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Возвращаем обновленные счетчики
    getTweetStats(tweetId, userId, (err2, stats) => {
      if (err2) return res.status(500).json({ error: err2.message });
      console.log('Unretweet success:', { userId, tweetId, stats });
      res.json(stats);
    });
  });
});

// Добавить в избранное
router.post('/tweets/:id(\\d+)/favorite', authenticateToken, actionLimiter, (req, res) => {
  const userId = req.user.id;
  const tweetId = parseInt(req.params.id, 10);
  
  console.log('Favorite tweet action:', { userId, tweetId });

  db.run(`INSERT OR IGNORE INTO saved_tweets (tweet_id, user_id) VALUES (?, ?)`, [tweetId, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Возвращаем обновленные счетчики
    getTweetStats(tweetId, userId, (err2, stats) => {
      if (err2) return res.status(500).json({ error: err2.message });
      console.log('Favorite success:', { userId, tweetId, stats });
      res.json(stats);
    });
  });
});

// Убрать из избранного
router.delete('/tweets/:id(\\d+)/favorite', authenticateToken, actionLimiter, (req, res) => {
  const userId = req.user.id;
  const tweetId = parseInt(req.params.id, 10);
  
  console.log('Unfavorite tweet action:', { userId, tweetId });

  db.run('DELETE FROM saved_tweets WHERE tweet_id = ? AND user_id = ?', [tweetId, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Возвращаем обновленные счетчики
    getTweetStats(tweetId, userId, (err2, stats) => {
      if (err2) return res.status(500).json({ error: err2.message });
      console.log('Unfavorite success:', { userId, tweetId, stats });
      res.json(stats);
    });
  });
});

// Унифицированная функция получения статистики твита
function getTweetStats(tweetId, userId, callback) {
  db.get(`
    SELECT 
      (SELECT COUNT(*) FROM likes WHERE tweet_id = ?) AS likesCount,
      (SELECT COUNT(*) FROM retweets WHERE tweet_id = ?) AS retweetsCount,
      (SELECT COUNT(*) FROM saved_tweets WHERE tweet_id = ?) AS favoritesCount,
      (SELECT COUNT(*) FROM comments WHERE tweet_id = ?) AS commentsCount,
      (SELECT 1 FROM likes WHERE tweet_id = ? AND user_id = ?) AS liked,
      (SELECT 1 FROM retweets WHERE tweet_id = ? AND user_id = ?) AS retweeted,
      (SELECT 1 FROM saved_tweets WHERE tweet_id = ? AND user_id = ?) AS favorited
  `, [tweetId, tweetId, tweetId, tweetId, tweetId, userId, tweetId, userId, tweetId, userId], (err, row) => {
    if (err) return callback(err);
    callback(null, {
      liked: !!row.liked,
      likesCount: row.likesCount,
      retweeted: !!row.retweeted,
      retweetsCount: row.retweetsCount,
      favorited: !!row.favorited,
      favoritesCount: row.favoritesCount,
      commentsCount: row.commentsCount
    });
  });
}

/* ========= КОММЕНТАРИИ ========= */
// Получить комментарии твита
router.get('/tweets/:id(\\d+)/comments', (req, res) => {
  const tweetId = parseInt(req.params.id, 10);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const cursor = req.query.cursor ? parseInt(req.query.cursor, 10) : null;

  let whereClause = 'c.tweet_id = ?';
  let params = [tweetId];
  
  if (cursor) {
    whereClause += ' AND c.id < ?';
    params.push(cursor);
  }

  db.all(`
    SELECT 
      c.id,
      c.tweet_id,
      c.user_id,
      c.content,
      c.created_at,
      u.username,
      u.username AS displayName,
      COALESCE(u.avatar_url, '') AS avatarUrl,
      (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) AS likes_count,
      (SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = ?) AS is_liked
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT ?
  `, [...params, req.user.id, limit], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;
    res.json({
      items: rows,
      nextCursor
    });
  });
});

// Добавить комментарий
router.post('/tweets/:id(\\d+)/comments', authenticateToken, commentLimiter, celebrate({
  [Segments.BODY]: Joi.object({
    text: Joi.string().min(1).max(500).required(),
    media: Joi.array().items(Joi.string()).optional(),
  }),
}), (req, res) => {
  const userId = req.user.id;
  const tweetId = parseInt(req.params.id, 10);
  const { text, media } = req.body;

  console.log('Add comment action:', { userId, tweetId, text });

  db.run(
    `INSERT INTO comments (tweet_id, user_id, content) VALUES (?, ?, ?)`,
    [tweetId, userId, text],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const commentId = this.lastID;
      
      // Отправляем уведомление автору твита
      db.get('SELECT user FROM tweets WHERE id = ?', [tweetId], (err2, tweet) => {
        if (!err2 && tweet) {
          db.get('SELECT id FROM users WHERE username = ?', [tweet.user], (err3, author) => {
            if (!err3 && author && author.id !== userId) {
              sendToUser(author.id, 'notification', {
                type: 'comment',
                tweetId,
                commentId,
                sourceUserId: userId,
                timestamp: Date.now()
              });
            }
          });
        }
      });
      
      // Возвращаем созданный комментарий
      db.get(`
        SELECT 
          c.id,
          c.tweet_id,
          c.user_id,
          c.content,
          c.created_at,
          u.username,
          u.username AS displayName,
          COALESCE(u.avatar_url, '') AS avatarUrl
        FROM comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.id = ?
      `, [commentId], (err2, comment) => {
        if (err2) return res.status(500).json({ error: err2.message });
        console.log('Comment created:', { userId, tweetId, commentId });
        res.status(201).json(comment);
      });
    }
  );
});

/* ========= РЕДАКТИРОВАНИЕ ТВИТОВ ========= */
// Редактировать твит
router.put('/tweets/:id(\\d+)', authenticateToken, celebrate({
  [Segments.BODY]: Joi.object({
    text: Joi.string().min(1).max(280).required(),
    media: Joi.array().items(Joi.string()).optional(),
  }),
}), (req, res) => {
  const userId = req.user.id;
  const tweetId = parseInt(req.params.id, 10);
  const { text, media } = req.body;

  console.log('Edit tweet action:', { userId, tweetId, text });

  // Проверяем, что пользователь является автором твита
  db.get('SELECT user FROM tweets WHERE id = ?', [tweetId], (err, tweet) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!tweet) return res.status(404).json({ error: 'Твит не найден' });
    
    // Получаем username автора
    db.get('SELECT username FROM users WHERE id = ?', [userId], (err2, user) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
      
      if (tweet.user !== user.username) {
        return res.status(403).json({ error: 'Можно редактировать только свои твиты' });
      }

      // Обновляем твит
      const mediaJson = media ? JSON.stringify(media) : null;
      db.run(
        `UPDATE tweets SET 
          content = ?, 
          media = ?, 
          updated_at = CURRENT_TIMESTAMP, 
          is_edited = 1 
         WHERE id = ?`,
        [text, mediaJson, tweetId],
        function (err3) {
          if (err3) return res.status(500).json({ error: err3.message });
          
          // Возвращаем обновленный твит с полной информацией
          getTweetWithStats(tweetId, userId, (err4, tweetData) => {
            if (err4) return res.status(500).json({ error: err4.message });
            console.log('Tweet edited:', { userId, tweetId, tweetData });
            res.json(tweetData);
          });
        }
      );
    });
  });
});

// Унифицированная функция получения твита со статистикой
function getTweetWithStats(tweetId, userId, callback) {
  db.get(`
    SELECT 
      t.id,
      t.user,
      t.content,
      t.media,
      t.created_at,
      t.updated_at,
      t.is_edited,
      t.parent_tweet_id,
      (SELECT COUNT(*) FROM likes WHERE tweet_id = t.id) AS likesCount,
      (SELECT COUNT(*) FROM retweets WHERE tweet_id = t.id) AS retweetsCount,
      (SELECT COUNT(*) FROM saved_tweets WHERE tweet_id = t.id) AS favoritesCount,
      (SELECT COUNT(*) FROM comments WHERE tweet_id = t.id) AS commentsCount,
      (SELECT 1 FROM likes WHERE tweet_id = t.id AND user_id = ?) AS liked,
      (SELECT 1 FROM retweets WHERE tweet_id = t.id AND user_id = ?) AS retweeted,
      (SELECT 1 FROM saved_tweets WHERE tweet_id = t.id AND user_id = ?) AS favorited
    FROM tweets t
    WHERE t.id = ?
  `, [userId, userId, userId, tweetId], (err, row) => {
    if (err) return callback(err);
    if (!row) return callback(new Error('Tweet not found'));
    
    // Парсим медиа
    let media = [];
    if (row.media) {
      try {
        media = JSON.parse(row.media);
      } catch (e) {
        console.error('Error parsing media JSON:', e);
      }
    }
    
    callback(null, {
      id: row.id,
      author: {
        id: userId, // TODO: получить реальный ID автора
        username: row.user,
        displayName: row.user,
        avatarUrl: '' // TODO: получить аватар автора
      },
      text: row.content,
      media: media,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isEdited: !!row.is_edited,
      parentTweetId: row.parent_tweet_id,
      liked: !!row.liked,
      likesCount: row.likesCount,
      retweeted: !!row.retweeted,
      retweetsCount: row.retweetsCount,
      favorited: !!row.favorited,
      favoritesCount: row.favoritesCount,
      commentsCount: row.commentsCount
    });
  });
}

/* ========= Лента ========= */
router.get('/feed', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const cursor = req.query.cursor || null;
  const scope = req.query.scope || 'all'; // all, following, me

  let where = [];
  let params = [];
  let join = 'JOIN users u ON u.username = t.user';

  // Фильтр по scope
  if (scope === 'me') {
    where.push('t.user = (SELECT username FROM users WHERE id = ?)');
    params.push(userId);
  } else if (scope === 'following') {
    where.push(`t.user IN (
      SELECT u2.username 
      FROM users u2 
      JOIN followers f ON f.following_id = u2.id 
      WHERE f.follower_id = ?
    )`);
    params.push(userId);
  }

  // Исключаем заблокированных и замученных пользователей
  where.push(`u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)`);
  where.push(`u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)`);
  where.push(`u.id NOT IN (SELECT muted_id FROM mutes WHERE muter_id = ?)`);
  params.push(userId, userId, userId);

  // Пагинация
  if (cursor) {
    where.push('t.created_at < ?');
    params.push(cursor);
  }

  const sql = `
    SELECT 
      t.id,
      t.user,
      t.content,
      t.media,
      t.media_url,
      t.created_at,
      t.parent_tweet_id,
      (SELECT COUNT(*) FROM likes WHERE tweet_id = t.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE tweet_id = t.id) AS comments_count,
      (SELECT COUNT(*) FROM retweets WHERE tweet_id = t.id) AS retweets_count,
      (SELECT 1 FROM likes WHERE tweet_id = t.id AND user_id = ?) AS is_liked,
      (SELECT 1 FROM retweets WHERE tweet_id = t.id AND user_id = ?) AS is_retweeted,
      (SELECT 1 FROM saved_tweets WHERE tweet_id = t.id AND user_id = ?) AS is_favorited
    FROM tweets t
    ${join}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY t.created_at DESC
    LIMIT ?
  `;
  params.push(userId, userId, userId, limit);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Feed query error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    const processedRows = rows.map(row => {
      // Обрабатываем медиа файлы
      let media_url = row.media_url;
      
      // Если есть поле media (JSON), используем его
      if (row.media) {
        try {
          const mediaArray = JSON.parse(row.media);
          if (mediaArray && mediaArray.length > 0) {
            media_url = mediaArray[0]; // Берем первый медиа файл
          }
        } catch (e) {
          console.error('Error parsing media JSON:', e);
        }
      }
      
      return {
        id: row.id,
        user: row.user,
        content: row.content,
        media_url: media_url,
        created_at: row.created_at,
        parent_tweet_id: row.parent_tweet_id,
        likes_count: row.likes_count,
        comments_count: row.comments_count,
        retweets_count: row.retweets_count,
        is_liked: !!row.is_liked,
        is_retweeted: !!row.is_retweeted,
        is_favorited: !!row.is_favorited
      };
    });
    
    const nextCursor = processedRows.length === limit ? processedRows[processedRows.length - 1].created_at : null;
    res.json({ items: processedRows, nextCursor });
  });
});

/* ========= ЛАЙКИ КОММЕНТАРИЕВ ========= */
// Лайкнуть комментарий
router.post('/tweets/:tweetId(\\d+)/comments/:commentId(\\d+)/like', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const tweetId = parseInt(req.params.tweetId, 10);
  const commentId = parseInt(req.params.commentId, 10);

  console.log('Like comment action:', { userId, tweetId, commentId });

  // Проверяем, что комментарий существует
  db.get('SELECT id FROM comments WHERE id = ? AND tweet_id = ?', [commentId, tweetId], (err, comment) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!comment) return res.status(404).json({ error: 'Комментарий не найден' });

    // Проверяем, не лайкнул ли уже пользователь
    db.get('SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, userId], (err2, existing) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (existing) return res.status(400).json({ error: 'Комментарий уже лайкнут' });

      // Добавляем лайк
      db.run('INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)', [commentId, userId], function (err3) {
        if (err3) return res.status(500).json({ error: err3.message });

        // Возвращаем обновленную статистику
        db.get(`
          SELECT 
            (SELECT COUNT(*) FROM comment_likes WHERE comment_id = ?) AS likesCount,
            1 AS liked
        `, [commentId], (err4, stats) => {
          if (err4) return res.status(500).json({ error: err4.message });
          res.json({
            liked: true,
            likesCount: stats.likesCount
          });
        });
      });
    });
  });
});

// Убрать лайк с комментария
router.delete('/tweets/:tweetId(\\d+)/comments/:commentId(\\d+)/like', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const tweetId = parseInt(req.params.tweetId, 10);
  const commentId = parseInt(req.params.commentId, 10);

  console.log('Unlike comment action:', { userId, tweetId, commentId });

  // Удаляем лайк
  db.run('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    // Возвращаем обновленную статистику
    db.get(`
      SELECT 
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = ?) AS likesCount,
        0 AS liked
    `, [commentId], (err2, stats) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({
        liked: false,
        likesCount: stats.likesCount
      });
    });
  });
});

/* ========= ПОДПИСКИ ========= */
// Подписаться на пользователя
router.post('/follows/', authenticateToken, followSchema, (req, res) => {
  const followerId = req.user.id;
  const { following_id } = req.body;

  console.log('Follow action:', { followerId, following_id });

  // Проверяем, что пользователь не пытается подписаться на себя
  if (followerId === following_id) {
    return res.status(400).json({ error: 'Нельзя подписаться на самого себя' });
  }

  // Проверяем, что пользователь существует
  db.get('SELECT id FROM users WHERE id = ?', [following_id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    // Проверяем, не подписаны ли уже
    db.get('SELECT id FROM followers WHERE follower_id = ? AND following_id = ?', 
      [followerId, following_id], (err2, existing) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      if (existing) {
        return res.status(400).json({ error: 'Вы уже подписаны на этого пользователя' });
      }

      // Создаем подписку
      db.run('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)', 
        [followerId, following_id], function (err3) {
        if (err3) return res.status(500).json({ error: err3.message });
        
        console.log('Follow created:', { followerId, following_id });
        
        // Отправляем уведомление
        sendToUser(following_id, 'notification', {
          type: 'follow',
          sourceUserId: followerId,
          timestamp: Date.now()
        });
        
        res.status(201).json({ message: 'Подписка создана' });
      });
    });
  });
});

// Отписаться от пользователя
router.delete('/follows/', authenticateToken, (req, res) => {
  const followerId = req.user.id;
  const { following_id } = req.query;

  console.log('Unfollow action:', { followerId, following_id });

  if (!following_id) {
    return res.status(400).json({ error: 'Не указан ID пользователя для отписки' });
  }

  const followingId = parseInt(following_id, 10);
  if (isNaN(followingId)) {
    return res.status(400).json({ error: 'Некорректный ID пользователя' });
  }

  // Удаляем подписку
  db.run('DELETE FROM followers WHERE follower_id = ? AND following_id = ?', 
    [followerId, followingId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Подписка не найдена' });
    }
    
    console.log('Follow deleted:', { followerId, followingId });
    res.json({ message: 'Подписка удалена' });
  });
});

// Получить список ID пользователей, на которых подписан текущий пользователь
router.get('/follows/my-following', authenticateToken, (req, res) => {
  const userId = req.user.id;

  console.log('Get my following IDs:', { userId });

  db.all('SELECT following_id FROM followers WHERE follower_id = ?', [userId], (err, rows) => {
    if (err) {
      console.error('Get following IDs error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    const followingIds = rows.map(row => row.following_id);
    console.log('Following IDs:', followingIds);
    res.json(followingIds);
  });
});

// Получить список подписчиков пользователя
router.get('/users/:id/followers', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const cursor = req.query.cursor || null;

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Некорректный ID пользователя' });
  }

  let where = ['f.following_id = ?'];
  let params = [userId];

  if (cursor) {
    where.push('u.id > ?');
    params.push(cursor);
  }

  const sql = `
    SELECT 
      u.id,
      u.username,
      u.avatar_url,
      u.bio,
      f.created_at as followed_at
    FROM followers f
    JOIN users u ON u.id = f.follower_id
    WHERE ${where.join(' AND ')}
    ORDER BY f.created_at DESC
    LIMIT ?
  `;
  params.push(limit);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Get followers error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;
    res.json({ items: rows, nextCursor });
  });
});

// Получить список подписок пользователя
router.get('/users/:id/following', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const cursor = req.query.cursor || null;

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Некорректный ID пользователя' });
  }

  let where = ['f.follower_id = ?'];
  let params = [userId];

  if (cursor) {
    where.push('u.id > ?');
    params.push(cursor);
  }

  const sql = `
    SELECT 
      u.id,
      u.username,
      u.avatar_url,
      u.bio,
      f.created_at as followed_at
    FROM followers f
    JOIN users u ON u.id = f.following_id
    WHERE ${where.join(' AND ')}
    ORDER BY f.created_at DESC
    LIMIT ?
  `;
  params.push(limit);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Get following error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;
    res.json({ items: rows, nextCursor });
  });
});

// Поиск пользователей
router.get('/users/search', (req, res) => {
  const query = req.query.q || '';
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  console.log('Search users:', { query, limit });

  let sql = `
    SELECT 
      u.id,
      u.username,
      u.username as displayName,
      u.avatar_url as avatarUrl,
      u.bio,
      (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as followersCount,
      (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as followingCount
    FROM users u
  `;
  
  let params = [];

  if (query.trim()) {
    sql += ` WHERE u.username LIKE ? OR u.bio LIKE ?`;
    const searchTerm = `%${query}%`;
    params.push(searchTerm, searchTerm);
  }

  sql += ` ORDER BY u.username ASC LIMIT ?`;
  params.push(limit);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Search users error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('Found users:', rows.length);
    res.json(rows);
  });
});

/* ========= Уведомления (fallback) ========= */
router.get('/notifications', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const since = req.query.since || null;

  let where = ['n.user_id = ?'];
  let params = [userId];

  if (since) {
    where.push('n.created_at > ?');
    params.push(since);
  }

  const sql = `
    SELECT 
      n.id,
      n.type,
      n.source_user_id,
      n.tweet_id,
      n.comment_id,
      n.created_at,
      u.username AS source_username,
      u.avatar_url AS source_avatar
    FROM notifications n
    LEFT JOIN users u ON u.id = n.source_user_id
    WHERE ${where.join(' AND ')}
    ORDER BY n.created_at DESC
    LIMIT ?
  `;
  params.push(limit);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Notifications query error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Если нет уведомлений, возвращаем пустой массив
    res.json(rows || []);
  });
});

module.exports = router;
