import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { Resource } from '../../types'

export default function AdminResources() {
  const [resources, setResources] = useState<Resource[]>([])
  const [form, setForm] = useState({ title: '', type: 'Guide', url: 'https://example.com', description: '' })
  const load = () => api.get('/resources').then((r) => setResources(r.data.resources || []))

  useEffect(() => {
    void load()
  }, [])

  const add = async () => {
    await api.post('/admin/resources', form)
    setForm({ title: '', type: 'Guide', url: 'https://example.com', description: '' })
    load()
  }

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow">Career toolkit</p>
        <h1 className="mt-1 text-3xl font-black">Resources</h1>
      </div>
      <div className="glass-card p-5">
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(form).map(([key, value]) => (
            <input
              key={key}
              className="input"
              placeholder={key}
              value={value}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ))}
        </div>
        <button onClick={add} className="btn-primary mt-4">Add resource</button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {resources.map((resource) => (
          <div className="glass-card p-4" key={resource._id}>
            <p className="font-bold">{resource.title}</p>
            <p className="text-xs text-slate-500">{resource.type}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
