import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthResponse, JwtPayload, RequestMetadata, SafeUser } from './auth.types';

type UserRecord = {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
};

type UserWithPassword = UserRecord;

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
    ) {}

    async register(dto: RegisterDto, metadata: RequestMetadata): Promise<AuthResponse> {
        const email = dto.email.trim().toLowerCase();
        const name = dto.name.trim();

        const existingUser = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (existingUser) {
            throw new ConflictException({
                code: 'EMAIL_ALREADY_EXISTS',
                i18nKey: I18N_KEYS.error.auth.emailAlreadyExists,
                message: 'Email already registered',
            });
        }

        const passwordHash = await argon2.hash(dto.password);

        const user = await this.prisma.user.create({
            data: {
                email,
                name,
                passwordHash,
            },
        });

        this.logger.info({ userId: user.id, email: user.email }, 'User registered');

        return this.createSessionAndTokens(user, metadata);
    }

    async login(dto: LoginDto, metadata: RequestMetadata): Promise<AuthResponse> {
        const email = dto.email.trim().toLowerCase();

        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            this.logger.warn({ email }, 'Login failed: user not found');
            this.throwInvalidCredentials();
        }

        const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);

        if (!isPasswordValid) {
            this.logger.warn({ userId: user.id, email: user.email }, 'Login failed: invalid password');
            this.throwInvalidCredentials();
        }

        this.logger.info({ userId: user.id, email: user.email }, 'User logged in');

        return this.createSessionAndTokens(user, metadata);
    }

    async refresh(refreshToken: string, metadata: RequestMetadata): Promise<AuthResponse> {
        const payload = await this.verifyRefreshToken(refreshToken);

        const session = await this.prisma.authSession.findUnique({
            where: {
                id: payload.sessionId,
            },
            include: {
                user: true,
            },
        });

        if (!session) {
            throw new UnauthorizedException({
                code: 'INVALID_REFRESH_TOKEN',
                i18nKey: I18N_KEYS.error.auth.invalidRefreshToken,
                message: 'Invalid refresh token',
            });
        }

        if (session.revokedAt) {
            throw new UnauthorizedException({
                code: 'REFRESH_TOKEN_REVOKED',
                i18nKey: I18N_KEYS.error.auth.invalidRefreshToken,
                message: 'Invalid refresh token',
            });
        }

        if (session.expiresAt <= new Date()) {
            throw new UnauthorizedException({
                code: 'REFRESH_TOKEN_EXPIRED',
                i18nKey: I18N_KEYS.error.auth.invalidRefreshToken,
                message: 'Invalid refresh token',
            });
        }

        const isRefreshTokenValid = await argon2.verify(session.refreshTokenHash, refreshToken);

        if (!isRefreshTokenValid) {
            await this.revokeSession(session.id);

            this.logger.warn({ userId: session.userId, sessionId: session.id }, 'Refresh token reuse detected');

            throw new UnauthorizedException({
                code: 'INVALID_REFRESH_TOKEN',
                i18nKey: I18N_KEYS.error.auth.invalidRefreshToken,
                message: 'Invalid refresh token',
            });
        }

        const accessToken = await this.signAccessToken(session.user, session.id);
        const newRefreshToken = await this.signRefreshToken(session.user, session.id);
        const newRefreshTokenHash = await argon2.hash(newRefreshToken);

        await this.prisma.authSession.update({
            where: {
                id: session.id,
            },
            data: {
                refreshTokenHash: newRefreshTokenHash,
                expiresAt: this.getRefreshTokenExpiresAt(),
                userAgent: metadata.userAgent,
                ipAddress: metadata.ipAddress,
            },
        });

        this.logger.info({ userId: session.userId, sessionId: session.id }, 'Refresh token rotated');

        return {
            accessToken,
            refreshToken: newRefreshToken,
            user: this.toSafeUser(session.user),
        };
    }

    async logout(sessionId: string): Promise<{ success: true }> {
        await this.revokeSession(sessionId);

        this.logger.info({ sessionId }, 'User logged out');

        return {
            success: true,
        };
    }

    async me(userId: string): Promise<SafeUser> {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            throw new UnauthorizedException();
        }

        return this.toSafeUser(user);
    }

    getRefreshTokenMaxAgeMs(): number {
        const refreshExpiresIn = this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN');
        return this.durationToMs(refreshExpiresIn);
    }

    private async createSessionAndTokens(user: UserRecord, metadata: RequestMetadata): Promise<AuthResponse> {
        const sessionId = randomUUID();

        const accessToken = await this.signAccessToken(user, sessionId);
        const refreshToken = await this.signRefreshToken(user, sessionId);
        const refreshTokenHash = await argon2.hash(refreshToken);

        await this.prisma.authSession.create({
            data: {
                id: sessionId,
                userId: user.id,
                refreshTokenHash,
                userAgent: metadata.userAgent,
                ipAddress: metadata.ipAddress,
                expiresAt: this.getRefreshTokenExpiresAt(),
            },
        });

        return {
            accessToken,
            refreshToken,
            user: this.toSafeUser(user),
        };
    }

    private async signAccessToken(user: UserRecord, sessionId: string): Promise<string> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            sessionId,
        };

        return this.jwtService.signAsync(payload, {
            secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
            expiresIn: this.getAccessTokenExpiresIn(),
        });
    }

    private async signRefreshToken(user: UserRecord, sessionId: string): Promise<string> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            sessionId,
        };

        return this.jwtService.signAsync(payload, {
            secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.getRefreshTokenExpiresInConfig(),
        });
    }

    private getAccessTokenExpiresIn(): JwtSignOptions['expiresIn'] {
        return this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN') as JwtSignOptions['expiresIn'];
    }

    private getRefreshTokenExpiresInConfig(): JwtSignOptions['expiresIn'] {
        return this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN') as JwtSignOptions['expiresIn'];
    }

    private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
        try {
            return await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
                secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            throw new UnauthorizedException({
                code: 'INVALID_REFRESH_TOKEN',
                i18nKey: I18N_KEYS.error.auth.invalidRefreshToken,
                message: 'Invalid refresh token',
            });
        }
    }

    private async revokeSession(sessionId: string): Promise<void> {
        await this.prisma.authSession.updateMany({
            where: {
                id: sessionId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    }

    private getRefreshTokenExpiresAt(): Date {
        return new Date(Date.now() + this.getRefreshTokenMaxAgeMs());
    }

    private durationToMs(value: string): number {
        const match = /^(\d+)(s|m|h|d)$/.exec(value);

        if (!match) {
            throw new Error(`Invalid duration format: ${value}. Use formats like 15m, 7d, 1h.`);
        }

        const amount = Number(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's':
                return amount * 1000;
            case 'm':
                return amount * 60 * 1000;
            case 'h':
                return amount * 60 * 60 * 1000;
            case 'd':
                return amount * 24 * 60 * 60 * 1000;
            default:
                throw new Error(`Unsupported duration unit: ${unit}`);
        }
    }

    private toSafeUser(user: UserRecord): SafeUser {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    private throwInvalidCredentials(): never {
        throw new UnauthorizedException({
            code: 'INVALID_CREDENTIALS',
            i18nKey: I18N_KEYS.error.auth.invalidCredentials,
            message: 'Invalid credentials',
        });
    }
}
