import type { FormatRegistry } from '@SHARED/features/image/format/FormatRegistry';
import type { WebviewMessage } from '@SHARED/features/messaging/protocol';

import type { ToolbarGroup } from '../definitions';
import type { ToolbarSyncPayload } from '../state/types';

export type ToolbarChoice = {
  readonly value: string;
  readonly label: string;
};

export type ToolbarChoiceGroup = {
  readonly label?: string;
  readonly choices: readonly ToolbarChoice[];
};
export type SupportedControlTag = 'select' | 'input' | 'button';
export type SelectTagDescriptor = {
  readonly tag: 'select';
  readonly choiceGroups: (state: ToolbarSyncPayload) => readonly ToolbarChoiceGroup[];
};
export type ControlTagDescriptor =
  | SelectTagDescriptor
  | { readonly tag: 'input'; readonly type: 'number'; readonly min?: string }
  | { readonly tag: 'input'; readonly type: 'checkbox' }
  | { readonly tag: 'button' };
export type ControlElement = HTMLElementTagNameMap[SupportedControlTag];

export type ControlInteraction = 'change' | 'click';
export type ToolbarControlContext = {
  readonly formats: FormatRegistry;
};
export type ToolbarControl = {
  readonly id: string;
  readonly label: string;
  readonly group: ToolbarGroup;
  readonly tag: ControlTagDescriptor;

  readonly tooltip?: string;

  readonly toValue?: (state: ToolbarSyncPayload) => string;
  readonly toCommand: (raw: string, context: ToolbarControlContext) => WebviewMessage;
};

export type ToolbarValueControl = ToolbarControl & {
  readonly toValue: (state: ToolbarSyncPayload) => string;
};

export type ToolbarControlStatus = {
  readonly hidden?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
};
