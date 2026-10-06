import { Router } from 'express'
import { User, Resource } from './models.js'
import {
  comparePassword,
  hashPassword,
  publicUser,
  requireAuth,
  requireAdmin,
  setAuthCookie,
  signToken,
  type AuthRequest,
} from './auth.js'
import { config } from './config.js'
import { loginSchema, registerSchema } from './validation.js'
import { companiesRouter } from './routers/companies.js'
import { drivesRouter } from './routers/drives.js'
import { applicationsRouter } from './routers/applications.js'
import { resumesRouter } from './routers/resumes.js'
import { interviewsRouter } from './routers/interviews.js'
import { notificationsRouter } from './routers/notifications.js'
import { analyticsRouter } from './routers/analytics.js'

export const router = Router()

router.get('/health', (_, res) =>
  res.json({
    ok: true,
    service: 'getPlaced API',
    time: new Date().toISOString(),
  }),
)

router.post('/auth/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body)

    if (body.role === 'admin') {
      if (body.adminCode !== config.adminCode) {
        return res.status(403).json({ message: 'Invalid admin invite code' })
      }
    }

    const email = body.email.toLowerCase().trim()
    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' })
    }

    const hashedPassword = await hashPassword(body.password)
    const userData =
      body.role === 'admin'
        ? {
            name: body.name.trim(),
            email,
            password: hashedPassword,
            role: 'admin' as const,
          }
        : {
            name: body.name.trim(),
            email,
            password: hashedPassword,
            role: 'user' as const,
            course: body.course?.trim(),
            graduationYear: body.graduationYear,
          }

    const user = await User.create(userData)
    const token = signToken(user)
    setAuthCookie(res, token)
    return res.status(201).json({ token, user: publicUser(user) })
  } catch (e: any) {
    if (e?.issues?.length) {
      return res.status(400).json({
        message: e.issues[0].message || 'Validation failed',
        field: e.issues[0].path?.[0],
      })
    }
    return res.status(400).json({ message: 'Invalid registration data' })
  }
})

router.post('/auth/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body)
    const email = body.email.toLowerCase().trim()
    const user = await User.findOne({ email }).select('+password')

    if (!user || !(await comparePassword(body.password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = signToken(user)
    setAuthCookie(res, token)
    return res.json({ token, user: publicUser(user) })
  } catch (e: any) {
    if (e?.issues?.length) {
      return res.status(400).json({ message: e.issues[0].message || 'Invalid login data' })
    }
    return res.status(400).json({ message: 'Invalid login data' })
  }
})

router.post('/auth/logout', (_, res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
  })
  res.json({ ok: true })
})

router.get('/auth/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id)
  if (!user) return res.status(401).json({ message: 'User not found' })
  res.json({ user: publicUser(user) })
})

router.put('/users/me', requireAuth, async (req: AuthRequest, res) => {
  const allowed = ['name', 'phone', 'course', 'graduationYear', 'skills', 'bio', 'avatar', 'cgpa']
  const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
  const user = await User.findByIdAndUpdate(req.user!.id, update, { new: true, runValidators: true })
  res.json({ user: publicUser(user) })
})

router.get('/resources', requireAuth, async (_, res) => res.json({ resources: await Resource.find().sort({ createdAt: -1 }) }))
router.get('/admin/students', requireAuth, requireAdmin, async (_, res) =>
  res.json({ students: await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 }) }),
)
router.post('/admin/resources', requireAuth, requireAdmin, async (req, res) =>
  res.status(201).json({ resource: await Resource.create(req.body) }),
)

router.use(companiesRouter)
router.use(drivesRouter)
router.use(resumesRouter)
router.use(applicationsRouter)
router.use(interviewsRouter)
router.use(notificationsRouter)
router.use(analyticsRouter)
