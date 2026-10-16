-- Exportación de base de datos para MSA Asistencia
-- Base de datos: asistencia_jcmr_site_c727fe

SET FOREIGN_KEY_CHECKS=0;

-- 1. Tabla users
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(191) NOT NULL,
    `dni` VARCHAR(20) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `photoUrl` VARCHAR(191) NULL,
    `phone` VARCHAR(20) NULL,
    `role` ENUM('ADMIN', 'SUPERVISOR', 'EMPLEADO') NOT NULL DEFAULT 'EMPLEADO',
    `position` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `company` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `contractType` VARCHAR(191) NULL,
    `shift` VARCHAR(191) NULL,
    `entryDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('ACTIVO', 'INACTIVO', 'VACACIONES', 'SUSPENDIDO') NOT NULL DEFAULT 'ACTIVO',
    `failedLoginAttempts` INT NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `lastIp` VARCHAR(45) NULL,
    `twoFactorSecret` VARCHAR(191) NULL,
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `preferredTheme` ENUM('LIGHT', 'DARK', 'AUTO') NOT NULL DEFAULT 'DARK',
    `dashboardConfig` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `users_dni_key`(`dni`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_dni_idx`(`dni`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_status_idx`(`status`),
    INDEX `users_company_idx`(`company`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Tabla attendance_records
CREATE TABLE IF NOT EXISTS `attendance_records` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('ENTRY', 'EXIT', 'LUNCH_START', 'LUNCH_END') NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `location` JSON NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `accuracy` DECIMAL(8, 2) NULL,
    `distanceMeters` DECIMAL(8, 2) NULL,
    `method` ENUM('QR_LOCAL', 'QR_REMOTE', 'GPS', 'FACIAL', 'MANUAL') NOT NULL,
    `deviceInfo` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `isWithinBounds` BOOLEAN NOT NULL DEFAULT true,
    `sede` VARCHAR(191) NULL,
    `isOvertime` BOOLEAN NOT NULL DEFAULT false,
    `overtimeMinutes` INT NOT NULL DEFAULT 0,
    `isLate` BOOLEAN NOT NULL DEFAULT false,
    `lateMinutes` INT NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `status` ENUM('PENDING', 'VALIDATED', 'REJECTED', 'SYNCED') NOT NULL DEFAULT 'VALIDATED',
    `validatedBy` VARCHAR(191) NULL,
    `validatedAt` DATETIME(3) NULL,
    `offlineCreated` BOOLEAN NOT NULL DEFAULT false,
    `syncedAt` DATETIME(3) NULL,
    `clientTempId` VARCHAR(191) NULL,
    `syncBatchId` VARCHAR(191) NULL,
    `syncRetryCount` INT NOT NULL DEFAULT 0,
    `syncError` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `attendance_records_userId_idx`(`userId`),
    INDEX `attendance_records_timestamp_idx`(`timestamp`),
    INDEX `attendance_records_type_idx`(`type`),
    INDEX `attendance_records_method_idx`(`method`),
    INDEX `attendance_records_status_idx`(`status`),
    INDEX `attendance_records_sede_idx`(`sede`),
    INDEX `attendance_records_userId_timestamp_idx`(`userId`, `timestamp`),
    INDEX `attendance_records_clientTempId_idx`(`clientTempId`),
    INDEX `attendance_records_syncBatchId_idx`(`syncBatchId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `attendance_records_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Tabla qr_tokens
CREATE TABLE IF NOT EXISTS `qr_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `sede` VARCHAR(191) NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `maxRadius` INT NOT NULL DEFAULT 10,
    `expiresAt` DATETIME(3) NOT NULL,
    `isUsed` BOOLEAN NOT NULL DEFAULT false,
    `usedAt` DATETIME(3) NULL,
    `usedBy` VARCHAR(191) NULL,
    `createdIp` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `qr_tokens_token_key`(`token`),
    INDEX `qr_tokens_token_idx`(`token`),
    INDEX `qr_tokens_expiresAt_idx`(`expiresAt`),
    INDEX `qr_tokens_sede_idx`(`sede`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Tabla requests
CREATE TABLE IF NOT EXISTS `requests` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('VACATION', 'JUSTIFICATION', 'OVERTIME', 'PERMISSION', 'MEDICAL_LEAVE', 'REMOTE_WORK') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `daysCount` INT NOT NULL DEFAULT 1,
    `hoursCount` DECIMAL(4, 2) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `responseNote` TEXT NULL,
    `attachments` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `requests_userId_idx`(`userId`),
    INDEX `requests_type_idx`(`type`),
    INDEX `requests_status_idx`(`status`),
    INDEX `requests_startDate_idx`(`startDate`),
    INDEX `requests_endDate_idx`(`endDate`),
    PRIMARY KEY (`id`),
    CONSTRAINT `requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. Tabla announcements
CREATE TABLE IF NOT EXISTS `announcements` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `category` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `authorName` VARCHAR(191) NOT NULL,
    `targetRoles` JSON NULL,
    `targetDepartments` JSON NULL,
    `targetLocations` JSON NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `publishAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `requireAck` BOOLEAN NOT NULL DEFAULT false,
    `attachments` JSON NULL,
    `viewCount` INT NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `announcements_priority_idx`(`priority`),
    INDEX `announcements_isPublished_idx`(`isPublished`),
    INDEX `announcements_publishAt_idx`(`publishAt`),
    INDEX `announcements_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `announcements_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6. Tabla notifications
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('INFO', 'WARNING', 'SUCCESS', 'ERROR', 'ATTENDANCE', 'REQUEST', 'ANNOUNCEMENT', 'SYSTEM') NOT NULL DEFAULT 'INFO',
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `link` VARCHAR(191) NULL,
    `data` JSON NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_isRead_idx`(`isRead`),
    INDEX `notifications_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 7. Tabla audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `oldValues` JSON NULL,
    `newValues` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(191) NULL,
    `details` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_entity_idx`(`entity`),
    INDEX `audit_logs_entityId_idx`(`entityId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 8. Tabla user_devices
CREATE TABLE IF NOT EXISTS `user_devices` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `deviceType` VARCHAR(191) NULL,
    `os` VARCHAR(191) NULL,
    `browser` VARCHAR(191) NULL,
    `pushSubscription` JSON NULL,
    `isTrusted` BOOLEAN NOT NULL DEFAULT false,
    `isCurrent` BOOLEAN NOT NULL DEFAULT false,
    `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `user_devices_userId_idx`(`userId`),
    INDEX `user_devices_deviceId_idx`(`deviceId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `user_devices_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 9. Tabla user_sessions
CREATE TABLE IF NOT EXISTS `user_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(500) NOT NULL,
    `deviceInfo` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `isRevoked` BOOLEAN NOT NULL DEFAULT false,
    `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `user_sessions_userId_idx`(`userId`),
    INDEX `user_sessions_refreshToken_idx`(`refreshToken`),
    INDEX `user_sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `user_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 10. Tabla system_settings
CREATE TABLE IF NOT EXISTS `system_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
    `description` VARCHAR(191) NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `system_settings_key_key`(`key`),
    INDEX `system_settings_key_idx`(`key`),
    INDEX `system_settings_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 11. Tabla sync_batches
CREATE TABLE IF NOT EXISTS `sync_batches` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `itemCount` INT NOT NULL,
    `successCount` INT NOT NULL DEFAULT 0,
    `errorCount` INT NOT NULL DEFAULT 0,
    `status` ENUM('PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED') NOT NULL DEFAULT 'PROCESSING',
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `sync_batches_userId_idx`(`userId`),
    INDEX `sync_batches_deviceId_idx`(`deviceId`),
    INDEX `sync_batches_status_idx`(`status`),
    INDEX `sync_batches_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `sync_batches_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 12. Usuario Administrador por defecto (admin@msaautomotriz.com / admin123)
INSERT INTO `users` (`id`, `dni`, `email`, `password`, `name`, `lastName`, `role`, `position`, `department`, `company`, `location`, `status`, `createdAt`, `updatedAt`)
VALUES (
    'admin_msa_001',
    '74839201',
    'admin@msaautomotriz.com',
    '$2b$10$wTqSfZxNq95XlK3P4V9w7eW1o.QyK3U31.fS9a32yK28bV5lF6Zqe',
    'Administrador',
    'MSA',
    'ADMIN',
    'Administrador de Sistema',
    'Tecnología',
    'MSA Automotriz',
    'Central',
    'ACTIVO',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE `id`=`id`;

SET FOREIGN_KEY_CHECKS=1;
