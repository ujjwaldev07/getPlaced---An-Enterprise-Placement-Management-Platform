import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import EmptyState from '../../components/EmptyState'

interface AdminStudent {
  _id: string
  name: string
  email: string
  course?: string
  graduationYear?: number
}

export default function AdminStudents() {
  const [students, setStudents] = useState<AdminStudent[]>([])

  useEffect(() => {
    api.get('/admin/students').then((response) => setStudents(response.data.students || [])).catch(() => {})
  }, [])

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow">People</p>
        <h1 className="mt-1 text-3xl font-black">Students</h1>
      </div>
      {students.length ? (
        <div className="glass-card overflow-hidden">
          {students.map((student) => (
            <div className="flex items-center justify-between border-b p-4 last:border-0" key={student._id}>
              <div>
                <p className="font-bold">{student.name}</p>
                <p className="text-xs text-slate-500">{student.email} • {student.course || 'Course not added'}</p>
              </div>
              <span className="text-xs text-slate-400">{student.graduationYear || '—'}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No students yet" text="Registered students will appear here." />
      )}
    </div>
  )
}
