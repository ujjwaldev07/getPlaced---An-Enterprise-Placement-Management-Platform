import type { ReactNode } from 'react'
import { SearchX } from 'lucide-react'

export default function EmptyState({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="glass-card flex flex-col items-center justify-center p-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/10">
        <SearchX />
      </span>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
