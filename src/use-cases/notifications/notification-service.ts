import nodemailer from 'nodemailer';
import { NotificationChannel, type Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';

export type CreateNotificationInput = {
  userId: string;
  title: string;
  body: string;
  type?: string;
  channel?: NotificationChannel;
  metadata?: Prisma.InputJsonValue;
};

export class NotificationService {
  async create(input: CreateNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        type: input.type,
        channel: input.channel ?? NotificationChannel.IN_APP,
        metadata: input.metadata
      }
    });
    if (this.canSendEmail()) void this.sendEmail(input.userId, input.title, input.body);
    return notification;
  }

  async listForUser(userId: string, page: number, limit: number, unreadOnly = false) {
    const where = { userId, ...(unreadOnly ? { readAt: null } : {}) };
    const [items, total, unread] = await Promise.all([
      prisma.notification.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, readAt: null } })
    ]);
    return { items, unread, pagination: { page, limit, total } };
  }

  async markRead(userId: string, notificationId: string) {
    const result = await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { readAt: new Date() } });
    if (!result.count) throw new AppError(404, 'Notificación no encontrada');
  }

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }

  private canSendEmail() {
    return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD);
  }

  private async sendEmail(userId: string, title: string, body: string) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (!user?.email) return;
      const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
      });
      await transport.sendMail({
        from: env.SMTP_FROM ?? env.SMTP_USER,
        to: user.email,
        subject: `[MSA Asistencia] ${title}`,
        text: body
      });
    } catch (error) {
      logger.warn('No se pudo enviar la notificación por correo', {
        userId,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}