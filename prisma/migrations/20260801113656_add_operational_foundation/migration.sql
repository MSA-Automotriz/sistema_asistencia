/*
  Warnings:

  - A unique constraint covering the columns `[qrCode]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `company` ADD COLUMN `logoUrl` VARCHAR(191) NULL,
    ADD COLUMN `timeZone` VARCHAR(191) NOT NULL DEFAULT 'America/Lima';

-- AlterTable
ALTER TABLE `employee` ADD COLUMN `profilePhotoUrl` VARCHAR(191) NULL,
    ADD COLUMN `qrCode` VARCHAR(191) NULL,
    ADD COLUMN `supervisorId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `license` ADD COLUMN `reviewNote` VARCHAR(191) NULL,
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewedById` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `notification` ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `type` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `schedule` ADD COLUMN `breakEndTime` VARCHAR(191) NULL,
    ADD COLUMN `breakMinutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `breakStartTime` VARCHAR(191) NULL,
    ADD COLUMN `flexibleWindowMinutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `type` ENUM('NORMAL', 'NIGHT', 'ROTATING', 'PART_TIME', 'FLEXIBLE') NOT NULL DEFAULT 'NORMAL',
    ADD COLUMN `workDays` JSON NULL;

-- AlterTable
ALTER TABLE `vacation` ADD COLUMN `reviewNote` VARCHAR(191) NULL,
    ADD COLUMN `reviewedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `SiteSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `scheduleId` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SiteSchedule_siteId_scheduleId_key`(`siteId`, `scheduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Device` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fingerprint` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'AUTHORIZED', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Device_userId_status_idx`(`userId`, `status`),
    UNIQUE INDEX `Device_userId_fingerprint_key`(`userId`, `fingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Announcement` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `audienceRoleId` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Announcement_companyId_status_publishedAt_idx`(`companyId`, `status`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BackupRecord` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `type` ENUM('DATABASE', 'FILES') NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `storagePath` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BackupRecord_companyId_status_createdAt_idx`(`companyId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Employee_qrCode_key` ON `Employee`(`qrCode`);

-- AddForeignKey
ALTER TABLE `SiteSchedule` ADD CONSTRAINT `SiteSchedule_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteSchedule` ADD CONSTRAINT `SiteSchedule_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `Schedule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Announcement` ADD CONSTRAINT `Announcement_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BackupRecord` ADD CONSTRAINT `BackupRecord_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
