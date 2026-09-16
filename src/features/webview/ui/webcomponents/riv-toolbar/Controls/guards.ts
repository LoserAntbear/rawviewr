import type { ToolbarActionControl, ToolbarControl, ToolbarValueControl } from './types';

export function isActionControl(control: ToolbarControl): control is ToolbarActionControl {
  return control.command !== undefined;
}

export function isValueControl(control: ToolbarControl): control is ToolbarValueControl {
  return control.toDecodeOptions !== undefined;
}
