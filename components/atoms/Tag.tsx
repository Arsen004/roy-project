import { cn } from '../ui/utils'
import { X } from 'lucide-react'

interface TagProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'danger'
  size?: 'sm' | 'md'
  removable?: boolean
  onRemove?: () => void
  className?: string
}

export function Tag({ 
  children, 
  variant = 'default', 
  size = 'md',
  removable = false,
  onRemove,
  className 
}: TagProps) {
  const baseStyles = "inline-flex items-center gap-1 rounded-full border transition-colors"
  
  const variants = {
    default: "bg-muted text-muted-foreground border-border",
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-success/10 text-success border-success/20",
    danger: "bg-destructive/10 text-destructive border-destructive/20"
  }
  
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm"
  }

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)}>
      {children}
      {removable && onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}