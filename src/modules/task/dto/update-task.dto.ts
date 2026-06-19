import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TaskStatus } from 'src/generated/prisma/enums';

export class UpdateTaskDto {
    @ApiPropertyOptional({
        example: 'Implement JWT Authentication and Guards',
        minLength: 3,
        maxLength: 150,
    })
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(150)
    title?: string;

    @ApiPropertyOptional({
        example: 'Updated task description.',
        maxLength: 1000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiPropertyOptional({
        enum: TaskStatus,
        example: TaskStatus.IN_PROGRESS,
    })
    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @ApiPropertyOptional({
        example: '2026-07-01T10:00:00.000Z',
        description: 'Optional due date in ISO 8601 format.',
    })
    @IsOptional()
    @IsISO8601()
    dueDate?: string;
}
