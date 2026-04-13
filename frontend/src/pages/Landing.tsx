import { useNavigate } from 'react-router-dom'
import {
  Zap, Users, MessageSquare, ClipboardCheck,
  Building2, ArrowRight, CheckCircle, Bot,
  BarChart3, Clock, Globe
} from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  function handleStart() {
    navigate(token ? '/companies' : '/login')
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] text-slate-100 overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a12]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-lg shadow-accent/30">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-white">1nexio</span>
            <span className="ml-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent border border-accent/20">AI</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className="text-sm text-slate-400 hover:text-white transition-colors">
              Sign in
            </button>
            <button onClick={handleStart}
              className="btn-primary text-xs px-4 py-2">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-40 pb-28 text-center">
        {/* glow blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]" />
          <div className="absolute right-1/4 top-1/2 h-64 w-64 rounded-full bg-purple-600/8 blur-[80px]" />
        </div>

        <div className="relative max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs text-accent">
            <Bot size={12} />
            AI-powered one-person company platform
          </div>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Run a full company
            <br />
            <span className="bg-gradient-to-r from-accent via-purple-400 to-accent-light bg-clip-text text-transparent">
              with AI employees
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-lg text-slate-400 leading-relaxed">
            Hire AI employees for any role — researcher, writer, analyst, marketer.
            They work 24/7, report to you, and ask for approval when it matters.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button onClick={handleStart}
              className="flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:bg-accent-light hover:shadow-accent/40 active:scale-95">
              Start for free
              <ArrowRight size={16} />
            </button>
            <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-xl border border-white/10 px-8 py-3.5 text-sm font-medium text-slate-300 hover:bg-white/5 transition-all">
              See how it works
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-white/5 bg-white/[0.02] py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-3 divide-x divide-white/5">
          {[
            { value: '24/7', label: 'Always working' },
            { value: '∞', label: 'AI employees' },
            { value: '100%', label: 'Your decisions' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center py-4">
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-white">Everything you need to run your AI company</h2>
          <p className="mt-3 text-slate-400">One platform. Multiple AI employees. Zero management overhead.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Users,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
              title: 'AI Employees',
              desc: 'Hire AI employees with custom roles, personalities, and models (Claude, GPT-4). Each one has their own workspace.',
            },
            {
              icon: MessageSquare,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10 border-purple-500/20',
              title: 'Virtual Office',
              desc: 'Chat with any employee in their private workspace, or open a meeting room with multiple employees at once.',
            },
            {
              icon: ClipboardCheck,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
              title: 'Approval Workflow',
              desc: 'AI employees submit proposals when a decision needs you. Approve, reject, or request revisions — you stay in control.',
            },
            {
              icon: Building2,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
              title: 'Multiple Companies',
              desc: 'Run different companies or projects from one account. Each company has its own team and settings.',
            },
            {
              icon: BarChart3,
              color: 'text-pink-400',
              bg: 'bg-pink-500/10 border-pink-500/20',
              title: 'Activity Feed',
              desc: 'Real-time dashboard showing what every employee is working on, tasks completed, and proposals pending.',
            },
            {
              icon: Globe,
              color: 'text-cyan-400',
              bg: 'bg-cyan-500/10 border-cyan-500/20',
              title: 'Choose Your AI',
              desc: 'Pick any model per employee — Claude 3.5 Sonnet, GPT-4o, or mini models. Match intelligence to the role.',
            },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="card p-6 flex flex-col gap-4 hover:border-white/15 transition-all">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${bg}`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="border-t border-white/5 bg-white/[0.015] py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-white">How it works</h2>
            <p className="mt-3 text-slate-400">Up and running in minutes</p>
          </div>

          <div className="flex flex-col gap-8">
            {[
              {
                step: '01',
                title: 'Create your company',
                desc: 'Sign up and create your first AI company. Give it a name and description.',
              },
              {
                step: '02',
                title: 'Hire AI employees',
                desc: 'Add employees with specific roles — Sales Rep, Content Writer, Market Researcher. Choose their AI model and capabilities.',
              },
              {
                step: '03',
                title: 'Chat and delegate',
                desc: 'Go to any employee\'s workspace and give them tasks. Open a meeting room to discuss with the whole team.',
              },
              {
                step: '04',
                title: 'Review and approve',
                desc: 'When employees need a decision, they submit a proposal. You approve or reject — always stay in control.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/5 text-sm font-bold text-accent">
                  {step}
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white">Built for solo founders & small teams</h2>
          <p className="mt-3 text-slate-400">What your AI team can do for you</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { emoji: '🔍', title: 'Market Research', desc: 'Scan competitors, identify trends, summarise findings' },
            { emoji: '✍️', title: 'Content Creation', desc: 'Write blogs, emails, social posts, ad copy' },
            { emoji: '📊', title: 'Data Analysis', desc: 'Analyse reports and surface insights' },
            { emoji: '📧', title: 'Outreach', desc: 'Draft proposals, follow-ups, client pitches' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="card p-5 text-center hover:border-white/15 transition-all">
              <div className="mb-3 text-3xl">{emoji}</div>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <div className="pointer-events-none absolute left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-[80px]" />
          <h2 className="relative text-4xl font-bold text-white">
            Ready to build your AI company?
          </h2>
          <p className="relative mt-4 text-slate-400">
            Start free. No credit card required.
          </p>
          <button onClick={handleStart}
            className="relative mt-8 flex items-center gap-2 rounded-xl bg-accent px-10 py-4 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:bg-accent-light mx-auto">
            Get started free
            <ArrowRight size={16} />
          </button>
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
            {['No credit card', 'Cancel anytime', 'Your data stays private'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle size={11} className="text-emerald-500" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent">
              <Zap size={11} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white">1nexio</span>
          </div>
          <p className="text-xs text-slate-600">© 2025 1nexio. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-slate-500">
            <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Sign in</button>
            <button onClick={handleStart} className="hover:text-white transition-colors">Sign up</button>
          </div>
        </div>
      </footer>

    </div>
  )
}
