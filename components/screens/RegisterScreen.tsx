import { useState } from 'react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { AppleButton } from '../atoms/AppleButton'

import { RoyLogo } from '../atoms/RoyLogo'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { ThemeToggle } from '../atoms/ThemeToggle'

interface RegisterScreenProps {
  onRegister: (data: {
    username: string
    password: string
  }) => void
  onSwitchToLogin: () => void
  loading?: boolean
}

export function RegisterScreen({ onRegister, onSwitchToLogin, loading = false }: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      formData.username.trim() &&
      formData.password.trim() &&
      formData.password === formData.confirmPassword
    ) {
      onRegister({
        username: formData.username.trim(),
        password: formData.password.trim()
      })
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const isValid = 
    formData.username.trim() &&
    formData.password.trim() &&
    formData.password === formData.confirmPassword

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1 flex flex-col items-center">
            <RoyLogo size="lg" showText={true} className="mb-4" />
            <p className="text-muted-foreground">Create your account</p>
          </div>
          <ThemeToggle />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Join Roy today</CardTitle>
            <CardDescription>
              Fill in the information below to create your account
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  className="bg-input-background border border-border"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="bg-input-background border border-border"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className="bg-input-background border border-border"
                  required
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-destructive">Passwords don't match</p>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <AppleButton
                type="submit"
                className="w-full"
                loading={loading}
                disabled={!isValid}
              >
                Create Account
              </AppleButton>
              
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>


      </div>
    </div>
  )
}