import { cn } from '../ui/utils'
import { Spinner } from './Spinner'
import { forwardRef } from 'react'
import { motion } from 'framer-motion'

interface AppleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
  children: React.ReactNode
}

export const AppleButton = forwardRef<HTMLButtonElement, AppleButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, children, className, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
    
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-sm hover:shadow-md",
      ghost: "text-foreground hover:bg-muted active:bg-muted/80",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 shadow-sm hover:shadow-md"
    }
    
    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm"
    }

    const buttonVariants = {
      initial: { scale: 1 },
      hover: { 
        scale: 1.02,
        y: -1,
        transition: { 
          duration: 0.2,
          type: "spring",
          stiffness: 400,
          damping: 25
        }
      },
      tap: { 
        scale: 0.98,
        y: 0,
        transition: { duration: 0.1 }
      },
      loading: {
        scale: [1, 1.02, 1],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    }

    const iconVariants = {
      loading: {
        rotate: 360,
        transition: {
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }
      }
    }

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        variants={buttonVariants}
        initial="initial"
        whileHover={!disabled && !loading ? "hover" : undefined}
        whileTap={!disabled && !loading ? "tap" : undefined}
        animate={loading ? "loading" : "initial"}
        {...props}
      >
        {loading && (
          <motion.div
            variants={iconVariants}
            animate="loading"
          >
            <Spinner size="sm" />
          </motion.div>
        )}
        
        <motion.span
          animate={loading ? { opacity: 0.7 } : { opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.span>

        {/* Ripple effect on click */}
        {!disabled && !loading && (
          <motion.div
            className="absolute inset-0 rounded-lg"
            initial={{ scale: 0, opacity: 0.5 }}
            whileTap={{ 
              scale: 1.5, 
              opacity: 0,
              transition: { duration: 0.3 }
            }}
            style={{
              background: variant === 'primary' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'
            }}
          />
        )}
      </motion.button>
    )
  }
)

AppleButton.displayName = 'AppleButton'