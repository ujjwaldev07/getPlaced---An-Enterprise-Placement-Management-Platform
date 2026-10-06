import { normalizeAppStatus, normalizeDriveStatus } from './constants.js'

export function resumePublic(resume: any) {
  if (!resume) return null
  return {
    id: String(resume._id),
    originalName: resume.originalName,
    mimeType: resume.mimeType,
    size: resume.size,
    uploadedAt: resume.uploadedAt || resume.createdAt,
  }
}

export function serializeDrive(drive: any, extras: Record<string, unknown> = {}) {
  if (!drive) return null
  const companyDoc = drive.companyId && typeof drive.companyId === 'object' ? drive.companyId : null
  return {
    _id: String(drive._id),
    companyId: companyDoc ? String(companyDoc._id) : drive.companyId ? String(drive.companyId) : null,
    company: companyDoc?.name || drive.company,
    logo: companyDoc?.logo || drive.logo,
    title: drive.title,
    jobTitle: drive.title,
    location: drive.location,
    type: drive.type,
    employmentType: drive.type,
    package: drive.package,
    deadline: drive.deadline,
    applicationDeadline: drive.deadline,
    driveDate: drive.driveDate,
    description: drive.description,
    eligibility: drive.eligibility,
    eligibleCourses: drive.eligibleCourses || [],
    minimumCGPA: drive.minimumCGPA,
    graduationYear: drive.graduationYear,
    requiredSkills: drive.requiredSkills || [],
    status: normalizeDriveStatus(drive.status),
    applicants: drive.applicants || 0,
    createdAt: drive.createdAt,
    updatedAt: drive.updatedAt,
    ...extras,
  }
}

export function serializeApplication(app: any, { includeNotes = false } = {}) {
  if (!app) return null
  const student = app.student && typeof app.student === 'object' ? app.student : null
  const drive = app.drive && typeof app.drive === 'object' ? serializeDrive(app.drive) : app.drive
  const resume = app.resume && typeof app.resume === 'object' && '_id' in app.resume ? resumePublic(app.resume) : app.resume
  return {
    _id: String(app._id),
    student: student
      ? {
          _id: String(student._id),
          id: String(student._id),
          name: student.name,
          email: student.email,
          course: student.course,
          cgpa: student.cgpa,
          skills: student.skills,
          graduationYear: student.graduationYear,
          phone: student.phone,
        }
      : app.student,
    drive,
    companyId: app.companyId ? String(app.companyId) : null,
    resume,
    coverLetter: app.coverLetter || '',
    status: normalizeAppStatus(app.status),
    appliedAt: app.appliedAt || app.createdAt,
    reviewedAt: app.reviewedAt,
    shortlistedAt: app.shortlistedAt,
    rejectedAt: app.rejectedAt,
    rejectionReason: includeNotes ? app.rejectionReason : undefined,
    notes: includeNotes ? app.notes : undefined,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  }
}

export function serializeInterview(interview: any, { studentView = false } = {}) {
  if (!interview) return null
  const scheduledAt = interview.scheduledAt || interview.date
  const meetingLink = interview.meetingLink || interview.link
  return {
    _id: String(interview._id),
    application: interview.application,
    student: interview.student,
    companyId: interview.companyId,
    drive: interview.drive,
    company: interview.company,
    role: interview.role,
    roundName: interview.roundName || 'Interview',
    interviewType: interview.interviewType || (interview.mode === 'Offline' ? 'OFFLINE' : 'ONLINE'),
    mode: interview.interviewType === 'OFFLINE' || interview.mode === 'Offline' ? 'Offline' : 'Online',
    date: scheduledAt,
    scheduledAt,
    duration: interview.duration,
    location: interview.location,
    link: studentView ? meetingLink : meetingLink,
    meetingLink,
    interviewerName: studentView ? undefined : interview.interviewerName,
    interviewerEmail: studentView ? undefined : interview.interviewerEmail,
    instructions: interview.instructions,
    status: interview.status,
    result: interview.result || 'PENDING',
    feedback: studentView ? undefined : interview.feedback,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
  }
}

export function serializeNotification(n: any) {
  return {
    _id: String(n._id),
    type: n.type || 'GENERAL',
    title: n.title,
    message: n.message,
    relatedEntityId: n.relatedEntityId,
    isRead: !!n.read,
    read: !!n.read,
    createdAt: n.createdAt,
  }
}
