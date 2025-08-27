const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('🔍 Checking users in database...');

db.all('SELECT id, username, created_at FROM users ORDER BY id', (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
  } else {
    console.log('✅ Users found:', rows.length);
    rows.forEach(user => {
      console.log(`   ID: ${user.id}, Username: ${user.username}, Created: ${user.created_at}`);
    });
  }
  db.close();
});
