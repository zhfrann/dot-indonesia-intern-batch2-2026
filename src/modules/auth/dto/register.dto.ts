import { IsEmail } from 'class-validator';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(2)
    @MaxLength(120)
    name: string;

    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password: string;
}
