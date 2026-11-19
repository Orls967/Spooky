import type id from './locales/id';

/** Recursively widen string literals so another locale can satisfy the same shape. */
export type Widen<T> = { -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type LocaleShape = Widen<typeof id>;
