import { AlphaMode, HeaderPreset } from '@SHARED/features/image/imageDecoder/definitions';
import { ZOOM } from '@WEBVIEW/features/store/slice/ViewSlice';

import { mapControlsToChoices, mapControlsToValues } from '../controls/utils';

import { ToolbarStateTransition } from './definitions';
import type { ToolbarAvailability, ToolbarState, ToolbarSyncPayload } from './types';

export function resolveAvailability({ options, zoom }: ToolbarSyncPayload): ToolbarAvailability {
  const { format, alphaMode, headerPreset } = options;
  // A compressed file carries its own size header, and has no rows until it is decompressed:
  const geometryLocked = headerPreset !== HeaderPreset.None || format.compressed;
  const dimension = { disabled: geometryLocked, placeholder: geometryLocked ? 'header' : 'auto' };

  return {
    width: dimension,
    height: dimension,
    zoomIn: { disabled: zoom >= ZOOM.max },
    zoomOut: { disabled: zoom <= ZOOM.min },
    dimensions: { disabled: geometryLocked },
    alphaMode: { disabled: !format.hasAlpha },
    headerPreset: { disabled: format.compressed },
    endian: { disabled: !format.endianSensitive },
    // Disabled on extremities reach since the zoom cannot go further.
    zoomReset: { disabled: zoom === ZOOM.default },
    bitOrderMsb: { disabled: !format.bitOrderSensitive },
    offset: { placeholder: '0', disabled: format.compressed },
    bytesPerRow: { placeholder: 'packed', disabled: format.compressed },
    unpremultiply: { disabled: !format.hasAlpha || alphaMode === AlphaMode.Ignore },
  };
}

export function resolveToolbarState(sync: ToolbarSyncPayload): ToolbarState {
  return {
    values: mapControlsToValues(sync),
    choices: mapControlsToChoices(sync),
    kind: ToolbarStateTransition.Synced,
    availability: resolveAvailability(sync),
  };
}
