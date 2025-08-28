import React, { useState } from 'react'
import { TweetCard } from '../organisms/TweetCard'
import { EditCommentModal } from '../ui/edit-comment-modal'
import { Comment } from '../../src/api'
import { toast } from 'sonner'

interface User {
  id: number
  username: string
  avatar_url?: string
  bio?: string
}

interface CommentsListProps {
  comments: Comment[]
  tweetId: number
  currentUser: User
  onCommentUpdate: (commentId: number, content: string) => void
  onCommentDelete: (commentId: number) => void
  onCommentLike: (commentId: number, isLiked: boolean) => void
  loading?: boolean
}

export function CommentsList({
  comments,
  tweetId,
  currentUser,
  onCommentUpdate,
  onCommentDelete,
  onCommentLike,
  loading = false
}: CommentsListProps) {
  const [editingComment, setEditingComment] = useState<Comment | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const openEditModal = (comment: Comment) => {
    setEditingComment(comment)
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setEditingComment(null)
    setIsEditModalOpen(false)
  }

  const handleEditComment = async (commentId: number, content: string) => {
    try {
      await onCommentUpdate(commentId, content)
      closeEditModal()
    } catch (error) {
      // Ошибка уже обработана в родительском компоненте
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return
    }
    
    try {
      await onCommentDelete(commentId)
    } catch (error) {
      // Ошибка уже обработана в родительском компоненте
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading comments...</p>
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No comments yet</p>
        <p className="text-sm">Be the first to comment!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        // Адаптер для комментария
        const adaptedComment = {
          id: comment.id.toString(),
          content: comment.content,
          author: {
            id: comment.user_id.toString(),
            username: comment.username,
            name: comment.username,
            avatar: undefined
          },
          createdAt: comment.created_at,
          stats: {
            likes: comment.likes_count || 0,
            comments: 0,
            retweets: 0,
            quotes: 0
          },
          interactions: {
            isLiked: comment.is_liked || false,
            isRetweeted: false,
            isQuoted: false
          }
        }

        return (
          <TweetCard
            key={comment.id}
            tweet={adaptedComment}
            isOwn={comment.username === currentUser.username}
            onLike={() => onCommentLike(comment.id, comment.is_liked || false)}
            onRetweet={() => console.log('Retweet comment:', comment.id)}
            onComment={() => console.log('Reply to comment:', comment.id)}
            onDelete={() => handleDeleteComment(comment.id)}
            onEdit={() => openEditModal(comment)}
            onShare={() => console.log('Share comment:', comment.id)}
            onTweetClick={() => console.log('Comment click:', comment.id)}
            index={comment.id}
          />
        )
      })}

      {/* Модальное окно редактирования комментария */}
      {editingComment && (
        <EditCommentModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          onSave={(content) => handleEditComment(editingComment.id, content)}
          initialContent={editingComment.content}
          commentId={editingComment.id}
        />
      )}
    </div>
  )
}


