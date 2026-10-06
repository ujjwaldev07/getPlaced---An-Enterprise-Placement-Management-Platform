import { Router } from 'express';
import mongoose from 'mongoose';
import { Application, Company, Drive, Interview, User } from '../models.js';
import { requireAuth, requireAdmin } from '../auth.js';
export const analyticsRouter = Router();
analyticsRouter.get('/analytics/student', requireAuth, async (req, res) => {
    const studentId = new mongoose.Types.ObjectId(req.user.id);
    const [applications, shortlisted, selected, interviews, drives, trend, status] = await Promise.all([
        Application.countDocuments({ student: studentId }),
        Application.countDocuments({ student: studentId, status: { $in: ['SHORTLISTED', 'Shortlisted'] } }),
        Application.countDocuments({ student: studentId, status: { $in: ['SELECTED', 'Selected'] } }),
        Interview.countDocuments({ student: studentId, status: { $in: ['SCHEDULED', 'RESCHEDULED'] } }),
        Drive.countDocuments({ status: { $in: ['PUBLISHED', 'Open'] } }),
        Application.aggregate([
            { $match: { student: studentId } },
            { $group: { _id: { $dateToString: { format: '%b', date: '$createdAt' } }, applications: { $sum: 1 } } },
        ]),
        Application.aggregate([
            { $match: { student: studentId } },
            { $group: { _id: '$status', value: { $sum: 1 } } },
        ]),
    ]);
    const upcoming = await Interview.find({
        student: studentId,
        status: { $in: ['SCHEDULED', 'RESCHEDULED'] },
    })
        .sort({ scheduledAt: 1 })
        .limit(3)
        .lean();
    res.json({
        stats: { drives, applications, shortlisted, selected, interviews },
        trend: trend.map((x) => ({ name: x._id, applications: x.applications })),
        status: status.map((x) => ({ name: x._id, value: x.value })),
        upcoming,
    });
});
analyticsRouter.get('/analytics/admin', requireAuth, requireAdmin, async (_req, res) => {
    const [students, companies, drives, applications, shortlisted, interviews, selected] = await Promise.all([
        User.countDocuments({ role: 'user' }),
        Company.countDocuments({ isActive: true }),
        Drive.countDocuments({ status: { $in: ['PUBLISHED', 'Open'] } }),
        Application.countDocuments(),
        Application.countDocuments({ status: { $in: ['SHORTLISTED', 'Shortlisted'] } }),
        Interview.countDocuments({ status: { $in: ['SCHEDULED', 'RESCHEDULED'] } }),
        Application.countDocuments({ status: { $in: ['SELECTED', 'Selected'] } }),
    ]);
    const [trend, byCompany, byStatus, participation] = await Promise.all([
        Application.aggregate([
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, applications: { $sum: 1 } } },
            { $sort: { _id: 1 } },
            { $limit: 30 },
        ]),
        Application.aggregate([
            { $lookup: { from: 'drives', localField: 'drive', foreignField: '_id', as: 'drive' } },
            { $unwind: { path: '$drive', preserveNullAndEmptyArrays: true } },
            { $group: { _id: '$drive.company', applications: { $sum: 1 } } },
            { $sort: { applications: -1 } },
            { $limit: 8 },
        ]),
        Application.aggregate([{ $group: { _id: '$status', value: { $sum: 1 } } }]),
        Drive.aggregate([{ $project: { name: { $concat: ['$company', ' — ', '$title'] }, applicants: 1 } }, { $sort: { applicants: -1 } }, { $limit: 8 }]),
    ]);
    const selectionRate = applications ? Math.round((selected / applications) * 1000) / 10 : 0;
    res.json({
        stats: { students, companies, drives, applications, shortlisted, interviews, selected, selectionRate },
        trend: trend.map((x) => ({ name: x._id, applications: x.applications })),
        byCompany: byCompany.map((x) => ({ name: x._id || 'Unknown', applications: x.applications })),
        status: byStatus.map((x) => ({ name: x._id, value: x.value })),
        participation: participation.map((x) => ({ name: x.name, applicants: x.applicants || 0 })),
    });
});
analyticsRouter.get('/admin/analytics', requireAuth, requireAdmin, async (_req, res) => {
    const [students, companies, drives, applications, shortlisted, interviews, selected] = await Promise.all([
        User.countDocuments({ role: 'user' }),
        Company.countDocuments({ isActive: true }),
        Drive.countDocuments({ status: { $in: ['PUBLISHED', 'Open'] } }),
        Application.countDocuments(),
        Application.countDocuments({ status: { $in: ['SHORTLISTED', 'Shortlisted'] } }),
        Interview.countDocuments({ status: { $in: ['SCHEDULED', 'RESCHEDULED'] } }),
        Application.countDocuments({ status: { $in: ['SELECTED', 'Selected'] } }),
    ]);
    res.json({ stats: { students, companies, drives, applications, shortlisted, interviews, selected } });
});
