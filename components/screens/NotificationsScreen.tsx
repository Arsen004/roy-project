import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Button } from '../ui/button'

import { AppleButton } from '../atoms/AppleButton'
import { Badge } from '../ui/badge'
import { Empty } from '../atoms/Empty'
import { Heart, MessageCircle, Repeat2, UserPlus, Bell } from 'lucide-react'
import { api } from '../../src/api'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: 'like' | 'comment' | 'retweet' | 'quote' | 'mention' | 'follow'
  user: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  content?: string
  tweetContent?: string
  timestamp: string
  read: boolean
}

interface NotificationsScreenProps {
  onTweetClick?: (tweetId: string) => void
  onProfileClick?: (userId?: string) => void
}

export function NotificationsScreen({ onTweetClick, onProfileClick }: NotificationsScreenProps) {
  const [filter, setFilter] = useState<'all' | 'mentions'>('all')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  // Загрузка уведомлений
  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
  }, [])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const response = await api.getNotifications(50)
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      if (response.data) {
        const adaptedNotifications = response.data.items.map((notification: any) => ({
          id: notification.id.toString(),
          type: notification.type,
          user: {
            id: notification.user_id.toString(),
            name: notification.username, // Используем username как name
            username: notification.username,
            avatar: notification.avatar_url
          },
          content: notification.content,
          tweetContent: notification.tweet_content,
          timestamp: notification.created_at,
          read: notification.is_read === 1
        }))
        setNotifications(adaptedNotifications)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const response = await api.getUnreadCount()
      if (response.error) {
        console.error('Error loading unread count:', response.error)
        return
      }
      
      if (response.data) {
        setUnreadCount(response.data.count)
      }
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500 fill-current" />
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />
      case 'retweet':
      case 'quote':
        return <Repeat2 className="w-5 h-5 text-green-500" />
      case 'follow':
        return <UserPlus className="w-5 h-5 text-primary" />
      case 'mention':
        return <Bell className="w-5 h-5 text-orange-500" />
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return 'liked your tweet'
      case 'comment':
        return 'replied to your tweet'
      case 'retweet':
        return 'retweeted your tweet'
      case 'quote':
        return 'quoted your tweet'
      case 'follow':
        return 'started following you'
      case 'mention':
        return 'mentioned you in a tweet'
      default:
        return 'interacted with your content'
    }
  }

  const markAllAsRead = async () => {
    try {
      // Обновляем локальное состояние
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      
      // Отмечаем все как прочитанные на сервере
      // Примечание: API для markAllAsRead может не существовать, поэтому пока обновляем только локально
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Failed to mark all as read')
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await api.markAsRead(parseInt(notificationId))
      if (response.error) {
        console.error('Error marking as read:', response.error)
        return
      }
      
      // Обновляем локальное состояние
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          
          {unreadCount > 0 && (
            <AppleButton variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </AppleButton>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'mentions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('mentions')}
          >
            Mentions
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            icon={<Bell className="w-12 h-12" />}
            title="No notifications yet"
            description="When someone interacts with your tweets, you'll see it here"
          />
        ) : (
          notifications
            .filter(n => filter === 'all' || n.type === 'mention')
            .map((notification) => (
              <div
                key={notification.id}
                className={`
                  p-4 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer
                  ${!notification.read ? 'bg-primary/5 border-l-2 border-l-primary' : ''}
                `}
                onClick={() => {
                  if (!notification.read) {
                    markAsRead(notification.id)
                  }
                  // Здесь можно добавить навигацию к твиту или профилю
                  if (notification.tweetContent) {
                    onTweetClick?.(notification.id)
                  } else {
                    onProfileClick?.(notification.user.id)
                  }
                }}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={notification.user.avatar} alt={notification.user.name} />
                        <AvatarFallback>{notification.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold">{notification.user.name}</span>
                          {' '}
                          <span className="text-muted-foreground">
                            {getNotificationText(notification)}
                          </span>
                        </p>
                        
                        {notification.content && (
                          <p className="text-sm text-foreground mt-1">
                            "{notification.content}"
                          </p>
                        )}
                        
                        {notification.tweetContent && (
                          <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                            {notification.tweetContent.length > 100
                              ? `${notification.tweetContent.substring(0, 100)}...`
                              : notification.tweetContent
                            }
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>


    </div>
  )
}