import { useState, useEffect } from 'react'
import { TweetCard } from '../organisms/TweetCard'
import { Empty } from '../atoms/Empty'
import { Bookmark, Loader2 } from 'lucide-react'
import { api } from '../../src/api'
import { toast } from 'sonner'

interface BookmarksScreenProps {
  user: any
  onTweetClick?: (tweetId: string) => void
  onProfileClick?: (userId?: string) => void
}

export function BookmarksScreen({ user, onTweetClick, onProfileClick }: BookmarksScreenProps) {
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  // Загружаем закладки
  useEffect(() => {
    loadBookmarks()
  }, [])

  const loadBookmarks = async (cursor?: string) => {
    if (cursor) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await api.getBookmarks(20, cursor)
      if (response.error) {
        toast.error(response.error)
        return
      }
      
      if (response.data) {
        if (cursor) {
          setBookmarks(prev => [...prev, ...response.data.items])
        } else {
          setBookmarks(response.data.items)
        }
        setNextCursor(response.data.nextCursor || null)
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error)
      toast.error('Failed to load bookmarks')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = async () => {
    if (nextCursor) {
      await loadBookmarks(nextCursor)
    }
  }

  const handleBookmarkToggle = async (tweetId: number) => {
    try {
      // Находим твит в закладках
      const bookmarkedTweet = bookmarks.find(tweet => tweet.id === tweetId)
      
      if (bookmarkedTweet) {
        // Удаляем из закладок
        const response = await api.unbookmarkTweet(tweetId)
        if (response.error) {
          toast.error(response.error)
          return
        }
        
        setBookmarks(prev => prev.filter(tweet => tweet.id !== tweetId))
        toast.success('Removed from bookmarks')
      } else {
        // Добавляем в закладки
        const response = await api.bookmarkTweet(tweetId)
        if (response.error) {
          toast.error(response.error)
          return
        }
        
        toast.success('Added to bookmarks')
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error)
      toast.error('Failed to update bookmark')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bookmark className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bookmarks</h1>
            <p className="text-muted-foreground">Your saved tweets</p>
          </div>
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="space-y-4">
        {bookmarks.length === 0 ? (
          <Empty
            icon={<Bookmark className="w-12 h-12" />}
            title="No bookmarks yet"
            description="When you bookmark tweets, they'll show up here"
          />
        ) : (
          <>
            {bookmarks.map((tweet) => (
                             <TweetCard
                 key={tweet.id}
                 tweet={tweet}
                 user={user}
                 onTweetClick={onTweetClick}
                 onProfileClick={onProfileClick}
                 onBookmark={() => handleBookmarkToggle(tweet.id)}
               />
            ))}
            
            {/* Load More Button */}
            {nextCursor && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-muted hover:bg-muted/80 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    'Load more'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
