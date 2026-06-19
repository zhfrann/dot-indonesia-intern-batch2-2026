import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ProjectStatus } from 'src/generated/prisma/enums';

export class QueryProjectDto {
    @ApiPropertyOptional({
        example: 1,
        default: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @ApiPropertyOptional({
        example: 10,
        default: 10,
        maximum: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 10;

    @ApiPropertyOptional({
        example: 'internship',
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;

    @ApiPropertyOptional({
        enum: ProjectStatus,
        example: ProjectStatus.ACTIVE,
    })
    @IsOptional()
    @IsEnum(ProjectStatus)
    status?: ProjectStatus;
}
