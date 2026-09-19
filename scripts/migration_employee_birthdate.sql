-- Migracion: Agregar columna birthDate a la tabla Employee
-- Ejecutar en MySQL / phpMyAdmin

ALTER TABLE `Employee` ADD COLUMN `birthDate` DATE NULL;
