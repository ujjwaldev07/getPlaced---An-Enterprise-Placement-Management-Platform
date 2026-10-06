import { Router } from 'express';
import { Company, Drive } from '../models.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { driveSchema } from '../validation.js';
import { audit } from '../audit.js';
import { oid, pageParams, zodError } from '../http.js';
import { serializeDrive } from '../serializers.js';
import { normalizeDriveStatus } from '../constants.js';
export const drivesRouter = Router();
async function resolveCompany(body) {
    if (body.companyId) {
        const id = oid(body.companyId);
        if (!id)
            return { error: 'Invalid company' };
        const company = await Company.findById(id);
        if (!company)
            return { error: 'Company not found' };
        if (!company.isActive)
            return { error: 'This company is inactive' };
        return { company };
    }
    if (body.company) {
        const company = await Company.findOne({ name: new RegExp(`^${body.company}$`, 'i') });
        return { company: company || null, name: body.company };
    }
    return { error: 'Company is required' };
}
drivesRouter.get('/drives', requireAuth, async (req, res) => {
    const q = String(req.query.q || '').trim();
    const { page, limit, skip } = pageParams(req);
    const status = String(req.query.status || '');
    const isAdmin = req.user.role === 'admin';
    const filter = {};
    if (q) {
        filter.$or = [
            { company: { $regex: q, $options: 'i' } },
            { title: { $regex: q, $options: 'i' } },
            { location: { $regex: q, $options: 'i' } },
        ];
    }
    if (status)
        filter.status = status;
    else if (!isAdmin)
        filter.status = { $in: ['PUBLISHED', 'Open'] };
    const [drives, total] = await Promise.all([
        Drive.find(filter).populate('companyId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Drive.countDocuments(filter),
    ]);
    res.json({ drives: drives.map((d) => serializeDrive(d)), total, page, limit });
});
drivesRouter.get('/drives/:id', requireAuth, async (req, res) => {
    const id = oid(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid drive id' });
    const drive = await Drive.findById(id).populate('companyId').lean();
    if (!drive)
        return res.status(404).json({ message: 'Drive not found' });
    const status = normalizeDriveStatus(drive.status);
    if (req.user.role !== 'admin' && !['PUBLISHED', 'Open'].includes(drive.status) && status !== 'PUBLISHED') {
        return res.status(404).json({ message: 'Drive not found' });
    }
    res.json({ drive: serializeDrive(drive) });
});
async function createDrive(req, res) {
    try {
        const body = driveSchema.parse(req.body);
        const resolved = await resolveCompany(body);
        if ('error' in resolved && resolved.error)
            return res.status(400).json({ message: resolved.error });
        const company = resolved.company;
        const drive = await Drive.create({
            ...body,
            companyId: company?._id,
            company: company?.name || body.company,
            logo: body.logo || company?.logo,
            status: body.status || 'PUBLISHED',
            createdBy: req.user.id,
        });
        if (drive.status === 'PUBLISHED') {
            await audit({ actor: req.user.id, action: 'drive.published', entityType: 'Drive', entityId: String(drive._id), meta: { title: drive.title, company: drive.company } });
        }
        res.status(201).json({ drive: serializeDrive(drive) });
    }
    catch (e) {
        res.status(400).json(zodError(e));
    }
}
drivesRouter.post('/drives', requireAuth, requireAdmin, createDrive);
drivesRouter.post('/admin/drives', requireAuth, requireAdmin, createDrive);
drivesRouter.patch('/drives/:id', requireAuth, requireAdmin, async (req, res) => {
    const id = oid(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid drive id' });
    try {
        const body = driveSchema.partial().parse(req.body);
        const drive = await Drive.findById(id);
        if (!drive)
            return res.status(404).json({ message: 'Drive not found' });
        if (body.companyId) {
            const resolved = await resolveCompany({ companyId: body.companyId });
            if ('error' in resolved && resolved.error)
                return res.status(400).json({ message: resolved.error });
            if (resolved.company) {
                drive.companyId = resolved.company._id;
                drive.company = resolved.company.name;
                drive.logo = resolved.company.logo;
            }
        }
        Object.assign(drive, body);
        await drive.save();
        if (body.status === 'PUBLISHED') {
            await audit({ actor: req.user.id, action: 'drive.published', entityType: 'Drive', entityId: String(drive._id) });
        }
        if (body.status === 'CANCELLED') {
            await audit({ actor: req.user.id, action: 'drive.cancelled', entityType: 'Drive', entityId: String(drive._id) });
        }
        res.json({ drive: serializeDrive(drive) });
    }
    catch (e) {
        res.status(400).json(zodError(e));
    }
});
