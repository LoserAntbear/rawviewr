import { TOOLBAR_CONTROLS_BY_ID } from './controls';

export function getControlDefinitionForElement(element: HTMLElement) {
  return element.dataset.controlId ? TOOLBAR_CONTROLS_BY_ID.get(element.dataset.controlId) : undefined;
}
