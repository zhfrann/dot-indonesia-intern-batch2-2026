import { HttpStatus } from '@nestjs/common';
import { I18N_KEYS } from '../constants/i18n-keys.constant';

/** Map NestJS' HttpStatus (number) to i18n key (e.g. `{ 400: common.error.badRequest, ... }`). */
export const ERROR_STATUS_MAP: Partial<Record<HttpStatus, string>> = {
    // 4xx
    [HttpStatus.BAD_REQUEST]: I18N_KEYS.error.badRequest,
    [HttpStatus.UNAUTHORIZED]: I18N_KEYS.error.unauthorized,
    [HttpStatus.PAYMENT_REQUIRED]: I18N_KEYS.error.paymentRequired,
    [HttpStatus.FORBIDDEN]: I18N_KEYS.error.forbidden,
    [HttpStatus.NOT_FOUND]: I18N_KEYS.error.notFound,
    [HttpStatus.METHOD_NOT_ALLOWED]: I18N_KEYS.error.methodNotAllowed,
    [HttpStatus.NOT_ACCEPTABLE]: I18N_KEYS.error.notAcceptable,
    [HttpStatus.PROXY_AUTHENTICATION_REQUIRED]: I18N_KEYS.error.proxyAuthenticationRequired,
    [HttpStatus.REQUEST_TIMEOUT]: I18N_KEYS.error.requestTimeout,
    [HttpStatus.CONFLICT]: I18N_KEYS.error.conflict,
    [HttpStatus.GONE]: I18N_KEYS.error.gone,
    [HttpStatus.LENGTH_REQUIRED]: I18N_KEYS.error.lengthRequired,
    [HttpStatus.PRECONDITION_FAILED]: I18N_KEYS.error.preconditionFailed,
    [HttpStatus.PAYLOAD_TOO_LARGE]: I18N_KEYS.error.payloadTooLarge,
    [HttpStatus.URI_TOO_LONG]: I18N_KEYS.error.uriTooLong,
    [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: I18N_KEYS.error.unsupportedMediaType,
    [HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE]: I18N_KEYS.error.requestedRangeNotSatisfiable,
    [HttpStatus.EXPECTATION_FAILED]: I18N_KEYS.error.expectationFailed,
    [HttpStatus.I_AM_A_TEAPOT]: I18N_KEYS.error.imATeapot,
    [HttpStatus.MISDIRECTED]: I18N_KEYS.error.misdirectedRequest,
    [HttpStatus.UNPROCESSABLE_ENTITY]: I18N_KEYS.error.unprocessableEntity,
    [HttpStatus.LOCKED]: I18N_KEYS.error.locked,
    [HttpStatus.FAILED_DEPENDENCY]: I18N_KEYS.error.failedDependency,
    // (HttpStatus.TOO_EARLY is not present in HttpStatus enum snippet)
    // (HttpStatus.UPGRADE_REQUIRED is not present in HttpStatus enum snippet)
    [HttpStatus.PRECONDITION_REQUIRED]: I18N_KEYS.error.preconditionRequired,
    [HttpStatus.TOO_MANY_REQUESTS]: I18N_KEYS.error.tooManyRequests,
    // (HttpStatus.REQUEST_HEADER_FIELDS_TOO_LARGE is not present in HttpStatus enum snippet)
    // (HttpStatus.UNAVAILABLE_FOR_LEGAL_REASONS is not present in HttpStatus enum snippet)
    [HttpStatus.UNRECOVERABLE_ERROR]: I18N_KEYS.error.unrecoverableError,

    // 5xx
    [HttpStatus.INTERNAL_SERVER_ERROR]: I18N_KEYS.error.internalServerError,
    [HttpStatus.NOT_IMPLEMENTED]: I18N_KEYS.error.notImplemented,
    [HttpStatus.BAD_GATEWAY]: I18N_KEYS.error.badGateway,
    [HttpStatus.SERVICE_UNAVAILABLE]: I18N_KEYS.error.serviceUnavailable,
    [HttpStatus.GATEWAY_TIMEOUT]: I18N_KEYS.error.gatewayTimeout,
    [HttpStatus.HTTP_VERSION_NOT_SUPPORTED]: I18N_KEYS.error.httpVersionNotSupported,
    // (HttpStatus.VARIANT_ALS0_NEGOTIATES is not present in HttpStatus enum snippet)
    [HttpStatus.INSUFFICIENT_STORAGE]: I18N_KEYS.error.insufficientStorage,
    [HttpStatus.LOOP_DETECTED]: I18N_KEYS.error.loopDetected,
    // (HttpStatus.NOT_EXTENDED is not present in HttpStatus enum snippet)
    // (HttpStatus.NETWORK_AUTHENTICATION_REQUIRED is not present in HttpStatus enum snippet)
};

/** Map custom error status codes to i18n keys (e.g. `{ VALIDATION_ERROR: common.error.validationFailed }`) */
export const CUSTOM_ERROR_STATUS_MAP: Record<string, string> = {
    VALIDATION_ERROR: I18N_KEYS.error.validationFailed,
};

/**
 * Mapping error code (like BAD_REQUEST or FORBIDDEN) to match i18n key translate message
 * @param code Error code (e.g. "BAD_REQUEST")
 * @returns i18n key string, fallback to internalServerError
 */
export function mapCodeToI18nKey(code: string): string {
    // Custom app code for validation error
    if (CUSTOM_ERROR_STATUS_MAP[code]) return CUSTOM_ERROR_STATUS_MAP[code];

    // reverse mapping for NestJS HttpStatus code ("BAD_REQUEST" -> 400)
    const status = HttpStatus[code as keyof typeof HttpStatus];
    if (typeof status === 'number') return ERROR_STATUS_MAP[status] ?? I18N_KEYS.error.internalServerError;

    // fallback
    return I18N_KEYS.error.internalServerError;
}
