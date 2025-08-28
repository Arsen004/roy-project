import { useState, useEffect } from 'react'
import { TweetCard } from '../organisms/TweetCard'
import { ComposerBar } from '../molecules/ComposerBar'

import { AppleButton } from '../atoms/AppleButton'
import { Empty } from '../atoms/Empty'
import { Spinner } from '../atoms/Spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { MessageSquare, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, Tweet as ApiTweet } from '../../src/api'
import { toast } from 'sonner'
import { EditTweetModal } from '../ui/edit-tweet-modal'

interface FeedScreenProps {
  user: {
    id: number
    username: string
    avatar_url?: string
    bio?: string
  }
  onTweetClick?: (tweetId: string) => void
  onProfileClick?: (userId?: string) => void
}

export function FeedScreen({ user, onTweetClick, onProfileClick }: FeedScreenProps) {
  const [scope, setScope] = useState<'following' | 'all' | 'me'>('following')
  const [type, setType] = useState<'all' | 'original' | 'retweet' | 'quote' | 'with_media'>('all')
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [tweets, setTweets] = useState<ApiTweet[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [editingTweet, setEditingTweet] = useState<{
    id: string
    content: string
    media_url?: string
  } | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Загрузка твитов при изменении фильтров
  useEffect(() => {
    loadTweets()
  }, [scope, type])

  const loadTweets = async (cursor?: string) => {
    setLoading(true)
    try {
      const response = await api.getFeed(20, cursor)
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      if (response.data) {
        if (cursor) {
          setTweets(prev => [...prev, ...response.data.items])
        } else {
          setTweets(response.data.items)
        }
        setNextCursor(response.data.nextCursor)
      }
    } catch (error) {
      toast.error('Failed to load tweets')
    } finally {
      setLoading(false)
    }
  }

  const loadBookmarksStatus = async (tweetIds: number[]) => {
    try {
      // Для каждого твита проверяем, есть ли он в закладках
      for (const tweetId of tweetIds) {
        const response = await api.isBookmarked(tweetId)
        if (response.data) {
          setTweets(prev => prev.map(tweet => 
            tweet.id === tweetId.toString() 
              ? { ...tweet, isBookmarked: response.data.bookmarked }
              : tweet
          ))
        }
      }
    } catch (error) {
      console.error('Failed to load bookmarks status:', error)
    }
  }

  const handleEditTweet = (tweetId: string, content: string) => {
    const tweet = tweets.find(t => t.id === tweetId)
    if (tweet) {
      setEditingTweet({
        id: tweetId,
        content: content,
        media_url: tweet.media_url
      })
      setIsEditModalOpen(true)
    }
  }

  const handleSaveEdit = async (tweetId: string, content: string, mediaUrl?: string) => {
    try {
      const media = mediaUrl ? [mediaUrl] : []
      const response = await api.updateTweet(parseInt(tweetId), content, media)
      
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      if (response.data) {
        // Обновляем твит в списке
        setTweets(prev => {
          const updated = prev.map(tweet => 
            tweet.id === parseInt(tweetId)
              ? { 
                  ...tweet, 
                  content: response.data.text, // API возвращает text, а не content
                  media_url: response.data.media?.[0] || (mediaUrl || null)
                }
              : tweet
          )
          return updated
        })
        toast.success('Tweet updated successfully')
        setIsEditModalOpen(false)
        setEditingTweet(null)
      }
    } catch (error) {
      console.error('Error updating tweet:', error)
      toast.error('Failed to update tweet')
    }
  }

  const handleDeleteTweet = async (tweetId: string) => {
    if (!confirm('Are you sure you want to delete this tweet?')) {
      return
    }

    try {
      const response = await api.deleteTweet(parseInt(tweetId))
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      // Удаляем твит из списка
      setTweets(prev => prev.filter(tweet => tweet.id !== tweetId))
      toast.success('Tweet deleted successfully')
    } catch (error) {
      console.error('Error deleting tweet:', error)
      toast.error('Failed to delete tweet')
    }
  }

  const handlePost = async (content: string, mediaUrl?: string) => {
    setPosting(true)
    try {
      const response = await api.createTweet(content, mediaUrl)
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      if (response.data) {
        // Добавляем новый твит в начало списка
        const newTweet = {
          id: response.data.id,
          content: response.data.content,
          user: response.data.user,
          media_url: response.data.media_url || mediaUrl, // Используем mediaUrl из параметра, если API не вернул
          created_at: new Date().toISOString(),
          likes_count: 0,
          comments_count: 0,
          retweets_count: 0,
          quotes_count: 0,
          is_liked: false,
          is_retweeted: false,
          is_bookmarked: false
        }
        
        setTweets(prev => [newTweet, ...prev])
        toast.success('Tweet posted successfully!')
      }
    } catch (error) {
      toast.error('Failed to post tweet')
    } finally {
      setPosting(false)
    }
  }

  const handleLoadMore = async () => {
    if (nextCursor) {
      await loadTweets(nextCursor)
    }
  }

  const handleTweetAction = async (tweetId: number, action: string) => {
    try {
      switch (action) {
        case 'like':
          const likeResponse = await api.likeTweet(tweetId)
          if (likeResponse.error) {
            toast.error(likeResponse.error)
            return
          }
          // Обновляем состояние твита
          setTweets(prev => prev.map(tweet => {
            if (tweet.id === tweetId) {
              return {
                ...tweet,
                likes_count: tweet.is_liked ? tweet.likes_count - 1 : tweet.likes_count + 1,
                is_liked: !tweet.is_liked
              }
            }
            return tweet
          }))
          break
        case 'retweet':
          const retweetResponse = await api.retweet(tweetId)
          if (retweetResponse.error) {
            toast.error(retweetResponse.error)
            return
          }
          // Обновляем состояние твита
          setTweets(prev => prev.map(tweet => {
            if (tweet.id === tweetId) {
              return {
                ...tweet,
                retweets_count: tweet.is_retweeted ? tweet.retweets_count - 1 : tweet.retweets_count + 1,
                is_retweeted: !tweet.is_retweeted
              }
            }
            return tweet
          }))
          break
        case 'bookmark':
          const bookmarkResponse = await api.bookmarkTweet(tweetId)
          if (bookmarkResponse.error) {
            toast.error(bookmarkResponse.error)
            return
          }
          // Обновляем состояние твита
          setTweets(prev => prev.map(tweet => {
            if (tweet.id === tweetId) {
              return {
                ...tweet,
                is_bookmarked: !tweet.is_bookmarked
              }
            }
            return tweet
          }))
          toast.success('Added to bookmarks')
          break
        default:
          break
      }
    } catch (error) {
      toast.error('Action failed')
    }
  }



  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  }

  const headerVariants = {
    initial: { opacity: 0, y: -20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  }

  const tweetListVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.05
      }
    }
  }

  return (
    <motion.div 
      className="max-w-2xl mx-auto space-y-6"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <motion.div 
        className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-2"
        variants={headerVariants}
      >
        <div className="flex items-center justify-between mb-4">
          <motion.h1 
            className="text-2xl font-bold"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            Home
          </motion.h1>
          <motion.div
            whileHover={{ rotate: 180, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <AppleButton variant="ghost" size="sm">
              <RefreshCw className="w-4 h-4" />
            </AppleButton>
          </motion.div>
        </div>
        
        <motion.div 
          className="flex gap-4 mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Select value={scope} onValueChange={(value: any) => setScope(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="following">Following</SelectItem>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="me">My tweets</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tweets</SelectItem>
                <SelectItem value="original">Original</SelectItem>
                <SelectItem value="retweet">Retweets</SelectItem>
                <SelectItem value="quote">Quotes</SelectItem>
                <SelectItem value="with_media">With media</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <ComposerBar 
            onSubmit={handlePost} 
            loading={posting}
            placeholder="What's happening?"
          />
        </motion.div>
      </motion.div>

      <motion.div 
        className="space-y-4"
        variants={tweetListVariants}
      >
        <AnimatePresence>
          {tweets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <Empty
                icon={<MessageSquare className="w-12 h-12" />}
                title="No tweets yet"
                description="Be the first to share what's happening!"
              />
            </motion.div>
          ) : (
            tweets.map((tweet, index) => {
              // Адаптер для преобразования API данных в формат TweetCard
              const adaptedTweet = {
                id: tweet.id.toString(),
                content: tweet.content,
                author: {
                  id: tweet.user,
                  username: tweet.user,
                  name: tweet.user,
                  avatar: undefined
                },
                createdAt: tweet.created_at,
                stats: {
                  likes: tweet.likes_count || 0,
                  comments: tweet.comments_count || 0,
                  retweets: tweet.retweets_count || 0,
                  quotes: tweet.quotes_count || 0
                },
                interactions: {
                  isLiked: tweet.is_liked || false,
                  isRetweeted: tweet.is_retweeted || false,
                  isQuoted: tweet.is_quoted || false,
                  isBookmarked: tweet.is_bookmarked || false
                },
                media: tweet.media_url ? [{
                  type: 'image' as const,
                  url: tweet.media_url,
                  alt: 'Tweet media'
                }] : undefined,
                images: tweet.media_url ? [tweet.media_url] : undefined
              }
              


              return (
                <motion.div
                  key={tweet.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: index * 0.05,
                    ease: "easeOut" 
                  }}
                >
                  <TweetCard
                    tweet={adaptedTweet}
                    isOwn={tweet.user === user.username || tweet.user === user.id.toString()}
                    onLike={() => handleTweetAction(tweet.id, 'like')}
                    onRetweet={() => handleTweetAction(tweet.id, 'retweet')}
                    onComment={() => onTweetClick?.(tweet.id.toString())}
                    onBookmark={() => handleTweetAction(tweet.id, 'bookmark')}
                    onDelete={() => handleDeleteTweet(tweet.id)}
                    onEdit={() => handleEditTweet(tweet.id, adaptedTweet.content)}
                    onShare={() => console.log('Share tweet', tweet.id)}
                    onTweetClick={onTweetClick}
                    onProfileClick={onProfileClick}
                    index={index}
                  />

                </motion.div>
              )
            })
          )}
        </AnimatePresence>
        
        <motion.div 
          className="flex justify-center pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <AppleButton
              variant="ghost"
              onClick={handleLoadMore}
              loading={loading}
              className="w-full max-w-xs"
            >
              Load more tweets
            </AppleButton>
          </motion.div>
        </motion.div>
      </motion.div>



      {/* Edit Tweet Modal */}
      {editingTweet && (
        <EditTweetModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingTweet(null)
          }}
          tweet={editingTweet}
          onSave={handleSaveEdit}
        />
      )}
    </motion.div>
  )
}