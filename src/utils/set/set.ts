export function isSameSet<T>(a: Set<T> | ReadonlySet<T>, b: Set<T> | ReadonlySet<T>): boolean {
  if (a.size !== b.size) {
    return false;
  }

  let result = true;

  for (const item of a) {
    if (!b.has(item)) {
      result = false;

      break;
    }
  }

  return result;
}
