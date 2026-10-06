import { useEffect, useRef, useState, useCallback } from 'react'
import { api, getApiErrorMessage } from '../lib/api'
import {
  Search,
  Briefcase,
  MapPin,
  Clock3,
  Calendar,
  CheckCircle2,
  X,
  FileText,
  BookOpen,
  GraduationCap,
  Award,
  ChevronRight,
  Loader2,
  Target,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import type { Drive, ResumeFile } from '../types'
import Toast from '../components/Toast'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import ResumeUploader from '../components/ResumeUploader'

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

export default function Drives() {
  const [drives, setDrives] = useState<Drive[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [toast, setToast] = useState({ message: '', error: false })
  const [selectedDrive, setSelectedDrive] = useState<Drive | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyDrive, setApplyDrive] = useState<Drive | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)
  const [resumes, setResumes] = useState<ResumeFile[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [newResume, setNewResume] = useState<ResumeFile | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [resumesLoading, setResumesLoading] = useState(false)
  const appliedIds = useRef<Set<string>>(new Set())
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, error = false) => {
    setToast({ message, error })
    setTimeout(() => setToast({ message: '', error: false }), 3500)
  }, [])

  const loadDrives = useCallback(async () => {
    try {
      const { data } = await api.get('/drives')
      setDrives(data.drives || [])
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Failed to load drives'), true)
      setDrives([])
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const loadResumes = useCallback(async () => {
    setResumesLoading(true)
    try {
      const { data } = await api.get('/resumes/me')
      const list = data.resumes || []
      setResumes(list)
      if (list.length > 0 && !selectedResumeId) {
        setSelectedResumeId(list[0].id)
      }
    } catch {
      setResumes([])
    } finally {
      setResumesLoading(false)
    }
  }, [selectedResumeId])

  useEffect(() => {
    const timer = setTimeout(() => void loadDrives(), 0)
    return () => clearTimeout(timer)
  }, [loadDrives])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim())
    }, 300)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [searchTerm])

  const filteredDrives = drives.filter((d) => {
    if (!debouncedTerm) return true
    const q = debouncedTerm.toLowerCase()
    const hay = [
      d.company,
      d.title,
      d.location,
      d.type,
      d.package,
      ...(d.requiredSkills || []),
      ...(d.eligibleCourses || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })

  const openDetail = (drive: Drive) => {
    setSelectedDrive(drive)
    setDetailOpen(true)
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setTimeout(() => setSelectedDrive(null), 200)
  }

  const openApply = (drive: Drive) => {
    setApplyDrive(drive)
    setApplyOpen(true)
    setApplySuccess(false)
    setCoverLetter('')
    setNewResume(null)
    setSelectedResumeId('')
    appliedIds.current = new Set()
    loadResumes()
  }

  const closeApply = () => {
    if (submitting) return
    setApplyOpen(false)
    setApplySuccess(false)
    setTimeout(() => {
      setApplyDrive(null)
      setCoverLetter('')
      setNewResume(null)
      setSelectedResumeId('')
    }, 200)
  }

  const handleResumeUploaded = (r: ResumeFile) => {
    setNewResume(r)
    setSelectedResumeId(r.id)
  }

  const submitApplication = async () => {
    if (!applyDrive || submitting) return
    if (appliedIds.current.has(applyDrive._id)) return
    appliedIds.current.add(applyDrive._id)

    const hasResume = selectedResumeId || newResume
    if (!hasResume) {
      showToast('Please upload or select a resume', true)
      appliedIds.current.delete(applyDrive._id)
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      if (coverLetter.trim()) {
        fd.append('coverLetter', coverLetter.trim())
      }
      fd.append('resumeId', selectedResumeId)

      await api.post(`/drives/${applyDrive._id}/apply`, fd)

      setApplySuccess(true)
      try {
        window.dispatchEvent(new CustomEvent('getplaced:notifications_updated'))
      } catch {
        // Keep the successful application submission independent of notification refresh.
      }
      showToast('Application submitted successfully')
      setTimeout(() => {
        closeApply()
      }, 1500)
    } catch (e: unknown) {
      appliedIds.current.delete(applyDrive._id)
      showToast(getApiErrorMessage(e, 'Could not submit application'), true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow">Opportunities</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Placement Drives</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Discover roles aligned with your career goals.
        </p>
      </div>

      <div className="glass-card mb-5 flex items-center gap-3 p-3">
        <Search className="ml-2 text-slate-400" size={18} />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent p-2 text-sm outline-none placeholder:text-slate-400"
          placeholder="Search companies, roles, locations, skills…"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="mr-1 grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-200"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card h-72 animate-pulse" />
          ))}
        </div>
      ) : filteredDrives.length === 0 ? (
        <EmptyState
          title={debouncedTerm ? 'No matches found' : 'No drives available'}
          text={
            debouncedTerm
              ? 'Try adjusting your search keywords or clear the search box.'
              : 'Check back soon — new placement drives will appear here.'
          }
          action={
            debouncedTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="btn-secondary"
              >
                <X size={14} /> Clear search
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredDrives.map((d) => (
            <div
              key={d._id}
              className="glass-card glass-card-hover group relative flex flex-col p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-500/10 text-emerald-500"
                    onClick={() => openDetail(d)}
                    style={{ cursor: 'pointer' }}
                  >
                    {d.logo ? (
                      <img
                        src={d.logo}
                        alt={d.company}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <Briefcase size={22} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => openDetail(d)}
                      className="text-left"
                    >
                      <h2 className="truncate font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {d.company}
                      </h2>
                      <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                        {d.title}
                      </p>
                    </button>
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <MapPin size={14} className="shrink-0 text-emerald-500" />
                  <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                    {d.location}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <Clock3 size={14} className="shrink-0 text-emerald-500" />
                  <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                    {d.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <Target size={14} className="shrink-0 text-emerald-500" />
                  <span className="truncate font-bold text-emerald-600 dark:text-emerald-400">
                    {d.package}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <Calendar size={14} className="shrink-0 text-emerald-500" />
                  <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                    {formatDate(d.deadline)}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {(d.eligibleCourses?.length || d.minimumCGPA || d.graduationYear) && (
                  <div className="flex flex-wrap gap-1.5">
                    {d.eligibleCourses?.slice(0, 2).map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-400"
                      >
                        <GraduationCap size={11} />
                        {c}
                      </span>
                    ))}
                    {d.minimumCGPA && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                        <Award size={11} />
                        CGPA ≥ {d.minimumCGPA}
                      </span>
                    )}
                    {d.graduationYear && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:text-violet-400">
                        <BookOpen size={11} />
                        {d.graduationYear} Batch
                      </span>
                    )}
                  </div>
                )}
                {d.requiredSkills?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {d.requiredSkills.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
                      >
                        <Sparkles size={11} />
                        {s}
                      </span>
                    ))}
                    {d.requiredSkills.length > 4 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-white/5 dark:text-slate-400">
                        +{d.requiredSkills.length - 4} more
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 pt-1">
                <div className="flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Compensation
                  </p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {d.package}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openDetail(d)}
                    className="btn-secondary !py-2"
                    aria-label="View drive details"
                  >
                    Details <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openApply(d)}
                    className="btn-primary"
                  >
                    Apply now <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailOpen && selectedDrive && (
        <div
          className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/50 p-4 sm:place-items-center"
          onClick={closeDetail}
        >
          <div
            className="glass-card relative w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeDetail}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4 pr-10">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-500/10 text-emerald-500">
                {selectedDrive.logo ? (
                  <img
                    src={selectedDrive.logo}
                    alt={selectedDrive.company}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Briefcase size={28} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {selectedDrive.title}
                </h2>
                <p className="mt-1 font-bold text-slate-700 dark:text-slate-300">
                  {selectedDrive.company}
                </p>
                <div className="mt-3">
                  <StatusBadge status={selectedDrive.status} />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                <MapPin size={18} className="text-emerald-500" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedDrive.location}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                <Clock3 size={18} className="text-emerald-500" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Type
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedDrive.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                <Target size={18} className="text-emerald-500" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Package
                  </p>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {selectedDrive.package}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                <Calendar size={18} className="text-emerald-500" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Deadline
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatDate(selectedDrive.deadline)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                About the role
              </h3>
              <p className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
                {selectedDrive.description || 'No description provided.'}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {(selectedDrive.eligibleCourses?.length ||
                selectedDrive.minimumCGPA ||
                selectedDrive.graduationYear) && (
                <div>
                  <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Eligibility
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedDrive.eligibleCourses?.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-400"
                      >
                        <GraduationCap size={12} /> {c}
                      </span>
                    ))}
                    {selectedDrive.minimumCGPA && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                        <Award size={12} /> CGPA ≥ {selectedDrive.minimumCGPA}
                      </span>
                    )}
                    {selectedDrive.graduationYear && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-400">
                        <BookOpen size={12} /> {selectedDrive.graduationYear} Batch
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedDrive.eligibility && (
                <div>
                  <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Eligibility notes
                  </h3>
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    {selectedDrive.eligibility}
                  </p>
                </div>
              )}

              {selectedDrive.requiredSkills?.length ? (
                <div>
                  <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Required skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedDrive.requiredSkills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400"
                      >
                        <Sparkles size={12} /> {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-7 flex items-center justify-end gap-3 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={closeDetail} className="btn-secondary">
                Close
              </button>
              <button type="button" onClick={() => { closeDetail(); openApply(selectedDrive) }} className="btn-primary">
                Apply now <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {applyOpen && applyDrive && (
        <div
          className="fixed inset-0 z-[90] grid place-items-end bg-slate-950/50 p-4 sm:place-items-center"
          onClick={closeApply}
        >
          <div
            className="glass-card relative w-full max-w-lg max-h-[92vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeApply}
              disabled={submitting}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>

            {applySuccess ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 size={44} className="text-emerald-500" />
                </span>
                <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
                  Application submitted!
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  We’ve received your application for {applyDrive.jobTitle || applyDrive.title} at {applyDrive.company}.
                  Good luck!
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4 pr-10">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-500/10 text-emerald-500">
                    {applyDrive.logo ? (
                      <img
                        src={applyDrive.logo}
                        alt={applyDrive.company}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Briefcase size={24} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {applyDrive.jobTitle || applyDrive.title}
                    </h3>
                    <p className="mt-0.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                      {applyDrive.company}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {applyDrive.location} • {applyDrive.type}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <FileText size={12} /> Resume
                    </label>
                    {resumesLoading ? (
                      <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
                    ) : resumes.length > 0 && !newResume ? (
                      <div className="space-y-3">
                        <div className="grid gap-2">
                          {resumes.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setSelectedResumeId(r.id)}
                              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                                selectedResumeId === r.id
                                  ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-white/5'
                              }`}
                              style={{
                                borderColor:
                                  selectedResumeId === r.id
                                    ? undefined
                                    : 'var(--border)',
                              }}
                            >
                              <span
                                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                                  selectedResumeId === r.id
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-slate-100 text-slate-400 dark:bg-white/5'
                                }`}
                              >
                                <FileText size={18} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {r.originalName}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {new Date(r.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                              {selectedResumeId === r.id && (
                                <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                              )}
                            </button>
                          ))}
                        </div>
                        <p className="text-center text-xs text-slate-400">or</p>
                      </div>
                    ) : null}
                    <ResumeUploader
                      onUploadComplete={handleResumeUploaded}
                      existingResume={newResume}
                      allowReplace={true}
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <BookOpen size={12} /> Cover letter (optional)
                    </label>
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      placeholder="Tell the recruiter why you're a great fit for this role…"
                      className="input resize-none"
                    />
                    <p className="mt-1 text-right text-[11px] text-slate-400">
                      {coverLetter.length}/2000
                    </p>
                  </div>
                </div>

                <div className="mt-7 flex items-center justify-end gap-3 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={closeApply}
                    className="btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitApplication}
                    className="btn-primary min-w-[170px]"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Submitting…
                      </>
                    ) : (
                      <>
                        Submit Application <CheckCircle2 size={16} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast.message && <Toast message={toast.message} error={toast.error} />}
    </div>
  )
}
