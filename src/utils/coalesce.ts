export function nullishCoalesce<T>(...values: (T | null | undefined)[]): T | null {
  for (const value of values) {
    if (value !== null) {
      return value || null;
    }
  }

  return null;
}
