export const DRIVE_STATUS = ['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED'] as const
export const APPLICATION_STATUS = [
  'APPLIED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEWED',
  'SELECTED',
  'REJECTED',
  'WITHDRAWN',
] as const
export const INTERVIEW_STATUS = ['SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const
export const INTERVIEW_RESULT = ['PENDING', 'PASSED', 'FAILED'] as const
export const INTERVIEW_TYPE = ['ONLINE', 'OFFLINE'] as const

export const APPLICATION_TRANSITIONS: Record<string, string[]> = {
  APPLIED: ['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  UNDER_REVIEW: ['SHORTLISTED', 'REJECTED', 'APPLIED'],
  SHORTLISTED: ['INTERVIEW_SCHEDULED', 'REJECTED', 'UNDER_REVIEW'],
  INTERVIEW_SCHEDULED: ['INTERVIEWED', 'REJECTED', 'SHORTLISTED'],
  INTERVIEWED: ['SELECTED', 'REJECTED', 'INTERVIEW_SCHEDULED'],
  SELECTED: [],
  REJECTED: ['UNDER_REVIEW'],
  WITHDRAWN: [],
}

export const LEGACY_APP_STATUS: Record<string, string> = {
  Applied: 'APPLIED',
  Shortlisted: 'SHORTLISTED',
  Interview: 'INTERVIEW_SCHEDULED',
  Selected: 'SELECTED',
  Rejected: 'REJECTED',
}

export const LEGACY_DRIVE_STATUS: Record<string, string> = {
  Open: 'PUBLISHED',
  Closed: 'CLOSED',
  Draft: 'DRAFT',
  Cancelled: 'CANCELLED',
}

export const ALLOWED_RESUME_EXT = ['.pdf', '.doc', '.docx']
export const ALLOWED_RESUME_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]

export function normalizeAppStatus(status?: string) {
  if (!status) return 'APPLIED'
  return LEGACY_APP_STATUS[status] || status
}

export function normalizeDriveStatus(status?: string) {
  if (!status) return 'DRAFT'
  return LEGACY_DRIVE_STATUS[status] || status
}

export function humanizeStatus(status?: string) {
  const value = normalizeAppStatus(status)
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
