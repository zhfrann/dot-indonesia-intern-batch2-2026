import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/common/prisma/prisma.service';
import type { AuthenticatedUser, JwtPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        });
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        if (!payload.sub || !payload.email || !payload.sessionId) {
            throw new UnauthorizedException();
        }

        const session = await this.prisma.authSession.findUnique({
            where: {
                id: payload.sessionId,
            },
            select: {
                id: true,
                revokedAt: true,
                expiresAt: true,
                userId: true,
            },
        });

        if (!session) {
            throw new UnauthorizedException();
        }

        if (session.revokedAt) {
            throw new UnauthorizedException();
        }

        if (session.expiresAt <= new Date()) {
            throw new UnauthorizedException();
        }

        if (session.userId !== payload.sub) {
            throw new UnauthorizedException();
        }

        return {
            sub: payload.sub,
            email: payload.email,
            sessionId: payload.sessionId,
        };
    }
}
