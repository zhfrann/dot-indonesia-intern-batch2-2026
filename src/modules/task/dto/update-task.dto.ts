import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TaskStatus } from 'src/generated/prisma/enums';

export class UpdateTaskDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(150)
    title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @IsOptional()
    @IsISO8601()
    dueDate?: string;
}
