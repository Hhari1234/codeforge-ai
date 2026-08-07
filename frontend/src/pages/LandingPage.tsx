import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Zap,
  ScanSearch,
  Code2,
  FileText,
  MessagesSquare,
  Wand2,
  Bug,
  BookOpen,
ArrowRight,
  Globe,
  Send,
  Share2,
  Check,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

const features = [
  { icon: Zap, title: 'Project Generator', desc: 'Turn an idea into a complete technical spec, API surface, schema, and README.', to: '/register', color: 'from-indigo-500 to-purple-500' },
  { icon: ScanSearch, title: 'Repository Analyzer', desc: 'Point at any GitHub repo or ZIP and get a full architecture overview in seconds.', to: '/register', color: 'from-sky-500 to-blue-500' },
  { icon: Code2, title: 'Code Reviewer', desc: 'Get a quality score, prioritized findings, and actionable recommendations per file.', to: '/register', color: 'from-emerald-500 to-teal-500' },
  { icon: FileText, title: 'README Generator', desc: 'Upload a project and receive a polished, production-ready README instantly.', to: '/register', color: 'from-amber-500 to-orange-500' },
  { icon: MessagesSquare, title: 'Repository Chat', desc: 'Chat with any repository and get cited answers grounded in your codebase.', to: '/register', color: 'from-purple-500 to-fuchsia-500' },
  { icon: Wand2, title: 'Code Explainer', desc: 'Paste any file and understand every function, class, and flow with syntax highlighting.', to: '/register', color: 'from-rose-500 to-pink-500' },
  { icon: Bug, title: 'Bug Debugger', desc: 'Surface bugs with root causes, severity, and concrete fixes — automatically.', to: '/register', color: 'from-red-500 to-rose-500' },
  { icon: BookOpen, title: 'API Documentation', desc: 'Generate professional API docs with endpoints, examples, and export to Markdown/PDF.', to: '/register', color: 'from-indigo-500 to-blue-500' },
]

const faqs = [
  { q: 'What is CodeForge AI?', a: 'CodeForge AI is a suite of AI-powered developer tools that help you generate, analyze, review, debug, and document code — all in one place.' },
  { q: 'Do I need to install anything?', a: 'No. Everything runs in the browser. Just create an account and start using the AI modules.' },
  { q: 'Can I analyze my own repositories?', a: 'Yes. You can point CodeForge at any public GitHub URL or upload a ZIP archive directly.' },
  { q: 'Is my code secure?', a: 'Your code is processed solely to power the AI analysis and is never shared with other users.' },
]

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 bg-grid" />
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/25 blur-[140px]" />
      <div className="pointer-events-none absolute top-40 right-0 h-[400px] w-[400px] rounded-full bg-purple-600/20 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-emerald-600/15 blur-[140px]" />

      {/* Navbar */}
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-slate-50">
            CodeForge <span className="text-gradient">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="md">Log in</Button>
          </Link>
          <Link to="/register">
            <Button variant="gradient" size="md">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-24 text-center">
        <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}>
          <motion.div variants={fadeUp}>
            <Badge variant="primary" className="mb-6 px-4 py-1.5 text-sm">
              <Sparkles size={14} /> AI Developer Suite
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeUp} className="mx-auto max-w-4xl text-5xl font-extrabold leading-[1.1] sm:text-6xl lg:text-7xl">
            <span className="text-slate-50">Build Faster.</span>
            <br />
            <span className="text-gradient">Develop Smarter.</span>
            <br />
            <span className="text-slate-50">Powered by AI.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Generate full project specs, analyze any repository, review code quality, debug bugs,
            and produce beautiful documentation — all from one unified AI workspace.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="gradient" size="lg">
                Start Building Free <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg" className="border-white/15 bg-white/5">
                Explore the Suite
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Floating preview card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="relative mx-auto mt-20 max-w-4xl"
        >
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-emerald-500/30 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500/70" />
                <span className="h-3 w-3 rounded-full bg-amber-500/70" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
              </div>
              <div className="ml-3 flex-1 rounded-lg bg-white/5 px-3 py-1.5 text-left text-xs text-slate-400">
                https://codeforge.ai/workspace
              </div>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Project Spec</p>
                <p className="mt-2 text-lg font-bold text-slate-50">CollabTask</p>
                <p className="mt-1 text-sm text-slate-400">A real-time collaborative planning app for remote teams.</p>
                <div className="mt-3 space-y-1.5">
                  {['✓ Requirements & Features', '✓ REST API surface', '✓ Database schema'].map((x) => (
                    <p key={x} className="flex items-center gap-2 text-xs text-emerald-300">{x}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">Code Review</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-emerald-400 text-lg font-bold text-emerald-400">
                    92
                  </div>
                  <div className="text-sm text-slate-400">
                    Overall quality score
                    <p className="text-xs text-slate-500">Clean, well-architected codebase</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          className="text-center"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">
            AI Modules
          </motion.p>
          <motion.h2 variants={fadeUp} className="mt-3 text-4xl font-bold text-slate-50">
            Everything your team needs
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-2xl text-slate-400">
            Eight powerful AI modules to accelerate every stage of the software development lifecycle.
          </motion.p>
        </motion.div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-colors hover:border-indigo-500/40"
              >
                <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${feature.color} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30`} />
                <div className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}>
                  <Icon size={22} />
                </div>
                <h3 className="relative mt-4 text-lg font-semibold text-slate-50">{feature.title}</h3>
                <p className="relative mt-2 text-sm leading-6 text-slate-400">{feature.desc}</p>
                <Link to={feature.to} className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-400 transition group-hover:gap-2">
                  Try it now <ArrowRight size={14} />
                </Link>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">FAQ</p>
          <h2 className="mt-3 text-4xl font-bold text-slate-50">Frequently asked questions</h2>
        </div>
        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.q}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl"
            >
              <h3 className="flex items-center gap-2 font-semibold text-slate-100">
                <Check size={16} className="text-emerald-400" /> {faq.q}
              </h3>
              <p className="mt-2 pl-6 text-sm leading-6 text-slate-400">{faq.a}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-emerald-500/15 p-12 backdrop-blur-xl">
            <div className="absolute inset-0 bg-grid opacity-50" />
            <h2 className="relative text-4xl font-bold text-slate-50">Ready to build faster?</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-slate-300">
              Join CodeForge AI today and let AI handle the heavy lifting — from spec to deployment.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/register">
                <Button variant="gradient" size="lg">Get Started Free <ArrowRight size={18} /></Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg" className="border-white/15 bg-white/5">Log in</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/60 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <Sparkles size={15} className="text-white" />
              </div>
              <span className="font-bold text-slate-200">CodeForge AI</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="#" className="transition hover:text-slate-100">About</a>
              <a href="#" className="transition hover:text-slate-100">Docs</a>
              <a href="#" className="transition hover:text-slate-100">Privacy</a>
              <a href="#" className="transition hover:text-slate-100">Terms</a>
            </div>
<div className="flex items-center gap-3">
              <a href="#" className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-100" aria-label="Globe"><Globe size={16} /></a>
              <a href="#" className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-100" aria-label="Send"><Send size={16} /></a>
              <a href="#" className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-100" aria-label="Share"><Share2 size={16} /></a>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} CodeForge AI. Built for developers who build fast.
          </p>
        </div>
      </footer>
    </div>
  )
}
