import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  index = 0,
}: {
  label: string
  value: string | number
  hint: string
  icon: LucideIcon
  index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="glass-card p-5 border border-slate-200/80 dark:border-white/10"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Icon size={20} />
        </span>
      </div>
    </motion.div>
  )
}
