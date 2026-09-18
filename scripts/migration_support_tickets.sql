-- ========================================================================
-- MSA AUTOMOTRIZ - MIGRACIÓN: MÓDULO DE TICKETS DE SOPORTE TI / SISTEMAS
-- Base de datos: MySQL / MariaDB (MSA Asistencia)
-- ========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `SupportTicket` (
  `id` VARCHAR(191) NOT NULL,
  `ticketNumber` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `siteId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `category` ENUM('HARDWARE', 'SOFTWARE', 'NETWORK', 'ATTENDANCE_SYSTEM', 'EMAIL', 'PRINTER', 'OTHER') NOT NULL DEFAULT 'OTHER',
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `description` TEXT NOT NULL,
  `status` ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `assignedToId` VARCHAR(191) NULL,
  `resolutionNote` TEXT NULL,
  `resolvedAt` DATETIME(3) NULL,
  `resolvedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `SupportTicket_ticketNumber_key` (`ticketNumber`),
  INDEX `SupportTicket_userId_idx` (`userId`),
  INDEX `SupportTicket_companyId_status_idx` (`companyId`, `status`),
  INDEX `SupportTicket_createdAt_idx` (`createdAt`),

  CONSTRAINT `SupportTicket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SupportTicket_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SupportTicket_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `SupportTicket_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `SupportTicket_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registrar permisos para el módulo de tickets
INSERT IGNORE INTO `Permission` (`id`, `code`, `description`, `createdAt`, `updatedAt`) VALUES
('perm_tickets_read', 'tickets.read', 'Ver tickets de soporte', NOW(3), NOW(3)),
('perm_tickets_create', 'tickets.create', 'Crear tickets de soporte', NOW(3), NOW(3)),
('perm_tickets_update', 'tickets.update', 'Actualizar tickets de soporte', NOW(3), NOW(3)),
('perm_tickets_delete', 'tickets.delete', 'Eliminar tickets de soporte', NOW(3), NOW(3)),
('perm_tickets_manage', 'tickets.manage', 'Gestionar y resolver tickets de soporte', NOW(3), NOW(3));

-- Asignar permisos al rol Administrador y Sistemas
INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
CROSS JOIN `Permission` p
WHERE r.name IN ('Administrador', 'Sistemas')
  AND p.code IN ('tickets.read', 'tickets.create', 'tickets.update', 'tickets.delete', 'tickets.manage');

-- Asignar permisos básicos (crear y ver) a Empleados, Gerente, Supervisor y RRHH
INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
CROSS JOIN `Permission` p
WHERE r.name IN ('Empleado', 'Gerente', 'Supervisor', 'Recursos Humanos')
  AND p.code IN ('tickets.read', 'tickets.create');

SET FOREIGN_KEY_CHECKS = 1;
