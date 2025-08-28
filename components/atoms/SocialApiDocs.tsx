import { motion } from 'motion/react'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { 
  Heart, 
  MessageCircle, 
  Repeat, 
  UserPlus, 
  Mail, 
  Bell, 
  Search, 
  Image,
  Send,
  Eye,
  Trash2,
  Edit,
  Share,
  Bookmark,
  Flag,
  Users,
  Settings,
  Database
} from 'lucide-react'

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  requestBody?: string
  response?: string
  auth?: boolean
}

interface ApiSection {
  title: string
  icon: React.ReactNode
  color: string
  endpoints: ApiEndpoint[]
}

export function SocialApiDocs() {
  const apiSections: ApiSection[] = [
    {
      title: "Posts & Content",
      icon: <Edit className="w-5 h-5" />,
      color: "bg-blue-500/10 text-blue-600",
      endpoints: [
        {
          method: "GET",
          path: "/api/posts",
          description: "Get timeline feed with pagination",
          response: "{ posts: Post[], nextCursor: string, hasMore: boolean }",
          auth: true
        },
        {
          method: "POST",
          path: "/api/posts",
          description: "Create new post",
          requestBody: "{ content: string, media?: string[], replyTo?: string }",
          auth: true
        },
        {
          method: "GET",
          path: "/api/posts/:id",
          description: "Get single post with thread",
          response: "{ post: Post, replies: Post[], ancestors: Post[] }",
        },
        {
          method: "PUT",
          path: "/api/posts/:id",
          description: "Edit own post",
          requestBody: "{ content: string, media?: string[] }",
          auth: true
        },
        {
          method: "DELETE",
          path: "/api/posts/:id",
          description: "Delete own post",
          auth: true
        },
        {
          method: "POST",
          path: "/api/posts/:id/report",
          description: "Report post for moderation",
          requestBody: "{ reason: string, details?: string }",
          auth: true
        }
      ]
    },
    {
      title: "Likes & Reactions",
      icon: <Heart className="w-5 h-5" />,
      color: "bg-red-500/10 text-red-600",
      endpoints: [
        {
          method: "POST",
          path: "/api/posts/:id/like",
          description: "Like a post",
          response: "{ liked: true, likeCount: number }",
          auth: true
        },
        {
          method: "DELETE",
          path: "/api/posts/:id/like",
          description: "Unlike a post",
          response: "{ liked: false, likeCount: number }",
          auth: true
        },
        {
          method: "GET",
          path: "/api/posts/:id/likes",
          description: "Get users who liked the post",
          response: "{ users: User[], total: number }",
        },
        {
          method: "GET",
          path: "/api/users/:id/likes",
          description: "Get posts liked by user",
          response: "{ posts: Post[], nextCursor: string }",
        }
      ]
    },
    {
      title: "Comments & Replies",
      icon: <MessageCircle className="w-5 h-5" />,
      color: "bg-green-500/10 text-green-600",
      endpoints: [
        {
          method: "POST",
          path: "/api/posts/:id/reply",
          description: "Reply to a post",
          requestBody: "{ content: string, media?: string[] }",
          auth: true
        },
        {
          method: "GET",
          path: "/api/posts/:id/replies",
          description: "Get replies to a post",
          response: "{ replies: Post[], total: number, nextCursor: string }",
        },
        {
          method: "PUT",
          path: "/api/posts/:id/replies/:replyId",
          description: "Edit own reply",
          requestBody: "{ content: string }",
          auth: true
        },
        {
          method: "DELETE",
          path: "/api/posts/:id/replies/:replyId",
          description: "Delete own reply",
          auth: true
        },
        {
          method: "GET",
          path: "/api/users/:id/replies",
          description: "Get user's replies",
          response: "{ replies: Post[], nextCursor: string }",
        }
      ]
    },
    {
      title: "Retweets & Shares",
      icon: <Repeat className="w-5 h-5" />,
      color: "bg-purple-500/10 text-purple-600",
      endpoints: [
        {
          method: "POST",
          path: "/api/posts/:id/retweet",
          description: "Retweet a post",
          requestBody: "{ comment?: string }",
          response: "{ retweeted: true, retweetCount: number }",
          auth: true
        },
        {
          method: "DELETE",
          path: "/api/posts/:id/retweet",
          description: "Undo retweet",
          response: "{ retweeted: false, retweetCount: number }",
          auth: true
        },
        {
          method: "GET",
          path: "/api/posts/:id/retweets",
          description: "Get users who retweeted",
          response: "{ users: User[], total: number }",
        },
        {
          method: "POST",
          path: "/api/posts/:id/share",
          description: "Share post externally",
          requestBody: "{ platform: string }",
          auth: true
        }
      ]
    },
    {
      title: "Follow System",
      icon: <UserPlus className="w-5 h-5" />,
      color: "bg-indigo-500/10 text-indigo-600",
      endpoints: [
        {
          method: "POST",
          path: "/api/users/:id/follow",
          description: "Follow a user",
          response: "{ following: true, followersCount: number }",
          auth: true
        },
        {
          method: "DELETE",
          path: "/api/users/:id/follow",
          description: "Unfollow a user",
          response: "{ following: false, followersCount: number }",
          auth: true
        },
        {
          method: "GET",
          path: "/api/users/:id/followers",
          description: "Get user's followers",
          response: "{ followers: User[], total: number, nextCursor: string }",
        },
        {
          method: "GET",
          path: "/api/users/:id/following",
          description: "Get users being followed",
          response: "{ following: User[], total: number, nextCursor: string }",
        },
        {
          method: "GET",
          path: "/api/users/follow-requests",
          description: "Get pending follow requests",
          response: "{ requests: FollowRequest[], total: number }",
          auth: true
        },
        {
          method: "POST",
          path: "/api/users/follow-requests/:id/accept",
          description: "Accept follow request",
          auth: true
        },
        {
          method: "DELETE",
          path: "/api/users/follow-requests/:id",
          description: "Decline follow request",
          auth: true
        }
      ]
    },
    {
      title: "Direct Messages",
      icon: <Mail className="w-5 h-5" />,
      color: "bg-orange-500/10 text-orange-600",
      endpoints: [
        {
          method: "GET",
          path: "/api/messages/conversations",
          description: "Get chat conversations list",
          response: "{ conversations: Conversation[], unreadCount: number }",
          auth: true
        },
        {
          method: "POST",
          path: "/api/messages/conversations",
          description: "Start new conversation",
          requestBody: "{ participantId: string, message: string }",
          auth: true
        },
        {
          method: "GET",
          path: "/api/messages/conversations/:id",
          description: "Get conversation messages",
          response: "{ messages: Message[], participants: User[] }",
          auth: true
        },
        {
          method: "POST",
          path: "/api/messages/conversations/:id/messages",
          description: "Send message",
          requestBody: "{ content: string, media?: string[], replyTo?: string }",
          auth: true
        },
        {
          method: "PUT",
          path: "/api/messages/:id/read",
          description: "Mark message as read",
          auth: true
        },
        {
          method: "DELETE",
          path: "/api/messages/:id",
          description: "Delete message",
          auth: true
        },
        {
          method: "GET",
          path: "/api/messages/search",
          description: "Search messages",
          response: "{ messages: Message[], total: number }",
          auth: true
        }
      ]
    },
    {
      title: "Notifications",
      icon: <Bell className="w-5 h-5" />,
      color: "bg-yellow-500/10 text-yellow-600",
      endpoints: [
        {
          method: "GET",
          path: "/api/notifications",
          description: "Get user notifications",
          response: "{ notifications: Notification[], unreadCount: number }",
          auth: true
        },
        {
          method: "PUT",
          path: "/api/notifications/:id/read",
          description: "Mark notification as read",
          auth: true
        },
        {
          method: "PUT",
          path: "/api/notifications/read-all",
          description: "Mark all notifications as read",
          auth: true
        },
        {
          method: "DELETE",
          path: "/api/notifications/:id",
          description: "Delete notification",
          auth: true
        },
        {
          method: "GET",
          path: "/api/notifications/settings",
          description: "Get notification preferences",
          response: "{ preferences: NotificationSettings }",
          auth: true
        },
        {
          method: "PUT",
          path: "/api/notifications/settings",
          description: "Update notification preferences",
          requestBody: "{ email: boolean, push: boolean, types: string[] }",
          auth: true
        }
      ]
    },
    {
      title: "Search & Discovery",
      icon: <Search className="w-5 h-5" />,
      color: "bg-teal-500/10 text-teal-600",
      endpoints: [
        {
          method: "GET",
          path: "/api/search",
          description: "Global search (posts, users, hashtags)",
          response: "{ posts: Post[], users: User[], hashtags: Hashtag[] }",
        },
        {
          method: "GET",
          path: "/api/search/posts",
          description: "Search posts only",
          response: "{ posts: Post[], total: number, nextCursor: string }",
        },
        {
          method: "GET",
          path: "/api/search/users",
          description: "Search users only",
          response: "{ users: User[], total: number, nextCursor: string }",
        },
        {
          method: "GET",
          path: "/api/search/suggestions",
          description: "Get search suggestions",
          response: "{ suggestions: string[], trending: string[] }",
        },
        {
          method: "GET",
          path: "/api/trends",
          description: "Get trending topics",
          response: "{ trends: Trend[], location?: string }",
        },
        {
          method: "GET",
          path: "/api/discover/users",
          description: "Discover users to follow",
          response: "{ users: User[], reasons: string[] }",
          auth: true
        }
      ]
    },
    {
      title: "Media Upload",
      icon: <Image className="w-5 h-5" />,
      color: "bg-pink-500/10 text-pink-600",
      endpoints: [
        {
          method: "POST",
          path: "/api/media/upload",
          description: "Upload image/video",
          requestBody: "FormData with file",
          response: "{ url: string, mediaId: string, metadata: object }",
          auth: true
        },
        {
          method: "GET",
          path: "/api/media/:id",
          description: "Get media metadata",
          response: "{ url: string, type: string, size: number, alt?: string }",
        },
        {
          method: "DELETE",
          path: "/api/media/:id",
          description: "Delete uploaded media",
          auth: true
        },
        {
          method: "POST",
          path: "/api/media/process",
          description: "Process media (resize, optimize)",
          requestBody: "{ mediaId: string, options: object }",
          auth: true
        }
      ]
    },
    {
      title: "Bookmarks & Lists",
      icon: <Bookmark className="w-5 h-5" />,
      color: "bg-cyan-500/10 text-cyan-600",
      endpoints: [
        {
          method: "POST",
          path: "/api/posts/:id/bookmark",
          description: "Bookmark a post",
          auth: true
        },
        {
          method: "DELETE",
          path: "/api/posts/:id/bookmark",
          description: "Remove bookmark",
          auth: true
        },
        {
          method: "GET",
          path: "/api/users/bookmarks",
          description: "Get user's bookmarks",
          response: "{ posts: Post[], total: number }",
          auth: true
        },
        {
          method: "GET",
          path: "/api/lists",
          description: "Get user's lists",
          response: "{ lists: List[], total: number }",
          auth: true
        },
        {
          method: "POST",
          path: "/api/lists",
          description: "Create new list",
          requestBody: "{ name: string, description?: string, private: boolean }",
          auth: true
        },
        {
          method: "POST",
          path: "/api/lists/:id/members",
          description: "Add user to list",
          requestBody: "{ userId: string }",
          auth: true
        }
      ]
    }
  ]

  const methodColors = {
    GET: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    POST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    PUT: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-xl flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Roy Social API</h1>
            <p className="text-muted-foreground">Complete API reference for social features</p>
          </div>
        </div>
      </motion.div>

      {/* API Sections */}
      <div className="grid gap-8">
        {apiSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
          >
            <Card className="overflow-hidden">
              {/* Section Header */}
              <div className={`p-6 ${section.color}`}>
                <div className="flex items-center gap-3">
                  {section.icon}
                  <div>
                    <h2 className="text-xl font-semibold">{section.title}</h2>
                    <p className="text-sm opacity-80">{section.endpoints.length} endpoints</p>
                  </div>
                </div>
              </div>

              {/* Endpoints */}
              <div className="p-6 space-y-4">
                {section.endpoints.map((endpoint, endpointIndex) => (
                  <motion.div
                    key={`${endpoint.method}-${endpoint.path}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (sectionIndex * 0.1) + (endpointIndex * 0.05) }}
                    className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                  >
                    {/* Method and Path */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <Badge className={methodColors[endpoint.method]}>
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                          {endpoint.path}
                        </code>
                      </div>
                      {endpoint.auth && (
                        <Badge variant="outline" className="text-xs">
                          🔒 Auth Required
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground">
                      {endpoint.description}
                    </p>

                    {/* Request/Response Details */}
                    {(endpoint.requestBody || endpoint.response) && (
                      <div className="space-y-2">
                        {endpoint.requestBody && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Request Body:</p>
                            <code className="text-xs bg-muted/50 p-2 rounded block overflow-x-auto">
                              {endpoint.requestBody}
                            </code>
                          </div>
                        )}
                        {endpoint.response && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Response:</p>
                            <code className="text-xs bg-muted/50 p-2 rounded block overflow-x-auto">
                              {endpoint.response}
                            </code>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Integration Notes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Integration Notes</h3>
          </div>
          
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="space-y-2">
              <p className="font-medium text-foreground">Authentication:</p>
              <p>• All protected endpoints require JWT token in Authorization header</p>
              <p>• Use <code>Bearer &lt;token&gt;</code> format</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <p className="font-medium text-foreground">Real-time Updates:</p>
              <p>• WebSocket connection at <code>wss://api.roy.app/ws</code></p>
              <p>• Subscribe to events: new_message, new_notification, post_update</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <p className="font-medium text-foreground">Pagination:</p>
              <p>• Use <code>cursor</code> and <code>limit</code> parameters</p>
              <p>• Default limit: 20, max: 100</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <p className="font-medium text-foreground">Rate Limiting:</p>
              <p>• 1000 requests per hour for authenticated users</p>
              <p>• 100 requests per hour for public endpoints</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}