import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { REQUEST_ID_HEADER } from '../constants/request-id.constant';
import { RequestIdMiddleware } from './request-id.middleware';

jest.mock('nanoid', () => ({
    nanoid: jest.fn(),
}));

describe('RequestIdMiddleware', () => {
    let middleware: RequestIdMiddleware;

    beforeEach(() => {
        middleware = new RequestIdMiddleware();
        jest.clearAllMocks();
    });

    function createMockReq(headerValue?: string) {
        const header = jest.fn((name: string) => {
            if (name === REQUEST_ID_HEADER) return headerValue;
            return undefined;
        });

        const req = {
            header,
        } as unknown as Request;

        return { req, header };
    }

    function createMockRes() {
        const setHeader = jest.fn();

        const res = {
            setHeader,
        } as unknown as Response;

        return { res, setHeader };
    }

    function createMockNext() {
        return jest.fn() as NextFunction;
    }

    it('should reuses incoming request id when header is a valid string with length <= 64', () => {
        const incomingRequestId = 'client-request-id-123';
        const { req } = createMockReq(incomingRequestId);
        const { res, setHeader } = createMockRes();
        const next = createMockNext();

        middleware.use(req, res, next);

        expect(req.requestId).toBe(incomingRequestId);
        expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, incomingRequestId);
        expect(next).toHaveBeenCalledTimes(1);
        expect(nanoid).not.toHaveBeenCalled();
    });

    it('should generates a new request id when header is missing', () => {
        const generatedRequestId = 'generated-id-1234';
        (nanoid as jest.MockedFunction<typeof nanoid>).mockReturnValue(generatedRequestId);

        const { req } = createMockReq(undefined);
        const { res, setHeader } = createMockRes();
        const next = createMockNext();

        middleware.use(req, res, next);

        expect(nanoid).toHaveBeenCalledWith(16);
        expect(req.requestId).toBe(generatedRequestId);
        expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, generatedRequestId);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('should generates a new request id when incoming header length is more than 64 characters', () => {
        const tooLongRequestId = 'a'.repeat(65);
        const generatedRequestId = 'generated-id-5678';
        (nanoid as jest.MockedFunction<typeof nanoid>).mockReturnValue(generatedRequestId);

        const { req } = createMockReq(tooLongRequestId);
        const { res, setHeader } = createMockRes();
        const next = createMockNext();

        middleware.use(req, res, next);

        expect(nanoid).toHaveBeenCalledWith(16);
        expect(req.requestId).toBe(generatedRequestId);
        expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, generatedRequestId);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('should always echoes the final request id to the response header', () => {
        const incomingRequestId = 'trace-id-from-client';
        const { req } = createMockReq(incomingRequestId);
        const { res, setHeader } = createMockRes();
        const next = createMockNext();

        middleware.use(req, res, next);

        expect(setHeader).toHaveBeenCalledTimes(1);
        expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, incomingRequestId);
    });

    it('always calls next exactly once', () => {
        const generatedRequestId = 'generated-next-check';
        (nanoid as jest.MockedFunction<typeof nanoid>).mockReturnValue(generatedRequestId);

        const { req } = createMockReq(undefined);
        const { res } = createMockRes();
        const next = createMockNext();

        middleware.use(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});
