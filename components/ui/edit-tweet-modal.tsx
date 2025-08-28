import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image as ImageIcon, Upload } from 'lucide-react'
import { AppleButton } from '../atoms/AppleButton'
import { api } from '../../src/api'
import { toast } from 'sonner'

interface EditTweetModalProps {
  isOpen: boolean
  onClose: () => void
  tweet: {
    id: string
    content: string
    media_url?: string
  }
  onSave: (tweetId: string, content: string, mediaUrl?: string) => void
}

export function EditTweetModal({ isOpen, onClose, tweet, onSave }: EditTweetModalProps) {
  const [content, setContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && tweet) {
      setContent(tweet.content)
      setMediaUrl(tweet.media_url)
    }
  }, [isOpen, tweet])

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      console.log('Uploading file:', file.name, file.size)
      const response = await api.uploadMedia(file)
      console.log('Upload response:', response)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      // Получаем полный URL для медиа файла
      const mediaUrl = response.data.url
      console.log('Setting media URL:', mediaUrl)
      setMediaUrl(mediaUrl)
      toast.success('Media uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload media')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Tweet content cannot be empty')
      return
    }

    setSaving(true)
    try {
      console.log('Saving tweet with:', { id: tweet.id, content, mediaUrl })
      onSave(tweet.id, content, mediaUrl)
      onClose()
      toast.success('Tweet updated successfully')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to update tweet')
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const removeMedia = () => {
    setMediaUrl(undefined)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-card border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Edit Tweet</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Text Input */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's happening?"
                className="w-full min-h-[120px] p-4 border rounded-lg resize-none bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={280}
              />
              
              {/* Character count */}
              <div className="text-sm text-muted-foreground text-right">
                {content.length}/280
              </div>

              {/* Media Preview */}
              {mediaUrl && (
                <div className="relative">
                  <img
                    src={mediaUrl}
                    alt="Tweet media"
                    className="w-full max-h-64 object-cover rounded-lg"
                  />
                  <button
                    onClick={removeMedia}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Media Upload */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <ImageIcon className="w-4 h-4" />
                  <span>Add media</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <AppleButton
                variant="ghost"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </AppleButton>
              
              <AppleButton
                onClick={handleSave}
                disabled={saving || !content.trim()}
                loading={saving}
              >
                Save Changes
              </AppleButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
