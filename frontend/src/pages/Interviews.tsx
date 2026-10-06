import { useEffect, useMemo, useState } from 'react'
import { api, getApiErrorMessage } from '../lib/api'
import type { Interview } from '../types'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'
import { CalendarDays, Video, MapPin, Clock, VideoIcon, ChevronRight, CircleCheck, CircleX, AlertCircle } from 'lucide-react'

const resultTones: Record<string, string> = {
  PASSED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  FAILED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  PENDING: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
}

const resultIcon = (r?: string) => {
  if (r === 'PASSED') return <CircleCheck size={13} />
  if (r === 'FAILED') return <CircleX size={13} />
  return <AlertCircle size={13} />
}

const getScheduledDate = (x: Interview) => new Date(x.scheduledAt || x.date)

const isUpcoming = (x: Interview) => {
  const future = getScheduledDate(x).getTime() > Date.now()
  const s = (x.status || '').toUpperCase()
  return (s === 'SCHEDULED' || s === 'RESCHEDULED') && future
}

const isPast = (x: Interview) => {
  const s = (x.status || '').toUpperCase()
  if (s === 'COMPLETED' || s === 'CANCELLED' || s === 'NO_SHOW') return true
  return getScheduledDate(x).getTime() <= Date.now()
}

const modeBadge = (mode?: string) => {
  const m = (mode || '').toUpperCase()
  if (m === 'ONLINE') return 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
  if (m === 'OFFLINE') return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  return 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
}

export default function Interviews() {
  const [items, setItems] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null)

  useEffect(() => {
    api.get('/interviews/me')
      .then(r => setItems(r.data.interviews || []))
      .catch(e => setToast({ message: getApiErrorMessage(e), error: true }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const upcoming = useMemo(() => items.filter(isUpcoming).sort((a, b) => getScheduledDate(a).getTime() - getScheduledDate(b).getTime()), [items])
  const past = useMemo(() => items.filter(isPast).sort((a, b) => getScheduledDate(b).getTime() - getScheduledDate(a).getTime()), [items])

  const renderCard = (x: Interview, pastView: boolean) => {
    const dateObj = getScheduledDate(x)
    const dateStr = dateObj.toLocaleDateString()
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const isOnline = (x.mode || '').toUpperCase() === 'ONLINE'
    const resultUpper = (x.result || 'PENDING').toUpperCase()

    return (
      <div key={x._id} className="glass-card overflow-hidden p-5">
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${pastView ? 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/60' : 'bg-emerald-500/10 text-emerald-500'}`}>
            <CalendarDays />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black truncate">{x.company}</h3>
              <StatusBadge status={x.status} />
              {pastView && (
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${resultTones[resultUpper] || resultTones.PENDING}`}>
                  {resultIcon(resultUpper)}
                  {resultUpper.charAt(0) + resultUpper.slice(1).toLowerCase()}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500 truncate">
              {x.role}{x.roundName ? ` • ${x.roundName}` : ''}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <CalendarDays size={16} className="mt-0.5 shrink-0 text-indigo-500" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date &amp; Time</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{dateStr}</p>
              <p className="text-xs text-slate-500">{timeStr}</p>
            </div>
          </div>

          {x.duration && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
              <Clock size={16} className="mt-0.5 shrink-0 text-sky-500" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Duration</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{x.duration} min</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <Video size={16} className={`mt-0.5 shrink-0 ${isOnline ? 'text-sky-500' : 'text-amber-500'}`} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mode</p>
              <span className={`mt-0.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${modeBadge(x.mode)}`}>
                {x.mode || '—'}
              </span>
            </div>
          </div>

          {isOnline ? (
            <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
              <VideoIcon size={16} className="mt-0.5 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Meeting Link</p>
                {x.meetingLink || x.link ? (
                  <a
                    href={x.meetingLink || x.link!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:underline truncate max-w-full dark:text-sky-400"
                  >
                    Open link
                    <ChevronRight size={14} />
                  </a>
                ) : (
                  <p className="mt-0.5 text-sm text-slate-400">Not available</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-700 truncate dark:text-slate-200">{x.location || '—'}</p>
              </div>
            </div>
          )}
        </div>

        {x.instructions && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Instructions</p>
            <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap dark:text-slate-300">{x.instructions}</p>
          </div>
        )}

        {pastView && x.feedback && (
          <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-500/20 dark:bg-indigo-500/10">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Feedback</p>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap dark:text-slate-200">{x.feedback}</p>
          </div>
        )}

        {!pastView && isOnline && (x.meetingLink || x.link) && (
          <a
            href={x.meetingLink || x.link!}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-5 w-full inline-flex items-center justify-center gap-2"
          >
            <VideoIcon size={16} />
            Join Interview
          </a>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow">Next steps</p>
        <h1 className="mt-1 text-3xl font-black">Interviews</h1>
        <p className="mt-2 text-sm text-slate-500">Never miss an interview milestone.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-slate-200 dark:bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-2/3 bg-slate-200 dark:bg-white/10 rounded" />
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-white/10 rounded" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="h-20 rounded-2xl bg-slate-200 dark:bg-white/10" />
                <div className="h-20 rounded-2xl bg-slate-200 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-lg font-black">Upcoming Interviews</h2>
              {upcoming.length > 0 && (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {upcoming.length}
                </span>
              )}
            </div>
            {upcoming.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {upcoming.map(x => renderCard(x, false))}
              </div>
            ) : (
              <EmptyState
                title="No upcoming interviews"
                text="Your scheduled interviews will appear here."
              />
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-lg font-black">Past Interviews</h2>
              {past.length > 0 && (
                <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                  {past.length}
                </span>
              )}
            </div>
            {past.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {past.map(x => renderCard(x, true))}
              </div>
            ) : (
              <EmptyState
                title="No past interviews"
                text="No past interviews yet."
              />
            )}
          </section>
        </div>
      )}

      {toast && <Toast message={toast.message} error={toast.error} />}
    </div>
  )
}
