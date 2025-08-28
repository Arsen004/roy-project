import { motion } from 'framer-motion'
import { Heart, MessageCircle, Repeat, Share, Bookmark, Trash2, Edit } from 'lucide-react'

interface TweetActionsProps {
  likes: number
  replies: number
  retweets: number
  liked?: boolean
  retweeted?: boolean
  bookmarked?: boolean
  isOwn?: boolean
  onLike?: () => void
  onReply?: () => void
  onRetweet?: () => void
  onShare?: () => void
  onBookmark?: () => void
  onDelete?: () => void
  onEdit?: () => void
}

export function TweetActions({
  likes,
  replies,
  retweets,
  liked = false,
  retweeted = false,
  bookmarked = false,
  isOwn = false,
  onLike,
  onReply,
  onRetweet,
  onShare,
  onBookmark,
  onDelete,
  onEdit
}: TweetActionsProps) {
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.05,
      y: -2,
      transition: { 
        duration: 0.1,
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    },
    tap: { 
      scale: 0.95,
      transition: { duration: 0.05 }
    }
  }

  const heartVariants = {
    liked: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    }
  }

  const retweetVariants = {
    retweeted: {
      rotate: [0, 360],
      transition: {
        duration: 0.5,
        ease: "easeInOut"
      }
    }
  }

  return (
    <div className="flex items-center justify-between max-w-md">
      {/* Reply */}
      <motion.button
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        className="flex items-center gap-2 px-3 py-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors group"
        onClick={(e) => {
          e.stopPropagation()
          onReply?.()
        }}
      >
        <motion.div
          whileHover={{ rotate: -15 }}
          transition={{ duration: 0.2 }}
        >
          <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </motion.div>
        <motion.span 
          className="text-sm tabular-nums"
          initial={{ opacity: 0.7 }}
          whileHover={{ opacity: 1 }}
        >
          {formatCount(replies)}
        </motion.span>
      </motion.button>

      {/* Retweet */}
      <motion.button
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors group ${
          retweeted
            ? 'text-success bg-success/10'
            : 'text-muted-foreground hover:text-success hover:bg-success/5'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onRetweet?.()
        }}
      >
        <motion.div
          variants={retweetVariants}
          animate={retweeted ? "retweeted" : "initial"}
        >
          <Repeat className={`w-4 h-4 group-hover:scale-110 transition-transform ${
            retweeted ? 'fill-current' : ''
          }`} />
        </motion.div>
        <motion.span 
          className="text-sm tabular-nums"
          initial={{ opacity: 0.7 }}
          whileHover={{ opacity: 1 }}
        >
          {formatCount(retweets)}
        </motion.span>
      </motion.button>

      {/* Like */}
      <motion.button
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors group relative overflow-hidden ${
          liked
            ? 'text-danger bg-danger/10'
            : 'text-muted-foreground hover:text-danger hover:bg-danger/5'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onLike?.()
        }}
      >
        {/* Heart burst animation */}
        {liked && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.6 }}
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-danger rounded-full"
                style={{
                  left: '50%',
                  top: '50%'
                }}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  x: [0, (Math.cos(i * 60 * Math.PI / 180) * 20)],
                  y: [0, (Math.sin(i * 60 * Math.PI / 180) * 20)]
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.1,
                  ease: "easeOut"
                }}
              />
            ))}
          </motion.div>
        )}

        <motion.div
          variants={heartVariants}
          animate={liked ? "liked" : "initial"}
        >
          <Heart className={`w-4 h-4 group-hover:scale-110 transition-transform ${
            liked ? 'fill-current text-danger' : ''
          }`} />
        </motion.div>
        <motion.span 
          className="text-sm tabular-nums"
          initial={{ opacity: 0.7 }}
          whileHover={{ opacity: 1 }}
          animate={liked ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.2 }}
        >
          {formatCount(likes)}
        </motion.span>
      </motion.button>

      {/* Share */}
      <motion.button
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        className="flex items-center gap-2 px-3 py-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors group"
        onClick={(e) => {
          e.stopPropagation()
          onShare?.()
        }}
      >
        <motion.div
          whileHover={{ rotate: 15, scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          <Share className="w-4 h-4" />
        </motion.div>
      </motion.button>

      {/* Bookmark */}
      <motion.button
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        className={`p-2 rounded-full transition-colors group ${
          bookmarked
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onBookmark?.()
        }}
      >
        <motion.div
          animate={bookmarked ? { y: [0, -3, 0] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Bookmark className={`w-4 h-4 group-hover:scale-110 transition-transform ${
            bookmarked ? 'fill-current' : ''
          }`} />
        </motion.div>
      </motion.button>

      {/* Edit - только для своих твитов */}
      {isOwn && (
        <motion.button
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors group"
          onClick={(e) => {
            e.stopPropagation()
            onEdit?.()
          }}
        >
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </motion.div>
        </motion.button>
      )}
      


      {/* Delete - только для своих твитов */}
      {isOwn && (
        <motion.button
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          className="p-2 rounded-full text-muted-foreground hover:text-danger hover:bg-danger/5 transition-colors group"
          onClick={(e) => {
            e.stopPropagation()
            onDelete?.()
          }}
        >
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </motion.div>
        </motion.button>
      )}
    </div>
  )
}