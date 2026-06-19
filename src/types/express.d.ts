import 'express';

/**
 * Extends express Request object to add requestId usign TypeScript Declaration Merging.
 * Express Request object now has a requestId property.
 */
declare module 'express-serve-static-core' {
    interface Request {
        requestId: string;
    }
}
