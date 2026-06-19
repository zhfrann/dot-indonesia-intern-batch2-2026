import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import type { AuthenticatedUser, RequestMetadata } from './auth.types';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller({
    path: 'auth',
    version: '1',
})
export class AuthController {
    private readonly refreshTokenCookieName = 'refreshToken';

    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 409, description: 'Email already registered' })
    @ResponseMessage(I18N_KEYS.response.auth.registerSuccess)
    async register(@Body() dto: RegisterDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
        const result = await this.authService.register(dto, this.getRequestMetadata(request));

        this.setRefreshTokenCookie(response, result.refreshToken);

        return result;
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login user' })
    @ApiResponse({ status: 200, description: 'User logged in successfully' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    @ResponseMessage(I18N_KEYS.response.auth.loginSuccess)
    async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
        const result = await this.authService.login(dto, this.getRequestMetadata(request));

        this.setRefreshTokenCookie(response, result.refreshToken);

        return result;
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiBody({ type: RefreshTokenDto, required: false })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    @ResponseMessage(I18N_KEYS.response.auth.refreshSuccess)
    async refresh(@Body() dto: RefreshTokenDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
        const refreshToken = dto.refreshToken ?? this.getRefreshTokenFromCookie(request);

        if (!refreshToken) {
            throw new UnauthorizedException({
                code: 'INVALID_REFRESH_TOKEN',
                i18nKey: I18N_KEYS.error.auth.invalidRefreshToken,
                message: 'Invalid refresh token',
            });
        }

        const result = await this.authService.refresh(refreshToken, this.getRequestMetadata(request));

        this.setRefreshTokenCookie(response, result.refreshToken);

        return result;
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout current session' })
    @ApiResponse({ status: 200, description: 'User logged out successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ResponseMessage(I18N_KEYS.response.auth.logoutSuccess)
    async logout(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) response: Response) {
        const result = await this.authService.logout(user.sessionId);

        this.clearRefreshTokenCookie(response);

        return result;
    }

    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current authenticated user' })
    @ApiResponse({ status: 200, description: 'Current user fetched successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ResponseMessage(I18N_KEYS.response.auth.meSuccess)
    async me(@CurrentUser() user: AuthenticatedUser) {
        return this.authService.me(user.sub);
    }

    private getRequestMetadata(request: Request): RequestMetadata {
        return {
            userAgent: request.get('user-agent'),
            ipAddress: this.getIpAddress(request),
        };
    }

    private getIpAddress(request: Request): string | undefined {
        const forwardedFor = request.headers['x-forwarded-for'];

        if (Array.isArray(forwardedFor)) {
            return forwardedFor[0];
        }

        if (typeof forwardedFor === 'string') {
            return forwardedFor.split(',')[0]?.trim();
        }

        return request.ip;
    }

    private getRefreshTokenFromCookie(request: Request): string | undefined {
        const requestWithCookies = request as Request & {
            cookies?: Record<string, string>;
        };

        return requestWithCookies.cookies?.[this.refreshTokenCookieName];
    }

    private setRefreshTokenCookie(response: Response, refreshToken: string): void {
        response.cookie(this.refreshTokenCookieName, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/v1/auth',
            maxAge: this.authService.getRefreshTokenMaxAgeMs(),
        });
    }

    private clearRefreshTokenCookie(response: Response): void {
        response.clearCookie(this.refreshTokenCookieName, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/v1/auth',
        });
    }
}
