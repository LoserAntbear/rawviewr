import type { DecodeOptions } from '@features/image/imageDecoder/types';
import { mapControlsToValues } from '../controls/utils';
import { AlphaMode, HeaderPreset } from '@features/image/imageDecoder/definitions';
import type { FormatRegistry } from '@features/image/format/FormatRegistry';

import { ToolbarStateTransition } from './definitions';
import type { ToolbarState, ToolbarAvailability,} from './types';

export function resolveAvailability(
  options: DecodeOptions,
  formatRegistry: FormatRegistry,
): ToolbarAvailability {
  const format = formatRegistry.get(options.format);
  const geometryLocked = options.headerPreset !== HeaderPreset.None;
  const dimension = { disabled: geometryLocked, placeholder: geometryLocked ? 'header' : 'auto' };

  return {
    width: dimension,
    height: dimension,
    offset: { placeholder: '0' },
    bytesPerRow: { placeholder: 'packed' },
    alphaMode: { disabled: !format.hasAlpha },
    endian: { disabled: !format.endianSensitive },
    bitOrderMsb: { hidden: !format.bitOrderSensitive },
    unpremultiply: { disabled: !format.hasAlpha || options.alphaMode === AlphaMode.Ignore },
  };
}

export function resolveToolbarState(
  options: DecodeOptions,
  formatRegistry: FormatRegistry,
): ToolbarState {
  return {
    values: mapControlsToValues(options),
    kind: ToolbarStateTransition.Synced,
    availability: resolveAvailability(options, formatRegistry),
  };
}
