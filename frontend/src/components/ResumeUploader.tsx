import { useRef, useState } from 'react'
import { api, getApiErrorMessage } from '../lib/api'
import { FileUp, FileText, CheckCircle2, AlertCircle, Loader2, Upload, Trash2, Download, Eye } from 'lucide-react'
import type { AxiosProgressEvent } from 'axios'
import { openResume } from '../lib/resume'
import type { ResumeFile } from '../types'

interface ResumeUploaderProps {
  onUploadComplete?: (resume: ResumeFile) => void
  existingResume?: ResumeFile | null
  allowReplace?: boolean
  compact?: boolean
  onRemove?: () => Promise<void> | void
}

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED = ['.pdf', '.doc', '.docx']

function isValid(name: string) {
  const lower = name.toLowerCase()
  return ALLOWED.some((ext) => lower.endsWith(ext))
}

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

export default function ResumeUploader({
  onUploadComplete,
  existingResume,
  allowReplace = true,
  compact = false,
  onRemove,
}: ResumeUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [resume, setResume] = useState<ResumeFile | null>(existingResume ?? null)
  const [success, setSuccess] = useState(false)

  const trigger = () => inputRef.current?.click()

  const handleFile = async (file: File) => {
    setError('')
    setSuccess(false)
    if (!isValid(file.name)) {
      setError('File must be a PDF, DOC, or DOCX')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('File exceeds the 5 MB size limit')
      return
    }
    const fd = new FormData()
    fd.append('resume', file)
    setBusy(true)
    setProgress(8)
    try {
      const { data } = await api.post('/resumes', fd, {
        onUploadProgress: (event: AxiosProgressEvent) => {
          if (event?.total) setProgress(Math.round((event.loaded * 80) / event.total) + 8)
        },
      })
      setProgress(100)
      const r = data.resume as ResumeFile
      setResume(r)
      setSuccess(true)
      onUploadComplete?.(r)
      setTimeout(() => setSuccess(false), 2500)
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Resume upload failed'))
    } finally {
      setBusy(false)
      setTimeout(() => setProgress(0), 600)
    }
  }

  const handleRemove = async () => {
    if (!resume) return
    setBusy(true)
    try {
      if (onRemove) {
        await onRemove()
      } else {
        await api.delete(`/resumes/${resume.id}`)
      }
      setResume(null)
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Could not remove resume'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={compact ? '' : ''}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />

      {!resume ? (
        <button
          type="button"
          onClick={trigger}
          disabled={busy}
          className="group relative w-full overflow-hidden rounded-2xl border-2 border-dashed p-5 text-left transition-all hover:border-emerald-500/60 hover:bg-emerald-500/5 disabled:opacity-60"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500 transition group-hover:scale-105">
              {busy ? <Loader2 className="animate-spin" size={22} /> : <Upload size={22} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {busy ? 'Uploading resume…' : 'Upload your resume'}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                PDF, DOC, or DOCX • max 5 MB
              </p>
            </div>
            {!busy && <FileUp size={18} className="text-slate-400" />}
          </div>
          {busy && (
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </button>
      ) : (
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <FileText size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-bold">{resume.originalName}</p>
                {success && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={11} /> Uploaded
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {fmtSize(resume.size)} • {new Date(resume.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openResume(resume.id)}
              className="btn-secondary !py-1.5 !px-3 text-xs"
            >
              <Eye size={13} /> View
            </button>
            <button
              type="button"
              onClick={() => openResume(resume.id, true)}
              className="btn-secondary !py-1.5 !px-3 text-xs"
            >
              <Download size={13} /> Download
            </button>
            {allowReplace && (
              <button
                type="button"
                onClick={trigger}
                disabled={busy}
                className="btn-secondary !py-1.5 !px-3 text-xs"
              >
                <Upload size={13} /> Replace
              </button>
            )}
            {onRemove !== undefined && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="ml-auto btn-secondary !py-1.5 !px-3 text-xs text-rose-500 hover:!bg-rose-500/10"
              >
                <Trash2 size={13} /> Remove
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 inline-flex w-full items-start gap-2 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}
    </div>
  )
}
