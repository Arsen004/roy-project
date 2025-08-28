import { useState, useEffect } from 'react'

import { AppleButton } from '../atoms/AppleButton'
import { TweetCard } from '../organisms/TweetCard'
import { ComposerBar } from '../molecules/ComposerBar'
import { CommentsList } from '../molecules/CommentsList'
import { ImageWithFallback } from '../figma/ImageWithFallback'
import { ArrowLeft, MessageCircle, Repeat2, Heart, Share, MoreHorizontal } from 'lucide-react'
import { api, Tweet as ApiTweet, Comment } from '../../src/api'
import { toast } from 'sonner'

interface User {
  id: number
  username: string
  avatar_url?: string
  bio?: string
}

interface ThreadScreenProps {
  user: User
  tweetId: string
  onBack: () => void
}

export function ThreadScreen({ user, tweetId, onBack }: ThreadScreenProps) {
  const [mainTweet, setMainTweet] = useState<ApiTweet | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  // Загрузка твита и комментариев
  useEffect(() => {
    loadTweetAndComments()
  }, [tweetId])

  const loadTweetAndComments = async () => {
    setLoading(true)
    try {
      // Загружаем основной твит
      const tweetResponse = await api.getTweet(parseInt(tweetId))
      if (tweetResponse.error) {
        toast.error(tweetResponse.error)
        return
      }
      
      if (tweetResponse.data) {
        setMainTweet(tweetResponse.data)
      }

      // Загружаем комментарии
      const commentsResponse = await api.getComments(parseInt(tweetId))
      if (commentsResponse.error) {
        toast.error(commentsResponse.error)
        return
      }
      
      if (commentsResponse.data) {
        setComments(commentsResponse.data.items)
      }
    } catch (error) {
      toast.error('Failed to load tweet and comments')
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async (content: string) => {
    if (!content.trim()) return
    
    setPosting(true)
    try {
      const response = await api.addComment(parseInt(tweetId), content)
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      if (response.data) {
        toast.success('Comment posted!')
        // Обновляем список комментариев
        loadTweetAndComments()
      }
    } catch (error) {
      toast.error('Failed to post comment')
    } finally {
      setPosting(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      const response = await api.deleteComment(parseInt(tweetId), commentId)
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      // Удаляем комментарий из состояния
      setComments(prev => prev.filter(comment => comment.id !== commentId))
      toast.success('Comment deleted successfully')
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast.error('Failed to delete comment')
      throw error
    }
  }

  const handleLikeComment = async (commentId: number, isLiked: boolean) => {
    try {
      const response = isLiked 
        ? await api.unlikeComment(parseInt(tweetId), commentId)
        : await api.likeComment(parseInt(tweetId), commentId)
      
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      // Обновляем состояние комментария с новым счетчиком лайков
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              is_liked: response.data?.liked || false,
              likes_count: response.data?.likesCount || 0
            }
          : comment
      ))
    } catch (error) {
      toast.error('Failed to like/unlike comment')
      throw error
    }
  }

  const handleEditComment = async (commentId: number, content: string) => {
    try {
      const response = await api.updateComment(parseInt(tweetId), commentId, content)
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      // Обновляем комментарий в состоянии
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, content }
          : comment
      ))
    } catch (error) {
      toast.error('Failed to update comment')
      throw error
    }
  }



  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="max-w-4xl mx-auto">


      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <AppleButton variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </AppleButton>
        <h1 className="text-xl font-semibold">Tweet</h1>
      </div>

      {/* Main Tweet */}
      {loading ? (
        <div className="bg-card border rounded-lg p-6 mb-6">
          <div className="animate-pulse">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-muted rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
          </div>
        </div>
      ) : mainTweet ? (
        <div className="bg-card border rounded-lg p-6 mb-6">
          {/* Author Info */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {mainTweet.user.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{mainTweet.user}</h3>
                <span className="text-muted-foreground">@{mainTweet.user}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="text-foreground leading-relaxed whitespace-pre-line">
              {mainTweet.content}
            </p>
            {mainTweet.media_url && (
              <div className="mt-4">
                <img 
                  src={mainTweet.media_url} 
                  alt="Tweet media" 
                  className="rounded-lg max-w-full max-h-96 object-cover"
                />
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-sm text-muted-foreground mb-4 pb-4 border-b border-border">
            {formatDate(mainTweet.created_at)}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mb-4 pb-4 border-b border-border text-sm">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{comments.length}</span>
              <span className="text-muted-foreground">Comments</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border rounded-lg p-6 mb-6">
          <div className="text-center text-muted-foreground">
            <p>Tweet not found</p>
          </div>
        </div>
      )}

      {/* Reply Composer */}
      <div className="bg-card border rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            {user.avatar_url ? (
              <ImageWithFallback
                src={user.avatar_url}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <ComposerBar
              onSubmit={handleReply}
              placeholder={`Reply to this tweet...`}
              loading={posting}
            />
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Comments ({comments.length})</h2>
        <CommentsList
          comments={comments}
          tweetId={parseInt(tweetId)}
          currentUser={user}
          onCommentUpdate={handleEditComment}
          onCommentDelete={handleDeleteComment}
          onCommentLike={handleLikeComment}
          loading={loading}
        />
      </div>
    </div>
  )
}