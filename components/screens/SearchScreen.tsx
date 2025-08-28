import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Users, Loader2, UserPlus } from 'lucide-react'
import { FriendSearchCard } from '../molecules/FriendSearchCard'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { api } from '../../src/api'
import { toast } from 'sonner'

interface User {
  id: number
  username: string
  displayName: string
  avatarUrl?: string
  bio?: string
  followersCount: number
  followingCount: number
  friendship_status: 'friend' | 'request_sent' | 'request_received' | 'not_friend'
}

export function SearchScreen() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null)

  // Получаем текущего пользователя при загрузке
  useEffect(() => {
    const user = api.getCurrentUser()
    if (user) {
      setCurrentUser(user)
      console.log('🔍 SearchScreen: Current user loaded:', user.username)
    } else {
      console.log('🔍 SearchScreen: No authenticated user found')
    }
  }, [])

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Введите поисковый запрос')
      return
    }

    if (!currentUser) {
      toast.error('Необходимо войти в систему')
      return
    }

    setLoading(true)
    try {
      console.log('🔍 SearchScreen: Searching for:', query.trim(), 'as user:', currentUser.id)
      const response = await api.searchUsers(query.trim(), currentUser.id)
      if (response.error) {
        throw new Error(response.error)
      }
      console.log('🔍 SearchScreen: Response data:', response.data)
      console.log('🔍 SearchScreen: Users array length:', response.data?.length || 0)
      if (response.data && response.data.length > 0) {
        console.log('🔍 SearchScreen: First user:', response.data[0])
      }
      setUsers(response.data || [])
      setSearched(true)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Ошибка поиска')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = (userId: number) => {
    // Здесь можно открыть чат с пользователем
    toast.success('Открытие чата...')
    // Например, перейти на экран чата или открыть модальное окно
  }

  const handleStatusChange = () => {
    console.log('🔍 SearchScreen: Status changed, refreshing search results')
    // Обновляем список после изменения статуса дружбы
    if (searched && query.trim()) {
      handleSearch()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Поиск и добавление друзей</h1>
        {currentUser && (
          <p className="text-sm text-muted-foreground mb-4">
            Выполнен вход как: @{currentUser.username}
          </p>
        )}
        
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Поиск пользователей для добавления в друзья..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={loading || !query.trim()}
            className="px-6"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Найти
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Поиск пользователей...</span>
          </div>
        )}

        {!loading && searched && users.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8 text-muted-foreground"
          >
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Пользователи не найдены</p>
            <p className="text-sm">Попробуйте изменить поисковый запрос</p>
          </motion.div>
        )}

        {!loading && users.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Найдено пользователей: {users.length}
            </p>
            {console.log('🔍 SearchScreen: Rendering users, count:', users.length)}
            <div className="space-y-3">
              {users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <FriendSearchCard
                    user={user}
                    currentUserId={currentUser?.id || 0}
                    onSendMessage={handleSendMessage}
                    onStatusChange={handleStatusChange}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {!loading && !searched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8 text-muted-foreground"
          >
            {currentUser ? (
              <>
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Введите имя пользователя для поиска</p>
                <p className="text-sm">Например: alice, bob, carol</p>
              </>
            ) : (
              <>
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Необходимо войти в систему</p>
                <p className="text-sm">Войдите, чтобы искать и добавлять друзей</p>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}