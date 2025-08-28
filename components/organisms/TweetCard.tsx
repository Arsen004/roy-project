import { motion } from 'framer-motion'
import { Heart, MessageCircle, Share, MoreHorizontal } from 'lucide-react'
import { TweetMeta } from '../molecules/TweetMeta'
import { TweetActions } from '../molecules/TweetActions'
import { ImageWithFallback } from '../figma/ImageWithFallback'

interface TweetCardProps {
  tweet: {
    id: string
    content: string
    author?: {
      id: string
      name: string
      username: string
      avatar?: string
    }
    user?: {
      name: string
      username: string
      avatar?: string
    }
    createdAt?: string
    timestamp?: string
    stats?: {
      likes: number
      comments: number
      retweets: number
      quotes: number
    }
    likes?: number
    replies?: number
    retweets?: number
    interactions?: {
      isLiked: boolean
      isRetweeted: boolean
      isQuoted: boolean
    }
    liked?: boolean
    retweeted?: boolean
    media?: Array<{
      type: 'image' | 'video'
      url: string
      alt?: string
    }>
    images?: string[]
  }
  isOwn?: boolean
  onTweetClick?: (id: string) => void
  onProfileClick?: (userId?: string) => void
  onLike?: (id: string) => void
  onRetweet?: (id: string) => void
  onComment?: (id: string) => void
  onBookmark?: (id: string) => void
  onShare?: (id: string) => void
  onDelete?: (id: string) => void
  onEdit?: (id: string, content: string) => void
  index?: number
}

export function TweetCard({ 
  tweet, 
  isOwn = false,
  onTweetClick, 
  onProfileClick, 
  onLike, 
  onRetweet,
  onComment,
  onBookmark,
  onShare,
  onDelete,
  onEdit,
  index = 0 
}: TweetCardProps) {
  // Safely extract user data from either author or user
  const userInfo = tweet.author || tweet.user
  if (!userInfo) {
    console.warn('TweetCard: No user or author data provided', tweet)
    return null
  }

  // Safely extract stats
  const likes = tweet.stats?.likes ?? tweet.likes ?? 0
  const replies = tweet.stats?.comments ?? tweet.replies ?? 0
  const retweets = tweet.stats?.retweets ?? tweet.retweets ?? 0
  const liked = tweet.interactions?.isLiked ?? tweet.liked ?? false
  const retweeted = tweet.interactions?.isRetweeted ?? tweet.retweeted ?? false
  const bookmarked = tweet.interactions?.isBookmarked ?? tweet.bookmarked ?? false
  const timestamp = tweet.createdAt ?? tweet.timestamp ?? new Date().toISOString()

  // Handle media/images
  const images = tweet.media?.map(m => m.url) ?? tweet.images ?? []

  const cardVariants = {
    initial: { 
      opacity: 0, 
      y: 50,
      scale: 0.95
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        delay: index * 0.1
      }
    },
    hover: {
      y: -4,
      scale: 1.01,
      transition: { 
        duration: 0.2,
        ease: "easeOut"
      }
    }
  }

  const imageVariants = {
    initial: { opacity: 0, scale: 1.1 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    hover: {
      scale: 1.05,
      transition: { duration: 0.3 }
    }
  }

  return (
    <motion.article
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      className="bg-gradient-to-r from-card to-card/80 border rounded-xl p-6 cursor-pointer hover:border-border/60 transition-all shadow-sm hover:shadow-lg backdrop-blur-sm group"
      onClick={() => onTweetClick?.(tweet.id)}
    >
      {/* Subtle animated gradient overlay */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/1 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        initial={false}
      />

      <div className="relative space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <motion.div 
            className="flex items-start gap-3 flex-1"
            whileHover={{ x: 2 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                onProfileClick?.(userInfo.id || userInfo.username)
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
            >
              {userInfo.avatar ? (
                <ImageWithFallback
                  src={userInfo.avatar}
                  alt={userInfo.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-border/20 group-hover:ring-primary/20 transition-all"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full flex items-center justify-center text-primary font-medium ring-2 ring-border/20 group-hover:ring-primary/20 transition-all">
                  {userInfo.name?.[0] || '?'}
                </div>
              )}
            </motion.button>

            <div className="flex-1">
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.2 }}
              >
                <TweetMeta
                  user={userInfo}
                  timestamp={timestamp}
                  isOwn={isOwn}
                  onProfileClick={onProfileClick}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Content */}
        <motion.div 
          className="pl-15 space-y-3"
          initial={{ opacity: 0.8 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.p 
            className="text-foreground leading-relaxed"
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {tweet.content}
          </motion.p>

          {/* Images */}
          {images && images.length > 0 && (
            <motion.div 
              className="grid gap-2 rounded-lg overflow-hidden"
              variants={imageVariants}
              whileHover="hover"
            >
              {images.length === 1 && (
                <motion.div
                  variants={imageVariants}
                  className="overflow-hidden rounded-xl"
                >
                  <ImageWithFallback
                    src={images[0]}
                    alt="Tweet image"
                    className="w-full max-h-96 object-cover"
                  />
                </motion.div>
              )}
              
              {images.length === 2 && (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((image, i) => (
                    <motion.div
                      key={i}
                      variants={imageVariants}
                      className="overflow-hidden rounded-lg"
                    >
                      <ImageWithFallback
                        src={image}
                        alt={`Tweet image ${i + 1}`}
                        className="w-full h-48 object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {images.length > 2 && (
                <div className="grid grid-cols-2 gap-2">
                  {images.slice(0, 4).map((image, i) => (
                    <motion.div
                      key={i}
                      variants={imageVariants}
                      className="overflow-hidden rounded-lg relative"
                    >
                      <ImageWithFallback
                        src={image}
                        alt={`Tweet image ${i + 1}`}
                        className="w-full h-32 object-cover"
                      />
                      {i === 3 && images.length > 4 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            +{images.length - 4}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div 
          className="pl-15 pt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <TweetActions
            likes={likes}
            replies={replies}
            retweets={retweets}
            liked={liked}
            retweeted={retweeted}
            bookmarked={bookmarked}
            isOwn={isOwn}
            onLike={() => onLike?.(tweet.id)}
            onRetweet={() => onRetweet?.(tweet.id)}
            onReply={() => onComment?.(tweet.id)}
            onBookmark={() => onBookmark?.(tweet.id)}
            onShare={() => onShare?.(tweet.id)}
            onDelete={() => onDelete?.(tweet.id)}
            onEdit={() => onEdit?.(tweet.id, tweet.content)}
          />
        </motion.div>
      </div>
    </motion.article>
  )
}