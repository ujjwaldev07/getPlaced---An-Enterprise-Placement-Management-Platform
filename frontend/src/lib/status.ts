export function humanizeStatus(status?: string) {
  if (!status) return 'Unknown'
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (m: string) => m.toUpperCase())
}

export const APP_FILTERS = [
  'ALL',
  'APPLIED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEWED',
  'SELECTED',
  'REJECTED',
] as const

export function statusTone(status?: string) {
  const value = (status || '').toUpperCase()
  if (['SELECTED', 'PASSED', 'PUBLISHED', 'ACTIVE'].includes(value)) return 'emerald'
  if (['REJECTED', 'FAILED', 'CANCELLED', 'WITHDRAWN'].includes(value)) return 'rose'
  if (['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SCHEDULED', 'UNDER_REVIEW'].includes(value)) return 'sky'
  if (['DRAFT', 'PENDING'].includes(value)) return 'amber'
  return 'slate'
}
