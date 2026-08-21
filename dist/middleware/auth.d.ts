import type { NextFunction, Request, Response } from 'express';
export declare const authenticate: (request: Request, _response: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...required: string[]) => (request: Request, _response: Response, next: NextFunction) => void;
