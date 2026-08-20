import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../use-cases/auth/auth-service.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';
import { meta } from './helpers.js';

const auth = new AuthService();

const loginSchema = z.object({
  body: z
    .object({
      email: z.string().trim().min(3),
      password: z.string().min(8),
      rememberMe: z.boolean().optional().default(false)
    })
    .strict()
});

const refreshSchema = z.object({
  body: z.object({ refreshToken: z.string().min(40) })
});

const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(8),
      newPassword: z.string().min(12)
    })
    .strict()
});

const recoveryQuestionsSchema = z.object({
  body: z
    .object({
      questions: z
        .array(
          z
            .object({
              question: z.string().trim().min(3).max(200),
              answer: z.string().trim().min(1).max(200)
            })
            .strict()
        )
        .min(2)
        .max(5)
    })
    .strict()
});

const startPasswordRecoverySchema = z.object({
  body: z.object({ email: z.string().trim().min(3) }).strict()
});

const resetPasswordRecoverySchema = z.object({
  body: z
    .object({
      email: z.string().trim().min(3),
      recoveryToken: z.string().min(40),
      answers: z
        .array(
          z
            .object({ questionId: z.string().min(1), answer: z.string().trim().min(1).max(200) })
            .strict()
        )
        .min(2)
        .max(5),
      newPassword: z.string().min(12).max(128)
    })
    .strict()
});

export const authRouter = Router();

authRouter.get('/health', (_request, response) =>
  ok(response, 'Servicio disponible', { status: 'healthy' })
);

authRouter.post('/auth/login', validate(loginSchema), async (request, response) =>
  ok(
    response,
    'Inicio de sesión correcto',
    await auth.login(
      request.body.email,
      request.body.password,
      meta(request),
      request.body.rememberMe
    )
  )
);

authRouter.post('/auth/refresh', validate(refreshSchema), async (request, response) =>
  ok(
    response,
    'Token renovado correctamente',
    await auth.refresh(request.body.refreshToken, meta(request))
  )
);

authRouter.post('/auth/logout', validate(refreshSchema), async (request, response) => {
  await auth.logout(request.body.refreshToken);
  return ok(response, 'Sesión cerrada correctamente');
});

authRouter.post(
  '/auth/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (request, response) => {
    await auth.changePassword(
      request.auth!.sub,
      request.body.currentPassword,
      request.body.newPassword
    );
    return ok(response, 'Contraseña actualizada; las sesiones fueron revocadas');
  }
);

authRouter.get('/auth/recovery-questions', authenticate, async (request, response) =>
  ok(
    response,
    'Preguntas de recuperación obtenidas',
    await auth.getRecoveryQuestions(request.auth!.sub)
  )
);

authRouter.post(
  '/auth/recovery-questions',
  authenticate,
  validate(recoveryQuestionsSchema),
  async (request, response) => {
    await auth.setRecoveryQuestions(request.auth!.sub, request.body.questions);
    return ok(response, 'Preguntas de recuperación actualizadas correctamente');
  }
);

authRouter.post(
  '/auth/password-recovery/start',
  validate(startPasswordRecoverySchema),
  async (request, response) =>
    ok(
      response,
      'Si la cuenta cumple los requisitos, se iniciará su recuperación',
      await auth.startPasswordRecovery(request.body.email)
    )
);

authRouter.post(
  '/auth/password-recovery/reset',
  validate(resetPasswordRecoverySchema),
  async (request, response) => {
    await auth.resetPasswordWithRecovery(
      request.body.email,
      request.body.recoveryToken,
      request.body.answers,
      request.body.newPassword
    );
    return ok(response, 'Contraseña restablecida correctamente');
  }
);

authRouter.get('/auth/sessions', authenticate, async (request, response) =>
  ok(
    response,
    'Sesiones activas obtenidas',
    (await auth.activeSessions(request.auth!.sub)).map((session) => ({
      ...session,
      current: session.id === request.auth!.sid
    }))
  )
);

authRouter.delete('/auth/sessions/:sessionId', authenticate, async (request, response) => {
  await auth.revokeSession(request.auth!.sub, String(request.params.sessionId));
  return response.status(204).send();
});

authRouter.delete('/auth/sessions', authenticate, async (request, response) => {
  await auth.revokeAll(request.auth!.sub);
  return response.status(204).send();
});
