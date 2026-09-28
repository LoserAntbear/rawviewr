import type { DecodeOptions } from '@features/image/imageDecoder/types';
import { mapControlsToValues } from '../controls/utils';
import { AlphaMode, HeaderPreset } from '@features/image/imageDecoder/definitions';

import { ToolbarStateTransition } from './definitions';
import type { ToolbarState, ToolbarAvailability,} from './types';

export function resolveAvailability({
  format,
  alphaMode,
  headerPreset,
}: DecodeOptions): ToolbarAvailability {
  const geometryLocked = headerPreset !== HeaderPreset.None;
  const dimension = { disabled: geometryLocked, placeholder: geometryLocked ? 'header' : 'auto' };

  return {
    width: dimension,
    height: dimension,
    offset: { placeholder: '0' },
    bytesPerRow: { placeholder: 'packed' },
    alphaMode: { disabled: !format.hasAlpha },
    endian: { disabled: !format.endianSensitive },
    bitOrderMsb: { hidden: !format.bitOrderSensitive },
    unpremultiply: { disabled: !format.hasAlpha || alphaMode === AlphaMode.Ignore },
  };
}

export function resolveToolbarState(options: DecodeOptions): ToolbarState {
  return {
    values: mapControlsToValues(options),
    kind: ToolbarStateTransition.Synced,
    availability: resolveAvailability(options),
  };
}
