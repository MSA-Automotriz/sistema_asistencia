import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../common/errors/app-error.js';
import { env } from '../config/env.js';

export const authenticate = (request: Request, _response: Response, next: NextFunction) => {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError(401, 'Token de acceso requerido'));
  try { request.auth = jwt.verify(token, env.JWT_SECRET) as Request['auth']; next(); }
  catch { next(new AppError(401, 'Token de acceso inválido o vencido')); }
};

export const authorize = (...required: string[]) => (request: Request, _response: Response, next: NextFunction) => {
  const permissions = request.auth?.permissions ?? [];
  if (!required.some((permission) => permissions.includes(permission))) return next(new AppError(403, 'No tiene permisos para esta operación'));
  next();
};