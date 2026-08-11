export function asEnumMember<
  Keys extends string = string,
  Values extends string = string,
  T extends Record<Keys, Values> = Record<Keys, Values>
>(
  enumeration: T,
  value: unknown,
): T[keyof T] | null {
  if (typeof value !== 'string') {
    return null;
  }

  const members: readonly string[] = Object.values(enumeration);

  return members.includes(value) ? (value as T[keyof T]) : null;
}
