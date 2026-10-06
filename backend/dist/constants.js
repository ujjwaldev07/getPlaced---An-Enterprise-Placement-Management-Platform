export const DRIVE_STATUS = ['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED'];
export const APPLICATION_STATUS = [
    'APPLIED',
    'UNDER_REVIEW',
    'SHORTLISTED',
    'INTERVIEW_SCHEDULED',
    'INTERVIEWED',
    'SELECTED',
    'REJECTED',
    'WITHDRAWN',
];
export const INTERVIEW_STATUS = ['SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
export const INTERVIEW_RESULT = ['PENDING', 'PASSED', 'FAILED'];
export const INTERVIEW_TYPE = ['ONLINE', 'OFFLINE'];
export const APPLICATION_TRANSITIONS = {
    APPLIED: ['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
    UNDER_REVIEW: ['SHORTLISTED', 'REJECTED', 'APPLIED'],
    SHORTLISTED: ['INTERVIEW_SCHEDULED', 'REJECTED', 'UNDER_REVIEW'],
    INTERVIEW_SCHEDULED: ['INTERVIEWED', 'REJECTED', 'SHORTLISTED'],
    INTERVIEWED: ['SELECTED', 'REJECTED', 'INTERVIEW_SCHEDULED'],
    SELECTED: [],
    REJECTED: ['UNDER_REVIEW'],
    WITHDRAWN: [],
};
export const LEGACY_APP_STATUS = {
    Applied: 'APPLIED',
    Shortlisted: 'SHORTLISTED',
    Interview: 'INTERVIEW_SCHEDULED',
    Selected: 'SELECTED',
    Rejected: 'REJECTED',
};
export const LEGACY_DRIVE_STATUS = {
    Open: 'PUBLISHED',
    Closed: 'CLOSED',
    Draft: 'DRAFT',
    Cancelled: 'CANCELLED',
};
export const ALLOWED_RESUME_EXT = ['.pdf', '.doc', '.docx'];
export const ALLOWED_RESUME_MIME = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream',
];
export function normalizeAppStatus(status) {
    if (!status)
        return 'APPLIED';
    return LEGACY_APP_STATUS[status] || status;
}
export function normalizeDriveStatus(status) {
    if (!status)
        return 'DRAFT';
    return LEGACY_DRIVE_STATUS[status] || status;
}
export function humanizeStatus(status) {
    const value = normalizeAppStatus(status);
    return value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
