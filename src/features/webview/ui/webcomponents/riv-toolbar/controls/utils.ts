import { isHTMLElement } from '@features/webview/utils/html';

import type { ToolbarSyncPayload } from '../state/types';

import { TOOLBAR_CONTROLS } from './controls';
import { CONTROL_INTERACTIONS } from './definitions';
import { isValueControl } from './guards';
import type { ControlInteraction, SelectTagDescriptor, ToolbarChoiceGroup, ToolbarControl } from './types';

export const CONTROLS_BY_ID: ReadonlyMap<string, ToolbarControl> = new Map(
  TOOLBAR_CONTROLS.map((control) => [control.id, control]),
);

function controlIdOf(target: EventTarget | null): string | undefined {
  return isHTMLElement(target) ? target.dataset.controlId : undefined;
}

export function getControlForElement(target: EventTarget | null): ToolbarControl | undefined {
  const id = controlIdOf(target);

  return id === undefined ? undefined : CONTROLS_BY_ID.get(id);
}

export function respondsTo(control: ToolbarControl, interaction: string): boolean {
  return CONTROL_INTERACTIONS[control.tag.tag] === (interaction as ControlInteraction);
}

export function mapControlsToChoices(
  state: ToolbarSyncPayload,
): Record<string, readonly ToolbarChoiceGroup[]> {
  return Object.fromEntries(
    TOOLBAR_CONTROLS
      .map((control) => [control.id, control.tag] as const)
      .filter((entry): entry is readonly [string, SelectTagDescriptor] => entry[1].tag === 'select')
      .map(([id, tag]) => [id, tag.choiceGroups(state)]),
  );
}

/** Only the controls that show something have a value to be written back into them. */
export function mapControlsToValues(state: ToolbarSyncPayload): Record<string, string> {
  return Object.fromEntries(
    TOOLBAR_CONTROLS.filter(isValueControl).map((control) => [control.id, control.toValue(state)]),
  );
}
