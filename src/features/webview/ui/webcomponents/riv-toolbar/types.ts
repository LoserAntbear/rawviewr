import { ControlTagDescriptor } from './controls/types';

export type ExtractDescriptor<
  TDescriptor,
  TKey extends keyof TDescriptor,
  TValue extends TDescriptor[TKey],
> = Extract<TDescriptor, Record<TKey, TValue>>;
export type InputDescriptor = ExtractDescriptor<ControlTagDescriptor, 'tag', 'input'>;
export type SupportedInputType = InputDescriptor['type'];
