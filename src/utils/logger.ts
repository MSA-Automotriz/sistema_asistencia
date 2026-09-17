import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import { env } from '../config/env.js';

const logDirectory = path.resolve('logs');
fs.mkdirSync(logDirectory, { recursive: true });
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(logDirectory, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDirectory, 'combined.log') })
  ]
});
logger.add(
  new winston.transports.Console({
    format:
      env.NODE_ENV === 'production'
        ? winston.format.combine(winston.format.timestamp(), winston.format.json())
        : winston.format.simple()
  })
);
