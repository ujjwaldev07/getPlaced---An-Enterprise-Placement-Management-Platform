import { Router } from 'express'
import fs from 'node:fs'
import { Application, Resume, User } from '../models.js'
import { requireAuth, requireStudent, type AuthRequest } from '../auth.js'
import { persistResumeFile, removeResumeFile, resumeDiskPath, resumeUpload } from '../uploads.js'
import { oid } from '../http.js'
import { resumePublic } from '../serializers.js'

export const resumesRouter = Router()

async function canAccessResume(req: AuthRequest, resume: any) {
  return String(resume.student) === req.user!.id || req.user!.role === 'admin'
}

resumesRouter.get('/resumes/me', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  const resumes = await Resume.find({ student: req.user!.id }).sort({ uploadedAt: -1 }).lean()
  const user = await User.findById(req.user!.id).select('currentResume')
  res.json({
    resumes: resumes.map(resumePublic),
    currentResume: user?.currentResume ? String(user.currentResume) : resumes[0] ? String(resumes[0]._id) : null,
  })
})

resumesRouter.post('/resumes', requireAuth, requireStudent, resumeUpload.single('resume'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ message: 'Resume file is required' })
  try {
    const stored = await persistResumeFile(req.file)
    const resume = await Resume.create({
      student: req.user!.id,
      originalName: stored.originalName,
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      size: stored.size,
      uploadedAt: new Date(),
    })
    await User.findByIdAndUpdate(req.user!.id, { currentResume: resume._id })
    res.status(201).json({ resume: resumePublic(resume) })
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Could not upload resume' })
  }
})

resumesRouter.delete('/resumes/:id', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  const id = oid(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid resume id' })
  const resume = await Resume.findOne({ _id: id, student: req.user!.id })
  if (!resume) return res.status(404).json({ message: 'Resume not found' })
  const inUse = await Application.exists({ resume: resume._id })
  if (inUse) return res.status(400).json({ message: 'This resume is attached to an application and cannot be deleted' })
  await removeResumeFile(resume.storageKey)
  await resume.deleteOne()
  await User.updateOne({ _id: req.user!.id, currentResume: resume._id }, { $unset: { currentResume: 1 } })
  res.json({ ok: true })
})

resumesRouter.get('/resumes/:id/file', requireAuth, async (req: AuthRequest, res) => {
  const id = oid(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid resume id' })
  const resume = await Resume.findById(id)
  if (!resume) return res.status(404).json({ message: 'Resume not found' })
  const allowed = await canAccessResume(req, resume)
  if (!allowed) return res.status(403).json({ message: 'Forbidden' })
  const disk = resumeDiskPath(resume.storageKey)
  if (!fs.existsSync(disk)) return res.status(404).json({ message: 'File is no longer available' })
  const download = String(req.query.disposition || '') === 'attachment'
  res.setHeader('Content-Type', resume.mimeType)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader(
    'Content-Disposition',
    `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(resume.originalName)}"`,
  )
  fs.createReadStream(disk).pipe(res)
})
