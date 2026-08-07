import type { HTMLAttributes } from 'react'

interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  lines?: number
  title?: boolean
}

export function Skeleton({ lines = 3, title = true, className = '', ...props }: SkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`} {...props} aria-hidden="true">
      {title ? <div className="skeleton h-5 w-1/3" /> : null}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-4 w-full" style={{ width: `${100 - ((i + 1) % 3) * 12}%` }} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-900/40 p-6 ${className}`} {...props} aria-hidden="true">
      <Skeleton lines={3} />
    </div>
  )
}
