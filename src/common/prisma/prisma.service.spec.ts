import type { ConfigService } from '@nestjs/config';
import type { PinoLogger } from 'nestjs-pino';
import { PrismaService } from './prisma.service';

jest.mock('src/generated/prisma/client', () => {
    return {
        PrismaClient: class PrismaClient {
            static lastOptions: unknown;

            constructor(options?: unknown) {
                (this.constructor as typeof PrismaClient & { lastOptions: unknown }).lastOptions = options;
            }

            $connect = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
            $disconnect = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
        },
    };
});

type Env = {
    DATABASE_HOST: string;
    DATABASE_USER: string;
    DATABASE_PASSWORD: string;
    DATABASE_NAME: string;
    DATABASE_PORT: number;
};

describe('PrismaService', () => {
    const env: Env = {
        DATABASE_HOST: 'localhost',
        DATABASE_USER: 'root',
        DATABASE_PASSWORD: 'secret',
        DATABASE_NAME: 'nest_contact_management',
        DATABASE_PORT: 3306,
    } as const;

    let getMock: jest.Mock<Env[keyof Env] | undefined, [string]>;
    let logger: { info: jest.Mock };
    let service: PrismaService;

    beforeEach(() => {
        jest.clearAllMocks();

        getMock = jest.fn((key: string) => env[key as keyof Env]);

        logger = {
            info: jest.fn(),
        };

        service = new PrismaService({ get: getMock } as unknown as ConfigService, logger as unknown as PinoLogger);
    });

    it('should reads database config from ConfigService', () => {
        expect(getMock).toHaveBeenCalledWith('DATABASE_HOST');
        expect(getMock).toHaveBeenCalledWith('DATABASE_USER');
        expect(getMock).toHaveBeenCalledWith('DATABASE_PASSWORD');
        expect(getMock).toHaveBeenCalledWith('DATABASE_NAME');
        expect(getMock).toHaveBeenCalledWith('DATABASE_PORT');
    });

    it('should connects and logs on module init', async () => {
        const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);

        await service.onModuleInit();

        expect(connectSpy).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith('Prisma Service Initialized');
    });

    it('should disconnects and logs on module destroy', async () => {
        const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

        await service.onModuleDestroy();

        expect(disconnectSpy).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith('Prisma Service destroyed');
    });

    it('should rethrows connection errors from onModuleInit and does not log success', async () => {
        const error = new Error('connect failed');
        jest.spyOn(service, '$connect').mockRejectedValue(error);

        await expect(service.onModuleInit()).rejects.toThrow(error);
        expect(logger.info).not.toHaveBeenCalledWith('Prisma Service Initialized');
    });

    it('should rethrows disconnection errors from onModuleDestroy and does not log success', async () => {
        const error = new Error('disconnect failed');
        jest.spyOn(service, '$disconnect').mockRejectedValue(error);

        await expect(service.onModuleDestroy()).rejects.toThrow(error);
        expect(logger.info).not.toHaveBeenCalledWith('Prisma Service destroyed');
    });
});
