import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { AppleButton } from '../atoms/AppleButton'
import { cn } from '../ui/utils'

interface UserPillProps {
  user: {
    id: string
    name: string
    username: string
    avatar?: string
    bio?: string
    isFollowing?: boolean
    isBlocked?: boolean
    isMuted?: boolean
  }
  actions?: {
    onFollow?: () => void
    onUnfollow?: () => void
    onBlock?: () => void
    onUnblock?: () => void
    onMute?: () => void
    onUnmute?: () => void
  }
  showBio?: boolean
  className?: string
}

export function UserPill({ user, actions, showBio = false, className }: UserPillProps) {
  const getActionButton = () => {
    if (user.isBlocked && actions?.onUnblock) {
      return (
        <AppleButton variant="ghost" size="sm" onClick={actions.onUnblock}>
          Unblock
        </AppleButton>
      )
    }
    
    if (user.isMuted && actions?.onUnmute) {
      return (
        <AppleButton variant="ghost" size="sm" onClick={actions.onUnmute}>
          Unmute
        </AppleButton>
      )
    }
    
    if (user.isFollowing && actions?.onUnfollow) {
      return (
        <AppleButton variant="ghost" size="sm" onClick={actions.onUnfollow}>
          Following
        </AppleButton>
      )
    }
    
    if (actions?.onFollow) {
      return (
        <AppleButton variant="primary" size="sm" onClick={actions.onFollow}>
          Follow
        </AppleButton>
      )
    }
    
    return null
  }

  return (
    <div className={cn('flex items-start gap-3 p-3', className)}>
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h4 className="font-semibold text-foreground truncate">{user.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {showBio && user.bio && (
              <p className="text-sm text-foreground mt-1 line-clamp-2">{user.bio}</p>
            )}
          </div>
          
          {getActionButton()}
        </div>
      </div>
    </div>
  )
}