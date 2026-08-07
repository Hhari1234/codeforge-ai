import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronsLeft, ChevronsRight, Sparkles } from 'lucide-react'
import { navSections } from './navConfig'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/10 bg-slate-950/80 backdrop-blur-xl transition-all duration-300 lg:flex ${
        collapsed ? 'w-[76px]' : 'w-[260px]'
      }`}
      aria-label="Sidebar"
    >
      {/* Brand */}
      <div className={`flex h-16 items-center border-b border-white/10 ${collapsed ? 'justify-center px-3' : 'px-5'}`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles size={16} className="text-white" />
          </div>
          {!collapsed ? (
            <div className="whitespace-nowrap">
              <p className="text-sm font-bold leading-tight text-slate-50">CodeForge</p>
              <p className="text-[10px] font-medium uppercase tracking-widest text-indigo-400">AI</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-5">
            {!collapsed ? (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {section.title}
              </p>
            ) : (
              <div className="mx-auto mb-2 h-px w-8 bg-white/10" />
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500/15 to-purple-500/10 text-white'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-400 to-purple-500"
                          />
                        ) : null}
                        <Icon size={18} className="shrink-0 transition-transform group-hover:scale-110" />
                        {!collapsed ? (
                          <span className="truncate whitespace-nowrap">{item.label}</span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-100"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          {!collapsed ? 'Collapse' : null}
        </button>
      </div>
    </aside>
  )
}
