import type { Response } from 'express';
export declare const ok: <T>(response: Response, message: string, data?: T, statusCode?: number) => Response<any, Record<string, any>>;
