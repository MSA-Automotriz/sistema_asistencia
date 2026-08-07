import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../common/errors/app-error.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  void next;
  if (error instanceof ZodError)
    return response
      .status(422)
      .json({ success: false, message: 'Datos de entrada inválidos', errors: error.flatten() });
  if (error instanceof AppError)
    return response
      .status(error.statusCode)
      .json({ success: false, message: error.message, details: error.details });
  logger.error(error.message, { stack: error.stack });
  return response.status(500).json({ success: false, message: 'Error interno del servidor' });
};
