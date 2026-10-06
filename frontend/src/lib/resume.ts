import { api } from './api'

export async function openResume(resumeId: string, download = false) {
  const { data } = await api.get(`/resumes/${resumeId}/file`, {
    responseType: 'blob',
    params: { disposition: download ? 'attachment' : 'inline' },
  })
  const url = URL.createObjectURL(data)
  if (download) {
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume'
    a.click()
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
