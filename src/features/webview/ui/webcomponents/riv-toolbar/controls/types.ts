import { WebviewCommand } from '@features/webview/commands/types';
import { DecodeOptions } from '@features/image/imageDecoder/types';
import { ToolbarGroup } from '../definitions';

export type ToolbarChoice = {
  readonly value: string;
  readonly label: string;
};

export type ToolbarChoiceGroup = {
  readonly label?: string;
  readonly choices: readonly ToolbarChoice[];
};
export type SupportedControlTag = 'select' | 'input' | 'button';
export type ControlTagDescriptor =
  | { readonly tag: 'select'; readonly choiceGroups: () => readonly ToolbarChoiceGroup[] }
  | { readonly tag: 'input'; readonly type: 'number'; readonly min?: string }
  | { readonly tag: 'input'; readonly type: 'checkbox' }
  | { readonly tag: 'button' };
export type ControlElement = HTMLElementTagNameMap[SupportedControlTag];
type ToolbarControlBase = {
  readonly id: string;
  readonly label: string;
  readonly group: ToolbarGroup;
  readonly tag: ControlTagDescriptor;

  readonly tooltip?: string;
};

export type ToolbarValueControl = ToolbarControlBase & {
  readonly command?: never;

  readonly toDecodeOptions: (raw: string) => Partial<DecodeOptions>;
  readonly toValueFromDecodeOptions: (options: DecodeOptions) => string;

};
export type ToolbarActionControl = ToolbarControlBase & {
  readonly command: WebviewCommand;

  readonly toDecodeOptions?: never;
  readonly toValueFromDecodeOptions?: never;
};

export type ToolbarControl = ToolbarValueControl | ToolbarActionControl;

export type ToolbarControlStatus = {
  readonly hidden?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
};
