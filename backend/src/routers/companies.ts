import { Router } from 'express'
import { Company, Drive, Application } from '../models.js'
import { requireAuth, requireAdmin, type AuthRequest } from '../auth.js'
import { companySchema, companyPatchSchema } from '../validation.js'
import { audit } from '../audit.js'
import { oid, zodError } from '../http.js'
import { serializeDrive } from '../serializers.js'

export const companiesRouter = Router()

async function companyStats(companyIds: any[]) {
  const [driveCounts, appCounts] = await Promise.all([
    Drive.aggregate([{ $match: { companyId: { $in: companyIds } } }, { $group: { _id: '$companyId', n: { $sum: 1 } } }]),
    Application.aggregate([
      { $match: { companyId: { $in: companyIds } } },
      {
        $group: {
          _id: '$companyId',
          n: { $sum: 1 },
          shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'SHORTLISTED'] }, 1, 0] } },
          selected: { $sum: { $cond: [{ $eq: ['$status', 'SELECTED'] }, 1, 0] } },
        },
      },
    ]),
  ])
  const drives = Object.fromEntries(driveCounts.map((x) => [String(x._id), x.n]))
  const apps = Object.fromEntries(appCounts.map((x) => [String(x._id), x]))
  return { drives, apps }
}

async function listCompanies(_req: any, res: any) {
  const companies = await Company.find().sort({ name: 1 }).lean()
  const ids = companies.map((c) => c._id)
  const stats = ids.length ? await companyStats(ids) : { drives: {}, apps: {} }
  res.json({
    companies: companies.map((c) => ({
      ...c,
      driveCount: stats.drives[String(c._id)] || 0,
      applicationCount: stats.apps[String(c._id)]?.n || 0,
      openDrives: stats.drives[String(c._id)] || 0,
    })),
  })
}

companiesRouter.get('/companies', requireAuth, requireAdmin, listCompanies)
companiesRouter.get('/admin/companies', requireAuth, requireAdmin, listCompanies)

companiesRouter.get('/companies/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = oid(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid company id' })
  const company = await Company.findById(id).lean()
  if (!company) return res.status(404).json({ message: 'Company not found' })

  const [drives, stats] = await Promise.all([
    Drive.find({ companyId: id }).sort({ createdAt: -1 }).lean(),
    Application.aggregate([
      { $match: { companyId: id } },
      {
        $group: {
          _id: '$status',
          n: { $sum: 1 },
        },
      },
    ]),
  ])
  const byStatus = Object.fromEntries(stats.map((s) => [s._id, s.n]))
  const applicationCount = stats.reduce((sum, s) => sum + s.n, 0)
  const active = drives.filter((d) => ['PUBLISHED', 'Open'].includes(String(d.status)))
  const past = drives.filter((d) => !['PUBLISHED', 'Open', 'DRAFT'].includes(String(d.status)))
  res.json({
    company: {
      ...company,
      driveCount: drives.length,
      applicationCount,
      shortlistedCount: (byStatus.SHORTLISTED || 0) + (byStatus.Shortlisted || 0),
      selectedCount: (byStatus.SELECTED || 0) + (byStatus.Selected || 0),
    },
    activeDrives: active.map((d) => serializeDrive(d)),
    pastDrives: past.map((d) => serializeDrive(d)),
    draftDrives: drives.filter((d) => String(d.status) === 'DRAFT').map((d) => serializeDrive(d)),
  })
})

companiesRouter.post('/companies', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const body = companySchema.parse(req.body)
    const company = await Company.create({ ...body, isActive: body.isActive !== false })
    await audit({ actor: req.user!.id, action: 'company.created', entityType: 'Company', entityId: String(company._id), meta: { name: company.name } })
    res.status(201).json({ company })
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'A company with this name already exists' })
    res.status(400).json(zodError(e))
  }
})

companiesRouter.patch('/companies/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const id = oid(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid company id' })
  try {
    const body = companyPatchSchema.parse(req.body)
    const company = await Company.findByIdAndUpdate(id, body, { new: true, runValidators: true })
    if (!company) return res.status(404).json({ message: 'Company not found' })
    if (body.isActive === false) {
      await audit({ actor: req.user!.id, action: 'company.deactivated', entityType: 'Company', entityId: String(company._id) })
    } else {
      await audit({ actor: req.user!.id, action: 'company.updated', entityType: 'Company', entityId: String(company._id) })
    }
    res.json({ company })
  } catch (e: any) {
    res.status(400).json(zodError(e))
  }
})
