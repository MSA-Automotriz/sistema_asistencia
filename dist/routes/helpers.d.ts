import type { Request, Router } from 'express';
import multer from 'multer';
import { AuditService } from '../use-cases/audit/audit-service.js';
export declare const audit: AuditService;
export declare const upload: multer.Multer;
export declare const meta: (request: Request) => {
    ip: string | undefined;
    userAgent: string | undefined;
};
export declare const auditEvent: (request: Request, action: string, entity: string, entityId?: string) => void;
export type CrudDelegate = unknown;
export declare const mountCrud: (router: Router, path: string, label: string, delegate: CrudDelegate, resource: string) => void;
