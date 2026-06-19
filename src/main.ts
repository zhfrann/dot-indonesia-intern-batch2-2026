import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    app.enableShutdownHooks();
    app.useLogger(app.get(Logger));

    app.use(helmet());
    app.use(cookieParser());

    // versioning: /v1/...
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
    });

    app.enableCors({
        origin: process.env.CORS_ORIGIN?.split(',') ?? true,
        credentials: true,
    });

    // Global standards
    // app.useGlobalPipes(AppValidationPipe); //set at AppModule providers
    // app.useGlobalFilters(new HttpExceptionFilter()); //set at AppModule providers
    // app.useGlobalInterceptors(app.get(ResponseTransformInterceptor)); //set at AppModule providers

    const swaggerConfig = new DocumentBuilder()
        .setTitle('Mini Project Management API')
        .setDescription('A simple REST API built with NestJS, Prisma, MySQL, JWT, caching, logging, and e2e testing.')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument);

    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    await app.listen(port);
}
bootstrap();
