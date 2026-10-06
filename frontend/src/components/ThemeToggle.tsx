import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContextValue'

interface ThemeToggleProps {
  className?: string
  variant?: 'icon' | 'pill'
}

export default function ThemeToggle({ className = '', variant = 'icon' }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white ${className}`}
      >
        <span className="relative flex h-4 w-4 items-center justify-center">
          <motion.span
            initial={false}
            animate={{ scale: isDark ? 0 : 1, rotate: isDark ? 90 : 0, opacity: isDark ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="absolute"
          >
            <Sun size={15} className="text-amber-500" />
          </motion.span>
          <motion.span
            initial={false}
            animate={{ scale: isDark ? 1 : 0, rotate: isDark ? 0 : -90, opacity: isDark ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute"
          >
            <Moon size={15} className="text-emerald-400" />
          </motion.span>
        </span>
        <span>{isDark ? 'Dark mode' : 'Light mode'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur-md transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white ${className}`}
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <motion.span
          initial={false}
          animate={{ scale: isDark ? 0 : 1, rotate: isDark ? 90 : 0, opacity: isDark ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <Sun size={18} className="text-amber-500" />
        </motion.span>
        <motion.span
          initial={false}
          animate={{ scale: isDark ? 1 : 0, rotate: isDark ? 0 : -90, opacity: isDark ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <Moon size={18} className="text-emerald-400" />
        </motion.span>
      </span>
    </button>
  )
}
