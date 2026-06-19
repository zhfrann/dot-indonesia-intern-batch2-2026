import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ProjectStatus } from 'src/generated/prisma/enums';

export class UpdateProjectDto {
    @ApiPropertyOptional({
        example: 'Updated Dot Internship API',
        minLength: 3,
        maxLength: 150,
    })
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(150)
    name?: string;

    @ApiPropertyOptional({
        example: 'Updated project description.',
        maxLength: 1000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiPropertyOptional({
        enum: ProjectStatus,
        example: ProjectStatus.ACTIVE,
    })
    @IsOptional()
    @IsEnum(ProjectStatus)
    status?: ProjectStatus;
}
