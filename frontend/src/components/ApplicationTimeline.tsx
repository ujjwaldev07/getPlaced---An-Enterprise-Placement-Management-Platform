import { CheckCircle2, XCircle, Circle } from 'lucide-react'

type Step = {
  key: string
  label: string
  skipIfRejected?: boolean
}

const STEPS: Step[] = [
  { key: 'APPLIED', label: 'Applied' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'INTERVIEW_SCHEDULED', label: 'Interview' },
  { key: 'INTERVIEWED', label: 'Interviewed' },
  { key: 'SELECTED', label: 'Selected' },
]

const REJECTABLE_STATES = new Set(['REJECTED', 'WITHDRAWN'])

export default function ApplicationTimeline({
  status,
  className = '',
}: {
  status: string
  className?: string
}) {
  const current = (status || 'APPLIED').toUpperCase()
  const isRejected = REJECTABLE_STATES.has(current)

  const currentIndex = STEPS.findIndex((s) => s.key === current)

  return (
    <div className={`${className}`}>
      <ol className="flex flex-wrap items-start gap-x-3 gap-y-3 sm:flex-nowrap sm:gap-x-0">
        {STEPS.map((step, i) => {
          const reached = currentIndex === -1 ? false : i <= currentIndex
          const isCurrent = step.key === current
          const hiddenByReject = isRejected && !reached && i > 1

          let icon = <Circle size={16} className="text-slate-300 dark:text-white/20" />
          let iconWrap = 'bg-slate-100 dark:bg-white/5'
          let textColor = 'text-slate-400 dark:text-white/40'

          if (reached) {
            icon = <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            iconWrap = 'bg-emerald-500/10'
            textColor = 'text-emerald-700 dark:text-emerald-300'
          }
          if (isCurrent && i === currentIndex && isRejected === false) {
            iconWrap = 'bg-sky-500/10 ring-2 ring-sky-500/40'
          }

          if (hiddenByReject) {
            textColor = 'text-slate-300 dark:text-white/20'
          }

          return (
            <li
              key={step.key}
              className="relative flex min-w-0 flex-1 flex-col items-center text-center sm:items-start"
            >
              <div className="flex w-full items-center sm:items-start">
                <span className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${iconWrap}`}>
                  {icon}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className="mx-1 my-auto h-0.5 flex-1 sm:mx-2"
                    style={{
                      backgroundColor:
                        reached && !(isRejected && i === currentIndex)
                          ? 'var(--success)'
                          : 'var(--border)',
                      opacity: reached ? 1 : 0.7,
                    }}
                  />
                )}
              </div>
              <p className={`mt-1.5 text-[11px] font-semibold sm:text-xs ${textColor}`}>
                {step.label}
              </p>
            </li>
          )
        })}
      </ol>

      {isRejected && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-500/10 px-3.5 py-2 text-sm font-bold text-rose-600 dark:text-rose-400">
          <XCircle size={16} />
          {current === 'WITHDRAWN' ? 'Application withdrawn' : 'Application rejected'}
        </div>
      )}
    </div>
  )
}

