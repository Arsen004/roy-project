// authMiddleware.js — совместимость с чужими токенами: id | user_id | userId
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'supersecretkey';
// Включить режим совместимости (без проверки подписи при неуспехе verify):
// .env: JWT_ALLOW_DECODE=1
const ALLOW_DECODE = String(process.env.JWT_ALLOW_DECODE || '0') === '1';

function normalizeUser(payload) {
  if (!payload) return null;
  const id = payload.id ?? payload.user_id ?? payload.userId;
  if (!id) return null;
  // username/email — как есть, если они есть в payload
  return { ...payload, id };
}

module.exports = function authenticateToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const m = /^Bearer (.+)$/.exec(auth);
  if (!m) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = m[1];

  let payload = null;
  try {
    payload = jwt.verify(token, SECRET);
  } catch (e) {
    if (ALLOW_DECODE) {
      try { 
        payload = jwt.decode(token) || null; 
      } catch (decodeErr) { 
        // ignore decode errors
      }
    }
  }

  const user = normalizeUser(payload);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = { id: user.id, username: user.username };
  next();
};
