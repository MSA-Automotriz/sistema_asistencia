-- ========================================================================
-- MSA AUTOMOTRIZ - CARGA MASIVA DE ÁREAS (DEPARTAMENTOS) Y CARGOS
-- Base de datos: MySQL / MariaDB (MSA Asistencia)
-- ========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. INSERTAR ÁREAS / DEPARTAMENTOS
INSERT INTO `Department` (`id`, `companyId`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT 
  CONCAT('dept_', SUBSTRING(MD5(CONCAT(c.id, '_', d.name)), 1, 20)),
  c.id,
  d.name,
  d.description,
  NOW(3),
  NOW(3)
FROM `Company` c
CROSS JOIN (
  SELECT 'Ventas' AS name, 'Área Comercial y Ventas de Vehículos' AS description UNION ALL
  SELECT 'Posventa y Taller', 'Servicio Técnico, Mecánica y Garantías' UNION ALL
  SELECT 'Planchado y Pintura', 'Área de Chapa, Planchado y Pintura' UNION ALL
  SELECT 'Repuestos', 'Almacén, Logística y Distribución de Repuestos' UNION ALL
  SELECT 'Contabilidad y Finanzas', 'Contabilidad, Finanzas, Tesorería y Facturación' UNION ALL
  SELECT 'Administración y RRHH', 'Administración General, Personal y Legal' UNION ALL
  SELECT 'Marketing', 'Marketing, Publicidad y BDC' UNION ALL
  SELECT 'Servicios Generales', 'Limpieza, Mantenimiento y Vigilancia' UNION ALL
  SELECT 'Sistemas', 'Tecnología, Redes y Soporte Informático' UNION ALL
  SELECT 'Gerencia', 'Dirección General y Gerencias'
) d
WHERE c.active = 1
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updatedAt` = NOW(3);

-- 2. INSERTAR CARGOS / POSICIONES
INSERT INTO `Position` (`id`, `companyId`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT 
  CONCAT('pos_', SUBSTRING(MD5(CONCAT(c.id, '_', p.name)), 1, 20)),
  c.id,
  p.name,
  p.description,
  NOW(3),
  NOW(3)
FROM `Company` c
CROSS JOIN (
  SELECT 'Gerente General' AS name, 'Dirección General' AS description UNION ALL
  SELECT 'Administrador de empresa', 'Administración Central' UNION ALL
  SELECT 'Administrador de sede', 'Administración de Sede' UNION ALL
  SELECT 'Gerente comercial', 'Gerencia Comercial y Ventas' UNION ALL
  SELECT 'Gerente de posventa', 'Gerencia de Posventa y Servicios' UNION ALL
  SELECT 'Jefe de Postventa', 'Jefatura de Postventa' UNION ALL
  SELECT 'Jefe de mecánicos', 'Jefatura de Taller Mecánico' UNION ALL
  SELECT 'Asesor de ventas', 'Ventas y Atención al Cliente' UNION ALL
  SELECT 'Asesor de servicio', 'Recepción y Asesoría de Taller' UNION ALL
  SELECT 'Asesor de servicio (Caja)', 'Caja y Atención de Servicios' UNION ALL
  SELECT 'Técnico mecánico', 'Mecánica y Mantenimiento' UNION ALL
  SELECT 'Planchado y pintura', 'Técnico de Planchado y Pintura' UNION ALL
  SELECT 'Analista de Calidad', 'Control de Calidad' UNION ALL
  SELECT 'Analista de garantías', 'Gestión de Garantías' UNION ALL
  SELECT 'Repuestos', 'Atención y Venta de Repuestos' UNION ALL
  SELECT 'Repuestos - Campo', 'Venta y Distribución de Repuestos en Campo' UNION ALL
  SELECT 'Contadora', 'Jefatura Contable' UNION ALL
  SELECT 'Asistente Contable', 'Asistencia Contable' UNION ALL
  SELECT 'Practicante contable', 'Prácticas Contables' UNION ALL
  SELECT 'Asistente de finanzas', 'Gestión Financiera' UNION ALL
  SELECT 'Recursos Humanos', 'Gestión de Personal y RRHH' UNION ALL
  SELECT 'Asesora legal', 'Asesoría Jurídica y Legal' UNION ALL
  SELECT 'Marketing', 'Especialista de Marketing' UNION ALL
  SELECT 'BDC', 'Business Development Center' UNION ALL
  SELECT 'ADV', 'Administración de Ventas' UNION ALL
  SELECT 'Operaciones', 'Operaciones y Procesos' UNION ALL
  SELECT 'Auxiliar de oficina', 'Apoyo Administrativo' UNION ALL
  SELECT 'Conductor', 'Transporte y Movilidad' UNION ALL
  SELECT 'Lavado de vehículos', 'Lavado y Detallado Automotriz' UNION ALL
  SELECT 'Limpieza', 'Personal de Limpieza y Mantenimiento' UNION ALL
  SELECT 'Vigilante', 'Seguridad y Vigilancia' UNION ALL
  SELECT 'Sistemas', 'Soporte y Sistemas'
) p
WHERE c.active = 1
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updatedAt` = NOW(3);

SET FOREIGN_KEY_CHECKS = 1;
