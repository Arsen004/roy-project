import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Users, Settings } from 'lucide-react'
import { ListCard } from '../molecules/ListCard'
import { AppleButton } from '../atoms/AppleButton'
import { api, User } from '../../src/api'
import { toast } from 'sonner'

interface List {
  id: number
  name: string
  description?: string
  is_private: boolean
  owner_id: number
  created_at: string
  updated_at: string
  members_count: number
  subscribers_count: number
  is_subscribed?: boolean
}

interface ListsScreenProps {
  currentUser: User
  onBack?: () => void
}

export function ListsScreen({ currentUser, onBack }: ListsScreenProps) {
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'my' | 'subscribed'>('my')

  useEffect(() => {
    loadLists()
  }, [])

  const loadLists = async () => {
    setLoading(true)
    try {
      const response = await api.getLists()
      if (response.error) {
        throw new Error(response.error)
      }
      setLists(response.data || [])
    } catch (error) {
      console.error('Load lists error:', error)
      toast.error('Не удалось загрузить списки')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateList = async (data: { name: string; description?: string; is_private: boolean }) => {
    try {
      const response = await api.createList(data)
      if (response.error) {
        throw new Error(response.error)
      }
      toast.success('Список создан успешно')
      setShowCreateModal(false)
      loadLists()
    } catch (error) {
      console.error('Create list error:', error)
      toast.error('Не удалось создать список')
    }
  }

  const handleListClick = (listId: number) => {
    // TODO: Открыть детальную страницу списка
    console.log('Open list:', listId)
  }

  const handleAddUser = (listId: number) => {
    // TODO: Открыть модальное окно для добавления пользователя
    console.log('Add user to list:', listId)
  }

  const filteredLists = lists.filter(list => {
    const matchesSearch = list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (list.description && list.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    if (activeTab === 'my') {
      return list.owner_id === currentUser.id && matchesSearch
    } else {
      return list.is_subscribed && matchesSearch
    }
  })

  const myLists = lists.filter(list => list.owner_id === currentUser.id)
  const subscribedLists = lists.filter(list => list.is_subscribed)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              ←
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Списки</h1>
            <p className="text-muted-foreground">Управляйте списками пользователей</p>
          </div>
        </div>
        
        <AppleButton
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать список
        </AppleButton>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setActiveTab('my')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'my' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Мои списки ({myLists.length})
        </button>
        <button
          onClick={() => setActiveTab('subscribed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'subscribed' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4" />
          Подписки ({subscribedLists.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск по спискам..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredLists.map((list) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ListCard
                list={list}
                currentUserId={currentUser.id}
                onListClick={handleListClick}
                onAddUser={handleAddUser}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredLists.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {activeTab === 'my' ? 'У вас пока нет списков' : 'Вы не подписаны ни на один список'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {activeTab === 'my' 
              ? 'Создайте свой первый список пользователей' 
              : 'Найдите интересные списки и подпишитесь на них'
            }
          </p>
          {activeTab === 'my' && (
            <AppleButton
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать список
            </AppleButton>
          )}
        </div>
      )}

      {/* Create List Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateListModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateList}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Модальное окно создания списка
interface CreateListModalProps {
  onClose: () => void
  onCreate: (data: { name: string; description?: string; is_private: boolean }) => void
}

function CreateListModal({ onClose, onCreate }: CreateListModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    await onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      is_private: isPrivate
    })
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-background border border-border rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-foreground mb-4">Создать список</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Название *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Введите название списка"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Описание списка (необязательно)"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="private" className="text-sm text-foreground">
              Приватный список
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <AppleButton
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border text-foreground hover:bg-muted"
            >
              Отмена
            </AppleButton>
            <AppleButton
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? 'Создание...' : 'Создать'}
            </AppleButton>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
