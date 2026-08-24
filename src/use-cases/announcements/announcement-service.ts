import { AnnouncementStatus, UserStatus, type Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';

import { PushService } from '../notifications/push-service.js';

export type AnnouncementInput = {
  companyId: string;
  title: string;
  body: string;
  audienceRoleId?: string | null;
  expiresAt?: Date | null;
};

export class AnnouncementService {
  private pushService = new PushService();

  async create(createdById: string, input: AnnouncementInput) {
    return prisma.announcement.create({
      data: { ...input, createdById },
      include: { company: { select: { id: true, name: true } } }
    });
  }

  async list(page: number, limit: number, companyId?: string, status?: AnnouncementStatus) {
    const where: Prisma.AnnouncementWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(status ? { status } : {})
    };
    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { company: { select: { id: true, name: true } } }
      }),
      prisma.announcement.count({ where })
    ]);
    return { items, pagination: { page, limit, total } };
  }

  async listForUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true, employee: { select: { companyId: true } } }
    });
    if (!user?.employee) return [];
    const now = new Date();
    return prisma.announcement.findMany({
      where: {
        companyId: user.employee.companyId,
        status: AnnouncementStatus.PUBLISHED,
        publishedAt: { lte: now },
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          { OR: [{ audienceRoleId: null }, { audienceRoleId: user.roleId }] }
        ]
      },
      orderBy: { publishedAt: 'desc' }
    });
  }

  async publish(announcementId: string) {
    const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement) throw new AppError(404, 'Anuncio no encontrado');
    if (announcement.status === AnnouncementStatus.ARCHIVED)
      throw new AppError(400, 'No puede publicar un anuncio archivado');
    if (announcement.status === AnnouncementStatus.PUBLISHED) return announcement;
    const publishedAt = new Date();
    const published = await prisma.$transaction(async (transaction) => {
      const pub = await transaction.announcement.update({
        where: { id: announcement.id },
        data: { status: AnnouncementStatus.PUBLISHED, publishedAt }
      });
      const recipients = await transaction.user.findMany({
        where: {
          status: UserStatus.ACTIVE,
          ...(announcement.audienceRoleId ? { roleId: announcement.audienceRoleId } : {}),
          employee: { is: { companyId: announcement.companyId, active: true } }
        },
        select: { id: true }
      });
      if (recipients.length) {
        await transaction.notification.createMany({
          data: recipients.map((recipient) => ({
            userId: recipient.id,
            title: announcement.title,
            body: announcement.body,
            type: 'ANNOUNCEMENT'
          }))
        });
      }
      return { pub, recipientIds: recipients.map((r) => r.id) };
    });

    if (published.recipientIds.length) {
      void this.pushService.sendNotificationToMany(published.recipientIds, {
        title: announcement.title,
        body: announcement.body,
        type: 'ANNOUNCEMENT',
        url: '/#announcements'
      });
    }

    return published.pub;
  }

  async archive(announcementId: string) {
    const result = await prisma.announcement.updateMany({
      where: { id: announcementId, status: { not: AnnouncementStatus.ARCHIVED } },
      data: { status: AnnouncementStatus.ARCHIVED }
    });
    if (!result.count) throw new AppError(404, 'Anuncio no encontrado o ya archivado');
  }
}
