import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveI18nPath } from './i18n-path-resolver.util';

jest.mock('node:fs', () => ({
    existsSync: jest.fn(),
}));

describe('resolveI18nPath', () => {
    const mockCwd = '/workspace/nest-contact-management';
    const existsSyncMock = existsSync as jest.MockedFunction<typeof existsSync>;

    beforeEach(() => {
        jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
        existsSyncMock.mockReset();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should returns dist/i18n when dist path exists', () => {
        const distPath = join(mockCwd, 'dist', 'i18n');
        const srcPath = join(mockCwd, 'src', 'i18n');

        existsSyncMock.mockImplementation((path) => path === distPath);

        const result = resolveI18nPath();

        expect(result).toBe(distPath);
        expect(existsSyncMock).toHaveBeenNthCalledWith(1, distPath);
        expect(existsSyncMock).not.toHaveBeenCalledWith(srcPath);
    });

    it('should returns src/i18n when dist path does not exist but src path exists', () => {
        const distPath = join(mockCwd, 'dist', 'i18n');
        const srcPath = join(mockCwd, 'src', 'i18n');

        existsSyncMock.mockImplementation((path) => path === srcPath);

        const result = resolveI18nPath();

        expect(result).toBe(srcPath);
        expect(existsSyncMock).toHaveBeenNthCalledWith(1, distPath);
        expect(existsSyncMock).toHaveBeenNthCalledWith(2, srcPath);
    });

    it('should throws a clear error when neither dist/i18n nor src/i18n exists', () => {
        const distPath = join(mockCwd, 'dist', 'i18n');
        const srcPath = join(mockCwd, 'src', 'i18n');

        existsSyncMock.mockReturnValue(false);

        expect(() => resolveI18nPath()).toThrow('Unable to resolve i18n path. Expected one of: dist/i18n or src/i18n');

        expect(existsSyncMock).toHaveBeenNthCalledWith(1, distPath);
        expect(existsSyncMock).toHaveBeenNthCalledWith(2, srcPath);
    });
});
