import type { Request, Response, NextFunction } from 'express';
export declare class CrudController {
    private readonly delegate;
    private readonly label;
    constructor(delegate: unknown, label: string);
    private get model();
    list: (request: Request, response: Response) => Promise<Response<any, Record<string, any>>>;
    get: (request: Request, response: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    create: (request: Request, response: Response) => Promise<Response<any, Record<string, any>>>;
    update: (request: Request, response: Response) => Promise<Response<any, Record<string, any>>>;
    remove: (request: Request, response: Response) => Promise<Response<any, Record<string, any>>>;
}
