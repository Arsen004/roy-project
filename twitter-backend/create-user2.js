const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./database.db');

bcrypt.hash('password123', 12, (err, hash) => {
  if (err) throw err;
  
  db.run('INSERT INTO users (id, username, password, bio) VALUES (?, ?, ?, ?)', 
    [2, 'user2', hash, 'Test user with ID 2'], 
    function(err) {
      if (err) {
        console.error('Error:', err);
      } else {
        console.log('✅ User with ID 2 created successfully');
      }
      db.close();
    }
  );
});


