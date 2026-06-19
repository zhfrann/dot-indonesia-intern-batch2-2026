import 'express';
import type { AuthenticatedUser } from 'src/modules/auth/auth.types';

declare global {
    namespace Express {
        interface User extends AuthenticatedUser {}
    }
}

/**
 * Extends express Request object to add requestId using TypeScript Declaration Merging.
 */
declare module 'express-serve-static-core' {
    interface Request {
        requestId: string;
    }
}
