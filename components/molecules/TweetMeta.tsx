import { MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Button } from '../ui/button'

interface TweetMetaProps {
  user: {
    id?: string
    name: string
    username: string
    avatar?: string
  }
  timestamp: string
  isOwn?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onReport?: () => void
  onProfileClick?: (userId?: string) => void
  onTweetClick?: (id: string) => void
}

export function TweetMeta({ user, timestamp, isOwn = false, onEdit, onDelete, onReport, onProfileClick }: TweetMetaProps) {
  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts)
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
      
      if (diffInSeconds < 60) {
        return `${diffInSeconds}s`
      } else if (diffInSeconds < 3600) {
        return `${Math.floor(diffInSeconds / 60)}m`
      } else if (diffInSeconds < 86400) {
        return `${Math.floor(diffInSeconds / 3600)}h`
      } else {
        return date.toLocaleDateString()
      }
    } catch {
      return '1m'
    }
  }

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onProfileClick?.(user.id || user.username)
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1 text-sm">
        <span 
          className="font-semibold text-foreground hover:underline cursor-pointer"
          onClick={handleProfileClick}
        >
          {user.name}
        </span>
        <span 
          className="text-muted-foreground hover:underline cursor-pointer"
          onClick={handleProfileClick}
        >
          @{user.username}
        </span>
        <span className="text-muted-foreground">·</span>
        <time className="text-muted-foreground hover:underline cursor-pointer">
          {formatTimestamp(timestamp)}
        </time>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isOwn ? (
            <>
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  Edit tweet
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  Delete tweet
                </DropdownMenuItem>
              )}
            </>
          ) : (
            <>
              <DropdownMenuItem>Copy link</DropdownMenuItem>
              <DropdownMenuItem>Follow @{user.username}</DropdownMenuItem>
              <DropdownMenuItem>Mute @{user.username}</DropdownMenuItem>
              <DropdownMenuItem>Block @{user.username}</DropdownMenuItem>
              {onReport && (
                <DropdownMenuItem onClick={onReport} className="text-destructive">
                  Report tweet
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}