import { useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../lib/api'
import type { Application } from '../types'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import ApplicationTimeline from '../components/ApplicationTimeline'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import { openResume } from '../lib/resume'
import { Link } from 'react-router-dom'
import { Eye, Download, ArrowRight, Calendar, Briefcase, FileText } from 'lucide-react'

export default function Applications() {
  const [items, setItems] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null)
  const [withdrawId, setWithdrawId] = useState<string | null>(null)
  const [withdrawBusy, setWithdrawBusy] = useState(false)

  useEffect(() => {
    api.get('/applications/me')
      .then(r => setItems(r.data.applications || []))
      .catch(e => setToast({ message: getApiErrorMessage(e), error: true }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const confirmWithdraw = () => {
    if (!withdrawId) return
    setWithdrawBusy(true)
    api.patch(`/applications/${withdrawId}/withdraw`)
      .then(() => {
        setItems(prev => prev.map(a => a._id === withdrawId ? { ...a, status: 'WITHDRAWN' } : a))
        window.dispatchEvent(new CustomEvent('getplaced:notifications_updated'))
        setToast({ message: 'Application withdrawn successfully.' })
        setWithdrawId(null)
      })
      .catch(e => setToast({ message: getApiErrorMessage(e), error: true }))
      .finally(() => setWithdrawBusy(false))
  }

  const canWithdraw = (status: string) =>
    status === 'APPLIED' || status === 'UNDER_REVIEW'

  const driveInfo = (a: Application) => {
    const d = a.drive
    if (!d || typeof d === 'string') return null
    return d
  }

  const resumeInfo = (a: Application) => {
    if (!a.resume) return null
    if (typeof a.resume === 'string') return { id: a.resume, originalName: 'Resume' }
    return { id: a.resume.id, originalName: a.resume.originalName }
  }

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow">Your pipeline</p>
        <h1 className="mt-1 text-3xl font-black">My Applications</h1>
        <p className="mt-2 text-sm text-slate-500">Track every application from submission to decision.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 w-1/3 bg-slate-200 dark:bg-white/10 rounded" />
              <div className="mt-2 h-4 w-1/4 bg-slate-200 dark:bg-white/10 rounded" />
              <div className="mt-6 h-16 bg-slate-200 dark:bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : items.length ? (
        <div className="space-y-4">
          {items.map(a => {
            const d = driveInfo(a)
            const r = resumeInfo(a)
            return (
              <div key={a._id} className="glass-card overflow-hidden p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-500/10 text-sky-500">
                        <Briefcase size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-lg truncate">{d?.company || 'Placement Drive'}</h3>
                          <StatusBadge status={a.status} />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {d?.title || d?.jobTitle || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={14} />
                        Applied {new Date(a.appliedAt).toLocaleDateString()}
                      </span>
                      {d?.deadline && (
                        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                          <ArrowRight size={14} />
                          Drive deadline: {new Date(d.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="mt-5">
                      <ApplicationTimeline status={a.status} />
                    </div>

                    {r && (
                      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500">
                            <FileText size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{r.originalName}</p>
                            <p className="text-xs text-slate-500">Attached resume</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white/10 dark:text-white dark:ring-white/10 dark:hover:bg-white/15"
                            onClick={() => openResume(r.id, false)}
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700"
                            onClick={() => openResume(r.id, true)}
                          >
                            <Download size={14} />
                            Download
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {canWithdraw(a.status) && (
                    <div className="sm:shrink-0 sm:ml-4">
                      <button
                        className="btn-primary w-full bg-rose-600 hover:bg-rose-700 sm:w-auto"
                        onClick={() => setWithdrawId(a._id)}
                      >
                        Withdraw
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title="No applications yet"
          text="Explore placement drives and apply to opportunities that match your profile."
          action={
            <Link to="/app/drives" className="btn-primary inline-flex items-center gap-2">
              Browse Drives
              <ArrowRight size={16} />
            </Link>
          }
        />
      )}

      <ConfirmDialog
        open={!!withdrawId}
        title="Withdraw application"
        text="Are you sure you want to withdraw this application? This action cannot be undone."
        confirmLabel="Withdraw"
        danger
        busy={withdrawBusy}
        onClose={() => !withdrawBusy && setWithdrawId(null)}
        onConfirm={confirmWithdraw}
      />

      {toast && <Toast message={toast.message} error={toast.error} />}
    </div>
  )
}
