import type { FormatGroupEntry } from '@SHARED/features/image/format/types';
import { WebviewContextProvider } from '@WEBVIEW/features/webviewContext/WebviewContextProvider';

import type { ControlTagDescriptor, ToolbarChoice, ToolbarChoiceGroup } from './types';

const TOGGLE_FIELD: ControlTagDescriptor = { tag: 'input', type: 'checkbox' };
const NUMBER_FIELD: ControlTagDescriptor = { tag: 'input', type: 'number', min: '0' };

function groupEntryToChoiceGroup({ group, formats }: FormatGroupEntry): ToolbarChoiceGroup {
  return {
    label: group,
    choices: formats.map((format) => ({ value: format.id, label: format.label })),
  };
}

function buildSelectFieldTagDescriptor(choices: readonly ToolbarChoice[]): ControlTagDescriptor {
  return { tag: 'select', choiceGroups: () => [{ choices }] };
}

function buildFormatFieldTagDescriptor(): ControlTagDescriptor {
  return {
    tag: 'select',
    choiceGroups: (): readonly ToolbarChoiceGroup[] => WebviewContextProvider.context.formatRegistry
      .byGroup()
      .map(groupEntryToChoiceGroup),
  };
}

const BUTTON_FIELD: ControlTagDescriptor = { tag: 'button' };

export const TAG_DESCRIPTORS = {
  BUTTON_FIELD,
  NUMBER_FIELD,
  TOGGLE_FIELD,
  buildSelectFieldTagDescriptor,
  buildFormatFieldTagDescriptor,
};
