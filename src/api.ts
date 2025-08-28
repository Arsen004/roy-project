// API клиент для взаимодействия с бэкендом
const API_BASE = '/api';  // Используем proxy для всех API запросов

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

interface User {
  id: number;
  username: string;
  avatar_url?: string;
  bio?: string;
}

interface Tweet {
  id: number;
  user: string;
  content: string;
  media_url?: string;
  created_at: string;
  parent_tweet_id?: number;
}

interface Comment {
  id: number;
  tweet_id: number;
  user_id: number;
  username: string;
  content: string;
  created_at: string;
  is_liked?: boolean;
  likes_count?: number;
}

interface LoginResponse {
  token: string;
  token_type: string;
  expires_in: string;
  user: User;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // При создании экземпляра пытаемся загрузить токен из localStorage
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage() {
    try {
      console.log('🔍 API: Loading token from storage...');
      const savedToken = localStorage.getItem('auth_token');
      console.log('🔍 API: Saved token exists:', !!savedToken);
      
      if (savedToken) {
        // Проверяем, что токен не истек
        const user = this.getCurrentUserFromToken(savedToken);
        console.log('🔍 API: Token validation result:', user);
        
        if (user) {
          this.token = savedToken;
          console.log('🔍 API: Valid token loaded from storage, user:', user.username);
        } else {
          console.log('🔍 API: Token expired, clearing from storage');
          localStorage.removeItem('auth_token');
        }
      } else {
        console.log('🔍 API: No token found in storage');
      }
    } catch (error) {
      console.error('Error loading token from storage:', error);
      localStorage.removeItem('auth_token');
    }
  }

  private getCurrentUserFromToken(token: string): User | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Проверяем, что токен не истек
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return null; // Токен истек
      }
      return {
        id: payload.id,
        username: payload.username,
        avatar_url: payload.avatar_url,
        bio: payload.bio
      };
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }

  setToken(token: string) {
    console.log('🔍 API: setToken called with length:', token.length);
    this.token = token;
    // Сохраняем токен в localStorage
    try {
      localStorage.setItem('auth_token', token);
      console.log('🔍 API: Token saved to storage, length:', token.length);
      
      // Проверяем, что токен сохранился
      const savedToken = localStorage.getItem('auth_token');
      console.log('🔍 API: Token verification - saved token exists:', !!savedToken);
      
    } catch (error) {
      console.error('Error saving token to storage:', error);
    }
  }

  clearToken() {
    this.token = null;
    // Удаляем токен из localStorage
    try {
      localStorage.removeItem('auth_token');
      console.log('🔍 API: Token cleared from storage');
    } catch (error) {
      console.error('Error clearing token from storage:', error);
    }
  }

  // Получить текущего пользователя из JWT токена
  getCurrentUser(): User | null {
    console.log('🔍 API: getCurrentUser called, token exists:', !!this.token);
    if (!this.token) {
      console.log('🔍 API: No token available, trying to load from storage...');
      this.loadTokenFromStorage();
      if (!this.token) {
        console.log('🔍 API: Still no token after loading from storage');
        return null;
      }
    }
    
    const user = this.getCurrentUserFromToken(this.token);
    console.log('🔍 API: getCurrentUser result:', user);
    return user;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
      console.log('🔍 API: Token set, length:', this.token.length);
    } else {
      console.log('🔍 API: No token available');
    }

    try {
      console.log('🔍 API Request URL:', url);
      console.log('🔍 API Request Method:', options.method || 'GET');
      console.log('🔍 API Request Headers:', headers);
      
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      console.log('🔍 API Response Status:', response.status, response.statusText);
      console.log('🔍 API Response URL:', response.url);

      // Проверяем, есть ли тело ответа
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('JSON parse error:', jsonError);
          data = { error: 'Invalid JSON response' };
        }
      } else {
        // Если не JSON, читаем как текст
        const text = await response.text();
        console.log('Response text:', text);
        data = { error: text || `Request failed: ${response.status}` };
      }

      if (!response.ok) {
        console.error('API Error:', data);
        return { error: data.error || `Request failed: ${response.status}` };
      }

      return { data };
    } catch (error) {
      console.error('API Network Error:', error);
      return { error: `Network error: ${(error as Error).message}` };
    }
  }

  // Auth
  async login(username: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async register(username: string, password: string): Promise<ApiResponse<{ message: string; id: number; username: string }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
    // Очищаем токен независимо от ответа сервера
    this.clearToken();
    return response;
  }

  // Tweets
  async getFeed(limit = 20, cursor?: string): Promise<ApiResponse<{ items: Tweet[]; nextCursor?: string }>> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    return this.request(`/feed?${params}`);
  }

  async getTweets(limit = 20, cursor?: string): Promise<ApiResponse<{ items: Tweet[]; nextCursor?: string }>> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    return this.request(`/tweets?${params}`);
  }

  async getUserTweets(userId: number, limit = 20, cursor?: string): Promise<ApiResponse<{ items: Tweet[]; nextCursor?: string }>> {
    console.log('🔍 API: getUserTweets called with userId:', userId, 'limit:', limit, 'cursor:', cursor);
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    const url = `/users/${userId}/tweets?${params}`;
    console.log('🔍 API: getUserTweets URL:', url);
    const response = await this.request<{ items: Tweet[]; nextCursor?: string }>(url);
    console.log('🔍 API: getUserTweets response:', response);
    return response;
  }

  async getTweet(id: number): Promise<ApiResponse<Tweet>> {
    return this.request(`/tweets/${id}`);
  }

  async createTweet(content: string, mediaUrl?: string): Promise<ApiResponse<Tweet>> {
    return this.request('/tweets', {
      method: 'POST',
      body: JSON.stringify({ content, media_url: mediaUrl }),
    });
  }

  async deleteTweet(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/tweets/${id}`, {
      method: 'DELETE',
    });
  }



  // Comments
  async getComments(tweetId: number, limit = 20, cursor?: string): Promise<ApiResponse<{ items: Comment[]; nextCursor?: string }>> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    return this.request(`/tweets/${tweetId}/comments?${params}`);
  }

  // Комментарии
  async getTweetComments(tweetId: number, cursor?: string): Promise<ApiResponse<{
    items: Comment[];
    nextCursor?: string;
  }>> {
    const params = cursor ? `?cursor=${cursor}` : '';
    return this.request(`/tweets/${tweetId}/comments${params}`);
  }

  async addComment(tweetId: number, text: string, media?: string[]): Promise<ApiResponse<Comment>> {
    return this.request(`/tweets/${tweetId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text, media })
    });
  }

  async deleteComment(tweetId: number, commentId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/tweets/${tweetId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  async updateComment(tweetId: number, commentId: number, content: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/tweets/${tweetId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  // Лайки комментариев
  async likeComment(tweetId: number, commentId: number): Promise<ApiResponse<{
    liked: boolean;
    likesCount: number;
  }>> {
    return this.request(`/tweets/${tweetId}/comments/${commentId}/like`, { method: 'POST' });
  }

  async unlikeComment(tweetId: number, commentId: number): Promise<ApiResponse<{
    liked: boolean;
    likesCount: number;
  }>> {
    return this.request(`/tweets/${tweetId}/comments/${commentId}/like`, { method: 'DELETE' });
  }



  // Унифицированные действия с твитами
  async likeTweet(tweetId: number): Promise<ApiResponse<{
    liked: boolean;
    likesCount: number;
    retweeted: boolean;
    retweetsCount: number;
    favorited: boolean;
    favoritesCount: number;
    commentsCount: number;
  }>> {
    return this.request(`/tweets/${tweetId}/like`, { method: 'POST' });
  }

  async unlikeTweet(tweetId: number): Promise<ApiResponse<{
    liked: boolean;
    likesCount: number;
    retweeted: boolean;
    retweetsCount: number;
    favorited: boolean;
    favoritesCount: number;
    commentsCount: number;
  }>> {
    return this.request(`/tweets/${tweetId}/like`, { method: 'DELETE' });
  }

  async retweet(tweetId: number): Promise<ApiResponse<{
    liked: boolean;
    likesCount: number;
    retweeted: boolean;
    retweetsCount: number;
    favorited: boolean;
    favoritesCount: number;
    commentsCount: number;
  }>> {
    return this.request(`/tweets/${tweetId}/retweet`, { method: 'POST' });
  }

  async unretweet(tweetId: number): Promise<ApiResponse<{
    liked: boolean;
    likesCount: number;
    retweeted: boolean;
    retweetsCount: number;
    favorited: boolean;
    favoritesCount: number;
    commentsCount: number;
  }>> {
    return this.request(`/tweets/${tweetId}/retweet`, { method: 'DELETE' });
  }

  async favoriteTweet(tweetId: number): Promise<ApiResponse<{
    liked: boolean;
    likesCount: number;
    retweeted: boolean;
    retweetsCount: number;
    favorited: boolean;
    favoritesCount: number;
    commentsCount: number;
  }>> {
    return this.request(`/tweets/${tweetId}/favorite`, { method: 'POST' });
  }

  async unfavoriteTweet(tweetId: number): Promise<ApiResponse<{
    liked: boolean;
    likesCount: number;
    retweeted: boolean;
    retweetsCount: number;
    favorited: boolean;
    favoritesCount: number;
    commentsCount: number;
  }>> {
    return this.request(`/tweets/${tweetId}/favorite`, { method: 'DELETE' });
  }



  // Редактирование твитов
  async updateTweet(tweetId: number, text: string, media?: string[]): Promise<ApiResponse<Tweet & {
    author: { id: number; username: string; displayName: string; avatarUrl: string };
    media: string[];
    updatedAt: string;
    isEdited: boolean;
    liked: boolean;
    likesCount: number;
    retweeted: boolean;
    retweetsCount: number;
    favorited: boolean;
    favoritesCount: number;
    commentsCount: number;
  }>> {
    return this.request(`/tweets/${tweetId}`, {
      method: 'PUT',
      body: JSON.stringify({ text, media })
    });
  }

  async getBookmarks(limit = 20, cursor?: string): Promise<ApiResponse<{ items: Tweet[]; nextCursor?: string }>> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    return this.request(`/bookmarks?${params}`);
  }

  // Media
  async uploadMedia(file: File): Promise<ApiResponse<{ filename: string; url: string; size: number; mimetype: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${API_BASE}/media/upload`;
    const headers: HeadersInit = {};
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
      console.log('Using token for upload:', this.token.substring(0, 20) + '...');
    } else {
      console.log('No token available for upload');
    }

    // НЕ устанавливаем Content-Type для FormData - браузер сам установит с boundary
    // headers['Content-Type'] = 'multipart/form-data';

    try {
      console.log('Sending upload request to:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      console.log('Upload response status:', response.status);
      const data = await response.json();
      console.log('Upload response data:', data);

      if (!response.ok) {
        return { error: data.error || 'Upload failed' };
      }

      return { data };
    } catch (error) {
      console.error('Upload error:', error);
      return { error: 'Upload failed' };
    }
  }

  // Search
  async searchTweets(query: string): Promise<ApiResponse<Tweet[]>> {
    // Заглушка - API endpoint не реализован на бэкенде
    return { data: [] };
  }

  // Profile
  async getMyProfile(): Promise<ApiResponse<User & { followers: number; following: number; tweets: Tweet[] }>> {
    return this.request('/users/me');
  }

  async updateProfile(avatarUrl?: string, bio?: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify({ avatar_url: avatarUrl, bio }),
    });
  }

  async updateUserProfile(userId: number, data: {
    username?: string;
    bio?: string;
    avatar_url?: string;
    location?: string;
    website?: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }



  async getFollowers(userId: number): Promise<ApiResponse<User[]>> {
    return this.request(`/users/${userId}/followers`);
  }

  async getFollowing(userId: number): Promise<ApiResponse<User[]>> {
    return this.request(`/users/${userId}/following`);
  }

  // Поиск пользователей (обновленный с поддержкой статуса дружбы)
  async searchUsers(query: string, currentUserId?: number): Promise<ApiResponse<Array<{
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    followersCount: number;
    followingCount: number;
    friendship_status: 'friend' | 'request_sent' | 'request_received' | 'not_friend';
  }>>> {
    const params = new URLSearchParams({ q: query });
    if (currentUserId) {
      params.append('currentUserId', currentUserId.toString());
    }
    return this.request(`/users/search?${params}`);
  }

  // Follow/Unfollow
  async followUser(userId: number): Promise<ApiResponse<void>> {
    return this.request('/follows/', { 
      method: 'POST',
      body: JSON.stringify({ following_id: userId })
    });
  }

  async unfollowUser(userId: number): Promise<ApiResponse<void>> {
    return this.request(`/follows/?following_id=${userId}`, { 
      method: 'DELETE' 
    });
  }

  // Получить список ID пользователей, на которых подписан текущий пользователь
  async getMyFollowingIds(): Promise<ApiResponse<number[]>> {
    return this.request('/follows/my-following');
  }

  // Мои друзья
  async getMyFriends(): Promise<ApiResponse<User[]>> {
    return this.request('/users/me/friends');
  }

  // Получить список ID пользователей, на которых подписан текущий пользователь (старый метод для совместимости)
  async getMyFollowing(): Promise<ApiResponse<number[]>> {
    return this.request('/users/me/following');
  }

  // Профиль пользователя с флагом isFollowing
  async getUserProfile(userId: number): Promise<ApiResponse<User & { isFollowing: boolean; followers: number; following: number }>> {
    return this.request(`/users/${userId}/profile`);
  }

  // Notifications
  async getNotifications(limit = 20, cursor?: string): Promise<ApiResponse<{ items: any[]; nextCursor?: string }>> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    return this.request(`/notifications?${params}`);
  }

  async getNotificationsSince(timestamp: number): Promise<ApiResponse<any[]>> {
    return this.request(`/notifications?since=${timestamp}`);
  }

  // SSE Notifications
  createNotificationStream(): EventSource | null {
    if (!this.token) return null;
    
    try {
      // EventSource не поддерживает кастомные заголовки, используем URL с токеном
      const eventSource = new EventSource(`${API_BASE}/notifications/stream?token=${this.token}`);
      return eventSource;
    } catch (error) {
      console.error('Failed to create SSE stream:', error);
      return null;
    }
  }



  // Direct Messages
  async getConversations(): Promise<ApiResponse<Array<{
    id: number;
    other_user: {
      id: number;
      username: string;
      avatar_url?: string;
    };
    last_message: {
      id: number;
      content: string;
      sender_id: number;
      is_read: number;
      created_at: string;
    } | null;
    unread: number;
    updated_at: string;
  }>>> {
    return this.request('/dm/conversations');
  }

  async createConversation(userId: number): Promise<ApiResponse<{
    id: number;
    user1_id: number;
    user2_id: number;
    last_message_at: string;
  }>> {
    return this.request('/dm/conversations', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async getMessages(conversationId: number, limit = 50, cursor?: number): Promise<ApiResponse<{
    items: Array<{
      id: number;
      conversation_id: number;
      sender_id: number;
      content: string;
      is_read: number;
      created_at: string;
    }>;
    nextCursor?: number;
  }>> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor.toString());
    return this.request(`/dm/conversations/${conversationId}/messages?${params}`);
  }

  async sendMessage(conversationId: number, content: string): Promise<ApiResponse<{
    id: number;
    conversation_id: number;
    sender_id: number;
    content: string;
    is_read: number;
    created_at: string;
  }>> {
    return this.request(`/dm/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async updateMessage(conversationId: number, messageId: number, content: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/dm/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteMessage(conversationId: number, messageId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/dm/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async markMessageAsRead(messageId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/dm/messages/${messageId}/read`, {
      method: 'PUT',
    });
  }

  // SSE for real-time notifications
  createSSEConnection(): EventSource {
    const url = `${API_BASE}/notifications/stream`;
    const eventSource = new EventSource(url, {
      withCredentials: true
    });
    
    console.log('🔍 SSE Connection created:', url);
    return eventSource;
  }

  // User Settings & Account Management
  async getUserSettings(): Promise<ApiResponse<{
    theme: string;
    language: string;
    timezone: string;
    email_notifications: boolean;
    push_notifications: boolean;
    privacy: {
      profile_visibility: string;
      show_email: boolean;
      allow_dms: boolean;
    };
  }>> {
    return this.request('/users/settings');
  }

  async updateUserSettings(settings: any): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async updatePrivacySettings(privacy: {
    profile_visibility?: string;
    show_email?: boolean;
    allow_dms?: boolean;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/privacy', {
      method: 'PUT',
      body: JSON.stringify(privacy),
    });
  }

  async updateNotificationPreferences(notifications: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    mention_notifications?: boolean;
    like_notifications?: boolean;
    retweet_notifications?: boolean;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/notifications', {
      method: 'PUT',
      body: JSON.stringify(notifications),
    });
  }

  async updateAppearanceSettings(appearance: {
    theme?: string;
    language?: string;
    timezone?: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/appearance', {
      method: 'PUT',
      body: JSON.stringify(appearance),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  async sendEmailVerification(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/email/verify', {
      method: 'POST',
    });
  }

  async updateEmail(newEmail: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/email', {
      method: 'PUT',
      body: JSON.stringify({ email: newEmail }),
    });
  }

  async enable2FA(): Promise<ApiResponse<{ qr_code: string; secret: string }>> {
    return this.request('/users/2fa/enable', {
      method: 'POST',
    });
  }

  async disable2FA(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/2fa', {
      method: 'DELETE',
    });
  }

  async getActiveSessions(): Promise<ApiResponse<Array<{
    id: string;
    device: string;
    location: string;
    last_used: string;
    current: boolean;
  }>>> {
    return this.request('/users/sessions');
  }

  async revokeSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/users/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async revokeAllSessions(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/sessions', {
      method: 'DELETE',
    });
  }

  async getBlockedUsers(): Promise<ApiResponse<Array<{
    id: number;
    username: string;
    avatar_url?: string;
    blocked_at: string;
  }>>> {
    return this.request('/users/blocked');
  }

  async blockUser(userId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/users/${userId}/block`, {
      method: 'POST',
    });
  }

  async unblockUser(userId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/users/${userId}/block`, {
      method: 'DELETE',
    });
  }

  async getMutedUsers(): Promise<ApiResponse<Array<{
    id: number;
    username: string;
    avatar_url?: string;
    muted_at: string;
  }>>> {
    return this.request('/users/muted');
  }

  async muteUser(userId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/users/${userId}/mute`, {
      method: 'POST',
    });
  }

  async unmuteUser(userId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/users/${userId}/mute`, {
      method: 'DELETE',
    });
  }

  async requestDataExport(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/export', {
      method: 'POST',
    });
  }

  async deactivateAccount(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/deactivate', {
      method: 'POST',
    });
  }

  async deleteAccount(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/users/account', {
      method: 'DELETE',
    });
  }

  async logoutAllDevices(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/auth/logout-all', {
      method: 'POST',
    });
  }

  // ========== СПИСКИ ПОЛЬЗОВАТЕЛЕЙ ==========

  async createList(data: {
    name: string;
    description?: string;
    is_private?: boolean;
  }): Promise<ApiResponse<{
    id: number;
    name: string;
    description?: string;
    is_private: boolean;
    owner_id: number;
    created_at: string;
  }>> {
    return this.request('/lists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLists(): Promise<ApiResponse<Array<{
    id: number;
    name: string;
    description?: string;
    is_private: boolean;
    owner_id: number;
    created_at: string;
    updated_at: string;
    members_count: number;
    subscribers_count: number;
  }>>> {
    return this.request('/lists');
  }

  async getList(listId: number): Promise<ApiResponse<{
    id: number;
    name: string;
    description?: string;
    is_private: boolean;
    owner_id: number;
    created_at: string;
    updated_at: string;
    members_count: number;
    subscribers_count: number;
    is_subscribed: boolean;
  }>> {
    return this.request(`/lists/${listId}`);
  }

  async addUserToList(listId: number, userId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/lists/${listId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async removeUserFromList(listId: number, userId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/lists/${listId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async subscribeToList(listId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/lists/${listId}/subscribe`, {
      method: 'POST',
    });
  }

  async unsubscribeFromList(listId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/lists/${listId}/subscribe`, {
      method: 'DELETE',
    });
  }

  async getListMembers(listId: number): Promise<ApiResponse<Array<{
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    added_at: string;
    followersCount: number;
    followingCount: number;
  }>>> {
    return this.request(`/lists/${listId}/members`);
  }

  // ========== СИСТЕМА ДРУЗЕЙ ==========

  async sendFriendRequest(friendId: number): Promise<ApiResponse<{ message: string; friendship_id: number }>> {
    return this.request('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ friend_id: friendId }),
    });
  }

  async acceptFriendRequest(friendId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request('/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ friend_id: friendId }),
    });
  }

  async rejectFriendRequest(friendId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request('/friends/reject', {
      method: 'POST',
      body: JSON.stringify({ friend_id: friendId }),
    });
  }

  async removeFriend(friendId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/friends/${friendId}`, {
      method: 'DELETE',
    });
  }

  async getFriends(): Promise<ApiResponse<Array<{
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    friends_since: string;
  }>>> {
    return this.request('/friends');
  }

  async getIncomingFriendRequests(): Promise<ApiResponse<Array<{
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    request_date: string;
  }>>> {
    return this.request('/friends/requests/incoming');
  }

  async getOutgoingFriendRequests(): Promise<ApiResponse<Array<{
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    request_date: string;
  }>>> {
    return this.request('/friends/requests/outgoing');
  }
}

export const api = new ApiClient();
export type { User, Tweet, Comment, LoginResponse };
