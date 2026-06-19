import { validateEnv } from './env.validation';

describe('validateEnv', () => {
    const validConfig = {
        DATABASE_URL: 'mysql://user:password@localhost:3306/app_db',
        DATABASE_USER: 'root',
        DATABASE_PASSWORD: 'secret123',
        DATABASE_NAME: 'app_db',
        JWT_ACCESS_SECRET: 'supersecret-access',
        JWT_REFRESH_SECRET: 'supersecret-refresh',
    };

    it('should return parsed config when required values are valid', () => {
        const result = validateEnv(validConfig);

        expect(result).toEqual({
            NODE_ENV: 'development',
            PORT: 3000,
            RATE_LIMIT_DEFAULT_TTL_MS: 60000,
            RATE_LIMIT_DEFAULT_LIMIT: 120,
            DATABASE_URL: 'mysql://user:password@localhost:3306/app_db',
            DATABASE_USER: 'root',
            DATABASE_PASSWORD: 'secret123',
            DATABASE_NAME: 'app_db',
            DATABASE_HOST: 'localhost',
            DATABASE_PORT: 3306,
            JWT_ACCESS_SECRET: 'supersecret-access',
            JWT_REFRESH_SECRET: 'supersecret-refresh',
            JWT_ACCESS_EXPIRES_IN: '15m',
            JWT_REFRESH_EXPIRES_IN: '7d',
        });
    });

    it('should coerce numeric string values into numbers', () => {
        const result = validateEnv({
            ...validConfig,
            PORT: '4000',
            RATE_LIMIT_DEFAULT_TTL_MS: '30000',
            RATE_LIMIT_DEFAULT_LIMIT: '50',
            DATABASE_PORT: '5432',
        });

        expect(result.PORT).toBe(4000);
        expect(result.RATE_LIMIT_DEFAULT_TTL_MS).toBe(30000);
        expect(result.RATE_LIMIT_DEFAULT_LIMIT).toBe(50);
        expect(result.DATABASE_PORT).toBe(5432);
    });

    it('should apply default values when optional envs are not provided', () => {
        const result = validateEnv(validConfig);

        expect(result.NODE_ENV).toBe('development');
        expect(result.PORT).toBe(3000);
        expect(result.RATE_LIMIT_DEFAULT_TTL_MS).toBe(60000);
        expect(result.RATE_LIMIT_DEFAULT_LIMIT).toBe(120);
        expect(result.DATABASE_HOST).toBe('localhost');
        expect(result.DATABASE_PORT).toBe(3306);
        expect(result.JWT_ACCESS_EXPIRES_IN).toBe('15m');
        expect(result.JWT_REFRESH_EXPIRES_IN).toBe('7d');
    });

    it('should throw when a required env is missing', () => {
        expect(() => validateEnv({})).toThrow(/Invalid environment variables/);
        expect(() => validateEnv({})).toThrow(/DATABASE_URL/i);
    });

    it('should throw when JWT secrets are too short', () => {
        expect(() => validateEnv({ ...validConfig, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/i);
        expect(() => validateEnv({ ...validConfig, JWT_REFRESH_SECRET: 'short' })).toThrow(/JWT_REFRESH_SECRET/i);
    });

    it('should throw when numeric env is zero or negative', () => {
        expect(() => validateEnv({ ...validConfig, PORT: 0 })).toThrow(/PORT/i);
        expect(() => validateEnv({ ...validConfig, DATABASE_PORT: -1 })).toThrow(/DATABASE_PORT/i);
        expect(() => validateEnv({ ...validConfig, RATE_LIMIT_DEFAULT_LIMIT: -1 })).toThrow(/RATE_LIMIT_DEFAULT_LIMIT/i);
    });

    it('should throw a readable error message for invalid envs', () => {
        try {
            validateEnv({
                ...validConfig,
                PORT: -1,
                JWT_ACCESS_SECRET: 'short',
            });
            fail('Expected validateEnv to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain('Invalid environment variables');
            expect((error as Error).message).toContain('PORT');
            expect((error as Error).message).toContain('JWT_ACCESS_SECRET');
        }
    });

    it('should accepts overriding NODE_ENV and DATABASE_HOST', () => {
        const out = validateEnv({
            ...validConfig,
            NODE_ENV: 'production',
            DATABASE_HOST: 'db.internal',
        });

        expect(out.NODE_ENV).toBe('production');
        expect(out.DATABASE_HOST).toBe('db.internal');
    });
});
