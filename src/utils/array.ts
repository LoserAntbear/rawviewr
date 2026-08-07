export function shiftRowIndices(i: number, shift: number = 3): number[] {
  return Array.from({ length: shift }, (_, index) => i + index);
}
