# Mini Project Management REST API

A simple project management REST API built with NestJS. This project is created for Dot Indonesia Internship Batch 2 2026.

## Table of Contents

- [Changelog](./CHANGELOG.md)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](docs/getting-started.md)
- [API Sample Documentation](docs/api.md)
- [Internationalization (i18n)](#internationalization-i18n)
- [Rate Limiting](#rate-limiting)
- [Request Tracing](#request-tracing)
- [Testing](#testing)
- [License](#license)
- [Author](#author)

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | NestJS 11.x |
| **Language** | TypeScript 5.7 |
| **Database** | MariaDB/MySQL |
| **ORM** | Prisma 7.4 |
| **Validation** | class-validator, class-transformer, Zod |
| **Logger** | Pino (nestjs-pino) |
| **Security** | Helmet |
| **Testing** | Jest, Supertest |
| **Internationalization** | nestjs-i18n |
| **Rate Limiting** | @nestjs/throttler |

## Features

- **Envelope Response Pattern** - Consistent API response structure for all endpoints
- **Global Exception Filter** - Centralized error handling with standardized error responses
- **Request Validation** - DTO-based validation using class-validator with detailed error messages
- **Rate Limiting** - Configurable request throttling to prevent abuse
- **API Versioning** - URI-based versioning (`/v1/...`) for backward compatibility
- **Internationalization (i18n)** - Multi-language support (English & Indonesian for now)
- **Request Tracing** - Unique request ID for each request via `X-Request-Id` header
- **Structured Logging** - JSON-formatted logs using Pino for production, pretty logs for development
- **Security Headers** - HTTP security headers via Helmet middleware
- **Environment Validation** - Runtime validation of environment variables using Zod
- **Prisma Error Mapping** - Automatic mapping of Prisma errors to appropriate HTTP responses

## Project Structure

```
nestjs-prisma-restful-api-template/
├── prisma/
│   └── schema.prisma          # Prisma schema definition
├── src/
│   ├── common/
│   │   ├── config/            # Configuration files (env validation)
│   │   ├── constants/         # Application constants (i18n keys, etc.)
│   │   ├── decorators/        # Custom decorators (@ResponseMessage)
│   │   ├── filters/           # Exception filters (HttpExceptionFilter)
│   │   ├── interceptors/      # HTTP interceptors (ResponseTransformInterceptor)
│   │   ├── middleware/        # Custom middleware (RequestIdMiddleware)
│   │   ├── pipes/             # Validation pipes (AppValidationPipe)
│   │   ├── prisma/            # Prisma service module
│   │   ├── rate-limit/        # Rate limiting configuration
│   │   └── utils/             # Utility functions (type guards, error mappers, i18n path resolver)
│   ├── generated/
│   │   └── prisma/            # Generated Prisma client
│   ├── i18n/
│   │   ├── en/                # English translations
│   │   └── id/                # Indonesian translations
│   ├── modules/
│   │   └── health/            # Health check module (Not implemented)
│   ├── types/                 # TypeScript type definitions
│   ├── app.controller.ts      # Root controller
│   ├── app.module.ts          # Root module
│   ├── app.service.ts         # Root service
│   └── main.ts                # Application entry point
├── test/                      # E2E tests
├── .env.example               # Environment variables example
├── .gitignore                 # Git ignore rules
├── .prettierrc                # Prettier configuration
├── eslint.config.mjs          # ESLint configuration
├── nest-cli.json              # NestJS CLI configuration
├── package.json               # Dependencies and scripts
├── prisma.config.ts           # Prisma configuration
├── tsconfig.json              # TypeScript configuration
├── LICENSE.txt                # Project License
├── CHANGELOG.md               # Project changelog
└── README.md                  # Project documentation
```

## Internationalization (i18n)

The API supports multiple languages for response messages. Currently supported:

- **English (en)** - Default
- **Indonesian (id)**

### How to Set Language

You can set the preferred language using any of the following methods (in priority order):

1. **Query Parameter**
   ```
   GET /v1/health?lang=id
   ```

2. **Custom Header**
   ```
   x-lang: id
   ```

3. **Cookie**
   ```
   Cookie: lang=id
   ```

4. **Accept-Language Header**
   ```
   Accept-Language: id-ID,id;q=0.9,en;q=0.8
   ```

### Response Example (Indonesian)

```json
{
  "message": "Health check berhasil",
  "data": {
    "status": "ok"
  },
  "meta": {
    "requestId": "abc123xyz789",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Add More Languages or Customize Language Files

If you want to add a new language or customize the language files, you can do so by modifying the `src/i18n/<lang>/...` directory.

> [!NOTE]
> Don't forget to match the `src/common/constants/i18n-keys.constant.ts` file when adding or modifying language files.

## Rate Limiting

The API implements rate limiting to prevent abuse and ensure fair usage.

### Default Configuration

| Setting | Value |
|---------|-------|
| Time Window | 60 seconds (60,000 ms) |
| Max Requests | 120 per window |

### Customization

Rate limits can be customized via environment variables:

```env
RATE_LIMIT_DEFAULT_TTL_MS=60000
RATE_LIMIT_DEFAULT_LIMIT=120
```

### Rate Limit Headers

When rate limited, the response will include:

- **Status Code:** `429 Too Many Requests`
- **Response Body:** Standardized error envelope with localized message

### Skipping Rate Limit

Some endpoints (like health check) skip rate limiting using the `@SkipThrottle()` decorator.

## Request Tracing

Every request is assigned a unique identifier for tracing and debugging purposes.

### How It Works

1. **Client-Provided ID**: If the client sends an `X-Request-Id` header (max 64 characters), it will be used.
2. **Auto-Generated ID**: Otherwise, a new ID is generated using nanoid (16 characters).

### Usage

**Request:**
```http
GET /v1/health HTTP/1.1
X-Request-Id: my-custom-request-id
```

**Response Headers:**
```http
X-Request-Id: my-custom-request-id
```

**Response Body:**
```json
{
  "message": "...",
  "data": {},
  "meta": {
    "requestId": "my-custom-request-id",
    "timestamp": "..."
  }
}
```

## Testing

```bash
# Run unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

### Test Coverage

The project includes unit tests for:

- Configuration validation
- Exception filters
- Response interceptors
- Middleware
- Validation pipes
- Utility functions
- Prisma module

## License

This project is licensed under the MIT License. See `LICENSE.txt` for details.

## Author

**Muhammad Zhafran Ilham**
