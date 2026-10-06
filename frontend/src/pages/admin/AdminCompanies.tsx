import { useCallback, useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../../lib/api'
import type { Company, Drive } from '../../types'
import EmptyState from '../../components/EmptyState'
import Toast from '../../components/Toast'
import ConfirmDialog from '../../components/ConfirmDialog'
import StatusBadge from '../../components/StatusBadge'
import StatCard from '../../components/StatCard'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import {
  Plus,
  Search,
  Building2,
  Pencil,
  Power,
  PowerOff,
  Eye,
  ChevronRight,
  MapPin,
  Briefcase,
  Users,
  Award,
  FileText,
  Globe,
  Phone,
  Mail,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

type FormState = {
  name: string
  logo: string
  website: string
  industry: string
  description: string
  location: string
  companySize: string
  recruiterName: string
  recruiterEmail: string
  recruiterPhone: string
}

const emptyForm: FormState = {
  name: '',
  logo: '',
  website: '',
  industry: '',
  description: '',
  location: '',
  companySize: '',
  recruiterName: '',
  recruiterEmail: '',
  recruiterPhone: '',
}

type DetailResponse = {
  company: Company
  activeDrives: Drive[]
  pastDrives: Drive[]
  draftDrives: Drive[]
  shortlistedCount: number
  selectedCount: number
  applicationCount: number
  driveCount: number
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [toastMsg, setToastMsg] = useState('')
  const [toastError, setToastError] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<DetailResponse | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<Company | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const showToast = useCallback((message: string, error = false) => {
    setToastMsg(message)
    setToastError(error)
    setTimeout(() => setToastMsg(''), 2500)
  }, [])

  const load = useCallback(async () => {
    try {
      const r = await api.get('/admin/companies')
      setCompanies(r.data.companies || [])
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e, 'Failed to load companies'), true)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0)
    return () => clearTimeout(timer)
  }, [load])

  const filtered = companies.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.industry || '').toLowerCase().includes(q) ||
      (c.location || '').toLowerCase().includes(q) ||
      (c.recruiterName || '').toLowerCase().includes(q) ||
      (c.recruiterEmail || '').toLowerCase().includes(q)
    )
  })

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (c: Company) => {
    setEditingId(c._id)
    setForm({
      name: c.name || '',
      logo: c.logo || '',
      website: c.website || '',
      industry: c.industry || '',
      description: c.description || '',
      location: c.location || '',
      companySize: c.companySize || '',
      recruiterName: c.recruiterName || '',
      recruiterEmail: c.recruiterEmail || '',
      recruiterPhone: c.recruiterPhone || '',
    })
    setFormError('')
    setFormOpen(true)
  }

  const submitForm = async () => {
    if (!form.name.trim()) {
      setFormError('Company name is required')
      return
    }
    setFormLoading(true)
    setFormError('')
    try {
      if (editingId) {
        await api.patch(`/companies/${editingId}`, form)
        showToast('Company updated')
      } else {
        await api.post('/companies', form)
        showToast('Company created')
      }
      setFormOpen(false)
      setLoading(true)
      await load()
    } catch (e: unknown) {
      setFormError(getApiErrorMessage(e, 'Failed to save company'))
    } finally {
      setFormLoading(false)
    }
  }

  const openDetail = async (c: Company) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetail(null)
    try {
      const r = await api.get(`/companies/${c._id}`)
      setDetail(r.data)
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e, 'Failed to load company details'), true)
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const openToggleConfirm = (c: Company) => {
    setConfirmTarget(c)
    setConfirmOpen(true)
  }

  const confirmToggle = async () => {
    if (!confirmTarget) return
    setConfirmBusy(true)
    try {
      await api.patch(`/companies/${confirmTarget._id}`, { isActive: !confirmTarget.isActive })
      showToast(confirmTarget.isActive ? 'Company deactivated' : 'Company activated')
      setConfirmOpen(false)
      setConfirmTarget(null)
      setLoading(true)
      await load()
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e, 'Failed to update status'), true)
    } finally {
      setConfirmBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Recruiters</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Companies</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Manage recruiter partnerships and drive performance.
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} />
          Add Company
        </button>
      </div>

      <div className="glass-card mb-6 p-3">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search by name, industry, location, recruiter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card h-56 animate-pulse bg-slate-100/80 dark:bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No matching companies' : 'No companies yet'}
          text={search ? 'Try adjusting your search term.' : 'Create your first recruiter company to start organising placement drives.'}
          action={
            <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} />
              Add Company
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c._id} className="glass-card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {c.logo ? (
                    <img src={c.logo} alt={c.name} className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Building2 size={22} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">{c.name}</h3>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      {c.industry && (
                        <span className="inline-flex items-center gap-1">
                          <Briefcase size={12} />
                          {c.industry}
                        </span>
                      )}
                      {c.industry && c.location && <span>•</span>}
                      {c.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} />
                          {c.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${c.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'}`}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {(c.recruiterName || c.recruiterEmail) && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/5">
                  <p className="mb-1 font-bold text-slate-700 dark:text-slate-300">Recruiter</p>
                  {c.recruiterName && <p className="font-medium">{c.recruiterName}</p>}
                  {c.recruiterEmail && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-slate-500">
                      <Mail size={12} />
                      {c.recruiterEmail}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-400">
                  <FileText size={12} />
                  {c.driveCount ?? 0}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                  <Users size={12} />
                  {c.applicationCount ?? 0}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <CheckCircle2 size={12} />
                  {c.shortlistedCount ?? 0}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <Award size={12} />
                  {c.selectedCount ?? 0}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openDetail(c)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
                    title="View"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
                <button
                  onClick={() => openToggleConfirm(c)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${c.isActive ? 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400'}`}
                >
                  {c.isActive ? (
                    <>
                      <PowerOff size={13} />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Power size={13} />
                      Activate
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/50 p-4 sm:place-items-center" onClick={() => !formLoading && setFormOpen(false)}>
          <div className="glass-card w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black">{editingId ? 'Edit Company' : 'Add Company'}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingId ? 'Update the recruiter company information.' : 'Create a new recruiter company entry.'}
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
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Company Name <span className="text-rose-500">*</span></label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Technologies" disabled={formLoading} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Logo URL</label>
                <input className="input" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="https://…logo.png" disabled={formLoading} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Website</label>
                <input className="input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://company.com" disabled={formLoading} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Industry</label>
                <input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Fintech" disabled={formLoading} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Company Size</label>
                <input className="input" value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })} placeholder="e.g. 500-1000" disabled={formLoading} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Description</label>
                <textarea className="input min-h-[90px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A short paragraph about the company…" disabled={formLoading} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Location</label>
                <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Bengaluru, India" disabled={formLoading} />
              </div>
              <div className="md:col-span-2 border-t border-slate-100 pt-4 dark:border-white/5">
                <h3 className="mb-3 text-sm font-black text-slate-700 dark:text-slate-300">Recruiter Contact</h3>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Name</label>
                <input className="input" value={form.recruiterName} onChange={(e) => setForm({ ...form, recruiterName: e.target.value })} placeholder="Recruiter name" disabled={formLoading} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Email</label>
                <input className="input" value={form.recruiterEmail} onChange={(e) => setForm({ ...form, recruiterEmail: e.target.value })} placeholder="recruiter@company.com" disabled={formLoading} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Phone</label>
                <input className="input" value={form.recruiterPhone} onChange={(e) => setForm({ ...form, recruiterPhone: e.target.value })} placeholder="+91 98765 43210" disabled={formLoading} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={formLoading}>
                Cancel
              </button>
              <button className="btn-primary inline-flex items-center gap-2" onClick={submitForm} disabled={formLoading}>
                {formLoading && <Loader2 size={16} className="animate-spin" />}
                {editingId ? 'Save Changes' : 'Create Company'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/50 p-4 sm:place-items-center" onClick={() => !detailLoading && setDetailOpen(false)}>
          <div className="glass-card w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between gap-3">
              <div className="flex items-start gap-4">
                {detail?.company?.logo ? (
                  <img src={detail.company.logo} alt={detail.company.name} className="h-16 w-16 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-white/10" />
                ) : (
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Building2 size={28} />
                  </span>
                )}
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{detail?.company?.name || 'Loading…'}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                    {detail?.company?.industry && (
                      <span className="inline-flex items-center gap-1">
                        <Briefcase size={14} />
                        {detail.company.industry}
                      </span>
                    )}
                    {detail?.company?.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={14} />
                        {detail.company.location}
                      </span>
                    )}
                    {detail?.company?.companySize && (
                      <span className="inline-flex items-center gap-1">
                        <Users size={14} />
                        {detail.company.companySize} employees
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${detail?.company?.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'}`}>
                  {detail?.company?.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => !detailLoading && setDetailOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <LoadingSkeleton rows={4} />
            ) : detail ? (
              <>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Drives" value={detail.driveCount ?? 0} hint="Total drives" icon={FileText} index={0} />
                  <StatCard label="Applications" value={detail.applicationCount ?? 0} hint="Total submitted" icon={Users} index={1} />
                  <StatCard label="Shortlisted" value={detail.shortlistedCount ?? 0} hint="Candidates shortlisted" icon={CheckCircle2} index={2} />
                  <StatCard label="Selected" value={detail.selectedCount ?? 0} hint="Offers extended" icon={Award} index={3} />
                </div>

                {(detail.company.website || detail.company.recruiterName || detail.company.recruiterEmail || detail.company.recruiterPhone || detail.company.description) && (
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {detail.company.description && (
                      <div className="glass-card md:col-span-2 p-5">
                        <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">About</h3>
                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{detail.company.description}</p>
                      </div>
                    )}
                    {detail.company.website && (
                      <div className="glass-card p-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <Globe size={14} /> Website
                        </div>
                        <a href={detail.company.website} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-slate-900 hover:text-emerald-600 dark:text-white">
                          {detail.company.website}
                          <ChevronRight size={14} />
                        </a>
                      </div>
                    )}
                    {detail.company.recruiterName && (
                      <div className="glass-card p-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <Users size={14} /> Recruiter
                        </div>
                        <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{detail.company.recruiterName}</p>
                        {detail.company.recruiterEmail && (
                          <a href={`mailto:${detail.company.recruiterEmail}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600">
                            <Mail size={12} />
                            {detail.company.recruiterEmail}
                          </a>
                        )}
                        {detail.company.recruiterPhone && (
                          <a href={`tel:${detail.company.recruiterPhone}`} className="mt-0.5 block inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600">
                            <Phone size={12} />
                            {detail.company.recruiterPhone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {detail.activeDrives?.length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Active Drives
                    </h3>
                    <div className="glass-card overflow-hidden">
                      {detail.activeDrives.map((d, i, arr) => (
                        <div key={d._id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${i !== arr.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
                          <div>
                            <p className="font-bold">{d.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {d.location} • {d.package} • Deadline {new Date(d.deadline).toLocaleDateString()}
                            </p>
                          </div>
                          <StatusBadge status={d.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.pastDrives?.length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                      Past Drives
                    </h3>
                    <div className="glass-card overflow-hidden">
                      {detail.pastDrives.map((d, i, arr) => (
                        <div key={d._id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${i !== arr.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
                          <div>
                            <p className="font-bold">{d.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {d.location} • {d.package}
                            </p>
                          </div>
                          <StatusBadge status={d.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!detail.activeDrives?.length && !detail.pastDrives?.length && (
                  <div className="mt-6 glass-card p-8 text-center text-sm text-slate-500">
                    No drives associated with this company yet.
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTarget?.isActive ? 'Deactivate Company' : 'Activate Company'}
        text={confirmTarget?.isActive
          ? `Are you sure you want to deactivate "${confirmTarget.name}"? Its drives will no longer be visible to students but data will be preserved.`
          : `Are you sure you want to activate "${confirmTarget?.name}"? It will become visible to students.`
        }
        confirmLabel={confirmTarget?.isActive ? 'Deactivate' : 'Activate'}
        danger={!!confirmTarget?.isActive}
        busy={confirmBusy}
        onClose={() => !confirmBusy && setConfirmOpen(false)}
        onConfirm={confirmToggle}
      />

      {toastMsg && <Toast message={toastMsg} error={toastError} />}
    </div>
  )
}
