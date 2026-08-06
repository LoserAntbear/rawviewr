export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}
