import type { Response } from 'express';

export const ok = <T>(response: Response, message: string, data?: T, statusCode = 200) =>
  response.status(statusCode).json({ success: true, message, data });
