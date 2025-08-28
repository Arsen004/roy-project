import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Switch } from '../ui/switch'
import { Separator } from '../ui/separator'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Mail,
  Lock,
  Eye,
  Globe,
  Monitor,
  Smartphone,
  MapPin,
  AlertTriangle,
  Trash2,
  Download,
  Settings as SettingsIcon,
  Save,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../src/api'

interface User {
  id: number
  username: string
  avatar_url?: string
  bio?: string
}

interface SettingsScreenProps {
  user: User
  onLogout: () => void
}

interface UserSettings {
  theme: string
  language: string
  timezone: string
  email_notifications: boolean
  push_notifications: boolean
  privacy: {
    profile_visibility: string
    show_email: boolean
    allow_dms: boolean
  }
}

interface ActiveSession {
  id: string
  device: string
  location: string
  last_used: string
  current: boolean
}

export function SettingsScreen({ user, onLogout }: SettingsScreenProps) {
  console.log('🔍 SettingsScreen: Component rendered with user:', user)
  
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    email_notifications: true,
    push_notifications: true,
    privacy: {
      profile_visibility: 'public',
      show_email: false,
      allow_dms: true
    }
  })
  
  console.log('🔍 SettingsScreen: Initialized settings:', settings)
  
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [mutedUsers, setMutedUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')

  // Загрузка настроек
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const [settingsRes, sessionsRes, blockedRes, mutedRes] = await Promise.all([
        api.getUserSettings(),
        api.getActiveSessions(),
        api.getBlockedUsers(),
        api.getMutedUsers()
      ])

      console.log('🔍 SettingsScreen: Settings response:', settingsRes)
      if (settingsRes.data) {
        console.log('🔍 SettingsScreen: Setting settings data:', settingsRes.data)
        setSettings(settingsRes.data)
      } else {
        console.log('🔍 SettingsScreen: No settings data, using defaults')
      }
      if (sessionsRes.data) {
        setActiveSessions(sessionsRes.data)
      }
      if (blockedRes.data) {
        setBlockedUsers(blockedRes.data)
      }
      if (mutedRes.data) {
        setMutedUsers(mutedRes.data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const response = await api.updateUserSettings(settings)
      if (response.error) {
        toast.error(response.error)
        return
      }
      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handlePrivacyChange = async (privacy: any) => {
    try {
      const response = await api.updatePrivacySettings(privacy)
      if (response.error) {
        toast.error(response.error)
        return
      }
      setSettings(prev => ({
        ...prev,
        privacy: { ...prev.privacy, ...privacy }
      }))
      toast.success('Privacy settings updated')
    } catch (error) {
      console.error('Error updating privacy:', error)
      toast.error('Failed to update privacy settings')
    }
  }

  const handleNotificationChange = async (notifications: any) => {
    try {
      const response = await api.updateNotificationPreferences(notifications)
      if (response.error) {
        toast.error(response.error)
        return
      }
      setSettings(prev => ({ ...prev, ...notifications }))
      toast.success('Notification preferences updated')
    } catch (error) {
      console.error('Error updating notifications:', error)
      toast.error('Failed to update notification preferences')
    }
  }

  const handleAppearanceChange = async (appearance: any) => {
    try {
      const response = await api.updateAppearanceSettings(appearance)
      if (response.error) {
        toast.error(response.error)
        return
      }
      setSettings(prev => ({ ...prev, ...appearance }))
      toast.success('Appearance settings updated')
    } catch (error) {
      console.error('Error updating appearance:', error)
      toast.error('Failed to update appearance settings')
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      const response = await api.changePassword(currentPassword, newPassword)
      if (response.error) {
        toast.error(response.error)
        return
      }
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Failed to change password')
    }
  }

  const handleUpdateEmail = async () => {
    if (!newEmail.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }

    try {
      const response = await api.updateEmail(newEmail)
      if (response.error) {
        toast.error(response.error)
        return
      }
      toast.success('Email updated successfully')
      setNewEmail('')
    } catch (error) {
      console.error('Error updating email:', error)
      toast.error('Failed to update email')
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const response = await api.revokeSession(sessionId)
      if (response.error) {
        toast.error(response.error)
        return
      }
      setActiveSessions(prev => prev.filter(session => session.id !== sessionId))
      toast.success('Session revoked')
    } catch (error) {
      console.error('Error revoking session:', error)
      toast.error('Failed to revoke session')
    }
  }

  const handleRevokeAllSessions = async () => {
    if (!confirm('Are you sure you want to log out from all devices?')) {
      return
    }

    try {
      const response = await api.revokeAllSessions()
      if (response.error) {
        toast.error(response.error)
        return
      }
      toast.success('Logged out from all devices')
      onLogout()
    } catch (error) {
      console.error('Error revoking all sessions:', error)
      toast.error('Failed to log out from all devices')
    }
  }

  const handleRequestDataExport = async () => {
    try {
      const response = await api.requestDataExport()
      if (response.error) {
        toast.error(response.error)
        return
      }
      toast.success('Data export requested. You will receive an email when ready.')
    } catch (error) {
      console.error('Error requesting data export:', error)
      toast.error('Failed to request data export')
    }
  }

  const handleDeactivateAccount = async () => {
    if (!confirm('Are you sure you want to deactivate your account? This action can be undone within 30 days.')) {
      return
    }

    try {
      const response = await api.deactivateAccount()
      if (response.error) {
        toast.error(response.error)
        return
      }
      toast.success('Account deactivated')
      onLogout()
    } catch (error) {
      console.error('Error deactivating account:', error)
      toast.error('Failed to deactivate account')
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) {
      return
    }

    try {
      const response = await api.deleteAccount()
      if (response.error) {
        toast.error(response.error)
        return
      }
      toast.success('Account deleted')
      onLogout()
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account')
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account
            </CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={user.username} disabled />
            </div>
            
            <div>
              <Label htmlFor="newEmail">Email Address</Label>
              <div className="flex gap-2">
                <Input 
                  id="newEmail" 
                  type="email" 
                  placeholder="Enter new email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <Button onClick={handleUpdateEmail} size="sm">
                  Update
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input 
                id="currentPassword" 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword" 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            
            <Button onClick={handleChangePassword} className="w-full">
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy
            </CardTitle>
            <CardDescription>Control your privacy settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Profile Visibility</Label>
              <Select 
                value={settings.privacy?.profile_visibility || 'public'} 
                onValueChange={(value) => handlePrivacyChange({ profile_visibility: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Show Email</Label>
                <p className="text-sm text-muted-foreground">Allow others to see your email</p>
              </div>
              <Switch 
                checked={settings.privacy?.show_email || false}
                onCheckedChange={(checked) => handlePrivacyChange({ show_email: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Direct Messages</Label>
                <p className="text-sm text-muted-foreground">Let others send you DMs</p>
              </div>
              <Switch 
                checked={settings.privacy?.allow_dms || true}
                onCheckedChange={(checked) => handlePrivacyChange({ allow_dms: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch 
                checked={settings.email_notifications || false}
                onCheckedChange={(checked) => handleNotificationChange({ email_notifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive push notifications</p>
              </div>
              <Switch 
                checked={settings.push_notifications || false}
                onCheckedChange={(checked) => handleNotificationChange({ push_notifications: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Theme</Label>
              <Select 
                value={settings.theme || 'light'} 
                onValueChange={(value) => handleAppearanceChange({ theme: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Language</Label>
              <Select 
                value={settings.language} 
                onValueChange={(value) => handleAppearanceChange({ language: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Timezone</Label>
              <Select 
                value={settings.timezone} 
                onValueChange={(value) => handleAppearanceChange({ timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{session.device}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.location} • Last used {new Date(session.last_used).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.current && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Current</span>
                  )}
                  {!session.current && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {activeSessions.length > 1 && (
              <Button 
                variant="outline" 
                onClick={handleRevokeAllSessions}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out from all devices
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Account Actions
          </CardTitle>
          <CardDescription>Important account management actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button 
              variant="outline" 
              onClick={handleRequestDataExport}
              className="justify-start"
            >
              <Download className="w-4 h-4 mr-2" />
              Request Data Export
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleDeactivateAccount}
              className="justify-start"
            >
              <Eye className="w-4 h-4 mr-2" />
              Deactivate Account
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              className="justify-start"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onLogout}
              className="justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}