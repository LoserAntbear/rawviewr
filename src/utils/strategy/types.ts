export type Strategies<TKey extends string, TArgs extends unknown[], TResult> = {
  readonly [K in TKey]: (...args: TArgs) => TResult;
};

export type FieldStrategies<
  TUnion extends object,
  TField extends keyof TUnion,
  TArgs extends unknown[],
  TResult,
> = {
  readonly [TValue in Extract<TUnion[TField], string>]: (
    value: Extract<TUnion, Record<TField, TValue>>,
    ...args: TArgs
  ) => TResult;
};
