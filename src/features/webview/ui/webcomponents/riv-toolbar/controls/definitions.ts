import type { ControlInteraction, SupportedControlTag } from './types';

export const CONTROL_INTERACTIONS: Readonly<Record<SupportedControlTag, ControlInteraction>> = {
  input: 'change',
  button: 'click',
  select: 'change',
};
