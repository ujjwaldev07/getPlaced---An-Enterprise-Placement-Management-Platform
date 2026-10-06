import { useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../../lib/api'
import StatCard from '../../components/StatCard'
import Toast from '../../components/Toast'
import EmptyState from '../../components/EmptyState'
import {
  Users,
  Building2,
  Briefcase,
  FileCheck2,
  CheckCircle2,
  CalendarDays,
  Award,
  TrendingUp,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts'
import { humanizeStatus } from '../../lib/status'

const STATUS_COLORS: Record<string, string> = {
  APPLIED: '#10b981',
  UNDER_REVIEW: '#0ea5e9',
  SHORTLISTED: '#8b5cf6',
  INTERVIEW_SCHEDULED: '#0ea5e9',
  INTERVIEWED: '#6366f1',
  SELECTED: '#f59e0b',
  REJECTED: '#f43f5e',
  WITHDRAWN: '#64748b',
}

function getStatusColor(status: string) {
  const upper = (status || '').toUpperCase()
  return STATUS_COLORS[upper] ?? '#64748b'
}

type AnalyticsStats = {
  students?: number
  companies?: number
  drives?: number
  applications?: number
  shortlisted?: number
  interviews?: number
  selected?: number
  selectionRate?: number
}

type AnalyticsTrendItem = {
  name: string
  applications: number
}

type AnalyticsStatusItem = {
  name: string
  value: number
}

type AnalyticsCompanyItem = {
  name: string
  applications: number
}

type AnalyticsParticipationItem = {
  name: string
  applicants: number
}

type AnalyticsData = {
  stats?: AnalyticsStats
  trend?: AnalyticsTrendItem[]
  byCompany?: AnalyticsCompanyItem[]
  status?: AnalyticsStatusItem[]
  participation?: AnalyticsParticipationItem[]
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null)

  useEffect(() => {
    let mounted = true
    //setLoading(true)
    api
      .get('/analytics/admin')
      .then((r) => {
        if (mounted) {
          setData(r.data || null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (mounted) {
          setLoading(false)
          setToast({ message: getApiErrorMessage(err, 'Failed to load analytics'), error: true })
          setTimeout(() => setToast(null), 4000)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  const stats = data?.stats || {}
  const trend = data?.trend || []
  const byCompany = data?.byCompany || []
  const statusData = data?.status || []
  const participation = data?.participation || []

  const hasTrend = Array.isArray(trend) && trend.length > 0
  const hasStatus = Array.isArray(statusData) && statusData.length > 0
  const hasCompany = Array.isArray(byCompany) && byCompany.length > 0
  const hasParticipation = Array.isArray(participation) && participation.length > 0

  const tickIndices = (() => {
    if (!hasTrend) return []
    const n = trend.length
    const count = Math.min(5, n)
    const step = Math.max(1, Math.floor((n - 1) / (count - 1 || 1)))
    const out: number[] = []
    for (let i = 0; i < n; i += step) out.push(i)
    if (out[out.length - 1] !== n - 1) out.push(n - 1)
    return out
  })()

  if (loading) {
    return (
      <div>
        <div className="mb-7">
          <div className="h-3 w-36 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          <div className="mt-2 h-9 w-72 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          <div className="mt-3 h-4 w-96 animate-pulse rounded bg-slate-200/70 dark:bg-white/5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="glass-card h-[116px] animate-pulse bg-slate-100/80 dark:bg-white/5"
            />
          ))}
        </div>
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
          <div className="glass-card h-80 animate-pulse bg-slate-100/80 dark:bg-white/5" />
          <div className="glass-card h-80 animate-pulse bg-slate-100/80 dark:bg-white/5" />
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="glass-card h-80 animate-pulse bg-slate-100/80 dark:bg-white/5" />
          <div className="glass-card h-80 animate-pulse bg-slate-100/80 dark:bg-white/5" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow">Admin command center</p>
        <h1 className="mt-1 text-3xl font-black">Placement Overview</h1>
        <p className="mt-2 text-sm text-slate-500">
          Live operational snapshot for your placement team.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Students"
          value={stats.students ?? 0}
          hint="Registered students"
          icon={Users}
          index={0}
        />
        <StatCard
          label="Active Companies"
          value={stats.companies ?? 0}
          hint="Active partnerships"
          icon={Building2}
          index={1}
        />
        <StatCard
          label="Active Drives"
          value={stats.drives ?? 0}
          hint="Currently open drives"
          icon={Briefcase}
          index={2}
        />
        <StatCard
          label="Total Applications"
          value={stats.applications ?? 0}
          hint="All time"
          icon={FileCheck2}
          index={3}
        />
        <StatCard
          label="Shortlisted"
          value={stats.shortlisted ?? 0}
          hint="Candidates shortlisted"
          icon={CheckCircle2}
          index={4}
        />
        <StatCard
          label="Scheduled Interviews"
          value={stats.interviews ?? 0}
          hint="Upcoming and scheduled"
          icon={CalendarDays}
          index={5}
        />
        <StatCard
          label="Selected Students"
          value={stats.selected ?? 0}
          hint="Offers accepted"
          icon={Award}
          index={6}
        />
        <StatCard
          label="Selection Rate"
          value={`${stats.selectionRate ?? 0}%`}
          hint="Selected / Applied"
          icon={TrendingUp}
          index={7}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <div className="glass-card p-5">
          <div className="flex justify-between">
            <div>
              <h2 className="font-bold">Application volume</h2>
              <p className="mt-1 text-xs text-slate-500">Daily applications received</p>
            </div>
            <TrendingUp className="text-emerald-500" />
          </div>
          <div className="mt-5 h-72">
            {hasTrend ? (
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appVolGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / 0.15)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    ticks={tickIndices.map((i) => trend[i]?.name).filter(Boolean)}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: 'none',
                      borderRadius: 12,
                      color: '#f8fafc',
                      fontSize: 12,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                    }}
                    labelStyle={{ color: '#cbd5e1', marginBottom: 4 }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Area
                    dataKey="applications"
                    type="monotone"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#appVolGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No data yet"
                text="Application trend data will appear here once students begin applying."
              />
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="font-bold">Application status distribution</h2>
          <p className="mt-1 text-xs text-slate-500">Breakdown by current status</p>
          <div className="mt-5 h-72">
            {hasStatus ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusData.map((s) => ({
                      ...s,
                      name: humanizeStatus(s.name),
                    }))}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={getStatusColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: 'none',
                      borderRadius: 12,
                      color: '#f8fafc',
                      fontSize: 12,
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 8, fontSize: 11 }}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No data yet"
                text="Status distribution will be shown once applications are received."
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="font-bold">Top companies by applications</h2>
          <p className="mt-1 text-xs text-slate-500">Top 8 recruiting companies</p>
          <div className="mt-5 h-72">
            {hasCompany ? (
              <ResponsiveContainer>
                <BarChart data={byCompany} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / 0.15)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-18}
                    textAnchor="end"
                    height={60}
                    tickFormatter={(v: string) => (v && v.length > 16 ? v.slice(0, 15) + '…' : v)}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: 'none',
                      borderRadius: 12,
                      color: '#f8fafc',
                      fontSize: 12,
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Bar
                    dataKey="applications"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No data yet"
                text="Top companies will appear once applications are submitted."
              />
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="font-bold">Most popular drives</h2>
          <p className="mt-1 text-xs text-slate-500">Top 8 drives by applicants</p>
          <div className="mt-5 h-72">
            {hasParticipation ? (
              <ResponsiveContainer>
                <BarChart data={participation} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / 0.15)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-18}
                    textAnchor="end"
                    height={60}
                    tickFormatter={(v: string) => (v && v.length > 18 ? v.slice(0, 17) + '…' : v)}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: 'none',
                      borderRadius: 12,
                      color: '#f8fafc',
                      fontSize: 12,
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Bar
                    dataKey="applicants"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No data yet"
                text="Most popular drives will appear once students start applying."
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 glass-card p-5">
        <h2 className="font-bold">Quick snapshot</h2>
        <p className="mt-1 text-xs text-slate-500">Operational ratios at a glance</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Shortlist ratio
            </p>
            <p className="mt-2 text-2xl font-black">
              {stats.applications
                ? `${(((stats.shortlisted ?? 0) / stats.applications) * 100).toFixed(1)}%`
                : '0%'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Shortlisted / Applications</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Interview conversion
            </p>
            <p className="mt-2 text-2xl font-black">
              {stats.shortlisted
                ? `${(((stats.interviews ?? 0) / stats.shortlisted) * 100).toFixed(1)}%`
                : '0%'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Interviews / Shortlisted</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Apps per drive
            </p>
            <p className="mt-2 text-2xl font-black">
              {stats.drives ? Math.round((stats.applications ?? 0) / stats.drives) : 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">Applications / Active drives</p>
          </div>
        </div>
      </div>

      {toast ? <Toast message={toast.message} error={toast.error} /> : null}
    </div>
  )
}
