/**
 * Set of reusable strategy map utilities.
 */

import type { Strategies, KindStrategies, Kinded } from './types';

export function byKey<TKey extends string, TArgs extends unknown[], TResult>(
  strategies: Strategies<TKey, TArgs, TResult>,
  key: TKey,
  ...args: TArgs
): TResult {
  return strategies[key](...args);
}

export function byKind<TUnion extends Kinded, TArgs extends unknown[], TResult>(
  strategies: KindStrategies<TUnion, TArgs, TResult>,
  value: TUnion,
  ...args: TArgs
): TResult {
  const strategy = strategies[value.kind as TUnion['kind']] as (value: TUnion, ...args: TArgs) => TResult;

  return strategy(value, ...args);
}
