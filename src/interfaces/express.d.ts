import type { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request { auth?: JwtPayload & { sub: string; sid: string; role: string; permissions: string[] } }
  }
}
export {};