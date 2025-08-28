import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '../ui/button'
import { motion, AnimatePresence } from 'framer-motion'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const iconVariants = {
    initial: { 
      scale: 0, 
      rotate: -180,
      opacity: 0 
    },
    animate: { 
      scale: 1, 
      rotate: 0,
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    },
    exit: { 
      scale: 0, 
      rotate: 180,
      opacity: 0,
      transition: {
        duration: 0.3,
        ease: "easeIn"
      }
    }
  }

  const buttonVariants = {
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

  return (
    <motion.div
      variants={buttonVariants}
      whileHover="hover"
      whileTap="tap"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className="h-9 w-9 p-0 relative overflow-hidden"
      >
        {/* Background glow effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
        
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="sun"
              variants={iconVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative z-10"
            >
              <Sun className="h-4 w-4" />
              
              {/* Sun rays */}
              <motion.div
                className="absolute inset-0"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-0.5 h-1 bg-yellow-400 rounded-full"
                    style={{
                      top: '-2px',
                      left: '50%',
                      marginLeft: '-1px',
                      transformOrigin: '1px 10px',
                      transform: `rotate(${i * 45}deg)`
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.125
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              variants={iconVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative z-10"
            >
              <Moon className="h-4 w-4" />
              
              {/* Sparkle stars */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-0.5 h-0.5 bg-blue-300 rounded-full"
                  style={{
                    top: i === 0 ? '-1px' : i === 1 ? '2px' : '4px',
                    left: i === 0 ? '6px' : i === 1 ? '-2px' : '4px'
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.3
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        <span className="sr-only">Toggle theme</span>
      </Button>
    </motion.div>
  )
}