import { AuditLog } from './models.js';
export async function audit(params) {
    try {
        await AuditLog.create({
            actor: params.actor,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            meta: params.meta,
        });
    }
    catch (err) {
        console.error('Audit log failed', err);
    }
}
