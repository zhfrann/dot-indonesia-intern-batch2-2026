import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
    @ApiPropertyOptional({
        example: 'refresh-token-value',
        description: 'Optional when refresh token is available in httpOnly cookie.',
    })
    @IsOptional()
    @IsString()
    refreshToken?: string;
}
