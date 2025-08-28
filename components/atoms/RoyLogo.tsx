import { motion } from 'framer-motion'

interface RoyLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export function RoyLogo({ className = '', size = 'md', animated = true }: RoyLogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  const logoVariants = {
    initial: { scale: 0.8, opacity: 0, rotate: -10 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      rotate: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    hover: {
      scale: 1.05,
      rotate: 5,
      transition: { duration: 0.2 }
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  }

  const gradientVariants = {
    initial: { rotate: 0 },
    animate: { 
      rotate: 360,
      transition: {
        duration: 8,
        ease: "linear",
        repeat: Infinity
      }
    }
  }

  if (!animated) {
    return (
      <div className={`${sizeClasses[size]} ${className} relative`}>
        <div className="w-full h-full rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-sm">R</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className={`${sizeClasses[size]} ${className} relative cursor-pointer`}
      variants={logoVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg"
        variants={gradientVariants}
        animate={animated ? "animate" : "initial"}
      />
      
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/40 to-primary/20 blur-md"
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity
        }}
      />
      
      {/* Letter R */}
      <motion.div 
        className="relative z-10 w-full h-full flex items-center justify-center"
        animate={{
          y: [0, -1, 0]
        }}
        transition={{
          duration: 1.5,
          ease: "easeInOut",
          repeat: Infinity
        }}
      >
        <span className="text-white font-bold text-sm drop-shadow-sm">R</span>
      </motion.div>

      {/* Sparkle effects */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/70 rounded-full"
          style={{
            top: `${20 + i * 20}%`,
            left: `${80 - i * 10}%`
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.5,
            repeat: Infinity,
            repeatDelay: 2
          }}
        />
      ))}
    </motion.div>
  )
}