import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { from, type Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from 'src/common/decorators/response-message.decorator';
import { hasOwn, isRecord } from '../utils/type-guard.util';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { I18N_KEYS } from '../constants/i18n-keys.constant';

/** Type for wrapper result from controller */
type ControllerWrappedResult = {
    data: unknown;
    meta?: Record<string, unknown>;
};

/**
 * Type guard: checks whether controller returned the wrapper shape `{ data, meta? }`.
 * This also narrows `value` for TypeScript.
 *
 * This allows controllers to optionally provide extra response metadata
 * without being responsible for building the full global response envelope.
 */
function isControllerWrappedResult(value: unknown): value is ControllerWrappedResult {
    if (!isRecord(value)) return false;
    if (!hasOwn(value, 'data')) return false;
    if (hasOwn(value, 'meta') && value.meta !== undefined && !isRecord(value.meta)) return false;
    return true;
}

/**
 * Global HTTP response transformer for successful requests.
 *
 * Responsibilities:
 * - Wrap controller results into a consistent API response envelope.
 * - Resolve a localized response message from route metadata.
 * - Append shared metadata such as `requestId` and `timestamp`.
 *
 * Standard response shape:
 * ```
 * {
 *   message: string;
 *   data: unknown;
 *   meta: {
 *     requestId?: string;
 *     timestamp: string; (ISO 8601)
 *     ...controllerMeta?
 *   };
 * }
 * ```
 *
 * Controller return conventions:
 * - A plain return value becomes `data`.
 * - A return value of `{ data, meta? }` is treated as an internal wrapper. Its `meta` is merged into the global response metadata.
 *
 * Notes:
 * - Only successful HTTP responses are transformed here.
 * - Error responses should be handled by exception filters in `src/common/filters/http-exception.filter.ts`.
 * - This interceptor is HTTP-specific because it reads the request from `context.switchToHttp()`.
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly i18n: I18nService,
    ) {}

    // Executes the downstream handler and normalizes its result into the envelope response format.
    // Flow:
    // 1. Read the response message key from route metadata.
    // 2. Resolve request-scoped values such as `requestId` and active language.
    // 3. Execute the controller handler.
    // 4. Translate the message and build the final response envelope.
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const messageKey: string = this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ?? I18N_KEYS.response.ok;

        const request: Request = context.switchToHttp().getRequest<Request>();
        const requestId = request.requestId;
        const lang = I18nContext.current()?.lang ?? 'en';

        return next.handle().pipe(
            mergeMap((result: unknown) =>
                from(Promise.resolve(this.i18n.translate(messageKey, { lang: lang }))).pipe(
                    map((translatedMessage: unknown) => {
                        // Controller may return `{ data, meta }` to contribute custom metadata
                        // without bypassing the global response envelope.
                        const wrapped = isControllerWrappedResult(result) ? result : undefined;

                        const data = wrapped ? wrapped.data : result;
                        const metaFromController = wrapped?.meta;

                        return {
                            message: typeof translatedMessage === 'string' ? translatedMessage : String(translatedMessage),
                            data: data,
                            meta: {
                                ...(metaFromController ?? {}),
                                requestId: requestId,
                                timestamp: new Date().toISOString(),
                            },
                        };
                    }),
                ),
            ),
        );
    }
}
