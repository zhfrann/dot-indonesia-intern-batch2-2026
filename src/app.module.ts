import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv } from './common/config/env.validation';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { PrismaModule } from './common/prisma/prisma.module';
import { LoggerModule } from 'nestjs-pino';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { HealthModule } from './modules/health/health.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppValidationPipe } from './common/pipes/validation.pipe';
import { AcceptLanguageResolver, CookieResolver, HeaderResolver, I18nJsonLoader, I18nModule, QueryResolver } from 'nestjs-i18n';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RATE_LIMIT_POLICY } from './common/rate-limit/rate-limit.policy';
import { resolveI18nPath } from './common/utils/i18n-path-resolver.util';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate: validateEnv,
        }),
        LoggerModule.forRoot({
            pinoHttp: {
                transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
            },
        }),
        I18nModule.forRoot({
            fallbackLanguage: 'en',
            loader: I18nJsonLoader,
            loaderOptions: {
                path: resolveI18nPath(),
                watch: process.env.NODE_ENV === 'development',
            },
            resolvers: [
                { use: QueryResolver, options: ['lang'] }, // /v1/health?lang=en
                { use: HeaderResolver, options: ['x-lang'] }, // x-lang: id
                { use: CookieResolver, options: ['lang'] }, // cookie lang=id
                AcceptLanguageResolver, // Accept-Language: id-ID,id;q=0.9,en;q=0.8 || Accept-Language: en-US
            ],
        }),
        ThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                throttlers: [
                    {
                        name: RATE_LIMIT_POLICY.default.name,
                        ttl: config.get<number>('RATE_LIMIT_DEFAULT_TTL_MS') ?? RATE_LIMIT_POLICY.default.ttl,
                        limit: config.get<number>('RATE_LIMIT_DEFAULT_LIMIT') ?? RATE_LIMIT_POLICY.default.limit,
                    },
                ],
            }),
        }),
        PrismaModule,
        HealthModule,
    ],
    controllers: [],
    providers: [
        {
            provide: APP_PIPE,
            useClass: AppValidationPipe,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ResponseTransformInterceptor, // Need DI for Reflector
        },
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestIdMiddleware).forRoutes('*');
    }
}
