import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Empty } from '../atoms/Empty'
import { Badge } from '../ui/badge'
import { MoreHorizontal, Send, Smile, Image, MessageSquare } from 'lucide-react'
import { api } from '../../src/api'
import { toast } from 'sonner'

interface Conversation {
  id: number
  other_user: {
    id: number
    username: string
    avatar_url?: string
  }
  last_message: {
    id: number
    content: string
    sender_id: number
    is_read: number
    created_at: string
  } | null
  unread: number
  updated_at: string
}

interface Message {
  id: number
  conversation_id: number
  sender_id: number
  content: string
  is_read: number
  created_at: string
}

export function ChatScreen() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  // Загружаем список диалогов
  useEffect(() => {
    loadConversations()
  }, [])

  // Загружаем сообщения при выборе диалога
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation)
    }
  }, [selectedConversation])

  // Подключаем SSE для real-time сообщений
  useEffect(() => {
    const eventSource = api.createSSEConnection()
    
    eventSource.addEventListener('message:new', (event) => {
      const data = JSON.parse(event.data)
      console.log('🔍 New message:', data)
      
      // Если сообщение в текущем диалоге, добавляем его
      if (data.conversation_id === selectedConversation) {
        setMessages(prev => [...prev, data])
      }
      
      // Обновляем список диалогов
      loadConversations()
    })
    
    eventSource.addEventListener('conversation:new', (event) => {
      const data = JSON.parse(event.data)
      console.log('🔍 New conversation:', data)
      
      // Обновляем список диалогов
      loadConversations()
    })
    
    return () => {
      eventSource.close()
    }
  }, [selectedConversation])

  const loadConversations = async () => {
    setLoading(true)
    try {
      const response = await api.getConversations()
      if (response.error) {
        toast.error(response.error)
        return
      }
      setConversations(response.data || [])
    } catch (error) {
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: number) => {
    try {
      const response = await api.getMessages(conversationId)
      if (response.error) {
        toast.error(response.error)
        return
      }
      setMessages(response.data?.items || [])
      
      // Отмечаем сообщения как прочитанные
      markMessagesAsRead(conversationId)
    } catch (error) {
      toast.error('Failed to load messages')
    }
  }

  const markMessagesAsRead = async (conversationId: number) => {
    try {
      // Находим непрочитанные сообщения
      const unreadMessages = messages.filter(msg => msg.is_read === 0 && msg.sender_id !== conversations.find(c => c.id === conversationId)?.other_user.id)
      
      // Отмечаем каждое как прочитанное
      for (const message of unreadMessages) {
        await api.markMessageAsRead(message.id)
      }
      
      // Обновляем список диалогов
      loadConversations()
    } catch (error) {
      console.error('Failed to mark messages as read:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return

    setSending(true)
    try {
      const response = await api.sendMessage(selectedConversation, newMessage.trim())
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      // Добавляем новое сообщение в список
      setMessages(prev => [...prev, response.data])
      setNewMessage('')
      
      // Обновляем список диалогов
      loadConversations()
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await api.searchUsers(query)
      if (response.error) {
        console.error('Search error:', response.error)
        return
      }
      setSearchResults(response.data || [])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearchUsers(searchQuery)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleStartConversation = async (userId: number) => {
    try {
      const response = await api.createConversation(userId)
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      // Добавляем новый диалог в список
      await loadConversations()
      
      // Выбираем новый диалог
      setSelectedConversation(response.data.id)
      setShowNewChat(false)
      setSearchQuery('')
      setSearchResults([])
      
      toast.success('Conversation started!')
    } catch (error) {
      toast.error('Failed to start conversation')
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background border rounded-lg overflow-hidden">

      {/* Conversations List */}
      <div className="w-80 border-r border-border bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-lg">Messages</h2>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowNewChat(true)}
            className="h-8 px-2"
          >
            New
          </Button>
        </div>
        
        <div className="overflow-y-auto">
          {conversations.length === 0 ? (
            <Empty
              icon={<MessageSquare className="w-8 h-8" />}
              title="No messages"
              description="Start a conversation"
              className="py-8"
            />
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`
                  p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors
                  ${selectedConversation === conversation.id ? 'bg-primary/10 border-r-2 border-r-primary' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={conversation.other_user.avatar_url} alt={conversation.other_user.username} />
                      <AvatarFallback>{conversation.other_user.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm truncate">@{conversation.other_user.username}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {conversation.last_message ? new Date(conversation.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {conversation.unread > 0 && (
                          <Badge variant="destructive" className="text-xs h-5 min-w-[20px] px-1.5">
                            {conversation.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.last_message ? conversation.last_message.content : 'No messages yet'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={conversations.find(c => c.id === selectedConversation)?.other_user.avatar_url} alt="User" />
                    <AvatarFallback>
                      {conversations.find(c => c.id === selectedConversation)?.other_user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    @{conversations.find(c => c.id === selectedConversation)?.other_user.username}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Direct Message
                  </p>
                </div>
              </div>
              
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => {
                const isMe = message.sender_id !== conversations.find(c => c.id === selectedConversation)?.other_user.id
                const showTime = index === 0 || new Date(messages[index - 1].created_at).toDateString() !== new Date(message.created_at).toDateString()
                
                return (
                  <div key={message.id}>
                    {showTime && (
                      <div className="text-center mb-4">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          {new Date(message.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`
                          max-w-xs px-4 py-2 rounded-2xl
                          ${isMe 
                            ? 'bg-primary text-primary-foreground ml-12' 
                            : 'bg-muted text-foreground mr-12'
                          }
                        `}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs opacity-70">
                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && (
                              <span className="ml-1">
                                {message.is_read ? '●●' : '●'}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex items-end gap-2">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground">
                  <Image className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground">
                  <Smile className="w-4 h-4" />
                </Button>
                
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="bg-input-background border border-border pr-12"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <Empty
            icon={<MessageSquare className="w-16 h-16" />}
            title="Select a conversation"
            description="Choose a conversation from the sidebar to start messaging"
            className="flex-1 flex flex-col justify-center"
          />
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 w-96 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">New Message</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowNewChat(false)
                  setSearchQuery('')
                  setSearchResults([])
                }}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {searching ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer"
                      onClick={() => handleStartConversation(user.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar_url} alt={user.username} />
                          <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">@{user.username}</p>
                          {user.bio && (
                            <p className="text-xs text-muted-foreground truncate">{user.bio}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : searchQuery ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Start typing to search users
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}