/** Generic "object-like" record type with unknown values */
export type AnyRecord = Record<string, unknown>;

/**
 * Checks wheter a value is a non-null object
 * @param value Unknown type value to be checked
 * @returns true if value is a non-null object, false otherwise
 */
export function isRecord(value: unknown): value is AnyRecord {
    return typeof value === 'object' && value !== null;
}

/**
 * Safe `hasOwnProperty` check that narrows the object type.
 *
 * Why not `obj.hasOwnProperty(key)`?
 * - `obj` might not inherit from `Object.prototype`
 * - `hasOwnProperty` could be shadowed/overridden
 *
 * @param obj Target object
 * @param key Property key to check
 * @returns true if `obj` has an own property `key`
 */
export function hasOwn<T extends object, K extends PropertyKey>(obj: T, key: K): obj is T & Record<K, unknown> {
    return Boolean(Object.prototype.hasOwnProperty.call(obj, key));
}
