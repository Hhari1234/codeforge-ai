import {
  LayoutDashboard,
  Zap,
  ScanSearch,
  Code2,
  FileText,
  MessagesSquare,
  Wand2,
  Bug,
  BookOpen,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  section?: string
}

export const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'AI Modules',
    items: [
      { label: 'Project Generator', to: '/projects/generate', icon: Zap },
      { label: 'Repository Analyzer', to: '/repository/analyze', icon: ScanSearch },
      { label: 'Code Reviewer', to: '/code/review', icon: Code2 },
      { label: 'README Generator', to: '/readme/generate', icon: FileText },
      { label: 'Repository Chat', to: '/repository/analyze', icon: MessagesSquare },
      { label: 'Code Explainer', to: '/explain', icon: Wand2 },
      { label: 'Bug Debugger', to: '/debug', icon: Bug },
      { label: 'API Documentation', to: '/documentation', icon: BookOpen },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

export const allNavItems: NavItem[] = navSections.flatMap((s) =>
  s.items.map((item) => ({ ...item, section: s.title })),
)
