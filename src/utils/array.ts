export function shiftRowIndices(i: number, shift: number = 3): number[] {
  return Array.from({ length: shift }, (_, index) => i + index);
}

export function toChunks<T>(items: readonly T[], size: number): readonly T[][] {
  const stride = Math.max(1, Math.floor(size));

  return Array.from(
    { length: Math.ceil(items.length / stride) },
    (_, index) => {
      const shift = index * stride;

      return items.slice(shift, shift + stride);
    },
  );
}

export function selectUnique<Values>(...lists: (readonly Values[])[]): readonly Values[] {
  return [...new Set(lists.flat())];
}
