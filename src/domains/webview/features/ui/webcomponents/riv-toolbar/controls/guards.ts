import type { ToolbarControl, ToolbarValueControl } from './types';

export function isValueControl(control: ToolbarControl): control is ToolbarValueControl {
  return control.toValue !== undefined;
}
