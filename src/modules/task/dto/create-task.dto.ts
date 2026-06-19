import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTaskDto {
    @ApiProperty({
        example: 'Implement JWT Authentication',
        minLength: 3,
        maxLength: 150,
    })
    @IsString()
    @MinLength(3)
    @MaxLength(150)
    title: string;

    @ApiPropertyOptional({
        example: 'Create register, login, refresh, logout, and me endpoints.',
        maxLength: 1000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiPropertyOptional({
        example: '2026-06-30T10:00:00.000Z',
        description: 'Optional due date in ISO 8601 format.',
    })
    @IsOptional()
    @IsISO8601()
    dueDate?: string;
}
