// Скрипт для создания тестового пользователя
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

async function createTestUser() {
  const username = 'test';
  const password = 'test123';
  
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    db.run('INSERT OR REPLACE INTO users (username, password) VALUES (?, ?)', 
      [username, hashedPassword], 
      function(err) {
        if (err) {
          console.error('❌ Error creating user:', err);
        } else {
          console.log('✅ Test user created successfully:');
          console.log('   Username:', username);
          console.log('   Password:', password);
          console.log('   User ID:', this.lastID);
        }
        db.close();
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
  }
}

console.log('🔧 Creating test user...');
createTestUser();
