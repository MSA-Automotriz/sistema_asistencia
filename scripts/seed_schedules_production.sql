-- ========================================================================
-- MSA AUTOMOTRIZ - CARGA DE LOS 8 HORARIOS MAESTROS OFICIALES
-- Compatible con MySQL / MariaDB (Producción)
-- ========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Insertar o Actualizar los 8 Horarios Maestros en la tabla `Schedule`
INSERT INTO `Schedule` (
  `id`,
  `name`,
  `type`,
  `startTime`,
  `endTime`,
  `toleranceMinutes`,
  `flexibleWindowMinutes`,
  `breakStartTime`,
  `breakEndTime`,
  `breakMinutes`,
  `workDays`,
  `active`,
  `createdAt`,
  `updatedAt`
) VALUES
-- 1. General / Taller (2h Refrigerio)
(
  'sch_general_2h',
  'General / Taller (2h Refrigerio)',
  'NORMAL',
  '08:00',
  '18:30',
  10,
  0,
  '13:00',
  '15:00',
  120,
  '{"days":[1,2,3,4,5,6],"saturday":{"startTime":"08:00","endTime":"13:30","breakMinutes":0}}',
  1,
  NOW(3),
  NOW(3)
),
-- 2. General / Taller (1.5h Refrigerio)
(
  'sch_general_1_5h',
  'General / Taller (1.5h Refrigerio)',
  'NORMAL',
  '08:00',
  '18:00',
  10,
  0,
  '13:00',
  '14:30',
  90,
  '{"days":[1,2,3,4,5,6],"saturday":{"startTime":"08:00","endTime":"13:30","breakMinutes":0}}',
  1,
  NOW(3),
  NOW(3)
),
-- 3. Comercial - Asesor de Ventas (Sábado Rotativo)
(
  'sch_ventas_rotativo',
  'Comercial - Asesor de Ventas (Sáb. Rotativo)',
  'ROTATING',
  '08:30',
  '19:00',
  10,
  0,
  '13:00',
  '15:00',
  120,
  '{"days":[1,2,3,4,5,6],"saturday":{"isRotating":true,"shifts":[{"name":"1.er Turno","startTime":"08:30","endTime":"14:00","breakMinutes":0},{"name":"2.º Turno","startTime":"12:30","endTime":"18:00","breakMinutes":0}]}}',
  1,
  NOW(3),
  NOW(3)
),
-- 4. Comercial - Gerencia (Sáb. 08:00 - 13:30)
(
  'sch_gerencia_comercial',
  'Comercial - Gerencia',
  'NORMAL',
  '08:30',
  '19:00',
  10,
  0,
  '13:00',
  '15:00',
  120,
  '{"days":[1,2,3,4,5,6],"saturday":{"startTime":"08:00","endTime":"13:30","breakMinutes":0}}',
  1,
  NOW(3),
  NOW(3)
),
-- 5. Limpieza - Completo (2h Refrigerio)
(
  'sch_limpieza_2h',
  'Limpieza - Completo (2h Refrigerio)',
  'NORMAL',
  '07:00',
  '17:30',
  10,
  0,
  '13:00',
  '15:00',
  120,
  '{"days":[1,2,3,4,5,6],"saturday":{"startTime":"07:00","endTime":"12:30","breakMinutes":0}}',
  1,
  NOW(3),
  NOW(3)
),
-- 6. Limpieza - Completo (1.5h Refrigerio)
(
  'sch_limpieza_1_5h',
  'Limpieza - Completo (1.5h Refrigerio)',
  'NORMAL',
  '07:00',
  '17:00',
  10,
  0,
  '13:00',
  '14:30',
  90,
  '{"days":[1,2,3,4,5,6],"saturday":{"startTime":"07:00","endTime":"12:30","breakMinutes":0}}',
  1,
  NOW(3),
  NOW(3)
),
-- 7. Limpieza - Turno Continuo (7h)
(
  'sch_limpieza_continuo',
  'Limpieza - Turno Continuo (7h)',
  'PART_TIME',
  '07:00',
  '14:00',
  10,
  0,
  NULL,
  NULL,
  0,
  '{"days":[1,2,3,4,5,6],"saturday":{"startTime":"07:00","endTime":"14:00","breakMinutes":0}}',
  1,
  NOW(3),
  NOW(3)
),
-- 8. Seguridad y Vigilancia (24h)
(
  'sch_vigilancia_24h',
  'Seguridad y Vigilancia (24h)',
  'ROTATING',
  '07:00',
  '07:00',
  15,
  0,
  NULL,
  NULL,
  0,
  '{"days":[1,2,3,4,5,6],"saturday":{"startTime":"07:00","endTime":"14:00","breakMinutes":0}}',
  1,
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `type` = VALUES(`type`),
  `startTime` = VALUES(`startTime`),
  `endTime` = VALUES(`endTime`),
  `toleranceMinutes` = VALUES(`toleranceMinutes`),
  `flexibleWindowMinutes` = VALUES(`flexibleWindowMinutes`),
  `breakStartTime` = VALUES(`breakStartTime`),
  `breakEndTime` = VALUES(`breakEndTime`),
  `breakMinutes` = VALUES(`breakMinutes`),
  `workDays` = VALUES(`workDays`),
  `active` = VALUES(`active`),
  `updatedAt` = NOW(3);

-- 2. Asociar los horarios a todas las sedes activas para disponibilidad inmediata
INSERT IGNORE INTO `SiteSchedule` (`id`, `siteId`, `scheduleId`, `active`, `createdAt`, `updatedAt`)
SELECT 
  CONCAT('ss_', SUBSTRING(MD5(CONCAT(s.id, '_', sch.id)), 1, 20)),
  s.id,
  sch.id,
  1,
  NOW(3),
  NOW(3)
FROM `Site` s
CROSS JOIN `Schedule` sch
WHERE sch.id IN (
  'sch_general_2h',
  'sch_general_1_5h',
  'sch_ventas_rotativo',
  'sch_gerencia_comercial',
  'sch_limpieza_2h',
  'sch_limpieza_1_5h',
  'sch_limpieza_continuo',
  'sch_vigilancia_24h'
);

SET FOREIGN_KEY_CHECKS = 1;
