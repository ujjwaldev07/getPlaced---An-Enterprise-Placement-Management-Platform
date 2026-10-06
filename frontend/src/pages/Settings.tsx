import { useTheme } from '../context/ThemeContextValue'
import ThemeToggle from '../components/ThemeToggle'
import { Bell, Moon, Shield, Sun } from 'lucide-react'

export default function SettingsPage() {
  const { setTheme, isDark } = useTheme()

  return (
    <div className="max-w-3xl">
      <div className="mb-7">
        <p className="eyebrow">Preferences</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Manage your interface appearance and notifications.
        </p>
      </div>

      <div className="space-y-5">
        {/* Appearance Card */}
        <div className="glass-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Interface Theme</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Choose light, dark, or toggle between them.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all ${
                  !isDark
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300'
                }`}
              >
                <Sun size={15} /> Light
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all ${
                  isDark
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300'
                }`}
              >
                <Moon size={15} /> Dark
              </button>
              <ThemeToggle className="ml-1" />
            </div>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Bell size={18} className="text-emerald-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Notification Preferences
            </h3>
          </div>
          <div className="space-y-3 text-sm">
            <label className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-100/70 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Application status updates
              </span>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded text-emerald-500 focus:ring-emerald-500/20"
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-100/70 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Interview and assessment reminders
              </span>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded text-emerald-500 focus:ring-emerald-500/20"
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-100/70 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                New placement drive announcements
              </span>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded text-emerald-500 focus:ring-emerald-500/20"
              />
            </label>
          </div>
        </div>

        {/* Security / Session Info */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2.5 mb-2">
            <Shield size={18} className="text-emerald-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Security & Sessions
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Authentication sessions are protected using secure JSON Web Tokens with automatic refresh and expiry handling.
          </p>
        </div>
      </div>
    </div>
  )
}
