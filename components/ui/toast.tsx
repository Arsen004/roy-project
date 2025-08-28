import { Toaster as SonnerToaster } from 'sonner@2.0.3'

export function Toaster() {
  return (
    <SonnerToaster
      theme="system"
      className="toaster group"
      toastOptions={{
        style: {
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
        },
      }}
    />
  )
}