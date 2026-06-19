import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Helper function to resolve the i18n path dynamically based on the current working directory.
 * It prefers the `dist` directory if it exists, otherwise the `src` directory.
 * @returns Resolved i18n path.
 * @throws `Error` If no i18n path can be resolved.
 */
export function resolveI18nPath(): string {
    const candidates = [
        join(process.cwd(), 'dist', 'i18n'), // dist path
        join(process.cwd(), 'src', 'i18n'), // src path
    ];

    const resolvedPath = candidates.find((candidate) => existsSync(candidate));

    if (!resolvedPath) {
        throw new Error('Unable to resolve i18n path. Expected one of: dist/i18n or src/i18n');
    }

    return resolvedPath;
}
