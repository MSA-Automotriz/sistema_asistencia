-- CreateTable
CREATE TABLE `OfflineAttendanceToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OfflineAttendanceToken_tokenHash_key`(`tokenHash`),
    INDEX `OfflineAttendanceToken_userId_expiresAt_idx`(`userId`, `expiresAt`),
    INDEX `OfflineAttendanceToken_siteId_expiresAt_idx`(`siteId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OfflineAttendanceToken` ADD CONSTRAINT `OfflineAttendanceToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfflineAttendanceToken` ADD CONSTRAINT `OfflineAttendanceToken_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
