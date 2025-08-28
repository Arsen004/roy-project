import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Lock, Unlock, Plus, Minus, UserPlus } from 'lucide-react'
import { AppleButton } from '../atoms/AppleButton'
import { api } from '../../src/api'
import { toast } from 'sonner'

interface ListCardProps {
  list: {
    id: number
    name: string
    description?: string
    is_private: boolean
    owner_id: number
    created_at: string
    updated_at: string
    members_count: number
    subscribers_count: number
    is_subscribed?: boolean
  }
  currentUserId: number
  onListClick?: (listId: number) => void
  onAddUser?: (listId: number) => void
  className?: string
}

export function ListCard({ 
  list, 
  currentUserId, 
  onListClick,
  onAddUser,
  className = '' 
}: ListCardProps) {
  const [isSubscribed, setIsSubscribed] = useState(list.is_subscribed || false)
  const [loading, setLoading] = useState(false)
  const isOwner = list.owner_id === currentUserId

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const response = await api.subscribeToList(list.id)
      if (response.error) {
        throw new Error(response.error)
      }
      setIsSubscribed(true)
      toast.success(`Подписались на список "${list.name}"`)
    } catch (error) {
      console.error('Subscribe error:', error)
      toast.error('Не удалось подписаться на список')
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    try {
      const response = await api.unsubscribeFromList(list.id)
      if (response.error) {
        throw new Error(response.error)
      }
      setIsSubscribed(false)
      toast.success(`Отписались от списка "${list.name}"`)
    } catch (error) {
      console.error('Unsubscribe error:', error)
      toast.error('Не удалось отписаться от списка')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = () => {
    onAddUser?.(list.id)
  }

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 }
  }

  return (
    <motion.div
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      className={`bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={() => onListClick?.(list.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{list.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              {list.is_private ? (
                <Lock className="w-3 h-3" />
              ) : (
                <Unlock className="w-3 h-3" />
              )}
              <span>{list.is_private ? 'Приватный' : 'Публичный'}</span>
            </div>
          </div>
        </div>
        
        {isOwner && (
          <motion.button
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            onClick={(e) => {
              e.stopPropagation()
              handleAddUser()
            }}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            title="Добавить пользователя"
          >
            <UserPlus className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {list.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {list.description}
        </p>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
        <span>{list.members_count} участников</span>
        <span>{list.subscribers_count} подписчиков</span>
      </div>

      {!isOwner && (
        <div className="flex gap-2">
          {isSubscribed ? (
            <AppleButton
              onClick={(e) => {
                e.stopPropagation()
                handleUnsubscribe()
              }}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-sm border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Minus className="w-3 h-3 mr-1" />
              Отписаться
            </AppleButton>
          ) : (
            <AppleButton
              onClick={(e) => {
                e.stopPropagation()
                handleSubscribe()
              }}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-3 h-3 mr-1" />
              Подписаться
            </AppleButton>
          )}
        </div>
      )}
    </motion.div>
  )
}
