export function nullishCoalesce<T>(...values: (T | null | undefined)[]): T | undefined {
  for (const value of values) {
    if (value !== null) {
      return value;
    }
  }

  return undefined;
}
