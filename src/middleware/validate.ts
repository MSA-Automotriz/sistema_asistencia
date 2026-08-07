import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export const validate =
  (schema: ZodType) => (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: request.body,
      params: request.params,
      query: request.query
    });
    if (!result.success) return next(result.error);
    request.body = result.data.body;
    next();
  };
