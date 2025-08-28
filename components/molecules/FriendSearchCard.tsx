import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, UserCheck, UserX, MessageCircle, Check, X } from 'lucide-react'
import { AppleButton } from '../atoms/AppleButton'
import { api } from '../../src/api'
import { toast } from 'sonner'

interface FriendSearchCardProps {
  user: {
    id: number
    username: string
    displayName: string
    avatarUrl?: string
    bio?: string
    followersCount: number
    followingCount: number
    friendship_status: 'friend' | 'request_sent' | 'request_received' | 'not_friend'
  }
  currentUserId: number
  onSendMessage?: (userId: number) => void
  onStatusChange?: () => void
  className?: string
}

export function FriendSearchCard({ 
  user, 
  currentUserId, 
  onSendMessage,
  onStatusChange,
  className = '' 
}: FriendSearchCardProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(user.friendship_status)

  // Обновляем статус при изменении пользователя
  useEffect(() => {
    console.log('🔍 FriendSearchCard: Status updated for', user.username, 'to', user.friendship_status)
    setStatus(user.friendship_status)
  }, [user.friendship_status, user.username])

  const handleSendFriendRequest = async () => {
    setLoading(true)
    try {
      const response = await api.sendFriendRequest(user.id)
      if (response.error) {
        throw new Error(response.error)
      }
      console.log('🔍 FriendSearchCard: Friend request sent, updating status to request_sent')
      setStatus('request_sent')
      toast.success(`Запрос в друзья отправлен @${user.username}`)
      onStatusChange?.()
    } catch (error) {
      console.error('Send friend request error:', error)
      toast.error('Не удалось отправить запрос в друзья')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRequest = async () => {
    setLoading(true)
    try {
      const response = await api.acceptFriendRequest(user.id)
      if (response.error) {
        throw new Error(response.error)
      }
      setStatus('friend')
      toast.success(`@${user.username} добавлен в друзья`)
      onStatusChange?.()
    } catch (error) {
      console.error('Accept friend request error:', error)
      toast.error('Не удалось принять запрос в друзья')
    } finally {
      setLoading(false)
    }
  }

  const handleRejectRequest = async () => {
    setLoading(true)
    try {
      const response = await api.rejectFriendRequest(user.id)
      if (response.error) {
        throw new Error(response.error)
      }
      setStatus('not_friend')
      toast.success(`Запрос от @${user.username} отклонен`)
      onStatusChange?.()
    } catch (error) {
      console.error('Reject friend request error:', error)
      toast.error('Не удалось отклонить запрос в друзья')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFriend = async () => {
    setLoading(true)
    try {
      const response = await api.removeFriend(user.id)
      if (response.error) {
        throw new Error(response.error)
      }
      setStatus('not_friend')
      toast.success(`@${user.username} удален из друзей`)
      onStatusChange?.()
    } catch (error) {
      console.error('Remove friend error:', error)
      toast.error('Не удалось удалить из друзей')
    } finally {
      setLoading(false)
    }
  }

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 }
  }

  const renderActionButton = () => {
    switch (status) {
      case 'friend':
        return (
          <div className="flex gap-2">
            <motion.button
              variants={buttonVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              onClick={() => onSendMessage?.(user.id)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              title="Написать сообщение"
            >
              <MessageCircle className="w-4 h-4" />
            </motion.button>
            <AppleButton
              onClick={handleRemoveFriend}
              disabled={loading}
              className="px-3 py-1.5 text-sm border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <UserX className="w-3 h-3 mr-1" />
              Удалить
            </AppleButton>
          </div>
        )
      
      case 'request_sent':
        return (
          <AppleButton
            disabled={true}
            className="px-3 py-1.5 text-sm border border-muted text-muted-foreground"
          >
            <UserCheck className="w-3 h-3 mr-1" />
            Запрос отправлен
          </AppleButton>
        )
      
      case 'request_received':
        return (
          <div className="flex gap-2">
            <AppleButton
              onClick={handleAcceptRequest}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Check className="w-3 h-3 mr-1" />
              Принять
            </AppleButton>
            <AppleButton
              onClick={handleRejectRequest}
              disabled={loading}
              className="px-3 py-1.5 text-sm border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              Отклонить
            </AppleButton>
          </div>
        )
      
      case 'not_friend':
      default:
        return (
          <AppleButton
            onClick={handleSendFriendRequest}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="w-3 h-3 mr-1" />
            Добавить в друзья
          </AppleButton>
        )
    }
  }

  return (
    <motion.div
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      className={`bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            {user.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.username}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-primary">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">@{user.username}</h3>
            <p className="text-sm text-muted-foreground">{user.displayName}</p>
            {user.bio && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {user.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
        <span>{user.followersCount} подписчиков</span>
        <span>{user.followingCount} подписок</span>
      </div>

      <div className="flex justify-end">
        {renderActionButton()}
      </div>
    </motion.div>
  )
}
