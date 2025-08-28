import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'
import { RoyLogo } from '../atoms/RoyLogo'
import { AppleButton } from '../atoms/AppleButton'
import { Spinner } from '../atoms/Spinner'
import { ThemeToggle } from '../atoms/ThemeToggle'

interface LoginScreenProps {
  onLogin: (username: string, password: string) => void
  onSwitchToRegister: () => void
  loading: boolean
}

export function LoginScreen({ onLogin, onSwitchToRegister, loading }: LoginScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username && password) {
      onLogin(username, password)
    }
  }

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    initial: { opacity: 0, y: 30 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  }

  const floatingElements = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2
  }))

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      {floatingElements.map((element) => (
        <motion.div
          key={element.id}
          className="absolute bg-primary/5 rounded-full blur-sm"
          style={{
            width: element.size + 'rem',
            height: element.size + 'rem',
            left: element.x + '%',
            top: element.y + '%'
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 4 + element.delay,
            repeat: Infinity,
            ease: "easeInOut",
            delay: element.delay
          }}
        />
      ))}

      {/* Theme toggle */}
      <motion.div
        className="absolute top-6 right-6 z-10"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.3 }}
      >
        <ThemeToggle />
      </motion.div>

      <motion.div
        className="max-w-md w-full relative z-10"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          variants={itemVariants}
        >
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            <RoyLogo size="lg" className="mx-auto mb-6" />
          </motion.div>
          
          <motion.h1 
            className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent"
            animate={{
              backgroundPosition: ["0%", "100%", "0%"]
            }}
            transition={{
              duration: 3,
              ease: "linear",
              repeat: Infinity
            }}
          >
            Welcome back to Roy
          </motion.h1>
          
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Sign in to continue to your account
          </motion.p>
        </motion.div>

        {/* Login Form */}
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-4"
          variants={itemVariants}
        >
          {/* Username/Email Field */}
          <motion.div 
            className="space-y-2"
            whileTap={{ scale: 0.98 }}
          >
            <label className="block font-medium text-sm text-muted-foreground">
              Username
            </label>
            <motion.div 
              className={`relative bg-input-background rounded-xl border-2 transition-all duration-200 ${
                focusedField === 'username' 
                  ? 'border-primary shadow-lg shadow-primary/10' 
                  : 'border-transparent hover:border-border'
              }`}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-12 pr-4 py-4 bg-transparent border-none outline-none"
                placeholder="Enter your username"
                required
              />
            </motion.div>
          </motion.div>

          {/* Password Field */}
          <motion.div 
            className="space-y-2"
            whileTap={{ scale: 0.98 }}
          >
            <label className="block font-medium text-sm text-muted-foreground">
              Password
            </label>
            <motion.div 
              className={`relative bg-input-background rounded-xl border-2 transition-all duration-200 ${
                focusedField === 'password' 
                  ? 'border-primary shadow-lg shadow-primary/10' 
                  : 'border-transparent hover:border-border'
              }`}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="w-full pl-12 pr-12 py-4 bg-transparent border-none outline-none"
                placeholder="Enter your password"
                required
              />
              <motion.button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <AnimatePresence mode="wait">
                  {showPassword ? (
                    <motion.div
                      key="hide"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <EyeOff className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="show"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Eye className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Forgot Password Link */}
          <motion.div 
            className="text-right"
            variants={itemVariants}
          >
            <motion.button
              type="button"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
              whileHover={{ x: 2 }}
              transition={{ duration: 0.2 }}
            >
              Forgot your password?
            </motion.button>
          </motion.div>

          {/* Login Button */}
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <AppleButton 
              type="submit" 
              loading={loading}
              disabled={!username || !password || loading}
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl py-4"
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Spinner size="sm" />
                    <span>Signing in...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <span>Sign In</span>
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </AppleButton>
          </motion.div>
        </motion.form>

        {/* Divider */}
        <motion.div 
          className="my-8 flex items-center gap-4"
          variants={itemVariants}
        >
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-xs text-muted-foreground bg-background px-3">OR</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </motion.div>

        {/* Register Link */}
        <motion.div 
          className="text-center"
          variants={itemVariants}
        >
          <p className="text-muted-foreground mb-4">
            Don't have an account?
          </p>
          <motion.button
            onClick={onSwitchToRegister}
            className="text-primary hover:text-primary/80 font-medium transition-colors flex items-center justify-center gap-2 mx-auto group"
            whileHover={{ scale: 1.05, x: 2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            Create a new account
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  )
}