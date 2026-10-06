import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, Building2, CheckCircle2, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

export default function Landing() {
  return (
    <div className="mesh min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900 transition-colors duration-200 dark:bg-[#070e17] dark:text-white">
      {/* Navigation */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-400 md:flex">
          <a href="#features" className="transition hover:text-emerald-500">Features</a>
          <a href="#security" className="transition hover:text-emerald-500">Security</a>
          <a href="#workflow" className="transition hover:text-emerald-500">Workflow</a>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login" className="btn-secondary px-4 py-2.5 text-xs sm:text-sm">
            Login
          </Link>
          <Link to="/signup" className="btn-primary px-4 py-2.5 text-xs sm:text-sm">
            Get Started <ArrowRight size={15} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pt-16">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <Sparkles size={14} /> Smart Placement Management SaaS
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl text-slate-950 dark:text-white"
          >
            Turn campus hiring into a <span className="text-emerald-500">seamless journey.</span>
          </motion.h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
            getPlaced connects college placement cells, graduating students, and top recruiters in one intelligent workspace — from company drives to final selection offers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="btn-primary px-6 py-3.5 text-sm">
              Create student or admin account <ArrowRight size={17} />
            </Link>
            <Link to="/login" className="btn-secondary px-6 py-3.5 text-sm">
              Login to Portal
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-5 text-xs font-semibold text-slate-600 dark:text-slate-400 sm:text-sm">
            {['JWT Secured Sessions', 'Role-Based Dashboards', 'Real-Time Drive Tracking'].map((badge) => (
              <span key={badge} className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard Preview Graphic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          <div className="absolute -inset-6 rounded-[3rem] bg-emerald-500/10 blur-2xl dark:bg-emerald-500/5" />
          <div className="glass-card relative border border-slate-200/80 p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-slate-950/80">
            <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-inner">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Placement Portal</p>
                  <p className="mt-0.5 text-base font-bold text-white">Student Command Center</p>
                </div>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/25">
                  <BarChart3 size={16} />
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Available Drives', val: '12', change: '+3 new' },
                  { label: 'Applications', val: '5', change: 'In review' },
                  { label: 'Shortlisted', val: '2', change: '40% rate' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-white/[0.06] p-3 border border-white/5">
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                    <p className="mt-1 text-lg font-black text-white">{item.val}</p>
                    <p className="mt-0.5 text-[10px] text-emerald-400 font-semibold">{item.change}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-white/[0.04] p-3.5 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Application Velocity</span>
                  <span className="font-semibold text-emerald-400">+24% vs last week</span>
                </div>
                <div className="mt-4 flex h-24 items-end gap-1.5 sm:gap-2">
                  {[32, 50, 42, 65, 55, 80, 68, 92, 75, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all hover:opacity-100 opacity-80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow">Enterprise Placement Ops</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            Built specifically for college placement workflows.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [Users, 'Student Portal', 'Browse company drives, track application pipeline stages, interview schedules and placement offers.'],
            [Building2, 'Admin Console', 'Publish placement drives, review student profiles, manage company partnerships, and announce updates.'],
            [BarChart3, 'Actionable Analytics', 'Monitor conversion rates, drive participation velocity, and departmental placement statistics.'],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Users
            return (
              <div key={title as string} className="glass-card p-6 transition-all hover:-translate-y-1">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <I size={22} />
                </span>
                <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{title as string}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{text as string}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Security Banner */}
      <section id="security" className="border-y border-slate-200/80 bg-white/40 py-14 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-5 sm:px-8 md:flex-row md:items-center">
          <div>
            <p className="eyebrow">Security by Default</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              Strict authentication and role protection.
            </h2>
          </div>
          <div className="flex flex-wrap gap-6 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" size={18} />
              Bcrypt Password Hashing
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" size={18} />
              JWT Authorization & HttpOnly Cookies
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" size={18} />
              Server-Validated Admin Invite Codes
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:px-8">
        <span>© 2026 getPlaced. All rights reserved.</span>
        <span>Smart Placement Management Platform</span>
      </footer>
    </div>
  )
}
