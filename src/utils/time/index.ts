import { StringFormat } from '@utils/string/formatters';

export function createTimestamp(date: Date = new Date()): string {
  // Stripping Z from the ISO string with that slice
  // I don't hate the letter, it just brings no value.
  return StringFormat.kebab(date.toISOString().slice(0, -1), 'upper');
}
