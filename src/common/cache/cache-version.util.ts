import type { Cache } from 'cache-manager';

export async function getCacheVersion(cacheManager: Cache, versionKey: string): Promise<string> {
    const existingVersion = await cacheManager.get<string>(versionKey);

    if (existingVersion) {
        return existingVersion;
    }

    const initialVersion = '1';
    await cacheManager.set(versionKey, initialVersion);

    return initialVersion;
}

export async function bumpCacheVersion(cacheManager: Cache, versionKey: string): Promise<string> {
    const nextVersion = Date.now().toString();

    await cacheManager.set(versionKey, nextVersion);

    return nextVersion;
}
