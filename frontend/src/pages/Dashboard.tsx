import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContextValue'
import { Briefcase, CheckCircle2, Clock3, FileText, TrendingUp, CalendarDays, ArrowUpRight, Video, MapPin } from 'lucide-react'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Link } from 'react-router-dom'
import type { Drive, Interview } from '../types'

interface DashboardStats {
  drives?: number
  applications?: number
  shortlisted?: number
  interviews?: number
}

interface TrendPoint {
  name: string
  applications: number
}

interface StatusPoint {
  name: string
  value: number
}

interface DashboardData {
  stats: DashboardStats
  trend: TrendPoint[]
  status: StatusPoint[]
  upcoming: Interview[]
}

const fallbackTrend = [{name:'Jan',applications:4},{name:'Feb',applications:7},{name:'Mar',applications:5},{name:'Apr',applications:10},{name:'May',applications:8},{name:'Jun',applications:14}]
const fallbackStatus = [{name:'Applied',value:8},{name:'Shortlisted',value:3},{name:'Interview',value:2},{name:'Selected',value:1}]

export default function Dashboard() {
  const { user } = useAuth()
  const [data,setData] = useState<DashboardData>({stats:{drives:12,applications:5,shortlisted:2,interviews:1},trend:fallbackTrend,status:fallbackStatus,upcoming:[]})
  const [drives,setDrives] = useState<Drive[]>([])
  useEffect(()=>{ (async()=>{try{const [a,d]=await Promise.all([api.get('/analytics/student'),api.get('/drives?limit=3')]);setData(a.data);setDrives(d.data.drives||[])}catch{/* Keep the dashboard fallback data when analytics is unavailable. */}})() },[])
  const stats=data.stats||{}
  return <div>
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow">Student dashboard</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl text-slate-900 dark:text-white">
          Welcome, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Here’s what’s happening with your placement journey.
        </p>
      </div>
      <Link to="/app/drives" className="btn-primary">Explore drives <ArrowUpRight size={16}/></Link>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Available Drives" value={stats.drives??12} hint="+4 this month" icon={Briefcase} index={0}/>
      <StatCard label="Applications" value={stats.applications??5} hint="2 active pipelines" icon={FileText} index={1}/>
      <StatCard label="Shortlisted" value={stats.shortlisted??2} hint="40% conversion" icon={CheckCircle2} index={2}/>
      <StatCard label="Interviews" value={stats.interviews??1} hint="Next one soon" icon={Clock3} index={3}/>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_.75fr]">
      <div className="glass-card p-5">
        <div className="flex justify-between">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">Application activity</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Your applications over the last 6 months</p>
          </div>
          <TrendingUp className="text-emerald-500"/>
        </div>
        <div className="mt-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trend||fallbackTrend}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#888888" fontSize={12}/>
              <YAxis hide/>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}/>
              <Area type="monotone" dataKey="applications" stroke="#10b981" fill="#10b981" fillOpacity={.15} strokeWidth={3}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="glass-card p-5">
        <h2 className="font-bold text-slate-900 dark:text-white">Application status</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current pipeline</p>
        <div className="h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data.status||fallbackStatus} dataKey="value" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={4}>
                {(data.status||fallbackStatus).map((_,i)=><Cell key={i} fill={['#10b981','#60a5fa','#a78bfa','#f59e0b'][i%4]}/>)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(data.status||fallbackStatus).map((x)=>(
            <div key={x.name} className="flex justify-between rounded-xl bg-slate-100/70 p-2.5 dark:bg-white/5">
              <span className="text-slate-600 dark:text-slate-400">{x.name}</span>
              <b className="text-slate-900 dark:text-white">{x.value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="mt-5 glass-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">Recommended placement drives</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Fresh opportunities matching your profile</p>
        </div>
        <Link to="/app/drives" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">View all</Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {drives.length ? drives.map(d => (
          <div key={d._id} className="rounded-2xl border border-slate-200/80 p-4 transition-all hover:border-emerald-500/30 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Briefcase size={18}/>
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{d.company}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{d.title}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">{d.location}</span>
              <b className="text-emerald-600 dark:text-emerald-400">{d.package}</b>
            </div>
          </div>
        )) : ['TCS Next 2026','Infosys Springboard','Wipro TalentNext'].map(x => (
          <div key={x} className="rounded-2xl border border-slate-200/80 p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <p className="font-bold text-slate-900 dark:text-white">{x}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Software engineering opportunity</p>
            <p className="mt-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">Apply now →</p>
          </div>
        ))}
      </div>
    </div>
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-emerald-500"/>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Upcoming interviews</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Keep your calendar ready</p>
            </div>
          </div>
          <Link to="/app/interviews" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">View all</Link>
        </div>
        <div className="mt-4 space-y-2">
          {(data.upcoming || []).length ? data.upcoming.map((iv) => (
            <Link to="/app/interviews" key={iv._id} className="flex items-center gap-3 rounded-2xl border p-3 transition hover:border-emerald-500/40 hover:bg-emerald-500/5 dark:hover:bg-white/5" style={{borderColor: 'var(--border)'}}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {iv.meetingLink || iv.link ? <Video size={16}/> : <MapPin size={16}/>}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{iv.company || 'Placement Drive'}</p>
                  <StatusBadge status={iv.status} />
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{iv.role || iv.roundName || 'Interview'}</p>
                <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {new Date(iv.scheduledAt || iv.date).toLocaleString()}
                </p>
              </div>
              <ArrowUpRight size={14} className="text-slate-400"/>
            </Link>
          )) : (
            <div className="rounded-2xl bg-slate-100/70 p-4 dark:bg-white/5">
              <p className="text-sm font-bold text-slate-900 dark:text-white">No interview scheduled yet</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Once you're shortlisted, interviews will appear here.</p>
            </div>
          )}
        </div>
      </div>
      <div className="glass-card p-5">
        <div className="flex items-center gap-3">
          <Clock3 className="text-emerald-500"/>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Placement momentum</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Profile readiness</p>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {(() => {
            const s = data.stats || {}
            const hasName = !!user?.name
            const hasCourse = !!(user?.course && String(user.course).length > 1)
            const hasCGPA = typeof user?.cgpa === 'number' && user.cgpa > 0
            const hasSkills = Array.isArray(user?.skills) && user.skills.length > 0
            const hasResume = !!(s.applications && s.applications > 0) || !!(s.interviews && s.interviews > 0) || !!(user?.currentResume)
            const checks = [hasName, hasCourse, hasCGPA, hasSkills, hasResume]
            const score = Math.round((checks.filter(Boolean).length / checks.length) * 100)
            return (
              <>
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Profile completeness</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{score}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{width: `${score}%`}}/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                  <span className={hasCourse ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>Course · {hasCourse ? '✓' : 'Add'}</span>
                  <span className={hasCGPA ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>CGPA · {hasCGPA ? '✓' : 'Add'}</span>
                  <span className={hasSkills ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>Skills · {hasSkills ? '✓' : 'Add'}</span>
                  <span className={hasResume ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>Resume · {hasResume ? '✓' : 'Upload'}</span>
                </div>
                <Link to="/app/profile" className="btn-secondary w-full !py-2 text-xs">
                  Complete your profile →
                </Link>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  </div>
}
