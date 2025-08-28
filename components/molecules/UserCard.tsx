import { motion } from 'framer-motion'
import { User, MessageCircle } from 'lucide-react'
import { FollowButton } from './FollowButton'
import { ImageWithFallback } from '../figma/ImageWithFallback'

interface UserCardProps {
  user: {
    id: number
    username: string
    displayName?: string
    avatarUrl?: string
    bio?: string
    followersCount?: number
    followingCount?: number
  }
  onOpenChat?: (userId: number) => void
  onProfileClick?: (userId: number) => void
  showFollowButton?: boolean
  className?: string
}

export function UserCard({ 
  user, 
  onOpenChat, 
  onProfileClick,
  showFollowButton = true,
  className = '' 
}: UserCardProps) {
  const handleProfileClick = () => {
    onProfileClick?.(user.id)
  }

  const handleOpenChat = (userId: number) => {
    onOpenChat?.(userId)
  }

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    hover: {
      y: -2,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      className={`bg-card border rounded-lg p-4 hover:shadow-md transition-shadow ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div 
          className="flex-shrink-0 cursor-pointer"
          onClick={handleProfileClick}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
            {user.avatarUrl ? (
              <ImageWithFallback
                src={user.avatarUrl}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div 
            className="cursor-pointer"
            onClick={handleProfileClick}
          >
            <h3 className="font-semibold text-foreground truncate">
              {user.displayName || user.username}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              @{user.username}
            </p>
          </div>

          {user.bio && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {user.bio}
            </p>
          )}

          {/* Stats */}
          {(user.followersCount !== undefined || user.followingCount !== undefined) && (
            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
              {user.followingCount !== undefined && (
                <span>
                  <span className="font-medium text-foreground">{user.followingCount}</span> подписок
                </span>
              )}
              {user.followersCount !== undefined && (
                <span>
                  <span className="font-medium text-foreground">{user.followersCount}</span> подписчиков
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {showFollowButton && (
            <FollowButton
              userId={user.id}
              username={user.username}
              onOpenChat={handleOpenChat}
              size="sm"
            />
          )}
          
          {!showFollowButton && onOpenChat && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOpenChat(user.id)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              title="Написать сообщение"
            >
              <MessageCircle className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
