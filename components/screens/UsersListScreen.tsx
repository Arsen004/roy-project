import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Loader2, RefreshCw } from 'lucide-react'
import { UserCard } from '../molecules/UserCard'
import { Button } from '../ui/button'
import { api } from '../../src/api'
import { toast } from 'sonner'

interface User {
  id: number
  username: string
  displayName?: string
  avatarUrl?: string
  bio?: string
  followersCount?: number
  followingCount?: number
}

export function UsersListScreen() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Загружаем список пользователей
  const loadUsers = async () => {
    try {
      // Используем поиск с пустой строкой для получения всех пользователей
      const response = await api.searchUsers('')
      if (response.error) {
        throw new Error(response.error)
      }
      setUsers(response.data || [])
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('Не удалось загрузить пользователей')
    } finally {
      setLoading(false)
    }
  }

  // Обновляем список
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadUsers()
    setRefreshing(false)
    toast.success('Список обновлен')
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleOpenChat = (userId: number) => {
    toast.success('Открытие чата...')
    // Здесь можно открыть чат с пользователем
  }

  const handleProfileClick = (userId: number) => {
    toast.success('Переход на профиль...')
    // Здесь можно перейти на профиль пользователя
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-3" />
          <span className="text-lg">Загрузка пользователей...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
        
        <p className="text-muted-foreground">
          Найдено пользователей: {users.length}
        </p>
      </div>

      <div className="space-y-3">
        {users.length > 0 ? (
          users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <UserCard
                user={user}
                onOpenChat={handleOpenChat}
                onProfileClick={handleProfileClick}
                showFollowButton={true}
              />
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 text-muted-foreground"
          >
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Пользователи не найдены</p>
            <p className="text-sm">Попробуйте обновить список</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}


