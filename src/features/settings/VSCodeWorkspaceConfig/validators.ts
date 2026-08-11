import { clamp } from '@utils/math';
import { asEnumMember } from '@utils/enum';
import { ViewerBackground } from '@features/viewer/definitions';
import { AlphaMode } from '@features/image/imageDecoder/definitions';
import { FORMAT_PRESETS } from '@features/image/format/presets';
import type { NumericRange } from '@app-types/math';

import {
  BYTE_OFFSET_LIMITS,
  DIMENSION_LIMITS_PX,
  FILE_SIZE_LIMITS_MB,
  TILE_SIZE_LIMITS_PX,
} from './definitions';
import type { ConfigValidatorsMap } from './types';

/** TODO: read through the format registry once `@features/format` exposes a singleton. */
const FORMAT_IDS: ReadonlySet<string> = new Set(FORMAT_PRESETS.map((format) => format.id));
export function asBoolean(raw: unknown): boolean | null {
  return typeof raw === 'boolean' ? raw : null;
}

export function asString(raw: unknown): string | null {
  return typeof raw === 'string' ? raw : null;
}

export function asFiniteInt(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.trunc(raw) : null;
}

export function asClampedInt({ min, max }: NumericRange, raw: unknown): number | null {
  const value = asFiniteInt(raw);

  return value !== null ? clamp(value, min, max) : null;
}

export function asFormatId(raw: unknown, formats: ReadonlySet<string> = FORMAT_IDS): string | null {
  return typeof raw === 'string' && formats.has(raw) ? raw : null;
}

export const CONFIG_VALIDATORS: ConfigValidatorsMap = {
  defaultFormat: asFormatId,
  galleryIncludeGlob: asString,
  defaultLittleEndian: asBoolean,
  tileSize: asClampedInt.bind(null, TILE_SIZE_LIMITS_PX),
  defaultWidth: asClampedInt.bind(null, DIMENSION_LIMITS_PX),
  defaultOffset: asClampedInt.bind(null, BYTE_OFFSET_LIMITS),
  defaultHeight: asClampedInt.bind(null, DIMENSION_LIMITS_PX),
  maxFileSizeMB: asClampedInt.bind(null, FILE_SIZE_LIMITS_MB),
  defaultAlphaMode: asEnumMember.bind(null, AlphaMode) as (raw: unknown) => AlphaMode | null,
  background: asEnumMember.bind(null, ViewerBackground) as (raw: unknown) => ViewerBackground | null,
};
