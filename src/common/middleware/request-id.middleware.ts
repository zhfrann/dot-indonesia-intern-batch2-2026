import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../constants/request-id.constant';
import { nanoid } from 'nanoid';

/**
 * Middleware that ensures every incoming request has a unique requestId
 *
 * Behavior:
 * - If client sends a valid requestId (string, length <= 64) via header, reuse it.
 * - Otherwise, generate a new one using nanoid(16)
 * - Attach requestId to Express' Request Object
 * - Apply middleware to all routes at AppModule level
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const incomingRequestId = req.header(REQUEST_ID_HEADER);
        const requestId = typeof incomingRequestId === 'string' && incomingRequestId.length <= 64 ? incomingRequestId : nanoid(16);

        // Can be use to for nest js interceptor or filter
        req.requestId = requestId;

        // echo to response header for better traceability
        res.setHeader(REQUEST_ID_HEADER, requestId);
        next();
    }
}
