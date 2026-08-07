import { Endian } from '@definitions/bits';
import { HeaderPreset } from '../definitions';

/**
 * The presets that actually describe a header. `None` is excluded because it
 * says no header was asked for, which is a different kind of statement.
 */
export type DefinedHeaderedPreset = Exclude<HeaderPreset, HeaderPreset.None>;

export type HeaderLayout = {
  endian: Endian;
  fieldBytes: number; /** --- Bytes per dimension field; the header holds two. */
};

export type HeaderDimensions = Dimension & {
  headerBytes: number;
};

export type DimensionSource = Dimension & {
  headerBytes: number;
  lockedByHeader: boolean;
};

export type Geometry = Dimension & {
  source: Uint8Array;
  frameCount: number;
  baseOffset: number; /** --- Offset of frame 0's first pixel within the container-decoded buffer. */
  bytesPerRow: number;
  bytesPerFrame: number;
  availableBytes: number;
  lockedByHeader: boolean; /** --- Set when the header preset dictated the geometry. */
};

export type Dimension = {
  width: number;
  height: number;
};