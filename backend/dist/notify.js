import { Notification } from './models.js';
export async function notifyUser(params) {
    try {
        await Notification.create({
            user: params.userId,
            type: params.type,
            title: params.title,
            message: params.message,
            relatedEntityId: params.relatedEntityId || undefined,
            relatedEntityType: params.relatedEntityType,
            read: false,
        });
    }
    catch (err) {
        console.error('Notification failed', err);
    }
}
export async function notifyMany(userIds, payload) {
    if (!userIds.length)
        return;
    try {
        await Notification.insertMany(userIds.map((user) => ({
            user,
            ...payload,
            read: false,
        })));
    }
    catch (err) {
        console.error('Broadcast notification failed', err);
    }
}
