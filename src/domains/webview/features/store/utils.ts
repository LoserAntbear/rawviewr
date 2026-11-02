import { isPlainObject, isSameMap, isSameRecord, isSameSet } from '@guards/objectGuards';

export function isSameSelection(previous: unknown, next: unknown): boolean {
  let same = Object.is(previous, next);

  if (!same) {

    if (previous instanceof Map && next instanceof Map) {
      same = isSameMap(previous, next);
    } else if (previous instanceof Set && next instanceof Set) {
      same = isSameSet(previous, next);
    } else if (isPlainObject(previous) && isPlainObject(next)) {
      same = isSameRecord(previous, next);
    }
  }

  return same;
}
