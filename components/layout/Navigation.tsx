import { motion } from 'framer-motion'
import { Home, Search, Bell, Mail, User, Settings, MoreHorizontal, Feather, Bookmark, List } from 'lucide-react'
import { RoyLogo } from '../atoms/RoyLogo'
import { ThemeToggle } from '../atoms/ThemeToggle'

interface NavigationProps {
  currentPath: string
  onNavigate: (path: string) => void
  unreadCount?: number
}

export function Navigation({ currentPath, onNavigate, unreadCount = 0 }: NavigationProps) {
  const navItems = [
    { id: 'feed', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'messages', label: 'Messages', icon: Mail },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'lists', label: 'Lists', icon: List },
    { id: 'profile', label: 'Profile', icon: User },


    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  return (
    <nav className="space-y-2">
      {/* Logo */}
      <motion.div 
        className="mb-8 p-2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <RoyLogo className="w-8 h-8 mx-auto" />
      </motion.div>

      {/* Navigation Items */}
      <div className="space-y-1">
        {navItems.map((item, index) => (
          <motion.button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${
              currentPath === item.id
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Active indicator */}
            {currentPath === item.id && (
              <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full"
                layoutId="activeNav"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              />
            )}
            
            {/* Background gradient on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
              initial={false}
            />

            <div className="relative">
              <item.icon 
                className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                  currentPath === item.id ? 'text-primary' : ''
                }`} 
              />
              
              {item.badge && item.badge > 0 && (
                <motion.span
                  className="absolute -top-2 -right-2 w-4 h-4 bg-danger text-white text-xs rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </motion.span>
              )}
            </div>
            
            <span className="relative font-medium group-hover:translate-x-1 transition-transform">
              {item.label}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Tweet/Post Button */}
      <motion.button
        className="w-full mt-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <Feather className="w-4 h-4" />
        Post
      </motion.button>

      {/* Bottom Section */}
      <div className="mt-auto pt-4 space-y-2">
        {/* Theme Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          <ThemeToggle />
        </motion.div>

        {/* More Options */}
        <motion.button
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all group"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.3 }}
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <MoreHorizontal className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          <span className="font-medium">More</span>
        </motion.button>
      </div>
    </nav>
  )
}