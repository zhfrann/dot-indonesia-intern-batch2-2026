import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    app.useLogger(app.get(Logger));

    app.use(helmet());
    app.use(cookieParser());

    // versioning: /v1/...
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
    });

    // Global standards
    // app.useGlobalPipes(AppValidationPipe); //set at AppModule providers
    // app.useGlobalFilters(new HttpExceptionFilter()); //set at AppModule providers
    // app.useGlobalInterceptors(app.get(ResponseTransformInterceptor)); //set at AppModule providers

    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    await app.listen(port);
}
bootstrap();
