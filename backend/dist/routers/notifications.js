import { Router } from 'express';
import { Notification, User, AuditLog } from '../models.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { announcementSchema } from '../validation.js';
import { notifyMany } from '../notify.js';
import { oid, pageParams, zodError } from '../http.js';
import { serializeNotification } from '../serializers.js';
export const notificationsRouter = Router();
notificationsRouter.get('/notifications', requireAuth, async (req, res) => {
    const { limit } = pageParams(req);
    const notifications = await Notification.find({ $or: [{ user: req.user.id }, { user: null }] })
        .sort({ createdAt: -1 })
        .limit(Math.min(limit, 50))
        .lean();
    const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false });
    res.json({ notifications: notifications.map(serializeNotification), unreadCount });
});
notificationsRouter.patch('/notifications/:id/read', requireAuth, async (req, res) => {
    const id = oid(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'Invalid notification id' });
    const notification = await Notification.findOneAndUpdate({ _id: id, user: req.user.id }, { read: true }, { new: true });
    if (!notification)
        return res.status(404).json({ message: 'Notification not found' });
    const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false });
    res.json({ notification: serializeNotification(notification), unreadCount });
});
notificationsRouter.post('/notifications/read-all', requireAuth, async (req, res) => {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
    res.json({ ok: true, unreadCount: 0 });
});
notificationsRouter.get('/admin/notifications', requireAuth, requireAdmin, async (_req, res) => {
    const notifications = await Notification.find({ type: { $in: ['ANNOUNCEMENT', 'GENERAL'] }, user: null })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    res.json({ notifications: notifications.map(serializeNotification) });
});
notificationsRouter.post('/admin/notifications', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { title, message } = announcementSchema.parse(req.body);
        const users = await User.find({ role: 'user' }).select('_id');
        await notifyMany(users.map((u) => String(u._id)), { type: 'ANNOUNCEMENT', title, message });
        const record = await Notification.create({ user: null, type: 'ANNOUNCEMENT', title, message });
        res.status(201).json({ ok: true, notification: serializeNotification(record) });
    }
    catch (e) {
        res.status(400).json(zodError(e));
    }
});
notificationsRouter.get('/admin/audit', requireAuth, requireAdmin, async (req, res) => {
    const { page, limit, skip } = pageParams(req);
    const [items, total] = await Promise.all([
        AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        AuditLog.countDocuments(),
    ]);
    res.json({ logs: items, total, page, limit });
});
