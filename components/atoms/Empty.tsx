import { cn } from '../ui/utils'

interface EmptyProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function Empty({ icon, title, description, action, className }: EmptyProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-12 px-4',
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground opacity-50">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}