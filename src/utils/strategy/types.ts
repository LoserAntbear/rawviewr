export type Kinded = { readonly kind: string };

export type Strategies<TKey extends string, TArgs extends unknown[], TResult> = {
  readonly [K in TKey]: (...args: TArgs) => TResult;
};

export type KindStrategies<TUnion extends Kinded, TArgs extends unknown[], TResult> = {
  readonly [K in TUnion['kind']]: (value: Extract<TUnion, { kind: K }>, ...args: TArgs) => TResult;
};
