import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../common/errors/app-error.js';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';

type AuthPayload = NonNullable<Request['auth']>;

export const authenticate = async (request: Request, _response: Response, next: NextFunction) => {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError(401, 'Token de acceso requerido'));
  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
  } catch {
    return next(new AppError(401, 'Token de acceso inválido o vencido'));
  }
  if (!payload.sub || !payload.sid)
    return next(new AppError(401, 'Token de acceso inválido o vencido'));

  try {
    const session = await prisma.session.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { is: { status: 'ACTIVE' } }
      },
      select: { id: true }
    });
    if (!session) return next(new AppError(401, 'Sesión inválida o vencida'));
    await prisma.session.update({ where: { id: session.id }, data: { lastActiveAt: new Date() } });
    request.auth = payload;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const authorize =
  (...required: string[]) =>
  (request: Request, _response: Response, next: NextFunction) => {
    const permissions = request.auth?.permissions ?? [];
    if (!required.some((permission) => permissions.includes(permission)))
      return next(new AppError(403, 'No tiene permisos para esta operación'));
    next();
  };
