interface AvatarProps {
  name?: string | null
  email?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

function initials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split('@')[0] || 'U'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function Avatar({ name, email, size = 'md', className = '' }: AvatarProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-semibold text-white ring-2 ring-white/10 ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    >
      {initials(name, email)}
    </div>
  )
}
