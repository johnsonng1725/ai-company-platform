import { useNavigate } from 'react-router-dom'
import {
  Zap, Users, MessageSquare, ClipboardCheck,
  Building2, ArrowRight, CheckCircle, Bot,
  BarChart3, Clock, Globe, TrendingUp, Shield, Star,
} from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  function handleStart() {
    navigate(token ? '/companies' : '/login')
  }

  return (
    <div className="min-h-screen bg-surface text-ink overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-lg shadow-accent/30">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg">1nexio</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Features</button>
            <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">How it works</button>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Pricing</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm text-slate-400 hover:text-white transition-colors">Sign in</button>
            <button onClick={handleStart} className="btn-primary text-xs px-4 py-2">Start free</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-40 pb-20 text-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/8 blur-[140px]" />
          <div className="absolute right-1/4 top-2/3 h-72 w-72 rounded-full bg-teal-600/6 blur-[100px]" />
        </div>

        <div className="relative max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs text-accent font-medium">
            <Bot size={12} />
            Built for solo founders who move fast
          </div>

          <h1 className="mb-5 text-5xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Your AI team.
            <br />
            <span className="bg-gradient-to-r from-teal-300 via-accent-light to-cyan-400 bg-clip-text text-transparent">
              Ready to work now.
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-400 leading-relaxed">
            Hire AI employees for research, content, outreach, and analysis. Assign tasks, review results, stay in control — all from one place.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center mb-10">
            <button onClick={handleStart}
              className="flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-accent/25 transition-all hover:bg-accent-light hover:shadow-accent/35 hover:-translate-y-0.5 active:scale-95">
              Start building free
              <ArrowRight size={16} />
            </button>
            <button onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-xl border border-white/10 px-8 py-4 text-sm font-medium text-slate-300 hover:bg-white/5 hover:border-white/20 transition-all">
              See it in action ↓
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
            {['Free to start', 'Claude & GPT-4 powered', 'No credit card required'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle size={11} className="text-emerald-500" />{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── App Preview / Demo ── */}
      <section id="demo" className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-white/10 bg-surface-card overflow-hidden shadow-2xl shadow-black/50">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 border-b border-white/5 bg-surface-sidebar px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-amber-500/60" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
              <div className="ml-4 flex-1 rounded-md bg-white/5 px-3 py-1 text-xs text-slate-500">app.1nexio.com/dashboard</div>
            </div>
            {/* Fake dashboard UI */}
            <div className="flex" style={{ minHeight: 380 }}>
              {/* Sidebar */}
              <div className="w-48 shrink-0 border-r border-white/5 bg-surface-sidebar p-3 flex flex-col gap-1">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                  <div className="h-5 w-5 rounded bg-accent flex items-center justify-center"><Zap size={10} className="text-white" /></div>
                  <span className="text-xs font-bold text-white">1nexio</span>
                </div>
                {['Dashboard', 'AI Employees', 'Proposals'].map((item, i) => (
                  <div key={item} className={`rounded-lg px-2.5 py-1.5 text-xs ${i === 0 ? 'bg-accent/10 text-accent' : 'text-slate-500'}`}>{item}</div>
                ))}
                <div className="mt-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Office</div>
                {[
                  { name: 'Sam', emoji: '🔬', active: true },
                  { name: 'Alex', emoji: '✍️', active: false },
                  { name: 'Maria', emoji: '📊', active: true },
                ].map(e => (
                  <div key={e.name} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5">
                    <span className="text-sm">{e.emoji}</span>
                    <span className="text-xs text-slate-400 flex-1">{e.name}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${e.active ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
                  </div>
                ))}
              </div>
              {/* Main content */}
              <div className="flex-1 p-5">
                <p className="text-sm font-semibold text-white mb-4">Dashboard</p>
                {/* Stat cards */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'AI Employees', value: '3', color: 'text-teal-400', bg: 'bg-teal-500/10' },
                    { label: 'Tasks This Week', value: '24', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Tasks Completed', value: '87', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Est. Hours Saved', value: '65h', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-white/5 bg-white/2 p-3">
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Employee cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'Sam', role: 'Market Researcher', emoji: '🔬', status: 'Working', statusColor: 'text-blue-400 bg-blue-500/10', task: 'Analysing competitor pricing...' },
                    { name: 'Alex', role: 'Content Writer', emoji: '✍️', status: 'Idle', statusColor: 'text-slate-400 bg-slate-500/10', task: 'Ready for next task' },
                  ].map(e => (
                    <div key={e.name} className="rounded-xl border border-white/5 bg-white/2 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{e.emoji}</span>
                        <div>
                          <p className="text-xs font-medium text-white">{e.name}</p>
                          <p className="text-[10px] text-slate-500">{e.role}</p>
                        </div>
                        <span className={`ml-auto text-[10px] rounded-full px-2 py-0.5 font-medium ${e.statusColor}`}>{e.status}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 italic">{e.task}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-slate-600">Live dashboard — see your AI team working in real time</p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-white/5 bg-white/[0.02] py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-3 divide-x divide-white/5">
          {[
            { value: '24/7', label: 'Your AI team never stops' },
            { value: '8+', label: 'Built-in role templates' },
            { value: '4+', label: 'Task types out of the box' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center py-4">
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-white">Built for the tasks that eat your week</h2>
          <p className="mt-3 text-slate-400 max-w-xl mx-auto">Solo founders spend hours on research, writing, and outreach. 1nexio gives you AI employees who handle that work so you can focus on building.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Users, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20',
              title: 'AI Employees with Roles', desc: 'Hire AI employees for any role — Market Researcher, Sales Rep, Content Writer, Financial Analyst. Each has their own personality, skills, and model.' },
            { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20',
              title: 'Virtual Office & Chat', desc: 'Chat with any employee in their private workspace. Open a meeting room to brainstorm with your whole team at once.' },
            { icon: ClipboardCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20',
              title: 'Smart Approval Workflow', desc: 'Employees know when to ask for permission. They submit proposals for decisions that matter — you stay the boss.' },
            { icon: Building2, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20',
              title: 'Multiple Companies', desc: 'Run different businesses or projects under one account. Each company has its own team, settings, and billing.' },
            { icon: TrendingUp, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20',
              title: 'ROI Metrics', desc: 'Track tasks completed, hours saved, and approvals — so you can see the real business value your AI team delivers.' },
            { icon: Globe, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20',
              title: 'Pick Your AI Model', desc: 'Choose Claude or GPT-4 per employee. Use powerful models for complex thinking, fast models for routine tasks.' },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="card p-6 flex flex-col gap-4 hover:border-white/15 hover:-translate-y-0.5 transition-all">
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
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-white">Set up in a few minutes</h2>
            <p className="mt-3 text-slate-400">Sign up, hire an AI employee, assign a task — that's the whole setup.</p>
          </div>

          <div className="flex flex-col gap-6">
            {[
              { step: '01', title: 'Create your company', desc: 'Sign up and give your AI company a name. That\'s it — you\'re in.', time: '30 sec' },
              { step: '02', title: 'Hire AI employees', desc: 'Pick from 8+ role templates (or create a custom role). Choose their AI model — Claude Sonnet for deep work, Haiku for fast tasks.', time: '2 min' },
              { step: '03', title: 'Give them work', desc: 'Go to any employee\'s workspace and assign a task. They work autonomously and report back with results.', time: '1 min' },
              { step: '04', title: 'Review and scale', desc: 'Approve proposals, read reports, open a meeting room. Your AI company grows with you.', time: 'Ongoing' },
            ].map(({ step, title, desc, time }) => (
              <div key={step} className="flex gap-5 items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/5 text-sm font-bold text-accent">
                  {step}
                </div>
                <div className="flex-1 pt-2">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-white">{title}</h3>
                    <span className="text-xs text-slate-600 border border-white/5 rounded-full px-2 py-0.5">{time}</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white">What your AI team can do</h2>
          <p className="mt-3 text-slate-400">Real tasks. Real results.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { emoji: '🔍', title: 'Market Research', desc: 'Scan competitors, spot trends, score opportunities — delivered as a report' },
            { emoji: '✍️', title: 'Content & Copy', desc: 'Blog posts, email campaigns, product descriptions, social media' },
            { emoji: '📊', title: 'Business Analysis', desc: 'Financial summaries, weekly reports, KPI tracking, insights' },
            { emoji: '📧', title: 'Sales & Outreach', desc: 'Cold emails, follow-ups, pitch decks, lead qualification' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="card p-5 hover:border-white/15 hover:-translate-y-0.5 transition-all">
              <div className="mb-3 text-3xl">{emoji}</div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="border-t border-white/5 bg-white/[0.015] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Simple, honest pricing</h2>
          <p className="text-slate-400 mb-12">Start free. Upgrade when you're ready.</p>
          <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
            {/* Free */}
            <div className="card p-7 text-left">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Starter</p>
              <p className="text-4xl font-bold text-white mb-1">Free</p>
              <p className="text-sm text-slate-500 mb-6">Perfect to get started</p>
              <div className="flex flex-col gap-2.5 mb-8">
                {['1 company', '3 AI employees', 'All role templates', 'Meeting rooms', 'Proposal workflow'].map(f => (
                  <span key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle size={14} className="text-emerald-400 shrink-0" />{f}
                  </span>
                ))}
              </div>
              <button onClick={handleStart} className="w-full rounded-xl border border-white/10 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 transition-all">
                Sign in
              </button>
            </div>
            {/* Pro */}
            <div className="card p-7 text-left relative overflow-hidden"
                 style={{ borderColor: 'rgba(13,148,136,0.4)', background: 'rgba(13,148,136,0.05)' }}>
              <div className="absolute top-4 right-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white">COMING SOON</div>
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Pro</p>
              <p className="text-4xl font-bold text-white mb-1">$29<span className="text-lg font-normal text-slate-400">/mo</span></p>
              <p className="text-sm text-slate-500 mb-6">For serious founders</p>
              <div className="flex flex-col gap-2.5 mb-8">
                {['Unlimited companies', 'Unlimited AI employees', 'Priority AI processing', 'Custom AI models', 'Advanced analytics', 'Priority support'].map(f => (
                  <span key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle size={14} className="text-accent shrink-0" />{f}
                  </span>
                ))}
              </div>
              <button onClick={handleStart} className="w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-light transition-all">
                Get notified
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust signals ── */}
      <section className="border-t border-white/5 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', title: 'Secure by design', desc: 'Your API keys are encrypted at rest. JWT auth. No plaintext secrets stored.' },
              { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', title: '24/7 autonomous work', desc: 'Your AI team works around the clock on Render\'s infrastructure — even while you sleep.' },
              { icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', title: 'You stay in control', desc: 'Every significant decision goes through you. AI employees propose — you approve.' },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${bg}`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-white/5 py-24 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-64 w-64 rounded-full bg-accent/8 blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Stop doing everything yourself.
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Build your AI company today — free, no credit card, ready in minutes.
          </p>
          <button onClick={handleStart}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-10 py-4 text-sm font-semibold text-white shadow-xl shadow-accent/25 transition-all hover:bg-accent-light hover:-translate-y-0.5 mx-auto">
            Start for free
            <ArrowRight size={16} />
          </button>
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
            {['Free to start', 'No credit card required', 'Cancel anytime'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle size={11} className="text-emerald-500" />{t}
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
          <p className="text-xs text-slate-600">© 2026 1nexio. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-slate-500">
            <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Sign in</button>
            <button onClick={handleStart} className="hover:text-white transition-colors">Sign up</button>
          </div>
        </div>
      </footer>

    </div>
  )
}
