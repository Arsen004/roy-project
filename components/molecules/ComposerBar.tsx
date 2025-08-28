import { useState, useRef } from 'react'
import { Textarea } from '../ui/textarea'
import { AppleButton } from '../atoms/AppleButton'
import { Image, Smile, MapPin, Calendar, X } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../ui/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../src/api'
import { toast } from 'sonner'

interface ComposerBarProps {
  placeholder?: string
  maxLength?: number
  onSubmit?: (content: string, mediaUrl?: string) => void
  loading?: boolean
  className?: string
}

export function ComposerBar({ 
  placeholder = "What's happening?",
  maxLength = 280,
  onSubmit,
  loading = false,
  className 
}: ComposerBarProps) {
  const [content, setContent] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string>()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    if ((content.trim() || mediaUrl) && onSubmit) {
      onSubmit(content.trim(), mediaUrl)
      setContent('')
      setMediaUrl(undefined)
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    console.log('Uploading file:', file.name, file.type, file.size)
    console.log('Current token:', api['token']) // Проверяем токен
    
    try {
      const response = await api.uploadMedia(file)
      console.log('Upload response:', response)
      
      if (response.error) {
        console.error('Upload error:', response.error)
        toast.error(response.error)
        return
      }
      
      if (response.data) {
        console.log('Upload success, URL:', response.data.url)
        setMediaUrl(response.data.url)
        toast.success('Media uploaded successfully!')
      }
    } catch (error) {
      console.error('Upload exception:', error)
      toast.error('Failed to upload media')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    console.log('File selected:', file?.name, file?.type, file?.size) // Временный лог
    if (file) {
      // Проверяем тип файла
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, GIF, WebP)')
        return
      }
      
      // Проверяем размер файла (8MB)
      if (file.size > 8 * 1024 * 1024) {
        toast.error('File size must be less than 8MB')
        return
      }
      
      handleFileUpload(file)
    }
  }

  const remainingChars = maxLength - content.length
  const isOverLimit = remainingChars < 0
  const isNearLimit = remainingChars <= 20 && remainingChars >= 0

  const containerVariants = {
    collapsed: {
      height: 'auto',
      transition: { duration: 0.3, ease: "easeInOut" }
    },
    expanded: {
      height: 'auto',
      transition: { duration: 0.3, ease: "easeInOut" }
    }
  }

  const actionButtonVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 10
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  }

  const characterCountVariants = {
    safe: { 
      color: 'hsl(var(--muted-foreground))',
      scale: 1 
    },
    warning: { 
      color: '#f97316',
      scale: 1.05,
      transition: { duration: 0.2 }
    },
    danger: { 
      color: 'hsl(var(--destructive))',
      scale: 1.1,
      transition: { duration: 0.2 }
    }
  }

  return (
    <motion.div 
      className={cn('border rounded-xl p-4 bg-gradient-to-r from-card to-card/80 backdrop-blur-sm', className)}
      variants={containerVariants}
      animate={isFocused || content ? 'expanded' : 'collapsed'}
      whileHover={{ 
        borderColor: 'rgba(59, 130, 246, 0.3)',
        transition: { duration: 0.2 }
      }}
    >
      <div className="space-y-3">
        <motion.div
          animate={isFocused ? { 
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '8px',
            padding: '8px'
          } : {
            backgroundColor: 'rgba(0, 0, 0, 0)',
            padding: '0px'
          }}
          transition={{ duration: 0.2 }}
        >
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="min-h-[80px] resize-none border-0 p-0 bg-transparent focus-visible:ring-0 text-base placeholder:text-muted-foreground/60"
            maxLength={maxLength + 50}
          />
          
          {/* Media Preview */}
          {mediaUrl && (
            <motion.div 
              className="mt-3 relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="relative inline-block">
                <img 
                  src={mediaUrl} 
                  alt="Uploaded media" 
                  className="max-w-full max-h-48 rounded-lg object-cover"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 bg-black/50 text-white hover:bg-black/70"
                  onClick={() => setMediaUrl(undefined)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
        
        {/* File input - всегда доступен */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {/* Кнопка Add image - всегда доступна */}
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
            title="Add image"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.1 }}
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Image className="w-4 h-4" />
              )}
            </motion.div>
          </Button>
        </div>
        
        <AnimatePresence>
          {(isFocused || content) && (
            <motion.div 
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-1">
                {[
                  { icon: Smile, label: 'Add emoji', onClick: () => {} },
                  { icon: MapPin, label: 'Add location', onClick: () => {} },
                  { icon: Calendar, label: 'Schedule', onClick: () => {} }
                ].map(({ icon: Icon, label, onClick, disabled }, index) => (
                  <motion.div
                    key={label}
                    variants={actionButtonVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.05 }}
                  >
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                      title={label}
                      onClick={onClick}
                      disabled={disabled}
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: 0.1 }}
                      >
                        <Icon className="w-4 h-4" />
                      </motion.div>
                    </Button>
                  </motion.div>
                ))}
              </div>
              
              <motion.div 
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {(isNearLimit || isOverLimit) && (
                      <motion.span 
                        className={cn(
                          'text-xs font-medium tabular-nums',
                          isOverLimit ? 'text-destructive' : isNearLimit ? 'text-orange-500' : 'text-muted-foreground'
                        )}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        {remainingChars}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  
                  <motion.div 
                    className="w-5 h-5"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 20 20">
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-muted/20"
                      />
                      <motion.circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className={cn(
                          isOverLimit ? 'stroke-destructive' : isNearLimit ? 'stroke-orange-500' : 'stroke-primary'
                        )}
                        strokeDasharray={`${Math.min(100, (content.length / maxLength) * 100) * 0.5} 50`}
                        initial={{ strokeDasharray: '0 50' }}
                        animate={{ 
                          strokeDasharray: `${Math.min(100, (content.length / maxLength) * 100) * 0.5} 50`
                        }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </svg>
                  </motion.div>
                </div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <AppleButton
                    onClick={handleSubmit}
                    disabled={(!content.trim() && !mediaUrl) || isOverLimit}
                    loading={loading}
                    size="sm"
                  >
                    Post
                  </AppleButton>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}