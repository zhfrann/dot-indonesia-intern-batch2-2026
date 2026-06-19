import { BadRequestException, ConflictException, HttpStatus, type ArgumentsHost } from '@nestjs/common';
import { I18nContext, type I18nService } from 'nestjs-i18n';
import { VALIDATION_ERROR_CODE } from '../constants/validation-error.constant';
import { mapCodeToI18nKey } from '../utils/error-code-mapper.util';
import { mapPrismaError } from '../utils/prisma-error-mapper.util';
import { HttpExceptionFilter } from './http-exception.filter';

jest.mock('../utils/error-code-mapper.util', () => ({
    mapCodeToI18nKey: jest.fn(),
}));

jest.mock('../utils/prisma-error-mapper.util', () => ({
    mapPrismaError: jest.fn(),
}));

type TranslateArgs = [key: string, options: { lang: string }];

type MockRequest = {
    requestId?: string;
};

type MockResponse = {
    headersSent: boolean;
    status: jest.MockedFunction<(code: number) => MockResponse>;
    json: jest.MockedFunction<(body: unknown) => MockResponse>;
};

describe('HttpExceptionFilter', () => {
    let filter: HttpExceptionFilter;
    let translateMock: jest.Mock<Promise<unknown>, TranslateArgs>;
    let mapCodeToI18nKeyMock: jest.MockedFunction<typeof mapCodeToI18nKey>;
    let mapPrismaErrorMock: jest.MockedFunction<typeof mapPrismaError>;

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2026-03-08T10:00:00.000Z'));

        translateMock = jest.fn<Promise<unknown>, TranslateArgs>();
        filter = new HttpExceptionFilter({
            translate: translateMock,
        } as unknown as I18nService);

        mapCodeToI18nKeyMock = mapCodeToI18nKey as jest.MockedFunction<typeof mapCodeToI18nKey>;
        mapPrismaErrorMock = mapPrismaError as jest.MockedFunction<typeof mapPrismaError>;

        mapCodeToI18nKeyMock.mockReset();
        mapPrismaErrorMock.mockReset();

        jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'id' } as never);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    function createHost(options?: { requestId?: string; headersSent?: boolean }): {
        host: ArgumentsHost;
        request: MockRequest;
        response: MockResponse;
        status: jest.Mock<MockResponse, [number]>;
        json: jest.Mock<MockResponse, [unknown]>;
        switchToHttp: jest.Mock;
    } {
        const request: MockRequest = {
            requestId: options?.requestId ?? 'req-123',
        };

        const response = {} as MockResponse;

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const status: jest.Mock<MockResponse, [number]> = jest.fn((_code: number) => response);

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const json: jest.Mock<MockResponse, [unknown]> = jest.fn((_body: unknown) => response);

        response.headersSent = options?.headersSent ?? false;
        response.status = status;
        response.json = json;

        const httpHost = {
            getRequest: jest.fn(() => request),
            getResponse: jest.fn(() => response),
        };

        const switchToHttp = jest.fn(() => httpHost);

        const host = {
            switchToHttp,
        } as unknown as ArgumentsHost;

        return {
            host,
            request,
            response,
            status,
            json,
            switchToHttp,
        };
    }

    it('should returns early when headers have already been sent', async () => {
        const { host, status, json } = createHost({ headersSent: true });

        await filter.catch(new Error('already handled'), host);

        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
        expect(translateMock).not.toHaveBeenCalled();
        expect(mapPrismaErrorMock).not.toHaveBeenCalled();
        expect(mapCodeToI18nKeyMock).not.toHaveBeenCalled();
    });

    it('should maps Prisma errors before generic HttpException handling', async () => {
        const { host, status, json } = createHost({ requestId: 'req-prisma' });

        mapPrismaErrorMock.mockReturnValue({
            status: HttpStatus.CONFLICT,
            code: 'CONFLICT',
            fallbackMessage: 'The resource already exists',
        });
        mapCodeToI18nKeyMock.mockReturnValue('error.conflict');
        translateMock.mockResolvedValue('Data already exists');

        await filter.catch(new Error('prisma error'), host);

        expect(mapPrismaErrorMock).toHaveBeenCalledTimes(1);
        expect(mapCodeToI18nKeyMock).toHaveBeenCalledWith('CONFLICT');
        expect(translateMock).toHaveBeenCalledWith('error.conflict', { lang: 'id' });

        expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
        expect(json).toHaveBeenCalledWith({
            error: {
                code: 'CONFLICT',
                message: 'Data already exists',
            },
            meta: {
                requestId: 'req-prisma',
                timestamp: '2026-03-08T10:00:00.000Z',
            },
        });
    });

    it('should forwards structured validation errors including details', async () => {
        const { host, status, json } = createHost({ requestId: 'req-validation' });

        mapPrismaErrorMock.mockReturnValue(null);
        mapCodeToI18nKeyMock.mockReturnValue('error.validationFailed');
        translateMock.mockResolvedValue('error.validationFailed');

        const exception = new BadRequestException({
            code: VALIDATION_ERROR_CODE,
            message: 'Validation failed',
            details: [
                {
                    field: 'email',
                    issues: ['email must be an email'],
                },
            ],
        });

        await filter.catch(exception, host);

        expect(mapCodeToI18nKeyMock).toHaveBeenCalledWith(VALIDATION_ERROR_CODE);
        expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(json).toHaveBeenCalledWith({
            error: {
                code: VALIDATION_ERROR_CODE,
                message: 'Validation failed',
                details: [
                    {
                        field: 'email',
                        issues: ['email must be an email'],
                    },
                ],
            },
            meta: {
                requestId: 'req-validation',
                timestamp: '2026-03-08T10:00:00.000Z',
            },
        });
    });

    it('should uses custom code and i18nKey from HttpException response body', async () => {
        const { host, status, json } = createHost({ requestId: 'req-custom' });

        mapPrismaErrorMock.mockReturnValue(null);
        translateMock.mockResolvedValue('User already exists');

        const exception = new ConflictException({
            code: 'USER_ALREADY_EXISTS',
            i18nKey: 'auth.error.userAlreadyExists',
            message: 'User already exists fallback',
        });

        await filter.catch(exception, host);

        expect(mapCodeToI18nKeyMock).not.toHaveBeenCalled();
        expect(translateMock).toHaveBeenCalledWith('auth.error.userAlreadyExists', {
            lang: 'id',
        });

        expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
        expect(json).toHaveBeenCalledWith({
            error: {
                code: 'USER_ALREADY_EXISTS',
                message: 'User already exists',
            },
            meta: {
                requestId: 'req-custom',
                timestamp: '2026-03-08T10:00:00.000Z',
            },
        });
    });

    it('should falls back to raw exception message when translation resolves to the key itself', async () => {
        const { host, status, json } = createHost({ requestId: 'req-fallback' });

        mapPrismaErrorMock.mockReturnValue(null);
        mapCodeToI18nKeyMock.mockReturnValue('error.badRequest');
        translateMock.mockResolvedValue('error.badRequest');

        const exception = new BadRequestException('Custom bad request');

        await filter.catch(exception, host);

        expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(json).toHaveBeenCalledWith({
            error: {
                code: 'BAD_REQUEST',
                message: 'Custom bad request',
            },
            meta: {
                requestId: 'req-fallback',
                timestamp: '2026-03-08T10:00:00.000Z',
            },
        });
    });

    it('should returns generic 500 response for unknown errors', async () => {
        const { host, status, json } = createHost({ requestId: 'req-unknown' });

        mapPrismaErrorMock.mockReturnValue(null);
        mapCodeToI18nKeyMock.mockReturnValue('error.internalServerError');
        translateMock.mockResolvedValue('Unexpected server error');

        await filter.catch(new Error('boom'), host);

        expect(mapCodeToI18nKeyMock).toHaveBeenCalledWith('INTERNAL_SERVER_ERROR');
        expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(json).toHaveBeenCalledWith({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Unexpected server error',
            },
            meta: {
                requestId: 'req-unknown',
                timestamp: '2026-03-08T10:00:00.000Z',
            },
        });
    });

    it('should falls back to english when current i18n context is unavailable', async () => {
        const { host } = createHost();

        mapPrismaErrorMock.mockReturnValue(null);
        mapCodeToI18nKeyMock.mockReturnValue('error.internalServerError');
        translateMock.mockResolvedValue('Unexpected server error');
        jest.spyOn(I18nContext, 'current').mockReturnValue(undefined);

        await filter.catch(new Error('boom'), host);

        expect(translateMock).toHaveBeenCalledWith('error.internalServerError', {
            lang: 'en',
        });
    });
});
