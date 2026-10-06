import { useCallback, useEffect, useRef, useState } from 'react'
import { api, getApiErrorMessage } from '../../lib/api'
import type { Company, Drive } from '../../types'
import Toast from '../../components/Toast'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Users,
  XCircle,
  CheckCircle,
  Ban,
  Building2,
  ChevronDown,
  Calendar,
  MapPin,
  Briefcase,
  Target,
  Clock3,
  BookOpen,
  Award,
  Sparkles,
  Loader2,
  X,
  Save,
  ChevronRight,
} from 'lucide-react'
import { humanizeStatus } from '../../lib/status'

const DRIVE_FILTERS = ['ALL', 'DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED'] as const
type DriveFilter = (typeof DRIVE_FILTERS)[number]

const JOB_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Intern + PPO', 'FTE'] as const

type FormState = {
  companyId: string
  title: string
  location: string
  type: string
  package: string
  deadline: string
  driveDate: string
  description: string
  eligibility: string
  eligibleCourses: string
  minimumCGPA: string
  graduationYear: string
  requiredSkills: string
  status: 'DRAFT' | 'PUBLISHED'
}

const emptyForm: FormState = {
  companyId: '',
  title: '',
  location: '',
  type: 'Full-time',
  package: '',
  deadline: '',
  driveDate: '',
  description: '',
  eligibility: '',
  eligibleCourses: '',
  minimumCGPA: '',
  graduationYear: '',
  requiredSkills: '',
  status: 'DRAFT',
}

function toInputDate(dateStr?: string) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch {
    return ''
  }
}

function splitCSV(str: string): string[] {
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function AdminDrives() {
  const [drives, setDrives] = useState<Drive[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<DriveFilter>('ALL')
  const [filterCounts, setFilterCounts] = useState<Record<string, number>>({
    ALL: 0,
    DRAFT: 0,
    PUBLISHED: 0,
    CLOSED: 0,
    CANCELLED: 0,
  })

  const [search, setSearch] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [companies, setCompanies] = useState<Company[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(true)

  const [toastMsg, setToastMsg] = useState('')
  const [toastError, setToastError] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string
    text: string
    confirmLabel: string
    danger: boolean
    driveId: string | null
    newStatus: string | null
  }>({ title: '', text: '', confirmLabel: '', danger: false, driveId: null, newStatus: null })
  const [confirmBusy, setConfirmBusy] = useState(false)

  const showToast = useCallback((message: string, error = false) => {
    setToastMsg(message)
    setToastError(error)
    setTimeout(() => setToastMsg(''), 2800)
  }, [])

  const loadDrives = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (activeFilter !== 'ALL') params.status = activeFilter
      if (debouncedSearch) params.q = debouncedSearch
      const r = await api.get('/drives', { params })
      const list: Drive[] = r.data.drives || []
      setDrives(list)

      const counts: Record<string, number> = { ALL: 0, DRAFT: 0, PUBLISHED: 0, CLOSED: 0, CANCELLED: 0 }
      if (debouncedSearch) {
        counts.ALL = list.length
        for (const d of list) {
          const s = (d.status || '').toUpperCase()
          if (counts[s] !== undefined) counts[s]++
        }
      } else {
        try {
          const all = await api.get('/drives')
          const allList: Drive[] = all.data.drives || []
          counts.ALL = allList.length
          for (const d of allList) {
            const s = (d.status || '').toUpperCase()
            if (counts[s] !== undefined) counts[s]++
          }
        } catch {
          counts.ALL = list.length
          for (const d of list) {
            const s = (d.status || '').toUpperCase()
            if (counts[s] !== undefined) counts[s]++
          }
        }
      }
      setFilterCounts(counts)
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e, 'Failed to load drives'), true)
    } finally {
      setLoading(false)
    }
  }, [activeFilter, debouncedSearch, showToast])

  const loadCompanies = useCallback(async () => {
    try {
      const r = await api.get('/admin/companies')
      setCompanies(r.data.companies || [])
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e, 'Failed to load companies'), true)
    } finally {
      setCompaniesLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDrives()
      void loadCompanies()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadDrives, loadCompanies])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setLoading(true)
      setDebouncedSearch(search.trim())
    }, 350)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [search])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setFormOpen(true)
    if (companies.length === 0) {
      setCompaniesLoading(true)
      loadCompanies()
    }
  }

  const openEdit = (d: Drive) => {
    setEditingId(d._id)
    setForm({
      companyId: d.companyId || '',
      title: d.title || '',
      location: d.location || '',
      type: d.type || 'Full-time',
      package: d.package || '',
      deadline: toInputDate(d.deadline),
      driveDate: toInputDate(d.driveDate),
      description: d.description || '',
      eligibility: d.eligibility || '',
      eligibleCourses: (d.eligibleCourses || []).join(', '),
      minimumCGPA: d.minimumCGPA !== undefined && d.minimumCGPA !== null ? String(d.minimumCGPA) : '',
      graduationYear: d.graduationYear ? String(d.graduationYear) : '',
      requiredSkills: (d.requiredSkills || []).join(', '),
      status: (d.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'),
    })
    setFormError('')
    setFormOpen(true)
    if (companies.length === 0) loadCompanies()
  }

  const submitForm = async () => {
    if (!form.companyId.trim()) {
      setFormError('Please select a company')
      return
    }
    if (!form.title.trim()) {
      setFormError('Job title is required')
      return
    }
    if (!form.location.trim()) {
      setFormError('Location is required')
      return
    }
    if (!form.package.trim()) {
      setFormError('Package is required')
      return
    }
    if (!form.deadline) {
      setFormError('Application deadline is required')
      return
    }

    setFormLoading(true)
    setFormError('')

    const payload: {
      companyId: string
      title: string
      location: string
      type: string
      package: string
      deadline: string
      description: string
      eligibility: string
      eligibleCourses: string[]
      requiredSkills: string[]
      status: 'DRAFT' | 'PUBLISHED'
      driveDate?: string
      minimumCGPA?: number
      graduationYear?: number
    } = {
      companyId: form.companyId,
      title: form.title.trim(),
      location: form.location.trim(),
      type: form.type,
      package: form.package.trim(),
      deadline: new Date(form.deadline).toISOString(),
      description: form.description.trim(),
      eligibility: form.eligibility.trim(),
      eligibleCourses: splitCSV(form.eligibleCourses),
      requiredSkills: splitCSV(form.requiredSkills),
      status: form.status,
    }
    if (form.driveDate) payload.driveDate = new Date(form.driveDate).toISOString()
    if (form.minimumCGPA.trim()) payload.minimumCGPA = parseFloat(form.minimumCGPA)
    if (form.graduationYear.trim()) payload.graduationYear = parseInt(form.graduationYear, 10)

    try {
      if (editingId) {
        await api.patch(`/drives/${editingId}`, payload)
        showToast('Drive updated successfully')
      } else {
        await api.post('/admin/drives', payload)
        showToast('Drive created successfully')
      }
      setFormOpen(false)
      setLoading(true)
      await loadDrives()
    } catch (e: unknown) {
      setFormError(getApiErrorMessage(e, 'Failed to save drive'))
    } finally {
      setFormLoading(false)
    }
  }

  const requestStatusChange = (drive: Drive, newStatus: string) => {
    setOpenDropdownId(null)
    const upper = newStatus.toUpperCase()
    if (upper === 'PUBLISHED') {
      patchDriveStatus(drive._id, upper)
      return
    }

    if (upper === 'CLOSED') {
      setConfirmConfig({
        title: 'Close applications',
        text: `Are you sure you want to close applications for "${drive.title}" at ${drive.company}? Students will no longer be able to apply.`,
        confirmLabel: 'Close drive',
        danger: true,
        driveId: drive._id,
        newStatus: upper,
      })
      setConfirmOpen(true)
      return
    }

    if (upper === 'CANCELLED') {
      setConfirmConfig({
        title: 'Cancel drive',
        text: `Are you sure you want to cancel "${drive.title}" at ${drive.company}? This action will cancel the entire placement drive and cannot be undone.`,
        confirmLabel: 'Cancel drive',
        danger: true,
        driveId: drive._id,
        newStatus: upper,
      })
      setConfirmOpen(true)
    }
  }

  const patchDriveStatus = async (driveId: string, newStatus: string) => {
    try {
      await api.patch(`/drives/${driveId}`, { status: newStatus })
      showToast(`Drive ${newStatus.toLowerCase() === 'cancelled' ? 'cancelled' : newStatus.toLowerCase() === 'closed' ? 'closed' : 'published'}`)
      setLoading(true)
      await loadDrives()
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e, 'Failed to update drive status'), true)
    }
  }

  const confirmStatusChange = async () => {
    if (!confirmConfig.driveId || !confirmConfig.newStatus) return
    setConfirmBusy(true)
    try {
      await patchDriveStatus(confirmConfig.driveId, confirmConfig.newStatus)
      setConfirmOpen(false)
      setConfirmConfig({ title: '', text: '', confirmLabel: '', danger: false, driveId: null, newStatus: null })
    } finally {
      setConfirmBusy(false)
    }
  }

  const closeDropdowns = () => setOpenDropdownId(null)

  useEffect(() => {
    const handler = () => closeDropdowns()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  return (
    <div onClick={closeDropdowns}>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Opportunity management</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Placement Drives</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Create, schedule, and manage company placement drives and recruitment opportunities.
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} />
          New drive
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {DRIVE_FILTERS.map((f) => {
          const active = activeFilter === f
          return (
            <button
              key={f}
              onClick={() => {
                if (f !== activeFilter) {
                  setLoading(true)
                  setActiveFilter(f)
                }
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
                active
                  ? 'bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900'
                  : 'bg-white/60 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              {humanizeStatus(f)}
              <span
                className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                  active ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                }`}
              >
                {filterCounts[f] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      <div className="glass-card mb-5 flex items-center gap-3 p-3">
        <Search size={18} className="ml-2 shrink-0 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent p-2 text-sm outline-none placeholder:text-slate-400"
          placeholder="Search by company, job title, or location…"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="mr-1 grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-200"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : drives.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'No drives match your search' : activeFilter === 'ALL' ? 'No drives yet' : `No ${humanizeStatus(activeFilter).toLowerCase()} drives`}
          text={
            debouncedSearch
              ? 'Try adjusting your search or switch to a different status filter.'
              : 'Create your first placement drive to start collecting student applications.'
          }
          action={
            <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} />
              New drive
            </button>
          }
        />
      ) : (
        <>
          <div className="glass-card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-white/5 dark:bg-white/5">
                    <th className="px-5 py-4">Company / Role</th>
                    <th className="px-5 py-4">Location</th>
                    <th className="px-5 py-4">Package</th>
                    <th className="px-5 py-4">Deadline / Drive</th>
                    <th className="px-5 py-4">Applicants</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drives.map((d) => {
                    const company = companies.find((c) => c._id === (d.companyId || ''))
                    const logo = d.logo || company?.logo
                    const companyName = d.company || company?.name || 'Unknown'
                    return (
                      <tr key={d._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40 dark:border-white/5 dark:hover:bg-white/[0.02]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {logo ? (
                              <img
                                src={logo}
                                alt={companyName}
                                className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10"
                                onError={(e) => {
                                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            ) : (
                              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Building2 size={20} />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-bold">{companyName}</p>
                              <p className="mt-0.5 truncate text-sm text-slate-500">{d.title}</p>
                              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                                <Clock3 size={11} />
                                <span>{d.type}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                            <MapPin size={13} className="text-slate-400" />
                            {d.location}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            <Target size={13} />
                            {d.package}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm">
                            <div className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                              <Calendar size={13} className="text-slate-400" />
                              {d.deadline ? new Date(d.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </div>
                            {d.driveDate && (
                              <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-400">
                                <Sparkles size={11} />
                                Drive: {new Date(d.driveDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-400">
                            <Users size={12} />
                            {d.applicants ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openEdit(d)}
                              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
                              title="Edit drive"
                            >
                              <Pencil size={15} />
                            </button>
                            <a
                              href={`/admin/applications?drive=${d._id}`}
                              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-sky-700 dark:hover:bg-white/5 dark:hover:text-sky-400"
                              title="View applicants"
                            >
                              <Users size={15} />
                            </a>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdownId(openDropdownId === d._id ? null : d._id)
                                }}
                                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
                                title="Status actions"
                              >
                                <MoreHorizontal size={15} />
                              </button>
                              {openDropdownId === d._id && (
                                <div
                                  className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-slate-900"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {d.status?.toUpperCase() === 'DRAFT' && (
                                    <button
                                      onClick={() => requestStatusChange(d, 'PUBLISHED')}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                                    >
                                      <CheckCircle size={15} />
                                      Publish drive
                                    </button>
                                  )}
                                  {d.status?.toUpperCase() === 'PUBLISHED' && (
                                    <button
                                      onClick={() => requestStatusChange(d, 'CLOSED')}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                                    >
                                      <XCircle size={15} />
                                      Close applications
                                    </button>
                                  )}
                                  {d.status?.toUpperCase() !== 'CANCELLED' && (
                                    <button
                                      onClick={() => requestStatusChange(d, 'CANCELLED')}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-rose-700 hover:bg-rose-500/10 dark:text-rose-400"
                                    >
                                      <Ban size={15} />
                                      Cancel drive
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {drives.map((d) => {
              const company = companies.find((c) => c._id === (d.companyId || ''))
              const logo = d.logo || company?.logo
              const companyName = d.company || company?.name || 'Unknown'
              return (
                <div key={d._id} className="glass-card p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {logo ? (
                        <img
                          src={logo}
                          alt={companyName}
                          className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Building2 size={20} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{companyName}</p>
                        <p className="mt-0.5 truncate text-sm font-medium text-slate-700 dark:text-slate-300">{d.title}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={11} />
                            {d.location}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <Target size={11} />
                            {d.package}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-400">
                            <Users size={10} />
                            {d.applicants ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs dark:border-white/5">
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Calendar size={11} />
                      {d.deadline ? new Date(d.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No deadline'}
                    </span>
                    {d.driveDate && (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Sparkles size={11} />
                        Drive: {new Date(d.driveDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Clock3 size={11} />
                      {d.type}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(d)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <a
                      href={`/admin/applications?drive=${d._id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-500/10 dark:text-sky-400"
                    >
                      <Users size={13} />
                      Applicants
                      <ChevronRight size={12} />
                    </a>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenDropdownId(openDropdownId === d._id ? null : d._id)
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {openDropdownId === d._id && (
                        <div
                          className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-slate-900"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {d.status?.toUpperCase() === 'DRAFT' && (
                            <button
                              onClick={() => requestStatusChange(d, 'PUBLISHED')}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                            >
                              <CheckCircle size={13} /> Publish
                            </button>
                          )}
                          {d.status?.toUpperCase() === 'PUBLISHED' && (
                            <button
                              onClick={() => requestStatusChange(d, 'CLOSED')}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                            >
                              <XCircle size={13} /> Close
                            </button>
                          )}
                          {d.status?.toUpperCase() !== 'CANCELLED' && (
                            <button
                              onClick={() => requestStatusChange(d, 'CANCELLED')}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-500/10 dark:text-rose-400"
                            >
                              <Ban size={13} /> Cancel
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
        </>
      )}

      {formOpen && (
        <div
          className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/50 p-4 sm:place-items-center"
          onClick={() => !formLoading && setFormOpen(false)}
        >
          <div
            className="glass-card w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{editingId ? 'Edit Drive' : 'New Placement Drive'}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingId
                    ? 'Update the placement drive details and eligibility criteria.'
                    : 'Set up a new placement drive linked to a recruiter company.'}
                </p>
              </div>
              <button
                onClick={() => !formLoading && setFormOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
                disabled={formLoading}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                {formError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Company <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    className="input pl-10 appearance-none pr-10"
                    value={form.companyId}
                    onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                    disabled={formLoading || companiesLoading}
                  >
                    <option value="">{companiesLoading ? 'Loading companies…' : 'Select a company…'}</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}{c.industry ? ` — ${c.industry}` : ''}{c.location ? ` (${c.location})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Job Title <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-10"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Software Development Engineer"
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Employment Type
                </label>
                <div className="relative">
                  <Clock3 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    className="input pl-10 appearance-none pr-10"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    disabled={formLoading}
                  >
                    {JOB_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Location <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-10"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Bengaluru, Hybrid"
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Package / Stipend <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Target size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-10"
                    value={form.package}
                    onChange={(e) => setForm({ ...form, package: e.target.value })}
                    placeholder="e.g. ₹12 LPA or ₹25k / month"
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Application Deadline <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    className="input pl-10"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Drive Date
                </label>
                <div className="relative">
                  <Sparkles size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    className="input pl-10"
                    value={form.driveDate}
                    onChange={(e) => setForm({ ...form, driveDate: e.target.value })}
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Minimum CGPA
                </label>
                <div className="relative">
                  <Award size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    className="input pl-10"
                    value={form.minimumCGPA}
                    onChange={(e) => setForm({ ...form, minimumCGPA: e.target.value })}
                    placeholder="e.g. 7.0"
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Graduation Year (Batch)
                </label>
                <div className="relative">
                  <BookOpen size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="2020"
                    max="2040"
                    className="input pl-10"
                    value={form.graduationYear}
                    onChange={(e) => setForm({ ...form, graduationYear: e.target.value })}
                    placeholder="e.g. 2026"
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Eligible Courses <span className="text-slate-400 font-normal"> (comma separated)</span>
                </label>
                <div className="relative">
                  <BookOpen size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                  <input
                    className="input pl-10"
                    value={form.eligibleCourses}
                    onChange={(e) => setForm({ ...form, eligibleCourses: e.target.value })}
                    placeholder="B.Tech CSE, B.Tech IT, MCA, MBA"
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Required Skills <span className="text-slate-400 font-normal"> (comma separated)</span>
                </label>
                <div className="relative">
                  <Sparkles size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                  <input
                    className="input pl-10"
                    value={form.requiredSkills}
                    onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })}
                    placeholder="JavaScript, React, Node.js, SQL, Problem Solving"
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Job Description
                </label>
                <textarea
                  className="input min-h-[110px] resize-y"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the role, responsibilities, team, growth opportunities…"
                  disabled={formLoading}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Eligibility / Additional Criteria
                </label>
                <textarea
                  className="input min-h-[90px] resize-y"
                  value={form.eligibility}
                  onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
                  placeholder="Any additional eligibility criteria, academic requirements, selection process notes…"
                  disabled={formLoading}
                />
              </div>

              <div className="md:col-span-2 border-t border-slate-100 pt-4 dark:border-white/5">
                <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Publishing Status
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    form.status === 'DRAFT'
                      ? 'border-amber-400 bg-amber-500/5 ring-2 ring-amber-500/20 dark:border-amber-500/40'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                  }`}>
                    <input
                      type="radio"
                      name="drive-status"
                      checked={form.status === 'DRAFT'}
                      onChange={() => setForm({ ...form, status: 'DRAFT' })}
                      disabled={formLoading}
                      className="mt-0.5 accent-amber-500"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Draft</p>
                      <p className="mt-0.5 text-xs text-slate-500">Save internally. Students won't see this drive yet.</p>
                    </div>
                  </label>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    form.status === 'PUBLISHED'
                      ? 'border-emerald-400 bg-emerald-500/5 ring-2 ring-emerald-500/20 dark:border-emerald-500/40'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                  }`}>
                    <input
                      type="radio"
                      name="drive-status"
                      checked={form.status === 'PUBLISHED'}
                      onChange={() => setForm({ ...form, status: 'PUBLISHED' })}
                      disabled={formLoading}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Published</p>
                      <p className="mt-0.5 text-xs text-slate-500">Immediately visible and open for student applications.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-2 border-t border-slate-100 pt-5 dark:border-white/5">
              <p className="text-xs text-slate-400">
                {editingId ? 'Last changes cannot be undone.' : 'You can preview and publish later from Draft status.'}
              </p>
              <div className="flex items-center gap-2">
                <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={formLoading}>
                  Cancel
                </button>
                <button className="btn-primary inline-flex items-center gap-2" onClick={submitForm} disabled={formLoading}>
                  {formLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {editingId ? 'Save Changes' : 'Create Drive'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        text={confirmConfig.text}
        confirmLabel={confirmConfig.confirmLabel}
        danger={confirmConfig.danger}
        busy={confirmBusy}
        onClose={() => !confirmBusy && setConfirmOpen(false)}
        onConfirm={confirmStatusChange}
      />

      {toastMsg && <Toast message={toastMsg} error={toastError} />}
    </div>
  )
}
