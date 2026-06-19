import { BadRequestException, Injectable, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { VALIDATION_ERROR_CODE } from '../constants/validation-error.constant';

/**
 * ValidationIssue represents a flattened validation error for a single field.
 * `field` uses dot-path notation for nested DTOs (e.g. "profile.address.city").
 */
type ValidationIssue = { field: string; issues: string[] };

/**
 * Flattens class-validator ValidationError[] into a list of field issues.
 *
 * Output shape:
 * [
 *   { field: "email", issues: ["email must be an email"] },
 *   { field: "profile.address.city", issues: ["city should not be empty"] }
 * ]
 */
function formatValidationErrors(errors: ValidationError[]): ValidationIssue[] {
    const out: ValidationIssue[] = [];

    const walk = (error: ValidationError, parent?: string) => {
        const field = parent ? `${parent}.${error.property}` : error.property;

        const issues = error.constraints ? Object.values(error.constraints) : [];
        if (issues.length) out.push({ field: field, issues: issues });

        if (error.children?.length) {
            error.children.forEach((child) => walk(child, field));
        }
    };

    errors.forEach((error) => walk(error));
    return out;
}

/**
 * Global validation pipe for the application.
 *
 * Features:
 * - whitelist: removes unknown properties
 * - forbidNonWhitelisted: rejects requests containing unknown properties
 * - transform: Transforms payload types based on DTO metadata (transform)
 * - stopAtFirstError: Collect all errors for better UX
 * - Produces consistent error envelope via exceptionFactory: { code: "VALIDATION_ERROR", message: "Validation failed", details: [...] }
 *
 * Intended usage: register as APP_PIPE at the AppModule level.
 */
@Injectable()
export class AppValidationPipe extends ValidationPipe {
    constructor() {
        super({
            whitelist: true, // discard unknown properties that is not exist in the DTO
            forbidNonWhitelisted: true, // throw error if unknown properties are present, to prevent accidental payload
            forbidUnknownValues: true, // Make sure there are no strange/unknown objects/values
            transform: true, // auto transform input data to the expected type ("1" -> 1)
            stopAtFirstError: false, // collect all errors for better ux
            exceptionFactory: (errors: ValidationError[]) => {
                return new BadRequestException({
                    code: VALIDATION_ERROR_CODE,
                    message: 'Validation failed',
                    details: formatValidationErrors(errors),
                });
            },
        });
    }
}
