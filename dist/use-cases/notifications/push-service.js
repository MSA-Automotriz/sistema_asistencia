import webpush from 'web-push';
import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';
export class PushService {
    initialized = false;
    constructor() {
        this.initVapid();
    }
    initVapid() {
        if (this.initialized)
            return;
        try {
            if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
                webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
                this.initialized = true;
            }
        }
        catch (error) {
            logger.warn('No se pudo inicializar VAPID para Web Push', {
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
    getPublicKey() {
        return env.VAPID_PUBLIC_KEY;
    }
    async saveSubscription(userId, data, userAgent) {
        return prisma.pushSubscription.upsert({
            where: { endpoint: data.endpoint },
            update: {
                userId,
                p256dh: data.keys.p256dh,
                auth: data.keys.auth,
                userAgent: userAgent ?? null
            },
            create: {
                userId,
                endpoint: data.endpoint,
                p256dh: data.keys.p256dh,
                auth: data.keys.auth,
                userAgent: userAgent ?? null
            }
        });
    }
    async removeSubscription(userId, endpoint) {
        return prisma.pushSubscription.deleteMany({
            where: { userId, endpoint }
        });
    }
    async listUserSubscriptions(userId) {
        return prisma.pushSubscription.findMany({
            where: { userId },
            select: { id: true, endpoint: true, createdAt: true, userAgent: true }
        });
    }
    async sendNotification(userId, payload) {
        this.initVapid();
        if (!this.initialized)
            return;
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId }
        });
        if (!subscriptions.length)
            return;
        const stringifiedPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            type: payload.type || 'DEFAULT',
            url: payload.url || '/',
            tag: payload.tag || `msa-${Date.now()}`,
            data: payload.data || {}
        });
        const sendPromises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, stringifiedPayload);
            }
            catch (error) {
                const statusCode = error?.statusCode;
                if (statusCode === 404 || statusCode === 410) {
                    // Suscripción caducada o eliminada por el navegador
                    await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
                    logger.info('Suscripción Web Push caducada eliminada automáticamente', {
                        subscriptionId: sub.id,
                        userId
                    });
                }
                else {
                    logger.warn('Error al enviar notificación Web Push', {
                        subscriptionId: sub.id,
                        userId,
                        error: error instanceof Error ? error.message : 'Error desconocido'
                    });
                }
            }
        });
        await Promise.allSettled(sendPromises);
    }
    async sendNotificationToMany(userIds, payload) {
        this.initVapid();
        if (!this.initialized || !userIds.length)
            return;
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId: { in: userIds } }
        });
        if (!subscriptions.length)
            return;
        const stringifiedPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            type: payload.type || 'DEFAULT',
            url: payload.url || '/',
            tag: payload.tag || `msa-${Date.now()}`,
            data: payload.data || {}
        });
        const sendPromises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, stringifiedPayload);
            }
            catch (error) {
                const statusCode = error?.statusCode;
                if (statusCode === 404 || statusCode === 410) {
                    await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
                }
            }
        });
        await Promise.allSettled(sendPromises);
    }
}
//# sourceMappingURL=push-service.js.map