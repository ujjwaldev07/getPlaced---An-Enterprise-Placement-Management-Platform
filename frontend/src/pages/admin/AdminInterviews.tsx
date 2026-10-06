import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, getApiErrorMessage } from '../../lib/api'
import { humanizeStatus } from '../../lib/status'
import Toast from '../../components/Toast'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import {
  CalendarDays,
  Video,
  MapPin,
  Users,
  Pencil,
  XCircle,
  CheckCircle2,
  Award,
  Clock3,
  UserRound,
  Briefcase,
  FileText,
  Phone,
  Mail,
  MoreHorizontal,
  X,
  Plus,
  Loader2,
  Calendar,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  VideoIcon,
} from 'lucide-react'
import type { Application, Interview as InterviewType } from '../../types'

type TabKey = 'upcoming' | 'today' | 'completed' | 'cancelled'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'today', label: 'Today' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

const RESULT_TONES: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
}

function ResultBadge({ result }: { result?: string }) {
  const value = (result || 'PENDING').toUpperCase()
  const tone = value === 'PASSED' ? 'emerald' : value === 'FAILED' ? 'rose' : 'amber'
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${RESULT_TONES[tone]}`}>
      {humanizeStatus(value)}
    </span>
  )
}

function ModeBadge({ interviewType }: { interviewType?: string }) {
  const value = (interviewType || 'ONLINE').toUpperCase()
  const isOnline = value === 'ONLINE'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        isOnline
          ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
          : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
      }`}
    >
      {isOnline ? <VideoIcon size={12} /> : <MapPin size={12} />}
      {isOnline ? 'Online' : 'Offline'}
    </span>
  )
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDatetimeLocal(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function notificationsUpdated() {
  window.dispatchEvent(new CustomEvent('getplaced:notifications_updated'))
}

interface InterviewFormData {
  applicationId: string
  roundName: string
  interviewType: 'ONLINE' | 'OFFLINE'
  scheduledAt: string
  duration: number
  location: string
  meetingLink: string
  interviewerName: string
  interviewerEmail: string
  instructions: string
}

interface ResultFormData {
  result: 'PASSED' | 'FAILED' | 'PENDING'
  feedback?: string
  advanceApplication: boolean
  selectStudent: boolean
}

const emptyForm: InterviewFormData = {
  applicationId: '',
  roundName: 'Technical Round',
  interviewType: 'ONLINE',
  scheduledAt: '',
  duration: 45,
  location: '',
  meetingLink: '',
  interviewerName: '',
  interviewerEmail: '',
  instructions: '',
}

const emptyResult: ResultFormData = {
  result: 'PASSED',
  feedback: '',
  advanceApplication: true,
  selectStudent: false,
}

export default function AdminInterviews() {
  const [tab, setTab] = useState<TabKey>('upcoming')
  const [interviews, setInterviews] = useState<InterviewType[]>([])
  const [counts, setCounts] = useState<Record<TabKey, number>>({
    upcoming: 0,
    today: 0,
    completed: 0,
    cancelled: 0,
  })
  const [loading, setLoading] = useState(true)
  const [, setTotal] = useState(0)
  const [, setPage] = useState(1)
  const [limit] = useState(50)

  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [editing, setEditing] = useState<InterviewType | null>(null)
  const [viewing, setViewing] = useState<InterviewType | null>(null)
  const [resulting, setResulting] = useState<InterviewType | null>(null)
  const [cancelling, setCancelling] = useState<InterviewType | null>(null)
  const [selectConfirm, setSelectConfirm] = useState(false)

  const [applications, setApplications] = useState<Application[]>([])
  const [appsLoading, setAppsLoading] = useState(false)

  const [form, setForm] = useState<InterviewFormData>({ ...emptyForm })
  const [formBusy, setFormBusy] = useState(false)
  const [resultForm, setResultForm] = useState<ResultFormData>({ ...emptyResult })
  const [resultBusy, setResultBusy] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const showToast = useCallback((message: string, error = false) => {
    setToast({ message, error })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadInterviews = useCallback(async (activeTab: TabKey = tab) => {
    setLoading(true)
    try {
      const res = await api.get('/interviews', {
        params: { tab: activeTab, page: 1, limit },
      })
      setInterviews(res.data.interviews || [])
      setTotal(res.data.total || 0)
      setPage(res.data.page || 1)
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Failed to load interviews'), true)
    } finally {
      setLoading(false)
    }
  }, [limit, showToast, tab])

  const loadCounts = useCallback(async () => {
    try {
      const [up, to, co, ca] = await Promise.all([
        api.get('/interviews', { params: { tab: 'upcoming', limit: 1 } }).then((r) => r.data.total || 0),
        api.get('/interviews', { params: { tab: 'today', limit: 1 } }).then((r) => r.data.total || 0),
        api.get('/interviews', { params: { tab: 'completed', limit: 1 } }).then((r) => r.data.total || 0),
        api.get('/interviews', { params: { tab: 'cancelled', limit: 1 } }).then((r) => r.data.total || 0),
      ])
      setCounts({ upcoming: up, today: to, completed: co, cancelled: ca })
    } catch {
      // Counts are supplemental; the interview list remains usable if they fail.
    }
  }, [])

  const loadApplications = useCallback(async () => {
    if (applications.length) return
    setAppsLoading(true)
    try {
      const res = await api.get('/applications', { params: { status: 'SHORTLISTED,INTERVIEW_SCHEDULED,INTERVIEWED', limit: 200 } })
      setApplications(res.data.applications || [])
    } catch {
      try {
        const res = await api.get('/admin/applications')
        setApplications(res.data.applications || [])
      } catch {
        // Fall back to the admin endpoint when the student endpoint is unavailable.
      }
    } finally {
      setAppsLoading(false)
    }
  }, [applications.length])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadInterviews(tab)
      void loadCounts()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadCounts, loadInterviews, tab])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuOpen && !(e.target as HTMLElement).closest('[data-menu-root]')) {
        setMenuOpen(null)
      }
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [menuOpen])

  const refreshAll = () => {
    loadInterviews(tab)
    loadCounts()
  }

  const openNewSchedule = () => {
    loadApplications()
    setEditing(null)
    setForm({ ...emptyForm })
    setScheduleOpen(true)
  }

  const openEdit = (iv: InterviewType) => {
    loadApplications()
    setEditing(iv)
    setForm({
      applicationId: String(iv.application || ''),
      roundName: iv.roundName || 'Interview Round',
      interviewType: (iv.interviewType || iv.mode) === 'Offline' ? 'OFFLINE' : 'ONLINE',
      scheduledAt: toDatetimeLocal(iv.scheduledAt || iv.date),
      duration: iv.duration || 45,
      location: iv.location || '',
      meetingLink: iv.meetingLink || iv.link || '',
      interviewerName: iv.interviewerName || '',
      interviewerEmail: iv.interviewerEmail || '',
      instructions: iv.instructions || '',
    })
    setScheduleOpen(true)
    setViewing(null)
  }

  const selectedApplication = useMemo(() => {
    return applications.find((a) => a._id === form.applicationId) || null
  }, [applications, form.applicationId])

  const editingInterviewInfo = useMemo(() => {
    if (!editing) return null
    const student = typeof editing.student === 'object' ? editing.student : undefined
    return {
      studentName: student?.name || editing.studentName || 'Student',
      studentEmail: student?.email || editing.studentEmail || '',
      company: editing.company || 'Company',
      role: editing.role || 'Role',
    }
  }, [editing])

  const previewInfo = useMemo(() => {
    if (selectedApplication) {
      const s = selectedApplication.student
      const dr = typeof selectedApplication.drive === 'string' ? undefined : selectedApplication.drive
      return {
        studentName: s?.name || 'Student',
        studentEmail: s?.email || '',
        company: dr?.company || selectedApplication.company || 'Company',
        role: dr?.jobTitle || dr?.title || selectedApplication.role || 'Role',
      }
    }
    if (editingInterviewInfo) return editingInterviewInfo
    return null
  }, [selectedApplication, editingInterviewInfo])

  const submitForm = async () => {
    const payload: Partial<InterviewFormData> & { scheduledAt?: string } = {
      roundName: form.roundName,
      interviewType: form.interviewType,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      duration: Number(form.duration) || 45,
      location: form.interviewType === 'OFFLINE' ? form.location : undefined,
      meetingLink: form.interviewType === 'ONLINE' ? form.meetingLink : undefined,
      interviewerName: form.interviewerName || undefined,
      interviewerEmail: form.interviewerEmail || undefined,
      instructions: form.instructions || undefined,
    }
    setFormBusy(true)
    try {
      if (editing) {
        await api.patch(`/interviews/${editing._id}`, payload)
        showToast('Interview updated')
      } else {
        if (!form.applicationId) {
          showToast('Please select an application', true)
          setFormBusy(false)
          return
        }
        await api.post('/interviews', { ...payload, applicationId: form.applicationId })
        showToast('Interview scheduled')
      }
      notificationsUpdated()
      setScheduleOpen(false)
      setEditing(null)
      refreshAll()
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e, editing ? 'Failed to update interview' : 'Failed to schedule interview'), true)
    } finally {
      setFormBusy(false)
    }
  }

  const openResult = (iv: InterviewType) => {
    setResulting(iv)
    setResultForm({
      result: iv.result === 'FAILED' || iv.result === 'PENDING' ? iv.result : 'PASSED',
      feedback: iv.feedback || '',
      advanceApplication: true,
      selectStudent: false,
    })
    setViewing(null)
  }

  const submitResult = (confirmSelect = false) => {
    if (!resulting) return
    if (resultForm.result === 'PASSED' && resultForm.selectStudent && !confirmSelect) {
      setSelectConfirm(true)
      return
    }
    setResultBusy(true)
    const payload: ResultFormData = {
      result: resultForm.result,
      feedback: resultForm.feedback || undefined,
      advanceApplication: resultForm.advanceApplication,
      selectStudent: resultForm.selectStudent,
    }
    api
      .patch(`/interviews/${resulting._id}`, payload)
      .then(() => {
        showToast('Result recorded')
        notificationsUpdated()
        setResulting(null)
        setSelectConfirm(false)
        refreshAll()
      })
      .catch((e) => showToast(getApiErrorMessage(e, 'Failed to record result'), true))
      .finally(() => setResultBusy(false))
  }

  const confirmCancel = () => {
    if (!cancelling) return
    setCancelBusy(true)
    api
      .patch(`/interviews/${cancelling._id}`, { status: 'CANCELLED' })
      .then(() => {
        showToast('Interview cancelled')
        notificationsUpdated()
        setCancelling(null)
        setViewing(null)
        refreshAll()
      })
      .catch((e) => showToast(getApiErrorMessage(e, 'Failed to cancel interview'), true))
      .finally(() => setCancelBusy(false))
  }

  const canCancel = (iv: InterviewType) => {
    const s = (iv.status || '').toUpperCase()
    return s !== 'CANCELLED' && s !== 'COMPLETED'
  }

  const canRecordResult = (iv: InterviewType) => {
    const s = (iv.status || '').toUpperCase()
    return s === 'SCHEDULED' || s === 'RESCHEDULED' || s === 'COMPLETED'
  }

  const switchTab = (k: TabKey) => {
    setTab(k)
    setMenuOpen(null)
  }

  return (
    <div className="page-container">
      <div className="mb-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Interview operations</p>
          <h1 className="mt-1 text-3xl font-black">Interviews</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Schedule, reschedule and record interview outcomes — everything in one place.
          </p>
        </div>
        <button className="btn-primary" onClick={openNewSchedule}>
          <Plus size={16} /> Schedule interview
        </button>
      </div>

      <div className="glass-card mb-5 flex flex-wrap gap-1 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all min-w-[100px] ${
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
            <span
              className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-black ${
                tab === t.key ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'
              }`}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : interviews.length === 0 ? (
        tab === 'upcoming' ? (
          <EmptyState
            title="No upcoming interviews"
            text="Scheduled interviews for the coming days will appear here. Get started by scheduling one now."
            action={
              <button className="btn-primary" onClick={openNewSchedule}>
                <Plus size={16} /> Schedule Interview
              </button>
            }
          />
        ) : tab === 'today' ? (
          <EmptyState
            title="No interviews scheduled today"
            text="All caught up for today. Check upcoming interviews for scheduled sessions."
            action={
              <button className="btn-secondary" onClick={() => setTab('upcoming')}>
                <CalendarDays size={16} /> View upcoming
              </button>
            }
          />
        ) : tab === 'completed' ? (
          <EmptyState
            title="No completed interviews yet"
            text="Once interviews are conducted and results are recorded, they will appear here."
          />
        ) : (
          <EmptyState
            title="No cancelled interviews"
            text="Cancelled interviews will be listed here for record-keeping."
          />
        )
      ) : (
        <>
          <div className="hidden overflow-hidden lg:block">
            <div className="glass-card overflow-hidden">
              <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-white/5 dark:bg-white/[0.02] md:grid-cols-[1.3fr_1.2fr_.8fr_1.1fr_.55fr_.65fr_.7fr_.8fr_1.1fr]">
                <div>Student</div>
                <div>Company &amp; Role</div>
                <div>Round</div>
                <div>Date &amp; Time</div>
                <div>Duration</div>
                <div>Mode</div>
                <div>Status</div>
                <div>Result</div>
                <div className="text-right">Actions</div>
              </div>
              {interviews.map((iv) => {
                const student = typeof iv.student === 'object' ? iv.student : undefined
                const studentName = student?.name || iv.studentName || '—'
                const studentEmail = student?.email || iv.studentEmail || ''
                return (
                  <div
                    key={iv._id}
                    className="grid items-center gap-3 border-b border-slate-100 px-5 py-4 text-sm last:border-0 dark:border-white/5 md:grid-cols-[1.3fr_1.2fr_.8fr_1.1fr_.55fr_.65fr_.7fr_.8fr_1.1fr]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/10">
                          <UserRound size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold">{studentName}</p>
                          <p className="truncate text-xs text-slate-500">{studentEmail}</p>
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{iv.company}</p>
                          <p className="truncate text-xs text-slate-500">{iv.role}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-500/10 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <FileText size={12} />
                        {iv.roundName || 'Interview'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CalendarDays size={14} className="shrink-0 text-slate-400" />
                        <div>
                          <p className="font-semibold">{formatDate(iv.scheduledAt || iv.date)}</p>
                          <p className="text-xs text-slate-500">{formatTime(iv.scheduledAt || iv.date)}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Clock3 size={14} className="text-slate-400" />
                        <span className="font-semibold">{iv.duration || 45}m</span>
                      </div>
                    </div>
                    <div>
                      <ModeBadge interviewType={iv.interviewType || iv.mode} />
                    </div>
                    <div>
                      <StatusBadge status={iv.status} />
                    </div>
                    <div>
                      <ResultBadge result={iv.result} />
                    </div>
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                      <button
                        className="btn-secondary !px-2.5 !py-1.5 text-xs"
                        onClick={() => setViewing(iv)}
                        title="View details"
                      >
                        <ChevronRight size={14} />
                        <span className="hidden sm:inline">Details</span>
                      </button>
                      {canRecordResult(iv) && (
                        <button
                          className="btn-secondary !px-2.5 !py-1.5 text-xs"
                          onClick={() => openResult(iv)}
                          title="Record result"
                        >
                          <Award size={14} />
                          <span className="hidden sm:inline">Result</span>
                        </button>
                      )}
                      {canCancel(iv) && (
                        <button
                          className="btn-secondary !px-2.5 !py-1.5 text-xs !text-rose-600 hover:!bg-rose-500/10 dark:!text-rose-400"
                          onClick={() => setCancelling(iv)}
                          title="Cancel"
                        >
                          <XCircle size={14} />
                          <span className="hidden sm:inline">Cancel</span>
                        </button>
                      )}
                      <div className="relative" data-menu-root>
                        <button
                          className="btn-secondary !px-2 !py-1.5"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpen(menuOpen === iv._id ? null : iv._id)
                          }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {menuOpen === iv._id && (
                          <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-white/10 dark:bg-slate-900">
                            <button
                              className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium hover:bg-slate-50 dark:hover:bg-white/5"
                              onClick={() => {
                                setMenuOpen(null)
                                setViewing(iv)
                              }}
                            >
                              <ChevronRight size={14} /> View details
                            </button>
                            <button
                              className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium hover:bg-slate-50 dark:hover:bg-white/5"
                              onClick={() => {
                                setMenuOpen(null)
                                openEdit(iv)
                              }}
                            >
                              <Pencil size={14} /> Edit / Reschedule
                            </button>
                            {canRecordResult(iv) && (
                              <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium hover:bg-slate-50 dark:hover:bg-white/5"
                                onClick={() => {
                                  setMenuOpen(null)
                                  openResult(iv)
                                }}
                              >
                                <Award size={14} /> Record Result
                              </button>
                            )}
                            {canCancel(iv) && (
                              <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                                onClick={() => {
                                  setMenuOpen(null)
                                  setCancelling(iv)
                                }}
                              >
                                <XCircle size={14} /> Cancel Interview
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 lg:hidden">
            {interviews.map((iv) => {
              const student = typeof iv.student === 'object' ? iv.student : undefined
              const studentName = student?.name || iv.studentName || '—'
              const studentEmail = student?.email || iv.studentEmail || ''
              return (
                <div key={iv._id} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={iv.status} />
                        <ResultBadge result={iv.result} />
                        <ModeBadge interviewType={iv.interviewType || iv.mode} />
                      </div>
                      <p className="mt-3 font-black">{iv.company} — {iv.role}</p>
                      <p className="mt-1 text-sm text-slate-500">{iv.roundName || 'Interview'}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <UserRound size={14} className="text-slate-400" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{studentName}</p>
                        <p className="truncate text-xs text-slate-500">{studentEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-slate-400" />
                      <div>
                        <p className="font-semibold">{formatDate(iv.scheduledAt || iv.date)}</p>
                        <p className="text-xs text-slate-500">{formatTime(iv.scheduledAt || iv.date)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-secondary flex-1 !py-2 text-xs" onClick={() => setViewing(iv)}>
                      <ChevronRight size={14} /> Details
                    </button>
                    <button className="btn-secondary flex-1 !py-2 text-xs" onClick={() => openEdit(iv)}>
                      <Pencil size={14} /> Edit
                    </button>
                    {canRecordResult(iv) && (
                      <button className="btn-secondary flex-1 !py-2 text-xs" onClick={() => openResult(iv)}>
                        <Award size={14} /> Result
                      </button>
                    )}
                    {canCancel(iv) && (
                      <button
                        className="btn-secondary flex-1 !py-2 text-xs !text-rose-600 hover:!bg-rose-500/10 dark:!text-rose-400"
                        onClick={() => setCancelling(iv)}
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {scheduleOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/50 p-4 sm:place-items-center" onClick={() => setScheduleOpen(false)}>
          <div className="glass-card w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-white/5">
              <div>
                <p className="eyebrow">{editing ? 'Reschedule' : 'Schedule'} interview</p>
                <h3 className="mt-1 text-xl font-black">{editing ? 'Edit Interview' : 'Schedule New Interview'}</h3>
              </div>
              <button className="btn-secondary !p-2" onClick={() => setScheduleOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {!editing && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Application
                  </label>
                  <select
                    className="input"
                    value={form.applicationId}
                    onChange={(e) => setForm({ ...form, applicationId: e.target.value })}
                    disabled={appsLoading}
                  >
                    <option value="">{appsLoading ? 'Loading applications…' : 'Select an application…'}</option>
                    {applications.map((a) => {
                      const s = a.student
                      const dr = typeof a.drive === 'string' ? undefined : a.drive
                      return (
                        <option key={a._id} value={a._id}>
                          {s?.name || 'Student'} — {dr?.company || 'Company'} / {dr?.title || a.status}
                        </option>
                      )
                    })}
                  </select>
                  {!applications.length && !appsLoading && (
                    <button
                      className="mt-2 text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                      onClick={loadApplications}
                    >
                      Load applications
                    </button>
                  )}
                </div>
              )}

              {previewInfo && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm dark:bg-white/10">
                      <Users size={18} className="text-emerald-500" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-black">{previewInfo.studentName}</p>
                      {previewInfo.studentEmail && (
                        <p className="truncate text-xs text-slate-500">{previewInfo.studentEmail}</p>
                      )}
                      <p className="mt-1 text-sm font-semibold">
                        {previewInfo.company} · <span className="text-slate-500">{previewInfo.role}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Round Name
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Technical Round 1"
                    value={form.roundName}
                    onChange={(e) => setForm({ ...form, roundName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Interview Type
                  </label>
                  <select
                    className="input"
                    value={form.interviewType}
                    onChange={(e) => setForm({ ...form, interviewType: e.target.value === 'OFFLINE' ? 'OFFLINE' : 'ONLINE' })}
                  >
                    <option value="ONLINE">Online</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} /> Scheduled At
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    className="input"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                  />
                </div>
                {form.interviewType === 'ONLINE' ? (
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Video size={12} /> Meeting Link
                      </span>
                    </label>
                    <input
                      className="input"
                      placeholder="https://meet.google.com/… or Zoom link"
                      value={form.meetingLink}
                      onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} /> Location
                      </span>
                    </label>
                    <input
                      className="input"
                      placeholder="Office address, room, or venue"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Interviewer Name
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Jane Smith"
                    value={form.interviewerName}
                    onChange={(e) => setForm({ ...form, interviewerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Mail size={12} /> Interviewer Email
                    </span>
                  </label>
                  <input
                    type="email"
                    className="input"
                    placeholder="interviewer@company.com"
                    value={form.interviewerEmail}
                    onChange={(e) => setForm({ ...form, interviewerEmail: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare size={12} /> Instructions
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    className="input resize-none"
                    placeholder="Pre-requisites, topics to cover, docs to bring…"
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 p-5 dark:border-white/5 sm:flex-row">
              <button className="btn-secondary" disabled={formBusy} onClick={() => setScheduleOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={formBusy} onClick={submitForm}>
                {formBusy ? <Loader2 size={16} className="animate-spin" /> : editing ? <Pencil size={16} /> : <CalendarDays size={16} />}
                {formBusy ? 'Working…' : editing ? 'Update Interview' : 'Schedule Interview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resulting && (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/50 p-4 sm:place-items-center" onClick={() => { setResulting(null); setSelectConfirm(false) }}>
          <div className="glass-card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-white/5">
              <div>
                <p className="eyebrow">Record outcome</p>
                <h3 className="mt-1 text-xl font-black">Record Interview Result</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {resulting.company} — {resulting.role} · {resulting.roundName || 'Interview'}
                </p>
              </div>
              <button className="btn-secondary !p-2" onClick={() => { setResulting(null); setSelectConfirm(false) }}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Result
                </label>
                <select
                  className="input"
                  value={resultForm.result}
                  onChange={(e) => {
                    const v: ResultFormData['result'] =
                      e.target.value === 'FAILED' || e.target.value === 'PENDING' ? e.target.value : 'PASSED'
                    const defaultAdvance = v === 'PASSED' || v === 'PENDING'
                    setResultForm({
                      ...resultForm,
                      result: v,
                      advanceApplication: v === 'FAILED' ? false : defaultAdvance,
                      selectStudent: v === 'PASSED' ? resultForm.selectStudent : false,
                    })
                  }}
                >
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                  <option value="PENDING">Pending / Hold</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare size={12} /> Feedback
                  </span>
                </label>
                <textarea
                  rows={4}
                  className="input resize-none"
                  placeholder="Interviewer notes, strengths, areas of improvement…"
                  value={resultForm.feedback}
                  onChange={(e) => setResultForm({ ...resultForm, feedback: e.target.value })}
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Advanced Options</p>
                <div className="mt-3 space-y-2.5">
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-emerald-500"
                      checked={resultForm.advanceApplication}
                      onChange={(e) => setResultForm({ ...resultForm, advanceApplication: e.target.checked })}
                      disabled={resultForm.result === 'FAILED'}
                    />
                    <span className="text-sm font-semibold">
                      Advance application to <span className="text-sky-600 dark:text-sky-400">INTERVIEWED</span> after saving
                    </span>
                  </label>
                  <label className={`flex cursor-pointer items-start gap-2.5 ${resultForm.result !== 'PASSED' ? 'opacity-40' : ''}`}>
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-emerald-500"
                      checked={resultForm.selectStudent}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setResultForm({
                          ...resultForm,
                          selectStudent: checked,
                          advanceApplication: checked ? true : resultForm.advanceApplication,
                        })
                      }}
                      disabled={resultForm.result !== 'PASSED'}
                    />
                    <span className="text-sm font-semibold">
                      Mark student as <span className="text-emerald-600 dark:text-emerald-400">SELECTED</span> (final round)
                    </span>
                  </label>
                </div>
                {resultForm.result === 'FAILED' && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-400">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    Result is set to FAILED — application will automatically move to REJECTED after saving.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 p-5 dark:border-white/5 sm:flex-row">
              <button className="btn-secondary" disabled={resultBusy} onClick={() => { setResulting(null); setSelectConfirm(false) }}>
                Cancel
              </button>
              <button className="btn-primary" disabled={resultBusy} onClick={() => submitResult(false)}>
                {resultBusy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {resultBusy ? 'Working…' : 'Save Result'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (() => {
        const student = typeof viewing.student === 'object' ? viewing.student : undefined
        const studentName = student?.name || viewing.studentName || '—'
        const studentEmail = student?.email || viewing.studentEmail || ''
        const studentPhone = student?.phone || viewing.studentPhone || ''
        return (
          <div className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/50 p-4 sm:place-items-center" onClick={() => setViewing(null)}>
            <div className="glass-card w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-white/5">
                <div>
                  <p className="eyebrow">Interview details</p>
                  <h3 className="mt-1 text-xl font-black">{viewing.company} — {viewing.role}</h3>
                  <p className="mt-1 text-sm text-slate-500">{viewing.roundName || 'Interview'}</p>
                </div>
                <button className="btn-secondary !p-2" onClick={() => setViewing(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-5 p-5">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={viewing.status} />
                  <ResultBadge result={viewing.result} />
                  <ModeBadge interviewType={viewing.interviewType || viewing.mode} />
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Clock3 size={12} /> {viewing.duration || 45} min
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm dark:bg-white/10">
                        <UserRound size={18} className="text-sky-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-black">{studentName}</p>
                        {studentEmail && (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                            <Mail size={11} /> {studentEmail}
                          </p>
                        )}
                        {studentPhone && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <Phone size={11} /> {studentPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm dark:bg-white/10">
                        <CalendarDays size={18} className="text-emerald-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-black">{formatDate(viewing.scheduledAt || viewing.date)}</p>
                        <p className="text-xs text-slate-500">{formatTime(viewing.scheduledAt || viewing.date)}</p>
                        <p className="mt-1 text-xs text-slate-500">{viewing.duration || 45} minutes</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Interviewer</p>
                    <p className="mt-1.5 font-semibold">{viewing.interviewerName || '—'}</p>
                    {viewing.interviewerEmail && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <Mail size={11} /> {viewing.interviewerEmail}
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {(viewing.interviewType || viewing.mode) === 'OFFLINE' || viewing.mode === 'Offline' ? 'Location' : 'Meeting'}
                    </p>
                    <p className="mt-1.5 break-all font-semibold">
                      {(viewing.interviewType || viewing.mode) === 'OFFLINE' || viewing.mode === 'Offline'
                        ? viewing.location || '—'
                        : viewing.meetingLink || viewing.link || '—'}
                    </p>
                  </div>
                </div>

                {viewing.instructions && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Instructions</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{viewing.instructions}</p>
                  </div>
                )}

                {viewing.feedback && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Interview Feedback
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{viewing.feedback}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary flex-1" onClick={() => openEdit(viewing)}>
                    <Pencil size={14} /> Edit / Reschedule
                  </button>
                  {canRecordResult(viewing) && (
                    <button className="btn-secondary flex-1" onClick={() => openResult(viewing)}>
                      <Award size={14} /> Record Result
                    </button>
                  )}
                  {canCancel(viewing) && (
                    <button
                      className="btn-secondary flex-1 !text-rose-600 hover:!bg-rose-500/10 dark:!text-rose-400"
                      onClick={() => {
                        setViewing(null)
                        setCancelling(viewing)
                      }}
                    >
                      <XCircle size={14} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <ConfirmDialog
        open={!!cancelling}
        title="Cancel interview?"
        text={cancelling ? `You are about to cancel the ${cancelling.roundName || 'interview'} for ${cancelling.company} — ${cancelling.role}. The student will be notified.` : ''}
        confirmLabel="Cancel Interview"
        danger
        busy={cancelBusy}
        onClose={() => !cancelBusy && setCancelling(null)}
        onConfirm={confirmCancel}
      />

      <ConfirmDialog
        open={selectConfirm}
        title="Mark student as SELECTED?"
        text={resulting ? `This will mark ${resulting.company} — ${resulting.role} as the final offer and move the application to SELECTED. The student will be notified. Proceed?` : ''}
        confirmLabel="Confirm Selection"
        busy={resultBusy}
        onClose={() => !resultBusy && setSelectConfirm(false)}
        onConfirm={() => submitResult(true)}
      />

      {toast && <Toast message={toast.message} error={toast.error} />}
    </div>
  )
}
