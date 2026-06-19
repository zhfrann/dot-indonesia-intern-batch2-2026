import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { VALIDATION_ERROR_CODE } from '../constants/validation-error.constant';
import { AppValidationPipe } from './validation.pipe';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * Reason: Jest asymmetric matchers + Nest ValidationPipe typings are `any`-heavy in tests.
 */

type ValidationIssue = { field: string; issues: string[] };
type ValidationErrorBody = {
    code: string;
    message: string;
    details: ValidationIssue[];
};

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

    @Type(() => Number)
    @IsInt()
    @Min(1)
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
            data: undefined,
        };
    });

    async function expectValidationError(payload: unknown): Promise<ValidationErrorBody> {
        try {
            await pipe.transform(payload, metadata);
            throw new Error('Expected AppValidationPipe to throw BadRequestException');
        } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);

            const response = (error as BadRequestException).getResponse() as ValidationErrorBody;

            expect(response).toMatchObject({
                code: VALIDATION_ERROR_CODE,
                message: 'Validation failed',
            });

            expect(Array.isArray(response.details)).toBe(true);

            return response;
        }
    }

    it('should passes valid payload and transforms it into the DTO shape', async () => {
        const payload = {
            email: 'john@example.com',
            age: '21',
            profile: {
                address: {
                    city: 'Bandung',
                },
            },
        };

        const result = await pipe.transform(payload, metadata);

        expect(result).toBeInstanceOf(CreateUserDto);
        expect(result.email).toBe('john@example.com');
        expect(result.age).toBe(21);
        expect(result.profile).toBeInstanceOf(ProfileDto);
        expect(result.profile.address).toBeInstanceOf(AddressDto);
        expect(result.profile.address.city).toBe('Bandung');
    });

    it('should rejects non-whitelisted properties with the custom validation envelope', async () => {
        const response = await expectValidationError({
            email: 'john@example.com',
            age: '21',
            role: 'admin',
            profile: {
                address: {
                    city: 'Bandung',
                },
            },
        });

        expect(response.details).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    field: 'role',
                    issues: expect.arrayContaining([expect.stringContaining('should not exist')]),
                }),
            ]),
        );
    });

    it('should flattens nested validation errors into dot-path fields', async () => {
        const response = await expectValidationError({
            email: 'john@example.com',
            age: '21',
            profile: {
                address: {
                    city: '',
                },
            },
        });

        expect(response.details).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    field: 'profile.address.city',
                    issues: expect.arrayContaining([expect.stringContaining('should not be empty')]),
                }),
            ]),
        );
    });

    it('should returns multiple field errors in a single response body', async () => {
        const response = await expectValidationError({
            email: 'not-an-email',
            age: '0',
            profile: {
                address: {
                    city: '',
                },
            },
        });

        expect(response.details).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    field: 'email',
                    issues: expect.arrayContaining([expect.stringContaining('must be an email')]),
                }),
                expect.objectContaining({
                    field: 'age',
                    issues: expect.arrayContaining([expect.stringContaining('must not be less than 1')]),
                }),
                expect.objectContaining({
                    field: 'profile.address.city',
                    issues: expect.arrayContaining([expect.stringContaining('should not be empty')]),
                }),
            ]),
        );
    });

    it('should keeps the error status as 400 Bad Request', async () => {
        try {
            await pipe.transform(
                {
                    email: 'invalid',
                    age: '21',
                    profile: {
                        address: {
                            city: 'Bandung',
                        },
                    },
                },
                metadata,
            );

            throw new Error('Expected AppValidationPipe to throw BadRequestException');
        } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            expect((error as BadRequestException).getStatus()).toBe(400);
        }
    });
});
