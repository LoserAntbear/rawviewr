import type { DecodeOptions } from '@features/image/imageDecoder/types';
import { isHTMLElement } from '@features/webview/utils/html';

import { TOOLBAR_CONTROLS } from './controls';
import { isActionControl, isValueControl } from './guards';
import type { ToolbarActionControl, ToolbarValueControl } from './types';

export const VALUE_CONTROLS_BY_ID: ReadonlyMap<string, ToolbarValueControl> = new Map(
  TOOLBAR_CONTROLS.filter(isValueControl).map((control) => [control.id, control]),
);
export const ACTION_CONTROLS_BY_ID: ReadonlyMap<string, ToolbarActionControl> = new Map(
  TOOLBAR_CONTROLS.filter(isActionControl).map((control) => [control.id, control]),
);

function controlIdOf(target: EventTarget | null): string | undefined {
  return isHTMLElement(target) ? target.dataset.controlId : undefined;
}

export function getValueControlForElement(target: EventTarget | null): ToolbarValueControl | undefined {
  const id = controlIdOf(target);

  return id === undefined ? undefined : VALUE_CONTROLS_BY_ID.get(id);
}

export function getActionControlForElement(target: EventTarget | null): ToolbarActionControl | undefined {
  const id = controlIdOf(target);

  return id === undefined ? undefined : ACTION_CONTROLS_BY_ID.get(id);
}

// Only value-bearing controls are mapped to values. Insane, right?
export function mapControlsToValues(options: DecodeOptions): Record<string, string> {
  return Object.fromEntries(
    [...VALUE_CONTROLS_BY_ID.values()].map((control) => [
      control.id,
      control.toValueFromDecodeOptions(options),
    ]),
  );
}
