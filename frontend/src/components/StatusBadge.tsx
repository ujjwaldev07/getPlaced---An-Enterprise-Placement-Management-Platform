import { memo } from 'react'
import { humanizeStatus, statusTone } from '../lib/status'

const tones: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tones[statusTone(status)]}`}>
      {humanizeStatus(status)}
    </span>
  )
}

export default memo(StatusBadge)
