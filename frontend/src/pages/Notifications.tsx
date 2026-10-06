import { useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../lib/api'
import EmptyState from '../components/EmptyState'
import Toast from '../components/Toast'
import { Bell, Briefcase, CalendarDays, CheckCheck, Award, XCircle, Loader2 } from 'lucide-react'

interface NotificationItem {
  _id: string
  type?: string
  title: string
  message: string
  read: boolean
  isRead?: boolean
  createdAt: string
}

function getTypeStyle(type?: string) {
  const t = (type || '').toUpperCase()
  if (t.includes('APPLICATION') || t.includes('ANNOUNCEMENT'))
    return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', Icon: Briefcase, accent: 'bg-emerald-500' }
  if (t.includes('INTERVIEW'))
    return { bg: 'bg-sky-500/10', text: 'text-sky-500', Icon: CalendarDays, accent: 'bg-sky-500' }
  if (t.includes('SELECTED'))
    return { bg: 'bg-amber-500/10', text: 'text-amber-500', Icon: Award, accent: 'bg-amber-500' }
  if (t.includes('REJECTED') || t.includes('CANCELLED'))
    return { bg: 'bg-rose-500/10', text: 'text-rose-500', Icon: XCircle, accent: 'bg-rose-500' }
  return { bg: 'bg-slate-500/10', text: 'text-slate-500', Icon: Bell, accent: 'bg-slate-400' }
}

function dispatchRefresh() {
  window.dispatchEvent(new CustomEvent('getplaced:notifications_updated'))
}

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [toast, setToast] = useState<{ message: string; error?: boolean }>({ message: '' })
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications')
      setItems(data.notifications || [])
    } catch (e: unknown) {
      setToast({ message: getApiErrorMessage(e, 'Failed to load notifications'), error: true })
      setTimeout(() => setToast({ message: '' }), 2500)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void fetchNotifications(), 0)
    return () => clearTimeout(timer)
  }, [])

  const unreadCount = items.filter((n) => !(n.isRead ?? n.read)).length

  const markAllRead = async () => {
    if (markingAll || unreadCount === 0) return
    setMarkingAll(true)
    try {
      await api.post('/notifications/read-all')
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })))
      setToast({ message: 'All notifications marked as read' })
      dispatchRefresh()
    } catch (e: unknown) {
      setToast({ message: getApiErrorMessage(e, 'Failed to mark as read'), error: true })
    } finally {
      setMarkingAll(false)
      setTimeout(() => setToast({ message: '' }), 2500)
    }
  }

  const markOneRead = async (n: NotificationItem) => {
    const isRead = n.isRead ?? n.read
    if (isRead || busyIds.has(n._id)) return
    setBusyIds((prev) => new Set(prev).add(n._id))
    try {
      await api.patch(`/notifications/${n._id}/read`)
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true, read: true } : x)))
      dispatchRefresh()
    } catch (e: unknown) {
      setToast({ message: getApiErrorMessage(e, 'Failed to mark as read'), error: true })
      setTimeout(() => setToast({ message: '' }), 2500)
    } finally {
      setBusyIds((prev) => {
        const s = new Set(prev)
        s.delete(n._id)
        return s
      })
    }
  }

  const Skeleton = () => (
    <div className="glass-card flex gap-4 p-5">
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Stay updated</p>
          <h1 className="mt-1 text-3xl font-black">Notifications</h1>
          <p className="mt-2 text-sm text-slate-500">
            Application updates, interview reminders and announcements.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="shrink-0 text-sm font-semibold text-slate-600 transition hover:text-slate-900 disabled:opacity-50 dark:text-slate-300 dark:hover:text-white"
          >
            {markingAll ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="animate-spin" size={14} />
                Marking…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <CheckCheck size={14} />
                Mark all as read
              </span>
            )}
          </button>
        )}
      </div>

      {!loading && unreadCount > 0 && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
            {unreadCount} unread
          </span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          text="New application updates, interviews and placement announcements will appear here."
        />
      ) : (
        <div className="space-y-3">
          {items.map((n) => {
            const isRead = n.isRead ?? n.read
            const style = getTypeStyle(n.type)
            const Icon = style.Icon
            const busy = busyIds.has(n._id)
            return (
              <button
                key={n._id}
                onClick={() => markOneRead(n)}
                disabled={busy}
                className={`glass-card relative flex w-full gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                  !isRead ? 'ring-1 ring-slate-200 dark:ring-white/10' : ''
                }`}
              >
                <div
                  className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${
                    isRead ? 'bg-transparent' : style.accent
                  }`}
                />
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${style.bg} ${style.text}`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`truncate ${!isRead ? 'font-extrabold' : 'font-bold'}`}>
                      {n.title}
                    </h3>
                    <p className="shrink-0 text-[11px] text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      ·{' '}
                      {new Date(n.createdAt).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{n.message}</p>
                </div>
                {!isRead && (
                  <span className={`mt-1.5 grid h-2.5 w-2.5 shrink-0 place-items-center rounded-full ${style.accent}`} />
                )}
              </button>
            )
          })}
        </div>
      )}

      {toast.message && <Toast message={toast.message} error={toast.error} />}
    </div>
  )
}
