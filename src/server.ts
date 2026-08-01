import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { logger } from './utils/logger.js';
import { BackupScheduler } from './use-cases/backups/backup-scheduler.js';

const server = app.listen(env.PORT, () => logger.info(`${env.APP_NAME} escuchando en puerto ${env.PORT}`));
const backupScheduler = new BackupScheduler();
backupScheduler.start();
const shutdown = async () => { backupScheduler.stop(); server.close(); await prisma.$disconnect(); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);