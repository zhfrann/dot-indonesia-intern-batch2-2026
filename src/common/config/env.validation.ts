import { z } from 'zod';

/**
 * Zod schema used by NestJS ConfigModule.validate to validate and normalize
 * environment variables at app startup.
 *
 * Notes:
 * - PORT is coerced to number (e.g. "3000" -> 3000)
 * - JWT_*_EXPIRES_IN should follow your chosen time format (e.g. "15m", "7d")
 */
const envSchema = z.object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().positive().default(3000),

    // Default nestjs' rate limiter configuration
    RATE_LIMIT_DEFAULT_TTL_MS: z.coerce.number().positive().default(60000),
    RATE_LIMIT_DEFAULT_LIMIT: z.coerce.number().positive().default(120),

    // Default Prisma ORM configuration
    DATABASE_URL: z.string().min(1),
    DATABASE_USER: z.string().min(1),
    DATABASE_PASSWORD: z.string().min(1),
    DATABASE_NAME: z.string().min(1),
    DATABASE_HOST: z.string().min(1).default('localhost'),
    DATABASE_PORT: z.coerce.number().positive().default(3306),

    //  Default JWT auth configuration
    JWT_ACCESS_SECRET: z.string().min(10),
    JWT_REFRESH_SECRET: z.string().min(10),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
});

/**
 * Type inferred from envSchema
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables at runtime and returns the normalized result.
 * Intended to be passed to NestJS ConfigModule's `validate` option
 * @param config Raw environment object (typically `process.env`)
 * @returns Parsed and normalized environment variables
 * @throws Error when environment variables are invalid at startup, causing the application to fail fast
 */
export function validateEnv(config: Record<string, unknown>): Env {
    const parsed = envSchema.safeParse(config);

    if (!parsed.success) {
        const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
        throw new Error(`Invalid environment variables:\n- ${issues.join('\n- ')}`);
    }

    return parsed.data;
}
