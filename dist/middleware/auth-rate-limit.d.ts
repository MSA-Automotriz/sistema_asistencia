/**
 * Limitador estricto para rutas de autenticación y recuperación de contraseñas.
 * Previene ataques de fuerza bruta dirigidos y credential stuffing.
 */
export declare const authRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
