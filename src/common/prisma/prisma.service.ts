import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaClient } from 'src/generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor(
        private readonly configService: ConfigService,
        @InjectPinoLogger(PrismaService.name) private readonly logger: PinoLogger,
    ) {
        super({
            adapter: new PrismaMariaDb({
                host: configService.get('DATABASE_HOST'),
                user: configService.get('DATABASE_USER'),
                password: configService.get('DATABASE_PASSWORD'),
                database: configService.get('DATABASE_NAME'),
                port: configService.get('DATABASE_PORT'),
                // connectionLimit: 5,
            }),
        });
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.info('Prisma Service Initialized');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.info('Prisma Service destroyed');
    }
}
