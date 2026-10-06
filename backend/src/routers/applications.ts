import { Router } from 'express'
import { Application, Drive, Resume, User } from '../models.js'
import { requireAuth, requireAdmin, requireStudent, type AuthRequest } from '../auth.js'
import { applicationStatusSchema, applySchema } from '../validation.js'
import { persistResumeFile, resumeUpload } from '../uploads.js'
import { notifyUser } from '../notify.js'
import { audit } from '../audit.js'
import { oid, pageParams, zodError } from '../http.js'
import { serializeApplication } from '../serializers.js'
import { APPLICATION_TRANSITIONS, humanizeStatus, normalizeAppStatus, normalizeDriveStatus } from '../constants.js'
import { statusFilter } from '../statusQuery.js'

export const applicationsRouter = Router()

async function saveUploadedResume(req: AuthRequest, file?: Express.Multer.File) {
  if (!file) return null
  const stored = await persistResumeFile(file)
  const resume = await Resume.create({
    student: req.user!.id,
    originalName: stored.originalName,
    storageKey: stored.storageKey,
    mimeType: stored.mimeType,
    size: stored.size,
    uploadedAt: new Date(),
  })
  await User.findByIdAndUpdate(req.user!.id, { currentResume: resume._id })
  return resume
}

async function applyToDrive(req: AuthRequest, res: any) {
  const driveId = oid(req.params.id || req.params.driveId)
  if (!driveId) return res.status(400).json({ message: 'Invalid drive id' })
  const drive = await Drive.findById(driveId)
  if (!drive) return res.status(404).json({ message: 'Drive not found' })
  const status = normalizeDriveStatus(drive.status)
  if (status === 'CANCELLED') return res.status(400).json({ message: 'This drive has been cancelled' })
  if (status === 'CLOSED' || status === 'DRAFT' || !['PUBLISHED', 'Open'].includes(String(drive.status))) {
    return res.status(400).json({ message: 'This drive is not accepting applications' })
  }
  if (drive.deadline && new Date(drive.deadline).getTime() < Date.now()) {
    return res.status(400).json({ message: 'The application deadline has passed' })
  }

  let body: { coverLetter?: string; resumeId?: string } = {}
  try {
    body = applySchema.parse(req.body || {})
  } catch (e: any) {
    return res.status(400).json(zodError(e))
  }

  let resumeDoc = null as any
  try {
    resumeDoc = await saveUploadedResume(req, req.file)
  } catch (e: any) {
    return res.status(400).json({ message: e.message || 'Invalid resume' })
  }

  if (!resumeDoc && body.resumeId) {
    const resumeId = oid(body.resumeId)
    if (!resumeId) return res.status(400).json({ message: 'Invalid resume' })
    resumeDoc = await Resume.findOne({ _id: resumeId, student: req.user!.id })
    if (!resumeDoc) return res.status(404).json({ message: 'Resume not found' })
  }

  if (!resumeDoc) {
    const user = await User.findById(req.user!.id)
    if (user?.currentResume) resumeDoc = await Resume.findById(user.currentResume)
  }

  if (!resumeDoc) return res.status(400).json({ message: 'Please upload a resume to apply' })

  try {
    const application = await Application.create({
      student: req.user!.id,
      drive: drive._id,
      companyId: drive.companyId,
      resume: resumeDoc._id,
      coverLetter: body.coverLetter || '',
      status: 'APPLIED',
      appliedAt: new Date(),
    })
    await Drive.findByIdAndUpdate(drive._id, { $inc: { applicants: 1 } })
    await notifyUser({
      userId: req.user!.id,
      type: 'APPLICATION_SUBMITTED',
      title: 'Application submitted',
      message: `Your application for ${drive.title} at ${drive.company} was submitted.`,
      relatedEntityId: String(application._id),
      relatedEntityType: 'Application',
    })
    res.status(201).json({ application: serializeApplication(application) })
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'You already applied to this drive' })
    throw e
  }
}

applicationsRouter.post('/drives/:id/apply', requireAuth, requireStudent, resumeUpload.single('resume'), applyToDrive)
applicationsRouter.post('/applications/:driveId', requireAuth, requireStudent, resumeUpload.single('resume'), applyToDrive)

applicationsRouter.get('/applications/me', requireAuth, async (req: AuthRequest, res) => {
  const applications = await Application.find({ student: req.user!.id })
    .populate('drive')
    .populate('resume')
    .sort({ createdAt: -1 })
    .lean()
  res.json({ applications: applications.map((a) => serializeApplication(a)) })
})

applicationsRouter.get('/applications', requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'admin') {
    const applications = await Application.find({ student: req.user!.id })
      .populate('drive')
      .populate('resume')
      .sort({ createdAt: -1 })
      .lean()
    return res.json({ applications: applications.map((a) => serializeApplication(a)) })
  }

  const { page, limit, skip } = pageParams(req)
  const q = String(req.query.q || '').trim()
  const status = String(req.query.status || '').trim()
  const sort = String(req.query.sort || '-appliedAt')
  const filter: Record<string, unknown> = {}
  if (status && status !== 'ALL') filter.status = statusFilter(status) as any

  if (q) {
    const users = await User.find({
      role: 'user',
      $or: [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }, { course: { $regex: q, $options: 'i' } }],
    }).select('_id')
    const drives = await Drive.find({
      $or: [{ company: { $regex: q, $options: 'i' } }, { title: { $regex: q, $options: 'i' } }],
    }).select('_id')
    filter.$or = [
      { student: { $in: users.map((u) => u._id) } },
      { drive: { $in: drives.map((d) => d._id) } },
    ]
  }

  const sortSpec: Record<string, 1 | -1> = sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 }
  if (sortSpec.appliedAt === undefined) sortSpec.appliedAt = -1

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate('student', 'name email course cgpa skills graduationYear phone')
      .populate('drive')
      .populate('resume')
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
  ])

  res.json({
    applications: applications.map((a) => serializeApplication(a, { includeNotes: true })),
    total,
    page,
    limit,
  })
})

applicationsRouter.get('/admin/applications', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  req.user = { ...(req.user as any), role: 'admin' }
  const orig = req.url
  ;(req as any).query = req.query
  const { page, limit, skip } = pageParams(req)
  const q = String(req.query.q || '').trim()
  const status = String(req.query.status || '').trim()
  const sort = String(req.query.sort || '-appliedAt')
  const filter: Record<string, unknown> = {}
  if (status && status !== 'ALL') filter.status = statusFilter(status) as any
  if (q) {
    const users = await User.find({
      role: 'user',
      $or: [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }, { course: { $regex: q, $options: 'i' } }],
    }).select('_id')
    const drives = await Drive.find({
      $or: [{ company: { $regex: q, $options: 'i' } }, { title: { $regex: q, $options: 'i' } }],
    }).select('_id')
    filter.$or = [{ student: { $in: users.map((u) => u._id) } }, { drive: { $in: drives.map((d) => d._id) } }]
  }
  const sortSpec: Record<string, 1 | -1> = sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 }
  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate('student', 'name email course cgpa skills graduationYear phone')
      .populate('drive')
      .populate('resume')
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
  ])
  void orig
  res.json({
    applications: applications.map((a) => serializeApplication(a, { includeNotes: true })),
    total,
    page,
    limit,
  })
})

applicationsRouter.get('/applications/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = oid(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid application id' })
  const application = await Application.findById(id)
    .populate('student', 'name email course cgpa skills graduationYear phone bio')
    .populate('drive')
    .populate('resume')
    .lean()
  if (!application) return res.status(404).json({ message: 'Application not found' })
  const isOwner = String((application.student as any)?._id || application.student) === req.user!.id
  if (req.user!.role !== 'admin' && !isOwner) return res.status(403).json({ message: 'Forbidden' })
  res.json({ application: serializeApplication(application, { includeNotes: req.user!.role === 'admin' }) })
})

applicationsRouter.patch('/applications/:id/status', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const id = oid(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid application id' })
  try {
    const body = applicationStatusSchema.parse(req.body)
    const application = await Application.findById(id).populate('drive').populate('student', 'name')
    if (!application) return res.status(404).json({ message: 'Application not found' })
    const current = normalizeAppStatus(application.status)
    const allowed = APPLICATION_TRANSITIONS[current] || []
    if (current !== body.status && !allowed.includes(body.status)) {
      return res.status(400).json({ message: `Cannot move from ${humanizeStatus(current)} to ${humanizeStatus(body.status)}` })
    }
    application.status = body.status as any
    application.reviewedAt = new Date()
    application.reviewedBy = req.user!.id as any
    if (body.notes !== undefined) application.notes = body.notes
    if (body.status === 'SHORTLISTED') application.shortlistedAt = new Date()
    if (body.status === 'REJECTED') {
      application.rejectedAt = new Date()
      application.rejectionReason = body.rejectionReason || application.rejectionReason
    }
    await application.save()
    const drive = application.drive as any
    const studentId = String((application.student as any)?._id || application.student)
    const typeMap: Record<string, string> = {
      UNDER_REVIEW: 'APPLICATION_STATUS',
      SHORTLISTED: 'APPLICATION_SHORTLISTED',
      REJECTED: 'APPLICATION_REJECTED',
      SELECTED: 'APPLICATION_SELECTED',
      INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
      INTERVIEWED: 'APPLICATION_STATUS',
    }
    await notifyUser({
      userId: studentId,
      type: typeMap[body.status] || 'APPLICATION_STATUS',
      title: body.status === 'SELECTED' ? 'You have been selected' : `Application ${humanizeStatus(body.status).toLowerCase()}`,
      message: `Your application for ${drive?.title || 'the role'} at ${drive?.company || 'the company'} is now ${humanizeStatus(body.status)}.`,
      relatedEntityId: String(application._id),
      relatedEntityType: 'Application',
    })
    if (body.status === 'SHORTLISTED') {
      await audit({ actor: req.user!.id, action: 'application.shortlisted', entityType: 'Application', entityId: String(application._id) })
    } else if (body.status === 'REJECTED') {
      await audit({ actor: req.user!.id, action: 'application.rejected', entityType: 'Application', entityId: String(application._id) })
    } else if (body.status === 'SELECTED') {
      await audit({ actor: req.user!.id, action: 'application.selected', entityType: 'Application', entityId: String(application._id) })
    }
    res.json({ application: serializeApplication(application, { includeNotes: true }) })
  } catch (e: any) {
    res.status(400).json(zodError(e))
  }
})

applicationsRouter.patch('/applications/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const id = oid(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid application id' })
  const application = await Application.findById(id)
  if (!application) return res.status(404).json({ message: 'Application not found' })
  if (typeof req.body.notes === 'string') application.notes = req.body.notes
  await application.save()
  res.json({ application: serializeApplication(application, { includeNotes: true }) })
})

applicationsRouter.patch('/applications/:id/withdraw', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  const id = oid(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid application id' })
  const application = await Application.findOne({ _id: id, student: req.user!.id })
  if (!application) return res.status(404).json({ message: 'Application not found' })
  const current = normalizeAppStatus(application.status)
  if (!['APPLIED', 'UNDER_REVIEW'].includes(current)) {
    return res.status(400).json({ message: 'This application can no longer be withdrawn' })
  }
  application.status = 'WITHDRAWN'
  await application.save()
  res.json({ application: serializeApplication(application) })
})
