import { isHTMLElement } from '@features/webview/utils/html';

import { TOOLBAR_CONTROLS } from './controls';
import { CONTROL_INTERACTIONS } from './definitions';
import { isValueControl } from './guards';
import type { ControlInteraction, ToolbarControl } from './types';
import type { ToolbarSyncPayload } from '../state/types';

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

/** Whether this is the event that control answers to — a press, or a change of value. */
export function respondsTo(control: ToolbarControl, interaction: string): boolean {
  return CONTROL_INTERACTIONS[control.tag.tag] === (interaction as ControlInteraction);
}

/** Only the controls that show something have a value to be written back into them. */
export function mapControlsToValues(state: ToolbarSyncPayload): Record<string, string> {
  return Object.fromEntries(
    TOOLBAR_CONTROLS.filter(isValueControl).map((control) => [control.id, control.toValue(state)]),
  );
}
