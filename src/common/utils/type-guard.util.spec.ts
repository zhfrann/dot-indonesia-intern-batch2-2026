import { hasOwn, isRecord } from './type-guard.util';

describe('type-guard.util', () => {
    describe('isRecord', () => {
        it('should returns true for plain object', () => {
            expect(isRecord({ a: 1 })).toBe(true);
        });

        it('should returns true for object created with null prototype', () => {
            const obj = Object.create(null) as Record<string, unknown>;
            obj.a = 1;

            expect(isRecord(obj)).toBe(true);
        });

        it('should returns false for null', () => {
            expect(isRecord(null)).toBe(false);
        });

        it('should returns false for primitives', () => {
            expect(isRecord(undefined)).toBe(false);
            expect(isRecord(123)).toBe(false);
            expect(isRecord('hello')).toBe(false);
            expect(isRecord(true)).toBe(false);
            expect(isRecord(Symbol('x'))).toBe(false);
            expect(isRecord(10n)).toBe(false);
        });

        it('should returns true for arrays because they are objects (current implementation behavior)', () => {
            expect(isRecord([])).toBe(true);
        });

        it('should returns true for Date because it is an object (current implementation behavior)', () => {
            expect(isRecord(new Date())).toBe(true);
        });
    });

    describe('hasOwn', () => {
        it('should returns true when the property exists on the object itself', () => {
            const obj = { a: 1 };

            expect(hasOwn(obj, 'a')).toBe(true);

            // type-narrowing check (compile-time):
            if (hasOwn(obj, 'a')) {
                const value: unknown = obj.a;
                expect(value).toBe(1);
            }
        });

        it('should returns false when the property does not exist', () => {
            const obj = { a: 1 };

            expect(hasOwn(obj, 'b')).toBe(false);
        });

        it('should returns false for inherited properties (prototype chain)', () => {
            const parent = { a: 1 };
            const child = Object.create(parent) as { b?: number };
            child.b = 2;

            expect(hasOwn(child, 'a')).toBe(false);
            expect(hasOwn(child, 'b')).toBe(true);
        });

        it('should works for objects without Object.prototype (null prototype)', () => {
            const obj = Object.create(null) as Record<string, unknown>;
            obj.a = 1;

            // obj.hasOwnProperty does not exist, but our util should still work
            expect(hasOwn(obj, 'a')).toBe(true);
            expect(hasOwn(obj, 'b')).toBe(false);
        });

        it('should is safe when hasOwnProperty is shadowed/overridden', () => {
            const obj = {
                a: 1,
                hasOwnProperty: () => false, // intentionally shadowed
            };

            expect(hasOwn(obj, 'a')).toBe(true);
        });

        it('should returns true for non-enumerable own properties', () => {
            const obj: Record<string, unknown> = {};
            Object.defineProperty(obj, 'hidden', { value: 123, enumerable: false });

            expect(hasOwn(obj, 'hidden')).toBe(true);
        });

        it('should supports symbol keys', () => {
            const key = Symbol('k');
            const obj = { [key]: 42 };

            expect(hasOwn(obj, key)).toBe(true);
        });
    });
});
