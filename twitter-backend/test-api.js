const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3010/api';

async function testAPI() {
  console.log('🧪 Тестирование API endpoints...\n');

  try {
    // Тест 1: Проверка доступности сервера
    console.log('1. Проверка доступности сервера...');
    const healthCheck = await fetch(`${API_BASE}/tweets`);
    console.log(`   Статус: ${healthCheck.status}`);
    
    if (healthCheck.ok) {
      console.log('   ✅ Сервер доступен\n');
    } else {
      console.log('   ❌ Сервер недоступен\n');
      return;
    }

    // Тест 2: Регистрация тестового пользователя
    console.log('2. Регистрация тестового пользователя...');
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    });
    
    console.log(`   Статус: ${registerResponse.status}`);
    if (registerResponse.ok) {
      console.log('   ✅ Пользователь зарегистрирован\n');
    } else {
      const error = await registerResponse.text();
      console.log(`   ⚠️  ${error}\n`);
    }

    // Тест 3: Вход в систему
    console.log('3. Вход в систему...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    });
    
    console.log(`   Статус: ${loginResponse.status}`);
    let token = null;
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      token = loginData.token;
      console.log('   ✅ Вход выполнен успешно\n');
    } else {
      const error = await loginResponse.text();
      console.log(`   ❌ ${error}\n`);
      return;
    }

    // Тест 4: Поиск пользователей
    console.log('4. Поиск пользователей...');
    const searchResponse = await fetch(`${API_BASE}/users/search?q=test`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`   Статус: ${searchResponse.status}`);
    if (searchResponse.ok) {
      const users = await searchResponse.json();
      console.log(`   ✅ Найдено пользователей: ${users.length}\n`);
    } else {
      const error = await searchResponse.text();
      console.log(`   ❌ ${error}\n`);
    }

    // Тест 5: Получение списка подписок
    console.log('5. Получение списка подписок...');
    const followingResponse = await fetch(`${API_BASE}/follows/my-following`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`   Статус: ${followingResponse.status}`);
    if (followingResponse.ok) {
      const following = await followingResponse.json();
      console.log(`   ✅ Подписок: ${following.length}\n`);
    } else {
      const error = await followingResponse.text();
      console.log(`   ❌ ${error}\n`);
    }

    console.log('🎉 Тестирование завершено!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

testAPI();
