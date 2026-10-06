import { useState, useId, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User as UserIcon,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContextValue'
import { getApiErrorMessage } from '../lib/api'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

interface AuthCardProps {
  mode: 'login' | 'signup'
}

type Role = 'user' | 'admin'

export function AuthCard({ mode }: AuthCardProps) {
  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<Role>('user')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string>('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  // Form fields
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    adminCode: '',
    course: '',
    graduationYear: '',
  })

  // Unique accessible IDs
  const idPrefix = useId()
  const nameId = `${idPrefix}-name`
  const emailId = `${idPrefix}-email`
  const passwordId = `${idPrefix}-password`
  const courseId = `${idPrefix}-course`
  const gradYearId = `${idPrefix}-gradYear`
  const adminCodeId = `${idPrefix}-adminCode`

  const handleRoleChange = (newRole: Role) => {
    if (newRole === role) return
    setRole(newRole)
    setError('')
    setFieldErrors({})
    // Clean up irrelevant values when switching roles
    setForm((prev) => ({
      ...prev,
      adminCode: newRole === 'admin' ? prev.adminCode : '',
      course: newRole === 'user' ? prev.course : '',
      graduationYear: newRole === 'user' ? prev.graduationYear : '',
    }))
  }

  const handleLoginAs = (newRole: Role) => {
    if (newRole === role) return
    setRole(newRole)
    setError('')
    setFieldErrors({})
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}

    if (mode === 'signup') {
      if (!form.name.trim() || form.name.trim().length < 2) {
        errors.name = 'Please enter your full name (at least 2 characters).'
      }
    }

    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address.'
    }

    if (!form.password || form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.'
    }

    if (mode === 'signup') {
      if (role === 'user') {
        if (!form.course.trim()) {
          errors.course = 'Please specify your degree or course (e.g. B.Tech CSE).'
        }
        const gradYear = Number(form.graduationYear)
        if (!form.graduationYear || isNaN(gradYear) || gradYear < 2020 || gradYear > 2035) {
          errors.graduationYear = 'Enter a valid graduation year (e.g. 2026).'
        }
      } else if (role === 'admin') {
        if (!form.adminCode.trim()) {
          errors.adminCode = 'Admin invite authorization code is required.'
        }
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validate()) {
      return
    }

    setBusy(true)

    try {
      if (mode === 'login') {
        const loggedInUser = await login(form.email.trim(), form.password)
        if (loggedInUser.role !== role) {
          setError(
            role === 'admin'
              ? 'This account is not registered as an admin. Please check your credentials or switch to Student login.'
              : 'This account is not registered as a student. Please check your credentials or switch to Admin login.',
          )
          return
        }
        navigate(loggedInUser.role === 'admin' ? '/admin/dashboard' : '/app/dashboard')
      } else {
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role,
        }

        if (role === 'user') {
          payload.course = form.course.trim()
          payload.graduationYear = Number(form.graduationYear)
        } else {
          payload.adminCode = form.adminCode.trim()
        }

        const newUser = await signup(payload)
        navigate(newUser.role === 'admin' ? '/admin/dashboard' : '/app/dashboard')
      }
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err)
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr] bg-[#f8fafc] dark:bg-[#070e17] transition-colors duration-200">
      {/* Left Column: Brand Hero (Desktop) */}
      <div className="mesh-brand hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between relative overflow-hidden border-r border-white/5">
        <div className="relative z-10">
          <Link to="/" className="inline-block transition-opacity hover:opacity-90">
            <Logo />
          </Link>
        </div>

        <div className="relative z-10 max-w-xl py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
            <Sparkles size={13} />
            <span>Campus Placement Infrastructure</span>
          </div>

          <h1 className="mt-6 text-4xl xl:text-5xl font-black leading-tight tracking-tight text-white">
            From first application to <span className="text-emerald-400">final job offer</span> with clarity.
          </h1>

          <p className="mt-5 text-base leading-relaxed text-slate-400">
            A unified management portal built for graduating students seeking dream careers and placement officers coordinating company drives.
          </p>

          <div className="mt-10 space-y-3.5">
            {[
              {
                title: 'Structured Placement Drives',
                desc: 'Browse eligibility, compensation packages, and drive timelines without scattered spreadsheets.',
              },
              {
                title: 'Dedicated Portals for Students & Admins',
                desc: 'Tailored permissions ensuring confidential student records and streamlined admin workflows.',
              },
              {
                title: 'Live Application Tracking',
                desc: 'Real-time updates across Shortlisted, Technical Interview, and Selected statuses.',
              },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={13} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{feature.title}</p>
                  <p className="text-xs text-slate-400 leading-normal">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-500">
          <span>getPlaced • Enterprise Placement System</span>
          <span className="text-emerald-500 font-semibold">2026 Edition</span>
        </div>
      </div>

      {/* Right Column: Auth Form Card */}
      <div className="grid place-items-center p-4 sm:p-8 lg:p-12 relative overflow-y-auto">
        {/* Top Floating Controls */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3 z-20">
          <ThemeToggle />
          <Link
            to="/"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
          >
            Back to Home
          </Link>
        </div>

        <div className="w-full max-w-lg my-auto py-6">
          {/* Mobile Logo Header */}
          <div className="mb-6 lg:hidden flex items-center justify-between">
            <Logo />
          </div>

          {/* Glass Auth Card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="glass-card p-6 sm:p-9 shadow-xl border border-slate-200/90 dark:border-white/10"
          >
            {/* Header info */}
            <div>
              <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start your journey'}</p>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {mode === 'login' ? 'Login to getPlaced' : 'Create your account'}
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {mode === 'login'
                  ? 'Access your placement dashboard and continue where you left off.'
                  : 'Select your account type and get started in seconds.'}
              </p>
            </div>

            {/* Role Switcher (Login) */}
            {mode === 'login' && (
              <div className="mt-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Login as
                </label>
                <div
                  role="tablist"
                  aria-label="Login role"
                  className="grid grid-cols-2 rounded-2xl bg-slate-200/60 p-1.5 dark:bg-white/[0.08]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={role === 'user'}
                    onClick={() => handleLoginAs('user')}
                    className={`relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                      role === 'user'
                        ? 'bg-white text-slate-950 shadow-md dark:bg-slate-900 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <GraduationCap size={16} className={role === 'user' ? 'text-emerald-500' : ''} />
                    <span>Student</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={role === 'admin'}
                    onClick={() => handleLoginAs('admin')}
                    className={`relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                      role === 'admin'
                        ? 'bg-white text-slate-950 shadow-md dark:bg-slate-900 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Building2 size={16} className={role === 'admin' ? 'text-emerald-500' : ''} />
                    <span>Admin</span>
                  </button>
                </div>
              </div>
            )}

            {/* Role Switcher (Sign Up only) */}
            {mode === 'signup' && (
              <div className="mt-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Select Role Portal
                </label>
                <div
                  role="tablist"
                  aria-label="Account type"
                  className="grid grid-cols-2 rounded-2xl bg-slate-200/60 p-1.5 dark:bg-white/[0.08]"
                >
                  <button
                    type="button"
                    role="tab"
                    id="tab-student"
                    aria-selected={role === 'user'}
                    aria-controls="panel-student"
                    onClick={() => handleRoleChange('user')}
                    className={`relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                      role === 'user'
                        ? 'bg-white text-slate-950 shadow-md dark:bg-slate-900 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <GraduationCap size={16} className={role === 'user' ? 'text-emerald-500' : ''} />
                    <span>Student Portal</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="tab-admin"
                    aria-selected={role === 'admin'}
                    aria-controls="panel-admin"
                    onClick={() => handleRoleChange('admin')}
                    className={`relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                      role === 'admin'
                        ? 'bg-white text-slate-950 shadow-md dark:bg-slate-900 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Building2 size={16} className={role === 'admin' ? 'text-emerald-500' : ''} />
                    <span>Admin Portal</span>
                  </button>
                </div>

                {/* Role Description Badge */}
                <div className="mt-3 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-600 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-400">
                  {role === 'user' ? (
                    <span className="flex items-center gap-1.5 font-medium">
                      <GraduationCap size={14} className="text-emerald-500 shrink-0" />
                      For students looking for campus placement drives and opportunities.
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck size={14} className="shrink-0" />
                      For placement officers & coordinators. Requires invite code.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-400"
              >
                <AlertCircle size={18} className="shrink-0 text-rose-500 mt-0.5" />
                <p className="leading-snug">{error}</p>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {/* Full Name (Sign Up only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor={nameId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-emerald-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <UserIcon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id={nameId}
                      required
                      type="text"
                      autoComplete="name"
                      disabled={busy}
                      aria-invalid={!!fieldErrors.name}
                      aria-describedby={fieldErrors.name ? `${nameId}-error` : undefined}
                      className={`input pl-10 ${fieldErrors.name ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/15' : ''}`}
                      value={form.name}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value })
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' })
                      }}
                      placeholder="Rahul Sharma"
                    />
                  </div>
                  {fieldErrors.name && (
                    <p id={`${nameId}-error`} className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>
              )}

              {/* Email Address */}
              <div>
                <label htmlFor={emailId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Email Address <span className="text-emerald-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id={emailId}
                    required
                    type="email"
                    autoComplete="email"
                    disabled={busy}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
                    className={`input pl-10 ${fieldErrors.email ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/15' : ''}`}
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value })
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' })
                    }}
                    placeholder="student@university.edu"
                  />
                </div>
                {fieldErrors.email && (
                  <p id={`${emailId}-error`} className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Dynamic Role Fields (Sign Up only) */}
              {mode === 'signup' && (
                <AnimatePresence mode="wait">
                  {role === 'user' ? (
                    /* STUDENT FIELDS: Course & Graduation Year */
                    <motion.div
                      key="student-fields"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      <div>
                        <label htmlFor={courseId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Course / Branch <span className="text-emerald-500">*</span>
                        </label>
                        <input
                          id={courseId}
                          required
                          type="text"
                          disabled={busy}
                          aria-invalid={!!fieldErrors.course}
                          aria-describedby={fieldErrors.course ? `${courseId}-error` : undefined}
                          className={`input mt-1.5 ${fieldErrors.course ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/15' : ''}`}
                          value={form.course}
                          onChange={(e) => {
                            setForm({ ...form, course: e.target.value })
                            if (fieldErrors.course) setFieldErrors({ ...fieldErrors, course: '' })
                          }}
                          placeholder="B.Tech CSE"
                        />
                        {fieldErrors.course && (
                          <p id={`${courseId}-error`} className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                            {fieldErrors.course}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor={gradYearId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Graduation Year <span className="text-emerald-500">*</span>
                        </label>
                        <input
                          id={gradYearId}
                          required
                          type="number"
                          min={2020}
                          max={2035}
                          disabled={busy}
                          aria-invalid={!!fieldErrors.graduationYear}
                          aria-describedby={fieldErrors.graduationYear ? `${gradYearId}-error` : undefined}
                          className={`input mt-1.5 ${fieldErrors.graduationYear ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/15' : ''}`}
                          value={form.graduationYear}
                          onChange={(e) => {
                            setForm({ ...form, graduationYear: e.target.value })
                            if (fieldErrors.graduationYear) setFieldErrors({ ...fieldErrors, graduationYear: '' })
                          }}
                          placeholder="2026"
                        />
                        {fieldErrors.graduationYear && (
                          <p id={`${gradYearId}-error`} className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                            {fieldErrors.graduationYear}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    /* ADMIN FIELD: Admin Invite Code (Course and Grad Year MUST NOT appear) */
                    <motion.div
                      key="admin-fields"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      <label htmlFor={adminCodeId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Admin Invite Code <span className="text-emerald-500">*</span>
                      </label>
                      <div className="relative mt-1.5">
                        <KeyRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                        <input
                          id={adminCodeId}
                          required
                          type="text"
                          disabled={busy}
                          aria-invalid={!!fieldErrors.adminCode}
                          aria-describedby={fieldErrors.adminCode ? `${adminCodeId}-error` : undefined}
                          className={`input pl-10 font-mono tracking-wider ${fieldErrors.adminCode ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/15' : ''}`}
                          value={form.adminCode}
                          onChange={(e) => {
                            setForm({ ...form, adminCode: e.target.value })
                            if (fieldErrors.adminCode) setFieldErrors({ ...fieldErrors, adminCode: '' })
                          }}
                          placeholder="Enter Admin Invite Code"
                        />
                      </div>
                      {fieldErrors.adminCode ? (
                        <p id={`${adminCodeId}-error`} className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                          {fieldErrors.adminCode}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          Enter the secure invitation code provided by your institution.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {/* Password */}
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor={passwordId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Password <span className="text-emerald-500">*</span>
                  </label>
                  {mode === 'login' && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Minimum 8 characters
                    </span>
                  )}
                </div>
                <div className="relative mt-1.5">
                  <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id={passwordId}
                    required
                    minLength={8}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    disabled={busy}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? `${passwordId}-error` : undefined}
                    className={`input pl-10 pr-11 ${fieldErrors.password ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/15' : ''}`}
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value })
                      if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' })
                    }}
                    placeholder={mode === 'login' ? '••••••••' : 'At least 8 characters'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id={`${passwordId}-error`} className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Submit CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary w-full py-3.5 text-sm font-bold shadow-emerald-500/25 transition-all"
                >
                   {busy ? (
                     <>
                       <Loader2 size={17} className="animate-spin" />
                       <span>
                         {mode === 'login'
                           ? 'Logging in...'
                           : role === 'admin'
                           ? 'Creating admin account...'
                           : 'Creating student account...'}
                       </span>
                     </>
                   ) : (
                     <>
                       <span>
                         {mode === 'login'
                           ? role === 'admin'
                             ? 'Login as Admin'
                             : 'Login as Student'
                           : role === 'admin'
                           ? 'Complete Admin Registration'
                           : 'Create Student Account'}
                       </span>
                       <ArrowRight size={16} />
                     </>
                   )}
                </button>
              </div>
            </form>

            {/* Switch between Login and Signup */}
            <div className="mt-6 border-t border-slate-200/80 dark:border-white/10 pt-5 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {mode === 'login' ? "Don't have an account yet?" : 'Already registered with getPlaced?'}{' '}
              <Link
                to={mode === 'login' ? '/signup' : '/login'}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition"
              >
                {mode === 'login' ? 'Create an account' : 'Login here'}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  return <AuthCard mode="login" />
}

export function SignupPage() {
  return <AuthCard mode="signup" />
}
