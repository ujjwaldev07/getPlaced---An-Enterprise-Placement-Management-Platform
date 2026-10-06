import { Router } from 'express'
import { Application, Interview } from '../models.js'
import { requireAuth, requireAdmin, type AuthRequest } from '../auth.js'
import { interviewPatchSchema, interviewSchema } from '../validation.js'
import { notifyUser } from '../notify.js'
import { audit } from '../audit.js'
import { oid, pageParams, zodError } from '../http.js'
import { serializeInterview } from '../serializers.js'
import { normalizeAppStatus } from '../constants.js'

export const interviewsRouter = Router()

interviewsRouter.get('/interviews/me', requireAuth, async (req: AuthRequest, res) => {
  const interviews = await Interview.find({ student: req.user!.id }).sort({ scheduledAt: 1, date: 1 }).lean()
  res.json({ interviews: interviews.map((i) => serializeInterview(i, { studentView: true })) })
})

interviewsRouter.get('/interviews', requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'admin') {
    const interviews = await Interview.find({ student: req.user!.id }).sort({ scheduledAt: 1, date: 1 }).lean()
    return res.json({ interviews: interviews.map((i) => serializeInterview(i, { studentView: true })) })
  }
  const { page, limit, skip } = pageParams(req)
  const tab = String(req.query.tab || 'upcoming')
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const filter: Record<string, unknown> = {}
  if (tab === 'today') filter.scheduledAt = { $gte: start, $lte: end }
  else if (tab === 'completed') filter.status = 'COMPLETED'
  else if (tab === 'cancelled') filter.status = 'CANCELLED'
  else filter.status = { $in: ['SCHEDULED', 'RESCHEDULED'] }
  const [interviews, total] = await Promise.all([
    Interview.find(filter).sort({ scheduledAt: 1 }).skip(skip).limit(limit).lean(),
    Interview.countDocuments(filter),
  ])
  res.json({ interviews: interviews.map((i) => serializeInterview(i)), total, page, limit })
})

interviewsRouter.get('/admin/interviews', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const interviews = await Interview.find().sort({ scheduledAt: 1, date: 1 }).lean()
  res.json({ interviews: interviews.map((i) => serializeInterview(i)) })
})

interviewsRouter.post('/interviews', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const body = interviewSchema.parse(req.body)
    const application = await Application.findById(body.applicationId).populate('drive').populate('student', 'name')
    if (!application) return res.status(404).json({ message: 'Application not found' })
    const current = normalizeAppStatus(application.status)
    if (!['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED'].includes(current)) {
      return res.status(400).json({ message: 'Shortlist the student before scheduling an interview' })
    }
    const drive = application.drive as any
    const interview = await Interview.create({
      application: application._id,
      student: application.student,
      companyId: application.companyId,
      drive: application.drive,
      company: drive?.company,
      role: drive?.title,
      roundName: body.roundName,
      interviewType: body.interviewType,
      scheduledAt: body.scheduledAt,
      date: body.scheduledAt,
      duration: body.duration || 45,
      location: body.location,
      meetingLink: body.meetingLink,
      link: body.meetingLink,
      interviewerName: body.interviewerName,
      interviewerEmail: body.interviewerEmail,
      instructions: body.instructions,
      status: 'SCHEDULED',
      result: 'PENDING',
      createdBy: req.user!.id,
    })
    application.status = 'INTERVIEW_SCHEDULED'
    application.reviewedAt = new Date()
    application.reviewedBy = req.user!.id as any
    await application.save()
    await notifyUser({
      userId: String((application.student as any)?._id || application.student),
      type: 'INTERVIEW_SCHEDULED',
      title: 'Interview scheduled',
      message: `${body.roundName} for ${drive?.title || 'your application'} at ${drive?.company || 'the company'} is scheduled.`,
      relatedEntityId: String(interview._id),
      relatedEntityType: 'Interview',
    })
    await audit({ actor: req.user!.id, action: 'interview.scheduled', entityType: 'Interview', entityId: String(interview._id) })
    res.status(201).json({ interview: serializeInterview(interview) })
  } catch (e: any) {
    res.status(400).json(zodError(e))
  }
})

interviewsRouter.patch('/interviews/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const id = oid(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid interview id' })
  try {
    const body = interviewPatchSchema.parse(req.body)
    const interview = await Interview.findById(id)
    if (!interview) return res.status(404).json({ message: 'Interview not found' })
    const previousTime = interview.scheduledAt || interview.date
    if (body.scheduledAt) {
      interview.scheduledAt = body.scheduledAt
      interview.date = body.scheduledAt
      if (previousTime && new Date(previousTime).getTime() !== new Date(body.scheduledAt).getTime()) {
        interview.status = 'RESCHEDULED'
      }
    }
    if (body.roundName) interview.roundName = body.roundName
    if (body.interviewType) interview.interviewType = body.interviewType
    if (body.duration) interview.duration = body.duration
    if (body.location !== undefined) interview.location = body.location
    if (body.meetingLink !== undefined) {
      interview.meetingLink = body.meetingLink
      interview.link = body.meetingLink
    }
    if (body.interviewerName !== undefined) interview.interviewerName = body.interviewerName
    if (body.interviewerEmail !== undefined) interview.interviewerEmail = body.interviewerEmail
    if (body.instructions !== undefined) interview.instructions = body.instructions
    if (body.status) interview.status = body.status
    if (body.result) interview.result = body.result
    if (body.feedback !== undefined) interview.feedback = body.feedback
    if (body.result && body.result !== 'PENDING') interview.status = 'COMPLETED'
    await interview.save()

    const studentId = String(interview.student)
    if (interview.status === 'RESCHEDULED') {
      await notifyUser({
        userId: studentId,
        type: 'INTERVIEW_RESCHEDULED',
        title: 'Interview rescheduled',
        message: `Your ${interview.roundName} interview at ${interview.company} has been rescheduled.`,
        relatedEntityId: String(interview._id),
        relatedEntityType: 'Interview',
      })
      await audit({ actor: req.user!.id, action: 'interview.rescheduled', entityType: 'Interview', entityId: String(interview._id) })
    }
    if (body.status === 'CANCELLED') {
      await notifyUser({
        userId: studentId,
        type: 'INTERVIEW_CANCELLED',
        title: 'Interview cancelled',
        message: `Your ${interview.roundName} interview at ${interview.company} was cancelled.`,
        relatedEntityId: String(interview._id),
        relatedEntityType: 'Interview',
      })
    }

    if (interview.application && (body.advanceApplication || body.selectStudent || body.result === 'PASSED' || body.result === 'FAILED')) {
      const application = await Application.findById(interview.application).populate('drive')
      if (application) {
        if (body.result === 'FAILED') {
          application.status = 'REJECTED'
          application.rejectedAt = new Date()
        } else if (body.selectStudent) {
          application.status = 'SELECTED'
        } else if (body.advanceApplication || body.result === 'PASSED') {
          application.status = body.selectStudent ? 'SELECTED' : 'INTERVIEWED'
        }
        await application.save()
        const drive = application.drive as any
        await notifyUser({
          userId: studentId,
          type: application.status === 'SELECTED' ? 'APPLICATION_SELECTED' : 'APPLICATION_STATUS',
          title: application.status === 'SELECTED' ? 'You have been selected' : 'Interview result recorded',
          message: `Your application for ${drive?.title || interview.role} at ${drive?.company || interview.company} is now ${application.status.replaceAll('_', ' ').toLowerCase()}.`,
          relatedEntityId: String(application._id),
          relatedEntityType: 'Application',
        })
        if (application.status === 'SELECTED') {
          await audit({ actor: req.user!.id, action: 'application.selected', entityType: 'Application', entityId: String(application._id) })
        }
      }
    }

    res.json({ interview: serializeInterview(interview) })
  } catch (e: any) {
    res.status(400).json(zodError(e))
  }
})

interviewsRouter.delete('/interviews/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const id = oid(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid interview id' })
  const interview = await Interview.findById(id)
  if (!interview) return res.status(404).json({ message: 'Interview not found' })
  interview.status = 'CANCELLED'
  await interview.save()
  await notifyUser({
    userId: String(interview.student),
    type: 'INTERVIEW_CANCELLED',
    title: 'Interview cancelled',
    message: `Your ${interview.roundName} interview at ${interview.company} was cancelled.`,
    relatedEntityId: String(interview._id),
    relatedEntityType: 'Interview',
  })
  res.json({ interview: serializeInterview(interview) })
})
