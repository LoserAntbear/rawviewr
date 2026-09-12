import { DecodeOptions } from '@features/image/imageDecoder/types';
import { TOOLBAR_CONTROLS, TOOLBAR_CONTROLS_BY_ID } from './controls';

export function getControlDefinitionForElement(element: HTMLElement) {
  return element.dataset.controlId ? TOOLBAR_CONTROLS_BY_ID.get(element.dataset.controlId) : undefined;
}

export function mapControlsToValues(options: DecodeOptions) {
  return Object.fromEntries(
    TOOLBAR_CONTROLS.map((control) => [control.id, control.toValueFromDecodeOptions(options)]),
  );
}
