import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { lastValueFrom, of } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from 'src/common/decorators/response-message.decorator';
import { I18N_KEYS } from '../constants/i18n-keys.constant';
import { ResponseTransformInterceptor } from './response-transform.interceptor';

type MockRequest = {
    requestId?: string;
};

type TranslateFn = (key: string, options: { lang: string }) => Promise<unknown>;

describe('ResponseTransformInterceptor', () => {
    let moduleRef: TestingModule;
    let interceptor: ResponseTransformInterceptor;
    let reflectorGet: jest.Mock;
    let translateMock: jest.MockedFunction<TranslateFn>;

    beforeEach(async () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-03-08T10:00:00.000Z'));

        reflectorGet = jest.fn();
        translateMock = jest.fn();

        moduleRef = await Test.createTestingModule({
            providers: [
                ResponseTransformInterceptor,
                {
                    provide: Reflector,
                    useValue: {
                        get: reflectorGet,
                    },
                },
                {
                    provide: I18nService,
                    useValue: {
                        translate: translateMock,
                    },
                },
            ],
        }).compile();

        interceptor = moduleRef.get(ResponseTransformInterceptor);
    });

    afterEach(async () => {
        jest.useRealTimers();
        jest.restoreAllMocks();
        await moduleRef.close();
    });

    function createExecutionContext(request: MockRequest = { requestId: 'req-123' }) {
        const handler = function testHandler() {};

        const getRequest = jest.fn(() => request);
        const switchToHttp = jest.fn(() => ({
            getRequest,
        }));
        const getHandler = jest.fn(() => handler);

        const context = {
            switchToHttp,
            getHandler,
        } as unknown as ExecutionContext;

        return {
            context,
            handler,
            getRequest,
            switchToHttp,
            getHandler,
            request,
        };
    }

    function createCallHandler<T>(value: T) {
        const handle = jest.fn(() => of(value));

        const next = {
            handle,
        } as CallHandler<T>;

        return { next, handle };
    }

    it('should wraps a plain controller result into the standard response envelope', async () => {
        const { context, handler } = createExecutionContext({ requestId: 'req-123' });
        const { next, handle } = createCallHandler({ id: 1, name: 'Alice' });

        reflectorGet.mockReturnValue('response.users.found');
        translateMock.mockResolvedValue('User fetched successfully');
        jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'id' } as never);

        const result = await lastValueFrom(interceptor.intercept(context, next));

        expect(handle).toHaveBeenCalledTimes(1);
        expect(reflectorGet).toHaveBeenCalledWith(RESPONSE_MESSAGE_KEY, handler);
        expect(translateMock).toHaveBeenCalledWith('response.users.found', {
            lang: 'id',
        });

        expect(result).toEqual({
            message: 'User fetched successfully',
            data: { id: 1, name: 'Alice' },
            meta: {
                requestId: 'req-123',
                timestamp: '2026-03-08T10:00:00.000Z',
            },
        });
    });

    it('should uses the default ok message key and fallback language when route metadata is absent', async () => {
        const { context } = createExecutionContext({ requestId: 'req-999' });
        const { next } = createCallHandler('pong');

        reflectorGet.mockReturnValue(undefined);
        translateMock.mockResolvedValue('OK');
        jest.spyOn(I18nContext, 'current').mockReturnValue(undefined);

        const result = await lastValueFrom(interceptor.intercept(context, next));

        expect(translateMock).toHaveBeenCalledWith(I18N_KEYS.response.ok, {
            lang: 'en',
        });

        expect(result).toEqual({
            message: 'OK',
            data: 'pong',
            meta: {
                requestId: 'req-999',
                timestamp: '2026-03-08T10:00:00.000Z',
            },
        });
    });

    it('should merges controller meta into the global meta envelope', async () => {
        const { context } = createExecutionContext({ requestId: 'req-456' });
        const { next } = createCallHandler({
            data: [{ id: 1 }, { id: 2 }],
            meta: {
                page: 2,
                pageSize: 10,
            },
        });

        reflectorGet.mockReturnValue('response.ok');
        translateMock.mockResolvedValue('Success');
        jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'en' } as never);

        const result = await lastValueFrom(interceptor.intercept(context, next));

        expect(result).toEqual({
            message: 'Success',
            data: [{ id: 1 }, { id: 2 }],
            meta: {
                page: 2,
                pageSize: 10,
                requestId: 'req-456',
                timestamp: '2026-03-08T10:00:00.000Z',
            },
        });
    });

    it('should overrides controller-provided requestId and timestamp with global values', async () => {
        const { context } = createExecutionContext({ requestId: 'req-global' });
        const { next } = createCallHandler({
            data: { id: 10 },
            meta: {
                requestId: 'req-controller',
                timestamp: '2000-01-01T00:00:00.000Z',
                source: 'controller',
            },
        });

        reflectorGet.mockReturnValue('response.ok');
        translateMock.mockResolvedValue('Success');
        jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'en' } as never);

        const result = await lastValueFrom(interceptor.intercept(context, next));

        expect(result).toEqual({
            message: 'Success',
            data: { id: 10 },
            meta: {
                source: 'controller',
                requestId: 'req-global',
                timestamp: '2026-03-08T10:00:00.000Z',
            },
        });
    });

    it('should stringifies non-string translation results', async () => {
        const { context } = createExecutionContext({ requestId: 'req-777' });
        const { next } = createCallHandler({ ok: true });

        reflectorGet.mockReturnValue('response.ok');
        translateMock.mockResolvedValue(200);
        jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'en' } as never);

        const result = await lastValueFrom(interceptor.intercept(context, next));

        expect(result).toEqual({
            message: '200',
            data: { ok: true },
            meta: {
                requestId: 'req-777',
                timestamp: '2026-03-08T10:00:00.000Z',
            },
        });
    });
});
