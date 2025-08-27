// index.js — старт сервера (с cookie-parser для refresh токенов)
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const routes = require('./routes');   // в routes.js уже есть helmet и cors
const authRoutes = require('./auth'); // auth с refresh/logout
const authenticateToken = require('./authMiddleware');
const db = require('./db');

const app = express();
const PORT = 3010; // Принудительно 3010

// если есть прокси/балансировщик (Render/NGINX/Vercel)
app.set('trust proxy', 1);

// CORS для всех API роутов
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175'],
  credentials: true,
}));

// парсеры
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// раздача медиа (/uploads) по адресу /media
app.use('/media', express.static(path.join(__dirname, 'uploads')));

// Роут /users/me ПЕРЕД основными роутами (чтобы избежать celebrate валидации)
app.get('/api/users/me', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.get('SELECT username, avatar_url, bio, created_at FROM users WHERE id = ?', [userId], (err, user) => {
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
            createdAt: user.created_at,
            followers: counts.followers,
            following: counts.following,
            tweets,
          });
        });
      }
    );
  });
});

// роуты
app.use('/api', routes);
app.use('/api/auth', authRoutes); // важно: /api/auth для фронта

// пинг
app.get('/', (_req, res) => {
  res.send('API работает 🚀');
});

// health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Обработка ошибок (должна быть последней)
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
