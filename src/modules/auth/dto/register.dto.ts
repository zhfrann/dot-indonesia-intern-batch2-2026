import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
    @ApiProperty({
        example: 'demo@example.com',
    })
    @IsEmail()
    @MaxLength(191)
    email: string;

    @ApiProperty({
        example: 'Demo User',
    })
    @IsString()
    @MinLength(2)
    @MaxLength(120)
    name: string;

    @ApiProperty({
        example: 'password123',
        minLength: 8,
    })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password: string;
}
