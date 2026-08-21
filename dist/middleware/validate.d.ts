import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
export declare const validate: (schema: ZodType) => (request: Request, _response: Response, next: NextFunction) => void;
