export function isPlainObject(value: unknown): value is Record<string, unknown> {
  const prototype = typeof value === 'object' && value !== null ? Object.getPrototypeOf(value) : false;

  return prototype === Object.prototype || prototype === null;
}

export function isSameRecord(previous: Record<string, unknown>, next: Record<string, unknown>): boolean {
  const keys = Object.keys(previous);

  return keys.length === Object.keys(next).length
    && keys.every((key) => Object.is(previous[key], next[key]));
}

export function isSameMap(previous: ReadonlyMap<unknown, unknown>, next: ReadonlyMap<unknown, unknown>): boolean {
  return previous.size === next.size
    // `has` as well as `get`, so an entry holding `undefined` is not read as a missing one.
    && [...previous].every(([key, value]) => next.has(key) && Object.is(next.get(key), value));
}

export function isSameSet(previous: ReadonlySet<unknown>, next: ReadonlySet<unknown>): boolean {
  return previous.size === next.size && [...previous].every((value) => next.has(value));
}
