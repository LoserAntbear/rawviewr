export function pipe<A, B>(input: A, s1: (a: NonNullable<A>) => B): void;
export function pipe<A, B, C>(input: A, s1: (a: NonNullable<A>) => B, s2: (b: NonNullable<B>) => C): void;
export function pipe<A, B, C, D>(
  input: A, s1: (a: NonNullable<A>) => B, s2: (b: NonNullable<B>) => C, s3: (c: NonNullable<C>) => D,
): void;
export function pipe<A, B, C, D, E>(
  input: A, s1: (a: NonNullable<A>) => B, s2: (b: NonNullable<B>) => C,
  s3: (c: NonNullable<C>) => D, s4: (d: NonNullable<D>) => E,
): void;
export function pipe(input: unknown, ...steps: ((v: any) => unknown)[]): void {
  let value: unknown = input;

  for (const step of steps) {
    if (value == null) {
      return;
    }

    value = step(value);
  }
}
