import { TrendingUp } from 'lucide-react'
import { cn } from '../ui/utils'

interface TrendItemProps {
  hashtag: string
  uses: number
  trend?: 'up' | 'down' | 'stable'
  onClick?: () => void
  className?: string
}

export function TrendItem({ hashtag, uses, trend = 'stable', onClick, className }: TrendItemProps) {
  const formatUses = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const getTrendIcon = () => {
    if (trend === 'up') {
      return <TrendingUp className="w-3 h-3 text-success" />
    }
    return null
  }

  return (
    <div 
      className={cn(
        'flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-primary hover:underline">
            #{hashtag}
          </h4>
          {getTrendIcon()}
        </div>
        <p className="text-sm text-muted-foreground">
          {formatUses(uses)} uses
        </p>
      </div>
    </div>
  )
}