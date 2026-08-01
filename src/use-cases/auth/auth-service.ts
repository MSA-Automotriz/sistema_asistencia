import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../common/errors/app-error.js';
import { hashToken, randomToken } from '../../utils/crypto.js';

type RequestMeta = { ip?: string; userAgent?: string };
const expirationMs = (value: string) => {
  const match = /^(\d+)([dhm])$/.exec(value);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  return Number(match[1]) * ({ m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 'm' | 'h' | 'd']);
};

export class AuthService {
  async login(email: string, password: string, meta: RequestMeta) {
    const user = await prisma.user.findUnique({ where: { email }, include: { role: { include: { rolePermissions: { include: { permission: true } } } } } });
    if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError(401, 'Credenciales inválidas');
    const permissions = user.role.rolePermissions.map(({ permission }) => permission.code);
    const accessToken = jwt.sign({ sub: user.id, role: user.role.name, permissions }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
    const refreshToken = randomToken();
    const session = await prisma.session.create({ data: { userId: user.id, refreshTokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + expirationMs(env.JWT_REFRESH_EXPIRES_IN)), ipAddress: meta.ip, userAgent: meta.userAgent } });
    return { accessToken, refreshToken, sessionId: session.id, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role.name, permissions } };
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    const session = await prisma.session.findUnique({ where: { refreshTokenHash: hashToken(refreshToken) }, include: { user: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } } });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') throw new AppError(401, 'Sesión inválida o vencida');
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return this.loginWithUser(session.user, meta);
  }

  async logout(refreshToken: string) { await prisma.session.updateMany({ where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } }); }
  async revokeAll(userId: string) { await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }); }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError(400, 'Contraseña actual inválida');
    await prisma.$transaction([prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } }), prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })]);
  }

  private async loginWithUser(user: Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>> & { role: { name: string; rolePermissions: { permission: { code: string } }[] } }, meta: RequestMeta) {
    const permissions = user.role.rolePermissions.map(({ permission }) => permission.code);
    const accessToken = jwt.sign({ sub: user.id, role: user.role.name, permissions }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
    const refreshToken = randomToken();
    const session = await prisma.session.create({ data: { userId: user.id, refreshTokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + expirationMs(env.JWT_REFRESH_EXPIRES_IN)), ipAddress: meta.ip, userAgent: meta.userAgent } });
    return { accessToken, refreshToken, sessionId: session.id, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role.name, permissions } };
  }
}