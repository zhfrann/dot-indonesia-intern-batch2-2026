import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { hasOwn, isRecord } from '../utils/type-guard.util';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { mapCodeToI18nKey } from '../utils/error-code-mapper.util';
import { mapPrismaError } from '../utils/prisma-error-mapper.util';
import { VALIDATION_ERROR_CODE } from '../constants/validation-error.constant';

type ValidationErrorDetail = { field: string; issues: string[] };

/**
 * Payload shape produced by AppValidationPipe.exceptionFactory().
 * This is detected and forwarded as a structured validation error response.
 */
type ValidationErrorBody = {
    code: typeof VALIDATION_ERROR_CODE;
    message: string;
    details: ValidationErrorDetail[];
};

/**
 * Type guard for ValidationErrorBody.
 * Used to safely detect and extract validation payloads from HttpException.getResponse().
 */
function isValidationErrorBody(value: unknown): value is ValidationErrorBody {
    if (!isRecord(value)) return false;
    if (!hasOwn(value, 'code') || value.code !== VALIDATION_ERROR_CODE) return false;
    if (!hasOwn(value, 'message') || typeof value.message !== 'string') return false;
    if (!hasOwn(value, 'details') || !Array.isArray(value.details)) return false;
    return true;
}

/**
 * Global HTTP exception filter.
 *
 * Responsibilities:
 * - Normalize all thrown exceptions into a consistent API error envelope.
 * - Extract known validation payloads (from AppValidationPipe) into `{ details }`.
 * - Include `requestId` (if available) for request tracing and log correlation.
 *
 * Precedence:
 * 1) Prisma errors mapped to a stable (status, code, message) contract
 * 2) HttpException from application code / Nest built-ins
 * 3) Unknown errors -> 500 generic
 *
 * Response shape:
 * ```
 * {
 *   error: {
 *     code: string;
 *     message: string;
 *     details?: Array<{ field: string; issues: string[] }>;
 *   };
 *   meta: {
 *     requestId?: string;
 *     timestamp: string;
 *   };
 * }
 * ```
 *
 * Notes:
 * - This filter is HTTP-specific because it reads the request/response
 *   through `switchToHttp()`.
 * - This filter shapes outbound error responses only; it is not responsible
 *   for business recovery or centralized logging strategy.
 * - `error.details` is included only for structured validation failures.
 * - If an i18n translation is missing, the filter falls back to the resolved
 *   raw message for that exception.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    constructor(private readonly i18n: I18nService) {}

    // Resolves the thrown exception into the application's standardized HTTP error response format.
    // Flow :
    // 1. Read request/response objects from the HTTP context.
    // 2. Initialize a safe default for unknown failures.
    // 3. Attempt Prisma-specific error mapping.
    // 4. If the exception is an `HttpException`, extract custom code/message/i18n metadata.
    // 5. Resolve the final translated message.
    // 6. Send the normalized error payload to the client.
    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const context = host.switchToHttp();
        const request = context.getRequest<Request>();
        const response = context.getResponse<Response>();

        // defensive check to prevent double-sending of the response.
        if (response.headersSent) return;

        // requestId is injected by RequestIdMiddleware for tracing.
        const requestId = request?.requestId;

        // default unknown error
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let code = HttpStatus[status] ?? 'INTERNAL_SERVER_ERROR';
        let fallbackMessage = 'Internal Server Error';
        let details: ValidationErrorDetail[] | undefined;

        // used for overriding i18nKey below from service response if present.
        let i18nKeyOverride: string | undefined;

        // used for prisma mapper error if present.
        const prismaMapped = mapPrismaError(exception);

        // Prisma errors are handled first so database-layer exception are converted
        // into application-defined status/code/message contract before generic HttpException handling.
        if (prismaMapped) {
            status = prismaMapped.status;
            code = prismaMapped.code;
            fallbackMessage = prismaMapped.fallbackMessage;
        } else if (exception instanceof HttpException) {
            status = exception.getStatus();
            code = HttpStatus[status] ?? 'INTERNAL_SERVER_ERROR';

            const responseBody: unknown = exception.getResponse();

            // Override default code and i18nKey with values from service/controller response if present.
            // Example from service:
            //   throw new ConflictException({
            //     code: 'USER_ALREADY_EXISTS',
            //     i18nKey: 'auth.error.userAlreadyExists',
            //   });
            if (isRecord(responseBody)) {
                if (hasOwn(responseBody, 'code') && typeof responseBody.code === 'string') {
                    code = responseBody.code;
                }
                if (hasOwn(responseBody, 'i18nKey') && typeof responseBody.i18nKey === 'string') {
                    i18nKeyOverride = responseBody.i18nKey;
                }
            }

            if (isValidationErrorBody(responseBody)) {
                code = VALIDATION_ERROR_CODE;
                fallbackMessage = responseBody.message;
                details = responseBody.details;
            } else if (typeof responseBody === 'string') {
                fallbackMessage = responseBody;
            } else if (isRecord(responseBody) && hasOwn(responseBody, 'message')) {
                const responseBodyMessage = responseBody.message;

                if (typeof responseBodyMessage === 'string') fallbackMessage = responseBodyMessage;
                // else if (Array.isArray(responseBodyMessage)) fallbackMessage = responseBodyMessage.join(', ');
                else fallbackMessage = exception.message;
            } else {
                fallbackMessage = exception.message;
            }
        }

        const i18nKey = i18nKeyOverride ?? mapCodeToI18nKey(code);
        const lang = I18nContext.current()?.lang ?? 'en';
        const translatedMessage = await Promise.resolve(this.i18n.translate(i18nKey, { lang: lang }));

        response.status(status).json({
            error: {
                code: code,
                // nestjs-i18n returns the key itself when translation is found,
                // so fall back to the resolved raw exception message in that case.
                message: typeof translatedMessage === 'string' && translatedMessage !== i18nKey ? translatedMessage : fallbackMessage,
                ...(details ? { details: details } : {}),
            },
            meta: {
                requestId: requestId,
                timestamp: new Date().toISOString(),
            },
        });
    }
}
