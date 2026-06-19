import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
    @ApiProperty({
        example: 'Dot Internship API',
        minLength: 3,
        maxLength: 150,
    })
    @IsString()
    @MinLength(3)
    @MaxLength(150)
    name: string;

    @ApiPropertyOptional({
        example: 'Backend API project for Dot Indonesia internship application.',
        maxLength: 1000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;
}
