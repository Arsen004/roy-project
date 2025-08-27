// auth.js — login/register + refresh/logout/logout-all с ротацией refresh-токенов
const express = require('express');
const router = express.Router();
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { celebrate, Joi, Segments, errors: celebrateErrors } = require('celebrate');
const crypto = require('crypto');

try { require('dotenv').config(); } catch (_) {}

// === Конфиг ===
const SECRET_KEY = process.env.JWT_SECRET || 'dev-supersecret';          // обязательно переопредели в проде!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';              // access-токен (короткий)
const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TTL_DAYS || '30', 10);
const COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refresh_token';
const COOKIE_SECURE = process.env.NODE_ENV === 'production';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'lax';            // 'lax' по умолчанию; для cross-site нужно 'none'
// ВАЖНО: cookie Path должен совпадать с mount-path роутера: /api/auth
const COOKIE_PATH = process.env.REFRESH_COOKIE_PATH || '/api/auth';

// === Rate limiting ===
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Попробуйте позже.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много регистраций. Попробуйте позже.' },
});

// === Joi схемы ===
const registerSchema = celebrate({
  [Segments.BODY]: Joi.object({
    username: Joi.string().trim().pattern(/^[a-zA-Z0-9_]{3,30}$/).required(),
    password: Joi.string().min(6).max(72).required(),
  }),
});
const loginSchema = celebrate({
  [Segments.BODY]: Joi.object({
    username: Joi.string().trim().required(),
    password: Joi.string().required(),
  }),
});

// === Обработка ошибок ===
// Убираем глобальный обработчик ошибок, чтобы не маскировать реальные проблемы

// === Утилиты refresh ===
function sha256(s) { return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex'); }
function genRefreshToken() { return crypto.randomBytes(48).toString('base64url'); }
function accessTokenPayload(user) { return { id: user.id, username: user.username }; }
function signAccessToken(user) { return jwt.sign(accessTokenPayload(user), SECRET_KEY, { expiresIn: JWT_EXPIRES_IN }); }
function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE, // 'lax' | 'strict' | 'none'
    path: COOKIE_PATH,
    maxAge: maxAgeMs,
  };
}
function getClientIp(req) {
  const xf = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return xf || req.ip || req.connection?.remoteAddress || '';
}
function getRefreshFromReq(req) {
  // приоритет: cookie -> body -> header
  return (req.cookies && req.cookies[COOKIE_NAME]) ||
         (req.body && req.body.refresh_token) ||
         req.headers['x-refresh-token'];
}
function ttlSqlInterval(days) { return `+${days} days`; }

// Сохранить refresh-токен (хэш) в БД
function saveRefreshToken({ userId, refreshToken, ua, ip }, cb) {
  const hash = sha256(refreshToken);
  db.run(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip, expires_at)
     VALUES (?, ?, ?, ?, DATETIME('now', ?))`,
    [userId, hash, ua || '', ip || '', ttlSqlInterval(REFRESH_TTL_DAYS)],
    function (err) { cb(err, { id: this?.lastID, hash }); }
  );
}

// Отозвать один refresh (по его хэшу)
function revokeRefresh(hash, replacedByHash = null, cb = () => {}) {
  db.run(
    `UPDATE refresh_tokens 
       SET revoked_at = CURRENT_TIMESTAMP, replaced_by_token_hash = COALESCE(?, replaced_by_token_hash)
     WHERE token_hash = ? AND revoked_at IS NULL`,
    [replacedByHash, hash],
    cb
  );
}

// Отозвать все refresh пользователя
function revokeAllForUser(userId, cb = () => {}) {
  db.run(
    `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND revoked_at IS NULL`,
    [userId],
    cb
  );
}

// === Роуты ===

// Регистрация
router.post('/register', async (req, res) => {
  console.log('=== REGISTER ENDPOINT HIT ===');
  console.log('Request body:', { username: req.body?.username, hasPassword: !!req.body?.password });
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const uname = username.trim();
    
    if (uname.length < 3 || uname.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', [uname, hashed], function (err) {
        if (err) {
          if (String(err.message || '').toLowerCase().includes('unique')) {
            reject(new Error('Username already taken'));
          } else {
            reject(err);
          }
        } else {
          resolve({ id: this.lastID, username: uname });
        }
      });
    });
    
    console.log('✅ User registered:', uname);
    res.status(201).json({ message: 'User created', id: this.lastID, username: uname });
    
  } catch (error) {
    console.error('❌ Register error:', error);
    if (error.message === 'Username already taken') {
      return res.status(409).json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Вход: полноценная версия с БД
router.post('/login', async (req, res) => {
  console.log('=== LOGIN ENDPOINT HIT ===');
  console.log('Request body:', { username: req.body?.username, hasPassword: !!req.body?.password });
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Найти пользователя в БД
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });

    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Проверить пароль
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ Login successful for user:', username);
    
    // Создать access токен
    const token = jwt.sign(
      { id: user.id, username: user.username },
      SECRET_KEY,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Создать refresh токен
    const refreshToken = genRefreshToken();
    const refreshHash = sha256(refreshToken);

    // Сохранить refresh токен в БД
    await new Promise((resolve, reject) => {
      saveRefreshToken(
        { 
          userId: user.id, 
          refreshToken, 
          ua: req.headers['user-agent'], 
          ip: getClientIp(req) 
        },
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Установить refresh токен в cookie
    res.cookie(COOKIE_NAME, refreshToken, cookieOptions(REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000));

    // Вернуть ответ в нужном формате
    return res.json({
      token,
      token_type: 'Bearer',
      expires_in: JWT_EXPIRES_IN,
      user: { id: user.id, username: user.username }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh
router.post('/refresh', async (req, res) => {
  const incoming = getRefreshFromReq(req);
  if (!incoming) return res.status(401).json({ error: 'Нет refresh-токена' });

  const hash = sha256(incoming);

  db.get(
    `SELECT rt.*, u.username
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = ?`,
    [hash],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Ошибка БД' });
      if (!row) return res.status(401).json({ error: 'Недействительный refresh-токен' });
      if (row.revoked_at) return res.status(401).json({ error: 'Токен отозван' });
      db.get(`SELECT DATETIME('now') < DATETIME(?) AS valid`, [row.expires_at], (e2, chk) => {
        if (e2) return res.status(500).json({ error: 'Ошибка проверки токена' });
        if (!chk || !chk.valid) return res.status(401).json({ error: 'Токен истёк' });

        const newRefresh = genRefreshToken();
        const newHash = sha256(newRefresh);

        db.serialize(() => {
          revokeRefresh(hash, newHash, (uErr) => { if (uErr) console.error('revoke error:', uErr?.message); });
          saveRefreshToken(
            { userId: row.user_id, refreshToken: newRefresh, ua: req.headers['user-agent'], ip: getClientIp(req) },
            (sErr) => {
              if (sErr) return res.status(500).json({ error: 'Ошибка сохранения токена' });

              const access = signAccessToken({ id: row.user_id, username: row.username });
              res.cookie(COOKIE_NAME, newRefresh, cookieOptions(REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000));
              return res.json({ token: access, token_type: 'Bearer', expires_in: JWT_EXPIRES_IN });
            }
          );
        });
      });
    }
  );
});

// Logout
router.post('/logout', (req, res) => {
  const incoming = getRefreshFromReq(req);
  if (!incoming) {
    res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH });
    return res.json({ message: 'OK' });
  }
  const hash = sha256(incoming);
  revokeRefresh(hash, null, () => {
    res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH });
    return res.json({ message: 'OK' });
  });
});

// Logout all (по access)
router.post('/logout-all', (req, res) => {
  const auth = (req.headers.authorization || '').split(' ');
  if (auth.length !== 2 || auth[0] !== 'Bearer') {
    res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH });
    return res.status(401).json({ error: 'Нет access-токена' });
  }
  try {
    const payload = jwt.verify(auth[1], SECRET_KEY);
    revokeAllForUser(payload.id, () => {
      res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH });
      return res.json({ message: 'OK' });
    });
  } catch (_e) {
    res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH });
    return res.status(401).json({ error: 'Неверный access-токен' });
  }
});

// Celebrate errors только для /auth
router.use(celebrateErrors());

module.exports = router;
