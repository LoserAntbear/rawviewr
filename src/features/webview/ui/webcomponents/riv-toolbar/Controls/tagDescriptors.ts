import { FormatGroupEntry } from '@features/image/format/types';
import type { ControlTagDescriptor, ToolbarChoice, ToolbarChoiceGroup } from '../types';
import { WebviewContextProvider } from '@webview/webviewContext/WebviewContextProvider';

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

export const TAG_DESCRIPTORS = {
  NUMBER_FIELD,
  TOGGLE_FIELD,
  buildSelectFieldTagDescriptor,
  buildFormatFieldTagDescriptor,
};
