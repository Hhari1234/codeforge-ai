import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'
import { navSections } from './navConfig'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          />
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-white/10 bg-slate-950 lg:hidden"
            aria-label="Mobile navigation"
          >
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Sparkles size={16} className="text-white" />
                </div>
                <p className="text-sm font-bold text-slate-50">CodeForge <span className="text-indigo-400">AI</span></p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-100"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {navSections.map((section) => (
                <div key={section.title} className="mb-5">
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.label}
                          to={item.to}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-gradient-to-r from-indigo-500/15 to-purple-500/10 text-white'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                            }`
                          }
                        >
                          <Icon size={18} />
                          <span>{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
