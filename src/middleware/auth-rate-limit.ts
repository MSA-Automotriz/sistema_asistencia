import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Limitador estricto para rutas de autenticación y recuperación de contraseñas.
 * Previene ataques de fuerza bruta dirigidos y credential stuffing.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: env.NODE_ENV === 'test' ? 1000 : 200, // 200 intentos en producción/dev, relajado en tests automáticos
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de acceso desde esta dirección IP. Intente nuevamente en 15 minutos.'
  }
});
