import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';

export type CreateTicketInput = {
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
  siteId?: string | null;
};

export type UpdateTicketStatusInput = {
  status: TicketStatus;
  resolutionNote?: string | null;
  assignedToId?: string | null;
};

export type TicketFilters = {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  siteId?: string;
  search?: string;
  page?: number;
  limit?: number;
};

type AuthContext = {
  sub: string;
  permissions?: string[];
  role?: string;
};

const ticketInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: { select: { name: true } },
      employee: {
        select: {
          employeeCode: true,
          department: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } }
        }
      }
    }
  },
  site: {
    select: { id: true, name: true }
  },
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, email: true }
  },
  resolvedBy: {
    select: { id: true, firstName: true, lastName: true, email: true }
  }
};

export class SupportTicketService {
  private async isManagerOrAdmin(auth: AuthContext): Promise<boolean> {
    const permissions = auth.permissions ?? [];
    if (permissions.includes('tickets.manage') || permissions.includes('tickets.read_all')) {
      return true;
    }
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: {
        role: { select: { name: true } },
        employee: { select: { department: { select: { name: true } } } }
      }
    });
    if (!user) return false;
    const roleName = user.role?.name?.toLowerCase() ?? '';
    const deptName = user.employee?.department?.name?.toLowerCase() ?? '';
    return (
      roleName.includes('admin') ||
      roleName.includes('sistemas') ||
      deptName.includes('sistemas') ||
      deptName.includes('tecnología')
    );
  }

  async createTicket(userId: string, input: CreateTicketInput) {
    if (!input.title || input.title.trim().length < 3) {
      throw new AppError(400, 'El título del ticket debe tener al menos 3 caracteres');
    }
    if (!input.description || input.description.trim().length < 5) {
      throw new AppError(400, 'La descripción del ticket debe tener al menos 5 caracteres');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: { select: { companyId: true, siteId: true } }
      }
    });

    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    let companyId = user.employee?.companyId;
    if (!companyId) {
      const defaultCompany = await prisma.company.findFirst({ where: { active: true }, select: { id: true } });
      if (!defaultCompany) throw new AppError(400, 'No existe una empresa activa en el sistema');
      companyId = defaultCompany.id;
    }

    const siteId = input.siteId || user.employee?.siteId || null;

    // Generate unique sequential ticket number
    const count = await prisma.supportTicket.count({ where: { companyId } });
    const currentYear = new Date().getFullYear();
    const ticketNumber = `TKT-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        companyId,
        siteId,
        title: input.title.trim(),
        category: input.category || TicketCategory.OTHER,
        priority: input.priority || TicketPriority.MEDIUM,
        description: input.description.trim(),
        status: TicketStatus.PENDING
      },
      include: ticketInclude
    });

    // Notify admins / Sistemas
    const systemsRole = await prisma.role.findFirst({
      where: {
        OR: [
          { name: { contains: 'Sistemas' } },
          { name: { contains: 'Administrador' } }
        ]
      },
      select: { id: true }
    });

    if (systemsRole) {
      const managers = await prisma.user.findMany({
        where: { roleId: systemsRole.id, status: 'ACTIVE', id: { not: userId } },
        select: { id: true }
      });
      for (const m of managers) {
        await prisma.notification.create({
          data: {
            userId: m.id,
            title: `Nuevo Ticket: ${ticket.ticketNumber}`,
            body: `${user.firstName} ${user.lastName} reportó: "${ticket.title}"`,
            type: 'SUPPORT_TICKET',
            metadata: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber }
          }
        }).catch(() => null);
      }
    }

    return ticket;
  }

  async listTickets(auth: AuthContext, filters: TicketFilters) {
    const isManager = await this.isManagerOrAdmin(auth);
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Privacy Isolation: Regular users can ONLY see their own tickets
    if (!isManager) {
      where.userId = auth.sub;
    } else if (filters.siteId) {
      where.siteId = filters.siteId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.search && filters.search.trim().length > 0) {
      const q = filters.search.trim();
      where.OR = [
        { ticketNumber: { contains: q } },
        { title: { contains: q } },
        { description: { contains: q } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ticketInclude
      }),
      prisma.supportTicket.count({ where })
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      isManager
    };
  }

  async getTicketById(auth: AuthContext, ticketId: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: ticketInclude
    });

    if (!ticket) {
      throw new AppError(404, 'Ticket de soporte no encontrado');
    }

    const isManager = await this.isManagerOrAdmin(auth);
    if (!isManager && ticket.userId !== auth.sub) {
      throw new AppError(403, 'No tiene autorización para visualizar este ticket');
    }

    return ticket;
  }

  async updateTicketStatus(auth: AuthContext, ticketId: string, input: UpdateTicketStatusInput) {
    const isManager = await this.isManagerOrAdmin(auth);
    if (!isManager) {
      throw new AppError(403, 'Solo el personal de Sistemas o Administradores pueden gestionar tickets');
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new AppError(404, 'Ticket de soporte no encontrado');
    }

    const updateData: Record<string, unknown> = {
      status: input.status
    };

    if (input.status === TicketStatus.RESOLVED) {
      updateData.resolutionNote = input.resolutionNote?.trim() || null;
      updateData.resolvedAt = new Date();
      updateData.resolvedById = auth.sub;
    } else if (input.status === TicketStatus.IN_PROGRESS) {
      if (!ticket.assignedToId && !input.assignedToId) {
        updateData.assignedToId = auth.sub;
      }
    }

    if (input.assignedToId !== undefined) {
      updateData.assignedToId = input.assignedToId;
    }

    if (input.resolutionNote !== undefined && input.status !== TicketStatus.RESOLVED) {
      updateData.resolutionNote = input.resolutionNote?.trim() || null;
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: ticketInclude
    });

    // Notify ticket owner
    if (updated.userId !== auth.sub) {
      const statusLabel =
        updated.status === TicketStatus.RESOLVED
          ? 'RESUELTO'
          : updated.status === TicketStatus.IN_PROGRESS
            ? 'EN PROCESO'
            : updated.status === TicketStatus.REJECTED
              ? 'RECHAZADO'
              : updated.status;

      await prisma.notification.create({
        data: {
          userId: updated.userId,
          title: `Ticket ${updated.ticketNumber}: Estado ${statusLabel}`,
          body:
            updated.status === TicketStatus.RESOLVED && updated.resolutionNote
              ? `Solución: "${updated.resolutionNote}"`
              : `Tu ticket ha cambiado al estado: ${statusLabel}`,
          type: 'SUPPORT_TICKET_UPDATE',
          metadata: { ticketId: updated.id, status: updated.status }
        }
      }).catch(() => null);
    }

    return updated;
  }

  async cancelTicket(auth: AuthContext, ticketId: string) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new AppError(404, 'Ticket de soporte no encontrado');
    }

    const isManager = await this.isManagerOrAdmin(auth);
    if (!isManager && ticket.userId !== auth.sub) {
      throw new AppError(403, 'No tiene permiso para cancelar este ticket');
    }

    if (ticket.status !== TicketStatus.PENDING) {
      throw new AppError(400, 'Solo se pueden cancelar tickets en estado Pendiente');
    }

    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.CLOSED,
        resolutionNote: 'Cancelado por el usuario'
      },
      include: ticketInclude
    });
  }
}
