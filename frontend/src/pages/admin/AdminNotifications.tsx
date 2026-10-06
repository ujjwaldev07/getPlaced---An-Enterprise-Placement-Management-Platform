import { useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../../lib/api'
import type { Notification } from '../../types'

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [toast, setToast] = useState('')
  const load = () => api.get('/admin/notifications').then((r) => setNotifications(r.data.notifications || []))

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0)
    return () => clearTimeout(timer)
  }, [])

  const send = async () => {
    try {
      await api.post('/admin/notifications', { title, message })
      setToast('Notification sent')
      setTitle('')
      setMessage('')
      load()
    } catch (e: unknown) {
      setToast(getApiErrorMessage(e, 'Could not send'))
    }
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow">Communication</p>
        <h1 className="mt-1 text-3xl font-black">Notifications</h1>
      </div>
      <div className="glass-card p-5">
        <h3 className="font-bold">Broadcast update</h3>
        <div className="mt-4 grid gap-3">
          <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input" rows={4} placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <button onClick={send} className="btn-primary mt-4">Send notification</button>
      </div>
      <div className="mt-5 space-y-3">
        {notifications.map((notification) => (
          <div className="glass-card p-4" key={notification._id}>
            <p className="font-bold">{notification.title}</p>
            <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
          </div>
        ))}
      </div>
      {toast && <div className="fixed bottom-5 right-5 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">{toast}</div>}
    </div>
  )
}
