import type { DecodeOptions } from '@features/image/imageDecoder/types';

import type { ToolbarGroup } from './definitions';

export type ExtractDescriptor<
  TDescriptor,
  TKey extends keyof TDescriptor,
  TValue extends TDescriptor[TKey],
> = Extract<TDescriptor, Record<TKey, TValue>>;
export type InputDescriptor = ExtractDescriptor<ControlTagDescriptor, 'tag', 'input'>;
export type SupportedInputType = InputDescriptor['type'];

export type ToolbarChoice = {
  readonly value: string;
  readonly label: string;
};

export type ToolbarChoiceGroup = {
  readonly label?: string;
  readonly choices: readonly ToolbarChoice[];
};
export type SupportedControlTag = 'select' | 'input';
export type ControlTagDescriptor =
  | { readonly tag: 'select'; readonly choiceGroups: () => readonly ToolbarChoiceGroup[] }
  | { readonly tag: 'input'; readonly type: 'number'; readonly min?: string }
  | { readonly tag: 'input'; readonly type: 'checkbox' };
export type ControlElement = HTMLElementTagNameMap[SupportedControlTag];
export type ToolbarControl = {
  readonly id: string;
  readonly label: string;
  readonly group: ToolbarGroup;
  readonly tag: ControlTagDescriptor;

  readonly tooltip?: string;

  readonly toDecodeOptions: (raw: string) => Partial<DecodeOptions>;
  readonly toValueFromDecodeOptions: (options: DecodeOptions) => string;
};

export type ToolbarControlStatus = {
  readonly hidden?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
};
