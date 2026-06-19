import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateProjectDto {
    @IsString()
    @MinLength(3)
    @MaxLength(150)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;
}
