-- ========================================================================
-- MSA AUTOMOTRIZ - MIGRACIÓN PRODUCCIÓN: EVIDENCIA EN TICKETS Y SUSTENTO EN PERMISOS
-- Ejecutar en phpMyAdmin / MySQL de Producción
-- ========================================================================

-- 1. Añadir columna evidenceUrl a la tabla SupportTicket (para fotos de soporte TI)
ALTER TABLE `SupportTicket` ADD COLUMN `evidenceUrl` VARCHAR(500) NULL AFTER `description`;

-- 2. Añadir columna documentUrl a la tabla WorkPermission (para justificaciones PDF/foto)
ALTER TABLE `WorkPermission` ADD COLUMN `documentUrl` VARCHAR(500) NULL AFTER `reason`;

-- 3. Añadir columna documentUrl a la tabla License (para justificaciones PDF/foto en licencias)
ALTER TABLE `License` ADD COLUMN `documentUrl` VARCHAR(500) NULL AFTER `reason`;
