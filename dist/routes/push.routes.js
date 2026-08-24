import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../common/http/response.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { PushService } from '../use-cases/notifications/push-service.js';
const push = new PushService();
const subscribeSchema = z.object({
    body: z
        .object({
        endpoint: z.string().url().max(500),
        keys: z
            .object({
            p256dh: z.string().min(1),
            auth: z.string().min(1)
        })
            .strict()
    })
        .strict()
});
const unsubscribeSchema = z.object({
    body: z
        .object({
        endpoint: z.string().url().max(500)
    })
        .strict()
});
export const pushRouter = Router();
// Obtener clave pública VAPID (para que el frontend configure PushManager)
pushRouter.get('/push/public-key', (_request, response) => ok(response, 'Clave pública VAPID obtenida correctamente', {
    publicKey: push.getPublicKey()
}));
// Registrar o renovar suscripción Push del dispositivo actual
pushRouter.post('/push/subscribe', authenticate, validate(subscribeSchema), async (request, response) => {
    const userAgent = request.headers['user-agent'];
    const subscription = await push.saveSubscription(request.auth.sub, request.body, userAgent);
    return ok(response, 'Suscripción a notificaciones push registrada correctamente', {
        id: subscription.id,
        endpoint: subscription.endpoint,
        createdAt: subscription.createdAt
    });
});
// Cancelar suscripción Push del dispositivo
pushRouter.post('/push/unsubscribe', authenticate, validate(unsubscribeSchema), async (request, response) => {
    await push.removeSubscription(request.auth.sub, request.body.endpoint);
    return ok(response, 'Suscripción a notificaciones push cancelada correctamente');
});
// Listar suscripciones Push activas del usuario
pushRouter.get('/push/subscriptions', authenticate, async (request, response) => {
    const subscriptions = await push.listUserSubscriptions(request.auth.sub);
    return ok(response, 'Suscripciones push obtenidas correctamente', subscriptions);
});
// Enviar notificación Push de prueba al dispositivo del usuario
pushRouter.post('/push/test', authenticate, async (request, response) => {
    await push.sendNotification(request.auth.sub, {
        title: '¡Prueba de Notificación Push!',
        body: 'Las notificaciones de MSA Asistencia están configuradas y funcionando correctamente en este dispositivo.',
        type: 'TEST_PUSH',
        url: '/'
    });
    return ok(response, 'Notificación push de prueba enviada');
});
//# sourceMappingURL=push.routes.js.map