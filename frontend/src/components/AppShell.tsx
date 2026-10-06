import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, Briefcase, CalendarDays, FileText, LayoutDashboard, LogOut, Menu, Settings, UserRound, X, BookOpen, Users, Building2 } from 'lucide-react'
import { useAuth } from '../context/AuthContextValue'
import { api } from '../lib/api'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

const userItems = [
  ['Dashboard', '/app/dashboard', LayoutDashboard],
  ['My Profile', '/app/profile', UserRound],
  ['Placement Drives', '/app/drives', Briefcase],
  ['My Applications', '/app/applications', FileText],
  ['Interviews', '/app/interviews', CalendarDays],
  ['Notifications', '/app/notifications', Bell],
  ['Resources', '/app/resources', BookOpen],
  ['Settings', '/app/settings', Settings],
] as const

const adminItems = [
  ['Dashboard', '/admin/dashboard', LayoutDashboard],
  ['Students', '/admin/students', Users],
  ['Companies', '/admin/companies', Building2],
  ['Placement Drives', '/admin/drives', Briefcase],
  ['Applications', '/admin/applications', FileText],
  ['Interviews', '/admin/interviews', CalendarDays],
  ['Notifications', '/admin/notifications', Bell],
  ['Resources', '/admin/resources', BookOpen],
  ['Settings', '/admin/settings', Settings],
] as const

export default function AppShell() {
  const { user, logout, isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const navigate = useNavigate()
  const items = user?.role === 'admin' ? adminItems : userItems

  useEffect(() => {
    if (!isAuthenticated) return
    let stopped = false
    const fetchUnread = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const { data } = await api.get('/notifications', { params: { limit: 1 } })
        if (!stopped && typeof data?.unreadCount === 'number') setUnread(data.unreadCount)
      } catch {
        /* ignore transient network errors */
      }
    }
    fetchUnread()
    const t = setInterval(fetchUnread, 30_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchUnread()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('getplaced:notifications_updated', fetchUnread)
    return () => {
      stopped = true
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('getplaced:notifications_updated', fetchUnread)
    }
  }, [isAuthenticated])

  const doLogout = async () => { await logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 transition-colors duration-200 dark:bg-[#070e17] dark:text-white">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-slate-200/80 bg-white/90 p-5 backdrop-blur-2xl transition-transform dark:border-white/10 dark:bg-slate-950/85 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-1">
          <Logo />
          <button onClick={() => setOpen(false)} aria-label="Close sidebar" className="lg:hidden p-1 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={20}/></button>
        </div>
        <div className="mt-6 rounded-2xl bg-emerald-500/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Workspace</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{user?.role === 'admin' ? 'Admin Console' : 'Student Portal'}</p>
        </div>
        <nav className="mt-6 space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)]">
          {items.map(([label, path, Icon]) => (
            <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({isActive}) => `sidebar-link ${isActive ? 'sidebar-active' : ''}`}>
              <Icon size={18}/><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 space-y-2 border-t border-slate-200/80 pt-4 dark:border-white/10">
          <div className="lg:hidden pb-1">
            <ThemeToggle variant="pill" className="w-full justify-center" />
          </div>
          <button onClick={doLogout} className="sidebar-link w-full text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400">
            <LogOut size={18}/> <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-xl transition-colors duration-200 dark:border-white/10 dark:bg-slate-950/80 sm:px-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setOpen(true)} aria-label="Open navigation menu" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 lg:hidden"><Menu/></button>
            <div className="hidden text-sm font-medium text-slate-500 dark:text-slate-400 sm:block">Campus Placement Workspace</div>
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle className="hidden sm:grid" />
              <NavLink to={user?.role === 'admin' ? '/admin/notifications' : '/app/notifications'} aria-label="Notifications" className="relative rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
                <Bell size={18}/>
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 py-0.5 text-[10px] font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-950">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </NavLink>
              <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3 dark:border-white/10">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-white shadow-sm dark:bg-emerald-500 dark:text-slate-950">{user?.name?.slice(0,1).toUpperCase() || 'U'}</div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{user?.name}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{user?.role === 'admin' ? 'Placement Admin' : 'Student'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="page-container"><Outlet/></main>
      </div>
    </div>
  )
}
