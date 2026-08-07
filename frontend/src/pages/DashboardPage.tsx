import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Zap,
  ScanSearch,
  Code2,
  FileText,
  MessagesSquare,
  Wand2,
  Bug,
  BookOpen,
  ArrowRight,
  Sparkles,
  Clock,
  FolderGit2,
  Activity,
} from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useProjectGeneration } from '../hooks/useProjectGeneration'
import { useRepositoryAnalysis } from '../hooks/useRepositoryAnalysis'
import { useCodeReview } from '../hooks/useCodeReview'
import { useReadmeGeneration } from '../hooks/useReadmeGeneration'
import { useCodeExplanation } from '../hooks/useCodeExplanation'
import { useBugDebug } from '../hooks/useBugDebug'
import { useApiDocumentation } from '../hooks/useApiDocumentation'

const quickActions = [
  { label: 'Project Generator', to: '/projects/generate', icon: Zap, desc: 'Turn an idea into a spec', color: 'from-indigo-500 to-purple-500' },
  { label: 'Repository Analyzer', to: '/repository/analyze', icon: ScanSearch, desc: 'Analyze any repo', color: 'from-sky-500 to-blue-500' },
  { label: 'Code Reviewer', to: '/code/review', icon: Code2, desc: 'Review code quality', color: 'from-emerald-500 to-teal-500' },
  { label: 'README Generator', to: '/readme/generate', icon: FileText, desc: 'Generate a README', color: 'from-amber-500 to-orange-500' },
  { label: 'Code Explainer', to: '/explain', icon: Wand2, desc: 'Understand any file', color: 'from-rose-500 to-pink-500' },
  { label: 'Bug Debugger', to: '/debug', icon: Bug, desc: 'Find and fix bugs', color: 'from-red-500 to-rose-500' },
  { label: 'API Documentation', to: '/documentation', icon: BookOpen, desc: 'Document your API', color: 'from-indigo-500 to-blue-500' },
  { label: 'Repository Chat', to: '/repository/analyze', icon: MessagesSquare, desc: 'Chat with your code', color: 'from-purple-500 to-fuchsia-500' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  const { user } = useAuth()

  const project = useProjectGeneration()
  const analysis = useRepositoryAnalysis()
  const review = useCodeReview()
  const readme = useReadmeGeneration()
  const explain = useCodeExplanation()
  const debug = useBugDebug()
  const docs = useApiDocumentation()

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  const totalActivities =
    project.generations.length +
    analysis.analyses.length +
    review.reviews.length +
    readme.generations.length +
    explain.explanations.length +
    debug.sessions.length +
    docs.docs.length

  // Build a unified recent activity list
  interface ActivityItem {
    id: string
    type: string
    title: string
    date: string
    to: string
    icon: React.ReactNode
  }

  const recentActivity: ActivityItem[] = [
    ...project.generations.map((g) => ({ id: `pg-${g.id}`, type: 'Project Spec', title: g.project_name, date: g.created_at, to: '/projects/generate', icon: <Zap size={14} /> })),
    ...analysis.analyses.map((a) => ({ id: `ra-${a.id}`, type: 'Analysis', title: a.repo_source, date: a.created_at, to: '/repository/analyze', icon: <ScanSearch size={14} /> })),
    ...review.reviews.map((r) => ({ id: `cr-${r.id}`, type: 'Code Review', title: r.repo_source, date: r.created_at, to: '/code/review', icon: <Code2 size={14} /> })),
    ...readme.generations.map((r) => ({ id: `rd-${r.id}`, type: 'README', title: r.title || r.id.toString(), date: r.created_at, to: '/readme/generate', icon: <FileText size={14} /> })),
    ...explain.explanations.map((e) => ({ id: `ce-${e.id}`, type: 'Explanation', title: e.filename, date: e.created_at, to: '/explain', icon: <Wand2 size={14} /> })),
    ...debug.sessions.map((s) => ({ id: `bd-${s.id}`, type: 'Debug', title: s.repo_source, date: s.created_at, to: '/debug', icon: <Bug size={14} /> })),
    ...docs.docs.map((d) => ({ id: `ad-${d.id}`, type: 'API Docs', title: d.repo_source, date: d.created_at, to: '/documentation', icon: <BookOpen size={14} /> })),
  ]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 6)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title={`${greeting}, ${firstName}`}
        description="Your AI-powered development workspace. Pick up where you left off or start something new."
        badge={<Badge variant="success" dot>All systems operational</Badge>}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Project Specs" value={project.generations.length} icon={<Zap size={20} />} gradient="indigo" index={0} />
        <StatCard label="Repos Analyzed" value={analysis.analyses.length} icon={<ScanSearch size={20} />} gradient="blue" index={1} />
        <StatCard label="Code Reviews" value={review.reviews.length} icon={<Code2 size={20} />} gradient="emerald" index={2} />
        <StatCard label="Total Activities" value={totalActivities} icon={<Activity size={20} />} gradient="purple" index={3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-400" />
                <h3 className="text-lg font-semibold text-slate-100">Quick Actions</h3>
              </div>
              <ArrowRight size={16} className="text-slate-500" />
            </div>
            <div className="grid gap-3 p-6 sm:grid-cols-2">
              {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Link
                      to={action.to}
                      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4 transition-all duration-200 hover:border-indigo-500/40 hover:bg-white/[0.03]"
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${action.color} text-white`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{action.label}</p>
                        <p className="truncate text-xs text-slate-500">{action.desc}</p>
                      </div>
                      <ArrowRight size={14} className="ml-auto shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-indigo-400" />
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card className="h-full">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-indigo-400" />
                <h3 className="text-lg font-semibold text-slate-100">Recent Activity</h3>
              </div>
            </div>
            <div className="p-4">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                    <FolderGit2 size={22} />
                  </div>
                  <p className="text-sm text-slate-300">No activity yet</p>
                  <p className="mt-1 text-xs text-slate-500">Start using the AI modules to see your recent work here.</p>
                  <Link to="/projects/generate" className="mt-4">
                    <Button variant="gradient" size="sm">Get Started</Button>
                  </Link>
                </div>
              ) : (
                <div className="relative space-y-1">
                  {recentActivity.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={item.to}
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-white/[0.03]"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-indigo-300">
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-sm font-medium text-slate-100">
                            <span className="truncate">{item.title}</span>
                          </p>
                          <p className="truncate text-xs text-slate-500">{item.type}</p>
                        </div>
                        <span className="shrink-0 text-xs text-slate-600">{formatDate(item.date)}</span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
