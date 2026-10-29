/**
 * Set of reusable strategy map utilities.
 */

import type { FieldStrategies, Strategies } from './types';

function byKey<TKey extends string, TArgs extends unknown[], TResult>(
  strategies: Strategies<TKey, TArgs, TResult>,
  key: TKey,
  ...args: TArgs
): TResult {
  return strategies[key](...args);
}

function byField<
  TUnion extends object,
  TField extends keyof TUnion,
  TArgs extends unknown[],
  TResult,
>(
  strategies: FieldStrategies<TUnion, TField, TArgs, TResult>,
  field: TField,
  value: TUnion,
  ...args: TArgs
): TResult {
  const key = value[field] as Extract<TUnion[TField], string>;
  const strategy = strategies[key] as (value: TUnion, ...args: TArgs) => TResult;

  return strategy(value, ...args);
}

export const Strategy = {
  byKey,
  byField,
};
