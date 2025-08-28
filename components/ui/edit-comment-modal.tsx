import React, { useState } from 'react'
import { Button } from './button'
import { Textarea } from './textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { toast } from 'sonner'

interface EditCommentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (content: string) => void
  initialContent: string
  commentId: number
}

export function EditCommentModal({
  isOpen,
  onClose,
  onSave,
  initialContent,
  commentId
}: EditCommentModalProps) {
  const [content, setContent] = useState(initialContent)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Comment cannot be empty')
      return
    }

    setIsLoading(true)
    try {
      await onSave(content)
      onClose()
      toast.success('Comment updated successfully')
    } catch (error) {
      toast.error('Failed to update comment')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setContent(initialContent)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Comment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Textarea
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={280}
            />
            <div className="text-sm text-muted-foreground text-right">
              {content.length}/280
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !content.trim()}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


