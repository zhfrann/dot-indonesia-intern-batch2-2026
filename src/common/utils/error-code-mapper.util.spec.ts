import { HttpStatus } from '@nestjs/common';
import { I18N_KEYS } from '../constants/i18n-keys.constant';
import { CUSTOM_ERROR_STATUS_MAP, ERROR_STATUS_MAP, mapCodeToI18nKey } from './error-code-mapper.util';

describe('error-code-mapper.util', () => {
    describe('ERROR_STATUS_MAP', () => {
        it('should contains representative 4xx and 5xx mappings', () => {
            expect(ERROR_STATUS_MAP[HttpStatus.BAD_REQUEST]).toBe(I18N_KEYS.error.badRequest);
            expect(ERROR_STATUS_MAP[HttpStatus.FORBIDDEN]).toBe(I18N_KEYS.error.forbidden);
            expect(ERROR_STATUS_MAP[HttpStatus.INTERNAL_SERVER_ERROR]).toBe(I18N_KEYS.error.internalServerError);
            expect(ERROR_STATUS_MAP[HttpStatus.SERVICE_UNAVAILABLE]).toBe(I18N_KEYS.error.serviceUnavailable);
        });
    });

    describe('CUSTOM_ERROR_STATUS_MAP', () => {
        it('should contains mapping for VALIDATION_ERROR', () => {
            expect(CUSTOM_ERROR_STATUS_MAP.VALIDATION_ERROR).toBe(I18N_KEYS.error.validationFailed);
        });
    });

    describe('mapCodeToI18nKey', () => {
        it('should returns custom mapping for known custom app error code', () => {
            expect(mapCodeToI18nKey('VALIDATION_ERROR')).toBe(I18N_KEYS.error.validationFailed);
        });

        it.each([
            ['BAD_REQUEST', I18N_KEYS.error.badRequest],
            ['UNAUTHORIZED', I18N_KEYS.error.unauthorized],
            ['FORBIDDEN', I18N_KEYS.error.forbidden],
            ['NOT_FOUND', I18N_KEYS.error.notFound],
            ['TOO_MANY_REQUESTS', I18N_KEYS.error.tooManyRequests],
            ['INTERNAL_SERVER_ERROR', I18N_KEYS.error.internalServerError],
            ['SERVICE_UNAVAILABLE', I18N_KEYS.error.serviceUnavailable],
        ] as const)('returns the mapped i18n key for HttpStatus code %s', (code, expectedKey) => {
            expect(mapCodeToI18nKey(code)).toBe(expectedKey);
        });

        it('should falls back to internalServerError for valid HttpStatus enum members that are not mapped', () => {
            expect(mapCodeToI18nKey('CONTINUE')).toBe(I18N_KEYS.error.internalServerError);
        });

        it('should falls back to internalServerError for unknown codes', () => {
            expect(mapCodeToI18nKey('SOME_UNKNOWN_ERROR_CODE')).toBe(I18N_KEYS.error.internalServerError);
        });

        it('should falls back to internalServerError for empty string', () => {
            expect(mapCodeToI18nKey('')).toBe(I18N_KEYS.error.internalServerError);
        });

        it('should is case-sensitive and falls back for lowercase codes', () => {
            expect(mapCodeToI18nKey('bad_request')).toBe(I18N_KEYS.error.internalServerError);
        });

        it('should prioritizes custom mapping before HttpStatus reverse lookup', () => {
            expect(mapCodeToI18nKey('VALIDATION_ERROR')).toBe(CUSTOM_ERROR_STATUS_MAP.VALIDATION_ERROR);
        });
    });
});
