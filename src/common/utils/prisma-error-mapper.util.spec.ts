import { BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';

import { AppValidationPipe } from '../pipes/validation.pipe';
import { VALIDATION_ERROR_CODE } from '../constants/validation-error.constant';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
/**
 * Disabled only in this spec file because Jest/Nest exception payload assertions
 * rely on runtime-shaped objects that are cumbersome to type strictly.
 */

class AddressDto {
    @IsString()
    @IsNotEmpty()
    city!: string;
}

class ProfileDto {
    @ValidateNested()
    @Type(() => AddressDto)
    address!: AddressDto;
}

class CreateUserDto {
    @IsEmail()
    email!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @Type(() => Number)
    @IsInt()
    @Min(18)
    age!: number;

    @ValidateNested()
    @Type(() => ProfileDto)
    profile!: ProfileDto;
}

describe('AppValidationPipe', () => {
    let pipe: AppValidationPipe;
    let metadata: ArgumentMetadata;

    beforeEach(() => {
        pipe = new AppValidationPipe();
        metadata = {
            type: 'body',
            metatype: CreateUserDto,
            data: '',
        };
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });

    it('should pass and transform valid payload', async () => {
        const payload = {
            email: 'john@example.com',
            name: 'John',
            age: '21',
            profile: {
                address: {
                    city: 'Banjar',
                },
            },
        };

        const result = await pipe.transform(payload, metadata);

        expect(result).toBeInstanceOf(CreateUserDto);
        expect(result.age).toBe(21);
        expect(typeof result.age).toBe('number');
        expect(result.profile).toBeInstanceOf(ProfileDto);
        expect(result.profile.address).toBeInstanceOf(AddressDto);
    });

    it('should reject unknown properties', async () => {
        const payload = {
            email: 'john@example.com',
            name: 'John',
            age: 21,
            profile: {
                address: {
                    city: 'Banjar',
                },
            },
            role: 'admin',
        };

        await expect(pipe.transform(payload, metadata)).rejects.toThrow(BadRequestException);

        await expect(pipe.transform(payload, metadata)).rejects.toMatchObject({
            response: {
                code: VALIDATION_ERROR_CODE,
                message: 'Validation failed',
                details: expect.arrayContaining([
                    expect.objectContaining({
                        field: 'role',
                        issues: expect.arrayContaining([expect.stringContaining('should not exist')]),
                    }),
                ]),
            },
        });
    });

    it('should collect multiple validation issues', async () => {
        const payload = {
            email: 'not-an-email',
            name: '',
            age: 15,
            profile: {
                address: {
                    city: '',
                },
            },
        };

        await expect(pipe.transform(payload, metadata)).rejects.toThrow(BadRequestException);

        await expect(pipe.transform(payload, metadata)).rejects.toMatchObject({
            response: {
                code: VALIDATION_ERROR_CODE,
                message: 'Validation failed',
                details: expect.arrayContaining([
                    expect.objectContaining({
                        field: 'email',
                        issues: expect.arrayContaining([expect.stringContaining('must be an email')]),
                    }),
                    expect.objectContaining({
                        field: 'name',
                        issues: expect.arrayContaining([expect.stringContaining('should not be empty')]),
                    }),
                    expect.objectContaining({
                        field: 'age',
                        issues: expect.arrayContaining([expect.stringContaining('must not be less than 18')]),
                    }),
                    expect.objectContaining({
                        field: 'profile.address.city',
                        issues: expect.arrayContaining([expect.stringContaining('should not be empty')]),
                    }),
                ]),
            },
        });
    });

    it('should flatten nested validation errors using dot notation', async () => {
        const payload = {
            email: 'john@example.com',
            name: 'John',
            age: 21,
            profile: {
                address: {
                    city: '',
                },
            },
        };

        await expect(pipe.transform(payload, metadata)).rejects.toMatchObject({
            response: {
                code: VALIDATION_ERROR_CODE,
                message: 'Validation failed',
                details: expect.arrayContaining([
                    expect.objectContaining({
                        field: 'profile.address.city',
                        issues: expect.arrayContaining([expect.stringContaining('should not be empty')]),
                    }),
                ]),
            },
        });
    });

    it('should reject invalid primitive conversion result', async () => {
        const payload = {
            email: 'john@example.com',
            name: 'John',
            age: 'abc',
            profile: {
                address: {
                    city: 'Banjar',
                },
            },
        };

        await expect(pipe.transform(payload, metadata)).rejects.toMatchObject({
            response: {
                code: VALIDATION_ERROR_CODE,
                message: 'Validation failed',
                details: expect.arrayContaining([
                    expect.objectContaining({
                        field: 'age',
                        issues: expect.arrayContaining([expect.stringMatching(/must be an integer number|must not be less than 18/)]),
                    }),
                ]),
            },
        });
    });
});
