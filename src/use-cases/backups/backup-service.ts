import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { BackupStatus, BackupType } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';

export type BackupSchedule = {
  enabled: boolean;
  frequency: 'DAILY' | 'WEEKLY';
  hour: number;
  minute: number;
  type: BackupType;
  dayOfWeek?: number;
};

type DatabaseConnection = {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
};

export class BackupService {
  async list(companyId: string, page: number, limit: number) {
    const where = { companyId };
    const [items, total] = await Promise.all([
      prisma.backupRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.backupRecord.count({ where })
    ]);
    return { items, pagination: { page, limit, total } };
  }

  async start(companyId: string, type: BackupType, createdById?: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true }
    });
    if (!company) throw new AppError(404, 'Empresa no encontrada');
    const backup = await prisma.backupRecord.create({ data: { companyId, type, createdById } });
    void this.execute(backup.id).catch((error: unknown) =>
      logger.error('No se pudo ejecutar el respaldo', {
        backupId: backup.id,
        error: this.errorMessage(error)
      })
    );
    return backup;
  }

  async restore(backupId: string, confirmation: string) {
    if (confirmation !== 'RESTORE')
      throw new AppError(422, 'Debe confirmar la restauración con RESTORE');
    const backup = await prisma.backupRecord.findUnique({ where: { id: backupId } });
    if (!backup || backup.status !== BackupStatus.COMPLETED || !backup.storagePath)
      throw new AppError(404, 'Respaldo disponible no encontrado');
    await access(backup.storagePath);
    if (backup.type === BackupType.DATABASE) await this.restoreDatabase(backup.storagePath);
    else await cp(backup.storagePath, path.resolve('public'), { recursive: true, force: true });
    return { id: backup.id, type: backup.type, restoredAt: new Date() };
  }

  async getSchedule(companyId: string): Promise<BackupSchedule | null> {
    const setting = await prisma.setting.findUnique({
      where: { companyId_key: { companyId, key: 'backup.schedule' } }
    });
    if (!setting) return null;
    try {
      return JSON.parse(setting.value) as BackupSchedule;
    } catch {
      return null;
    }
  }

  async setSchedule(companyId: string, schedule: BackupSchedule) {
    await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { id: true } });
    return prisma.setting.upsert({
      where: { companyId_key: { companyId, key: 'backup.schedule' } },
      create: { companyId, key: 'backup.schedule', value: JSON.stringify(schedule) },
      update: { value: JSON.stringify(schedule) }
    });
  }

  private async execute(backupId: string) {
    const backup = await prisma.backupRecord.update({
      where: { id: backupId },
      data: { status: BackupStatus.RUNNING, startedAt: new Date(), errorMessage: null }
    });
    try {
      const storagePath =
        backup.type === BackupType.DATABASE
          ? await this.createDatabaseBackup(backup.id)
          : await this.createFilesBackup(backup.id);
      await prisma.backupRecord.update({
        where: { id: backup.id },
        data: { status: BackupStatus.COMPLETED, storagePath, completedAt: new Date() }
      });
    } catch (error) {
      await prisma.backupRecord.update({
        where: { id: backup.id },
        data: {
          status: BackupStatus.FAILED,
          errorMessage: this.errorMessage(error),
          completedAt: new Date()
        }
      });
      throw error;
    }
  }

  private async createDatabaseBackup(backupId: string) {
    const directory = path.resolve(env.BACKUP_DIRECTORY, 'database');
    await mkdir(directory, { recursive: true });
    const target = path.join(directory, `msa-${this.fileTimestamp()}-${backupId}.sql`);
    const connection = this.databaseConnection();
    await this.runProcess(
      this.mysqldumpPath(),
      [
        `--host=${connection.host}`,
        `--port=${connection.port}`,
        `--user=${connection.username}`,
        '--protocol=TCP',
        '--single-transaction',
        '--routines',
        '--events',
        connection.database
      ],
      connection.password,
      undefined,
      target
    );
    return target;
  }

  private async createFilesBackup(backupId: string) {
    const directory = path.resolve(
      env.BACKUP_DIRECTORY,
      'files',
      `msa-${this.fileTimestamp()}-${backupId}`
    );
    await mkdir(path.dirname(directory), { recursive: true });
    await cp(path.resolve('public'), directory, { recursive: true });
    return directory;
  }

  private async restoreDatabase(source: string) {
    const connection = this.databaseConnection();
    await this.runProcess(
      this.mysqlPath(),
      [
        `--host=${connection.host}`,
        `--port=${connection.port}`,
        `--user=${connection.username}`,
        '--protocol=TCP',
        connection.database
      ],
      connection.password,
      source
    );
  }

  private runProcess(
    command: string,
    args: string[],
    password: string,
    inputPath?: string,
    outputPath?: string
  ) {
    return new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        env: { ...process.env, ...(password ? { MYSQL_PWD: password } : {}) },
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      let stderr = '';
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve();
      };
      child.once('error', (error) => finish(error));
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      let output: ReturnType<typeof createWriteStream> | undefined;
      if (outputPath) {
        output = createWriteStream(outputPath);
        output.once('error', (error) => finish(error));
        child.stdout.pipe(output);
      } else child.stdout.resume();

      if (inputPath) {
        const input = createReadStream(inputPath);
        input.once('error', (error) => finish(error));
        input.pipe(child.stdin);
      } else child.stdin.end();

      child.once('close', (code) => {
        if (code !== 0)
          return finish(
            new Error(stderr.trim() || `El proceso de respaldo terminó con código ${code}`)
          );
        if (output) output.once('finish', () => finish());
        else finish();
      });
    });
  }

  private databaseConnection(): DatabaseConnection {
    const url = new URL(env.DATABASE_URL);
    const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (!database)
      throw new AppError(500, 'La URL de base de datos no contiene una base de datos válida');
    return {
      host: url.hostname || 'localhost',
      port: url.port || '3306',
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database
    };
  }

  private mysqldumpPath() {
    if (env.MYSQLDUMP_PATH) return env.MYSQLDUMP_PATH;
    return process.platform === 'win32' ? 'C:\\xampp\\mysql\\bin\\mysqldump.exe' : 'mysqldump';
  }

  private mysqlPath() {
    if (env.MYSQLDUMP_PATH) return path.join(path.dirname(env.MYSQLDUMP_PATH), 'mysql.exe');
    return process.platform === 'win32' ? 'C:\\xampp\\mysql\\bin\\mysql.exe' : 'mysql';
  }

  private fileTimestamp() {
    return new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message.slice(0, 190) : 'Error desconocido';
  }
}
