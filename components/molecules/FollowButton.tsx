import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, UserMinus, MessageCircle, MoreHorizontal } from 'lucide-react'
import { AppleButton } from '../atoms/AppleButton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { api } from '../../src/api'
import { toast } from 'sonner'

interface FollowButtonProps {
  userId: number
  username: string
  onOpenChat?: (userId: number) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function FollowButton({ 
  userId, 
  username, 
  onOpenChat,
  className = '',
  size = 'md'
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)

  // Проверяем статус подписки при монтировании
  useEffect(() => {
    const checkFollowingStatus = async () => {
      try {
        const response = await api.getMyFollowingIds()
        if (response.data) {
          setIsFollowing(response.data.includes(userId))
        }
      } catch (error) {
        console.error('Failed to check following status:', error)
      } finally {
        setCheckingStatus(false)
      }
    }

    checkFollowingStatus()
  }, [userId])

  const handleFollow = async () => {
    setLoading(true)
    try {
      const response = await api.followUser(userId)
      if (response.error) {
        throw new Error(response.error)
      }
      setIsFollowing(true)
      toast.success(`Подписались на @${username}`)
    } catch (error) {
      console.error('Follow error:', error)
      toast.error('Не удалось подписаться')
    } finally {
      setLoading(false)
    }
  }

  const handleUnfollow = async () => {
    setLoading(true)
    try {
      const response = await api.unfollowUser(userId)
      if (response.error) {
        throw new Error(response.error)
      }
      setIsFollowing(false)
      toast.success(`Отписались от @${username}`)
    } catch (error) {
      console.error('Unfollow error:', error)
      toast.error('Не удалось отписаться')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChat = () => {
    onOpenChat?.(userId)
    setShowDropdown(false)
  }

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 }
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  // Показываем загрузку пока проверяем статус
  if (checkingStatus) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (isFollowing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <motion.div
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
        >
          <AppleButton
            onClick={handleUnfollow}
            disabled={loading}
            className={`${sizeClasses[size]} border border-primary text-primary hover:bg-primary hover:text-primary-foreground`}
          >
            <UserMinus className="w-4 h-4 mr-2" />
            Подписан
          </AppleButton>
        </motion.div>

        <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
          <DropdownMenuTrigger asChild>
            <motion.button
              variants={buttonVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleOpenChat}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Написать сообщение
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleUnfollow}
              className="text-destructive focus:text-destructive"
            >
              <UserMinus className="w-4 h-4 mr-2" />
              Отписаться
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <motion.div
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      className={className}
    >
      <AppleButton
        onClick={handleFollow}
        disabled={loading}
        className={`${sizeClasses[size]} bg-primary text-primary-foreground hover:bg-primary/90`}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Подписаться
      </AppleButton>
    </motion.div>
  )
}
