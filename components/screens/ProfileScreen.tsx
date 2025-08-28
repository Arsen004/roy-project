import { useState, useEffect } from 'react'

import { AppleButton } from '../atoms/AppleButton'
import { TweetCard } from '../organisms/TweetCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ImageWithFallback } from '../figma/ImageWithFallback'
import { MapPin, Calendar, Link2, MoreHorizontal } from 'lucide-react'
import { api } from '../../src/api'
import { toast } from 'sonner'

interface User {
  id: number
  username: string
  avatar_url?: string
  bio?: string
}

interface ProfileScreenProps {
  user: User
  profileUserId?: string // If viewing another user's profile
}

export function ProfileScreen({ user, profileUserId }: ProfileScreenProps) {
  console.log('🔍 ProfileScreen: Component props:', { user, profileUserId })
  
  const [activeTab, setActiveTab] = useState('posts')
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileUser, setProfileUser] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])

  // Получаем текущего пользователя из JWT токена
  const currentUser = api.getCurrentUser();
  console.log('🔍 ProfileScreen: Current user from API:', currentUser)
  
  // Используем пользователя из пропсов, если API не работает
  const effectiveUser = currentUser || user;
  console.log('🔍 ProfileScreen: Effective user:', effectiveUser)
  
  // Проверяем авторизацию
  if (!effectiveUser) {
    console.log('🔍 ProfileScreen: No effective user, showing login message')
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-card border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Please log in to view profiles</p>
          <p className="text-xs text-muted-foreground mt-2">
            Current user: {currentUser ? 'loaded' : 'null'}, 
            User prop: {user ? 'loaded' : 'null'},
            Effective user: {effectiveUser ? 'loaded' : 'null'}
          </p>
        </div>
      </div>
    )
  }

  const isOwnProfile = !profileUserId || profileUserId === effectiveUser.id.toString()
  
  console.log('🔍 ProfileScreen: Debug info:', {
    profileUserId,
    currentUser: currentUser?.id,
    isOwnProfile,
    shouldUseMyProfile: isOwnProfile
  })
  
  // Если открываем свой профиль, используем /users/me
  const shouldUseMyProfile = isOwnProfile
  const targetUserId = profileUserId ? parseInt(profileUserId) : null
  
  console.log('🔍 ProfileScreen: Target user ID:', targetUserId)

  // Загрузка данных профиля
  useEffect(() => {
    const loadProfileData = async () => {
      console.log('🔍 ProfileScreen: Starting to load profile data...')
      console.log('🔍 ProfileScreen: shouldUseMyProfile:', shouldUseMyProfile)
      console.log('🔍 ProfileScreen: targetUserId:', targetUserId)
      console.log('🔍 ProfileScreen: effectiveUser:', effectiveUser)
      
      setLoading(true)
      setError(null)
      
      try {
        // Загружаем профиль пользователя
        console.log('🔍 ProfileScreen: Loading profile...')
        const profileResponse = shouldUseMyProfile 
          ? await api.getMyProfile()
          : await api.getUserProfile(targetUserId!)
        
        console.log('🔍 ProfileScreen: Profile response:', profileResponse)
        
        if (profileResponse.error) {
          // Проверяем 401 ошибку (Unauthorized)
          if (profileResponse.error.includes('401') || 
              profileResponse.error.includes('Unauthorized')) {
            setError('Необходима авторизация')
            toast.error('Пожалуйста, войдите в систему')
            setLoading(false)
            // Можно добавить редирект на логин
            return
          }
          // Проверяем различные варианты 404 ошибки
          if (profileResponse.error.includes('404') || 
              profileResponse.error.includes('Not found') ||
              profileResponse.error.includes('Пользователь не найден')) {
            setError('Пользователь не найден')
            setLoading(false)
            return
          } else {
            setError('Не удалось загрузить профиль')
            toast.error(profileResponse.error)
            setLoading(false)
            return
          }
        }

        if (profileResponse.data) {
          console.log('🔍 ProfileScreen: Setting profile user data:', profileResponse.data)
          setProfileUser({
            id: profileResponse.data.id,
            name: profileResponse.data.username, // Используем username как name
            username: profileResponse.data.username,
            bio: profileResponse.data.bio || '',
            location: '',
            website: '',
            joinedDate: 'March 2020', // Пока используем статичную дату
            following: profileResponse.data.following || 0,
            followers: profileResponse.data.followers || 0,
            postsCount: 0, // Будет загружено отдельно
            avatar: profileResponse.data.avatar_url
          })
        }

        // Загружаем твиты пользователя
        console.log('🔍 ProfileScreen: Loading tweets for user:', effectiveUser.id)
        console.log('🔍 ProfileScreen: shouldUseMyProfile:', shouldUseMyProfile)
        console.log('🔍 ProfileScreen: About to call getUserTweets...')
        
        const tweetsResponse = shouldUseMyProfile 
          ? await api.getUserTweets(effectiveUser.id)
          : await api.getUserTweets(targetUserId!)
        
        console.log('🔍 ProfileScreen: getUserTweets call completed')
        
        console.log('🔍 ProfileScreen: Tweets response:', tweetsResponse)
        console.log('🔍 ProfileScreen: Tweets data exists:', !!tweetsResponse.data)
        console.log('🔍 ProfileScreen: Tweets items count:', tweetsResponse.data?.items?.length || 0)
        
        if (tweetsResponse.error) {
          console.error('Error loading tweets:', tweetsResponse.error)
          // Не прерываем загрузку профиля из-за ошибки твитов
        } else if (tweetsResponse.data && tweetsResponse.data.items) {
          console.log('🔍 ProfileScreen: Processing tweets...')
          console.log('🔍 ProfileScreen: Raw tweets data:', tweetsResponse.data.items)
          
          const adaptedTweets = tweetsResponse.data.items.map((tweet: any) => {
            // Создаем правильную структуру твита для TweetCard (как в FeedScreen)
            const adaptedTweet = {
              id: tweet.id.toString(),
              content: tweet.content,
              author: {
                id: effectiveUser.id, // Используем ID текущего пользователя
                username: tweet.user, // tweet.user - это строка (username)
                name: tweet.user, // Используем username как name
                avatar: profileUser?.avatar || undefined
              },
              createdAt: tweet.created_at,
              updatedAt: tweet.updated_at || tweet.created_at,
              isEdited: tweet.is_edited || false,
              parentTweetId: tweet.parent_tweet_id || null,
              stats: {
                likes: parseInt(tweet.likes_count) || 0,
                comments: parseInt(tweet.comments_count) || 0,
                retweets: parseInt(tweet.retweets_count) || 0,
                quotes: parseInt(tweet.quotes_count) || 0
              },
              interactions: {
                isLiked: Boolean(tweet.liked),
                isRetweeted: Boolean(tweet.retweeted),
                isQuoted: Boolean(tweet.quoted) || false,
                isBookmarked: Boolean(tweet.favorited)
              },
              media: tweet.media_url ? [{
                type: 'image' as const,
                url: tweet.media_url,
                alt: 'Tweet media'
              }] : undefined,
              images: tweet.media_url ? [tweet.media_url] : undefined
            }
            
            console.log('🔍 ProfileScreen: Raw tweet:', tweet)
            console.log('🔍 ProfileScreen: Adapted tweet:', adaptedTweet)
            return adaptedTweet
          })
          
          console.log('🔍 ProfileScreen: Setting posts:', adaptedTweets.length, 'tweets')
          setPosts(adaptedTweets)
          setProfileUser((prev: any) => prev ? { ...prev, postsCount: adaptedTweets.length } : null)
        } else {
          console.log('🔍 ProfileScreen: No tweets data or items found')
        }

        // Загружаем подписчиков
        const followersResponse = shouldUseMyProfile 
          ? await api.getFollowers(effectiveUser.id)
          : await api.getFollowers(targetUserId!)
        if (followersResponse.error) {
          console.error('Error loading followers:', followersResponse.error)
        } else if (followersResponse.data) {
          setFollowers(followersResponse.data)
          setProfileUser((prev: any) => prev ? { ...prev, followers: followersResponse.data?.length || 0 } : null)
        }

        // Загружаем подписки
        const followingResponse = shouldUseMyProfile 
          ? await api.getFollowing(effectiveUser.id)
          : await api.getFollowing(targetUserId!)
        if (followingResponse.error) {
          console.error('Error loading following:', followingResponse.error)
        } else if (followingResponse.data) {
          setFollowing(followingResponse.data)
          setProfileUser((prev: any) => prev ? { ...prev, following: followingResponse.data?.length || 0 } : null)
        }

      } catch (error) {
        console.error('Error loading profile:', error)
        toast.error('Failed to load profile data')
      } finally {
        console.log('🔍 ProfileScreen: Finished loading profile data')
        setLoading(false)
      }
    }

    loadProfileData()
  }, [targetUserId])

  const handleFollow = async () => {
    if (!targetUserId || shouldUseMyProfile) return
    
    try {
      if (isFollowing) {
        const response = await api.unfollowUser(targetUserId!)
        if (response.error) {
          toast.error('Failed to unfollow user')
          return
        }
        setIsFollowing(false)
        toast.success('Unfollowed user')
      } else {
        const response = await api.followUser(targetUserId!)
        if (response.error) {
          toast.error('Failed to follow user')
          return
        }
        setIsFollowing(true)
        toast.success('Followed user')
      }
    } catch (error) {
      console.error('Error following/unfollowing:', error)
      toast.error('Failed to update follow status')
    }
  }

  // Обработчики действий с твитами
  const handleLike = async (tweetId: string) => {
    try {
      const id = parseInt(tweetId)
      const response = await api.likeTweet(id)

      if (response.error) {
        toast.error('Failed to like tweet')
        return
      }

      // Обновляем твит в списке
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === tweetId 
            ? { 
                ...post, 
                liked: response.data?.liked ?? post.liked,
                likesCount: response.data?.likesCount ?? post.likesCount
              }
            : post
        )
      )

      toast.success('Tweet liked successfully')
    } catch (error) {
      console.error('Error liking tweet:', error)
      toast.error('Failed to like tweet')
    }
  }

  const handleRetweet = async (tweetId: string) => {
    try {
      const id = parseInt(tweetId)
      const response = await api.retweet(id)

      if (response.error) {
        toast.error('Failed to retweet')
        return
      }

      // Обновляем твит в списке
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === tweetId 
            ? { 
                ...post, 
                retweeted: response.data?.retweeted ?? post.retweeted,
                retweetsCount: response.data?.retweetsCount ?? post.retweetsCount
              }
            : post
        )
      )

      toast.success('Tweet retweeted successfully')
    } catch (error) {
      console.error('Error retweeting:', error)
      toast.error('Failed to retweet')
    }
  }

  const handleBookmark = async (tweetId: string) => {
    try {
      const id = parseInt(tweetId)
      // Пока используем заглушку для bookmark
      console.log('Bookmarking tweet:', id)
      toast.success('Tweet bookmarked successfully')
    } catch (error) {
      console.error('Error bookmarking tweet:', error)
      toast.error('Failed to bookmark tweet')
    }
  }

  const handleDeleteTweet = async (tweetId: string) => {
    try {
      const response = await api.deleteTweet(parseInt(tweetId))
      if (response.error) {
        toast.error('Failed to delete tweet')
        return
      }

      // Удаляем твит из списка
      setPosts(prevPosts => prevPosts.filter(post => post.id !== tweetId))
      setProfileUser((prev: any) => prev ? { ...prev, postsCount: prev.postsCount - 1 } : null)
      
      toast.success('Tweet deleted successfully')
    } catch (error) {
      console.error('Error deleting tweet:', error)
      toast.error('Failed to delete tweet')
    }
  }

  const handleEditTweet = async (tweetId: string, newContent: string) => {
    try {
      const response = await api.updateTweet(parseInt(tweetId), newContent)
      if (response.error) {
        toast.error('Failed to update tweet')
        return
      }

      // Обновляем твит в списке
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === tweetId 
            ? { ...post, content: newContent, isEdited: true }
            : post
        )
      )

      toast.success('Tweet updated successfully')
    } catch (error) {
      console.error('Error updating tweet:', error)
      toast.error('Failed to update tweet')
    }
  }

  // Обработчики навигации
  const onTweetClick = (tweetId: string) => {
    // Здесь можно добавить навигацию к твиту
    console.log('Tweet clicked:', tweetId)
  }

  const onProfileClick = (userId: string) => {
    // Здесь можно добавить навигацию к профилю
    console.log('Profile clicked:', userId)
  }

  if (loading) {
    console.log('🔍 ProfileScreen: Loading state, showing spinner')
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-card border rounded-lg p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
          <p className="text-xs text-muted-foreground mt-2">
            Loading: {loading ? 'true' : 'false'}, 
            Error: {error || 'none'}, 
            ProfileUser: {profileUser ? 'loaded' : 'null'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    console.log('🔍 ProfileScreen: Error state, showing error message:', error)
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-card border rounded-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-muted-foreground">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Пользователь не найден</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-xs text-muted-foreground mb-4">
            Loading: {loading ? 'true' : 'false'}, 
            ProfileUser: {profileUser ? 'loaded' : 'null'}
          </p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Назад
          </button>
        </div>
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-card border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Profile not found</p>
          <p className="text-xs text-muted-foreground mt-2">
            Loading: {loading ? 'true' : 'false'}, 
            Error: {error || 'none'}, 
            ProfileUser: {profileUser ? 'loaded' : 'null'}
          </p>
        </div>
      </div>
    )
  }

  console.log('🔍 ProfileScreen: Rendering profile with data:', profileUser)
  
  return (
    <div className="max-w-4xl mx-auto">

      {/* Profile Header */}
      <div className="bg-card border rounded-lg overflow-hidden mb-6">
        {/* Cover Photo */}
        <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600"></div>
        
        {/* Profile Info */}
        <div className="p-6 relative">
          {/* Avatar */}
          <div className="absolute -top-16 left-6">
            <div className="w-32 h-32 rounded-full border-4 border-card bg-card overflow-hidden">
              {profileUser.avatar ? (
                <ImageWithFallback
                  src={profileUser.avatar}
                  alt={profileUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-primary">
                    {profileUser.name && profileUser.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end mb-4">
            {isOwnProfile ? (
              <AppleButton variant="ghost" size="sm">
                Edit Profile
              </AppleButton>
            ) : (
              <div className="flex gap-2">
                <AppleButton variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </AppleButton>
                <AppleButton 
                  variant={isFollowing ? "ghost" : "primary"} 
                  size="sm"
                  onClick={handleFollow}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </AppleButton>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="mt-4">
            <h1 className="text-2xl font-semibold">{profileUser.name}</h1>
            <p className="text-muted-foreground">@{profileUser.username}</p>
            
            {profileUser.bio && (
              <p className="mt-3 text-foreground leading-relaxed">{profileUser.bio}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              {profileUser.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{profileUser.location}</span>
                </div>
              )}
              {profileUser.website && (
                <div className="flex items-center gap-1">
                  <Link2 className="w-4 h-4" />
                  <a href={`https://${profileUser.website}`} className="text-primary hover:underline">
                    {profileUser.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {profileUser.joinedDate}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-4">
              <div>
                <span className="font-semibold">{profileUser.following.toLocaleString()}</span>
                <span className="text-muted-foreground ml-1">Following</span>
              </div>
              <div>
                <span className="font-semibold">{profileUser.followers.toLocaleString()}</span>
                <span className="text-muted-foreground ml-1">Followers</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start bg-card border rounded-lg p-1">
          <TabsTrigger value="posts" className="flex-1">
            Posts ({profileUser.postsCount})
          </TabsTrigger>
          <TabsTrigger value="replies" className="flex-1">
            Replies
          </TabsTrigger>
          <TabsTrigger value="media" className="flex-1">
            Media
          </TabsTrigger>
          <TabsTrigger value="likes" className="flex-1">
            Likes
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="posts" className="space-y-4">
            {posts.map((post) => (
              <TweetCard
                key={post.id}
                tweet={post}
                isOwn={post.author.id === effectiveUser.id}
                onLike={handleLike}
                onRetweet={handleRetweet}
                onComment={() => console.log('Comment on tweet:', post.id)}
                onBookmark={handleBookmark}
                onDelete={handleDeleteTweet}
                onEdit={handleEditTweet}
                onShare={() => console.log('Share tweet', post.id)}
                onTweetClick={onTweetClick}
                onProfileClick={(userId?: string) => userId && onProfileClick(userId)}
              />
            ))}
          </TabsContent>

          <TabsContent value="replies" className="space-y-4">
            <div className="text-center py-12 text-muted-foreground">
              <p>No replies yet</p>
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <div className="text-center py-12 text-muted-foreground">
              <p>No media posts yet</p>
            </div>
          </TabsContent>

          <TabsContent value="likes" className="space-y-4">
            <div className="text-center py-12 text-muted-foreground">
              <p>No liked posts yet</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}