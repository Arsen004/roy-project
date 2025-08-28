import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from './components/layout/Navigation'
import { LoginScreen } from './components/screens/LoginScreen'
import { RegisterScreen } from './components/screens/RegisterScreen'
import { FeedScreen } from './components/screens/FeedScreen'
import { SearchScreen } from './components/screens/SearchScreen'
import { NotificationsScreen } from './components/screens/NotificationsScreen'
import { ChatScreen } from './components/screens/ChatScreen'
import { ProfileScreen } from './components/screens/ProfileScreen'
import { SettingsScreen } from './components/screens/SettingsScreen'
import { ThreadScreen } from './components/screens/ThreadScreen'

import { BookmarksScreen } from './components/screens/BookmarksScreen'
import { ListsScreen } from './components/screens/ListsScreen'

import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'
import { Home, Search, Bell, Mail, User, Sparkles, List } from 'lucide-react'
import { api, User as ApiUser } from './src/api'

type Screen = 'login' | 'register' | 'feed' | 'search' | 'notifications' | 'messages' | 'profile' | 'settings' | 'thread' | 'bookmarks' | 'lists'

interface User {
  id: number
  username: string
  avatar_url?: string
  bio?: string
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentTweetId, setCurrentTweetId] = useState<string | null>(null)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  // Автоматическое восстановление сессии при загрузке приложения
  useEffect(() => {
    console.log('🔍 App: Checking for auto-login...');
    const currentUser = api.getCurrentUser();
    console.log('🔍 App: getCurrentUser result:', currentUser);
    
    if (currentUser) {
      setUser(currentUser);
      setCurrentScreen('feed');
      console.log('🔍 Auto-login successful for user:', currentUser.username);
    } else {
      console.log('🔍 App: No current user found, staying on login screen');
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setLoading(true)
    try {
      const response = await api.login(username, password)
      
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      if (response.data) {
        const { token, user } = response.data
        console.log('🔍 App: Login successful, setting token...');
        api.setToken(token)
        // Токен автоматически сохраняется в localStorage
        
        console.log('🔍 App: Token set, setting user state...');
        setUser(user)
        setCurrentScreen('feed')
        toast.success("Welcome back! You've successfully signed in to your account.")
        
        // Подключаем SSE для real-time уведомлений
        setupNotifications()
      }
    } catch (error) {
      toast.error("Login failed. Please check your credentials and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (data: {
    username: string
    password: string
  }) => {
    setLoading(true)
    try {
      const response = await api.register(data.username, data.password)
      
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      if (response.data) {
        toast.success("Account created! Please log in.")
        setCurrentScreen('login')
      }
    } catch (error) {
      toast.error("Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch (error) {
      // Игнорируем ошибки при логауте
    } finally {
      api.clearToken()
      // Не нужно очищать localStorage - мы его не используем
      setUser(null)
      setCurrentScreen('login')
      setUnreadNotifications(0)
      toast.success('Logged out successfully')
    }
  }

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen)
  }

  const setupNotifications = () => {
    try {
      const eventSource = api.createSSEConnection()
      
      eventSource.onopen = () => {
        console.log('🔍 SSE Connection opened')
      }
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('🔍 SSE Message:', data)
      }
      
      eventSource.addEventListener('notifications:unread_count', (event) => {
        const data = JSON.parse(event.data)
        setUnreadNotifications(data.count)
      })
      
      eventSource.addEventListener('notification:new', (event) => {
        const data = JSON.parse(event.data)
        console.log('🔍 New notification:', data)
        setUnreadNotifications(prev => prev + 1)
        
        // Показываем toast уведомление
        toast.success(`New ${data.type} notification!`)
      })
      
      eventSource.onerror = (error) => {
        console.error('🔍 SSE Error:', error)
        eventSource.close()
      }
      
      // Сохраняем соединение для закрытия при логауте
      return eventSource
    } catch (error) {
      console.error('Failed to setup notifications:', error)
    }
  }

  const handleTweetClick = (tweetId: string) => {
    setCurrentTweetId(tweetId)
    setCurrentScreen('thread')
  }

  const handleProfileClick = (userId?: string) => {
    setProfileUserId(userId || null)
    setCurrentScreen('profile')
  }



  const renderScreen = () => {
    if (!user) {
      if (currentScreen === 'register') {
        return (
          <motion.div
            key="register"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <RegisterScreen
              onRegister={handleRegister}
              onSwitchToLogin={() => setCurrentScreen('login')}
              loading={loading}
            />
          </motion.div>
        )
      }
      return (
        <motion.div
          key="login"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <LoginScreen
            onLogin={handleLogin}
            onSwitchToRegister={() => setCurrentScreen('register')}
            loading={loading}
          />
        </motion.div>
      )
    }

    const screenVariants = {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 }
    }

    const screens = {
      feed: <FeedScreen user={user} onTweetClick={handleTweetClick} onProfileClick={handleProfileClick} />,
      search: <SearchScreen onTweetClick={handleTweetClick} onProfileClick={handleProfileClick} />,
      notifications: <NotificationsScreen onTweetClick={handleTweetClick} onProfileClick={handleProfileClick} />,
      messages: <ChatScreen />,
      profile: <ProfileScreen user={user} profileUserId={profileUserId} />,
      settings: <SettingsScreen user={user} onLogout={handleLogout} />,
      thread: <ThreadScreen user={user} tweetId={currentTweetId || '1'} onBack={() => setCurrentScreen('feed')} />,

      bookmarks: <BookmarksScreen user={user} onTweetClick={handleTweetClick} onProfileClick={handleProfileClick} />,
      lists: <ListsScreen currentUser={user} onBack={() => setCurrentScreen('feed')} />,

    }

    return (
      <motion.div
        key={currentScreen}
        variants={screenVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {screens[currentScreen as keyof typeof screens] || screens.feed}
      </motion.div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
        <Toaster />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/3">
      <div className="max-w-7xl mx-auto flex relative">
        {/* Sidebar Navigation */}
        <motion.div 
          className="w-64 border-r border-border p-4 hidden md:block sticky top-0 h-screen backdrop-blur-sm bg-background/80"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Navigation
            currentPath={currentScreen}
            onNavigate={handleNavigate}
            unreadCount={unreadNotifications}
          />
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 min-h-screen">
          <div className="p-6">
            <AnimatePresence mode="wait">
              {renderScreen()}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Sidebar - Enhanced with animations */}
        <motion.div 
          className="w-80 border-l border-border p-4 hidden lg:block sticky top-0 h-screen backdrop-blur-sm bg-background/80"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        >
          <div className="space-y-4">
            <motion.div 
              className="bg-gradient-to-r from-card to-card/80 border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow backdrop-blur-sm"
              whileHover={{ y: -2, scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Trends for you</h3>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { tag: '#WebDevelopment', uses: '42.1K' },
                  { tag: '#DesignSystem', uses: '28.3K' },
                  { tag: '#AppleDesign', uses: '15.7K' }
                ].map((trend, index) => (
                  <motion.div
                    key={trend.tag}
                    className="hover:bg-muted/50 p-2 rounded-lg cursor-pointer group transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    whileHover={{ x: 4 }}
                  >
                    <p className="font-medium text-primary group-hover:text-primary/80 transition-colors">{trend.tag}</p>
                    <p className="text-muted-foreground text-xs">{trend.uses} posts</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              className="bg-gradient-to-r from-card to-card/80 border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow backdrop-blur-sm"
              whileHover={{ y: -2, scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="font-semibold mb-3">Who to follow</h3>
              <div className="space-y-3">
                {[
                  { name: 'Design System', username: '@designsys', avatar: 'DS' },
                  { name: 'Apple Developer', username: '@appledev', avatar: 'AD' },
                  { name: 'Web Standards', username: '@webstd', avatar: 'WS' }
                ].map((user, index) => (
                  <motion.div
                    key={user.username}
                    className="flex items-center justify-between group"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <div className="flex items-center gap-2">
                      <motion.div 
                        className="w-8 h-8 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full flex items-center justify-center"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="text-xs font-medium text-primary">{user.avatar}</span>
                      </motion.div>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.username}</p>
                      </div>
                    </div>
                    <motion.button 
                      className="text-xs bg-gradient-to-r from-primary to-primary/90 text-primary-foreground px-3 py-1 rounded-full hover:from-primary/90 hover:to-primary shadow-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.1 }}
                    >
                      Follow
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Enhanced Mobile Navigation */}
      <motion.div 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border shadow-lg"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex justify-around py-2">
          {[
            { screen: 'feed', icon: Home },
            { screen: 'search', icon: Search },
            { screen: 'notifications', icon: Bell },
            { screen: 'messages', icon: Mail },
            { screen: 'profile', icon: User }
          ].map(({ screen, icon: Icon }, index) => (
            <motion.button
              key={screen}
              onClick={() => handleNavigate(screen)}
              className={`p-3 rounded-xl transition-all relative ${
                currentScreen === screen
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className="w-5 h-5" />
              {currentScreen === screen && (
                <motion.div
                  className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"
                  layoutId="activeIndicator"
                  transition={{ duration: 0.2 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <Toaster />
    </div>
  )
}