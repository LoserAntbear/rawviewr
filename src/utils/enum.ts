export function asEnumMember<T extends Record<string, string>>(
  enumeration: T,
  value: unknown,
): T[keyof T] | null {
  if (typeof value !== 'string') {
    return null;
  }

  const members: readonly string[] = Object.values(enumeration);

  return members.includes(value) ? (value as T[keyof T]) : null;
}
