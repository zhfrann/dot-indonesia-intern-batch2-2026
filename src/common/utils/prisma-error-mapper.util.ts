import { HttpStatus } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';

/** Prisma ORM error mapper type */
type PrismaMappedError = {
    status: number;
    code: string;
    fallbackMessage: string;
};

/** Prisma client known request error mapper */
const KNOWN_ERROR_MAP: Record<string, Omit<PrismaMappedError, 'status'> & { status: HttpStatus }> = {
    P2002: {
        status: HttpStatus.CONFLICT,
        code: 'CONFLICT',
        fallbackMessage: 'The resource already exists', // Unique constraint violation
    },
    P2025: {
        status: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        fallbackMessage: 'The requested resource was not found', // Resource not found
    },
    P2003: {
        status: HttpStatus.CONFLICT,
        code: 'CONFLICT',
        fallbackMessage: 'Operation failed due to a related resource constraint', // Related resource constraint violation
    },
    P2014: {
        status: HttpStatus.CONFLICT,
        code: 'CONFLICT',
        fallbackMessage: 'Operation violates a required relation', // Relation violation
    },
    P2016: {
        status: HttpStatus.BAD_REQUEST,
        code: 'BAD_REQUEST',
        fallbackMessage: 'The request could not be processed', // Query interpretation error
    },
    P2021: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        fallbackMessage: 'An unexpected error occurred', // Table does not exist
    },
    P2022: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        fallbackMessage: 'An unexpected error orccured', // Column does not exist
    },
};

export function mapPrismaError(exception: unknown): PrismaMappedError | null {
    // Prisma Client Known Request Error
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
        return (
            KNOWN_ERROR_MAP[exception.code] ?? {
                status: HttpStatus.BAD_REQUEST,
                code: 'BAD_REQUEST',
                fallbackMessage: 'The request could not be processed', // Database request error
            }
        );
    }

    // Prisma Client Validation Error
    if (exception instanceof Prisma.PrismaClientValidationError) {
        return {
            status: HttpStatus.BAD_REQUEST,
            code: 'BAD_REQUEST',
            fallbackMessage: 'The request could not be processed', // Invalid database request
        };
    }

    // Prisma Client Initialization Error
    if (exception instanceof Prisma.PrismaClientInitializationError) {
        return {
            status: HttpStatus.SERVICE_UNAVAILABLE,
            code: 'SERVICE_UNAVAILABLE',
            fallbackMessage: 'Service is temporarily unavailable', // Database service unavailable
        };
    }

    // Prisma Client Unknown Request Error || Prisma Client Rust Panic Error
    if (exception instanceof Prisma.PrismaClientUnknownRequestError || exception instanceof Prisma.PrismaClientRustPanicError) {
        return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            code: 'INTERNAL_SERVER_ERROR',
            fallbackMessage: 'An unexpected error occurred', // Database internal error
        };
    }

    return null;
}
