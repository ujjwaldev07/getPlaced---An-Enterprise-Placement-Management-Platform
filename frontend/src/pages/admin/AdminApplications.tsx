import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getApiErrorMessage } from '../../lib/api'
import { openResume } from '../../lib/resume'
import { APP_FILTERS, humanizeStatus } from '../../lib/status'
import Toast from '../../components/Toast'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import ApplicationTimeline from '../../components/ApplicationTimeline'
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  Pencil,
  Calendar,
  Video,
  CheckCircle2,
  XCircle,
  UserRound,
  Briefcase,
  FileText,
  Award,
  GraduationCap,
  Users,
  Clock3,
  CalendarDays,
  X,
  Loader2,
  Save,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import type { Application as BaseApplication, Drive, ResumeFile, User } from '../../types'

const APPLICATION_TRANSITIONS: Record<string, readonly string[]> = {
  ALL: APP_FILTERS.filter((s) => s !== 'ALL'),
  APPLIED: ['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED'],
  UNDER_REVIEW: ['SHORTLISTED', 'REJECTED', 'APPLIED'],
  SHORTLISTED: ['INTERVIEW_SCHEDULED', 'REJECTED', 'UNDER_REVIEW'],
  INTERVIEW_SCHEDULED: ['INTERVIEWED', 'REJECTED', 'SHORTLISTED'],
  INTERVIEWED: ['SELECTED', 'REJECTED', 'INTERVIEW_SCHEDULED'],
  SELECTED: [],
  REJECTED: ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED'],
}

const SORT_OPTIONS = [
  { label: 'Applied (newest)', value: '-appliedAt' },
  { label: 'Applied (oldest)', value: '+appliedAt' },
  { label: 'Student name', value: '+studentName' },
  { label: 'CGPA (high→low)', value: '-cgpa' },
] as const

type Application = Omit<BaseApplication, 'drive' | 'student' | 'resume'> & {
  drive?: Partial<Drive> | null
  student?: Partial<User> & { _id?: string }
  resume?: ResumeFile | null
}
type StatusFilter = (typeof APP_FILTERS)[number]

function formatDate(d: string | number) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatDateTime(d: string | number) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function getInitials(name?: string) {
  if (!name) return '??'
  const parts = String(name).trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

const TABLE_SKELETON_ROWS = 5

export default function AdminApplications() {
  const navigate = useNavigate()

  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState(q)
  const initialSearchRender = useRef(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sort, setSort] = useState<string>('-appliedAt')
  const [page, setPage] = useState(1)
  const limit = 20

  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})

  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null)
  const showToast = useCallback((message: string, error = false) => {
    setToast({ message, error })
    setTimeout(() => setToast(null), 2800)
  }, [])

  const [detailApp, setDetailApp] = useState<Application | null>(null)

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleBusy, setScheduleBusy] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    roundName: 'Technical Interview',
    interviewType: 'ONLINE' as 'ONLINE' | 'OFFLINE',
    scheduledAt: '',
    duration: 60,
    location: '',
    meetingLink: '',
    interviewerName: '',
    interviewerEmail: '',
    instructions: '',
  })

  const [confirm, setConfirm] = useState<{
    open: boolean
    title: string
    text: string
    confirmLabel?: string
    danger?: boolean
    action: () => Promise<void> | void
  } | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const [newStatus, setNewStatus] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [notesLastSaved, setNotesLastSaved] = useState('')

  const fetchApplications = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, limit, sort }
      if (qDebounced) params.q = qDebounced
      if (statusFilter !== 'ALL') params.status = statusFilter
      const { data } = await api.get('/admin/applications', { params })
      setApplications(data.applications || [])
      setTotal(data.total || 0)
      const counts: Record<string, number> = { ALL: data.total || 0 }
      ;(data.applications || []).forEach((a: Application) => {
        const s = a.status || 'APPLIED'
        counts[s] = (counts[s] || 0) + 1
      })
      APP_FILTERS.forEach((f) => {
        if (counts[f] === undefined) counts[f] = 0
      })
      setStatusCounts({ ...counts, ALL: data.total || 0 })
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Failed to load applications'), true)
    } finally {
      setLoading(false)
    }
  }, [page, limit, sort, qDebounced, statusFilter, showToast])

  useEffect(() => {
    const timer = setTimeout(() => void fetchApplications(), 0)
    return () => clearTimeout(timer)
  }, [fetchApplications])

  useEffect(() => {
    if (initialSearchRender.current) {
      initialSearchRender.current = false
      return
    }
    const timer = setTimeout(() => {
      setLoading(true)
      setPage(1)
      setQDebounced(q)
    }, 350)
    return () => clearTimeout(timer)
  }, [q])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const openDetail = async (app: Application) => {
    setDetailApp(app)
    setNotes(app.notes || '')
    setNotesLastSaved(app.notes || '')
    setRejectionReason('')
    setNewStatus('')
  }

  const closeDetail = () => {
    setDetailApp(null)
  }

  const applyOptimisticStatus = (id: string, status: string) => {
    setApplications((prev) =>
      prev.map((a) => (a._id === id ? { ...a, status } : a))
    )
    window.dispatchEvent(new CustomEvent('getplaced:notifications_updated'))
  }

  const changeStatus = async (targetStatus: string) => {
    if (!detailApp) return
    if (targetStatus === detailApp.status) return
    const isReject = targetStatus === 'REJECTED'
    const isSelect = targetStatus === 'SELECTED'
    if (isReject && !rejectionReason.trim()) {
      showToast('Please provide a rejection reason', true)
      return
    }
    setConfirm({
      open: true,
      title: isReject ? 'Reject candidate' : isSelect ? 'Mark as selected' : 'Change status',
      text: isReject
        ? `Are you sure you want to reject ${detailApp.student?.name || 'this candidate'}? This will notify them.`
        : isSelect
        ? `Confirm ${detailApp.student?.name || 'this candidate'} as selected for ${detailApp.drive?.company} — ${detailApp.drive?.title}?`
        : `Update application status from ${humanizeStatus(detailApp.status)} to ${humanizeStatus(targetStatus)}?`,
      confirmLabel: isReject ? 'Reject' : isSelect ? 'Confirm select' : 'Update status',
      danger: isReject,
      action: async () => {
        setConfirmBusy(true)
        setSavingStatus(true)
        try {
          applyOptimisticStatus(detailApp._id, targetStatus)
          await api.patch(`/applications/${detailApp._id}/status`, {
            status: targetStatus,
            notes: notes.trim() || undefined,
            rejectionReason: isReject ? rejectionReason.trim() : undefined,
          })
          setDetailApp({ ...detailApp, status: targetStatus, notes: notes.trim() || detailApp.notes })
          setNotesLastSaved(notes.trim())
          if (isReject) setRejectionReason('')
          setNewStatus('')
          showToast(`Status updated to ${humanizeStatus(targetStatus)}`)
        } catch (e) {
          showToast(getApiErrorMessage(e, 'Failed to update status'), true)
        } finally {
          setSavingStatus(false)
          setConfirmBusy(false)
          setConfirm(null)
        }
      },
    })
  }

  const saveNotes = async () => {
    if (!detailApp) return
    if (notes === notesLastSaved) return
    setSavingNotes(true)
    try {
      await api.patch(`/applications/${detailApp._id}/status`, {
        status: detailApp.status,
        notes: notes.trim(),
      })
      setNotesLastSaved(notes.trim())
      showToast('Notes saved')
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Failed to save notes'), true)
    } finally {
      setSavingNotes(false)
    }
  }

  const openSchedule = () => {
    if (!detailApp) return
    const now = new Date()
    now.setMinutes(0, 0, 0)
    now.setHours(now.getHours() + 2)
    const pad = (n: number) => String(n).padStart(2, '0')
    const defaultDt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    setScheduleForm({
      roundName: 'Technical Interview',
      interviewType: 'ONLINE',
      scheduledAt: defaultDt,
      duration: 60,
      location: '',
      meetingLink: 'https://meet.google.com/new',
      interviewerName: '',
      interviewerEmail: '',
      instructions: '',
    })
    setScheduleOpen(true)
  }

  const submitSchedule = async () => {
    if (!detailApp) return
    if (!scheduleForm.roundName.trim()) return showToast('Round name is required', true)
    if (!scheduleForm.scheduledAt) return showToast('Scheduled date/time is required', true)
    if (!scheduleForm.duration || scheduleForm.duration <= 0) return showToast('Valid duration is required', true)
    if (scheduleForm.interviewType === 'OFFLINE' && !scheduleForm.location.trim())
      return showToast('Location is required for offline interviews', true)
    if (scheduleForm.interviewType === 'ONLINE' && !scheduleForm.meetingLink.trim())
      return showToast('Meeting link is required for online interviews', true)

    setScheduleBusy(true)
    try {
      await api.post('/interviews', {
        applicationId: detailApp._id,
        roundName: scheduleForm.roundName.trim(),
        interviewType: scheduleForm.interviewType,
        scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
        duration: Number(scheduleForm.duration),
        location: scheduleForm.location.trim() || undefined,
        meetingLink: scheduleForm.meetingLink.trim() || undefined,
        interviewerName: scheduleForm.interviewerName.trim() || undefined,
        interviewerEmail: scheduleForm.interviewerEmail.trim() || undefined,
        instructions: scheduleForm.instructions.trim() || undefined,
      })
      applyOptimisticStatus(detailApp._id, 'INTERVIEW_SCHEDULED')
      setDetailApp({ ...detailApp, status: 'INTERVIEW_SCHEDULED' })
      setScheduleOpen(false)
      closeDetail()
      showToast('Interview scheduled successfully')
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Failed to schedule interview'), true)
    } finally {
      setScheduleBusy(false)
    }
  }

  const resume = detailApp?.resume
  const student = detailApp?.student
  const drive = detailApp?.drive

  const allowedTransitions = useMemo(() => {
    const key = (detailApp?.status || 'APPLIED').toUpperCase()
    return (APPLICATION_TRANSITIONS[key] || APPLICATION_TRANSITIONS['ALL']) as readonly string[]
  }, [detailApp?.status])

  return (
    <div className="page-container">
      <div className="mb-7">
        <p className="eyebrow">Candidate pipeline</p>
        <h1 className="mt-1 text-3xl font-black">Applications</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-white/60">
          Review, shortlist, schedule interviews and manage candidate decisions.
        </p>
      </div>

      <div className="glass-card mb-5 flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Search student name, email, company, role…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="relative min-w-[220px]">
            <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              className="input appearance-none pl-10 pr-9"
              value={sort}
              onChange={(e) => {
                if (e.target.value !== sort) {
                  setLoading(true)
                  setPage(1)
                  setSort(e.target.value)
                }
              }}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {APP_FILTERS.map((f) => {
            const active = statusFilter === f
            const count = statusCounts[f] ?? 0
            return (
              <button
                key={f}
                onClick={() => {
                  if (f !== statusFilter) {
                    setLoading(true)
                    setPage(1)
                    setStatusFilter(f)
                  }
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? 'border-transparent bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:border-white/20'
                }`}
              >
                <span>{f === 'ALL' ? 'All' : humanizeStatus(f)}</span>
                <span
                  className={`rounded-full px-1.5 text-[10px] font-black ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/50'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : applications.length === 0 ? (
        <EmptyState
          title={qDebounced || statusFilter !== 'ALL' ? 'No matching applications' : 'No applications yet'}
          text={
            qDebounced || statusFilter !== 'ALL'
              ? 'Try adjusting your search or filters.'
              : 'Applications will appear when students apply to placement drives.'
          }
          action={
            <button className="btn-primary" onClick={() => navigate('/admin/drives')}>
              View Placement Drives <ArrowRight size={16} />
            </button>
          }
        />
      ) : (
        <>
          <div className="glass-card overflow-hidden">
            <div className="hidden border-b text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/50 md:grid md:grid-cols-12 md:gap-4 md:px-5 md:py-3">
              <div className="col-span-3">Student</div>
              <div className="col-span-1">CGPA</div>
              <div className="col-span-3">Company & Role</div>
              <div className="col-span-1">Applied</div>
              <div className="col-span-1">Resume</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <ul>
              {applications.map((a) => (
                <li
                  key={a._id}
                  className="border-b last:border-0"
                >
                  <div className="hidden items-center gap-4 md:grid md:grid-cols-12 md:px-5 md:py-4">
                    <div className="col-span-3 flex items-center gap-3 min-w-0">
                      <Avatar name={a.student?.name} />
                      <div className="min-w-0">
                        <p className="truncate font-bold">{a.student?.name || 'Unknown'}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-white/60">
                          {a.student?.email}
                        </p>
                        <p className="truncate text-[11px] text-slate-400 dark:text-white/40">
                          {a.student?.course || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-1">
                      {a.student?.cgpa ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                          <Award size={12} /> {a.student.cgpa}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-white/40">—</span>
                      )}
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="truncate font-bold">{a.drive?.company || '—'}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-white/60">{a.drive?.title || '—'}</p>
                    </div>
                    <div className="col-span-1 text-sm text-slate-600 dark:text-white/70">
                      {formatDate(a.appliedAt)}
                    </div>
                    <div className="col-span-1">
                      {a.resume?.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openResume(a.resume!.id, false)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
                            title={`View ${a.resume.originalName || 'resume'}`}
                          >
                            <Eye size={12} /> YES
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-white/40">NO</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button
                        onClick={() => openDetail(a)}
                        className="btn-primary"
                      >
                        <Pencil size={14} />
                        <span>Review</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 p-4 md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={a.student?.name} />
                        <div className="min-w-0">
                          <p className="truncate font-bold">{a.student?.name || 'Unknown'}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-white/60">
                            {a.student?.email}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400 dark:text-white/40">Company</p>
                        <p className="font-semibold truncate">{a.drive?.company || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 dark:text-white/40">Role</p>
                        <p className="font-semibold truncate">{a.drive?.title || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 dark:text-white/40">Applied</p>
                        <p className="font-semibold">{formatDate(a.appliedAt)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 dark:text-white/40">CGPA</p>
                        <p className="font-semibold">{a.student?.cgpa || '—'}</p>
                      </div>
                    </div>
                      <div className="flex items-center justify-between gap-2">
                      {a.resume?.id ? (
                        <button
                          onClick={() => openResume(a.resume!.id, false)}
                          className="btn-secondary text-xs"
                        >
                          <Eye size={14} /> Resume
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-white/40">No resume</span>
                      )}
                      <button onClick={() => openDetail(a)} className="btn-primary text-xs">
                        <Pencil size={14} /> Review
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onChange={(nextPage) => {
              setLoading(true)
              setPage(nextPage)
            }}
          />
        </>
      )}

      {detailApp && (
        <div
          className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/50 p-2 sm:p-6"
          onClick={closeDetail}
        >
          <div
            className="glass-card relative mx-auto my-4 w-full max-w-5xl p-5 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeDetail}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex flex-wrap items-start justify-between gap-3 pr-10">
              <div className="flex items-center gap-4">
                <AvatarLarge name={student?.name} />
                <div>
                  <h2 className="text-2xl font-black">{student?.name || 'Unknown candidate'}</h2>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-white/60">
                    {drive?.company} — {drive?.title}
                  </p>
                </div>
              </div>
              <StatusBadge status={detailApp.status} />
            </div>

            <div className="mt-5">
              <ApplicationTimeline status={detailApp.status} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="glass-card p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-black">
                  <GraduationCap size={16} className="text-emerald-600 dark:text-emerald-400" />
                  Student
                </div>
                <dl className="space-y-3 text-sm">
                  <Row label="Email" icon={<Mail size={14} />} value={student?.email} mono />
                  <Row label="Phone" icon={<Phone size={14} />} value={student?.phone} />
                  <Row label="Course" icon={<UserRound size={14} />} value={student?.course} />
                  <Row label="Graduation" icon={<CalendarDays size={14} />} value={student?.graduationYear} />
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                      CGPA
                    </dt>
                    <dd className="mt-0.5 font-bold">
                      {student?.cgpa ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-400">
                          <Award size={12} /> {student.cgpa}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-white/40">Not provided</span>
                      )}
                    </dd>
                  </div>
                  {(student?.skills?.length || 0) > 0 && (
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                        Skills
                      </dt>
                      <dd className="mt-1.5 flex flex-wrap gap-1.5">
                        {(student?.skills || []).map((s: string) => (
                          <span
                            key={s}
                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-white/80"
                          >
                            {s}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="glass-card p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-black">
                  <Briefcase size={16} className="text-sky-600 dark:text-sky-400" />
                  Application
                </div>
                <dl className="space-y-3 text-sm">
                  <Row label="Company" icon={<Briefcase size={14} />} value={drive?.company} />
                  <Row label="Role" icon={<Users size={14} />} value={drive?.title} />
                  <Row
                    label="Drive deadline"
                    icon={<Clock3 size={14} />}
                    value={drive?.deadline ? formatDate(drive.deadline) : '—'}
                  />
                  <Row
                    label="Applied at"
                    icon={<CalendarDays size={14} />}
                    value={formatDateTime(detailApp.appliedAt)}
                  />
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                      Status
                    </dt>
                    <dd className="mt-1">
                      <StatusBadge status={detailApp.status} />
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="glass-card p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-black">
                  <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
                  Resume
                </div>
                {resume?.id ? (
                  <>
                    <p className="break-all text-sm font-semibold">{resume.originalName || 'resume.pdf'}</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-white/40">
                      Uploaded {formatDate(resume.uploadedAt)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => openResume(resume.id, false)}
                        className="btn-secondary"
                      >
                        <Eye size={14} /> View
                      </button>
                      <button
                        onClick={() => openResume(resume.id, true)}
                        className="btn-primary"
                      >
                        <Download size={14} /> Download
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-white/60">No resume attached.</p>
                )}
              </div>
            </div>

            {detailApp.coverLetter && (
              <div className="glass-card mt-4 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-black">
                  <FileText size={16} className="text-purple-600 dark:text-purple-400" />
                  Cover Letter
                </div>
                <blockquote className="rounded-xl border-l-4 border-emerald-500/50 bg-emerald-500/5 px-5 py-4 text-sm leading-relaxed text-slate-700 dark:text-white/80">
                  {detailApp.coverLetter}
                </blockquote>
              </div>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="glass-card p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-black">
                    <Pencil size={16} className="text-amber-600 dark:text-amber-400" />
                    Admin Notes
                  </div>
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes || notes === notesLastSaved}
                    className="btn-secondary text-xs py-1.5"
                  >
                    {savingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {savingNotes ? 'Saving…' : 'Save'}
                  </button>
                </div>
                <textarea
                  className="input min-h-[130px] resize-y"
                  placeholder="Add your review notes, observations, follow-ups…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="glass-card p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-black">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                  Status Management
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                      Change status
                    </label>
                    <div className="mt-1 flex gap-2">
                      <div className="relative flex-1">
                        <select
                          className="input appearance-none pr-9"
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                        >
                          <option value="">Select new status…</option>
                          {allowedTransitions.map((s) => (
                            <option key={s} value={s}>
                              {humanizeStatus(s)}
                            </option>
                          ))}
                          {allowedTransitions.length === 0 && (
                            <option value="" disabled>
                              No transitions available
                            </option>
                          )}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                      <button
                        className="btn-primary"
                        disabled={!newStatus || savingStatus}
                        onClick={() => {
                          if (newStatus) changeStatus(newStatus)
                        }}
                      >
                        {savingStatus && <Loader2 size={14} className="animate-spin" />}
                        Apply
                      </button>
                    </div>
                  </div>

                  {newStatus === 'REJECTED' && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-rose-500 dark:text-rose-400">
                        Rejection reason
                      </label>
                      <input
                        className="mt-1 input"
                        placeholder="e.g. Does not meet eligibility criteria"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {['UNDER_REVIEW'].includes((detailApp.status || '').toUpperCase()) && (
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setNewStatus('SHORTLISTED')
                          changeStatus('SHORTLISTED')
                        }}
                      >
                        <CheckCircle2 size={14} /> Shortlist
                      </button>
                    )}
                    {['SHORTLISTED', 'INTERVIEW_SCHEDULED'].includes(
                      (detailApp.status || '').toUpperCase()
                    ) && (
                      <button
                        className="btn-primary bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400"
                        onClick={openSchedule}
                      >
                        <Video size={14} /> Schedule Interview
                      </button>
                    )}
                    {['INTERVIEW_SCHEDULED'].includes((detailApp.status || '').toUpperCase()) && (
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setNewStatus('INTERVIEWED')
                          changeStatus('INTERVIEWED')
                        }}
                      >
                        <Calendar size={14} /> Mark Interviewed
                      </button>
                    )}
                    {['INTERVIEWED'].includes((detailApp.status || '').toUpperCase()) && (
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setNewStatus('SELECTED')
                          changeStatus('SELECTED')
                        }}
                      >
                        <CheckCircle2 size={14} /> Mark Selected
                      </button>
                    )}
                    {!['SELECTED', 'REJECTED'].includes((detailApp.status || '').toUpperCase()) && (
                      <button
                        className="btn-secondary border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                        onClick={() => {
                          setNewStatus('REJECTED')
                          changeStatus('REJECTED')
                        }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {scheduleOpen && detailApp && (
        <div
          className="fixed inset-0 z-[90] grid place-items-end bg-slate-950/50 p-2 sm:place-items-center sm:p-6"
          onClick={() => !scheduleBusy && setScheduleOpen(false)}
        >
          <div
            className="glass-card relative w-full max-w-2xl p-5 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => !scheduleBusy && setScheduleOpen(false)}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
              disabled={scheduleBusy}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="pr-10">
              <div className="flex items-center gap-2 text-sm font-black text-sky-600 dark:text-sky-400">
                <Calendar size={16} /> Schedule Interview
              </div>
              <h3 className="mt-1 text-xl font-black">
                Interview for {detailApp.drive?.company} — {detailApp.drive?.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-white/60">
                Candidate: <span className="font-semibold">{student?.name}</span> · {student?.email}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                  Round name
                </label>
                <input
                  className="mt-1 input"
                  placeholder="e.g. Technical Round 1"
                  value={scheduleForm.roundName}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, roundName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                  Interview type
                </label>
                <div className="relative mt-1">
                  <select
                    className="input w-full appearance-none pr-9"
                    value={scheduleForm.interviewType}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        interviewType: e.target.value as 'ONLINE' | 'OFFLINE',
                      })
                    }
                  >
                    <option value="ONLINE">Online</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={10}
                  step={5}
                  className="mt-1 input"
                  value={scheduleForm.duration}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, duration: Number(e.target.value) })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                  Scheduled at
                </label>
                <input
                  type="datetime-local"
                  className="mt-1 input"
                  value={scheduleForm.scheduledAt}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                />
              </div>
              {scheduleForm.interviewType === 'ONLINE' ? (
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                    Meeting link
                  </label>
                  <input
                    className="mt-1 input"
                    placeholder="https://meet.google.com/..."
                    value={scheduleForm.meetingLink}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, meetingLink: e.target.value })}
                  />
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                    Location
                  </label>
                  <div className="relative mt-1">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input pl-10"
                      placeholder="Conference room, campus block A…"
                      value={scheduleForm.location}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                  Interviewer name
                </label>
                <input
                  className="mt-1 input"
                  placeholder="Jane Doe"
                  value={scheduleForm.interviewerName}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, interviewerName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                  Interviewer email
                </label>
                <input
                  type="email"
                  className="mt-1 input"
                  placeholder="jane@company.com"
                  value={scheduleForm.interviewerEmail}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, interviewerEmail: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
                  Instructions
                </label>
                <textarea
                  rows={3}
                  className="mt-1 input resize-y"
                  placeholder="Share any prep material, docs, or interview instructions with the candidate…"
                  value={scheduleForm.instructions}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, instructions: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => setScheduleOpen(false)}
                disabled={scheduleBusy}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={submitSchedule} disabled={scheduleBusy}>
                {scheduleBusy ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                {scheduleBusy ? 'Scheduling…' : 'Schedule Interview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          open={confirm.open}
          title={confirm.title}
          text={confirm.text}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          busy={confirmBusy}
          onClose={() => !confirmBusy && setConfirm(null)}
          onConfirm={() => confirm.action()}
        />
      )}

      {toast && <Toast message={toast.message} error={toast.error} />}
    </div>
  )
}

function Avatar({ name }: { name?: string }) {
  const initials = getInitials(name)
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
      {initials}
    </span>
  )
}

function AvatarLarge({ name }: { name?: string }) {
  const initials = getInitials(name)
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-lg font-black text-white shadow-md shadow-emerald-500/20 ring-2 ring-white dark:ring-slate-900">
      {initials}
    </span>
  )
}

function Row({
  label,
  value,
  icon,
  mono,
}: {
  label: string
  value?: string | number | null
  icon?: React.ReactNode
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">
        {label}
      </dt>
      <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-slate-800 dark:text-white/90">
        {icon ? <span className="text-slate-400 dark:text-white/40">{icon}</span> : null}
        <span className={mono ? 'truncate text-xs sm:text-sm' : 'truncate'}>
          {value || <span className="text-slate-400 dark:text-white/40 font-normal">—</span>}
        </span>
      </dd>
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onChange,
}: {
  page: number
  totalPages: number
  total: number
  limit: number
  onChange: (p: number) => void
}) {
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)
  const pages = useMemo(() => {
    const out: (number | '…')[] = []
    const push = (n: number | '…') => out.push(n)
    const window = 1
    push(1)
    for (let i = page - window; i <= page + window; i++) {
      if (i > 1 && i < totalPages) push(i)
    }
    if (totalPages > 1) push(totalPages)
    const deduped: (number | '…')[] = []
    for (let i = 0; i < out.length; i++) {
      const cur = out[i]
      const prev = deduped[deduped.length - 1]
      if (typeof cur === 'number' && typeof prev === 'number') {
        if (cur - prev > 1) deduped.push('…')
      }
      if (cur !== prev) deduped.push(cur)
    }
    return deduped
  }, [page, totalPages])

  return (
    <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs font-semibold text-slate-500 dark:text-white/60">
        Showing <span className="text-emerald-600 dark:text-emerald-400">{start}–{end}</span> of{' '}
        <span className="font-black text-slate-700 dark:text-white">{total}</span> applications
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="grid h-9 w-9 place-items-center text-sm font-bold text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`grid h-9 min-w-9 place-items-center rounded-xl px-3 text-sm font-bold transition ${
                p === page
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="hidden border-b h-10 md:block" />
      {Array.from({ length: TABLE_SKELETON_ROWS }).map((_, i) => (
        <div
          key={i}
          className="skeleton flex items-center gap-4 border-b last:border-0 px-5 py-5"
        >
          <div className="h-10 w-10 shrink-0 rounded-full skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded skeleton" />
            <div className="h-3 w-56 rounded skeleton" />
          </div>
          <div className="hidden h-6 w-20 rounded skeleton sm:block" />
          <div className="hidden h-6 w-28 rounded skeleton md:block" />
          <div className="hidden h-8 w-20 rounded-full skeleton md:block" />
          <div className="hidden h-9 w-24 rounded-xl skeleton md:block" />
        </div>
      ))}
    </div>
  )
}
